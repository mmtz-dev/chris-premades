// One-shot generator: produces the 9 PHB 2024 sorcerer metamagic feat shadow JSONs
// (+ the Sorcerer class folder) under packData/cpr-class-features-2024/.
// Re-run is idempotent (overwrites files with stable IDs).

import fs from 'node:fs/promises';
import path from 'node:path';

const PACK_DIR = path.resolve('packData/cpr-class-features-2024');
const SORCERER_FOLDER_ID = 'Sorcerer2024SrcF';

const metamagics = [
    { name: 'Careful Spell',     id: 'CarefulSpell24Id', identifier: 'careful-spell',     cprId: 'carefulSpell',     paths: ['midi.item', 'midi.actor'] },
    { name: 'Distant Spell',     id: 'DistantSpell24Id', identifier: 'distant-spell',     cprId: 'distantSpell',     paths: ['midi.item'] },
    { name: 'Empowered Spell',   id: 'EmpoweredSpl24Id', identifier: 'empowered-spell',   cprId: 'empoweredSpell',   paths: ['midi.actor'] },
    { name: 'Extended Spell',    id: 'ExtendedSpl24Idd', identifier: 'extended-spell',    cprId: 'extendedSpell',    paths: ['midi.item'] },
    { name: 'Heightened Spell',  id: 'HeightenedSpl24A', identifier: 'heightened-spell',  cprId: 'heightenedSpell',  paths: ['midi.item', 'midi.actor'] },
    { name: 'Quickened Spell',   id: 'QuickenedSpl24Id', identifier: 'quickened-spell',   cprId: 'quickenedSpell',   paths: ['midi.item'] },
    { name: 'Seeking Spell',     id: 'SeekingSpell24Id', identifier: 'seeking-spell',     cprId: 'seekingSpell',     paths: ['midi.actor'] },
    { name: 'Subtle Spell',      id: 'SubtleSpell24Idd', identifier: 'subtle-spell',      cprId: 'subtleSpell',      paths: ['midi.item'] },
    { name: 'Transmuted Spell',  id: 'TransmutedSpl24A', identifier: 'transmuted-spell',  cprId: 'transmutedSpell',  paths: ['midi.item'] },
    // Twinned needs the caster's two manually-targeted creatures to flow into the workflow, so its
    // activity must NOT auto-target self (unlike the other metamagics). Matches the official PHB item.
    { name: 'Twinned Spell',     id: 'TwinnedSpell24Id', identifier: 'twinned-spell',     cprId: 'twinnedSpell',     paths: ['midi.item'], affects: { choice: false, count: '', type: '', special: '' } }
];

const folderJson = {
    type: 'Item',
    folder: null,
    name: 'Sorcerer',
    color: null,
    sorting: 'a',
    _id: SORCERER_FOLDER_ID,
    description: '',
    flags: {},
    _key: `!folders!${SORCERER_FOLDER_ID}`
};

function buildMacroFlags({ cprId, paths }) {
    // paths like ["midi.item"] → { midi: { item: ["distantSpell"] } }
    const macros = {};
    for (const p of paths) {
        const [bucket, sub] = p.split('.');
        macros[bucket] ??= {};
        macros[bucket][sub] = [cprId];
    }
    return macros;
}

function makeActivityId() {
    // Deterministic per-item; 16 chars
    return 'a' + Math.random().toString(36).slice(2, 12).padEnd(15, '0').slice(0, 15);
}

