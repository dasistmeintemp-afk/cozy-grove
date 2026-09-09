/**
 * Aufgaben.
 *
 * Ein Auftrag ist hier eine Karte aus Symbolen: WER will WAS, WIE OFT.
 * Kein Dialogbaum, keine Textwand – Annehmen passiert automatisch,
 * Abgeben mit einem Tastendruck beim Geist.
 */
import { SPIRITS, SPIRIT_IDS, friendshipLevel } from './spirits.js';
import { charmAround } from './cosiness.js';
import { MEMORY_IDS, getItem, CAT, fishesOf, bugsOf } from './items.js';
import { inSeason } from './seasons.js';
import { dailyRng, randInt, randPick } from '../core/rng.js';
import { makeEntity } from '../world/entities.js';
import { TILE_SIZE } from '../world/worldgen.js';

export const QTYPE = {
  GATHER: 'gather',
  FIND: 'find',
  FISH: 'fish',
  // Einen bestimmten Fisch fangen statt irgendwelche drei – dieselbe
  // Mechanik, aber ein Ziel statt einer Strichliste.
  CATCH: 'catch',
  // Einen Ort aufsuchen. Die einzige Aufgabe, die nichts einsammelt.
  VISIT: 'visit',
  BURN: 'burn',
  CRAFT: 'craft',
  DECORATE: 'decorate',
  /**
   * Drei VERSCHIEDENE Dinge einer Sorte.
   *
   * Der wichtigste Zusatz gegen die Eintönigkeit: „Sechs Beeren bringen" wird
   * an einem Busch erledigt, „von jeder Blume eine" schickt einen über die
   * halbe Insel. Und die Karte ist kombinatorisch – aus neun Sammelgütern
   * gibt es vierundachtzig Dreiergruppen statt neun Einzelbitten.
   */
  SET: 'set',
  /**
   * Botengang: bei einem Geist angenommen, bei einem anderen abgegeben.
   *
   * Die einzige Bitte, bei der es darauf ankommt, WO man hingeht. Sie
   * verbindet die Insel – vorher stand jeder Geist für sich.
   */
  DELIVER: 'deliver',
  /** Aus dem eigenen Beet – bindet den Garten an die Geister. */
  GROW: 'grow',
};

export const POOLS = {
  gather_wood: ['wood', 'wood', 'hardwood', 'resin'],
  gather_forage: ['berry', 'mushroom', 'herb', 'flower_pink', 'flower_yellow', 'flower_violet', 'flower_white'],
  gather_beach: ['shell', 'driftwood', 'fiber'],
  gather_ore: ['stone', 'copper_ore', 'clay'],
  gather: ['wood', 'stone', 'fiber', 'berry', 'shell', 'herb', 'mushroom', 'clay'],
};

export const CRAFTABLE_ASKS = ['fence', 'path_tile', 'lantern', 'flowerbed', 'bench', 'birdhouse'];

/**
 * Vorräte für Sammelbitten: drei VERSCHIEDENE aus einer Gruppe.
 *
 * Genau hier steckt die Abwechslung: Aus neun Sammelgütern gibt es
 * vierundachtzig Dreiergruppen. Eine Bitte um sechs Beeren erledigt man an
 * einem Busch – „von jeder eine" schickt einen über die halbe Insel.
 */
export const SET_POOLS = {
  blumen: ['flower_pink', 'flower_yellow', 'flower_violet', 'flower_white'],
  wald: ['berry', 'mushroom', 'herb', 'resin', 'fiber'],
  strand: ['shell', 'driftwood', 'fiber', 'bottle'],
  stein: ['stone', 'copper_ore', 'clay', 'shard'],
  bauholz: ['wood', 'hardwood', 'resin', 'fiber'],
};
const SET_NAMES = {
  blumen: 'Ein Strauß',
  wald: 'Aus dem Wald',
  strand: 'Vom Strand',
  stein: 'Aus dem Fels',
  bauholz: 'Vom Holzplatz',
};
const SET_KEYS = Object.keys(SET_POOLS);

/** Was ein Geist gern von einem anderen geschickt bekommt. */
export const DELIVER_POOL = ['berry', 'herb', 'mushroom', 'shell', 'driftwood', 'resin',
  'wood', 'stone', 'clay', 'feather', 'flower_pink', 'flower_yellow'];

/**
 * Wie viele Aufträge ein Geist gleichzeitig offen hat.
 *
 * Bei zwei standen am ersten Tag nur drei Aufträge zur Wahl – wer länger
 * spielen wollte, hatte nach wenigen Minuten nichts mehr zu tun und musste
 * schlafen. Drei geben einer Sitzung genug Stoff, ohne die Liste zu fluten.
 */
