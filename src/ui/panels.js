/** Modale Fenster: Tasche, Aufgaben, Werkbank, Laden, Feuer, Karte, Einstellungen. */
import { iconUrl } from '../art/sprites.js';
import { getItem, CAT_NAMES, CAT, ITEM_LIST } from '../game/items.js';
import { RECIPES, missingFor, campfireLevelFor, nextCampfireLevel } from '../game/recipes.js';
import {
  SPIRITS, friendshipLevel, friendshipProgress, birthdayOn,
} from '../game/spirits.js';
import { STAGES, storyIcon, keepsakeOf, storyLine, storyClose, storyIntro } from '../game/stories.js';
import { pointsToNext, COSY_MAX } from '../game/cosiness.js';
import { canLink, linkedName, pendingLinkName, requestLinkPermission, linkNew, linkExisting, unlink, openFile, suggestName } from '../core/savefile.js';
import { questTitle, questIcon, QTYPE, daysLeft } from '../game/quests.js';
import { MILESTONES, nextOpen } from '../game/milestones.js';
import { SETS, SET_IDS, setById, progressOf, itemsOf, hintFor, totalProgress } from '../game/collection.js';
import { unreadCount } from '../game/mail.js';
import { DAYBOOK_ROWS } from '../game/daybook.js';
import {
  wohnStufe, bisZurNaechstenWohnstufe, wohnBonus, maxStuecke, AUSSTATTUNG,
  GRUPPE_BONUS,
} from '../game/interior.js';
import {
  GERICHTE, STAERKUNG, kannKochen, staerkungHeute,
} from '../game/kitchen.js';
import { bestSize, spanneFuer } from '../game/records.js';
import { petStatus as petStatusOf, launeWort, ZAHM_NOETIG } from '../game/pet.js';
import { STAGES as LOAN_STAGES, statusOf } from '../game/loan.js';
import { finaleLine, stillSilent, FINALE_CLOSE, FINALE_COUNT } from '../game/finale.js';
import { PLOT_STAGES, MAX_PLOT_STAGE, ISLE_PLOT_STAGES, MAX_ISLE_PLOT_STAGE } from '../game/plot.js';
import { HOUSE_STAGES, MAX_HOUSE_STAGE } from '../game/house.js';
import { MAX_OFFEN as MAX_ORDERS } from '../game/catalog.js';
import { wirkungVon } from '../game/decor.js';
import {
  wunschTitel, wunschText, wunschIcon, rangFuer, bisZumNaechstenRang,
} from '../game/wishes.js';
import { UI_SCALES } from './uiscale.js';
import { CROPS } from '../game/crops.js';
import { num, clamp, makeCanvas, ctx2d } from '../core/util.js';
import { TILE_DEF, TILE_SIZE } from '../art/tiles.js';
import { REGION_NAMES } from '../world/worldgen.js';
import { escapeHtml } from './ui.js';

const TITLES = {
  inventory: 'Tasche',
  quests: 'Aufgaben',
  craft: 'Werkbank',
  kitchen: 'Kochstelle',
  shop: 'Laden',
  campfire: 'Lagerfeuer',
  found: 'Fundbuch',
  stories: 'Erinnerungen',
  map: 'Karte',
  settings: 'Einstellungen',
  daybook: 'Gestern auf der Insel',
  mail: 'Post',
  storage: 'Vorratstruhe',
  plot: 'Dein Lager',
};

function ico(name, cls) {
  const url = iconUrl(name);
  return '<span class="ico ' + (cls || '') + '" style="background-image:url(' + url + ')"></span>';
}

/** Gemütlichkeitsstufe als Punktreihe – auf einen Blick lesbar, ohne Zahl. */
function cosyPips(level) {
  let h = '';
  for (let i = 0; i < COSY_MAX; i++) {
    h += '<i class="pip' + (i < level ? ' on' : '') + '"></i>';
  }
  return h;
}

export class Panels {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('panel-root');
    this.title = document.getElementById('panel-title');
    this.body = document.getElementById('panel-body');
    this.current = null;
    this.tab = null;
    this.selected = null;

