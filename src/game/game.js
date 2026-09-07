/**
 * Spielkern: hält alles zusammen und verbindet Eingabe, Welt und Oberfläche.
 */
import { World, TILE_SIZE, REGION } from '../world/world.js';
import { isWater, T } from '../art/tiles.js';
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
import { CROPS, cropOfSeed, stageOf, daysToRipe, growthPerDay, harvestOf } from './crops.js';
import { todayOf, shoalIndex } from './calendar.js';
import { Shop } from './shop.js';
import { DayCycle, DEFAULT_DAY_MINUTES } from './daycycle.js';
import { Fishing, CAST_REACH } from './fishing.js';
import { SPIRITS, friendshipLevel, friendshipGift } from './spirits.js';
import { StoryBook, STAGES, storyArt, keepsakeOf, storyLine, storyClose, storyIntro } from './stories.js';
import { charmAround, cosyLevel, cosyRadius, rewardFactor, COSY_MAX } from './cosiness.js';
import { getItem, itemName, CAT, CONDITIONAL, fishesOf } from './items.js';
import { RECIPES, recipeById, missingFor, campfireLevelFor } from './recipes.js';
import { dueAt, perksOf } from './milestones.js';
import { defOf, makeEntity, spriteFor } from '../world/entities.js';
import { startPosition, REGION_NAMES } from '../world/worldgen.js';
import { randInt, dailyRng } from '../core/rng.js';
import { num } from '../core/util.js';
import { audio } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { Panels } from '../ui/panels.js';
import { applyUiScale } from '../ui/uiscale.js';
import * as storage from '../core/storage.js';
import * as savefile from '../core/savefile.js';

export const SAVE_VERSION = 1;

/**
 * Prüft einen Spielstand aus einer Datei.
 *
 * Steht hier und nicht in der Spielklasse, weil der Startbildschirm sie
 * braucht – dort gibt es noch kein Spiel, an dem eine Methode hängen könnte.
 * Und weil eine Prüfung, die an zwei Stellen gebraucht wird, nicht zweimal
 * geschrieben gehört: Sonst wird die eine irgendwann strenger als die andere.
 *
 * @returns {{ok: boolean, data: object|null, reason: string}}
 */
export function parseSave(text) {
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { ok: false, data: null, reason: 'Datei nicht lesbar' };
  }
  if (!data || typeof data !== 'object' || !data.seed) {
    return { ok: false, data: null, reason: 'Das ist kein Spielstand' };
  }
  if (data.version !== SAVE_VERSION) {
    return { ok: false, data: null, reason: 'Spielstand aus einer anderen Fassung' };
  }
  return { ok: true, data: data, reason: '' };
}
const AUTOSAVE_SECONDS = 20;

