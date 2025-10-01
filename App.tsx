

import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import BrainDumpModal from './components/BrainDumpModal';
import { GoogleGenAI, Type } from "@google/genai";
import { BrainDumpItem, Note, SavedTask, MomentumMapData, EnergyTag, ScheduleEvent, SmartReminder, ContextTag, ReminderStatus, DNDWindow, TimeLearningSettings, CompletionRecord, ThemeSettings, ThemeName, CustomThemeProperties, Confirmation, UndoAction, Cluster } from './types';
import { getCompletionHistory, addRecordToHistory } from './utils/timeAnalytics';
import { themes, themePresets } from './utils/styles';
import { determineOptimalTheme } from './utils/themeEngine';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import ThemeSuggestionToast from './components/ThemeSuggestionToast';
import SuccessToast from './components/SuccessToast';
import ConfirmationModal from './components/ConfirmationModal';
import UndoToast from './components/UndoToast';
import { auth } from './utils/firebase';
// @google/genai-api-fix: Corrected Firebase Auth import path to align with project's usage of @firebase/auth.
import { onAuthStateChanged, User } from '@firebase/auth';
import { hasLocalData, migrateLocalToFirestore } from './utils/migration';
import { saveDocument, loadAllData } from './utils/dataService';
import MigrationModal from './components/MigrationModal';

