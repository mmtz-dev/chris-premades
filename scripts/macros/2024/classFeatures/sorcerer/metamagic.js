import {DialogApp} from '../../../../applications/dialog.js';
import {actorUtils, constants, dialogUtils, effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

// The sorcery-point pool varies by source: CPR's own content uses identifier
// 'sorceryPoints'; the official 2024 PHB ships it as "Font of Magic"
// (identifier 'font-of-magic', no 'sorceryPoints'); the 2014 content used a
// feature literally named "Sorcery Points". Match all of them so metamagic
// works on official content without any re-tagging.
function getSorceryPoints(actor) {
    return itemUtils.getItemByIdentifier(actor, 'sorceryPoints')
        ?? itemUtils.getItemByIdentifier(actor, 'font-of-magic')
        ?? actor.items.find(i => i.name === 'Sorcery Points' || i.name === 'Font of Magic');
}

async function useCareful({workflow}) {
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => i.hasSave);
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 1, plural: ''}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        origin: workflow.item.uuid,
        flags: {
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    effectUtils.addMacro(effectData, 'midi.actor', ['carefulSpell']);
    let effect = await effectUtils.createEffect(workflow.actor, effectData, {identifier: 'metamagic'});
    if (!effect) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    await workflowUtils.completeItemUse(selection);
    if (effect) await genericUtils.remove(effect);
}
async function earlyCareful({trigger: {entity: effect}, workflow}) {
    if (!workflow.targets.size) return;
    let max = Math.max(1, workflow.actor.system.abilities.cha.mod ?? 0);
    let targets = Array.from(workflow.targets);
    let originItem = await effectUtils.getOriginItem(effect);
    if (!originItem) return;
    let allowEnemies = itemUtils.getConfig(originItem, 'allowEnemies');
    if (!allowEnemies) targets = targets.filter(i => i.document.disposition === workflow.token.document.disposition);
    let selection = await dialogUtils.selectTargetDialog(effect.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.CarefulWhich', {max}), targets, {
        type: 'multiple',
        maxAmount: max
    });
    if (!selection?.length) return;
    selection = selection[0];
    let effectData = {
        name: effect.name,
        img: constants.tempConditionIcon,
        origin: effect.uuid,
        changes: [
            {
                key: 'flags.midi-qol.min.ability.save.all',
                mode: 5,
                value: 100,
                priority: 120
            }
        ],
        flags: {
            dae: {
                specialDuration: [
                    'isSave'
                ]
            },
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    for (let target of selection) {
        await effectUtils.createEffect(target.actor, effectData, {parentEntity: effect});
    }
}
async function useDistant({workflow}) {
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => ['touch', 'ft'].includes(i.system.range.units) && i.system.target.affects.type?.length && i.system.target.affects.type !== 'self');
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 1, plural: ''}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    let itemUpdate;
    if (selection.system.range.units === 'touch') {
        itemUpdate = {'system.range': {units: 'ft', value: 30}};
    } else {
        itemUpdate = {'system.range.value': selection.system.range.value * 2};
    }
    let newItem = selection.clone(itemUpdate, {keepId: true});
    let shouldConsumeSlot = newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method);
    let shouldConsumeUsage = newItem.system.hasLimitedUses;
    workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        options: {
            configureDialog: (shouldConsumeSlot || shouldConsumeUsage) ? true : null
        }, config: {
            consumeSpellSlot: shouldConsumeSlot ? true : null,
            consumeUsage: shouldConsumeUsage ? true : null
        }
    });
}
async function damageEmpowered({trigger: {entity: item}, workflow}) {
    if (!workflow.hitTargets.size || workflow.item.type !== 'spell') return;
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints?.system.uses.value) return;
    let max = workflow.actor.system.abilities.cha.mod;
    let newDamageRolls = workflow.damageRolls;
    let lowest = [];
    for (let a = 0; a < newDamageRolls.length; a++) {
        let newDamageRoll = newDamageRolls[a];
        for (let term = 0; term < newDamageRoll.terms.length; term++) {
            if (newDamageRoll.terms[term].isDeterministic === false) {
                let currentTerm = newDamageRoll.terms[term];
                let modifiers = currentTerm.modifiers?.toString();
                let flavor = currentTerm.flavor?.length ? currentTerm.flavor : newDamageRoll.options.type;
                let expression = currentTerm.expression;
                let results = [];
                for (let position = 0; position < currentTerm.values.length; position++) {
                    results.push(currentTerm.values[position]);
                }
                lowest.push({
                    roll: a,
                    results,
                    expression,
                    faces: currentTerm.faces,
                    term,
                    modifiers,
                    flavor
                });
            }
        }
    }
    let selection = await DialogApp.dialog(item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Empowered', {max}), [[
        'selectAmount',
        lowest.map(i => ({
            label: i.expression + (i.flavor ? '[' + i.flavor + ']: ' : ': ') + i.results.join(', '),
            name: i.roll + '-' + i.term,
            options: {
                minAmount: 0,
                maxAmount: Math.min(max, i.results.length)
            }
        })),
        {totalMax: max, displayAsRows: true}
    ]], 'yesNo');
    if (!selection?.buttons) return;
    let toReroll = Object.keys(selection).filter(i => i !== 'buttons' && Number(selection[i]) > 0);
    if (!toReroll.length) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    for (let curr of toReroll) {
        let [roll, term] = curr.split('-');
        let existingRoll = lowest.find(i => i.roll == roll && i.term == term);
        let numRerolls = selection[curr];
        let indList = [];
        for (let i = 1; i <= existingRoll.faces; i++) {
            for (let j = 0; j < existingRoll.results.length; j++) {
                if (existingRoll.results[j] == i) indList.push(j);
                if (indList.length == numRerolls) break;
            }
            if (indList.length == numRerolls) break;
        }
        let damageFormula = '1d' + existingRoll.faces + existingRoll.modifiers + (existingRoll.flavor?.length ? '[' + existingRoll.flavor + ']' : '');
        for (let i = 0; i < numRerolls; i++) {
            let currInd = indList[i];
            let newRoll = await new Roll(damageFormula, existingRoll.data, existingRoll.options).evaluate();
            newRoll.dice[0].results[0].hidden = true;
            await newRoll.toMessage({
                speaker: ChatMessage.implementation.getSpeaker({token: workflow.token}),
                flavor: genericUtils.format('CHRISPREMADES.Generic.Rerolling', {origDie: 'd' + existingRoll.faces, origResult: existingRoll.results[currInd]}),
                rollMode: game.settings.get('core', 'rollMode')
            });
            newDamageRolls[roll].terms[term].results[currInd].result = newRoll.total;
        }
    }
    await workflow.setDamageRolls(newDamageRolls);
}
async function useExtended({workflow}) {
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => itemUtils.convertDuration(i).seconds >= 60);
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 1, plural: ''}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    let oldDuration = itemUtils.convertDuration(selection).seconds;
    let newDuration = Math.min(86400, oldDuration * 2);
    let newItem = selection.clone({
        'system.duration': {value: newDuration / 60, units: 'minute'},
        effects: Array.from(selection.effects).map(i => {
            if (i.duration?.seconds === oldDuration) {
                return genericUtils.mergeObject(i.toObject(), {'duration.seconds': newDuration});
            } else {
                return i.toObject();
            }
        })
    }, {keepId: true});
    let shouldConsumeSlot = newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method);
    let shouldConsumeUsage = newItem.system.hasLimitedUses;
    workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        options: {
            configureDialog: (shouldConsumeSlot || shouldConsumeUsage) ? true : null
        }, config: {
            consumeSpellSlot: shouldConsumeSlot ? true : null,
            consumeUsage: shouldConsumeUsage ? true : null
        }
    });
}
async function useHeightened({workflow}) {
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints || sorcPoints.system.uses.value < 3) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => i.hasSave);
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 3, plural: 's'}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        origin: workflow.item.uuid,
        flags: {
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    effectUtils.addMacro(effectData, 'midi.actor', ['heightenedSpell']);
    let effect = await effectUtils.createEffect(workflow.actor, effectData, {identifier: 'metamagic'});
    if (!effect) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 3});
    await workflowUtils.completeItemUse(selection);
    if (effect) await genericUtils.remove(effect);
}
async function earlyHeightened({trigger: {entity: effect}, workflow}) {
    if (!workflow.targets.size) return;
    let targets = Array.from(workflow.targets);
    targets = targets.filter(i => i.document.disposition !== workflow.token.document.disposition);
    let selection = await dialogUtils.selectTargetDialog(effect.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.HeightenedWhich'), targets);
    if (!selection?.length) return;
    selection = selection[0];
    let effectData = {
        name: effect.name,
        img: constants.tempConditionIcon,
        origin: effect.uuid,
        changes: [
            {
                key: 'flags.midi-qol.disadvantage.save.all',
                mode: 5,
                value: 1,
                priority: 20
            }
        ],
        flags: {
            dae: {
                specialDuration: [
                    'isSave'
                ]
            },
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    await effectUtils.createEffect(selection.actor, effectData, {parentEntity: effect});
}
async function useQuickened({workflow}) {
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints || sorcPoints.system.uses.value < 2) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => i.system.activation.type === 'action');
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 2, plural: 's'}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 2});
    let newItem = selection.clone({'system.activation.type': 'bonus'}, {keepId: true});
    let shouldConsumeSlot = newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method);
    let shouldConsumeUsage = newItem.system.hasLimitedUses;
    workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        options: {
            configureDialog: (shouldConsumeSlot || shouldConsumeUsage) ? true : null
        }, config: {
            consumeSpellSlot: shouldConsumeSlot ? true : null,
            consumeUsage: shouldConsumeUsage ? true : null
        }
    });
}
async function attackSeeking({trigger: {entity: item}, workflow}) {
    if (!workflow.targets.size || workflow.item.type !== 'spell') return;
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints || sorcPoints.system.uses.value < 2) return;
    let attackTotal = workflow.attackTotal;
    if (Array.from(workflow.targets).every(i => i.actor?.system.attributes.ac.value <= attackTotal)) return;
    let selection = await dialogUtils.confirm(item.name, genericUtils.format('CHRISPREMADES.Dialog.Missed', {attackTotal, itemName: item.name + '(2 ' + sorcPoints.name + ')'}));
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 2});
    let newAttackRoll = await new Roll(workflow.attackRoll.formula, workflow.attackRoll.data, workflow.attackRoll.options).evaluate();
    await workflow.setAttackRoll(newAttackRoll);
}
async function useSubtle({workflow}) {
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => ['vocal', 'verbal', 'somatic'].some(j => i.system.properties.has(j)));
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 1, plural: ''}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    let newItem = selection.clone({'system.properties': Array.from(selection.system.properties.difference(new Set(['vocal', 'verbal', 'somatic'])))}, {keepId: true});
    let shouldConsumeSlot = newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method);
    let shouldConsumeUsage = newItem.system.hasLimitedUses;
    workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        options: {
            configureDialog: (shouldConsumeSlot || shouldConsumeUsage) ? true : null
        }, config: {
            consumeSpellSlot: shouldConsumeSlot ? true : null,
            consumeUsage: shouldConsumeUsage ? true : null
        }
    });
}
function getDamageTypes(item) {
    let activities = Array.from(item.system.activities.getByTypes('attack', 'damage', 'save'));
    let flavorTypes = new Set(activities.flatMap(a => a.damage.parts.flatMap(d => new Roll(d.formula).terms.map(i => i.flavor).filter(i => i))));
    let trueTypes = new Set(activities.flatMap(a => a.damage.parts.flatMap(d => Array.from(d.types))));
    let allTypes = flavorTypes.union(trueTypes);
    return allTypes;
}
function createUpdateItem(item, oldDamageType, newDamageType) {
    let activities = Array.from(item.system.activities.getByTypes('attack', 'damage', 'save')).filter(a => {
        if (a.damage.parts.some(d => new Roll(d.formula).terms.some(i => i.flavor === oldDamageType))) return true;
        if (a.damage.parts.some(d => d.types.has(oldDamageType))) return true;
        return false;
    });
    let activityUpdates = {};
    for (let activity of activities) {
        activityUpdates[activity.id] = {
            damage: {
                parts: activity.damage.parts.map(i => {
                    let newPart = {};
                    if (i.custom.enabled) newPart.custom = {formula: i.custom.formula.replaceAll(oldDamageType, newDamageType), enabled: true};
                    if (i.types.has(oldDamageType)) newPart.types = [newDamageType];
                    return {...i, ...newPart};
                })
            }
        };
    }
    return {
        system: {
            activities: activityUpdates
        }
    };
}
async function useTransmuted({workflow}) {
    let sorcPoints = getSorceryPoints(workflow.actor);
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let damageTypes = ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'];
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => damageTypes.some(j => getDamageTypes(i).has(j)));
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 1, plural: ''}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    let replacementOptions = Array.from(getDamageTypes(selection).intersection(new Set(damageTypes)));
    let damageTypeToChange;
    if (replacementOptions.length > 1) {
        let selection2 = await dialogUtils.buttonDialog(selection.name, 'CHRISPREMADES.Macros.Metamagic.TransmutedFirst', replacementOptions.map(i => ['DND5E.Damage' + i.capitalize(), i]));
        if (selection2) damageTypeToChange = selection2;
    }
    if (!damageTypeToChange) damageTypeToChange = replacementOptions[0];
    let newDamageTypes = damageTypes.filter(i => i !== damageTypeToChange);
    let newDamageType = await dialogUtils.buttonDialog(selection.name, 'CHRISPREMADES.Macros.Metamagic.TransmutedSecond', newDamageTypes.map(i => ['DND5E.Damage' + i.capitalize(), i]));
    if (!newDamageType) newDamageType = newDamageTypes[0];
    let newItem = selection.clone(createUpdateItem(selection, damageTypeToChange, newDamageType), {keepId: true});
    await workflowUtils.completeItemUse(newItem);
}
export let carefulSpell = {
    name: 'Careful Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useCareful,
                priority: 50
            }
        ],
        actor: [
            {
                pass: 'preambleComplete',
                macro: earlyCareful,
                priority: 50
            }
        ]
    },
    config: [
        {
            value: 'allowEnemies',
            label: 'CHRISPREMADES.Config.AllowEnemies',
            type: 'checkbox',
            category: 'mechanics',
            default: false
        }
    ]
};
export let distantSpell = {
    name: 'Distant Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useDistant,
                priority: 50
            }
        ]
    }
};
export let empoweredSpell = {
    name: 'Empowered Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        actor: [
            {
                pass: 'damageRollComplete',
                macro: damageEmpowered,
                priority: 50
            }
        ]
    }
};
export let extendedSpell = {
    name: 'Extended Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useExtended,
                priority: 50
            }
        ]
    }
};
export let heightenedSpell = {
    name: 'Heightened Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useHeightened,
                priority: 50
            }
        ],
        actor: [
            {
                pass: 'preambleComplete',
                macro: earlyHeightened,
                priority: 50
            }
        ]
    }
};
export let quickenedSpell = {
    name: 'Quickened Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useQuickened,
                priority: 50
            }
        ]
    }
};
export let seekingSpell = {
    name: 'Seeking Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        actor: [
            {
                pass: 'postAttackRoll',
                macro: attackSeeking,
                priority: 50
            }
        ]
    }
};
export let subtleSpell = {
    name: 'Subtle Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useSubtle,
                priority: 50
            }
        ]
    }
};
export let transmutedSpell = {
    name: 'Transmuted Spell',
    rules: 'modern',
    version: '1.6.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useTransmuted,
                priority: 50
            }
        ]
    }
};
