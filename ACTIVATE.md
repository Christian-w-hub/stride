# Activate Stride — the simple version

iOS only lets the **Shortcuts** app read Health, so one small shortcut sends your numbers to
the dashboard. The shortcut just reads two Health totals and posts them — **no key, no date
stamp, no walk logic.** The app/database do all the rest (it decides what's a real walk,
tracks streaks, refreshes itself).

**Conventions**
- **Bold** = an action to add (tap **＋ Add Action**, type the name).
- *Insert "Name"* = tap the variables bar above the keyboard and pick that variable.

Your database address:
```
https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app
```

---

## Step 0 — make it keyless (once, 1 min)

So the shortcut needs no key. In the Firebase console → **Realtime Database** → **Rules** tab →
replace everything with this and tap **Publish**:

```json
{
  "rules": {
    "stride": {
      ".read": true,
      "days":    { ".write": true },
      "updated": { ".write": true },
      "stretch": { ".write": true },
      "gymLog":  { "$id": { ".write": "!data.exists() || auth !== null", ".validate": "newData.isString() && newData.val().length <= 40" } }
    }
  }
}
```

(Anyone who knew the obscure URL could write fitness numbers to it — there's no personal data,
and you can wipe/fix it any time. That's the trade for zero key-juggling.)

---

## The one shortcut that matters — "Stride Sync"

Shortcuts app → **Shortcuts** tab → **＋** → name it **Stride Sync**. Add, in order:

1. **Find Health Samples** → set the type to **Steps** → **Add Filter** → **Start Date** → **is today**.
2. **Calculate Statistics** → change **Average** to **Sum**.
3. **Set Variable** → name it **Steps**.
4. **Find Health Samples** → type **Walking + Running Distance** → **Add Filter** → **Start Date** → **is today**.
5. **Calculate Statistics** → **Sum**.
6. **Set Variable** → name it **Dist**.
7. **Format Date** → tap **Date** → **Current Date**; tap the format → **Custom** → type `yyyy-MM-dd`.
8. **Set Variable** → name it **DayKey**.
9. **Get Contents of URL**:
   - **URL** (type the text, and where it says *Insert "DayKey"* tap the variable):
     `https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app/stride/days/` *Insert "DayKey"* `.json`
   - tap **Show More** → **Method** → **PUT**.
   - **Request Body** → **JSON** → **Add new field** twice:
     - Type **Number**, Key `steps`, Value *Insert "Steps"*
     - Type **Number**, Key `dist`, Value *Insert "Dist"*

That's the whole thing. Tap **▶**. iOS asks once to **Allow** Health access → **Allow**. Open
the dashboard — today's Activity and Daily-walk fill within a minute.

**Make it run itself, silently:** Shortcuts → **Automation** tab → **＋** → **Create Personal
Automation** → **Time of Day** → 9:00 am → **Next** → **Run Immediately**, turn **Notify When
Run OFF** → **Run Shortcut** → **Stride Sync**. Add a couple more times (2 pm, 8 pm) and a
**When I unlock iPhone** one the same way.

**You're live.** Everything else below is optional.

---

## Optional — history, reminders, sleep

**Backfill your last 90 days** (one run). New shortcut **Stride Backfill**:
1. **Number** → `90`.
2. **Repeat** → that number of times. Inside the loop:
   - **Adjust Date** → **Date** = **Current Date**, **Subtract**, amount = *Insert "Repeat Index"*, unit **Days** → **Set Variable Day**.
   - **Format Date** → *Insert "Day"*, **Custom** `yyyy-MM-dd` → **Set Variable DayKey**.
   - **Find Health Samples** Steps, **Start Date is** *Insert "Day"* → **Calculate Statistics Sum** → **Set Variable Steps**.
   - **Find Health Samples** Walking + Running Distance, **is** *Insert "Day"* → **Sum** → **Set Variable Dist**.
   - **Get Contents of URL** → `…/stride/days/` *Insert "DayKey"* `.json` → **PUT** → **JSON**: Number `steps`=Steps, Number `dist`=Dist.
   - **Wait** `0.3` seconds.
Run once.

**Walk reminders.** New shortcut **Stride Nudge**:
1. **Format Date** → Current Date, **Custom** `yyyy-MM-dd` → **Set Variable DayKey**.
2. **Get Contents of URL** → `…/stride/days/` *Insert "DayKey"* `.json` → **Method GET**.
3. **Get Dictionary Value** → Key `walk`, from the result.
4. **If** that value **is** `true` → leave empty; **Otherwise** → **Show Notification** → `No walk yet — a short one still counts.`
Automations: **Time of Day** 1 pm / 4 pm / 6:30 pm, **Notify ON**. It self-silences once you've walked.

**The sleep step** (the one fiddly Health read — add when ready). In **Stride Sync**, before
action 9: **Find Health Samples** → **Sleep Analysis** → **Start Date is in the last 1 days** →
**Calculate Statistics Sum** → **Calculate** *that* **÷ 3600** → **Set Variable Sleep** → then
add a third JSON field in action 9: Number `sleep` = *Sleep*. The Sleep card lights up on the
next sync.

**Gym auto-detect by location.** A separate location-triggered automation, no key needed.
First make a shortcut **Stride Gym**:
1. **Format Date** → **Current Date**, format **Custom** `gym_yyyyMMddHHmm` → **Set Variable Id**.
2. **Format Date** → **Current Date**, format **ISO 8601** (Date and time) → **Set Variable Stamp**.
3. **Text** → type a quote, *Insert "Stamp"*, a quote (so the body is a JSON string) → **Set Variable Body**.
4. **Get Contents of URL** → `…/stride/gymLog/` *Insert "Id"* `.json` → **Show More** → **Method PUT** → **Request Body** = **File** → *Insert "Body"*.

Then the trigger: **Automation** tab → **＋** → **Arrive** → choose your gym → **Next** → **Run
Immediately**, **Notify When Run OFF** → **Run Shortcut** → **Stride Gym**. Arriving logs one
session. (No gym? Tap the dashboard **Gym** card → **Log a session today**.)

**Movement rhythm** (advanced — powers the hourly clock; 24 Health reads, run a few times a day).
New shortcut **Stride Hours**:
1. **Format Date** → **Current Date**, **Custom** `yyyy-MM-dd` → **Set Variable DayKey**.
2. **Number** `24` → **Repeat** that many times. Inside:
   - **Find Health Samples** → **Steps** → **Add Filter Start Date is within the last** *Insert "Repeat Index"* **Hours** (this hour's bucket) → **Calculate Statistics Sum** → collect into a list as you go.
   This one is fiddliest; if you want it, tell me your screen and I'll walk the loop with you. It
   only feeds the rhythm chart — the four pillars don't need it.

---

Stuck on one action? Tell me the step number and what your screen shows.
