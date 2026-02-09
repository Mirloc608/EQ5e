/**
 * EQ5e Core Spell Loader
 * Generates/updates a world compendium with core spells available to all classes
 * Deterministic upsert by flags.eq5e.spell.spellId
 * 
 * Manages: world.eq5e-spells-core
 */

async function _fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${path}`);
  return res.json();
}

function _stableHash(obj) {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

async function ensureWorldPack({ key, label, type = "Item" } = {}) {
  const existing = game.packs?.get(key);
  if (existing) return existing;
  if (!game.user.isGM) throw new Error("Only GM can create world compendiums.");
  return CompendiumCollection.createCompendium({
    label,
    name: key.split(".")[1],
    type,
    package: "world"
  });
}

async function upsertCoreSpells(pack, items) {
  const existing = await pack.getDocuments();
  const bySpellId = new Map();
  for (const d of existing) {
    const sid = d?.flags?.eq5e?.spell?.spellId;
    if (sid) bySpellId.set(sid, d);
  }

  const toCreate = [];
  const toUpdate = [];

  for (const it of (items ?? [])) {
    const sid = it?.flags?.eq5e?.spell?.spellId;
    if (!sid) continue;
    const doc = bySpellId.get(sid);
    if (!doc) {
      // stamp derivedHash for future comparisons
      const h = _stableHash(it);
      it.flags = it.flags ?? {};
      it.flags.eq5e = it.flags.eq5e ?? {};
      it.flags.eq5e.derivedHash = h;
      toCreate.push(it);
    } else {
      const h = _stableHash(it);
      const old = doc?.flags?.eq5e?.derivedHash;
      if (h !== old) {
        // rehab the document
        const upd = foundry.utils.mergeObject(doc.toObject(), it, { inplace: false });
        upd.flags.eq5e.derivedHash = h;
        toUpdate.push({ _id: doc.id, ...upd });
      }
    }
  }

  let created = 0;
  let updated = 0;

  if (toCreate.length) {
    const docs = await pack.createDocuments(toCreate);
    created = docs.length;
  }
  if (toUpdate.length) {
    const docs = await pack.updateDocuments(toUpdate);
    updated = docs.length;
  }

  return { created, updated };
}

export async function generateCoreSpellsCompendium({
  key = "world.eq5e-spells-core",
  label = "EQ5e Spells (Core)"
} = {}) {
  const path = "systems/eq5e/data/spells-core.json";
  const items = await _fetchJSON(path);
  const pack = await ensureWorldPack({ key, label });
  const res = await upsertCoreSpells(pack, items);
  ui.notifications?.info(`EQ5E: Core spells upserted: created ${res.created}, updated ${res.updated}.`);
  return { ok: true, pack: pack.collection, ...res };
}

Hooks.once("init", () => {
  game.settings.register("eq5e", "coreSpellsOnStartup", {
    name: "Core Spells: Import spells on startup",
    hint: "If enabled, core spell compendium will be generated/updated on world ready.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  if (!game.settings.get("eq5e", "coreSpellsOnStartup")) return;
  try {
    await generateCoreSpellsCompendium();
  } catch (e) {
    console.error("[EQ5E] Failed to generate core spells compendium", e);
    ui.notifications?.error("EQ5E: Failed to generate core spells compendium (see console).");
  }
});

console.log("[EQ5E] Core Spells Loader loaded");
