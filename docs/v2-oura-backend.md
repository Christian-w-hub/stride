# Stride V2 — Oura background backend (go-time runbook)

> Status: **DORMANT.** Code is written and waiting in `v2-backend/`. Nothing is
> deployed. V1 (the live app) is untouched. See `docs/VERSIONS.md` for the boundary.
> Run this only once the Oura Ring has arrived and you've used it for a night or two.

## What it does
Pulls last night's **sleep duration, HRV, and resting heart rate** from Oura, fully in
the background (no phone, no app to open), and writes anonymous numbers to Firebase under
`/v2/oura`. Later, the app reads them to make the workout plan recovery-aware. No Oura
"readiness score" is imported — we use the raw signals (project guardrail: no composite
score, see `docs/oura-insights.md`).

## Architecture (verified viable; see chat research)
```
Oura cloud → Nango (holds + auto-rotates the OAuth token) → Val Town cron (free)
           → Firebase /v2/oura → the iPad page reads it
```
**Why Nango:** it owns Oura's single-use *rotating* refresh token and renews it forever,
so there's no monthly re-auth. Every credential you hold is static. (Pipedream was
rejected: no Oura connector, no self-serve custom OAuth.)

## Cost & capacity (verified)
All free, no credit card: Nango free (10 connections, 100k proxy req), Val Town free
(100k runs/day, 15-min cron). Actual load is a few calls every 2h — a rounding error.

## Security model (most secure that stays low-effort)
- **Anonymous data:** request only Oura scopes `daily heartrate workout`. **Never** `email`
  or `personal`. The DB holds numbers, not identity.
- **Writes locked:** `/v2/**` writes require auth (`firebase-rules-v2.json`). Only the
  service-account cron can write — nobody can inject fake health data. (V1's keyless
  step-counter paths are unchanged.)
- **Service-account auth, not the legacy DB secret:** the cron mints a short-lived,
  DB-scoped Google token. The all-powerful legacy secret is never used.
- **No secrets on the page or in the repo:** the public page stays read-only and keyless.
  Secrets live only in Val Town's env + Nango.
- **Reads stay open** (anonymous numbers, obscure URL) so the page needs no login. The one
  stricter option — full read-auth — would break the keyless simplicity, so it's
  deliberately deferred. Revisit only if the data ever stops being anonymous.
- HTTPS end to end. Turn on **2FA** for Oura, Nango, Val Town, Google. Kill switch: revoke
  the Oura connection in Nango (or at Oura) anytime; wipe `/v2` in Firebase instantly.

---

## The steps (≈15–20 min, one time)

**1. Oura OAuth app**
- Oura dev portal → create an OAuth2 application.
- Scopes: `daily`, `heartrate`, `workout` only.
- Redirect URI: use the one Nango gives you in step 2.
- Copy the **client id + client secret** (you'll paste them into Nango, not here).

**2. Nango — connect Oura**
- Create a Nango cloud account (free).
- Add the **Oura** integration; paste the Oura client id/secret; set Nango's callback as
  the Oura redirect URI.
- Click **Authorize** and log into your Oura account once. Nango now holds + rotates the
  token forever. Note the **Connection ID**, the **Provider Config Key**, and your
  **Nango secret key**.

**3. Firebase service account**
- Firebase console → Project settings → Service accounts → **Generate new private key**.
- You get a JSON file. Keep it safe; you'll paste its contents into Val Town (step 5).

**4. Merge the rules**
- Firebase → Realtime Database → Rules. Merge the `v2` block from
  `v2-backend/firebase-rules-v2.json` into your existing V1 rules (don't replace V1).
  Publish.

**5. Deploy the sync (Val Town)**
- New Val → paste `v2-backend/oura-sync.ts`.
- Set env vars: `NANGO_SECRET_KEY`, `NANGO_CONNECTION_ID`, `NANGO_PROVIDER_KEY`,
  `FIREBASE_DB_URL`, `FIREBASE_SA` (paste the whole JSON from step 3 as one string).
- **Test once:** Run the val manually. Expect `synced N day(s): …`. Check Firebase
  `/v2/oura` shows yesterday's `{sleep_h, hrv, resting_hr}`. (This is the one manual
  verification — the code can't be tested without your live ring + accounts.)
- Add a **cron** trigger: every 2 hours.

**6. Deploy the watchdog (optional, recommended)**
- New Val → paste `v2-backend/oura-watchdog.ts`; set `FIREBASE_DB_URL`.
- Add the Val Town email line (one import) so it emails you if data goes stale.
- Cron: once a day.

**7. App reader (separate later step — NOT in `index.html` yet)**
- Add a small block to the dashboard that reads `/v2/oura` and feeds HRV/resting-HR into
  the existing "easy day / deload" logic (which already adapts to short sleep). This is
  the only change that touches the live app, done as its own pass when you're happy the
  data is flowing.

## If it ever breaks
Almost always: the Oura connection in Nango needs re-authorizing (rare). Re-click
Authorize in Nango — 30 seconds. The watchdog is what tells you; you don't go looking.
