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

## Step 4 — gym (auto, by location, no chore)

A web page can't watch location in the background and the dashboard iPad sits at home, so
gym detection runs on your **iPhone** via Shortcuts (iOS geofences natively) and reaches
the dashboard through Firebase (Step 2). You don't need any date math: the phone just
writes a one-shot **token** (`gymBump`) on a real visit, and the dashboard turns each new
token into +1 for the current week itself.

**Two Personal Automations**, both keyed to **PureGym Maidenhead** (Automations tab → +
→ Personal → set the location + a tight radius; Run Immediately; turn off Ask Before
Running). They write to Firebase with `Get Contents of URL` → **Method: PUT**:

1. **When I Arrive → PureGym Maidenhead**
   - *Current Date* → *Format Date* (ISO 8601).
   - *Get Contents of URL* — `DB_URL/stride/_gymArrived.json?auth=SECRET`, **PUT**, Request
     Body = Text = the formatted date. (Stores when you walked in.)

2. **When I Leave → PureGym Maidenhead**
   - *Get Contents of URL* — `DB_URL/stride/_gymArrived.json?auth=SECRET`, **GET** → the
     stored arrival date.
   - *Get Time Between Dates* (arrival → Current Date) in **Minutes**.
   - *If* minutes **≥ 20**:
     - *Current Date* → *Format Date* (ISO 8601) → call it `token`.
     - *Get Contents of URL* — `DB_URL/stride/gymBump.json?auth=SECRET`, **PUT**, Body =
       `token`.
     - *Get Contents of URL* — `DB_URL/stride/updated.json?auth=SECRET`, **PUT**, Body =
       `token` (this is what makes the dashboard refresh).
     - *(optional)* Show Notification "Gym logged ✓".
   - *Otherwise*: do nothing (a sub-20-min pop-in doesn't count).

That's it — no weekly reset to maintain, no count to track on the phone. The dashboard
reads `gymBump`, sees it's new, and adds one to this week. Leaving the gym a second time
the same day writes a fresh token and counts again.

**Manual logging (when you want it):**
- *On the dashboard (iPad or phone browser):* tap the **Gym** card → **"Log a session
  today"** (tap again to undo). On the dashboard this counts locally and is preserved
  across syncs; to make a manual log show on *every* device, use the phone shortcut below.
- *Propagating one-tap (phone):* make a home-screen shortcut that PUTs a fresh `token` to
  `gymBump` + `updated` exactly like step 2's success branch. Tapping it logs a session
  everywhere.

**Security:** keep the write `SECRET` only inside the phone Shortcuts. Do **not** put it in
the web page (`FIREBASE_KEY` stays `''`) — the page URL is public, so an embedded write key
would let anyone write. Reads stay open behind the obscure DB URL (only your activity
numbers, never location — the geofence runs and dies on the phone).

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
