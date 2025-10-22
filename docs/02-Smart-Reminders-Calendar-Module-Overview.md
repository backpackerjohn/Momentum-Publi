# Module Overview: Smart Reminders & Calendar

## What This Module Does
**Primary Purpose**: To help users establish a predictable weekly routine using "Anchors" (core schedule blocks) and attach intelligent, context-aware reminders to prompt actions at the right time.
**User Goal**: To create a structured weekly schedule and automate reminders for important transitional tasks, reducing cognitive load and the need to rely on memory.
**Problem Solved**: It tackles executive function challenges like time blindness and task initiation by providing a visible structure for the week and delivering timely, contextual nudges for action.

## Key Functionality
- **Guided Setup**: A streamlined onboarding process helps users quickly establish their initial weekly schedule, including core routines and "Do Not Disturb" windows.
- **Visual Calendar Management**: A full-week grid displays all scheduled "Anchors" and their associated "Reminders." Users can drag-and-drop Anchors to reschedule them, with the system providing conflict detection.
- **AI-Powered & Manual Creation**: Users can create reminders using natural language via an AI assistant or manually through a structured form. New Anchors can also be added at any time.
- **Persistent, Synced Data**: All schedule and reminder data is securely stored and synced across the user's devices in real-time.

## Who Uses This Module
**Primary User**: Individuals, particularly those with executive function challenges, who need a tool to help create structure, build routines, and remember to perform key transitional tasks.
**When They Use It**: Initially during a one-time setup to define their weekly rhythm, then periodically to add or adjust anchors and reminders as their routines change.

## Core Features (What You Can See)
1. **Onboarding Wizard**: A guided, multi-step flow that helps users quickly define their core weekly schedule blocks (Anchors) and Do-Not-Disturb windows.
2. **Weekly Calendar View**: A visual grid that displays all scheduled Anchors and their associated Reminders, giving a clear overview of the user's established routine.
3. **AI Reminder Creation**: A modal and chat interface that use natural language processing to intelligently create and schedule a reminder based on a user's text input.

## How Users Access This Module  
**Entry Points**: The user accesses this module by clicking the "Calendar" link in the main navigation bar.
**Navigation Path**: Main Navigation Bar -> Calendar.
**Menu Location**: It is a primary, top-level item in the main application navigation.

## Success State
**User Completes Module When**: They have successfully set up their core weekly Anchors and created one or more Smart Reminders, resulting in a structured and populated weekly view on their calendar that syncs across their devices.

## Dependencies
**Needs These Other Modules**: The module is fairly self-contained but provides the core scheduling data that is consumed and displayed by the **Today** page.
**Used By These Modules**: The **Today** page relies on this module's data to display upcoming events and active reminders. The **Theme Engine** also uses its schedule data for context.

## Supabase Backend Notes
**Database Usage**: Persists each user's `ScheduleEvents` (Anchors), `SmartReminders`, and `DNDWindows` to ensure data integrity and enable multi-device sync.
**Authentication Usage**: Associates all calendar and reminder data with a specific user account via `user_id`, ensuring privacy and providing a personalized experience through Row Level Security (RLS).
**Real-time Usage**: Instantly syncs any changes to the schedule (e.g., adding an anchor on desktop) to other logged-in devices without requiring a manual refresh, using Supabase's real-time subscription features.