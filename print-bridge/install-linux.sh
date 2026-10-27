#!/bin/sh
# print-bridge/install-linux.sh — run the label bridge in the background on a Linux server (Ubuntu / Debian).
#
# ⭐ The Mac's installer uses launchd; Linux uses systemd. Same program, same config file
# (~/.bakeadmin-print.json) — ⚠️ a bridge that only knows how to start on one operating system is a bridge that
# stops when she moves it.
#
# Usage:  sh print-bridge/install-linux.sh
# ⚠️ Run it as the USER WHO HAS THE CONFIG, not with sudo — the service then runs as that user and can read its
# own ~/.bakeadmin-print.json. (sudo is used internally only for the one step that needs it.)

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$DIR/print-bridge/bridge.mjs"
NODE="$(command -v node || true)"
UNIT="bakeadmin-print.service"

if [ -z "$NODE" ]; then
  echo "Node is not installed (or not on PATH). Install Node 18 or newer, then run this again."
  exit 1
fi
if [ ! -f "$HOME/.bakeadmin-print.json" ]; then
  echo "No config at $HOME/.bakeadmin-print.json — write it first (see print-bridge/README.md,"
  echo "\"Running it on a server\"). The bridge cannot start without the shared queue's address and login."
  exit 1
fi

echo "Installing $UNIT so the bridge starts at boot and restarts if it stops…"
sudo tee "/etc/systemd/system/$UNIT" >/dev/null <<UNITFILE
[Unit]
Description=Bakeadmin print bridge for GP1326D Gprinter
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
Environment=BRIDGE_NO_PROMPT=1
WorkingDirectory=$DIR
ExecStart=$NODE $SCRIPT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNITFILE

sudo systemctl daemon-reload
sudo systemctl enable --now "$UNIT"
echo "Started. Check it with:  systemctl status $UNIT   ·   journalctl -u $UNIT -f"
