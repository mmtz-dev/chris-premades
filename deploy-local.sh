#!/usr/bin/env bash
# Sync the fork's runtime files to the Foundry data dir so Foundry sees them.
# Does NOT build — run `npm run buildCompendiums && npm run build` first if you changed source.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${FOUNDRY_HOST_DATA_DIR:-/home/workstation/Servers/Foundary-VTT/data/Data}/modules/chris-premades"
rm -rf "$DEST" && mkdir -p "$DEST"
cp -r "$SRC"/{module.json,dist,packs,styles,templates,lang,images,LICENSE,CHANGELOG.md} "$DEST/"
echo "deployed $SRC → $DEST"
