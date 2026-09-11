/** Weltmodell: Kacheln, Objekte, Kollision, räumlicher Index. */
import { T, TILE_SIZE, isWalkable, isWater } from '../art/tiles.js';
import {
  MAP_W, MAP_H, REGION, generateTiles, tileIndex, regionAt,
  walkableTilesOf, findWalkableNear, CAMP_TILE,
  FORD_X0, FORD_X1, RIVER_Y0, RIVER_Y1,
  CHANNEL_X0, CHANNEL_X1, BRIDGE_Y0, BRIDGE_Y1,
  DOCK_TILE, ISLE_DOCK_TILE, ALL_REGIONS, HIGHLAND_Y,
} from './worldgen.js';
import { makeEntity, defOf, spriteFor } from './entities.js';
import { makeRng, randInt, randPick, dailyRng } from '../core/rng.js';
import { syncIdCounter } from '../core/util.js';
import { inAnyPlot, inAnyPlotAt } from '../game/plot.js';

const CELL = 160;
const GRID_W = Math.ceil((MAP_W * TILE_SIZE) / CELL);
const GRID_H = Math.ceil((MAP_H * TILE_SIZE) / CELL);

export const WORLD_W = MAP_W * TILE_SIZE;
export const WORLD_H = MAP_H * TILE_SIZE;

