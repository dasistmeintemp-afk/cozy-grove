/**
 * Kleintiere am Rand des Geschehens: Schmetterlinge bei Tag, Voegel, die
 * durchs Bild ziehen. Rein schmueckend – sie greifen nicht ins Spiel ein,
 * machen die Insel aber deutlich lebendiger.
 */
import { drawSprite } from '../art/sprites.js';
import { randRange } from '../core/rng.js';
import { isWalkable } from '../art/tiles.js';

const MAX = 9;

export class Wildlife {
  constructor(rng) {
    this.rng = rng || Math.random;
    this.list = [];
    this._spawnTimer = 0;
  }

  clear() {
    this.list.length = 0;
  }

  update(dt, camera, world, viewW, viewH, isDay) {
    const rng = this.rng;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.life -= dt;
      c.t += dt;

      if (c.type === 'butterfly') {
        c.x += Math.cos(c.dir) * c.speed * dt;
        c.y += Math.sin(c.dir) * c.speed * dt + Math.sin(c.t * 4) * 24 * dt;
        c.dir += Math.sin(c.t * 0.9 + c.phase) * 1.4 * dt;
        if (!isWalkable(world.tileAt(c.x, c.y))) c.dir += Math.PI * 0.6;
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
    if (this._spawnTimer > 0 || this.list.length >= MAX) return;
    this._spawnTimer = randRange(rng, 1.4, 4.5);
    if (!isDay) return;

    if (rng() < 0.72) this._spawnButterfly(camera, world, viewW, viewH);
    else this._spawnBird(camera, viewW, viewH);
  }

  _spawnButterfly(camera, world, viewW, viewH) {
    const rng = this.rng;
    for (let tries = 0; tries < 12; tries++) {
      const x = camera.ox + randRange(rng, 40, viewW - 40);
      const y = camera.oy + randRange(rng, 40, viewH - 40);
      if (!isWalkable(world.tileAt(x, y))) continue;
      this.list.push({
        type: 'butterfly',
        x: x, y: y,
        dir: randRange(rng, 0, Math.PI * 2),
        speed: randRange(rng, 34, 66),
        life: randRange(rng, 9, 20),
        t: 0,
        phase: randRange(rng, 0, 6.28),
        z: randRange(rng, 30, 70),
      });
      return;
    }
  }

  _spawnBird(camera, viewW, viewH) {
    const rng = this.rng;
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

  draw(ctx, camX, camY, time) {
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      const frame = Math.floor(time * (c.type === 'bird' ? 7 : 9) + c.phase) % 2;
      const name = (c.type === 'bird' ? 'bird_' : 'butterfly_') + frame;
      const flip = Math.cos(c.dir) < 0;
      // leichter Schatten am Boden
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#101a14';
      ctx.beginPath();
      ctx.ellipse(c.x - camX, c.y - camY, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawSprite(ctx, name, c.x - camX, c.y - camY - c.z, false, { flip: flip });
    }
  }
}
