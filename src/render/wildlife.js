/**
 * Kleintiere am Rand des Geschehens.
 *
 *   Tag    Schmetterlinge über der Wiese, Vögel, die durchs Bild ziehen
 *   Nacht  Motten, die zum nächsten Licht streben
 *   immer  Fische, die im Wasser hochspringen
 *
 * Falter und Motten tragen eine Art (`species`) und lassen sich mit dem
 * Kescher fangen; Vögel und Fischsprünge bleiben Schmuck. Vorher war hier
 * alles nur Kulisse – man sah der Insel beim Leben zu, konnte aber nichts
 * davon anfassen.
 */
import { drawSprite } from '../art/sprites.js';
import { randRange } from '../core/rng.js';
import { isWalkable, isWater } from '../art/tiles.js';
import { bugsOf } from '../game/items.js';
import { tierGunst, TIER_RADIUS } from '../game/decor.js';

const MAX = 9;

/**
 * Am Falterzug fliegt mehr und öfter.
 *
 * Zwei Zahlen statt einer Sonderbehandlung: die Höchstzahl gleichzeitig und
 * wie schnell nachkommt. So bleibt der Rest der Datei frei von Ereignissen.
 */
const SCHWARM_MAX = 16;

export class Wildlife {
  constructor(rng) {
    this.rng = rng || Math.random;
    this.list = [];
    this._spawnTimer = 0;
    /** Falterzug: mehr Falter, und sie kommen schneller nach. */
    this.swarm = false;
    /** Jahreszeit – manche Falter fliegen nur zu ihrer. Null heißt: alle. */
    this.season = null;
    /** Wird beim Fischsprung gerufen – das Spiel hängt dort den Klang an. */
    this.onJump = null;
  }

  clear() {
    this.list.length = 0;
  }

  /**
   * @param {Array} lights Lichtquellen {x, y, r} – Motten steuern darauf zu
   */
  update(dt, camera, world, viewW, viewH, isDay, lights) {
    const rng = this.rng;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.life -= dt;
      c.t += dt;
      // Nach einem Fehlschlag ist der Falter für zwei Sekunden hektisch:
      // Zuschlagen ohne Ziel soll etwas kosten, sonst wischt man blind.
      if (c.flee > 0) c.flee = Math.max(0, c.flee - dt);
      const hast = c.flee > 0 ? 2.3 : 1;

      if (c.type === 'butterfly') {
        c.x += Math.cos(c.dir) * c.speed * hast * dt;
        c.y += Math.sin(c.dir) * c.speed * hast * dt + Math.sin(c.t * 4) * 24 * dt;
        c.dir += Math.sin(c.t * 0.9 + c.phase) * 1.4 * dt;
        if (!isWalkable(world.tileAt(c.x, c.y))) c.dir += Math.PI * 0.6;
      } else if (c.type === 'moth') {
        // Motten taumeln, ziehen aber zum nächsten Licht
        const target = nearestLight(lights, c.x, c.y);
        if (target) {
          const want = Math.atan2(target.y - c.y, target.x - c.x);
          let diff = want - c.dir;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          c.dir += diff * 1.1 * dt;
        }
        c.dir += Math.sin(c.t * 5.5 + c.phase) * 2.6 * dt;
        c.x += Math.cos(c.dir) * c.speed * hast * dt;
        c.y += Math.sin(c.dir) * c.speed * hast * dt + Math.sin(c.t * 7) * 22 * dt;
      } else if (c.type === 'jump') {
        // Fischsprung: eine kurze Wurfparabel, danach ist er weg
        c.t += 0;
        c.z = Math.max(0, Math.sin((1 - c.life / c.maxLife) * Math.PI) * c.high);
        c.x += Math.cos(c.dir) * c.speed * dt;
        c.y += Math.sin(c.dir) * c.speed * dt;
      } else {
        c.x += Math.cos(c.dir) * c.speed * dt;
        c.y += Math.sin(c.dir) * c.speed * dt + Math.sin(c.t * 2.2) * 40 * dt;
      }

      const margin = 260;
      const off = c.x < camera.ox - margin || c.x > camera.ox + viewW + margin ||
        c.y < camera.oy - margin || c.y > camera.oy + viewH + margin;
      if (c.life <= 0 || off) this.list.splice(i, 1);
    }

    this._spawnTimer -= dt;
    const grenze = this.swarm ? SCHWARM_MAX : MAX;
    if (this._spawnTimer > 0 || this.list.length >= grenze) return;
    this._spawnTimer = this.swarm ? randRange(rng, 0.5, 1.6) : randRange(rng, 1.4, 4.5);

    // Ein Fischsprung ist zu jeder Tageszeit möglich
    if (rng() < 0.3 && this._spawnJump(camera, world, viewW, viewH)) return;

