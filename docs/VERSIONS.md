# Stride — version boundary (read this first)

This file is the source of truth for what is **live** vs **planned**. If a future
conversation is unsure, trust this.

---

## V1 — LIVE NOW (the current app)

**What it is:** the accountability dashboard as it exists today. A single-file
`index.html` on GitHub Pages, reading a Firebase Realtime DB, shown on an iPad kiosk.

**Data pipeline (V1):** Apple Health → iPhone **Shortcuts** → Firebase RTDB → the page.
- Phone sends **raw** numbers only (steps, distance; optional sleep). The app derives
  everything else (what counts as a walk, streaks, etc.). See `ACTIVATE.md`.
- Writes are **keyless** to specific paths (`/stride/days`, `/stride/updated`,
  `/stride/stretch`, `/stride/gymLog`). No secret on the public page.
- Backend services involved: **none.** Just the page + Firebase.

**Status:** working. The user does the Shortcuts setup himself (`ACTIVATE.md`).
**Do not** add V2 backend pieces into V1. V1 stays exactly as is until V2 is switched on.

---

## V2 — PLANNED, built but DORMANT (Oura Ring background sync)

**Trigger to start:** the user gets an **Oura Ring** and says "go". Until then this is
inert — no live accounts, nothing running, V1 untouched.

**What it adds:** recovery signals (sleep, HRV, resting heart rate) pulled fully in the
**background** — no phone, no app to open — to make the workout plan recovery-aware.

**Data pipeline (V2):**
```
Oura cloud → Nango (holds + auto-rotates the OAuth token) → a free cron (Val Town)
           → Firebase RTDB under /v2/oura → the page reads it
```
- **Nango** owns the only fragile thing (Oura's single-use rotating refresh token) and
  rotates it forever. Every credential the user holds is **static** (no monthly re-auth).
- V2 Firebase writes are **locked behind a service-account** (NOT keyless) so nobody can
  inject fake health data. V1's keyless step-counter paths are unchanged.
- Data is **anonymous**: only `daily` + `heartrate` (+ `workout`) Oura scopes; **no**
  `email`/`personal`. The DB holds numbers, not identity.

**Status:** backend code + rules + runbook are written and waiting in `v2-backend/` and
`docs/v2-oura-backend.md`. Nothing is deployed. The app-side reader is a **later step**,
deliberately NOT yet in `index.html`.

**Decision on file:** the genuine "managed auth, no babysitting" path is **Nango**, not
Pipedream (Pipedream has no Oura connector and no self-serve custom OAuth). See
`docs/v2-oura-backend.md` for the full rationale and the go-time steps.

---

## The hard line
- A change to step/walk/gym/stretch tracking or the page UI = **V1**.
- Anything involving Oura, Nango, a cron, OAuth, or `/v2/**` = **V2**.
- V2 must never make V1 depend on a backend or a secret.
