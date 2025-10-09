

import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleEvent, SmartReminder, ReminderStatus, ContextTag, SuccessState, DNDWindow, MicroHabit, EnergyTag, UndoAction } from '../../types';
import BellIcon from '../icons/BellIcon';
import WandIcon from '../icons/WandIcon';
import LockIcon from '../icons/LockIcon';
import LockOpenIcon from '../icons/LockOpenIcon';
import InfoIcon from '../icons/InfoIcon';
import PauseIcon from '../icons/PauseIcon';
import CalendarIcon from '../icons/CalendarIcon';
import GearIcon from '../icons/GearIcon';
import PlusIcon from '../icons/PlusIcon';
import DuplicateIcon from '../icons/DuplicateIcon';
import AddAnchorModal from '../AddAnchorModal';
import AddReminderModal from '../AddReminderModal';
import AiChat from '../AiChat';
import { getAnchorColor } from '../../utils/styles';
import { getHabitSuggestion } from '../../utils/habitStacking';
import { recordHabitCompletion } from '../../utils/habitAnalytics';
import ProgressIndicator from '../ProgressIndicator';
import DropdownMenu from '../DropdownMenu';
import MoreOptionsIcon from '../icons/MoreOptionsIcon';
import TrashIcon from '../icons/TrashIcon';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CONSTANTS & HELPERS ---
const DAYS_OF_WEEK_NAMES: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTimeForToast = (minutes: number): string => {
    if (isNaN(minutes)) return '';
    const time = minutesToTime(minutes);
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    return `${hour}${minuteStr !== '00' ? `:${minuteStr}` : ''}${ampm}`;
};

const formatDaysForToast = (days: number[]) => {
    if (days.length === 0) return '';
    const dayMap: Record<number, string> = {
        1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu',
        5: 'Fri', 6: 'Sat', 0: 'Sun'
    };
    const sortedIndices = [...days].sort();
    
    if (sortedIndices.length >= 5 && [1,2,3,4,5].every(d => sortedIndices.includes(d))) return 'Weekdays';
    if (sortedIndices.length === 2 && sortedIndices.includes(0) && sortedIndices.includes(6)) return 'Weekends';
    
    return sortedIndices.map(d => dayMap[d]).join(', ');
};

const formatOffsetForToast = (offsetMinutes: number) => {
    if (offsetMinutes === 0) return "at the start of";
    const minutes = Math.abs(offsetMinutes);
    const beforeOrAfter = offsetMinutes < 0 ? "before" : "after";
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${beforeOrAfter}`;
};

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const h = Math.floor((minutes / 60) % 24);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const doTimesOverlap = (startAMin: number, endAMin: number, startBMin: number, endBMin: number): boolean => {
    return startAMin < endBMin && endAMin > startBMin;
};

const parseNaturalLanguageReminder = async (text: string, scheduleEvents: ScheduleEvent[]): Promise<{ anchorTitle: string; offsetMinutes: number; message: string; why: string }> => {
    const anchorTitles = [...new Set(scheduleEvents.map(e => e.title))];

    const schema = {
        type: Type.OBJECT,
        properties: {
            anchorTitle: {
                type: Type.STRING,
                description: "The title of the anchor event to link this reminder to. Must be an exact match from the provided list.",
                enum: anchorTitles.length > 0 ? anchorTitles : undefined,
            },
            offsetMinutes: {
                type: Type.NUMBER,
                description: "The offset in minutes from the anchor's start time. Negative for before, positive for after."
            },
            message: {
                type: Type.STRING,
                description: "The content of the reminder message for the user."
            },
            why: {
                type: Type.STRING,
                description: "A brief, friendly explanation for why this reminder is being set at this time."
            }
        },
        required: ["anchorTitle", "offsetMinutes", "message", "why"]
    };

    const prompt = `
        You are a helpful scheduling assistant. Parse the user's natural language request to create a structured reminder object.
        - The 'anchorTitle' MUST be an exact match from the provided list of available anchor titles.
        - Calculate 'offsetMinutes' based on the request (e.g., "10 minutes before" is -10, "at the start" is 0, "5 minutes after" is 5).
        - Extract the core reminder 'message'.
        - Create a simple 'why' message, like "Because you asked to be reminded."

        Available Anchor Titles:
        ${anchorTitles.join(', ')}

        User Request:
        "${text}"

        Return a single JSON object that strictly follows the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        if (anchorTitles.length > 0 && !anchorTitles.includes(result.anchorTitle)) {
             throw new Error(`Could not find an anchor named "${result.anchorTitle}". Please check the name.`);
        }
        return result;
    } catch (error) {
        console.error("Error parsing reminder with Gemini:", error);
        if (error instanceof Error && error.message.includes('Could not find an anchor')) {
            throw error;
        }
        throw new Error("I had trouble understanding that. Could you try rephrasing? e.g., 'Remind me to pack my gym bag 30 minutes before Gym Session'");
    }
};

