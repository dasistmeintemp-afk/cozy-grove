/** Der Händler: täglich wechselndes Angebot und ein Gesuch des Tages. */
import { ITEM_LIST, getItem, CAT } from './items.js';
import { dailyRng, randInt, randPick } from '../core/rng.js';
import { shuffled as shuffleList } from '../core/util.js';

const BUY_POOL = [
  'lantern', 'bench', 'fence', 'flowerbed', 'birdhouse', 'windchime', 'rug', 'signpost', 'path_tile',
  'wood', 'stone', 'fiber', 'clay', 'resin', 'hardwood', 'copper_ore',
];

/**
 * Saat steht IMMER im Regal, nicht nur wenn der Zufall es will.
 *
 * Ein Garten, für den man tagelang auf das richtige Angebot warten muss, ist
 * kein Garten. Die Mondsaat ist die Ausnahme – sie kommt nur an manchen Tagen
 * und ist teuer genug, dass man sich freut, wenn sie da ist.
 */
const SEED_ALWAYS = ['seed_berry', 'seed_herb', 'seed_flower'];
const SEED_RARE = 'seed_moon';

const WANTED_POOL = ITEM_LIST
  .filter(function (i) { return i.value > 0 && i.cat !== CAT.MEMORY && i.cat !== CAT.DECOR; })
  .map(function (i) { return i.id; });

export function buyPrice(id) {
  const it = getItem(id);
  if (!it) return 0;
  const base = it.cat === CAT.DECOR ? it.value : Math.max(6, it.value * 2.4);
  return Math.round(base * (it.cat === CAT.DECOR ? 1.35 : 1));
}

export class Shop {
  constructor() {
    this.stock = [];
    this.wanted = null;
    this.wantedBonus = 2;
    /** Aufschlag aus dem Tagesereignis; 1 heißt: ein ganz normaler Tag. */
    this.dayBonus = 1;
    this.day = 0;
  }

  refresh(day, seed) {
    const rng = dailyRng(seed, day, 'shop');
    const pool = shuffleList(BUY_POOL, rng);
    const n = randInt(rng, 4, 6);
    this.stock = [];
    for (let i = 0; i < n && i < pool.length; i++) {
      const id = pool[i];
      const it = getItem(id);
      if (!it) continue;
      this.stock.push({
        id: id,
        left: it.cat === CAT.DECOR ? randInt(rng, 1, 2) : randInt(rng, 4, 9),
        price: buyPrice(id),
      });
    }
    // Saat zuerst, damit sie nicht von der Höchstzahl verdrängt wird
    for (let i = 0; i < SEED_ALWAYS.length; i++) {
      const it = getItem(SEED_ALWAYS[i]);
      if (!it) continue;
      this.stock.unshift({ id: it.id, left: randInt(rng, 2, 5), price: buyPrice(it.id) });
    }
    if (rng() < 0.34) {
      const mond = getItem(SEED_RARE);
      if (mond) this.stock.unshift({ id: mond.id, left: 1, price: buyPrice(mond.id) });
    }

    this.wanted = randPick(rng, WANTED_POOL);
    this.wantedBonus = 2 + (rng() < 0.25 ? 1 : 0);
    this.day = day;
    return this;
  }

  /** Verkaufspreis inkl. Tagesgesuch. */
  /**
   * Was der Händler zahlt.
   *
   * `dayBonus` ist der Aufschlag am Markttag. Er greift auch auf das Gesuch
   * des Tages – wer am Markttag genau das Gesuchte bringt, hat einen richtig
   * guten Tag, und das darf sich anfühlen wie einer.
   */
  sellPrice(id) {
    const it = getItem(id);
    if (!it || it.value <= 0) return 0;
    const basis = id === this.wanted ? it.value * this.wantedBonus : it.value;
    return Math.round(basis * (this.dayBonus || 1));
  }

  entry(id) {
    for (let i = 0; i < this.stock.length; i++) if (this.stock[i].id === id) return this.stock[i];
    return null;
  }

  take(id, n) {
    const e = this.entry(id);
    if (!e) return 0;
    const take = Math.min(e.left, n == null ? 1 : n);
    e.left -= take;
    return take;
  }

  toJSON() {
    return { stock: this.stock, wanted: this.wanted, bonus: this.wantedBonus, day: this.day };
  }

  static fromJSON(d) {
    const s = new Shop();
    if (!d) return s;
    s.stock = d.stock || [];
    s.wanted = d.wanted || null;
    s.wantedBonus = d.bonus || 2;
    s.day = d.day || 0;
    return s;
  }
}