export const DEFAULT_SETTINGS = {
  sound: true,
  music: true,
  ambience: true,
  volume: 0.7,
  talk: 'short',
  dayMinutes: DEFAULT_DAY_MINUTES,
  scaling: 'crisp',
  uiScale: 1,
};

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.input = input;
    this.audio = audio;
    this.time = 0;
    this.autosaveTimer = AUTOSAVE_SECONDS;
    this.sleeping = false;
    // Gesetzt, sobald ein fremder Spielstand übernommen wurde: ab dann
    // schreibt dieses Spiel nichts mehr.
    this.frozen = false;
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

    this.refreshToday();

    // Strichliste für den Rückblick: neu anlegen, wenn es keine gibt oder sie
    // noch von einem früheren Tag stammt (etwa aus einem alten Spielstand).
    if (!this.state.daybook || this.state.daybook.day !== this.day.day) this._daybookStart();

    this.ui = new UI(this);
    this.panels = new Panels(this);
    this.ui.layout();
    this.applySettings();
    // Vor `_syncCampfireColor`: der Feuerkreis hängt an einem Meilenstein.
    this._perksChanged();
    // Still: beim Laden steht die Deko ja schon da, da wäre eine Meldung
    // für jede Stufe eine Meldungslawine beim Spielstart.
    this.syncCosiness(true);
    this.ui.refreshHud();
    this.ui.refreshQuests();
    // Eine früher gewählte Datei zurückholen. Steht die Erlaubnis nicht mehr
    // (über `file://` überlebt sie das Schließen nicht), einmal daran
    // erinnern – sonst merkt niemand, dass sein eingerichtetes Speichern
    // gerade nicht greift, und wundert sich später über einen alten Stand.
    // Was heute los ist, muss man erfahren, ohne danach zu suchen.
    const heute = this.today;
    if (heute && heute.event) {
      const self4 = this;
      setTimeout(function () {
        self4.ui.toast(heute.event.name + ' · ' + heute.event.hint, heute.event.icon, 'good');
      }, 3200);
    }

    const self3 = this;
    savefile.restoreLink().then(function (name) {
      if (name || !savefile.pendingLinkName()) return;
      setTimeout(function () {
        self3.ui.toast('Speicherdatei bestätigen · Einstellungen', 'icon_star');
      }, 2600);
    });
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
      milestones: Object.create(null),
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
      milestones: Object.create(null),
    }, save.state || {});
    if (!this.state.crafted) this.state.crafted = Object.create(null);
    // Ein Spielstand von vor den Meilensteinen holt beim ersten Bild alles
    // nach, was seine Farbe schon hergibt – siehe `_checkMilestones`.
    if (!this.state.milestones) this.state.milestones = Object.create(null);

    this.world.unlocked = save.unlocked || [true, false, false];
    if (save.bridgeBuilt) this.world.buildBridge();
    this._applyWorldDelta(save.worldDelta);
  }

  /**
   * Zeichenfläche an die Fenstergröße anpassen.
   * Der Zoom hält den sichtbaren Ausschnitt weitgehend konstant, damit das
   * Spiel auf einem großen Bildschirm nicht plötzlich weit weg wirkt.
   */
  /** Nächstes Bild auf jeden Fall neu zeichnen, auch hinter einem Fenster. */
  invalidate() {
    this._pausedDrawn = false;
  }

  syncViewport() {
    const stage = this.canvas.parentNode || document.body;
    const cssW = stage.clientWidth || window.innerWidth || 960;
    const cssH = stage.clientHeight || window.innerHeight || 540;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.resize(cssW, cssH, dpr);
    this.camera.resize(this.renderer.viewW, this.renderer.viewH);
    if (this.ui) this.ui.layout();
    // Die Leinwand ist womöglich neu und damit leer – hinter einem offenen
    // Fenster muss deshalb noch einmal gezeichnet werden.
    this.invalidate();
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
      if (e.kind === 'decor' || e.kind === 'hidden' || e.kind === 'crop') {
        added.push({
          id: e.id, k: e.kind, x: Math.round(e.x), y: Math.round(e.y),
          s: e.sprite, item: e.itemId || null, q: e.questId || null, flat: !!e.flat,
          sp: e.storySpirit || null, st: e.storyStage != null ? e.storyStage : null,
          c: e.cropId || null, gw: e.grown != null ? e.grown : null, wt: e.watered || 0,
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
          e.sprite = spriteFor(c.k, e.x, e.y) || e.sprite;
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
          cropId: a.c || null, grown: a.gw != null ? a.gw : 0,
        });
        e.id = a.id;
        if (a.wt) e.watered = a.wt;
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
    // Nach dem Übernehmen eines fremden Spielstands darf dieses Spiel nichts
    // mehr schreiben. Sonst überschreibt es beim Neuladen den gerade
    // geladenen Stand: `location.reload()` löst `pagehide` aus, und der
    // Sicherungshaken dort sichert noch das alte Spiel.
    if (this.frozen) return false;
    let json = null;
    try {
      json = JSON.stringify(this.toJSON());
      storage.writeSave(JSON.parse(json));
    } catch (err) {
      console.warn('Speichern fehlgeschlagen', err);
      return false;
    }
    // Ist eine Datei verknüpft, geht derselbe Stand still dorthin. Ein Fehler
    // dabei darf das Spiel nicht stören – der Browserspeicher hat schon.
    if (json && savefile.linkedName()) savefile.writeLinked(json);
    return true;
  }

  /* ---------------- Spielstand als Datei ---------------- */

  /** Lädt den Spielstand als Datei herunter. */
  exportSave() {
    const json = JSON.stringify(this.toJSON());
    const ok = savefile.download(json, savefile.suggestName(this.day.day));
    this.ui.toast(ok ? 'Spielstand gesichert' : 'Sichern ging nicht',
      'icon_star', ok ? 'good' : 'bad');
    return ok;
  }

  /**
   * Übernimmt einen Spielstand aus einer Datei.
   * Die Seite lädt danach neu – ein laufendes Spiel mitten im Betrieb
   * auszutauschen wäre die Sorte Fehlerquelle, die man nie ganz findet.
   */
  applySaveText(text) {
    const geprueft = parseSave(text);
    if (!geprueft.ok) {
      this.ui.toast(geprueft.reason, 'icon_lock', 'bad');
      return false;
    }
    const data = geprueft.data;
    this.frozen = true;
    storage.writeSave(data);
    this.ui.toast('Spielstand geladen · Tag ' + ((data.day && data.day.day) || 1),
      'icon_star', 'good');
    setTimeout(function () { window.location.reload(); }, 900);
    return true;
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
    else if (this.input.isDown('interact')) this._keepWorking();
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
    this._shootingStars(dt);
    this._checkVisits(dt);
    this._checkMilestones(dt);

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

  /**
   * Ein Bild zeichnen.
   *
   * Ist ein Fenster offen, steht die Welt still: `update()` kehrt dann früh
   * zurück, nichts bewegt sich mehr. Trotzdem wurde die ganze Szene weiter
   * dreißigmal je Sekunde neu gemalt – gemessen 78 Zeichnungen in 2,5
   * Sekunden für ein Bild, das sich nicht ändern kann. Diese Arbeit lief
   * gegen das Aufbauen des Fensters selbst, und genau das hat man als Ruckeln
   * beim Öffnen der Tasche gesehen.
   *
   * Jetzt wird hinter einem offenen Fenster genau EIN Bild gezeichnet. Ändert
   * sich die Zeichenfläche (Fenstergröße, Auflösungsstufe), setzt
   * `invalidate()` das zurück – sonst bliebe eine frisch angelegte, leere
   * Leinwand hinter dem Fenster stehen.
   *
   * @returns {boolean} ob wirklich gezeichnet wurde
   */
  draw(alpha) {
    // Zwischenstand zwischen zwei Simulationsschritten. Steht er auf der
    // Kamera, bekommt ihn jeder, der `camera.ox` liest – Boden, Objekte,
    // Sprechblasen –, ohne dass die Zahl durch zehn Aufrufe gereicht wird.
    this.camera.alpha = alpha == null ? 1 : alpha;
    if (this.panels && this.panels.isOpen()) {
      if (this._pausedDrawn) return false;
      this._pausedDrawn = true;
    } else {
      this._pausedDrawn = false;
    }
    this.renderer.draw(this, this.time);
    return true;
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

  /**
   * Taste gehalten: weiterarbeiten, bis das Objekt weg ist.
   *
   * Eine Kiefer braucht vier Schläge, ein Findling drei. Für jeden einzeln zu
   * tippen ist keine Entscheidung, sondern Arbeit an der Tastatur. Der Takt
   * kommt aus der Schwungdauer – schneller als von Hand wird es dadurch nicht.
   *
   * Nur für Werkzeugarbeit. Reden, Aufheben, Einpacken und Läden bleiben beim
   * einzelnen Druck: Sonst redete man einen Geist im Halbsekundentakt an.
   */
  _keepWorking() {
    if (this.placing || this.fishing.active || this.sleeping) return;
    if (this.player.swing > 0) return;
    const t = this.target;
    if (!t || !t.def || !t.def.tool || t.def.station) return;
    if (t.def.category === 'hidden' || t.def.category === 'decor') return;
    this.useTool(t);
  }

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

    // Dasselbe für die Angel: Liegt Wasser vor der Figur, wird geangelt – auch
    // wenn zufällig ein Busch in Reichweite steht. Vorher gewann der Busch,
    // und am Ufer war Angeln neben Gestrüpp schlicht nicht möglich; man bekam
    // stattdessen „Dafür brauchst du: Hand".
    if (this.player.tool.id === 'rod' && this._waterAhead()) { this._castRod(); return; }

    const t = this.target;
    if (t) {
      const def = t.def;
      if (def.category === 'spirit') { this.talkTo(t.entity); return; }
      if (def.category === 'fox') { this.openPanel('shop'); return; }
      if (def.category === 'hidden') { this.pickHidden(t.entity); return; }
      if (def.category === 'crop') {
        // Mit der Kanne in der Hand wird gegossen, solange etwas zu gießen ist.
        // Ist das Beet reif, wird geerntet – Gießen wäre dann nur ein Klick,
        // der nichts tut, und man hätte erst das Werkzeug wechseln müssen.
        if (this.player.tool.id === 'can' && this.waterCrop(t.entity)) return;
        this.harvestCrop(t.entity);
        return;
      }
      if (def.category === 'decor') { this.pickDecor(t.entity); return; }
      if (def.station) { this.useStation(def.station, t.entity); return; }
      if (def.tool) { this.useTool(t); return; }
    }

    // Nichts in Reichweite: Angel auswerfen, wenn Wasser vor uns liegt
    if (this.player.tool.id === 'rod') this._castRod();
  }

  /**
   * Würde ein Wurf hier im Wasser landen?
   *
   * Dieselbe Reichweite wie `Fishing.cast` – sonst sagen Hinweis und Wurf
   * etwas Verschiedenes. Genau das war der Fall: Der Hinweis „Angeln" erschien
   * erst 26 px vor dem Wasser, geworfen werden konnte aber schon aus 104 px.
   * Wer am Ufer stand, sah keinen Hinweis und probierte es gar nicht erst.
   */
  _waterAhead() {
    const p = this.player.facingPoint(CAST_REACH);
    return this.world.waterAt(p.x, p.y);
  }

  _castRod() {
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

  useTool(t) {
    const e = t.entity;
    const def = t.def;
    let tool = this.player.tool;

    // Das passende Werkzeug wird selbst genommen.
    //
    // Vorher stand vor jedem Baum, jedem Stein und jeder Grabstelle erst eine
    // Meldung „Dafür brauchst du: Axt", und man drückte eine Zifferntaste. Bei
    // hunderten Bäumen ist das kein Anspruch, sondern eine Handbewegung, die
    // nichts entscheidet. Die Angel und der Kescher greifen vorher (siehe
    // onInteract), es kann also nicht passieren, dass ein Busch das Angeln
    // verhindert.
    if (def.tool !== tool.id) {
      const idx = TOOLS.map(function (x) { return x.id; }).indexOf(def.tool);
      if (idx < 0) {
        this.ui.toast('Dafür brauchst du: ' + def.tool, 'icon_star');
        return;
      }
      this.selectTool(idx);
      tool = this.player.tool;
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
        this._note('coins', coins);
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
      e.sprite = spriteFor(def.becomes, e.x, e.y) || e.sprite;
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
    this._note('finds');
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
    this._note('finds');
    this.world.remove(e);
    this.particles.burst('sparkle', e.x, e.y - 32, 16);
    this.particles.burst('color', e.x, e.y - 40, 14);
    this.audio.play('questDone');
    this.camera.kick(0.2);

    const n = this.stories.collect(spiritId);
    const spirit = SPIRITS[spiritId];
    this.ui.toast(spirit.name + ' · Erinnerung ' + n + '/' + STAGES, 'icon_sparkle', 'good');

    // Der Satz zum Stück – direkt am Fundort, nicht erst beim Geist. Das ist
    // der Moment, in dem man das Ding in der Hand hat.
    const satz = storyLine(spiritId, n - 1);
    if (satz && this.settings.talk !== 'off') {
      this.ui.bubble(e.x, e.y - 120, satz, [{ icon: 'icon_ghost' }], 5.5, true);
    }

    // Farbe blüht um den Geist auf, auch ohne Aufgabe
    const key = 'spirit_' + spiritId;
    const ent = this.world.spiritEntity(spiritId);
    if (ent) {
      if (!this.colorField.find(key)) this.colorField.addSource(ent.x, ent.y, 160, key);
      else this.colorField.growByArea(key, 160000);
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
      this.colorField.growByArea('spirit_' + spiritId, 520000);
      this.colorField.markDirty();
      this.particles.burst('heart', ent.x, ent.y - 90, 8);
    }
    this.audio.play('levelup');
    const schluss = storyClose(spiritId);
    setTimeout(function () {
      self.ui.toast(spirit.name + ' · Geschichte ganz', 'icon_star', 'good');
      if (keep) self.ui.toast(itemName(keep) + ' erhalten', getItem(keep).icon, 'good');
      if (ent && schluss && self.settings.talk !== 'off') {
        self.ui.bubble(ent.x, ent.y - 190, schluss, [{ icon: 'icon_heart' }], 6, true);
      }
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
    // In der Sternennacht öffnen sich mehr Mondblumen. Das ist der einzige
    // Weg, an dieser Stelle spürbar mehr zu bekommen, ohne eine zweite
    // Spawn-Mechanik danebenzustellen.
    const sterne = !!(this.today && this.today.event && this.today.event.id === 'stars');
    for (let i = 0; i < CONDITIONAL.length; i++) {
      const item = CONDITIONAL[i];
      const n = (item.spawn || 6) * (sterne && item.onlyAt === 'night' ? 3 : 1);
      this.world.syncConditional(item.id, !!jetzt[item.onlyAt], rng, n);
    }
  }

  /**
   * Sternschnuppen in der Sternennacht.
   *
   * Nur ein Bild, keine Mechanik: Man kann nichts damit machen, und genau das
   * ist der Punkt. Ein Spiel, in dem jede schöne Sache auch eine Aufgabe ist,
   * wird anstrengend.
   */
  _shootingStars(dt) {
    if (!this.today || !this.today.event || this.today.event.id !== 'stars') return;
    if (!this.day.isDark()) return;
    this._starTimer = (this._starTimer || 0) - dt;
    if (this._starTimer > 0) return;
    this._starTimer = 1.6 + Math.random() * 3.4;
    const x = this.camera.ox + Math.random() * this.renderer.viewW;
    const y = this.camera.oy + Math.random() * this.renderer.viewH * 0.45;
    this.particles.burst('sparkle', x, y, 14);
    this.audio.play('star');
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
    this._note('bugs');

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

    // Einmal je Geist: wer er war. Ohne das bleiben sechs Fellknäuel mit
    // Symbolkarten – man weiß, was sie wollen, aber nicht, warum sie hier
    // sind. Der Satz kommt genau einmal und steht danach im Fundbuch der
    // Erinnerungen zum Nachlesen.
    if (!this.state.met) this.state.met = {};
    if (!this.state.met[e.spiritId]) {
      this.state.met[e.spiritId] = 1;
      const intro = storyIntro(e.spiritId);
      if (intro && this.settings.talk !== 'off') {
        this.ui.bubble(e.x, e.y - 190, intro, [{ icon: 'icon_ghost' }], 5.5, true);
        this.audio.play('ghost');
        this.save();
        return;
      }
      this.save();
    }

    // Abgegeben wird, was hierher gehört: die eigenen Bitten dieses Geistes
    // und die Botengänge, die ein anderer hierher schickt.
    const hier = this.quests.openAtSpirit(e.spiritId);
    const ready = hier.filter((q) => this.quests.isReady(q, this));

    if (ready.length) {
      this._turnIn(ready[0], e, spirit);
      return;
    }
    // Mitbringsel vor der Wartezeile: „Noch nicht" ist eine Sackgasse, ein
    // Mitbringsel bringt einen weiter. Ein Herz über dem Geist zeigt vorher an,
    // dass gerade etwas Passendes in der Tasche liegt.
    if (this.wantsGift(e.spiritId) && this.giveGiftTo(e)) return;
    // „Noch nicht" sagt ein Geist auch zu dem Botengang, den er selbst
    // aufgegeben hat – sonst stünde er stumm da, bis man zurück ist.
    const open = hier.length ? hier : this.quests.openForSpirit(e.spiritId);
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
    const factor = rewardFactor(cosy.level) * this.perks().reward;
    rewards.coins = Math.round(rewards.coins * factor);
    rewards.ember = Math.round(rewards.ember * factor);

    this.state.coins += rewards.coins;
    this.state.ember += rewards.ember;
    this._note('quests');
    this._note('coins', rewards.coins);
    this._note('ember', rewards.ember);
    for (let i = 0; i < rewards.items.length; i++) {
      this.inventory.add(rewards.items[i].id, rewards.items[i].n);
    }
    if (q.hiddenIds) this.quests.dropHidden(q, this.world);

    // Farbe wächst um den Geist
    const key = 'spirit_' + spirit.id;
    if (!this.colorField.find(key)) {
      this.colorField.addSource(e.x, e.y, spirit.colorStart, key);
    } else {
      this.colorField.growByArea(key, spirit.colorArea);
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
      this.colorField.growByArea(key, 100000);
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
    this._note('coins', gift.coins);
    this._note('ember', gift.ember);
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
      const open = this.quests.openAtSpirit(e.spiritId);
      for (let j = 0; j < open.length; j++) {
        if (this.quests.isReady(open[j], this)) {
          out.push(e);
          break;
        }
      }
    }
    return out;
  }

  /* ---------------- Meilensteine ---------------- */

  /** Steht dieser Meilenstein schon? */
  hasMilestone(id) {
    return !!(this.state.milestones && this.state.milestones[id]);
  }

  /**
   * Die dauerhaften Wirkungen aller erreichten Meilensteine.
   *
   * Gepuffert, weil das in jedem Verkauf, jeder Abgabe und jedem Bild steckt.
   * Die Liste ändert sich nur beim Erreichen – dann wird der Puffer geleert.
   */
  perks() {
    if (!this._perks) this._perks = perksOf(this.state.milestones);
    return this._perks;
  }

  _perksChanged() {
    this._perks = null;
    const p = this.perks();
    this.shop.bonus = p.sell;
    this.shop.allSeeds = p.seeds;
    this._syncCampfireColor();
  }

  /**
   * Ist ein Meilenstein fällig?
   *
   * Einmal je Sekunde statt in jedem Bild: `coverage` tastet die halbe Karte
   * ab, und die Farbe blüht ohnehin über Sekunden auf. Der Fund kommt also
   * genau dann, wenn man die Farbe ankommen sieht.
   */
  _checkMilestones(dt) {
    this._milestoneT = (this._milestoneT || 0) - (dt || 0);
    if (dt && this._milestoneT > 0) return;
    this._milestoneT = 1;

    if (!this.state.milestones) this.state.milestones = Object.create(null);
    const faellig = dueAt(this.colorField.coverage(this.world), this.state.milestones);
    if (!faellig.length) return;

    for (let i = 0; i < faellig.length; i++) {
      this.state.milestones[faellig[i].id] = this.day.day;
      this._giveMilestone(faellig[i]);
    }
    this._perksChanged();
    this._note('milestones', faellig.length);

    // Mehrere auf einmal gibt es nur beim ersten Start eines alten
    // Spielstands. Dann ist eine Sammelmeldung ehrlicher als acht Türmchen.
    if (faellig.length > 1) {
      this.ui.toast(faellig.length + ' Meilensteine erreicht', 'icon_star', 'good');
    } else {
      this.ui.toast(faellig[0].name, faellig[0].icon || 'icon_star', 'good');
    }
    this.audio.play('levelup');
    if (this.world.campfire) {
      this.particles.burst('color', this.world.campfire.x, this.world.campfire.y - 60, 28);
    }
    this.ui.refreshHud();
    this.save();
  }

  /** Die einmalige Beigabe eines Meilensteins. */
  _giveMilestone(m) {
    const gift = m.gift;
    if (!gift) return;
    if (gift.coins) { this.state.coins += gift.coins; this._note('coins', gift.coins); }
    if (gift.ember) { this.state.ember += gift.ember; this._note('ember', gift.ember); }
    if (!gift.items) return;
    const got = [];
    for (let i = 0; i < gift.items.length; i++) {
      const it = gift.items[i];
      const added = this.inventory.add(it.id, it.n);
      if (added > 0) got.push({ id: it.id, n: added });
    }
    if (got.length) this.ui.toastItems(got);
  }

  /* ---------------- Der Kalender ---------------- */

  /**
   * Was heute für ein Tag ist – nach dem Kalender des Rechners.
   *
   * Absichtlich das Datum und nicht die Uhrzeit: Ein Inseltag dauert 14
   * Minuten, eine Bindung an die echte Uhr hätte zwei Uhren gegeneinander
   * laufen lassen, und wer abends spielt, käme an nichts heran, was vormittags
   * passiert. Das Datum macht jeden Tag anders, ohne jemanden auszusperren.
   */
  refreshToday() {
    const vorher = this.today && this.today.event ? this.today.event.id : null;
    this.today = todayOf(new Date());
    this._applyToday();
    return this.today.event && this.today.event.id !== vorher;
  }

  /** Die Wirkungen des Tagesereignisses an die Systeme weitergeben. */
  _applyToday() {
    const ev = this.today && this.today.event ? this.today.event.id : null;
    this.shop.dayBonus = ev === 'market' ? 1.35 : 1;
    this.wildlife.swarm = ev === 'moths';
    if (ev === 'shoal') {
      const pool = fishesOf('sea', false).concat(fishesOf('fresh', false));
      const fisch = pool[shoalIndex(new Date(), pool.length)];
      this.fishing.boost = fisch ? fisch.id : null;
    } else {
      this.fishing.boost = null;
    }
  }

  /** Was der Tageswechsel an die Welt weiterreicht. */
  _todayWorldEffects() {
    const ev = this.today && this.today.event ? this.today.event.id : null;
    return {
      digs: ev === 'digs' ? 2 : 1,
      bloom: ev === 'bloom' ? 10 : 0,
      stars: ev === 'stars',
    };
  }

  /* ---------------- Garten ---------------- */

  /**
   * Ein Beet abernten – oder sagen, wie lange es noch braucht.
   *
   * Die unreife Pflanze auszureißen wäre die naheliegende Alternative, und
   * genau die will man nicht: Wer aus Versehen E drückt, soll nicht drei Tage
   * Warten verlieren. Deshalb passiert dann gar nichts außer einer Auskunft.
   */
  /**
   * Ein Beet gießen – der einzige Grund, morgens noch einmal hinzugehen.
   *
   * Bewusst ohne Strafe, wie der ganze Garten: Nicht gegossen heißt langsamer,
   * nie verdorrt. Und nur einmal am Tag, sonst wäre die Kanne eine Taste, die
   * man zwanzigmal drückt, statt einer kleinen Morgenrunde.
   *
   * @returns {boolean} ob wirklich gegossen wurde
   */
  waterCrop(e) {
    const crop = CROPS[e.cropId];
    if (!crop) return false;
    if (daysToRipe(crop, e.grown || 0) <= 0) return false;
    if (e.watered === this.day.day) {
      this.ui.toast('Schon gegossen', 'icon_can');
      return true;
    }
    e.watered = this.day.day;
    this.player.startSwing();
    this.particles.burst('splash', e.x, e.y - 18, 7);
    this.audio.play('splash');
    this.ui.toast(crop.name + ' gegossen · wächst schneller', 'icon_can', 'good');
    this._note('watered');
    this.save();
    return true;
  }

  harvestCrop(e) {
    const crop = CROPS[e.cropId];
    if (!crop) { this.world.remove(e); return; }
    const rest = daysToRipe(crop, e.grown || 0);
    if (rest > 0) {
      this.ui.toast(crop.name + ' wächst · noch ' + rest + (rest === 1 ? ' Tag' : ' Tage'),
        'icon_' + crop.seed);
      this.audio.play('forage');
      return;
    }

    const got = harvestOf(crop, Math.random);
    const wirklich = [];
    for (let i = 0; i < got.length; i++) {
      const n = this.inventory.add(got[i].id, got[i].n);
      if (n > 0) wirklich.push({ id: got[i].id, n: n });
    }
    if (!wirklich.length) {
      this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      return;
    }
    this.world.remove(e);
    this.particles.burst('sparkle', e.x, e.y - 30, 10);
    this.particles.burst('color', e.x, e.y - 24, 6);
    this.audio.play('pickup');
    this.ui.toastItems(wirklich);
    this._note('harvest');
    // Sammelaufträge lesen die Tasche direkt, es reicht, die Anzeige
    // nachzuziehen. Ein `notify` wäre hier eine Meldung ohne Empfänger.
    this.ui.refreshQuests();
    this.save();
  }

  /** Alle Beete einen Tag weiterwachsen lassen. */
  growCrops(regen) {
    const grund = growthPerDay(regen) + this.perks().grow;
    let reif = 0;
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind !== 'crop') continue;
      const crop = CROPS[e.cropId];
      if (!crop) continue;
      // Gegossen zählt einen Schritt extra – und nur für diesen einen Morgen.
      const zuwachs = grund + (e.watered === this.day.day ? 1 : 0);
      e.watered = 0;
      const vorher = stageOf(e.grown || 0, crop.days);
      e.grown = Math.min(crop.days, (e.grown || 0) + zuwachs);
      const jetzt = stageOf(e.grown, crop.days);
      if (jetzt !== vorher) e.sprite = 'crop_' + crop.id + '_' + jetzt;
      if (jetzt === 2 && vorher !== 2) reif++;
    }
    return reif;
  }

  /** Wie viele Beete stehen, und wie viele davon sind erntereif? */
  cropCount() {
    let gesamt = 0;
    let reif = 0;
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind !== 'crop') continue;
      gesamt++;
      const crop = CROPS[e.cropId];
      if (crop && daysToRipe(crop, e.grown || 0) === 0) reif++;
    }
    return { gesamt: gesamt, reif: reif };
  }

  /* ---------------- Tagebuch ---------------- */

  /**
   * Strichliste für den Tagesrückblick.
   *
   * Sie liegt in `state` und wandert damit in den Spielstand: Wer mitten am
   * Tag aufhört und morgen weitermacht, soll am nächsten Morgen den ganzen
   * Tag sehen, nicht nur den Rest nach dem Laden.
   */
  _daybookStart() {
    this.state.daybook = {
      day: this.day.day,
      quests: 0, finds: 0, fish: 0, bugs: 0, decor: 0, gifts: 0,
      planted: 0, harvest: 0, watered: 0, milestones: 0,
      coins: 0, ember: 0,
      colorStart: this.colorField.coverage(this.world),
    };
  }

  _note(feld, n) {
    const b = this.state.daybook;
    if (!b) return;
    b[feld] = (b[feld] || 0) + (n == null ? 1 : n);
  }

  /* ---------------- Mitbringsel ---------------- */

  /**
   * Wird dieser Gegenstand gerade für einen Auftrag gebraucht?
   *
   * Ein Mitbringsel darf niemals etwas wegnehmen, das man für eine offene
   * Bitte gesammelt hat. Sonst wäre das nette Gespräch mit Mira der Grund,
   * warum Flämmchen sein Holz nicht bekommt.
   */
  _neededForQuest(itemId) {
    const offen = this.quests.active();
    for (let i = 0; i < offen.length; i++) {
      const q = offen[i];
      if (q.turnedIn || q.itemId !== itemId) continue;
      if (q.type === QTYPE.GATHER || q.type === QTYPE.CRAFT) return true;
    }
    return false;
  }

  /** Was dieser Geist gern mag und gerade in der Tasche liegt – oder null. */
  likedInBag(spiritId) {
    const spirit = SPIRITS[spiritId];
    if (!spirit || !spirit.likes) return null;
    for (let i = 0; i < spirit.likes.length; i++) {
      const id = spirit.likes[i];
      if (this.inventory.count(id) <= 0) continue;
      if (this._neededForQuest(id)) continue;
      return id;
    }
    return null;
  }

  /** Jeder Geist nimmt ein Mitbringsel am Tag – sonst wäre es eine Münzquelle. */
  giftedToday(spiritId) {
    return this.state.gifted && this.state.gifted[spiritId] === this.day.day;
  }

  wantsGift(spiritId) {
    return !this.giftedToday(spiritId) && !!this.likedInBag(spiritId);
  }

  /** Geister, denen man gerade etwas mitbringen könnte. */
  spiritsWantingGift() {
    const out = [];
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind !== 'spirit') continue;
      if (this.wantsGift(e.spiritId)) out.push(e);
    }
    return out;
  }

  /**
   * Etwas mitbringen.
   *
   * `likes` stand seit Anfang an in den Geisterdaten und wurde nur benutzt,
   * um zu bestimmen, was ein Geist einem SCHENKT. Andersherum ging nichts –
   * die überzähligen Blumen und Muscheln hatten keine Verwendung außer dem
   * Verkauf. Ein Mitbringsel kostet nichts als ein Stück und bringt Farbe:
   * genau die Währung, um die es in diesem Spiel geht.
   */
  giveGiftTo(e) {
    const spirit = SPIRITS[e.spiritId];
    const id = spirit ? this.likedInBag(e.spiritId) : null;
    if (!id) return false;

    this.inventory.remove(id, 1);
    if (!this.state.gifted) this.state.gifted = {};
    this.state.gifted[e.spiritId] = this.day.day;

    const item = getItem(id);
    const ember = 2 + Math.floor((item && item.value ? item.value : 6) / 8);
    this.state.ember += ember;
    this._note('gifts');
    this._note('ember', ember);

    // Farbe: dauerhaft, wie bei einer erledigten Bitte – nur kleiner.
    this.colorField.growByArea('spirit_' + e.spiritId, 45000);
    this.colorField.markDirty();

    this.particles.burst('heart', e.x, e.y - 110, 7);
    this.particles.burst('color', e.x, e.y - 60, 10);
    this.audio.play('ghost');
    this.ui.bubble(e.x, e.y - 190, pickLine(spirit.lines.thanks),
      [{ icon: 'icon_' + id }, { icon: 'icon_heart' }], 2.8);
    this.ui.toast('+' + ember + ' Glut · etwas mehr Farbe', 'icon_ember', 'good');
    this.ui.refreshHud();
    this.save();
    return true;
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
        this._note('fish', added);
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
    if (rec.needs && !this.hasMilestone(rec.needs)) {
      this.ui.toast('Die Insel muss erst bunter werden', 'icon_star', 'bad');
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
    this._note('ember', gain);
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
    // „Das große Feuer" wirkt hier: derselbe Brennstoff, ein größerer Kreis.
    const radius = fire.radius * this.perks().fire;
    const src = this.colorField.find('campfire');
    if (!src) this.colorField.addSource(c.x, c.y, radius, 'campfire');
    else if (src.target < radius) src.target = radius;
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
    this._note('coins', total);
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
      plant: item.plant || null,
    };
    this.ui.toast(item.plant
      ? 'Platz wählen · E säen · X abbrechen'
      : 'Platz wählen · E setzen · X abbrechen', item.icon);
  }

  /**
   * Setzt den Vorschaupunkt vor die Figur – und sucht sich einen freien Platz,
   * wenn dort gerade ein Baum steht.
   *
   * Vorher lag der Punkt starr 96 px voraus. Wer im Wald oder im dichten Lager
   * etwas aufstellen wollte, bekam „Kein Platz" und musste blind herumlaufen,
   * bis es zufällig passte – und wusste nie, woran es lag. Jetzt weicht der
   * Punkt in Ringen aus, bis zu 90 px; erst wenn dort wirklich nichts frei
   * ist, bleibt er stehen und sagt, warum.
   */
  _updatePlacing() {
    if (!this.placing) return;
    const p = this.player.facingPoint(96);
    const px = Math.round(p.x);
    const py = Math.round(p.y);

    if (this._canPlaceAt(px, py)) {
      this.placing.x = px;
      this.placing.y = py;
      this.placing.valid = true;
      this.placing.reason = null;
      return;
    }

    // Ringe um den Wunschpunkt, von innen nach außen
    const ringe = [30, 56, 90];
    for (let r = 0; r < ringe.length; r++) {
      const schritte = 8 + r * 4;
      for (let i = 0; i < schritte; i++) {
        // Versetzt anfangen, damit nicht jeder Ring dieselbe Richtung bevorzugt
        const a = (i / schritte) * Math.PI * 2 + r * 0.4;
        const x = Math.round(px + Math.cos(a) * ringe[r]);
        const y = Math.round(py + Math.sin(a) * ringe[r]);
        if (this._canPlaceAt(x, y)) {
          this.placing.x = x;
          this.placing.y = y;
          this.placing.valid = true;
          this.placing.reason = null;
          return;
        }
      }
    }

    this.placing.x = px;
    this.placing.y = py;
    this.placing.valid = false;
    this.placing.reason = this._placeReason(px, py);
  }

  /** Warum geht es hier nicht? Für den Hinweis unten am Bild. */
  _placeReason(x, y) {
    if (this.placing && this.placing.plant) {
      const t = this.world.tileAt(x, y);
      if (t !== T.GRASS && t !== T.DIRT) return 'Hier wächst nichts';
    }
    if (!this.world.canStand(x, y, 12, 8)) return 'Hier ist kein Platz frei';
    if (this.world.regionAtPixel(x, y) == null) return 'Nicht auf der Insel';
    const near = this.world.queryNear(x, y, 120);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.gone) continue;
      const d = defOf(e.kind);
      if (!d) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const dist2 = dx * dx + dy * dy;
      if ((d.category === 'station' || d.category === 'spirit' || d.category === 'fox') &&
          dist2 < 110 * 110) {
        return 'Zu nah am Lager';
      }
      if (e.kind === 'decor' && dist2 < 52 * 52) return 'Zu nah an anderer Deko';
    }
    return 'Hier ist kein Platz frei';
  }

  _rotatePlacing() {
    // Platzhalter für spätere Drehung – aktuell nur ein kleiner Versatz
    if (!this.placing) return;
    this.placing.y += 16;
  }

  _canPlaceAt(x, y) {
    if (!this.world.canStand(x, y, 12, 8)) return false;
    if (this.world.regionAtPixel(x, y) == null) return false;
    // Gesät wird nur auf Wiese und Erde. Auf Sand, Fels, Weg oder Brücke
    // wächst nichts, und das soll man beim Setzen sehen, nicht erst am
    // nächsten Morgen an einem Beet, das sich nie rührt.
    if (this.placing && this.placing.plant) {
      const t = this.world.tileAt(x, y);
      if (t !== T.GRASS && t !== T.DIRT) return false;
    }
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
      // Beete dürfen dichter stehen als Deko – ein Garten soll ein Garten
      // sein und keine Reihe einzelner Pflanzen mit Lücken dazwischen.
      if (e.kind === 'crop') {
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy < 44 * 44) return false;
      }
    }
    return true;
  }

  confirmPlacing() {
    const p = this.placing;
    if (!p) return;
    if (!p.valid) {
      this.ui.toast(p.reason || 'Hier passt es nicht', 'icon_lock', 'bad');
      this.audio.play('fail');
      return;
    }
    if (this.inventory.count(p.itemId) <= 0) {
      this.cancelPlacing();
      return;
    }
    this.inventory.remove(p.itemId, 1);

    if (p.plant) {
      const crop = CROPS[p.plant];
      const e = makeEntity('crop', p.x, p.y, {
        cropId: crop.id, grown: 0, plantedDay: this.day.day,
      });
      e.sprite = 'crop_' + crop.id + '_0';
      this.world.add(e);
      this._note('planted');
      this.ui.toast(crop.name + ' gesetzt · reif in ' + crop.days +
        (crop.days === 1 ? ' Tag' : ' Tagen'), 'icon_' + crop.seed, 'good');
    } else if (p.tile) {
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
    this._note('decor');
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
        // Der Rückblick kommt erst, wenn das Bild wieder da ist – und nur,
        // wenn gestern überhaupt etwas passiert ist. Nach einem Tag, an dem
        // man nur herumgelaufen ist, wäre er eine leere Meldung.
        if (self.lastDaybook && daybookHasContent(self.lastDaybook)) {
          setTimeout(function () { self.panels.open('daybook'); }, 260);
        }
      }, 620);
    }, 820);
  }

  nextDay() {
    // Erst den vergangenen Tag abschließen, dann den neuen beginnen: die
    // Farbdeckung nach dem Schlafen wäre schon die von morgen.
    const buch = this.state.daybook;
    if (buch) {
      buch.colorEnd = this.colorField.coverage(this.world);
      this.lastDaybook = buch;
    }

    this.day.sleep();
    const day = this.day.day;
    this._daybookStart();
    // Der Kalender kann sich über Nacht gedreht haben – wer bis nach
    // Mitternacht spielt, bekommt dann auch das Ereignis von morgen.
    this.refreshToday();
    this.world.newDay(day, this._todayWorldEffects());
    // Erst das Wetter des neuen Tages, dann wachsen lassen: Regen zählt
    // doppelt, und das soll der Regen von heute sein, nicht der von gestern.
    this.weather.setDay(this.world.seed, day);
    const frischReif = this.growCrops(this.weather.kind);
    const zurueckgezogen = this.quests.newDay(day, this.world, this);
    this.shop.refresh(day, this.world.seed);
    this.particles.clear();
    this.wildlife.clear();
    this._jitterSpirits(day);
    this._placeStoryPieces(day);
    this.camera.snapTo(this.player.x, this.player.y);
    this.ground.prewarm(this.camera.ox, this.camera.oy, this.renderer.viewW, this.renderer.viewH);
    this.ui.refreshHud();
    this.ui.refreshQuests();
    this.ui.toast('Tag ' + day, 'icon_day');
    // Abgelaufene Bitten sind kein Fehler, aber der Spieler muss merken, dass
    // sie weg sind – sonst sucht er am Nachmittag weiter nach einer Muschel,
    // die niemand mehr will.
    if (zurueckgezogen && zurueckgezogen.length) {
      const self = this;
      const n = zurueckgezogen.length;
      const wer = {};
      for (let i = 0; i < n; i++) wer[zurueckgezogen[i].spirit] = 1;
      const namen = Object.keys(wer).map(function (id) {
        return SPIRITS[id] ? SPIRITS[id].name : id;
      });
      setTimeout(function () {
        self.ui.toast(namen.join(', ') + ': ' + n + (n === 1 ? ' Bitte' : ' Bitten') +
          ' zurückgezogen', 'icon_ghost');
      }, 2600);
    }
    if (this.weather.strength > 0) {
      const self = this;
      setTimeout(function () {
        self.ui.toast(self.weather.kind === 'rain' ? 'Es regnet' : 'Nebel liegt über der Insel',
          self.weather.kind === 'rain' ? 'icon_bottle' : 'icon_ghost');
      }, 1400);
    }
    if (this.today && this.today.event) {
      const self3 = this;
      const ev = this.today.event;
      setTimeout(function () {
        self3.ui.toast(ev.name + ' · ' + ev.hint, ev.icon, 'good');
      }, 3200);
    }
    // Der eigentliche Grund, morgens aufzustehen.
    if (frischReif > 0) {
      const self2 = this;
      setTimeout(function () {
        self2.ui.toast(frischReif + (frischReif === 1 ? ' Beet ist reif' : ' Beete sind reif'),
          'icon_seed_berry', 'good');
      }, 2000);
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
      out.push({ x: c.x, y: c.y - 34, r: fire.light * this.perks().fire * flicker, a: 0.98 });
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
      this.ui.setPrompt(this.placing.valid
        ? (this.placing.plant ? 'Hier säen · X abbrechen' : 'Hier aufstellen · X abbrechen')
        : (this.placing.reason || 'Kein Platz') + ' · X abbrechen');
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
    // Wie in onInteract: Die Angel hat vor der Ernte Vorrang, wenn Wasser vor
    // der Figur liegt. Der Hinweis muss dasselbe sagen wie die Taste tut.
    if (this.player.tool.id === 'rod' && this._waterAhead()) {
      this.ui.setPrompt('Angeln');
      return;
    }
    const t = this.target;
    if (!t) {
      this.ui.setPrompt(null);
      return;
    }
    const def = t.def;
    if (def.category === 'spirit') {
      const open = this.quests.openAtSpirit(t.entity.spiritId);
      const ready = open.filter((q) => this.quests.isReady(q, this));
      const id = ready.length ? null : this.likedInBag(t.entity.spiritId);
      this.ui.setPrompt(ready.length ? 'Abgeben'
        : (id && !this.giftedToday(t.entity.spiritId)) ? itemName(id) + ' schenken'
          : 'Reden');
      return;
    }
    if (def.category === 'fox') { this.ui.setPrompt('Laden'); return; }
    if (def.category === 'hidden') { this.ui.setPrompt('Aufheben'); return; }
    if (def.category === 'crop') {
      const crop = CROPS[t.entity.cropId];
      const rest = crop ? daysToRipe(crop, t.entity.grown || 0) : 0;
      if (rest > 0 && this.player.tool.id === 'can') {
        this.ui.setPrompt(t.entity.watered === this.day.day ? 'Schon gegossen' : 'Gießen');
        return;
      }
      this.ui.setPrompt(rest > 0
        ? 'Noch ' + rest + (rest === 1 ? ' Tag' : ' Tage')
        : 'Ernten');
      return;
    }
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
    applyUiScale(this.settings.uiScale);
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

/** Lohnt sich ein Rückblick auf gestern? */
export function daybookHasContent(b) {
  if (!b) return false;
  return !!(b.quests || b.finds || b.fish || b.bugs || b.decor || b.gifts ||
    b.planted || b.harvest || b.coins || b.ember || (b.colorEnd - b.colorStart) > 0.002);
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
