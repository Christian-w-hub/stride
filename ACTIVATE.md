# Activate Stride — iPhone setup (~15 min, one sitting)

Everything in the app is built and live. The only thing left is to let your **iPhone** send
its Health + location to the dashboard. iOS sandboxes Health, so this can only be done with
the built-in **Shortcuts** app — no third-party app, no code.

You'll build **3 shortcuts** (plus optional ones). After the first runs once, today's numbers
appear on the dashboard within a minute.

Your database URL (used in every step below):

```
https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app
```

---

## Step 0 — get your write key (2 min)

Reading is open, but **writing** steps/sleep/distance needs a key (so randoms can't write to
your data). Get it once:

1. Firebase console → your **stride-dash** project → ⚙️ **Project settings**.
2. **Service accounts** tab → **Database secrets** (left sub-menu) → **Show** → copy the long
   string. That's your `KEY`.
   - If "Database secrets" isn't shown, click **Manage service accounts / legacy** or enable
     it; new projects sometimes hide it. If you genuinely can't get one, tell me and I'll
     switch the rules to keyless writes (simpler, slightly less private) — then you skip the
     `?auth=KEY` everywhere below.

Wherever you see `KEY` below, paste that string. **Keep it only in Shortcuts — never anywhere
public.**

---

## Shortcut 1 — "Stride Sync" (the core: today's Health → dashboard)

Shortcuts app → **+** (new shortcut) → name it **Stride Sync**. Add these actions in order
(tap **+ Add Action**, search the name):

1. **Find Health Samples** → Steps → set **Sample where** Start Date **is Today**.
2. **Calculate Statistics** → operation **Sum** → input the Health Samples → this is your step
   total. (Tap the result chip later to insert it.) Call it `Steps`.
3. **Find Health Samples** → Walking + Running Distance → **is Today** →
   **Calculate Statistics → Sum** → `Dist`. (If it comes back in metres, add a **Calculate** →
   `Dist ÷ 1000` so it's km.)
4. **Find Health Samples** → Sleep Analysis → for last night (Start Date **is in the last 1
   day**) → **Calculate Statistics → Sum** of durations → **Calculate** → `÷ 3600` to get
   hours → `Sleep`. (If no sleep data, that's fine — see the note.)
5. **Text** → type the date format `yyyy-MM-dd`. Then **Format Date** → Current Date → Custom →
   paste that format, **timezone = your local** → `DayKey`.
6. **If** `Dist` **is greater than** `1.2` → **Text** `true` ; **Otherwise** → **Text**
   `false` → call it `Walk`. (A "real walk" = ≥1.2 km, matching the app default.)
7. **Dictionary** → add keys:
   - `steps` → `Steps`
   - `dist` → `Dist`
   - `sleep` → `Sleep`
   - `walk` → `Walk`
   (Leave `sleep` out only if you have no sleep tracking.)
8. **Get Contents of URL**:
   - URL: `https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app/stride/days/[DayKey].json?auth=KEY`
   - Method: **PUT**
   - Request Body: **JSON** → the **Dictionary** from step 7.
9. **Get Contents of URL** (this is what makes the dashboard refresh):
   - URL: `https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app/stride/updated.json?auth=KEY`
   - Method: **PUT**
   - Request Body: **Text** → **Current Date** formatted as **Unix time** (or any big number).

Run it once (▶). The first time, iOS asks **"Allow Shortcuts to read Steps / Sleep /
Distance?"** → **Allow**. Then open the dashboard — today's Activity/Sleep/Walk should fill
within ~60s.

**Make it automatic + silent:** Shortcuts → **Automation** → **+** →
- **When I unlock iPhone** → Run **Stride Sync** → **Run Immediately**, **Notify When Run = OFF**.
- Add 2–3 **Time of Day** automations (e.g. 9am, 2pm, 8pm) → same shortcut, same settings.

Now it pushes fresh data many times a day, in the background, no banners.

---

## Shortcut 2 — "Stride Backfill" (one run: fill your history)

So the trends/streaks aren't empty. New shortcut → **Stride Backfill**:

1. **Number** → `90` (days to backfill). Call it `N`.
2. **Repeat** `N` times. Inside the loop (`Repeat Index` = 1, 2, 3 …):
   - **Current Date** → **Adjust Date** → **Subtract** `Repeat Index` **Days** → `Day`.
     (Index 1 = yesterday; today is owned by Stride Sync.)
   - **Format Date** (`Day`, `yyyy-MM-dd`, local tz) → `DayKey`.
   - **Find Health Samples** Steps where date **is** `Day` → **Calculate Statistics → Sum** → `Steps`.
   - **Find Health Samples** Walking+Running Distance, `Day` → **Sum** → `Dist` (÷1000 if metres).
   - **Find Health Samples** Sleep Analysis for the night ending `Day` → **Sum** → ÷3600 → `Sleep`.
   - **If** `Dist > 1.2` → `Walk` = `true`, else `false`.
   - **Dictionary** `{steps, dist, sleep, walk}` (omit `sleep` if none that day).
   - **Get Contents of URL** → `…/stride/days/[DayKey].json?auth=KEY` → **PUT** → JSON = Dictionary.
   - **Wait** `0.3` seconds (gentle on the database).
3. **After the loop:** one **Get Contents of URL** → `…/stride/updated.json?auth=KEY` → **PUT** →
   Body = Current Date as Unix time. (This triggers the dashboard to pull everything in.)

Run it once. 90 days takes a minute or two. Don't backfill past ~1–2 years (the app keeps 5).

---

## Shortcut 3 — Movement reminders (the alerts, on your phone)

Calm nudges if you haven't walked. New shortcut → **Stride Nudge**:

1. **Format Date** (Current Date, `yyyy-MM-dd`, local) → `DayKey`.
2. **Get Contents of URL** → `…/stride/days/[DayKey].json` → **GET** (no key needed for reads).
3. **Get Dictionary Value** → `walk` from the result.
4. **If** that value **is** `true` → **Stop and Output Nothing** (you've walked — stay quiet).
   **Otherwise** → **Show Notification** → e.g. *"No walk yet — a short one still counts."*

**Automations:** 2–3 **Time of Day** runs through your afternoon/evening (e.g. **1pm, 4pm,
6:30pm**) → Run **Stride Nudge** → **Run Immediately**, **Notify When Run = ON** (you *want*
the banner here). The shortcut self-silences on days you've already walked, so it never nags.

*(iPad note: alerts live on the phone — it's always with you. The iPad is the glance display
and already shows the state.)*

---

## Optional A — gym auto-detect by location (no chore)

So gym sessions log themselves when you're at PureGym Maidenhead ≥20 min. Full recipe is in
**SETUP.md → Step 4** (two automations: Arrive saves the time, Leave logs a `gymLog` entry if
you stayed ≥20 min — no key needed for that one). Until you set it up, the dashboard's
**"Log a session today"** button is the one-tap fallback and already syncs.

## Optional B — weekly recap nudge

New shortcut → **Stride Recap** → just **Show Notification** *"Your Stride week's in — take a
look."* → Automation: **Time of Day**, **Sunday 6pm**, Notify ON. (The dashboard already shows
the full recap when you open it.)

---

## You're live when…

- Stride Sync has run once → today's Activity / Sleep / Daily-walk fill in.
- Backfill has run → the trends, streaks and monthly views populate.
- Nudge automations are on → you get a gentle reminder only on days you haven't walked.

Anything snags on a step, tell me which action and I'll talk you through it.
