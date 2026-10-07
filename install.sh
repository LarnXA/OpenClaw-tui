#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
echo 'Installing opc-tui ...'
command -v node >/dev/null 2>&1 || { echo '[ERROR] Node.js not found'; exit 1; }
npm install -g .
echo 'Done! Run: opc-tui'
command -v opc-tui