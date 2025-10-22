# Feature List: Smart Reminders & Calendar

## Core Features (MVP)
#### 1. Onboarding Wizard for Weekly Setup
**What It Does**: Guides new users through a one-time process to define their core weekly schedule blocks (called "Anchors") and set their "Do Not Disturb" quiet hours. This data is saved to the user's account.

#### 2. Visual Calendar Management
**What It Does**: Provides a full-week visual grid displaying all scheduled Anchors and Reminders. Allows users to drag-and-drop Anchors to reschedule them, with conflict detection for overlapping events or DND windows.

#### 3. Anchor & Reminder CRUD Operations
**What It Does**: Allows for the complete management of schedule items. Users can create, view, update (edit), and delete Anchors and Reminders through intuitive UI controls (e.g., forms, context menus).

#### 4. AI-Powered Reminder Creation
**What It Does**: Allows users to create context-aware reminders by typing a simple sentence. A secure backend function processes the text to schedule the reminder relative to an existing Anchor.

#### 5. System Push Notifications
**What It Does**: A backend service triggers and sends actual push notifications to the user's registered devices when a reminder is due, ensuring timely prompts even when the app is closed.

## Phase 2 Features (Should Have)
#### 1. Adaptive Reminder Intelligence
**What It Does**: A backend "learning" engine analyzes user interaction history (snooze patterns, completion rates) to proactively suggest permanent timing adjustments for reminders.

#### 2. Habit Stacking Suggestions
**What It Does**: After a user demonstrates a consistent routine around an Anchor, the system suggests "stacking" a new, relevant micro-habit onto it to encourage the formation of new positive behaviors.

## Future Enhancements (Could Have)
#### 1. External Calendar Integration
**What It Does**: Allows users to connect their Google, Outlook, or other external calendars. The system can then import events and suggest turning them into recurring Anchors.

#### 2. Schedule Sharing
**What It Does**: Provides features for sharing parts of a schedule (e.g., "Family" anchors) with other users, useful for coordinating family or team activities.

## Data Requirements
**Features Needing Database**: All features require a Supabase database for storing `ScheduleEvents` (Anchors), `SmartReminders`, and `DNDWindows`.
**Features Needing Authentication**: All features require authentication to associate schedule data with a specific `user_id` and enforce Row Level Security.
**Features Needing File Upload**: None.
**Features Needing Real-time Updates**: Visual Calendar Management requires real-time subscriptions to sync schedule changes across a user's multiple devices instantly.