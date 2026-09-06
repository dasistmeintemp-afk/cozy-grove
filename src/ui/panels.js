/** Modale Fenster: Tasche, Aufgaben, Werkbank, Laden, Feuer, Karte, Einstellungen. */
import { iconUrl } from '../art/sprites.js';
import { getItem, CAT_NAMES, CAT, ITEM_LIST } from '../game/items.js';
import { RECIPES, missingFor, campfireLevelFor, nextCampfireLevel } from '../game/recipes.js';
import { SPIRITS, friendshipLevel, friendshipProgress } from '../game/spirits.js';
import { STAGES, storyIcon, keepsakeOf, storyLine, storyClose, storyIntro } from '../game/stories.js';
import { pointsToNext, COSY_MAX } from '../game/cosiness.js';
import { canLink, linkedName, pendingLinkName, requestLinkPermission, linkNew, linkExisting, unlink, openFile, suggestName } from '../core/savefile.js';
import { questTitle, questIcon, QTYPE, daysLeft } from '../game/quests.js';
import { num, clamp, makeCanvas, ctx2d } from '../core/util.js';
import { TILE_DEF, TILE_SIZE } from '../art/tiles.js';
import { REGION_NAMES } from '../world/worldgen.js';
import { escapeHtml } from './ui.js';

