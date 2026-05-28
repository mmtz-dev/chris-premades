# Local deploy — fork → Foundry data dir

This fork lives at `~/Repos/Foundy-mods/plentiful-resources/` (the **source**). Foundry reads modules from `<FoundryData>/Data/modules/chris-premades/` (the **install**). They are two distinct directories on disk; edits to the source do not appear in Foundry until the install is refreshed.

`deploy-local.sh` does that refresh: it copies the runtime files from the fork into the install, blowing away the old install first so removed files don't linger.

## Usage

```bash
~/Repos/Foundy-mods/plentiful-resources/deploy-local.sh
```

That's it. The script resolves its own location, picks up `FOUNDRY_HOST_DATA_DIR` from the environment (default `/home/workstation/Servers/Foundary-VTT/data/Data`), and copies:

- `module.json`
- `dist/`
- `packs/`
- `styles/`, `templates/`, `lang/`, `images/`
- `LICENSE`, `CHANGELOG.md`

After it runs, reload Foundry in the browser (or back out of and re-enter Manage Modules) and the new files are live.

## When to run it

| You changed… | Run `npm run buildCompendiums` first? | Run `npm run build` first? | Then `./deploy-local.sh`? |
|---|---|---|---|
| `module-template.json` (manifest) | no | no | yes — also regenerate `module.json` first (see below) |
| `packData/**/*.json` (compendium content) | **yes** | no | yes |
| `scripts/**/*.js` (CPR runtime code) | no | **yes** | yes |
| `styles/`, `templates/`, `lang/`, `images/` | no | no | yes |

The script intentionally does not rebuild — it's a deploy step, not a build step. Build via Docker per the project's host conventions:

```bash
cd ~/Repos/Foundy-mods/plentiful-resources
docker run --rm -v "$PWD":/work -w /work node:20 bash -c "npm ci && npm run buildCompendiums && npm run build"
```

## Regenerating `module.json` from the template

When `module-template.json` changes (e.g. version bump, dependency tweak), `module.json` is what gets deployed but is generated from the template. One-liner:

```bash
cd ~/Repos/Foundy-mods/plentiful-resources && python3 -c "
import json
m = json.load(open('module-template.json'))
m['version'] = '1.6.0'
m['download'] = 'http://192.168.1.158:8090/chris-premades-1.6.0.zip'
m['manifest'] = 'http://192.168.1.158:8090/chris-premades.module.json'
json.dump(m, open('module.json', 'w'), indent=2)
open('module.json', 'a').write('\n')
"
```

Then run `./deploy-local.sh`.

## Why this script exists

The fork is a git repo on the `v14` branch with full source (scripts/, packData/, .git/, node_modules/). The install is a flat directory Foundry reads at runtime, containing only the compiled `dist/` + LevelDB `packs/` + static assets. Treating them as one place breaks: source files would leak into Foundry's module listing, and symlinking has caching quirks. Keeping them separate and syncing via this script is the cleanest pattern for a fork you're actively editing while testing in Foundry.

## Cleanup

Both `deploy-local.sh` and this doc are Fedora-host-specific dev tooling. If you ever push the `v14` branch upstream as a PR, exclude them from the commit:

```bash
git -C ~/Repos/Foundy-mods/plentiful-resources update-index --skip-worktree deploy-local.sh docs/DEPLOY_LOCAL.md
```

Or simply don't `git add` them.
