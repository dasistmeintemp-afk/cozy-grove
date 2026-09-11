/**
 * Spielkern: hält alles zusammen und verbindet Eingabe, Welt und Oberfläche.
 */
import { World, TILE_SIZE, REGION } from '../world/world.js';
import { isWater, isWalkable, T } from '../art/tiles.js';
import { GroundLayer } from '../render/ground.js';
import { ColorField } from '../world/colorfield.js';
import { Renderer } from '../render/renderer.js';
import { Camera } from '../render/camera.js';
import { Particles } from '../render/particles.js';
import { Wildlife } from '../render/wildlife.js';
import { Weather, weatherFor, WEATHER_LABEL as WETTER_WORT } from '../render/weather.js';
import { Player, TOOLS, WALK_SPEED } from './player.js';
import { Inventory } from './inventory.js';
import { QuestBook, QTYPE } from './quests.js';
import {
  CROPS, cropOfSeed, stageOf, daysToRipe, growthPerDay, harvestOf,
  kreuzChance, kreuzungVon, KREUZ_RADIUS,
} from './crops.js';
import { todayOf, shoalIndex } from './calendar.js';
import {
  festOn, festSatz, SCHMUCK_RADIUS, SCHMUCK_ANZAHL, SCHMUCK_ABSTAND, emptyFeste,
} from './festivals.js';
import { emptyDaybook, daybookHasContent } from './daybook.js';
import {
  raumFuer, tuerFuer, anDerTuer, imRaum, platzFrei, stueckAn, maxStuecke,
  gemuetlichkeit, wohnBonus, wohnStufe, emptyInterior, interiorAus, RAND,
  bettFuer, amBett, ausstattungFuer, AUSSTATTUNG_IDS,
} from './interior.js';
import { Shop } from './shop.js';
import { DayCycle, DEFAULT_DAY_MINUTES } from './daycycle.js';
import { Fishing, CAST_REACH } from './fishing.js';
import {
  SPIRITS, SPIRIT_IDS, friendshipLevel, friendshipGift, spiritsOfRegion,
  favouriteOf, isFavourite, birthdayOn, hasBirthday, GEBURTSTAG_FAKTOR,
} from './spirits.js';
import { StoryBook, STAGES, storyArt, keepsakeOf, storyLine, storyClose, storyIntro } from './stories.js';
import { charmAround, cosyLevel, cosyRadius, rewardFactor, COSY_MAX } from './cosiness.js';
import { getItem, itemName, CAT, CONDITIONAL, fishesOf } from './items.js';
import { RECIPES, recipeById, missingFor, campfireLevelFor } from './recipes.js';
import { dueAt, perksOf } from './milestones.js';
import { dueSets } from './collection.js';
import { mailFor, fileMail, unreadCount } from './mail.js';
import { STAGES as LOAN_STAGES, statusOf, pay as payLoan, slotsAt, emptyLoan } from './loan.js';
import { finaleLine, allHeard, stillSilent, circleSpots, FINALE_CLOSE, FINALE_COUNT } from './finale.js';
import {
  PLOT_STAGES, plotStage, nextPlotStage, plotBounds, inPlotAt, MAX_PLOT_STAGE,
  ISLE_PLOT_STAGES, islePlotStage, nextIslePlotStage, islePlotBounds,
  inIslePlotAt, islePlotRect, ISLE_PLOT_TILE, homeTile, MAILBOX_OFFSET,
} from './plot.js';
import {
  houseStage, nextHouseStage, houseSprite, houseLight, houseColor,
  houseFootprint, missingFor as houseMissing,
} from './house.js';
import {
  katalogFuer, katalogEintrag, kannBestellen, bestellen, faellig,
  emptyOrders, MAX_OFFEN,
} from './catalog.js';
import {
  emptyPet, petArtFor, istZahm, istStreuner, launeAmMorgen, darfFuettern,
  suchtHeute, bestesFutter, futterWert, petStatus, istRuheplatz,
  LAUNE_MAX, LAUNE_PRO_FUTTER, ZAHM_NOETIG, saeubereName, nameVon,
} from './pet.js';
import { rollSize, noteSize, bestSize, sizeWord, emptyRecords } from './records.js';
import { regrowDays } from './seasons.js';
import {
  MAX_OFFEN as MAX_WUENSCHE, WUNSCH_MEILENSTEIN, wunschBauen, pruefeWunsch,
  wunschLohn, wunschTitel, wunschIcon, emptyWishes,
  wunschHier, wunschSorteHier, ORTE as WUNSCH_ORTE, GEDULD_TAGE as WUNSCH_GEDULD,
  merken, rangFuer, wunschKey,
} from './wishes.js';
import {
  beetHilfe, BEET_HILFE, WIRK_RADIUS, klingt, istWetterhahn, wirkungVon,
} from './decor.js';
import {
  istSitzplatz, HALTEN_SEK, ERSTER_GEDANKE, GEDANKE_ALLE, ABEND_AB, MORGEN_BIS,
  DEKO_GEDANKE, waehleGedanke, merkeGedanke,
} from './rest.js';
import {
  waehlePlauderei, merkePlauderei, FREUND_AB, GEMUETLICH_AB, KAHL_BIS,
} from './talk.js';
import {
  GERICHTE, gerichtFuer, istGericht, kannKochen, staerkungVon, staerkungHeute,
  tempoFaktor, wuchtBonus, glueckBonus, emptyKitchen, kochDank,
} from './kitchen.js';
import { defOf, makeEntity, spriteFor } from '../world/entities.js';
import { startPosition, REGION_NAMES, ALL_REGIONS } from '../world/worldgen.js';
import { randInt, randPick, dailyRng } from '../core/rng.js';
import { num } from '../core/util.js';
import { audio } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { Panels } from '../ui/panels.js';
import { ensureRoom } from '../art/sprites.js';
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
/**
 * Wie viel Platz ein Möbelstück drinnen blockiert.
 *
 * Kleiner als draußen (26): In einem Zimmer soll ein Stuhl an einem Tisch
 * stehen können, ohne dass Seli daran hängenbleibt.
 */
const INNEN_BLOCK = 22;

/**
 * Wie weit Seli beim Sitzen im Zimmer um sich schaut.
 *
 * Kleiner als draußen (der Wirkradius der Deko): Ein Zimmer ist ein Zimmer,
 * da muss man nicht über die halbe Fläche schauen, um die Laterne daneben
 * zu bemerken.
 */
const INNEN_SICHT = 200;

/**
 * Wie dunkel das Zimmer nachts wird.
 *
 * Daemmerung, nicht Nacht. Bei 0,4 sieht man alles noch, und eine Laterne
 * daneben macht trotzdem einen deutlichen Unterschied. Hoeher gesetzt waere
 * das Lampenaufstellen eine Pflicht.
 */