    if (!isDay) {
      this._spawnMoth(camera, world, viewW, viewH);
      return;
    }
    if (rng() < 0.72) this._spawnButterfly(camera, world, viewW, viewH);
    else this._spawnBird(camera, world, viewW, viewH);
  }

  /**
   * Ein Platz im Bild, an dem ein Tier auftauchen darf.
   *
   * Hier hängt die Deko dran: Eine Vogeltränke zieht an, eine Vogelscheuche
   * hält fern. Beides war vorher nur ein Charmewert – eine Tränke ohne
   * Vögel, während über der Insel welche fliegen.
   *
   * „Der beste aus mehreren Versuchen" statt reiner Ablehnung: Gäbe man nur
   * verscheuchte Plätze zurück, stünde die Insel bei einer Vogelscheuche im
   * Bild ganz still. So verschiebt sich das Leben, statt aufzuhören.
   */
  _platz(camera, world, viewW, viewH) {
    const rng = this.rng;
    let ersatz = null;
    for (let tries = 0; tries < 12; tries++) {
      const x = camera.ox + randRange(rng, 40, viewW - 40);
      const y = camera.oy + randRange(rng, 40, viewH - 40);
      if (!isWalkable(world.tileAt(x, y))) continue;
      const gunst = world.queryNear
        ? tierGunst(world.queryNear(x, y, TIER_RADIUS), x, y) : 1;
      if (gunst === 0) continue;
      if (gunst > 1) return { x: x, y: y };
      if (!ersatz) ersatz = { x: x, y: y };
    }
    return ersatz;
  }

  _spawnMoth(camera, world, viewW, viewH) {
    const rng = this.rng;
    const p = this._platz(camera, world, viewW, viewH);
    if (!p) return;
    const art = pickSpecies(rng, true, this.season);
    this.list.push({
      type: 'moth',
      species: art.id,
      x: p.x, y: p.y,
      dir: randRange(rng, 0, Math.PI * 2),
      speed: randRange(rng, 42, 78) * (art.flight || 1),
      life: randRange(rng, 8, 16),
      t: 0,
      phase: randRange(rng, 0, 6.28),
      z: randRange(rng, 34, 76),
      flee: 0,
    });
  }

  /** Sucht offenes Wasser im Bild und lässt dort einen Fisch springen. */
  _spawnJump(camera, world, viewW, viewH) {
    const rng = this.rng;
    for (let tries = 0; tries < 14; tries++) {
      const x = camera.ox + randRange(rng, 60, viewW - 60);
      const y = camera.oy + randRange(rng, 60, viewH - 60);
      if (!isWater(world.tileAt(x, y))) continue;
      const life = randRange(rng, 0.7, 1.0);
      this.list.push({
        type: 'jump',
        x: x, y: y,
        dir: randRange(rng, 0, Math.PI * 2),
        speed: randRange(rng, 26, 52),
        life: life, maxLife: life,
        high: randRange(rng, 26, 44),
        t: 0,
        phase: randRange(rng, 0, 6.28),
        z: 0,
      });
      if (this.onJump) this.onJump(x, y);
      return true;
    }
    return false;
  }

  _spawnButterfly(camera, world, viewW, viewH) {
    const rng = this.rng;
    const p = this._platz(camera, world, viewW, viewH);
    if (!p) return;
    const art = pickSpecies(rng, false, this.season);
    this.list.push({
      type: 'butterfly',
      species: art.id,
      x: p.x, y: p.y,
      dir: randRange(rng, 0, Math.PI * 2),
      speed: randRange(rng, 34, 66) * (art.flight || 1),
      life: randRange(rng, 9, 20),
      t: 0,
      phase: randRange(rng, 0, 6.28),
      z: randRange(rng, 30, 70),
      flee: 0,
    });
  }

  /**
   * Ein Vogel zieht durchs Bild.
   *
   * Er kommt von der Seite und fliegt geradeaus – aber er kommt gar nicht
   * erst, wenn im Bild eine Vogelscheuche steht und keine Tränke. Der Vogel
   * hat kein Ziel im Bild, deshalb wird die Mitte gefragt.
   */
  _spawnBird(camera, world, viewW, viewH) {
    const rng = this.rng;
    const mx = camera.ox + viewW / 2;
    const my = camera.oy + viewH / 2;
    if (world && world.queryNear &&
        tierGunst(world.queryNear(mx, my, TIER_RADIUS), mx, my) === 0) return;
    const fromLeft = rng() < 0.5;
    this.list.push({
      type: 'bird',
      x: camera.ox + (fromLeft ? -150 : viewW + 150),
      y: camera.oy + randRange(rng, 40, viewH * 0.55),
      dir: fromLeft ? randRange(rng, -0.2, 0.2) : Math.PI + randRange(rng, -0.2, 0.2),
      speed: randRange(rng, 130, 220),
      life: 18,
      t: 0,
      phase: 0,
      z: randRange(rng, 84, 150),
    });
  }

  /**
   * Sucht den nächsten fangbaren Falter in einem Umkreis.
   * @returns {object|null} der Falter, oder null
   */
  catchableNear(x, y, radius) {
    let best = null;
    let bestD = radius * radius;
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      if (c.type !== 'butterfly' && c.type !== 'moth') continue;
      const dx = c.x - x;
      // Sie fliegen über dem Boden; für das Zielen zählt, wo sie zu sehen sind
      const dy = (c.y - c.z) - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  /** Nimmt einen Falter aus der Welt. */
  remove(c) {
    const i = this.list.indexOf(c);
    if (i >= 0) this.list.splice(i, 1);
  }

  /** Alle Falter im Umkreis schrecken auf. */
  scare(x, y, radius) {
    const r2 = radius * radius;
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      if (c.type !== 'butterfly' && c.type !== 'moth') continue;
      const dx = c.x - x;
      const dy = c.y - y;
      if (dx * dx + dy * dy > r2) continue;
      c.flee = 2;
      c.dir = Math.atan2(dy, dx);
    }
  }

  draw(ctx, camX, camY, time) {
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      const x = c.x - camX;
      const y = c.y - camY;

      if (c.type === 'jump') {
        this._drawJump(ctx, c, x, y);
        continue;
      }

      const frame = Math.floor(time * (c.type === 'bird' ? 7 : 9) + c.phase) % 2;
      const name = (c.type === 'bird' ? 'bird' : (c.species || 'butterfly')) + '_' + frame;
      const flip = Math.cos(c.dir) < 0;
      // leichter Schatten am Boden
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#101a14';
      ctx.beginPath();
      ctx.ellipse(x, y, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (c.type === 'moth') {
        // Nachtfalter etwas durchscheinend, aber in ihrer eigenen Farbe – der
        // Mondfalter ist sonst nicht vom Abendfalter zu unterscheiden, und
        // genau das soll man nachts sehen können.
        ctx.save();
        ctx.globalAlpha = 0.86;
        drawSprite(ctx, name, x, y - c.z, false, { flip: flip });
        ctx.restore();
        continue;
      }
      drawSprite(ctx, name, x, y - c.z, false, { flip: flip });
    }
  }

  /** Fischsprung: ein Körper mit Schwanzflosse und ein Ring auf dem Wasser. */
  _drawJump(ctx, c, x, y) {
    const t = 1 - c.life / c.maxLife;
    const left = Math.cos(c.dir) < 0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Zwei Ringe an der Absprungstelle, weiten sich und verblassen
    ctx.strokeStyle = '#ffffff';
    for (let k = 0; k < 2; k++) {
      const tt = t - k * 0.22;
      if (tt <= 0) continue;
      const r = 7 + tt * 30;
      ctx.globalAlpha = Math.max(0, 0.62 * (1 - tt) * (1 - k * 0.35));
      ctx.lineWidth = 2.4 - k * 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (c.z > 1) {
      const fy = y - c.z;
      const tilt = left ? 0.55 : -0.55;
      const dir = left ? -1 : 1;
      // Schwanzflosse zuerst, damit der Körper davor liegt
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#8fd0cd';
      ctx.beginPath();
      ctx.moveTo(x - dir * 9, fy + 1);
      ctx.lineTo(x - dir * 18, fy - 6);
      ctx.lineTo(x - dir * 17, fy + 7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#cfe9e4';
      ctx.beginPath();
      ctx.ellipse(x, fy, 12, 6, tilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a4038';
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Auge
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#4a4038';
      ctx.beginPath();
      ctx.arc(x + dir * 5, fy - 1.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Nächstgelegene Lichtquelle in Reichweite, sonst null. */
function nearestLight(lights, x, y) {
  if (!lights || !lights.length) return null;
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < lights.length; i++) {
    const L = lights[i];
    const dx = L.x - x;
    const dy = L.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD && d < 900 * 900) { bestD = d; best = L; }
  }
  return best;
}

/**
 * Wählt eine Art nach Gewicht. Der Mondfalter ist selten – ohne Gewichtung
 * wäre er so häufig wie der Zitronenfalter und damit nichts wert.
 */
function pickSpecies(rng, night, season) {
  const pool = bugsOf(night, season);
  if (!pool.length) return { id: 'butterfly', flight: 1 };
  let total = 0;
  for (let i = 0; i < pool.length; i++) total += pool[i].weight || 1;
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= pool[i].weight || 1;
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
