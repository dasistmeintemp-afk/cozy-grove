/**
 * Bodenschicht in Stücken.
 *
 * Der ganze Inselboden auf einmal wäre bei dieser Auflösung zu groß für den
 * Speicher. Stattdessen wird er in Stücke zerlegt, die erst gemalt werden,
 * wenn sie ins Bild kommen – und mit einem Budget pro Bild, damit beim Laufen
 * nichts ruckelt.
 */
import { paintGroundChunk, CHUNK_TILES, CHUNK_PX, CHUNK_PAD, WASH_SCALE } from '../art/painted-ground.js';
import { INK } from '../art/painted.js';
import { TILE_SIZE } from '../art/tiles.js';

/**
 * Wie viele Stücke bleiben liegen.
 *
 * Der Wert wächst mit dem Blickfeld: Wären weniger Stücke im Speicher als
 * gerade sichtbar, würde das Malen eines Stücks ein anderes verdrängen, das im
 * selben Bild noch gebraucht wird – dessen Tinte fehlte dann, und man sähe ein
 * flaches Rechteck ohne Küstenlinie und Grasbüschel im Boden.
 */
const MIN_CACHE = 24;
const MAX_CACHE = 84;

/**
 * Wie viele Stücke ein Bild höchstens malen darf.
 *
 * Ein Stück kostet rund 14 ms. Bei zwei pro Bild ergab das Bildzeiten bis
 * 44 ms – einen sichtbaren Ruckler, genau die Sorte, die Spieler an solchen
 * Spielen stört. Mit einem pro Bild wird aus einem langen Bild eine Handvoll
 * knapper, und `paintAhead()` erledigt den Rest schon vorher.
 */
const BUDGET_PER_FRAME = 1;

export class GroundLayer {
  constructor(world) {
    this.world = world;
    this.w = world.w * TILE_SIZE;
    this.h = world.h * TILE_SIZE;
    this.cols = Math.ceil(world.w / CHUNK_TILES);
    this.rows = Math.ceil(world.h / CHUNK_TILES);
    this.cache = Object.create(null);
    this.order = [];
    this.budget = BUDGET_PER_FRAME;
    this.limit = MIN_CACHE;
    this.frame = 1;
  }

  /** Am Anfang jedes Bildes: Malbudget zurücksetzen. */
  beginFrame() {
    this.budget = BUDGET_PER_FRAME;
    this.frame++;
  }

  /** Platz für mindestens `n` Stücke schaffen (plus etwas Luft). */
  _ensureLimit(n) {
    const want = Math.min(MAX_CACHE, Math.max(MIN_CACHE, n + 4));
    if (want > this.limit) this.limit = want;
  }

