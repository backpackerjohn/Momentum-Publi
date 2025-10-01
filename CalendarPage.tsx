


import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleEvent, SmartReminder, ReminderStatus, DNDWindow, UndoAction } from '../types';
import BellIcon from './icons/BellIcon';
import PlusIcon from './icons/PlusIcon';
import GearIcon from './icons/GearIcon';
import TrashIcon from './icons/TrashIcon';
import { getAnchorColor } from '../utils/styles';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import ProgressIndicator from './ProgressIndicator';


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CONSTANTS & HELPERS ---
const DAYS_OF_WEEK_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MAP = [
    { long: 'Sunday', short: 'Sun', index: 0 }, { long: 'Monday', short: 'Mon', index: 1 },
    { long: 'Tuesday', short: 'Tue', index: 2 }, { long: 'Wednesday', short: 'Wed', index: 3 },
    { long: 'Thursday', short: 'Thu', index: 4 }, { long: 'Friday', short: 'Fri', index: 5 },
    { long: 'Saturday', short: 'Sat', index: 6 }
];

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatTimeForDisplay = (minutes: number): string => {
    const time = minutesToTime(minutes);
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}${minuteStr !== '00' ? `:${minuteStr}` : ''}${ampm}`;
};

export const formatDaysForToast = (days: (string | number)[]) => {
    if (days.length === 0) return '';
    
    const dayIndices = days.map(d => typeof d === 'string' ? DAYS_OF_WEEK_NAMES.indexOf(d) : d);
    
    const dayMap = DAY_MAP.reduce((acc, curr) => {
        acc[curr.index] = curr.short;
        return acc;
    }, {} as Record<number, string>);
    
    const sortedDays = DAY_MAP.filter(d => dayIndices.includes(d.index)).map(d => dayMap[d.index]);

    if (sortedDays.length === 5 && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(d => sortedDays.includes(d))) return 'Weekdays';
    if (sortedDays.length === 2 && ['Sat', 'Sun'].every(d => sortedDays.includes(d))) return 'Weekends';
    
    return sortedDays.join(', ');
};


// --- TYPE DEFINITIONS ---
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
}

// --- ONBOARDING WIZARD COMPONENT ---
const OnboardingWizard: React.FC<{
  onComplete: (data: { newAnchors: ScheduleEvent[], newDnd: DNDWindow[], newReminders: SmartReminder[] }) => void;
  onStartEmpty: () => void;
}> = ({ onComplete, onStartEmpty }) => {
    const [step, setStep] = useState(0);
    const [draftAnchors, setDraftAnchors] = useState<Omit<ScheduleEvent, 'id'>[]>([]);
    const [draftReminders, setDraftReminders] = useState<Record<string, number>>({}); // anchorTitle -> offset
    const [gentleMode, setGentleMode] = useState(false);
    const [draftDnd, setDraftDnd] = useState({ startMin: 1320, endMin: 420 }); // 10 PM - 7 AM
    
    const [anchorTitle, setAnchorTitle] = useState('');
    const [currentWindow, setCurrentWindow] = useState<'Morning' | 'Afternoon' | 'Night'>('Morning');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [days, setDays] = useState<number[]>([]);

    const timeWindows = {
        Morning: { start: 300, end: 705 }, // 5:00 - 11:45
        Afternoon: { start: 720, end: 1245 }, // 12:00 - 20:45
        Night: { start: 1260, end: 1440 + 285 } // 21:00 - 4:45 (next day)
    };

    const resetForm = () => {
        setAnchorTitle('');
        setStartTime(null);
        setEndTime(null);
        // Keep days and window for "Add & add another"
    };

    const handleAddAnchor = (andAddAnother = false) => {
        if (!anchorTitle || startTime === null || endTime === null || days.length === 0) return;
        const newAnchor: Omit<ScheduleEvent, 'id'> = { title: anchorTitle, startMin: startTime, endMin: endTime, days };
        setDraftAnchors(prev => [...prev, newAnchor]);
        resetForm();
        if (!andAddAnother) {
            // Do not automatically advance step, let user add more or click next
        }
    };
    
    const handleCreateCalendar = () => {
        const newAnchors: ScheduleEvent[] = draftAnchors.map((anchor, index) => ({
            ...anchor,
            id: `onboard-${index}-${Date.now()}`,
        }));
        
        const newReminders: SmartReminder[] = [];
        newAnchors.forEach(anchor => {
            const offset = draftReminders[anchor.title];
            if (offset !== undefined && offset !== 999) { // 999 for "none"
                newReminders.push({
                    id: `onboard-sr-${anchor.id}`,
                    anchorId: anchor.id,
                    offsetMinutes: offset,
                    message: `Reminder for ${anchor.title}`,
                    why: 'Set up during onboarding.',
                    isLocked: false,
                    isExploratory: false,
                    status: ReminderStatus.Active,
                    snoozeHistory: [],
                    snoozedUntil: null,
                    successHistory: [],
                    allowExploration: true,
                    gentle: gentleMode,
                });
            }
        });

        const newDnd: DNDWindow[] = [{
            id: 'dnd-global',
            days: [0, 1, 2, 3, 4, 5, 6],
            startMin: draftDnd.startMin,
            endMin: draftDnd.endMin,
            enabled: true,
        }];

        onComplete({ newAnchors, newDnd, newReminders });
    };

    const renderTimeChips = (type: 'start' | 'end') => {
        const isStart = type === 'start';
        const win = timeWindows[currentWindow];
        const times: { label: string; value: number }[] = [];
        
        for (let min = win.start; min <= win.end; min += 15) {
            if (isStart || (startTime !== null && min > startTime)) {
                 times.push({ label: formatTimeForDisplay(min % 1440), value: min });
            }
        }

        const quickPicks = {
            Morning: [420, 480, 540], // 7, 8, 9 AM
            Afternoon: [720, 780, 840], // 12, 1, 2 PM
            Night: [1260, 1320, 1380], // 9, 10, 11 PM
        };

        const durationChips = [15, 30, 45, 60, 90];

        return (
            <div>
                 <p className="text-sm font-semibold mb-2 text-left">{isStart ? '2. Start' : '3. Finish'}</p>
                 {isStart && (
                     <div className="flex flex-wrap gap-2 mb-3">
                        {quickPicks[currentWindow].map(val => (
                             <button key={val} type="button" onClick={() => setStartTime(val)} className={`px-3 py-1 text-sm rounded-full ${startTime === val ? 'bg-[var(--color-primary-accent)] text-white' : 'bg-[var(--color-surface-sunken)]'}`}>{formatTimeForDisplay(val)}</button>
                        ))}
                     </div>
                 )}
                 {!isStart && startTime !== null && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {durationChips.map(dur => (
                             <button key={dur} type="button" onClick={() => setEndTime(startTime + dur)} className={`px-3 py-1 text-sm rounded-full ${endTime === startTime + dur ? 'bg-[var(--color-primary-accent)] text-white' : 'bg-[var(--color-surface-sunken)]'}`}>{dur}m</button>
                        ))}
                    </div>
                 )}
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2 border p-2 rounded-lg bg-[var(--color-surface)]">
                    {times.map(t => (
                        <button key={t.value} type="button" onClick={() => isStart ? setStartTime(t.value) : setEndTime(t.value)} className={`w-20 py-1 text-sm rounded ${ (isStart ? startTime : endTime) === t.value ? 'bg-[var(--color-primary-accent)] text-white' : 'bg-[var(--color-surface-sunken)]'}`}>{t.label}</button>
                    ))}
                </div>
            </div>
        )
    };
    
    const stepContent = () => {
        switch(step) {
            case 0: 
                const isFormValid = anchorTitle && startTime !== null && endTime !== null && days.length > 0;
                return (
                    <div className="text-left">
                        <h3 className="text-xl font-bold mb-2 text-center">Let's Set Your Weekly Routine</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4 text-center">Give your routine a name, then pick the times and days it applies to.</p>
                        
                        <div className="p-4 border rounded-lg space-y-4 bg-[var(--color-surface-sunken)]">
                           <div>
                                <label htmlFor="anchor-title-input" className="text-sm font-semibold mb-2 text-left block">Routine Name</label>
                                <input id="anchor-title-input" type="text" value={anchorTitle} onChange={e => setAnchorTitle(e.target.value)} placeholder="e.g., Work, Gym Session" className="w-full p-2 border rounded-md bg-transparent"/>
                           </div>
                           <div className="grid md:grid-cols-2 gap-4">
                            {renderTimeChips('start')}
                            {renderTimeChips('end')}
                           </div>
                           <div>
                                <p className="text-sm font-semibold mb-2 text-left">4. Days</p>
                                <div className="flex flex-wrap gap-1">
                                    {DAY_MAP.map(d => (
                                        <button key={d.index} type="button" onClick={() => setDays(p => p.includes(d.index) ? p.filter(i => i !== d.index) : [...p, d.index])} className={`w-9 h-9 text-xs rounded-full ${days.includes(d.index) ? 'bg-[var(--color-primary-accent)] text-white' : 'bg-[var(--color-surface-sunken)]'}`}>{d.short}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                           <button type="button" onClick={() => handleAddAnchor(true)} disabled={!isFormValid} className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--color-surface-sunken)] disabled:opacity-50">Save & Add Another</button>
                           <button type="button" onClick={() => handleAddAnchor(false)} disabled={!isFormValid} className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--color-primary-accent)] text-white disabled:opacity-50">Add to Setup</button>
                        </div>

                        {draftAnchors.length > 0 && (
                            <div className="mt-4 text-left">
                                <h4 className="font-semibold">Draft Anchors:</h4>
                                <ul className="list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
                                    {draftAnchors.map((a, i) => <li key={i}>{a.title} ({formatDaysForToast([a.days])}, {formatTimeForDisplay(a.startMin)}-{formatTimeForDisplay(a.endMin)})</li>)}
                                </ul>
                            </div>
                        )}
                        
                        <button type="button" onClick={() => setStep(1)} disabled={draftAnchors.length === 0} className="w-full mt-4 p-3 font-semibold text-lg bg-[var(--color-primary-accent)] text-white rounded-lg disabled:bg-stone-400">Next: Set Reminders →</button>
                    </div>
                )
            case 1:
                 const anchorTitlesForReminders = [...new Set(draftAnchors.map(a => a.title))];
                 return (
                     <div className="text-left">
                         <h3 className="text-xl font-bold mb-4">Step 2: Gentle Reminders</h3>
                         <p className="text-sm text-[var(--color-text-secondary)] mb-4">For each type of anchor, choose a default reminder. You can change this later.</p>
                         <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                            {anchorTitlesForReminders.map(title => (
                                <div key={title} className="p-3 border rounded-lg bg-[var(--color-surface-sunken)]">
                                    <p className="font-semibold">{title}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {[ {label: '10m before', val: -10}, {label: 'At start', val: 0}, {label: '10m after', val: 10}, {label: 'None', val: 999} ].map(opt => (
                                            <button type="button" key={opt.val} onClick={() => setDraftReminders(p => ({...p, [title]: opt.val}))} className={`px-3 py-1 text-sm rounded-full ${draftReminders[title] === opt.val ? 'bg-[var(--color-primary-accent)] text-white' : 'bg-[var(--color-surface)]'}`}>{opt.label}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                         </div>
                          <button type="button" onClick={() => setStep(2)} className="w-full mt-4 p-3 font-semibold text-lg bg-[var(--color-primary-accent)] text-white rounded-lg">Next: Quiet Hours →</button>
                     </div>
                 );
            case 2:
                 return (
                     <div className="text-left">
                          <h3 className="text-xl font-bold mb-4">Step 3: Quiet Hours</h3>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-4">Set a daily "Do Not Disturb" window. We won't send you reminders during this time.</p>
                          <div className="flex items-center justify-center gap-4 p-4 border rounded-lg bg-[var(--color-surface-sunken)]">
                              <input type="time" value={minutesToTime(draftDnd.startMin)} onChange={e => setDraftDnd(p => ({...p, startMin: timeToMinutes(e.target.value)}))} className="p-2 border rounded-md bg-transparent"/>
                              <span className="font-semibold">to</span>
                              <input type="time" value={minutesToTime(draftDnd.endMin)} onChange={e => setDraftDnd(p => ({...p, endMin: timeToMinutes(e.target.value)}))} className="p-2 border rounded-md bg-transparent"/>
                          </div>
                          <button type="button" onClick={() => setStep(3)} className="w-full mt-4 p-3 font-semibold text-lg bg-[var(--color-primary-accent)] text-white rounded-lg">Next: Review →</button>
                     </div>
                 )
            case 3:
                return (
                     <div className="text-left">
                         <h3 className="text-xl font-bold mb-4">Step 4: Review & Create</h3>
                         <div className="p-4 border rounded-lg space-y-3 bg-[var(--color-surface-sunken)] max-h-60 overflow-y-auto">
                             <div><h4 className="font-semibold">Anchors:</h4><ul className="list-disc pl-5 text-sm text-[var(--color-text-secondary)]">{draftAnchors.map((a,i) => <li key={i}>{a.title} ({formatDaysForToast([a.days])}, {formatTimeForDisplay(a.startMin)}-{formatTimeForDisplay(a.endMin)})</li>)}</ul></div>
                             <div><h4 className="font-semibold">Reminders:</h4><ul className="list-disc pl-5 text-sm text-[var(--color-text-secondary)]">{Object.entries(draftReminders).map(([title, offset]) => offset !== 999 && <li key={title}>{title}: {offset} mins</li>)}</ul></div>
                             <div><h4 className="font-semibold">Quiet Hours:</h4><p className="text-sm pl-5 text-[var(--color-text-secondary)]">{formatTimeForDisplay(draftDnd.startMin)} - {formatTimeForDisplay(draftDnd.endMin)} daily</p></div>
                         </div>
                         <div className="flex gap-4 mt-4">
                            <button type="button" onClick={onStartEmpty} className="flex-1 p-3 font-semibold text-lg bg-[var(--color-surface-sunken)] rounded-lg">Start Empty</button>
                            <button type="button" onClick={handleCreateCalendar} className="flex-1 p-3 font-semibold text-lg bg-[var(--color-primary-accent)] text-white rounded-lg">Create Calendar</button>
                         </div>
                     </div>
                );
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                 <div className="w-full mb-6">
                    <ProgressIndicator currentStep={step + 1} totalSteps={4} stepLabels={['Blocks', 'Reminders', 'DND', 'Review']} />
                </div>
                {stepContent()}
            </div>
        </div>
    );
};


const CalendarPage: React.FC<CalendarPageProps> = ({ 
    scheduleEvents, setScheduleEvents, 
    smartReminders, setSmartReminders, 
    dndWindows, setDndWindows,
    calendarSetupCompleted, setCalendarSetupCompleted,
    onSuccess, onUndo
}) => {
    
    if (!calendarSetupCompleted) {
        return <OnboardingWizard 
            onComplete={({ newAnchors, newDnd, newReminders }) => {
                setScheduleEvents(newAnchors);
                setDndWindows(newDnd);
                setSmartReminders(newReminders);
                setCalendarSetupCompleted(true);
            }}
            onStartEmpty={() => {
                setScheduleEvents([]);
                setDndWindows([]);
                setSmartReminders([]);
                setCalendarSetupCompleted(true);
            }}
        />
    }

    const unrolledEvents = useMemo(() => {
        const eventsByDay: Record<string, ScheduleEvent[]> = {};
        DAY_MAP.forEach(day => eventsByDay[day.long] = []);

        scheduleEvents.forEach(anchor => {
            anchor.days.forEach(dayIndex => {
                const dayName = DAYS_OF_WEEK_NAMES[dayIndex];
                eventsByDay[dayName].push({ ...anchor, id: `${anchor.id}-${dayIndex}` });
            });
        });

        Object.values(eventsByDay).forEach(dayEvents => {
            dayEvents.sort((a, b) => a.startMin - b.startMin);
        });

        return eventsByDay;
    }, [scheduleEvents]);


    const hours = Array.from({ length: 24 }, (_, i) => i);
    const ROW_HEIGHT_PER_HOUR = 60; // pixels

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">Weekly Rhythm</h1>
                    <p className="text-[var(--color-text-secondary)] mt-2 max-w-2xl">Your weekly anchors and smart reminders.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setCalendarSetupCompleted(false)} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all border border-[var(--color-border)]">Re-run Setup</button>
                    {/* Add Anchor/Reminder buttons will go here */}
                </div>
            </div>

            <div className="relative bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)]" style={{ height: `${24 * ROW_HEIGHT_PER_HOUR}px` }}>
                {/* Time Gutter */}
                <div className="absolute top-0 left-0 w-16 h-full pt-4">
                    {hours.map(hour => (
                        <div key={hour} className="relative text-right pr-2" style={{ height: `${ROW_HEIGHT_PER_HOUR}px` }}>
                            <span className="text-xs text-[var(--color-text-subtle)] absolute -top-1.5 right-2">
                                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                            </span>
                        </div>
                    ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="ml-12 grid grid-cols-7 h-full border-t border-[var(--color-border)]">
                     <div className="absolute top-0 left-0 w-full grid grid-cols-7 ml-12 h-full pointer-events-none pt-4">
                        {hours.map(hour => Array.from({length: 7}).map((_, dayIndex) => (
                             <div key={`${hour}-${dayIndex}`} style={{height: `${ROW_HEIGHT_PER_HOUR}px`}} className="border-b border-l border-[var(--color-border)]"></div>
                        )))}
                    </div>

                    {DAY_MAP.map(({long, index}) => (
                        <div key={long} className="relative">
                             <h2 className="sticky top-0 text-center font-bold text-[var(--color-text-primary)] py-2 bg-[var(--color-surface)]/80 backdrop-blur-sm z-20 border-b border-l border-[var(--color-border)] -ml-px -mt-4">{long}</h2>
                             <div className="relative h-full pt-4 -mt-4">
                                {(unrolledEvents[long] || []).map(event => {
                                    const top = (event.startMin / 60) * ROW_HEIGHT_PER_HOUR;
                                    const height = ((event.endMin - event.startMin) / 60) * ROW_HEIGHT_PER_HOUR;
                                    return (
                                        <div key={event.id}
                                            className={`absolute left-1 right-1 p-2 rounded-lg text-xs z-10 ${getAnchorColor(event.title)}`}
                                            style={{ top: `${top}px`, height: `${height}px`, minHeight: '20px' }}
                                        >
                                            <p className="font-bold">{event.title}</p>
                                            <p className="opacity-80">{formatTimeForDisplay(event.startMin)} - {formatTimeForDisplay(event.endMin)}</p>
                                        </div>
                                    )
                                })}
                                {smartReminders
                                    .filter(r => scheduleEvents.find(a => a.id === r.anchorId)?.days.includes(index))
                                    .map(reminder => {
                                        const anchor = scheduleEvents.find(a => a.id === reminder.anchorId);
                                        if (!anchor) return null;
                                        const reminderTime = anchor.startMin + reminder.offsetMinutes;
                                        const top = (reminderTime / 60) * ROW_HEIGHT_PER_HOUR;
                                        return (
                                            <div key={reminder.id + '-' + index}
                                                className="absolute left-1 right-1 flex items-center gap-1.5 z-10 p-1 bg-[var(--color-primary-accent)]/90 text-white rounded"
                                                style={{ top: `${top - 8}px` }}
                                            >
                                            <BellIcon className="h-3 w-3 flex-shrink-0" />
                                            <p className="text-[10px] truncate">{reminder.message}</p>
                                            </div>
                                        )
                                    })
                                }
                              </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
};

export default CalendarPage;