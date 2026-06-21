# Oura insights → Stride (research-backed, honest)

Concise readout from researching Oura's app, with what we borrowed, what to consider, and
what to refuse. Sources verified 2025/2026.

## The surprise finding
Oura is **less gamified than its reputation** — no badges, XP, levels, leaderboards, or a
named streak. Its pull is **restraint**: a calm number + a plain word-state, an adaptive
goal, and a gentle voice. Restraint is the lesson, not mechanics.

## Already in Stride (aligned)
- **Rest-aware streaks** (Oura's "Meet Daily Goals" is a rolling window that doesn't reset
  on a miss; it rewards rest).
- **Transparent, behaviour-based gauge** (we show the gym/walk/step weights — not an
  opaque wellness score).
- **24 achievements** across all metrics + a **rank** ladder (word-state, not a number).

## Shipped as "easy wins" this pass
- **Tunable voice** (Full / Subtle / Off) — Oura's selectable tone, in Settings.
- **Daily crown** when the step goal is met — Oura's per-day reward at a genuine threshold.
- Warmer, varied status copy.

## The honest line — REFUSE these (Oura's traps)
- **No composite "readiness/recovery/sleep-quality" score.** It causes "orthosomnia"
  (score anxiety; Oura itself documents users cancelling plans over a bad score). Half of
  Readiness needs sensors we don't have (HRV, temp, resting HR).
- **No sleep stages** (REM/deep). We have an estimated *window*, not stages.
- **Nothing sensor-derived** we can't actually measure. Label sleep "estimated" always.

## Optionality — what else we could add (pick any)
| Idea | Value | Effort | Notes |
|---|---|---|---|
| **Adaptive rest-aware goal** | High | Med | Oura's single best mechanic: ease the day's step target after a short-sleep night or several heavy days, so resting still "succeeds". Honest version uses our real signals. |
| **Sleep-timing identity / chronotype** ("Early riser / Night owl") | Med | Med | Needs the Shortcut to also capture **bedtime + wake** (charging-start + first-unlock). |
| **Bedtime-regularity sleep achievements** | Med | Small* | *Once bedtime is captured. Oura's best sleep wins are about consistency, not duration. |
| **Weekly/monthly recap as a notification** | Med | Small | Sunday digest via a Shortcut (we already compute the recap on-screen). |
| **"Normal for you" baselines** in insights | Low–Med | Small | Frame numbers vs personal baseline, not absolute. |
| **Weather-aware achievements** ("rainy-day walk") | Low–Med | Med | Needs a weather API + key. |
| **Cosmetic unlocks** (backgrounds/themes by rank) | Med | Med | Held by your call. |

## Voice / characterization recommendation
Adopt a **supportive, tunable voice** (done) — Oura proves warmth works with **no mascot**.
Keep the **rank ladder** (behaviour-grounded word-state). **Never** a fake composite score.
Refuse to characterize (e.g. assign a chronotype) until there's a ~30-day baseline.
