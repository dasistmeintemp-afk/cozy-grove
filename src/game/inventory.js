/** Tasche: Stapel mit begrenzter Platzzahl. */
import { getItem } from './items.js';

export class Inventory {
  constructor(capacity) {
    this.capacity = capacity || 30;
    this.slots = [];
    /**
     * Fundbuch: was schon einmal in der Tasche lag, und wie viel davon
     * insgesamt. Es haengt hier und nicht am Spielstand, weil add() der
     * einzige Weg ist, auf dem etwas hereinkommt – gefunden, gekauft,
     * gefischt oder gebaut, alles laeuft hier durch.
     */
    this.found = Object.create(null);
  }

  /** Wurde das schon einmal gefunden? */
  everFound(id) {
    return !!this.found[id];
  }

  /** Wie viele verschiedene Dinge kennt das Fundbuch. */
  foundCount() {
    return Object.keys(this.found).length;
  }

  count(id) {
    let n = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].id === id) n += this.slots[i].n;
    }
    return n;
  }

  total() {
    let n = 0;
    for (let i = 0; i < this.slots.length; i++) n += this.slots[i].n;
    return n;
  }

  isFull() {
    return this.slots.length >= this.capacity;
  }

  freeSlots() {
    return Math.max(0, this.capacity - this.slots.length);
  }

  /** Legt Gegenstaende ab. Gibt zurueck, wie viele wirklich Platz hatten. */
  add(id, n) {
    const item = getItem(id);
    if (!item) return 0;
    let left = n == null ? 1 : n;
    const max = item.stack || 99;
    let added = 0;

    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (s.id !== id || s.n >= max) continue;
      const take = Math.min(max - s.n, left);
      s.n += take;
      left -= take;
      added += take;
    }
    while (left > 0 && this.slots.length < this.capacity) {
      const take = Math.min(max, left);
      this.slots.push({ id: id, n: take });
      left -= take;
      added += take;
    }
    if (added > 0) this.found[id] = (this.found[id] || 0) + added;
    return added;
  }

  /** Entfernt bis zu n Stueck. Gibt zurueck, wie viele entfernt wurden. */
  remove(id, n) {
    let left = n == null ? 1 : n;
    let removed = 0;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s.id !== id) continue;
      const take = Math.min(s.n, left);
      s.n -= take;
      left -= take;
      removed += take;
      if (s.n <= 0) this.slots.splice(i, 1);
    }
    return removed;
  }

  has(id, n) {
    return this.count(id) >= (n == null ? 1 : n);
  }

  /** Alle Stapel einer Kategorie. */
  byCategory(cat) {
    const out = [];
    for (let i = 0; i < this.slots.length; i++) {
      const item = getItem(this.slots[i].id);
      if (item && (!cat || item.cat === cat)) out.push({ index: i, slot: this.slots[i], item: item });
    }
    return out;
  }

  /** Kategorien, in denen etwas liegt. */
  usedCategories() {
    const seen = Object.create(null);
    const out = [];
    for (let i = 0; i < this.slots.length; i++) {
      const item = getItem(this.slots[i].id);
      if (!item || seen[item.cat]) continue;
      seen[item.cat] = true;
      out.push(item.cat);
    }
    return out;
  }

  sort() {
    const order = { material: 0, forage: 1, fish: 2, relic: 3, memory: 4, decor: 5 };
    this.slots.sort(function (a, b) {
      const ia = getItem(a.id);
      const ib = getItem(b.id);
      const ca = ia && order[ia.cat] != null ? order[ia.cat] : 9;
      const cb = ib && order[ib.cat] != null ? order[ib.cat] : 9;
      if (ca !== cb) return ca - cb;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : b.n - a.n;
    });
  }

  toJSON() {
    return { capacity: this.capacity, slots: this.slots, found: this.found };
  }

  static fromJSON(data) {
    const inv = new Inventory(data && data.capacity ? data.capacity : 30);
    if (data && data.slots) inv.slots = data.slots.filter(function (s) { return getItem(s.id); });
    if (data && data.found) {
      for (const id in data.found) {
        if (getItem(id)) inv.found[id] = data.found[id];
      }
    } else if (data && data.slots) {
      // Aeltere Spielstaende kannten das Fundbuch noch nicht: was in der
      // Tasche liegt, gilt als gefunden.
      for (let i = 0; i < inv.slots.length; i++) {
        inv.found[inv.slots[i].id] = inv.slots[i].n;
      }
    }
    return inv;
  }
}