import Dashboard from './components/pages/Dashboard';
import TodayPage from './components/pages/TodayPage';
import MomentumMap from './components/pages/MomentumMap';
import BrainDump from './components/pages/BrainDump';
import TaskPage from './components/pages/TaskPage';
import CalendarPage from './components/pages/CalendarPage';
import StatsPage from './components/pages/StatsPage';
import TimeLearningSettingsPage from './components/pages/TimeLearningSettingsPage';
import DesktopIcon from './components/icons/DesktopIcon';
import MobileIcon from './components/icons/MobileIcon';


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const processWithGemini = async (text: string): Promise<BrainDumpItem[]> => {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: 'A unique identifier for the item (e.g., timestamp and index).' },
                item: { type: Type.STRING, description: 'The original text of the single, distinct thought or task.' },
                tags: { 
                    type: Type.ARRAY, 
                    description: 'An array of relevant tags or categories (e.g., "Work", "Marketing", "Urgent", "Idea").',
                    items: { type: Type.STRING } 
                },
                isUrgent: { type: Type.BOOLEAN, description: 'True if the item contains language indicating urgency (e.g., "by Thursday", "ASAP").' },
            },
            required: ['id', 'item', 'tags', 'isUrgent'],
        },
    };

    const prompt = `
      Analyze the following text, which is a "brain dump" of thoughts.
      Split the text into individual, distinct items.
      For each item, perform the following actions:
      1.  **Extract Tags**: Assign a list of relevant tags (e.g., "Work", "Personal", "Ideas", "Marketing Campaign", "Q2 Budget"). Combine high-level categories and specific projects into a single list of tags. If the item is urgent, also include an "Urgent" tag.
      2.  **Detect Urgency**: Separately determine if the item is time-sensitive based on keywords (e.g., "by EOD", "tomorrow", "needs to be done"). Set isUrgent to true if so.
      3.  **Generate ID**: Create a unique ID for each item using the current timestamp in milliseconds combined with its index.
      Return the output as a JSON object that strictly follows this schema.

      Input Text:
      "${text}"
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
        return Array.isArray(result) ? result : [];

    } catch (error) {
        console.error("Error processing with Gemini:", error);
        throw new Error("Failed to process thoughts. The AI model might be busy. Please try again.");
    }
};

const mockBrainDumpItems: BrainDumpItem[] = [
  {
    id: 'bd-mock-1',
    item: 'Draft Q3 marketing strategy document',
    tags: ['Work', 'Marketing', 'Q3 Planning', 'Urgent'],
    isUrgent: true,
    timeEstimateMinutesP50: 90,
    timeEstimateMinutesP90: 120,
    blockers: ['Awaiting final budget numbers'],
  },
  {
    id: 'bd-mock-2',
    item: 'Book dentist appointment for next month',
    tags: ['Personal', 'Health'],
    isUrgent: false,
    timeEstimateMinutesP50: 5,
    timeEstimateMinutesP90: 10,
    blockers: [],
  },
];

const mockSavedTasks: SavedTask[] = [
  {
    id: 'map-mock-1',
    nickname: 'Launch New Feature',
    note: 'Paused this to work on a critical bug fix. Ready to resume with user testing chunk.',
    savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    mapData: {
      finishLine: {
        statement: 'Successfully launch the new "AI Insights" feature to all users',
        acceptanceCriteria: [
          'Feature is live and accessible to 100% of the user base.',
          'No critical bugs reported within the first 72 hours.',
          'Positive feedback received from at least 10 users.',
        ],
      },
      chunks: [
        {
          id: 'chunk-mock-1-1', title: 'Finalize UI/UX Design',
          subSteps: [
            { id: 'ss-mock-1-1-1', description: 'Incorporate feedback from stakeholder review', isComplete: true },
            { id: 'ss-mock-1-1-2', description: 'Create final high-fidelity mockups in Figma', isComplete: true },
            { id: 'ss-mock-1-1-3', description: 'Prepare design assets for development handoff', isComplete: true },
          ],
          p50: 60, p90: 90, energyTag: EnergyTag.Creative, blockers: [], isComplete: true,
        },
        {
          id: 'chunk-mock-1-2', title: 'Frontend Development',
          subSteps: [
            { id: 'ss-mock-1-2-1', description: 'Set up component structure', isComplete: true },
            { id: 'ss-mock-1-2-2', description: 'Implement UI based on Figma designs', isComplete: true },
            { id: 'ss-mock-1-2-3', description: 'Integrate with backend API endpoints', isComplete: false },
            { id: 'ss-mock-1-2-4', description: 'Write unit tests for key components', isComplete: false },
          ],
          p50: 120, p90: 180, energyTag: EnergyTag.Tedious, blockers: ['Waiting on final API schema'], isComplete: false,
        },
      ],
    },
    progress: { completedChunks: 1, totalChunks: 2, completedSubSteps: 5, totalSubSteps: 7 },
  },
];

// Updated mock data to match new types
const mockScheduleEvents: ScheduleEvent[] = [
  { id: 'se-1', title: 'Work', days: [1, 2, 3, 4, 5], startMin: 540, endMin: 1020, contextTags: [ContextTag.Work, ContextTag.HighEnergy], bufferMinutes: { prep: 5, recovery: 15 } },
  { id: 'se-2', title: 'Gym Session', days: [1, 3, 5], startMin: 1080, endMin: 1140, contextTags: [ContextTag.Personal, ContextTag.HighEnergy], bufferMinutes: { prep: 15, recovery: 20 } },
  { id: 'se-3', title: 'Family Dinner', days: [0], startMin: 1140, endMin: 1200, contextTags: [ContextTag.Personal, ContextTag.Relaxed] }
];

const mockSmartReminders: SmartReminder[] = [
    { id: 'sr-1', anchorId: 'se-1', offsetMinutes: -10, message: 'Review yesterday\'s notes for standup.', why: 'So you feel prepared and on top of your tasks.', isLocked: false, isExploratory: false, status: ReminderStatus.Active, snoozeHistory: [], snoozedUntil: null, successHistory: ['success', 'success', 'snoozed'], lastInteraction: new Date(Date.now() - 86400000).toISOString(), allowExploration: true },
    { id: 'sr-2', anchorId: 'se-2', offsetMinutes: -30, message: 'Pack gym bag and fill water bottle.', why: 'This reduces friction to get your workout started.', isLocked: false, isExploratory: false, status: ReminderStatus.Active, snoozeHistory: [10, 10, 10], snoozedUntil: null, successHistory: ['snoozed', 'snoozed', 'snoozed', 'success'], lastInteraction: new Date().toISOString(), allowExploration: true },
];

const mockDndWindows: DNDWindow[] = [
  { id: 'dnd-1', days: [0,1,2,3,4,5,6], startMin: 1380, endMin: 420, enabled: true } // 11 PM to 7 AM
];

const useTheme = (activeMap: MomentumMapData | null, scheduleEvents: ScheduleEvent[], dndWindows: DNDWindow[]) => {
    const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
        const defaultSettings: ThemeSettings = { 
            mode: 'auto', 
            manualTheme: 'Creative',
            customThemeProperties: themePresets.Default,
            userOverrides: {},
        };
        try {
            const storedString = localStorage.getItem('themeSettings');
            if (!storedString) return defaultSettings;
            
            const storedSettings = JSON.parse(storedString);
            
            if (storedSettings.customThemeProperties && 'contrastLevel' in storedSettings.customThemeProperties) {
                storedSettings.customThemeProperties.uiContrastLevel = storedSettings.customThemeProperties.contrastLevel;
                storedSettings.customThemeProperties.textContrastLevel = storedSettings.customThemeProperties.contrastLevel;
                delete storedSettings.customThemeProperties.contrastLevel;
            }
            
            return {
                ...defaultSettings,
                ...storedSettings,
                customThemeProperties: {
                    ...defaultSettings.customThemeProperties,
                    ...(storedSettings.customThemeProperties || {}),
                }
            };
        } catch {
             return defaultSettings;
        }
    });

    const [activeThemeName, setActiveThemeName] = useState<ThemeName>('Creative');
    const [themeSuggestion, setThemeSuggestion] = useState<ThemeName | null>(null);
    const [previewTheme, setPreviewTheme] = useState<ThemeName | null>(null);

    useEffect(() => {
        const activeChunk = activeMap?.chunks.find(c => c.startedAt && !c.completedAt) || null;
        const now = new Date();
        // This logic needs update based on new ScheduleEvent/Anchor types
        // For now, it will be less accurate but won't crash
        const currentEvents: any[] = []; // Placeholder

        const optimalTheme = determineOptimalTheme({
            activeChunk,
            currentEvents: [], // TODO: Re-implement this with new data structure
            scheduleEvents,
            currentTime: now,
            dndWindows
        });

        const currentTheme = themeSettings.mode === 'auto' ? activeThemeName : themeSettings.manualTheme;
        
        if (themeSettings.mode === 'auto' && optimalTheme !== currentTheme && optimalTheme !== themeSuggestion) {
            const lastOverrideTime = themeSettings.userOverrides.lastOverride;
            if (lastOverrideTime && (Date.now() - lastOverrideTime) < 5 * 60 * 1000) { // 5 min cooldown
              return;
            }

            const lastDismissal = themeSettings.userOverrides.lastDismissal;
            if (lastDismissal && lastDismissal.theme === optimalTheme && (Date.now() - lastDismissal.timestamp) < 5 * 60 * 1000) {
                return; // Don't re-suggest a theme if it was recently dismissed
            }

            setThemeSuggestion(optimalTheme);
        } else if (themeSettings.mode === 'manual' && themeSuggestion) {
            setThemeSuggestion(null);
        }

        if (themeSettings.mode === 'manual') {
          setActiveThemeName(themeSettings.manualTheme);
        }

    }, [activeMap, scheduleEvents, dndWindows, themeSettings.mode, activeThemeName, themeSuggestion, themeSettings.manualTheme, themeSettings.userOverrides]);

    useEffect(() => {
        const root = document.documentElement;
        
        const activeEffectiveTheme = themeSettings.mode === 'manual' ? themeSettings.manualTheme : activeThemeName;
        const themeToApplyName = previewTheme || activeEffectiveTheme;

        const themeProperties = themes[themeToApplyName];
        Object.entries(themeProperties).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        const custom = themeSettings.customThemeProperties;
        root.style.setProperty('--animation-speed-modifier', String(custom.animationSpeed));
        root.style.setProperty('--color-intensity-modifier', String(custom.colorIntensity));
        root.style.setProperty('--ui-contrast-modifier', String(custom.uiContrastLevel));
        root.style.setProperty('--text-contrast-modifier', String(custom.textContrastLevel));

    }, [activeThemeName, themeSettings, previewTheme]);

    const acceptThemeSuggestion = () => {
        if (themeSuggestion) {
            setActiveThemeName(themeSuggestion);
            setThemeSuggestion(null);
            setPreviewTheme(null);
        }
    };
    
    const dismissThemeSuggestion = () => {
        if (themeSuggestion) {
            setThemeSettings(prev => ({
                ...prev,
                userOverrides: {
                    ...prev.userOverrides,
                    lastDismissal: { theme: themeSuggestion, timestamp: Date.now() },
                }
            }));
        }
        setThemeSuggestion(null);
        setPreviewTheme(null);
    };

    const startThemePreview = (theme: ThemeName) => {
        setPreviewTheme(theme);
    };

    const clearThemePreview = () => {
        setPreviewTheme(null);
    };

    const displayThemeName = themeSettings.mode === 'auto' 
      ? `Auto: ${activeThemeName}` 
      : activeThemeName;

    return { themeSettings, setThemeSettings, activeTheme: displayThemeName, themeSuggestion, acceptThemeSuggestion, dismissThemeSuggestion, setActiveThemeName, startThemePreview, clearThemePreview };
};


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('Today');
  const [isBrainDumpModalOpen, setIsBrainDumpModalOpen] = useState(false);
  const [isThemeSettingsModalOpen, setIsThemeSettingsModalOpen] = useState(false);
  const [processedItems, setProcessedItems] = useState<BrainDumpItem[]>(() => { try { const i = localStorage.getItem('brainDumpItems'); return i ? JSON.parse(i) : mockBrainDumpItems; } catch { return mockBrainDumpItems; } });
  const [notes, setNotes] = useState<Record<string, Note>>(() => { try { const n = localStorage.getItem('brainDumpNotes'); return n ? JSON.parse(n) : {}; } catch { return {}; } });
  const [savedTasks, setSavedTasks] = useState<SavedTask[]>(() => { try { const t = localStorage.getItem('savedMomentumMaps'); return t ? JSON.parse(t) : mockSavedTasks; } catch { return mockSavedTasks; }});
  const [activeMapData, setActiveMapData] = useState<MomentumMapData | null>(() => { try { const m = localStorage.getItem('activeMapData'); return m ? JSON.parse(m) : null; } catch { return null; } });
  const [clusters, setClusters] = useState<Cluster[]>(() => { try { const c = localStorage.getItem('clustersData'); return c ? JSON.parse(c) : []; } catch { return []; } });
  
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(() => { try { const s = localStorage.getItem('scheduleEvents'); return s ? JSON.parse(s) : mockScheduleEvents; } catch { return mockScheduleEvents; } });
  const [smartReminders, setSmartReminders] = useState<SmartReminder[]>(() => { try { const r = localStorage.getItem('smartReminders'); return r ? JSON.parse(r) : mockSmartReminders; } catch { return mockSmartReminders; } });
  const [dndWindows, setDndWindows] = useState<DNDWindow[]>(() => { try { const d = localStorage.getItem('dndWindows'); return d ? JSON.parse(d) : mockDndWindows; } catch { return mockDndWindows; } });
  const [pauseUntil, setPauseUntil] = useState<string | null>(() => { try { const p = localStorage.getItem('pauseUntil'); return p ? p : null; } catch { return null; } });
  const [calendarSetupCompleted, setCalendarSetupCompleted] = useState<boolean>(() => { try { const c = localStorage.getItem('calendarSetupCompleted'); return c ? JSON.parse(c) : false; } catch { return false; } });


  const [completionHistory, setCompletionHistory] = useState<Record<EnergyTag, CompletionRecord[]>>(() => getCompletionHistory());
  const [timeLearningSettings, setTimeLearningSettings] = useState<TimeLearningSettings>(() => {
    try {
        const s = localStorage.getItem('timeLearningSettings');
        return s ? JSON.parse(s) : { isEnabled: true, sensitivity: 0.3 };
    } catch {
        return { isEnabled: true, sensitivity: 0.3 };
    }
  });
  
  const { themeSettings, setThemeSettings, activeTheme, themeSuggestion, acceptThemeSuggestion, dismissThemeSuggestion, setActiveThemeName, startThemePreview, clearThemePreview } = useTheme(activeMapData, scheduleEvents, dndWindows);

  const [error, setError] = useState<string|null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const [initialMapGoal, setInitialMapGoal] = useState<{ goal: string; context: BrainDumpItem[] } | null>(null);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('brainDumpItems', JSON.stringify(processedItems)); 
      if(user) saveDocument(user.uid, 'brainDumpItems', processedItems);
    }
  }, [processedItems, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('brainDumpNotes', JSON.stringify(notes)); 
      if(user) saveDocument(user.uid, 'brainDumpNotes', notes);
    }
  }, [notes, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('savedMomentumMaps', JSON.stringify(savedTasks)); 
      if(user) saveDocument(user.uid, 'savedMomentumMaps', savedTasks);
    }
  }, [savedTasks, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      if (activeMapData) {
        localStorage.setItem('activeMapData', JSON.stringify(activeMapData)); 
      } else {
        localStorage.removeItem('activeMapData');
      }
      if(user) saveDocument(user.uid, 'activeMapData', activeMapData);
    }
  }, [activeMapData, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('clustersData', JSON.stringify(clusters)); 
      if(user) saveDocument(user.uid, 'clustersData', clusters);
    }
  }, [clusters, user, isDataLoaded]);
  
  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents)); 
      if(user) saveDocument(user.uid, 'scheduleEvents', scheduleEvents);
    }
  }, [scheduleEvents, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('smartReminders', JSON.stringify(smartReminders)); 
      if(user) saveDocument(user.uid, 'smartReminders', smartReminders);
    }
  }, [smartReminders, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('dndWindows', JSON.stringify(dndWindows)); 
      if(user) saveDocument(user.uid, 'dndWindows', dndWindows);
    }
  }, [dndWindows, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      if (pauseUntil) {
        localStorage.setItem('pauseUntil', pauseUntil); 
      } else {
        localStorage.removeItem('pauseUntil');
      }
      if(user) saveDocument(user.uid, 'pauseUntil', pauseUntil);
    }
  }, [pauseUntil, user, isDataLoaded]);
  
  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('calendarSetupCompleted', JSON.stringify(calendarSetupCompleted)); 
      if(user) saveDocument(user.uid, 'calendarSetupCompleted', calendarSetupCompleted);
    }
  }, [calendarSetupCompleted, user, isDataLoaded]);


  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('timeLearningSettings', JSON.stringify(timeLearningSettings));
      if(user) saveDocument(user.uid, 'timeLearningSettings', timeLearningSettings);
    }
  }, [timeLearningSettings, user, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
        localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
        if (user) {
            saveDocument(user.uid, 'themeSettings', themeSettings);
        }
    }
  }, [themeSettings, user, isDataLoaded]);
  
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const MIGRATION_FLAG = 'migrationCompleted_v1';
            const hasMigrated = localStorage.getItem(MIGRATION_FLAG) === 'true';

            if (!hasMigrated && hasLocalData()) {
                setMigrationStatus('migrating');
                try {
                    await migrateLocalToFirestore(currentUser.uid);
                    localStorage.setItem(MIGRATION_FLAG, 'true');
                    setMigrationStatus('success');
                } catch (error) {
                    console.error('Migration failed:', error);
                    setMigrationStatus('error');
                    setIsDataLoaded(true); 
                    return; 
                }
            }

            try {
                const firestoreData = await loadAllData(currentUser.uid);
                
                if (Object.keys(firestoreData).length > 0) {
                    if (firestoreData.brainDumpItems) setProcessedItems(firestoreData.brainDumpItems);
                    if (firestoreData.brainDumpNotes) setNotes(firestoreData.brainDumpNotes);
                    if (firestoreData.savedMomentumMaps) setSavedTasks(firestoreData.savedMomentumMaps);
                    if (firestoreData.activeMapData !== undefined) setActiveMapData(firestoreData.activeMapData);
                    if (firestoreData.clustersData) setClusters(firestoreData.clustersData);
                    if (firestoreData.scheduleEvents) setScheduleEvents(firestoreData.scheduleEvents);
                    if (firestoreData.smartReminders) setSmartReminders(firestoreData.smartReminders);
                    if (firestoreData.dndWindows) setDndWindows(firestoreData.dndWindows);
                    if (firestoreData.pauseUntil !== undefined) setPauseUntil(firestoreData.pauseUntil);
                    if (firestoreData.calendarSetupCompleted !== undefined) setCalendarSetupCompleted(firestoreData.calendarSetupCompleted);
                    if (firestoreData.timeLearningSettings) setTimeLearningSettings(firestoreData.timeLearningSettings);
                    if (firestoreData.themeSettings) {
                        setThemeSettings(prev => ({
                            ...prev,
                            ...firestoreData.themeSettings,
                            customThemeProperties: {
                                ...prev.customThemeProperties,
                                ...(firestoreData.themeSettings.customThemeProperties || {}),
                            }
                        }));
                    }
                }
                setIsDataLoaded(true);
            } catch (error) {
                console.error("Failed to load data from Firestore:", error);
                setIsDataLoaded(true);
            }
        } else {
            setIsDataLoaded(true);
        }
    });
    return () => unsubscribe();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Emergency Calm Mode
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setThemeSettings(prev => ({
          ...prev,
          mode: 'manual',
          manualTheme: 'Recovery',
          customThemeProperties: themePresets['Minimal Stimulation'],
        }));
        setIsThemeSettingsModalOpen(true);
      }

      // Quick Brain Dump
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setIsBrainDumpModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setThemeSettings]);

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
  };

  const showConfirmation = (props: Omit<Confirmation, 'isOpen'>) => {
    setConfirmation({ ...props, isOpen: true });
  };

  const handleConfirm = () => {
    if (confirmation && confirmation.onConfirm) {
        confirmation.onConfirm();
    }
    setConfirmation(null);
  };

  const handleCancelConfirmation = () => {
    setConfirmation(null);
  };

  const showUndoToast = (action: Omit<UndoAction, 'id'>) => {
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
    }
    const newAction = { ...action, id: Date.now() };
    setUndoAction(newAction);

    undoTimeoutRef.current = window.setTimeout(() => {
        setUndoAction(null);
    }, 6000);
  };

  const handleUndo = () => {
    if (undoAction && undoAction.onUndo) {
        undoAction.onUndo();
    }
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
    }
    setUndoAction(null);
  };

  const handleBrainDumpSubmit = async (text: string) => {
    setError(null);
    try {
      const newItems = await processWithGemini(text);
      setProcessedItems(prev => [...prev, ...newItems]);
      handleNavigate('Brain Dump');
    } catch (e) {
      // FIX: Handle unknown error type in catch block
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred");
      }
      throw e;
    }
  };
  
  const handleNavigate = (page: string, payload?: any) => {
    if (page === 'Momentum Map' && payload?.initialGoal) {
        setInitialMapGoal(payload.initialGoal);
    } else if (page === 'Momentum Map') {
        setInitialMapGoal(null);
    }
    setCurrentPage(page);
  };

  const handleResumeMap = (task: SavedTask) => {
    setActiveMapData(task.mapData);
    handleNavigate('Momentum Map');
  };

  const handleNewCompletionRecord = (record: Omit<CompletionRecord, 'id'>) => {
    if (!timeLearningSettings.isEnabled) return;
    const newHistory = addRecordToHistory(record);
    setCompletionHistory(newHistory);
  };

  const renderPage = () => {
    if (!isDataLoaded && user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <svg className="animate-spin h-12 w-12 text-[var(--color-primary-accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        );
    }

    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Today':
        return <TodayPage
                  scheduleEvents={scheduleEvents}
                  smartReminders={smartReminders}
                  setSmartReminders={setSmartReminders}
                  activeMapData={activeMapData}
                  brainDumpItems={processedItems}
                  setBrainDumpItems={setProcessedItems}
                  onNavigate={handleNavigate}
                  onBrainDumpClick={() => setIsBrainDumpModalOpen(true)}
                  onUndo={showUndoToast}
                  onSuccess={showSuccessToast}
                />;
      case 'Momentum Map':
        return <MomentumMap 
                  activeMap={activeMapData}
                  setActiveMap={setActiveMapData}
                  setSavedTasks={setSavedTasks}
                  completionHistory={completionHistory}
                  onNewCompletionRecord={handleNewCompletionRecord}
                  timeLearningSettings={timeLearningSettings}
                  onSuccess={showSuccessToast}
                  initialGoal={initialMapGoal}
                  setInitialGoal={setInitialMapGoal}
                />;
      case 'Brain Dump':
        return <BrainDump 
                  processedItems={processedItems}
                  setProcessedItems={setProcessedItems}
                  notes={notes}
                  setNotes={setNotes}
                  clusters={clusters}
                  setClusters={setClusters}
                  handleProcess={handleBrainDumpSubmit}
                  error={error}
                  setError={setError}
                  onConfirm={showConfirmation}
                  onPromote={(goal, context) => handleNavigate('Momentum Map', { initialGoal: { goal, context } })}
                />;
      case 'Task':
        return <TaskPage 
                  savedTasks={savedTasks} 
                  setSavedTasks={setSavedTasks}
                  onResume={handleResumeMap} 
                  onUndo={showUndoToast}
                />;
      case 'Calendar':
        return <CalendarPage
                  scheduleEvents={scheduleEvents}
                  setScheduleEvents={setScheduleEvents}
                  smartReminders={smartReminders}
                  setSmartReminders={setSmartReminders}
                  dndWindows={dndWindows}
                  setDndWindows={setDndWindows}
                  pauseUntil={pauseUntil}
                  setPauseUntil={setPauseUntil}
                  calendarSetupCompleted={calendarSetupCompleted}
                  setCalendarSetupCompleted={setCalendarSetupCompleted}
                  onSuccess={showSuccessToast}
                  onUndo={showUndoToast}
                  previewMode={previewMode}
                />;
      case 'Stats':
        return <StatsPage
                  completionHistory={completionHistory}
                  smartReminders={smartReminders}
                  onNavigate={handleNavigate}
                />;
      case 'Settings':
        return <TimeLearningSettingsPage
                  settings={timeLearningSettings}
                  setSettings={setTimeLearningSettings}
                  completionHistory={completionHistory}
                  setCompletionHistory={setCompletionHistory}
                  onConfirm={showConfirmation}
                />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`app-root preview-${previewMode}`}>
        <div className="app-content">
            <div className="min-h-screen antialiased">
                <Navbar 
                    currentPage={currentPage} 
                    onNavigate={handleNavigate} 
                    onBrainDumpClick={() => setIsBrainDumpModalOpen(true)} 
                    onThemeClick={() => setIsThemeSettingsModalOpen(true)}
                    activeTheme={activeTheme}
                    previewMode={previewMode}
                />
                {renderPage()}
                <BrainDumpModal 
                    isOpen={isBrainDumpModalOpen}
                    onClose={() => setIsBrainDumpModalOpen(false)}
                    onSubmit={handleBrainDumpSubmit}
                    onSuccess={showSuccessToast}
                />
                <ThemeSettingsModal
                    isOpen={isThemeSettingsModalOpen}
                    onClose={() => setIsThemeSettingsModalOpen(false)}
                    settings={themeSettings}
                    setSettings={setThemeSettings}
                    onThemeSelect={setActiveThemeName}
                />
                <ThemeSuggestionToast
                    suggestion={themeSuggestion}
                    onAccept={acceptThemeSuggestion}
                    onDismiss={dismissThemeSuggestion}
                    onPreviewStart={startThemePreview}
                    onPreviewEnd={clearThemePreview}
                />
                <SuccessToast
                    message={toastMessage}
                    onDismiss={() => setToastMessage(null)}
                />
                <ConfirmationModal
                    isOpen={confirmation?.isOpen || false}
                    onClose={handleCancelConfirmation}
                    onConfirm={handleConfirm}
                    title={confirmation?.title || ''}
                    message={confirmation?.message || ''}
                    confirmText={confirmation?.confirmText || 'Confirm'}
                />
                <UndoToast
                    action={undoAction}
                    onUndo={handleUndo}
                    onDismiss={() => setUndoAction(null)}
                />
                {migrationStatus !== 'idle' && (
                    <MigrationModal 
                        status={migrationStatus} 
                        onClose={() => setMigrationStatus('idle')} 
                    />
                )}
            </div>
        </div>
        <div className="fixed top-4 right-4 z-[100] flex items-center space-x-1 p-1 bg-[var(--color-surface-sunken)] rounded-full border border-[var(--color-border)] shadow-md">
            <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-full transition-colors ${previewMode === 'desktop' ? 'bg-[var(--color-primary-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'}`}
                title="Desktop View"
            >
                <DesktopIcon className="h-4 w-4" />
            </button>
            <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-full transition-colors ${previewMode === 'mobile' ? 'bg-[var(--color-primary-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'}`}
                title="Mobile Preview"
            >
                <MobileIcon className="h-4 w-4" />
            </button>
        </div>
    </div>
  );
};

export default App;