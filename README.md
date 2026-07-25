# Solace Counselor

A prototype live-session co-pilot for school counselors: while meeting with
a student, type notes into Solace Counselor and it surfaces emotional
themes/patterns, suggests follow-up questions, flags crisis-indicating
language, and generates an end-of-session summary — all via a small AI
model running entirely in your browser. No backend, no account, no data
transmitted anywhere.

**This is a prototype, not a compliant product.** It has not been reviewed
for FERPA or any school data privacy requirements, and has no encryption,
accounts, or multi-device access. Do not use it with real student records
until that groundwork is done separately — this is for demos, feedback,
and internal exploration only.

The AI never diagnoses or makes clinical judgments — it only surfaces
observations and possible questions, leaving all professional judgment to
the counselor. Crisis-language detection is deterministic (not AI-based)
and is a safety-net reminder, not a substitute for the counselor's own
training and judgment.

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run the test suite
npm run build    # production build
```

## Design & Spec

See `docs/superpowers/specs/2026-07-25-solace-counselor-design.md`.
