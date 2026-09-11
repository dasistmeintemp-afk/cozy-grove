/**
 * Oberfläche: HUD, Werkzeuggurt, Aufgabenkarten, Meldungen, Sprechblasen.
 * Alles als DOM über dem Canvas – scharfe Schrift, bedienbar per Tastatur.
 */
import { applyIcon, iconUrl } from '../art/sprites.js';
import { num, clamp } from '../core/util.js';
import { TOOLS } from '../game/player.js';
import { SPIRITS } from '../game/spirits.js';
import { questIcon, questTitle } from '../game/quests.js';
import { getItem } from '../game/items.js';

const TOOL_KEYS = ['1', '2', '3', '4', '5', '6', '7'];
const ROMAN = { 1: '', 2: 'II', 3: 'III', 4: 'IV' };

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      day: document.getElementById('val-day'),
      clock: document.getElementById('val-clock'),
      coins: document.getElementById('val-coins'),
      ember: document.getElementById('val-ember'),
      color: document.getElementById('val-color'),
      toolbelt: document.getElementById('toolbelt'),
      questRail: document.getElementById('quest-rail'),
      prompt: document.getElementById('prompt'),
      promptText: document.getElementById('prompt-text'),
      toasts: document.getElementById('toasts'),
      bubbles: document.getElementById('bubbles'),
      fishing: document.getElementById('fishing'),
      fishingZone: document.getElementById('fishing-zone'),
      fishingMarker: document.getElementById('fishing-marker'),
      fishingHint: document.getElementById('fishing-hint'),
      stage: document.getElementById('stage'),
      canvas: document.getElementById('game'),
      hudTop: document.getElementById('hud-top'),
    };
    this.view = { left: 0, top: 0, scale: 1 };
    this.bubbles = [];
    this._lastPrompt = null;
    this._questSignature = '';
    this._initIcons();
    this._buildToolbelt();
  }

  _initIcons() {
    const nodes = document.querySelectorAll('.ico[data-ico]');
    for (let i = 0; i < nodes.length; i++) {
      applyIcon(nodes[i], 'icon_' + nodes[i].getAttribute('data-ico'));
    }
  }

  _buildToolbelt() {
    const belt = this.el.toolbelt;
    belt.innerHTML = '';
    this.toolButtons = [];
    for (let i = 0; i < TOOLS.length; i++) {
      const t = TOOLS[i];
      const btn = document.createElement('button');
      btn.className = 'tool';
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(i === 0));
      btn.title = t.name + ' (' + TOOL_KEYS[i] + ')';
      btn.setAttribute('aria-label', t.name);
      btn.innerHTML =
        '<span class="num">' + TOOL_KEYS[i] + '</span>' +
        '<span class="ico lg"></span>' +
        '<span class="lvl"></span>';
      applyIcon(btn.querySelector('.ico'), t.icon);
      const idx = i;
      const self = this;
      btn.addEventListener('click', function () {
        self.game.selectTool(idx);
      });
      belt.appendChild(btn);
      this.toolButtons.push(btn);
    }
    this.refreshToolbelt();
  }

  refreshToolbelt() {
    const p = this.game.player;
    let sig = p.toolIndex + ':';
    for (let i = 0; i < TOOLS.length; i++) sig += (p.levels[TOOLS[i].id] || 0) + '.';
    if (sig === this._toolSig) return;
    this._toolSig = sig;
    for (let i = 0; i < this.toolButtons.length; i++) {
      const btn = this.toolButtons[i];
      // Was noch nicht gebaut ist, steht auch nicht in der Leiste. Ein leerer
      // Platz mit Fragezeichen wäre ein Rätsel ohne Hinweis.
      btn.hidden = !p.owns(i);
      btn.setAttribute('aria-pressed', String(i === p.toolIndex));
      const lvl = p.levels[TOOLS[i].id] || 1;
      btn.querySelector('.lvl').textContent = ROMAN[lvl] || '';
    }
  }

  /** Wird bei Größenänderung aufgerufen. */
  layout() {
    const stage = this.el.stage.getBoundingClientRect();
    const rect = this.el.canvas.getBoundingClientRect();
    this.view.left = rect.left - stage.left;
    this.view.top = rect.top - stage.top;
    // CSS-Pixel je Gerätepixel mal Zoom = Weltpixel -> Bildschirm
    const perDevice = this.el.canvas.width ? rect.width / this.el.canvas.width : 1;
    this.view.scale = perDevice * (this.game.renderer ? this.game.renderer.zoom : 1);
    this.measureHud();
  }

  /**
   * Sagt dem Stylesheet, wie hoch die Kopfzeile gerade wirklich ist.
   *
   * Sie bricht um: Auf einem schmalen Bildschirm rutschen die Knöpfe unter die
   * Anzeigen, und ob sie das tun, hängt auch an der Zahl der Münzen. Ein fester
   * Abstand für die Aufgabenleiste darunter kann das nicht treffen – sie lag
   * dann quer über den Knöpfen. Gemessen wird nur, wenn sich etwas geändert
   * hat: `getBoundingClientRect` erzwingt ein Neuberechnen des Layouts, und das
   * gehört nicht in jedes Bild.
   */
  measureHud() {
    const hud = this.el.hudTop;
    if (!hud) return;
    const stage = this.el.stage.getBoundingClientRect();
    const unten = Math.round(hud.getBoundingClientRect().bottom - stage.top);
    if (unten === this._hudBottom) return;
    this._hudBottom = unten;
    document.documentElement.style.setProperty('--hud-h', unten + 'px');
  }

  worldToScreen(wx, wy) {
    const cam = this.game.camera;
    return {
      x: this.view.left + (wx - cam.ox) * this.view.scale,
      y: this.view.top + (wy - cam.oy) * this.view.scale,
    };
  }

  /* ---------- HUD ---------- */

  refreshHud() {
    const g = this.game;
    this.el.day.textContent = String(g.day.day);
    this.el.clock.textContent = g.day.clockString();
    this.el.coins.textContent = num(g.state.coins);
    this.el.ember.textContent = num(g.state.ember);
    this.el.color.textContent = Math.round(g.colorField.coverage(g.world) * 100) + '%';
    // Aus 999 werden 1.024 Münzen, und die Kopfzeile bricht um. Nur dann neu
    // messen, nicht in jedem Bild.
    const breite = this.el.coins.textContent.length + this.el.ember.textContent.length;
    if (breite !== this._hudTextLen) {
      this._hudTextLen = breite;
      this.measureHud();
    }
  }

  setPrompt(text) {
    if (text === this._lastPrompt) return;
    this._lastPrompt = text;
    if (!text) {
      this.el.prompt.hidden = true;
      return;
    }
    this.el.promptText.textContent = text;
    this.el.prompt.hidden = false;
  }

  /* ---------- Aufgabenkarten ---------- */

  refreshQuests() {
    const g = this.game;
    const quests = g.quests.active().slice(0, 5);
    const sig = quests.map(function (q) {
      return q.id + ':' + g.quests.progress(q, g);
    }).join('|');
    if (sig === this._questSignature) return;
    this._questSignature = sig;

    const rail = this.el.questRail;
    rail.innerHTML = '';
    for (let i = 0; i < quests.length; i++) {
      const q = quests[i];
      const have = g.quests.progress(q, g);
      const done = have >= q.need;
      const spirit = SPIRITS[q.spirit];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'qcard' + (done ? ' done' : '');
      card.title = spirit.name + ' – ' + questTitle(q) + ' (' + have + '/' + q.need + ')';
      // Was gewollt ist, steht jetzt als Wort da.
      //
      // Vorher trug die Karte nur ein Symbol, „4/6" und den Namen des Geistes.
      // Man sah, dass jemand etwas will und wie weit es ist – aber nicht, WAS.
      // Bei sechs ähnlich aussehenden Sammelsymbolen half auch das Symbol
      // nicht weiter, und der Titel stand nur im Mauszeiger-Hinweis, den man
      // auf einem Telefon gar nicht bekommt.
      card.innerHTML =
        '<span class="ico lg" style="background-image:url(' + iconUrl(questIcon(q)) + ')"></span>' +
        '<span class="who">' +
        '<span class="goal"><span class="what">' + escapeHtml(questTitle(q)) + '</span>' +
        (done ? '<span class="ico" style="background-image:url(' + iconUrl('icon_check') + ')"></span>' : '') +
        '</span>' +
        '<span class="name">' + escapeHtml(spirit.name) + ' · ' +
        '<span class="count">' + have + '/' + q.need + '</span></span>' +
        '</span>';
      const self = this;
      card.addEventListener('click', function () {
        self.game.openPanel('quests');
      });
      rail.appendChild(card);
    }
  }

  /* ---------- Meldungen ---------- */

  toast(text, icon, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    let html = '';
    if (icon) html += '<span class="ico" style="background-image:url(' + iconUrl(icon) + ')"></span>';
    html += '<span>' + escapeHtml(text) + '</span>';
    el.innerHTML = html;
    this.el.toasts.appendChild(el);
    while (this.el.toasts.children.length > 4) {
      this.el.toasts.removeChild(this.el.toasts.firstChild);
    }
    setTimeout(function () {
      el.classList.add('fade');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 450);
    }, 2200);
  }

  /** Sammelmeldung für Gegenstände. */
  toastItems(items) {
    for (let i = 0; i < items.length; i++) {
      const it = getItem(items[i].id);
      if (!it) continue;
      this.toast('+' + items[i].n + ' ' + it.name, it.icon, 'good');
    }
  }

  /* ---------- Sprechblasen ---------- */

  /**
   * Blase über einer Weltposition.
   *
   * Im Alltag knapp: ein paar Wörter oder nur Symbole. Für die Sätze aus den
   * Erinnerungen gibt es `wrap` – die sind ein ganzer Satz und liefen sonst
   * als eine einzige Zeile aus dem Bild hinaus.
   */
  bubble(x, y, text, icons, duration, wrap) {
    if (this.game.settings.talk === 'off' && !icons) return null;
    const el = document.createElement('div');
    el.className = wrap ? 'bubble wrap' : 'bubble';
    let html = '';
    if (icons) {
      for (let i = 0; i < icons.length; i++) {
        html += '<span class="ico" style="background-image:url(' + iconUrl(icons[i].icon) + ')"></span>';
        if (icons[i].n != null) html += '<b>' + icons[i].n + '</b>';
      }
    }
    if (text && this.game.settings.talk !== 'off') {
      html += '<span>' + escapeHtml(text) + '</span>';
    }
    if (!html) return null;
    el.innerHTML = html;
    this.el.bubbles.appendChild(el);
    const b = { el: el, x: x, y: y, life: duration || 2.6 };
    this.bubbles.push(b);
    this._positionBubble(b);
    return b;
  }

  /**
   * Eine Blase an einem BILDpunkt statt an einem Weltpunkt.
   *
   * Für das Hausinnere: Dort gibt es keine Kamera und keine Weltkoordinaten,
   * also auch nichts, was `worldToScreen` umrechnen könnte. `fest` sagt der
   * Nachführung, dass sie diese Blase in Ruhe lassen soll.
   */
  bubbleAtScreen(x, y, text, duration) {
    const b = this.bubble(0, 0, text, null, duration, true);
    if (!b) return null;
    b.fest = true;
    b.el.style.left = Math.round(x) + 'px';
    b.el.style.top = Math.round(y) + 'px';
    return b;
  }

  updateBubbles(dt) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life -= dt;
      if (b.life <= 0) {
        b.el.classList.add('fade');
        const el = b.el;
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 420);
        this.bubbles.splice(i, 1);
        continue;
      }
      if (b.fest) continue;   // steht schon am Bildpunkt, siehe `bubbleAtScreen`
      this._positionBubble(b);
    }
  }

  _positionBubble(b) {
    const s = this.worldToScreen(b.x, b.y);
    b.el.style.left = Math.round(s.x) + 'px';
    b.el.style.top = Math.round(s.y) + 'px';
  }

  clearBubbles() {
    for (let i = 0; i < this.bubbles.length; i++) {
      if (this.bubbles[i].el.parentNode) this.bubbles[i].el.parentNode.removeChild(this.bubbles[i].el);
    }
    this.bubbles.length = 0;
  }

  /* ---------- Angeln ---------- */

  refreshFishing() {
    const f = this.game.fishing;
    if (!f.active) {
      this.el.fishing.hidden = true;
      return;
    }
    this.el.fishing.hidden = false;
    const showBar = f.state === 'reel';
    this.el.fishingZone.style.display = showBar ? 'block' : 'none';
    this.el.fishingMarker.style.display = showBar ? 'block' : 'none';
    if (showBar) {
      this.el.fishingZone.style.left = (f.zoneStart * 100) + '%';
      this.el.fishingZone.style.width = (f.zoneSize * 100) + '%';
      this.el.fishingMarker.style.left = (clamp(f.marker, 0, 1) * 100) + '%';
    }
    this.el.fishingHint.textContent = f.hint;
  }
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
