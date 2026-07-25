# Solace Counselor — Live Session Co-Pilot for School Counselors

## Purpose

A separate, private prototype tool for school counselors: while meeting
with a student, the counselor types live notes into Solace Counselor,
which surfaces emotional themes/patterns, suggests follow-up questions,
flags crisis-indicating language, and generates an end-of-session summary
— all via a small AI model running entirely in the counselor's browser
(no backend, no data transmitted anywhere). Sessions are remembered per
student across multiple meetings so the counselor can see patterns over
time.

## Non-goals / explicit limitations

- **Not compliance-ready.** This is a prototype for demoing and gathering
  feedback, not for use with real student records in an actual school
  until FERPA / state student-data-privacy requirements are separately
  reviewed (this is a legal question, not a code question, and out of
  scope for this build).
- **Not a diagnostic tool.** The AI never states what a student "has" or
  makes clinical judgments — it only surfaces observations and possible
  questions, phrased as considerations, leaving all professional judgment
  to the counselor.
- **Not a replacement for the counselor's own crisis response.** The
  crisis flag is a safety-net reminder and a record that language was
  detected — it never substitutes for the counselor's own training and
  judgment, which is already present in the room.
- Data lives only in the counselor's own browser (localStorage) — no
  accounts, no encryption, no multi-device sync. A real deployment would
  need proper accounts, encryption, and access control; this prototype
  deliberately does not have that yet, and the UI says so.

## Architecture

Client-side-only React + Vite + TypeScript app (same proven shape as
Solace). No backend. The AI runs via `@mlc-ai/web-llm` in the browser,
same library and default model as Solace (`Llama-3.2-3B-Instruct`),
loaded lazily via dynamic import once the app's main view mounts.

### Data model (`src/lib/storage.ts`)

```ts
interface Session {
  id: string;
  date: number; // session start timestamp
  notes: string; // live free-text notes
  summary?: string; // AI-generated at end of session
  themes?: string[]; // AI-detected pattern tags
  hasCrisisFlag: boolean;
}

interface Student {
  id: string;
  name: string; // counselor's own label — full name, initials, or alias
  createdAt: number;
  sessions: Session[];
}
```

Persisted as `Student[]` in `localStorage`, mirroring Solace's
conversation-list storage pattern (list + active-id + CRUD).

### AI assist (`src/lib/ai/`)

- `webllmEngine.ts` — same engine wrapper as Solace: loads the model in
  the background, reports status/progress, exposes a streaming
  `generateReply`. Ported directly since it's fully generic.
- `systemPrompt.ts` — two distinct prompts:
  - **Live analysis prompt**: given the current notes text, asks for a
    short, informally-formatted response listing 2-4 emotional
    themes/patterns noticed and 2-3 follow-up questions the counselor
    could consider asking next. Explicitly instructed to phrase
    everything as observations/possibilities, never certainties or
    diagnoses.
  - **Summary prompt**: given the full session notes, asks for a short
    paragraph summarizing the session for the counselor's own records.
- Live analysis is triggered on a ~2 second debounce after the counselor
  stops typing, not on every keystroke (avoids hammering the model).
  Output is rendered as loosely-formatted text in a side panel rather
  than strictly parsed JSON — a small on-device model's structured-output
  reliability isn't strong enough to depend on, so the UI treats the
  response as informal, readable text rather than parsing into rigid
  fields.

### Crisis detection (`src/lib/crisisDetection.ts`)

Ported directly from Solace's deterministic, keyword-based, word-boundary
regex lexicon (same phrase list, same logic) — not the AI. Runs
continuously against the live notes text as the counselor types. The
instant a crisis phrase appears, a prominent, hard-to-miss banner appears
("Crisis-indicating language detected in these notes — consider your
school's crisis protocol") and `hasCrisisFlag` is permanently recorded on
that session once saved, regardless of whether the flag is still showing
by the time the session ends.

### Components

- `Sidebar.tsx` — lists students (same rename/delete/new pattern as
  Solace's conversation sidebar, relabeled for students).
- `StudentView.tsx` — shows a student's past sessions (collapsed
  timeline: date, summary, theme tags) and the live "current session"
  area.
- `SessionNotes.tsx` — the live notes textarea plus the AI analysis side
  panel (themes, suggested questions) and the crisis banner. "End
  session" button triggers the summary generation and saves the session.
- `App.tsx` — a disclaimer/onboarding screen (explicitly stating the
  prototype/non-compliance limitations above) gating entry to the main
  sidebar + student view layout.

## Visual design

Calmer, more professional palette than Solace (soft blues/grays instead
of baby-blue/blush-pink), minimal animation, denser layout suited to
someone working through back-to-back meetings. Same clean, uncluttered
structural approach (sidebar + main panel) as Solace, without the
ambient background/rainbow-glow decoration.

## Testing

Same approach as Solace: Vitest + React Testing Library, WebLLM engine
mocked via `vi.spyOn` for deterministic tests (routing/prompt-construction
tests, not AI-output tests), crisis detection reuses Solace's already-
verified lexicon and gets its own regression tests, storage gets
round-trip tests, components get interaction tests (rename/delete/new
session/end session/crisis flag appearing).
