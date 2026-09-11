/**
 * Angeln – ein kurzes Minispiel:
 * auswerfen · warten · beim Biss reagieren · den Marker in der Zone stoppen.
 */
import { pickWeighted, clamp } from '../core/util.js';
import { fishesOf } from './items.js';
import { randRange } from '../core/rng.js';

/**
 * Wurfweite: So weit vor der Figur landet der Schwimmer.
 *
 * Steht hier und nicht im Spiel, weil das Angeln entscheidet, was ein Wurf
 * ist. Der Hinweis „Angeln" und der Vorrang vor der Ernte lesen denselben
 * Wert – vorher rechnete das Spiel mit 26 px und das Angeln mit 104.
 */
export const CAST_REACH = 104;

export const FISH_STATE = {
  IDLE: 'idle',
  CAST: 'cast',
  WAIT: 'wait',
  BITE: 'bite',
  REEL: 'reel',
  DONE: 'done',
};

export class Fishing {
  constructor() {
    this.state = FISH_STATE.IDLE;
    this.timer = 0;
    this.bobber = { x: 0, y: 0 };
    this.marker = 0;
    this.markerDir = 1;
    this.markerSpeed = 1;
    this.zoneStart = 0.4;
    this.zoneSize = 0.24;
    this.fish = null;
    /** Fisch-Kennung, die heute besonders oft beißt – oder null. */
    this.boost = null;
    /** Stärkung des Tages: seltene Fische beißen öfter an. 0 = keine. */
    this.glueck = 0;
    this.result = null;
    this.hint = '';
  }

  get active() {
    return this.state !== FISH_STATE.IDLE;
  }

  /** Wirft aus. Gibt false zurück, wenn dort kein Wasser ist. */
  cast(world, player, rng, night, rodLevel, season) {
    if (this.active) return false;
    const p = player.facingPoint(CAST_REACH);
    if (!world.waterAt(p.x, p.y)) return false;

    const kind = world.waterKind(p.x, p.y);
    const pool = fishesOf(kind, night, season);
    if (!pool.length) return false;

    // Am Fischschwarmtag steht eine Art dick vor der Küste. Das ist der
    // einzige Weg, an einen sehr seltenen Fisch verlässlich heranzukommen –
    // sonst hängt er allein am Glück.
    const boost = this.boost;
    // „Glücklich" aus der Küche: Seltenes zählt doppelt. Das verschiebt die
    // Verteilung spürbar, ohne den Schwarmtag zu entwerten – der gibt einer
    // EINZIGEN Art das Zwölffache, hier bekommen alle seltenen das Doppelte.
    const glueck = this.glueck || 0;
    const weighted = pool.map(function (f) {
      let w = 1 / (f.rarity * f.rarity);
      if (glueck && f.rarity >= 3) w *= 1 + glueck;
      return { f: f, weight: f.id === boost ? w * 12 : w };
    });
    this.fish = pickWeighted(weighted, rng).f;
    this.bobber.x = p.x;
    this.bobber.y = p.y;
    this.state = FISH_STATE.CAST;
    this.timer = 0.4;
    this.result = null;
    this.hint = 'Auswerfen …';

    // Schwierigkeit: seltene Fische sind flinker, bessere Angeln helfen.
    const lvl = rodLevel || 1;
    this.markerSpeed = 0.65 + this.fish.rarity * 0.16;
    this.zoneSize = clamp(0.34 - this.fish.rarity * 0.035 + (lvl - 1) * 0.06, 0.1, 0.44);
    this.zoneStart = randRange(rng, 0.12, 0.88 - this.zoneSize);
    this.marker = 0;
    this.markerDir = 1;
    this._waitTime = randRange(rng, 1.1, 4.2);
    return true;
  }

  /** @returns {string|null} Ereignis: 'bite' | 'catch' | 'miss' | 'escape' */
  update(dt) {
    switch (this.state) {
      case FISH_STATE.CAST:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = FISH_STATE.WAIT;
          this.timer = this._waitTime;
          this.hint = 'Warten …';
        }
        return null;

      case FISH_STATE.WAIT:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = FISH_STATE.BITE;
          this.timer = 1.0;
          this.hint = 'Jetzt!';
          return 'bite';
        }
        return null;

      case FISH_STATE.BITE:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = FISH_STATE.IDLE;
          this.hint = '';
          return 'escape';
        }
        return null;

      case FISH_STATE.REEL: {
        this.marker += this.markerDir * this.markerSpeed * dt;
        if (this.marker >= 1) { this.marker = 1; this.markerDir = -1; }
        if (this.marker <= 0) { this.marker = 0; this.markerDir = 1; }
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = FISH_STATE.IDLE;
          this.hint = '';
          return 'miss';
        }
        return null;
      }

      default:
        return null;
    }
  }

  /** Reaktion auf die Aktionstaste. */
  press() {
    if (this.state === FISH_STATE.BITE) {
      this.state = FISH_STATE.REEL;
      this.timer = 6;
      this.hint = 'In der Zone stoppen';
      return 'hooked';
    }
    if (this.state === FISH_STATE.REEL) {
      const inZone = this.marker >= this.zoneStart && this.marker <= this.zoneStart + this.zoneSize;
      const center = this.zoneStart + this.zoneSize / 2;
      const perfect = Math.abs(this.marker - center) < this.zoneSize * 0.18;
      this.state = FISH_STATE.IDLE;
      this.hint = '';
      if (inZone) {
        this.result = { fish: this.fish, perfect: perfect };
        return 'catch';
      }
      return 'miss';
    }
    return null;
  }

  cancel() {
    this.state = FISH_STATE.IDLE;
    this.hint = '';
    this.result = null;
  }
}
