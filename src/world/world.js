/** Weltmodell: Kacheln, Objekte, Kollision, räumlicher Index. */
import { T, TILE_SIZE, isWalkable, isWater } from '../art/tiles.js';
import {
  MAP_W, MAP_H, REGION, generateTiles, hoehenFuer, tileIndex, regionAt,
  walkableTilesOf, findWalkableNear, CAMP_TILE,
  FORD_X0, FORD_X1, RIVER_Y0, RIVER_Y1,
  CHANNEL_X0, CHANNEL_X1, BRIDGE_Y0, BRIDGE_Y1,
  DOCK_TILE, ISLE_DOCK_TILE, ALL_REGIONS, HIGHLAND_Y, MASSSTAB,
} from './worldgen.js';
import { makeEntity, defOf, spriteFor } from './entities.js';
import { makeRng, randInt, randPick, dailyRng, makeNoise2D, fbm } from '../core/rng.js';
import { syncIdCounter } from '../core/util.js';
import { inAnyPlot, inAnyPlotAt } from '../game/plot.js';
import { biomeFuer, BIOME } from './biome.js';
import { markenPlaetze } from './marken.js';

/** Eine Kachelzahl der alten 96er-Karte auf den aktuellen Maßstab. */
const M = function (n) { return Math.round(n * MASSSTAB); };

const CELL = 160;
const GRID_W = Math.ceil((MAP_W * TILE_SIZE) / CELL);
const GRID_H = Math.ceil((MAP_H * TILE_SIZE) / CELL);

export const WORLD_W = MAP_W * TILE_SIZE;
export const WORLD_H = MAP_H * TILE_SIZE;

/** Wo die Geister zuhause sind (Kachelkoordinaten). */
/**
 * Wo die Geister zuhause sind, in Kacheln der alten 96er-Karte.
 *
 * Mit `M()` auf den aktuellen Maßstab gerechnet, genau wie die
 * Geografie selbst – sonst säßen nach einer Vergrößerung alle sieben im
 * Nordwesten beieinander, während die Insel um sie herum gewachsen ist.
 * Die drei am Lager hängen ohnehin an `CAMP_TILE` und wandern mit.
 */
