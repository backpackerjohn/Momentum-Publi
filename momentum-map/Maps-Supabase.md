# Momentum Map Module: Supabase Migration Guide

## 1. Overview

This document outlines the technical requirements and migration path for transitioning the **Momentum Map** module from its current prototype state using `localStorage` to a robust, scalable backend powered by Supabase.

The primary goals of this migration are:
-   **Data Persistence & Sync:** Securely store user data in the cloud, allowing for a seamless, multi-device experience.
-   **Security:** Move sensitive operations, such as AI model calls, to a secure server-side environment.
-   **Scalability:** Establish a proper database schema that can support future features like real-time collaboration and advanced analytics.

---

## 2. Current Prototype Limitations

The `localStorage` implementation was effective for prototyping but has critical limitations for a production application:

-   **No Data Sync:** All data is confined to a single browser on a single device.
-   **Data Volatility:** Data is lost if the user clears their browser cache or switches devices.
-   **Insecure API Calls:** The Gemini API key is exposed on the client-side, and all AI processing happens in the browser. This is a significant security risk and is not viable for production.
-   **No User Accounts:** The experience is entirely anonymous and cannot be associated with a user account.

---

## 3. Supabase Database Schema

To properly store Momentum Map data, we need a relational structure. We will create three new tables: `momentum_maps`, `map_chunks`, and `map_substeps`.

### Table 1: `momentum_maps`

Stores the top-level information for each map, whether it's active or saved.

```sql
CREATE TABLE public.momentum_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text,
  note text,
  is_active boolean NOT NULL DEFAULT false,
  finish_line jsonb NOT NULL,
  progress jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policy: Users can only manage their own maps.
ALTER TABLE public.momentum_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own maps"
  ON public.momentum_maps
  FOR ALL
  USING (auth.uid() = user_id);
```

### Table 2: `map_chunks`

Stores the individual "chunks" of work, linked to a parent map.

```sql
CREATE TABLE public.map_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id uuid NOT NULL REFERENCES public.momentum_maps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  p50 int NOT NULL,
  p90 int NOT NULL,
  energy_tag text NOT NULL,
  blockers text[],
  is_complete boolean NOT NULL DEFAULT false,
  note jsonb,
  reflection jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  chunk_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policy: Users can only manage chunks belonging to their maps.
ALTER TABLE public.map_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own map chunks"
  ON public.map_chunks
  FOR ALL
  USING (auth.uid() = user_id);
```

### Table 3: `map_substeps`

Stores the individual sub-steps, linked to a parent chunk.

```sql
CREATE TABLE public.map_substeps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL REFERENCES public.map_chunks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  is_complete boolean NOT NULL DEFAULT false,
  is_blocked boolean,
  blockers text[],
  note jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  substep_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policy: Users can only manage sub-steps belonging to their maps.
ALTER TABLE public.map_substeps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own map sub-steps"
  ON public.map_substeps
  FOR ALL
  USING (auth.uid() = user_id);
```

---

## 4. Supabase Edge Functions (Server-Side Logic)

All client-side Gemini API calls **must** be moved to secure Edge Functions. This protects our API keys and standardizes the logic.

### Function: `generate-momentum-map`
-   **Purpose**: Securely calls the Gemini API to generate an initial project plan.
-   **Trigger**: HTTPS request from the client.
-   **Input**: `{ goal: string, history: Record<EnergyTag, CompletionRecord[]> }`
-   **Process**:
    1.  Validate user authentication.
    2.  Construct the prompt using the provided goal and user history.
    3.  Call the Gemini API using the securely stored server-side key.
    4.  Return the structured JSON response or a formatted error.

### Function: `replan-map`
-   **Purpose**: Securely calls the Gemini API to re-plan chunks based on a new Finish Line.
-   **Trigger**: HTTPS request.
-   **Input**: `{ finishLine: FinishLine, completedSubSteps: SubStep[], incompleteChunks: Chunk[] }`

### Function: `suggest-chunk-split`
-   **Purpose**: Securely calls the Gemini API to get suggestions for splitting a large chunk.
-   **Trigger**: HTTPS request.
-   **Input**: `{ chunk: Chunk }`

### Function: `suggest-unblocker`
-   **Purpose**: Securely calls the Gemini API to generate a micro-step suggestion.
-   **Trigger**: HTTPS request.
-   **Input**: `{ subStep: SubStep, context: string }`

---

## 5. Frontend Refactoring Strategy

The frontend will need significant refactoring to replace `localStorage` with a robust data service layer that communicates with Supabase.

### Step 1: Create a Data Service (`src/utils/mapDataService.ts`)
This service will encapsulate all Supabase client logic for the Momentum Map module.

```typescript
// src/utils/mapDataService.ts

import { supabase } from './supabaseClient'; // Assuming a central client setup

// Fetches the user's single active map
export const getActiveMap = async (userId: string) => { /* ... */ };

// Fetches all saved (inactive) maps
export const getSavedMaps = async (userId: string) => { /* ... */ };

// Saves a new map (complex transaction)
export const createMap = async (userId: string, mapData: MomentumMapData) => {
    // This will involve inserting into momentum_maps, then map_chunks, then map_substeps.
    // Use a transaction or batched writes for atomicity.
};

// Updates a sub-step's status
export const updateSubStep = async (subStepId: string, updates: Partial<SubStep>) => { /* ... */ };

// And so on for all other CRUD operations...
```

### Step 2: Refactor `App.tsx` and `MomentumMap.tsx`
-   Remove all `localStorage.getItem` and `localStorage.setItem` calls related to map data.
-   Replace the `useState` initializers that read from `localStorage` with a `useEffect` hook that fetches data on component mount using the new `mapDataService`.
-   All state-updating functions (`setActiveMap`, `setSavedTasks`, etc.) must now also call the corresponding data service function to persist the change in Supabase.

### Step 3: Replace AI Calls
-   In `MomentumMap.tsx`, replace all instances of `ai.models.generateContent(...)` with calls to our new Supabase Edge Functions.

```typescript
// Example replacement in MomentumMap.tsx

// OLD:
// const data = await generateInitialPlan(goal, completionHistory);

// NEW:
const { data, error } = await supabase.functions.invoke('generate-momentum-map', {
  body: { goal, history: completionHistory }
});
if (error) throw error;
```

---

## 6. Real-time Implementation (Phase 2)

After the initial migration, we can enhance the user experience with real-time updates.

-   In `MomentumMap.tsx`, set up a Supabase subscription to listen for `INSERT`, `UPDATE`, and `DELETE` events on the `map_chunks` and `map_substeps` tables for the current user and active map.
-   When a change is detected, intelligently update the local state (`activeMap`) to reflect the change without requiring a full re-fetch. This will enable seamless cross-device synchronization.
