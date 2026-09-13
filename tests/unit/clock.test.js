import test from 'node:test';
import assert from 'node:assert/strict';

import { makeClock, advance, shownAdvance, FIXED_DT, MAX_CATCHUP, MAX_FRAME } from '../../src/core/clock.js';

/**
 * Was hier geprüft wird, ist genau das, was man beim Spielen als „die Figur
 * springt manchmal" sieht: Die Simulation läuft völlig gleichmäßig, aber das
 * BILD zeigt mal einen, mal zwei, mal drei Schritte davon.
 *
 * Der Maßstab ist deshalb nicht die Zahl der Schritte, sondern `shownAdvance`:
 * wie weit die Welt seit dem letzten Bild gezeigt wird. Diese Zahl muss zur
 * verstrichenen Zeit passen – dann ist das Bild ruhig.
 */

function laufen(dtFolge) {
  const clock = makeClock();
  const bilder = [];
  let vorher = clock.alpha;
  for (const dt of dtFolge) {
    const steps = advance(clock, dt);
    bilder.push({ dt: dt, steps: steps, gezeigt: shownAdvance(steps, vorher, clock.alpha) });
    vorher = clock.alpha;
  }
  return { clock, bilder };
}

/** Streuung in Prozent vom Mittel – 0 heißt vollkommen gleichmäßig. */
function streuung(werte) {
  const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
  const v = werte.reduce((a, b) => a + (b - mittel) * (b - mittel), 0) / werte.length;
  return Math.sqrt(v) / mittel;
}

test('60 Hz: ein Schritt je Bild, gleichmäßig', () => {
  const { bilder } = laufen(new Array(300).fill(1 / 60));
  const nutz = bilder.slice(5);
  for (const b of nutz) assert.ok(b.steps <= 2, 'zu viele Schritte: ' + b.steps);
  const gezeigt = nutz.map((b) => b.gezeigt);
  assert.ok(streuung(gezeigt) < 0.001,
    'ungleichmäßig: ' + (streuung(gezeigt) * 100).toFixed(1) + ' %');
});

test('144 Hz: das Bild zeigt Zwischenstände statt zu ruckeln', () => {
  // DAS war der Fehler. Vorher lief bei dt < 1/60 ein Extraschritt mit der
  // Länge des Rests, und der Rest wurde danach auf null gesetzt: Die Schritte
  // waren ungleich lang, und ein Teil der Zeit ging verloren.
  const { bilder } = laufen(new Array(600).fill(1 / 144));
  const nutz = bilder.slice(10);
  const gezeigt = nutz.map((b) => b.gezeigt);
  assert.ok(streuung(gezeigt) < 0.001,
    'ungleichmäßig bei 144 Hz: ' + (streuung(gezeigt) * 100).toFixed(1) + ' %');

  // Und die Zeit muss stimmen: 600 Bilder à 1/144 s sind 4,17 s Spielzeit.
  const summe = nutz.reduce((a, b) => a + b.gezeigt, 0) * FIXED_DT;
  const soll = nutz.length / 144;
  assert.ok(Math.abs(summe - soll) < 0.02,
    'Zeit verloren oder erfunden: ' + summe.toFixed(3) + ' statt ' + soll.toFixed(3));
});

test('Ausgelassene Bilder zeigen mehr Welt, aber im richtigen Verhältnis', () => {
  // Wird beim Malen eines Bodenstücks ein Bild ausgelassen, dauert das Bild
  // doppelt so lang – dann DARF sich die Welt doppelt so weit bewegen. Ein
  // Sprung wäre es nur, wenn Zeit und Weg nicht zusammenpassen.
  const folge = [];
  for (let i = 0; i < 300; i++) folge.push(i % 7 === 0 ? 2 / 60 : 1 / 60);
  const { bilder } = laufen(folge);
  const nutz = bilder.slice(5);
  for (const b of nutz) {
    const erwartet = b.dt / FIXED_DT;
    assert.ok(Math.abs(b.gezeigt - erwartet) < 1e-9,
      'Weg passt nicht zur Zeit: ' + b.gezeigt.toFixed(3) + ' statt ' + erwartet.toFixed(3));
  }
});

test('Krumme Bildzeiten bleiben gleichmäßig', () => {
  // Ein echter Browser liefert keine glatten Zahlen.
  let n = 12345;
  const rnd = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
  const folge = [];
  for (let i = 0; i < 500; i++) folge.push((14 + rnd() * 6) / 1000);
  const { bilder } = laufen(folge);
  for (const b of bilder.slice(5)) {
    const erwartet = b.dt / FIXED_DT;
    assert.ok(Math.abs(b.gezeigt - erwartet) < 1e-9, JSON.stringify(b));
  }
});

test('Nach einem Aussetzer wird nicht nachgeholt, sondern weitergespielt', () => {
  // Das ist der sichtbare Sprung: eine halbe Sekunde Stillstand, danach schoss
  // die Figur ein Stück über die Wiese, weil die ganze Zeit nachsimuliert
  // wurde – und der Rest der Schuld noch über die folgenden Bilder.
  const clock = makeClock();
  advance(clock, 1 / 60);
  const steps = advance(clock, 0.5);
  assert.ok(steps <= MAX_CATCHUP, 'holt ' + steps + ' Schritte auf einmal nach');
  // Die halbe Sekunde wird zuerst auf MAX_FRAME gedeckelt, davon bleiben
  // MAX_CATCHUP Schritte übrig – der Rest ist bewusst verloren.
  const erwartetVerloren = MAX_FRAME - FIXED_DT * MAX_CATCHUP;
  assert.ok(Math.abs(clock.dropped - erwartetVerloren) < 1e-9,
    'verworfen: ' + clock.dropped.toFixed(4) + ', erwartet ' + erwartetVerloren.toFixed(4));

  // Und das nächste Bild ist wieder ein ganz normales.
  const danach = advance(clock, 1 / 60);
  assert.ok(danach <= 1, 'arbeitet immer noch Schulden ab: ' + danach);
});

test('Sehr lange Pausen zählen gar nicht erst', () => {
  const clock = makeClock();
  const steps = advance(clock, 30);
  assert.ok(steps <= MAX_CATCHUP);
  assert.ok(MAX_FRAME < 1, 'ein halbe Minute darf nie in die Simulation');
});

test('Alpha bleibt im Bereich', () => {
  let n = 999;
  const rnd = () => { n = (n * 1103515245 + 12345) >>> 0; return n / 4294967296; };
  const clock = makeClock();
  for (let i = 0; i < 2000; i++) {
    advance(clock, rnd() * 0.05);
    assert.ok(clock.alpha >= 0 && clock.alpha < 1, 'alpha = ' + clock.alpha);
    assert.ok(clock.accumulator >= 0 && clock.accumulator < FIXED_DT);
  }
});
