# STRIDE — setup (final architecture)

A web dashboard that lives always-on on your iPad **and** iPhone, fed automatically
from Apple Health. No app install, no developer account, no 7-day expiry, free.

```
iPhone ─ "Stride Sync" Shortcut (on unlock + timer) ─► reads Apple Health
                                                       (steps, distance, sleep, walk)
                                                              │  PUT
                                                        Firebase Realtime DB (free)
iPad + iPhone ─ dashboard (web) ◄── polls every 60s ──────────┘   updates itself, no touch
```

You never tell it anything. The phone reads Health and pushes; both screens poll and
refresh themselves seamlessly.

---

## Step 1 — open the dashboard on both devices (2 min)

It's one hosted page — it works in any browser, on any device. On **both** your iPhone
and iPad:
1. Open **https://christian-w-hub.github.io/stride/** in Safari.
2. Share button → **Add to Home Screen**. It installs with the Stride icon and opens
   full-screen like an app. (That's your "shortcut to check it" — just tap the icon.)

History/streaks now live in Firebase (Step 2), so both devices show identical numbers.

---

## Step 2 — the free always-on store (Firebase, ~10 min, one-time)

This is the only account you need, and it's free (Spark plan — verified: it does **not**
sleep or pause, unlike most free tiers).

1. Go to **console.firebase.google.com** → **Create project** (any name, e.g. "stride").
   Skip Google Analytics.
2. Left menu → **Build → Realtime Database** → **Create Database** → pick a location →
   start in **locked mode**.
3. Open the **Rules** tab, paste this, **Publish**:
   ```json
   { "rules": {
       "stride": {
         ".read": true,
         ".write": "auth !== null",
         "updated": { ".write": true },
         "gymLog": {
           "$id": {
             ".write": "(!data.exists() && auth === null) || auth !== null",
             ".validate": "newData.isString() && newData.val().length <= 40"
           }
         }
       }
   } }
   ```
   What this means: **public read** (the iPad/iPhone pages hold **no secret**). Steps, sleep,
   distance, etc. need the write key your Shortcut carries. The one exception is the gym
   log: **anyone can *create* a new session entry without a key** (so the in-app "Log a
   session" button syncs across devices straight from the public page), but **overwriting or
   deleting** an existing entry needs the key — so a stranger who found the URL can't tamper
   with or wipe your history. Only your activity numbers are stored, never location.
4. Copy your database URL from the top of the Data tab — it looks like
   `https://stride-xxxx-default-rtdb.firebaseio.com`.
5. **Write key:** Project Settings (gear) → **Service accounts → Database secrets** →
   reveal/copy the secret. (If that section is hidden on your project, tell me and we'll
   switch to a token rule — 1-minute change.)
6. **Tell me the database URL**, or paste it yourself into `index.html`:
   ```js
   const FIREBASE_URL = 'https://stride-xxxx-default-rtdb.firebaseio.com';
   ```
   then it's live. (I'll redeploy.)

---

## Step 3 — the "Stride Sync" Shortcut (reads Health → pushes) (~15 min, I'll guide)

New Shortcut named **Stride Sync**. Actions:

1. **Find Health Samples** → Steps, today → **Calculate Statistics → Sum** → save `steps`.
2. **Find Health Samples** → Walking + Running Distance, today → **Sum** → save `dist` (km).
3. **Find Health Samples** → Sleep Analysis, last night → hours → save `sleep`.
4. **Hourly buckets** (for the movement clock): **Repeat 24** → each hour: Find Steps in
   that hour → Sum → Add to Variable `hourly`; after the loop, **Combine** with commas.
