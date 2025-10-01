# Concept Document: Smart, Context-Aware Reminders

## 1. The Problem: "Notification Blindness" & The Wall of Awful

Traditional reminder apps often fail users with executive function challenges. They provide generic, time-based alerts that lack context, leading to several problems:

-   **Notification Blindness:** Constant, irrelevant pings train the user to ignore all notifications, even important ones.
-   **Wrong Time, Wrong Place:** A reminder to "prepare for a meeting" is useless if it arrives when the user is in the middle of deep work on another task. The cognitive load of switching contexts is too high.
-   **The "Wall of Awful":** A long list of untimed tasks can feel overwhelming and paralyzing, making it difficult to start anything.

Our users don't just need to be reminded *what* to do; they need a gentle nudge on *when* and *why* to do it, at the moment of least resistance.

## 2. The Vision: The Right Prompt at the Right Time

Our vision is a system that intelligently schedules and delivers reminders by understanding the user's unique weekly rhythm. It acts less like an alarm clock and more like a supportive personal assistant who knows the perfect moment to suggest the next action, helping the user transition smoothly between tasks and build lasting habits.

## 3. Core Concepts

The entire system is built on two foundational ideas: **Anchors** and context-aware **Reminders**.

### A. Anchors: The Weekly Rhythm

-   **What they are:** Stable, recurring blocks of time in a user's week (e.g., "Work," "Gym Session," "Family Dinner").
-   **Their Purpose:** They form the predictable "skeleton" of the user's week. They are not one-off appointments but the established routines that everything else fits around.
-   **How they work:** The user defines their Anchors on the **Calendar Page**. Each Anchor has a title, start/end time, and the days of the week it occurs.

### B. Smart Reminders: The Contextual Nudge

-   **What they are:** A notification that is *tethered* to an Anchor.
-   **Their Purpose:** To prompt an action that prepares for, transitions from, or is related to a specific Anchor. This provides crucial context.
-   **How they work:** A reminder is defined by its message and an offset (e.g., `15 minutes before "Work"`). The system automatically calculates the trigger time for each day the parent Anchor occurs.

## 4. How It Works: The User Flow

1.  **Setup (Calendar Page):** The user first sets up their weekly rhythm by creating several **Anchors**. They also define global "Do Not Disturb" (DND) windows. This initial setup is the most critical step.
2.  **Creation (Modal or AI Chat):** The user creates a reminder.
    -   **Structured:** Using the "Add Reminder" modal, they select an Anchor from a dropdown, define the message, and set an offset (e.g., -30 minutes for "before").
    -   **Natural Language:** The user can type or speak to the **AI Chat**, like `"remind me to pack my gym bag 20 minutes before my Gym Session."` The AI parses this and creates the structured reminder automatically.
3.  **Scheduling & Delivery:** The system calculates the precise trigger times. A reminder to `pack gym bag -20m before "Gym Session"` on Mon/Wed/Fri will automatically schedule alerts for the correct time on those three days. Reminders that fall within a DND window are intelligently postponed until the window ends.
4.  **Interaction (Today Page):** Active reminders appear on the **Today Page**, where the user can mark them as complete, snooze them, or ignore them.

## 5. The "Smart" Engine

What makes the reminders "smart" is their ability to adapt and provide helpful context.

-   **DND Awareness:** The system respects the user's quiet time, preventing notification fatigue.
-   **"Why" Explanations:** Every reminder includes a brief rationale (e.g., "This reduces friction to get your workout started.") to reinforce the habit and provide motivation.
-   **Micro-learning (V2):** By observing user interactions (snooze durations, completion rates via `successHistory`), the system can learn a user's patterns. In the future, it could suggest shifting a reminder time: *"I notice you often snooze this reminder for 15 minutes. Would you like me to set it 15 minutes later permanently?"*
-   **Habit Stacking (V2):** Once a user has a high success rate with reminders for a specific Anchor, the system can suggest "stacking" a new micro-habit onto that established routine, making it easier to adopt.

## 6. Key Data Structures

This feature is primarily driven by three data types defined in `types.ts`:

-   `ScheduleEvent`: Represents an **Anchor**. Contains title, days, start/end times, and context tags.
-   `SmartReminder`: Represents the **Reminder**. Contains a link to its `anchorId`, the `offsetMinutes`, message, and properties for the smart engine (`why`, `isLocked`, `successHistory`).
-   `DNDWindow`: Represents a **Do Not Disturb** period. Contains days and start/end times.