const MAX_ACTIVE_PER_SPIRIT = 3;

/**
 * Wie lange eine Bitte gilt, in Tagen.
 *
 * Ohne Ablauf blieb jeder Auftrag ewig stehen. Nach einer Woche standen
 * fünfzehn halb angefangene Bitten in der Liste, und weil die Plätze belegt
 * waren, kam nichts Neues nach: Wer eine Aufgabe nicht mochte, hatte sie für
 * immer. Mit Ablauf rücken die Bitten weiter – wer eine liegen lässt, bekommt
 * dafür eine andere.
 *
 * Was länger dauert, gilt länger: eine Erinnerung liegt irgendwo auf der
 * Insel, ein bestimmter Nachtfalter fliegt nur nachts, und Deko muss erst
 * gebaut werden.
 */
const LIFETIME = {
  set: 4,
  deliver: 3,
  // Säen, wachsen lassen, ernten: Die schnellste Saat braucht zwei Tage, und
  // danach muss man noch hinlaufen.
  grow: 6,
  find: 4,
  catch: 4,
  decorate: 5,
  craft: 4,
  visit: 3,
  gather: 3,
  fish: 3,
  burn: 3,
};
const LIFETIME_DEFAULT = 3;

export function lifetimeOf(type) {
  return LIFETIME[type] || LIFETIME_DEFAULT;
}

/** Verbleibende Tage einer Bitte – null, wenn sie nicht abläuft. */
export function daysLeft(q, day) {
  if (!q || q.expires == null) return null;
  return Math.max(0, q.expires - day);
}

let questSeq = 1;

/**
 * Erkennungszeichen einer Bitte: Art plus Gegenstand.
 *
 * Bei Sammelbitten zählt die Gruppe, nicht die gezogene Liste. Sonst standen
 * zweimal „Aus dem Wald sammeln" nebeneinander, nur mit leicht anderen
 * Zutaten – für den Spieler dieselbe Karte doppelt.
 */
