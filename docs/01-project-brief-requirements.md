# Project Brief & Requirements

> **AI ANALYSIS PROMPT FOR GEMINI:**
> "I have a working web app prototype and need you to analyze it comprehensively to fill out this Project Brief & Requirements document. Please:
> 1.  **Examine all files in my project** - Look at code, configuration files, package.json, README, any existing documentation
> 2.  **Analyze the user interface** - Understand what the app does, who it's for, what problems it solves
> 3.  **Identify the technical stack** - What frameworks, libraries, services, APIs are being used
> 4.  **Infer the business logic** - What are the core features, user flows, and value propositions
> 5.  **Fill out each section below** with detailed, accurate information based on your analysis
> 6.  **Ask questions** if anything is unclear or if you need more context about business goals or user needs
> 7.  **Be thorough and specific** - This document will guide all future development decisions
>
> Replace all sections marked with `[ANALYZE AND FILL]` with your findings. If you cannot determine something from the codebase, ask me directly."

---

## Document Info
-   **Version:** v1.0
-   **Last Updated:** 2024-10-26
-   **Document Owner:** Project Lead
-   **Review Cycle:** Monthly during active development

## Quick Reference
-   **Project Name:** Momentum AI
-   **Primary Purpose:** An intelligent dashboard to help users with executive function challenges capture, organize, and execute tasks by turning unstructured thoughts into actionable plans.
-   **Target Users:** Creative professionals, students, and individuals with ADHD or executive function difficulties who feel overwhelmed by traditional productivity tools.
-   **Key Success Metric:** Weekly Active Users & Momentum Map Completion Rate.
-   **MVP Timeline:** [TBD - To be defined by project owner]

---

## Project Vision & Goals

### Project Overview
Momentum AI is a responsive web application designed to be a "zero-judgment capture zone" for thoughts, ideas, and tasks. It addresses the problem of "notification blindness" and the "Wall of Awful" often experienced by users with executive function challenges.

The core of the application is a workflow that guides the user from unstructured "brain dumps" to structured, actionable "Momentum Maps." It uses the Google Gemini API to intelligently parse, tag, and categorize user input. The app further supports the user through a "Today" dashboard that prioritizes the "next right thing," context-aware smart reminders tied to a user-defined weekly rhythm, and a dynamic theming engine that adjusts the UI to support the user's current mental state (e.g., Focus, Creative, Recovery).

Its unique value lies in reducing the cognitive load of planning and providing gentle, intelligent nudges to build and maintain momentum.

### Business Objectives
-   **Primary:** Achieve high user retention and daily engagement by becoming an indispensable tool for the target audience.
-   **Secondary:** Validate the core "Brain Dump -> Momentum Map" workflow as an effective productivity method.
-   **Future:** Explore a potential freemium model with advanced analytics or AI features as a premium offering.
-   **Success Metrics:**
    -   High percentage of users completing the initial setup (Calendar anchors).
    -   High conversion rate from Brain Dump items to created Momentum Maps.
    -   Increasing average of completed Chunks/Sub-steps per user per week.

### Target Audience
**Primary Users**
-   **Who:** Individuals who struggle with executive function, such as professionals, students, or creatives with ADHD. They are often overwhelmed by large projects and have difficulty initiating tasks.
-   **Pain Points:** Time blindness, task paralysis, difficulty breaking down large goals, forgetting transitional tasks (e.g., preparing for a meeting).
-   **How App Helps:** The app externalizes the planning process. The AI assistant breaks down goals, the "Today" page provides a single clear focus, and smart reminders provide context-aware prompts at moments of least resistance.

**Secondary Users**
-   **Who:** Productivity enthusiasts looking for novel AI-powered tools.
-   **Pain Points:** Existing tools are too rigid or not intelligent enough.
-   **How App Helps:** Offers a unique, AI-driven approach to project planning and daily execution that adapts to the user's performance over time.

---

## Functional Requirements

### Core Features
1.  **AI-Powered Brain Dump**
    -   **Description:** A dedicated page and quick-access modal for users to enter unstructured text. The Gemini API processes this text to split it into distinct items, assign tags, and detect urgency.
    -   **User Story:** "As a user feeling overwhelmed, I want to quickly type out all my thoughts in one place so that the app can automatically organize them for me."
    -   **Priority:** High

2.  **Momentum Map**
    -   **Description:** The core project planning feature. The AI generates a full project plan from a single goal, complete with a "Finish Line" (definition of done), "Chunks" (blocks of work), and "Sub-steps" (actionable tasks). It includes personalized time estimates based on user history.
    -   **User Story:** "As a user facing a large project, I want the AI to create a step-by-step roadmap for me so that I can focus on one small piece at a time."
    -   **Priority:** High

