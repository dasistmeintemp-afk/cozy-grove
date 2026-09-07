/**
 * Einstiegspunkt: Startbildschirm, Bildgröße, Spielschleife.
 */
import { initArt, hasSprite, spriteNames, spr } from './art/sprites.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { Game, parseSave } from './game/game.js';
import { openFile } from './core/savefile.js';
import * as storage from './core/storage.js';
import { makeClock, advance, FIXED_DT } from './core/clock.js';
import { applySeason } from './art/season.js';
import { seasonOf } from './game/calendar.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const boot = document.getElementById('boot');
const bootCard = document.getElementById('boot-card');
const btnNew = document.getElementById('btn-new');
const btnContinue = document.getElementById('btn-continue');
const btnLoad = document.getElementById('btn-load');
const bootNote = document.getElementById('boot-note');

let game = null;
let input = null;
let rafId = 0;
let lastTime = 0;
const clock = makeClock();

function fitCanvas() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  // Anpassung an das Fenster – NUR sie, nicht die ganze Größe.
  //
  // Vorher stand hier `--ui-scale`, und damit war die Einstellung im Spiel
  // wirkungslos: Sie wurde bei jedem Bildwechsel überschrieben. Jetzt gibt es
  // zwei Faktoren, `--ui-fit` (hier) und `--ui-user` (Einstellungen), die das
  // Stylesheet miteinander multipliziert.
  //
  // Die Zahl ist auf 1,0 bei einem üblichen Fenster (etwa 1280 breit) geeicht;
  // die Grundgrößen im Stylesheet sind die, die man dort sieht. Nach unten geht
  // es bis 0,84, damit auf einem Telefon nichts über den Rand läuft.
  const fit = Math.max(0.84, Math.min(1.08, 0.55 + Math.min(w, h * 1.6) / 2900));
  document.documentElement.style.setProperty('--ui-fit', fit.toFixed(3));

  if (game) game.syncViewport();
}

function loop(now) {
  rafId = requestAnimationFrame(loop);
  if (!game) return;

  if (!lastTime) lastTime = now;
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // endFrame() gehört hinter JEDEN Simulationsschritt – sonst sähen mehrere
  // Schritte im selben Bild denselben Tastendruck.
  const steps = advance(clock, dt);
  for (let i = 0; i < steps; i++) {
    game.update(FIXED_DT);
    input.endFrame();
  }

  // Der angebrochene Schritt wird NICHT simuliert, sondern gezeichnet: das
  // Bild zeigt den Zwischenstand. Vorher lief hier ein zusätzlicher Schritt
  // von der Länge des Rests, und der Rest wurde danach weggeworfen. Auf einem
  // 60-Hz-Bildschirm fiel das kaum auf; auf 120 oder 144 Hz war fast jeder
  // Schritt kürzer als 1/60 s, und die Figur lief mit ungleichmäßigem Takt.
  const drawStart = performance.now();
  const gezeichnet = game.draw(clock.alpha);
  const drawMs = performance.now() - drawStart;

  // Hinter einem offenen Fenster wird nichts gezeichnet – dann darf auch die
  // Auflösung nicht nachgeregelt und kein Bodenstück vorgemalt werden. Sonst
  // hielte das Spiel die kurze Bildzeit für Leistungsreserve und finge an,
  // ausgerechnet dort zu arbeiten, wo man gerade in Ruhe etwas ansieht.
  if (!gezeichnet) return;

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
  clock.accumulator = 0;
  clock.alpha = 0;
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
      // Die Jahreszeit MUSS vor dem Malen feststehen: Danach stehen die
      // Grafiken, und ein Wechsel bliebe ohne Wirkung. Dafür kostet er so
      // auch nichts – die Wiese und die Kronen kommen von selbst richtig.
      applySeason(seasonOf(new Date()).id);
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
    // `of` gibt den Registereintrag heraus: { c, g, w, h, ... }. Nur zum
    // Hinsehen gedacht – die Prüfungen im Browser messen damit, ob eine
    // Grafik wirklich gemalt wurde und nicht nur einen Namen hat.
    art: { has: hasSprite, names: spriteNames, of: spr },
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

    // Spielstand aus einer Datei – direkt auf dem Startbildschirm.
    //
    // Genau hier braucht man ihn: Wer eine neuere Fassung des Spiels bekommt
    // und sie öffnet, sieht womöglich nur „Neues Spiel", weil der Browser den
    // Speicher an die alte Datei gebunden hat. Der Weg über die Einstellungen
    // führt durch ein Spiel, das man dafür erst anfangen müsste – und wer
    // dafür „Neues Spiel" drückt, hat den alten Stand überschrieben.
    btnLoad.addEventListener('click', function () {
      openFile().then(function (text) {
        if (!text) return;
        const geprueft = parseSave(text);
        if (!geprueft.ok) {
          bootNote.hidden = false;
          bootNote.textContent = geprueft.reason + '. Es wurde nichts überschrieben.';
          return;
        }
        storage.writeSave(geprueft.data);
        startGame(geprueft.data);
      });
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
