/**
 * Spielkern: hält alles zusammen und verbindet Eingabe, Welt und Oberfläche.
 */
import { World, TILE_SIZE, REGION } from '../world/world.js';
import { isWater } from '../art/tiles.js';
import { GroundLayer } from '../render/ground.js';
import { ColorField } from '../world/colorfield.js';
import { Renderer } from '../render/renderer.js';
import { Camera } from '../render/camera.js';
import { Particles } from '../render/particles.js';
import { Wildlife } from '../render/wildlife.js';
import { Weather } from '../render/weather.js';
import { Player, TOOLS } from './player.js';
import { Inventory } from './inventory.js';
import { QuestBook, QTYPE } from './quests.js';
import { Shop } from './shop.js';
import { DayCycle, DEFAULT_DAY_MINUTES } from './daycycle.js';
import { Fishing } from './fishing.js';
import { SPIRITS, friendshipLevel, friendshipGift } from './spirits.js';
import { StoryBook, STAGES, storyArt, keepsakeOf } from './stories.js';
import { charmAround, cosyLevel, cosyRadius, rewardFactor, COSY_MAX } from './cosiness.js';
import { getItem, itemName, CAT, CONDITIONAL } from './items.js';
import { RECIPES, recipeById, missingFor, campfireLevelFor } from './recipes.js';
import { defOf, makeEntity } from '../world/entities.js';
import { startPosition, REGION_NAMES } from '../world/worldgen.js';
import { randInt, dailyRng } from '../core/rng.js';
import { num } from '../core/util.js';
import { audio } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { Panels } from '../ui/panels.js';
import * as storage from '../core/storage.js';

const SAVE_VERSION = 1;
const AUTOSAVE_SECONDS = 20;

