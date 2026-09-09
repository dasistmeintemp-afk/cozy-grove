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
    // Eigene Fläche für die Farbmaske. Sie muss getrennt liegen, weil mehrere
    // Farbquellen sich VEREINIGEN müssen; siehe _drawColorPass().
    this.maskCanvas = makeCanvas(this.w, this.h);
    this.maskCtx = ctx2d(this.maskCanvas);
    this.maskCtx.imageSmoothingEnabled = true;
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
    if (sources.length) this._drawColorPass(ctx, game, sources, camX, camY);

    // Die Grenze liegt AUF dem Boden, unter allem, was darauf steht – sonst
    // liefe eine gestrichelte Linie quer über Zelt und Bäume.
    this._drawPlot(ctx, game, camX, camY);

    // 2 – Objekte in EINEM Durchgang. Wie farbig etwas ist, entscheidet die
    //     Farbquelle an seiner Position – das spart das zweite Malen der
    //     ganzen Szene und war der Grund für die schlechte Bildrate.
    const list = this._collectVisible(world, camX, camY);
    this._lastVisible = list;
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

  /**
   * Blendet die kolorierte Fassung des Bodens durch die Farbmaske ein.
   *
   * Die Maske entsteht in einer EIGENEN Fläche und wird erst danach in einem
   * Zug angewandt. Vorher wurde jede Farbquelle einzeln mit `destination-in`
   * auf die Farbfläche gelegt – das multipliziert die Deckkraft, statt sie zu
   * vereinigen: bei zwei Quellen blieb nur ihr Schnitt farbig, und weil jede
   * Quelle ein Rechteck füllt, sprang die Kante sichtbar um, sobald eine
   * Quelle in den Blick geriet oder ihn verließ. Genau das war das Flackern
   * mit dem farbigen Rand rund um die Geister. Objekte fragen ihre Farbe
   * dagegen über `colorField.at()` ab, das den GRÖSSTEN Wert nimmt – Boden und
   * Bäume widersprachen sich also auch noch.
   */
  _drawColorPass(ctx, game, sources, camX, camY) {
    const box = this._sourceBox(sources, camX, camY);
    if (box.sw <= 0 || box.sh <= 0) return;

    // 1 – Maske: alle Quellen übereinander, normal deckend. Weißes Weiß über
    //     weißem Weiß addiert die Deckkraft (a1 + a2·(1-a1)) und ergibt damit
    //     die Vereinigung der Kreise.
    const mc = this.maskCtx;
    this._screen(mc);
    mc.clearRect(box.sx, box.sy, box.sw, box.sh);
    mc.save();
    mc.beginPath();
    mc.rect(box.sx, box.sy, box.sw, box.sh);
    mc.clip();
    this._world(mc, camX, camY);
    game.colorField.drawMask(mc, sources);
    mc.restore();

    // 2 – Der kolorierte Boden, auf denselben Ausschnitt begrenzt
    const cc = this.colorCtx;
    this._screen(cc);
    cc.clearRect(box.sx, box.sy, box.sw, box.sh);
    cc.save();
    cc.beginPath();
    cc.rect(box.sx, box.sy, box.sw, box.sh);
    cc.clip();
    this._world(cc, camX, camY);
    game.ground.draw(cc, camX, camY, this.viewW, this.viewH, false, false);
    this._screen(cc);
    cc.globalCompositeOperation = 'destination-in';
    cc.drawImage(this.maskCanvas, box.sx, box.sy, box.sw, box.sh,
      box.sx, box.sy, box.sw, box.sh);
    cc.globalCompositeOperation = 'source-over';
    cc.restore();

    this._screen(ctx);
    ctx.drawImage(this.colorCanvas, box.sx, box.sy, box.sw, box.sh,
      box.sx, box.sy, box.sw, box.sh);
    this._world(ctx, camX, camY);
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

  /**
   * Erst alles Flache, dann alles Aufrechte.
   *
   * Ein Teppich liegt auf dem Boden. Nach der Tiefe einsortiert kam er hinter
   * die Figur, sobald sie über ihm stand – gemessen wechselten 422 von 650
   * Bildpunkten im Rumpf die Farbe, der Teppich lag also über Seli. Flaches
   * gehört in denselben Durchgang wie die Grundstücksgrenze: unter allem, was
   * darauf steht. Untereinander bleiben die Teppiche nach Tiefe sortiert,
   * damit sich zwei überlappende sinnvoll schichten.
   */
  _drawEntities(ctx, game, list, time) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].flat) this._drawEntity(ctx, game, list[i], time);
    }
    const playerY = game.player.y;
    let playerDrawn = false;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.flat) continue;
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
        // Fundstücke müssen auf der ganzen Insel auffallen, auch im blassen
        // Teil. Ein blasscremefarbener Kreis auf Papier tat das nicht: die
        // Karte zeigte ein Flämmchen, am Ort stand scheinbar nichts. Jetzt
        // steht dort wirklich ein Flämmchen – ein warmer Schein, ein paar
        // aufsteigende Funken und ein Ring, der auf dem Boden liegt.
        const bob = Math.sin(time * 2.6 + e.phase) * 5;
        const puls = 0.5 + Math.sin(time * 2.2 + e.phase) * 0.5;
        ctx.save();

        // Ring am Boden: sagt, WO genau es liegt
        ctx.globalAlpha = 0.3 + puls * 0.22;
        ctx.strokeStyle = '#d8931f';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 26 + puls * 5, 10 + puls * 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Schein: warm, mit hartem Kern – sonst verschwindet er im Papier
        const glow = ctx.createRadialGradient(x, y + bob - 26, 2, x, y + bob - 26, 46);
        glow.addColorStop(0, 'rgba(255,214,132,0.72)');
        glow.addColorStop(0.45, 'rgba(255,196,104,0.34)');
        glow.addColorStop(1, 'rgba(255,196,104,0)');
        ctx.globalAlpha = 0.55 + puls * 0.3;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y + bob - 26, 46, 0, Math.PI * 2);
        ctx.fill();

        // Funken: drei, mit versetzter Phase, steigen und verlöschen
        ctx.globalAlpha = 1;
        for (let k = 0; k < 3; k++) {
          const t = ((time * 0.55 + e.phase * 0.3 + k * 0.34) % 1);
          const fx = x + Math.sin((time + k * 2.1) * 1.7 + e.phase) * (7 + k * 3);
          const fy = y + bob - 34 - t * 42;
          ctx.globalAlpha = (1 - t) * 0.75;
          ctx.fillStyle = k === 1 ? '#ffe6ac' : '#f5b34a';
          ctx.beginPath();
          ctx.arc(fx, fy, 2.6 - t * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
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
    // Gezeichnet wird der Zwischenstand, nicht der letzte fertige Schritt –
    // sonst zappelte die Figur gegen die weich mitlaufende Kamera.
    const pos = p.renderPos(game.camera.alpha);
    drawSprite(ctx, p.spriteName(), pos.x, pos.y, false, { flip: p.flipped() });

    if (p.swing > 0 && p.tool.sprite && p.tool.id !== 'hand') {
      const t = 1 - p.swing;
      const angle = (-0.9 + t * 2.1) * (p.dir === 'left' ? -1 : 1);
      const offX = p.dir === 'left' ? -26 : p.dir === 'right' ? 26 : (p.dir === 'up' ? 18 : -18);
      const offY = p.dir === 'up' ? -54 : -46;
      ctx.save();
      ctx.translate(pos.x + offX, pos.y + offY);
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
      ctx.moveTo(pos.x, pos.y - 62);
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

  /**
   * Das Flämmchen über einem Fundstück – hoch genug, um über Baumkronen zu
   * stehen.
   *
   * Es wird bewusst NACH allen Objekten gezeichnet. Der Schein am Boden liegt
   * in der Tiefenstaffelung und verschwindet deshalb hinter einem Baum, der
   * ein Stück weiter unten steht; die Karte verspricht dann ein Flämmchen, das
   * am Ort niemand sieht. Dieses hier ist immer da.
   */
  _drawFindWisps(ctx, game, time) {
    const list = this._lastVisible;
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.kind !== 'hidden') continue;
      const bob = Math.sin(time * 2.2 + e.phase) * 7;
      const x = e.x;
      const y = e.y - 132 + bob;
      const flack = 1 + Math.sin(time * 9 + e.phase * 3) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffcf7a';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.translate(x, y);
      ctx.scale(1, flack);
      // Tropfenform: unten rund, oben ausgezogen
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.bezierCurveTo(8, -6, 10, 3, 0, 10);
      ctx.bezierCurveTo(-10, 3, -8, -6, 0, -17);
      ctx.closePath();
      ctx.fillStyle = '#f0972a';
      ctx.fill();
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.bezierCurveTo(4, -2, 5, 2, 0, 5);
      ctx.bezierCurveTo(-5, 2, -4, -2, 0, -7);
      ctx.closePath();
      ctx.fillStyle = '#ffe3a6';
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Die Grenze des Grundstücks – eine gestrichelte Linie im Gras.
   *
   * Ohne sie weiß niemand, wo die Regeln wechseln: Innerhalb wächst nichts
   * nach und man darf näher ans Lager bauen, außerhalb nicht. Bewusst dünn
   * und blass – es ist ein Vermerk, kein Zaun.
   */
  _drawPlot(ctx, game, camX, camY) {
    if (!game.plotStatus) return;
    const r = game.plotRect ? game.plotRect() : null;
    if (!r) return;
    if (r.x + r.w < camX || r.x > camX + this.viewW) return;
    if (r.y + r.h < camY || r.y > camY + this.viewH) return;

    ctx.save();
    ctx.strokeStyle = INK.lineSoft;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 14]);
    ctx.lineCap = 'round';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
    // Eckpfosten: die Linie allein liest sich als Zeichenfehler, vier
    // Pflöcke sagen „das ist abgesteckt".
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = INK.wood;
    const ecken = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]];
    for (let i = 0; i < ecken.length; i++) {
      ctx.beginPath();
      ctx.ellipse(ecken[i][0], ecken[i][1] - 10, 4, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawMarkers(ctx, game, time) {
    this._drawFindWisps(ctx, game, time);
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

    // Ein Umschlag über dem Briefkasten, solange Post ungelesen ist. Ohne
    // ihn müsste man jeden Morgen nachsehen gehen, ob sich der Weg lohnt –
    // und nach drei leeren Kästen geht niemand mehr hin.
    if (game.world.mailbox && game.unreadMail && game.unreadMail() > 0) {
      const m = game.world.mailbox;
      const bob = Math.sin(time * 2.8) * 4;
      const x = m.x;
      const y = m.y - 150 + bob;
      ctx.save();
      ctx.fillStyle = INK.paper;
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.rect(x - 13, y, 26, 18);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 13, y);
      ctx.lineTo(x, y + 11);
      ctx.lineTo(x + 13, y);
      ctx.stroke();
      ctx.restore();
    }

    // Herz: dieser Geist mag etwas, das gerade in der Tasche liegt. Ohne
    // Zeichen bliebe das Mitbringen eine versteckte Regel – man müsste jeden
    // Geist mit jedem Gegenstand ausprobieren.
    const mag = game.spiritsWantingGift();
    for (let i = 0; i < mag.length; i++) {
      const e = mag[i];
      const bob = Math.sin(time * 2.4 + e.phase + 1.1) * 4;
      const x = e.x + 26;
      const y = e.y - 150 + bob;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.9, 0.9);
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.bezierCurveTo(-13, -1, -8, -13, 0, -6);
      ctx.bezierCurveTo(8, -13, 13, -1, 0, 9);
      ctx.closePath();
      ctx.fillStyle = '#d4756b';
      ctx.fill();
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2;
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

  /**
   * Randabdunklung – sehr zurückhaltend.
   *
   * Sie sitzt in der Bildmitte, und die Kamera folgt der Figur: Ein kräftiger
   * Verlauf ist damit ein heller Kreis, der mit dem Spieler mitwandert. Genau
   * das steht der Kernmechanik im Weg – man soll an der Farbe ablesen können,
   * wo die Insel schon wieder lebt, nicht daran, wo man gerade steht. Bei 0.2
   * waren das 14 % Abdunklung in den Ecken, und der Kreis war deutlich zu
   * sehen. 0.06 rahmt das Bild noch, ohne die Farbe zu überstimmen.
   */
  _vignetteLayer() {
    if (!this._vignette) {
      const c = makeCanvas(this.w, this.h);
      const g = ctx2d(c);
      const grad = g.createRadialGradient(
        this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.52,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(96,84,60,0.06)');
      g.fillStyle = grad;
      g.fillRect(0, 0, this.w, this.h);
      this._vignette = c;
    }
    return this._vignette;
  }
}

export { TILE_SIZE, getItem };
