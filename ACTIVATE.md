# Activate Stride — iPhone Shortcuts (step by step)

iOS only lets the built-in **Shortcuts** app read Health, so your data reaches the dashboard
through Shortcuts. You'll build **3 shortcuts**. After the first runs once, today's numbers
show on the dashboard within a minute.

**Conventions in this guide**
- **Bold** = the exact action name to search for in Shortcuts (tap **＋ Add Action**, type it).
- "Set X to Y" = tap the highlighted blue field in that action and choose Y.
- *Insert "Name"* = tap **Select Variable** (or the variables bar above the keyboard) and pick
  the variable you made earlier with that name.

Your database address (used in the URLs):
```
https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app
```

---

## Step 0 — get your write key (once)

Writing needs a key so strangers can't write to your data (reading is open).

1. **console.firebase.google.com** → your **stride-dash** project.
2. Gear icon → **Project settings** → **Service accounts** tab → **Database secrets**.
3. Tap **Show**, copy the long string. That is your **KEY**.

Keep KEY only inside Shortcuts. (If you can't find Database secrets — some new projects hide
it — message me and I'll switch the rules so no key is needed.)

---

## Shortcut 1 — "Stride Sync" (today's Health → dashboard)

Open **Shortcuts** → tab **Shortcuts** → **＋** (top right) → tap the name field → call it
**Stride Sync**. Now add these actions in order:

**1. Find Health Samples**
- Tap **Steps** is already the type? If not, tap the type and choose **Steps**.
- Tap **Add Filter** → **Start Date** → **is today**.

**2. Calculate Statistics**
- It reads "Calculate **Average** of **Health Samples**". Tap **Average** → choose **Sum**.
  (Leave the input as the Health Samples from action 1.)

**3. Set Variable**
- "Set Variable **Variable** to **Statistics**". Tap **Variable**, name it **Steps**.

**4. Find Health Samples**
- Tap the type → **Walking + Running Distance**.
- **Add Filter** → **Start Date** → **is today**.

**5. Calculate Statistics** → set to **Sum**.

**6. Set Variable** → name it **Dist**.
- (Distance usually comes in km already. If your numbers look ~1000× too big, it's in metres
  — add a **Calculate** action: *Insert "Dist"* **÷ 1000**, then Set Variable **Dist** to that.)

**7. Format Date**
- "Format **Date** Date Format **...**". Tap **Date** → choose **Current Date**.
- Tap the format → **Custom** → in **Format String** type exactly: `yyyy-MM-dd`.

**8. Set Variable** → name it **DayKey** (value = the Formatted Date from action 7).

**9. If**
- "If **Input** ..." → tap **Input** → *Insert "Dist"*.
- Tap the condition → **is greater than** → value `1.2`.
- Inside the If: add **Text** → type `true`.
- Tap **Otherwise**: add **Text** → type `false`.
- (So the If outputs `true` or `false`.) After **End If**, add **Set Variable** → name it
  **Walk** (value = the **If Result** / the text just produced).

**10. Get Contents of URL**  ← this sends today's numbers
- Tap the URL field and type, inserting DayKey where shown:
  `https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app/stride/days/` *Insert "DayKey"* `.json?auth=KEY`
  (replace `KEY` with your key string).
- Tap **Show More**.
- **Method** → **PUT**.
- **Request Body** → **JSON**. Then **Add new field** four times:
  - Type **Number**, Key `steps`, Value *Insert "Steps"*
  - Type **Number**, Key `dist`, Value *Insert "Dist"*
  - Type **Number**, Key `sleep`, Value *Insert "Sleep"*  *(skip this row for now — see sleep note)*
  - Type **Text**, Key `walk`, Value *Insert "Walk"*

**11. Format Date**
- **Date** → **Current Date**; format → **ISO 8601**.

**12. Get Contents of URL**  ← tells the dashboard "fresh data, refresh"
- URL: `https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app/stride/updated.json?auth=KEY`
- **Show More** → **Method PUT** → **Request Body** → **Text** → *Insert the ISO date from
  action 11*.

Tap **▶ (Play)** to run. iOS will ask **"Allow Stride Sync to read Steps / Distance?"** →
**Allow**. Open the dashboard — Activity and Daily walk fill within ~60s.

**Sleep (optional, do it after the rest works):** sleep is the fiddly one in Shortcuts. Add
before action 10: **Find Health Samples** → type **Sleep Analysis** → **Add Filter** →
**Start Date** → **is in the last** `1` `days` → **Calculate Statistics** → **Sum** →
**Calculate** *that* **÷ 3600** → **Set Variable Sleep**. Then add the `sleep` row in action
10. If it misbehaves, leave sleep out — the dashboard just shows sleep as blank, which is fine.

**Make it run by itself, silently:**
- Shortcuts → tab **Automation** → **＋** → **Create Personal Automation**.
- **App** or **Time of Day**? Pick **Time of Day** → e.g. **9:00 am** → Next.
- **Run Immediately**, and turn **Notify When Run** **OFF** → choose **Run Shortcut → Stride
  Sync**.
- Repeat to add **2:00 pm** and **8:00 pm**. Also add a **When I unlock iPhone** one the same
  way. Now it syncs through the day with no banners.

---

## Shortcut 2 — "Stride Backfill" (one run, fills your history)

New shortcut → **Stride Backfill**:

**1. Number** → set to `90` (days back).

**2. Repeat** → "Repeat **Number** times" (insert the Number from action 1, or just type 90).
Everything below goes **inside** the Repeat block, above **End Repeat**:

- **Format Date**: **Date** → **Current Date**; format **Custom** `yyyy-MM-dd`. *(we adjust it
  next)* — actually do the adjust first:
- **Adjust Date**: "Adjust **Date** by **Add** ..." → **Date** = **Current Date**; change
  **Add** → **Subtract**; amount = *Insert "Repeat Index"*; unit **Days**. → **Set Variable Day**.
- **Format Date**: **Date** = *Insert "Day"*; format **Custom** `yyyy-MM-dd` → **Set Variable DayKey**.
- **Find Health Samples** Steps → **Add Filter** **Start Date** **is** *Insert "Day"* →
  **Calculate Statistics Sum** → **Set Variable Steps**.
- **Find Health Samples** Walking + Running Distance → filter **Start Date is** *Insert "Day"*
  → **Calculate Statistics Sum** → **Set Variable Dist** (÷1000 if metres).
- **If** *Insert "Dist"* **is greater than** `1.2` → **Text** `true`; **Otherwise** **Text**
  `false` → **End If** → **Set Variable Walk**.
- **Get Contents of URL**: `…/stride/days/` *Insert "DayKey"* `.json?auth=KEY` → **PUT** →
  **JSON** → fields: Number `steps`=Steps, Number `dist`=Dist, Text `walk`=Walk.
- **Wait** → `0.3` seconds.

**3. After End Repeat:** **Format Date** Current Date **ISO 8601** → **Get Contents of URL**
`…/stride/updated.json?auth=KEY` → **PUT** → **Text** = that ISO date. (This makes the
dashboard pull everything in.)

Run it once with **▶**. 90 days takes a minute or two.

---

## Shortcut 3 — "Stride Nudge" (the walk reminders)

New shortcut → **Stride Nudge**:

**1. Format Date** → Current Date → **Custom** `yyyy-MM-dd` → **Set Variable DayKey**.
**2. Get Contents of URL** → `…/stride/days/` *Insert "DayKey"* `.json` → **Method GET** (no key
needed; this is a read).
**3. Get Dictionary Value** → "Get **Value** for **walk** in **Contents of URL**" (tap **Key** →
type `walk`; input = the previous result).
**4. If** that **Dictionary Value** **is** `true` → leave the If branch empty. Tap
**Otherwise** → **Show Notification** → text: `No walk yet — a short one still counts.`

**Automations:** Automation tab → **＋** → **Time of Day** → e.g. **1:00 pm** → **Run
Immediately**, **Notify When Run ON** → Run **Stride Nudge**. Add **4:00 pm** and **6:30 pm**
the same way. On days you've already walked it stays silent, so it never nags.

---

## Optional — gym auto-detect (location)

Logs gym sessions automatically at PureGym Maidenhead (≥20 min). Recipe: **SETUP.md → Step 4**.
Until then, on the dashboard tap the **Gym** card → **Log a session today** (syncs instantly).

---

## You're live when

- **Stride Sync** has run once → today's Activity + Daily walk fill in.
- **Stride Backfill** has run → trends, streaks and the monthly views populate.
- **Stride Nudge** automations are on → a gentle reminder only on un-walked days.

Stuck on any single action? Tell me the shortcut name and step number and I'll describe that
exact screen.