5. **Walk** = `dist ≥ 1.2` → `1`, else `0` (an **If**). (Auto — a real walk adds >1km, a
   bin trip doesn't. No telling it anything.)
6. **Get Contents of URL** (PUT) → `DB_URL/stride/days/<TODAY yyyy-MM-dd>.json?auth=KEY`
   → Request Body (JSON): `{steps, dist, sleep, walk, hours:[…]}`.
7. **Get Contents of URL** (PUT) → `DB_URL/stride/updated.json?auth=KEY` → Body: current
   time as a number.

Then: **Automation → When iPhone is Unlocked → Run Immediately** (turn off Ask Before
Running) → run Stride Sync. Add a couple of **Time of Day** runs too (e.g. 9am, 2pm, 7pm)
as backup. Now it pushes fresh data many times a day, hands-off.

**Make it silent (do this on every automation):** in each automation set **Run
Immediately** ON and **Notify When Run** OFF. That removes the confirmation prompt *and*
the "ran your automation" notification — it then fires entirely in the background: no
banner to tap, no app opening, no interruption to whatever you're doing.

**One-time only:** the first time Stride Sync runs it asks "Allow Shortcuts to read
[Steps/Sleep/Distance]?" — tap Allow once. After that it never asks again and reads Health
silently. (Health reads and the Firebase PUT both work with the phone locked / in your
pocket.)

---

## Step 4 — gym (auto, by location, no chore)

A web page can't watch location in the background and the dashboard iPad sits at home, so
gym detection runs on your **iPhone** via Shortcuts (iOS geofences natively) and reaches
the dashboard through Firebase (Step 2). No date math on the phone: each real visit just
**adds one timestamped entry to a log** (`/stride/gymLog/<id>`), and the dashboard counts
the entries that fall in the current week. This is robust to being offline (two visits =
two entries, nothing overwrites), supports undo (delete the entry), and is correct on a
fresh device (it reads the whole log).

**Two Personal Automations**, both keyed to **PureGym Maidenhead** (Automations tab → +
→ Personal → set the location + a tight radius; Run Immediately; turn off Ask Before
Running). They write to Firebase with `Get Contents of URL`:

1. **When I Arrive → PureGym Maidenhead**
   - *Current Date* → *Format Date* (ISO 8601) → call it `arrived`.
   - *Get Contents of URL* — `DB_URL/stride/_gymArrived.json?auth=SECRET`, **PUT**, Body =
     `arrived`. (Remembers when you walked in.)

2. **When I Leave → PureGym Maidenhead**
   - *Get Contents of URL* — `DB_URL/stride/_gymArrived.json?auth=SECRET`, **GET** → arrival.
   - *Get Time Between Dates* (arrival → Current Date) in **Minutes**.
   - *If* minutes **≥ 20**:
     - *Format Date* (arrival, format `yyyy-MM-dd'T'HH`) → call it `id` (one entry per
       arrival-hour → a Shortcut retry overwrites the same id, never double-counts).
     - *Current Date* → *Format Date* (ISO 8601) → call it `ts`.
     - *Get Contents of URL* — `DB_URL/stride/gymLog/gym_[id].json`, **PUT**, Body = `ts`.
       *(No `?auth` needed — creating a new log entry is allowed keyless; see the rules.)*
     - *Get Contents of URL* — `DB_URL/stride/updated.json`, **PUT**, Body = `ts` (this is
       what makes every dashboard refresh).
     - *(optional)* Show Notification "Gym logged ✓".
   - *Otherwise*: do nothing (a sub-20-min pop-in doesn't count).

No weekly reset to maintain, no count to track. The dashboard reads the log and counts
this week's entries. Leave the gym a second time the same day → a different arrival-hour id
→ counts again.

**Manual logging (works in-app on iPad *and* iPhone, synced):** open the dashboard on
either device, tap the **Gym** card → **"Log a session today"**. It writes a log entry the
same way, so it shows on every device within a minute. Tap again to undo — undo on the
dashboard removes it locally; to delete it everywhere you'd remove the entry from the phone
(delete needs the key). For pure one-tap-from-the-homescreen, make a phone shortcut that
does step 2's success branch.

**Security:** leave `FIREBASE_KEY` as `''` in the page (the URL is public). The rules let
anyone *create* a gym-log entry keyless (so the in-app button syncs) but require the key to
*overwrite/delete* — so your history can't be tampered with. Steps/sleep/distance writes
still need the key, which lives only in the phone Shortcuts. Only numbers leave the phone,
never location.

---

## Step 4b — optional: jump-start with your Health history

So the trends, streaks and averages aren't empty on day one, backfill a few months of
Apple Health data. One **Shortcut "Stride Backfill"**, run once:

- *Number* = how many days back (e.g. `120`). **Repeat** that many times; inside, `Repeat
  Index` is 1, 2, 3…
  - *Current Date* → *Adjust Date* → **subtract `Repeat Index` days** → `Day`. (Index 1 =
    yesterday; today is owned by the live sync, skip it.)
  - *Format Date* (`Day`, `yyyy-MM-dd`, **device-local timezone**) → `DayKey`.
  - **Steps:** *Find Health Samples* → Steps, date is `Day` → *Calculate Statistics → Sum*.
  - **Distance:** *Find Health Samples* → Walking + Running Distance, `Day` → *Sum* (in
    **km**; ÷1000 if your locale returns metres — check one day first).
  - **Sleep:** *Find Health Samples* → Sleep Analysis for the night ending on `Day` → total
    asleep → **hours**. If no sample, skip the field.
  - *If* distance ≥ 1.2 → `walk` = `true`, else `false`.
  - *Dictionary* `{steps, dist, sleep, walk}` (omit `sleep` if none) → *Get Contents of
    URL* `DB_URL/stride/days/[DayKey].json?auth=SECRET`, **PUT**, Body = the dictionary.
  - *Wait 0.3 seconds* (gentle on rate limits).
- **After the loop:** one *Get Contents of URL* `DB_URL/stride/updated.json?auth=SECRET`,
  **PUT**, Body = Current Date as Unix-time-ms. This single write makes the dashboard pull
  the whole import.

Notes: 3–6 months is the sweet spot (anything past 5 years is auto-pruned). Keep batches
≤ ~60 days/run. **Omit the `hours` field** (the movement-clock can't be reconstructed; it
just stays empty for old days, which is honest) and **omit `sleep` on days with no sample**
(don't write `0`). Gym history can't come from Health — if you want past weekly gym counts,
PUT them to `DB_URL/stride/gymWeeks.json` keyed by the Monday's date, e.g.
`{"2026-06-01":3,"2026-06-08":4}`.

---

## Step 5 — the reminders (native alerts, on-brand)

These are **real iOS notifications** (Shortcuts posts them natively — banner + lock
screen), and because your home-screen icon is the Stride icon, they read as a real app.

Make 2–3 **Time of Day** automations through your flexible afternoon (e.g. **1:00**,
**3:30**, **5:30 PM**), each Run Immediately:
1. **Get Contents of URL** (GET) `DB_URL/stride/days/<TODAY>.json` → if `walk` is already
   `1` → **Stop** (silent — you've walked).
2. Otherwise → **Show Notification**, title **"Stride"**, body in the dashboard's voice:
   e.g. *"Walk's still open. Good window now?"* / *"A walk fills the ring."*

> Honest note on "matching the design": iOS controls the notification's look (icon +
> title + text) — no custom glass styling is possible for *any* non-App-Store app. So we
> make it feel on-brand via the **Stride icon** and copy that matches the dashboard's
> status-line voice. That's as native + on-brand as it gets without the App Store.

---

## What's already done (no action)

- Dashboard built, hosted, always-on; knows the date, resets the week, survives running
  for weeks; click-to-expand cards; Lucide icons; branded home-screen icon.
- **Live-sync wired** — once `FIREBASE_URL` is set, both devices poll every 60s and
  refresh **seamlessly** (no flash, no re-animation).
- **Background video slowed to half speed** — calmer, more ambient/breathing.
- **Settings (gear, top-right)** — adjust your targets any time (gym/week, daily steps,
  sleep target, what counts as a walk). Saved on the device; the whole dashboard re-scales
  to the new goals.

## Honest caveats
- Sleep is estimated (charging + Do Not Disturb window), labelled as such.
- Walk is auto-detected from real distance — accurate for "did I walk," not a GPS route
  (route/map was deliberately dropped; it needs a Watch or a native app for real fidelity).
- Firebase holds only your activity numbers (no location), behind an obscure URL, read-only
  to the pages, write-key on your phone only.

## Test now (before Firebase)
Open `https://christian-w-hub.github.io/stride/?steps=9200&dist=6.4&sleep=7.3&gym=3&walk=1&hours=0,0,0,0,0,0,0,0,120,0,300,0,0,900,1200,600,0,0,800,0,300,0,0,0`
to see a populated day. Once `FIREBASE_URL` is set, it ignores the URL and lives off Firebase.
