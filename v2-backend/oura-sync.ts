// ===========================================================================
// Stride V2 — Oura background sync  (DORMANT until the ring arrives; see docs/VERSIONS.md)
// ---------------------------------------------------------------------------
// Runs on a free Val Town cron (every ~2h). Pulls recovery signals from Oura via
// Nango (which holds + auto-rotates the OAuth token), and writes anonymous numbers
// to Firebase under /v2/oura/<date>. The iPad page reads them. No phone involved.
//
// Why this shape (recap from docs/v2-oura-backend.md):
//  - Nango owns Oura's single-use ROTATING refresh token, so we never refresh by hand.
//  - Firebase writes are authed with a service-account token (most secure; scoped to the
//    DB), NOT the legacy all-powerful DB secret. Rules lock /v2/** writes to auth only.
//  - We request only sleep/HRV/resting-HR — no name, no email. Anonymous by construction.
//
// SECRETS (set in Val Town → Environment Variables; NEVER commit these):
//   NANGO_SECRET_KEY        Nango account secret key
//   NANGO_CONNECTION_ID     the Oura connection id created in Nango
//   NANGO_PROVIDER_KEY      the Nango integration unique key (e.g. "oura")
//   FIREBASE_DB_URL         https://stride-dash-c3e2a-default-rtdb.europe-west1.firebasedatabase.app
//   FIREBASE_SA             the service-account JSON (whole file, as one string)
//
// ponytail: dependency-free (Web Crypto for the RS256 JWT). Verify the Nango proxy
// header names + Oura field names once at setup — flagged inline. Not runnable here
// (needs the live ring + accounts); the go-time runbook includes the one manual test.
// ===========================================================================

const env = (k: string): string => {
  const v = (globalThis as any).Deno?.env.get(k) ?? (globalThis as any).process?.env?.[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

// ---- base64url helpers ----------------------------------------------------
const b64url = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// ---- Firebase service-account → short-lived OAuth2 access token -----------
// Standard Google JWT-bearer flow. The SA is scoped to the Realtime Database only.
async function firebaseToken(): Promise<string> {
  const sa = JSON.parse(env("FIREBASE_SA")) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const signingInput = `${header}.${claim}`;

  // import the PKCS8 private key from the PEM in the SA file
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Firebase token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token as string;
}

// ---- Oura via Nango proxy -------------------------------------------------
// Nango injects the managed (auto-rotated) Oura token and forwards to api.ouraring.com.
// Verify these header names against current Nango proxy docs at setup.
async function ouraGet(path: string): Promise<any> {
  const res = await fetch(`https://api.nango.dev/proxy${path}`, {
    headers: {
      "Authorization": `Bearer ${env("NANGO_SECRET_KEY")}`,
      "Connection-Id": env("NANGO_CONNECTION_ID"),
      "Provider-Config-Key": env("NANGO_PROVIDER_KEY"),
    },
  });
  if (!res.ok) throw new Error(`Oura/Nango ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const ymd = (d: Date): string => d.toISOString().slice(0, 10);

// ---- main -----------------------------------------------------------------
export default async function main() {
  // last 2 days covers "last night" regardless of when this fires
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - 2);
  const range = `?start_date=${ymd(start)}&end_date=${ymd(today)}`;

  // detailed sleep carries the recovery signals we actually want
  const sleep = await ouraGet(`/v2/usercollection/sleep${range}`);

  // collapse each night to anonymous numbers. Oura field names — verify at setup:
  //   total_sleep_duration (sec), average_hrv (ms), lowest_heart_rate (resting bpm)
  const byDay: Record<string, { sleep_h: number; hrv: number; resting_hr: number }> = {};
  for (const s of (sleep.data ?? [])) {
    const day = s.day as string;
    byDay[day] = {
      sleep_h: Math.round(((s.total_sleep_duration ?? 0) / 3600) * 10) / 10,
      hrv: Math.round(s.average_hrv ?? 0),
      resting_hr: Math.round(s.lowest_heart_rate ?? 0),
    };
  }
  if (Object.keys(byDay).length === 0) { console.log("no sleep data yet"); return; }

  // write to Firebase /v2/oura, authed by the service account
  const token = await firebaseToken();
  const base = env("FIREBASE_DB_URL").replace(/\/+$/, "");
  const res = await fetch(`${base}/v2/oura.json?access_token=${token}`, {
    method: "PATCH", // merge — leaves other days intact
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(byDay),
  });
  if (!res.ok) throw new Error(`Firebase write failed: ${res.status} ${await res.text()}`);

  // heartbeat so the watchdog knows we ran (see runbook)
  await fetch(`${base}/v2/oura_synced_at.json?access_token=${token}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Date.now()),
  });
  console.log(`synced ${Object.keys(byDay).length} day(s): ${Object.keys(byDay).join(", ")}`);
}
