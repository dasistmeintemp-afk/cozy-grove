/**
 * Einstiegspunkt: Startbildschirm, Bildgröße, Spielschleife.
 */
import { initArt, hasSprite, spriteNames } from './art/sprites.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { Game } from './game/game.js';
import * as storage from './core/storage.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const boot = document.getElementById('boot');
const bootCard = document.getElementById('boot-card');
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
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const uiScale = Math.max(0.85, Math.min(1.35, Math.min(w, h * 1.6) / 900 + 0.8));
  document.documentElement.style.setProperty('--ui-scale', uiScale.toFixed(2));

  if (game) game.syncViewport();
}

function loop(now) {
  rafId = requestAnimationFrame(loop);
  if (!game) return;

  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.25) dt = 0.25;

  accumulator += dt;
  let steps = 0;
  // endFrame() gehört hinter JEDEN Simulationsschritt – sonst sähen mehrere
  // Schritte im selben Bild denselben Tastendruck.
  while (accumulator >= FIXED_DT && steps < 5) {
    game.update(FIXED_DT);
    input.endFrame();
    accumulator -= FIXED_DT;
    steps++;
  }
  if (steps === 0 && accumulator > 0) {
    game.update(accumulator);
    input.endFrame();
    accumulator = 0;
  }

  const drawStart = performance.now();
  game.draw();
  const drawMs = performance.now() - drawStart;
  if (game.renderer.adapt(drawMs, game.camera)) {
    game.ui.layout();
    game.ground.prewarm(game.camera.ox, game.camera.oy,
      game.renderer.viewW, game.renderer.viewH);
  }

  // War das Bild schnell, ist noch Zeit für ein Bodenstück, das bald ins Bild
  // kommt. So entsteht der Ruckler gar nicht erst, statt ihn nur zu verteilen.
  if (drawMs < 5) {
    game.ground.paintAhead(game.camera.ox, game.camera.oy,
      game.renderer.viewW, game.renderer.viewH);
  }
}

function startGame(save) {
  audio.unlock();
  game = new Game(canvas, input);
  game.onSettingsChanged = fitCanvas;
  game.start(save);

  boot.classList.add('hidden');
  fitCanvas();

  if (!save) {
    setTimeout(function () {
      game.ui.toast('Willkommen auf der Insel, Seli', 'icon_sparkle');
    }, 500);
    setTimeout(function () {
      const c = game.world.campfire;
      if (c) game.ui.bubble(c.x, c.y - 150, 'Kalt hier …', [{ icon: 'icon_wood' }], 4);
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

  canvas.addEventListener('pointerdown', function () { audio.resume(); });
}

/** Die Grafik entsteht erst beim Start – das dauert einen Moment. */
function paintArt(done) {
  const note = document.createElement('p');
  note.className = 'blurb';
  note.id = 'boot-progress';
  note.textContent = 'Die Insel wird gemalt …';
  bootCard.appendChild(note);
  // Ein Bild abwarten, damit der Hinweis wirklich erscheint
  requestAnimationFrame(function () {
    setTimeout(function () {
      const t0 = (window.performance || Date).now();
      initArt();
      const ms = Math.round(((window.performance || Date).now()) - t0);
      if (window.console && window.console.info) console.info('Grafik gemalt in ' + ms + ' ms');
      if (note.parentNode) note.parentNode.removeChild(note);
      done();
    }, 30);
  });
}

function main() {
  input = new Input(canvas);
  setupTouch();
  setupPanelButtons();
  setupLifecycle();
  fitCanvas();

  const save = storage.loadSave();

  // Für automatisierte Tests und die Konsole
  window.CozyGrove = {
    start: startGame,
    ready: false,
    get game() { return game; },
    art: { has: hasSprite, names: spriteNames },
    version: '2.0.0',
  };

  paintArt(function () {
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

    window.addEventListener('keydown', function (e) {
      if (game) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        (save ? btnContinue : btnNew).click();
      }
    });

    window.CozyGrove.ready = true;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