// --- TYPE DEFINITIONS ---
type OnboardingPreviewData = { newAnchors: ScheduleEvent[]; newDnd: DNDWindow[] };
type SettingsData = {
    globalAllowExperiments: boolean;
    maxFollowUps: 0 | 1;
    autoPauseThreshold: number;
    stackingGuardrailEnabled: boolean;
};
type ConflictType = {
    type: 'dnd' | 'overlap';
    eventToMoveId: string;
    targetDay: number;
    overlappingEventId?: string;
};

interface CalendarPageProps {
    scheduleEvents: ScheduleEvent[];
    setScheduleEvents: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
    smartReminders: SmartReminder[];
    setSmartReminders: React.Dispatch<React.SetStateAction<SmartReminder[]>>;
    dndWindows: DNDWindow[];
    setDndWindows: React.Dispatch<React.SetStateAction<DNDWindow[]>>;
    pauseUntil: string | null;
    setPauseUntil: React.Dispatch<React.SetStateAction<string | null>>;
    calendarSetupCompleted: boolean;
    setCalendarSetupCompleted: React.Dispatch<React.SetStateAction<boolean>>;
    onSuccess: (message: string) => void;
    onUndo: (action: Omit<UndoAction, 'id'>) => void;
    previewMode: 'desktop' | 'mobile';
}
type ChangeHistoryItem = { id: number; message: string; undo: () => void; };

type DayListItem = 
    | { itemType: 'anchor'; data: ScheduleEvent; time: number }
    | { itemType: 'reminder'; data: SmartReminder; time: number };


