# Chris's Premades → Foundry V14 — Research Roadmap

**Last researched:** 2026-05-28
**CPR version surveyed:** 1.5.34 (released 2026-05-26, master @ `e403f720`)
**Status:** CPR has **no public V14 branch**. Its core dependencies (DAE, Midi-QOL, and Times-Up itself) **do** have active V14 branches.

This document is a research-only artifact for executing `docs/TODO.md` items **Chris-1**, **Chris-2**, **Chris-3**. It does *not* fork CPR. It captures the punch-list any maintainer (upstream or local) would need to drive CPR from V13-only to V14-clean.

---

## TL;DR — what we learned that changes the V13/V14 story

When this doc's TODO items were filed, the working assumption was: *"Times-Up is dead, CPR depends on it, therefore CPR is stuck."* That framing is **out of date**. Three corrections:

1. **Times-Up was absorbed, not abandoned.** DAE v14 explicitly took over Times-Up's job: *"all time/turn start/end expiry is handled by core foundry and not dae. Dae enhances core foundry to allow you to modify which combatants turn is recorded for turn start/end effect expiry."* (DAE v14.0.6 changelog.) The deprecated Times-Up vocabulary (`turnStart`, `turnEnd`, `turnStartSource`, `turnEndSource`, `combatEnd`) **auto-migrates** to native `duration.expiry` on effect creation under DAE v14.0.7.
2. **CPR's Times-Up coupling is tiny.** Only **3 source files** in CPR reference the `times-up` identifier at all — the two manifest templates and one cosmetic UI dictionary entry. CPR's effects do not call Times-Up; they emit `flags.dae.specialDuration` flag arrays on Active Effects, which is a **DAE-namespace** flag that Times-Up *reads* at runtime. On V14, DAE itself reads it.
3. **CPR is structurally V14-ready in its UI/runtime code.** Every CPR application class (Medkit, RollResolver, EmbeddedMacros, QuickConditions, etc.) already extends `HandlebarsApplicationMixin(ApplicationV2)`. Every dnd5e hook CPR listens to uses the V-suffixed V2 signature (`dnd5e.preRollAbilityCheckV`, `dnd5e.preRollSavingThrowV`, `dnd5e.preRollSkillV`, `dnd5e.rollToolCheckV`).

Net effect: a CPR V14 port is mostly a manifest bump + dep-version rechain + retest cycle of its 1,186 macro files — not the large rewrite the TODO note implied.

---

## Status snapshot (Feature 1 — answers Chris-1)

| Upstream | Default branch | V14 branch | V14 latest | Verdict |
|---|---|---|---|---|
| **Chris's Premades** | `master` (V13 only, last commit 2026-05-28 `e403f720`) | **none** | — | No public V14 work. Release notes say "in progress" but no branch is visible. |
| **DAE** | `v13` | `v14` (active, last commit 2026-05-28) | **14.0.10** | V14-ready and **already absorbed Times-Up's surface**. |
| **Midi-QOL** | `master` | `v14` (active, last commit 2026-05-10) | **14.0.7** | V14-compatible since 14.0.1: *"Tested with dnd5e 5.3 prerelease."* Migrated templates → regions. |
| **Times-Up** | `master` (V13: 13.1.9) | `v14` exists (last commit 2026-03-14) | manifest 404 | V14 branch is a placeholder; functionality moved into DAE v14 instead. |

CPR has 5 visible open issues on GitHub, none labelled V14. Discord may have more — not surveyed.

**Most-needed automations for this project:** Eldritch Invocation Enchantments (Agonizing Blast, Lifedrinker, Repelling Blast). None ship in CPR's master today as standalone items — they're embedded in CPR's Warlock class-feature pack. Repelling Blast is already available natively in PHB 2024 as an Enchantment, which is the template Feature 5 recommends we follow for the other two.

---

## CPR's actual Times-Up surface (Feature 3 — answers Chris-2)