const TITLES = {
  inventory: 'Tasche',
  quests: 'Aufgaben',
  craft: 'Werkbank',
  shop: 'Laden',
  campfire: 'Lagerfeuer',
  found: 'Fundbuch',
  stories: 'Erinnerungen',
  map: 'Karte',
  settings: 'Einstellungen',
  daybook: 'Gestern auf der Insel',
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
      case 'setting':
        g.changeSetting(arg, t.getAttribute('data-val'));
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
          '</div></div>';
        if (item.prop) {
          html += '<button class="row-btn" data-act="place" data-arg="' + item.id + '">Aufstellen</button>';
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
    const cats = [CAT.MATERIAL, CAT.FORAGE, CAT.FISH, CAT.RELIC, CAT.MEMORY, CAT.DECOR];
    const tab = this.tab && cats.indexOf(this.tab) >= 0 ? this.tab : cats[0];

    let known = 0;
    for (let i = 0; i < ITEM_LIST.length; i++) {
      if (inv.everFound(ITEM_LIST[i].id)) known++;
    }

    let html = '<div class="tabs">';
    for (let i = 0; i < cats.length; i++) {
      html += '<button class="tab" data-act="tab" data-arg="' + cats[i] + '" aria-selected="' +
        (cats[i] === tab) + '">' + CAT_NAMES[cats[i]] + '</button>';
    }
    html += '</div>';

    html += '<div class="grid">';
    for (let i = 0; i < ITEM_LIST.length; i++) {
      const item = ITEM_LIST[i];
      if (item.cat !== tab) continue;
      const have = inv.everFound(item.id);
      const n = have ? inv.found[item.id] : 0;
      html += '<button class="slot' + (have ? '' : ' unknown') +
        (this.selected === item.id && have ? ' sel' : '') + '"' +
        (have ? ' data-act="select" data-arg="' + item.id + '"' : ' disabled') +
        ' title="' + escapeHtml(have ? item.name : 'Noch nicht gefunden') + '">' +
        ico(item.icon, 'lg') +
        '<span class="cap">' + escapeHtml(have ? item.name : '???') + '</span>' +
        (have && n > 1 ? '<span class="qty">' + n + '</span>' : '') +
        '</button>';
    }
    html += '</div>';

    if (this.selected && inv.everFound(this.selected)) {
      const item = getItem(this.selected);
      if (item) {
        html += '<div class="rows" style="margin-top:12px"><div class="row">' +
          ico(item.icon, 'lg') +
          '<div class="grow"><div class="title">' + escapeHtml(item.name) + '</div>' +
          '<div class="meta"><span>Insgesamt gefunden: ' + inv.found[item.id] + '</span>' +
          '<span>Jetzt in der Tasche: ' + inv.count(item.id) + '</span>' +
          (item.value ? '<span>' + ico('icon_coin') + ' ' + item.value + '</span>' : '') +
          '</div></div></div></div>';
      }
    }

    html += '<p class="empty-note" style="padding-top:14px">' +
      known + ' von ' + ITEM_LIST.length + ' Dingen gefunden' +
      (g.state.caught ? ' · ' + g.state.caught + ' Fische geangelt' : '') + '</p>';
    return html;
  }

  /* ---------------- Aufgaben ---------------- */

  _quests() {
    const g = this.game;
    const quests = g.quests.active();
    let html = '';

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
        html += '<div class="row' + (done ? '' : '') + '">' +
          ico(questIcon(q), 'lg') +
          '<div class="grow">' +
          '<div class="title">' + escapeHtml(questTitle(q)) + ' · ' + have + '/' + q.need + '</div>' +
          '<div class="meta"><span>' + escapeHtml(spirit.name) + '</span>' +
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

  /* ---------------- Werkbank ---------------- */

  _craft() {
    const g = this.game;
    const fire = campfireLevelFor(g.state.campfireFuel).level;
    let html = '<p class="empty-note" style="padding:0 0 12px">Feuerstufe ' + fire +
      ' · ' + ico('icon_ember') + ' ' + num(g.state.ember) + '</p><div class="rows">';

    for (let i = 0; i < RECIPES.length; i++) {
      const rec = RECIPES[i];
      if (rec.kind === 'tool' && (g.player.levels[rec.tool] || 1) >= rec.level) continue;
      if (rec.kind === 'tool' && (g.player.levels[rec.tool] || 1) < rec.level - 1) continue;
      if (rec.kind === 'bag' && g.state.bagUpgrades >= (rec.max || 1)) continue;
      if (rec.once && g.state.crafted[rec.id]) continue;

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

  /* ---------------- Laden ---------------- */

  _shop() {
    const g = this.game;
    const tab = this.tab || 'buy';
    let html = '<div class="tabs">' +
      '<button class="tab" data-act="tab" data-arg="buy" aria-selected="' + (tab === 'buy') + '">Kaufen</button>' +
      '<button class="tab" data-act="tab" data-arg="sell" aria-selected="' + (tab === 'sell') + '">Verkaufen</button>' +
      '<span style="margin-left:auto;align-self:center;font-size:0.85em">' +
      ico('icon_coin') + ' ' + num(g.state.coins) + '</span></div>';

    const wanted = g.shop.wanted ? getItem(g.shop.wanted) : null;
    if (wanted) {
      html += '<div class="row" style="margin-bottom:10px">' + ico(wanted.icon, 'lg') +
        '<div class="grow"><div class="title">Heute gesucht: ' + escapeHtml(wanted.name) + '</div>' +
        '<div class="meta"><span>' + g.shop.wantedBonus + '× Preis</span></div></div></div>';
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

    const zeilen = [
      ['icon_check', b.quests, 'Bitte erfüllt', 'Bitten erfüllt'],
      ['icon_sparkle', b.finds, 'Fundstück gehoben', 'Fundstücke gehoben'],
      ['icon_fish_trout', b.fish, 'Fisch gefangen', 'Fische gefangen'],
      ['icon_net', b.bugs, 'Falter gefangen', 'Falter gefangen'],
      ['icon_flowerbed', b.decor, 'Stück aufgestellt', 'Stücke aufgestellt'],
      ['icon_heart', b.gifts, 'Mitbringsel verschenkt', 'Mitbringsel verschenkt'],
      ['icon_coin', b.coins, 'Münze verdient', 'Münzen verdient'],
      ['icon_ember', b.ember, 'Glut gesammelt', 'Glut gesammelt'],
    ].filter(function (z) { return z[1] > 0; });

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
        html += '<div class="row">' + ico(z[0], 'lg') +
          '<div class="grow"><div class="title">' + num(z[1]) + ' ' +
          escapeHtml(z[1] === 1 ? z[2] : z[3]) + '</div></div></div>';
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

    if (g.world.campfire) dot(g.world.campfire.x, g.world.campfire.y, '#ff9a3c', 5);
    for (let i = 0; i < g.world.entities.length; i++) {
      const e = g.world.entities[i];
      if (e.kind === 'spirit' && g.world.isUnlocked(e.region)) dot(e.x, e.y, '#5f86b0', 4);
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
