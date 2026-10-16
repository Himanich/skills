#!/usr/bin/env bash
# cdp-ext-pilot launches a headed Chrome. Plant a "Chrome for Testing" shim in a private $HOME
# that starts Chromium headless. The private $HOME has no keychain, so --use-mock-keychain keeps
# macOS from showing a "Keychain Not Found" dialog.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
dir="$root/workspace/cdp-ext-pilot-home/.cache/cdp-ext-pilot/chrome-for-testing/shim/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS"
mkdir -p "$dir"
printf '#!/bin/sh\nexec /Applications/Chromium.app/Contents/MacOS/Chromium --headless=new --use-mock-keychain --password-store=basic "$@"\n' >"$dir/Google Chrome for Testing"
chmod +x "$dir/Google Chrome for Testing"