/** Wo die Geister zuhause sind (Kachelkoordinaten). */
export const SPIRIT_HOMES = {
  flamey: { tx: CAMP_TILE.x, ty: CAMP_TILE.y - 3, region: REGION.CAMP },
  mira: { tx: CAMP_TILE.x - 11, ty: CAMP_TILE.y + 4, region: REGION.CAMP },
  kiesel: { tx: CAMP_TILE.x + 9, ty: CAMP_TILE.y + 11, region: REGION.CAMP },
  bruno: { tx: 38, ty: 26, region: REGION.FOREST },
  tobi: { tx: 44, ty: 14, region: REGION.FOREST },
  nelly: { tx: 78, ty: 50, region: REGION.CLIFFS },
  wanda: { tx: 8, ty: 44, region: REGION.ISLE },
};

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.w = MAP_W;
    this.h = MAP_H;
    this.tiles = generateTiles(this.seed);
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
    this._scatterNature(rng);
    this._placeSpirits();
    return this;
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

    function scatter(kinds, spots, count, spacing) {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < count * 30 && spots.length) {
        const s = spots[Math.floor(rng() * spots.length)];
        if (nearFord(s.x, s.y) || nearBridge(s.x, s.y)) continue;
        const wx = (s.x + 0.5) * TILE_SIZE + (rng() - 0.5) * 8;
        const wy = (s.y + 0.5) * TILE_SIZE + (rng() - 0.5) * 8;
        if (self._tooClose(wx, wy, spacing)) continue;
        const kind = randPick(rng, kinds);
        self.add(makeEntity(kind, wx, wy));
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

    // Lager & Strand
    scatter(['tree_oak', 'tree_birch', 'tree_maple'], grassCamp, 46, 80);
    scatter(['rock_big', 'rock_small'], grassCamp, 16, 80);
    scatter(['bush_berry', 'bush_plain'], grassCamp, 22, 64);
    scatter(['flower_pink', 'flower_yellow', 'flower_white'], grassCamp, 30, 44);
    scatter(['grass_tuft'], grassCamp, 34, 40);
    scatter(['herb'], grassCamp, 12, 48);
    scatter(['shell', 'driftwood'], sandCamp, 26, 48);
    scatter(['reeds'], sandCamp, 18, 48);
    scatter(['feather'], sandCamp, 8, 56);
    scatter(['feather'], grassCamp, 8, 60);

    // Wald
    scatter(['tree_oak', 'tree_pine', 'tree_birch', 'tree_maple'], grassForest, 78, 72);
    scatter(['bush_berry'], grassForest, 20, 60);
    scatter(['mushroom'], grassForest, 26, 44);
    scatter(['herb'], grassForest, 16, 48);
    scatter(['flower_violet', 'flower_white'], grassForest, 18, 48);
    scatter(['feather'], grassForest, 12, 56);
    scatter(['rock_big', 'rock_small'], grassForest, 14, 72);
    scatter(['rock_ore'], grassForest, 4, 104);
    scatter(['grass_tuft'], grassForest, 26, 40);

    // Stille Insel. Sie zerfällt in zwei Hälften: unten der grüne Süden mit
    // Wanda, oben das Hochland aus Fels. Nur dort liegen Granit und Geoden,
    // und nur dafür lohnen die letzten beiden Spitzhackenstufen. Ein Bereich,
    // den man mit dem Werkzeug vom ersten Tag leerräumt, wäre bloß größer.
    const isleAll = walkableTilesOf(this.tiles, REGION.ISLE, function (t) {
      return t === T.GRASS || t === T.ROCKFLOOR || t === T.DIRT;
    });
    const isleLand = isleAll.filter(function (p) { return p.y >= HIGHLAND_Y; });
    const isleHigh = isleAll.filter(function (p) { return p.y < HIGHLAND_Y; });
    const isleSand = walkableTilesOf(this.tiles, REGION.ISLE, function (t) { return t === T.SAND; });
    scatter(['tree_pine', 'tree_birch'], isleLand, 16, 76);
    scatter(['rock_ore'], isleLand, 10, 72);
    scatter(['rock_big', 'rock_small'], isleLand, 12, 64);
    scatter(['bush_berry'], isleLand, 8, 60);
    scatter(['herb', 'mushroom'], isleLand, 14, 44);
    scatter(['flower_violet', 'flower_white'], isleLand, 12, 44);
    scatter(['grass_tuft'], isleLand, 14, 40);
    scatter(['shell', 'driftwood'], isleSand, 18, 44);
    scatter(['reeds'], isleSand, 10, 44);

    // Das Hochland
    scatter(['rock_granite'], isleHigh, 22, 82);
    scatter(['rock_geode'], isleHigh, 6, 150);
    scatter(['rock_big', 'rock_small'], isleHigh, 18, 68);
    scatter(['rock_ore'], isleHigh, 8, 88);
    scatter(['tree_pine'], isleHigh, 10, 92);
    scatter(['herb'], isleHigh, 8, 56);
    scatter(['grass_tuft'], isleHigh, 8, 52);

    // Klippen
    scatter(['tree_pine'], cliffLand, 26, 80);
    scatter(['rock_big', 'rock_small'], cliffLand, 26, 64);
    scatter(['rock_ore'], cliffLand, 12, 88);
    scatter(['flower_violet'], cliffLand, 12, 48);
    scatter(['herb', 'mushroom'], cliffLand, 12, 48);
    scatter(['shell', 'driftwood'], cliffSand, 14, 48);
    scatter(['feather'], cliffSand, 6, 56);
    scatter(['grass_tuft'], cliffLand, 16, 40);
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
   * @param {object} [ereignis] Tagesereignis: { digs: Faktor, bloom: Anzahl }
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
    if (ev.bloom) this._scatterBloom(rng, ev.bloom);
    if (ev.stardust) this._scatterStardust(rng, ev.stardust);
    return this;
  }

  /**
   * Am Morgen nach einer Sternennacht liegt Sternenstaub am Spülsaum.
   *
   * Die Sternschnuppen selbst bleiben, was sie sind: ein Bild ohne Aufgabe.
   * Wer nachts hochsieht, muss nichts tun und nichts drücken – genau das
   * steht als Vorsatz über `_shootingStars`, und daran ändert sich nichts.
   *
   * Belohnt wird trotzdem, aber am nächsten Morgen und ohne Bedingung: Wer
   * durchgeschlafen hat, findet dasselbe. Das ist der Unterschied zwischen
   * „schön, dass du aufgepasst hast" und „du hättest aufpassen müssen".
   *
   * Am Sand, weil dort ohnehin Treibholz und Muscheln liegen – die
   * Morgenrunde am Wasser bekommt damit einen seltenen Tag, keinen neuen Weg.
   */
  _scatterStardust(rng, count) {
    const regions = ALL_REGIONS;
    for (let r = 0; r < regions.length; r++) {
      if (!this.unlocked[regions[r]]) continue;
      const spots = walkableTilesOf(this.tiles, regions[r], function (t) {
        return t === T.SAND;
      });
      if (!spots.length) continue;
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < 400) {
        const s = spots[Math.floor(rng() * spots.length)];
        const wx = (s.x + 0.5) * TILE_SIZE;
        const wy = (s.y + 0.5) * TILE_SIZE;
        if (this._tooClose(wx, wy, 90)) continue;
        const e = makeEntity('stardust', wx, wy);
        // `fromEvent` räumt es am nächsten Morgen wieder weg, falls es
        // liegen bleibt: Sonst läge nach dem zehnten Sternenhimmel überall
        // Staub, und das Seltene wäre Kulisse.
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
   * Blütentag: zusätzliche Blumen über die freigeschalteten Bereiche.
   *
   * Sie tragen `fromEvent` und verschwinden am nächsten Morgen wieder – ein
   * Blütentag soll ein Tag sein, kein dauerhafter Zustand.
   */
  _scatterBloom(rng, count) {
    const arten = ['flower_pink', 'flower_yellow', 'flower_violet', 'flower_white'];
    const regions = ALL_REGIONS;
    for (let r = 0; r < regions.length; r++) {
      if (!this.unlocked[regions[r]]) continue;
      const self = this;
      const spots = walkableTilesOf(this.tiles, regions[r], function (t, tx, ty) {
        return (t === T.GRASS || t === T.DIRT) &&
          !inAnyPlot(tx, ty, self.plotStage, self.islePlotStage);
      });
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < 500 && spots.length) {
        const s = spots[Math.floor(rng() * spots.length)];
        const wx = (s.x + 0.5) * TILE_SIZE;
        const wy = (s.y + 0.5) * TILE_SIZE;
        if (this._tooClose(wx, wy, 56)) continue;
        const e = makeEntity(arten[Math.floor(rng() * arten.length)], wx, wy);
        e.fromEvent = true;
        this.add(e);
        placed++;
      }
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
      while (placed < count && guard++ < 400 && spots.length) {
        const s = spots[Math.floor(rng() * spots.length)];
        const wx = (s.x + 0.5) * TILE_SIZE;
        const wy = (s.y + 0.5) * TILE_SIZE;
        if (this._tooClose(wx, wy, 90)) continue;
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
