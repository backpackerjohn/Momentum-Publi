# User Flows: Smart Reminders & Calendar

## Primary Flow: First-Time Weekly Setup
**User Goal**: To quickly establish the basic structure of their week.
**Starting Point**: User navigates to the "Calendar" page for the first time.
**Expected End Result**: The user has a populated weekly calendar with their core schedule blocks ("Anchors") and quiet hours ("DND windows") defined and saved to their account.

### Step-by-Step Process
1. **System response**: The Onboarding Wizard modal appears automatically, obscuring the empty calendar.
   **What they see**: A welcome screen explaining that the app will help them build a weekly rhythm in a few steps. A "Get Started" button is prominent.

2. **User action**: Clicks "Get Started."
   **System response**: The wizard proceeds to the "Schedule" step.
   **What they see**: A form to define a recurring time block. It includes a text input for a name (e.g., "Work"), time inputs for start/end, and toggle buttons for the days of the week. A default 9am-5pm, Mon-Fri block is pre-filled.

3. **User action**: Adjusts the times and days for their main work/school schedule and clicks "Next."
   **System response**: The wizard proceeds to the "Do Not Disturb" step.
   **What they see**: A simple UI to define their daily quiet hours, with a pre-selected default (e.g., 11 PM to 7 AM).

4. **User action**: Accepts the default DND time and clicks "Preview My Map."
   **System response**: The wizard proceeds to the final "Review" step. The system generates a summary of the schedule.
   **What they see**: A text summary: "Core Anchor: Work (Weekdays, 9:00 AM - 5:00 PM)" and "Do-Not-Disturb: Daily from 11:00 PM to 7:00 AM."

5. **User action**: Clicks "Confirm & Start."
   **System response**: The wizard closes. The user's `ScheduleEvents` and `DNDWindows` are saved to the database. The calendar view re-renders with the new data.
   **What they see**: The main calendar grid, now populated with colored blocks representing their "Work" anchor from Monday to Friday.

**Final Result**: The user has a visually structured week and can begin adding more detail.
**Time to Complete**: ~60-90 seconds.

## Secondary Flow: Adding a Reminder via AI
**User Goal**: To create a contextual reminder without manual form entry.
**Starting Point**: User is anywhere in the app.
**Steps**: 
1. **User action**: Clicks the floating AI Chat button.
2. **System response**: The AI chat interface slides into view.
3. **User action**: Types a natural language command, e.g., `"remind me to review my notes 15 minutes before Work"`.
4. **System response**: The message is sent to a secure backend function. The function calls the Gemini API, which parses the text and identifies the anchor ("Work"), offset (-15), and message. A new `SmartReminder` record is created in the database. The AI responds with a confirmation message in the chat: `OK, I've set a reminder for "review my notes" 15 minutes before your "Work" anchor on weekdays.`
5. **What they see**: A confirmation message in the chat. If they navigate to the Calendar page, they will see new bell icons next to each "Work" anchor.

**Result**: A new, recurring reminder is created and associated with the correct anchor across all relevant days.

## Secondary Flow: Editing an Existing Anchor
**User Goal**: To change the time or days for an established routine.
**Starting Point**: The user is viewing the main Calendar page.
**Steps**: 
1. **User action**: Clicks on an existing "Work" anchor block on the calendar.
2. **System response**: The "Add Anchor" modal opens, but it is pre-populated with the details of the selected "Work" anchor. The modal title changes to "Edit Anchor."
3. **User action**: Changes the end time from 5:00 PM to 4:30 PM and deselects the "Friday" toggle button. Clicks "Save."
4. **System response**: The `ScheduleEvent` record for the "Work" anchor is updated in the database. The calendar view re-renders to reflect the changes.
5. **What they see**: The "Work" anchor blocks on the calendar from Monday to Thursday now appear slightly shorter, and the "Work" block on Friday has been removed. A success toast appears: "Anchor updated successfully."

**Result**: The user's weekly routine is updated to reflect their new schedule. All associated reminders automatically adjust to the new times.

## Flow Problems to Fix
**Broken Steps**: In the prototype, there is no flow for editing an existing anchor or reminder. This must be built.
**Confusing Parts**: The prototype relies on `localStorage`, so there is no feedback about data syncing or being saved to an account.
**Missing Feedback**: The prototype lacks loading states for fetching data and spinners for when the AI is processing, which can make the app feel unresponsive. Error handling for failed database operations or AI calls needs to be added.

## What a Supabase Backend Will Fix
**Better Data Persistence**: All `ScheduleEvent`, `SmartReminder`, and `DNDWindow` data will be tied to a `user_id` and stored securely in a Postgres database, making it available on any device.
**Improved Error Handling**: Server-side functions can return clear error messages to the client (e.g., "Anchor not found," "Invalid time format"), which can be displayed in user-friendly toast notifications.
**Real-time Updates**: Using Supabase subscriptions, if a user edits an anchor on their desktop, the calendar on their mobile device will update in real-time without a refresh.
**Mobile Experience**: The mobile view will be a first-class experience, reading from the same database to ensure data consistency between desktop and mobile.