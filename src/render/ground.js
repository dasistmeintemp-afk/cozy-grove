/**
 * Bodenschicht.
 *
 * Der komplette Inselboden wird einmal in zwei grosse Zwischenbilder gemalt
 * (farbig und entsaettigt). Pro Bild wird daraus nur der sichtbare Ausschnitt
 * kopiert – das ist deutlich schneller als Kachel fuer Kachel zu zeichnen.
 */
import { makeCanvas, ctx2d } from '../core/util.js';
import { Pixel } from '../art/pixel.js';
import { TILE_DEF, TILE_SIZE, paintTileTexture, isWater } from '../art/tiles.js';
import { desaturatePixels } from '../art/palette.js';
import { makeRng, hashString } from '../core/rng.js';

const FRINGE = 4;

export class GroundLayer {
  constructor(world) {
    this.world = world;
    this.w = world.w * TILE_SIZE;
    this.h = world.h * TILE_SIZE;
    this.color = makeCanvas(this.w, this.h);
    this.gray = makeCanvas(this.w, this.h);
    this.water = makeCanvas(this.w, this.h);
    this.cctx = ctx2d(this.color);
    this.gctx = ctx2d(this.gray);
    this.wctx = ctx2d(this.water);
    this.pen = new Pixel(this.cctx);
    this.dirty = [];
  }

  buildAll() {
    this.cctx.clearRect(0, 0, this.w, this.h);
    this.wctx.clearRect(0, 0, this.w, this.h);
    this._paintRegion(0, 0, this.world.w, this.world.h);
    this._syncGray(0, 0, this.w, this.h);
    this.dirty.length = 0;
    this.world.groundDirty = false;
  }

  markTileDirty(tx, ty) {
    this.dirty.push([tx, ty]);
  }

  /** Aenderungen nachziehen (Wege, Bruecke). */
  flush() {
    if (!this.dirty.length) return;
    // Zusammenfassen: pro Bereich ein 3x3-Block
    const seen = Object.create(null);
    const blocks = [];
    for (let i = 0; i < this.dirty.length; i++) {
      const tx = this.dirty[i][0];
      const ty = this.dirty[i][1];
      const key = tx + ',' + ty;
      if (seen[key]) continue;
      seen[key] = true;
      blocks.push([tx, ty]);
    }
    this.dirty.length = 0;

    for (let i = 0; i < blocks.length; i++) {
      const tx = blocks[i][0];
      const ty = blocks[i][1];
      const x0 = (tx - 1) * TILE_SIZE;
      const y0 = (ty - 1) * TILE_SIZE;
      const w = TILE_SIZE * 3;
      const h = TILE_SIZE * 3;
      this.cctx.save();
      this.cctx.beginPath();
      this.cctx.rect(x0, y0, w, h);
      this.cctx.clip();
      this.cctx.clearRect(x0, y0, w, h);
      this.wctx.clearRect(x0, y0, w, h);
      this._paintRegion(tx - 2, ty - 2, 5, 5);
      this.cctx.restore();
      this._syncGray(x0, y0, w, h);
    }
  }

  _paintRegion(tx0, ty0, tw, th) {
    const world = this.world;
    const g = this.pen;
    const cells = [];
    for (let ty = ty0; ty < ty0 + th; ty++) {
      for (let tx = tx0; tx < tx0 + tw; tx++) {
        if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) continue;
        const t = world.tileAtTile(tx, ty);
        cells.push({ tx: tx, ty: ty, t: t, layer: TILE_DEF[t].layer });
      }
    }
    cells.sort(function (a, b) { return a.layer - b.layer; });

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const x = c.tx * TILE_SIZE;
      const y = c.ty * TILE_SIZE;
      const def = TILE_DEF[c.t];
      const rng = makeRng(hashString(c.tx + ':' + c.ty));

      g.rect(x, y, TILE_SIZE, TILE_SIZE, def.base);
      this._fringe(g, c, def);
      paintTileTexture(g, c.t, x, y, rng);

      if (isWater(c.t)) {
        this.wctx.fillStyle = '#ffffff';
        this.wctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  /** Ausgefranster Rand zu niedrigeren Nachbarn – weiche Uebergaenge. */
  _fringe(g, c, def) {
    const world = this.world;
    const x = c.tx * TILE_SIZE;
    const y = c.ty * TILE_SIZE;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (let d = 0; d < 4; d++) {
      const nx = c.tx + dirs[d][0];
      const ny = c.ty + dirs[d][1];
      const nt = world.tileAtTile(nx, ny);
      if (TILE_DEF[nt].layer >= def.layer) continue;
      const rng = makeRng(hashString(c.tx + '|' + c.ty + '|' + d));
      const steps = 4;
      const seg = TILE_SIZE / steps;
      for (let s = 0; s < steps; s++) {
        const depth = 1 + Math.floor(rng() * FRINGE);
        if (d === 0) g.rect(x + s * seg, y - depth, seg, depth, def.base);
        else if (d === 1) g.rect(x + TILE_SIZE, y + s * seg, depth, seg, def.base);
        else if (d === 2) g.rect(x + s * seg, y + TILE_SIZE, seg, depth, def.base);
        else g.rect(x - depth, y + s * seg, depth, seg, def.base);
      }
    }
  }

  _syncGray(x, y, w, h) {
    const gx = Math.max(0, Math.floor(x));
    const gy = Math.max(0, Math.floor(y));
    const gw = Math.min(this.w - gx, Math.ceil(w));
    const gh = Math.min(this.h - gy, Math.ceil(h));
    if (gw <= 0 || gh <= 0) return;
    this.gctx.clearRect(gx, gy, gw, gh);
    this.gctx.drawImage(this.color, gx, gy, gw, gh, gx, gy, gw, gh);
    let img;
    let mask = null;
    try {
      img = this.gctx.getImageData(gx, gy, gw, gh);
      mask = this.wctx.getImageData(gx, gy, gw, gh);
    } catch (err) {
      return;
    }
    desaturatePixels(img.data, mask ? mask.data : null);
    this.gctx.putImageData(img, gx, gy);
  }
}