const INNEN_NACHT = 0.4;

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

    // Vor dem Wetter: Welches Wetter ein Tag hat, hängt an der Jahreszeit,
    // und die steht erst hier fest.
    this.refreshToday();
    this.weather.setDay(this.world.seed, this.day.day, this.season());
    this.weather.snap();
    this._placeStoryPieces(this.day.day);
    this._festSchmuck(this.day.day);

    // Strichliste für den Rückblick: neu anlegen, wenn es keine gibt oder sie
    // noch von einem früheren Tag stammt (etwa aus einem alten Spielstand).
    if (!this.state.daybook || this.state.daybook.day !== this.day.day) this._daybookStart();

    this.ui = new UI(this);
    this.panels = new Panels(this);
    this.ui.layout();
    this.applySettings();
    // Vor `_syncCampfireColor`: der Feuerkreis hängt an einem Meilenstein.
    this._perksChanged();
    this.syncStorage();
    // Die Welt muss wissen, wie weit das Grundstück reicht: Sie entscheidet
    // damit, was nachwächst und wo Grabstellen auftauchen.
    this.world.plotStage = this.state.plot || 1;
    this.world.islePlotStage = this.state.islePlot || 0;
    // Grafik, Kollision und Farbkreis des Zuhauses hängen an der Ausbaustufe.
    this.syncHouse();
    this.syncPet();
    // Alte Spielstände kennen noch keine Wünsche; wer den Meilenstein längst
    // hat, soll sie beim ersten Laden vorfinden und nicht erst morgen.
    this._wuenscheNachfuellen(this.day.day);
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
      collected: Object.create(null),
      mail: [],
      loan: emptyLoan(),
      finale: null,
      plot: 1,
      house: 1,
      orders: emptyOrders(),
      islePlot: 0,
      homeAt: 'camp',
      pet: emptyPet(),
      records: emptyRecords(),
      wishes: emptyWishes(),
      interior: emptyInterior(),
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
      collected: Object.create(null),
      mail: [],
      loan: emptyLoan(),
      finale: null,
      plot: 1,
      house: 1,
      orders: emptyOrders(),
      islePlot: 0,
      homeAt: 'camp',
      pet: emptyPet(),
      records: emptyRecords(),
      gedanken: [],
      plausch: Object.create(null),
      staerkung: emptyKitchen(),
      feste: emptyFeste(),
      interior: emptyInterior(),
    }, save.state || {});
    if (!this.state.crafted) this.state.crafted = Object.create(null);
    // Ein Spielstand von vor den Meilensteinen holt beim ersten Bild alles
    // nach, was seine Farbe schon hergibt – siehe `_checkMilestones`.
    if (!this.state.milestones) this.state.milestones = Object.create(null);
    if (!this.state.collected) this.state.collected = Object.create(null);
    if (!Array.isArray(this.state.mail)) this.state.mail = [];
    if (!this.state.loan) this.state.loan = emptyLoan();
    // Ein Spielstand von vor dem Grundstück fängt bei der Lichtung an,
    // einer von vor dem Hausausbau steht noch im Zelt.
    if (!this.state.plot) this.state.plot = 1;
    if (!this.state.house) this.state.house = 1;
    if (!Array.isArray(this.state.orders)) this.state.orders = emptyOrders();
    if (!this.state.islePlot) this.state.islePlot = 0;
    if (this.state.homeAt !== 'isle') this.state.homeAt = 'camp';
    if (!this.state.pet || typeof this.state.pet !== 'object') this.state.pet = emptyPet();
    if (!this.state.records) this.state.records = emptyRecords();
    if (!this.state.wishes) this.state.wishes = emptyWishes();
    if (!this.state.wishes.letzte) this.state.wishes.letzte = [];
    // Das Zimmer wird beim Laden gerade gezogen: Ein Spielstand von vor dem
    // Hausinneren hat keines, und einer, dessen Haus inzwischen gewachsen
    // ist, hat Möbel an Stellen, die es im kleinen Raum noch nicht gab.
    this.state.interior = interiorAus(
      this.state.interior, raumFuer(this.state.house || 1),
      function (id) { const it = getItem(id); return !!(it && it.prop); });
    // Was Seli beim Ausruhen zuletzt gedacht hat. Steht im Spielstand, damit
    // sie sich nach dem Neuladen nicht mit denselben acht Sätzen begrüßt.
    if (!Array.isArray(this.state.gedanken)) this.state.gedanken = [];
    // Dasselbe für die Geister, je Geist getrennt – siehe `_plaudern`.
    if (!this.state.plausch || typeof this.state.plausch !== 'object') {
      this.state.plausch = Object.create(null);
    }
    // Die Stärkung von heute. Ein alter Spielstand hat keine, und ein Stand
    // von gestern hat eine, die heute nicht mehr gilt – beides erledigt
    // `staerkungHeute` über den Tag, an dem gegessen wurde.
    if (!this.state.staerkung || typeof this.state.staerkung !== 'object') {
      this.state.staerkung = null;
    }
    // Wer heute schon seinen Festgruß gesagt hat. Ein alter Spielstand hat
    // die Liste nicht, und das ist in Ordnung: Dann ist am nächsten Fest
    // eben jeder noch dran.
    if (!this.state.feste || typeof this.state.feste !== 'object') {
      this.state.feste = emptyFeste();
    }

    // Ein Spielstand von vor der Stillen Insel kennt nur drei Bereiche. Die
    // fehlenden Plätze sind zu, nicht undefined – sonst hinge jede Prüfung
    // auf `isUnlocked` an einem Zufall.
    this.world.unlocked = ALL_REGIONS.map(function (r) {
      return !!(save.unlocked && save.unlocked[r]);
    });
    this.world.unlocked[0] = true;
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
      // Die Truhe wandert in den Zustand, damit sie denselben Weg geht wie
      // alles andere – auch beim Export in eine Datei.
      state: Object.assign({}, this.state, {
        storageBox: this.storage ? this.storage.toJSON() : null,
      }),
      quests: this.quests.toJSON(),
      stories: this.stories.toJSON(),
      shop: this.shop.toJSON(),
      color: this.colorField.toJSON(),
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
          // Wie oft dieses Beet beim Wachsen gegossen wurde. Zählt bei der
          // Ernte für die Dämmerblume – ein alter Spielstand hat es nicht und
          // fängt bei null an, was höchstens eine Chance kostet.
          gp: e.gepflegt || 0,
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
        // Die Nummern werden beim Erzeugen der Welt vergeben. Kommt in einer
        // neueren Fassung etwas dazu, verschieben sie sich – „dieser Baum ist
        // gefällt" träfe dann einen anderen. Die Art muss also stimmen: Was
        // nicht passt, bleibt lieber stehen, statt an falscher Stelle zu
        // verschwinden. Bei gefälltem gilt die ursprüngliche Art.
        const erwartet = c.o || c.k;
        if (erwartet && e.kind !== erwartet) continue;
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
        if (a.gp) e.gepflegt = a.gp;
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
    // Drinnen läuft eine viel kürzere Schleife: kein Wetter, keine Geister,
    // kein Angeln, kein Tier. Was es drinnen nicht gibt, muss auch nicht
    // gerechnet werden – und was draußen weiterläuft (die Uhr), steht in
    // `_innenUpdate`.
    if (this.innen) { this._innenUpdate(dt, move); return; }
    // Die Stärkung des Tages wirkt hier – an einer Stelle, jedes Bild. Beim
    // Laden, nach dem Schlafen und nach dem Essen stimmt der Wert damit von
    // selbst; ein zweiter Ort, an dem er gesetzt wird, liefe irgendwann
    // auseinander.
    this.player.tempo = tempoFaktor(this.state.staerkung, this.day.day);
    this.fishing.glueck = glueckBonus(this.state.staerkung, this.day.day);
    this.player.busy = this.fishing.active;
    this.player.update(dt, move, this.world);
    // Nach dem Schritt, vor dem Zielen: Steht sie in diesem Bild auf, soll
    // sie auch in diesem Bild wieder etwas anvisieren können.
    this._ruhen(dt, move);

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
    this._windspiel(dt);
    this.weather.update(dt);
    this._syncConditionalSpawns();
    this._shootingStars(dt);
    this._checkVisits(dt);
    this._checkMilestones(dt);
    this._checkCollection();
    this._petSucht();
    this._petRuht(dt);
    this._updatePet(dt);

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
    if (this.innen) this.renderer.drawInterior(this, this.time);
    else this.renderer.draw(this, this.time);
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
    if (inp.pressed('panelPlot')) this.openPanel('plot');
    if (inp.pressed('cancel')) {
      if (this.panels.isOpen()) this.panels.close();
      else if (this.placing) this.cancelPlacing();
      else if (this.fishing.active) this.fishing.cancel();
      else this.openPanel('settings');
    }
    for (let i = 0; i < TOOLS.length; i++) {
      if (inp.pressed('tool' + (i + 1))) this.selectTool(i);
    }
    if (inp.pressed('nextTool') || inp.pressed('toolNext')) {
      this.player.stepTool(1);
      this.audio.play('ui');
      this.ui.refreshToolbelt();
    }
    if (inp.pressed('toolPrev')) {
      this.player.stepTool(-1);
      this.audio.play('ui');
      this.ui.refreshToolbelt();
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
    // Beim Sitzen gehört die gehaltene Taste dem Einpacken. Ohne diese Zeile
    // fällt beim Einpacken der Bank der Baum daneben – er ist dann das Ziel
    // mit dem passenden Werkzeug, und gehalten wird ja.
    if (this.player.sitzt) return;
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
    // Beim Sitzen gehört die Taste dem Ausruhen: Tippen steht auf, Halten
    // packt das Möbel ein, und beides entscheidet sich erst beim Loslassen –
    // siehe `_ruhen`. Alles andere wartet, bis sie wieder steht.
    if (this.player.sitzt) return;
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
      if (def.category === 'pet') { this.feedPet(); return; }
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
      if (def.category === 'decor') {
        if (istSitzplatz(t.entity.itemId)) { this.setzDich(t.entity); return; }
        this.pickDecor(t.entity);
        return;
      }
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
      this.world, this.player, Math.random, this.day.isNight(),
      this.player.levels.rod, this.season()
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

    // „Kräftig" nimmt einen Schlag ab: Eine Kiefer braucht dann vier statt
    // fünf. Ohne Stärkung ist der Bonus null, und die Zeile rechnet wie zuvor.
    e.hp = (e.hp || 1) - (1 + wuchtBonus(this.state.staerkung, this.day.day));
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
      e.respawnDay = this.day.day + regrowDays(def.respawn || 1, this.season());
    } else if (def.respawn) {
      e.gone = true;
      e.respawnDay = this.day.day + regrowDays(def.respawn, this.season());
    } else {
      this.world.remove(e);
    }
  }

  _unlockRegion(region, sourceEntity) {
    if (!this.world.unlockRegion(region)) return;
    this.particles.burst('color', sourceEntity.x, sourceEntity.y - 40, 26);
    this.audio.play('colorBurst');
    this.camera.kick(0.5);
    this.ui.toast(REGION_NAMES[region] + ' entdeckt!', 'icon_map', 'good');
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
  /**
   * Den Festschmuck aufstellen – und den von gestern abräumen.
   *
   * Der Schmuck ist ECHTE Deko, nur ohne Besitzer: dieselben Objekte, die man
   * auch selbst hinstellt, mit `fest` markiert. Deshalb sieht er aus wie
   * alles andere auf der Insel, wirft dieselben Schatten und steht in
   * derselben Tiefensortierung. Was er NICHT ist: einpackbar. Wer das
   * Lichterfest abräumt und die Laternen behält, hätte vier Laternen für
   * nichts – und am nächsten Morgen wäre der Zauber ein Warenlager.
   *
   * Abgeräumt wird an jedem Tageswechsel, nicht erst am nächsten Fest: Sonst
   * stünde der Blütenschmuck bis Mittsommer.
   */
  _festSchmuck(day) {
    // Erst weg mit allem von gestern.
    const alt = this.world.entities.filter(function (e) { return e.fest && !e.gone; });
    for (let i = 0; i < alt.length; i++) this.world.remove(alt[i]);

    const f = this.fest();
    if (!f || !f.schmuck || !f.schmuck.length) return 0;
    const feuer = this.world.campfire;
    if (!feuer) return 0;

    // Immer dieselbe Anordnung an einem Fest, aber je Insel eine andere:
    // Wer neu lädt, soll nicht plötzlich anderswo Laternen stehen haben.
    const rng = dailyRng(this.world.seed, day, 'fest:' + f.id);
    let n = 0;
    for (let i = 0; i < SCHMUCK_ANZAHL * 24 && n < SCHMUCK_ANZAHL; i++) {
      const a = rng() * Math.PI * 2;
      const r = 110 + rng() * (SCHMUCK_RADIUS - 110);
      const x = feuer.x + Math.cos(a) * r;
      const y = feuer.y + Math.sin(a) * r;
      if (!this.world.canStand(x, y, 20, 12)) continue;
      // Nicht auf etwas draufstellen, das schon dasteht – am wenigsten auf
      // die eigene Deko des Spielers.
      //
      // Der Abstand wird NACHGERECHNET: `queryNear` arbeitet auf einem
      // 160-Punkte-Raster und gibt auch Nachbarn zurück, die weiter weg sind.
      // Ohne diese Zeile galt alles im halben Lager als besetzt, und das Fest
      // stellte gemessen NULL Stücke auf – auf jeder Insel.
      const frei = !this.world.queryNear(x, y, SCHMUCK_ABSTAND).some(function (e) {
        if (e.gone) return false;
        const dx = e.x - x;
        const dy = e.y - y;
        return dx * dx + dy * dy < SCHMUCK_ABSTAND * SCHMUCK_ABSTAND;
      });
      if (!frei) continue;
      const itemId = f.schmuck[n % f.schmuck.length];
      const item = getItem(itemId);
      const e = makeEntity('decor', x, y, {
        itemId: itemId, fest: f.id, flat: !!(item && item.flat),
      });
      e.sprite = (item && item.prop) || itemId;
      e.blockR = item && item.flat ? 0 : 26;
      this.world.add(e);
      n++;
    }
    return n;
  }

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
    // Festschmuck gehört dem Tag, nicht dem Spieler. Wer das Lichterfest
    // abräumte, hätte vier Laternen umsonst – und am nächsten Morgen wäre
    // aus dem Fest ein Warenlager geworden.
    if (e.fest) {
      this.ui.toast('Das gehört zum Fest', 'icon_sparkle');
      return;
    }
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
    this.syncPet();
    this.ui.refreshQuests();
  }

  /* ---------------- Ausruhen ---------------- */

  /**
   * Hinsetzen.
   *
   * Bewusst ohne Bedingung: kein Werkzeug, keine Tageszeit, kein
   * Fortschritt. Sitzen ist das Einzige im Spiel, das man einfach tun darf.
   */
  setzDich(e) {
    if (!e || e.gone || !istSitzplatz(e.itemId)) return false;
    if (!this.player.setzDich(e, e.itemId)) return false;
    this.audio.play('place');
    this._ruheAnzeige(true);
    this._ruheZeit = 0;
    this._ruheNaechster = ERSTER_GEDANKE;
    // Erst loslassen, dann zählt Halten. Ohne das wäre der Tastendruck, mit
    // dem man sich hinsetzt, sofort der Anfang eines Haltens – wer zum
    // Ausruhen eine Sekunde zu lange drückt, hätte die Bank eingepackt.
    this._haltenFrei = false;
    this._halten = 0;
    this.ui.setPrompt('');
    return true;
  }

  /** Aufstehen. `still` unterdrückt den Klang – beim Schlafen und Übersetzen. */
  stehAuf(still) {
    if (!this.player.sitzt) return false;
    this.player.stehAuf();
    this.wildlife.ruhe = null;
    this._ruheZeit = 0;
    this._ruheAnzeige(false);
    if (!still) this.audio.play('step');
    return true;
  }

  /**
   * Die Bedienung tritt zurück, solange man sitzt – und kommt wieder.
   *
   * Am `body`, nicht an einzelnen Elementen: Was dabei blasser wird, steht
   * im Stylesheet und nicht hier. Sonst müsste jedes neue Bedienteil an
   * zwei Stellen nachgetragen werden.
   */
  _ruheAnzeige(an) {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle('ruhe', !!an);
  }

  /**
   * Was beim Sitzen passiert – und das ist mit Absicht wenig.
   *
   * Drei Dinge, in dieser Reihenfolge: aufstehen, wenn man loslaufen will;
   * das Möbel einpacken, wenn man die Taste hält; und sonst ab und zu einen
   * Gedanken. Nichts davon zählt mit, nichts davon läuft ab.
   */
  _ruhen(dt, move) {
    const sitz = this.player.sitzt;
    if (!sitz) {
      if (this.wildlife.ruhe) this.wildlife.ruhe = null;
      return;
    }

    // Das Möbel kann weg sein – eingepackt, durch einen Umzug, durch die
    // Nacht. Dann steht sie auf, statt in der Luft zu sitzen.
    if (sitz.entity.gone) { this.stehAuf(true); return; }

    if (move.x !== 0 || move.y !== 0) { this.stehAuf(); return; }

    this.wildlife.ruhe = { x: this.player.x, y: this.player.y - 40 };

    // Tippen steht auf, Halten packt ein. Der erste Druck zählt nicht mit –
    // das ist noch der, mit dem man sich hingesetzt hat (siehe `setzDich`).
    const taste = this.input.isDown('interact');
    if (!this._haltenFrei) {
      if (!taste) this._haltenFrei = true;
    } else if (taste) {
      this._halten = (this._halten || 0) + dt;
      if (this._halten >= HALTEN_SEK) {
        this._halten = 0;
        // Einpacken bleibt Sache der Hand – wie überall sonst bei Deko. Mit
        // der Axt in der Faust sagt es das, statt die Bank verschwinden zu
        // lassen.
        if (this.player.tool.id !== 'hand') {
          this.ui.toast('Mit der Hand aufheben', 'icon_hand');
          return;
        }
        const e = sitz.entity;
        this.stehAuf(true);
        this.pickDecor(e);
        return;
      }
    } else if (this.input.released('interact')) {
      this._halten = 0;
      this.stehAuf();
      return;
    }

    this._ruheZeit = (this._ruheZeit || 0) + dt;
    if (this._ruheZeit < (this._ruheNaechster || ERSTER_GEDANKE)) return;
    this._ruheNaechster = this._ruheZeit + GEDANKE_ALLE;
    this._denkLaut();
  }

  /** Einen Gedanken zum Platz sagen – leise, über Selis Kopf. */
  _denkLaut() {
    const satz = waehleGedanke(this.ruheLage(), this.state.gedanken || [], Math.random);
    if (!satz) return;
    this.state.gedanken = merkeGedanke(this.state.gedanken || [], satz);
    this.ui.bubble(this.player.x, this.player.y - 108, satz, null, 5.2, true);
  }

  /**
   * Wo Seli sitzt, in Begriffen, die `rest.js` kennt.
   *
   * Alles hier kommt aus Quellen, die es ohnehin gibt: die Ortsprüfungen der
   * Wünsche, das Wetter, die Jahreszeit, die Deko im Umkreis. Nichts davon
   * ist für das Ausruhen erfunden worden – ein zweiter Ortsbegriff neben dem
   * der Wünsche wäre die Sorte Doppelung, die irgendwann auseinanderläuft.
   */
  ruheLage() {
    const p = this.player;
    const sitz = p.sitzt;
    const x = p.x;
    const y = p.y;

    const orte = [];
    for (const id in WUNSCH_ORTE) {
      const o = WUNSCH_ORTE[id];
      if (o.nameFuer) continue;           // „bei ihm selbst" braucht einen Wunsch
      if (o.test(this.world, x, y)) orte.push(id);
    }

    const deko = [];
    let geist = null;
    const nah = this.world.queryNear(x, y, WIRK_RADIUS);
    for (let i = 0; i < nah.length; i++) {
      const e = nah[i];
      if (e.gone) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy > WIRK_RADIUS * WIRK_RADIUS) continue;
      if (e.kind === 'spirit') { geist = e.spiritId; continue; }
      if (e.kind !== 'decor') continue;
      if (DEKO_GEDANKE[e.itemId] && deko.indexOf(e.itemId) < 0) deko.push(e.itemId);
    }

    // Gefragt ist, was man SIEHT, nicht was der Tag vorsieht: `raining` und
    // die beiden anderen prüfen mit, ob überhaupt schon etwas zu sehen ist.
    const w = this.weather;
    // Die Dämmerung am Tagesanfang ist dunkel, aber sie ist nicht Nacht.
    // `isDark()` fasst beides zusammen, weil es fürs Licht dasselbe ist –
    // fürs Reden eben nicht, siehe `MORGEN_BIS` in `rest.js`.
    const morgen = this.day.hour < MORGEN_BIS;
    const nacht = !morgen && this.day.isDark();
    return {
      moebel: sitz ? sitz.itemId : null,
      geist: geist,
      deko: deko,
      wetter: w.raining ? 'regen' : w.foggy ? 'nebel' : w.snowing ? 'schnee' : null,
      morgen: morgen,
      nacht: nacht,
      abend: !nacht && !morgen && this.day.hour >= ABEND_AB,
      orte: orte,
      jahreszeit: this.season(),
    };
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
      case 'kitchen': this.openPanel('kitchen'); break;
      case 'shop': this.openPanel('shop'); break;
      // Am Haus geht man hinein. Geschlafen wird drinnen, am Bett – so wie
      // in jedem Haus. Vorher war das Haus ein Knopf, der die Nacht auslöste,
      // und die vier Ausbaustufen hatten kein Innen.
      case 'tent': this.betritt(); break;
      case 'bridge': this._tryBridge(entity); break;
      case 'boat': this._takeBoat(entity); break;
      case 'mail': this.openPanel('mail'); break;
      case 'storage':
        // Wie das vertäute Boot: Sie steht da, sie geht nur noch nicht auf.
        if (statusOf(this.state.loan).stage < 1) {
          this.ui.toast('Verschlossen. Der Händler baut sie dir – frag ihn.', 'icon_bag');
          this.audio.play('ui');
          break;
        }
        this.openPanel('storage');
        break;
      default: break;
    }
  }

  /**
   * Überfahrt zur Stillen Insel – und zurück.
   *
   * Kein Fahren, sondern ein Schnitt: derselbe Übergang wie beim Schlafen.
   * Ein Boot, das man über den Sund steuert, wäre ein zweites Spiel; hier
   * geht es darum, DASS es die Insel gibt, nicht um die Fahrt.
   *
   * Die Boote liegen von Anfang an da. Bis der Meilenstein steht, sind sie
   * vertäut – so weiß man, dass da draußen etwas ist, lange bevor man
   * hinkommt.
   */
  _takeBoat(entity) {
    if (this.sleeping) return;
    if (!this.world.isUnlocked(REGION.ISLE)) {
      this.ui.toast('Das Boot liegt vertäut. Die Insel wartet noch.', 'icon_boat');
      this.audio.play('ui');
      return;
    }
    const ziel = this.world.boatTarget(entity);
    if (!ziel) return;

    this.sleeping = true;          // sperrt Eingabe wie beim Schlafen
    this.fishing.cancel();
    this.cancelPlacing();
    this.panels.close();
    this.ui.clearBubbles();
    this.audio.play('splash');

    const self = this;
    const hin = entity.toRegion === REGION.ISLE;
    this._fadeEl.querySelector('.sleep-note').textContent = hin ? 'Hinüber …' : 'Zurück …';
    this._fadeEl.classList.add('on');
    setTimeout(function () {
      self.player.x = ziel.x;
      self.player.y = ziel.y;
      self.player.prevX = ziel.x;
      self.player.prevY = ziel.y;
      self.camera.snapTo(ziel.x, ziel.y);
      self.ground.prewarm(self.camera.ox, self.camera.oy, self.renderer.viewW, self.renderer.viewH);
      self.invalidate();
      self._fadeEl.querySelector('.sleep-note').textContent =
        hin ? REGION_NAMES[REGION.ISLE] : REGION_NAMES[REGION.CAMP];
      setTimeout(function () {
        self._fadeEl.classList.remove('on');
        self.sleeping = false;
        self.save();
      }, 620);
    }, 640);
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

    // Der letzte Abend geht allem vor: Wer am Feuer steht und noch nicht
    // gesprochen hat, sagt jetzt seinen Satz – nicht „Noch nicht".
    if (this._finaleTalk(e, spirit)) return;

    // Am Fest sagt jeder Geist etwas dazu und gibt einmal eine Gabe – wie
    // der Geburtstagsgruß, und aus demselben Grund vor dem Tagesgeschäft:
    // Ein Fest, von dem man erst nach der dritten Abgabe erfährt, ist keines.
    if (this._festGruss(e)) return;

    // Ein Geburtstagskind sagt es einmal am Tag, bevor es zum Tagesgeschäft
    // übergeht. Einmal, nicht bei jedem Ansprechen: Beim vierten Mal wäre
    // aus dem Geburtstag eine Sperre vor der Abgabe geworden.
    if (hasBirthday(e.spiritId, new Date())) {
      if (!this.state.gratuliert) this.state.gratuliert = {};
      if (this.state.gratuliert[e.spiritId] !== this.day.day) {
        this.state.gratuliert[e.spiritId] = this.day.day;
        const mag = favouriteOf(e.spiritId);
        this.ui.bubble(e.x, e.y - 190, 'Ich habe heute Geburtstag.',
          [{ icon: 'icon_heart' }, { icon: 'icon_' + mag }], 4.2, true);
        this.audio.play('levelup');
        this.particles.burst('heart', e.x, e.y - 110, 10);
        this.save();
        return;
      }
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
    // Nichts zu tun – und genau hier wurde die Insel bisher still. Ein Satz
    // je Geist („Genug für heute.") reichte für den ersten Tag und für keinen
    // danach. Jetzt sagt er etwas über das Wetter, die Jahreszeit, die
    // Uhrzeit, darüber wie gut man sich kennt oder wie es um ihn herum
    // aussieht. Siehe `talk.js`.
    this._plaudern(e, spirit);
  }

  /**
   * Der Festgruß eines Geistes – einmal je Geist und Fest.
   *
   * Gemerkt wird JE FEST, nicht je Tag: Ein Fest dauert einen Tag, und die
   * Kennung ist eindeutiger als eine Tageszahl, die sich in einem alten
   * Spielstand auch mal wiederholt.
   *
   * @returns {boolean} ob der Gruß gerade gesagt wurde
   */
  _festGruss(e) {
    const f = this.fest();
    if (!f) return false;
    if (!this.state.feste) this.state.feste = emptyFeste();
    const marke = f.id + ':' + this.day.day;
    const wer = this.state.feste[e.spiritId];
    if (wer === marke) return false;
    this.state.feste[e.spiritId] = marke;

    const satz = festSatz(f.id, e.spiritId);
    const gabe = f.gabe || {};
    const icons = [{ icon: f.icon }];
    // Die Gabe: einmal je Geist. Passt sie nicht in die Tasche, bleibt der
    // Satz trotzdem – ein Fest, das an einer vollen Tasche scheitert, wäre
    // eine Enttäuschung an genau dem falschen Tag.
    const items = gabe.items || [];
    for (let i = 0; i < items.length; i++) {
      if (this.inventory.add(items[i].id, items[i].n)) {
        icons.push({ icon: 'icon_' + items[i].id, n: items[i].n });
      }
    }
    if (gabe.ember) {
      this.state.ember += gabe.ember;
      this._note('ember', gabe.ember);
      icons.push({ icon: 'icon_ember', n: gabe.ember });
    }

    this.ui.bubble(e.x, e.y - 190, satz || f.hint, icons, 5.0, true);
    this.audio.play('levelup');
    this.particles.burst('color', e.x, e.y - 70, 14);
    this.save();
    return true;
  }

  /**
   * Der Geist sagt etwas zur Lage.
   *
   * Das Gedächtnis liegt JE GEIST im Spielstand: Flämmchen soll sich nicht
   * deshalb wiederholen, weil Nelly gerade dasselbe Wetter kommentiert hat.
   */
  _plaudern(e, spirit) {
    if (!this.state.plausch) this.state.plausch = {};
    const id = e.spiritId;
    const letzte = this.state.plausch[id] || [];
    const satz = waehlePlauderei(id, this.plauderLage(id), letzte, Math.random);
    if (!satz) {
      // Kann eigentlich nicht sein – aber ein stummer Geist wäre schlimmer
      // als ein wiederholter Satz.
      this.ui.bubble(e.x, e.y - 190, pickLine(spirit.lines.full), [{ icon: 'icon_heart' }], 2.4);
      this.audio.play('ghost');
      return;
    }
    this.state.plausch[id] = merkePlauderei(letzte, satz);
    // Ohne Herz: Das Herz hieß bisher „alles erledigt". Beim Plaudern hieße
    // es „da ist noch was", und man liefe zum vierten Mal hin.
    this.ui.bubble(e.x, e.y - 190, satz, null, 3.4, true);
    this.audio.play('ghost');
    this.save();
  }

  /**
   * Worüber dieser Geist gerade reden kann.
   *
   * Alles aus Quellen, die es ohnehin gibt: Wetter und Jahreszeit wie beim
   * Ausruhen, die Freundschaftsstufe aus den erledigten Bitten, die
   * Gemütlichkeit aus dem Wert, den `syncCosiness` sowieso jeden Tag
   * ausrechnet. Nichts davon ist fürs Plaudern erfunden worden.
   */
  plauderLage(spiritId) {
    const w = this.weather;
    const morgen = this.day.hour < MORGEN_BIS;
    const stufe = (this.state.cosy && this.state.cosy[spiritId]) || 0;
    const freund = this.friendshipLevelOf(spiritId);
    return {
      wetter: w.raining ? 'regen' : w.foggy ? 'nebel' : w.snowing ? 'schnee' : null,
      jahreszeit: this.season(),
      morgen: morgen,
      nacht: !morgen && this.day.isDark(),
      freund: freund >= FREUND_AB,
      gemuetlich: stufe >= GEMUETLICH_AB,
      kahl: stufe <= KAHL_BIS,
    };
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
    if (this.state.daybook) {
      if (!this.state.daybook.helped) this.state.daybook.helped = Object.create(null);
      const h = this.state.daybook.helped;
      h[spirit.id] = (h[spirit.id] || 0) + 1;
    }
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
      if (faellig[i].unlocksRegion != null) this._openRegion(faellig[i].unlocksRegion);
      if (faellig[i].id === 'ganz') this._startFinale();
    }
    this._perksChanged();
    // Der Meilenstein, ab dem sich die Geister Orte wünschen, soll sofort
    // wirken und nicht erst nach dem Schlafen: Er ist genau der Moment, in
    // dem man erfährt, dass es diese Sorte Aufgabe gibt.
    this._wuenscheNachfuellen(this.day.day);
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

  /**
   * Einen Bereich aufschließen, den ein Meilenstein freigibt.
   *
   * Die Farbanzeige zählt nur, was offen ist – ein neuer Bereich senkt sie
   * also. Das ist gewollt und der Sinn der Sache: Es gibt wieder etwas zu
   * tun. Wandas Farbkreis fängt dafür größer an als bei allen anderen, damit
   * die Insel nicht als grauer Fleck beginnt.
   */
  _openRegion(region) {
    if (!this.world.unlockRegion(region)) return;
    // Der Geist dort braucht seinen Kreis, sonst liegt die Insel grau da,
    // bis man ihm die erste Bitte erfüllt hat.
    const ids = spiritsOfRegion(region);
    for (let i = 0; i < ids.length; i++) {
      const ent = this.world.spiritEntity(ids[i]);
      if (!ent) continue;
      this.colorField.addSource(ent.x, ent.y, SPIRITS[ids[i]].colorStart, 'spirit_' + ids[i]);
    }
    this.colorField.markDirty();
    this.quests.newDay(this.day.day, this.world, this);
    this.world.newDay(this.day.day, this.today ? this.today.event : null);
    this.ui.toast(REGION_NAMES[region] + ' ist offen!', 'icon_map', 'good');
    this.ui.refreshQuests();
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

  /* ---------------- Das Grundstück ---------------- */

  /** Stand des Grundstücks: Stufe, Grenzen, was der Ausbau kostet. */
  plotStatus() {
    const stufe = this.state.plot || 1;
    const jetzt = plotStage(stufe);
    const naechste = nextPlotStage(stufe);
    return {
      stufe: stufe,
      name: jetzt ? jetzt.name : '',
      bounds: plotBounds(stufe),
      naechste: naechste,
      kosten: naechste ? naechste.ember : 0,
      fertig: !naechste,
    };
  }

  /**
   * Das Grundstück erweitern.
   *
   * Bezahlt wird in Glut. Münzen haben mit der Vorratstruhe schon ein
   * großes Ziel; Glut hing bisher nur am Lagerfeuer und an der Werkbank.
   */
  expandPlot() {
    const stand = this.plotStatus();
    if (stand.fertig) return;
    if (this.state.ember < stand.kosten) {
      this.ui.toast('Es fehlt Glut', 'icon_ember', 'bad');
      return;
    }
    this.state.ember -= stand.kosten;
    this.state.plot = stand.naechste.id;
    this.world.plotStage = this.state.plot;
    this.ui.toast(stand.naechste.name + ' – das Grundstück wächst', 'icon_flowerbed', 'good');
    this.audio.play('levelup');
    if (this.world.tent) {
      this.particles.burst('color', this.world.tent.x, this.world.tent.y - 60, 30);
    }
    this.ui.refreshHud();
    this.invalidate();
    this.save();
  }

  /** Die Grenze in Weltpixeln – der Renderer zeichnet sie auf den Boden. */
  plotRect() {
    const b = plotBounds(this.state.plot || 1);
    return {
      x: b.x0 * TILE_SIZE,
      y: b.y0 * TILE_SIZE,
      w: (b.x1 - b.x0 + 1) * TILE_SIZE,
      h: (b.y1 - b.y0 + 1) * TILE_SIZE,
    };
  }

  /**
   * Stand der Bucht auf der Stillen Insel.
   *
   * Stufe 0 heißt: noch nicht gekauft. Sichtbar ist sie trotzdem, sobald die
   * Insel offen ist – wer nicht weiß, dass es sie gibt, spart nicht darauf.
   */
  islePlotStatus() {
    const stufe = this.state.islePlot || 0;
    const jetzt = islePlotStage(stufe);
    const naechste = nextIslePlotStage(stufe);
    return {
      stufe: stufe,
      name: jetzt ? jetzt.name : '',
      offen: this.hasMilestone('insel'),
      bounds: islePlotBounds(stufe),
      naechste: naechste,
      kosten: naechste ? naechste.coins : 0,
      fertig: !naechste,
    };
  }

  /**
   * Die Bucht kaufen oder erweitern.
   *
   * Bezahlt wird in Münzen – die dritte Währung an der dritten Sache, und
   * der einzige Kauf, der nach oben offen ist. Es ist kein zweites Lager:
   * Feuer, Werkbank und Händler bleiben drüben. Es ist der Platz, an dem
   * niemandes Möbel im Weg stehen.
   */
  expandIslePlot() {
    const stand = this.islePlotStatus();
    if (stand.fertig) return;
    if (!stand.offen) {
      this.ui.toast('Erst muss die Insel offen sein', 'icon_boat', 'bad');
      return;
    }
    if (this.state.coins < stand.kosten) {
      this.ui.toast('Zu wenig Münzen', 'icon_coin', 'bad');
      return;
    }
    this.state.coins -= stand.kosten;
    this.state.islePlot = stand.naechste.id;
    this.world.islePlotStage = this.state.islePlot;
    this.ui.toast(stand.naechste.name + ' gehört dir', 'icon_flowerbed', 'good');
    this.audio.play('levelup');
    this.ui.refreshHud();
    this.invalidate();
    this.save();
  }

  /** Die Grenze der Bucht in Weltpixeln – null, solange sie nicht gekauft ist. */
  islePlotRect() {
    return islePlotRect(this.state.islePlot || 0);
  }

  /** Was in der Bucht steht – für die Anzeige. */
  islePlotContents() {
    const stufe = this.state.islePlot || 0;
    if (!stufe) return { deko: 0, beete: 0, wild: 0 };
    return this._countPlot(function (x, y) { return inIslePlotAt(x, y, stufe); });
  }

  /** Was auf dem Grundstück steht – für die Anzeige. */
  plotContents() {
    const stufe = this.state.plot || 1;
    return this._countPlot(function (x, y) { return inPlotAt(x, y, stufe); });
  }

  /**
   * Steht diese Stelle auf eigenem Grund – Lager ODER Bucht?
   *
   * Dort gelten die milderen Abstände: näher ans Lager bauen, und ein Geist
   * blockiert nicht. Beide Grundstücke folgen derselben Regel; sie zweimal
   * zu schreiben hieße, sie beim nächsten Mal einmal zu vergessen.
   */
  _aufEigenemGrund(x, y) {
    return inPlotAt(x, y, this.state.plot) ||
      inIslePlotAt(x, y, this.state.islePlot || 0);
  }

  /** Zählt Deko, Beete und noch Ungerodetes in einem Bereich. */
  _countPlot(drin) {
    let deko = 0;
    let beete = 0;
    let wild = 0;
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.gone) continue;
      if (!drin(e.x, e.y)) continue;
      if (e.kind === 'decor') deko++;
      else if (e.kind === 'crop') beete++;
      else {
        const d = defOf(e.kind);
        if (d && (d.category === 'tree' || d.category === 'rock' ||
            d.category === 'bush' || d.category === 'stump')) wild++;
      }
    }
    return { deko: deko, beete: beete, wild: wild };
  }

  /** Wie gut man einen Geist kennt – 0, wenn man ihm noch nie geholfen hat. */
  friendshipLevelOf(spiritId) {
    const n = (this.quests.completedBySpirit &&
      this.quests.completedBySpirit[spiritId]) || 0;
    return friendshipLevel(n);
  }

  /* ---------------- Das Haustier ---------------- */

  /** Der aufgestellte Futternapf – null, solange keiner steht. */
  bowlEntity() {
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind === 'decor' && e.itemId === 'bowl' && !e.gone) return e;
    }
    return null;
  }

  /**
   * Napf, Streuner, Begleiter – an einer Stelle zusammengeführt.
   *
   * Läuft beim Start, nach jedem Aufstellen und an jedem Morgen. Ohne Napf
   * gibt es kein Tier; wer den Napf wieder einpackt, bevor der Streuner
   * bleibt, hat ihn wieder verscheucht. Ist es einmal zahm, bleibt es –
   * dann hängt es an einem, nicht an der Schüssel.
   */
  syncPet() {
    if (!this.state.pet) this.state.pet = emptyPet();
    const p = this.state.pet;
    const napf = this.bowlEntity();
    const zahm = istZahm(p);

    if (!napf && !zahm) {
      this._removePet();
      p.art = null;
      p.zahm = 0;
      return;
    }
    if (!p.art) p.art = petArtFor(this.world.seed);

    if (!this.world.pet || this.world.pet.gone) {
      const start = zahm
        ? { x: this.player.x - 60, y: this.player.y + 30 }
        : { x: napf.x + 70, y: napf.y + 18 };
      const e = makeEntity('pet', start.x, start.y, { petKind: p.art });
      e.sprite = 'pet_' + p.art + '_sit';
      e.mode = zahm ? 'follow' : 'stray';
      this.world.pet = this.world.add(e);
    }
    this.world.pet.petKind = p.art;
    if (!zahm && napf) {
      // Der Streuner wartet am Napf, nicht bei dir.
      this.world.pet.mode = 'stray';
      this.world.pet.heim = { x: napf.x + 70, y: napf.y + 18 };
    } else if (zahm && this.world.pet.mode === 'stray') {
      this.world.pet.mode = 'follow';
    }
    this.invalidate();
  }

  _removePet() {
    if (this.world.pet) {
      this.world.remove(this.world.pet);
      this.world.pet = null;
    }
  }

  /**
   * Füttern – einmal am Tag.
   *
   * Solange es fremd ist, zählt jede Fütterung auf dem Weg zum Bleiben.
   * Danach hebt sie nur noch die Laune, und eine schlechte Laune kostet
   * nichts weiter, als dass es nichts mehr sucht. Weglaufen tut es nie:
   * dieselbe Regel wie beim Garten und beim Kredit – das Spiel nimmt einem
   * nichts weg, es gibt nur weniger.
   */
  feedPet() {
    const p = this.state.pet;
    const e = this.world.pet;
    if (!p || !e) return false;
    if (!darfFuettern(p, this.day.day)) {
      this.ui.toast('Heute hat es schon gefressen', 'icon_heart');
      return false;
    }
    const futter = bestesFutter(this.inventory);
    if (!futter) {
      this.ui.toast('Nichts dabei, was es frisst', 'icon_berry', 'bad');
      return false;
    }
    this.inventory.remove(futter, 1);
    p.gefuettertAm = this.day.day;
    p.laune = Math.min(LAUNE_MAX, (p.laune || 0) + LAUNE_PRO_FUTTER + futterWert(futter) * 2);

    const warFremd = !istZahm(p);
    if (warFremd) {
      p.zahm = (p.zahm || 0) + 1;
      if (istZahm(p)) {
        p.seit = this.day.day;
        e.mode = 'follow';
        this.ui.toast('Es bleibt.', 'icon_heart', 'good');
        this.audio.play('levelup');
        this.particles.burst('heart', e.x, e.y - 70, 14);
      } else {
        this.ui.toast('Es frisst · noch ' + (ZAHM_NOETIG - p.zahm) + '×', 'icon_heart', 'good');
        this.audio.play('ghost');
        this.particles.burst('heart', e.x, e.y - 60, 5);
      }
    } else {
      this.ui.toast('Satt und zufrieden', 'icon_heart', 'good');
      this.audio.play('ghost');
      this.particles.burst('heart', e.x, e.y - 60, 6);
    }
    this.ui.refreshHud();
    this.save();
    return true;
  }

  /** Stand fürs Fenster. */
  petStatus() {
    const stand = petStatus(this.state.pet, this.day.day);
    stand.napf = !!this.bowlEntity();
    stand.futter = bestesFutter(this.inventory);
    return stand;
  }

  /**
   * Dem Tier einen Namen geben.
   *
   * Erst wenn es zahm ist: Einen Streuner, der morgen vielleicht nicht
   * wiederkommt, tauft man nicht.
   *
   * `roh` ist normalerweise leer – dann fragt das Spiel. Übergeben wird es
   * nur aus den Prüfungen; ein `window.prompt`, das sich nicht umgehen lässt,
   * wäre eine Stelle, die niemand messen kann.
   *
   * @returns {boolean} ob ein Name gesetzt wurde (auch das Löschen zählt)
   */
  benennePet(roh) {
    const p = this.state.pet;
    if (!p || !istZahm(p)) return false;
    let eingabe = roh;
    if (eingabe == null) {
      eingabe = window.prompt('Wie soll es heißen?', p.name || '');
      if (eingabe == null) return false;   // abgebrochen, nichts ändern
    }
    const name = saeubereName(eingabe);
    p.name = name;
    this.ui.toast(name ? 'Es heißt jetzt ' + name : 'Wieder namenlos',
      'icon_heart', 'good');
    this.ui.refreshHud();
    this.save();
    return true;
  }

  /**
   * Bewegung und Beschäftigung des Tiers.
   *
   * Drei Zustände, mehr braucht es nicht: Es wartet am Napf, es läuft dir
   * hinterher, oder es hat etwas gefunden und sitzt daneben. Bleibst du
   * stehen, sucht es sich ein Möbelstück.
   */
  _updatePet(dt) {
    const e = this.world.pet;
    const p = this.state.pet;
    if (!e || !p || e.gone) return;

    const zahm = istZahm(p);
    let ziel = null;
    let tempo = 150;

    if (!zahm) {
      ziel = e.heim || { x: e.x, y: e.y };
      tempo = 90;
    } else if (e.fund && !e.fund.gone) {
      // Etwas gefunden: hinlaufen und dabeibleiben, bis es weg ist.
      ziel = { x: e.fund.x + 46, y: e.fund.y + 10 };
      tempo = 190;
    } else {
      if (e.fund && e.fund.gone) e.fund = null;
      const ruhe = e.ruhe && !e.ruhe.gone ? e.ruhe : null;
      if (ruhe) ziel = { x: ruhe.x + 14, y: ruhe.y + 6 };
      else {
        // Hinter Seli her, mit Abstand – direkt auf ihr zu klebt es an ihr.
        const dir = this.player.dir === 'right' ? -1 : this.player.dir === 'left' ? 1 : -1;
        ziel = { x: this.player.x + dir * 58, y: this.player.y + 26 };
      }
    }

    const dx = ziel.x - e.x;
    const dy = ziel.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // Zu weit abgehängt – etwa weil du übergesetzt oder umgezogen bist –,
    // dann taucht es einfach wieder neben dir auf. Ein Tier, das man über
    // die halbe Insel zurücklaufen sieht, ist kein Begleiter, sondern eine
    // Verfolgung.
    if (zahm && !e.fund && d > 900) {
      const platz = this._freiNeben(this.player.x, this.player.y);
      if (platz) {
        e.x = platz.x;
        e.y = platz.y;
        this.world.reindex(e);
        e.laeuft = false;
        return;
      }
    }

    const stehbleiben = zahm && (e.fund || e.ruhe) ? 26 : 40;
    if (d > stehbleiben) {
      const s = Math.min(d, tempo * dt);
      const sx = (dx / d) * s;
      const sy = (dy / d) * s;
      // Geprüft wird der BODEN, nicht was darauf steht. Mit `canStand` lief
      // das Tier gegen den ersten Findling und kam nie wieder los – gemessen
      // bewegte es sich in sechshundert Bildern genau einmal. Eine Katze,
      // die an einem Busch vorbeischlüpft, ist normal; eine, die dahinter
      // für immer feststeckt, ist ein Fehler. Ins Wasser geht sie trotzdem
      // nicht. Schräg zuerst, sonst an der Küste entlang.
      const wege = [[sx, sy], [sx, 0], [0, sy]];
      for (let i = 0; i < wege.length; i++) {
        const nx = e.x + wege[i][0];
        const ny = e.y + wege[i][1];
        if (!isWalkable(this.world.tileAt(nx, ny))) continue;
        e.x = nx;
        e.y = ny;
        this.world.reindex(e);
        break;
      }
      e.laeuft = true;
      e.schritt = (e.schritt || 0) + dt * 7;
      if (Math.abs(dx) > 4) e.blick = dx < 0 ? -1 : 1;
    } else {
      e.laeuft = false;
    }
    e.sprite = 'pet_' + (e.petKind || 'cat') + '_' +
      (e.laeuft ? (Math.floor(e.schritt || 0) % 2 === 0 ? '0' : '1') : 'sit');
  }

  /**
   * Einmal am Tag zeigt es dir etwas.
   *
   * Es sucht sich die nächste Grabstelle oder das nächste versteckte
   * Aufgabenstück in der Nähe und setzt sich daneben. Damit wird aus dem
   * Absuchen der Karte ein Hinterhergehen – und das ist der Grund, warum
   * das Tier kein Anhängsel ist.
   */
  _petSucht() {
    const e = this.world.pet;
    const p = this.state.pet;
    if (!e || !p || e.fund) return;
    if (!suchtHeute(p, this.day.day)) return;

    const near = this.world.queryNear(this.player.x, this.player.y, 900);
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < near.length; i++) {
      const k = near[i];
      if (k.gone) continue;
      if (k.kind !== 'digspot' && k.kind !== 'hidden') continue;
      const dx = k.x - this.player.x;
      const dy = k.y - this.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = k;
      }
    }
    if (!best) return;
    e.fund = best;
    p.fundAm = this.day.day;
    // Mit Namen wird aus „Es" jemand. Genau dafür gibt es den Namen.
    this.ui.toast(nameVon(p) + ' hat etwas gefunden', 'icon_sparkle', 'good');
    this.audio.play('ghost');
  }

  /** Ein Platz neben einem Punkt, auf dem das Tier stehen kann. */
  _freiNeben(x, y) {
    for (let r = 40; r <= 160; r += 40) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const nx = x + Math.cos(a) * r;
        const ny = y + Math.sin(a) * r;
        if (isWalkable(this.world.tileAt(nx, ny))) return { x: nx, y: ny };
      }
    }
    return null;
  }

  /**
   * Bleibst du stehen, sucht es sich ein Möbelstück zum Hinlegen.
   *
   * Gefragt wird `moving`, nicht `vx`/`vy`. Die beiden werden nämlich seit
   * jeher nur im Konstruktor gesetzt und bleiben null – die Bedingung war
   * also immer falsch, und das Tier legte sich nach fünf Sekunden hin, ganz
   * gleich wie weit man gerade rannte. Gemessen: bei durchgehendem Laufen
   * lag es nach 5,0 Sekunden auf der ersten Bank in Reichweite.
   */
  _petRuht(dt) {
    const e = this.world.pet;
    if (!e || !istZahm(this.state.pet) || e.fund) return;
    if (this.player.moving) {
      e.stillZeit = 0;
      e.ruhe = null;
      return;
    }
    e.stillZeit = (e.stillZeit || 0) + dt;
    if (e.stillZeit < 5 || e.ruhe) return;

    // Sitzt Seli, legt es sich zu IHR.
    //
    // Vorher suchte es sich auch dann ein Möbelstück – und weil Bank,
    // Baumstumpf und Steinbank alle Ruheplätze sind, kletterte es meistens
    // auf genau das, worauf sie gerade saß. Zwei Figuren auf einer Bank, die
    // sich überlappen.
    //
    // Das ist nebenbei die einzige Stelle, an der Sitzen und Tier einander
    // überhaupt bemerken: Man setzt sich hin, es dauert einen Moment, und
    // dann kommt es und legt sich daneben. Mehr braucht es nicht.
    if (this.player.sitzt) {
      const platz = this._platzNebenSeli(e);
      if (platz) {
        e.ruhe = platz;
        return;
      }
    }

    const near = this.world.queryNear(this.player.x, this.player.y, 460);
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < near.length; i++) {
      const k = near[i];
      if (k.gone || k.kind !== 'decor' || !istRuheplatz(k.itemId)) continue;
      const dx = k.x - e.x;
      const dy = k.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = k;
      }
    }
    if (best) e.ruhe = best;
  }

  /**
   * Ein Ruheplatz seitlich neben der sitzenden Seli – oder null.
   *
   * Es kommt auf der Seite an, auf der es ohnehin schon steht: Ein Tier, das
   * einmal um sie herumläuft, um sich links statt rechts hinzulegen, sieht
   * nach Wegfindung aus und nicht nach Gesellschaft. Passt die Seite nicht,
   * wird die andere genommen.
   *
   * Der Abstand ist großzügig, weil `_updatePet` auf das Ziel noch (14, 6)
   * draufrechnet und erst bei 26 Punkten stehen bleibt. Enger gesetzt lag das
   * Tier auf ihrem Rock.
   */
  _platzNebenSeli(e) {
    const seiten = e.x < this.player.x ? [-1, 1] : [1, -1];
    for (let i = 0; i < seiten.length; i++) {
      const x = this.player.x + seiten[i] * 72;
      const y = this.player.y + 6;
      if (!isWalkable(this.world.tileAt(x, y))) continue;
      return { x: x, y: y, gone: false, beiSeli: true };
    }
    return null;
  }

  /* ---------------- Der Katalog ---------------- */

  /** Der Katalog, wie er heute aussieht – Gesperrtes bleibt sichtbar. */
  catalog() {
    const self = this;
    return katalogFuer(function (id) { return self.hasMilestone(id); });
  }

  /** Was gerade unterwegs ist: [{ nr, id, name, ab }]. */
  openOrders() {
    const liste = this.state.orders || [];
    return liste.map(function (b) {
      const item = getItem(b.id);
      return { nr: b.nr, id: b.id, name: item ? item.name : b.id, ab: b.ab, preis: b.preis };
    });
  }

  /**
   * Etwas bestellen.
   *
   * Bezahlt wird sofort, geliefert am nächsten Morgen. Das Warten ist der
   * Punkt: Käme es gleich in die Tasche, wäre der Katalog ein zweiter Laden
   * und der Briefkasten bliebe, was er war.
   */
  orderFromCatalog(id) {
    const pruef = kannBestellen(id, this.state.coins,
      this.state.orders, this.hasMilestone.bind(this));
    if (!pruef.ok) {
      this.ui.toast(pruef.grund, 'icon_coin', 'bad');
      return false;
    }
    const b = bestellen(id, this.day.day);
    if (!b) return false;
    this.state.coins -= b.preis;
    this.state.orders = (this.state.orders || []).concat([b]);
    const item = getItem(id);
    this.ui.toast((item ? item.name : id) + ' bestellt · morgen im Kasten', 'icon_mailbox', 'good');
    this.audio.play('coin');
    this.ui.refreshHud();
    this.save();
    return true;
  }

  /* ---------------- Vom Zelt zum Haus ---------------- */

  /**
   * Das Zuhause an die Ausbaustufe angleichen.
   *
   * Läuft beim Start und nach jedem Ausbau. Grafik, Kollision und Reichweite
   * hängen alle an derselben Stufe – stünden sie auseinander, liefe man
   * entweder durch die eigene Wand oder käme nicht mehr an die Tür.
   */
  syncHouse() {
    const stufe = this.state.house || 1;
    const e = this.world.tent;
    if (!e) return;
    const f = houseFootprint(stufe);
    e.sprite = houseSprite(stufe);
    e.blockR = f.blockR;
    e.blockH = f.blockH;
    e.reachR = f.reachR;
    // Die Welt wird bei jedem Laden neu erzeugt, und dabei steht das Haus
    // wieder im Lager. Wer umgezogen ist, wohnt sonst nach dem Neuladen
    // wieder da, wo er ausgezogen ist.
    this._placeHome();

    // Ein Haus sieht man auch aus der Ferne: eigener Farbkreis, der mit der
    // Stufe wächst. Wie beim Lagerfeuer wird er nie kleiner.
    //
    // Nach dem Umzug bekommt das neue Zuhause eine EIGENE Quelle statt der
    // alten hinterhergezogen: Farbe verschwindet auf dieser Insel nie wieder,
    // und der Platz im Lager soll nicht ausbleichen, weil man weggezogen ist.
    // Was drinnen steht, zählt mit: Ein Zuhause, in dem es schön ist, färbt
    // weiter um sich herum ein. Das ist die einzige Wirkung des Zimmers nach
    // außen – und sie geht über DIESELBE Quelle, nicht über eine zweite
    // daneben, damit die Anzeige nicht zwei Kreise übereinander malt.
    const radius = houseColor(stufe) + wohnBonus(this.wohnPunkte());
    if (radius > 0) {
      const key = this.homeAt() === 'isle' ? 'house_isle' : 'house';
      const src = this.colorField.find(key);
      if (!src) this.colorField.addSource(e.x, e.y, radius, key);
      else if (src.target < radius) src.target = radius;
      this.colorField.markDirty();
    }
    this.invalidate();
  }

  /** Wo dein Zuhause steht – `'camp'` oder `'isle'`. */
  homeAt() {
    return this.state.homeAt === 'isle' ? 'isle' : 'camp';
  }

  /** Haus und Briefkasten an ihren Platz setzen. */
  _placeHome() {
    const e = this.world.tent;
    if (!e) return;
    const t = homeTile(this.world, this.homeAt());
    const px = function (tx) { return (tx + 0.5) * TILE_SIZE; };
    if (e.x !== px(t.x) || e.y !== px(t.y)) {
      e.x = px(t.x);
      e.y = px(t.y);
      this.world.reindex(e);
    }
    // Post gehört ans Haus, nicht an einen Ort: Ein Briefkasten, der im
    // Lager stehen bliebe, hieße jeden Morgen eine Bootsfahrt.
    const m = this.world.mailbox;
    if (!m) return;
    const mx = px(t.x + MAILBOX_OFFSET.x);
    const my = px(t.y + MAILBOX_OFFSET.y);
    if (m.x !== mx || m.y !== my) {
      m.x = mx;
      m.y = my;
      this.world.reindex(m);
    }
  }

  /**
   * Umziehen: Das Zuhause steht danach im Lager oder in der Bucht.
   *
   * Es bleibt EIN Zuhause. Ein zweites Haus hieße zwei Fragen, die das Spiel
   * nicht hat: in welchem man schläft und in welches die Post kommt.
   * Lagerfeuer, Werkbank, Händler und die Geister bleiben, wo sie sind –
   * genau das ist der Unterschied zwischen den beiden Plätzen.
   */
  moveHome(wo) {
    const ziel = wo === 'isle' ? 'isle' : 'camp';
    if (this.homeAt() === ziel) return false;
    if (ziel === 'isle' && !(this.state.islePlot > 0)) {
      this.ui.toast('Erst die Bucht kaufen', 'icon_boat', 'bad');
      return false;
    }
    this.state.homeAt = ziel;
    this.syncHouse();
    this.ui.toast(ziel === 'isle'
      ? 'Dein Zuhause steht jetzt in der Bucht'
      : 'Dein Zuhause steht wieder im Lager', 'icon_check', 'good');
    this.audio.play('levelup');
    if (this.world.tent) {
      this.particles.burst('color', this.world.tent.x, this.world.tent.y - 80, 30);
    }
    this.ui.refreshHud();
    this.save();
    return true;
  }

  /** Stand des Zuhauses: Stufe, Name, was der nächste Ausbau kostet. */
  houseStatus() {
    const stufe = this.state.house || 1;
    const jetzt = houseStage(stufe);
    const naechste = nextHouseStage(stufe);
    return {
      stufe: stufe,
      name: jetzt ? jetzt.name : '',
      note: jetzt ? jetzt.note : '',
      naechste: naechste,
      fehlt: naechste ? houseMissing(stufe, this.inventory) : [],
      fertig: !naechste,
    };
  }

  /**
   * Das Zuhause ausbauen.
   *
   * Bezahlt wird in Material – der dritten langen Währung neben Münzen für
   * die Vorratstruhe und Glut fürs Grundstück. Was man beim Freiräumen des
   * eigenen Grundstücks ohnehin schlägt, wandert so in die eigenen Wände.
   */
  buildHouse() {
    const stand = this.houseStatus();
    if (stand.fertig) return;
    if (stand.fehlt.length) {
      this.ui.toast('Es fehlt Material', 'icon_wood', 'bad');
      return;
    }
    const kosten = stand.naechste.cost;
    for (let i = 0; i < kosten.length; i++) {
      this.inventory.remove(kosten[i].id, kosten[i].n);
    }
    this.state.house = stand.naechste.id;
    this.syncHouse();
    this.ui.toast(stand.naechste.name + ' steht', 'icon_hammer', 'good');
    this.audio.play('levelup');
    if (this.world.tent) {
      this.particles.burst('color', this.world.tent.x, this.world.tent.y - 90, 34);
      this.camera.kick(0.4);
    }
    this.ui.refreshHud();
    this.ui.refreshQuests();
    this.save();
  }

  /* ---------------- Der letzte Abend ---------------- */

  /** Läuft der Abschluss gerade – versammelt, aber noch nicht durch? */
  finaleOffen() {
    return !!(this.state.finale && !this.state.finale.done);
  }

  /**
   * Hundert Prozent: Alle sieben kommen ans Feuer.
   *
   * Sie warten dort, bis man bei jedem war – nicht einen Tag, sondern so
   * lange es dauert. Ein Abschluss, den man verpassen kann, weil man an dem
   * Abend keine Zeit hatte, wäre kein Abschluss.
   */
  _startFinale() {
    if (this.state.finale) return;
    this.state.finale = { day: this.day.day, heard: Object.create(null), done: false };

    const feuer = this.world.campfire;
    if (feuer) {
      const wer = this.world.entities.filter(function (e) { return e.kind === 'spirit'; });
      const plaetze = circleSpots(feuer, wer.length, 210);
      for (let i = 0; i < wer.length; i++) {
        const e = wer[i];
        const ziel = plaetze[i];
        // Einen begehbaren Platz in der Nähe des Ringplatzes suchen: Am Feuer
        // stehen Zelt, Werkbank und Stand im Weg.
        let x = ziel.x;
        let y = ziel.y;
        if (!this.world.canStand(x, y, 5, 4)) {
          for (let r = 24; r <= 96 && !this.world.canStand(x, y, 5, 4); r += 24) {
            for (let k = 0; k < 12; k++) {
              const a = (k / 12) * Math.PI * 2;
              const nx = ziel.x + Math.cos(a) * r;
              const ny = ziel.y + Math.sin(a) * r;
              if (this.world.canStand(nx, ny, 5, 4)) { x = nx; y = ny; break; }
            }
          }
        }
        e.x = x;
        e.y = y;
        this.world.reindex(e);
        const src = this.colorField.find('spirit_' + e.spiritId);
        if (src) { src.x = x; src.y = y; }
      }
      this.colorField.markDirty();
      this.particles.burst('color', feuer.x, feuer.y - 60, 40);
    }
    this.audio.play('colorBurst');
    this.ui.toast('Alle sind am Feuer. Geh zu jedem.', 'icon_heart', 'good');
    this.invalidate();
  }

  /**
   * Ein Geist sagt seinen Schlusssatz.
   *
   * @returns {boolean} ob dieser Besuch der Abschluss war (dann nichts weiter)
   */
  _finaleTalk(e, spirit) {
    if (!this.finaleOffen()) return false;
    const f = this.state.finale;
    if (f.heard[e.spiritId]) return false;
    const satz = finaleLine(e.spiritId);
    if (!satz) return false;

    f.heard[e.spiritId] = this.day.day;
    this.ui.bubble(e.x, e.y - 190, satz, [{ icon: 'icon_heart' }], 7, true);
    this.audio.play('ghost');
    this.particles.burst('heart', e.x, e.y - 100, 6);
    this.particles.burst('color', e.x, e.y - 60, 12);

    const fehlen = stillSilent(f.heard).length;
    if (fehlen > 0) {
      this.ui.toast('Noch ' + fehlen + ' von ' + FINALE_COUNT, 'icon_ghost');
      this.save();
      return true;
    }
    this._finishFinale();
    return true;
  }

  /** Alle gehört: das letzte Wort, und dann geht es weiter. */
  _finishFinale() {
    const f = this.state.finale;
    f.done = true;
    f.doneDay = this.day.day;

    const feuer = this.world.campfire;
    if (feuer) {
      this.particles.burst('color', feuer.x, feuer.y - 60, 60);
      this.particles.burst('heart', feuer.x, feuer.y - 90, 20);
      this.ui.bubble(feuer.x, feuer.y - 210, FINALE_CLOSE, [{ icon: 'icon_star' }], 9, true);
    }
    this.audio.play('levelup');
    this.audio.play('colorBurst');
    this.camera.kick(0.6);
    // Eine Handvoll für den Weg – und die Insel bleibt offen.
    this.state.coins += 500;
    this.state.ember += 80;
    this._note('coins', 500);
    this._note('ember', 80);
    this.ui.toast('Die Insel ist ganz. Danke.', 'icon_star', 'good');
    this.ui.refreshHud();
    this.save();
  }

  /* ---------------- Die Vorratstruhe ---------------- */

  /**
   * Truhe und Welt in Übereinstimmung bringen.
   *
   * Die Fächer wachsen mit der Ausbaustufe, und die Truhe steht erst da,
   * wenn die erste Stufe bezahlt ist. Kleiner wird sie nie: Ausbaustufen
   * gehen nur vorwärts, und ein schrumpfendes Lager verschluckte Dinge.
   */
  syncStorage() {
    const stand = statusOf(this.state.loan);
    if (!this.storage) {
      this.storage = this.state.storageBox
        ? Inventory.fromJSON(this.state.storageBox)
        // NICHT `new Inventory()`: der Rumpf hat dreißig Fächer voreingestellt,
        // und damit hätte man vor dem ersten Bezahlen schon ein Lager.
        : new Inventory(0);
    }
    this.storage.capacity = Math.max(this.storage.capacity || 0, slotsAt(stand.stage));
    this.invalidate();
  }

  /**
   * Eine Rate auf den Ausbau zahlen.
   *
   * Nie mehr als nötig und nie mehr, als man hat – siehe `loan.pay`. Wer
   * 500 Münzen hat und 200 schuldet, zahlt 200.
   */
  payLoanAmount(betrag) {
    const vorher = statusOf(this.state.loan);
    if (vorher.fertig) return;
    const r = payLoan(this.state.loan, betrag, this.state.coins);
    if (!r.gezahlt) {
      this.ui.toast('Zu wenig Münzen', 'icon_coin', 'bad');
      return;
    }
    this.state.coins -= r.gezahlt;
    this.audio.play('coin');
    if (r.fertigGeworden) {
      const neu = LOAN_STAGES[r.stage - 1];
      this.syncStorage();
      this.ui.toast(neu.name + ' steht! · ' + neu.slots + ' Fächer', 'icon_bag', 'good');
      this.audio.play('levelup');
      if (this.world.storage) {
        this.particles.burst('sparkle', this.world.storage.x, this.world.storage.y - 40, 20);
      }
    } else {
      const jetzt = statusOf(this.state.loan);
      this.ui.toast('Noch ' + num(jetzt.offen) + ' Münzen', 'icon_coin');
    }
    this.ui.refreshHud();
    this.save();
  }

  /** Ein Stück zwischen Tasche und Truhe schieben. */
  moveToStorage(id, n) {
    if (!this.storage) this.syncStorage();
    const da = this.inventory.count(id);
    const take = Math.min(da, n == null ? 1 : n);
    if (take <= 0) return 0;
    const rein = this.storage.add(id, take);
    if (rein <= 0) { this.ui.toast('Die Truhe ist voll', 'icon_bag', 'bad'); return 0; }
    this.inventory.remove(id, rein);
    this.save();
    return rein;
  }

  moveFromStorage(id, n) {
    if (!this.storage) this.syncStorage();
    const da = this.storage.count(id);
    const take = Math.min(da, n == null ? 1 : n);
    if (take <= 0) return 0;
    const rein = this.inventory.add(id, take);
    if (rein <= 0) { this.ui.toast('Tasche ist voll', 'icon_bag', 'bad'); return 0; }
    this.storage.remove(id, rein);
    this.save();
    return rein;
  }

  /* ---------------- Die Post ---------------- */

  /**
   * Die Post eines Morgens in den Kasten legen.
   *
   * Dank kommt nur von Geistern, denen man GESTERN geholfen hat – das steht
   * in der Strichliste des vergangenen Tages. Ein Dankesbrief für nichts
   * wäre eine Floskel, und Floskeln merkt man.
   */
  /**
   * Der Morgen des Tiers: Laune, Napf, und der Fund von gestern ist vorbei.
   *
   * Die Laune sinkt nur, wenn man wirklich einen Tag ausgelassen hat –
   * `launeAmMorgen` rechnet das aus dem Tag der letzten Fütterung, nicht aus
   * einem Zähler, der beim Laden bei null anfinge.
   */
  _petNewDay(day) {
    const p = this.state.pet;
    if (!p) return;
    p.laune = launeAmMorgen(p, day);
    if (this.world.pet) {
      this.world.pet.fund = null;
      this.world.pet.ruhe = null;
      this.world.pet.stillZeit = 0;
    }
    this.syncPet();
  }

  _deliverMail(day, gestern) {
    const geholfen = gestern && gestern.helped ? Object.keys(gestern.helped) : [];
    const jahreszeit = this.today ? this.today.season : null;
    // Wechselt heute die Jahreszeit? Ein Wort dazu gibt es nur einmal.
    const neuesKapitel = !!(jahreszeit && this.state.lastSeason !== jahreszeit.id);
    if (jahreszeit) this.state.lastSeason = jahreszeit.id;

    // Was bestellt und fällig ist, kommt heute als Paket. Erst die Liste
    // kürzen, dann die Post bauen: Sonst läge dasselbe Paket morgen wieder da.
    const post = faellig(this.state.orders, day);
    this.state.orders = post.bleibt;
    const pakete = post.da.map(function (b) {
      const item = getItem(b.id);
      return { id: b.id, name: item ? item.name : b.id };
    });

    const self = this;
    const neue = mailFor(day, this.world, {
      geholfen: geholfen,
      jahreszeit: jahreszeit,
      tagNeu: neuesKapitel,
      ereignis: this.today ? this.today.event : null,
      pakete: pakete,
      // Die Beilage wächst mit der Freundschaft – dreimal dasselbe Holz macht
      // aus dem Briefkasten eine Textanzeige.
      stufeVon: function (id) { return self.friendshipLevelOf(id); },
    });
    if (!neue.length) return;
    this.state.mail = fileMail(this.state.mail, neue);
    this.ui.toast(neue.length === 1 ? 'Ein Brief im Kasten' : neue.length + ' Briefe im Kasten',
      'icon_mailbox');
  }

  /** Einen Brief öffnen: gelesen setzen, Beilage in die Tasche. */
  openLetter(id) {
    const liste = this.state.mail || [];
    for (let i = 0; i < liste.length; i++) {
      const brief = liste[i];
      if (brief.id !== id) continue;
      if (brief.read && !brief.gift) return brief;
      if (brief.gift) {
        const added = this.inventory.add(brief.gift.id, brief.gift.n);
        if (added <= 0) {
          // Die Beilage bleibt liegen, bis Platz ist – sonst wäre sie weg,
          // weil die Tasche gerade voll war.
          this.ui.toast('Tasche ist voll – der Brief wartet', 'icon_bag', 'bad');
          return brief;
        }
        this.ui.toastItems([{ id: brief.gift.id, n: added }]);
        brief.gift = null;
      }
      brief.read = true;
      this.audio.play('ui');
      this.ui.refreshHud();
      this.save();
      return brief;
    }
    return null;
  }

  unreadMail() {
    return unreadCount(this.state.mail);
  }

  /* ---------------- Das Fundbuch ---------------- */

  /**
   * Ist eine Reihe im Fundbuch voll geworden?
   *
   * Die Prüfung hängt an der Zahl der gefundenen ARTEN: Solange die sich
   * nicht ändert, kann sich auch keine Reihe geschlossen haben. Damit
   * kostet sie in fast jedem Bild einen Zahlenvergleich.
   */
  _checkCollection() {
    const bekannt = this.inventory.foundCount();
    if (bekannt === this._knownCount) return;
    this._knownCount = bekannt;
    if (!this.state.collected) this.state.collected = Object.create(null);

    const faellig = dueSets(this.inventory, this.state.collected);
    if (!faellig.length) return;

    for (let i = 0; i < faellig.length; i++) {
      const reihe = faellig[i];
      this.state.collected[reihe.id] = this.day.day;
      const lohn = reihe.reward || {};
      if (lohn.coins) { this.state.coins += lohn.coins; this._note('coins', lohn.coins); }
      if (lohn.ember) { this.state.ember += lohn.ember; this._note('ember', lohn.ember); }
      const got = [];
      for (let k = 0; lohn.items && k < lohn.items.length; k++) {
        const it = lohn.items[k];
        const added = this.inventory.add(it.id, it.n);
        if (added > 0) got.push({ id: it.id, n: added });
      }
      this.ui.toast(reihe.name + ' vollständig!', 'icon_star', 'good');
      if (got.length) this.ui.toastItems(got);
      this._note('sets');
    }
    this.audio.play('levelup');
    this.particles.burst('sparkle', this.player.x, this.player.y - 60, 18);
    this.ui.refreshHud();
    this.save();
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
    this.today = todayOf(new Date(), this.day.day);
    // Ein Fest schlägt das Tagesereignis. Zwei Besonderheiten an einem Tag
    // wären keine mehr, und der Markttag kommt ohnehin jede Woche wieder.
    this.today.fest = festOn(new Date());
    if (this.today.fest) this.today.event = this.today.fest;
    this._applyToday();
    return this.today.event && this.today.event.id !== vorher;
  }

  /** Welches Fest heute ist – oder null. */
  fest() {
    return (this.today && this.today.fest) || null;
  }

  /* ---------------- Wunschplätze ---------------- */

  /**
   * Wünschen sich die Geister schon Orte?
   *
   * Bewusst nicht erst bei hundert Prozent: Wer zum ersten Mal durchspielt,
   * soll diese Sorte Aufgabe kennen, bevor sie die einzige ist. Ab der
   * Hälfte steht genug Deko zur Verfügung, dass man wirklich wählen kann.
   */
  wuenschenSchon() {
    return this.hasMilestone(WUNSCH_MEILENSTEIN);
  }

  /** Die offenen Wünsche. */
  wishes() {
    const w = this.state.wishes || (this.state.wishes = emptyWishes());
    return w.offen || [];
  }

  /**
   * Offene Wünsche auffüllen.
   *
   * Anders als Tagesbitten laufen Wünsche NICHT ab. Ein Ort ist kein Auftrag
   * mit Frist – wer drei Tage überlegt, wo die Bank hinsoll, hat richtig
   * gespielt und nicht zu langsam.
   */
  _wuenscheNachfuellen(day) {
    if (!this.wuenschenSchon()) return;
    const w = this.state.wishes;
    const rng = dailyRng(this.world.seed, day, 'wishes');

    // Ein Wunsch, den man lange liegen lässt, wird zurückgezogen.
    //
    // Wünsche laufen bewusst NICHT ab – ein Ort ist keine Bitte mit Frist.
    // Aber ohne jede Bewegung wären drei Wünsche, die einem nicht liegen,
    // für immer die einzigen drei: Die Liste füllt ja nur auf. Deshalb geht
    // einer, an dem nach zwölf Tagen noch gar nichts steht. Das ist keine
    // Strafe, sondern ein Geist, der es sich anders überlegt hat – wer
    // angefangen hat, behält seinen Wunsch, so lange er will.
    for (let i = w.offen.length - 1; i >= 0; i--) {
      const alt = w.offen[i];
      if (day - (alt.day || day) < WUNSCH_GEDULD) continue;
      if (pruefeWunsch(alt, this.world).stueck > 0) continue;
      w.offen.splice(i, 1);
      const geist = SPIRITS[alt.spirit];
      this.ui.toast((geist ? geist.name + ': ' : '') + 'Wunsch zurückgezogen',
        'icon_ghost');
    }

    const belegt = Object.create(null);
    // Was zuletzt erfüllt wurde, kommt so bald nicht wieder. Ohne dieses
    // Gedächtnis kam die erste Wiederholung gemessen schon beim elften
    // Wunsch – und nichts wirkt schneller ausgelutscht als dieselbe Bitte,
    // die man vorgestern erfüllt hat.
    const letzte = w.letzte || [];
    for (let i = 0; i < letzte.length; i++) belegt[letzte[i]] = 1;
    // Wer schon einen Wunsch offen hat, kommt hinten an: Drei Wünsche von
    // Flämmchen und keiner von den anderen sechs wäre kein Chor, sondern
    // eine Person, die viel redet.
    const hatSchon = Object.create(null);
    for (let i = 0; i < w.offen.length; i++) {
      belegt[wunschKey(w.offen[i])] = 1;
      hatSchon[w.offen[i].spirit] = 1;
    }
    // Nur Geister, deren Bereich offen ist – sonst wünscht sich jemand
    // etwas, den man noch gar nicht getroffen hat.
    const frei = [];
    const rest = [];
    for (let i = 0; i < SPIRIT_IDS.length; i++) {
      const sid = SPIRIT_IDS[i];
      if (!this.world.isUnlocked(SPIRITS[sid].region)) continue;
      if (hatSchon[sid]) rest.push(sid);
      else frei.push(sid);
    }
    if (!frei.length && !rest.length) return;
    while (w.offen.length < MAX_WUENSCHE) {
      const topf = frei.length ? frei : rest;
      const sid = randPick(rng, topf);
      const neu = wunschBauen(this.world, sid, day, rng, belegt, w.erfuellt || 0);
      if (!neu) break;
      belegt[wunschKey(neu)] = 1;
      const k = frei.indexOf(sid);
      if (k >= 0) { frei.splice(k, 1); rest.push(sid); }
      w.offen.push(neu);
    }
  }

  /**
   * Nachsehen, ob ein Wunsch erfüllt ist.
   *
   * Wird nach jedem Aufstellen gerufen und einmal je Morgen – nicht in der
   * Bildschleife: Die Prüfung läuft über alle Objekte, und sie ändert sich
   * nur, wenn man etwas hinstellt.
   */
  checkWishes() {
    if (!this.wuenschenSchon()) return;
    const w = this.state.wishes;
    for (let i = w.offen.length - 1; i >= 0; i--) {
      const wunsch = w.offen[i];
      if (!pruefeWunsch(wunsch, this.world).erfuellt) continue;
      w.offen.splice(i, 1);
      w.erfuellt = (w.erfuellt || 0) + 1;
      w.letzte = merken(w.letzte, wunsch);
      const lohn = wunschLohn(wunsch, w.erfuellt);
      this.state.coins += lohn.coins;
      this.state.ember += lohn.ember;
      for (let k = 0; k < lohn.items.length; k++) {
        this.inventory.add(lohn.items[k].id, lohn.items[k].n);
      }
      const geist = SPIRITS[wunsch.spirit];
      this.ui.toast((geist ? geist.name + ': ' : '') + wunschTitel(wunsch) + ' – erfüllt!',
        wunschIcon(wunsch), 'good');
      this.audio.play('questDone');
      this.particles.burst('color', this.player.x, this.player.y - 40, 14);
      this._note('wish');
    }
    this.ui.refreshQuests();
    this.save();
  }

  /**
   * Wie weit ein Wunsch ist – für die Anzeige.
   *
   * Gibt den BESTEN gefundenen Stand zurück, nicht irgendeinen: Wer drei
   * Bänke verteilt hat, will wissen, wie nah die vielversprechendste dran
   * ist, nicht die erstbeste in der Objektliste.
   */
  wunschStand(w) {
    return pruefeWunsch(w, this.world);
  }

  /**
   * Unter welchem Namen sich das Spiel einen Wunsch merkt.
   *
   * Nur damit die Prüfungen im Browser dasselbe lesen wie das Gedächtnis.
   * Sie hatten sich den Namen selbst zusammengesetzt – aus Sorte und Ort,
   * ohne den Geist – und hielten deshalb Miras „Licht bei mir" und Brunos
   * für denselben Wunsch. Ein Schlüssel, zwei Wahrheiten.
   */
  wunschKennung(w) {
    return wunschKey(w);
  }

  /** Die Jahreszeit als Kennung – oder null, solange der Tag nicht steht. */
  season() {
    return this.today && this.today.season ? this.today.season.id : null;
  }

  /**
   * Steht irgendwo ein Wetterhahn?
   *
   * Irgendwo, nicht in der Nähe: Ein Wetterhahn, den man aufsuchen muss, um
   * ihn zu lesen, ist ein Weg statt einer Auskunft. Er hängt an der Insel,
   * nicht an der Kachel, auf der man gerade steht.
   */
  hatWetterhahn() {
    for (let i = 0; i < this.world.entities.length; i++) {
      const e = this.world.entities[i];
      if (e.kind === 'decor' && !e.gone && istWetterhahn(e.itemId)) return true;
    }
    return false;
  }

  /**
   * Was für ein Wetter morgen wird – oder null ohne Wetterhahn.
   *
   * Kostet nichts auszurechnen: Das Wetter hing schon immer nur an Inselzahl,
   * Tag und Jahreszeit und steht damit fest, lange bevor der Tag beginnt.
   * Genau deshalb ist der Wetterhahn das Stück Deko, das am wenigsten
   * Maschinerie braucht und am meisten sagt – wer weiß, dass es morgen
   * regnet, gießt heute nicht.
   */
  morgenWetter() {
    if (!this.hatWetterhahn()) return null;
    const w = weatherFor(this.world.seed, this.day.day + 1, this.season());
    return { kind: w.kind, name: WETTER_WORT[w.kind] || 'Klar' };
  }

  /** Die Wirkungen des Tagesereignisses an die Systeme weitergeben. */
  _applyToday() {
    const ev = this.today && this.today.event ? this.today.event.id : null;
    const js = this.season();
    this.shop.dayBonus = ev === 'market' ? 1.35 : 1;
    this.wildlife.swarm = ev === 'moths';
    this.wildlife.season = js;
    if (ev === 'shoal') {
      // Ein Schwarm einer Art, die gerade gar nicht da ist, wäre ein
      // Versprechen ohne Deckung: Der Tag hieße „Fischschwarm", und am Wasser
      // bisse nichts Besonderes.
      const pool = fishesOf('sea', false, js).concat(fishesOf('fresh', false, js));
      const fisch = pool[shoalIndex(new Date(), pool.length, this.day.day)];
      this.fishing.boost = fisch ? fisch.id : null;
    } else {
      this.fishing.boost = null;
    }
  }

  /** Was der Tageswechsel an die Welt weiterreicht. */
  _todayWorldEffects() {
    const ev = this.today && this.today.event ? this.today.event.id : null;
    // Der Sternenstaub gehört zum GESTRIGEN Ereignis, nicht zum heutigen:
    // Er liegt am Morgen DANACH am Strand. Deshalb wird hier die Kennung des
    // Vortags gelesen, die `_deliverMail` ohnehin schon führt.
    const gestern = this.state.lastEvent || null;
    return {
      digs: ev === 'digs' ? 2 : 1,
      bloom: ev === 'bloom' ? 10 : 0,
      stars: ev === 'stars',
      stardust: gestern === 'stars' ? 6 : 0,
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
      // Steht Deko in Reichweite, gehört das in dieselbe Zeile: Die
      // Restdauer ist genau die Zahl, die der Bienenkorb ändert.
      const nachbarn = this.beetHilfe(e.x, e.y);
      const dazu = nachbarn.arten.length
        ? ' · ' + nachbarn.arten.map(itemName).join(', ') + ' hilft'
        : '';
      this.ui.toast(crop.name + ' wächst · noch ' + rest + (rest === 1 ? ' Tag' : ' Tage') + dazu,
        'icon_' + crop.seed);
      this.audio.play('forage');
      return;
    }

    const got = harvestOf(crop, Math.random);
    // Ein Rankgitter nebenan legt ein Stück drauf – auf die ERNTE, nicht auf
    // die Saat, die sich ohnehin selbst nachlegt. Sonst wäre der Garten nach
    // einer Woche ein Saatgutlager.
    const hilfe = this.beetHilfe(e.x, e.y);
    if (hilfe.ernte > 0 && got.length && got[0].id !== crop.seed) got[0].n += hilfe.ernte;

    // Blumenbeete, die beieinanderstehen: Dazwischen kann eine Dämmerblume
    // aufgehen. Sie kommt ZUSÄTZLICH – die normale Ernte wird nie kleiner,
    // sonst wäre ein schlecht gelegter Garten eine Strafe.
    const kreuzung = kreuzungVon(crop);
    const chance = kreuzung
      ? kreuzChance(this._beetNachbarn(e, kreuzung), (e.gepflegt || 0) > 0)
      : 0;
    const gezogen = chance > 0 && Math.random() < chance;
    if (gezogen) got.push({ id: kreuzung, n: 1 });

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
    // Nur melden, wenn sie auch wirklich in der Tasche gelandet ist: Bei
    // einer vollen Tasche wäre der Jubel eine Lüge.
    if (gezogen && wirklich.some(function (w) { return w.id === kreuzung; })) {
      this.particles.burst('color', e.x, e.y - 40, 18);
      this.audio.play('levelup');
      this.ui.toast('Eine Dämmerblume ist aufgegangen', 'icon_flower_dusk', 'good');
      this._note('gezogen');
    }
    // Sammelaufträge lesen die Tasche direkt, es reicht, die Anzeige
    // nachzuziehen. Ein `notify` wäre hier eine Meldung ohne Empfänger.
    this.ui.refreshQuests();
    this.save();
  }

  /**
   * Was ein Beet an dieser Stelle von der aufgestellten Deko bekommt.
   *
   * Über `queryNear` und nicht über alle Objekte: Auf einer eingerichteten
   * Insel stehen mehrere hundert Stück, und das hier läuft je Beet.
   */
  beetHilfe(x, y) {
    return beetHilfe(this.world.queryNear(x, y, WIRK_RADIUS), x, y);
  }

  /**
   * Wie viele andere Beete derselben Zuchtart um dieses herum stehen.
   *
   * Der Abstand wird NACHGERECHNET: `queryNear` arbeitet auf einem Raster von
   * 160 Punkten und gibt auch Nachbarn zurück, die weiter weg sind als der
   * gefragte Radius. Genau diese Falle hat beim Festschmuck schon einmal dafür
   * gesorgt, dass gar nichts aufgestellt wurde.
   *
   * Reif muss der Nachbar nicht sein. Ein Garten, in dem man die Ernte
   * aufeinander abstimmen muss, wäre Verwaltung – hier zählt, dass etwas
   * daneben steht.
   */
  _beetNachbarn(e, kreuzung) {
    const near = this.world.queryNear(e.x, e.y, KREUZ_RADIUS);
    const r2 = KREUZ_RADIUS * KREUZ_RADIUS;
    let n = 0;
    for (let i = 0; i < near.length; i++) {
      const k = near[i];
      if (k === e || k.gone || k.kind !== 'crop') continue;
      if (kreuzungVon(CROPS[k.cropId]) !== kreuzung) continue;
      const dx = k.x - e.x;
      const dy = k.y - e.y;
      if (dx * dx + dy * dy > r2) continue;
      n++;
    }
    return n;
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
      // Ein Bienenkorb in der Nähe zählt genauso: derselbe Summand, kein
      // zweiter Rechenweg daneben.
      const nachbarn = this.beetHilfe(e.x, e.y);
      const gegossen = e.watered === this.day.day;
      const zuwachs = grund + nachbarn.wachstum + (gegossen ? 1 : 0);
      // Für die Dämmerblume zählt nicht, ob HEUTE gegossen wurde, sondern ob
      // das Beet WÄHREND DES WACHSENS gegossen wurde. Der Unterschied ist
      // kein Detail: `waterCrop` lehnt ein reifes Beet ab, und diese Zeile
      // hier setzt `watered` jeden Morgen zurück – beim Ernten ist „heute
      // gegossen" also IMMER falsch. Eine Regel, die daran hinge, wäre ein
      // toter Zweig gewesen.
      if (gegossen) e.gepflegt = (e.gepflegt || 0) + 1;
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

  /* ---------------- Das Hausinnere ---------------- */

  /** Der Raum, den die heutige Ausbaustufe hergibt. */
  raum() {
    return raumFuer(this.state.house || 1);
  }

  /** Ob Seli gerade drinnen ist. */
  drinnen() {
    return !!this.innen;
  }

  /** Was im Zimmer steht. */
  innenStuecke() {
    return (this.state.interior && this.state.interior.stuecke) || [];
  }

  /** Wo das Bett steht – in Raumkoordinaten. */
  bettPunkt() {
    return bettFuer(this.raum());
  }

  /**
   * Wie dunkel es drinnen gerade ist (0 = hell).
   *
   * Draußen wird es nachts richtig dunkel – das ist der Grund, Laternen
   * aufzustellen. Drinnen darf es das NICHT: Ein Zimmer, in dem man abends
   * nichts mehr sieht, macht aus dem Lampenaufstellen eine Pflicht, und
   * drinnen ist nichts Pflicht. Es wird also nur Dämmerung, nie Nacht –
   * genug, dass eine brennende Laterne etwas ändert, nie so viel, dass man
   * ohne sie festsitzt.
   */
  innenDunkel() {
    return this.day.isDark() ? INNEN_NACHT : 0;
  }

  /**
   * Was drinnen leuchtet.
   *
   * Dieselbe `light`-Zahl wie draußen, damit eine Mondlaterne drinnen so
   * weit leuchtet wie davor. Der Punkt liegt etwas über dem Fußpunkt: Eine
   * Laterne leuchtet aus ihrem Glas, nicht aus dem Boden.
   */
  innenLichter() {
    const raus = [];
    const stuecke = this.innenStuecke();
    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const item = getItem(s.id);
      if (!item || !item.light) continue;
      raus.push({ x: s.x, y: s.y - 34, r: item.light });
    }
    return raus;
  }

  /** Welche Ausstattung das Zimmer gerade hat. */
  ausstattung() {
    return ausstattungFuer(this.state.interior && this.state.interior.ausstattung);
  }

  /**
   * Der Name des Zimmerbildes – gemalt, falls es das noch nicht gibt.
   *
   * Vier Ausbaustufen mal vier Ausstattungen sind sechzehn große Bilder.
   * Beim Start alle zu malen hiesse fünfzehn davon umsonst; deshalb erst
   * beim ersten Hineingehen und beim Wechsel.
   */
  raumSprite() {
    return ensureRoom(this.state.house || 1, this.ausstattung().id);
  }

  /**
   * Wand und Boden wechseln.
   *
   * Kostet nichts. Drinnen soll nichts Pflicht sein, auch nicht das
   * Bezahlen – es ist der eine Ort im Spiel, der nur dir gehört.
   */
  waehleAusstattung(id) {
    if (AUSSTATTUNG_IDS.indexOf(id) < 0) return false;
    if (!this.state.interior) this.state.interior = emptyInterior();
    if (this.state.interior.ausstattung === id) return false;
    this.state.interior.ausstattung = id;
    // Gleich malen lassen: Sonst käme der Ruck beim nächsten Bild, und man
    // sähe den Wechsel nicht, sondern ein Stocken.
    this.raumSprite();
    this.audio.play('ui');
    this.ui.toast(ausstattungFuer(id).name, 'icon_flowerbed', 'good');
    this.invalidate();
    this.save();
    return true;
  }

  /**
   * Hineingehen.
   *
   * Seli steht drinnen vor der Tür – dort, wo sie hereingekommen ist. Ihre
   * Position DRAUSSEN bleibt unangetastet: Das Zimmer führt eigene
   * Koordinaten (`this.innen`), und draußen steht sie danach wieder genau da,
   * wo sie hineingegangen ist.
   *
   * Ein zweiter Satz Koordinaten klingt nach Umstand, spart aber genau den
   * Ärger, den ein umgeschriebenes `player.x` machen würde: Alles, was die
   * Weltposition liest – Aufträge, Post, das Tier –, würde sonst plötzlich
   * eine Figur im Zimmerkoordinatensystem vorfinden.
   */
  betritt() {
    if (this.innen) return false;
    this.stehAuf(true);
    this.cancelPlacing();
    this.fishing.cancel();
    const raum = this.raum();
    const t = tuerFuer(raum);
    this.innen = { x: t.x + t.w / 2, y: raum.h - RAND - 6 };
    this.player.moving = false;
    this.player.frame = 0;
    this.player.dir = 'up';
    // Das Zimmerbild wird erst hier gemalt, falls es das noch nicht gibt.
    this.raumSprite();
    this.audio.play('ui');
    this.ui.clearBubbles();
    // Und den Blasenbehälter hart leeren. `clearBubbles` räumt die Liste,
    // aber eine Blase, die im selben Moment ausläuft, hängt noch 420 ms als
    // ausblendendes Element im Baum – und stünde dann über dem Zimmer, an
    // einer Stelle, die von einer Kamera stammt, die es drinnen nicht gibt.
    //
    // Die Ebene AUSBLENDEN wäre der naheliegende Weg und war der falsche:
    // Damit verschwanden auch Selis eigene Gedanken beim Sitzen im Zimmer,
    // die genau dort erscheinen sollen.
    this._blasenLeeren();
    this.invalidate();
    return true;
  }

  /** Alles aus dem Blasenbehälter werfen, auch das gerade Ausblendende. */
  _blasenLeeren() {
    const el = typeof document !== 'undefined' && document.getElementById('bubbles');
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /** Wieder hinaus – zurück auf den Platz vor dem Haus. */
  verlaesst() {
    if (!this.innen) return false;
    this.stehAufInnen(true);
    this.cancelPlacing();
    this.innen = null;
    this._blasenLeeren();
    this.player.moving = false;
    this.player.dir = 'down';
    this.audio.play('ui');
    this.camera.snapTo(this.player.x, this.player.y - 6);
    this.syncHouse();
    this.invalidate();
    this.save();
    return true;
  }

  /** Ist dieser Punkt im Zimmer begehbar? */
  _innenBegehbar(x, y) {
    const raum = this.raum();
    if (!imRaum(x, y, raum)) return false;
    // Durchs Bett geht es nicht – es steht da wie jedes Möbelstück.
    const b = bettFuer(raum);
    const bdx = b.x - x;
    const bdy = b.y - y;
    if (bdx * bdx + bdy * bdy < 54 * 54) return false;
    const stuecke = this.innenStuecke();
    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const item = getItem(s.id);
      // Flaches liegt auf dem Boden – darüber läuft man hinweg. Sonst wäre
      // ein Teppich eine Mauer.
      if (item && item.flat) continue;
      const dx = s.x - x;
      const dy = s.y - y;
      if (dx * dx + dy * dy < INNEN_BLOCK * INNEN_BLOCK) return false;
    }
    return true;
  }

  /**
   * Ein Schritt im Zimmer.
   *
   * Dieselbe Rechnung wie in `Player.update`, nur gegen die Zimmerwände statt
   * gegen die Insel – und auf `this.innen` statt auf `player.x/y`. Die
   * Animationsfelder der Figur werden mitgeführt, damit sie drinnen genauso
   * läuft wie draußen.
   */
  _innenBewegen(dt, move) {
    const p = this.player;
    const mx = p.busy ? 0 : move.x;
    const my = p.busy ? 0 : move.y;
    p.moving = (mx !== 0 || my !== 0);
    if (!p.moving) {
      p.animT = 0;
      p.frame = 0;
      p.stepTimer = 0;
      return;
    }
    if (Math.abs(mx) > Math.abs(my)) p.dir = mx < 0 ? 'left' : 'right';
    else p.dir = my < 0 ? 'up' : 'down';
    const speed = WALK_SPEED * (p.tempo || 1);
    const nx = this.innen.x + mx * speed * dt;
    if (this._innenBegehbar(nx, this.innen.y)) this.innen.x = nx;
    const ny = this.innen.y + my * speed * dt;
    if (this._innenBegehbar(this.innen.x, ny)) this.innen.y = ny;
    p.animT += dt * (2.2 + Math.abs(mx) + Math.abs(my));
    const f = Math.floor(p.animT * 2) % 4;
    p.frame = f === 0 ? 0 : f === 1 ? 1 : f === 2 ? 0 : 2;
    p.stepTimer -= dt;
  }

  /** Der Punkt, den Seli drinnen gerade vor sich hat. */
  _innenVorDerNase(abstand) {
    const d = abstand == null ? 52 : abstand;
    const dir = this.player.dir;
    const dx = dir === 'left' ? -d : dir === 'right' ? d : 0;
    const dy = dir === 'up' ? -d : dir === 'down' ? d : 0;
    return { x: this.innen.x + dx, y: this.innen.y + dy };
  }

  /** Das Stück, das drinnen gerade angesprochen wäre – oder null. */
  innenZiel() {
    if (!this.innen || this.placing) return null;
    const p = this._innenVorDerNase();
    return stueckAn(this.innenStuecke(), p.x, p.y, 54);
  }

  /**
   * Sich drinnen hinsetzen.
   *
   * Dieselbe Geste wie draußen – tippen setzt hin, halten packt ein –, aber
   * mit den Zimmerkoordinaten. `player.setzDich` bekommt deshalb
   * `ohneVersetzen`: Selis WELTposition darf sich nicht bewegen, solange sie
   * drinnen ist, sonst stünde sie beim Hinausgehen woanders.
   */
  setzDichInnen(s) {
    if (!s || !istSitzplatz(s.id)) return false;
    const zurueck = { x: this.innen.x, y: this.innen.y };
    if (!this.player.setzDich(s, s.id, true)) return false;
    this._innenZurueck = zurueck;
    this.innen.x = s.x;
    this.innen.y = s.y + 2;
    this.audio.play('place');
    this._ruheAnzeige(true);
    this._ruheZeit = 0;
    this._ruheNaechster = ERSTER_GEDANKE;
    // Wie draußen: Erst loslassen, dann zählt Halten. Sonst wäre der Druck,
    // mit dem man sich hinsetzt, sofort der Anfang eines Haltens.
    this._haltenFrei = false;
    this._halten = 0;
    this.ui.setPrompt('');
    return true;
  }

  /** Drinnen wieder aufstehen – zurück auf den Platz davor. */
  stehAufInnen(still) {
    if (!this.player.sitzt || !this.innen) return false;
    this.player.stehAuf();
    if (this._innenZurueck) {
      this.innen.x = this._innenZurueck.x;
      this.innen.y = this._innenZurueck.y;
      this._innenZurueck = null;
    }
    this._ruheZeit = 0;
    this._ruheAnzeige(false);
    if (!still) this.audio.play('step');
    return true;
  }

  /**
   * Was beim Sitzen im Zimmer passiert.
   *
   * Dieselbe Mechanik wie `_ruhen` draußen, nur ohne alles, was es drinnen
   * nicht gibt: keine Tiere, die zufliegen, keine Weltobjekte, die
   * verschwinden könnten.
   */
  _innenRuhen(dt, move) {
    const sitz = this.player.sitzt;
    if (!sitz) return false;

    // Das Möbelstück kann weg sein – etwa weil ein alter Spielstand geladen
    // wurde. Dann steht sie auf, statt in der Luft zu sitzen.
    if (this.innenStuecke().indexOf(sitz.entity) < 0) { this.stehAufInnen(true); return true; }
    if (move.x !== 0 || move.y !== 0) { this.stehAufInnen(); return true; }

    const taste = this.input.isDown('interact');
    if (!this._haltenFrei) {
      if (!taste) this._haltenFrei = true;
    } else if (taste) {
      this._halten = (this._halten || 0) + dt;
      if (this._halten >= HALTEN_SEK) {
        this._halten = 0;
        if (this.player.tool.id !== 'hand') {
          this.ui.toast('Mit der Hand aufheben', 'icon_hand');
          return true;
        }
        const s = sitz.entity;
        this.stehAufInnen(true);
        this._innenEinpacken(s);
        return true;
      }
    } else if (this.input.released('interact')) {
      this._halten = 0;
      this.stehAufInnen();
      return true;
    }

    this._ruheZeit = (this._ruheZeit || 0) + dt;
    if (this._ruheZeit >= (this._ruheNaechster || ERSTER_GEDANKE)) {
      this._ruheNaechster = this._ruheZeit + GEDANKE_ALLE;
      this._denkLautInnen();
    }
    return true;
  }

  _denkLautInnen() {
    const satz = waehleGedanke(this.innenRuheLage(), this.state.gedanken || [], Math.random);
    if (!satz) return;
    this.state.gedanken = merkeGedanke(this.state.gedanken || [], satz);
    // Die Blase hängt an Weltkoordinaten; drinnen gibt es die nicht. Also
    // wird sie an die Bildmitte gesetzt, ein Stück über Seli.
    const o = this.innenOffset || { x: 0, y: 0, zoom: 1 };
    this.ui.bubbleAtScreen(
      (o.x + this.innen.x) * (o.zoom || 1),
      (o.y + this.innen.y - 108) * (o.zoom || 1),
      satz, 5.2);
  }

  /**
   * Wo Seli drinnen sitzt, in Begriffen, die `rest.js` kennt.
   *
   * Dieselbe Form wie `ruheLage`, nur aus dem Zimmer: das Möbelstück, die
   * Stücke ringsum, das Wetter (man hört den Regen auch drinnen), die
   * Tageszeit, die Jahreszeit – und der Ort ist immer `drinnen`.
   */
  innenRuheLage() {
    const sitz = this.player.sitzt;
    const deko = [];
    const stuecke = this.innenStuecke();
    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const dx = s.x - this.innen.x;
      const dy = s.y - this.innen.y;
      if (dx * dx + dy * dy > INNEN_SICHT * INNEN_SICHT) continue;
      if (DEKO_GEDANKE[s.id] && deko.indexOf(s.id) < 0) deko.push(s.id);
    }
    const w = this.weather;
    const morgen = this.day.hour < MORGEN_BIS;
    const nacht = !morgen && this.day.isDark();
    return {
      moebel: sitz ? sitz.itemId : null,
      geist: null,
      deko: deko,
      wetter: w.raining ? 'regen' : w.foggy ? 'nebel' : w.snowing ? 'schnee' : null,
      morgen: morgen,
      nacht: nacht,
      abend: !nacht && !morgen && this.day.hour >= ABEND_AB,
      orte: ['drinnen'],
      jahreszeit: this.season(),
    };
  }

  _innenUpdate(dt, move) {
    this.player.tempo = tempoFaktor(this.state.staerkung, this.day.day);
    // Sitzt sie, übernimmt das Ausruhen die ganze Eingabe – wie draußen.
    if (this._innenRuhen(dt, move)) {
      this._innenPrompt();
      this.ui.refreshHud();
      this.ui.updateBubbles(dt);
      const mussSchlafen = this.day.update(dt);
      if (mussSchlafen) this.sleep(true);
      return;
    }
    this._innenBewegen(dt, move);
    if (this.player.consumeStep()) this.audio.play('step');
    this._innenPlacingUpdate();
    this._innenPrompt();

    if (this.input.pressed('interact')) this._innenInteract();
    if (this.input.pressed('cancelPlace') && this.placing) this.cancelPlacing();

    const mustSleep = this.day.update(dt);
    if (mustSleep) this.sleep(true);

    this.ui.refreshHud();
    this.ui.updateBubbles(dt);
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0) {
      this.autosaveTimer = AUTOSAVE_SECONDS;
      this.save();
    }
  }

  _innenPrompt() {
    if (this.player.sitzt) {
      this.ui.setPrompt(this.player.tool.id === 'hand'
        ? 'Aufstehen · halten zum Einpacken'
        : 'Aufstehen');
      return;
    }
    if (this.placing) {
      this.ui.setPrompt(this.placing.valid
        ? 'E hinstellen · X abbrechen'
        : (this.placing.reason || 'Hier passt es nicht') + ' · X abbrechen');
      return;
    }
    if (amBett(this.innen.x, this.innen.y, this.raum())) {
      this.ui.setPrompt('Schlafen');
      return;
    }
    if (anDerTuer(this.innen.x, this.innen.y, this.raum())) {
      this.ui.setPrompt('Hinausgehen');
      return;
    }
    const s = this.innenZiel();
    if (s) {
      if (istSitzplatz(s.id)) {
        this.ui.setPrompt(this.player.tool.id === 'hand'
          ? 'Hinsetzen · halten zum Einpacken'
          : 'Hinsetzen');
        return;
      }
      this.ui.setPrompt(this.player.tool.id === 'hand'
        ? itemName(s.id) + ' einpacken'
        : 'Mit der Hand aufheben');
      return;
    }
    this.ui.setPrompt('');
  }

  _innenInteract() {
    if (this.placing) { this._innenPlatzieren(); return; }
    if (amBett(this.innen.x, this.innen.y, this.raum())) { this.sleep(false); return; }
    if (anDerTuer(this.innen.x, this.innen.y, this.raum())) { this.verlaesst(); return; }
    const s = this.innenZiel();
    if (!s) return;
    // Wie draußen: Auf ein Sitzmöbel setzt man sich, alles andere packt man
    // ein. Eingepackt wird ein Sitzmöbel durch HALTEN – siehe `_innenRuhen`.
    if (istSitzplatz(s.id)) { this.setzDichInnen(s); return; }
    this._innenEinpacken(s);
  }

  /** Den Vorschaupunkt setzen – dieselbe Idee wie draußen, nur im Zimmer. */
  _innenPlacingUpdate() {
    if (!this.placing) return;
    const raum = this.raum();
    const stuecke = this.innenStuecke();
    const p = this._innenVorDerNase(64);
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    if (platzFrei(stuecke, px, py, raum)) {
      this.placing.x = px;
      this.placing.y = py;
      this.placing.valid = true;
      this.placing.reason = null;
      return;
    }
    // Ringe um den Wunschpunkt, von innen nach außen – wie draußen auch.
    const ringe = [30, 56, 88];
    for (let r = 0; r < ringe.length; r++) {
      const schritte = 8 + r * 4;
      for (let i = 0; i < schritte; i++) {
        const a = (i / schritte) * Math.PI * 2 + r * 0.4;
        const x = Math.round(px + Math.cos(a) * ringe[r]);
        const y = Math.round(py + Math.sin(a) * ringe[r]);
        if (platzFrei(stuecke, x, y, raum)) {
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
    this.placing.reason = anDerTuer(px, py, raum)
      ? 'Nicht vor die Tür'
      : imRaum(px, py, raum) ? 'Da steht schon etwas' : 'Das ist die Wand';
  }

  _innenPlatzieren() {
    const p = this.placing;
    if (!p) return;
    if (!p.valid) {
      this.ui.toast(p.reason || 'Hier passt es nicht', 'icon_lock', 'bad');
      this.audio.play('fail');
      return;
    }
    if (this.inventory.count(p.itemId) <= 0) { this.cancelPlacing(); return; }
    const stuecke = this.innenStuecke();
    if (stuecke.length >= maxStuecke(this.raum())) {
      this.ui.toast('Das Zimmer ist voll', 'icon_lock', 'bad');
      this.audio.play('fail');
      return;
    }
    this.inventory.remove(p.itemId, 1);
    stuecke.push({ id: p.itemId, x: p.x, y: p.y });
    this.audio.play('place');
    this._note('decor');
    this.cancelPlacing();
    this._innenWirkung();
    this.save();
  }

  _innenEinpacken(s) {
    if (this.player.tool.id !== 'hand') {
      this.ui.toast('Mit der Hand aufheben', 'icon_hand');
      return;
    }
    if (!this.inventory.add(s.id, 1)) {
      this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      return;
    }
    const stuecke = this.innenStuecke();
    const i = stuecke.indexOf(s);
    if (i >= 0) stuecke.splice(i, 1);
    this.audio.play('place');
    this.ui.toast(itemName(s.id) + ' eingepackt', getItem(s.id).icon);
    this._innenWirkung();
    this.save();
  }

  /** Wie gemütlich es drinnen gerade ist. */
  wohnPunkte() {
    return gemuetlichkeit(this.innenStuecke(), getItem);
  }

  /**
   * Was das Zimmer nach außen bewirkt.
   *
   * Ein Zuhause, in dem es schön ist, färbt die Insel um sich herum weiter
   * ein. Das ist die einzige Wirkung – und sie geht über dieselbe Farbquelle
   * wie das Haus selbst, nicht über eine zweite daneben.
   */
  _innenWirkung() {
    this.syncHouse();
  }

  /* ---------------- Tagebuch ---------------- */

  _daybookStart() {
    this.state.daybook = emptyDaybook(this.day.day, this.colorField.coverage(this.world));
  }

  /**
   * Einen Strich machen.
   *
   * `feld` gehört in `DAYBOOK_ROWS` (siehe daybook.js), sonst zählt hier
   * etwas mit, das niemand je zu sehen bekommt – genau so sind „gekocht",
   * „wish" und „sets" ins Leere gelaufen. Ein Test liest diese Datei und
   * hält beide Seiten beieinander.
   */
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
      // COOK gehört dazu, seit es Kochbitten gibt: Sonst verschenkt man die
      // Waldsuppe, um die Wanda gestern gebeten hat, unterwegs an Bruno.
      if (q.type === QTYPE.GATHER || q.type === QTYPE.CRAFT ||
          q.type === QTYPE.COOK) return true;
    }
    return false;
  }

  /** Was dieser Geist gern mag und gerade in der Tasche liegt – oder null. */
  likedInBag(spiritId) {
    const spirit = SPIRITS[spiritId];
    if (!spirit || !spirit.likes) return null;
    // Gekochtes nimmt jeder gern, aber erst NACH dem, was dieser Geist
    // besonders mag: Sonst verschenkte man den Mondblütenkuchen an
    // Flämmchen, der eigentlich auf Harz wartet. Die eigene Vorliebe bleibt
    // die Vorliebe; ein Gericht ist das freundliche Allgemeine.
    const gericht = this._gerichtImBeutel();
    // Das Lieblingsstück hat Vorrang. Sonst verschenkte man es versehentlich
    // als „irgendwas Gemochtes" und merkte nie, dass es eines gibt.
    const lieb = favouriteOf(spiritId);
    if (lieb && this.inventory.count(lieb) > 0 && !this._neededForQuest(lieb)) return lieb;
    for (let i = 0; i < spirit.likes.length; i++) {
      const id = spirit.likes[i];
      if (this.inventory.count(id) <= 0) continue;
      if (this._neededForQuest(id)) continue;
      return id;
    }
    return gericht;
  }

  /** Das wertvollste Gericht in der Tasche, das keine Aufgabe braucht. */
  _gerichtImBeutel() {
    let best = null;
    let bestWert = 0;
    for (let i = 0; i < GERICHTE.length; i++) {
      const id = GERICHTE[i].id;
      if (this.inventory.count(id) <= 0) continue;
      if (this._neededForQuest(id)) continue;
      const item = getItem(id);
      const wert = item ? item.value : 0;
      if (wert > bestWert) { bestWert = wert; best = id; }
    }
    return best;
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
    // Das Lieblingsstück zählt doppelt – an Glut und an Farbe. Vorher war
    // jedes gemochte Ding gleich viel wert, und man warf hin, was gerade
    // oben lag; jetzt lohnt es sich, das Richtige aufzuheben.
    const lieb = isFavourite(e.spiritId, id);
    const basis = 2 + Math.floor((item && item.value ? item.value : 6) / 8);
    // Am Geburtstag zählt alles dreifach. Ein Geburtstag, an dem sich nichts
    // ändert, ist ein Datum – und es gibt ihn je Geist einmal im Jahr.
    const geburtstag = hasBirthday(e.spiritId, new Date());
    const faktor = geburtstag ? GEBURTSTAG_FAKTOR : 1;
    const ember = Math.round((lieb ? basis * 2 + 3 : basis) * faktor);
    this.state.ember += ember;
    this._note('gifts');
    this._note('ember', ember);

    // Farbe: dauerhaft, wie bei einer erledigten Bitte – nur kleiner.
    this.colorField.growByArea('spirit_' + e.spiritId, (lieb ? 110000 : 45000) * faktor);
    this.colorField.markDirty();

    this.particles.burst('heart', e.x, e.y - 110, lieb ? 16 : 7);
    this.particles.burst('color', e.x, e.y - 60, lieb ? 22 : 10);
    this.audio.play(lieb ? 'levelup' : 'ghost');
    // Gekochtes bekommt seinen eigenen Dank: Es ist das einzige Mitbringsel,
    // das gemacht und nicht gefunden wurde.
    const dank = istGericht(id) ? kochDank(e.spiritId) : null;
    this.ui.bubble(e.x, e.y - 190,
      pickLine(dank && dank.length ? dank : spirit.lines.thanks),
      [{ icon: 'icon_' + id }, { icon: 'icon_heart' }], 2.8);
    this.ui.toast((geburtstag ? 'Geburtstagsgeschenk! ' : lieb ? 'Genau das! ' : '') +
      '+' + ember + ' Glut · ' +
      (lieb || geburtstag ? 'viel mehr Farbe' : 'etwas mehr Farbe'), 'icon_ember', 'good');
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
        // Jeder Fang hat ein Maß. Das ist der Grund, dieselbe Sardine ein
        // zweites Mal zu angeln – im Fundbuch steht der Rekord, nicht nur
        // ein Haken.
        const cm = rollSize(res.fish.id, this.player.levels.rod || 1, !!res.perfect,
          Math.random);
        const rek = noteSize(this.state.records, res.fish.id, cm);
        const wort = sizeWord(res.fish.id, cm);
        this.ui.toast((res.perfect ? 'Perfekt! ' : '') + res.fish.name + ' · ' + cm + ' cm' +
          (wort ? ' – ' + wort : ''), res.fish.icon, 'good');
        if (rek.neu && rek.vorher > 0) {
          this.ui.toast('Neuer Rekord · vorher ' + rek.vorher + ' cm', 'icon_star', 'good');
          this.audio.play('levelup');
        }
      } else {
        this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      }
      this.ui.refreshQuests();
    }
  }

  /* ---------------- Werkbank / Laden / Feuer ---------------- */

  /* ---------------- Die Küche ---------------- */

  /**
   * Ein Gericht kochen.
   *
   * Die Zutaten gehen weg, das Gericht kommt in die Tasche. Gegessen wird
   * damit noch nicht – man kann es auch verkaufen oder verschenken, und das
   * ist der Punkt: Die Küche ist ein dritter Weg für Sammelgut, nicht nur
   * ein Knopf für einen Tagesbonus.
   */
  cookDish(id) {
    const rec = gerichtFuer(id);
    if (!rec) return false;
    if (!kannKochen(rec, this.inventory)) {
      this.ui.toast('Es fehlt noch etwas', 'icon_craft', 'bad');
      return false;
    }
    // Erst Platz prüfen, dann Zutaten nehmen. Andersherum wären bei voller
    // Tasche die Zutaten weg und das Gericht nirgends.
    if (this.inventory.isFull() && this.inventory.count(id) <= 0) {
      this.ui.toast('Tasche ist voll!', 'icon_bag', 'bad');
      return false;
    }
    for (let i = 0; i < rec.zutaten.length; i++) {
      this.inventory.remove(rec.zutaten[i].id, rec.zutaten[i].n);
    }
    this.inventory.add(id, 1);
    const item = getItem(id);
    this.ui.toast(item.name + ' gekocht', item.icon, 'good');
    this.audio.play('craft');
    this._note('gekocht');
    this.ui.refreshQuests();
    this.save();
    return true;
  }

  /**
   * Ein Gericht essen.
   *
   * Eine Stärkung auf einmal, bis zum Schlafengehen. Wer ein zweites isst,
   * tauscht – das sagt die Meldung auch, sonst hielte man es für einen
   * Fehler.
   */
  eatDish(id) {
    if (!istGericht(id) || this.inventory.count(id) <= 0) return false;
    const neu = staerkungVon(id);
    if (!neu) return false;
    const alt = staerkungHeute(this.state.staerkung, this.day.day);

    this.inventory.remove(id, 1);
    this.state.staerkung = { id: neu.id, tag: this.day.day };
    this.player.tempo = tempoFaktor(this.state.staerkung, this.day.day);

    this.ui.toast(
      alt && alt.id !== neu.id ? neu.name + ' – statt ' + alt.name : neu.name + ' · ' + neu.note,
      neu.icon, 'good');
    this.audio.play('levelup');
    this.particles.burst('heart', this.player.x, this.player.y - 70, 6);
    this.save();
    return true;
  }

  /** Die Stärkung von heute – oder null. Für Fenster und Prüfungen. */
  staerkung() {
    return staerkungHeute(this.state.staerkung, this.day.day);
  }

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
    // Drinnen wird nicht gesät und nicht gepflastert: Ein Beet im Zimmer
    // hätte keine Sonne, und ein Wegstück endete an der Wand.
    if (this.innen && (item.plant || item.tile)) {
      this.ui.toast(item.plant ? 'Das gehört nach draußen' : 'Wege gibt es nur draußen',
        item.icon);
      return;
    }
    // Zum Aufstellen muss man aufstehen. Sonst säße sie fest: Beim Sitzen
    // gehört die E-Taste dem Ausruhen, und der Platz ließe sich nie
    // bestätigen – man käme mit dem Stück in der Hand nicht mehr heraus.
    this.stehAuf(true);
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
      const eigen = this._aufEigenemGrund(x, y);
      if (d.category === 'spirit' && eigen) continue;
      if ((d.category === 'station' || d.category === 'spirit' || d.category === 'fox') &&
          dist2 < (eigen ? 74 : 110) * (eigen ? 74 : 110)) {
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
      const d = defOf(e.kind);
      if (!d) continue;
      // Was zurückkommt, hält seinen Platz frei.
      //
      // Gefällt ist nicht weg: Der Baum steht in drei Tagen wieder da. Ohne
      // diese Zeile konnte man eine Bank auf den Stumpf stellen – und am
      // dritten Morgen wuchs der Baum mitten durch die Bank. Laufen darf man
      // über die Stelle weiterhin (siehe `World.blockShape`); nur bebauen
      // nicht.
      if (e.gone) {
        if (!e.respawnDay) continue;
        const rr = (d.blockR || 20) + 16;
        const dx = e.x - x;
        const dy = e.y - y;
        if (dx * dx + dy * dy < rr * rr) return false;
        continue;
      }
      if (d.category === 'station' || d.category === 'spirit' || d.category === 'fox') {
        const dx = e.x - x;
        const dy = e.y - y;
        // Auf dem eigenen Grundstück gelten andere Abstände. Der große Radius
        // hält den Weg zum Lager frei – auf eigenem Grund ist das die eigene
        // Sache. Und ein GEIST blockiert dort gar nicht: Er steht morgen
        // woanders, und eine Bank nicht aufstellen zu dürfen, weil gerade
        // jemand daneben schwebt, wäre eine Regel ohne Grund.
        const eigen = this._aufEigenemGrund(x, y);
        if (eigen && d.category === 'spirit') continue;
        const r = eigen ? 74 : 110;
        if (dx * dx + dy * dy < r * r) return false;
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
      this._sagWasEsTut(e);
    }
    this.audio.play('place');
    this._note('decor');
    this.particles.burst('dust', p.x, p.y, 5);
    this.syncCosiness();
    this.syncPet();
    // Genau hier kann ein Wunsch erfüllt worden sein – ein Wunsch ist ein
    // Ort, und Orte entstehen beim Aufstellen.
    this.checkWishes();
    this.ui.refreshQuests();

    if (this.inventory.count(p.itemId) <= 0) this.cancelPlacing();
    this.save();
  }

  /**
   * Was das eben aufgestellte Stück von hier aus bewirkt.
   *
   * Der Punkt, an dem eine unsichtbare Wirkung sichtbar wird. Ein Bienenkorb,
   * der Beete schneller wachsen lässt, ist ohne diese Zeile ein Gerücht: Man
   * müsste zwei Spielstände nebeneinander führen, um ihn zu bemerken.
   *
   * Deshalb steht hier eine ZAHL und kein Versprechen – „3 Beete in
   * Reichweite" sagt auch, dass man ihn zwei Schritte weiter besser
   * hinstellt.
   */
  _sagWasEsTut(e) {
    const hilfe = BEET_HILFE[e.itemId];
    if (hilfe) {
      const nah = this.world.queryNear(e.x, e.y, WIRK_RADIUS);
      let beete = 0;
      const r2 = WIRK_RADIUS * WIRK_RADIUS;
      for (let i = 0; i < nah.length; i++) {
        const c = nah[i];
        if (c.gone || c.kind !== 'crop') continue;
        const dx = c.x - e.x;
        const dy = c.y - e.y;
        if (dx * dx + dy * dy <= r2) beete++;
      }
      this.ui.toast(beete === 0
        ? 'Kein Beet in Reichweite'
        : beete + (beete === 1 ? ' Beet in Reichweite' : ' Beete in Reichweite'),
      'icon_seed_berry', beete ? 'good' : '');
      return;
    }
    const tut = wirkungVon(e.itemId);
    if (tut) this.ui.toast(tut, 'icon_star', 'good');
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
    // Vor dem Speichern, nicht danach: Sonst ginge der Tag mit einer Figur
    // zu Ende, die auf einer Bank sitzt, und der nächste begänne dort.
    this.stehAuf(true);
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

    // Was GESTERN für ein Tag war, bevor `refreshToday` es überschreibt.
    // Der Sternenstaub am Strand gehört zur Sternennacht der letzten Nacht,
    // nicht zum heutigen Ereignis.
    this.state.lastEvent = this.today && this.today.event ? this.today.event.id : null;
    this.day.sleep();
    const day = this.day.day;
    this._daybookStart();
    // Der Kalender kann sich über Nacht gedreht haben – wer bis nach
    // Mitternacht spielt, bekommt dann auch das Ereignis von morgen.
    this.refreshToday();
    this.world.newDay(day, this._todayWorldEffects());
    // Erst das Wetter des neuen Tages, dann wachsen lassen: Regen zählt
    // doppelt, und das soll der Regen von heute sein, nicht der von gestern.
    this.weather.setDay(this.world.seed, day, this.season());
    const frischReif = this.growCrops(this.weather.kind);
    const zurueckgezogen = this.quests.newDay(day, this.world, this);
    this._wuenscheNachfuellen(day);
    this.checkWishes();
    this.shop.refresh(day, this.world.seed);
    this.particles.clear();
    this.wildlife.clear();
    this._jitterSpirits(day);
    this._placeStoryPieces(day);
    this._festSchmuck(day);
    this.camera.snapTo(this.player.x, this.player.y);
    this.ground.prewarm(this.camera.ox, this.camera.oy, this.renderer.viewW, this.renderer.viewH);
    this.ui.refreshHud();
    this.ui.refreshQuests();
    this._deliverMail(day, buch);
    this._petNewDay(day);
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
      // Eine Zeile je Wetter statt einer Abfrage mit zwei Ausgängen: Beim
      // Schnee stand sonst „Nebel liegt über der Insel", weil alles, was
      // nicht Regen war, als Nebel durchging.
      const worte = {
        rain: ['Es regnet', 'icon_bottle'],
        fog: ['Nebel liegt über der Insel', 'icon_ghost'],
        snow: ['Es schneit', 'icon_star'],
      };
      const sagen = worte[this.weather.kind];
      if (sagen) {
        const self = this;
        setTimeout(function () { self.ui.toast(sagen[0], sagen[1]); }, 1400);
      }
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
    // Solange der letzte Abend läuft, bleibt jeder, wo er steht: Der Ring um
    // das Feuer soll auf einen warten, nicht über Nacht auseinanderlaufen.
    if (this.finaleOffen()) return;
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

  /**
   * Das Windspiel klingt, wenn man vorbeigeht.
   *
   * Es hieß Windspiel und tat nichts. Ein Klang ist die kleinste Wirkung, die
   * es gibt – und für dieses Stück die einzig richtige.
   *
   * Zwei Regeln, damit es nicht nervt: nur beim GEHEN (wer davorsteht, hört
   * es einmal und dann nicht mehr), und jedes Spiel merkt sich, dass es
   * gerade geklungen hat, bis man wieder weg ist. Ohne das zweite klingelt
   * es alle 0,4 Sekunden, solange man daneben steht.
   */
  _windspiel(dt) {
    this._chimeTimer = (this._chimeTimer || 0) - dt;
    if (this._chimeTimer > 0) return;
    this._chimeTimer = 0.4;
    if (!this.player.moving) { this._chimeLetztes = null; return; }

    const nah = this.world.queryNear(this.player.x, this.player.y, 120);
    let treffer = null;
    for (let i = 0; i < nah.length; i++) {
      const e = nah[i];
      if (e.gone || e.kind !== 'decor' || !klingt(e.itemId)) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (dx * dx + dy * dy > 120 * 120) continue;
      treffer = e;
      break;
    }
    if (!treffer) { this._chimeLetztes = null; return; }
    if (this._chimeLetztes === treffer.id) return;
    this._chimeLetztes = treffer.id;
    this.audio.play('chime');
  }

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

    // Das eigene Fenster. Erst ab der Hütte – ein Zelt leuchtet nicht.
    const hausLicht = houseLight(this.state.house || 1);
    const haus = this.world.tent;
    if (hausLicht > 0 && haus) {
      out.push({ x: haus.x, y: haus.y - 110, r: hausLicht, a: 0.82 });
    }

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
    if (this.player.sitzt) {
      this.ui.setPrompt(this.player.tool.id === 'hand'
        ? 'Aufstehen · halten zum Einpacken'
        : 'Aufstehen');
      return;
    }
    if (this.placing) {
      if (!this.placing.valid) {
        this.ui.setPrompt((this.placing.reason || 'Kein Platz') + ' · X abbrechen');
        return;
      }
      if (this.placing.plant) {
        this.ui.setPrompt('Hier säen · X abbrechen');
        return;
      }
      // Passt die Stelle zu einem offenen Wunsch, steht das hier – und wenn
      // nur die Stelle nicht passt, steht da, wohin es gehört. „Am Wasser"
      // heißt in Zahlen 150 Pixel; wer die Bank zweihundert daneben
      // hinstellt, sähe sonst nichts passieren und wüsste nicht, warum.
      const offen = this.wuenschenSchon() ? this.wishes() : null;
      const treffer = wunschHier(offen, this.placing.itemId,
        this.placing.x, this.placing.y, this.world);
      if (treffer) {
        this.ui.setPrompt('Hier aufstellen – erfüllt einen Wunsch · X abbrechen');
        return;
      }
      const sorte = wunschSorteHier(offen, this.placing.itemId);
      if (sorte) {
        const ort = WUNSCH_ORTE[sorte.ort];
        this.ui.setPrompt('Hier aufstellen · gewünscht ist es '
          + (ort ? ort.name : 'woanders') + ' · X abbrechen');
        return;
      }
      this.ui.setPrompt('Hier aufstellen · X abbrechen');
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
        : (id && !this.giftedToday(t.entity.spiritId))
          ? (isFavourite(t.entity.spiritId, id) ? '★ ' : '') + itemName(id) + ' schenken'
          : 'Reden');
      return;
    }
    if (def.category === 'pet') {
      const stand = this.petStatus();
      this.ui.setPrompt(!stand.hungrig ? 'Hat schon gefressen'
        : stand.futter ? 'Füttern' : 'Nichts dabei, was es frisst');
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
    if (def.category === 'decor') {
      this.ui.setPrompt(istSitzplatz(t.entity.itemId) ? 'Hinsetzen' : 'Einpacken');
      return;
    }
    if (def.station === 'boat') {
      this.ui.setPrompt(!this.world.isUnlocked(REGION.ISLE) ? 'Vertäut'
        : t.entity.toRegion === REGION.ISLE ? 'Übersetzen' : 'Zurückrudern');
      return;
    }
    if (def.station === 'mail') {
      const offen = unreadCount(this.state.mail);
      this.ui.setPrompt(offen ? 'Post (' + offen + ')' : 'Briefkasten');
      return;
    }
    if (def.station === 'storage') {
      this.ui.setPrompt(statusOf(this.state.loan).stage < 1 ? 'Verschlossen' : 'Vorrat');
      return;
    }
    if (def.station === 'campfire') { this.ui.setPrompt('Lagerfeuer'); return; }
    if (def.station === 'craft') { this.ui.setPrompt('Werkbank'); return; }
    if (def.station === 'kitchen') { this.ui.setPrompt('Kochstelle'); return; }
    if (def.station === 'shop') { this.ui.setPrompt('Laden'); return; }
    if (def.station === 'tent') { this.ui.setPrompt('Hineingehen'); return; }
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
    this._applyScaling();
    if (this.onSettingsChanged) this.onSettingsChanged(this.settings);
  }

  /**
   * Wie die Leinwand hochskaliert wird, wenn sie kleiner ist als das Fenster.
   *
   * Das ist nicht immer gleich: Wird es eng, rechnet der Renderer von selbst
   * gröber (siehe `Renderer.adapt`), und dann liegt zwischen Leinwand und
   * Fenster ein echter Faktor. „Füllen" lässt den Browser weich
   * dazwischenrechnen, „Pixelgenau" nicht.
   *
   * Diese Zeile hat gefehlt. Die Einstellung stand seit jeher im Menü, mit
   * Erklärung und zwei Knöpfen – und wurde von keiner Stelle im Spiel
   * gelesen. Wer sie umstellte, sah nichts passieren.
   */
  _applyScaling() {
    if (!this.canvas) return;
    this.canvas.style.imageRendering =
      this.settings.scaling === 'crisp' ? 'pixelated' : 'auto';
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
