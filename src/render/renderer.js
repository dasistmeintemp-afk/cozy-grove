/**
 * Szenen-Renderer.
 *
 * Ablauf pro Bild:
 *   1. entsaettigte Welt zeichnen
 *   2. farbige Welt in eine Zwischenflaeche zeichnen und durch die
 *      Farbmaske einblenden
 *   3. Wasserglitzern, Tagesfaerbung und Lichter
 *   4. Partikel und Markierungen
 */
import { makeCanvas, ctx2d, roundRectPath } from '../core/util.js';
import { drawSprite, spr } from '../art/sprites.js';
import { defOf } from '../world/entities.js';
import { getItem } from '../game/items.js';
import { campfireLevelFor } from '../game/recipes.js';
import { TILE_SIZE } from '../art/tiles.js';

const ALWAYS_COLOR = { spirit: 1, fox: 1, hidden: 1 };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.w = canvas.width;
    this.h = canvas.height;
    this.ctx = ctx2d(canvas, { alpha: false });
    this.colorCanvas = makeCanvas(this.w, this.h);
    this.colorCtx = ctx2d(this.colorCanvas);
    this.lightCanvas = makeCanvas(this.w, this.h);
    this.lightCtx = ctx2d(this.lightCanvas);
    this.fxCanvas = makeCanvas(this.w, this.h);
    this.fxCtx = ctx2d(this.fxCanvas);
    this._visible = [];
    this.stats = { entities: 0 };
  }

  draw(game, time) {
    const ctx = this.ctx;
    const cam = game.camera;
    const camX = cam.ox;
    const camY = cam.oy;
    const world = game.world;

    ctx.fillStyle = '#1b3a55';
    ctx.fillRect(0, 0, this.w, this.h);

    // 1 – entsaettigte Welt
    this._drawGround(ctx, game, camX, camY, true);
    const list = this._collectVisible(world, camX, camY);
    this._drawEntities(ctx, game, list, camX, camY, true, time);

    // 2 – Farbe einblenden
    const sources = game.colorField.visibleSources(camX, camY, this.w, this.h);
    if (sources.length) {
      const cc = this.colorCtx;
      cc.clearRect(0, 0, this.w, this.h);
      this._drawGround(cc, game, camX, camY, false);
      this._drawEntities(cc, game, list, camX, camY, false, time);
      cc.globalCompositeOperation = 'destination-in';
      game.colorField.drawMask(cc, camX, camY, sources);
      cc.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.colorCanvas, 0, 0);
    }

    // 3 – Wasser, Tageszeit, Licht
    this._drawWaterShimmer(ctx, game, camX, camY, time);
    this._drawLighting(ctx, game, camX, camY, time);

    // 4 – Kleintiere, Partikel und Hinweise
    game.wildlife.draw(ctx, camX, camY, time);
    game.particles.draw(ctx, camX, camY);
    this._drawMarkers(ctx, game, camX, camY, time);
    this._drawVignette(ctx);

    this.stats.entities = list.length;
  }

  _drawGround(ctx, game, camX, camY, gray) {
    const g = game.ground;
    const src = gray ? g.gray : g.color;
    const sx = Math.max(0, camX);
    const sy = Math.max(0, camY);
    const sw = Math.min(this.w, g.w - sx);
    const sh = Math.min(this.h, g.h - sy);
    if (sw <= 0 || sh <= 0) return;
    ctx.drawImage(src, sx, sy, sw, sh, sx - camX, sy - camY, sw, sh);
  }

  _collectVisible(world, camX, camY) {
    const pad = 64;
    const list = this._visible;
    list.length = 0;
    world.queryRect(camX - pad, camY - pad, this.w + pad * 2, this.h + pad * 2, list);
    const seen = Object.create(null);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (seen[e.id]) continue;
      seen[e.id] = true;
      if (e.gone) continue;
      out.push(e);
    }
    out.sort(function (a, b) {
      return (a.y + (a.zBias || 0)) - (b.y + (b.zBias || 0));
    });
    return out;
  }

  _drawEntities(ctx, game, list, camX, camY, gray, time) {
    const player = game.player;
    const playerY = player.y;
    let playerDrawn = false;

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!playerDrawn && e.y > playerY) {
        this._drawPlayer(ctx, game, camX, camY, time);
        playerDrawn = true;
      }
      this._drawEntity(ctx, game, e, camX, camY, gray, time);
    }
    if (!playerDrawn) this._drawPlayer(ctx, game, camX, camY, time);
  }

  _drawEntity(ctx, game, e, camX, camY, gray, time) {
    const def = defOf(e.kind);
    const useGray = gray && !ALWAYS_COLOR[e.kind];
    let sx = e.x - camX;
    let sy = e.y - camY;

    if (def && def.sway) {
      sx += Math.sin(time * 1.3 + e.phase) * 0.8;
    }

    switch (e.kind) {
      case 'spirit': {
        const bob = Math.sin(time * 1.7 + e.phase) * 2;
        const frame = Math.floor(time * 1.1 + e.phase) % 2;
        this._shadow(ctx, sx, sy, 7, useGray);
        drawSprite(ctx, 'spirit_' + e.spiritId + '_' + frame, sx, sy + bob, false, { alpha: 0.94 });
        return;
      }
      case 'fox': {
        const frame = Math.floor(time * 1.6 + e.phase) % 2;
        this._shadow(ctx, sx, sy, 7, useGray);
        drawSprite(ctx, 'fox_' + frame, sx, sy, false);
        return;
      }
      case 'campfire': {
        drawSprite(ctx, 'campfire', sx, sy, useGray);
        const lvl = campfireLevelFor(game.state.campfireFuel).level;
        const frame = Math.floor(time * 9) % 4;
        const scale = 0.6 + lvl * 0.12;
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy - 6));
        ctx.scale(scale, scale);
        drawSprite(ctx, 'flame_' + frame, 0, 0, false);
        ctx.restore();
        return;
      }
      case 'hidden': {
        const bob = Math.sin(time * 2.6 + e.phase) * 1.6;
        drawSprite(ctx, e.sprite, sx, sy + bob, false);
        // sanftes Leuchten
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(time * 3 + e.phase) * 0.12;
        ctx.fillStyle = '#fff6cf';
        ctx.beginPath();
        ctx.arc(Math.round(sx), Math.round(sy + bob - 6), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      case 'decor': {
        drawSprite(ctx, e.sprite, sx, sy, useGray);
        return;
      }
      case 'bridge_spot': {
        drawSprite(ctx, 'signpost', sx, sy, useGray);
        return;
      }
      default:
        break;
    }

    const name = e.sprite || (def && def.sprite);
    if (!name) return;
    if (e.hp != null && def && def.hits && e.hp < def.hits) {
      // angeschlagene Objekte zittern kurz
      const hitAge = time - (e.lastHit || -9);
      if (hitAge < 0.25) sx += Math.sin(hitAge * 60) * 1.5;
    }
    drawSprite(ctx, name, sx, sy, useGray);
  }

  _drawPlayer(ctx, game, camX, camY, time) {
    const p = game.player;
    const sx = p.x - camX;
    const sy = p.y - camY;
    this._shadow(ctx, sx, sy, 6, false);
    drawSprite(ctx, p.spriteName(), sx, sy, false, { flip: p.flipped() });

    // Werkzeug beim Einsatz
    if (p.swing > 0 && p.tool.sprite && p.tool.id !== 'hand') {
      const t = 1 - p.swing;
      const angle = (-0.9 + t * 2.1) * (p.dir === 'left' ? -1 : 1);
      const offX = p.dir === 'left' ? -7 : p.dir === 'right' ? 7 : (p.dir === 'up' ? 5 : -5);
      const offY = p.dir === 'up' ? -14 : -12;
      ctx.save();
      ctx.translate(Math.round(sx + offX), Math.round(sy + offY));
      ctx.rotate(angle);
      drawSprite(ctx, p.tool.sprite, 0, 0, false);
      ctx.restore();
    }

    // Angelschnur
    const f = game.fishing;
    if (f.active) {
      const bx = f.bobber.x - camX;
      const by = f.bobber.y - camY;
      ctx.strokeStyle = 'rgba(240,246,250,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(sx) + 0.5, Math.round(sy - 16) + 0.5);
      ctx.lineTo(Math.round(bx) + 0.5, Math.round(by) + 0.5);
      ctx.stroke();
      const bob = Math.sin(time * 5) * 1.2;
      ctx.fillStyle = f.state === 'bite' ? '#e2705f' : '#f6f1e6';
      ctx.fillRect(Math.round(bx) - 1, Math.round(by + bob) - 1, 3, 3);
    }
  }

  _shadow(ctx, sx, sy, r, gray) {
    ctx.save();
    ctx.globalAlpha = gray ? 0.18 : 0.24;
    ctx.fillStyle = '#101a14';
    ctx.beginPath();
    ctx.ellipse(Math.round(sx), Math.round(sy) - 1, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawWaterShimmer(ctx, game, camX, camY, time) {
    const fx = this.fxCtx;
    fx.clearRect(0, 0, this.w, this.h);
    fx.fillStyle = 'rgba(220, 244, 255, 0.16)';
    const off = (time * 9) % 48;
    for (let y = -48; y < this.h + 48; y += 24) {
      for (let x = -48; x < this.w + 48; x += 48) {
        const yy = y + Math.sin((x + time * 20) * 0.03) * 3;
        fx.fillRect(x + off - ((camX * 0.5) % 48), yy - ((camY * 0.5) % 24), 14, 1);
        fx.fillRect(x + off + 20 - ((camX * 0.5) % 48), yy + 8 - ((camY * 0.5) % 24), 8, 1);
      }
    }
    fx.globalCompositeOperation = 'destination-in';
    const g = game.ground;
    const sx = Math.max(0, camX);
    const sy = Math.max(0, camY);
    const sw = Math.min(this.w, g.w - sx);
    const sh = Math.min(this.h, g.h - sy);
    if (sw > 0 && sh > 0) {
      fx.drawImage(g.water, sx, sy, sw, sh, sx - camX, sy - camY, sw, sh);
    }
    fx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.fxCanvas, 0, 0);
  }

  _drawLighting(ctx, game, camX, camY, time) {
    const tint = game.day.tint();
    if (tint.a < 0.02) return;
    const lc = this.lightCtx;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.w, this.h);
    lc.fillStyle = 'rgba(' + tint.r + ',' + tint.g + ',' + tint.b + ',' + tint.a.toFixed(3) + ')';
    lc.fillRect(0, 0, this.w, this.h);

    if (game.day.isDark()) {
      lc.globalCompositeOperation = 'destination-out';
      const lights = game.lightSources(time);
      for (let i = 0; i < lights.length; i++) {
        const L = lights[i];
        const x = L.x - camX;
        const y = L.y - camY;
        if (x + L.r < 0 || x - L.r > this.w || y + L.r < 0 || y - L.r > this.h) continue;
        const grad = lc.createRadialGradient(x, y, 0, x, y, L.r);
        const a = L.a == null ? 0.95 : L.a;
        grad.addColorStop(0, 'rgba(0,0,0,' + a + ')');
        grad.addColorStop(0.55, 'rgba(0,0,0,' + (a * 0.6) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = grad;
        lc.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
      }
      lc.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(this.lightCanvas, 0, 0);
  }

  _drawMarkers(ctx, game, camX, camY, time) {
    // Ziel des aktiven Werkzeugs
    const t = game.target;
    if (t && t.entity) {
      const e = t.entity;
      const s = spr(e.sprite || (defOf(e.kind) && defOf(e.kind).sprite));
      const top = e.y - (s ? s.ay : 16) - 6;
      const bob = Math.sin(time * 5) * 1.2;
      this._chevron(ctx, e.x - camX, top - camY + bob, t.matches || !defOf(e.kind).tool ? '#f6f1e6' : '#8f98a4');
    }

    // Geister mit fertiger Aufgabe bekommen ein Ausrufezeichen
    const ready = game.spiritsWithReadyQuest();
    for (let i = 0; i < ready.length; i++) {
      const e = ready[i];
      const bob = Math.sin(time * 3 + e.phase) * 1.5;
      const x = Math.round(e.x - camX);
      const y = Math.round(e.y - camY - 34 + bob);
      ctx.fillStyle = '#f0d264';
      ctx.fillRect(x - 1, y, 3, 7);
      ctx.fillRect(x - 1, y + 9, 3, 3);
      ctx.fillStyle = 'rgba(20,26,20,0.5)';
      ctx.fillRect(x - 2, y + 12, 5, 1);
    }

    // Vorschau beim Aufstellen von Deko
    if (game.placing) {
      const p = game.placing;
      const ok = p.valid;
      ctx.save();
      ctx.globalAlpha = 0.7;
      drawSprite(ctx, p.sprite, p.x - camX, p.y - camY, false);
      ctx.restore();
      ctx.strokeStyle = ok ? 'rgba(143,209,119,0.9)' : 'rgba(226,112,95,0.9)';
      ctx.lineWidth = 1;
      roundRectPath(ctx, Math.round(p.x - camX) - 8, Math.round(p.y - camY) - 8, 16, 12, 3);
      ctx.stroke();
    }
  }

  _chevron(ctx, x, y, color) {
    const px = Math.round(x);
    const py = Math.round(y);
    ctx.fillStyle = 'rgba(20,26,20,0.45)';
    ctx.fillRect(px - 3, py + 1, 7, 1);
    ctx.fillStyle = color;
    ctx.fillRect(px - 3, py - 4, 7, 1);
    ctx.fillRect(px - 2, py - 3, 5, 1);
    ctx.fillRect(px - 1, py - 2, 3, 1);
    ctx.fillRect(px, py - 1, 1, 1);
  }

  _drawVignette(ctx) {
    if (!this._vignette) {
      const c = makeCanvas(this.w, this.h);
      const g = ctx2d(c);
      const grad = g.createRadialGradient(
        this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.32,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.72
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(8,12,16,0.34)');
      g.fillStyle = grad;
      g.fillRect(0, 0, this.w, this.h);
      this._vignette = c;
    }
    ctx.drawImage(this._vignette, 0, 0);
  }
}

export { TILE_SIZE, getItem };
