/**
 * Aufgaben.
 *
 * Ein Auftrag ist hier eine Karte aus Symbolen: WER will WAS, WIE OFT.
 * Kein Dialogbaum, keine Textwand – Annehmen passiert automatisch,
 * Abgeben mit einem Tastendruck beim Geist.
 */
import { SPIRITS, SPIRIT_IDS } from './spirits.js';
import { MEMORY_IDS, getItem, CAT } from './items.js';
import { dailyRng, randInt, randPick } from '../core/rng.js';
import { makeEntity } from '../world/entities.js';
import { TILE_SIZE } from '../world/worldgen.js';

export const QTYPE = {
  GATHER: 'gather',
  FIND: 'find',
  FISH: 'fish',
  BURN: 'burn',
  CRAFT: 'craft',
  DECORATE: 'decorate',
};

const POOLS = {
  gather_wood: ['wood', 'wood', 'hardwood', 'resin'],
  gather_forage: ['berry', 'mushroom', 'herb', 'flower_pink', 'flower_yellow', 'flower_violet', 'flower_white'],
  gather_beach: ['shell', 'driftwood', 'fiber'],
  gather_ore: ['stone', 'copper_ore', 'clay'],
  gather: ['wood', 'stone', 'fiber', 'berry', 'shell', 'herb', 'mushroom', 'clay'],
};

const CRAFTABLE_ASKS = ['fence', 'path_tile', 'lantern', 'flowerbed', 'bench', 'birdhouse'];

const MAX_ACTIVE_PER_SPIRIT = 2;

let questSeq = 1;

export class QuestBook {
  constructor() {
    this.quests = [];
    this.completedBySpirit = Object.create(null);
    this.totalCompleted = 0;
    for (let i = 0; i < SPIRIT_IDS.length; i++) this.completedBySpirit[SPIRIT_IDS[i]] = 0;
  }

  active() {
    return this.quests;
  }

  forSpirit(id) {
    return this.quests.filter(function (q) { return q.spirit === id; });
  }

  openForSpirit(id) {
    return this.quests.filter(function (q) { return q.spirit === id && !q.turnedIn; });
  }

  byId(id) {
    for (let i = 0; i < this.quests.length; i++) if (this.quests[i].id === id) return this.quests[i];
    return null;
  }

  /**
   * Neue Tagesauftraege verteilen.
   * Offene Auftraege bleiben bestehen – niemand wird bestraft, wenn er
   * einen Tag nicht dazu kommt.
   */
  newDay(day, world, state) {
    const rng = dailyRng(world.seed, day, 'quests');
    for (let i = 0; i < SPIRIT_IDS.length; i++) {
      const sid = SPIRIT_IDS[i];
      const spirit = SPIRITS[sid];
      if (!world.isUnlocked(spirit.region)) continue;
      const open = this.openForSpirit(sid);
      let slots = MAX_ACTIVE_PER_SPIRIT - open.length;
      // Am ersten Tag nur eine Aufgabe pro Geist – ruhiger Einstieg.
      if (day <= 1) slots = Math.min(slots, 1);
      while (slots-- > 0) {
        const q = this.generate(sid, day, world, state, rng);
        if (q) this.quests.push(q);
      }
    }
    return this;
  }

