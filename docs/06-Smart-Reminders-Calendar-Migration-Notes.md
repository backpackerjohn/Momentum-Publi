# Migration Notes: Smart Reminders & Calendar

## Current Prototype Limitations
**What Doesn't Work**: The system cannot send actual push notifications; reminders are only visible in-app. The "smart" learning features (e.g., suggesting new reminder times based on snooze history) are not implemented. Editing existing anchors or reminders is not possible through the UI.

**What's Fake Data**: The initial calendar data and reminder history are mocked and loaded on first use. All statistics on the "Stats" page are currently hardcoded.

**What Disappears on Refresh**: All user-created anchors, reminders, and DND settings are stored in `localStorage`. This data will be lost if the user clears their browser cache or switches to a different device.

**What's Missing Entirely**: A secure, server-side environment. All logic, including calls to the Gemini API, happens on the client, which is insecure. There is no user-specific data storage, meaning the app is a single-user experience tied to a single browser. There is no mechanism for editing existing items.

## Database Requirements
### Tables Needed
**Table 1**: `schedule_events` (Anchors)
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to `auth.users`)
- `title` (text)
- `days` (int4[], array of integers 0-6)
- `start_min` (int4)
- `end_min` (int4)
- `buffer_minutes` (jsonb, e.g., `{"prep": 15, "recovery": 15}`)
- `context_tags` (text[], array of text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Table 2**: `smart_reminders`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to `auth.users`)
- `anchor_id` (uuid, foreign key to `schedule_events`)
- `offset_minutes` (int4)
- `message` (text)
- `why` (text)
- `is_locked` (bool)
- `status` (text, e.g., 'active', 'snoozed', 'done')
- `success_history` (text[], array of 'success', 'snoozed', 'ignored')
- `snoozed_until` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Table 3**: `dnd_windows` (Do Not Disturb)
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to `auth.users`)
- `days` (int4[], array of integers 0-6)
- `start_min` (int4)
- `end_min` (int4)
- `enabled` (bool)
- `created_at` (timestamptz)

## Authentication Needs
**User Login Required For**: All features. Users must be logged in to create, view, or modify any schedule data.
**Permission Levels Needed**: Only one level is needed: "authenticated user."
**Data Access Rules**: Row Level Security (RLS) must be enabled on all tables. Policies should restrict access so that users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where the `user_id` column matches their own authenticated `auth.uid()`.

## File Storage Needs
**File Upload Features**: None currently required for this module.
**Image Storage**: None.
**Document Storage**: None.

## Real-time Features Needed
**Live Updates For**: The weekly calendar view. If a user adds or modifies an anchor on one device (e.g., desktop), the change should appear instantly on another logged-in device (e.g., mobile) without a page refresh. This will be handled by Supabase's real-time subscriptions.
**Notifications For**: Smart Reminders. A backend function will be needed to trigger push notifications.
**Collaborative Features**: None in this phase.

## API Integrations Required
**External Service**: Push Notification Service (e.g., Firebase Cloud Messaging, OneSignal)
- **Purpose**: To send push notifications to the user's devices when a smart reminder is due.
- **API Endpoints**: The service's API for sending notifications, which will be called from a Supabase Edge Function.

## Backend Functions Needed
### Function: `send-due-reminders` (Edge Function)
**Purpose**: To check for reminders that need to be sent and trigger push notifications.
**Trigger**: Cron job (e.g., runs every minute via Supabase's pg_cron).
**Input**: Current timestamp.
**Process**: 
  1. Query the `smart_reminders` table for all reminders that are due within the next minute.
  2. For each due reminder, fetch the user's push notification token.
  3. Call the external Push Notification Service API to send the notification payload.
  4. Update the reminder's status in the database if necessary.
**Output**: Calls to the external push notification service.

### Function: `parse-natural-language-reminder` (Edge Function)
**Purpose**: To securely process user text with the Gemini API without exposing the API key on the client.
**Trigger**: HTTP request from the frontend.
**Input**: `{ text: "user input string", scheduleEvents: [...] }`
**Process**: 
  1. Receive the user's text and current schedule from the client.
  2. Construct the prompt for the Gemini API.
  3. Call the Gemini API using the secure server-side API key.
  4. Return the parsed JSON object or an error message to the client.
**Output**: A JSON object with the structured reminder data, or a JSON error object.

## UI/UX Improvements for Production
**Better Error Messages**: Implement user-friendly toast notifications for database or API failures (e.g., "Failed to save schedule. Please check your internet connection.").
**Loading States**: Add skeleton loaders for the main calendar grid to prevent a flash of empty content while data is being fetched from the database. Show spinners on buttons during data submission.
**Success Feedback**: Continue using the existing toast system for immediate confirmation after creating or updating items.
**Mobile Responsive**: The existing mobile view is a good start, but needs to be fully implemented to display a functional, list-based layout of the weekly schedule instead of the placeholder text.

## Migration Priority
**Phase 1 (Critical)**: 
- Set up Supabase database with the three required tables and RLS policies.
- Refactor all `localStorage` calls in the frontend to use the Supabase client for all CRUD operations.
- Move the Gemini API call into the `parse-natural-language-reminder` Edge Function.

**Phase 2 (Important)**: 
- Implement the `send-due-reminders` Edge Function with a cron trigger.
- Integrate a push notification service and handle device token registration on the client.
- Implement the UI for editing existing Anchors and Reminders.

**Phase 3 (Nice to Have)**: 
- Implement real-time subscriptions to live-sync the calendar across devices.
- Begin work on the V2 "smart" engine to analyze `successHistory` and suggest optimizations.

## Development Estimate
**Database Setup**: 4 hours (Includes schema, RLS, and initial data seeding)
**Backend Functions**: 20 hours (16h for notifications, 4h for AI proxy)
**Frontend Updates**: 40 hours (Data layer refactor, implementing editing UI, adding loading/error states)
**Total**: ~64 hours