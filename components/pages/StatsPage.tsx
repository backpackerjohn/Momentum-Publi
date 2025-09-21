import React from 'react';
import { CompletionRecord, EnergyTag, SmartReminder, ReminderStatus } from '../../types';
import FireIcon from '../icons/FireIcon';
import RocketIcon from '../icons/RocketIcon';
import TargetIcon from '../icons/TargetIcon';
import DownloadIcon from '../icons/DownloadIcon';

// --- MOCK DATA (as per PRP) ---
const MOCK_STREAK = 14;
const MOCK_VELOCITY = "5.2 sub-steps/day";
const MOCK_ACCURACY = "82%";

const MOCK_HEATMAP_DATA: Record<EnergyTag, Record<string, number>> = {
    [EnergyTag.Creative]: { 'Morning': 8, 'Afternoon': 9, 'Evening': 3 },
    [EnergyTag.Tedious]: { 'Morning': 5, 'Afternoon': 2, 'Evening': 1 },
    [EnergyTag.Admin]: { 'Morning': 7, 'Afternoon': 6, 'Evening': 4 },
    [EnergyTag.Social]: { 'Morning': 1, 'Afternoon': 4, 'Evening': 8 },
    [EnergyTag.Errand]: { 'Morning': 2, 'Afternoon': 7, 'Evening': 2 },
};

const MOCK_REMINDER_LOG = [
    { id: 'rl-1', message: 'Review Q3 deck', status: ReminderStatus.Done, engagedAt: new Date(Date.now() - 86400000) },
    { id: 'rl-2', message: 'Pack gym bag', status: ReminderStatus.Snoozed, engagedAt: new Date(Date.now() - 2 * 86400000) },
    { id: 'rl-3', message: 'Follow up with Jane', status: ReminderStatus.Ignored, engagedAt: new Date(Date.now() - 3 * 86400000) },
    { id: 'rl-4', message: 'Call pharmacy', status: ReminderStatus.Done, engagedAt: new Date(Date.now() - 4 * 86400000) },
];

// --- SUB-COMPONENTS ---

const ProgressRing: React.FC<{ progress: number; size: number; strokeWidth: number; text: string }> = ({ progress, size, strokeWidth, text }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    stroke="var(--color-surface-sunken)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke="var(--color-primary-accent)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease-out' }}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">{text}</span>
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] -mt-1">days</span>
            </div>
        </div>
    );
};

const StatsCard: React.FC<{ title: string; value?: string; children?: React.ReactNode; icon: React.FC<{className?: string}>; }> = ({ title, value, children, icon: Icon }) => (
    <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border border-[var(--color-border)]">
        <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-[var(--color-secondary-accent)]" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h3>
        </div>
        <div className="mt-4 flex items-center justify-center">
            {children || <span className="text-5xl font-extrabold text-[var(--color-text-primary)] tracking-tighter">{value}</span>}
        </div>
    </div>
);

