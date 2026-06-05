#!/usr/bin/env bash
# Reverse of deploy-local.sh: pull live item edits made in Foundry's UI back
# into the repo. Copies the install's LevelDB packs into the repo, then runs
# the existing `extractCompendiums` to regenerate clean packData/*.json.
#
# Usage:
#   ./sync-from-foundry.sh                 # mirror & re-extract all packs
#   ./sync-from-foundry.sh cpr-items       # copy just one pack, then re-extract
#   ./sync-from-foundry.sh --docker [pack] # run the extract step in Docker
#
# IMPORTANT: save and close the world (or quit Foundry) before running, so the
# LevelDB is flushed to disk — an open world may have edits sitting in the .log
# that haven't been compacted yet.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${FOUNDRY_HOST_DATA_DIR:-/home/workstation/Servers/Foundary-VTT/data/Data}/modules/chris-premades"

USE_DOCKER=0
if [[ "${1:-}" == "--docker" ]]; then USE_DOCKER=1; shift; fi
ONLY_PACK="${1:-}"

if [[ ! -d "$DEST/packs" ]]; then
    echo "error: $DEST/packs does not exist — module not deployed to Foundry yet." >&2
    echo "       run ./deploy-local.sh first, or set FOUNDRY_HOST_DATA_DIR." >&2
    exit 1
fi

echo "⚠  make sure Foundry is closed (or the world saved & exited) so packs are flushed."

# 1. Copy install packs → repo packs (packs/ only — never module.json/dist/scripts).
if [[ -n "$ONLY_PACK" ]]; then
    if [[ ! -d "$DEST/packs/$ONLY_PACK" ]]; then
        echo "error: pack '$ONLY_PACK' not found in $DEST/packs" >&2
        exit 1
    fi
    rm -rf "$SRC/packs/$ONLY_PACK"
    cp -r "$DEST/packs/$ONLY_PACK" "$SRC/packs/"
    echo "copied pack $ONLY_PACK  $DEST → $SRC/packs/"
else
    cp -r "$DEST/packs/." "$SRC/packs/"
    echo "copied all packs  $DEST/packs → $SRC/packs/"
fi

# 2. Extract LevelDB → clean JSON via the existing npm script (unpackData.mjs
#    strips _stats/sort/ownership/sourceId for reviewable diffs). It always
#    processes its full pack list; only the copied pack's JSON actually changes.
if [[ "$USE_DOCKER" == "1" ]]; then
    docker run --rm -v "$SRC":/work -w /work node:20 \
        bash -c "npm ci && npm run extractCompendiums"
elif [[ -d "$SRC/node_modules/@foundryvtt/foundryvtt-cli" ]]; then
    ( cd "$SRC" && npm run extractCompendiums )
else
    echo "node_modules missing — running extract in Docker (node:20)…"
    docker run --rm -v "$SRC":/work -w /work node:20 \
        bash -c "npm ci && npm run extractCompendiums"
fi

echo "pulled $DEST → $SRC"
echo "review with: git -C \"$SRC\" diff packData/"