function key(q) {
  return q.type + ':' + (q.setKey || q.itemId || '');
}

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
   * Zurückgezogene Bitten: alles, was abgelaufen ist und noch nicht erfüllt.
   *
   * Fertiges läuft NICHT ab. Wer die drei Muscheln beisammen hat und erst am
   * nächsten Morgen zum Geist kommt, hat sie nicht umsonst gesucht – das wäre
   * die eine Sorte Strafe, die in dieses Spiel nicht gehört.
   *
   * @returns {Array} die entfernten Aufträge
   */
  expire(day, world, ctx) {
    const jahreszeit = ctx && ctx.today && ctx.today.season ? ctx.today.season.id : null;
    const raus = [];
    for (let i = this.quests.length - 1; i >= 0; i--) {
      const q = this.quests[i];
      if (q.turnedIn) continue;
      // Erst der Kalender, dann die Frist. Eine Bitte um einen Fisch, den es
      // seit heute Nacht nicht mehr gibt, ist unlösbar geworden – sie hier
      // stehen zu lassen hieße, den Spieler drei Tage lang an ein Wasser zu
      // schicken, in dem nichts steht. Der Jahreszeitenwechsel trifft nur
      // eine Handvoll Arten und nur an einem Tag im Vierteljahr, aber genau
      // dieser Tag darf keine tote Aufgabe hinterlassen.
      const fort = q.itemId && !inSeason(q.itemId, jahreszeit);
      if (!fort && (q.expires == null || q.expires > day)) continue;
      if (ctx && this.progress(q, ctx) >= q.need) continue;
      this.dropHidden(q, world);
      this.quests.splice(i, 1);
      raus.push(q);
    }
    return raus;
  }

  /**
   * Neue Tagesaufträge verteilen.
   *
   * Zuerst rücken abgelaufene Bitten ab, dann werden die frei gewordenen
   * Plätze neu besetzt. Damit dreht sich die Liste, statt zu wachsen.
   *
   * @returns {Array} die zurückgezogenen Aufträge, für die Meldung am Morgen
   */
  newDay(day, world, state) {
    const rng = dailyRng(world.seed, day, 'quests');
    const zurueck = this.expire(day, world, state);
    for (let i = 0; i < SPIRIT_IDS.length; i++) {
      const sid = SPIRIT_IDS[i];
      const spirit = SPIRITS[sid];
      if (!world.isUnlocked(spirit.region)) continue;
      const open = this.openForSpirit(sid);
      let slots = MAX_ACTIVE_PER_SPIRIT - open.length;
      // Am ersten Tag etwas weniger – ruhiger Einstieg, aber genug für eine
      // ganze Sitzung. Mit nur einer Aufgabe je Geist war nach drei Minuten
      // Schluss, und das Spiel fühlte sich an, als müsste man warten.
      if (day <= 1) slots = Math.min(slots, 2);
      // Was dieser Geist gerade schon will, kommt nicht noch einmal. Sonst
      // stand dreimal „Holz bringen" untereinander – und nach dem Ablauf einer
      // Bitte kam mit einiger Wahrscheinlichkeit genau dieselbe zurück.
      const belegt = Object.create(null);
      for (let k = 0; k < open.length; k++) belegt[key(open[k])] = 1;
      while (slots-- > 0) {
        let q = null;
        for (let versuch = 0; versuch < 6; versuch++) {
          const kandidat = this.generate(sid, day, world, state, rng);
          if (!kandidat) continue;
          if (!belegt[key(kandidat)]) { q = kandidat; break; }
          // Verworfen: „Suche"-Aufträge haben schon Fundstücke ausgelegt.
          this.dropHidden(kandidat, world);
        }
        if (!q) continue;
        belegt[key(q)] = 1;
        this.quests.push(q);
      }
    }
    return zurueck;
  }

  generate(spiritId, day, world, state, rng) {
    const spirit = SPIRITS[spiritId];
    const type = randPick(rng, spirit.questTypes);
    // Der Tag treibt die Belohnung, die Freundschaft ebenso: wer einem Geist
    // oft geholfen hat, bekommt von ihm mehr. Vorher war die Freundschaftsstufe
    // eine Zahl ohne Wirkung.
    const friends = friendshipLevel(this.completedBySpirit[spiritId] || 0);
    const scale = 1 + Math.min(1.6, day * 0.06) + friends * 0.09;
    const jahreszeit = state && state.today && state.today.season
      ? state.today.season.id : null;

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

    // Drei verschiedene Dinge einer Gruppe
    if (type === 'set') {
      const gruppe = randPick(rng, SET_KEYS);
      const pool = SET_POOLS[gruppe].slice();
      const wieviele = Math.min(pool.length, rng() < 0.35 ? 4 : 3);
      const items = [];
      for (let i = 0; i < wieviele && pool.length; i++) {
        items.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      }
      const q = this._base(spiritId, QTYPE.SET, items.length, day);
      q.items = items;
      q.setKey = gruppe;
      q.setName = SET_NAMES[gruppe];
      q.rewards = rewardFor(QTYPE.SET, items.length, scale, rng);
      return q;
    }

    // Botengang zu einem anderen Geist
    if (type === 'deliver') {
      const andere = SPIRIT_IDS.filter(function (id) {
        return id !== spiritId && world.isUnlocked(SPIRITS[id].region);
      });
      if (!andere.length) return null;
      const ziel = randPick(rng, andere);
      const q = this._base(spiritId, QTYPE.DELIVER, randInt(rng, 2, 4), day);
      q.itemId = randPick(rng, DELIVER_POOL);
      q.turnInAt = ziel;
      q.rewards = rewardFor(QTYPE.DELIVER, q.need, scale, rng);
      return q;
    }

    // Aus dem eigenen Beet
    if (type === 'grow') {
      const q = this._base(spiritId, QTYPE.GROW, randInt(rng, 2, 4), day);
      q.itemId = randPick(rng, ['berry', 'herb', 'flower_pink', 'flower_yellow',
        'flower_violet', 'flower_white']);
      q.rewards = rewardFor(QTYPE.GROW, q.need, scale, rng);
      return q;
    }

    if (type === 'fish') {
      const count = randInt(rng, 2, 4);
      const q = this._base(spiritId, QTYPE.FISH, count, day);
      q.rewards = rewardFor(QTYPE.FISH, count, scale, rng);
      return q;
    }

    if (type === 'catch') {
      const q = this._base(spiritId, QTYPE.CATCH, 1, day);
      // Nur, was jetzt auch beißt. Sonst bittet ein Geist im Winter um den
      // Goldkarpfen, und die Bitte läuft nach fünf Tagen ungelöst ab – der
      // Fisch steht bis zum Frühling nicht im Wasser.
      const pool = fishesOf(spirit.water || 'sea', true, jahreszeit);
      if (!pool.length) return null;
      q.itemId = randPick(rng, pool).id;
      q.rewards = rewardFor(QTYPE.CATCH, 1, scale, rng);
      return q;
    }

    // Dieselbe Mechanik wie beim Fisch, anderes Ziel: ein bestimmter Falter.
    // Nachtfalter fliegen nur nachts – das ist ein Grund, abends draußen zu
    // bleiben, statt sofort schlafen zu gehen.
    if (type === 'catch_bug') {
      const q = this._base(spiritId, QTYPE.CATCH, 1, day);
      const pool = bugsOf(rng() < 0.4, jahreszeit);
      if (!pool.length) return null;
      q.itemId = randPick(rng, pool).id;
      q.rewards = rewardFor(QTYPE.CATCH, 1, scale, rng);
      return q;
    }

    if (type === 'visit') {
      const q = this._base(spiritId, QTYPE.VISIT, 1, day);
      const spiritEnt = world.spiritEntity(spiritId);
      const spot = world.randomSpot(rng, spirit.region, spiritEnt
        ? { x: spiritEnt.x, y: spiritEnt.y, r: 600 }
        : null);
      q.spot = { x: Math.round(spot.x), y: Math.round(spot.y) };
      q.rewards = rewardFor(QTYPE.VISIT, 1, scale, rng);
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
      // Gezaehlt werden Gemuetlichkeitspunkte, nicht Stuecke: sonst waeren
      // drei Steinwege fuer 24 Muenzen dasselbe wie eine Mondlaterne.
      // Die Forderung liegt ueber dem, was schon dasteht – sonst waere die
      // Aufgabe im Moment ihrer Vergabe bereits erfuellt.
      const has = charmAround(world, spiritId, getItem);
      const count = has + randInt(rng, 4, 8);
      const q = this._base(spiritId, QTYPE.DECORATE, count, day);
      q.rewards = rewardFor(QTYPE.DECORATE, count - has, scale, rng);
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
      expires: day + lifetimeOf(type),
      rewards: { coins: 0, ember: 0, items: [] },
      hiddenIds: null,
      // Nur bei Sammelbitten belegt: die geforderten Sorten und ihre Gruppe.
      items: null,
      setKey: null,
      setName: null,
      // Nur beim Botengang belegt: wo abgegeben wird.
      turnInAt: null,
    };
  }

  /* ---------- Fortschritt ---------- */

  /** Fortschritt eines Auftrags (0..need). */
  progress(q, ctx) {
    switch (q.type) {
      case QTYPE.GATHER:
      case QTYPE.CRAFT:
      case QTYPE.DELIVER:
      case QTYPE.GROW:
        return Math.min(q.need, ctx.inventory.count(q.itemId));
      case QTYPE.SET: {
        // Gezählt wird, wie viele der geforderten Sorten überhaupt dabei sind –
        // nicht die Stückzahl. Ein Sack voll Beeren erfüllt nichts, wenn die
        // Sternblume fehlt.
        let da = 0;
        for (let i = 0; i < q.items.length; i++) {
          if (ctx.inventory.count(q.items[i]) > 0) da++;
        }
        return Math.min(q.need, da);
      }
      case QTYPE.DECORATE:
        return Math.min(q.need, charmAround(ctx.world, q.spirit, getItem));
      default:
        return Math.min(q.need, q.have);
    }
  }

  /**
   * Bitten, die bei DIESEM Geist abgegeben werden.
   *
   * Bei einem Botengang ist das nicht der, der sie gestellt hat – und genau
   * darum geht es: Man muss wissen, wohin.
   */
  openAtSpirit(id) {
    return this.quests.filter(function (q) {
      return !q.turnedIn && (q.turnInAt || q.spirit) === id;
    });
  }

  isReady(q, ctx) {
    return !q.turnedIn && this.progress(q, ctx) >= q.need;
  }

  /** Meldet ein Ereignis an alle passenden Aufträge. */
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
      } else if ((event === 'fish' || event === 'catch') && q.type === QTYPE.CATCH &&
                 q.have < q.need && payload && payload.id === q.itemId) {
        q.have = q.need;
        changed = true;
      } else if (event === 'visit' && q.type === QTYPE.VISIT && q.have < q.need && q.spot) {
        const dx = payload.x - q.spot.x;
        const dy = payload.y - q.spot.y;
        if (dx * dx + dy * dy < 110 * 110) { q.have = q.need; changed = true; }
      }
    }
    return changed;
  }

  /** Erledigt einen Auftrag und liefert die Belohnung zurück. */
  turnIn(q, ctx) {
    if (q.turnedIn) return null;
    if (!this.isReady(q, ctx)) return null;

    if (q.type === QTYPE.GATHER || q.type === QTYPE.CRAFT ||
        q.type === QTYPE.DELIVER || q.type === QTYPE.GROW) {
      ctx.inventory.remove(q.itemId, q.need);
    } else if (q.type === QTYPE.SET) {
      // Von jeder Sorte genau eines – nicht der ganze Stapel.
      for (let i = 0; i < q.items.length; i++) ctx.inventory.remove(q.items[i], 1);
    }
    q.turnedIn = true;
    this.completedBySpirit[q.spirit] = (this.completedBySpirit[q.spirit] || 0) + 1;
    this.totalCompleted++;

    const idx = this.quests.indexOf(q);
    if (idx >= 0) this.quests.splice(idx, 1);
    return q.rewards;
  }

  /** Aufräumen: versteckte Gegenstände eines Auftrags entfernen. */
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
    // Ältere Spielstände kennen noch keine Frist. Sie nachzutragen ist besser,
    // als diese Aufträge für immer stehen zu lassen: sonst blieben die Plätze
    // bei jedem, der schon gespielt hat, dauerhaft blockiert.
    for (let i = 0; i < qb.quests.length; i++) {
      const q = qb.quests[i];
      if (q.expires == null) q.expires = (q.day || 1) + lifetimeOf(q.type);
    }
    // Zusammenführen statt ersetzen: Ein Spielstand von vor dem siebten Geist
    // kennt ihn nicht, und dann stünde für ihn `undefined` statt einer Null.
    if (data.done) {
      for (const id in data.done) qb.completedBySpirit[id] = data.done[id] | 0;
    }
    qb.totalCompleted = data.total || 0;
    return qb;
  }
}