const Heatmap: React.FC<{ data: typeof MOCK_HEATMAP_DATA }> = ({ data }) => {
    const energyTags = Object.values(EnergyTag);
    const timesOfDay = ['Morning', 'Afternoon', 'Evening'];
    const maxVal = Math.max(...Object.values(data).flatMap(d => Object.values(d)));

    const getColor = (value: number) => {
        if (value === 0) return 'bg-[var(--color-surface-sunken)]';
        const percentage = value / maxVal;
        if (percentage < 0.25) return 'bg-sky-200';
        if (percentage < 0.5) return 'bg-teal-300';
        if (percentage < 0.75) return 'bg-green-400';
        return 'bg-yellow-400';
    };

    return (
        <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] mt-4">
            <div className="grid grid-cols-4 gap-1">
                <div />
                {timesOfDay.map(time => <div key={time} className="text-center font-bold text-sm text-[var(--color-text-secondary)] py-2">{time}</div>)}
                
                {energyTags.map(tag => (
                    <React.Fragment key={tag}>
                        <div className="flex items-center justify-end pr-2 font-bold text-sm text-[var(--color-text-secondary)]">{tag}</div>
                        {timesOfDay.map(time => {
                            const value = data[tag]?.[time] || 0;
                            return (
                                <div key={`${tag}-${time}`} className="relative group">
                                    <div className={`w-full h-12 rounded-lg ${getColor(value)} transition-transform group-hover:scale-110`} />
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-black/60">{value > 0 ? value : ''}</div>
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                        {value} completions
                                    </div>
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
interface StatsPageProps {
    completionHistory: Record<EnergyTag, CompletionRecord[]>;
    smartReminders: SmartReminder[];
    onNavigate: (page: string) => void;
}

const StatsPage: React.FC<StatsPageProps> = ({ onNavigate }) => {
    const hasData = MOCK_REMINDER_LOG.length > 0;

    if (!hasData) {
        return (
            <main className="container mx-auto p-8">
                <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)]">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">No data yet.</h2>
                    <p className="text-[var(--color-text-secondary)] mt-2">Start by creating a Momentum Map or Calendar Anchor to see your stats.</p>
                    <button onClick={() => onNavigate('Momentum Map')} className="mt-6 px-5 py-2.5 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-sm">
                        Create a Momentum Map
                    </button>
                </div>
            </main>
        );
    }
    
    const getStatusChip = (status: ReminderStatus) => {
        const styles = {
            [ReminderStatus.Done]: 'bg-green-100 text-green-800',
            [ReminderStatus.Snoozed]: 'bg-yellow-100 text-yellow-800',
            [ReminderStatus.Ignored]: 'bg-red-100 text-red-800',
        };
        return styles[status] || 'bg-stone-100 text-stone-800';
    };

    return (
        <main className="container mx-auto p-8">
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">Stats</h1>
            <p className="text-[var(--color-text-secondary)] mt-2 max-w-2xl">
                Providing neutral, ADHD-friendly insights into your work patterns with clear visuals and non-judgmental tone.
            </p>
            
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                <StatsCard title="Current Streak" icon={FireIcon}>
                    <ProgressRing progress={70} size={150} strokeWidth={15} text={String(MOCK_STREAK)} />
                </StatsCard>
                <StatsCard title="Completion Velocity" value={MOCK_VELOCITY} icon={RocketIcon} />
                <StatsCard title="Estimate Accuracy" value={MOCK_ACCURACY} icon={TargetIcon} />
            </section>
            
            <section className="my-12">
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Productivity Heatmap</h2>
                <p className="text-[var(--color-text-secondary)] mt-1">Your most productive times by energy type. Darker means more completions.</p>
                <Heatmap data={MOCK_HEATMAP_DATA} />
            </section>
            
            <section className="my-12">
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Reminder Log</h2>
                <p className="text-[var(--color-text-secondary)] mt-1">A log of your recent reminder interactions.</p>
                <div className="bg-[var(--color-surface)] mt-4 rounded-xl border border-[var(--color-border)]">
                    <div className="p-4 space-y-3">
                        {MOCK_REMINDER_LOG.map(log => (
                            <div key={log.id} className="flex justify-between items-center p-3 bg-[var(--color-surface-sunken)] rounded-lg">
                                <div>
                                    <p className="font-semibold text-[var(--color-text-primary)]">{log.message}</p>
                                    <p className="text-xs text-[var(--color-text-subtle)]">{log.engagedAt.toLocaleDateString()}</p>
                                </div>
                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${getStatusChip(log.status)}`}>
                                    {log.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="my-12 py-6 border-t border-[var(--color-border)] flex justify-end gap-4">
                <button className="px-5 py-2.5 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all flex items-center gap-2">
                    <DownloadIcon className="h-5 w-5" /> Export PNG
                </button>
                <button className="px-5 py-2.5 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-sm flex items-center gap-2">
                     <DownloadIcon className="h-5 w-5" /> Export CSV
                </button>
            </section>
        </main>
    );
};

export default StatsPage;
