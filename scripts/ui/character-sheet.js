/**
 * EQ5e Actor Sheet (Foundry VTT v13+)
 * ApplicationV2 / ActorSheetV2 implementation
 */

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/* ----------------------------------- Helpers -------------------------------- */
function _normalizeClassName(name) { return String(name ?? "").trim().toLowerCase(); }
function _getPrimaryClassItem(actor) { return actor?.items?.find(i => i.type === "class") ?? null; }
function _getPrimaryClassName(actor) {
  const cls = _getPrimaryClassItem(actor);
  return cls?.name ?? actor?.system?.details?.class ?? actor?.system?.class ?? "";
}

function _normalizeRaceName(name) { return String(name ?? "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

// Race -> ability bonus mapping. Loaded from data file with fallback defaults.
let RACE_BONUSES = {};

async function _loadRaceBonuses() {
  if (Object.keys(RACE_BONUSES).length > 0) return RACE_BONUSES;
  try {
    const resp = await fetch("systems/eq5e/data/race-bonuses.json");
    if (resp.ok) RACE_BONUSES = await resp.json();
  } catch (e) {
    console.warn("[EQ5E] Failed to load race bonuses data file", e);
    // Fallback to inline defaults
    RACE_BONUSES = {
      human: { str:1, dex:1, con:1, int:1, wis:1, cha:1 },
      barbarian: { str:2, con:1 },
      erudite: { int:2 },
      elf: { dex:2 },
      woodelf: { dex:2 },
      highelf: { dex:2, int:1 },
      darkelf: { dex:2, cha:1 },
      halfelf: { cha:2 },
      dwarf: { con:2 },
      halfling: { dex:2 },
      gnome: { int:2 },
      ogre: { str:2 },
      troll: { con:2 },
      iksar: { str:2 },
      vahshir: { dex:2 },
      froglok: { con:1, dex:1 },
      drakkin: { con:1, str:1 }
    };
  }
  return RACE_BONUSES;
}

// Crest: prefer class item icon, fall back to mapping
function _crestForActor(actor) {
  const cls = _getPrimaryClassItem(actor);
  const img = cls?.getFlag?.("eq5e", "icon") || cls?.img;
  if (img && img !== "icons/svg/mystery-man.svg") return img;

  const c = _normalizeClassName(_getPrimaryClassName(actor));
  // Map to actual class PNG files in assets/ui
  if (/(shadowknight|shadow\s*knight)/.test(c)) return "systems/eq5e/assets/ui/shadowknight.png";
  if (/(warrior)/.test(c)) return "systems/eq5e/assets/ui/warrior.png";
  if (/(paladin)/.test(c)) return "systems/eq5e/assets/ui/paladin.png";
  if (/(berserker)/.test(c)) return "systems/eq5e/assets/ui/berserker.png";
  if (/(druid)/.test(c)) return "systems/eq5e/assets/ui/druid.png";
  if (/(ranger)/.test(c)) return "systems/eq5e/assets/ui/ranger.png";
  if (/(shaman)/.test(c)) return "systems/eq5e/assets/ui/shaman.png";
  if (/(beastlord|beast|warden)/.test(c)) return "systems/eq5e/assets/ui/beastlord.png";
  if (/(cleric|priest|templar|healer)/.test(c)) return "systems/eq5e/assets/ui/cleric.png";
  if (/(wizard)/.test(c)) return "systems/eq5e/assets/ui/wizard.png";
  if (/(magician|mage)/.test(c)) return "systems/eq5e/assets/ui/magician.png";
  if (/(enchanter)/.test(c)) return "systems/eq5e/assets/ui/enchanter.png";
  if (/(necromancer)/.test(c)) return "systems/eq5e/assets/ui/necromancer.png";
  if (/(rogue|assassin)/.test(c)) return "systems/eq5e/assets/ui/rogue.png";
  if (/(bard|skald)/.test(c)) return "systems/eq5e/assets/ui/bard.png";
  if (/(monk)/.test(c)) return "systems/eq5e/assets/ui/monk.png";
  const fallback = "systems/eq5e/assets/ui/warrior.png";
  const className = _getPrimaryClassName(actor);
  console.log(`[EQ5E] No crest match for class "${className}"; using fallback:`, fallback);
  return fallback;
}

/* ---------------------------------- Sheet --------------------------------- */
export class EQ5eActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "eq5e-actor-sheet",
    classes: ["eq5e", "sheet", "actor"],
    window: {
      title: "EQ5e Actor Sheet"
    },
    position: {
      width: 760,
      height: 640
    }
  });

  /** Which handlebars template to render */
  static PARTS = {
    body: {
      template: "systems/eq5e/templates/actor/character-sheet.hbs"
    }
  };

  /** Data for the template */
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);

    // Ensure race bonuses are loaded
    await _loadRaceBonuses();

    const actor = this.actor;

    ctx.actor = actor;
    ctx.system = actor?.system ?? {};
    ctx.flags = actor?.flags ?? {};
    ctx.items = actor?.items?.map(i => i.toObject()) ?? [];

    // UI setup
    ctx.eq5e = ctx.eq5e ?? {};
    const crestPath = _crestForActor(actor);
    console.log("[EQ5E] Sheet context: actor=", actor.name, "class=", _getPrimaryClassName(actor), "crest=", crestPath);
    ctx.eq5e.ui = {
      crest: crestPath,
      parchment: "systems/eq5e/assets/ui/parchment.png"
    };

    // Sheet display data: class name from Item or system
    const classItem = _getPrimaryClassItem(actor);
    ctx.eq5e.sheet = ctx.eq5e.sheet ?? {};
    ctx.eq5e.sheet.className = classItem?.name ?? _getPrimaryClassName(actor) ?? "";
    ctx.eq5e.sheet.race = foundry.utils.getProperty(actor, "system.details.race") ?? "";
    ctx.eq5e.sheet.level = foundry.utils.getProperty(actor, "system.details.level") ?? 1;

    // Vital stats: AC, Init, Speed, HP
    ctx.eq5e.sheet.vitals = ctx.eq5e.sheet.vitals ?? {
      ac: { value: foundry.utils.getProperty(actor, "system.attributes.ac.value") ?? 10 },
      init: { value: foundry.utils.getProperty(actor, "system.attributes.init.value") ?? 0 },
      speed: { value: foundry.utils.getProperty(actor, "system.attributes.movement.walk") ?? foundry.utils.getProperty(actor, "system.attributes.speed.value") ?? 30 },
      hp: {
        value: foundry.utils.getProperty(actor, "system.attributes.hp.value") ?? 0,
        max: foundry.utils.getProperty(actor, "system.attributes.hp.max") ?? 0
      }
    };

    // Abilities: map system abilities to display format and apply racial bonuses
    const abilities = foundry.utils.getProperty(actor, "system.abilities") ?? {};
    const raceKey = _normalizeRaceName(ctx.eq5e.sheet.race || actor?.system?.details?.race);
    const raceBon = RACE_BONUSES[raceKey] || {};
    ctx.eq5e.sheet.abilities = Object.entries(abilities).map(([k, v]) => {
      const base = v?.value ?? 10;
      const racial = raceBon[k] ?? 0;
      const total = base + racial;
      return {
        key: k,
        label: (v?.label ?? k).toString().toUpperCase(),
        base: base,
        racial: racial,
        value: total,
        mod: Math.floor((total - 10) / 2),
        save: v?.save ?? 0
      };
    });

    // Skills: map system skills to display format
    const skills = foundry.utils.getProperty(actor, "system.skills") ?? {};
    ctx.eq5e.sheet.skills = Object.entries(skills).map(([k, v]) => ({
      key: k,
      label: v?.label ?? k,
      total: v?.total ?? v?.mod ?? 0,
      proficient: !!v?.proficient
    }));

    return ctx;
  }
}

Hooks.once("init", () => {
  try {
    // Register the sheet using the namespaced API to avoid deprecated globals.
    foundry.documents.collections.Actors.registerSheet("eq5e", EQ5eActorSheet, {
      types: ["character", "npc", "pet"],
      makeDefault: true,
      label: "EQ5e Actor Sheet"
    });
    console.log("[EQ5E] Registered EQ5e ActorSheetV2 for character/npc/pet");
  } catch (e) {
    console.error("[EQ5E] Failed to register EQ5e Actor Sheet", e);
  }
});

console.log("[EQ5E] Character sheet script loaded");