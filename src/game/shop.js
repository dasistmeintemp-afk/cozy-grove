/** Der Haendler: taeglich wechselndes Angebot und ein Gesuch des Tages. */
import { ITEM_LIST, getItem, CAT } from './items.js';
import { dailyRng, randInt, randPick } from '../core/rng.js';
import { shuffled as shuffleList } from '../core/util.js';

const BUY_POOL = [
  'lantern', 'bench', 'fence', 'flowerbed', 'birdhouse', 'windchime', 'rug', 'signpost', 'path_tile',
  'wood', 'stone', 'fiber', 'clay', 'resin', 'hardwood', 'copper_ore',
];

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
    this.wanted = randPick(rng, WANTED_POOL);
    this.wantedBonus = 2 + (rng() < 0.25 ? 1 : 0);
    this.day = day;
    return this;
  }

  /** Verkaufspreis inkl. Tagesgesuch. */
  sellPrice(id) {
    const it = getItem(id);
    if (!it || it.value <= 0) return 0;
    return id === this.wanted ? Math.round(it.value * this.wantedBonus) : it.value;
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