function rewardFor(type, count, scale, rng, item) {
  const perUnit = {
    gather: item ? Math.max(6, item.value * 1.6) : 10,
    // Eine Sammelbitte kostet mehr Wege als eine Holbitte – das muss sich
    // lohnen, sonst nimmt man lieber dreimal Holz.
    set: 34,
    // Ein Botengang kostet vor allem Laufweg.
    deliver: 26,
    // Ein Beet steht zwei bis vier Tage, bevor es etwas hergibt.
    grow: 32,
    find: 26,
    fish: 20,
    catch: 70,
    visit: 54,
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

/** Kurzbeschreibung für die Oberfläche – Symbol + Zahl, kein Fließtext. */
export function questIcon(q) {
  switch (q.type) {
    case QTYPE.SET: return 'icon_' + q.items[0];
    case QTYPE.DELIVER: return 'icon_' + q.itemId;
    case QTYPE.GROW: return 'icon_seed_berry';
    case QTYPE.FIND: return 'icon_' + q.itemId;
    case QTYPE.FISH: return 'icon_fish_trout';
    case QTYPE.CATCH: return 'icon_' + q.itemId;
    case QTYPE.VISIT: return 'icon_map';
    case QTYPE.BURN: return 'icon_campfire';
    case QTYPE.CRAFT: return 'icon_' + q.itemId;
    case QTYPE.DECORATE: return 'icon_flowerbed';
    default: return 'icon_' + q.itemId;
  }
}

export const QUEST_VERB = {
  set: 'sammeln',
  deliver: 'überbringen',
  grow: 'anbauen',
  gather: 'bringen',
  find: 'finden',
  fish: 'angeln',
  catch: 'fangen',
  visit: 'hingehen',
  burn: 'verbrennen',
  craft: 'bauen',
  decorate: 'aufstellen',
};

export function questTitle(q) {
  const item = q.itemId ? getItem(q.itemId) : null;
  switch (q.type) {
    case QTYPE.SET: return (q.setName || 'Allerlei') + ' sammeln';
    case QTYPE.DELIVER: {
      const zu = SPIRITS[q.turnInAt];
      return (item ? item.name : 'Etwas') + ' zu ' + (zu ? zu.name : 'jemandem');
    }
    case QTYPE.GROW: return (item ? item.name : 'Etwas') + ' anbauen';
    case QTYPE.FIND: return (item ? item.name : 'Erinnerung') + ' finden';
    case QTYPE.FISH: return 'Fische angeln';
    case QTYPE.CATCH: return (item ? item.name : 'Fisch') + ' fangen';
    case QTYPE.VISIT: return 'Nachsehen gehen';
    case QTYPE.BURN: return 'Im Feuer verbrennen';
    case QTYPE.CRAFT: return (item ? item.name : 'Gegenstand') + ' bauen';
    case QTYPE.DECORATE: return 'Gemütlicher machen';
    default: return (item ? item.name : 'Material') + ' bringen';
  }
}

export { MEMORY_IDS, CAT, TILE_SIZE };
