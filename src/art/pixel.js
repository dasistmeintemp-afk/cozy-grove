/**
 * Winzige Zeichenhilfe fuer Pixelgrafik.
 * Alles rastert auf ganze Pixel – dadurch bleibt der Look sauber und knackig.
 */

export class Pixel {
  constructor(ctx) {
    this.ctx = ctx;
    this.ox = 0;
    this.oy = 0;
  }

  origin(x, y) {
    this.ox = x;
    this.oy = y;
    return this;
  }

  rect(x, y, w, h, color) {
    if (w <= 0 || h <= 0) return this;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x + this.ox), Math.round(y + this.oy), Math.round(w), Math.round(h));
    return this;
  }

  /** 1px-Rahmen. */
  frame(x, y, w, h, color) {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y + 1, 1, h - 2, color);
    this.rect(x + w - 1, y + 1, 1, h - 2, color);
    return this;
  }

  /** Gefuellte Ellipse, zeilenweise gerastert. */
  ellipse(cx, cy, rx, ry, color) {
    if (rx <= 0 || ry <= 0) return this;
    this.ctx.fillStyle = color;
    const y0 = Math.ceil(cy - ry);
    const y1 = Math.floor(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      const s = 1 - dy * dy;
      if (s <= 0) continue;
      const half = rx * Math.sqrt(s);
      const xa = Math.round(cx - half);
      const xb = Math.round(cx + half);
      if (xb > xa) this.ctx.fillRect(xa + this.ox, y + this.oy, xb - xa, 1);
    }
    return this;
  }

  circle(cx, cy, r, color) {
    return this.ellipse(cx, cy, r, r, color);
  }

  /** Bresenham-artige Linie mit einstellbarer Dicke. */
  line(x0, y0, x1, y1, color, thick) {
    const t = thick || 1;
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    let guard = 0;
    while (guard++ < 4096) {
      this.rect(ax, ay, t, t, color);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; ax += sx; }
      if (e2 <= dx) { err += dx; ay += sy; }
    }
    return this;
  }

  /** Gefuelltes Polygon (Scanline). points = [[x,y], ...] */
  poly(points, color) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      if (points[i][1] < minY) minY = points[i][1];
      if (points[i][1] > maxY) maxY = points[i][1];
    }
    this.ctx.fillStyle = color;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[j];
        const b = points[i];
        if ((a[1] > yc) !== (b[1] > yc)) {
          xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort(function (p, q) { return p - q; });
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k]);
        const xb = Math.round(xs[k + 1]);
        if (xb > xa) this.ctx.fillRect(xa + this.ox, y + this.oy, xb - xa, 1);
      }
    }
    return this;
  }

  /** Streut deterministisch Punkte in ein Rechteck (Gras, Kies, Sand). */
  speckle(x, y, w, h, color, count, rng) {
    this.ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const px = x + Math.floor(rng() * w);
      const py = y + Math.floor(rng() * h);
      this.ctx.fillRect(px + this.ox, py + this.oy, 1, 1);
    }
    return this;
  }
}
