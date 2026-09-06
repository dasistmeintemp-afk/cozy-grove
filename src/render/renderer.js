/**
 * Szenen-Renderer.
 *
 * Ablauf pro Bild:
 *   1. Papier, dann die Insel als blasse Zeichnung
 *   2. dieselbe Szene koloriert in eine Zwischenfläche und durch die Farbmaske
 *      einblenden – so wächst Farbe nur dort, wo Geister zufrieden sind
 *   3. Tageszeit und Lichter
 *   4. Partikel, Kleintiere, Markierungen
 *
 * Gezeichnet wird durchgehend in Weltkoordinaten; Kamera und Zoom stecken in
 * der Transformation.
 */
import { makeCanvas, ctx2d, clamp } from '../core/util.js';
import { drawSprite, spr } from '../art/sprites.js';
import { defOf } from '../world/entities.js';
import { getItem } from '../game/items.js';
import { campfireLevelFor } from '../game/recipes.js';
import { INK } from '../art/painted.js';
import { TILE_SIZE } from '../art/tiles.js';

/** Diese Wesen behalten immer ihre Farbe – sie sind ja nicht verblasst. */
const ALWAYS_COLOR = { spirit: 1, fox: 1, hidden: 1 };

const REFERENCE_W = 1560;
const REFERENCE_H = 880;
const MAX_PIXELS = 2100000;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = ctx2d(canvas, { alpha: false });
    this.ctx.imageSmoothingEnabled = true;
    this.zoom = 1;
    this.w = canvas.width;
    this.h = canvas.height;
    this.viewW = this.w;
    this.viewH = this.h;
    this._visible = [];
    this.stats = { entities: 0, chunks: 0 };
    // Auflösungsfaktor: sinkt auf schwachen Geräten automatisch
    this.quality = 1;
    this._cssW = 0;
    this._cssH = 0;
    this._dpr = 1;
    this._frameAvg = 16;
    this._sinceChange = 0;
    this._alloc();
    this.updateZoom();
  }

  _alloc() {
    this.colorCanvas = makeCanvas(this.w, this.h);
    this.colorCtx = ctx2d(this.colorCanvas);
    this.colorCtx.imageSmoothingEnabled = true;
    this.lightCanvas = makeCanvas(this.w, this.h);
    this.lightCtx = ctx2d(this.lightCanvas);
    this.lightCtx.imageSmoothingEnabled = true;
    this._vignette = null;
  }

  /**
   * Passt die Zeichenfläche an das Fenster an.
   * Der Zoom hält den sichtbaren Ausschnitt ungefähr gleich groß und
   * vergrößert die Grafik dabei höchstens minimal.
   */
  resize(cssW, cssH, dpr) {
    this._cssW = cssW;
    this._cssH = cssH;
    this._dpr = dpr || 1;
    const ratio = Math.min(this._dpr, 2) * this.quality;
    let pw = Math.max(320, Math.round(cssW * ratio));
    let ph = Math.max(200, Math.round(cssH * ratio));
    const total = pw * ph;
    if (total > MAX_PIXELS) {
      const k = Math.sqrt(MAX_PIXELS / total);
      pw = Math.round(pw * k);
      ph = Math.round(ph * k);
    }
    if (pw === this.w && ph === this.h) return false;

    this.canvas.width = pw;
    this.canvas.height = ph;
    this.w = pw;
    this.h = ph;
    this.ctx = ctx2d(this.canvas, { alpha: false });
    this.ctx.imageSmoothingEnabled = true;
    this._alloc();
    this.updateZoom();
    return true;
  }

  updateZoom() {
    this.zoom = clamp(Math.min(this.w / REFERENCE_W, this.h / REFERENCE_H), 0.5, 1.05);
    this.viewW = this.w / this.zoom;
    this.viewH = this.h / this.zoom;
  }

  /**
   * Beobachtet die Bildzeit und dreht die interne Auflösung nach.
   * Lieber ein etwas weicheres Bild als ein ruckelndes – gerade auf
   * Telefonen und in Browsern ohne Grafikbeschleunigung.
   */
  adapt(frameMs, camera) {
    this._frameAvg = this._frameAvg * 0.92 + Math.min(200, frameMs) * 0.08;
    this._sinceChange++;
    if (this._sinceChange < 120 || !this._cssW) return false;

    let q = this.quality;
    if (this._frameAvg > 26 && q > 0.55) q = Math.max(0.55, q - 0.15);
    else if (this._frameAvg < 11 && q < 1) q = Math.min(1, q + 0.1);
    if (q === this.quality) return false;

    this.quality = q;
    this._sinceChange = 0;
    this._frameAvg = 16;
    const changed = this.resize(this._cssW, this._cssH, this._dpr);
    if (changed && camera) camera.resize(this.viewW, this.viewH);
    return changed;
  }

  _world(ctx, camX, camY) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, -camX * this.zoom, -camY * this.zoom);
  }

  _screen(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  draw(game, time) {
    const ctx = this.ctx;
    const cam = game.camera;
    const camX = cam.ox;
    const camY = cam.oy;
    const world = game.world;

    game.ground.beginFrame();

    this._screen(ctx);
    ctx.fillStyle = INK.paper;
    ctx.fillRect(0, 0, this.w, this.h);

    // 1 – Boden: blasse Zeichnung, darüber die Farbe durch die weiche Maske
    this._world(ctx, camX, camY);
    game.ground.draw(ctx, camX, camY, this.viewW, this.viewH, true);

    const sources = game.colorField.visibleSources(camX, camY, this.viewW, this.viewH);
    if (sources.length) {
      // Nur der wirklich eingefärbte Ausschnitt wird zweimal gezeichnet.
      const box = this._sourceBox(sources, camX, camY);
      const cc = this.colorCtx;
      this._screen(cc);
      cc.clearRect(box.sx, box.sy, box.sw, box.sh);
      cc.save();
      cc.beginPath();
      cc.rect(box.sx, box.sy, box.sw, box.sh);
      cc.clip();
      this._world(cc, camX, camY);
      game.ground.draw(cc, camX, camY, this.viewW, this.viewH, false, false);
      cc.globalCompositeOperation = 'destination-in';
      game.colorField.drawMask(cc, sources);
      cc.globalCompositeOperation = 'source-over';
      cc.restore();
      this._screen(ctx);
      ctx.drawImage(this.colorCanvas, box.sx, box.sy, box.sw, box.sh,
        box.sx, box.sy, box.sw, box.sh);
      this._world(ctx, camX, camY);
    }

    // 2 – Objekte in EINEM Durchgang. Wie farbig etwas ist, entscheidet die
    //     Farbquelle an seiner Position – das spart das zweite Malen der
    //     ganzen Szene und war der Grund für die schlechte Bildrate.
    const list = this._collectVisible(world, camX, camY);
    this._drawEntities(ctx, game, list, time);

    // 3 – Tageszeit, Lichter und Randabdunklung in EINEM Überzug
    this._drawOverlay(ctx, game, camX, camY, time);

    // 4 – Leben und Hinweise
    this._world(ctx, camX, camY);
    game.wildlife.draw(ctx, 0, 0, time);
    game.particles.draw(ctx, 0, 0);
    this._drawMarkers(ctx, game, time);
    this._screen(ctx);

    this.stats.entities = list.length;
    this.stats.chunks = game.ground.cachedCount;
  }

  _collectVisible(world, camX, camY) {
    const pad = 180;
    const list = this._visible;
    list.length = 0;
    world.queryRect(camX - pad, camY - pad, this.viewW + pad * 2, this.viewH + pad * 2, list);
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

  /** Sichtbarer Ausschnitt, in dem überhaupt Farbe liegt (Bildschirmpixel). */
  _sourceBox(sources, camX, camY) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (s.x - s.r < x0) x0 = s.x - s.r;
      if (s.y - s.r < y0) y0 = s.y - s.r;
      if (s.x + s.r > x1) x1 = s.x + s.r;
      if (s.y + s.r > y1) y1 = s.y + s.r;
    }
    const sx = clamp(Math.floor((x0 - camX) * this.zoom), 0, this.w);
    const sy = clamp(Math.floor((y0 - camY) * this.zoom), 0, this.h);
    const ex = clamp(Math.ceil((x1 - camX) * this.zoom), 0, this.w);
    const ey = clamp(Math.ceil((y1 - camY) * this.zoom), 0, this.h);
    return { sx: sx, sy: sy, sw: Math.max(0, ex - sx), sh: Math.max(0, ey - sy) };
  }

  _drawEntities(ctx, game, list, time) {
    const playerY = game.player.y;
    let playerDrawn = false;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!playerDrawn && e.y > playerY) {
        this._drawPlayer(ctx, game, time);
        playerDrawn = true;
      }
      this._drawEntity(ctx, game, e, time);
    }
    if (!playerDrawn) this._drawPlayer(ctx, game, time);
  }

  /**
   * Zeichnet ein Objekt in dem Zustand, der zu seiner Position passt:
   * ganz blass, ganz farbig – oder auf halbem Weg überblendet.
   */
  _blend(ctx, game, name, x, y, opts) {
    const a = game.colorField.at(x, y);
    if (a <= 0.02) {
      drawSprite(ctx, name, x, y, true, opts);
      return;
    }
    if (a >= 0.98) {
      drawSprite(ctx, name, x, y, false, opts);
      return;
    }
    drawSprite(ctx, name, x, y, true, opts);
    const o = opts ? Object.assign({}, opts) : {};
    o.alpha = (o.alpha == null ? 1 : o.alpha) * a;
    drawSprite(ctx, name, x, y, false, o);
  }

  _drawEntity(ctx, game, e, time) {
    const def = defOf(e.kind);
    const always = !!ALWAYS_COLOR[e.kind];
    let x = e.x;
    const y = e.y;

    if (def && def.sway) x += Math.sin(time * 1.2 + e.phase) * 2.4;

    switch (e.kind) {
      case 'spirit': {
        const bob = Math.sin(time * 1.6 + e.phase) * 6;
        const frame = Math.floor(time * 1.1 + e.phase) % 2;
        drawSprite(ctx, 'spirit_' + e.spiritId + '_' + frame, x, y + bob, false, { alpha: 0.96 });
        return;
      }
      case 'fox': {
        const frame = Math.floor(time * 1.6 + e.phase) % 2;
        drawSprite(ctx, 'fox_' + frame, x, y, false);
        return;
      }
      case 'campfire': {
        this._blend(ctx, game, 'campfire', x, y);
        const lvl = campfireLevelFor(game.state.campfireFuel).level;
        const frame = Math.floor(time * 9) % 4;
        const scale = 0.55 + lvl * 0.12;
        ctx.save();
        ctx.translate(x, y - 16);
        ctx.scale(scale, scale);
        drawSprite(ctx, 'flame_' + frame, 0, 0, false);
        ctx.restore();
        return;
      }
      case 'hidden': {
        const bob = Math.sin(time * 2.6 + e.phase) * 5;
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(time * 3 + e.phase) * 0.14;
        ctx.fillStyle = '#fff3c8';
        ctx.beginPath();
        ctx.arc(x, y + bob - 26, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawSprite(ctx, e.sprite, x, y + bob, false);
        return;
      }
      case 'bridge_spot': {
        this._blend(ctx, game, 'signpost', x, y);
        return;
      }
      default:
        break;
    }

    const name = e.sprite || (def && def.sprite);
    if (!name) return;
    if (e.lastHit != null) {
      const hitAge = time - e.lastHit;
      if (hitAge < 0.25) x += Math.sin(hitAge * 60) * 5;
    }
    if (always) drawSprite(ctx, name, x, y, false);
    else this._blend(ctx, game, name, x, y);
  }

  _drawPlayer(ctx, game, time) {
    const p = game.player;
    drawSprite(ctx, p.spriteName(), p.x, p.y, false, { flip: p.flipped() });

    if (p.swing > 0 && p.tool.sprite && p.tool.id !== 'hand') {
      const t = 1 - p.swing;
      const angle = (-0.9 + t * 2.1) * (p.dir === 'left' ? -1 : 1);
      const offX = p.dir === 'left' ? -26 : p.dir === 'right' ? 26 : (p.dir === 'up' ? 18 : -18);
      const offY = p.dir === 'up' ? -54 : -46;
      ctx.save();
      ctx.translate(p.x + offX, p.y + offY);
      ctx.rotate(angle);
      drawSprite(ctx, p.tool.sprite, 0, 0, false, { scale: 0.72 });
      ctx.restore();
    }

    const f = game.fishing;
    if (f.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(74,64,56,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 62);
      ctx.lineTo(f.bobber.x, f.bobber.y);
      ctx.stroke();
      const bob = Math.sin(time * 5) * 4;
      ctx.fillStyle = f.state === 'bite' ? INK.berry : '#f6f1e6';
      ctx.beginPath();
      ctx.arc(f.bobber.x, f.bobber.y + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Tageszeit-Ton, Lichtkegel und Randabdunklung landen zusammen auf einer
   * Ebene. Ein einziger bildschirmgroßer Überzug statt zweier – auf schwachen
   * Geräten macht das den Unterschied.
   */
  _drawOverlay(ctx, game, camX, camY, time) {
    const tint = game.day.tint();
    const lc = this.lightCtx;
    this._screen(lc);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.w, this.h);
    if (tint.a >= 0.02) {
      lc.fillStyle = 'rgba(' + tint.r + ',' + tint.g + ',' + tint.b + ',' + tint.a.toFixed(3) + ')';
      lc.fillRect(0, 0, this.w, this.h);
    }
    // Wetter färbt mit: Regen kühlt und graut ein, Nebel hellt flach auf.
    // Es liegt VOR den Lichtern, damit eine Laterne auch bei Regen ein Loch
    // in die Trübung schneidet.
    const wt = game.weather && game.weather.tint();
    if (wt && wt.a >= 0.01) {
      lc.fillStyle = 'rgba(' + wt.r + ',' + wt.g + ',' + wt.b + ',' + wt.a.toFixed(3) + ')';
      lc.fillRect(0, 0, this.w, this.h);
    }

    if (game.day.isDark()) {
      this._world(lc, camX, camY);
      lc.globalCompositeOperation = 'destination-out';
      const lights = game.lightSources(time);
      for (let i = 0; i < lights.length; i++) {
        const L = lights[i];
        if (L.x + L.r < camX || L.x - L.r > camX + this.viewW) continue;
        if (L.y + L.r < camY || L.y - L.r > camY + this.viewH) continue;
        const grad = lc.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
        const a = L.a == null ? 0.95 : L.a;
        grad.addColorStop(0, 'rgba(0,0,0,' + a + ')');
        grad.addColorStop(0.55, 'rgba(0,0,0,' + (a * 0.6) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = grad;
        lc.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      }
      lc.globalCompositeOperation = 'source-over';
      this._screen(lc);
    }
    lc.drawImage(this._vignetteLayer(), 0, 0);
    this._screen(ctx);
    ctx.drawImage(this.lightCanvas, 0, 0);
    // Tropfen und Schwaden zuletzt und im Bildschirmraum: sie liegen vor
    // allem, auch vor der Randabdunklung.
    if (game.weather) game.weather.draw(ctx, this.w, this.h);
  }

  _drawMarkers(ctx, game, time) {
    const t = game.target;
    if (t && t.entity) {
      const e = t.entity;
      const s = spr(e.sprite || (defOf(e.kind) && defOf(e.kind).sprite));
      const top = e.y - (s ? s.ay : 48) - 18;
      const bob = Math.sin(time * 5) * 4;
      this._chevron(ctx, e.x, top + bob, t.matches || !defOf(e.kind).tool ? INK.line : INK.lineSoft);
    }

    const ready = game.spiritsWithReadyQuest();
    for (let i = 0; i < ready.length; i++) {
      const e = ready[i];
      const bob = Math.sin(time * 3 + e.phase) * 5;
      const x = e.x;
      const y = e.y - 168 + bob;
      ctx.save();
      ctx.fillStyle = INK.warm;
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x + 3, y + 22);
      ctx.lineTo(x - 3, y + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + 31, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (game.placing) {
      const p = game.placing;
      ctx.save();
      ctx.globalAlpha = 0.72;
      drawSprite(ctx, p.sprite, p.x, p.y, false);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = p.valid ? 'rgba(107,150,74,0.9)' : 'rgba(196,90,74,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 4, 34, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _chevron(ctx, x, y, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 12);
    ctx.lineTo(x + 11, y - 12);
    ctx.lineTo(x, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _vignetteLayer() {
    if (!this._vignette) {
      const c = makeCanvas(this.w, this.h);
      const g = ctx2d(c);
      const grad = g.createRadialGradient(
        this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.36,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.74
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(96,84,60,0.2)');
      g.fillStyle = grad;
      g.fillRect(0, 0, this.w, this.h);
      this._vignette = c;
    }
    return this._vignette;
  }
}

export { TILE_SIZE, getItem };
