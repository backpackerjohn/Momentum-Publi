

import React, { useState, useMemo, useEffect } from 'react';
import { ScheduleEvent, SmartReminder, MomentumMapData, BrainDumpItem, SubStep, UndoAction, Chunk, ReminderStatus } from '../../types';
import CalendarIcon from '../icons/CalendarIcon';
import BellIcon from '../icons/BellIcon';
import MomentumMapIcon from '../icons/MomentumMapIcon';
import TaskIcon from '../icons/TaskIcon';
import PlayIcon from '../icons/PlayIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import TrashIcon from '../icons/TrashIcon';
import Confetti from '../Confetti';
import FinishLineIcon from '../icons/FinishLineIcon';
import ChevronRightIcon from '../icons/ChevronRightIcon';
import MoreOptionsIcon from '../icons/MoreOptionsIcon';
import DropdownMenu from '../DropdownMenu';
import SnoozeIcon from '../icons/SnoozeIcon';

interface TodayPageProps {
    scheduleEvents: ScheduleEvent[];
    smartReminders: SmartReminder[];
    setSmartReminders: React.Dispatch<React.SetStateAction<SmartReminder[]>>;
    activeMapData: MomentumMapData | null;
    brainDumpItems: BrainDumpItem[];
    setBrainDumpItems: React.Dispatch<React.SetStateAction<BrainDumpItem[]>>;
    onNavigate: (page: string) => void;
    onBrainDumpClick: () => void;
    onUndo: (action: Omit<UndoAction, 'id'>) => void;
    onSuccess: (message: string) => void;
}