// --- ONBOARDING COMPONENT ---
const OnboardingFlow: React.FC<{ 
    isOpen: boolean;
    onComplete: (data: OnboardingPreviewData) => void;
    onClose: () => void;
    onboardingPreview: OnboardingPreviewData | null;
    setOnboardingPreview: React.Dispatch<React.SetStateAction<OnboardingPreviewData | null>>;
}> = ({ isOpen, onComplete, onClose, onboardingPreview, setOnboardingPreview }) => {
    const [step, setStep] = useState(1);
    
    type TimeBlock = { id: number; startMin: number; endMin: number; days: number[] };
    const initialBlocks: TimeBlock[] = [{ id: Date.now(), startMin: 540, endMin: 1020, days: [1, 2, 3, 4, 5] }]; // 9am-5pm, Mon-Fri
    const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
    const [activeBlockId, setActiveBlockId] = useState<number | null>(initialBlocks[0]?.id || null);
    const [customTime, setCustomTime] = useState<{ id: number; part: 'startMin' | 'endMin' } | null>(null);

    const initialDnd = { startMin: 1380, endMin: 420 }; // 11pm-7am
    const [dndSettings, setDndSettings] = useState(initialDnd);
    
    const [generatedPreview, setGeneratedPreview] = useState<OnboardingPreviewData | null>(null);
    const [isCustomDnd, setIsCustomDnd] = useState(false);

    const generateDefaults = (): OnboardingPreviewData => {
        const newAnchors: ScheduleEvent[] = [];
        const newDnd: DNDWindow[] = [];
        const workDays: number[] = [1, 2, 3, 4, 5];
  
        newAnchors.push({
            id: `onboard-work-week`,
            days: workDays,
            title: 'Work',
            startMin: 540,
            endMin: 1020,
            contextTags: [ContextTag.Work, ContextTag.HighEnergy],
            bufferMinutes: { prep: 15 }
          });
        
         newAnchors.push({
            id: `onboard-weekend-relax`,
            days: [6], // Saturday
            title: 'Weekend Relaxation',
            startMin: 600,
            endMin: 720,
            contextTags: [ContextTag.Personal, ContextTag.Relaxed]
        });
  
        newDnd.push({
            id: 'dnd-default',
            days: [0, 1, 2, 3, 4, 5, 6],
            startMin: 1380,
            endMin: 420,
            enabled: true,
        });
  
        return { newAnchors, newDnd };
    };

    useEffect(() => {
        if (isOpen) {
            if (onboardingPreview) {
                const anchorsByTime = onboardingPreview.newAnchors.reduce((acc, anchor) => {
                    const key = `${anchor.startMin}-${anchor.endMin}`;
                    const existing = acc[key];
                    if (existing) {
                        existing.days = [...new Set([...existing.days, ...anchor.days])];
                    } else {
                        acc[key] = { startMin: anchor.startMin, endMin: anchor.endMin, days: anchor.days };
                    }
                    return acc;
                }, {} as Record<string, { startMin: number; endMin: number; days: number[] }>);

                const previewBlocks: TimeBlock[] = Object.values(anchorsByTime).map((blockData, index) => ({
                    id: Date.now() + index,
                    ...blockData
                }));

                if (previewBlocks.length > 0) {
                    setBlocks(previewBlocks);
                    setActiveBlockId(previewBlocks[0].id);
                }
                
                setGeneratedPreview(onboardingPreview);
                
                const dndWindow = onboardingPreview.newDnd[0];
                if (dndWindow) {
                    setDndSettings({
                        startMin: dndWindow.startMin,
                        endMin: dndWindow.endMin,
                    });
                }
                setStep(4);
            } else {
                const newInitialBlocks: TimeBlock[] = [{ id: Date.now(), startMin: 540, endMin: 1020, days: [1, 2, 3, 4, 5] }];
                setBlocks(newInitialBlocks);
                setActiveBlockId(newInitialBlocks[0].id);
                setStep(1);
                setGeneratedPreview(null);
                setDndSettings(initialDnd);
            }
        }
    }, [isOpen, onboardingPreview]);
    
    const handleClose = () => {
        if (step < 4 && !onboardingPreview) {
            const defaults = generateDefaults();
            setOnboardingPreview(defaults);
        }
        onClose();
    };

    const handleConfirm = () => {
        if (generatedPreview) {
            onComplete(generatedPreview);
            setOnboardingPreview(null);
        }
    };

    const generateAndPreview = () => {
        const newAnchors: ScheduleEvent[] = blocks.map((block, blockIndex) => ({
            id: `onboard-work-${blockIndex}`,
            days: block.days,
            title: 'Work/School',
            startMin: block.startMin,
            endMin: block.endMin,
            contextTags: [ContextTag.Work, ContextTag.HighEnergy],
            bufferMinutes: { prep: 15, recovery: 15 }
        }));

        const newDnd: DNDWindow[] = [{
            id: 'dnd-onboard',
            days: [0, 1, 2, 3, 4, 5, 6],
            ...dndSettings,
            enabled: true,
        }];
        
        setGeneratedPreview({ newAnchors, newDnd });
        setStep(4);
    };
    
    const formatDays = (days: number[]) => {
        if (days.length === 0) return '';
        const dayMap: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
        const sortedDays = [...days].sort();

        if (sortedDays.join(',') === '1,2,3,4,5') return 'Mon–Fri';
        if (sortedDays.join(',') === '0,6') return 'Sat–Sun';
        if (sortedDays.length === 7) return 'Every day';

        return sortedDays.map(d => dayMap[d]).join(', ');
    };

    const updateBlock = (id: number, field: keyof Omit<TimeBlock, 'id'>, value: any) => {
        // FIX: Explicitly type 'b' to avoid potential type inference issues.
        setBlocks(currentBlocks => currentBlocks.map((b: TimeBlock) => {
            if (b.id === id) {
                const updatedBlock = { ...b, [field]: value };
                if (field === 'startMin' && updatedBlock.endMin && value >= updatedBlock.endMin) {
                    updatedBlock.endMin = value + 60; // Default to 1 hour
                }
                return updatedBlock;
            }
            return b;
        }));
    };

    const toggleDay = (id: number, dayIndex: number) => {
        setBlocks(currentBlocks => currentBlocks.map(b => {
            if (b.id === id) {
                const newDays = b.days.includes(dayIndex)
                    ? b.days.filter(d => d !== dayIndex)
                    : [...b.days, dayIndex];
                return { ...b, days: newDays };
            }
            return b;
        }));
    };

    const addBlock = () => {
        const newBlock = { id: Date.now(), startMin: 540, endMin: 1020, days: [] as number[] };
        setBlocks(currentBlocks => [...currentBlocks, newBlock]);
        setActiveBlockId(newBlock.id);
    };

    const removeBlock = (id: number) => {
        setBlocks(currentBlocks => {
            const newBlocks = currentBlocks.filter(b => b.id !== id);
            if (activeBlockId === id) {
                setActiveBlockId(newBlocks.length > 0 ? newBlocks[newBlocks.length - 1].id : null);
            }
            return newBlocks;
        });
    };

    if (!isOpen) {
        return null;
    }

    const dndOptions = [
        { label: '10 PM - 6 AM', startMin: 1320, endMin: 360 },
        { label: '11 PM - 7 AM', startMin: 1380, endMin: 420 },
        { label: '12 AM - 8 AM', startMin: 0, endMin: 480 },
    ];
    
    const stepLabels = ['Welcome', 'Schedule', 'DND', 'Review'];

    const renderStep = () => {
        switch (step) {
            case 1: return (
                <div>
                    <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Welcome! Let's set up your weekly rhythm.</h2>
                    <p className="mt-2 text-[var(--color-text-secondary)]">This helps us place reminders at the right time. We'll ask a few quick questions.</p>
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={handleClose} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg">Skip for now</button>
                        <button onClick={() => setStep(2)} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg">Get Started</button>
                    </div>
                </div>
            );
            case 2:
                const startTimes = [420, 480, 540, 600, 660, 720]; // 7am to 12pm
                const endTimes = [780, 840, 900, 960, 1020, 1080]; // 1pm to 6pm
                const daysOfWeekMap: { short: string; long: string; index: number }[] = [
                    { short: 'Mon', long: 'Monday', index: 1 }, { short: 'Tue', long: 'Tuesday', index: 2 }, { short: 'Wed', long: 'Wednesday', index: 3 },
                    { short: 'Thu', long: 'Thursday', index: 4 }, { short: 'Fri', long: 'Friday', index: 5 }, { short: 'Sat', long: 'Saturday', index: 6 },
                    { short: 'Sun', long: 'Sunday', index: 0 },
                ];
                const validBlocks = blocks.filter(b => b.startMin && b.endMin && b.days.length > 0);
                const activeBlock = blocks.find(b => b.id === activeBlockId);

                return (
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">When do you usually work or have school?</h2>
                        <p className="mt-2 text-[var(--color-text-secondary)] max-w-lg mx-auto">Pick your start and end times, and select the days this applies to. You can always edit this later.</p>
                        
                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 text-left">
                            {blocks.filter(b => b.id !== activeBlockId && b.startMin && b.endMin && b.days.length > 0).map(block => (
                                <div key={`summary-${block.id}`} onClick={() => setActiveBlockId(block.id)}
                                    className="p-3 border rounded-lg bg-[var(--color-surface)] cursor-pointer hover:bg-[var(--color-surface-sunken)] flex justify-between items-center animate-fade-in"
                                >
                                    <p className="text-sm text-[var(--color-text-primary)]">
                                        <span className="font-semibold">Work/School:</span> {formatTimeForToast(block.startMin)} – {formatTimeForToast(block.endMin)} ({formatDays(block.days)})
                                    </p>
                                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] rounded-full flex-shrink-0" title="Remove block">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                            {activeBlock && (
                                <div key={activeBlock.id} className="p-4 border-2 border-[var(--color-primary-accent)] rounded-lg bg-[var(--color-surface)] relative animate-fade-in">
                                    <div className="mb-3">
                                        <label className="font-semibold text-sm text-[var(--color-text-secondary)] block mb-2">Start Time</label>
                                        <div className="flex flex-wrap gap-2">
                                            {startTimes.map(st => (
                                                <button key={st} onClick={() => updateBlock(activeBlock.id, 'startMin', st)}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.startMin === st ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {formatTimeForToast(st)}
                                                </button>
                                            ))}
                                            {customTime?.id === activeBlock.id && customTime?.part === 'startMin' ? (
                                                <input type="time" defaultValue={minutesToTime(activeBlock.startMin)} onBlur={e => { if (e.target.value) updateBlock(activeBlock.id, 'startMin', timeToMinutes(e.target.value)); setCustomTime(null); }} autoFocus className="p-1 border rounded-md text-sm w-28"/>
                                            ) : (
                                                <button onClick={() => setCustomTime({ id: activeBlock.id, part: 'startMin' })}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.startMin && !startTimes.includes(activeBlock.startMin) ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {activeBlock.startMin && !startTimes.includes(activeBlock.startMin) ? formatTimeForToast(activeBlock.startMin) : 'Custom'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="font-semibold text-sm text-[var(--color-text-secondary)] block mb-2">End Time</label>
                                        <div className="flex flex-wrap gap-2">
                                            {endTimes.map(et => {
                                                const isDisabled = activeBlock.startMin ? et <= activeBlock.startMin : false;
                                                return (
                                                    <button key={et} disabled={isDisabled} onClick={() => updateBlock(activeBlock.id, 'endMin', et)}
                                                        className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.endMin === et ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-primary-accent)]'}`}>
                                                        {formatTimeForToast(et)}
                                                    </button>
                                                );
                                            })}
                                            {customTime?.id === activeBlock.id && customTime?.part === 'endMin' ? (
                                                <input type="time" defaultValue={minutesToTime(activeBlock.endMin)} onBlur={e => { if (e.target.value) updateBlock(activeBlock.id, 'endMin', timeToMinutes(e.target.value)); setCustomTime(null); }} autoFocus className="p-1 border rounded-md text-sm w-28"/>
                                            ) : (
                                                <button onClick={() => setCustomTime({ id: activeBlock.id, part: 'endMin' })}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.endMin && !endTimes.includes(activeBlock.endMin) ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {activeBlock.endMin && !endTimes.includes(activeBlock.endMin) ? formatTimeForToast(activeBlock.endMin) : 'Custom'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="font-semibold text-sm text-[var(--color-text-secondary)] block mb-2">On these days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {daysOfWeekMap.map(day => (
                                                <button key={day.long} onClick={() => toggleDay(activeBlock.id, day.index)}
                                                    className={`w-12 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.days.includes(day.index) ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {day.short}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <button onClick={addBlock} className="mt-4 w-full text-sm font-semibold text-[var(--color-primary-accent)] hover:bg-[var(--color-surface-sunken)] p-2 rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary-accent)] transition-colors">
                            + Add Another Block
                        </button>
                        
                        <div className="mt-6 flex justify-center gap-4">
                            <button onClick={() => setStep(1)} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg">Back</button>
                            <button onClick={() => setStep(3)} disabled={validBlocks.length === 0} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg disabled:bg-stone-400">Looks good →</button>
                        </div>
                    </div>
                );
            case 3: return (
                 <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">When is your "Do Not Disturb" time?</h2>
                     <p className="mt-2 text-[var(--color-text-secondary)]">We'll avoid sending reminders during this window (e.g., when you're sleeping).</p>
                    <div className="mt-4 flex flex-wrap gap-3 justify-center">
                        {dndOptions.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    setDndSettings({ startMin: opt.startMin, endMin: opt.endMin });
                                    setIsCustomDnd(false);
                                }}
                                className={`px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                                    dndSettings.startMin === opt.startMin && dndSettings.endMin === opt.endMin && !isCustomDnd
                                    ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setIsCustomDnd(true)}
                            className={`px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                                isCustomDnd
                                ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]'
                                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                    {isCustomDnd && (
                        <div className="mt-4 flex gap-4 items-center justify-center animate-fade-in">
                            <label>From:</label>
                            <input type="time" value={minutesToTime(dndSettings.startMin)} onChange={e => setDndSettings(p => ({...p, startMin: timeToMinutes(e.target.value)}))} className="p-2 border rounded-md" />
                            <span>to</span>
                            <input type="time" value={minutesToTime(dndSettings.endMin)} onChange={e => setDndSettings(p => ({...p, endMin: timeToMinutes(e.target.value)}))} className="p-2 border rounded-md" />
                        </div>
                    )}
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={() => setStep(2)} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg">Back</button>
                        <button onClick={generateAndPreview} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg">Preview My Map</button>
                    </div>
                </div>
            );
            case 4: return (
                 <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Here's your suggested weekly map.</h2>
                     <p className="mt-2 text-[var(--color-text-secondary)]">This is a starting point based on common routines. You can edit this now, or change it any time from the calendar.</p>
                     <div className="mt-4 bg-[var(--color-surface-sunken)] p-4 rounded-lg border max-h-60 overflow-y-auto text-left space-y-3">
                         <div>
                            <h3 className="font-bold text-[var(--color-text-primary)]">Core Anchors:</h3>
                            {generatedPreview?.newAnchors.map(a => (
                                <p key={a.id} className="text-sm text-[var(--color-text-secondary)] pl-2">&bull; {formatDaysForToast(a.days)}: {a.title} ({formatTimeForToast(a.startMin)} - {formatTimeForToast(a.endMin)})</p>
                            ))}
                         </div>
                         <div>
                             <h3 className="font-bold text-[var(--color-text-primary)]">Do-Not-Disturb Window:</h3>
                             <p className="text-sm text-[var(--color-text-secondary)] pl-2">&bull; Daily from {formatTimeForToast(generatedPreview?.newDnd[0].startMin || 0)} to {formatTimeForToast(generatedPreview?.newDnd[0].endMin || 0)}</p>
                         </div>
                     </div>
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={() => setStep(2)} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] rounded-lg hover:bg-[var(--color-border)]">Edit Details</button>
                        <button onClick={handleConfirm} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)]">Confirm & Start</button>
                    </div>
                </div>
            );
            default: return null;
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
        >
            <div 
                className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-2xl transform transition-all duration-300 scale-100 text-center relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={handleClose} className="absolute top-2 right-2 p-2 text-[var(--color-text-subtle)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-surface-sunken)] transition-colors" aria-label="Close setup">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                {step > 1 && <ProgressIndicator currentStep={step} totalSteps={4} stepLabels={stepLabels} />}
                <div className="flex-grow">{renderStep()}</div>
                {step > 1 && step < 4 && (
                    <div className="mt-4">
                         <button onClick={handleClose} className="text-sm text-[var(--color-text-subtle)] hover:underline">Skip for now</button>
                    </div>
                )}
            </div>
        </div>
    );
};
