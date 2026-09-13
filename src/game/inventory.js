/** Tasche: Stapel mit begrenzter Platzzahl. */
import { getItem } from './items.js';

export class Inventory {
  constructor(capacity) {
    // `!= null`, nicht `||`: Null Fächer sind eine gültige Größe – die
    // Vorratstruhe fängt vor dem ersten Ausbau genau dort an.
    this.capacity = capacity != null ? capacity : 30;
    this.slots = [];
    /**
     * Fundbuch: was schon einmal in der Tasche lag, und wie viel davon
     * insgesamt. Es hängt hier und nicht am Spielstand, weil add() der
     * einzige Weg ist, auf dem etwas hereinkommt – gefunden, gekauft,
     * gefischt oder gebaut, alles läuft hier durch.
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

  /** Legt Gegenstände ab. Gibt zurück, wie viele wirklich Platz hatten. */
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

  /** Entfernt bis zu n Stück. Gibt zurück, wie viele entfernt wurden. */
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

  /**
   * Ginge dieser Tausch aus, ohne dass etwas verlorengeht?
   *
   * Beim Tausch ist das keine Höflichkeit, sondern Pflicht: Wer erst abgibt
   * und dann keinen Platz mehr hat, hätte drei Muscheln für nichts gegeben.
   * Der Festgruß darf eine Gabe verfallen lassen, ein Tausch nicht.
   *
   * Gerechnet wird auf einer KOPIE der Stapel, und zwar in der richtigen
   * Reihenfolge: erst das Weggeben (das macht vielleicht einen Platz frei),
   * dann das Bekommen. Andersherum – oder Stück für Stück gegen den
   * Ist-Zustand geprüft – zählt der zweite Gegenstand denselben freien Platz
   * noch einmal mit, und die Prüfung sagt Ja, wo sie Nein sagen müsste.
   *
   * @param {Array} weg  [{id, n}] was abgegeben wird
   * @param {Array} rein [{id, n}] was dafür kommt
   */
  passtNach(weg, rein) {
    const kopie = this.slots.map(function (s) { return { id: s.id, n: s.n }; });

    const raus = weg || [];
    for (let i = 0; i < raus.length; i++) {
      let left = raus[i].n == null ? 1 : raus[i].n;
      for (let j = kopie.length - 1; j >= 0 && left > 0; j--) {
        if (kopie[j].id !== raus[i].id) continue;
        const take = Math.min(kopie[j].n, left);
        kopie[j].n -= take;
        left -= take;
        if (kopie[j].n <= 0) kopie.splice(j, 1);
      }
      if (left > 0) return false;   // so viel ist gar nicht da
    }

    const dazu = rein || [];
    for (let i = 0; i < dazu.length; i++) {
      const item = getItem(dazu[i].id);
      if (!item) return false;
      const max = item.stack || 99;
      let left = dazu[i].n == null ? 1 : dazu[i].n;
      for (let j = 0; j < kopie.length && left > 0; j++) {
        if (kopie[j].id !== dazu[i].id || kopie[j].n >= max) continue;
        const take = Math.min(max - kopie[j].n, left);
        kopie[j].n += take;
        left -= take;
      }
      while (left > 0) {
        if (kopie.length >= this.capacity) return false;
        const take = Math.min(max, left);
        kopie.push({ id: dazu[i].id, n: take });
        left -= take;
      }
    }
    return true;
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
    // `!= null` statt einer Wahrheitsprüfung: Die Vorratstruhe hat vor dem
    // ersten Ausbau NULL Fächer, und mit `data.capacity ? …` wurden daraus
    // beim Laden dreißig – ein Lager, das niemand bezahlt hatte.
    const inv = new Inventory(data && data.capacity != null ? data.capacity : 30);
    if (data && data.slots) inv.slots = data.slots.filter(function (s) { return getItem(s.id); });
    if (data && data.found) {
      for (const id in data.found) {
        if (getItem(id)) inv.found[id] = data.found[id];
      }
    } else if (data && data.slots) {
      // Aeltere Spielstände kannten das Fundbuch noch nicht: was in der
      // Tasche liegt, gilt als gefunden.
      for (let i = 0; i < inv.slots.length; i++) {
        inv.found[inv.slots[i].id] = inv.slots[i].n;
      }
    }
    return inv;
  }
}
