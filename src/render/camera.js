/** Kamera: folgt der Figur weich und bleibt innerhalb der Inselgrenzen. */
import { clamp, damp } from '../core/util.js';

export class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.x = 0;
    this.y = 0;
    // Stand vor dem letzten Simulationsschritt. Zwischen beiden wird für die
    // Anzeige gemischt – siehe `alpha`.
    this.prevX = 0;
    this.prevY = 0;
    /**
     * Wo zwischen zwei Simulationsschritten das Bild steht (0 … 1).
     *
     * Die Simulation läuft in festen Schritten von 1/60 s, gezeichnet wird
     * aber, wann der Browser Zeit hat. Bei 40 Bildern je Sekunde passen mal
     * ein, mal zwei, mal drei Schritte in ein Bild – die Welt schob sich dann
     * abwechselnd um 4, 8 und 12 Pixel weiter. Gemessen: 276 Bilder mit zwei
     * Schritten, 13 mit dreien, 9 mit einem. Die Figur bewegte sich völlig
     * gleichmäßig, es SAH nur aus, als würde sie springen.
     *
     * Mit dem Mischwert zeigt das Bild den Zwischenstand statt des letzten
     * fertigen Schritts, und der Ruck verschwindet.
     */
    this.alpha = 1;
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
    // Kein Mischen über einen Sprung hinweg: sonst führe die Kamera nach dem
    // Schlafen oder Laden noch einen Wimpernschlag lang vom alten Ort her.
    this.prevX = this.x;
    this.prevY = this.y;
  }

  follow(tx, ty, dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    const targetX = this._clampX(tx - this.viewW / 2);
    const targetY = this._clampY(ty - this.viewH / 2);
    this.x = damp(this.x, targetX, 7, dt);
    this.y = damp(this.y, targetY, 7, dt);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3);
      const s = this.shake * 8;
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

  /**
   * Weiche Position – die gemalte Grafik braucht kein Pixelraster mehr.
   * Zwischen dem vorletzten und dem letzten Schritt gemischt, damit die Welt
   * gleichmäßig läuft und nicht im Takt der Simulationsschritte hüpft.
   */
  get ox() {
    return this.prevX + (this.x - this.prevX) * this.alpha + this.shakeX;
  }

  get oy() {
    return this.prevY + (this.y - this.prevY) * this.alpha + this.shakeY;
  }

  toScreen(wx, wy) {
    return { x: wx - this.ox, y: wy - this.oy };
  }
}
