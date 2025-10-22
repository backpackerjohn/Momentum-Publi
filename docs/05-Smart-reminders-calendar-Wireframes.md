# Wireframes: Smart Reminders & Calendar

## Main Screen Layout (Desktop)
┌─────────────────────────────────────────────────────────────────────────────┐
│                      [Navbar w/ "Add Anchor", "Settings"]                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Sun]      [Mon]      [Tue]      [Wed]      [Thu]      [Fri]      [Sat]      │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │        │ │ Anchor │ │        │ │ Anchor │ │        │ │ Anchor │ │        │ │
│ │        │ │ 9-5pm  │ │        │ │        │ │        │ │        │ │        │ │
│ │        │ └────────┘ │        │ └────────┘ │        │ └────────┘ │        │ │
│ │        │          │ │        │  -🔔 Rem  │ │        │          │ │        │ │
│ │        │          │ │        │          │ │        │          │ │        │ │
└─────────────────────────────────────────────────────────────────────────────┘

## Key Screen Areas
**Header**: Main application navbar which includes global actions. Contextual actions for this screen, like "Add Anchor," "Add Reminder," and "Settings," are also located in the header area.
**Main Content**: A 7-day weekly grid view. Each column represents a day of the week. "Anchor" blocks are displayed as colored rectangles spanning their scheduled time and can be dragged to different days. "Reminders" are shown as small indicators near their trigger time.
**Action Buttons**: A floating action button in the bottom-right corner provides quick access to the AI Chat assistant for natural language scheduling commands.

## Screen 1: Add Anchor Modal
┌─────────────────────────────────────────┐
│  Add a New Anchor        [Close Btn(x)] │
├─────────────────────────────────────────┤
│                                         │
│  Name:       ┌────────────────────────┐ │
│             │   e.g., "Work Session" │ │
│             └────────────────────────┘ │
│                                         │
│  Time: ┌──────────┐ to ┌───────────┐   │
│        │ [Time In]│    │ [Time In] │   │
│        └──────────┘    └───────────┘   │
│                                         │
│  Days: (Mon) (Tue) (Wed) (Thu) (Fri)    │
│                                         │
│                      [Cancel] [Save]    │
└─────────────────────────────────────────┘
**Purpose**: To allow users to define the core, recurring blocks of their weekly schedule (e.g., work, gym). This data is saved to the database and associated with the user's account.
**Input Fields**: Anchor Title (text input), Start Time (time input), End Time (time input), Day Picker (toggle buttons for days of the week).
**Buttons**: "Cancel" to close the modal, "Save" to create the anchor record in the database and add it to the calendar.
**Validation**: The form validates that the title is not empty, the end time is after the start time, and at least one day is selected. Errors are shown inline with a descriptive message.

## Screen 2: Add Reminder Modal (via AI)
┌─────────────────────────────────────────┐
│  Add a Smart Reminder    [Close Btn(x)] │
├─────────────────────────────────────────┤
│                                         │
│  Describe your reminder:                │
│  ┌────────────────────────────────────┐ │
│  │ Remind me to pack my gym bag 20m   │ │
│  │ before my Gym Session              │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                         │
│               [Cancel] [Create Reminder]│
└─────────────────────────────────────────┘
**Purpose**: To enable users to quickly create a context-aware reminder using natural language. The AI parses the text and creates a new reminder record linked to an existing anchor.
**Input Fields**: A single multi-line textarea for the user's natural language prompt.
**Actions Available**: "Cancel" to close the modal, "Create Reminder" to send the text to the AI for processing.
**Buttons**: "Cancel" and "Create Reminder".

## Mobile Layout (if different)
┌─────────────────┐
│ [Header]        │
├─────────────────┤
│ ▼ Monday        │
│ ┌─────────────┐ │
│ │ 9am Anchor  │ │
│ ├─────────────┤ │
│ │ - 🔔 Reminder │ │
│ └─────────────┘ │
│                 │
│ ▼ Tuesday       │
│ ┌─────────────┐ │
│ │ (empty)     │ │
│ └─────────────┘ │
│                 │
│ [Bottom Nav]    │
└─────────────────┘
**Description**: On smaller screens, the weekly grid transforms into a vertical, scrollable list. Each day of the week is a collapsible section. When expanded, it shows a chronological list of that day's Anchors and Reminders. This ensures readability and usability on narrow viewports.

## UI Elements Observed
**Button Styles**: Primary action buttons use the brand's terracotta accent color (`--color-primary-accent`) for high visibility. Secondary and cancel buttons are styled more subtly, often with a transparent background and a simple border, or a sunken surface color (`--color-surface-sunken`). Buttons feature rounded corners (`--border-radius-lg` or `--border-radius-full`).
**Input Field Styles**: Form inputs have rounded corners (`--border-radius-lg`), a subtle border (`--color-border`), and a prominent focus ring using the primary accent color for clear accessibility.
**Colors Used**: The UI relies on the defined palette: Terracotta Red and Sage Green for primary/secondary accents, and a range of warm neutrals (Beige, Sand, Grays) for backgrounds, surfaces, and text, creating a calm and focused aesthetic.
**Icons/Graphics**: The module uses a consistent icon set to represent actions: `BellIcon` for reminders, `PlusIcon` for adding items, `GearIcon` for settings, `CalendarIcon` for the main module, and `TrashIcon`/`DuplicateIcon` for item management.
**Navigation Elements**: Navigation is handled by the main persistent top navbar on desktop and a bottom tab bar on mobile, which is standard for the application.

## Missing UI States
**Loading Indicators**: While the "Create Reminder" button shows an inline spinner during AI processing, the main calendar view lacks a loading indicator for the initial fetch of schedule data from the database. A skeleton screen for the calendar grid would improve the perceived performance.
**Error Messages**: The "Add Anchor" modal has good inline validation. However, if the AI fails to parse a reminder, the error message appears in the modal but could be made more prominent. There is no visible handling for a failed database fetch on the main calendar view.
**Empty States**: The calendar view correctly displays an empty state ("Your week is clear! Add some anchors...") when no data is returned from the database, guiding the user's next action.
**Success Confirmations**: The application uses a global toast notification system to confirm successful actions (e.g., "Anchor created," "Reminder set"), providing clear and non-intrusive feedback to the user.