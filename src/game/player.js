/** Die Spielfigur: Bewegung, Blickrichtung, Werkzeugeinsatz. */
import { clamp } from '../core/util.js';
import { defOf, TOOL } from '../world/entities.js';

export const WALK_SPEED = 248;

export const TOOLS = [
  { id: TOOL.HAND, name: 'Hand', icon: 'icon_hand', sprite: 'tool_hand', key: '1' },
  { id: TOOL.AXE, name: 'Axt', icon: 'icon_axe', sprite: 'tool_axe', key: '2' },
  { id: TOOL.PICK, name: 'Spitzhacke', icon: 'icon_pickaxe', sprite: 'tool_pickaxe', key: '3' },
  { id: TOOL.SHOVEL, name: 'Schaufel', icon: 'icon_shovel', sprite: 'tool_shovel', key: '4' },
  { id: TOOL.ROD, name: 'Angel', icon: 'icon_rod', sprite: 'tool_rod', key: '5' },
  { id: TOOL.NET, name: 'Kescher', icon: 'icon_net', sprite: 'tool_net', key: '6' },
];

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dir = 'down';
    this.animT = 0;
    this.frame = 0;
    this.moving = false;
    this.toolIndex = 0;
    this.levels = { hand: 1, axe: 1, pickaxe: 1, shovel: 1, rod: 1, net: 1 };
    this.prevX = x;
    this.prevY = y;
    this.swing = 0;        // 0..1, läuft nach einem Einsatz ab
    this.swingDur = 0.34;
    this.busy = false;     // z. B. während des Angelns
    this.stepTimer = 0;
  }

  get tool() {
    return TOOLS[this.toolIndex];
  }

  /**
   * Wo die Figur GEZEICHNET wird.
   *
   * Nicht `x`/`y`: die gehören der Simulation und dürfen nie zwischen zwei
   * Schritten liegen, sonst zielt und stößt die Figur an Orten, an denen sie
   * gar nicht steht. Fürs Bild wird gemischt, für alles andere nicht.
   */
  renderPos(alpha) {
    const a = alpha == null ? 1 : alpha;
    return {
      x: this.prevX + (this.x - this.prevX) * a,
      y: this.prevY + (this.y - this.prevY) * a,
    };
  }

  get toolLevel() {
    return this.levels[this.tool.id] || 1;
  }

  selectTool(i) {
    if (i < 0 || i >= TOOLS.length) return;
    this.toolIndex = i;
  }

  nextTool() {
    this.toolIndex = (this.toolIndex + 1) % TOOLS.length;
  }

  update(dt, move, world) {
    // Stand vor diesem Schritt – die Anzeige mischt zwischen beiden, siehe
    // `renderPos` und Camera.alpha.
    this.prevX = this.x;
    this.prevY = this.y;
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt / this.swingDur);

    let mx = 0;
    let my = 0;
    if (!this.busy) {
      mx = move.x;
      my = move.y;
    }
    const speed = WALK_SPEED;
    this.moving = (mx !== 0 || my !== 0);

    if (this.moving) {
      if (Math.abs(mx) > Math.abs(my)) this.dir = mx < 0 ? 'left' : 'right';
      else this.dir = my < 0 ? 'up' : 'down';

      const nx = this.x + mx * speed * dt;
      if (world.canStand(nx, this.y)) this.x = nx;
      const ny = this.y + my * speed * dt;
      if (world.canStand(this.x, ny)) this.y = ny;

      this.animT += dt * (2.2 + Math.abs(mx) + Math.abs(my));
      const f = Math.floor(this.animT * 2) % 4;
      this.frame = f === 0 ? 0 : f === 1 ? 1 : f === 2 ? 0 : 2;
      this.stepTimer -= dt;
    } else {
      this.animT = 0;
      this.frame = 0;
      this.stepTimer = 0;
    }

    this.x = clamp(this.x, 32, world.w * 64 - 32);
    this.y = clamp(this.y, 32, world.h * 64 - 32);
  }

  /** Soll ein Schrittgeräusch gespielt werden? */
  consumeStep() {
    if (!this.moving) return false;
    if (this.stepTimer > 0) return false;
    this.stepTimer = 0.32;
    return true;
  }

  spriteName() {
    const d = this.dir === 'left' || this.dir === 'right' ? 'side' : this.dir;
    return 'player_' + d + '_' + this.frame;
  }

  flipped() {
    return this.dir === 'left';
  }

  /** Punkt kurz vor der Figur – für Angel und Werkzeugeinsatz. */
  facingPoint(dist) {
    const d = dist == null ? 64 : dist;
    switch (this.dir) {
      case 'up': return { x: this.x, y: this.y - d };
      case 'down': return { x: this.x, y: this.y + d };
      case 'left': return { x: this.x - d, y: this.y - 16 };
      default: return { x: this.x + d, y: this.y - 16 };
    }
  }

  startSwing() {
    this.swing = 1;
  }

  /**
   * Bestes Ziel in Reichweite.
   * Objekte, die zum aktiven Werkzeug passen, haben Vorrang; danach zählt,
   * was am nächsten in Blickrichtung liegt.
   */
  findTarget(world) {
    const toolId = this.tool.id;
    const near = world.queryNear(this.x, this.y, 176);
    const fp = this.facingPoint(44);
    let best = null;
    let bestScore = -Infinity;

    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.gone) continue;
      const def = defOf(e.kind);
      if (!def) continue;
      const reach = def.reachR || 72;
      const dx = e.x - this.x;
      const dy = (e.y - 16) - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > reach) continue;

      const interactive = def.category === 'station' || def.category === 'spirit' ||
        def.category === 'fox' || def.category === 'hidden' || def.category === 'decor';
      const matches = def.tool && def.tool === toolId;
      if (!interactive && !def.tool) continue;

      // Nähe zum Punkt vor der Figur
      const fdx = e.x - fp.x;
      const fdy = (e.y - 16) - fp.y;
      const facing = Math.sqrt(fdx * fdx + fdy * fdy);

      let score = 100 - facing;
      if (matches) score += 60;
      else if (interactive) score += 45;
      else score -= 30;
      if (def.category === 'hidden') score += 90;
      if (def.category === 'spirit') score += 30;

      if (score > bestScore) {
        bestScore = score;
        best = { entity: e, def: def, dist: d, matches: matches };
      }
    }
    return best;
  }

  toJSON() {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      dir: this.dir,
      tool: this.toolIndex,
      levels: this.levels,
    };
  }

  static fromJSON(d) {
    const p = new Player(d.x, d.y);
    p.dir = d.dir || 'down';
    p.toolIndex = d.tool || 0;
    if (d.levels) p.levels = d.levels;
    return p;
  }
}
