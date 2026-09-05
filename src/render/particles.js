/** Kleine Partikel: Spaene, Staub, Funken, Glueckskaefer, Farbausbruch. */
import { randRange } from '../core/rng.js';

const MAX = 320;

export class Particles {
  constructor(rng) {
    this.list = [];
    this.rng = rng || Math.random;
  }

  clear() {
    this.list.length = 0;
  }

  _push(p) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(p);
  }

  burst(type, x, y, count, opts) {
    const o = opts || {};
    const n = count || 6;
    for (let i = 0; i < n; i++) this.spawn(type, x, y, o);
  }

  spawn(type, x, y, opts) {
    const rng = this.rng;
    const o = opts || {};
    const p = {
      type: type,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 1,
      size: 1,
      color: '#ffffff',
      gravity: 0,
      z: 0,
    };
    switch (type) {
      case 'chip':
        p.vx = randRange(rng, -28, 28);
        p.vy = randRange(rng, -46, -14);
        p.gravity = 130;
        p.life = p.maxLife = randRange(rng, 0.35, 0.65);
        p.size = 2;
        p.color = o.color || '#8a6242';
        break;
      case 'dust':
        p.vx = randRange(rng, -14, 14);
        p.vy = randRange(rng, -10, -2);
        p.life = p.maxLife = randRange(rng, 0.3, 0.6);
        p.size = 2;
        p.color = o.color || '#a9855e';
        break;
      case 'leaf':
        p.vx = randRange(rng, -10, 10);
        p.vy = randRange(rng, 6, 16);
        p.life = p.maxLife = randRange(rng, 1.4, 2.6);
        p.size = 2;
        p.color = o.color || '#7cb567';
        p.sway = randRange(rng, 0.6, 1.6);
        break;
      case 'spark':
        p.vx = randRange(rng, -10, 10);
        p.vy = randRange(rng, -26, -12);
        p.life = p.maxLife = randRange(rng, 0.5, 1.0);
        p.size = 1;
        p.color = rng() < 0.5 ? '#ffd88a' : '#ff9a3c';
        break;
      case 'firefly':
        p.vx = randRange(rng, -6, 6);
        p.vy = randRange(rng, -4, 4);
        p.life = p.maxLife = randRange(rng, 3, 7);
        p.size = 1;
        p.color = '#e9f39a';
        p.sway = randRange(rng, 0.5, 1.4);
        break;
      case 'sparkle':
        p.vx = randRange(rng, -6, 6);
        p.vy = randRange(rng, -16, -6);
        p.life = p.maxLife = randRange(rng, 0.5, 1.1);
        p.size = 1;
        p.color = '#f6f1e6';
        break;
      case 'color':
        p.vx = randRange(rng, -34, 34);
        p.vy = randRange(rng, -34, 8);
        p.life = p.maxLife = randRange(rng, 0.8, 1.6);
        p.size = 2;
        p.color = o.color || pickColor(rng);
        p.gravity = -6;
        break;
      case 'splash':
        p.vx = randRange(rng, -20, 20);
        p.vy = randRange(rng, -30, -10);
        p.gravity = 120;
        p.life = p.maxLife = randRange(rng, 0.25, 0.5);
        p.size = 1;
        p.color = '#cfe9f5';
        break;
      case 'heart':
        p.vx = randRange(rng, -6, 6);
        p.vy = randRange(rng, -22, -14);
        p.life = p.maxLife = 1.1;
        p.size = 2;
        p.color = '#e4657f';
        break;
      case 'coin':
        p.vx = randRange(rng, -18, 18);
        p.vy = randRange(rng, -40, -22);
        p.gravity = 90;
        p.life = p.maxLife = 0.8;
        p.size = 2;
        p.color = '#e8c34c';
        break;
      default:
        p.life = p.maxLife = 0.5;
        break;
    }
    if (o.color) p.color = o.color;
    this._push(p);
    return p;
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      if (p.sway) {
        p.x += Math.sin((p.maxLife - p.life) * p.sway * 3) * 8 * dt;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx, camX, camY) {
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const a = Math.min(1, p.life / (p.maxLife * 0.5));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const x = Math.round(p.x - camX);
      const y = Math.round(p.y - camY);
      if (p.type === 'heart') {
        ctx.fillRect(x - 1, y - 1, 1, 1);
        ctx.fillRect(x + 1, y - 1, 1, 1);
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y + 1, 1, 1);
      } else {
        ctx.fillRect(x, y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  get count() {
    return this.list.length;
  }
}

function pickColor(rng) {
  const cols = ['#e4657f', '#f0d264', '#9d7fd6', '#7ec36f', '#5aa9d6', '#e8a44c'];
  return cols[Math.floor(rng() * cols.length)];
}