  generate(spiritId, day, world, state, rng) {
    const spirit = SPIRITS[spiritId];
    const type = randPick(rng, spirit.questTypes);
    const scale = 1 + Math.min(1.6, day * 0.06);

    if (type === 'find') {
      const count = randInt(rng, 2, 3);
      const q = this._base(spiritId, QTYPE.FIND, count, day);
      q.itemId = randPick(rng, MEMORY_IDS);
      q.hiddenIds = [];
      const spiritEnt = world.spiritEntity(spiritId);
      for (let i = 0; i < count; i++) {
        const spot = world.randomSpot(rng, spirit.region, spiritEnt
          ? { x: spiritEnt.x, y: spiritEnt.y, r: 240 }
          : null);
        const e = makeEntity('hidden', spot.x, spot.y, {
          questId: q.id,
          itemId: q.itemId,
          zBias: 2,
        });
        e.sprite = 'memory_' + q.itemId.replace('memory_', '');
        world.add(e);
        q.hiddenIds.push(e.id);
      }
      q.rewards = rewardFor(QTYPE.FIND, count, scale, rng);
      return q;
    }

    if (type === 'fish') {
      const count = randInt(rng, 2, 4);
      const q = this._base(spiritId, QTYPE.FISH, count, day);
      q.rewards = rewardFor(QTYPE.FISH, count, scale, rng);
      return q;
    }

    if (type === 'burn') {
      const count = randInt(rng, 3, 6);
      const q = this._base(spiritId, QTYPE.BURN, count, day);
      q.rewards = rewardFor(QTYPE.BURN, count, scale, rng);
      return q;
    }

    if (type === 'craft') {
      const q = this._base(spiritId, QTYPE.CRAFT, 1, day);
      q.itemId = randPick(rng, CRAFTABLE_ASKS);
      q.rewards = rewardFor(QTYPE.CRAFT, 1, scale, rng);
      return q;
    }

    if (type === 'decorate') {
      const count = randInt(rng, 2, 3);
      const q = this._base(spiritId, QTYPE.DECORATE, count, day);
      q.rewards = rewardFor(QTYPE.DECORATE, count, scale, rng);
      return q;
    }

    // Alle Sammelvarianten
    const pool = POOLS[type] || POOLS.gather;
    const itemId = randPick(rng, pool);
    const item = getItem(itemId);
    const base = item && item.value > 8 ? randInt(rng, 2, 4) : randInt(rng, 3, 7);
    const count = Math.max(1, Math.round(base * (0.8 + day * 0.02)));
    const q = this._base(spiritId, QTYPE.GATHER, count, day);
    q.itemId = itemId;
    q.rewards = rewardFor(QTYPE.GATHER, count, scale, rng, item);
    return q;
  }

  _base(spiritId, type, need, day) {
    return {
      id: 'q' + (questSeq++) + '_' + day,
      spirit: spiritId,
      type: type,
      itemId: null,
      need: need,
      have: 0,
      turnedIn: false,
      day: day,
      rewards: { coins: 0, ember: 0, items: [] },
      hiddenIds: null,
    };
  }

  /* ---------- Fortschritt ---------- */

  /** Fortschritt eines Auftrags (0..need). */
  progress(q, ctx) {
    switch (q.type) {
      case QTYPE.GATHER:
      case QTYPE.CRAFT:
        return Math.min(q.need, ctx.inventory.count(q.itemId));
      case QTYPE.DECORATE:
        return Math.min(q.need, countDecorNear(ctx.world, q.spirit));
      default:
        return Math.min(q.need, q.have);
    }
  }

  isReady(q, ctx) {
    return !q.turnedIn && this.progress(q, ctx) >= q.need;
  }

  /** Meldet ein Ereignis an alle passenden Auftraege. */
  notify(event, payload, ctx) {
    let changed = false;
    for (let i = 0; i < this.quests.length; i++) {
      const q = this.quests[i];
      if (q.turnedIn) continue;
      if (event === 'fish' && q.type === QTYPE.FISH && q.have < q.need) {
        q.have++;
        changed = true;
      } else if (event === 'burn' && q.type === QTYPE.BURN && q.have < q.need) {
        q.have += payload && payload.n ? payload.n : 1;
        if (q.have > q.need) q.have = q.need;
        changed = true;
      } else if (event === 'found' && q.type === QTYPE.FIND && payload.questId === q.id) {
        q.have++;
        changed = true;
      }
    }
    return changed;
  }

