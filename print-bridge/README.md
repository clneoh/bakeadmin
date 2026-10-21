# The label print bridge (Mac)

Your printer is a **Gprinter GP-1326D** on Wi-Fi. It speaks **TSPL** over a raw TCP connection (port 9100), and
it has **no IPP/AirPrint and no web page** — which is why Android, iOS and Chrome cannot see it. This bridge is
the small piece on your Mac that can reach it. The phone sends the label through your Supabase, and this
script prints it.

⭐ **It does not use the Mac's printer settings or a macOS driver.** Nothing needs to be "added" in System
Settings → Printers. It connects to the printer's IP directly.

## One-time setup

1. **Run the table once.** In Supabase → SQL Editor, open `supabase/print_jobs.sql`, paste the whole file, Run.
   You should see a row with `table_exists = 1` and `policy_count = 4`.
2. **Check Node.** In Terminal on the Mac: `node -v` — any version 18 or newer is fine.
3. **Start the bridge.** In Terminal:
   ```
   cd ~/Downloads/bakeadmin
   node print-bridge/bridge.mjs
   ```
   The first run asks for:
   - **Supabase URL** — `https://hzpyblqygnntixkijeem.supabase.co`
   - **Anon public key** — the same one the app uses (Settings in the backoffice, or the Supabase dashboard)
   - **App login email** and **password** — your own login; typed here, never into a chat
   - **Printer IP** — the address the printer's Wi-Fi app showed you (for example `192.168.1.50`)
   - **Port** — press Enter for `9100`
   - **Label gap** — press Enter for `2` mm (use `0` for continuous stock)

   The answers are saved in `~/.bakeadmin-print.json`, readable only by you. They are never in this repo.

4. **Leave it running.** It prints `signed in to the shared queue` and then waits. Every label sent from the
   app prints within about three seconds.

## Printing

In the backoffice: an order at **Baked** or later → **Print label** → choose the style → **Print over Wi-Fi**.
The phone can be on mobile data or any Wi-Fi; only the Mac needs to be on the printer's network.

The same press works on **Android and iPhone** — nothing different to set up on either.

## If it does not print

- **"waiting: sign-in failed"** — the email or password in `~/.bakeadmin-print.json` is wrong. Delete that file
  and run the script again.
- **"job failed … the printer did not answer"** — the printer is off, asleep, or on a different network; check
  the IP in its Wi-Fi app. The job is retried up to five times.
- **Nothing happens at all** — is the script still running in Terminal? A closed Terminal window stops it.
- **The print is shifted or split** — adjust the **gap** (2 mm for die-cut labels; 0 for continuous) or the
  label size in the printer's own settings. The bridge sends 100 × 150 mm.

## Stopping it

Press **Ctrl-C** in its Terminal window. To start it again, repeat step 3 (the answers are remembered).

Keep the Mac awake while you expect labels: System Settings → Lock Screen → "Prevent automatic sleeping when
the display is off" (or simply leave a Terminal window active).
