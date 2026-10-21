#!/usr/bin/env node
// print-bridge/bridge.mjs — the Mac side of the Wi-Fi label printer.
//
// ⭐ WHY IT EXISTS. Her printer (Gprinter GP-1326D, Wi-Fi) speaks TSPL over raw TCP on port 9100. A web page
// cannot open a raw socket, and an HTTPS page cannot call a plain-HTTP device on the LAN. ⭐ So the phone
// drops a job into Supabase (`print_jobs`) and this script, on the Mac, prints it through the same Wi-Fi.
// ⚠️ It signs in as HER app login. The config lives in the Mac's home folder, never in the repo.
//
// Run:  node print-bridge/bridge.mjs
// Setup: see print-bridge/README.md

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { tsplForBitmap } from "./tspl.mjs";

const CONFIG_PATH = join(homedir(), ".bakeadmin-print.json");
const POLL_MS = 3000;
const MAX_ATTEMPTS = 5;

function say(msg) { process.stdout.write(`${msg}\n`); }

async function askConfig() {
  const rl = createInterface({ input: stdin, output: stdout });
  say("First run — the answers are saved on this Mac only, in " + CONFIG_PATH);
  say("The password is your app login, and it is typed here, not into any chat.");
  const url = (await rl.question("Supabase URL (https://….supabase.co): ")).trim().replace(/\/+$/, "");
  const anonKey = (await rl.question("Supabase anon public key: ")).trim();
  const email = (await rl.question("App login email: ")).trim();
  const password = (await rl.question("App login password: ")).trim();
  const printerHost = (await rl.question("Printer IP (from its Wi-Fi app): ")).trim();
  const portRaw = (await rl.question("Printer port [9100]: ")).trim();
  const gapRaw = (await rl.question("Label gap in mm [2]: ")).trim();
  rl.close();
  const cfg = {
    url,
    anonKey,
    email,
    password,
    printerHost,
    printerPort: Number(portRaw) > 0 ? Number(portRaw) : 9100,
    gapMm: Number(gapRaw) >= 0 ? Number(gapRaw) : 2,
    // ⚠️ The GP-1326D prints a set bit as PAPER (measured: dark background, white letters), so its bits are
    // flipped at print time. A different printer can set this to false in the config file.
    invert: true,
  };
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  chmodSync(CONFIG_PATH, 0o600);
  say("Saved. Keep this Mac on the same Wi-Fi as the printer.");
  return cfg;
}

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    return cfg && cfg.url && cfg.anonKey && cfg.email && cfg.password && cfg.printerHost ? cfg : null;
  } catch { return null; }
}

async function login(cfg) {
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: cfg.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: cfg.email, password: cfg.password }),
  });
  if (!res.ok) throw new Error(`sign-in failed (${res.status}) — check the email and password in ${CONFIG_PATH}`);
  const body = await res.json();
  if (!body || !body.access_token) throw new Error("sign-in returned no token");
  return {
    token: body.access_token,
    expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000 - 60000,
  };
}

function sendToPrinter(cfg, bytes) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: cfg.printerHost, port: cfg.printerPort });
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error("the printer did not answer in 10 seconds"));
    }, 10000);
    sock.on("connect", () => {
      sock.write(bytes, () => {
        clearTimeout(timer);
        sock.end();
        resolve();
      });
    });
    sock.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function rest(cfg, session, path, init = {}) {
  return fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function patchJob(cfg, session, id, fields) {
  await rest(cfg, session, `print_jobs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(fields),
  });
}

async function tidyOldJobs(cfg, session) {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  try {
    await rest(cfg, session, `print_jobs?status=eq.printed&printed_at=lt.${encodeURIComponent(cutoff)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } });
  } catch { /* a tidy that fails is not a print that failed */ }
}

async function pollOnce(cfg, session) {
  const res = await rest(cfg, session,
    "print_jobs?status=eq.new&order=created_at.asc&select=id,attempts,payload&limit=5");
  if (res.status === 401) return { relogin: true };
  if (!res.ok) throw new Error(`the queue could not be read (${res.status})`);
  const jobs = await res.json().catch(() => []);
  for (const job of Array.isArray(jobs) ? jobs : []) {
    try {
      // ⚠️ A config written before this option existed has no `invert`; this printer needs it, so the
      // default here is true rather than undefined.
      const bytes = tsplForBitmap(job.payload, { gapMm: cfg.gapMm, invert: cfg.invert !== false });
      await sendToPrinter(cfg, bytes);
      await patchJob(cfg, session, job.id, { status: "printed", printed_at: new Date().toISOString() });
      say(`printed job ${job.id}`);
    } catch (err) {
      const attempts = Number(job.attempts || 0) + 1;
      const fields = attempts >= MAX_ATTEMPTS ? { status: "failed", attempts } : { attempts };
      try { await patchJob(cfg, session, job.id, fields); } catch { /* retried next poll */ }
      say(`job ${job.id} failed (${attempts}/${MAX_ATTEMPTS}): ${err.message}`);
    }
  }
  return {};
}

async function main() {
  say("Bakeadmin label bridge — Ctrl-C to stop.");
  const cfg = readConfig() || await askConfig();
  let session = null;
  let tidiedAt = 0;
  for (;;) {
    try {
      if (!session || Date.now() >= session.expiresAt) {
        session = await login(cfg);
        say("signed in to the shared queue");
      }
      if (Date.now() - tidiedAt > 3600 * 1000) {
        tidiedAt = Date.now();
        await tidyOldJobs(cfg, session);
      }
      const out = await pollOnce(cfg, session);
      if (out.relogin) session = null;
    } catch (err) {
      say(`waiting: ${err.message}`);
      session = null;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
