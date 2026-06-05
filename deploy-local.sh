#!/usr/bin/env bash
# Sync the fork's runtime files to the Foundry data dir so Foundry sees them.
# Does NOT build — run `npm run buildCompendiums && npm run build` first if you changed source.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${FOUNDRY_HOST_DATA_DIR:-/home/workstation/Servers/Foundary-VTT/data/Data}/modules/chris-premades"

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

# Guard: if Foundry's packs are newer than the repo's, edits made live in the
# UI may not have been pulled back yet — and this script rm -rf's the install.
# Abort so they aren't destroyed, unless --force is passed. This deploy copies
# with -p (preserve mtimes), so right after a deploy install == repo; a newer
# install mtime then means Foundry wrote to the LevelDB since. Use cpr-items as
# the bellwether pack (the one most often edited).
ref_install="$DEST/packs/cpr-items"
ref_repo="$SRC/packs/cpr-items"
if [[ "$FORCE" != "1" && -d "$ref_install" && -d "$ref_repo" ]]; then
    newest_install="$(find "$ref_install" -name '*.ldb' -printf '%T@\n' 2>/dev/null | sort -nr | head -1)"
    newest_repo="$(find "$ref_repo" -name '*.ldb' -printf '%T@\n' 2>/dev/null | sort -nr | head -1)"
    if [[ -n "$newest_install" && -n "$newest_repo" ]] && \
       awk "BEGIN{exit !($newest_install > $newest_repo)}"; then
        echo "error: Foundry's packs are newer than the repo's — you may have unextracted UI edits." >&2
        echo "       run ./sync-from-foundry.sh first to capture them, or pass --force to overwrite." >&2
        exit 1
    fi
fi

rm -rf "$DEST" && mkdir -p "$DEST"
cp -rp "$SRC"/{module.json,dist,packs,styles,templates,lang,images,LICENSE,CHANGELOG.md} "$DEST/"
echo "deployed $SRC → $DEST"
