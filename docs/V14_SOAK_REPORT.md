# Chris's Premades V14 Soak Report

Methodology and results for the V14 compatibility port shipped in **release 1.6.0**.

The goal is to verify that every `flags.dae.specialDuration` value CPR emits — across all 191 effect documents in `packData/` — continues to fire correctly under DAE v14 + Midi-QOL v14, now that Times-Up is no longer in `relationships.requires`.

---

## Module stack under test

| Module | Required version | Tested version |
|---|---|---|
| Foundry VTT | ≥ 14 (verified 14.363) | _fill in_ |
| dnd5e | ≥ 5.3.99, verified 5.4, max 5.4.99 | _fill in_ |
| DAE | ≥ 14.0.10 | _fill in_ |
| Midi-QOL | ≥ 14.0.7 | _fill in_ |
| socketlib | ≥ 1.1.2 | _fill in_ |
| chris-premades | 1.6.0 (this branch) | local build |

---

## Test world setup (one-time)

1. In a Foundry V14 install, create a new world: **`cpr-v14-soak`** with system `dnd5e`.
2. From the Foundry Setup screen, install the modules above (use the manifest URLs, since the dev branches are not yet on the public package registry).
3. Enable all five modules in the world.
4. Boot the world; open the CPR Troubleshooter UI (Settings → Game Settings → Chris's Premades → Troubleshooter). Confirm:
   - No errors in the browser console.
   - No "missing required module" entries listing `times-up`.
5. Create a fresh PC character (level 20, all classes) and a hostile NPC; drop both into a combat encounter on a blank scene. This is your test bench for the matrix below.

---

## Vocabulary test matrix (191 docs across 36 values)

### Tier A — DAE auto-migration (~117 docs)

DAE 14.0.7 silently rewrites these `flags.dae.specialDuration` values into native `duration.expiry` at create-time. Pass = legacy value disappears from `flags.dae.specialDuration` and a `duration.expiry` field appears.

| specialDuration | Approx count | Migrates to | Sample item | Pass / Fail |
|---|---|---|---|---|
| `turnStartSource` | 44 | `duration.expiry: "turnStart:source"` | _fill in_ | _ |
| `turnEndSource` | 30 | `duration.expiry: "turnEnd:source"` | _fill in_ | _ |
| `turnEnd` | 29 | `duration.expiry: "turnEnd"` | _fill in_ | _ |
| `turnStart` | 14 | `duration.expiry: "turnStart"` | _fill in_ | _ |
| `combatEnd` | n | `duration.expiry: "combatEnd"` | _fill in_ | _ |

**Sampling guidance:** pick one effect document per row from the relevant `packData/` directory. Apply to the PC, end the relevant turn / leave combat, and confirm expiry happens at the right tick. Then open the Active Effect editor and confirm the legacy flag is gone and the native field is present.

### Tier B — dnd5e core hooks (~9 values)

These map to dnd5e-emitted hooks; no DAE or Midi-QOL mediation needed.

| specialDuration | Trigger | Sample item | Pass / Fail |
|---|---|---|---|
| `longRest` | Take a long rest | _fill in_ | _ |
| `shortRest` | Take a short rest | _fill in_ | _ |
| `isSave` | Make any saving throw | _fill in_ | _ |
| `isSkill` (+ `.itm`/`.per`/`.ste`) | Make a matching skill check | _fill in_ | _ |
| `incapacitated` | Apply incapacitated status | _fill in_ | _ |
| `zeroHP` | Reduce actor to 0 HP | _fill in_ | _ |
| `zeroSpeed` | Apply Grease or similar | _fill in_ | _ |
| `heavy` | Push above encumbrance threshold | _fill in_ | _ |
| `dead` / `unconscious` | Apply matching status | _fill in_ | _ |
| `poisonedRemoved` | Apply then remove poisoned | _fill in_ | _ |

### Tier C — Midi-QOL workflow events (~17 values, highest risk)

These depend on Midi-QOL v14 carrying forward the V13 workflow special-duration handling. Any failure here is filed as an upstream Midi-QOL issue (not a CPR issue).

| specialDuration | Trigger | Sample item | Pass / Fail |
|---|---|---|---|
| `isDamaged` | Take damage | _fill in_ | _ |
| `damagedByEnemy` | Take damage from hostile | _fill in_ | _ |
| `damagedByAlly` | Take damage from ally | _fill in_ | _ |
| `isAttacked` | Be attacked (hit or miss) | _fill in_ | _ |
| `attackedBySource` | Be attacked by source actor | _fill in_ | _ |
| `1Attack` | Make one attack action | _fill in_ | _ |
| `1Attack:mwak` | One melee weapon attack | _fill in_ | _ |
| `1Attack:rwak` | One ranged weapon attack | _fill in_ | _ |
| `1Hit` | One successful hit | _fill in_ | _ |
| `1Hit:mwak` | One successful melee hit | _fill in_ | _ |
| `1Reaction` | Use one reaction | _fill in_ | _ |
| `1Spell` | Cast one spell | _fill in_ | _ |
| `1Action` | Take one action | _fill in_ | _ |
| `isMoved` | Move the token | _fill in_ | _ |
| `moveFinished` | Token finishes moving | _fill in_ | _ |
| `endOfWorkflow` | Complete a Midi workflow | _fill in_ | _ |
| `DamageDealt` | Deal damage to a target | _fill in_ | _ |
| `forceSave` | Force a save | _fill in_ | _ |

---

## Test from the user's Mac (per CLAUDE.md global note)

1. Drop the locally-built `chris-premades-1.6.0` artifact into the Foundry data dir at `<FoundryData>/Data/modules/chris-premades/` (replace any existing CPR install).
2. Restart the foundry container.
3. From the Mac browser, open the Foundry LAN URL and launch the `cpr-v14-soak` world.
4. Walk the three tiers above. Record pass/fail per row, and note the specific effect-document path used for the sample (e.g. `packData/cpr-class-features/Rage_xxxx.json`).

---

## Result summary

_Filled in after soak completes:_

- **Tier A (DAE auto-migration):** _N/N values pass_
- **Tier B (dnd5e core):** _N/N values pass_
- **Tier C (Midi-QOL workflow):** _N/N values pass_

**Issues filed upstream:** _list of GitHub issue links on `foundryvtt/dnd5e` or `tposney/midi-qol` for any failures in Tier B / Tier C, since those are not CPR's responsibility to fix._

---

## Reproducing this soak on future CPR releases

The methodology that generated the 191-document, 36-value vocabulary can be re-run:

```bash
python3 - <<'PY'
import json, glob, collections
vals = collections.Counter()
docs = 0
for p in glob.glob('packData/**/*.json', recursive=True):
    try: data = json.load(open(p))
    except Exception: continue
    found = False
    def walk(o):
        global found
        if isinstance(o, dict):
            for k, v in o.items():
                if k == 'specialDuration' and isinstance(v, list) and v:
                    for item in v:
                        vals[item] += 1
                    found = True
                walk(v)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(data)
    if found: docs += 1
print(f'Documents: {docs}')
for v, c in vals.most_common(): print(f'  {v}: {c}')
PY
```

If the document or vocabulary counts shift, refresh this report's tables before re-running the soak.