export const SPIRIT_HOMES = {
  flamey: { tx: CAMP_TILE.x, ty: CAMP_TILE.y - 3, region: REGION.CAMP },
  mira: { tx: CAMP_TILE.x - 11, ty: CAMP_TILE.y + 4, region: REGION.CAMP },
  kiesel: { tx: CAMP_TILE.x + 9, ty: CAMP_TILE.y + 11, region: REGION.CAMP },
  bruno: { tx: M(38), ty: M(26), region: REGION.FOREST },
  tobi: { tx: M(44), ty: M(14), region: REGION.FOREST },
  nelly: { tx: M(78), ty: M(50), region: REGION.CLIFFS },
  wanda: { tx: M(8), ty: M(44), region: REGION.ISLE },
};

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.w = MAP_W;
    this.h = MAP_H;
    this.tiles = generateTiles(this.seed);
    this.hoehen = hoehenFuer(this.seed);
    this.biome = biomeFuer(this.seed);
    this.entities = [];
    this.byId = Object.create(null);
    this.grid = new Array(GRID_W * GRID_H);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = [];
    this.groundDirty = true;
    this.groundStamp = 0;
    this.unlocked = [true, false, false, false];
    this.bridgeBuilt = false;
    /** Ausbaustufe des Grundstücks – die Welt liest sie beim Nachwachsen. */
    this.plotStage = 1;
    // 0 heißt: die Bucht auf der Insel ist noch nicht gekauft. Dann gibt es
    // sie nicht, und sie darf auch nichts vom Nachwachsen ausnehmen.
    this.islePlotStage = 0;
  }

  /* ---------- Kacheln ---------- */

  tileAtTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.WATER_DEEP;
    return this.tiles[tileIndex(tx, ty)];
  }

  /**
   * Auf welcher Höhenstufe diese Kachel liegt (0, 1 oder 2).
   *
   * Nur fürs BILD: Der Bodenmaler muss wissen, auf welcher Seite einer
   * Steilkante es nach oben geht. Für das Spiel selbst ist die Höhe
   * bedeutungslos – dort entscheidet allein, ob eine Kachel begehbar ist,
   * und eine Steilkante ist es nicht. Genau deshalb gibt es keine zweite
   * Begehbarkeitsregel.
   */
  hoeheAtTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
    return this.hoehen ? this.hoehen[tileIndex(tx, ty)] : 0;
  }

  /**
   * Welches Biom auf dieser Kachel liegt – nur fürs Bild.
   *
   * Der Bodenmaler legt je Biom eine andere Lasur. Für das Spiel ist das
   * Biom bedeutungslos: Es hat beim Erzeugen entschieden, was hier
   * wächst, und danach steht das Ergebnis in den Objekten. Eine zweite
   * Regel, die zur Laufzeit nach dem Biom fragt, gibt es nicht.
   */
  biomAtTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
    return this.biome ? this.biome[tileIndex(tx, ty)] : 0;
  }

  /** Die Bodenlasur dieses Bioms, oder null. Siehe `biomAtTile`. */
  biomTonAtTile(tx, ty) {
    const def = BIOME[this.biomAtTile(tx, ty)];
    return def && def.ton ? def.ton : null;
  }

  /**
   * Wie viel Gras hier wächst – als Faktor auf die gezeichneten Büschel.
   *
   * Der Bodenmaler zeichnet auf jede Graskachel kleine Grasbüschel. Das
   * war richtig, solange jede Graskachel eine Wiese war. In der Wüste
   * sah es falsch aus: Der Sandton lag korrekt über dem Boden, und
   * darauf standen trotzdem die Tusche-Büschel einer Wiese.
   *
   * Der Maler erfährt deshalb nicht, welches Biom hier liegt, sondern
   * nur WIE VIEL hier wächst – dieselbe Trennung wie beim Bodenton. Er
   * braucht eine Zahl, keine Landeskunde.
   */
  bewuchsAtTile(tx, ty) {
    const def = BIOME[this.biomAtTile(tx, ty)];
    return def && def.bewuchs != null ? def.bewuchs : 1;
  }

  tileAt(px, py) {
    return this.tileAtTile(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
  }

  setTile(tx, ty, t) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;
    const i = tileIndex(tx, ty);
    if (this.tiles[i] === t) return;
    this.tiles[i] = t;
    this.groundDirty = true;
    this.groundStamp++;
  }

  regionAtPixel(px, py) {
    return regionAt(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
  }

  isUnlocked(region) {
    return !!this.unlocked[region];
  }

  /* ---------- Objekte ---------- */

  cellIndex(px, py) {
    const cx = Math.floor(px / CELL);
    const cy = Math.floor(py / CELL);
    if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return -1;
    return cy * GRID_W + cx;
  }

  add(e) {
    this.entities.push(e);
    this.byId[e.id] = e;
    const ci = this.cellIndex(e.x, e.y);
    e._cell = ci;
    if (ci >= 0) this.grid[ci].push(e);
    syncIdCounter(e.id);
    return e;
  }

  remove(e) {
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
    delete this.byId[e.id];
    // Auch für Verweise ausserhalb der Liste (z. B. world.logBarrier) als
    // verschwunden markieren – der Spielstand wertet genau das aus.
    e.gone = true;
    if (e._cell >= 0) {
      const arr = this.grid[e._cell];
      const j = arr.indexOf(e);
      if (j >= 0) arr.splice(j, 1);
    }
  }

  /** Nach Positionsänderung eines Objekts aufrufen. */
  reindex(e) {
    const ci = this.cellIndex(e.x, e.y);
    if (ci === e._cell) return;
    if (e._cell >= 0) {
      const arr = this.grid[e._cell];
      const j = arr.indexOf(e);
      if (j >= 0) arr.splice(j, 1);
    }
    e._cell = ci;
    if (ci >= 0) this.grid[ci].push(e);
  }

  /** Alle Objekte in einem Rechteck (Weltpixel). */
  queryRect(x, y, w, h, out) {
    const res = out || [];
    const cx0 = Math.max(0, Math.floor(x / CELL));
    const cy0 = Math.max(0, Math.floor(y / CELL));
    const cx1 = Math.min(GRID_W - 1, Math.floor((x + w) / CELL));
    const cy1 = Math.min(GRID_H - 1, Math.floor((y + h) / CELL));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const arr = this.grid[cy * GRID_W + cx];
        for (let i = 0; i < arr.length; i++) res.push(arr[i]);
      }
    }
    return res;
  }

  queryNear(x, y, r, out) {
    const res = this.queryRect(x - r, y - r, r * 2, r * 2, out);
    return res;
  }

  /* ---------- Kollision ---------- */

  /** Blockende Ellipse eines Objekts. */
  blockShape(e) {
    const def = defOf(e.kind);
    if (!def || !def.solid || e.gone) return null;
    if (e.kind === 'decor' && e.flat) return null;
    const rx = e.blockR != null ? e.blockR : def.blockR || 6;
    const ry = e.blockH != null ? e.blockH : def.blockH || Math.max(3, rx * 0.5);
    return { x: e.x, y: e.y - 4, rx: rx, ry: ry };
  }

  /** Kann die Figur (Fussellipse) hier stehen? */
  canStand(px, py, rx, ry) {
    const hx = rx == null ? 15 : rx;
    const hy = ry == null ? 11 : ry;
    const pts = [
      [px - hx, py], [px + hx, py], [px, py - hy], [px, py + hy],
      [px - hx * 0.7, py - hy * 0.7], [px + hx * 0.7, py - hy * 0.7],
      [px - hx * 0.7, py + hy * 0.7], [px + hx * 0.7, py + hy * 0.7],
    ];
    for (let i = 0; i < pts.length; i++) {
      if (!isWalkable(this.tileAt(pts[i][0], pts[i][1]))) return false;
    }
    const near = this.queryNear(px, py, 170);
    for (let i = 0; i < near.length; i++) {
      const s = this.blockShape(near[i]);
      if (!s) continue;
      const dx = (px - s.x) / (s.rx + hx);
      const dy = (py - s.y) / (s.ry + hy);
      if (dx * dx + dy * dy < 1) return false;
    }
    return true;
  }

  /**
   * Trägt diese Stelle, oder ist sie eine Sandbank?
   *
   * Begehbar und brauchbar sind nicht dasselbe. Jede Insel hat neben
   * ihren drei Landmassen noch ein paar abgetrennte Fetzen – gemessen
   * über sechzig Inseln: im Mittel zwei, höchstens sechs, und keiner
   * größer als 72 Kacheln.
   *
   * Das war kein theoretischer Fall: Die Rettung für Spielstände von
   * der alten, kleinen Insel suchte die nächste BEGEHBARE Kachel und
   * setzte die Figur auf so einen Fetzen. Sie konnte laufen – drei
   * Schritte weit, und ringsum Wasser.
   *
   * Warum die Größe und nicht der Anschluss ans Lager: Weil die Insel
   * gar nicht durchgehend zu Fuß erreichbar IST. Brücke und Boot sind
   * keine begehbaren Kacheln, nur 60 % der Insel hängen zu Fuß am
   * Lager – auch gemessen. Wer „erreichbar vom Lager" verlangt, würde
   * jeden, der auf der Stillen Insel gespeichert hat, ans Lager
   * zurückwerfen. Die Größe trennt sauber: 72 gegen 883 Kacheln, auf
   * allen sechzig geprüften Inseln keine einzige dazwischen.
   *
   * Die Antwort wird einmal berechnet und behalten – die Kacheln
   * ändern sich nach der Erzeugung nicht mehr.
   */
  festerBoden(px, py) {
    const MINDEST = 200;
    if (!this._bodenGross) {
      const gross = new Uint8Array(MAP_W * MAP_H);
      const gesehen = new Uint8Array(MAP_W * MAP_H);
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          const i0 = tileIndex(tx, ty);
          if (gesehen[i0] || !isWalkable(this.tiles[i0])) continue;
          const masse = [i0];
          const stapel = [tx, ty];
          gesehen[i0] = 1;
          while (stapel.length) {
            const y = stapel.pop();
            const x = stapel.pop();
            const nachbarn = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
            for (let k = 0; k < 8; k += 2) {
              const nx = nachbarn[k];
              const ny = nachbarn[k + 1];
              if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
              const i = tileIndex(nx, ny);
              if (gesehen[i] || !isWalkable(this.tiles[i])) continue;
              gesehen[i] = 1;
              masse.push(i);
              stapel.push(nx, ny);
            }
          }
          if (masse.length >= MINDEST) {
            for (let k = 0; k < masse.length; k++) gross[masse[k]] = 1;
          }
        }
      }
      this._bodenGross = gross;
    }
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    return this._bodenGross[tileIndex(tx, ty)] === 1;
  }

  /** Ist an dieser Stelle Wasser (zum Angeln)? */
  waterAt(px, py) {
    return isWater(this.tileAt(px, py));
  }

  /** Frisches Wasser = Fluss/Kanal, sonst Meer. */
  waterKind(px, py) {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    const inRiver = ty >= RIVER_Y0 - 3 && ty <= RIVER_Y1 + 3;
    const inChannel = tx >= CHANNEL_X0 - 2 && tx <= CHANNEL_X1 + 2;
    return inRiver || inChannel ? 'fresh' : 'sea';
  }

  /* ---------- Aufbau ---------- */

  populate() {
    const rng = makeRng(this.seed ^ 0xabcdef);

    this._placeCamp();
    this._placeBarriers();
    this._placeBoats();
    this._setzeMarken();
    this._setzeHoehlen();
    this._scatterNature(rng);
    this._placeSpirits();
    return this;
  }

  /**
   * Die Landmarken hinstellen – VOR dem Streuwurf.
   *
   * Sie brauchen viel Platz und sehr bestimmte Stellen; wer zuletzt
   * kommt, findet keine mehr. Dieselbe Lehre wie bei den Geoden, nur
   * eine Nummer größer: Das Wrack braucht Strand am Wasser, und davon
   * gibt es auf einer Insel vielleicht ein Dutzend Kacheln.
   *
   * Dass ringsum danach nichts hineingestreut wird, besorgt der
   * Streuwurf von selbst – er fragt `_tooClose`, und eine Marke ist mit
   * Abstand das Größte auf der Insel.
   */
  _setzeMarken() {
    const plaetze = markenPlaetze(this);
    this.marken = [];
    for (let i = 0; i < plaetze.length; i++) {
      const p = plaetze[i];
      const e = makeEntity('marke', (p.tx + 0.5) * TILE_SIZE, (p.ty + 0.5) * TILE_SIZE);
      e.sprite = p.marke.sprite;
      e.blockR = p.marke.block;
      e.markeId = p.marke.id;
      this.add(e);
      this.marken.push({ id: p.marke.id, name: p.marke.name, x: e.x, y: e.y });
      /**
       * Und an die Mühle kommt eine Tür.
       *
       * Sie ist ein eigenes Objekt und nicht Teil des Mühlenbildes. Der
       * Grund ist nicht die Zeichnung, sondern die Reichweite: Die Marke
       * selbst sperrt 86 Punkte um ihre Mitte, und wer ein Gebäude
       * anspricht, steht davor, nicht darin. Eine Tür als eigenes Objekt
       * hat ihren eigenen, kleinen Umkreis genau dort, wo man steht.
       *
       * Etwas unterhalb der Mitte: Dadurch wird sie NACH dem Turm
       * gezeichnet und steht vor ihm statt dahinter.
       */
      if (p.marke.id === 'muehle') {
        const tuer = makeEntity('muehle_tuer', e.x, e.y + 14);
        this.add(tuer);
        this.muehleTuer = tuer;
      }
    }
    return this.marken;
  }

  /**
   * Höhleneingänge in die Steilkanten setzen.
   *
   * Eine Höhle gehört in einen Hang, nicht auf eine Wiese – deshalb wird
   * nach einer Klippenkachel gesucht, unter der (also südlich, zum
   * Betrachter hin) begehbarer Boden liegt. Genau dort sieht ein Loch im
   * Fels nach einem Loch im Fels aus.
   *
   * Drei Stück je Insel, weit auseinander. Weniger wäre auf einer Insel
   * dieser Größe eine Rarität, die man nie findet; mehr machte aus der
   * Höhle eine Sorte Gelände.
   */
  _setzeHoehlen() {
    const MIN_ABSTAND = 34;
    const gesetzt = [];
    const kandidaten = [];
    for (let ty = 2; ty < MAP_H - 3; ty++) {
      for (let tx = 2; tx < MAP_W - 2; tx++) {
        if (this.tiles[tileIndex(tx, ty)] !== T.CLIFF) continue;
        // Davor muss man stehen können, und zwar zwei Kacheln weit:
        // Mit nur einer stand der Eingang in einer Nische, aus der man
        // ihn nicht ansprechen konnte.
        if (!isWalkable(this.tiles[tileIndex(tx, ty + 1)])) continue;
        if (!isWalkable(this.tiles[tileIndex(tx, ty + 2)])) continue;
        if (!isWalkable(this.tiles[tileIndex(tx - 1, ty + 1)])) continue;
        if (!isWalkable(this.tiles[tileIndex(tx + 1, ty + 1)])) continue;
        kandidaten.push({ tx: tx, ty: ty });
      }
    }
    // Von der Mitte weg sortieren, damit die drei nicht alle am selben
    // Hang hängen: Der erste nimmt, was kommt, jeder weitere braucht
    // Abstand zu allen vorigen.
    const rng = makeRng(this.seed ^ 0x40c1e);
    for (let i = kandidaten.length - 1; i > 0; i--) {
      const k = Math.floor(rng() * (i + 1));
      const t = kandidaten[i];
      kandidaten[i] = kandidaten[k];
      kandidaten[k] = t;
    }
    this.hoehlen = [];
    for (let i = 0; i < kandidaten.length && this.hoehlen.length < 3; i++) {
      const k = kandidaten[i];
      let weit = true;
      for (let j = 0; j < gesetzt.length; j++) {
        const dx = gesetzt[j].tx - k.tx;
        const dy = gesetzt[j].ty - k.ty;
        if (dx * dx + dy * dy < MIN_ABSTAND * MIN_ABSTAND) { weit = false; break; }
      }
      if (!weit) continue;
      gesetzt.push(k);
      const e = makeEntity('hoehle_eingang',
        (k.tx + 0.5) * TILE_SIZE, (k.ty + 1) * TILE_SIZE);
      this.add(e);
      this.hoehlen.push({ x: e.x, y: e.y });
    }
    return this.hoehlen;
  }

  _placeCamp() {
    const cx = CAMP_TILE.x;
    const cy = CAMP_TILE.y;
    const px = function (tx) { return (tx + 0.5) * TILE_SIZE; };
    this.campfire = this.add(makeEntity('campfire', px(cx), px(cy)));
    this.tent = this.add(makeEntity('tent', px(cx - 5), px(cy - 2)));
    this.workbench = this.add(makeEntity('workbench', px(cx + 5), px(cy - 1)));
    this.stall = this.add(makeEntity('stall', px(cx + 4), px(cy + 5)));
    // Neben dem Feuer, gegenüber der Werkbank: Was man kocht, kocht man am
    // Feuer, und wer morgens aus dem Zelt kommt, läuft daran vorbei.
    this.kitchen = this.add(makeEntity('kitchen', px(cx - 4), px(cy + 4)));
    // Der Briefkasten steht neben dem Zelt: Wer morgens aufwacht, läuft
    // an ihm vorbei, ohne ihn suchen zu müssen.
    this.mailbox = this.add(makeEntity('mailbox', px(cx - 7), px(cy - 1)));
    // Die Truhe steht von Anfang an da – wie die Boote am Sund. Bis die
    // erste Ausbaustufe bezahlt ist, lässt sie sich nur nicht öffnen.
    //
    // Vorher war sie `gone`, und `_canPlaceAt` überspringt genau das: Man
    // konnte eine Bank auf ihren Platz stellen, und nach dem Bezahlen stand
    // die Truhe mitten darin.
    this.storage = this.add(makeEntity('storage', px(cx + 7), px(cy + 3)));
    this.fox = this.add(makeEntity('fox', px(cx + 4), px(cy + 7)));
  }

  _placeBarriers() {
    const midX = (FORD_X0 + FORD_X1 + 1) / 2;
    const midY = (RIVER_Y0 + RIVER_Y1 + 1) / 2;
    this.logBarrier = this.add(makeEntity('log_barrier', midX * TILE_SIZE, (midY + 2.2) * TILE_SIZE));

    const by = (BRIDGE_Y0 + BRIDGE_Y1 + 1) / 2;
    this.bridgeSpot = this.add(makeEntity('bridge_spot', (CHANNEL_X0 - 1.5) * TILE_SIZE, by * TILE_SIZE));

    // Geröllhalde versperrt eine Nische auf den Klippen
    const nook = findWalkableNear(this.tiles, 86, 46, 10, REGION.CLIFFS);
    if (nook) {
      this.rockslide = this.add(makeEntity('rockslide', (nook.x + 0.5) * TILE_SIZE, (nook.y + 0.5) * TILE_SIZE));
    }
  }

  /**
   * Die beiden Ruderboote – eines an jedem Ufer des Sunds.
   *
   * Sie stehen von Anfang an da, aber sie fahren erst, wenn die Stille Insel
   * freigeschaltet ist. Ein Boot, das erst auftaucht, wenn man es benutzen
   * darf, erklärt nichts; eines, das schon da liegt, macht neugierig.
   */
  _placeBoats() {
    const hier = findWalkableNear(this.tiles, DOCK_TILE.x, DOCK_TILE.y, 14, REGION.CAMP);
    const drueben = findWalkableNear(this.tiles, ISLE_DOCK_TILE.x, ISLE_DOCK_TILE.y, 14, REGION.ISLE);
    if (hier) {
      this.dock = this.add(makeEntity('boat', (hier.x + 0.5) * TILE_SIZE, (hier.y + 0.5) * TILE_SIZE, {
        toRegion: REGION.ISLE,
      }));
    }
    if (drueben) {
      this.isleDock = this.add(makeEntity('boat', (drueben.x + 0.5) * TILE_SIZE, (drueben.y + 0.5) * TILE_SIZE, {
        toRegion: REGION.CAMP,
      }));
    }
  }

  _scatterNature(rng) {
    const self = this;
    const campCenterX = (CAMP_TILE.x + 0.5) * TILE_SIZE;
    const campCenterY = (CAMP_TILE.y + 0.5) * TILE_SIZE;

    function farFromCamp(tx, ty) {
      const dx = (tx + 0.5) * TILE_SIZE - campCenterX;
      const dy = (ty + 0.5) * TILE_SIZE - campCenterY;
      return dx * dx + dy * dy > 352 * 352;
    }
    function nearFord(tx, ty) {
      return tx >= FORD_X0 - 2 && tx <= FORD_X1 + 2 && ty >= RIVER_Y0 - 6 && ty <= RIVER_Y1 + 6;
    }
    function nearBridge(tx, ty) {
      return tx >= CHANNEL_X0 - 5 && tx <= CHANNEL_X1 + 5 && ty >= BRIDGE_Y0 - 4 && ty <= BRIDGE_Y1 + 4;
    }

    /**
     * Das Lichtungsfeld – wo die Insel dicht ist und wo man weit sieht.
     *
     * Die Dichte zu senken hat die Insel leerer gemacht, aber nicht
     * abwechslungsreicher: Es standen überall GLEICH VIELE Bäume, nur
     * weniger. Auf einem Bild vom Lager war kein Fleck ohne Baum und
     * kein Fleck mit Platz – genau das heißt „alles sieht gleich aus".
     *
     * Im Vorbild wechseln sich Dickicht und Wiese ab. Das ist keine
     * Frage der Anzahl, sondern der VERTEILUNG. Ein grobes Rauschen
     * (eine Welle über etwa fünfzehn Kacheln) sagt für jede Kachel, wie
     * dicht es dort sein soll. Wo es niedrig steht, wird ein Platz
     * verworfen – der Baum geht nicht verloren, er wird woanders
     * gesetzt, weil scatter weitersucht, bis die Zahl erreicht ist.
     * Dieselbe Menge Wald, aber in Gruppen statt im Raster.
     *
     * Nur Bäume und Büsche folgen dem Feld. Gras, Blumen und Steine
     * dürfen auch auf der Lichtung liegen – eine Wiese ohne Grasbüschel
     * wäre ein Rasen, keine Lichtung.
     */
    const lichtRausch = makeNoise2D(this.seed ^ 0x5eed10);
    function lichtungsFeld(tx, ty) {
      // 2 Oktaven: die große Welle bestimmt Wald oder Wiese, die kleine
      // franst den Rand aus, damit keine Kreise entstehen.
      const n = fbm(lichtRausch, tx * 0.062, ty * 0.062, 2, 2, 0.45);
      // fbm liefert 0 bis 1 mit dem Schwerpunkt bei 0,47 – NICHT -1 bis
      // 1, wie zuerst gerechnet. Mit der falschen Annahme lag der Wert
      // nie unter 0,59, das Feld lehnte so gut wie nichts ab, und die
      // Insel sah danach exakt genauso aus wie davor. Nachgemessen,
      // nicht geraten: 10 % der Fläche liegen unter 0,275, 90 % unter
      // 0,689.
      //
      // Um diesen Schwerpunkt wird gespreizt, und zwar über die Ränder
      // hinaus: Unten wird abgeschnitten, damit es Stellen gibt, an
      // denen WIRKLICH nichts wächst, oben, damit das Dickicht nicht
      // beliebig dicht wird.
      return Math.max(0, Math.min(1.3, (n - 0.47) * 3.6 + 0.5));
    }

    function scatter(kinds, spots, count, spacing, nachbehandeln, nachFeld) {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < count * 30 && spots.length) {
        const s = spots[Math.floor(rng() * spots.length)];
        if (nearFord(s.x, s.y) || nearBridge(s.x, s.y)) continue;
        if (nachFeld && rng() > lichtungsFeld(s.x, s.y)) continue;
        const wx = (s.x + 0.5) * TILE_SIZE + (rng() - 0.5) * 8;
        const wy = (s.y + 0.5) * TILE_SIZE + (rng() - 0.5) * 8;
        if (self._tooClose(wx, wy, spacing)) continue;
        const kind = randPick(rng, kinds);
        const e = makeEntity(kind, wx, wy);
        if (nachbehandeln) nachbehandeln(e, s.x, s.y);
        self.add(e);
        placed++;
      }
    }

    /**
     * In welche Richtung das Wasser liegt: -1 links, +1 rechts, 0 keins.
     *
     * Dafür wird in beide Richtungen bis zu sechs Kacheln weit geschaut.
     * Sechs, weil zwischen Grasnarbe und Wasser meistens noch ein Streifen
     * Sand liegt – mit zwei Kacheln fand der Uferbaum fast nie ein Ufer.
     */
    /**
     * Die Windrichtung dieser Insel, wenn kein Wasser in der Nähe ist.
     *
     * Auf der Heide stehen Windbäume mitten im Land – dort gibt es keine
     * See, von der der Wind käme, und trotzdem darf nicht jeder Baum in
     * eine andere Richtung hängen. Also hat jede Insel eine
     * vorherrschende Windrichtung, und landeinwärts gilt die.
     *
     * Das war ein echter Fehler: Als die Biome den Windbaum auf die Heide
     * streuten, bekam er dort gar keine Neigung zugewiesen und fiel auf
     * die Zufallsspiegelung zurück. Fünf von zweiundzwanzig lehnten gegen
     * ihre Nachbarn, und eine Prüfung fing es.
     */
    const inselWind = (this.seed & 1) ? 1 : -1;

    function wasserSeite(tx, ty) {
      // Das NÄCHSTE Wasser in jeder Richtung, nicht nur waagerecht.
      //
      // Erst wurde nur nach links und rechts geschaut. An einer Küste,
      // die von Norden nach Süden verläuft, fand das kein Wasser, und der
      // Baum fiel auf die Windrichtung der Insel zurück – während die
      // Prüfung, die in alle Richtungen sucht, ihn als Uferbaum zählte.
      // Zwei verschiedene Begriffe von „am Ufer", und die Prüfung hatte
      // recht.
      let best = null;
      let nah = 1e9;
      for (let dy = -10; dy <= 10; dy++) {
        for (let dx = -10; dx <= 10; dx++) {
          if (!isWater(self.tileAtTile(tx + dx, ty + dy))) continue;
          const d = dx * dx + dy * dy;
          if (d >= nah) continue;
          nah = d;
          best = dx;
        }
      }
      // Liegt das Wasser genau über oder unter der Kachel, gibt es keine
      // Seite, zu der er sich neigen könnte.
      if (best === null || best === 0) return 0;
      return best < 0 ? -1 : 1;
    }

    /** Wohin ein Windbaum hier lehnt: vom Wasser weg, sonst mit dem Wind. */
    function windNeigung(tx, ty) {
      const seite = wasserSeite(tx, ty);
      return seite ? -seite : inselWind;
    }

    /**
     * Die Uferbäume setzen.
     *
     * Ein eigener Durchgang statt eines Eintrags in `scatter`, weil jeder
     * dieser Bäume seine Neigung von der Landschaft bekommt und nicht vom
     * Zufall: Wind kommt von der See, also lehnt der Baum landeinwärts.
     * Stünden am selben Ufer welche in beide Richtungen, wäre es kein Wind
     * mehr, sondern Beliebigkeit – und genau das sieht man sofort.
     *
     * `lehnt` wird nicht gespeichert und muss es auch nicht: Die Welt wird
     * beim Laden aus dem Samen neu gebaut, und dabei kommt hier dasselbe
     * heraus.
     */
    function uferbaeume(spots, count, spacing) {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < count * 40 && spots.length) {
        const s = spots[Math.floor(rng() * spots.length)];
        if (nearFord(s.x, s.y) || nearBridge(s.x, s.y)) continue;
        const seite = wasserSeite(s.x, s.y);
        if (!seite) continue;
        const wx = (s.x + 0.5) * TILE_SIZE + (rng() - 0.5) * 8;
        const wy = (s.y + 0.5) * TILE_SIZE + (rng() - 0.5) * 8;
        if (self._tooClose(wx, wy, spacing)) continue;
        const e = makeEntity('tree_wind', wx, wy);
        e.lehnt = -seite; // vom Wasser weg
        self.add(e);
        placed++;
      }
    }

    const grassCamp = walkableTilesOf(this.tiles, REGION.CAMP, function (t, tx, ty) {
      return t === T.GRASS && farFromCamp(tx, ty);
    });
    const sandCamp = walkableTilesOf(this.tiles, REGION.CAMP, function (t) { return t === T.SAND; });
    const grassForest = walkableTilesOf(this.tiles, REGION.FOREST, function (t) { return t === T.GRASS || t === T.DIRT; });
    const cliffLand = walkableTilesOf(this.tiles, REGION.CLIFFS, function (t) { return t === T.GRASS || t === T.ROCKFLOOR; });
    const cliffSand = walkableTilesOf(this.tiles, REGION.CLIFFS, function (t) { return t === T.SAND; });

    // Die Stille Insel zerfällt in zwei Hälften: unten der grüne Süden
    // mit Wanda, oben das Hochland aus Fels. Nur dort liegen Granit und
    // Geoden, und nur dafür lohnen die letzten beiden Spitzhackenstufen.
    // Ein Bereich, den man mit dem Werkzeug vom ersten Tag leerräumt,
    // wäre bloß größer.
    const isleAll = walkableTilesOf(this.tiles, REGION.ISLE, function (t) {
      return t === T.GRASS || t === T.ROCKFLOOR || t === T.DIRT;
    });
    const isleLand = isleAll.filter(function (p) { return p.y >= HIGHLAND_Y; });
    const isleHigh = isleAll.filter(function (p) { return p.y < HIGHLAND_Y; });
    const isleSand = walkableTilesOf(this.tiles, REGION.ISLE, function (t) { return t === T.SAND; });

    /**
     * Die Zahlen sind MESSWERTE, keine Schätzungen.
     *
     * Gemessen an vier Bildern des Vorbilds: Dort steht auf einem
     * Bildschirm ungefähr ein Gegenstand je Kachel – Treibholz, Muscheln,
     * Kiesel, Grasbüschel, Korallen, alles dicht an dicht. Bei uns waren
     * es 25 Gegenstände je 100 begehbare Kacheln, also einer alle vier.
     * Daran und nicht an der Palette hing der Eindruck von Leere.
     *
     * Verdoppelt wird fast nur das KLEINE: Grasbüschel, Blumen, Muscheln,
     * Treibholz, Federn, Kräuter. Bäume und Felsen steigen kaum, denn sie
     * sind fest – eine doppelt so dichte Wiese ist voll, ein doppelt so
     * dichter Wald ist eine Wand.
     */
    /**
     * Der Streuwurf läuft jetzt über BIOME, nicht über Bereiche.
     *
     * Vorher stand hier für jeden der vier Bereiche eine Liste fester
     * Zahlen – „46 Bäume ins Lager, 78 in den Wald". Das Ergebnis waren
     * vier Gegenden, die sich in der Dichte unterschieden und sonst in
     * nichts: überall dieselbe Mischung aus Eiche, Birke und Ahorn,
     * überall dieselben Blumen. Man konnte stehenbleiben und nicht sagen,
     * wo man ist.
     *
     * Jetzt entscheidet das Biom, und die Biome liegen QUER zu den
     * Bereichen (siehe `biome.js`). Ein Birkenhain besteht aus Birken,
     * ein Nadelwald aus Kiefern und Pilzen, eine Heide fast aus nichts.
     * Die Dichten stehen dort als Zahl je 100 Kacheln, nicht als
     * Gesamtzahl: Ein Biom, das auf einer Insel groß und auf der nächsten
     * klein ausfällt, wäre sonst einmal Wald und einmal Lichtung.
     */
    /**
     * ZUERST das Seltene, dann der Bewuchs.
     *
     * Granit, Geoden und Erz hängen am Ort und nicht am Bewuchs – sie
     * sind der Grund, überhaupt ins Hochland oder an die Klippen zu
     * gehen. Sie brauchen viel Abstand voneinander (eine Geode alle 144
     * Punkte), und wer zuletzt kommt, findet bei dichtem Bewuchs keinen
     * Platz mehr: Nach dem Biomwurf blieb auf einer Insel keine einzige
     * Geode übrig, und eine Prüfung fing das. Das Seltene wirft zuerst.
     */
    scatter(['rock_granite'], isleHigh, 26, 76);
    scatter(['rock_geode'], isleHigh, 7, 144);
    scatter(['rock_ore'], isleHigh, 10, 84);
    scatter(['rock_ore'], isleLand, 12, 68);
    scatter(['rock_ore'], cliffLand, 15, 84);
    scatter(['rock_ore'], grassForest, 5, 100);

    /**
     * Wie voll die Insel insgesamt ist – ein Faktor über alle Biome.
     *
     * Gemessen am Vorbild stand auf einem Bildschirm ungefähr ein
     * Gegenstand je Kachel, und danach war die Dichte eingestellt: 45
     * Gegenstände je 100 begehbare Kacheln statt 25. Im eigenen Spiel
     * war das zu viel – man sah vor lauter Bäumen das Lager nicht mehr.
     *
     * Der Grund, warum dieselbe Zahl dort richtig und hier falsch ist:
     * Im Vorbild sind die Gegenstände KLEINER im Verhältnis zur Kachel.
     * Ein Baum dort verdeckt ein Viertel dessen, was unser Baum
     * verdeckt – dichter stehen heißt dort voller, hier zugewachsen.
     *
     * 0,72 bringt rund 33 je 100 Kacheln: deutlich voller als die
     * leeren 25 von vorher, aber eine Insel, auf der man noch etwas
     * sieht. Bäume bekommen zusätzlich 0,7, weil sie fest sind und die
     * Sicht verstellen; Blumen und Grasbüschel tun weder das eine noch
     * das andere.
     */
    const DICHTE = 0.72;
    const BAUM_DICHTE = 0.58;

    const biome = biomeFuer(this.seed);
    const nachBiom = {};
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = this.tiles[tileIndex(tx, ty)];
        if (t !== T.GRASS && t !== T.DIRT && t !== T.ROCKFLOOR) continue;
        if (farFromCamp(tx, ty) === false && regionAt(tx, ty) === REGION.CAMP) continue;
        // Die erste Grundstücksstufe bleibt licht.
        //
        // Sie ist die Lichtung, die einem ohnehin gehört, und der Ort, an
        // dem man am ersten Nachmittag anfängt. Mit der verdoppelten
        // Dichte standen dort plötzlich 42 Dinge zum Wegräumen statt ein
        // Dutzend – eine Woche Arbeit, bevor überhaupt etwas Eigenes
        // hinpasst. Eine Prüfung fing das.
        //
        // Nur die ERSTE Stufe: Die drei gekauften Erweiterungen sollen
        // bewachsen sein, sonst kauft man leeren Rasen.
        if (inAnyPlot(tx, ty, 1, 0)) continue;
        const b = biome[tileIndex(tx, ty)];
        if (!nachBiom[b]) nachBiom[b] = [];
        nachBiom[b].push({ x: tx, y: ty });
      }
    }
    for (const b in nachBiom) {
      const def = BIOME[b];
      const felder = nachBiom[b];
      if (!def || felder.length < 12) continue;
      const je100 = function (n) {
        return Math.round((felder.length * n / 100) * DICHTE);
      };
      const arten = def.baeume.map(function (e) { return e[0]; });
      const gewichte = [];
      for (let i = 0; i < def.baeume.length; i++) {
        for (let k = 0; k < def.baeume[i][1]; k++) gewichte.push(def.baeume[i][0]);
      }
      // Bäume dünner als das Kleinzeug: Sie sind fest und verstellen die
      // Sicht, ein Grasbüschel tut weder das eine noch das andere.
      scatter(gewichte, felder, Math.round(je100(def.dichteBaum) * BAUM_DICHTE),
        70, function (e, tx, ty) {
        if (e.kind === 'tree_wind') e.lehnt = windNeigung(tx, ty);
      }, true);
      scatter(['bush_berry', 'bush_plain'], felder, je100(def.busch), 56, null, true);
      for (let i = 0; i < def.boden.length; i++) {
        const kind = def.boden[i][0];
        // Felsen brauchen Abstand, Grasbüschel nicht: Ein Findling alle
        // vierzig Punkte wäre eine Mauer.
        const abstand = kind.indexOf('rock') === 0 ? 62 : 28;
        scatter([kind], felder, je100(def.boden[i][1]), abstand);
      }
      if (arten.length) scatter(['feather'], felder, je100(1.2), 46);
    }

    /**
     * Und dann doch eine Handvoll auf die Lichtung.
     *
     * Ganz leer darf sie nicht sein: Ein Grundstück, auf dem nichts
     * steht, gibt am ersten Nachmittag nichts zu tun und nichts her –
     * kein Holz, keine Beeren, keinen Grund, die Axt überhaupt
     * auszupacken. Eine Prüfung verlangt zwischen drei und vierzig
     * Dingen, und beide Grenzen sind richtig: genug, dass es Arbeit ist,
     * wenig genug, dass man anfängt.
     */
    const lichtung = [];
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (!inAnyPlot(tx, ty, 1, 0)) continue;
        if (this.tiles[tileIndex(tx, ty)] !== T.GRASS) continue;
        if (!farFromCamp(tx, ty)) continue;
        lichtung.push({ x: tx, y: ty });
      }
    }
    scatter(['tree_oak', 'tree_birch'], lichtung, 4, 96);
    scatter(['bush_berry'], lichtung, 3, 80);
    scatter(['grass_tuft'], lichtung, 9, 56);
    scatter(['flower_pink', 'flower_yellow'], lichtung, 5, 64);

    // Was am BODEN hängt und nicht am Biom: der Strand und die
    // Uferbäume. Beides gibt es, weil dort Wasser ist, nicht weil dort
    // etwas Bestimmtes wächst.
    scatter(['shell', 'driftwood'], sandCamp, 62, 30);
    scatter(['reeds'], sandCamp, 32, 38);
    scatter(['feather'], sandCamp, 16, 44);
    scatter(['shell', 'driftwood'], isleSand, 42, 30);
    scatter(['reeds'], isleSand, 20, 36);
    scatter(['shell', 'driftwood'], cliffSand, 34, 32);
    scatter(['feather'], cliffSand, 13, 44);
    uferbaeume(grassCamp, 16, 70);
    uferbaeume(isleLand, 8, 76);
    uferbaeume(cliffLand, 10, 76);

  }

  /**
   * Wie `_tooClose`, zählt aber nur, was im Weg STEHT.
   *
   * Die Unterscheidung wurde nötig, als die Insel doppelt so dicht
   * bewachsen wurde: `_tooClose` zählt jedes Grasbüschel und jede Blume
   * mit, und mit einem Mindestabstand von 90 Punkten lag damit
   * praktisch jede Kachel „zu nah an etwas". Die Grabstellen fanden
   * keinen Platz mehr und blieben unter ihrer Zahl – am Fundtag kamen 13
   * statt der doppelten Menge heraus, und eine Prüfung fing es.
   *
   * Eine Blume neben einer Grabstelle stört niemanden. Ein Findling
   * schon.
   */
  _tooCloseSolid(x, y, r) {
    const near = this.queryNear(x, y, r);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.gone) continue;
      const def = defOf(e.kind);
      if (!def || !def.solid) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  /** Steht schon eine Kachel dieser Art im Umkreis? */
  _tooCloseKind(x, y, r, kind) {
    const near = this.queryNear(x, y, r);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.gone || e.kind !== kind) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  _tooClose(x, y, r) {
    const near = this.queryNear(x, y, r);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  _placeSpirits() {
    for (const id in SPIRIT_HOMES) {
      const home = SPIRIT_HOMES[id];
      const spot = findWalkableNear(this.tiles, home.tx, home.ty, 14, home.region) || home;
      const e = makeEntity('spirit', (spot.x + 0.5) * TILE_SIZE, (spot.y + 0.5) * TILE_SIZE, {
        spiritId: id,
        region: home.region,
        homeX: (spot.x + 0.5) * TILE_SIZE,
        homeY: (spot.y + 0.5) * TILE_SIZE,
      });
      e.sprite = 'spirit_' + id + '_0';
      this.add(e);
    }
  }

  /**
   * Wohin dieses Boot fährt – der Landeplatz neben dem Boot am anderen Ufer.
   *
   * Nicht auf das Boot selbst, sondern eine Kachel daneben: Man soll drüben
   * stehen und das Boot sehen, nicht darin.
   */
  /**
   * Wo einen die Überfahrt absetzt.
   *
   * Gesucht wird ein Platz, auf dem man wirklich STEHEN kann, nicht nur
   * begehbarer Boden: `findWalkableNear` kennt die Kacheln, aber nicht, was
   * darauf steht. Über sechzig Seeds gemessen landete man einmal in einem
   * Findling und steckte fest – nie im Wasser, immer an einem Objekt.
   */
  boatTarget(boat) {
    const anderes = boat === this.dock ? this.isleDock : this.dock;
    if (!anderes) return null;
    const tx = Math.floor(anderes.x / TILE_SIZE);
    const ty = Math.floor(anderes.y / TILE_SIZE);
    const region = regionAt(tx, ty);
    for (let r = 0; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = tx + dx;
          const y = ty + 1 + dy;
          if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
          if (regionAt(x, y) !== region) continue;
          if (!isWalkable(this.tileAtTile(x, y))) continue;
          const px = (x + 0.5) * TILE_SIZE;
          const py = (y + 0.5) * TILE_SIZE;
          if (!this.canStand(px, py, 12, 8)) continue;
          return { x: px, y: py };
        }
      }
    }
    // Notnagel: lieber auf freiem Boden als gar nicht übersetzen.
    const spot = findWalkableNear(this.tiles, tx, ty + 1, 8, region) || { x: tx, y: ty };
    return { x: (spot.x + 0.5) * TILE_SIZE, y: (spot.y + 0.5) * TILE_SIZE };
  }

  /**
   * Ein freier Fleck Sand im Lagerbereich.
   *
   * Für den Wanderer. Er soll am Strand stehen, nicht im Boot: Der erste
   * Entwurf setzte ihn neben das Boot, und im Bildschirmfoto stand er
   * darin. Schlimmer als das Bild war die Folge – über 250 Inseln gemessen
   * zielte die Taste in 1,5 % der Fälle auf das BOOT statt auf ihn, und wer
   * mit jemandem reden will und stattdessen übersetzt, hat den schlechtesten
   * Fehler erwischt, den diese Insel anbieten kann.
   *
   * Deshalb hier: Sand, und mit ausdrücklichem Abstand zu allem, was eine
   * Station ist. Die Regel steht nicht im Spiel, sondern hier, weil die
   * Kachelkarte hier liegt.
   *
   * @param {function} rng      Tageswurf – gleiche Insel, gleicher Tag, gleicher Platz
   * @param {object} nahBei     {x, y} – in dessen Nähe gesucht wird
   * @param {number} maxWeg     wie weit weg der Fleck höchstens liegen darf
   * @param {number} vonStation Mindestabstand zu Booten, Läden, Truhen, Feuer
   * @param {number} frei       Mindestabstand zu allem anderen
   */
  strandPlatz(rng, nahBei, maxWeg, vonStation, frei) {
    const sand = walkableTilesOf(this.tiles, REGION.CAMP, function (t) {
      return t === T.SAND;
    });
    const passt = [];
    for (let i = 0; i < sand.length; i++) {
      const wx = (sand[i].x + 0.5) * TILE_SIZE;
      const wy = (sand[i].y + 0.5) * TILE_SIZE;
      const dx = wx - nahBei.x;
      const dy = wy - nahBei.y;
      if (dx * dx + dy * dy > maxWeg * maxWeg) continue;
      if (!this.canStand(wx, wy, 16, 10)) continue;
      // Der Abstand wird NACHGERECHNET: `queryNear` arbeitet auf einem
      // 160-Punkte-Raster und meldet auch Nachbarn, die weiter weg sind.
      const nah = this.queryNear(wx, wy, Math.max(vonStation, frei));
      let gut = true;
      for (let k = 0; k < nah.length && gut; k++) {
        const e = nah[k];
        if (e.gone) continue;
        const d = defOf(e.kind);
        if (!d) continue;
        const r = (d.category === 'station' || d.category === 'spirit' ||
          d.category === 'fox') ? vonStation : frei;
        const ex = e.x - wx;
        const ey = e.y - wy;
        if (ex * ex + ey * ey < r * r) gut = false;
      }
      if (gut) passt.push({ x: wx, y: wy });
    }
    if (!passt.length) return null;
    return passt[Math.floor(rng() * passt.length)];
  }

  spiritEntity(id) {
    for (let i = 0; i < this.entities.length; i++) {
      if (this.entities[i].kind === 'spirit' && this.entities[i].spiritId === id) return this.entities[i];
    }
    return null;
  }

  /* ---------- Fortschritt ---------- */

  unlockRegion(region) {
    if (this.unlocked[region]) return false;
    this.unlocked[region] = true;
    return true;
  }

  buildBridge() {
    if (this.bridgeBuilt) return false;
    for (let ty = BRIDGE_Y0; ty <= BRIDGE_Y1; ty++) {
      for (let tx = CHANNEL_X0 - 2; tx <= CHANNEL_X1 + 2; tx++) {
        if (isWater(this.tileAtTile(tx, ty))) this.setTile(tx, ty, T.BRIDGE);
      }
    }
    this.bridgeBuilt = true;
    this.unlockRegion(REGION.CLIFFS);
    if (this.bridgeSpot) this.remove(this.bridgeSpot);
    return true;
  }

  /* ---------- Tageswechsel ---------- */

  /**
   * Erneuert die Insel für einen neuen Tag:
   * abgebaute Objekte kehren zurück, Grabstellen werden neu verteilt.
   */
  /**
   * @param {number} day Inseltag
   * @param {object} [ereignis] Tagesereignis: { digs: Faktor, streut: Liste }
   */
  newDay(day, ereignis) {
    const rng = dailyRng(this.seed, day, 'world');
    const ev = ereignis || {};

    // Was ein Tagesereignis gestern ausgestreut hat, wird zuerst wieder
    // eingesammelt. Sonst blühte die Insel nach einer Woche Blütentagen
    // durchgehend, und das Besondere wäre verbraucht.
    for (let i = this.entities.length - 1; i >= 0; i--) {
      if (this.entities[i].fromEvent) this.remove(this.entities[i]);
    }

    // Rückwärts: Auf dem Grundstück wird hier entfernt, und `remove` rückt
    // die Liste zusammen – vorwärts übersprungen man dabei den Nachbarn.
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.gone && e.kind !== 'tree_stump') {
        const def = defOf(e.kind);
        if (def && def.hits) e.hp = def.hits;
        continue;
      }
      if (e.respawnDay && day >= e.respawnDay) {
        // Auf dem Grundstück wächst nichts nach. Das ist die ganze Regel,
        // und sie ist der Grund, warum man dort überhaupt bauen kann: Ohne
        // sie stand der gefällte Baum drei Tage später wieder mitten im
        // Garten. Gefundenes und Grabstellen bleiben davon unberührt – die
        // legt `_respawnDigspots` ohnehin neu aus.
        if (inAnyPlotAt(e.x, e.y, this.plotStage, this.islePlotStage)) {
          this.remove(e);
          continue;
        }
        if (e.origin) {
          e.kind = e.origin;
          e.sprite = spriteFor(e.origin, e.x, e.y) || e.sprite;
          e.origin = null;
        }
        e.gone = false;
        e.respawnDay = 0;
        const def = defOf(e.kind);
        e.hp = def && def.hits ? def.hits : 0;
      }
    }

    this._respawnDigspots(rng, ev.digs || 1);
    this._featherUnderBirdhouses(rng);
    // Alles, was heute gestreut wird – und was das GESTRIGE Ereignis für
    // heute Morgen hinterlassen hat. Beides steht in derselben Liste, weil
    // es für die Insel kein Unterschied ist; den Unterschied macht
    // `_todayWorldEffects`, das die Liste zusammenstellt.
    const streut = ev.streut || [];
    for (let i = 0; i < streut.length; i++) this._streuen(rng, streut[i]);
    return this;
  }

  /**
   * Welche Kacheln bei Niedrigwasser frei liegen.
   *
   * Flaches Wasser (`T.WATER`, nie `WATER_DEEP`) innerhalb weniger Kacheln
   * vom begehbaren Ufer. Zwei Bedingungen, und beide sind wichtig:
   *
   *   Nur flaches Wasser – damit nie ein Weg über die offene See entsteht.
   *   Nur in Ufernähe – damit das Watt ein Saum bleibt und keine zweite
   *   Insel, über die man minutenlang läuft.
   *
   * Das Ergebnis hängt allein an der erzeugten Karte und wird deshalb EINMAL
   * gerechnet und gemerkt: Die Abtastung geht über alle 9216 Kacheln und je
   * Kachel über ihre Umgebung, und das Ergebnis ändert sich nie.
   *
   * @param {number} breite Reichweite in Kacheln vom Ufer
   */
  wattKacheln(breite) {
    const r = Math.max(1, breite | 0);
    if (this._watt && this._wattBreite === r) return this._watt;

    const kandidaten = new Set();
    const self = this;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (this.tileAtTile(x, y) !== T.WATER) continue;
        // Liegt begehbarer Grund in Reichweite?
        let amUfer = false;
        for (let dy = -r; dy <= r && !amUfer; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue;
            if (isWalkable(this.tileAtTile(x + dx, y + dy))) { amUfer = true; break; }
          }
        }
        if (amUfer) kandidaten.add(x + ',' + y);
      }
    }

    /**
     * Nur, was vom Lagerfeuer aus zu Fuß zu erreichen ist.
     *
     * Zwei Anläufe hat das gekostet, und beide Messungen stehen hier, weil
     * die Zahl die Begründung ist:
     *
     *   Ohne jede Prüfung waren 658 von 1262 Wattkacheln unerreichbar.
     *   Flaches Wasser gibt es auch rund um vorgelagerte Felsen, und dort
     *   entstand bei Ebbe eine Fläche mitten im Meer – im Bild ein sauberes
     *   Rechteck trockenen Grundes, zu dem kein Weg führt.
     *
     *   Mit einer Prüfung auf „liegt an begehbarem Land" blieben 265 übrig.
     *   Denn dieses Land konnte selbst eine Felseninsel sein, die niemand
     *   betritt.
     *
     * Deshalb jetzt eine Füllung vom LAGERFEUER aus, über Land und Watt
     * zugleich – also genau der Weg, den die Figur gehen würde. Was sie
     * nicht erreicht, bleibt Wasser. Begehbar aussehender Boden, den
     * niemand betreten kann, ist schlimmer als gar keiner: Er sieht nach
     * einem Weg aus, den man übersehen hat.
     */
    const raus = [];
    const start = this.campfire
      ? [Math.floor(this.campfire.x / TILE_SIZE), Math.floor(this.campfire.y / TILE_SIZE)]
      : null;
    if (!start) {
      // Ohne Lagerfeuer (sehr früh beim Aufbau) lieber gar kein Watt als
      // eines, dessen Erreichbarkeit niemand geprüft hat.
      this._watt = raus;
      this._wattBreite = r;
      return raus;
    }
    const erreicht = new Set([start[0] + ',' + start[1]]);
    const stapel = [start];
    while (stapel.length) {
      const p = stapel.pop();
      const k = p[0] + ',' + p[1];
      if (kandidaten.has(k)) raus.push([p[0], p[1]]);
      const nach = [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]];
      for (let i = 0; i < nach.length; i++) {
        const nk = nach[i][0] + ',' + nach[i][1];
        if (erreicht.has(nk)) continue;
        // Gelaufen wird über Land UND über das künftige Watt.
        if (!isWalkable(this.tileAtTile(nach[i][0], nach[i][1])) && !kandidaten.has(nk)) continue;
        erreicht.add(nk);
        stapel.push(nach[i]);
      }
    }

    this._watt = raus;
    this._wattBreite = r;
    return raus;
  }

  /**
   * Das Wasser zurückziehen oder zurückholen.
   *
   * Es werden wirklich die KACHELN getauscht und keine zweite
   * Begehbarkeitsregel danebengestellt. Das ist die ganze Bauart: `canStand`
   * fragt ausschließlich `isWalkable(tileAt(...))`, also stimmen Kollision,
   * Pfade, Vorkommen und Bild ohne eine einzige neue Zeile. Eine Ausnahme in
   * der Kollision hätte an jeder Stelle gefehlt, die sie nicht kennt.
   *
   * @returns {number} wie viele Kacheln getauscht wurden
   */
  gezeitenSetzen(aktiv, breite) {
    const watt = this.wattKacheln(breite);
    const ziel = aktiv ? T.TIDEFLAT : T.WATER;
    const von = aktiv ? T.WATER : T.TIDEFLAT;
    let n = 0;
    for (let i = 0; i < watt.length; i++) {
      const tx = watt[i][0];
      const ty = watt[i][1];
      if (this.tileAtTile(tx, ty) !== von) continue;
      this.setTile(tx, ty, ziel);
      n++;
    }
    return n;
  }

  /** Liegt der Grund gerade frei? */
  wattOffen() {
    const watt = this._watt;
    if (!watt || !watt.length) return false;
    return this.tileAtTile(watt[0][0], watt[0][1]) === T.TIDEFLAT;
  }

  /**
   * Gibt es diesen Boden überhaupt schon?
   *
   * Nötig geworden durch einen Tag, der still ins Leere lief: „Steinkraut"
   * streut auf den Fels, und der Fels liegt im Hochland – das bei einem
   * neuen Spiel noch gesperrt ist. `_streuen` übersprang den Bereich
   * korrekt, und das Ergebnis war ein Tag mit Namen und Hinweis
   * („Im Hochland blüht es zwischen den Felsen"), an dem es kein Hochland
   * gab und nichts blühte.
   *
   * Das ist dieselbe Falle, vor der oben beim Fischschwarm schon steht:
   * ein Versprechen ohne Deckung. Gefunden hat es nicht der Test, sondern
   * der Blick ins laufende Spiel – 21 Ereignisse legten etwas hin, eines
   * nicht.
   */
  hatBoden(boden) {
    const passt = boden === 'sand' ? T.SAND
      : boden === 'fels' ? T.ROCKFLOOR
      : boden === 'watt' ? T.TIDEFLAT
      : null;
    const regions = ALL_REGIONS;
    for (let r = 0; r < regions.length; r++) {
      if (!this.unlocked[regions[r]]) continue;
      const spots = walkableTilesOf(this.tiles, regions[r], function (t) {
        return passt == null ? (t === T.GRASS || t === T.DIRT) : t === passt;
      });
      if (spots.length) return true;
    }
    return false;
  }

  /**
   * Ein Tagesereignis streut etwas über die Insel.
   *
   * Das waren zwei Funktionen, `_scatterBloom` und `_scatterStardust`, und sie
   * unterschieden sich in genau drei Dingen: was gestreut wird, auf welchen
   * Boden, und wie weit die Stücke auseinanderliegen. Alles andere – die
   * Bereiche durchgehen, einen freien Platz suchen, `fromEvent` setzen – war
   * zweimal dasselbe.
   *
   * Zusammengelegt, weil daran die Breite des Spiels hängt: Solange jedes
   * Ereignis eine eigene Funktion braucht, kostet ein neues Ereignis Code,
   * und dann bleiben es sechs. Gemessen ist das der Grund, warum die
   * Kalender-Achse zu dünn war: In zwei Jahren kommt jedes der sechs rund
   * 180-mal, und beim fünften Mal ist ein Falterzug keine Besonderheit mehr,
   * sondern Tapete. Jetzt ist ein neues Ereignis ein Eintrag in einer
   * Tabelle.
   *
   * `fromEvent` räumt alles am nächsten Morgen wieder weg (siehe `newDay`):
   * Ein Blütentag soll ein Tag sein und kein Zustand – sonst blühte die Insel
   * nach einer Woche durchgehend, und das Besondere wäre verbraucht.
   *
   * @param {object} spec {arten, boden:'sand'|'gras'|'fels', n, abstand}
   */
  _streuen(rng, spec) {
    if (!spec || !spec.arten || !spec.arten.length || !(spec.n > 0)) return;
    const arten = spec.arten;
    const self = this;
    const boden = spec.boden || 'gras';
    const abstand = spec.abstand || 56;
    // Welcher Boden. Der Sand ist der Spülsaum (Treibholz, Muscheln,
    // Sternenstaub), der Fels das Hochland – und die Wiese schließt das
    // Grundstück aus: Wer dort pflanzt und baut, soll nicht morgens vier
    // Blumen zwischen seinen Beeten vorfinden.
    const passt = boden === 'sand' ? function (t) { return t === T.SAND; }
      : boden === 'fels' ? function (t) { return t === T.ROCKFLOOR; }
      : boden === 'watt' ? function (t) { return t === T.TIDEFLAT; }
      : function (t, tx, ty) {
        return (t === T.GRASS || t === T.DIRT) &&
          !inAnyPlot(tx, ty, self.plotStage, self.islePlotStage);
      };

    const regions = ALL_REGIONS;
    for (let r = 0; r < regions.length; r++) {
      if (!this.unlocked[regions[r]]) continue;
      const spots = walkableTilesOf(this.tiles, regions[r], passt);
      if (!spots.length) continue;
      let placed = 0;
      let guard = 0;
      while (placed < spec.n && guard++ < 500) {
        const sp = spots[Math.floor(rng() * spots.length)];
        const wx = (sp.x + 0.5) * TILE_SIZE;
        const wy = (sp.y + 0.5) * TILE_SIZE;
        if (this._tooClose(wx, wy, abstand)) continue;
        const e = makeEntity(arten[Math.floor(rng() * arten.length)], wx, wy);
        e.fromEvent = true;
        this.add(e);
        placed++;
      }
    }
  }

  /**
   * Unter einem Vogelhaus liegt morgens manchmal eine Feder.
   *
   * Das Vogelhaus war bis dahin das einzige Stück Deko ohne jede Wirkung –
   * ein Haus für Vögel, in dem nie ein Vogel war, während über der Insel
   * welche fliegen. Und Federn brauchten ohnehin eine Quelle in der Nähe:
   * Wer danach gefragt wird, soll nicht die halbe Karte absuchen.
   */
  _featherUnderBirdhouses(rng) {
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.kind !== 'decor' || e.itemId !== 'birdhouse' || e.gone) continue;
      if (rng() > 0.5) continue;
      // Nur eine je Haus und Tag: Sonst läge nach einer Woche ein Teppich
      // aus Federn darunter, und das Vogelhaus wäre eine Maschine.
      const schon = this.queryNear(e.x, e.y, 110).some(function (o) {
        return o.kind === 'feather' && !o.gone;
      });
      if (schon) continue;
      const a = rng() * Math.PI * 2;
      const r = 52 + rng() * 40;
      const x = e.x + Math.cos(a) * r;
      const y = e.y + Math.sin(a) * r;
      if (!isWalkable(this.tileAt(x, y))) continue;
      this.add(makeEntity('feather', x, y));
    }
  }

  /**
   * Vorkommen, die an eine Bedingung gebunden sind: Mondblumen nachts,
   * Regenpilze bei Regen, Nebelkristalle bei Nebel.
   *
   * Sie werden bei jedem Wechsel neu gesetzt und wieder eingesammelt, wenn die
   * Bedingung fällt. Dadurch bekommt das Wetter Gewicht im Spiel und nicht nur
   * im Bild – und es gibt einen Grund, zu einer anderen Stunde wiederzukommen.
   */
  syncConditional(kind, active, rng, count) {
    let have = 0;
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.kind !== kind) continue;
      if (!active) this.remove(e);
      else if (!e.gone) have++;
    }
    if (!active || have >= count) return;

    const regions = ALL_REGIONS;
    let guard = 0;
    while (have < count && guard++ < 500) {
      const r = regions[Math.floor(rng() * regions.length)];
      if (!this.unlocked[r]) continue;
      const self = this;
      const spots = walkableTilesOf(this.tiles, r, function (t, tx, ty) {
        return (t === T.GRASS || t === T.DIRT || t === T.ROCKFLOOR) &&
          !inAnyPlot(tx, ty, self.plotStage, self.islePlotStage);
      });
      if (!spots.length) continue;
      const s = spots[Math.floor(rng() * spots.length)];
      const wx = (s.x + 0.5) * TILE_SIZE;
      const wy = (s.y + 0.5) * TILE_SIZE;
      if (this._tooClose(wx, wy, 110)) continue;
      this.add(makeEntity(kind, wx, wy));
      have++;
    }
  }

  _respawnDigspots(rng, faktor) {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      if (this.entities[i].kind === 'digspot') this.remove(this.entities[i]);
    }
    const regions = ALL_REGIONS;
    for (let r = 0; r < regions.length; r++) {
      if (!this.unlocked[regions[r]]) continue;
      const self = this;
      const spots = walkableTilesOf(this.tiles, regions[r], function (t, tx, ty) {
        if (t !== T.SAND && t !== T.GRASS && t !== T.DIRT) return false;
        // Nicht auf dem Grundstück: Wer seinen Garten anlegt, will morgens
        // keine frischen Löcher darin finden.
        return !inAnyPlot(tx, ty, self.plotStage, self.islePlotStage);
      });
      // Die Stille Insel ist klein – dort wären sieben Grabstellen ein
      // Minenfeld statt eines Fundes.
      const grund = regions[r] === REGION.CAMP ? 9 : regions[r] === REGION.ISLE ? 4 : 7;
      const count = Math.round(grund * (faktor || 1));
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < 900 && spots.length) {
        const s = spots[Math.floor(rng() * spots.length)];
        const wx = (s.x + 0.5) * TILE_SIZE;
        const wy = (s.y + 0.5) * TILE_SIZE;
        // Grabstellen brauchen Abstand VONEINANDER (sonst ist es ein
        // Minenfeld) und von allem, was im Weg steht. Von Blumen und
        // Grasbüscheln nicht.
        if (this._tooCloseKind(wx, wy, 110, 'digspot')) continue;
        if (this._tooCloseSolid(wx, wy, 58)) continue;
        this.add(makeEntity('digspot', wx, wy));
        placed++;
      }
    }
  }

  /** Zufällige begehbare Position in einem freigeschalteten Bereich. */
  randomSpot(rng, region, minDistFrom) {
    const spots = walkableTilesOf(this.tiles, region, function (t) {
      return t !== T.BRIDGE;
    });
    for (let tries = 0; tries < 200; tries++) {
      const s = spots[Math.floor(rng() * spots.length)];
      if (!s) break;
      const wx = (s.x + 0.5) * TILE_SIZE;
      const wy = (s.y + 0.5) * TILE_SIZE;
      if (this._tooClose(wx, wy, 56)) continue;
      if (minDistFrom) {
        const dx = wx - minDistFrom.x;
        const dy = wy - minDistFrom.y;
        if (dx * dx + dy * dy < minDistFrom.r * minDistFrom.r) continue;
      }
      return { x: wx, y: wy };
    }
    const fallback = findWalkableNear(this.tiles, CAMP_TILE.x, CAMP_TILE.y, 20, region);
    return fallback
      ? { x: (fallback.x + 0.5) * TILE_SIZE, y: (fallback.y + 0.5) * TILE_SIZE }
      : { x: (CAMP_TILE.x + 0.5) * TILE_SIZE, y: (CAMP_TILE.y + 0.5) * TILE_SIZE };
  }
}

export { TILE_SIZE, MAP_W, MAP_H, REGION, randInt };