  /**
   * Malt alle Stücke im Blickfeld sofort fertig – ohne Budget.
   * Wird beim Start und nach dem Schlafen aufgerufen, damit das erste Bild
   * vollständig ist. Sonst blitzen unfertige Stücke als harte Kanten auf,
   * weil Zeichnung und Farbe unterschiedlich weit sind.
   */
  prewarm(camX, camY, viewW, viewH) {
    const cx0 = Math.floor((camX - CHUNK_PX) / CHUNK_PX);
    const cy0 = Math.floor((camY - CHUNK_PX) / CHUNK_PX);
    const cx1 = Math.floor((camX + viewW + CHUNK_PX) / CHUNK_PX);
    const cy1 = Math.floor((camY + viewH + CHUNK_PX) / CHUNK_PX);
    this._ensureLimit((cx1 - cx0 + 1) * (cy1 - cy0 + 1));
    const saved = this.budget;
    this.budget = 999;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) this._get(cx, cy, true);
    }
    this.budget = saved;
  }

  /**
   * Malt EIN Stück, das bald gebraucht wird, aber noch nicht sichtbar ist.
   *
   * Wird nur auf Bildern aufgerufen, die ohnehin schnell waren. Dadurch sind
   * die Stücke fertig, bevor die Kamera sie erreicht, und im Bild, in dem sie
   * auftauchen, ist nichts mehr zu tun.
   *
   * @returns {boolean} ob etwas gemalt wurde
   */
  paintAhead(camX, camY, viewW, viewH) {
    const cx0 = Math.floor((camX - CHUNK_PX) / CHUNK_PX);
    const cy0 = Math.floor((camY - CHUNK_PX) / CHUNK_PX);
    const cx1 = Math.floor((camX + viewW + CHUNK_PX) / CHUNK_PX);
    const cy1 = Math.floor((camY + viewH + CHUNK_PX) / CHUNK_PX);
    this._ensureLimit((cx1 - cx0 + 1) * (cy1 - cy0 + 1));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) continue;
        if (this.cache[this._key(cx, cy)]) continue;
        const saved = this.budget;
        this.budget = 1;
        const painted = this._get(cx, cy, true);
        this.budget = saved;
        return !!painted;
      }
    }
    return false;
  }

  /** Wird nach Kachelwechseln aufgerufen (Weg gelegt, Brücke gebaut). */
  markTileDirty(tx, ty) {
    const cx = Math.floor(tx / CHUNK_TILES);
    const cy = Math.floor(ty / CHUNK_TILES);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) this._drop(cx + dx, cy + dy);
    }
  }

  clear() {
    this.cache = Object.create(null);
    this.order.length = 0;
  }

  /** Alte Schnittstelle: ein kompletter Neuaufbau ist jetzt einfach ein Leeren. */
  buildAll() {
    this.clear();
    this.world.groundDirty = false;
  }

  flush() {
    if (this.world.groundDirty) {
      this.world.groundDirty = false;
    }
  }

  _key(cx, cy) {
    return cx + '|' + cy;
  }

  _drop(cx, cy) {
    const key = this._key(cx, cy);
    if (!this.cache[key]) return;
    delete this.cache[key];
    const i = this.order.indexOf(key);
    if (i >= 0) this.order.splice(i, 1);
  }

  _get(cx, cy, allowPaint) {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return null;
    const key = this._key(cx, cy);
    const hit = this.cache[key];
    if (hit) {
      hit.frame = this.frame;
      const at = this.order.indexOf(key);
      if (at >= 0 && at < this.order.length - 1) {
        this.order.splice(at, 1);
        this.order.push(key);
      }
      return hit;
    }
    if (!allowPaint || this.budget <= 0) return null;
    this.budget--;

    const chunk = paintGroundChunk(this.world, cx, cy);
    chunk.frame = this.frame;
    this.cache[key] = chunk;
    this.order.push(key);
    this._evict();
    return chunk;
  }

  /**
   * Ältestes Stück verwerfen – aber nie eines, das in diesem Bild schon
   * gezeichnet wurde. Sonst fehlte seine Tinte im laufenden Durchgang.
   */
  _evict() {
    while (this.order.length > this.limit) {
      let victim = -1;
      for (let i = 0; i < this.order.length; i++) {
        const c = this.cache[this.order[i]];
        if (!c || c.frame !== this.frame) { victim = i; break; }
      }
      if (victim < 0) return;
      const old = this.order.splice(victim, 1)[0];
      delete this.cache[old];
    }
  }

  /**
   * Zeichnet den sichtbaren Boden – in Weltkoordinaten, die Kamera steckt
   * bereits in der Transformation des Kontexts.
   * @param {boolean} pale unkolorierte Fassung (Papierschleier über die Farbe)
   */
  draw(ctx, viewX, viewY, viewW, viewH, pale, mayPaint) {
    // Nur der erste Durchgang darf neue Stücke malen. Sonst verbraucht die
    // Zeichnung das Budget und der Farbdurchgang findet Löcher vor – man sähe
    // die Stückgrenzen als harte Kanten in der Farbfläche.
    const allowPaint = mayPaint !== false;
    const cx0 = Math.floor(viewX / CHUNK_PX);
    const cy0 = Math.floor(viewY / CHUNK_PX);
    const cx1 = Math.floor((viewX + viewW) / CHUNK_PX);
    const cy1 = Math.floor((viewY + viewH) / CHUNK_PX);
    if (allowPaint) this._ensureLimit((cx1 - cx0 + 1) * (cy1 - cy0 + 1));

    // 1 – Farbflächen
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const chunk = this._get(cx, cy, allowPaint);
        if (chunk) {
          // Nur den Kern zeichnen: Der Malrand enthält Nachbardaten und würde
          // das benachbarte Stück überschreiben – das gäbe ein Rastermuster.
          ctx.drawImage(chunk.wash,
            CHUNK_PAD * WASH_SCALE, CHUNK_PAD * WASH_SCALE,
            CHUNK_PX * WASH_SCALE, CHUNK_PX * WASH_SCALE,
            cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX);
        } else {
          // Noch nicht gemalt: Papierton in BEIDEN Durchgängen, sonst klafft
          // zwischen Zeichnung und Farbe eine sichtbare Kante.
          ctx.fillStyle = INK.paper;
          ctx.fillRect(cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX);
        }
      }
    }

    // 2 – Papierschleier, wenn hier noch keine Farbe zurück ist
    if (pale) {
      ctx.save();
      ctx.globalAlpha = 0.76;
      ctx.fillStyle = INK.paper;
      ctx.fillRect(viewX - 4, viewY - 4, viewW + 8, viewH + 8);
      ctx.restore();
    }

    // 3 – Tinte bleibt immer sichtbar
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const chunk = this._get(cx, cy, false);
        if (chunk) {
          ctx.drawImage(chunk.ink, CHUNK_PAD, CHUNK_PAD, CHUNK_PX, CHUNK_PX,
            cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX);
        }
      }
    }
  }

  /** Nur für Fortschrittsanzeigen: wie viele Stücke liegen bereit? */
  get cachedCount() {
    return this.order.length;
  }
}

export { CHUNK_TILES, CHUNK_PX };
