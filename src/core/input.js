/**
 * Eingabe: Tastatur, Maus/Zeiger und Touch-Joystick.
 * Liefert kantengetriggerte Aktionen ("gerade gedrueckt") und Dauerzustaende.
 */
import { clamp } from './util.js';

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'interact', Space: 'interact', Enter: 'interact',
  Escape: 'cancel',
  Digit1: 'tool1', Digit2: 'tool2', Digit3: 'tool3', Digit4: 'tool4', Digit5: 'tool5',
  Tab: 'nextTool',
  KeyI: 'panelInventory',
  KeyQ: 'panelQuests',
  KeyC: 'panelCraft',
  KeyM: 'panelMap',
  KeyB: 'panelFound',
  KeyG: 'panelStories',
  KeyF: 'sleep',
  KeyR: 'rotate',
  KeyX: 'cancelPlace',
};

const PREVENT = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, Tab: 1 };

export class Input {
  constructor(target) {
    this.target = target || window;
    this.down = Object.create(null);
    this.justPressed = Object.create(null);
    this.justReleased = Object.create(null);
    this.stick = { x: 0, y: 0, active: false };
    this.pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false, inside: false };
    this.anyInputSeen = false;
    this.touchMode = false;
    this._bound = [];
    this._stickId = null;
    this._install();
  }

  _on(el, type, fn, opts) {
    el.addEventListener(type, fn, opts || false);
    this._bound.push([el, type, fn, opts || false]);
  }

  _install() {
    const self = this;

    this._on(window, 'keydown', function (e) {
      const action = KEYMAP[e.code];
      // Tab bleibt der Tastaturbedienung vorbehalten, sobald ein Bedienelement
      // den Fokus hat – sonst kaeme man in den Fenstern nicht mehr weiter.
      const ae = document.activeElement;
      const uiFocused = !!(ae && ae !== document.body && ae !== self.target);
      const tabForUi = e.code === 'Tab' && uiFocused;
      if (PREVENT[e.code] && !isTextField(e.target) && !tabForUi) e.preventDefault();
      if (!action || isTextField(e.target) || tabForUi) return;
      if (!self.down[action]) self.justPressed[action] = true;
      self.down[action] = true;
      self.anyInputSeen = true;
    });

    this._on(window, 'keyup', function (e) {
      const action = KEYMAP[e.code];
      if (!action) return;
      self.down[action] = false;
      self.justReleased[action] = true;
    });

    // Beim Fensterwechsel alle Tasten loesen, sonst "klemmt" die Figur.
    this._on(window, 'blur', function () { self.releaseAll(); });
    this._on(document, 'visibilitychange', function () {
      if (document.hidden) self.releaseAll();
    });

    const hasPointer = typeof window.PointerEvent === 'function';
    const el = this.target;

    if (hasPointer) {
      this._on(el, 'pointermove', function (e) { self._movePointer(e); }, { passive: true });
      this._on(el, 'pointerdown', function (e) {
        if (e.pointerType === 'touch') self.setTouchMode(true);
        self._movePointer(e);
        self.pointer.down = true;
        self.pointer.justDown = true;
        self.anyInputSeen = true;
      });
      this._on(window, 'pointerup', function () {
        if (self.pointer.down) self.pointer.justUp = true;
        self.pointer.down = false;
      });
      this._on(el, 'pointerleave', function () { self.pointer.inside = false; });
      this._on(el, 'pointerenter', function () { self.pointer.inside = true; });
    } else {
      this._on(el, 'mousemove', function (e) { self._movePointer(e); });
      this._on(el, 'mousedown', function (e) {
        self._movePointer(e);
        self.pointer.down = true;
        self.pointer.justDown = true;
      });
      this._on(window, 'mouseup', function () {
        if (self.pointer.down) self.pointer.justUp = true;
        self.pointer.down = false;
      });
      this._on(el, 'touchstart', function (e) {
        self.setTouchMode(true);
        const t = e.changedTouches[0];
        self._movePointer(t);
        self.pointer.down = true;
        self.pointer.justDown = true;
      }, { passive: true });
      this._on(window, 'touchend', function () {
        if (self.pointer.down) self.pointer.justUp = true;
        self.pointer.down = false;
      }, { passive: true });
    }

    // Kontextmenue im Spielfeld stoert nur.
    this._on(el, 'contextmenu', function (e) { e.preventDefault(); });
  }

  _movePointer(e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.inside = true;
  }

  setTouchMode(on) {
    if (this.touchMode === on) return;
    this.touchMode = on;
    document.body.classList.toggle('touch', on);
    const panel = document.getElementById('touch');
    if (panel) panel.hidden = !on;
  }

  /** Bindet den Bildschirm-Joystick an ein DOM-Element. */
  attachStick(area, knob) {
    const self = this;
    const radius = 44;
    let originX = 0;
    let originY = 0;

    function start(x, y, id) {
      self._stickId = id;
      const r = area.getBoundingClientRect();
      originX = r.left + r.width / 2;
      originY = r.top + r.height / 2;
      self.stick.active = true;
      self.setTouchMode(true);
      move(x, y);
    }
    function move(x, y) {
      let dx = x - originX;
      let dy = y - originY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > radius) {
        dx = (dx / len) * radius;
        dy = (dy / len) * radius;
      }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      const dead = 8;
      self.stick.x = Math.abs(dx) < dead ? 0 : clamp(dx / radius, -1, 1);
      self.stick.y = Math.abs(dy) < dead ? 0 : clamp(dy / radius, -1, 1);
    }
    function end() {
      self._stickId = null;
      self.stick.active = false;
      self.stick.x = 0;
      self.stick.y = 0;
      knob.style.transform = '';
    }

    if (typeof window.PointerEvent === 'function') {
      this._on(area, 'pointerdown', function (e) {
        e.preventDefault();
        if (area.setPointerCapture) { try { area.setPointerCapture(e.pointerId); } catch (err) { /* egal */ } }
        start(e.clientX, e.clientY, e.pointerId);
      });
      this._on(area, 'pointermove', function (e) {
        if (self._stickId !== e.pointerId) return;
        e.preventDefault();
        move(e.clientX, e.clientY);
      });
      this._on(area, 'pointerup', function (e) { if (self._stickId === e.pointerId) end(); });
      this._on(area, 'pointercancel', function () { end(); });
    } else {
      this._on(area, 'touchstart', function (e) {
        e.preventDefault();
        const t = e.changedTouches[0];
        start(t.clientX, t.clientY, t.identifier);
      });
      this._on(area, 'touchmove', function (e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === self._stickId) move(t.clientX, t.clientY);
        }
      });
      this._on(area, 'touchend', function () { end(); });
      this._on(area, 'touchcancel', function () { end(); });
    }
  }

  /** Verknuepft eine DOM-Taste mit einer virtuellen Aktion (Touch-Bedienung). */
  attachButton(el, action) {
    const self = this;
    const press = function (e) {
      e.preventDefault();
      self.setTouchMode(true);
      if (!self.down[action]) self.justPressed[action] = true;
      self.down[action] = true;
    };
    const release = function () {
      self.down[action] = false;
      self.justReleased[action] = true;
    };
    if (typeof window.PointerEvent === 'function') {
      this._on(el, 'pointerdown', press);
      this._on(el, 'pointerup', release);
      this._on(el, 'pointercancel', release);
      this._on(el, 'pointerleave', release);
    } else {
      this._on(el, 'touchstart', press, false);
      this._on(el, 'touchend', release, false);
      this._on(el, 'mousedown', press);
      this._on(el, 'mouseup', release);
    }
  }

  /** Virtuelle Aktion aus Code ausloesen (z. B. Menuetaste). */
  trigger(action) {
    this.justPressed[action] = true;
  }

  isDown(action) {
    return !!this.down[action];
  }

  pressed(action) {
    return !!this.justPressed[action];
  }

  releaseAll() {
    this.down = Object.create(null);
    this.stick.x = 0;
    this.stick.y = 0;
  }

  /** Bewegungsrichtung, bereits normalisiert. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down.left) x -= 1;
    if (this.down.right) x += 1;
    if (this.down.up) y -= 1;
    if (this.down.down) y += 1;
    if (this.stick.x || this.stick.y) {
      x = this.stick.x;
      y = this.stick.y;
    }
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x: x, y: y, len: Math.min(1, len) };
  }

  /** Am Ende jedes Bildes aufrufen. */
  endFrame() {
    this.justPressed = Object.create(null);
    this.justReleased = Object.create(null);
    this.pointer.justDown = false;
    this.pointer.justUp = false;
  }

  destroy() {
    for (let i = 0; i < this._bound.length; i++) {
      const b = this._bound[i];
      b[0].removeEventListener(b[1], b[2], b[3]);
    }
    this._bound.length = 0;
  }
}

function isTextField(el) {
  if (!el || !el.tagName) return false;
  const t = el.tagName.toLowerCase();
  return t === 'input' || t === 'textarea' || t === 'select' || el.isContentEditable === true;
}
