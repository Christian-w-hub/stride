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
       "stride": { ".read": true, ".write": "auth !== null" }
   } }
   ```
   (Public read = the iPad/iPhone pages hold **no secret**. Write needs the key your
   Shortcut carries — see below. Only your activity numbers are stored, never location.)
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

---

## Step 4 — gym (the one bit that needs a trigger)

iPhone can't sense a gym session, so pick one:
- **Auto (recommended):** Automation → **Wi-Fi → Connects to [your gym network]**, Run
  Immediately → bump a stored count and PUT `DB_URL/stride/gymWeek.json?auth=KEY` =
  `{week:"<this Monday>", count:N}`. (A VPN does **not** hide the Wi-Fi name, so this
  works for you.) Add a **Monday 4am** automation to reset count to 0.
- **One-tap fallback:** a "Log gym" home-screen shortcut you tap on arrival (the most
  reliable signal of all, if you don't mind one tap).

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

## Honest caveats
- Sleep is estimated (charging + Do Not Disturb window), labelled as such.
- Walk is auto-detected from real distance — accurate for "did I walk," not a GPS route
  (route/map was deliberately dropped; it needs a Watch or a native app for real fidelity).
- Firebase holds only your activity numbers (no location), behind an obscure URL, read-only
  to the pages, write-key on your phone only.

## Test now (before Firebase)
Open `https://christian-w-hub.github.io/stride/?steps=9200&dist=6.4&sleep=7.3&gym=3&walk=1&hours=0,0,0,0,0,0,0,0,120,0,300,0,0,900,1200,600,0,0,800,0,300,0,0,0`
to see a populated day. Once `FIREBASE_URL` is set, it ignores the URL and lives off Firebase.