3.  **Today Dashboard**
    -   **Description:** A central daily view that intelligently surfaces the "Next Right Thing" based on a priority system (e.g., upcoming calendar events, urgent tasks, next map step). Also shows upcoming events and "Quick Wins."
    -   **User Story:** "As a user starting my day, I want to see a single, clear priority so I know exactly where to begin without feeling paralyzed."
    -   **Priority:** High

4.  **Calendar & Smart Reminders**
    -   **Description:** Users define their weekly rhythm using recurring time blocks called "Anchors." They can then attach "Smart Reminders" to these anchors (e.g., "15 minutes before Work"). The system delivers these reminders at the right time, respecting "Do Not Disturb" windows.
    -   **User Story:** "As a user who forgets transitional tasks, I want to set a reminder once for a recurring event so that I'm prompted automatically every time."
    -   **Priority:** High

5.  **Task & Map Management**
    -   **Description:** A page to view, edit, and resume saved or paused Momentum Maps.
    -   **User Story:** "As a user with multiple projects, I want to pause one map and resume another so I can manage competing priorities."
    -   **Priority:** Medium

6.  **Stats & Time Learning**
    -   **Description:** The app tracks the difference between estimated and actual completion times for tasks. This data is used to provide personalized future estimates and show the user insights into their work patterns (e.g., "You complete Creative tasks 20% faster in the morning").
    -   **User Story:** "As a user who struggles with time estimation, I want the app to learn my patterns so it can provide more realistic deadlines for me."
    -   **Priority:** Medium

7.  **Dynamic Theming Engine**
    -   **Description:** The UI theme automatically changes based on context (time of day, active task type) to support the user's mental state. Themes include Focus, Creative, Recovery, and Evening. Users can also manually control and customize themes.
    -   **User Story:** "As a user sensitive to my environment, I want the app's appearance to adapt to my needs, helping me focus when I need to and relax when I'm done."
    -   **Priority:** Medium

### User Workflows
**Primary User Journey: Thought to Action**
1.  User feels overwhelmed and opens the **Brain Dump** modal (`Ctrl+B`).
2.  User types a stream of consciousness (e.g., "need to plan Q4 report, email team about offsite, also buy milk").
3.  The Gemini API processes the text into separate, tagged items on the Brain Dump page.
4.  User selects the "plan Q4 report" item and related items, promoting them to a **Momentum Map**.
5.  The AI generates a full roadmap for the Q4 report.
6.  The user navigates to the **Today** page, which now shows the first sub-step of the report as the "Next Right Thing."
7.  User completes the sub-step and marks it done.

**Secondary User Journey: Weekly Rhythm Setup**
1.  User navigates to the **Calendar** page for the first time.
2.  An onboarding wizard helps them define their primary "Anchors" (e.g., Work, 9-5, Mon-Fri) and "Do Not Disturb" hours.
3.  User creates a Smart Reminder, e.g., "Prep for daily standup, 10 minutes before Work."
4.  The system now automatically prompts the user every weekday at 8:50 AM.

### Feature Matrix
| Feature | Priority | Complexity | Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- |
| Brain Dump & AI Processing | High | High | `@google/genai` | Implemented |
| Momentum Map Generation | High | High | `@google/genai` | Implemented |
| Today Page Logic | High | Medium | All other features | Implemented |
| Calendar & Smart Reminders | High | High | None | Implemented |
| Data Persistence (Firebase) | High | Medium | Firebase | Implemented |
| Time Learning & Analytics | Medium | High | Completion History | Implemented |
| Dynamic Theming | Medium | Medium | None | Implemented |
| Task Management (Saved Maps) | Medium | Low | Momentum Map | Implemented |

---

## Non-Functional Requirements

### Performance Requirements
-   **UI Responsiveness:** All UI interactions must be fluid, with animations completing under 200ms.
-   **AI Latency:** AI-powered actions (processing brain dumps, generating maps) should complete within a reasonable timeframe, with clear loading states. A 60-second timeout is implemented as a safeguard.
-   **Offline Functionality:** The app must be fully functional offline. All data is saved to `localStorage` first and then synchronized with Firestore when a connection is available.

### Security Requirements
-   **Authentication:** The app uses Firebase Anonymous Authentication to create a unique user session without requiring personal login details.
-   **Data Isolation:** All user data is stored in Firestore under a path scoped to their unique Firebase UID, ensuring data is not shared between users.
-   **API Key Protection:** API keys must be managed via environment variables (`process.env`) and not exposed on the client side.

### Usability Requirements
-   **Accessibility:** The app must adhere to WCAG 2.1 AA standards, with proper use of ARIA attributes, focus management (`:focus-visible`), and sufficient color contrast (managed by the theme engine).
-   **Responsiveness:** The UI must be fully responsive and provide a tailored experience for both desktop and mobile viewports, as demonstrated by the preview mode switcher.
-   **Cross-Browser Compatibility:** Must function correctly on the latest versions of major browsers (Chrome, Firefox, Safari, Edge).