const formatTime = (minutes: number): string => {
    const h = Math.floor((minutes / 60) % 24);
    const m = minutes % 60;
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''} ${ampm}`;
};

const findNextMapStep = (map: MomentumMapData): { chunk: Chunk, subStep: SubStep } | null => {
    for (const chunk of map.chunks) {
        if (!chunk.isComplete) {
            for (const subStep of chunk.subSteps) {
                if (!subStep.isComplete && !subStep.isBlocked) {
                    return { chunk, subStep };
                }
            }
        }
    }
    return null;
};

type PriorityItem = 
  | { type: 'event'; data: ScheduleEvent; reason: string }
  | { type: 'map_substep'; data: { chunk: Chunk, subStep: SubStep }; reason: string }
  | { type: 'braindump_item'; data: BrainDumpItem; reason: string }
  | { type: 'plan_prompt'; reason: string };

const TodayPage: React.FC<TodayPageProps> = ({ scheduleEvents, smartReminders, setSmartReminders, activeMapData, brainDumpItems, setBrainDumpItems, onNavigate, onBrainDumpClick, onUndo, onSuccess }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const { priorityItem, upcomingItems, quickWins, isEndOfDay } = useMemo(() => {
        const now = currentTime;
        const nowInMinutes = now.getHours() * 60 + now.getMinutes();
        const todayIndex = now.getDay();

        // Rule 1: Calendar event starting within 30m
        const upcomingEvent = scheduleEvents
            .filter(e => e.days.includes(todayIndex) && e.startMin >= nowInMinutes && e.startMin <= nowInMinutes + 30)
            .sort((a, b) => a.startMin - b.startMin)[0];

        // Rule 2: Active map sub-step
        const nextMapStep = activeMapData ? findNextMapStep(activeMapData) : null;

        // Rule 3: Urgent Brain Dump item
        const urgentItem = brainDumpItems.find(item => item.isUrgent);

        // Rule 4: Quick Win
        const availableQuickWins = brainDumpItems.filter(item => item.timeEstimateMinutesP90 && item.timeEstimateMinutesP90 <= 25 && !item.isUrgent);
        const firstQuickWin = availableQuickWins[0];
        
        let determinedPriority: PriorityItem;
        if (upcomingEvent) {
            determinedPriority = { type: 'event', data: upcomingEvent, reason: `'${upcomingEvent.title}' starts in ${upcomingEvent.startMin - nowInMinutes}m` };
        } else if (nextMapStep) {
            determinedPriority = { type: 'map_substep', data: nextMapStep, reason: `Next on your '${activeMapData?.finishLine.statement}' map` };
        } else if (urgentItem) {
            determinedPriority = { type: 'braindump_item', data: urgentItem, reason: `An urgent thought needs your attention` };
        } else if (firstQuickWin) {
            determinedPriority = { type: 'braindump_item', data: firstQuickWin, reason: `A quick win to build momentum` };
        } else {
            determinedPriority = { type: 'plan_prompt', reason: "Your day is clear. Let's plan what's next!" };
        }
        
        // Upcoming Items Logic
        const upcomingAnchors = scheduleEvents
            .filter(e => e.days.includes(todayIndex) && e.startMin > nowInMinutes)
            .map(e => ({ type: 'anchor' as const, data: e, time: e.startMin }));

        const upcomingReminders = smartReminders
            .filter(r => {
                const anchor = scheduleEvents.find(a => a.id === r.anchorId);
                return anchor && r.status === ReminderStatus.Active && anchor.days.includes(todayIndex) && (anchor.startMin + r.offsetMinutes) > nowInMinutes;
            })
            .map(r => {
                const anchor = scheduleEvents.find(a => a.id === r.anchorId)!;
                return { type: 'reminder' as const, data: r, time: anchor.startMin + r.offsetMinutes };
            });
            
        const nextItems = [...upcomingAnchors, ...upcomingReminders]
            .sort((a, b) => a.time - b.time)
            .slice(0, 3);
        
        // End of Day Logic
        const hasUrgent = brainDumpItems.some(i => i.isUrgent);
        const eod = nextItems.length === 0 && !nextMapStep && !hasUrgent;

        return { priorityItem: determinedPriority, upcomingItems: nextItems, quickWins: availableQuickWins, isEndOfDay: eod };
    }, [currentTime, scheduleEvents, smartReminders, activeMapData, brainDumpItems]);

    const handleSnoozeReminder = (reminderId: string, minutes: number) => {
        setSmartReminders(prev => prev.map(r =>
            r.id === reminderId
                ? {
                    ...r,
                    status: ReminderStatus.Snoozed,
                    snoozedUntil: new Date(Date.now() + minutes * 60000).toISOString()
                }
                : r
        ));
        onSuccess(`Snoozed for ${minutes} minutes.`);
    };

    const handleCompleteReminder = (reminderId: string) => {
        setSmartReminders(prev => prev.map(r =>
            r.id === reminderId
                ? { ...r, status: ReminderStatus.Done }
                : r
        ));
        onSuccess("Reminder complete!");
    };


    const handleQuickWinDone = (itemId: string) => {
        setBrainDumpItems(prev => prev.filter(item => item.id !== itemId));
        onSuccess("Quick win complete! Nicely done.");
    };

    const handleQuickWinArchive = (itemToArchive: BrainDumpItem) => {
        const originalItems = [...brainDumpItems];
        setBrainDumpItems(prev => prev.filter(item => item.id !== itemToArchive.id));
        onUndo({
            message: `Archived "${itemToArchive.item}"`,
            onUndo: () => setBrainDumpItems(originalItems)
        });
    };

    if (isEndOfDay) {
        return (
            <main className="container mx-auto p-8 relative overflow-hidden">
                <Confetti />
                <div className="text-center bg-[var(--color-surface)] p-10 rounded-2xl shadow-2xl border border-[var(--color-border)]/80 z-10 relative">
                    <h1 className="text-5xl font-extrabold text-[var(--color-primary-accent)] mb-2 tracking-tight">Day Complete!</h1>
                    <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8">
                        Congratulations on finishing all your high-priority tasks for the day!
                    </p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left my-10 max-w-4xl mx-auto">
                        <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg">
                            <h3 className="text-[var(--color-text-subtle)] font-semibold text-sm">MXP Summary</h3>
                            <p className="text-[var(--color-text-primary)] font-bold text-3xl">-- MXP</p>
                        </div>
                        <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg">
                            <h3 className="text-[var(--color-text-subtle)] font-semibold text-sm">Task Recap</h3>
                            <p className="text-[var(--color-text-primary)] font-bold text-3xl">--</p>
                        </div>
                    </div>
                    <button
                        onClick={onBrainDumpClick}
                        className="flex items-center space-x-2 px-6 py-4 mx-auto text-lg font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg transition-all duration-300 shadow-md">
                        <span>Brain Dump for Tomorrow</span>
                    </button>
                </div>
            </main>
        );
    }
    
    return (
        <main className="container mx-auto p-8 max-w-4xl space-y-10">
            {/* 1. Priority Block */}
            <section>
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">What's the Next Right Thing?</h2>
                <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-hover)]">
                    {priorityItem.type === 'event' && <>
                        <div className="flex items-center gap-4">
                            <CalendarIcon className="h-8 w-8 text-[var(--color-secondary-accent)] flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{priorityItem.data.title}</h3>
                                <p className="text-sm text-[var(--color-text-secondary)]">{formatTime(priorityItem.data.startMin)} - {formatTime(priorityItem.data.endMin)}</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--color-text-subtle)] mt-3 italic">Next up because: {priorityItem.reason}</p>
                        <div className="mt-4 flex gap-2"><button className="px-4 py-2 font-semibold text-white bg-[var(--color-primary-accent)] rounded-lg">Prepare</button></div>
                    </>}
                    {priorityItem.type === 'map_substep' && <>
                        <div className="flex items-center gap-4">
                            <MomentumMapIcon className="h-8 w-8 text-[var(--color-secondary-accent)] flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{priorityItem.data.subStep.description}</h3>
                                <p className="text-sm text-[var(--color-text-secondary)]">From chunk: {priorityItem.data.chunk.title}</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--color-text-subtle)] mt-3 italic">Next up because: {priorityItem.reason}</p>
                        <div className="mt-4 flex items-center gap-2">
                           <button onClick={() => onNavigate('Momentum Map')} className="px-4 py-2 font-semibold text-white bg-[var(--color-primary-accent)] rounded-lg">Start</button>
                            <DropdownMenu trigger={
                                <button className="p-2 rounded-lg text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"><MoreOptionsIcon className="h-5 w-5" /></button>
                            }>
                                <button onClick={() => console.log('Snooze 1h')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)] rounded-md">Snooze (1h)</button>
                                <button onClick={() => console.log('Not today')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)] rounded-md">Not Today</button>
                            </DropdownMenu>
                        </div>
                    </>}
                    {priorityItem.type === 'braindump_item' && <>
                         <div className="flex items-center gap-4">
                            <TaskIcon className="h-8 w-8 text-[var(--color-secondary-accent)] flex-shrink-0" />
                            <div>
                                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{priorityItem.data.item}</h3>
                                {priorityItem.data.isUrgent && <p className="text-sm font-semibold text-red-600">Urgent</p>}
                            </div>
                        </div>
                        <p className="text-xs text-[var(--color-text-subtle)] mt-3 italic">Next up because: {priorityItem.reason}</p>
                         <div className="mt-4 flex items-center gap-2">
                           <button className="px-4 py-2 font-semibold text-white bg-[var(--color-primary-accent)] rounded-lg">Start</button>
                             <DropdownMenu trigger={
                                <button className="p-2 rounded-lg text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"><MoreOptionsIcon className="h-5 w-5" /></button>
                            }>
                                <button onClick={() => console.log('Snooze 1h')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)] rounded-md">Snooze (1h)</button>
                                <button onClick={() => console.log('Not today')} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)] rounded-md">Not Today</button>
                            </DropdownMenu>
                        </div>
                    </>}
                    {priorityItem.type === 'plan_prompt' && <>
                        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Your day is clear!</h3>
                        <p className="text-[var(--color-text-secondary)] mt-1">{priorityItem.reason}</p>
                        <div className="mt-4 flex gap-2">
                           <button onClick={() => onNavigate('Momentum Map')} className="px-4 py-2 font-semibold text-white bg-[var(--color-primary-accent)] rounded-lg">Create a Map</button>
                           <button onClick={onBrainDumpClick} className="px-4 py-2 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] rounded-lg">Process Thoughts</button>
                        </div>
                    </>}
                </div>
            </section>
            
            {/* 2. Upcoming Timeline */}
            {upcomingItems.length > 0 && <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Upcoming</h2>
                    <button onClick={() => onNavigate('Calendar')} className="flex items-center gap-1 text-sm font-semibold text-[var(--color-primary-accent)] hover:underline">View Full Day <ChevronRightIcon className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                    {upcomingItems.map(item => (
                        <div key={item.data.id + item.time} className="bg-[var(--color-surface)] p-3 rounded-lg border flex items-center gap-4">
                            <span className="font-semibold text-sm text-[var(--color-text-primary)] w-20">{formatTime(item.time)}</span>
                             <div className={`w-1 h-8 rounded-full ${item.type === 'anchor' ? 'bg-[var(--color-secondary-accent)]' : 'bg-[var(--color-warning)]'}`}></div>
                             <div className="flex-1">
                                 <p className="font-semibold text-[var(--color-text-primary)]">{item.type === 'anchor' ? (item.data as ScheduleEvent).title : (item.data as SmartReminder).message}</p>
                             </div>
                             {item.type === 'reminder' && (
                                <div className="ml-auto flex items-center gap-1">
                                    <button onClick={() => handleCompleteReminder(item.data.id)} className="p-1.5 rounded-full text-green-600 hover:bg-green-100" title="Complete"><CheckCircleIcon className="h-5 w-5" /></button>
                                    <DropdownMenu trigger={
                                        <button className="p-1.5 rounded-full text-stone-500 hover:bg-stone-100" title="Snooze"><SnoozeIcon className="h-5 w-5" /></button>
                                    }>
                                        <button onClick={() => handleSnoozeReminder(item.data.id, 15)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)] rounded-md">15 minutes</button>
                                        <button onClick={() => handleSnoozeReminder(item.data.id, 60)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)] rounded-md">1 hour</button>
                                        <button onClick={() => handleSnoozeReminder(item.data.id, 1440)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-surface-sunken)] rounded-md">Tomorrow</button>
                                    </DropdownMenu>
                                </div>
                             )}
                        </div>
                    ))}
                </div>
            </section>}

            {/* 3. Quick Wins Carousel */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Quick Wins</h2>
                    {quickWins.length > 0 && <span className="text-sm font-semibold text-[var(--color-text-secondary)]">🔥 0 Streak</span>}
                </div>
                {quickWins.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 -mb-4 snap-x snap-mandatory">
                        {quickWins.map(item => (
                             <div key={item.id} className="bg-[var(--color-surface)] p-4 rounded-xl border flex-shrink-0 w-64 snap-start flex flex-col justify-between">
                                 <div>
                                     <p className="font-semibold text-[var(--color-text-primary)]">{item.item}</p>
                                     <p className="text-xs text-[var(--color-text-subtle)] mt-1">~{item.timeEstimateMinutesP90} minutes</p>
                                 </div>
                                 <div className="flex gap-2 mt-4">
                                     <button onClick={() => handleQuickWinDone(item.id)} className="p-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200" title="Done"><CheckCircleIcon className="h-5 w-5"/></button>
                                     <button className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200" title="Start 15-min timer"><PlayIcon className="h-5 w-5"/></button>
                                     <button onClick={() => handleQuickWinArchive(item)} className="p-2 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200" title="Archive"><TrashIcon className="h-5 w-5"/></button>
                                 </div>
                             </div>
                        ))}
                        <div onClick={() => onNavigate('Brain Dump')} className="bg-[var(--color-surface-sunken)] p-4 rounded-xl border-2 border-dashed flex-shrink-0 w-64 snap-start flex flex-col justify-center items-center text-center cursor-pointer hover:border-[var(--color-primary-accent)]">
                            <p className="font-semibold text-[var(--color-text-primary)]">View All Thoughts</p>
                            <p className="text-sm text-[var(--color-text-subtle)]">Go to Brain Dump</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-8 bg-[var(--color-surface)] rounded-xl border border-dashed">
                        <p className="font-semibold text-[var(--color-text-primary)]">No Quick Wins Available</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">Process thoughts in your Brain Dump to find low-effort tasks.</p>
                        <button onClick={() => onNavigate('Brain Dump')} className="mt-4 px-4 py-2 font-semibold text-sm text-white bg-[var(--color-primary-accent)] rounded-lg">Go to Brain Dump</button>
                    </div>
                )}
            </section>

            {/* 4. Active Momentum Map */}
            {activeMapData && <section>
                 <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Active Momentum Map</h2>
                 <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border">
                    <div className="flex items-start gap-4">
                        <FinishLineIcon className="h-8 w-8 text-[var(--color-primary-accent)] flex-shrink-0 mt-1" />
                        <div>
                            <p className="text-sm font-semibold text-[var(--color-text-subtle)]">FINISH LINE</p>
                            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{activeMapData.finishLine.statement}</h3>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between items-center text-sm font-medium text-[var(--color-text-subtle)] mb-1">
                            <span>Overall Progress</span>
                            <span>{activeMapData.chunks.filter(c => c.isComplete).length} / {activeMapData.chunks.length} Chunks</span>
                        </div>
                        <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-2.5 border">
                             <div className="bg-[var(--color-success)] h-2.5 rounded-full" style={{width: `${(activeMapData.chunks.filter(c => c.isComplete).length / activeMapData.chunks.length) * 100}%`}}></div>
                        </div>
                    </div>
                     <div className="mt-4 pt-4 border-t flex justify-between items-center">
                        <p className="text-sm text-[var(--color-text-secondary)]">Current chunk: <span className="font-semibold text-[var(--color-text-primary)]">{activeMapData.chunks.find(c => !c.isComplete)?.title || "Final Review"}</span></p>
                        <button onClick={() => onNavigate('Momentum Map')} className="px-4 py-2 font-semibold text-sm text-white bg-[var(--color-primary-accent)] rounded-lg">View Full Map</button>
                     </div>
                 </div>
            </section>}
        </main>
    );
};

export default TodayPage;