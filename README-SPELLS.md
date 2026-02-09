# EQ5e Spell Compendium + Condition Spell Examples

This repo ships a **deterministic world compendium generator** that creates world item packs containing spells.

## Core Spells Compendium (NEW!)

The system now includes a **consolidated core spell database** available to all classes and characters as a foundation.

### Source
- File: `system/eq5e/data/spells-core.json`
- Contains 20+ foundation spells for all core activities:
  - **Healing:** Minor, Light, Standard, Group Healing
  - **Damage/Nukes:** Fireball, Frost Bolt, Lightning Bolt
  - **Control:** Root, Mesmerize, Snare
  - **Debuffs:** Weakness
  - **Buffs:** Haste, Armor, Mirror Image, Clarity, Mana Regeneration
  - **DoTs:** Lifetap, Disease Cloud
  - **Summoning:** Summon Weapon
  - **Utility:** Levitate, Invisibility

### Generated Compendium
- World pack key: `world.eq5e-spells-core`
- Label: `EQ5e Spells (Core)`
- Auto-generated on world ready (configurable via GM setting)
- Deterministically upserted by `flags.eq5e.spell.spellId`

### Control
System setting:
- **Core Spells: Import spells on startup** (`eq5e.coreSpellsOnStartup`)

---

## Example Spells Compendium

This repo also ships a **deterministic world compendium generator** that creates a world item pack containing example spells
that apply core EQ5e conditions:

- **Mez** → `mezzed` (break on damage)
- **Root** → `rooted`
- **Snare** → `snared` (moveMult 0.5)
- **Silence** → `silenced` (blocks casting)

## Where the example sources live
- `system/eq5e/data/spells-examples.json`

## Where the example compendium is generated
- World pack key: `world.eq5e-spells-examples`
- Label: `EQ5e Spells (Examples)`

## How conditions are applied
Spells use `flags.eq5e.spell.conditions` entries like:

```json
{ "id": "mezzed", "duration": { "rounds": 2 }, "meta": { "breakOnDamage": true } }
```

Your existing pipeline applies these via `game.eq5e.api.castSpell`, and your Active Effect ↔ Condition syncing ensures
buffs/effects and conditions stay consistent.

## Control
System setting:
- **Generate example spell compendium on startup** (`eq5e.exampleSpellsOnStartup`)


## AE Examples (Active Effect ↔ Condition sync)
This repo also generates a second world pack containing Items with **embedded ActiveEffects**.
Those effects set EQ5e conditions via either:
- `flags.eq5e.conditions = ["silenced"]` on the ActiveEffect, or
- `changes` that write `flags.eq5e.conditions.<id>.active = true`

Generated pack:
- `world.eq5e-spell-effects-ae-examples` (label: `EQ5e Spell Effects (AE Examples)`)

Source file:
- `system/eq5e/data/spell-effects-ae-examples.json`
