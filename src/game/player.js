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
  /**
   * Das erste Werkzeug, das man NICHT von Anfang an hat.
   *
   * `optional` heißt: Stufe 0 bedeutet „noch nicht gebaut". Solange steht die
   * Kanne nicht in der Leiste und `nextTool` überspringt sie – sonst hätte man
   * vom ersten Tag an einen leeren Platz, für den es keine Erklärung gibt.
   */
  { id: TOOL.CAN, name: 'Gießkanne', icon: 'icon_can', sprite: 'tool_can', key: '7', optional: true },
];

/**
 * Die Namen, unter denen die Werkzeuggrafiken im Register liegen.
 *
 * Abgeleitet statt abgeschrieben: Vorher stand dieselbe Liste in `sprites.js`
 * und noch einmal im Test. Ein siebtes Werkzeug hätte an drei Stellen
 * nachgetragen werden müssen – und wäre an einer davon vergessen worden.
 */
export const TOOL_ART = TOOLS.map(function (t) { return t.id; });

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Kein `vx`/`vy`: Es gab die beiden, sie standen seit jeher auf null, und
    // das Haustier fragte sie, um zu wissen, ob man läuft. Wer eine
    // Geschwindigkeit braucht, nehme `moving` – oder rechne sie aus `prevX`
    // und `x` aus, die stimmen wenigstens.
    this.dir = 'down';
    this.animT = 0;
    this.frame = 0;
    this.moving = false;
    this.toolIndex = 0;
    // Stufe 0 = noch nicht gebaut. Nur die Gießkanne beginnt dort.
    this.levels = { hand: 1, axe: 1, pickaxe: 1, shovel: 1, rod: 1, net: 1, can: 0 };
    this.prevX = x;
    this.prevY = y;
    this.swing = 0;        // 0..1, läuft nach einem Einsatz ab
    this.swingDur = 0.34;
    this.busy = false;     // z. B. während des Angelns
    this.stepTimer = 0;
    /**
     * Worauf gerade gesessen wird – oder null.
     *
     * Steht hier etwas, gehört `x`/`y` dem Möbelstück: Die Figur wird beim
     * Hinsetzen dorthin versetzt und beim Aufstehen zurückgestellt. Das
     * Spiel schreibt das Feld, die Figur liest es nur; wer sitzt, geht nicht.
     *
     * Nicht gespeichert: Wer das Spiel schließt, steht beim nächsten Mal.
     */
    this.sitzt = null;     // { entity, itemId, zurueck: {x, y, dir} }
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

  /** Hat die Figur dieses Werkzeug überhaupt? */
  owns(i) {
    const t = TOOLS[i];
    if (!t) return false;
    return !t.optional || (this.levels[t.id] || 0) >= 1;
  }

  selectTool(i) {
    if (i < 0 || i >= TOOLS.length) return;
    if (!this.owns(i)) return;
    this.toolIndex = i;
  }

  nextTool() {
    this.stepTool(1);
  }

  /**
   * Ein Werkzeug weiter – in beide Richtungen.
   *
   * Was noch nicht gebaut ist, wird übersprungen statt angezeigt; sonst
   * bliebe man beim Durchblättern an einem leeren Platz hängen.
   */
  stepTool(richtung) {
    const d = richtung < 0 ? -1 : 1;
    for (let n = 1; n <= TOOLS.length; n++) {
      const i = ((this.toolIndex + d * n) % TOOLS.length + TOOLS.length) % TOOLS.length;
      if (this.owns(i)) { this.toolIndex = i; return; }
    }
  }

  update(dt, move, world) {
    // Stand vor diesem Schritt – die Anzeige mischt zwischen beiden, siehe
    // `renderPos` und Camera.alpha.
    this.prevX = this.x;
    this.prevY = this.y;
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt / this.swingDur);

    let mx = 0;
    let my = 0;
    if (!this.busy && !this.sitzt) {
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
    if (this.sitzt) return 'player_sit';
    const d = this.dir === 'left' || this.dir === 'right' ? 'side' : this.dir;
    return 'player_' + d + '_' + this.frame;
  }

  flipped() {
    // Die Sitzhaltung ist von vorn gezeichnet und hat keine Seite. Gespiegelt
    // sähe man es nicht, aber der Hut säße plötzlich andersherum.
    if (this.sitzt) return false;
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
   * Hinsetzen.
   *
   * Die Figur übernimmt den Platz des Möbels – zwei Punkte davor, denn die
   * Tiefensortierung zeichnet, was weiter unten steht, später: So sitzt Seli
   * VOR der Lehne und nicht dahinter. Ihren alten Platz merkt sie sich, denn
   * das Möbel kann irgendwo stehen, wo man nicht stehen kann.
   */
  setzDich(e, itemId) {
    if (this.sitzt || !e) return false;
    this.sitzt = {
      entity: e, itemId: itemId,
      zurueck: { x: this.x, y: this.y, dir: this.dir },
    };
    this.dir = 'down';
    this.moving = false;
    this.frame = 0;
    this.animT = 0;
    this.x = e.x;
    this.y = e.y + 2;
    // Sonst rutschte die Figur im Bild vom alten Platz herüber: `renderPos`
    // mischt zwischen vorher und jetzt, und „vorher" wäre zwei Meter weiter.
    this.prevX = this.x;
    this.prevY = this.y;
    return true;
  }

  /** Aufstehen – zurück auf den Platz, von dem aus man sich gesetzt hat. */
  stehAuf() {
    if (!this.sitzt) return false;
    const z = this.sitzt.zurueck;
    this.sitzt = null;
    this.x = z.x;
    this.y = z.y;
    this.dir = z.dir;
    this.prevX = this.x;
    this.prevY = this.y;
    return true;
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
      // `e.reachR` schlägt die Art: Das Zuhause wächst vom Zelt zum Haus mit
      // Veranda und wird dabei doppelt so breit. Bliebe die Reichweite die
      // der Art, stünde man vor der Haustür und käme nicht hinein.
      const reach = (e.reachR != null ? e.reachR : def.reachR) || 72;
      const dx = e.x - this.x;
      const dy = (e.y - 16) - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > reach) continue;

      // Ein Beet ist etwas, mit dem man umgeht, nicht etwas, das man abbaut.
      // Ohne diese Zeile gewann jeder Baum in der Nähe gegen das Beet, sobald
      // man etwas anderes als die Hand trug – mit der Gießkanne also immer.
      const interactive = def.category === 'station' || def.category === 'spirit' ||
        def.category === 'fox' || def.category === 'hidden' || def.category === 'decor' ||
        def.category === 'crop';
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
      if (def.priority) score += def.priority;

      if (score > bestScore) {
        bestScore = score;
        best = { entity: e, def: def, dist: d, matches: matches };
      }
    }
    return best;
  }

  toJSON() {
    // Wer sitzt, wird stehend gespeichert – und zwar auf dem Platz, von dem
    // aus sie sich gesetzt hat. Sonst stünde sie beim nächsten Start mitten
    // in der Bank, und wäre die inzwischen weg, an einer beliebigen Stelle.
    const z = this.sitzt ? this.sitzt.zurueck : this;
    return {
      x: Math.round(z.x),
      y: Math.round(z.y),
      dir: z.dir,
      tool: this.toolIndex,
      levels: this.levels,
    };
  }

  static fromJSON(d) {
    const p = new Player(d.x, d.y);
    p.dir = d.dir || 'down';
    p.toolIndex = d.tool || 0;
    // Ein Spielstand von vor der Gießkanne kennt ihre Stufe nicht – dann ist
    // sie eben noch nicht gebaut, statt undefined zu sein.
    if (d.levels) p.levels = Object.assign({ can: 0 }, d.levels);
    if (!p.owns(p.toolIndex)) p.toolIndex = 0;
    return p;
  }
}