**Methodology used.** Clone `chrisk123999/chris-premades` @ master to `/tmp/cpr-v14-research/`, then grep for four call-site categories: (a) ES-module imports of `times-up`, (b) `Hooks.on/once/call` listeners on `times-up.*` or `midi-qol.timesUp*` events, (c) `game.modules.get("times-up")` API access, (d) flag reads/writes of `flags.times-up.*` or `flags.dae.specialDuration`. To re-run: see [Methodology](#methodology-how-to-keep-this-doc-current).

### Result — categories (a), (b), (c): zero hits

CPR does not import from Times-Up, does not register hooks under `times-up.*`, and does not read `game.modules.get("times-up")` anywhere. The single `times-up` mention in `scripts/applications/troubleshooter.js:28` is a display-name dictionary entry (`'times-up': 'Times Up'`), used by CPR's diagnostic UI to print "Times Up" instead of the raw module ID — purely cosmetic.

### Result — category (d): `flags.dae.specialDuration` is the entire coupling

The actual Times-Up surface CPR depends on is **the `flags.dae.specialDuration` array on Active Effects**. CPR sets this in two places:

- **JSON pack data** — 154 effect documents under `packData/` carry non-empty `specialDuration` arrays.
- **JS macros** — ~70 macros under `scripts/macros/` set `effectData.flags.dae.specialDuration` at runtime (e.g. `scripts/macros/2024/classFeatures/barbarian/rage.js`).

This is a **DAE-namespace** flag. Times-Up was the V13 consumer. **DAE v14 is the V14 consumer** — Times-Up's role has been absorbed.

### The vocabulary — every `specialDuration` value CPR emits

Across all 154 JSON effects, CPR uses **36 unique specialDuration values**:

| Value | Count | What it means | V14 replacement | Source |
|---|---|---|---|---|
| `turnStartSource` | 44 | Expire at source actor's turn start | **DAE v14 native, auto-migrated to `duration.expiry: "turnStart:source"`** | DAE 14.0.7 changelog |
| `turnEndSource` | 30 | Expire at source actor's turn end | **DAE v14 native, auto-migrated to `duration.expiry: "turnEnd:source"`** | DAE 14.0.7 changelog |
| `turnEnd` | 29 | Expire at affected actor's turn end | **DAE v14 native, auto-migrated to `duration.expiry: "turnEnd"`** | DAE 14.0.7 changelog |
| `turnStart` | 14 | Expire at affected actor's turn start | **DAE v14 native, auto-migrated to `duration.expiry: "turnStart"`** | DAE 14.0.7 changelog |
| `isDamaged` | 14 | Expire when actor takes damage | **Midi-QOL workflow hook** — needs verification on v14 branch | Midi-QOL `preTargetDamageApplication` / workflow events |
| `1Attack` | 12 | Expire after one attack action | **Midi-QOL workflow** — verify v14 carries this | Midi-QOL workflow special-duration handling |
| `longRest` | 9 | Expire on long rest | **dnd5e native** — `Hooks.on("dnd5e.restCompleted", …)` filtered to `restType === "long"` | dnd5e core |
| `incapacitated` | 7 | Expire when incapacitated | **dnd5e core** — status-change hook | dnd5e core |
| `isAttacked` | 6 | Expire when attacked | **Midi-QOL workflow** | Midi-QOL |
| `isSave` | 5 | Expire when actor rolls a save | **dnd5e native** — `dnd5e.rollSavingThrow` post-hook | dnd5e core |
| `1Hit:mwak` | 5 | Expire after one melee weapon hit | **Midi-QOL workflow** | Midi-QOL |
| `zeroHP` | 5 | Expire at 0 HP | **dnd5e native** — actor HP-change hook | dnd5e core |
| `1Reaction` | 4 | Expire after one reaction | **Midi-QOL workflow** | Midi-QOL |
| `1Spell` | 3 | Expire after one spell cast | **Midi-QOL workflow** | Midi-QOL |
| `isSkill` (+ `.itm`, `.per`, `.ste`) | 3 + 3 | Expire when skill check made | **dnd5e native** — `dnd5e.rollSkill` | dnd5e core |
| `isMoved` | 3 | Expire on token move | **Midi-QOL** — `isMoved` re-implemented per v14 13.0.55 *"`isMoved` specialDuration now fires correctly"* via `TokenDocument.move()` | Midi-QOL v14 |
| `endOfWorkflow` | 2 | Expire when Midi workflow ends | **Midi-QOL workflow** | Midi-QOL |
| `damagedByEnemy` | 2 | Expire when damaged by enemy | **Midi-QOL workflow** | Midi-QOL |
| `poisonedRemoved` | 2 | Expire when poisoned condition removed | **dnd5e core** — status-change hook | dnd5e core |
| `damagedByAlly` | 1 | Expire when damaged by ally | **Midi-QOL workflow** | Midi-QOL |
| `attackedBySource` | 1 | Expire when attacked by source | **Midi-QOL workflow** | Midi-QOL |
| `1Action` | 1 | Expire after one action | **Midi-QOL workflow** | Midi-QOL |
| `1Hit` (bare) | 1 | Expire after one hit (any) | **Midi-QOL workflow** | Midi-QOL |
| `1Attack:rwak`, `1Attack:mwak` | 1 + 1 | Expire after one ranged/melee weapon attack | **Midi-QOL workflow** | Midi-QOL |
| `dead`, `unconscious` | 1 + 1 | Expire when condition applies | **dnd5e core** — status-change hooks | dnd5e core |
| `heavy` | 1 | Expire on encumbrance change | **dnd5e core** — derived-data hook | dnd5e core |
| `forceSave` | 1 | Force save expiration | **Midi-QOL workflow** | Midi-QOL |
| `DamageDealt` | 1 | Expire on damage dealt | **Midi-QOL workflow** | Midi-QOL |
| `zeroSpeed` | 1 | Expire at zero speed | **dnd5e core** — derived-data hook | dnd5e core |
| `moveFinished` | 1 | Expire when token movement finishes | **Midi-QOL v14** — `TokenDocument.move()` hooks (per Midi-QOL 13.0.55 changelog) | Midi-QOL v14 |
| `None` (placeholder) | 2 | Empty/sentinel | Drop or normalize to `[]` | — |
| `shortRest` (in JS) | ~9 (macros) | Expire on short rest | **dnd5e native** — `dnd5e.restCompleted` filtered to `restType === "short"` | dnd5e core |

**Summary by replacement source:**

- **DAE v14 native, fully auto-migrated:** 5 values (`turnStart`, `turnEnd`, `turnStartSource`, `turnEndSource`, `combatEnd` — accounts for **117 of the 154 effect-document occurrences**, i.e. ~76% of the migration is invisible.)
- **dnd5e core:** ~9 values — rests, conditions, skill rolls, save rolls, encumbrance, HP/speed zero — all handled by hooks dnd5e already emits.
- **Midi-QOL workflow:** ~17 values — every `isAttacked`/`isDamaged`/`isHit`/`isSave`-on-workflow/`1Attack`/etc. — these are Midi-QOL's responsibility, and Midi-QOL v14 (14.0.x) is the consumer that needs to honor them. Verify each one fires on the Midi v14 branch before declaring this done.
- **Sentinels:** 1 value (`None`) — normalize to empty array.

### The actual upstream PR checklist for CPR

Given the above, the upstream PR a CPR maintainer needs to ship for V14 is dramatically shorter than the TODO note suggested:

1. **Bump manifest** (Feature 2 below).
2. **Delete the `times-up` entry from `module-template.json` + `module-dev.json`.** DAE absorbs it.
3. **Delete or relabel** `'times-up': 'Times Up'` in `scripts/applications/troubleshooter.js:28`.
4. **Run a soak test** on all 154 effect documents in V14 + DAE v14 + Midi-QOL v14, confirming the auto-migrated `duration.expiry` values fire when expected.
5. **Audit** any specialDuration value in the "Midi-QOL workflow" bucket above that doesn't fire on Midi v14 — file as Midi-QOL issues, not CPR issues.

Item 4 is where most of the actual labor lives, and it's an integration-testing task, not a refactor.

---

## Manifest migration target (Feature 2)

The first PR is essentially mechanical. Target shape for `module-template.json`:

```jsonc
{
  "compatibility": {
    "minimum": "14",
    "verified": "14.363",
    "maximum": "14"
  },
  "relationships": {
    "systems": [
      {
        "id": "dnd5e",
        "type": "system",
        "compatibility": {
          "minimum": "5.3.99",   // dnd5e 5.3+ is the Midi-QOL v14 baseline
          "verified": "5.4",
          "maximum": "5.9.99"    // raise as later releases verify
        }
      }
    ],
    "requires": [
      { "id": "midi-qol",  "type": "module", "compatibility": { "minimum": "14.0.7" } },
      { "id": "socketlib", "type": "module", "compatibility": { "minimum": "1.1.2"  } },
      { "id": "dae",       "type": "module", "compatibility": { "minimum": "14.0.10" } }
      // times-up entry DELETED — DAE v14 absorbed its surface
    ]
  }
}
```

Mirror the same delete in `module-dev.json`.

---

## Foundry V14 retrofit beyond Times-Up (Feature 4)

Most of these categories are already done in CPR's V13 codebase — flagged here as "verify, don't change" so a porting maintainer knows what to *not* spend time on.

- **ApplicationV2 / HandlebarsApplicationMixin.** ✅ **Already migrated.** Every CPR application class (`ActivityMedkit`, `ActorMedkit`, `EffectMedkit`, `ItemMedkit`, `AdditionalCompendiums`, `EmbeddedMacros`, `QuickConditions`, `DialogApp`, `CPRMultipleRollResolver`, `CPRSingleRollResolver`) extends `HandlebarsApplicationMixin(ApplicationV2)` on master. No FormApplication usage anywhere in `scripts/`.
- **dnd5e hook V2 signatures.** ✅ **Already migrated.** Every `dnd5e.*` hook CPR registers uses the V-suffix signature (`preRollAbilityCheckV`, `preRollSavingThrowV`, `preRollSkillV`, `rollToolCheckV`). Plus `dnd5e.getItemContextOptions`, `dnd5e.preRollTool`, `dnd5e.restCompleted`, `dnd5e.rollInitiative` — all V2-style.
- **ActiveEffect duration semantics.** ✅ **Handled by DAE auto-migration** at apply time (DAE 14.0.7). Source-level changes optional but recommended for new content.
- **`flags.dae.showIcon` → `ActiveEffect.showIcon`.** ⚠️ **Auto-migrated by DAE** at create time (DAE 14.0.7), but new content should use the native field directly. CPR's 154 effect documents currently set `flags.dae.showIcon: false` — they'll be re-saved during the soak test.
- **ATL → token.* keys.** ⚠️ **Configurable** via DAE's new `dae.atlCompatibility` setting (legacy / runtime / migrate / full). CPR's premade items use ATL for some visual effects (e.g. invisibility, shadowstep) — sample those during testing and recommend a default mode to end-users in the wiki.
- **Templates → Regions.** ⚠️ **Midi-QOL v14 made this shift.** Spells like Moonbeam, Spirit Guardians moved to region-behaviour-based fires. CPR's macros that pre-place templates should still work (Midi-QOL routes them), but Spirit Guardians–type macros in `scripts/macros/2024/spells/` should be audited against Midi-QOL's new MidiRegionLightBehaviorType.
- **Roll API.** ⚠️ **dnd5e 5.3 changed damage handling significantly** (per Midi-QOL changelog 13.0.52). CPR's damage macros need a soak test. CPR caps at dnd5e 5.3.3 verified / 5.9.9 max on master — raise both when retesting.
- **Compendium pack format.** ✅ CPR uses LevelDB packs already (V13's format); V14 carries them forward unchanged.
- **DDB-Importer compatibility.** Worth a separate test pass — CPR's `scripts/integrations/` has DDB-aware code that interacts with imported items. Recent commits ("savage attacker - ddbi compatibility", 2026-05-28) suggest active maintenance here, so verify on the V14 import path.

---

## Interim strategy (Feature 5 — answers Chris-3)

**Recommended: Option (b) — hand-author the invocation Enchantments natively.**

Three options on the table:

| Option | Effort | Coverage | Verdict |
|---|---|---|---|
| **(a) Wait on upstream** | None | None until CPR ships V14 (ETA unknown) | Acceptable only if we also pin V13 (see (c)). |
| **(b) Hand-author the invocation Enchantments natively** | Small | Closes our highest-priority gap (Agonizing Blast, Lifedrinker) | **Recommended.** Repelling Blast is already a working PHB 2024 Enchantment in our pack — use it as the template. |
| **(c) Pin Foundry V13 for our pack** | None | All current automations | Pushes the problem to users — not a real solution. |

**Why (b) wins.** Eldritch Invocations are the *only* CPR-exclusive automations we currently care about for the pack. They're implemented in CPR as dnd5e Enchantment documents — a native dnd5e shape that doesn't actually require CPR's runtime to function. Repelling Blast in PHB 2024 already demonstrates the working pattern. Hand-authoring Agonizing Blast and Lifedrinker as parameterized Enchantments in our wiring registry costs ~half a day and leaves us free of CPR as a runtime dep for these features. Everything else CPR provides (3rd-party items, monster features, race features) we either don't ship or can defer.

**Explicit non-decision.** This project does **not** need to fork or maintain CPR. Option (b) lets us ship on V14 without owning a 30k-line JS codebase. If we want to upstream the manifest+dep fix to CPR ourselves, this doc *is* the PR description — but that's optional, not required for our pack to work.

---

## Verification

How to confirm this doc is complete and current without shipping a single line of CPR code:

1. **Re-run the call-site sweep** against a fresh CPR clone (see [Methodology](#methodology-how-to-keep-this-doc-current)). If the file count differs from the snapshot here (master @ `e403f720`, 3 files mention `times-up`, 154 effect docs have non-empty `specialDuration`), update the document.
2. **Sanity-check 3 specialDuration replacements** against DAE v14 / Midi-QOL v14 source:
   - `turnEndSource` → confirm DAE 14.0.7 changelog still lists it as auto-migrated.
   - `isMoved` → confirm Midi-QOL 14.0.x changelog still credits `TokenDocument.move()` for honoring it.
   - `longRest` → grep dnd5e core for the `restCompleted` hook signature (its filter-by-restType behavior is the replacement).
3. **Test the interim path on our pack.** From the Mac, with the pack built and dropped into a V13 world, confirm Repelling Blast Enchantment (already in our PHB 2024 build) fires correctly on a Warlock. That's the working template for option (b)'s Agonizing Blast / Lifedrinker port.
4. **Hand-off check.** Any maintainer (CPR upstream, or future-us) should be able to read this document cold and start executing the manifest+dep changes from the [The actual upstream PR checklist for CPR](#the-actual-upstream-pr-checklist-for-cpr) section without re-doing any research.

---

## Methodology — how to keep this doc current

```bash
# 1. Clone CPR fresh to a scratch dir (do not commit this anywhere).
rm -rf /tmp/cpr-v14-research && \
  git clone --depth 1 https://github.com/chrisk123999/chris-premades.git /tmp/cpr-v14-research

# 2. Run the four call-site categories.
grep -rln -E "from .times-up|require.*times-up|import.*times-up" \
  /tmp/cpr-v14-research --include='*.js' --include='*.mjs'                  # (a) imports
grep -rln -E "Hooks\.(on|once|callAll)\(.{1,5}(times-up|timesUp)" \
  /tmp/cpr-v14-research --include='*.js' --include='*.mjs'                  # (b) hooks
grep -rln 'game\.modules\.get(.times-up' \
  /tmp/cpr-v14-research --include='*.js' --include='*.mjs'                  # (c) module API
grep -rln -E 'flags\["?times-up"?\]|"times-up":' \
  /tmp/cpr-v14-research --include='*.js' --include='*.json'                 # (d) flag rw

# 3. Enumerate the specialDuration vocabulary (the actual surface).
python3 - <<'PY'
import json, glob, collections
vals = collections.Counter()
for p in glob.glob('/tmp/cpr-v14-research/packData/**/*.json', recursive=True):
    try: data = json.load(open(p))
    except Exception: continue
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == 'specialDuration' and isinstance(v, list):
                    for item in v: vals[item] += 1
                walk(v)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(data)
for v, c in vals.most_common(): print(f'  {v}: {c}')
PY

# 4. Check the upstream V14 dep status (DAE, Midi-QOL).
curl -sL "https://gitlab.com/api/v4/projects/tposney%2Fdae/repository/files/Changelog.md/raw?ref=v14" | head -50
curl -sL "https://gitlab.com/api/v4/projects/tposney%2Fmidi-qol/repository/files/Changelog.md/raw?ref=v14" | head -50
```

If any output differs from what this document records, update the snapshot date at the top and revise the relevant tables.

---

## Cross-references in this project

- [`docs/TODO.md`](TODO.md) — Chris-1 / Chris-2 / Chris-3 action items now point at this document instead of describing the work in prose.
- [`docs/patterns/module-automations.md`](patterns/module-automations.md) — the 9-pattern catalog that this project's `module_flags` field stacks onto. CPR is *not* currently in active use in our wiring; everything we ship is Midi-QOL / DAE / Effect Macro / Rest Recovery layered onto native dnd5e shapes.
- [`docs/patterns/enchant.md`](patterns/enchant.md) — the pattern reference for option (b)'s Agonizing Blast / Lifedrinker hand-port.