function buildItemJson({ name, id, identifier, cprId, paths, affects }) {
    const activityId = 'dnd5eactivity001';
    return {
        name,
        type: 'feat',
        effects: [],
        system: {
            activities: {
                [activityId]: {
                    type: 'utility',
                    _id: activityId,
                    sort: 0,
                    activation: { type: 'special', value: null, override: false, condition: '' },
                    consumption: { scaling: { allowed: false }, spellSlot: true, targets: [] },
                    description: { chatFlavor: '' },
                    duration: { units: 'inst', concentration: false, override: false },
                    effects: [],
                    flags: {},
                    range: { units: 'self', override: false, special: '' },
                    target: {
                        template: { contiguous: false, units: 'ft', type: '' },
                        affects: affects ?? { choice: false, type: 'self', special: '' },
                        override: false,
                        prompt: true
                    },
                    uses: { spent: 0, recovery: [], max: '' },
                    visibility: {
                        level: { min: null, max: null },
                        requireAttunement: false,
                        requireIdentification: false,
                        requireMagic: false,
                        identifier: ''
                    },
                    roll: { prompt: false, visible: false, name: '', formula: '' },
                    useConditionText: '',
                    useConditionReason: '',
                    effectConditionText: '',
                    macroData: { name: '', command: '' },
                    ignoreTraits: { idi: false, idr: false, idv: false, ida: false, idm: false },
                    midiProperties: {
                        ignoreTraits: [],
                        triggeredActivityId: 'none',
                        triggeredActivityConditionText: '',
                        triggeredActivityTargets: 'targets',
                        triggeredActivityRollAs: 'self',
                        autoConsume: false,
                        forceConsumeDialog: 'default',
                        forceRollDialog: 'default',
                        forceDamageDialog: 'default',
                        confirmTargets: 'default',
                        autoTargetType: 'any',
                        autoTargetAction: 'default',
                        automationOnly: false,
                        otherActivityCompatible: false,
                        otherActivityAsParentType: true,
                        identifier: '',
                        displayActivityName: false,
                        rollMode: 'default',
                        chooseEffects: false,
                        toggleEffect: false,
                        ignoreFullCover: false,
                        removeChatButtons: 'default',
                        magicEffect: false,
                        magicDamage: false,
                        noConcentrationCheck: false,
                        skipConcentrationCheck: false,
                        autoCEEffects: 'none'
                    },
                    isOverTimeFlag: false,
                    overTimeProperties: {
                        saveRemoves: true,
                        rollAs: 'target',
                        preRemoveConditionText: '',
                        postRemoveConditionText: ''
                    },
                    otherActivityId: 'none',
                    otherActivityAsParentType: true,
                    name: ''
                }
            },
            uses: { spent: 0, max: '', recovery: [] },
            advancement: [],
            description: { value: '', chat: '' },
            identifier,
            source: {
                book: 'PHB 2024',
                page: '',
                license: '',
                custom: '',
                rules: '2024',
                revision: 1
            },
            crewed: false,
            enchant: {},
            prerequisites: { items: [], level: null, repeatable: false },
            properties: [],
            requirements: '',
            type: { value: 'class', subtype: 'metamagic' }
        },
        flags: {
            'midi-qol': {
                rollAttackPerTarget: 'default',
                itemCondition: '',
                effectCondition: '',
                AoETargetType: 'any',
                AoETargetTypeIncludeSelf: true,
                autoTarget: 'default',
                removeAttackDamageButtons: 'default',
                reactionCondition: '',
                otherCondition: ''
            },
            dnd5e: { riders: { activity: [], effect: [] } },
            'chris-premades': {
                info: {
                    identifier: cprId,
                    source: 'chris-premades',
                    rules: 'modern',
                    version: '1.6.0'
                },
                macros: buildMacroFlags({ cprId, paths })
            }
        },
        img: 'icons/magic/symbols/runes-star-blue.webp',
        folder: SORCERER_FOLDER_ID,
        _id: id,
        _key: `!items!${id}`
    };
}

function fileName(name, id) {
    return `${name.replaceAll(' ', '_')}_${id}.json`;
}

async function main() {
    await fs.mkdir(PACK_DIR, { recursive: true });

    const folderPath = path.join(PACK_DIR, `Sorcerer_${SORCERER_FOLDER_ID}.json`);
    await fs.writeFile(folderPath, JSON.stringify(folderJson, null, 2) + '\n');
    console.log('wrote', folderPath);

    for (const m of metamagics) {
        const json = buildItemJson(m);
        const fp = path.join(PACK_DIR, fileName(m.name, m.id));
        await fs.writeFile(fp, JSON.stringify(json, null, 2) + '\n');
        console.log('wrote', fp);
    }
    console.log('---DONE---');
}

main().catch(e => { console.error(e); process.exit(1); });