  /** Erledigt einen Auftrag und liefert die Belohnung zurueck. */
  turnIn(q, ctx) {
    if (q.turnedIn) return null;
    if (!this.isReady(q, ctx)) return null;

    if (q.type === QTYPE.GATHER || q.type === QTYPE.CRAFT) {
      ctx.inventory.remove(q.itemId, q.need);
    }
    q.turnedIn = true;
    this.completedBySpirit[q.spirit] = (this.completedBySpirit[q.spirit] || 0) + 1;
    this.totalCompleted++;

    const idx = this.quests.indexOf(q);
    if (idx >= 0) this.quests.splice(idx, 1);
    return q.rewards;
  }

  /** Aufraeumen: versteckte Gegenstaende eines Auftrags entfernen. */
  dropHidden(q, world) {
    if (!q.hiddenIds) return;
    for (let i = 0; i < q.hiddenIds.length; i++) {
      const e = world.byId[q.hiddenIds[i]];
      if (e) world.remove(e);
    }
  }

  toJSON() {
    return {
      seq: questSeq,
      quests: this.quests,
      done: this.completedBySpirit,
      total: this.totalCompleted,
    };
  }

  static fromJSON(data) {
    const qb = new QuestBook();
    if (!data) return qb;
    questSeq = data.seq || 1;
    qb.quests = data.quests || [];
    qb.completedBySpirit = data.done || qb.completedBySpirit;
    qb.totalCompleted = data.total || 0;
    return qb;
  }
}

function countDecorNear(world, spiritId) {
  const e = world.spiritEntity(spiritId);
  if (!e) return 0;
  const near = world.queryNear(e.x, e.y, 520);
  let n = 0;
  for (let i = 0; i < near.length; i++) {
    if (near[i].kind !== 'decor') continue;
    const dx = near[i].x - e.x;
    const dy = near[i].y - e.y;
    if (dx * dx + dy * dy <= 520 * 520) n++;
  }
  return n;
}

function rewardFor(type, count, scale, rng, item) {
  const perUnit = {
    gather: item ? Math.max(6, item.value * 1.6) : 10,
    find: 26,
    fish: 20,
    burn: 9,
    craft: 46,
    decorate: 30,
  }[type] || 10;

  const coins = Math.round(perUnit * count * scale);
  const ember = Math.round((type === 'burn' ? 1 : 2) + count * 0.7 * scale);
  const items = [];
  if (rng() < 0.35) {
    items.push({ id: randPick(rng, ['fiber', 'stone', 'wood', 'clay', 'resin']), n: randInt(rng, 2, 4) });
  }
  return { coins: coins, ember: ember, items: items };
}

/** Kurzbeschreibung fuer die Oberflaeche – Symbol + Zahl, kein Fliesstext. */
export function questIcon(q) {
  switch (q.type) {
    case QTYPE.FIND: return 'icon_' + q.itemId;
    case QTYPE.FISH: return 'icon_fish_trout';
    case QTYPE.BURN: return 'icon_campfire';
    case QTYPE.CRAFT: return 'icon_' + q.itemId;
    case QTYPE.DECORATE: return 'icon_flowerbed';
    default: return 'icon_' + q.itemId;
  }
}

export const QUEST_VERB = {
  gather: 'bringen',
  find: 'finden',
  fish: 'angeln',
  burn: 'verbrennen',
  craft: 'bauen',
  decorate: 'aufstellen',
};

export function questTitle(q) {
  const item = q.itemId ? getItem(q.itemId) : null;
  switch (q.type) {
    case QTYPE.FIND: return (item ? item.name : 'Erinnerung') + ' finden';
    case QTYPE.FISH: return 'Fische angeln';
    case QTYPE.BURN: return 'Im Feuer verbrennen';
    case QTYPE.CRAFT: return (item ? item.name : 'Gegenstand') + ' bauen';
    case QTYPE.DECORATE: return 'Deko aufstellen';
    default: return (item ? item.name : 'Material') + ' bringen';
  }
}

export { MEMORY_IDS, CAT, TILE_SIZE };
