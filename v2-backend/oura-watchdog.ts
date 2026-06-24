// ===========================================================================
// Stride V2 — sync watchdog  (DORMANT; deploy alongside oura-sync.ts)
// ---------------------------------------------------------------------------
// A dead-man's-switch. Runs on a Val Town cron (e.g. once a day). If the Oura
// sync hasn't written in ~36h, it emails you ONCE. That's the whole point: you
// never proactively check — the system tells you only on the rare break, and
// re-fixing is a 30-second re-auth in Nango.
//
// Reads /v2/oura_synced_at (public read is fine — it's just a timestamp).
// Uses Val Town's built-in email() to notify the account owner. No secrets needed
// beyond FIREBASE_DB_URL.
//
// ponytail: one read + one conditional email. Stale threshold is the only knob.
// ===========================================================================

const STALE_MS = 36 * 60 * 60 * 1000; // 36h: covers a normal daily cadence with slack

const dbUrl = (globalThis as any).Deno?.env.get("FIREBASE_DB_URL");

export default async function watchdog() {
  if (!dbUrl) throw new Error("Missing env: FIREBASE_DB_URL");
  const base = dbUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/v2/oura_synced_at.json`);
  const last = res.ok ? Number(await res.json()) : 0;
  const age = Date.now() - (last || 0);

  if (!last || age > STALE_MS) {
    const hrs = last ? Math.round(age / 3600000) : "∞";
    // Val Town: `import { email } from "https://esm.town/v/std/email"` then email({...}).
    // Left as a console line here so the file is host-agnostic; wire the std/email
    // import when you paste this into Val Town (one line — see runbook).
    console.log(`WATCHDOG: Oura sync stale (${hrs}h). Re-auth Oura in Nango.`);
    // await email({ subject: "Stride: Oura sync stopped", text: `No data for ~${hrs}h. Re-auth Oura in Nango.` });
    return { ok: false, ageHours: hrs };
  }
  return { ok: true };
}
