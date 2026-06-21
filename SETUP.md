# STRIDE — setup

A glanceable fitness dashboard for your iPad. You type nothing. Apple Shortcuts are the
native background engine (geofences, Wi-Fi, charging, calendar, Health, auto-workouts —
free, no app to install, no 7-day rebuild). The web page is just the display.

---

## The model

- **iPhone is the sensor, iPad is the screen.** Only the iPhone can read Apple Health,
  and Health reads only while the phone is unlocked.
- The dashboard takes today's numbers from the URL (`?steps=...&dist=...`) and remembers
  each day in the browser for streaks, trends, and the movement clock. No server holds
  your data; if you host on a **private** GitHub repo the page itself contains no data,
  only the numbers passed in the link.
- **Auto and reliable:** steps, distance, hourly movement, gym (Wi-Fi), walks (geofence
  auto-workout). **Estimated, labelled as such:** sleep (charging + Do Not Disturb).

---

## Goals (edit first)

`index.html`, near the bottom `<script>`:
```js
const GOAL = { gym:5, steps:8000, sleep:7.5, walkSteps:7000 };
```

---

## Step 1 — host the dashboard

Ask me to publish it to a **private GitHub Pages** repo → you get a stable link
(your **DASH_URL**). The link is what the Shortcut opens and what you add to the home
screen. (Local-file hosting works too but makes passing numbers fiddly — go hosted.)

---

## Step 2 — the sync shortcut (Health → dashboard)

New Shortcut named **Stride**. Actions in order:

1. **Find Health Samples** → Steps, today → **Calculate Statistics → Sum** → save as `steps`.
2. **Find Health Samples** → Walking + Running Distance, today → **Sum** → save as `dist`.
3. **Hourly buckets** (powers the movement clock): **Repeat 24 times** →
   inside: **Calculate** start = midnight + (Index−1)h, end +1h → **Find Health Samples →
   Steps** in that range → **Sum** → **Add to Variable** `hourly`. After the loop,
   **Combine Text** `hourly` with comma separator.
4. **Get File** from iCloud `stride-state.txt` (written by Steps 4–6 below: holds
   `gym`, `sleep`, `walk`). **Get Dictionary** from it.
5. **Text** → build the URL:
   ```
   DASH_URL?steps=[steps]&dist=[dist]&sleep=[sleep]&gym=[gym]&walk=[walk]&hours=[hourly]
   ```
6. **Open URLs** → the Text. Add to Home Screen (share icon → Add to Home Screen).

Also run this on a **time automation** a few times a day (e.g. every 3h, "Run
Immediately") so the synced numbers and the iCloud relay stay current.

---

## Step 3 — walks, fully automatic (geofence auto-workout)

This is the accurate, no-false-nag walk detection.

- **Automation → Arrive/Leave → Leave [home address]**, Run Immediately →
  **Start Workout (Outdoor Walk)**. Leaving home on foot now records a real GPS walk
  (exact distance + route saved in Apple Fitness, zero taps).
- **Automation → Arrive [home address]** → **End Workout**, then read the workout
  distance; if it's over ~0.8 km, set `walk = 1` in `stride-state.txt`.
- A **Monday 4 AM** time automation resets `walk = 0` for the new day (and daily at
  midnight). Or simpler: store the walk's date and let the dashboard treat a stale date
  as "open".

The dashboard's walk ring fills from `walk`, and distance shows from Health regardless.

---

## Step 4 — gym sessions, automatic (Wi-Fi)

Your pier gym has Wi-Fi you join — and **a VPN does not hide the network name**, so this
is reliable.

- **Automation → Wi-Fi → Connects to [gym network]**, Run Immediately → read `gym`
  counter from `stride-state.txt`, **+1**, write back. (Add a "once per day" guard:
  only increment if the last gym date isn't today.)
- **Automation → Monday 4 AM** → reset `gym = 0` for the new week.

(If you'd rather not rely on Wi-Fi, swap the trigger for **Arrive [gym address]**.)

---

## Step 5 — sleep (charging AND Do Not Disturb)

Your two-signal logic — plugged in *and* not using the phone:

- **Automation → Do Not Disturb → On** → if **currently charging** (check Battery State),
  save the time as `sleepStart` in `stride-state.txt`. (Requiring both avoids a late-night
  top-up charge counting as sleep.)
- **Automation → Do Not Disturb → Off** (your morning) → compute hours since `sleepStart`,
  save as `sleep`.

If DND isn't on a schedule, set it to turn on/off around your usual nights — it stays your
real "alerts off" window, not an invented number. The dashboard labels this "estimated".

---

## Step 6 — smart reminders (calendar + location aware)

Two or three time automations through your flexible afternoon (e.g. **1:00**, **3:30**,
**5:30 PM**), each "Run Immediately". For each, the actions:

1. **If** `walk` (from `stride-state.txt`) is already 1 → **Stop** (silent — you've walked).
2. **Get Current Location** → **Get Distance** from home → **If** more than ~300 m →
   **Stop** (you're already out moving; no mid-walk nag).
3. **Find Calendar Events** → today, happening now → **If** any → **Stop** (you're in a
   meeting).
4. Otherwise → **Show Notification**: *"Walk's still open. Good window now?"*

Calm, same-day only, no countdowns or guilt — that restraint is deliberate. The dashboard
shows your learned window ("good window today: ~2pm") to guide timing; the nudges just go
quiet once you've walked, are out, or are busy.

> Honest limit: a Shortcut fires at fixed times — it can't auto-move to your learned
> window. Once the movement clock reveals your pattern, set the three times to bracket it.

---

## Step 7 — showing it on the iPad

Because Health only reads on the iPhone, Step 2's sync also does **Save File →
iCloud Drive** (`stride-feed.txt` = the query string). Then on the **iPad**: a shortcut
**Get File** (`stride-feed.txt`) → **Text** `DASH_URL?` + contents → **Open URLs** → Add
to Home Screen. The iPad icon opens the latest synced day. (History/streaks live in the
iPad's browser, so open it there daily. The gym/walk/sleep state in iCloud is the backup.)

---

## Honest caveats

- **Sleep is estimated** (charging + DND), not measured stages. Labelled on the card.
- **Distance is motion-based** and accurate; the **route/map** lives in Apple Fitness from
  the auto-workout, not on the dashboard (a live map would need an installed native app).
- **History lives in the browser** on whichever device opens the page — don't clear that
  site's data. The iCloud state file survives regardless.
- **Geofence/Wi-Fi triggers** need Location "Always" and can occasionally be late; good
  accountability, not a turnstile.

---

## Test now (no Shortcuts needed)

Open `DASH_URL?steps=9200&dist=6.4&sleep=7.3&gym=3&walk=1&hours=0,0,0,0,0,0,0,0,120,0,300,0,0,900,1200,600,0,0,800,0,300,0,0,0`
to see a populated day. Open it across several days and the trend, streak, and movement
clock fill in.
