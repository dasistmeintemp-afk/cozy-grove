/** Kleine Partikel: Späne, Staub, Funken, Glückskäfer, Farbausbruch. */
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
        p.vx = randRange(rng, -112, 112);
        p.vy = randRange(rng, -184, -56);
        p.gravity = 520;
        p.life = p.maxLife = randRange(rng, 0.35, 0.65);
        p.size = 7;
        p.color = o.color || '#8a6242';
        break;
      case 'dust':
        p.vx = randRange(rng, -56, 56);
        p.vy = randRange(rng, -40, -8);
        p.life = p.maxLife = randRange(rng, 0.3, 0.6);
        p.size = 7;
        p.color = o.color || '#a9855e';
        break;
      case 'leaf':
        p.vx = randRange(rng, -40, 40);
        p.vy = randRange(rng, 24, 64);
        p.life = p.maxLife = randRange(rng, 1.4, 2.6);
        p.size = 7;
        p.color = o.color || '#7cb567';
        p.sway = randRange(rng, 0.6, 1.6);
        break;
      case 'spark':
        p.vx = randRange(rng, -40, 40);
        p.vy = randRange(rng, -104, -48);
        p.life = p.maxLife = randRange(rng, 0.5, 1.0);
        p.size = 4;
        p.color = rng() < 0.5 ? '#ffd88a' : '#ff9a3c';
        break;
      case 'firefly':
        p.vx = randRange(rng, -24, 24);
        p.vy = randRange(rng, -16, 16);
        p.life = p.maxLife = randRange(rng, 3, 7);
        p.size = 4;
        p.color = '#e9f39a';
        p.sway = randRange(rng, 0.5, 1.4);
        break;
      case 'sparkle':
        p.vx = randRange(rng, -24, 24);
        p.vy = randRange(rng, -64, -24);
        p.life = p.maxLife = randRange(rng, 0.5, 1.1);
        p.size = 4;
        p.color = '#f6f1e6';
        break;
      case 'color':
        p.vx = randRange(rng, -136, 136);
        p.vy = randRange(rng, -136, 32);
        p.life = p.maxLife = randRange(rng, 0.8, 1.6);
        p.size = 7;
        p.color = o.color || pickColor(rng);
        p.gravity = -24;
        break;
      case 'splash':
        p.vx = randRange(rng, -80, 80);
        p.vy = randRange(rng, -120, -40);
        p.gravity = 480;
        p.life = p.maxLife = randRange(rng, 0.25, 0.5);
        p.size = 4;
        p.color = '#cfe9f5';
        break;
      case 'heart':
        p.vx = randRange(rng, -24, 24);
        p.vy = randRange(rng, -88, -56);
        p.life = p.maxLife = 1.1;
        p.size = 7;
        p.color = '#e4657f';
        break;
      case 'coin':
        p.vx = randRange(rng, -72, 72);
        p.vy = randRange(rng, -160, -88);
        p.gravity = 360;
        p.life = p.maxLife = 0.8;
        p.size = 7;
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
        p.x += Math.sin((p.maxLife - p.life) * p.sway * 3) * 32 * dt;
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
      const x = p.x - camX;
      const y = p.y - camY;
      if (p.type === 'heart') {
        ctx.beginPath();
        ctx.arc(x - 3, y - 2, 3.4, 0, Math.PI * 2);
        ctx.arc(x + 3, y - 2, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 6, y);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 8);
        ctx.closePath();
        ctx.fill();
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