    const self = this;
    document.getElementById('panel-close').addEventListener('click', function () { self.close(); });
    document.getElementById('panel-backdrop').addEventListener('click', function () { self.close(); });
    this.body.addEventListener('click', function (ev) { self._onClick(ev); });
  }

  isOpen() {
    return this.current !== null;
  }

  open(name) {
    if (!TITLES[name]) return;
    if (this.current === name) {
      this.close();
      return;
    }
    this.current = name;
    this.tab = null;
    this.selected = null;
    this.title.textContent = TITLES[name];
    this.root.hidden = false;
    this.render();
    this.game.audio.play('ui');
  }

  close() {
    if (!this.current) return;
    this.current = null;
    this.root.hidden = true;
    this.body.innerHTML = '';
  }

  render() {
    if (!this.current) return;
    const fn = this['_' + this.current];
    if (fn) this.body.innerHTML = fn.call(this);
    if (this.current === 'map') this._drawMap();
  }

  _onClick(ev) {
    const t = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!t) return;
    const act = t.getAttribute('data-act');
    const arg = t.getAttribute('data-arg');
    const g = this.game;
    const self2 = this;

    switch (act) {
      case 'tab':
        this.tab = arg;
        this.selected = null;
        this.render();
        break;
      case 'select':
        this.selected = this.selected === arg ? null : arg;
        this.render();
        break;
      case 'place':
        g.startPlacing(arg);
        this.close();
        break;
      case 'burn':
        g.burnItem(arg, 1);
        this.render();
        break;
      case 'burnAll':
        g.burnItem(arg, 99);
        this.selected = null;
        this.render();
        break;
      case 'craft':
        g.craftRecipe(arg);
        this.render();
        break;
      case 'cook':
        g.cookDish(arg);
        this.render();
        break;
      case 'eat':
        g.eatDish(arg);
        this.render();
        break;
      case 'buy':
        g.buyItem(arg);
        this.render();
        break;
      case 'sell':
        g.sellItem(arg, 1);
        this.render();
        break;
      case 'sellAll':
        g.sellItem(arg, 99);
        this.selected = null;
        this.render();
        break;
      case 'sort':
        g.inventory.sort();
        this.render();
        break;
      case 'nurFehlend':
        this.nurFehlend = !this.nurFehlend;
        this.render();
        break;
      case 'setting':
        g.changeSetting(arg, t.getAttribute('data-val'));
        this.render();
        break;
      case 'ausstattung':
        g.waehleAusstattung(t.getAttribute('data-val'));
        this.render();
        break;
      case 'petName':
        g.benennePet();
        this.render();
        break;
      case 'reset':
        g.confirmReset();
        break;
      case 'saveExport':
        g.exportSave();
        break;
      case 'saveImport':
        this._importSave();
        break;
      case 'saveLinkNew':
        this._linkSave(false);
        break;
      case 'saveLinkOpen':
        this._linkSave(true);
        break;
      case 'saveUnlink':
        unlink().then(function () { self2.render(); });
        break;
      case 'saveRelink':
        // Muss aus dem Klick heraus laufen: Erlaubnis gibt es nur mit Geste.
        requestLinkPermission().then(function (name) {
          self2.render();
          if (name) {
            g.save();
            g.ui.toast('Schreibt wieder in ' + name, 'icon_star', 'good');
          }
        });
        break;
      case 'letter':
        g.openLetter(arg);
        this.selected = arg;
        this.render();
        break;
      case 'toBox':
        g.moveToStorage(arg, 1);
        this.selected = arg;
        this.render();
        break;
      case 'toBoxAll':
        g.moveToStorage(arg, 999);
        this.render();
        break;
      case 'fromBox':
        g.moveFromStorage(arg, 1);
        this.selected = arg;
        this.render();
        break;
      case 'fromBoxAll':
        g.moveFromStorage(arg, 999);
        this.render();
        break;
      case 'payLoan':
        g.payLoanAmount(Number(arg));
        this.render();
        break;
      case 'expandPlot':
        g.expandPlot();
        this.render();
        break;
      case 'expandIslePlot':
        g.expandIslePlot();
        this.render();
        break;
      case 'moveHome':
        g.moveHome(arg);
        this.render();
        break;
      case 'buildHouse':
        g.buildHouse();
        this.render();
        break;
      case 'order':
        g.orderFromCatalog(arg);
        this.render();
        break;
      case 'close':
        this.close();
        break;
      default:
        break;
    }
  }

  /* ---------------- Tasche ---------------- */

  _inventory() {
    const g = this.game;
    const inv = g.inventory;
    const cats = inv.usedCategories();
    if (!cats.length) {
      return '<p class="empty-note">Deine Tasche ist leer.<br>Schau dich um – die Insel ist voller Kleinigkeiten.</p>';
    }
    const tab = this.tab && cats.indexOf(this.tab) >= 0 ? this.tab : cats[0];

    let html = '<div class="tabs">';
    for (let i = 0; i < cats.length; i++) {
      html += '<button class="tab" data-act="tab" data-arg="' + cats[i] + '" aria-selected="' +
        (cats[i] === tab) + '">' + CAT_NAMES[cats[i]] + '</button>';
    }
    html += '<button class="tab" data-act="sort" style="margin-left:auto">Sortieren</button>';
    html += '</div>';

    html += '<div class="grid">';
    const entries = inv.byCategory(tab);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const sel = this.selected === e.item.id ? ' sel' : '';
      html += '<button class="slot' + sel + '" data-act="select" data-arg="' + e.item.id + '" title="' +
        escapeHtml(e.item.name) + '">' +
        ico(e.item.icon, 'lg') +
        '<span class="cap">' + escapeHtml(e.item.name) + '</span>' +
        '<span class="qty">' + e.slot.n + '</span></button>';
    }
    html += '</div>';

    if (this.selected) {
      const item = getItem(this.selected);
      if (item) {
        html += '<div class="rows" style="margin-top:12px">';
        html += '<div class="row">' + ico(item.icon, 'lg') +
          '<div class="grow"><div class="title">' + escapeHtml(item.name) + '</div>' +
          '<div class="meta"><span>Anzahl: ' + inv.count(item.id) + '</span>' +
          (item.value ? '<span>' + ico('icon_coin') + ' ' + item.value + '</span>' : '') +
          (item.burn ? '<span>' + ico('icon_ember') + ' ' + item.burn + '</span>' : '') +
          (item.plant && CROPS[item.plant]
            ? '<span>' + ico('icon_day') + ' reif in ' + CROPS[item.plant].days + ' Tagen</span>' +
              '<span>' + ico('icon_' + CROPS[item.plant].yields[0]) + ' ' +
              CROPS[item.plant].amount[0] + '–' + CROPS[item.plant].amount[1] + '</span>'
            : '') +
          '</div></div>';
        if (item.prop) {
          html += '<button class="row-btn" data-act="place" data-arg="' + item.id + '">' +
            (item.plant ? 'Säen' : 'Aufstellen') + '</button>';
        }
        if (item.special === 'bridge') {
          html += '<span class="meta">Beim Kanal einsetzen</span>';
        }
        html += '</div></div>';
      }
    }

    html += '<p class="empty-note" style="padding-top:14px">' +
      inv.slots.length + ' / ' + inv.capacity + ' Plätze belegt</p>';
    return html;
  }

  /* ---------------- Erinnerungen ---------------- */

  /**
   * Die Langzeitgeschichte: je Geist vier Symbole.
   * Gefundene Stufen stehen farbig da, offene als Schattenriss – die Reihe
   * liest sich als Erinnerung, ganz ohne Text.
   */
  _stories() {
    const g = this.game;
    const book = g.stories;
    // Kurz halten: das Spiel erklärt sich sonst zu Tode
    let html = '<p class="empty-note" style="padding-bottom:10px">' +
      'Vier Fundstücke je Geist. Jedes erzählt ein Stück seiner Geschichte.</p>';

    html += this._finaleRows();

    html += '<div class="rows">';
    for (const id in SPIRITS) {
      const s = SPIRITS[id];
      const known = g.world.isUnlocked(s.region);
      const n = book.foundOf(id);
      const done = book.isComplete(id);
      html += '<div class="row story-row">' + ico('icon_ghost', 'lg') +
        '<div class="grow"><div class="title">' +
        escapeHtml(known ? s.name : 'Noch unbekannt') + '</div>' +
        '<div class="story-cards">';
      for (let k = 0; k < STAGES; k++) {
        const got = known && k < n;
        html += '<span class="story-card' + (got ? '' : ' unknown') + '">' +
          ico(got ? storyIcon(id, k) : 'icon_lock') + '</span>';
      }
      html += '</div>';
      // Die Sätze zu den gefundenen Stücken. Vier Symbole allein sagen einem
      // nicht, wer dieser Geist war – hier steht seine Geschichte, so weit
      // sie aufgedeckt ist, und man kann sie in Ruhe nachlesen.
      if (known && n > 0) {
        html += '<div class="story-text">';
        if (storyIntro(id)) html += '<p class="intro">' + escapeHtml(storyIntro(id)) + '</p>';
        for (let k = 0; k < n; k++) {
          const zeile = storyLine(id, k);
          if (zeile) html += '<p>' + escapeHtml(zeile) + '</p>';
        }
        if (done && storyClose(id)) {
          html += '<p class="close">' + escapeHtml(storyClose(id)) + '</p>';
        }
        html += '</div>';
      }
      html += '</div>';
      html += '<span class="row-btn ghost">' + (known ? n + '/' + STAGES : '–') + '</span>';
      html += '</div>';
      if (known && book.placed[id] >= 0) {
        html += '<div class="row"><span style="width:34px"></span>' + ico('icon_sparkle', 'lg') +
          '<div class="grow"><div class="meta"><span>Ein Stück wartet · ' +
          escapeHtml(REGION_NAMES[s.region]) + '</span></div></div></div>';
      }
      if (done) {
        const keep = getItem(keepsakeOf(id));
        if (keep) {
          html += '<div class="row"><span style="width:34px"></span>' + ico(keep.icon, 'lg') +
            '<div class="grow"><div class="meta"><span>' + escapeHtml(keep.name) +
            ' erhalten</span></div></div></div>';
        }
      }
    }
    html += '</div>';

    html += '<p class="empty-note" style="padding-top:14px">' +
      book.completeCount() + ' von ' + Object.keys(SPIRITS).length +
      ' Geschichten vollständig</p>';
    return html;
  }

  /* ---------------- Fundbuch ---------------- */

  /**
   * Was die Insel alles hergibt – und was davon schon durch die Tasche ging.
   * Noch nicht Gefundenes steht als Schattenriss da, damit man sieht, dass es
   * etwas gibt, aber nicht was.
   */
  _found() {
    const g = this.game;
    const inv = g.inventory;
    const tab = this.tab && SET_IDS.indexOf(this.tab) >= 0 ? this.tab : SET_IDS[0];
    const reihe = setById(tab);
    const stand = progressOf(tab, inv);
    const bezahlt = !!(g.state.collected && g.state.collected[tab]);

    let html = '<div class="tabs">';
    for (let i = 0; i < SETS.length; i++) {
      const p = progressOf(SETS[i].id, inv);
      html += '<button class="tab" data-act="tab" data-arg="' + SETS[i].id + '" aria-selected="' +
        (SETS[i].id === tab) + '">' + escapeHtml(SETS[i].name) +
        ' <span class="zaehler">' + p.have + '/' + p.total + '</span></button>';
    }
    // Ein Schalter für „zeig mir nur, was mir fehlt". Bei achtzehn Deko-
    // Stücken sucht man das eine leere Feld sonst mit dem Finger.
    html += '<button class="tab" data-act="nurFehlend" style="margin-left:auto"' +
      ' aria-selected="' + (!!this.nurFehlend) + '">Nur Fehlendes</button>';
    html += '</div>';

    // Kopfzeile der Reihe: wie weit, und was es dafür gibt. Ohne die Belohnung
    // ist das letzte Stück einer Reihe so viel wert wie das erste – und dann
    // sucht es niemand.
    const lohn = reihe.reward || {};
    let lohnText = [];
    if (lohn.coins) lohnText.push(ico('icon_coin') + ' ' + lohn.coins);
    if (lohn.ember) lohnText.push(ico('icon_ember') + ' ' + lohn.ember);
    for (let i = 0; lohn.items && i < lohn.items.length; i++) {
      const it = getItem(lohn.items[i].id);
      if (it) lohnText.push(ico(it.icon) + ' ' + lohn.items[i].n);
    }
    html += '<div class="rows" style="margin-bottom:10px"><div class="row' +
      (stand.done ? '' : ' dim') + '">' +
      ico(stand.done ? 'icon_check' : 'icon_quest', 'lg') +
      '<div class="grow"><div class="title">' + escapeHtml(reihe.name) + ' · ' +
      stand.have + ' von ' + stand.total + '</div>' +
      '<div class="meta"><span>' + escapeHtml(reihe.note) + '</span>' +
      (bezahlt ? '<span>' + ico('icon_check') + ' abgeholt</span>'
        : '<span>Vollständig: ' + lohnText.join(' ') + '</span>') +
      '</div>' +
      '<div class="bar" aria-hidden="true"><i style="width:' +
      Math.round(stand.have / Math.max(1, stand.total) * 100) + '%"></i></div>' +
      '</div></div></div>';

    html += '<div class="grid">';
    const alle = itemsOf(tab);
    const liste = this.nurFehlend
      ? alle.filter(function (it) { return !inv.everFound(it.id); })
      : alle;
    if (!liste.length) {
      html += '<p class="empty-note" style="grid-column:1/-1">' +
        (this.nurFehlend ? 'Diese Reihe ist vollständig.' : 'Hier gibt es nichts.') + '</p>';
    }
    for (let i = 0; i < liste.length; i++) {
      const item = liste[i];
      const have = inv.everFound(item.id);
      const n = have ? inv.found[item.id] : 0;
      html += '<button class="slot' + (have ? '' : ' unknown') +
        (this.selected === item.id ? ' sel' : '') + '"' +
        ' data-act="select" data-arg="' + item.id + '"' +
        ' title="' + escapeHtml(have ? item.name : hintFor(item.id)) + '">' +
        ico(item.icon, 'lg') +
        '<span class="cap">' + escapeHtml(have ? item.name : '???') + '</span>' +
        (have && n > 1 ? '<span class="qty">' + n + '</span>' : '') +
        '</button>';
    }
    html += '</div>';

    // Was fehlt, bekommt einen Fingerzeig. „???" allein sagt nur, DASS etwas
    // fehlt – der Reiz einer Sammlung kommt daher, dass man weiß, wohin.
    if (this.selected) {
      const item = getItem(this.selected);
      if (item && item.cat === tab) {
        const have = inv.everFound(item.id);
        html += '<div class="rows" style="margin-top:12px"><div class="row">' +
          ico(item.icon, 'lg') +
          '<div class="grow"><div class="title">' +
          escapeHtml(have ? item.name : 'Noch nicht gefunden') + '</div>' +
          '<div class="meta"><span>' + escapeHtml(hintFor(item.id)) + '</span>' +
          (have ? '<span>Insgesamt: ' + inv.found[item.id] + '</span>' +
            '<span>In der Tasche: ' + inv.count(item.id) + '</span>' : '') +
          // Bei Fischen zählt nicht nur, DASS man einen hatte, sondern wie
          // groß der beste war. Das ist der Grund, dieselbe Art nochmal zu
          // angeln.
          (item.cat === CAT.FISH && bestSize(g.state.records, item.id)
            ? '<span>' + ico('icon_star') + ' größter: ' +
              bestSize(g.state.records, item.id) + ' cm</span>' +
              '<span>möglich bis ' + spanneFuer(item.id)[1] + ' cm</span>'
            : '') +
          (item.value ? '<span>' + ico('icon_coin') + ' ' + item.value + '</span>' : '') +
          '</div></div></div></div>';
      }
    }

    const gesamt = totalProgress(inv);
    html += '<p class="empty-note" style="padding-top:14px">' +
      gesamt.have + ' von ' + gesamt.total + ' Dingen gefunden' +
      (g.state.caught ? ' · ' + g.state.caught + ' Fische geangelt' : '') +
      // `bugsCaught` wurde bei jedem Kescherschlag hochgezählt und NIRGENDS
      // gelesen – eine Zahl, die das Spiel führte und niemand je sah. Jetzt
      // steht sie neben den Fischen, wo sie hingehört.
      (g.state.bugsCaught ? ' · ' + g.state.bugsCaught + ' Falter gefangen' : '') + '</p>';
    return html;
  }

  /* ---------------- Aufgaben ---------------- */

  /**
   * Die Wunschplätze.
   *
   * Über den Tagesbitten und nicht darunter: Sie laufen nicht ab, aber sie
   * sind das, was nach hundert Prozent bleibt – und wer sie unter zwanzig
   * Bitten sucht, findet sie nie.
   *
   * Angezeigt wird auch, WIE WEIT der Wunsch ist. „Ein Platz zum Sitzen am
   * Wasser" ohne Rückmeldung ist Raten; „Gemütlichkeit 9 von 14" sagt, dass
   * die Bank richtig steht und noch etwas danebengehört.
   */
  _wuensche() {
    const g = this.game;
    if (!g.wuenschenSchon || !g.wuenschenSchon()) return '';
    const offen = g.wishes();
    const erfuellt = (g.state.wishes && g.state.wishes.erfuellt) || 0;

    // Der Rang ist kein Rang mit Rechten, nur ein Wort – aber bei einer
    // Beschäftigung, die nie fertig wird, ist er die einzige Form von
    // Fortschritt, die man aufschreiben kann, ohne sie zu beenden.
    const rang = rangFuer(erfuellt);
    const bis = bisZumNaechstenRang(erfuellt);
    let html = '<h3 style="font-size:0.95em;margin:4px 0 8px">Wunschplätze' +
      (erfuellt ? ' <span class="cap">' + erfuellt + ' erfüllt</span>' : '') + '</h3>';
    if (erfuellt) {
      html += '<p class="empty-note" style="margin:0 0 8px">' +
        escapeHtml(rang.name) +
        (bis ? ' · noch ' + bis + (bis === 1 ? ' Wunsch' : ' Wünsche') : '') + '</p>';
    }
    if (!offen.length) {
      return html + '<p class="empty-note" style="margin-bottom:12px">' +
        'Gerade wünscht sich niemand etwas.</p>';
    }
    html += '<div class="rows" style="margin-bottom:14px">';
    for (let i = 0; i < offen.length; i++) {
      const w = offen[i];
      const spirit = SPIRITS[w.spirit];
      const stand = g.wunschStand ? g.wunschStand(w) : null;
      // Die Forderung steht im Wunsch selbst – sie wächst mit der Zahl der
      // erfüllten, und ein liegen gelassener Wunsch behält seine.
      const soll = stand ? stand.soll : null;
      let fortschritt = '';
      if (stand && soll) {
        if (soll.charme > 0) {
          fortschritt = '<span' + (stand.charme >= soll.charme ? '' : ' class="warn"') + '>' +
            'Gemütlichkeit ' + stand.charme + '/' + soll.charme + '</span>';
        } else if (soll.stueck > 1) {
          fortschritt = '<span' + (stand.stueck >= soll.stueck ? '' : ' class="warn"') + '>' +
            stand.stueck + '/' + soll.stueck + ' Stück beieinander</span>';
        } else if (soll.dazu) {
          fortschritt = '<span' + (stand.dabei ? '' : ' class="warn"') + '>' +
            (stand.dabei ? 'beides steht beieinander' : 'das Zweite fehlt noch') + '</span>';
        }
      }
      html += '<div class="row">' + ico(wunschIcon(w), 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(wunschTitel(w)) + '</div>' +
        '<div class="meta"><span>' + escapeHtml(wunschText(w)) + '</span>' +
        (spirit ? '<span>' + escapeHtml(spirit.name) + '</span>' : '') +
        fortschritt +
        '</div></div></div>';
    }
    return html + '</div>';
  }

  _quests() {
    const g = this.game;
    const quests = g.quests.active();
    let html = '';

    // Was für ein Tag heute ist, steht ganz oben – nicht versteckt in einer
    // Meldung, die nach vier Sekunden weg ist.
    const heute = g.today;
    if (heute) {
      // Jahreszeit und Wetter stehen daneben: Beide entscheiden inzwischen
      // mit, was heute beißt und fliegt – dann müssen sie auch ablesbar sein
      // und nicht nur am Himmel zu erraten.
      const wetter = g.weather ? g.weather.label : '';
      // Der Wetterhahn sagt an, was morgen wird – wenn einer steht. Das ist
      // seine ganze Wirkung, und sie gehört genau hierhin: neben das Wetter
      // von heute, nicht in ein eigenes Fenster.
      const morgen = g.morgenWetter ? g.morgenWetter() : null;
      // Wer heute Geburtstag hat, steht ganz oben – über allem anderen. Er
      // kommt einmal im Jahr und lässt sich nicht herbeispielen; wer ihn
      // erst abends im Vorbeigehen entdeckt, hat ihn verpasst.
      const kind = birthdayOn(new Date());
      if (kind) {
        html += '<div class="rows" style="margin-bottom:12px"><div class="row">' +
          ico('icon_heart', 'lg') +
          '<div class="grow"><div class="title">' +
          escapeHtml(kind.name) + ' hat heute Geburtstag</div>' +
          '<div class="meta"><span>Ein Geschenk zählt heute dreifach.</span>' +
          '<span>' + ico('icon_' + kind.favourite) + ' mag am liebsten ' +
          escapeHtml((getItem(kind.favourite) || {}).name || kind.favourite) +
          '</span></div></div></div></div>';
      }
      html += '<div class="rows" style="margin-bottom:12px"><div class="row">' +
        ico(heute.event ? heute.event.icon : 'icon_day', 'lg') +
        '<div class="grow"><div class="title">' +
        escapeHtml(heute.event ? heute.event.name : 'Ein ruhiger Tag') +
        ' · ' + escapeHtml(heute.season.name) +
        (wetter ? ' · ' + escapeHtml(wetter) : '') + '</div>' +
        '<div class="meta"><span>' +
        escapeHtml(heute.event ? heute.event.hint : 'Nichts Besonderes – auch das gibt es.') +
        '</span>' +
        (morgen ? '<span>' + ico('icon_day') + ' morgen ' + escapeHtml(morgen.name) + '</span>' : '') +
        '</div></div></div></div>';
    }

    html += this._wuensche();

    if (!quests.length) {
      html += '<p class="empty-note">Gerade nichts offen.<br>Schlaf im Zelt – morgen gibt es Neues.</p>';
    } else {
      html += '<div class="rows">';
      for (let i = 0; i < quests.length; i++) {
        const q = quests[i];
        const spirit = SPIRITS[q.spirit];
        const have = g.quests.progress(q, g);
        const done = have >= q.need;
        // Frist nur zeigen, solange sie noch offen ist: Fertiges läuft nicht
        // ab, da wäre die Zahl eine Drohung ohne Grund.
        const rest = done ? null : daysLeft(q, g.day.day);
        const frist = rest == null ? ''
          : '<span' + (rest <= 1 ? ' class="warn"' : '') + '>' + ico('icon_day') + ' ' +
            (rest <= 0 ? 'heute' : rest === 1 ? 'noch 1 Tag' : 'noch ' + rest + ' Tage') + '</span>';
        // Bei einer Sammelbitte sagt „2/4" nicht, WELCHE zwei noch fehlen.
        // Darum stehen die Sorten einzeln da, erledigte blass.
        let sorten = '';
        if (q.type === QTYPE.SET && q.items) {
          sorten = '<div class="parts">';
          for (let k = 0; k < q.items.length; k++) {
            const da = g.inventory.count(q.items[k]) > 0;
            const it = getItem(q.items[k]);
            sorten += '<span class="part' + (da ? ' got' : '') + '">' +
              ico('icon_' + q.items[k]) + ' ' + escapeHtml(it ? it.name : q.items[k]) + '</span>';
          }
          sorten += '</div>';
        }
        // Beim Botengang ist der Weg die Aufgabe: von wem, zu wem.
        const wer = q.type === QTYPE.DELIVER && SPIRITS[q.turnInAt]
          ? escapeHtml(spirit.name) + ' → ' + escapeHtml(SPIRITS[q.turnInAt].name)
          : escapeHtml(spirit.name);
        html += '<div class="row' + (done ? '' : '') + '">' +
          ico(questIcon(q), 'lg') +
          '<div class="grow">' +
          '<div class="title">' + escapeHtml(questTitle(q)) + ' · ' + have + '/' + q.need + '</div>' +
          sorten +
          '<div class="meta"><span>' + wer + '</span>' +
          '<span>' + ico('icon_coin') + ' ' + q.rewards.coins + '</span>' +
          '<span>' + ico('icon_ember') + ' ' + q.rewards.ember + '</span>' +
          frist +
          (q.type === QTYPE.FIND ? '<span>' + escapeHtml(regionHint(spirit.region)) + '</span>' : '') +
          '</div></div>' +
          (done ? '<span class="row-btn ghost">' + ico('icon_check') + ' fertig</span>' : '') +
          '</div>';
      }
      html += '</div>';
      html += '<p class="empty-note">Fertige Aufgaben gibst du beim Geist ab (Taste E).</p>';
    }

    html += this._milestones();

    html += '<h3 style="font-size:0.95em;margin:16px 0 8px">Die Geister</h3><div class="rows">';
    for (const id in SPIRITS) {
      const s = SPIRITS[id];
      if (!g.world.isUnlocked(s.region)) continue;
      const doneN = g.quests.completedBySpirit[id] || 0;
      const lvl = friendshipLevel(doneN);
      const cosy = g.cosyOf(id);
      // Beide Stufen sollen sichtbar etwas bewirken, nicht nur Zahlen sein
      const bonus = Math.round(lvl * 9 + cosy.level * 11);
      const next = pointsToNext(cosy.points);
      html += '<div class="row">' + ico('icon_ghost', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(s.name) + '</div>' +
        '<div class="meta"><span>' + escapeHtml(s.role) + '</span>' +
        '<span>' + ico('icon_heart') + ' Stufe ' + lvl + '</span>' +
        '<span title="Gemütlichkeit: Deko in seiner Nähe">' + ico('icon_flowerbed') + ' ' +
        cosy.points + (next ? ' (+' + next + ')' : ' · voll') + '</span>' +
        (bonus ? '<span>+' + bonus + '% Lohn</span>' : '') + '</div>' +
        '<div class="cosy-bar" aria-hidden="true">' + cosyPips(cosy.level) + '</div></div>' +
        '<span class="row-btn ghost">' + Math.round(friendshipProgress(doneN) * 100) + '%</span></div>';
    }
    html += '</div>';
    return html;
  }

  /**
   * Der letzte Abend, zum Nachlesen.
   *
   * Die Schlusssätze fallen sonst mit ihrer Sprechblase weg – und das sind
   * die sieben Sätze, auf die alles zuläuft. Solange der Abend noch offen
   * ist, steht hier, wer noch wartet.
   */
  _finaleRows() {
    const g = this.game;
    const f = g.state.finale;
    if (!f) return '';

    const fehlen = stillSilent(f.heard);
    let html = '<h3 style="font-size:0.95em;margin:4px 0 8px">Der letzte Abend</h3>';
    html += '<div class="rows" style="margin-bottom:14px">';
    if (!f.done) {
      html += '<div class="row">' + ico('icon_heart', 'lg') +
        '<div class="grow"><div class="title">Alle sind am Feuer</div>' +
        '<div class="meta"><span>Noch ' + fehlen.length + ' von ' + FINALE_COUNT +
        ': ' + escapeHtml(fehlen.map(function (id) {
          return SPIRITS[id] ? SPIRITS[id].name : id;
        }).join(', ')) + '</span></div></div></div>';
    }
    for (const id in SPIRITS) {
      if (!finaleLine(id)) continue;
      const gehoert = !!(f.heard && f.heard[id]);
      html += '<div class="row' + (gehoert ? '' : ' dim') + '">' + ico('icon_ghost', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(SPIRITS[id].name) + '</div>' +
        '<div class="brief">' +
        (gehoert ? escapeHtml(finaleLine(id)) : 'Wartet am Feuer.') +
        '</div></div></div>';
    }
    if (f.done) {
      html += '<div class="row">' + ico('icon_star', 'lg') +
        '<div class="grow"><div class="title">Die Insel</div>' +
        '<div class="brief">' + escapeHtml(FINALE_CLOSE) + '</div></div></div>';
    }
    html += '</div>';
    return html;
  }

  /* ---------------- Dein Lager ---------------- */

  /**
   * Das Grundstück: wie groß, was darauf steht, und was der Ausbau kostet.
   *
   * Die wichtigste Zeile ist die über das Nachwachsen. Sie ist der Grund,
   * warum man hier überhaupt etwas anlegen kann, und sie steht nirgends
   * sonst – ohne sie fällt man drei Bäume und wundert sich am dritten
   * Morgen.
   */
  _plot() {
    const g = this.game;
    const stand = g.plotStatus();
    const inhalt = g.plotContents();
    const b = stand.bounds;
    const breite = b.x1 - b.x0 + 1;
    const hoehe = b.y1 - b.y0 + 1;

    let html = '<div class="rows"><div class="row">' + ico('icon_flowerbed', 'lg') +
      '<div class="grow"><div class="title">' + escapeHtml(stand.name) + ' · ' +
      breite + ' × ' + hoehe + ' Kacheln</div>' +
      '<div class="meta"><span>Stufe ' + stand.stufe + ' von ' + MAX_PLOT_STAGE + '</span>' +
      '<span>' + ico('icon_lantern') + ' ' + inhalt.deko + ' aufgestellt</span>' +
      '<span>' + ico('icon_seed_berry') + ' ' + inhalt.beete + ' Beete</span>' +
      '<span>' + ico('icon_axe') + ' ' + inhalt.wild + ' noch im Weg</span>' +
      '</div></div></div></div>';

    html += '<p class="empty-note" style="padding:12px 0">' +
      'Innerhalb der gestrichelten Linie <b>wächst nichts nach</b>. Was du hier ' +
      'fällst und wegräumst, bleibt weg – und nur hier darfst du dicht ans Lager bauen.' +
      '</p>';

    html += '<h3 style="font-size:0.95em;margin:6px 0 8px">Ausbau</h3><div class="rows">';
    for (let i = 0; i < PLOT_STAGES.length; i++) {
      const st = PLOT_STAGES[i];
      const steht = st.id <= stand.stufe;
      const dran = stand.naechste && st.id === stand.naechste.id;
      const kann = dran && g.state.ember >= st.ember;
      html += '<div class="row' + (steht || dran ? '' : ' dim') + '">' +
        ico(steht ? 'icon_check' : 'icon_flowerbed', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(st.name) + ' · ' +
        (st.halfW * 2 + 1) + ' × ' + (st.halfH * 2 + 1) + '</div>' +
        '<div class="meta"><span>' + escapeHtml(st.note) + '</span>' +
        (st.ember ? '<span>' + ico('icon_ember') + ' ' + st.ember + '</span>' : '') +
        '</div></div>' +
        (steht ? '<span class="row-btn ghost">' + ico('icon_check') + '</span>'
          : dran ? '<button class="row-btn" data-act="expandPlot"' +
            (kann ? '' : ' disabled') + '>Ausbauen</button>' : '') +
        '</div>';
    }
    html += '</div>';
    html += this._pet();
    html += this._islePlot();
    html += this._house();
    return html;
  }

  /**
   * Das Haustier.
   *
   * Zeigt nur, was gerade zählt: ob ein Napf steht, wie weit der Streuner
   * ist, und ob heute gefüttert wurde. Keine Knöpfe – gefüttert wird beim
   * Tier, nicht in einem Fenster. Ein Menü, aus dem man sein Tier bedient,
   * wäre eine Verwaltung.
   */
  _pet() {
    const g = this.game;
    const stand = g.petStatus();
    let html = '<h3 style="font-size:0.95em;margin:18px 0 8px">Dein Haustier</h3>';

    if (!stand.napf && !stand.zahm) {
      return html + '<p class="empty-note" style="padding:4px 0 10px">' +
        'Stell einen <b>Futternapf</b> auf – es gibt ihn im Katalog beim Händler. ' +
        'Wer dann vorbeikommt, entscheidet die Insel.</p>';
    }
    if (stand.streuner) {
      return html + '<div class="rows"><div class="row">' +
        ico('icon_heart', 'lg') +
        '<div class="grow"><div class="title">Ein Streuner am Napf</div>' +
        '<div class="meta"><span>' + stand.fortschritt + ' von ' + ZAHM_NOETIG +
        ' Mal gefüttert</span>' +
        '<span>' + (stand.hungrig
          ? (stand.futter ? 'Hat Hunger – du hast etwas dabei' : 'Hat Hunger')
          : 'Heute schon gefressen') + '</span>' +
        '</div></div></div></div>' +
        '<p class="empty-note" style="padding:8px 0 0">Es frisst Fisch am liebsten, ' +
        'Beeren und Pilze gehen auch. Bleibt der Napf stehen, kommt es wieder.</p>';
    }

    return html + '<div class="rows"><div class="row">' +
      ico('icon_heart', 'lg') +
      '<div class="grow"><div class="title">' + escapeHtml(stand.name) + '</div>' +
      '<div class="meta">' +
      // Erst wenn es benannt ist, muss dabeistehen, WAS es ist – vorher sagt
      // der Titel es schon („Deine Katze").
      (stand.benannt ? '<span>' + (stand.art === 'dog' ? 'Hund' : 'Katze') + '</span>' : '') +
      '<span>' + escapeHtml(launeWort(stand.laune)) + '</span>' +
      '<span>' + (stand.hungrig ? 'noch nicht gefüttert' : 'heute gefüttert') + '</span>' +
      '<span>' + (stand.suchtNoch ? 'sucht noch etwas' : 'hat heute schon gesucht') +
      '</span></div></div>' +
      '<button class="row-btn ghost" data-act="petName">' +
      (stand.benannt ? 'Umbenennen' : 'Namen geben') + '</button></div></div>' +
      '<p class="empty-note" style="padding:8px 0 0">' +
      'Einmal am Tag findet es dir etwas – eine Grabstelle oder ein verstecktes ' +
      'Stück. Hungrig sucht es nicht. Und wenn du stehen bleibst, sucht es sich ' +
      'ein Möbelstück.</p>';
  }

  /**
   * Die Bucht auf der Stillen Insel – der zweite Bauplatz.
   *
   * Steht im selben Fenster wie das Lager, weil es dieselbe Sache ist: Platz,
   * auf dem nichts nachwächst. Vor dem Inselmeilenstein ist sie sichtbar,
   * aber zu – wer nicht weiß, dass es sie gibt, spart nicht darauf.
   */
  _islePlot() {
    const g = this.game;
    const stand = g.islePlotStatus();
    const inhalt = g.islePlotContents();

    let html = '<h3 style="font-size:0.95em;margin:18px 0 8px">Die Bucht auf der Insel</h3>';
    if (!stand.offen) {
      return html + '<p class="empty-note" style="padding:4px 0 10px">' +
        'Drüben auf der Stillen Insel liegt eine Bucht, in der nichts steht. ' +
        'Sie gehört dir, sobald die Insel offen ist.</p>';
    }

    if (stand.stufe) {
      const b = stand.bounds;
      html += '<div class="rows"><div class="row">' + ico('icon_boat', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(stand.name) + ' · ' +
        (b.x1 - b.x0 + 1) + ' × ' + (b.y1 - b.y0 + 1) + ' Kacheln</div>' +
        '<div class="meta"><span>Stufe ' + stand.stufe + ' von ' + MAX_ISLE_PLOT_STAGE + '</span>' +
        '<span>' + ico('icon_lantern') + ' ' + inhalt.deko + ' aufgestellt</span>' +
        '<span>' + ico('icon_axe') + ' ' + inhalt.wild + ' noch im Weg</span>' +
        '</div></div></div></div>';
    } else {
      html += '<p class="empty-note" style="padding:4px 0 10px">' +
        'Kein Feuer, keine Werkbank, kein Händler – und niemandes Möbel im Weg. ' +
        'Bezahlt wird in Münzen.</p>';
    }

    html += '<div class="rows">';
    for (let i = 0; i < ISLE_PLOT_STAGES.length; i++) {
      const st = ISLE_PLOT_STAGES[i];
      const steht = st.id <= stand.stufe;
      const dran = stand.naechste && st.id === stand.naechste.id;
      const kann = dran && g.state.coins >= st.coins;
      html += '<div class="row' + (steht || dran ? '' : ' dim') + '">' +
        ico(steht ? 'icon_check' : 'icon_boat', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(st.name) + ' · ' +
        (st.halfW * 2 + 1) + ' × ' + (st.halfH * 2 + 1) + '</div>' +
        '<div class="meta"><span>' + escapeHtml(st.note) + '</span>' +
        '<span class="cost' + (kann || steht ? '' : ' miss') + '">' +
        ico('icon_coin') + ' ' + num(st.coins) + '</span>' +
        '</div></div>' +
        (steht ? '<span class="row-btn ghost">' + ico('icon_check') + '</span>'
          : dran ? '<button class="row-btn" data-act="expandIslePlot"' +
            (kann ? '' : ' disabled') + '>' + (stand.stufe ? 'Ausbauen' : 'Kaufen') + '</button>'
            : '') +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /**
   * Das Zuhause: vom Zelt zum Haus mit Veranda.
   *
   * Steht im selben Fenster wie das Grundstück – beide gehören zum Lager,
   * und wer das eine ausbaut, denkt ohnehin ans andere. Bezahlt wird in
   * Material: Münzen ziehen an der Vorratstruhe, Glut am Grundstück.
   */
  _house() {
    const g = this.game;
    const stand = g.houseStatus();
    const tasche = g.inventory;

    let html = '<h3 style="font-size:0.95em;margin:18px 0 8px">Dein Zuhause</h3>' +
      '<div class="rows">';
    for (let i = 0; i < HOUSE_STAGES.length; i++) {
      const st = HOUSE_STAGES[i];
      const steht = st.id <= stand.stufe;
      const dran = stand.naechste && st.id === stand.naechste.id;
      // Material erst nennen, wenn es dran ist: Sonst liest man am ersten Tag
      // eine Einkaufsliste über vier Stufen und legt das Spiel weg.
      let kosten = '';
      if (dran) {
        for (let k = 0; k < st.cost.length; k++) {
          const c = st.cost[k];
          const habe = tasche.count(c.id);
          // Nicht nur die Zahl, die man braucht, sondern auch die, die man
          // hat: Beim Haus sammelt man tagelang darauf hin, und ohne den
          // Stand rennt man nach jedem Baum die Werkbank ansehen.
          kosten += '<span class="cost' + (habe >= c.n ? '' : ' miss') + '">' +
            ico(getItem(c.id).icon) + habe + '/' + c.n + '</span>';
        }
      }
      html += '<div class="row' + (steht || dran ? '' : ' dim') + '">' +
        ico(steht ? 'icon_check' : 'icon_hammer', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(st.name) + '</div>' +
        '<div class="meta"><span>' + escapeHtml(st.note) + '</span>' + kosten +
        '</div></div>' +
        (steht ? '<span class="row-btn ghost">' + ico('icon_check') + '</span>'
          : dran ? '<button class="row-btn" data-act="buildHouse"' +
            (stand.fehlt.length ? ' disabled' : '') + '>Bauen</button>' : '') +
        '</div>';
    }
    html += '</div>';
    if (stand.fertig) {
      html += '<p class="empty-note" style="padding:10px 0">' +
        'Stufe ' + stand.stufe + ' von ' + MAX_HOUSE_STAGE + ' – mehr wird es nicht. ' +
        'Es reicht auch.</p>';
    }
    html += this._zimmer();
    return html;
  }

  /**
   * Das Zimmer.
   *
   * Drei Zahlen und ein Wort: wie es heißt, wie viel drinsteht, wie gemütlich
   * es ist. Keine Knöpfe – eingerichtet wird drinnen, nicht in einem Fenster.
   * Dieselbe Haltung wie beim Haustier.
   */
  _zimmer() {
    const g = this.game;
    const raum = g.raum();
    const punkte = g.wohnPunkte();
    const stufe = wohnStufe(punkte);
    const bis = bisZurNaechstenWohnstufe(punkte);
    const bonus = wohnBonus(punkte);
    const gruppen = g.wohnGruppen();
    let gebunden = 0;
    for (let i = 0; i < gruppen.length; i++) gebunden += gruppen[i].n;
    const raeume = g.raeume();
    const hier = g.raumIndex();

    // Eine Zeile je Raum. Das Zuhause ist die Summe – die Wohnstufe steht
    // deshalb einmal oben und nicht an jedem Raum. Die Stückzahlen stehen
    // getrennt: Wie voll die Kammer ist, sagt nichts darüber, wie voll das
    // Zimmer ist.
    const zeilen = raeume.map(function (r, i) {
      const stuecke = g.innenStuecke(i).length;
      const wand = g.innenWand(i).length;
      return '<div class="row' + (g.drinnen() && i !== hier ? ' dim' : '') + '">' +
        ico(i === 0 ? 'icon_flowerbed' : 'icon_bookstack', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(r.name) +
        (g.drinnen() && i === hier ? ' · hier' : '') + '</div>' +
        '<div class="meta">' +
        '<span>' + stuecke + ' von ' + maxStuecke(r) + ' Stücken</span>' +
        (wand ? '<span>' + wand + ' an der Wand</span>' : '') +
        '<span>' + escapeHtml(g.ausstattung(i).name) + '</span>' +
        '</div></div></div>';
    }).join('');

    return '<h3 style="font-size:0.95em;margin:18px 0 8px">Dein Zuhause</h3>' +
      '<div class="rows"><div class="row">' + ico('icon_heart', 'lg') +
      '<div class="grow"><div class="title">' + escapeHtml(stufe.name) + '</div>' +
      '<div class="meta">' +
      // Gruppen nur nennen, wenn es welche gibt: Eine Zeile „0 Gruppen" wäre
      // ein Vorwurf, und drinnen gibt es keine.
      (gruppen.length
        ? '<span>' + gruppen.length + (gruppen.length === 1 ? ' Gruppe' : ' Gruppen') +
          ' · +' + gebunden * GRUPPE_BONUS + '</span>'
        : '') +
      (bis != null
        ? '<span>noch ' + bis + ' bis „' + escapeHtml(wohnStufe(punkte + bis).name) + '"</span>'
        : '<span>schöner geht es nicht</span>') +
      (bonus > 0 ? '<span>färbt ' + bonus + ' Punkte weiter</span>' : '') +
      '</div></div></div>' + zeilen + '</div>' +
      // Wand und Boden: die eine Entscheidung im Zimmer, die nicht aus der
      // Tasche kommt. Kostet nichts – drinnen soll nichts Pflicht sein.
      //
      // Sie gilt für den Raum, in dem man GERADE steht. Deshalb steht sein
      // Name darüber: Wer in der Kammer Abendblau wählt, soll nicht später
      // im Zimmer danach suchen.
      '<h3 style="font-size:0.95em;margin:18px 0 8px">Wand und Boden · ' +
      escapeHtml(raum.name) + '</h3>' +
      '<div class="rows" style="margin-top:8px">' +
      AUSSTATTUNG.map(function (a) {
        const jetzt = a.id === g.ausstattung().id;
        return '<div class="row' + (jetzt ? '' : ' dim') + '">' +
          '<span class="ico lg" style="background:' + a.wand +
          ';border:2px solid ' + a.leiste + ';box-shadow:inset 0 -9px 0 ' + a.boden + '"></span>' +
          '<div class="grow"><div class="title">' + escapeHtml(a.name) + '</div></div>' +
          (jetzt
            ? '<span class="row-btn ghost">' + ico('icon_check') + '</span>'
            : '<button class="row-btn" data-act="ausstattung" data-val="' + a.id +
              '">Nehmen</button>') +
          '</div>';
      }).join('') +
      '</div>' +
      '<p class="empty-note" style="padding:8px 0 0">' +
      'Am Haus <b>E</b> drücken, dann bist du drinnen. Hinstellen wie draußen – ' +
      'aus der Tasche auswählen, auf Sitzmöbel setzt du dich. Bilder und ' +
      'Kränze hängen an der Rückwand. Am Bett wird geschlafen, an der Tür ' +
      'geht es wieder hinaus.<br>Was auf einem Teppich steht, gehört ' +
      'zusammen und zählt doppelt – bis zu drei Stücke je Teppich.' +
      (raeume.length > 1
        ? '<br>Oben rechts in der Wand geht es weiter in ' +
          escapeHtml(raeume[1].name) + ' – eigene Möbel, eigene Wand, eigener Boden.'
        : '') +
      '</p>';
  }

  /* ---------------- Vorratstruhe ---------------- */

  /**
   * Tasche links, Truhe rechts.
   *
   * Ein Klick schiebt ein Stück, ein Klick auf „alle" den ganzen Stapel.
   * Kein Ziehen: Das funktioniert auf einem Telefon nicht verlässlich, und
   * das Spiel soll auf beiden laufen.
   */
  _storage() {
    const g = this.game;
    const box = g.storage;
    const stand = statusOf(g.state.loan);
    if (!box || stand.stage < 1) {
      return '<p class="empty-note">Noch keine Truhe.<br>' +
        'Der Händler baut dir eine – frag ihn danach.</p>';
    }

    let html = '<p class="empty-note" style="padding:0 0 10px">' +
      (stand.naechste ? LOAN_STAGES[stand.stage - 1].name : 'Der Schuppen') +
      ' · ' + (box.capacity - box.freeSlots()) + ' von ' + box.capacity + ' Fächern belegt</p>';

    html += '<div class="halb">';
    for (const seite of ['tasche', 'truhe']) {
      const quelle = seite === 'tasche' ? g.inventory : box;
      const eintraege = quelle.byCategory(null);
      html += '<div class="haelfte"><h3>' +
        (seite === 'tasche' ? 'Tasche' : 'Truhe') + '</h3><div class="grid">';
      if (!eintraege.length) {
        html += '<p class="empty-note" style="grid-column:1/-1">Leer.</p>';
      }
      for (let i = 0; i < eintraege.length; i++) {
        const e = eintraege[i];
        const act = seite === 'tasche' ? 'toBox' : 'fromBox';
        html += '<button class="slot' + (this.selected === e.item.id ? ' sel' : '') +
          '" data-act="' + act + '" data-arg="' + e.item.id + '"' +
          ' title="' + escapeHtml(e.item.name) + '">' +
          ico(e.item.icon, 'lg') +
          '<span class="cap">' + escapeHtml(e.item.name) + '</span>' +
          '<span class="qty">' + e.slot.n + '</span></button>';
      }
      html += '</div></div>';
    }
    html += '</div>';

    if (this.selected) {
      const item = getItem(this.selected);
      if (item) {
        html += '<div class="rows" style="margin-top:10px"><div class="row">' +
          ico(item.icon, 'lg') +
          '<div class="grow"><div class="title">' + escapeHtml(item.name) + '</div>' +
          '<div class="meta"><span>Tasche: ' + g.inventory.count(item.id) + '</span>' +
          '<span>Truhe: ' + box.count(item.id) + '</span></div></div>' +
          '<button class="row-btn" data-act="toBoxAll" data-arg="' + item.id + '">alle hinein</button>' +
          '<button class="row-btn" data-act="fromBoxAll" data-arg="' + item.id + '">alle heraus</button>' +
          '</div></div>';
      }
    }
    return html;
  }

  /** Der Ausbau – Teil des Ladens, denn der Händler baut ihn. */
  /**
   * Der Katalog: bestellen, warten, auspacken.
   *
   * Gesperrtes bleibt stehen, aber ohne Preis. Wer am ersten Tag eine Seite
   * mit fünf Zeilen sieht, hält den Katalog für vollständig; wer die Schaukel
   * durchgestrichen sieht, weiß, dass es weitergeht.
   */
  _catalogRows() {
    const g = this.game;
    const eintraege = g.catalog();
    const unterwegs = g.openOrders();

    let html = '<p class="empty-note" style="padding:0 0 10px">' +
      'Bezahlt wird sofort, geliefert am nächsten Morgen in den Briefkasten. ' +
      'Höchstens ' + MAX_ORDERS + ' Bestellungen gleichzeitig.</p>';

    if (unterwegs.length) {
      html += '<div class="rows" style="margin-bottom:12px">';
      for (let i = 0; i < unterwegs.length; i++) {
        const b = unterwegs[i];
        const tage = b.ab - g.day.day;
        html += '<div class="row">' + ico('icon_mailbox', 'lg') +
          '<div class="grow"><div class="title">' + escapeHtml(b.name) + ' unterwegs</div>' +
          '<div class="meta"><span>' +
          (tage <= 0 ? 'liegt im Kasten' : tage === 1 ? 'morgen früh' : 'in ' + tage + ' Tagen') +
          '</span></div></div></div>';
      }
      html += '</div>';
    }

    html += '<div class="rows">';
    for (let i = 0; i < eintraege.length; i++) {
      const e = eintraege[i];
      const reicht = g.state.coins >= e.preis;
      const platz = unterwegs.length < MAX_ORDERS;
      const kann = e.offen && reicht && platz;
      html += '<div class="row' + (e.offen ? '' : ' dim') + '">' +
        ico(e.offen ? e.icon : 'icon_lock', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(e.name) + '</div>' +
        '<div class="meta">' +
        (e.offen
          ? '<span class="cost' + (reicht ? '' : ' miss') + '">' +
            ico('icon_coin') + ' ' + num(e.preis) + '</span>'
          : '<span>Noch nicht im Katalog</span>') +
        // Was das Stück TUT, direkt neben dem Preis. Eine Vogeltränke für
        // 285 Münzen, von der man erst nach dem Auspacken erfährt, wofür sie
        // gut ist, kauft man nicht – oder einmal und dann nie wieder.
        (wirkungVon(e.id) ? '<span>' + escapeHtml(wirkungVon(e.id)) + '</span>' : '') +
        '</div></div>' +
        (e.offen
          ? '<button class="row-btn" data-act="order" data-arg="' + e.id + '"' +
            (kann ? '' : ' disabled') + '>Bestellen</button>'
          : '<span class="row-btn ghost">' + ico('icon_lock') + '</span>') +
        '</div>';
    }
    html += '</div>';
    html += this._umzug();
    return html;
  }

  /**
   * Der Umzug.
   *
   * Steht unter der Bucht, weil er erst dort möglich wird. Bewusst kein
   * Preis: Umziehen ist eine Entscheidung, kein Kauf – und wer es sich
   * anders überlegt, soll zurückdürfen, ohne dafür zu bezahlen.
   */
  _umzug() {
    const g = this.game;
    if (!(g.state.islePlot > 0)) return '';
    const drueben = g.homeAt() === 'isle';
    const haus = g.houseStatus();

    return '<div class="rows" style="margin-top:12px"><div class="row">' +
      ico('icon_check', 'lg') +
      '<div class="grow"><div class="title">' + escapeHtml(haus.name) +
      (drueben ? ' steht in der Bucht' : ' steht im Lager') + '</div>' +
      '<div class="meta"><span>' +
      (drueben
        ? 'Der Briefkasten steht daneben. Feuer, Werkbank und Händler sind drüben geblieben.'
        : 'Umziehen nimmt den Briefkasten mit. Feuer, Werkbank und Händler bleiben hier.') +
      '</span></div></div>' +
      '<button class="row-btn" data-act="moveHome" data-arg="' +
      (drueben ? 'camp' : 'isle') + '">' +
      (drueben ? 'Zurück ins Lager' : 'In die Bucht ziehen') + '</button></div></div>';
  }

  _loanRows() {
    const g = this.game;
    const stand = statusOf(g.state.loan);
    if (stand.fertig) {
      return '<div class="rows"><div class="row">' + ico('icon_check', 'lg') +
        '<div class="grow"><div class="title">Der Schuppen steht</div>' +
        '<div class="meta"><span>' + stand.slots + ' Fächer. Mehr braucht kein Mensch.</span></div>' +
        '</div></div></div>';
    }
    const naechste = stand.naechste;
    const anteil = stand.ziel ? stand.gezahlt / stand.ziel : 0;
    const raten = [50, 250, 1000].filter(function (r) { return r <= stand.offen; });
    raten.push(stand.offen);

    let knoepfe = '';
    const gesehen = Object.create(null);
    for (let i = 0; i < raten.length; i++) {
      const r = raten[i];
      if (r <= 0 || gesehen[r]) continue;
      gesehen[r] = 1;
      const kann = g.state.coins >= r;
      knoepfe += '<button class="row-btn" data-act="payLoan" data-arg="' + r + '"' +
        (kann ? '' : ' disabled') + '>' + (r === stand.offen ? 'Rest ' : '') + num(r) + '</button>';
    }

    return '<div class="rows"><div class="row">' + ico('icon_bag', 'lg') +
      '<div class="grow"><div class="title">' + escapeHtml(naechste.name) + ' · ' +
      naechste.slots + ' Fächer</div>' +
      '<div class="meta"><span>' + escapeHtml(naechste.note) + '</span>' +
      '<span>' + ico('icon_coin') + ' ' + num(stand.gezahlt) + ' von ' + num(stand.ziel) + '</span>' +
      '<span>noch ' + num(stand.offen) + '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="width:' +
      Math.round(anteil * 100) + '%"></i></div></div>' +
      '</div><div class="row"><div class="grow"><div class="meta">' +
      '<span>Anzahlen:</span></div></div>' + knoepfe + '</div></div>';
  }

  /* ---------------- Post ---------------- */

  /**
   * Der Briefkasten.
   *
   * Neueste zuerst – man kommt wegen der Post von heute, nicht wegen der von
   * vorletzter Woche. Ungelesene sind hervorgehoben; wer einen anklickt,
   * liest ihn UND bekommt die Beilage. Zwei Klicks für einen Brief wären
   * einer zu viel.
   */
  _mail() {
    const g = this.game;
    const liste = (g.state.mail || []).slice().reverse();
    if (!liste.length) {
      return '<p class="empty-note">Der Kasten ist leer.<br>' +
        'Wem du hilfst, der schreibt dir – meistens am nächsten Morgen.</p>';
    }

    const offen = unreadCount(g.state.mail);
    let html = '<p class="empty-note" style="padding:0 0 12px">' +
      (offen ? offen + ' ungelesen' : 'Alles gelesen') + ' · ' +
      liste.length + ' im Kasten</p><div class="rows">';

    for (let i = 0; i < liste.length; i++) {
      const b = liste[i];
      const zu = !b.read;
      const gabe = b.gift ? getItem(b.gift.id) : null;
      html += '<button class="row letter' + (zu ? ' neu' : '') + '"' +
        ' data-act="letter" data-arg="' + escapeHtml(b.id) + '">' +
        ico(zu ? 'icon_mailbox' : 'icon_quest', 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(b.subject) +
        (zu ? ' <span class="marke">neu</span>' : '') + '</div>' +
        '<div class="meta"><span>Tag ' + b.day + '</span>' +
        (gabe ? '<span>' + ico(gabe.icon) + ' ' + b.gift.n + ' liegt bei</span>' : '') +
        '</div>' +
        (b.read || this.selected === b.id
          ? '<div class="brief">' + escapeHtml(b.text) + '</div>' : '') +
        '</div></button>';
    }
    html += '</div>';
    return html;
  }

  /* ---------------- Meilensteine ---------------- */

  /**
   * Der lange Bogen, sichtbar gemacht.
   *
   * Ohne diese Liste wäre die Prozentzahl oben nur eine Zahl. Erst wenn
   * danebensteht, was bei 45 % passiert, ist sie ein Ziel. Darum steht auch
   * der nächste Schritt vollständig da – verdeckte Belohnungen sind eine
   * Überraschung für einen Abend und ein Rätsel für alle anderen.
   */
  _milestones() {
    const g = this.game;
    const anteil = g.colorField.coverage(g.world);
    const erreicht = g.state.milestones || {};
    const offen = nextOpen(erreicht);

    let html = '<h3 style="font-size:0.95em;margin:16px 0 8px">Die Insel</h3>';
    html += '<div class="rows"><div class="row">' + ico('icon_star', 'lg') +
      '<div class="grow"><div class="title">' + Math.round(anteil * 100) + '% wieder bunt</div>' +
      '<div class="meta"><span>' +
      (offen
        ? escapeHtml(offen.name) + ' bei ' + Math.round(offen.at * 100) + '%'
        : 'Alle Meilensteine stehen.') +
      '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="width:' +
      Math.round(Math.min(1, anteil) * 100) + '%"></i></div></div></div></div>';

    html += '<div class="rows" style="margin-top:8px">';
    for (let i = 0; i < MILESTONES.length; i++) {
      const m = MILESTONES[i];
      const da = !!erreicht[m.id];
      // Weit entferntes bleibt stumm: alles ab dem übernächsten Schritt steht
      // als Zeile da, aber ohne Text – sonst liest man zehn Versprechen und
      // findet den nächsten Schritt nicht mehr.
      const naeher = da || (offen && m.at <= offen.at + 0.13);
      html += '<div class="row' + (da ? '' : ' dim') + '">' +
        ico(m.icon || 'icon_star', 'lg') +
        '<div class="grow"><div class="title">' + Math.round(m.at * 100) + '% · ' +
        escapeHtml(m.name) + '</div>' +
        '<div class="meta"><span>' +
        (naeher ? escapeHtml(m.hint) : 'Noch zu weit weg, um etwas darüber zu sagen.') +
        '</span></div></div>' +
        (da ? '<span class="row-btn ghost">' + ico('icon_check') + '</span>' : '') +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ---------------- Werkbank ---------------- */

  _craft() {
    const g = this.game;
    const fire = campfireLevelFor(g.state.campfireFuel).level;
    let html = '<p class="empty-note" style="padding:0 0 12px">Feuerstufe ' + fire +
      ' · ' + ico('icon_ember') + ' ' + num(g.state.ember) + '</p><div class="rows">';

    for (let i = 0; i < RECIPES.length; i++) {
      const rec = RECIPES[i];
      // Stufe 0 heißt „noch gar nicht gebaut". Mit `|| 1` galt die ungebaute
      // Gießkanne als Stufe 1 – ihr eigener Bauplan verschwand damit aus der
      // Liste, kaum dass der Meilenstein ihn freigegeben hatte.
      const stufe = g.player.levels[rec.tool] || 0;
      if (rec.kind === 'tool' && stufe >= rec.level) continue;
      if (rec.kind === 'tool' && stufe < rec.level - 1) continue;
      if (rec.kind === 'bag' && g.state.bagUpgrades >= (rec.max || 1)) continue;
      if (rec.kind === 'bag' && g.state.bagUpgrades < (rec.min || 0)) continue;
      if (rec.once && g.state.crafted[rec.id]) continue;
      // Was ein Meilenstein freigibt, steht vorher gar nicht da. Ein Bauplan,
      // den man nur ansehen darf, ist keine Vorfreude, sondern eine Sperre.
      if (rec.needs && !g.hasMilestone(rec.needs)) continue;

      const locked = fire < (rec.fire || 1);
      const miss = missingFor(rec, g.inventory, g.state.ember);
      const can = !locked && miss.length === 0;

      let costHtml = '';
      for (let c = 0; c < rec.cost.length; c++) {
        const cost = rec.cost[c];
        const have = g.inventory.count(cost.id);
        const bad = have < cost.n ? ' miss' : '';
        costHtml += '<span class="cost' + bad + '">' + ico(getItem(cost.id).icon) + cost.n + '</span>';
      }
      if (rec.ember) {
        const bad = g.state.ember < rec.ember ? ' miss' : '';
        costHtml += '<span class="cost' + bad + '">' + ico('icon_ember') + rec.ember + '</span>';
      }

      html += '<div class="row' + (locked ? ' dim' : '') + '">' +
        ico(rec.out ? getItem(rec.out.id).icon : recipeIcon(rec), 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(rec.name) + '</div>' +
        '<div class="meta">' + costHtml +
        (rec.note ? '<span>' + escapeHtml(rec.note) + '</span>' : '') + '</div></div>' +
        (locked
          ? '<span class="row-btn ghost">' + ico('icon_lock') + ' Feuer ' + rec.fire + '</span>'
          : '<button class="row-btn" data-act="craft" data-arg="' + rec.id + '"' +
            (can ? '' : ' disabled') + '>Bauen</button>') +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ---------------- Kochstelle ---------------- */

  /**
   * Kochen und essen in einem Fenster.
   *
   * Oben steht, was heute wirkt – oder dass nichts wirkt. Das ist die
   * wichtigste Zeile: Ohne sie wüsste niemand, dass eine Stärkung überhaupt
   * läuft, und das Essen wäre eine Zahl, die im Verborgenen passiert.
   */
  _kitchen() {
    const g = this.game;
    const heute = staerkungHeute(g.state.staerkung, g.day.day);
    let html = '<p class="empty-note" style="padding:0 0 12px">' +
      (heute
        ? ico(heute.icon) + ' <b>' + escapeHtml(heute.name) + '</b> · ' +
          escapeHtml(heute.note) + ' Hält bis zum Schlafen.'
        : 'Nichts gegessen heute. Ein Gericht hält bis zum Schlafen.') +
      '</p><div class="rows">';

    for (let i = 0; i < GERICHTE.length; i++) {
      const rec = GERICHTE[i];
      const item = getItem(rec.id);
      const wirkt = STAERKUNG[rec.staerkung];
      const geht = kannKochen(rec, g.inventory);
      const imBeutel = g.inventory.count(rec.id);

      let kosten = '';
      for (let z = 0; z < rec.zutaten.length; z++) {
        const zu = rec.zutaten[z];
        const da = g.inventory.count(zu.id);
        kosten += '<span class="cost' + (da < zu.n ? ' miss' : '') + '">' +
          ico(getItem(zu.id).icon) + zu.n + '</span>';
      }

      html += '<div class="row">' + ico(item.icon, 'lg') +
        '<div class="grow"><div class="title">' + escapeHtml(item.name) +
        (imBeutel ? ' <span class="meta">×' + imBeutel + '</span>' : '') + '</div>' +
        '<div class="meta">' + kosten +
        '<span>' + ico(wirkt.icon) + ' ' + escapeHtml(wirkt.name) + '</span></div></div>' +
        (imBeutel
          ? '<button class="row-btn" data-act="eat" data-arg="' + rec.id + '">Essen</button>'
          : '<button class="row-btn" data-act="cook" data-arg="' + rec.id + '"' +
            (geht ? '' : ' disabled') + '>Kochen</button>') +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ---------------- Laden ---------------- */

  _shop() {
    const g = this.game;
    const tab = this.tab || 'buy';
    let html = '<div class="tabs">' +
      '<button class="tab" data-act="tab" data-arg="buy" aria-selected="' + (tab === 'buy') + '">Kaufen</button>' +
      '<button class="tab" data-act="tab" data-arg="sell" aria-selected="' + (tab === 'sell') + '">Verkaufen</button>' +
      '<button class="tab" data-act="tab" data-arg="ausbau" aria-selected="' + (tab === 'ausbau') + '">Ausbau</button>' +
      '<button class="tab" data-act="tab" data-arg="katalog" aria-selected="' + (tab === 'katalog') + '">Katalog</button>' +
      '<span style="margin-left:auto;align-self:center;font-size:0.85em">' +
      ico('icon_coin') + ' ' + num(g.state.coins) + '</span></div>';

    const wanted = g.shop.wanted ? getItem(g.shop.wanted) : null;
    if (wanted) {
      html += '<div class="row" style="margin-bottom:10px">' + ico(wanted.icon, 'lg') +
        '<div class="grow"><div class="title">Heute gesucht: ' + escapeHtml(wanted.name) + '</div>' +
        '<div class="meta"><span>' + g.shop.wantedBonus + '× Preis</span></div></div></div>';
    }

    if (tab === 'ausbau') {
      // Der Händler baut die Truhe – bei ihm wird auch bezahlt. Ein eigener
      // Bauplatz dafür wäre ein Ort mehr, den man erst finden müsste.
      html += this._loanRows();
      return html;
    }

    if (tab === 'katalog') {
      html += this._catalogRows();
      return html;
    }

    if (tab === 'buy') {
      html += '<div class="rows">';
      let any = false;
      for (let i = 0; i < g.shop.stock.length; i++) {
        const s = g.shop.stock[i];
        const item = getItem(s.id);
        if (!item || s.left <= 0) continue;
        any = true;
        const afford = g.state.coins >= s.price;
        html += '<div class="row' + (afford ? '' : ' dim') + '">' + ico(item.icon, 'lg') +
          '<div class="grow"><div class="title">' + escapeHtml(item.name) + '</div>' +
          '<div class="meta"><span>' + ico('icon_coin') + ' ' + s.price + '</span>' +
          '<span>noch ' + s.left + '</span></div></div>' +
          '<button class="row-btn" data-act="buy" data-arg="' + s.id + '"' +
          (afford ? '' : ' disabled') + '>Kaufen</button></div>';
      }
      if (!any) html += '<p class="empty-note">Heute ist alles ausverkauft.</p>';
      html += '</div>';
      return html;
    }

    // Verkaufen
    const entries = [];
    for (let i = 0; i < g.inventory.slots.length; i++) {
      const slot = g.inventory.slots[i];
      const item = getItem(slot.id);
      if (!item || item.value <= 0) continue;
      entries.push({ item: item, n: slot.n });
    }
    if (!entries.length) return html + '<p class="empty-note">Nichts Verkäufliches dabei.</p>';

    html += '<div class="grid">';
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const sel = this.selected === e.item.id ? ' sel' : '';
      html += '<button class="slot' + sel + '" data-act="select" data-arg="' + e.item.id + '">' +
        ico(e.item.icon, 'lg') +
        '<span class="cap">' + g.shop.sellPrice(e.item.id) + '</span>' +
        '<span class="qty">' + e.n + '</span></button>';
    }
    html += '</div>';

    if (this.selected) {
      const item = getItem(this.selected);
      const price = g.shop.sellPrice(this.selected);
      const have = g.inventory.count(this.selected);
      if (item && have > 0) {
        html += '<div class="rows" style="margin-top:12px"><div class="row">' + ico(item.icon, 'lg') +
          '<div class="grow"><div class="title">' + escapeHtml(item.name) + '</div>' +
          '<div class="meta"><span>' + ico('icon_coin') + ' ' + price + ' je Stück</span></div></div>' +
          '<button class="row-btn" data-act="sell" data-arg="' + item.id + '">1×</button>' +
          '<button class="row-btn" data-act="sellAll" data-arg="' + item.id + '">Alle (' + have + ')</button>' +
          '</div></div>';
      }
    }
    return html;
  }

  /* ---------------- Lagerfeuer ---------------- */

  _campfire() {
    const g = this.game;
    const lvl = campfireLevelFor(g.state.campfireFuel);
    const next = nextCampfireLevel(g.state.campfireFuel);
    const pct = next
      ? Math.round(((g.state.campfireFuel - lvl.fuel) / (next.fuel - lvl.fuel)) * 100)
      : 100;

    let html = '<div class="row" style="margin-bottom:12px">' + ico('icon_campfire', 'xl') +
      '<div class="grow"><div class="title">Feuerstufe ' + lvl.level + '</div>' +
      '<div class="meta"><span>' + ico('icon_ember') + ' ' + num(g.state.ember) + ' Glut</span>' +
      (next ? '<span>nächste Stufe: ' + pct + '%</span>' : '<span>voll ausgebaut</span>') +
      '</div></div></div>';

    html += '<p class="empty-note" style="padding:0 0 10px">Verbrenne Fundstücke: Das gibt Glut ' +
      'und macht das Feuer größer – und mit ihm den farbige Kreis um das Lager.</p>';

    const burnable = [];
    for (let i = 0; i < g.inventory.slots.length; i++) {
      const slot = g.inventory.slots[i];
      const item = getItem(slot.id);
      if (!item || !item.burn) continue;
      burnable.push({ item: item, n: slot.n });
    }
    if (!burnable.length) return html + '<p class="empty-note">Nichts Brennbares dabei.</p>';

    html += '<div class="grid">';
    for (let i = 0; i < burnable.length; i++) {
      const b = burnable[i];
      const sel = this.selected === b.item.id ? ' sel' : '';
      html += '<button class="slot' + sel + '" data-act="select" data-arg="' + b.item.id + '">' +
        ico(b.item.icon, 'lg') +
        '<span class="cap">+' + b.item.burn + '</span>' +
        '<span class="qty">' + b.n + '</span></button>';
    }
    html += '</div>';

    if (this.selected) {
      const item = getItem(this.selected);
      const have = g.inventory.count(this.selected);
      if (item && have > 0) {
        html += '<div class="rows" style="margin-top:12px"><div class="row">' + ico(item.icon, 'lg') +
          '<div class="grow"><div class="title">' + escapeHtml(item.name) + '</div>' +
          '<div class="meta"><span>' + ico('icon_ember') + ' ' + item.burn + ' je Stück</span></div></div>' +
          '<button class="row-btn" data-act="burn" data-arg="' + item.id + '">1×</button>' +
          '<button class="row-btn" data-act="burnAll" data-arg="' + item.id + '">Alle (' + have + ')</button>' +
          '</div></div>';
      }
    }
    return html;
  }

  /* ---------------- Spielstand als Datei ---------------- */

  _importSave() {
    const self = this;
    openFile().then(function (text) {
      if (text) self.game.applySaveText(text);
    });
  }

  /**
   * Verknüpft eine Datei. `vorhanden` heißt: eine schon bespielte auswählen –
   * dann wird ihr Inhalt gleich übernommen, denn genau dafür holt man sie.
   */
  _linkSave(vorhanden) {
    const self = this;
    const g = this.game;
    if (vorhanden) {
      linkExisting().then(function (res) {
        if (!res) return;
        self.render();
        if (res.text && res.text.trim()) g.applySaveText(res.text);
        else { g.save(); g.ui.toast('Datei verknüpft', 'icon_star', 'good'); }
      });
      return;
    }
    linkNew(suggestName(g.day.day)).then(function (name) {
      if (!name) return;
      g.save();
      self.render();
      g.ui.toast('Schreibt jetzt in ' + name, 'icon_star', 'good');
    });
  }

  /* ---------------- Tagesrückblick ---------------- */

  /**
   * Was gestern passiert ist.
   *
   * Ein Tag in diesem Spiel endet mit einem Schnitt: man legt sich hin und
   * wacht in einer veränderten Welt auf. Ohne Rückblick verschwindet dabei
   * alles, was man getan hat – man sieht nur noch das Ergebnis und nicht den
   * Weg. Die Insel färbt sich ohnehin langsam; ein „+0,8 %" ist der Beweis,
   * dass der Tag etwas gebracht hat.
   */
  _daybook() {
    const b = this.game.lastDaybook;
    if (!b) return '<p class="empty-note">Noch kein Tag vergangen.</p>';

    // Eine Liste für alles: gezählt, angezeigt und „lohnt sich das Fenster".
    // Vorher standen die drei nebeneinander und waren auseinandergelaufen.
    const zeilen = DAYBOOK_ROWS.filter(function (z) { return b[z.key] > 0; });

    // Die Farbe steht oben: sie ist das Maß, an dem dieses Spiel hängt.
    // Weiter unten wäre sie beim Aufwachen unter der Fensterkante.
    const dazu = Math.round((b.colorEnd - b.colorStart) * 1000) / 10;
    let html = '<p class="empty-note" style="padding-bottom:10px">Tag ' + b.day + '</p>';
    html += '<div class="rows"><div class="row">' + ico('icon_map', 'lg') +
      '<div class="grow"><div class="title">Farbe auf der Insel · ' +
      (Math.round(b.colorEnd * 1000) / 10) + ' %' +
      (dazu > 0.05 ? ' <span style="color:#5c7d3e">(+' + dazu + ')</span>' : '') +
      '</div><div class="meta"><span>' +
      (dazu > 0.05 ? 'Gestern ist etwas zurückgekommen.' : 'Heute wartet noch Grau auf dich.') +
      '</span></div></div></div></div>';

    if (!zeilen.length) {
      html += '<p class="empty-note">Ein ruhiger Tag. Auch die gibt es.</p>';
    } else {
      html += '<h3 style="font-size:0.95em;margin:16px 0 8px">Was du getan hast</h3>';
      html += '<div class="rows">';
      for (let i = 0; i < zeilen.length; i++) {
        const z = zeilen[i];
        const n = b[z.key];
        html += '<div class="row">' + ico(z.icon, 'lg') +
          '<div class="grow"><div class="title">' + num(n) + ' ' +
          escapeHtml(n === 1 ? z.ein : z.mehr) + '</div></div></div>';
      }
      html += '</div>';
    }
    return html;
  }

  /* ---------------- Karte ---------------- */

  _map() {
    return '<canvas id="map-canvas" width="192" height="192"></canvas>' +
      '<div class="legend">' +
      '<span><i style="background:#d9662e"></i>Du</span>' +
      '<span><i style="background:#5f86b0"></i>Geist</span>' +
      '<span><i style="background:#ff9a3c"></i>Lager</span>' +
      '<span><i style="background:#c2941f"></i>Fundstück</span>' +
      '<span><i style="background:#d6cdb8"></i>noch blass</span>' +
      '<span><i style="background:#cf4a3c"></i>Ziel</span>' +
      '</div>';
  }

  _drawMap() {
    const g = this.game;
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = ctx2d(canvas);
    const w = g.world.w;
    const h = g.world.h;
    const s = canvas.width / w;

    const stamp = g.world.groundStamp + ':' + Math.round(g.colorField.coverage(g.world) * 200);
    if (!this._mapBase || this._mapBaseDirty !== stamp) {
      const base = makeCanvas(w, h);
      const bctx = ctx2d(base);
      const img = bctx.createImageData(w, h);
      for (let ty = 0; ty < h; ty++) {
        for (let tx = 0; tx < w; tx++) {
          const t = g.world.tileAtTile(tx, ty);
          const hex = TILE_DEF[t].base;
          const r = parseInt(hex.substr(1, 2), 16);
          const gg = parseInt(hex.substr(3, 2), 16);
          const b = parseInt(hex.substr(5, 2), 16);
          const colored = g.colorField.at((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE) > 0.45;
          const i = (ty * w + tx) * 4;
          if (colored) {
            img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b;
          } else {
            // Aufhellen, nicht abdunkeln: die Karte ist Papier, und unkoloriert
            // liegt die Insel hier so blass da wie im Spiel. Wichtig ist, den
            // Farbton mitzunehmen statt auf Grauwert zu gehen – sonst haben
            // Wasser und Wiese am ersten Tag denselben Wert und die Insel
            // verschwindet im Papier.
            img.data[i] = 238 - (238 - r) * 0.38;
            img.data[i + 1] = 231 - (231 - gg) * 0.38;
            img.data[i + 2] = 213 - (213 - b) * 0.38;
          }
          img.data[i + 3] = 255;
        }
      }
      bctx.putImageData(img, 0, 0);
      this._mapBase = base;
      this._mapBaseDirty = stamp;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this._mapBase, 0, 0, canvas.width, canvas.height);

    function dot(x, y, color, size) {
      ctx.fillStyle = color;
      const px = Math.round((x / TILE_SIZE) * s) - size / 2;
      const py = Math.round((y / TILE_SIZE) * s) - size / 2;
      ctx.fillRect(px, py, size, size);
    }

    /** Ein gestricheltes Rechteck – dieselbe Linie wie draußen am Grundstück. */
    function rahmen(r, color) {
      if (!r) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        Math.round((r.x / TILE_SIZE) * s) + 0.5,
        Math.round((r.y / TILE_SIZE) * s) + 0.5,
        Math.round((r.w / TILE_SIZE) * s),
        Math.round((r.h / TILE_SIZE) * s)
      );
      ctx.restore();
    }

    // Die eigenen Grundstücke. Ohne sie stand die Bucht auf der Insel nur im
    // Fenstertext, und man suchte auf 96 mal 96 Kacheln nach etwas, das man
    // schon bezahlt hatte.
    rahmen(g.plotRect ? g.plotRect() : null, 'rgba(74,64,56,0.55)');
    if (g.state.islePlot > 0) rahmen(g.islePlotRect ? g.islePlotRect() : null, 'rgba(74,64,56,0.55)');

    if (g.world.campfire) dot(g.world.campfire.x, g.world.campfire.y, '#ff9a3c', 5);
    for (let i = 0; i < g.world.entities.length; i++) {
      const e = g.world.entities[i];
      if (e.kind === 'spirit' && g.world.isUnlocked(e.region)) dot(e.x, e.y, '#5f86b0', 4);
      // Die beiden Boote: Sie SIND der Weg hinüber, und der stand bisher
      // nirgends auf der Karte. Dieselbe Regel wie bei den Fundstücken – nur
      // zeigen, wo man auch hinkommt: Der Steg am Lager liegt von Anfang an
      // vor der Nase und ist kein Geheimnis, das Boot drüben erscheint mit
      // der Insel.
      if (e.kind === 'boat' && g.world.isUnlocked(g.world.regionAtPixel(e.x, e.y))) {
        dot(e.x, e.y, '#8a6a3c', 4);
      }
      // Das Zuhause. Es heißt bis zuletzt `tent`, auch als ausgebautes Haus –
      // die Ausbaustufe wechselt nur die Grafik, nicht das Objekt.
      if (e.kind === 'tent') dot(e.x, e.y, '#b6543f', 5);
      // Der Wanderer. Er steht irgendwo am Strand, und der Strand ist lang –
      // ohne Punkt wäre die Morgenmeldung „Jemand steht am Strand" eine
      // Suchaufgabe. Er ist an genau EINEM Tag da; einen Punkt dafür zu
      // suchen, statt ihn zu bekommen, wäre die Art von Fleiß, die dieses
      // Spiel niemandem abverlangt.
      if (e.kind === 'wanderer') dot(e.x, e.y, '#7c8f86', 5);
      // Fundstücke nur dort zeigen, wo man auch hinkommt. Vorher standen sie
      // auch im Wald und auf den Klippen, lange bevor der Weg dorthin offen
      // war – man lief hin und stand vor der Sperre.
      if (e.kind === 'hidden' && g.world.isUnlocked(g.world.regionAtPixel(e.x, e.y))) {
        dot(e.x, e.y, '#c2941f', 4);
      }
    }
    // Ziele offener „Hingehen"-Aufträge als Kreuz. Ohne Marke wäre die
    // Aufgabe auf 96 mal 96 Kacheln reines Raten.
    const offen = g.quests.active();
    for (let i = 0; i < offen.length; i++) {
      const q = offen[i];
      if (q.type !== QTYPE.VISIT || q.turnedIn || !q.spot) continue;
      const px = Math.round((q.spot.x / TILE_SIZE) * s);
      const py = Math.round((q.spot.y / TILE_SIZE) * s);
      ctx.strokeStyle = '#cf4a3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 4, py - 4); ctx.lineTo(px + 4, py + 4);
      ctx.moveTo(px + 4, py - 4); ctx.lineTo(px - 4, py + 4);
      ctx.stroke();
    }
    dot(g.player.x, g.player.y, '#d9662e', 5);
    ctx.strokeStyle = 'rgba(74,64,56,0.5)';
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }

  /* ---------------- Einstellungen ---------------- */

  _settings() {
    const s = this.game.settings;
    function seg(key, options, value) {
      let h = '<div class="seg">';
      for (let i = 0; i < options.length; i++) {
        h += '<button data-act="setting" data-arg="' + key + '" data-val="' + options[i][0] +
          '" aria-pressed="' + (String(value) === String(options[i][0])) + '">' + options[i][1] + '</button>';
      }
      return h + '</div>';
    }

    let html = '<div class="rows">';
    html += '<div class="setting"><div class="grow"><label>Klänge</label>' +
      '<div class="hint">Alle Geräusche werden im Browser erzeugt.</div></div>' +
      seg('sound', [[true, 'An'], [false, 'Aus']], s.sound) + '</div>';
    html += '<div class="setting"><div class="grow"><label>Musik</label></div>' +
      seg('music', [[true, 'An'], [false, 'Aus']], s.music) + '</div>';
    html += '<div class="setting"><div class="grow"><label>Umgebung</label>' +
      '<div class="hint">Brandung, Wind, Grillen</div></div>' +
      seg('ambience', [[true, 'An'], [false, 'Aus']], s.ambience !== false) + '</div>';
    html += '<div class="setting"><div class="grow"><label>Lautstärke</label></div>' +
      seg('volume', [[0.3, 'Leise'], [0.7, 'Mittel'], [1, 'Laut']], s.volume) + '</div>';
    html += '<div class="setting"><div class="grow"><label>Sprechblasen</label>' +
      '<div class="hint">„Nur Symbole“ blendet jeden Text der Geister aus.</div></div>' +
      seg('talk', [['short', 'Kurz'], ['off', 'Nur Symbole']], s.talk) + '</div>';
    html += '<div class="setting"><div class="grow"><label>Tageslänge</label>' +
      '<div class="hint">Ein Tag von 6 bis 2 Uhr in Echtzeit-Minuten.</div></div>' +
      seg('dayMinutes', [[9, '9'], [14, '14'], [22, '22']], s.dayMinutes) + '</div>';
    html += '<div class="setting"><div class="grow"><label>Größe der Oberfläche</label>' +
      '<div class="hint">Schrift, Symbole und Knöpfe zusammen. Auf kleinen ' +
      'Fenstern rückt alles zusätzlich enger.</div></div>' +
      seg('uiScale', UI_SCALES, s.uiScale == null ? 1 : s.uiScale) + '</div>';
    html += '<div class="setting"><div class="grow"><label>Bilddarstellung</label>' +
      '<div class="hint">„Pixelgenau“ hält die Kanten scharf, „Füllen“ nutzt das ganze Fenster.</div></div>' +
      seg('scaling', [['crisp', 'Pixelgenau'], ['fill', 'Füllen']], s.scaling) + '</div>';
    html += '</div>';

    html += '<h3 style="font-size:0.95em;margin:18px 0 8px">Steuerung</h3>' +
      '<div class="rows"><div class="row"><div class="grow"><div class="meta">' +
      '<span>WASD / Pfeile – laufen</span><span>E – benutzen</span><span>1–6 – Werkzeug</span>' +
      '<span>Tab – nächstes Werkzeug</span><span>I / Q / C / M – Fenster</span>' +
      '<span>F – schlafen (am Zelt)</span><span>R – drehen, X – abbrechen</span>' +
      '</div></div></div></div>';

    // Der Browserspeicher hängt am Browser, am Rechner und am Profil. Wer
    // wechselt oder aufräumt, ist den Fortschritt los – deshalb steht hier
    // gleich daneben, wie man ihn als Datei mitnimmt.
    const verknuepft = linkedName();
    html += '<h3 style="font-size:0.95em;margin:18px 0 8px">Spielstand</h3><div class="rows">' +
      '<div class="row"><div class="grow"><div class="title">Automatisch gespeichert</div>' +
      '<div class="meta"><span>' + (this.game.storagePersistent
        ? 'Im Browser gesichert' : 'Achtung: privater Modus – nur für diese Sitzung') + '</span></div></div>' +
      '<button class="row-btn ghost" data-act="reset">Neu anfangen</button></div>';

    html += '<div class="row"><div class="grow"><div class="title">Als Datei mitnehmen</div>' +
      '<div class="meta"><span>Sichern legt eine Datei an. Laden holt sie zurück – ' +
      'auch in einem anderen Browser oder auf einem anderen Rechner.</span></div></div>' +
      '<button class="row-btn" data-act="saveExport">Sichern</button>' +
      '<button class="row-btn ghost" data-act="saveImport">Laden</button></div>';

    if (canLink()) {
      // Drei Zustände, und der mittlere ist der wichtigste: die Datei ist
      // gemerkt, aber der Browser hat die Erlaubnis beim Schließen vergessen.
      // Ohne ihn sähe es aus, als wäre die Einrichtung weg.
      const wartend = pendingLinkName();
      if (wartend) {
        html += '<div class="row"><div class="grow"><div class="title">' +
          escapeHtml(wartend) + ' ist noch gemerkt</div>' +
          '<div class="meta"><span>Der Browser fragt aus Sicherheitsgründen bei ' +
          'jedem Start einmal nach. Ein Klick, dann geht es weiter wie gehabt.</span></div></div>' +
          '<button class="row-btn" data-act="saveRelink">Bestätigen</button>' +
          '<button class="row-btn ghost" data-act="saveUnlink">Lösen</button></div>';
      } else {
        html += '<div class="row"><div class="grow"><div class="title">' +
          (verknuepft ? 'Schreibt in ' + escapeHtml(verknuepft) : 'Immer in eine Datei schreiben') +
          '</div><div class="meta"><span>' + (verknuepft
            ? 'Jedes Speichern geht zusätzlich in diese Datei.'
            : 'Einmal eine Datei wählen – danach sichert das Spiel von selbst dorthin. ' +
              'Am besten in einen Ordner, der mitwandert.') + '</span></div></div>' +
          (verknuepft
            ? '<button class="row-btn ghost" data-act="saveUnlink">Lösen</button>'
            : '<button class="row-btn" data-act="saveLinkNew">Datei anlegen</button>' +
              '<button class="row-btn ghost" data-act="saveLinkOpen">Vorhandene</button>') +
          '</div>';
      }
    }
    html += '</div>';

    return html;
  }
}

function recipeIcon(rec) {
  if (rec.kind === 'tool') return 'icon_' + (rec.tool === 'pickaxe' ? 'pickaxe' : rec.tool);
  if (rec.kind === 'bag') return 'icon_bag';
  return 'icon_craft';
}

function regionHint(region) {
  return ['Lager & Strand', 'Wald', 'Klippen'][region] || '';
}

export { clamp, CAT };