export const DEFAULT_SETTINGS = {
  sound: true,
  music: true,
  ambience: true,
  volume: 0.7,
  talk: 'short',
  dayMinutes: DEFAULT_DAY_MINUTES,
  scaling: 'crisp',
};

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.input = input;
    this.audio = audio;
    this.time = 0;
    this.autosaveTimer = AUTOSAVE_SECONDS;
    this.sleeping = false;
    this.placing = null;
    this.target = null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, storage.loadSettings() || {});
    this.storagePersistent = storage.isPersistent();
    this.rng = Math.random;
    this.particles = new Particles(Math.random);
    this.wildlife = new Wildlife(Math.random);
    const self = this;
    // Ein Fischsprung platscht – aber nur, wenn er auch zu sehen ist
    this.wildlife.onJump = function (x, y) {
      const cam = self.camera;
      if (!cam || !self.renderer) return;
      if (x < cam.ox || x > cam.ox + self.renderer.viewW) return;
      if (y < cam.oy || y > cam.oy + self.renderer.viewH) return;
      self.audio.play('splash');
    };
    this.weather = new Weather(Math.random);
    this.renderer = new Renderer(canvas);
    this.camera = new Camera(canvas.width, canvas.height, 0, 0);
    this.fishing = new Fishing();
    this._fadeEl = ensureFade();
    this._pendingSpiritLine = 0;
  }

  /* ================= Aufbau ================= */

  start(save) {
    if (save) this._loadFrom(save);
    else this._fresh();

    this.ground = new GroundLayer(this.world);
    this.camera.worldW = this.world.w * TILE_SIZE;
    this.camera.worldH = this.world.h * TILE_SIZE;
    this.syncViewport();
    this.camera.snapTo(this.player.x, this.player.y);
    this.ground.prewarm(this.camera.ox, this.camera.oy, this.renderer.viewW, this.renderer.viewH);

    this.weather.setDay(this.world.seed, this.day.day);
    this.weather.snap();
    this._placeStoryPieces(this.day.day);

    this.ui = new UI(this);
    this.panels = new Panels(this);
    this.ui.layout();
    this.applySettings();
    this._syncCampfireColor();
    // Still: beim Laden steht die Deko ja schon da, da wäre eine Meldung
    // für jede Stufe eine Meldungslawine beim Spielstart.
    this.syncCosiness(true);
    this.ui.refreshHud();
    this.ui.refreshQuests();
    return this;
  }

  _fresh() {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    this.world = new World(seed).populate();
    this.colorField = new ColorField();
    const p = startPosition(this.world.tiles);
    this.player = new Player(p.x, p.y);
    this.inventory = new Inventory(30);
    this.quests = new QuestBook();
    this.stories = new StoryBook();
    this.shop = new Shop();
    this.day = new DayCycle(this.settings.dayMinutes);
    this.state = {
      coins: 60,
      ember: 0,
      campfireFuel: 0,
      bagUpgrades: 0,
      crafted: Object.create(null),
      caught: 0,
    };
    this.shop.refresh(this.day.day, this.world.seed);
    this.quests.newDay(this.day.day, this.world, this);
    this.world.newDay(this.day.day);
    // Startausrüstung, damit sofort etwas geht
    this.inventory.add('wood', 5);
    this.inventory.add('fiber', 4);
  }

  _loadFrom(save) {
    this.world = new World(save.seed);
    this.world.populate();
    this.colorField = ColorField.fromJSON(save.color);
    this.day = DayCycle.fromJSON(save.day);
    this.day.dayMinutes = this.settings.dayMinutes;
    this.player = Player.fromJSON(save.player);
    this.inventory = Inventory.fromJSON(save.inventory);
    this.quests = QuestBook.fromJSON(save.quests);
    this.stories = StoryBook.fromJSON(save.stories);
    this.shop = Shop.fromJSON(save.shop);
    this.state = Object.assign({
      coins: 0, ember: 0, campfireFuel: 0, bagUpgrades: 0,
      crafted: Object.create(null), caught: 0,
    }, save.state || {});
    if (!this.state.crafted) this.state.crafted = Object.create(null);

    this.world.unlocked = save.unlocked || [true, false, false];
    if (save.bridgeBuilt) this.world.buildBridge();
    this._applyWorldDelta(save.worldDelta);
  }

  /**
   * Zeichenfläche an die Fenstergröße anpassen.
   * Der Zoom hält den sichtbaren Ausschnitt weitgehend konstant, damit das
   * Spiel auf einem großen Bildschirm nicht plötzlich weit weg wirkt.
   */
  syncViewport() {
    const stage = this.canvas.parentNode || document.body;
    const cssW = stage.clientWidth || window.innerWidth || 960;
    const cssH = stage.clientHeight || window.innerHeight || 540;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.resize(cssW, cssH, dpr);
    this.camera.resize(this.renderer.viewW, this.renderer.viewH);
    if (this.ui) this.ui.layout();
  }

  /* ================= Speichern ================= */

  toJSON() {
    return {
      version: SAVE_VERSION,
      seed: this.world.seed,
      day: this.day.toJSON(),
      player: this.player.toJSON(),
      inventory: this.inventory.toJSON(),
      quests: this.quests.toJSON(),
      stories: this.stories.toJSON(),
      shop: this.shop.toJSON(),
      color: this.colorField.toJSON(),
      state: this.state,
      unlocked: this.world.unlocked,
      bridgeBuilt: this.world.bridgeBuilt,
      worldDelta: this._worldDelta(),
    };
  }

  /**
   * Nur die Abweichungen zur frisch erzeugten Welt sichern:
   * abgebaute Objekte, aufgestellte Deko, versteckte Aufgabenstücke, Wege.
   */
  _worldDelta() {
    const removed = [];
    const changed = [];
    const added = [];
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind === 'decor' || e.kind === 'hidden') {
        added.push({
          id: e.id, k: e.kind, x: Math.round(e.x), y: Math.round(e.y),
          s: e.sprite, item: e.itemId || null, q: e.questId || null, flat: !!e.flat,
          sp: e.storySpirit || null, st: e.storyStage != null ? e.storyStage : null,
        });
      } else if (e.gone || e.origin || (e.hp != null && defOf(e.kind) && defOf(e.kind).hits && e.hp < defOf(e.kind).hits)) {
        changed.push({ id: e.id, k: e.kind, g: e.gone ? 1 : 0, o: e.origin || null, r: e.respawnDay || 0, hp: e.hp });
      }
    }
    // Entfernte Sperren merken
    if (!this.world.logBarrier || this.world.logBarrier.gone) removed.push('log');
    if (this.world.rockslide && this.world.rockslide.gone) removed.push('rock');

    const tiles = [];
    for (let ty = 0; ty < this.world.h; ty++) {
      for (let tx = 0; tx < this.world.w; tx++) {
        const t = this.world.tileAtTile(tx, ty);
        if (t === 5 /* PATH */) tiles.push([tx, ty, t]);
      }
    }
    return { changed: changed, added: added, removed: removed, tiles: tiles };
  }

  _applyWorldDelta(delta) {
    if (!delta) return;
    if (delta.changed) {
      for (let i = 0; i < delta.changed.length; i++) {
        const c = delta.changed[i];
        const e = this.world.byId[c.id];
        if (!e) continue;
        if (c.o) {
          e.origin = c.o;
          e.kind = c.k;
          e.sprite = defOf(c.k) ? defOf(c.k).sprite : e.sprite;
        }
        e.gone = !!c.g;
        e.respawnDay = c.r || 0;
        if (c.hp != null) e.hp = c.hp;
      }
    }
    if (delta.removed) {
      for (let i = 0; i < delta.removed.length; i++) {
        if (delta.removed[i] === 'log' && this.world.logBarrier) {
          this.world.remove(this.world.logBarrier);
          this.world.logBarrier = null;
        }
        if (delta.removed[i] === 'rock' && this.world.rockslide) {
          this.world.remove(this.world.rockslide);
          this.world.rockslide = null;
        }
      }
    }
    if (delta.added) {
      for (let i = 0; i < delta.added.length; i++) {
        const a = delta.added[i];
        const e = makeEntity(a.k, a.x, a.y, {
          itemId: a.item, questId: a.q, flat: a.flat, zBias: a.k === 'hidden' ? 2 : 0,
          storySpirit: a.sp || null, storyStage: a.st != null ? a.st : null,
        });
        e.id = a.id;
        e.sprite = a.s;
        this.world.add(e);
      }
    }
    if (delta.tiles) {
      for (let i = 0; i < delta.tiles.length; i++) {
        this.world.setTile(delta.tiles[i][0], delta.tiles[i][1], delta.tiles[i][2]);
      }
    }
  }

  save() {
    try {
      storage.writeSave(this.toJSON());
      return true;
    } catch (err) {
      console.warn('Speichern fehlgeschlagen', err);
      return false;
    }
  }

  /* ================= Schleife ================= */

  update(dt) {
    this.time += dt;

    if (this.panels.isOpen()) {
      this._handleUiKeys();
      this.ui.refreshHud();
      this.ui.updateBubbles(dt);
      return;
    }

    this._handleUiKeys();
    if (this.sleeping) {
      this.ui.updateBubbles(dt);
      return;
    }

    const move = this.input.moveVector();
    this.player.busy = this.fishing.active;
    this.player.update(dt, move, this.world);

    if (this.player.consumeStep()) this.audio.play('step');

    this.target = this.placing ? null : this.player.findTarget(this.world);
    this._updatePlacing();
    this._updatePrompt();

    if (this.input.pressed('interact')) this.onInteract();
    if (this.input.pressed('cancelPlace') && this.placing) this.cancelPlacing();
    if (this.input.pressed('rotate') && this.placing) this._rotatePlacing();

    const fishEvent = this.fishing.update(dt);
    if (fishEvent) this._onFishEvent(fishEvent);

    this.colorField.update(dt);
    this.particles.update(dt);
    const dark = this.day.isDark();
    this.wildlife.update(
      dt, this.camera, this.world,
      this.renderer.w, this.renderer.h,
      !dark,
      dark ? this.lightSources(this.time) : null
    );
    this._ambient(dt);
    this.weather.update(dt);
    this._syncConditionalSpawns();
    this._checkVisits(dt);

    const mustSleep = this.day.update(dt);
    if (mustSleep) this.sleep(true);

    this.camera.follow(this.player.x, this.player.y - 6, dt);
    this.ground.flush();

    this.audio.setMood(this.day.isNight() ? 'night' : 'day');

    this.ui.refreshHud();
    this.ui.refreshQuests();
    this.ui.refreshToolbelt();
    this.ui.refreshFishing();
    this.ui.updateBubbles(dt);

    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0) {
      this.autosaveTimer = AUTOSAVE_SECONDS;
      this.save();
    }
  }

  draw() {
    this.renderer.draw(this, this.time);
  }

  _handleUiKeys() {
    const inp = this.input;
    if (inp.pressed('panelInventory')) this.openPanel('inventory');
    if (inp.pressed('panelQuests')) this.openPanel('quests');
    if (inp.pressed('panelCraft')) this.openPanel('craft');
    if (inp.pressed('panelMap')) this.openPanel('map');
    if (inp.pressed('panelFound')) this.openPanel('found');
    if (inp.pressed('panelStories')) this.openPanel('stories');
    if (inp.pressed('cancel')) {
      if (this.panels.isOpen()) this.panels.close();
      else if (this.placing) this.cancelPlacing();
      else if (this.fishing.active) this.fishing.cancel();
      else this.openPanel('settings');
    }
    for (let i = 0; i < TOOLS.length; i++) {
      if (inp.pressed('tool' + (i + 1))) this.selectTool(i);
    }
    if (inp.pressed('nextTool')) {
      this.player.nextTool();
      this.audio.play('ui');
    }
    if (inp.pressed('sleep')) this._trySleepFromKey();
  }

  selectTool(i) {
    if (i === this.player.toolIndex) return;
    this.player.selectTool(i);
    this.audio.play('ui');
    this.ui.refreshToolbelt();
  }

  openPanel(name) {
    if (this.placing) this.cancelPlacing();
    this.panels.open(name);
  }

  /* ================= Aktionen ================= */

  onInteract() {
    if (this.placing) {
      this.confirmPlacing();
      return;
    }
    if (this.fishing.active) {
      const r = this.fishing.press();
      if (r === 'hooked') this.audio.play('splash');
      else if (r === 'catch') this._onFishEvent('catch');
      else if (r === 'miss') this._onFishEvent('miss');
      return;
    }

    // Der Kescher greift nur, wenn überhaupt ein Falter in der Nähe ist.
    // Sonst würde er das Reden, Aufheben und den Laden blockieren – man
    // müsste vor jedem Gespräch das Werkzeug wechseln. Knapp daneben zählt
    // aber als Fehlschlag, sonst wäre Zielen belanglos.
    if (this.player.tool.id === 'net' && this.bugNearby()) { this.swingNet(); return; }

    const t = this.target;
    if (t) {
      const def = t.def;
      if (def.category === 'spirit') { this.talkTo(t.entity); return; }
      if (def.category === 'fox') { this.openPanel('shop'); return; }
      if (def.category === 'hidden') { this.pickHidden(t.entity); return; }
      if (def.category === 'decor') { this.pickDecor(t.entity); return; }
      if (def.station) { this.useStation(def.station, t.entity); return; }
      if (def.tool) { this.useTool(t); return; }
    }

    // Nichts in Reichweite: Angel auswerfen, wenn Wasser vor uns liegt
    if (this.player.tool.id === 'rod') {
      const ok = this.fishing.cast(
        this.world, this.player, Math.random, this.day.isNight(), this.player.levels.rod
      );
      if (ok) {
        this.player.startSwing();
        this.audio.play('cast');
      } else {
        this.ui.toast('Hier ist kein Wasser', 'icon_rod');
      }
    }
  }

  useTool(t) {
    const e = t.entity;
    const def = t.def;
    const tool = this.player.tool;

    if (def.tool !== tool.id) {
      const need = TOOLS.filter(function (x) { return x.id === def.tool; })[0];
      this.ui.toast('Dafür brauchst du: ' + (need ? need.name : def.tool), need ? need.icon : 'icon_star');
      return;
    }
    const level = this.player.levels[tool.id] || 1;
    if (def.minLevel && level < def.minLevel) {
      this.ui.toast(tool.name + ' Stufe ' + def.minLevel + ' nötig', 'icon_lock', 'bad');
      return;
    }

    this.player.startSwing();
    e.lastHit = this.time;

    const soundByTool = { axe: 'chop', pickaxe: 'mine', shovel: 'dig', hand: 'forage' };
    this.audio.play(soundByTool[tool.id] || 'forage');

    const chipColor = def.category === 'rock' ? '#8d8f96'
      : def.category === 'tree' ? '#8a6242'
        : def.category === 'dig' ? '#a9855e' : '#7cb567';
    this.particles.burst(def.category === 'dig' ? 'dust' : 'chip', e.x, e.y - 32, 5, { color: chipColor });

    e.hp = (e.hp || 1) - 1;
    if (e.hp > 0) {
      this.camera.kick(0.12);
      return;
    }
    this.camera.kick(0.24);
    this._collect(e, def, level);
  }

  _collect(e, def, level) {
    const rng = Math.random;
    const drops = def.yield ? def.yield(level, rng) : [];
    const got = [];
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const added = this.inventory.add(d.id, d.n);
      if (added > 0) got.push({ id: d.id, n: added });
      if (added < d.n) this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
    }
    if (got.length) {
      this.ui.toastItems(got);
      this.audio.play('pickup');
      this.particles.burst('sparkle', e.x, e.y - 40, 4);
    }
    // Münzbeutel öffnet sich sofort
    for (let i = 0; i < got.length; i++) {
      if (got[i].id === 'coin_pouch') {
        const item = getItem('coin_pouch');
        const coins = randInt(rng, item.opens[0], item.opens[1]) * got[i].n;
        this.inventory.remove('coin_pouch', got[i].n);
        this.state.coins += coins;
        this.ui.toast('+' + coins + ' Münzen', 'icon_coin', 'good');
        this.particles.burst('coin', e.x, e.y - 48, 6);
        this.audio.play('coin');
      }
    }

    if (def.unlocks != null) {
      this._unlockRegion(def.unlocks, e);
    }

    if (def.becomes) {
      e.origin = e.kind;
      e.kind = def.becomes;
      e.sprite = defOf(def.becomes).sprite;
      e.hp = 0;
      e.respawnDay = this.day.day + (def.respawn || 1);
    } else if (def.respawn) {
      e.gone = true;
      e.respawnDay = this.day.day + def.respawn;
    } else {
      this.world.remove(e);
    }
  }

  _unlockRegion(region, sourceEntity) {
    if (!this.world.unlockRegion(region)) return;
    this.particles.burst('color', sourceEntity.x, sourceEntity.y - 40, 26);
    this.audio.play('colorBurst');
    this.camera.kick(0.5);
    const names = ['Lager & Strand', 'Wald', 'Klippen'];
    this.ui.toast(names[region] + ' entdeckt!', 'icon_map', 'good');
    // Geister im neuen Bereich bekommen sofort eine Aufgabe
    this.quests.newDay(this.day.day, this.world, this);
    this.world.newDay(this.day.day);
    this.save();
  }

  pickHidden(e) {
    if (e.storySpirit) { this._pickStoryPiece(e); return; }
    const q = e.questId ? this.quests.byId(e.questId) : null;
    this.world.remove(e);
    this.particles.burst('sparkle', e.x, e.y - 32, 10);
    this.audio.play('pickup');
    if (q) {
      this.quests.notify('found', { questId: q.id }, this);
      const have = this.quests.progress(q, this);
      this.ui.toast(itemName(e.itemId) + ' gefunden (' + have + '/' + q.need + ')', e.sprite ? 'icon_' + e.itemId : 'icon_star', 'good');
    } else {
      this.ui.toast('Etwas Altes gefunden', 'icon_sparkle', 'good');
    }
    this.ui.refreshQuests();
  }

  /**
   * Ein Stück einer Erinnerungskette aufheben.
   *
   * Es geht bewusst NICHT in die Tasche: Erinnerungen soll man nicht mit sich
   * herumtragen oder gar verbrennen können. Aufheben schaltet die Stufe
   * direkt weiter.
   */
  _pickStoryPiece(e) {
    const spiritId = e.storySpirit;
    this.world.remove(e);
    this.particles.burst('sparkle', e.x, e.y - 32, 16);
    this.particles.burst('color', e.x, e.y - 40, 14);
    this.audio.play('questDone');
    this.camera.kick(0.2);

    const n = this.stories.collect(spiritId);
    const spirit = SPIRITS[spiritId];
    this.ui.toast(spirit.name + ' · Erinnerung ' + n + '/' + STAGES, 'icon_sparkle', 'good');

    // Farbe blüht um den Geist auf, auch ohne Aufgabe
    const key = 'spirit_' + spiritId;
    const ent = this.world.spiritEntity(spiritId);
    if (ent) {
      if (!this.colorField.find(key)) this.colorField.addSource(ent.x, ent.y, 160, key);
      else this.colorField.grow(key, 90);
      this.colorField.markDirty();
    }

    if (this.stories.isComplete(spiritId)) this._finishStory(spiritId, ent);
    this.ui.refreshHud();
    this.save();
  }

  /** Kette vollständig: das Andenken wird überreicht. */
  _finishStory(spiritId, ent) {
    const spirit = SPIRITS[spiritId];
    const keep = keepsakeOf(spiritId);
    const self = this;
    if (keep) this.inventory.add(keep, 1);
    if (ent) {
      this.colorField.grow('spirit_' + spiritId, 300);
      this.colorField.markDirty();
      this.particles.burst('heart', ent.x, ent.y - 90, 8);
    }
    this.audio.play('levelup');
    setTimeout(function () {
      self.ui.toast(spirit.name + ' · Geschichte ganz', 'icon_star', 'good');
      if (keep) self.ui.toast(itemName(keep) + ' erhalten', getItem(keep).icon, 'good');
    }, 900);
  }

  /**
   * Meldet den Standort an offene „Hingehen"-Aufträge.
   *
   * Nur viermal je Sekunde: Die Prüfung läuft über alle offenen Aufträge,
   * und ein Ort ändert sich zwischen zwei Bildern nicht nennenswert.
   */
  _checkVisits(dt) {
    this._visitTimer = (this._visitTimer || 0) - dt;
    if (this._visitTimer > 0) return;
    this._visitTimer = 0.25;
    const open = this.quests.active();
    let any = false;
    for (let i = 0; i < open.length; i++) {
      if (open[i].type === QTYPE.VISIT && !open[i].turnedIn && open[i].have < open[i].need) {
        any = true;
        break;
      }
    }
    if (!any) return;
    if (this.quests.notify('visit', { x: this.player.x, y: this.player.y }, this)) {
      this.audio.play('questDone');
      this.particles.burst('sparkle', this.player.x, this.player.y - 40, 12);
      this.ui.toast('Angekommen', 'icon_map', 'good');
      this.ui.refreshQuests();
    }
  }

  /**
   * Mondblumen, Regenpilze, Nebelkristalle setzen und wieder einsammeln.
   *
   * Nur alle paar Sekunden prüfen: Der Zustand ändert sich höchstens beim
   * Wetterwechsel oder bei Einbruch der Dunkelheit, und die Suche nach freien
   * Plätzen läuft über die ganze Kachelkarte.
   */
  _syncConditionalSpawns() {
    this._condTimer = (this._condTimer || 0) - 1;
    if (this._condTimer > 0) return;
    this._condTimer = 180;

    const night = this.day.isDark();
    const rain = this.weather.raining;
    const fog = this.weather.foggy;
    const key = (night ? 'n' : '') + (rain ? 'r' : '') + (fog ? 'f' : '') + ':' + this.day.day;
    if (key === this._condKey) return;
    this._condKey = key;

    const rng = dailyRng(this.world.seed, this.day.day, 'cond' + key);
    const jetzt = { night: night, rain: rain, fog: fog };
    for (let i = 0; i < CONDITIONAL.length; i++) {
      const item = CONDITIONAL[i];
      this.world.syncConditional(item.id, !!jetzt[item.onlyAt], rng, item.spawn || 6);
    }
  }

  /**
   * Legt fällige Geschichtsstücke in die Welt.
   *
   * Immer nur eines je Geist, und erst wenn genug Aufgaben für ihn erledigt
   * sind. So zieht sich eine Kette über viele Tage, statt an einem Abend
   * abgehakt zu sein.
   */
  _placeStoryPieces(day) {
    const rng = dailyRng(this.world.seed, day, 'story');
    const placed = [];
    for (const id in SPIRITS) {
      const done = this.quests.completedBySpirit[id] || 0;
      if (!this.stories.wantsPiece(id, done)) continue;
      const spirit = SPIRITS[id];
      if (!this.world.isUnlocked(spirit.region)) continue;
      const ent = this.world.spiritEntity(id);
      const spot = this.world.randomSpot(rng, spirit.region,
        ent ? { x: ent.x, y: ent.y, r: 420 } : null);
      if (!spot) continue;
      const stage = this.stories.foundOf(id);
      const e = makeEntity('hidden', spot.x, spot.y, {
        storySpirit: id, storyStage: stage, zBias: 2,
      });
      e.sprite = storyArt(id);
      this.world.add(e);
      this.stories.markPlaced(id, stage);
      placed.push(spirit);
    }
    // Ein Hinweis, aber kein Wegweiser: die Insel hat 96 mal 96 Kacheln, ohne
    // den Bereich wäre das Suchen Zufall statt Erkundung.
    if (placed.length && this.ui) {
      const self = this;
      const list = placed.slice();
      setTimeout(function () {
        for (let i = 0; i < list.length; i++) {
          self.ui.toast(list[i].name + ' erinnert sich · ' +
            REGION_NAMES[list[i].region], 'icon_sparkle');
        }
      }, 2000);
    }
  }

  /* ---------------- Kescher ---------------- */

  /**
   * Schlägt mit dem Kescher zu.
   *
   * Getroffen wird der nächste Falter im Umkreis – kein Zielen mit dem
   * Mauszeiger, das Spiel wird auch mit Joystick gespielt. Ein Fehlschlag
   * kostet: die Falter ringsum schrecken auf und fliegen zwei Sekunden lang
   * doppelt so schnell. Ohne das wäre blindes Wischen die beste Taktik.
   */
  /** Reichweite des Kescher nach Stufe. */
  netReach() {
    return 74 + ((this.player.levels.net || 1) - 1) * 26;
  }

  /** Der nächste fangbare Falter vor der Figur, oder null. */
  bugInReach() {
    return this.wildlife.catchableNear(this.player.x, this.player.y - 42, this.netReach());
  }

  /** Ein Falter in Sichtweite – nah genug, dass ein Schlag sinnvoll wirkt. */
  bugNearby() {
    return this.wildlife.catchableNear(this.player.x, this.player.y - 42, this.netReach() + 90);
  }

  swingNet() {
    this.player.startSwing();
    this.audio.play('swing');
    const reach = this.netReach();
    const px = this.player.x;
    const py = this.player.y - 42;

    const bug = this.wildlife.catchableNear(px, py, reach);
    if (!bug) {
      this.wildlife.scare(px, py, reach + 90);
      this.audio.play('fail');
      return;
    }

    const item = getItem(bug.species);
    if (!item) { this.wildlife.remove(bug); return; }
    if (!this.inventory.add(item.id, 1)) {
      this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      return;
    }

    this.wildlife.remove(bug);
    this.particles.burst('sparkle', bug.x, bug.y - bug.z, 10);
    this.audio.play('pickup');
    this.ui.toast(item.name, item.icon, 'good');
    this.state.bugsCaught = (this.state.bugsCaught || 0) + 1;

    if (this.quests.notify('catch', { id: item.id }, this)) this.ui.refreshQuests();
    this.save();
  }

  pickDecor(e) {
    if (this.player.tool.id !== 'hand') {
      this.ui.toast('Mit der Hand aufheben', 'icon_hand');
      return;
    }
    const added = this.inventory.add(e.itemId, 1);
    if (!added) {
      this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      return;
    }
    this.world.remove(e);
    this.audio.play('place');
    this.ui.toast(itemName(e.itemId) + ' eingepackt', getItem(e.itemId).icon);
    this.syncCosiness();
    this.ui.refreshQuests();
  }

  /* ---------------- Gemütlichkeit ---------------- */

  /**
   * Rechnet für jeden Geist nach, wie gemütlich es um ihn herum ist, und
   * setzt seinen Deko-Farbkreis entsprechend.
   *
   * Jeder Geist hat zwei Farbquellen: `spirit_<id>` wächst mit erledigten
   * Aufgaben und bleibt (Erledigtes bleibt erledigt), `cosy_<id>` hängt an
   * der Deko und darf auch wieder schrumpfen.
   *
   * @param {boolean} quiet ohne Meldung – beim Laden und beim Tageswechsel
   */
  syncCosiness(quiet) {
    if (!this.state.cosy) this.state.cosy = {};
    for (const id in SPIRITS) {
      const spirit = SPIRITS[id];
      const e = this.world.spiritEntity(id);
      if (!e) continue;
      const points = charmAround(this.world, id, getItem);
      const level = cosyLevel(points);
      const before = this.state.cosy[id] || 0;
      this.state.cosy[id] = level;

      this.colorField.setTarget(e.x, e.y, cosyRadius(points), 'cosy_' + id);

      if (!quiet && level > before && this.world.isUnlocked(spirit.region)) {
        this.ui.toast(spirit.name + ' · Gemütlich ' + level + '/' + COSY_MAX,
          'icon_heart', 'good');
        this.audio.play('levelup');
        this.particles.burst('color', e.x, e.y - 60, 14);
        this.particles.burst('heart', e.x, e.y - 90, 2);
      }
    }
    this.colorField.markDirty();
  }

  /** Punkte und Stufe eines Geistes – für die Anzeige. */
  cosyOf(spiritId) {
    const points = charmAround(this.world, spiritId, getItem);
    return { points: points, level: cosyLevel(points) };
  }

  useStation(station, entity) {
    switch (station) {
      case 'campfire': this.openPanel('campfire'); break;
      case 'craft': this.openPanel('craft'); break;
      case 'shop': this.openPanel('shop'); break;
      case 'tent': this.sleep(false); break;
      case 'bridge': this._tryBridge(entity); break;
      default: break;
    }
  }

  _tryBridge(entity) {
    if (this.inventory.count('bridge_kit') < 1) {
      this.ui.toast('Brückenbausatz fehlt (Werkbank)', 'icon_bridge_kit');
      return;
    }
    this.inventory.remove('bridge_kit', 1);
    this.world.buildBridge();
    this.ground.buildAll();
    this.ground.prewarm(this.camera.ox, this.camera.oy, this.renderer.viewW, this.renderer.viewH);
    this.particles.burst('color', entity.x + 160, entity.y, 30);
    this.audio.play('colorBurst');
    this.ui.toast('Brücke gebaut – die Klippen sind offen!', 'icon_bridge_kit', 'good');
    this.quests.newDay(this.day.day, this.world, this);
    this.world.newDay(this.day.day);
    this.save();
  }

  /* ---------------- Geister ---------------- */

  talkTo(e) {
    const spirit = SPIRITS[e.spiritId];
    if (!spirit) return;
    const open = this.quests.openForSpirit(e.spiritId);
    const ready = open.filter((q) => this.quests.isReady(q, this));

    if (ready.length) {
      this._turnIn(ready[0], e, spirit);
      return;
    }
    if (open.length) {
      const q = open[0];
      const have = this.quests.progress(q, this);
      this.ui.bubble(e.x, e.y - 190, pickLine(spirit.lines.wait), questBubbleIcons(q, have), 3.2);
      this.audio.play('ghost');
      return;
    }
    this.ui.bubble(e.x, e.y - 190, pickLine(spirit.lines.full), [{ icon: 'icon_heart' }], 2.4);
    this.audio.play('ghost');
  }

  _turnIn(q, e, spirit) {
    const rewards = this.quests.turnIn(q, this);
    if (!rewards) return;

    // Wer es einem Geist gemütlich gemacht hat, wird von ihm besser bezahlt.
    // Bewusst hier und nicht bei der Vergabe: es zählt, wie es jetzt aussieht,
    // nicht wie es aussah, als er die Aufgabe stellte.
    const cosy = this.cosyOf(spirit.id);
    const factor = rewardFactor(cosy.level);
    rewards.coins = Math.round(rewards.coins * factor);
    rewards.ember = Math.round(rewards.ember * factor);

    this.state.coins += rewards.coins;
    this.state.ember += rewards.ember;
    for (let i = 0; i < rewards.items.length; i++) {
      this.inventory.add(rewards.items[i].id, rewards.items[i].n);
    }
    if (q.hiddenIds) this.quests.dropHidden(q, this.world);

    // Farbe wächst um den Geist
    const key = 'spirit_' + spirit.id;
    if (!this.colorField.find(key)) {
      this.colorField.addSource(e.x, e.y, spirit.colorStart, key);
    } else {
      this.colorField.grow(key, spirit.colorPerQuest);
    }
    this.colorField.markDirty();

    this.particles.burst('color', e.x, e.y - 60, 22);
    this.particles.burst('heart', e.x, e.y - 90, 3);
    this.audio.play('questDone');
    this.audio.play('colorBurst');
    this.camera.kick(0.3);

    const icons = [{ icon: 'icon_coin', n: rewards.coins }, { icon: 'icon_ember', n: rewards.ember }];
    this.ui.bubble(e.x, e.y - 190, pickLine(spirit.lines.thanks), icons, 3);
    this.ui.toast('+' + rewards.coins + ' Münzen · +' + rewards.ember + ' Glut', 'icon_coin', 'good');

    const doneN = this.quests.completedBySpirit[spirit.id];
    if (doneN % 3 === 0) {
      const level = friendshipLevel(doneN);
      this.ui.toast(spirit.name + ' · Freundschaft ' + level, 'icon_heart', 'good');
      this.audio.play('levelup');
      this.colorField.grow(key, 72);
      this._giveGift(spirit, level, e);
    }

    this.ui.refreshQuests();
    this.ui.refreshHud();
    this._hintIfIdle();
    this.save();
  }

  /**
   * Ist nichts mehr offen, sagen wir es – und dass man jederzeit schlafen darf.
   *
   * Das Spiel wartet an keiner Stelle auf die echte Uhr. Wer weiterspielen
   * will, legt sich hin und hat einen neuen Tag. Ohne diesen Hinweis könnte
   * es sich anfühlen, als sei man ausgebremst.
   */
  _hintIfIdle() {
    if (this.quests.active().length) return;
    const self = this;
    setTimeout(function () {
      if (self.quests.active().length) return;
      self.ui.toast('Fertig für heute · F am Zelt', 'icon_day');
    }, 1400);
  }

  /** Geschenk zu einer neuen Freundschaftsstufe. */
  _giveGift(spirit, level, e) {
    const gift = friendshipGift(spirit.id, level);
    if (!gift) return;
    this.state.coins += gift.coins;
    this.state.ember += gift.ember;
    const got = [];
    for (let i = 0; i < gift.items.length; i++) {
      const added = this.inventory.add(gift.items[i].id, gift.items[i].n);
      if (added > 0) got.push({ id: gift.items[i].id, n: added });
    }
    this.particles.burst('heart', e.x, e.y - 110, 6);
    const self = this;
    setTimeout(function () {
      self.ui.toast('Geschenk: +' + gift.coins + ' Münzen · +' + gift.ember + ' Glut',
        'icon_heart', 'good');
      if (got.length) self.ui.toastItems(got);
    }, 900);
  }

  spiritsWithReadyQuest() {
    const out = [];
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind !== 'spirit') continue;
      const open = this.quests.openForSpirit(e.spiritId);
      for (let j = 0; j < open.length; j++) {
        if (this.quests.isReady(open[j], this)) {
          out.push(e);
          break;
        }
      }
    }
    return out;
  }

  /* ---------------- Angeln ---------------- */

  _onFishEvent(ev) {
    if (ev === 'bite') {
      this.audio.play('bite');
      this.particles.burst('splash', this.fishing.bobber.x, this.fishing.bobber.y, 4);
      return;
    }
    if (ev === 'escape' || ev === 'miss') {
      this.audio.play('fail');
      this.particles.burst('splash', this.fishing.bobber.x, this.fishing.bobber.y, 6);
      this.ui.toast('Entwischt …', 'icon_rod');
      return;
    }
    if (ev === 'catch') {
      const res = this.fishing.result;
      if (!res) return;
      const n = res.perfect ? 2 : 1;
      const added = this.inventory.add(res.fish.id, n);
      this.audio.play('splash');
      this.audio.play('pickup');
      this.particles.burst('splash', this.fishing.bobber.x, this.fishing.bobber.y, 10);
      if (added > 0) {
        this.state.caught++;
        this.quests.notify('fish', { id: res.fish.id }, this);
        this.ui.toast((res.perfect ? 'Perfekt! ' : '') + res.fish.name + ' ×' + added, res.fish.icon, 'good');
      } else {
        this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      }
      this.ui.refreshQuests();
    }
  }

  /* ---------------- Werkbank / Laden / Feuer ---------------- */

  craftRecipe(id) {
    const rec = recipeById(id);
    if (!rec) return;
    const fire = campfireLevelFor(this.state.campfireFuel).level;
    if (fire < (rec.fire || 1)) {
      this.ui.toast('Das Feuer ist noch zu klein', 'icon_campfire', 'bad');
      return;
    }
    const miss = missingFor(rec, this.inventory, this.state.ember);
    if (miss.length) {
      const what = miss[0].id === 'ember' ? 'Glut' : itemName(miss[0].id);
      this.ui.toast('Es fehlt: ' + what, 'icon_craft', 'bad');
      return;
    }
    for (let i = 0; i < rec.cost.length; i++) {
      this.inventory.remove(rec.cost[i].id, rec.cost[i].n);
    }
    this.state.ember -= rec.ember || 0;

    if (rec.kind === 'tool') {
      this.player.levels[rec.tool] = rec.level;
      this.ui.toast(rec.name + ' fertig!', 'icon_' + rec.tool, 'good');
      this.ui.refreshToolbelt();
    } else if (rec.kind === 'bag') {
      this.inventory.capacity += rec.slots;
      this.state.bagUpgrades++;
      this.ui.toast('Tasche vergrößert (+' + rec.slots + ')', 'icon_bag', 'good');
    } else if (rec.out) {
      const added = this.inventory.add(rec.out.id, rec.out.n);
      if (added < rec.out.n) this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      else this.ui.toast(rec.name + ' gebaut', getItem(rec.out.id).icon, 'good');
      this.quests.notify('craft', { id: rec.out.id }, this);
    }
    if (rec.once) this.state.crafted[rec.id] = true;

    this.audio.play('craft');
    this.ui.refreshHud();
    this.ui.refreshQuests();
    this.save();
  }

  burnItem(id, n) {
    const item = getItem(id);
    if (!item || !item.burn) return;
    const have = this.inventory.count(id);
    const take = Math.min(have, n);
    if (take <= 0) return;
    this.inventory.remove(id, take);

    const gain = item.burn * take;
    this.state.ember += gain;
    const beforeLevel = campfireLevelFor(this.state.campfireFuel).level;
    this.state.campfireFuel += gain;
    const afterLevel = campfireLevelFor(this.state.campfireFuel).level;

    this.audio.play('burn');
    if (this.world.campfire) {
      this.particles.burst('spark', this.world.campfire.x, this.world.campfire.y - 50, 10);
    }
    this.ui.toast('+' + gain + ' Glut', 'icon_ember', 'good');
    this.quests.notify('burn', { n: take }, this);

    if (afterLevel > beforeLevel) {
      this.audio.play('levelup');
      this.ui.toast('Das Feuer wächst · Stufe ' + afterLevel, 'icon_campfire', 'good');
      if (this.world.campfire) {
        this.particles.burst('color', this.world.campfire.x, this.world.campfire.y - 56, 24);
      }
      this.camera.kick(0.35);
    }
    this._syncCampfireColor();
    this.ui.refreshHud();
    this.ui.refreshQuests();
    this.save();
  }

  _syncCampfireColor() {
    const fire = campfireLevelFor(this.state.campfireFuel);
    const c = this.world.campfire;
    if (!c) return;
    const src = this.colorField.find('campfire');
    if (!src) this.colorField.addSource(c.x, c.y, fire.radius, 'campfire');
    else if (src.target < fire.radius) src.target = fire.radius;
    this.colorField.markDirty();
  }

  buyItem(id) {
    const entry = this.shop.entry(id);
    if (!entry || entry.left <= 0) return;
    if (this.state.coins < entry.price) {
      this.ui.toast('Zu wenig Münzen', 'icon_coin', 'bad');
      return;
    }
    if (this.inventory.isFull() && !this.inventory.count(id)) {
      this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      return;
    }
    const added = this.inventory.add(id, 1);
    if (!added) {
      this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      return;
    }
    this.state.coins -= entry.price;
    this.shop.take(id, 1);
    this.audio.play('coin');
    this.ui.toast(itemName(id) + ' gekauft', getItem(id).icon, 'good');
    this.ui.refreshHud();
    this.save();
  }

  sellItem(id, n) {
    const have = this.inventory.count(id);
    const take = Math.min(have, n);
    if (take <= 0) return;
    const price = this.shop.sellPrice(id);
    if (price <= 0) {
      this.ui.toast('Das nimmt niemand', 'icon_coin', 'bad');
      return;
    }
    this.inventory.remove(id, take);
    const total = price * take;
    this.state.coins += total;
    this.audio.play('coin');
    this.ui.toast('+' + num(total) + ' Münzen', 'icon_coin', 'good');
    this.ui.refreshHud();
    this.save();
  }

  /* ---------------- Deko aufstellen ---------------- */

  startPlacing(itemId) {
    const item = getItem(itemId);
    if (!item || !item.prop) return;
    if (this.inventory.count(itemId) <= 0) return;
    const p = this.player.facingPoint(88);
    this.placing = {
      itemId: itemId,
      sprite: item.prop,
      x: Math.round(p.x),
      y: Math.round(p.y),
      valid: false,
      flat: !!item.flat,
      tile: !!item.tile,
    };
    this.ui.toast('Platz wählen · E setzen · X abbrechen', item.icon);
  }

  _updatePlacing() {
    if (!this.placing) return;
    const p = this.player.facingPoint(96);
    this.placing.x = Math.round(p.x);
    this.placing.y = Math.round(p.y);
    this.placing.valid = this._canPlaceAt(this.placing.x, this.placing.y);
  }

  _rotatePlacing() {
    // Platzhalter für spätere Drehung – aktuell nur ein kleiner Versatz
    if (!this.placing) return;
    this.placing.y += 16;
  }

  _canPlaceAt(x, y) {
    if (!this.world.canStand(x, y, 12, 8)) return false;
    if (this.world.regionAtPixel(x, y) == null) return false;
    const near = this.world.queryNear(x, y, 90);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.gone) continue;
      const d = defOf(e.kind);
      if (!d) continue;
      if (d.category === 'station' || d.category === 'spirit' || d.category === 'fox') {
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy < 110 * 110) return false;
      }
      if (e.kind === 'decor') {
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy < 52 * 52) return false;
      }
    }
    return true;
  }

  confirmPlacing() {
    const p = this.placing;
    if (!p) return;
    if (!p.valid) {
      this.ui.toast('Hier passt es nicht', 'icon_lock', 'bad');
      this.audio.play('fail');
      return;
    }
    if (this.inventory.count(p.itemId) <= 0) {
      this.cancelPlacing();
      return;
    }
    this.inventory.remove(p.itemId, 1);

    if (p.tile) {
      const tx = Math.floor(p.x / TILE_SIZE);
      const ty = Math.floor(p.y / TILE_SIZE);
      this.world.setTile(tx, ty, 5);
      this.ground.markTileDirty(tx, ty);
    } else {
      const e = makeEntity('decor', p.x, p.y, { itemId: p.itemId, flat: p.flat });
      e.sprite = p.sprite;
      e.blockR = p.flat ? 0 : 26;
      this.world.add(e);
    }
    this.audio.play('place');
    this.particles.burst('dust', p.x, p.y, 5);
    this.syncCosiness();
    this.ui.refreshQuests();

    if (this.inventory.count(p.itemId) <= 0) this.cancelPlacing();
    this.save();
  }

  cancelPlacing() {
    this.placing = null;
  }

  /* ---------------- Schlafen / neuer Tag ---------------- */

  _trySleepFromKey() {
    const t = this.player.findTarget(this.world);
    if (t && t.def.station === 'tent') this.sleep(false);
    else this.ui.toast('Zum Schlafen ans Zelt', 'icon_star');
  }

  sleep(forced) {
    if (this.sleeping) return;
    this.sleeping = true;
    this.fishing.cancel();
    this.cancelPlacing();
    this.panels.close();
    this.ui.clearBubbles();
    this.audio.play('sleep');
    this.save();

    const self = this;
    this._fadeEl.querySelector('.sleep-note').textContent = forced ? 'Es ist spät geworden …' : 'Gute Nacht …';
    this._fadeEl.classList.add('on');
    setTimeout(function () {
      self.nextDay();
      self._fadeEl.querySelector('.sleep-note').textContent = 'Tag ' + self.day.day;
      setTimeout(function () {
        self._fadeEl.classList.remove('on');
        self.sleeping = false;
      }, 620);
    }, 820);
  }

  nextDay() {
    this.day.sleep();
    const day = this.day.day;
    this.world.newDay(day);
    this.quests.newDay(day, this.world, this);
    this.shop.refresh(day, this.world.seed);
    this.particles.clear();
    this.wildlife.clear();
    this._jitterSpirits(day);
    this._placeStoryPieces(day);
    this.weather.setDay(this.world.seed, day);
    this.camera.snapTo(this.player.x, this.player.y);
    this.ground.prewarm(this.camera.ox, this.camera.oy, this.renderer.viewW, this.renderer.viewH);
    this.ui.refreshHud();
    this.ui.refreshQuests();
    this.ui.toast('Tag ' + day, 'icon_day');
    if (this.weather.strength > 0) {
      const self = this;
      setTimeout(function () {
        self.ui.toast(self.weather.kind === 'rain' ? 'Es regnet' : 'Nebel liegt über der Insel',
          self.weather.kind === 'rain' ? 'icon_bottle' : 'icon_ghost');
      }, 1400);
    }
    this.save();
  }

  _jitterSpirits(day) {
    const rng = dailyRng(this.world.seed, day, 'spirits');
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind !== 'spirit') continue;
      for (let tries = 0; tries < 12; tries++) {
        const nx = e.homeX + (rng() - 0.5) * 90;
        const ny = e.homeY + (rng() - 0.5) * 90;
        if (this.world.canStand(nx, ny, 5, 4)) {
          e.x = nx;
          e.y = ny;
          this.world.reindex(e);
          const key = 'spirit_' + e.spiritId;
          const src = this.colorField.find(key);
          if (src) {
            src.x = nx;
            src.y = ny;
            this.colorField.markDirty();
          }
          break;
        }
      }
    }
  }

  /* ---------------- Umgebung ---------------- */

  _ambient(dt) {
    this._ambientTimer = (this._ambientTimer || 0) - dt;
    if (this._ambientTimer > 0) return;
    this._ambientTimer = 0.35;

    const cam = this.camera;
    const w = this.renderer.viewW;
    const h = this.renderer.viewH;
    const night = this.day.isDark();

    if (night) {
      if (this.particles.count < 60 && Math.random() < 0.7) {
        this.particles.spawn('firefly',
          cam.ox + Math.random() * w,
          cam.oy + Math.random() * h);
      }
      if (Math.random() < 0.02) this.audio.play('owl');
    } else {
      if (this.particles.count < 40 && Math.random() < 0.5) {
        this.particles.spawn('leaf',
          cam.ox + Math.random() * w,
          cam.oy - 40 + Math.random() * 80);
      }
      if (Math.random() < 0.03) this.audio.play('bird');
    }

    if (this.world.campfire) {
      const c = this.world.campfire;
      if (Math.abs(c.x - this.player.x) < 900 && Math.abs(c.y - this.player.y) < 640) {
        this.particles.spawn('spark', c.x + (Math.random() - 0.5) * 24, c.y - 56);
      }
    }

    this._ambienceMix(night);
  }

  /**
   * Was rundherum liegt, bestimmt das Klangbett: am Strand die Brandung,
   * im Wald der Wind in den Blättern, nachts die Grillen.
   */
  _ambienceMix(night) {
    const px = this.player.x;
    const py = this.player.y;
    const R = 9; // Hörweite in Kacheln
    let water = 0;
    let land = 0;
    const tx0 = Math.floor(px / TILE_SIZE);
    const ty0 = Math.floor(py / TILE_SIZE);
    for (let ty = ty0 - R; ty <= ty0 + R; ty += 2) {
      for (let tx = tx0 - R; tx <= tx0 + R; tx += 2) {
        land++;
        if (isWater(this.world.tileAtTile(tx, ty))) water++;
      }
    }
    const waterShare = land ? water / land : 0;

    // Blattwerk aus den Bäumen in der Nähe – der Wald rauscht, die Wiese nicht
    let trees = 0;
    const near = [];
    this.world.queryRect(px - 560, py - 400, 1120, 800, near);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (!e.gone && defOf(e.kind) && defOf(e.kind).category === 'tree') trees++;
    }
    const leaves = Math.min(1, trees / 14);

    this.audio.setAmbienceMix(
      Math.min(1, waterShare * 2.2),
      leaves,
      night ? 1 : 0,
      this.weather.raining ? this.weather.level : 0
    );
  }

  lightSources(time) {
    const out = [];
    const fire = campfireLevelFor(this.state.campfireFuel);
    const c = this.world.campfire;
    if (c) {
      const flicker = 1 + Math.sin(time * 7.3) * 0.03 + Math.sin(time * 3.1) * 0.02;
      out.push({ x: c.x, y: c.y - 34, r: fire.light * flicker, a: 0.98 });
    }
    out.push({ x: this.player.x, y: this.player.y - 42, r: 170, a: 0.6 });

    const near = this.world.queryRect(
      this.camera.ox - 200, this.camera.oy - 200,
      this.renderer.viewW + 400, this.renderer.viewH + 400
    );
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.gone) continue;
      if (e.kind === 'decor' && e.itemId) {
        const item = getItem(e.itemId);
        if (item && item.light) {
          out.push({ x: e.x, y: e.y - 58, r: item.light * (1 + Math.sin(time * 5 + e.phase) * 0.02), a: 0.9 });
        }
      } else if (e.kind === 'spirit') {
        out.push({ x: e.x, y: e.y - 58, r: 128, a: 0.5 });
      } else if (e.kind === 'hidden') {
        out.push({ x: e.x, y: e.y - 26, r: 96, a: 0.7 });
      }
    }
    return out;
  }

  /* ---------------- Hinweistext ---------------- */

  _updatePrompt() {
    if (this.placing) {
      this.ui.setPrompt(this.placing.valid ? 'Hier aufstellen' : 'Kein Platz');
      return;
    }
    if (this.player.tool.id === 'net' && this.bugInReach()) {
      this.ui.setPrompt('Fangen');
      return;
    }
    if (this.fishing.active) {
      this.ui.setPrompt(null);
      return;
    }
    const t = this.target;
    if (!t) {
      if (this.player.tool.id === 'rod') {
        const p = this.player.facingPoint(26);
        this.ui.setPrompt(this.world.waterAt(p.x, p.y) ? 'Angeln' : null);
      } else {
        this.ui.setPrompt(null);
      }
      return;
    }
    const def = t.def;
    if (def.category === 'spirit') {
      const open = this.quests.openForSpirit(t.entity.spiritId);
      const ready = open.filter((q) => this.quests.isReady(q, this));
      this.ui.setPrompt(ready.length ? 'Abgeben' : 'Reden');
      return;
    }
    if (def.category === 'fox') { this.ui.setPrompt('Laden'); return; }
    if (def.category === 'hidden') { this.ui.setPrompt('Aufheben'); return; }
    if (def.category === 'decor') { this.ui.setPrompt('Einpacken'); return; }
    if (def.station === 'campfire') { this.ui.setPrompt('Lagerfeuer'); return; }
    if (def.station === 'craft') { this.ui.setPrompt('Werkbank'); return; }
    if (def.station === 'shop') { this.ui.setPrompt('Laden'); return; }
    if (def.station === 'tent') { this.ui.setPrompt('Schlafen'); return; }
    if (def.station === 'bridge') { this.ui.setPrompt('Brücke bauen'); return; }

    const label = {
      tree: 'Baum fällen',
      rock: 'Stein abbauen',
      forage: 'Sammeln',
      dig: 'Graben',
      barrier: 'Weg freimachen',
    }[def.category] || 'Benutzen';
    this.ui.setPrompt(t.matches ? label : label + ' (' + toolNameFor(def.tool) + ')');
  }

  /* ---------------- Einstellungen ---------------- */

  changeSetting(key, value) {
    let v = value;
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (!isNaN(parseFloat(v)) && key !== 'talk') v = parseFloat(v);
    this.settings[key] = v;
    storage.writeSettings(this.settings);
    this.applySettings();
  }

  applySettings() {
    this.audio.setEnabled(this.settings.sound);
    this.audio.setMusic(this.settings.music);
    this.audio.setAmbience(this.settings.ambience !== false);
    this.audio.setVolume(this.settings.volume);
    this.day.dayMinutes = this.settings.dayMinutes;
    if (this.onSettingsChanged) this.onSettingsChanged(this.settings);
  }

  confirmReset() {
    const ok = window.confirm('Wirklich neu anfangen? Der aktuelle Spielstand geht verloren.');
    if (!ok) return;
    storage.clearSave();
    window.location.reload();
  }
}

/* ---------------- Hilfsfunktionen ---------------- */

function ensureFade() {
  let el = document.getElementById('fadeout');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fadeout';
    el.innerHTML = '<div class="sleep-note"></div>';
    document.getElementById('stage').appendChild(el);
  }
  return el;
}

function pickLine(list) {
  if (!list || !list.length) return '';
  return list[Math.floor(Math.random() * list.length)];
}

function questBubbleIcons(q, have) {
  const icons = [];
  if (q.type === QTYPE.FISH) icons.push({ icon: 'icon_fish_trout', n: q.need - have });
  else if (q.type === QTYPE.BURN) icons.push({ icon: 'icon_campfire', n: q.need - have });
  else if (q.type === QTYPE.DECORATE) icons.push({ icon: 'icon_flowerbed', n: q.need - have });
  else if (q.itemId) icons.push({ icon: 'icon_' + q.itemId, n: q.need - have });
  return icons;
}

function toolNameFor(id) {
  for (let i = 0; i < TOOLS.length; i++) if (TOOLS[i].id === id) return TOOLS[i].name;
  return id;
}

export { TILE_SIZE, REGION, CAT, RECIPES };
