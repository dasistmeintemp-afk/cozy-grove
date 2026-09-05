/** Kamera: folgt der Figur weich und bleibt innerhalb der Inselgrenzen. */
import { clamp, damp } from '../core/util.js';

export class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.x = 0;
    this.y = 0;
    this.viewW = viewW;
    this.viewH = viewH;
    this.worldW = worldW;
    this.worldH = worldH;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  resize(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
  }

  snapTo(tx, ty) {
    this.x = this._clampX(tx - this.viewW / 2);
    this.y = this._clampY(ty - this.viewH / 2);
  }

  follow(tx, ty, dt) {
    const targetX = this._clampX(tx - this.viewW / 2);
    const targetY = this._clampY(ty - this.viewH / 2);
    this.x = damp(this.x, targetX, 7, dt);
    this.y = damp(this.y, targetY, 7, dt);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3);
      const s = this.shake * 2;
      this.shakeX = (Math.random() - 0.5) * s;
      this.shakeY = (Math.random() - 0.5) * s;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  kick(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  _clampX(x) {
    if (this.worldW <= this.viewW) return (this.worldW - this.viewW) / 2;
    return clamp(x, 0, this.worldW - this.viewW);
  }

  _clampY(y) {
    if (this.worldH <= this.viewH) return (this.worldH - this.viewH) / 2;
    return clamp(y, 0, this.worldH - this.viewH);
  }

  /** Auf ganze Pixel gerundete Position – verhindert Flimmern in der Pixelgrafik. */
  get ox() {
    return Math.round(this.x + this.shakeX);
  }

  get oy() {
    return Math.round(this.y + this.shakeY);
  }

  toScreen(wx, wy) {
    return { x: wx - this.ox, y: wy - this.oy };
  }
}
