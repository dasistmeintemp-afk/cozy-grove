/**
 * Einstiegspunkt: Startbildschirm, Bildgroesse, Spielschleife.
 */
import { initArt } from './art/sprites.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { Game } from './game/game.js';
import * as storage from './core/storage.js';

const LOGICAL_W = 384;
const LOGICAL_H = 216;

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const boot = document.getElementById('boot');
const btnNew = document.getElementById('btn-new');
const btnContinue = document.getElementById('btn-continue');

let game = null;
let input = null;
let rafId = 0;
let lastTime = 0;
let accumulator = 0;
const FIXED_DT = 1 / 60;

function fitCanvas() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const mode = game && game.settings ? game.settings.scaling : 'crisp';
  let scale = Math.min(w / LOGICAL_W, h / LOGICAL_H);
  if (mode === 'crisp' && scale >= 1) scale = Math.floor(scale);
  if (scale <= 0) scale = 1;
  canvas.style.width = Math.round(LOGICAL_W * scale) + 'px';
  canvas.style.height = Math.round(LOGICAL_H * scale) + 'px';

  // Bedienelemente mitskalieren, aber in vernuenftigen Grenzen
  const uiScale = Math.max(0.85, Math.min(1.35, Math.min(w, h * 1.6) / 900 + 0.8));
  document.documentElement.style.setProperty('--ui-scale', uiScale.toFixed(2));

  if (game && game.ui) game.ui.layout();
}

function loop(now) {
  rafId = requestAnimationFrame(loop);
  if (!game) return;

  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  // Nach Tabwechsel oder Ruhezustand keine Riesenspruenge
  if (dt > 0.25) dt = 0.25;

  accumulator += dt;
  let steps = 0;
  // Wichtig: endFrame() gehoert hinter JEDEN Simulationsschritt. Sonst saehen
  // mehrere Schritte im selben Bild denselben Tastendruck – ein Fenster wuerde
  // sich sofort wieder schliessen, ein Axthieb doppelt zaehlen.
  while (accumulator >= FIXED_DT && steps < 5) {
    game.update(FIXED_DT);
    input.endFrame();
    accumulator -= FIXED_DT;
    steps++;
  }
  if (steps === 0 && accumulator > 0) {
    // sehr hohe Bildrate: trotzdem weiterlaufen lassen
    game.update(accumulator);
    input.endFrame();
    accumulator = 0;
  }

  game.draw();
}

function startGame(save) {
  audio.unlock();
  game = new Game(canvas, input);
  game.onSettingsChanged = fitCanvas;
  game.start(save);

  boot.classList.add('hidden');
  fitCanvas();
  game.ui.layout();

  if (!save) {
    setTimeout(function () {
      game.ui.toast('Willkommen auf der Insel', 'icon_sparkle');
    }, 500);
    setTimeout(function () {
      const c = game.world.campfire;
      if (c) game.ui.bubble(c.x, c.y - 30, 'Kalt hier …', [{ icon: 'icon_wood' }], 4);
    }, 1600);
  }

  lastTime = 0;
  accumulator = 0;
  if (!rafId) rafId = requestAnimationFrame(loop);
}

function setupTouch() {
  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  const btnAction = document.getElementById('btn-action');
  const btnTool = document.getElementById('btn-tool');
  input.attachStick(stick, knob);
  input.attachButton(btnAction, 'interact');
  input.attachButton(btnTool, 'nextTool');

  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse) input.setTouchMode(true);
}

function setupPanelButtons() {
  const nodes = document.querySelectorAll('[data-panel]');
  for (let i = 0; i < nodes.length; i++) {
    const name = nodes[i].getAttribute('data-panel');
    nodes[i].addEventListener('click', function () {
      if (game) game.openPanel(name);
    });
  }
}

function setupLifecycle() {
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', function () {
    setTimeout(fitCanvas, 250);
  });

  document.addEventListener('visibilitychange', function () {
    if (!game) return;
    if (document.hidden) {
      audio.suspend();
      game.save();
      lastTime = 0;
    } else {
      audio.resume();
      lastTime = 0;
    }
  });

  window.addEventListener('pagehide', function () {
    if (game) game.save();
  });

  // Klick ins Spielfeld: Ton wieder freigeben (Safari kann ihn anhalten)
  canvas.addEventListener('pointerdown', function () { audio.resume(); });
}

function main() {
  initArt();
  input = new Input(canvas);
  setupTouch();
  setupPanelButtons();
  setupLifecycle();
  fitCanvas();

  const save = storage.loadSave();
  if (save) {
    btnContinue.hidden = false;
    btnContinue.addEventListener('click', function () { startGame(save); });
    btnNew.textContent = 'Neu anfangen';
    btnNew.classList.remove('primary');
    btnContinue.classList.add('primary');
  }
  btnNew.addEventListener('click', function () {
    if (save && !window.confirm('Der alte Spielstand wird überschrieben. Fortfahren?')) return;
    storage.clearSave();
    startGame(null);
  });

  // Mit Leertaste/Enter direkt starten
  window.addEventListener('keydown', function onKey(e) {
    if (game) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      (save ? btnContinue : btnNew).click();
    }
  });

  // Fuer automatisierte Tests und die Konsole
  window.CozyGrove = {
    start: startGame,
    get game() { return game; },
    version: '1.0.0',
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
