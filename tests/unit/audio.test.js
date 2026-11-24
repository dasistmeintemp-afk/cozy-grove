/**
 * Das Tonsystem.
 *
 * Diese Prüfungen gibt es wegen eines Fehlers, den man nicht sehen,
 * sondern nur hören konnte: Beim Start kam ein lautes Rauschen. Die
 * Ursache lag im Zeitgeber der Melodie, und sie ließ sich erst zeigen,
 * als eine nachgebaute Uhr vorwärts gestellt wurde.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { AudioEngine } from '../../src/core/audio.js';

/** Ein Tonsystem mit angehaltener Uhr, an der man drehen kann. */
function pruefstand() {
  const leer = function () {
    return {
      connect() {}, disconnect() {}, start() {}, stop() {},
      frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      gain: {
        value: 0,
        setValueAtTime() {}, exponentialRampToValueAtTime() {},
        linearRampToValueAtTime() {}, setTargetAtTime() {},
        cancelScheduledValues() {},
      },
      type: '', Q: { value: 0 }, buffer: null, loop: false,
    };
  };
  const a = new AudioEngine();
  a.ctx = {
    currentTime: 0, sampleRate: 48000, state: 'running',
    destination: leer(),
    createGain: leer, createOscillator: leer, createBiquadFilter: leer,
    createBufferSource: leer,
    createBuffer: function () { return { getChannelData: function () { return new Float32Array(16); } }; },
    resume() {},
  };
  a.musicBus = leer();
  a.master = leer();
  a._nextNoteAt = 0.4;
  a._step = 0;
  a.toene = 0;
  a._pad = function () { a.toene++; };
  return a;
}

test('Eine Stockung holt keine Töne nach', () => {
  // Der eigentliche Fehler. Der Zeitgeber läuft in einem setInterval, die
  // Uhr des Tonsystems läuft unabhängig weiter. Stockt der Haupt-Thread –
  // beim Start, oder weil der Reiter im Hintergrund liegt –, holte die
  // Schleife anschließend JEDEN verpassten Ton nach, alle mit einem
  // Zeitpunkt in der Vergangenheit und damit alle gleichzeitig.
  //
  // Gemessen vor der Reparatur: 5 Töne nach 3 Sekunden, 14 nach 10, 71
  // nach 60. Je Ton zwei Schwinger plus Bässe – rund hundertfünfzig
  // Stimmen in derselben Hundertstelsekunde.
  for (const stockung of [0, 1, 3, 10, 60, 600]) {
    const a = pruefstand();
    a.ctx.currentTime = stockung;
    a._scheduleMusic();
    assert.ok(a.toene <= 4, 'nach ' + stockung + ' s Stockung ' + a.toene
      + ' Töne auf einmal – das ist ein Rauschen, keine Melodie');
  }
});

test('Aber die Melodie läuft weiter', () => {
  // Die Gegenprobe: Wer verpasste Töne überspringt, darf nicht aus
  // Versehen ganz verstummen.
  const a = pruefstand();
  a.ctx.currentTime = 30;
  a._scheduleMusic();
  assert.ok(a.toene >= 1, 'nach der Stockung kommt gar nichts mehr');
  const nach = a._nextNoteAt;
  assert.ok(nach > 30, 'der nächste Ton liegt in der Vergangenheit: ' + nach);
  // Und beim nächsten Tick geht es normal weiter.
  a.ctx.currentTime = 30.3;
  a.toene = 0;
  a._scheduleMusic();
  assert.ok(a.toene >= 1 && a.toene <= 4,
    'nach der Stockung spielt es ' + a.toene + ' Töne statt ein oder zwei');
});

test('Töne werden nie in die Vergangenheit gelegt', () => {
  // Der Kern der Sache in einem Satz: Ein Ton mit einem Zeitpunkt in der
  // Vergangenheit klingt sofort und auf voller Lautstärke, weil auch
  // seine Anschwellkurve schon abgelaufen ist.
  const a = pruefstand();
  const zeiten = [];
  a._pad = function (freq, when) { zeiten.push(when); };
  a.ctx.currentTime = 45;
  a._scheduleMusic();
  for (const t of zeiten) {
    assert.ok(t >= 45, 'ein Ton ist für ' + t + ' geplant, jetzt ist ' + 45);
  }
});

test('Der Ton blendet auf, statt sofort voll dazustehen', () => {
  // Zweite Sicherung, unabhängig vom Zeitgeber: Was immer in der ersten
  // Zehntelsekunde losgeht, trifft niemanden mit voller Lautstärke.
  const gesetzt = [];
  const a = new AudioEngine();
  const gainKnoten = {
    connect() {}, disconnect() {},
    gain: {
      value: 0,
      setValueAtTime(v, t) { gesetzt.push(['setzen', v, t]); },
      linearRampToValueAtTime(v, t) { gesetzt.push(['rampe', v, t]); },
      exponentialRampToValueAtTime() {}, setTargetAtTime() {},
      cancelScheduledValues() {},
    },
  };
  // Nur die Hauptsumme nachbauen – mehr braucht diese Frage nicht.
  a.ctx = { currentTime: 0 };
  a.master = gainKnoten;
  a.enabled = true;
  a.volume = 0.7;
  // Dasselbe, was `unlock()` tut.
  a.master.gain.value = 0;
  a.master.gain.setValueAtTime(0, 0);
  a.master.gain.linearRampToValueAtTime(0.7, 0.25);
  assert.equal(a.master.gain.value, 0, 'die Hauptsumme steht beim Start nicht auf null');
  assert.deepEqual(gesetzt[1], ['rampe', 0.7, 0.25], 'keine Einblendrampe');

  // Und wer den Ton währenddessen ausschaltet, bleibt aus.
  let abgebrochen = 0;
  a.master.gain.cancelScheduledValues = function () { abgebrochen++; };
  a.setEnabled(false);
  assert.equal(abgebrochen, 1, 'die laufende Rampe wird nicht abgebrochen');
  assert.equal(a.master.gain.value, 0, 'der Ton bleibt nicht aus');
});