### Technical Constraints
-   **Stack:** The application is built with React and TypeScript.
-   **Backend:** It relies exclusively on Firebase (Firestore, Auth) for its backend services.
-   **AI Provider:** It is tightly coupled with the Google Gemini API (`@google/genai`) for all generative AI features.
-   **Deployment:** The app is a static single-page application (SPA) intended for deployment on a static hosting provider.

---

## Success Criteria

### Definition of Done
A feature is "done" when:
-   All functional requirements are implemented and tested.
-   The UI is fully responsive and accessible.
-   All related data is correctly persisted to both `localStorage` and Firestore.
-   Loading and error states are handled gracefully.
-   The feature has been reviewed and approved by the project owner.

### Key Performance Indicators (KPIs)
-   **Engagement:** Daily Active Users (DAU) / Weekly Active Users (WAU).
-   **Adoption:** Number of Momentum Maps created per user.
-   **Effectiveness:** Momentum Map completion rate; Average time-to-complete for Chunks.
-   **Retention:** 7-day and 30-day user retention rate.

### Acceptance Criteria
The project will be considered successful for its initial launch if:
-   Users can complete the full "Thought to Action" workflow without errors.
-   The AI-generated content is consistently relevant and useful.
-   The application is stable and performant on target devices.
-   Initial user feedback is predominantly positive regarding the core concept.

---

## Constraints & Assumptions

### Technical Constraints
-   The application is entirely dependent on the availability and performance of Google Gemini and Firebase APIs.
-   As a client-side application, complex data queries and aggregations must be handled thoughtfully to avoid performance bottlenecks.

### Business Constraints
-   The project operates under the assumption of a free-to-use model initially, with no immediate revenue targets.
-   Development resources are focused on refining the core user experience rather than adding peripheral features.

### Assumptions
-   Users have a persistent internet connection for initial data load and periodic syncing.
-   Users are willing to invest time in the initial Calendar setup to benefit from smart reminders.
-   The Gemini API will consistently return data that adheres to the defined JSON schemas.
-   The "Momentum Map" methodology is an effective and desirable way for the target audience to manage projects.

---

## Risk Assessment

### Technical Risks
-   **Risk:** Changes to the Gemini API could break core functionality.
    -   **Mitigation:** Encapsulate AI calls in a dedicated service layer to simplify future updates. Maintain a suite of integration tests.
-   **Risk:** Uncontrolled API costs from Gemini or Firebase.
    -   **Mitigation:** Implement client-side controls to prevent spamming AI features. Set up budget alerts in Google Cloud and Firebase.
-   **Risk:** Data desynchronization between `localStorage` and Firestore.
    -   **Mitigation:** Implement a clear data hydration strategy on app load, prioritizing Firestore as the source of truth after the initial migration.

### Business Risks
-   **Risk:** The core value proposition does not resonate with the target audience, leading to low adoption.
    -   **Mitigation:** Gather user feedback early and often. Be prepared to pivot on feature implementation based on this feedback.
-   **Risk:** The app is perceived as too complex, creating a barrier to entry.
    -   **Mitigation:** Invest heavily in a smooth, guided onboarding experience (e.g., the Calendar wizard). Provide contextual help and tips.

### Mitigation Strategies
-   **Risk:** AI generates a poor-quality or nonsensical Momentum Map.
    -   **Impact:** High
    -   **Probability:** Medium
    -   **Mitigation:** Allow users to easily edit, regenerate, or manually create all AI-generated content. Continuously refine AI prompts based on user feedback.

---

## Stakeholders & Communication

### Key Stakeholders
-   **Project Owner:** Defines vision and prioritizes features.
-   **Lead Developer/Engineer:** Responsible for technical architecture and implementation.
-   **UI/UX Designer:** Defines the user experience and visual design.
-   **End Users:** Provide feedback to guide development.

### Communication Plan
-   **Daily Standups:** To sync on progress and blockers.
-   **Weekly Demos:** To showcase progress to the project owner and gather feedback.
-   **User Feedback Channel:** A dedicated channel (e.g., feedback form, email) for users to report bugs and suggest features.
-   **Documentation:** All major decisions and system designs are to be recorded in the `docs/` folder.

---

## Related Documents
-   [Technical Architecture & Design](./02-technical-architecture-design.md) - System architecture based on these requirements.
-   [UI/UX Component Guide](./05-uiux-component-guide.md) - Design implementation of user requirements.
-   [User Flow & Journey Maps](./10-user-flow-journey-maps.md) - Detailed user interaction flows.
-   [Smart Reminders Concept](./smart-reminders-concept.md) - Conceptual deep-dive into the reminder system.

---

## Changelog
-   **v1.0** - Initial document created from a comprehensive analysis of the existing application prototype.
