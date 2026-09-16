/**
 * Die Weisen – klingt jede Jahreszeit anders, und klingt keine falsch?
 *
 * Zwei Sorten Prüfung, und die zweite ist die, die man nicht hört, bis sie
 * fehlt:
 *
 * 1. **Verschiedenheit.** Vier Jahreszeiten sollen vier Melodien haben, nicht
 *    viermal dieselbe mit anderem Tempo. Geprüft an Tonleiter, Phrase und
 *    Schleifendauer.
 * 2. **Verträglichkeit.** Alles bleibt fünftönig und ohne Halbtonreibung.
 *    Eine Jahreszeit, in der ein falscher Ton möglich wäre, wäre eine
 *    Jahreszeit, in der man die Musik ausschaltet – und das war der ganze
 *    Grund, in der ersten Fassung pentatonisch zu bleiben.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEITERN, WEISEN, FEST_WEISE, NACHT, DRINNEN,
  leiterVon, weiseFuer, weisenName, schleifenDauer,
} from '../../src/game/musik.js';
import { noteHz } from '../../src/core/audio.js';
import { SEASON_IDS } from '../../src/game/calendar.js';

const ALLE = Object.keys(WEISEN).map((k) => WEISEN[k]).concat([FEST_WEISE]);

test('Jede Jahreszeit hat eine Weise – und keine zu viel', () => {
  // Die Kennungen müssen dieselben sein wie im Kalender, sonst fällt eine
  // Jahreszeit still auf die Frühlingsweise zurück.
  for (const id of SEASON_IDS) {
    assert.ok(WEISEN[id], 'keine Weise für ' + id);
  }
  assert.equal(Object.keys(WEISEN).length, SEASON_IDS.length,
    'eine Weise ohne Jahreszeit: ' + Object.keys(WEISEN).join(', '));
});

test('Alles bleibt fünftönig und ohne Halbtonreibung', () => {
  // Der Grund, warum die erste Fassung pentatonisch war, gilt weiter: In
  // einer Leiter, in der zwei Töne einen Halbton auseinanderliegen, kann ein
  // Ton gegen den nächsten klingen. Hier kann das keiner.
  for (const name in LEITERN) {
    const l = LEITERN[name];
    assert.equal(l.length, 5, name + ': ' + l.length + ' Töne');
    for (let i = 0; i < l.length; i++) {
      assert.ok(l[i] >= 0 && l[i] < 12, name + ': ' + l[i] + ' liegt außerhalb der Oktave');
      const naechster = i + 1 < l.length ? l[i + 1] : l[0] + 12;
      assert.ok(naechster - l[i] >= 2,
        name + ': Halbtonschritt zwischen ' + l[i] + ' und ' + naechster);
    }
    // Aufsteigend und ohne Doppelung.
    assert.deepEqual(l.slice().sort((a, b) => a - b), l, name + ': nicht aufsteigend');
    assert.equal(new Set(l).size, l.length, name + ': ein Ton doppelt');
  }
});

test('Jede Weise nennt eine Leiter, die es gibt', () => {
  for (const w of ALLE) {
    assert.ok(LEITERN[w.leiter], w.name + ': Leiter „' + w.leiter + '" gibt es nicht');
    assert.equal(leiterVon(w), LEITERN[w.leiter]);
  }
  // Und ein Unfall fällt auf Dur zurück, statt das Spiel stumm zu machen.
  assert.equal(leiterVon({ leiter: 'gibtsnicht' }), LEITERN.dur);
  assert.equal(leiterVon(null), LEITERN.dur);
});

test('Vier Jahreszeiten, vier verschiedene Leitern', () => {
  // Sonst wären es vier Tempi und eine Melodie.
  const leitern = SEASON_IDS.map((id) => WEISEN[id].leiter);
  assert.equal(new Set(leitern).size, leitern.length,
    'zwei Jahreszeiten teilen sich eine Leiter: ' + leitern.join(', '));
});

test('Und vier verschiedene Phrasen, auch in der Länge', () => {
  const phrasen = SEASON_IDS.map((id) => WEISEN[id].phrase.join(','));
  assert.equal(new Set(phrasen).size, phrasen.length, 'zwei gleiche Phrasen');
  // Verschieden lang: Bei überall sechzehn liefen Melodie und Basston immer
  // gleich, und jede Jahreszeit hätte dieselbe Form mit anderen Tönen.
  const laengen = SEASON_IDS.map((id) => WEISEN[id].phrase.length);
  assert.ok(new Set(laengen).size >= 3,
    'die Phrasen sind fast alle gleich lang: ' + laengen.join(', '));
});

test('Keine Weise wiederholt sich zu schnell – und keine schläft ein', () => {
  // Die erste Fassung lief 14,7 Sekunden im Kreis. Kürzer soll keine sein;
  // zu lang wird aus der Melodie ein Nebel, in dem nichts wiederkehrt.
  for (const w of ALLE) {
    const d = schleifenDauer(w);
    assert.ok(d >= 10, w.name + ': Schleife von nur ' + d.toFixed(1) + ' s');
    assert.ok(d <= 40, w.name + ': Schleife von ' + d.toFixed(1) + ' s');
  }
});

test('Jede Weise hat brauchbare Werte', () => {
  for (const w of ALLE) {
    assert.ok(w.name && w.name.length > 2, 'eine Weise ohne Namen');
    assert.ok(w.phrase.length >= 8, w.name + ': zu kurze Phrase');
    assert.ok(w.beat > 0.4 && w.beat < 2, w.name + ': Takt ' + w.beat);
    assert.ok(w.dichte > 0.3 && w.dichte <= 1, w.name + ': Dichte ' + w.dichte);
    assert.ok(w.bass >= 0 && w.bass <= 16, w.name + ': Bass alle ' + w.bass);
    assert.ok(w.laut > 0 && w.laut < 0.12, w.name + ': laut ' + w.laut);
    for (const st of w.phrase) {
      assert.ok(Number.isInteger(st), w.name + ': keine ganze Stufe: ' + st);
      assert.ok(st >= -8 && st <= 12, w.name + ': Stufe ' + st + ' liegt zu weit weg');
    }
  }
});

test('Das Fest schlägt die Jahreszeit', () => {
  // Wie beim Tagesereignis, und aus demselben Grund: Zwei Besonderheiten an
  // einem Tag wären keine mehr.
  for (const id of SEASON_IDS) {
    const ohne = weiseFuer({ season: id });
    const mit = weiseFuer({ season: id, fest: true });
    assert.equal(ohne.name, WEISEN[id].name);
    assert.equal(mit.name, FEST_WEISE.name, id + ': am Fest klingt es wie sonst');
  }
});

test('Nachts wird es langsamer, tiefer, dünner und leiser', () => {
  for (const id of SEASON_IDS) {
    const tag = weiseFuer({ season: id });
    const nacht = weiseFuer({ season: id, nacht: true });
    assert.ok(nacht.beat > tag.beat, id + ': nachts nicht langsamer');
    assert.ok(nacht.lage < tag.lage, id + ': nachts nicht tiefer');
    assert.ok(nacht.dichte < tag.dichte, id + ': nachts nicht dünner');
    assert.ok(nacht.laut < tag.laut, id + ': nachts nicht leiser');
    // Dieselbe Melodie, nur anders gespielt – die Phrase bleibt.
    assert.deepEqual(nacht.phrase, tag.phrase);
    assert.equal(nacht.toene, tag.toene);
  }
});

test('Drinnen wird es leiser und dünner – aber nicht tiefer', () => {
  // Ein Zimmer ist kein Keller, es ist nur ruhiger.
  for (const id of SEASON_IDS) {
    const draussen = weiseFuer({ season: id });
    const drinnen = weiseFuer({ season: id, drinnen: true });
    assert.ok(drinnen.laut < draussen.laut, id + ': drinnen nicht leiser');
    assert.ok(drinnen.dichte < draussen.dichte, id + ': drinnen nicht dünner');
    assert.equal(drinnen.lage, draussen.lage, id + ': drinnen tiefer gestimmt');
    assert.equal(DRINNEN.lage, 0);
  }
});

test('Nacht und Zimmer zusammen wirken beide', () => {
  const beides = weiseFuer({ season: 'winter', nacht: true, drinnen: true });
  const nurNacht = weiseFuer({ season: 'winter', nacht: true });
  assert.ok(beides.laut < nurNacht.laut);
  assert.ok(beides.dichte < nurNacht.dichte);
  // Und es wird nicht so leise, dass gar nichts mehr da ist.
  assert.ok(beides.laut > 0.01, 'unhörbar: ' + beides.laut);
  assert.ok(beides.dichte > 0.2, 'fast nur noch Pause: ' + beides.dichte);
});

test('Der Name sagt, welche Lage gemeint ist – und zwar eindeutig', () => {
  // Daran erkennt der Klangerzeuger den Wechsel und fängt die Phrase von
  // vorn an. Zwei Lagen mit demselben Namen bekämen denselben Wechsel nie.
  const namen = new Set();
  for (const id of SEASON_IDS) {
    for (const fest of [false, true]) {
      for (const nacht of [false, true]) {
        for (const drinnen of [false, true]) {
          namen.add(weisenName({ season: id, fest: fest, nacht: nacht, drinnen: drinnen }));
        }
      }
    }
  }
  // Vier Jahreszeiten mal vier Zustände = 16, dazu das Fest mit vier
  // Zuständen (das für alle Jahreszeiten gleich ist).
  assert.equal(namen.size, SEASON_IDS.length * 4 + 4, Array.from(namen).join(' | '));
});

test('Eine unbekannte Jahreszeit macht das Spiel nicht stumm', () => {
  const w = weiseFuer({ season: 'gibtsnicht' });
  assert.equal(w.name, WEISEN.spring.name);
  assert.ok(weiseFuer(null).phrase.length > 0);
  assert.ok(weiseFuer({}).phrase.length > 0);
});

test('Jede Weise lässt sich wirklich spielen – jeder Ton eine echte Frequenz', () => {
  // Die Prüfung, die gefehlt hat.
  //
  // Alles oben war grün, und im Browser kam aus JEDEM Ton NaN heraus: Die
  // Weise reichte den NAMEN ihrer Tonleiter weiter („dur") statt der
  // Halbtöne. Eine Zeichenkette hat auch eine Länge und auch einen Index,
  // also lief die Rechnung durch – `sk[idx]` war der Buchstabe „d", und
  // `Math.pow(2, 'd0' / 12)` ist NaN. Zu hören war nichts.
  //
  // Deshalb hier die ECHTE Rechnung aus `audio.js` und keine Nachbildung:
  // Eine Kopie hätte denselben Fehler nicht gehabt und den Fall bestanden.
  const lagen = [];
  for (const id of SEASON_IDS) {
    for (const fest of [false, true]) {
      for (const nacht of [false, true]) {
        for (const drinnen of [false, true]) {
          lagen.push({ season: id, fest: fest, nacht: nacht, drinnen: drinnen });
        }
      }
    }
  }
  for (const lage of lagen) {
    const w = weiseFuer(lage);
    assert.ok(Array.isArray(w.toene), w.name + ': `toene` ist keine Liste');
    for (const t of w.toene) {
      assert.ok(Number.isFinite(t), w.name + ': kein Halbton, sondern ' + JSON.stringify(t));
    }
    for (let s = 0; s < w.phrase.length; s++) {
      const stufe = w.phrase[s] + w.lage;
      // Melodie und Basston – beide gehen durch dieselbe Rechnung.
      for (const hz of [noteHz(stufe, w.toene), noteHz(stufe - 7, w.toene)]) {
        assert.ok(Number.isFinite(hz), w.name + ', Schritt ' + s + ': ' + hz);
        // Und in einem Bereich, den ein Notebook auch wiedergibt.
        //
        // Diese Schranke hat gleich beim ersten Lauf etwas gefunden: Der
        // Winter fiel nachts mit dem Basston auf 27 Hz – drei
        // Verschiebungen nach unten übereinander (Jahreszeit, Nacht, Bass).
        // Gerechnet stimmte alles, zu hören wäre nichts gewesen.
        //
        // 65 Hz ist das C der großen Oktave, 1760 Hz das hohe A.
        assert.ok(hz >= 65 && hz <= 1760,
          w.name + ', Schritt ' + s + ': ' + hz.toFixed(1) + ' Hz');
      }
    }
  }
});

test('Die dunklen Jahreszeiten klingen auch wirklich tiefer', () => {
  // Die Absicht in Zahlen: Das Fest steht am höchsten, der Winter am
  // tiefsten. Nachprüfbar ist das nur am KLINGENDEN Ton, nicht an `lage` –
  // die Winterphrase fällt von sich aus drei Stufen unter ihren Grundton,
  // die Frühlingsphrase keine. Wer die beiden Lagen vergleicht, vergleicht
  // zwei Zahlen, die verschiedenes bedeuten.
  const tiefsterTon = (lage) => {
    const w = weiseFuer(lage);
    let tief = Infinity;
    for (const st of w.phrase) tief = Math.min(tief, noteHz(st + w.lage, w.toene));
    return tief;
  };
  const fest = tiefsterTon({ season: 'spring', fest: true });
  const fruehling = tiefsterTon({ season: 'spring' });
  const sommer = tiefsterTon({ season: 'summer' });
  const herbst = tiefsterTon({ season: 'autumn' });
  const winter = tiefsterTon({ season: 'winter' });
  assert.ok(fest > sommer, 'das Fest klingt nicht heller als der Sommer');
  assert.ok(fruehling > herbst, 'der Frühling klingt nicht heller als der Herbst');
  assert.ok(sommer > winter, 'der Sommer klingt nicht heller als der Winter');
  // Herbst und Winter liegen gleich tief – der Unterschied zwischen ihnen
  // sind Tonleiter, Tempo und Pausen, nicht die Höhe. Deshalb steht hier
  // KEINE Behauptung „Winter tiefer als Herbst": Sie wäre falsch, und als
  // `<=` wäre sie nur eine Zeile, die immer durchgeht.
  //
  // Was hier zählt, ist der ABSTAND zwischen der hellsten und der dunkelsten
  // Jahreszeit. Ohne ihn liegen vier Melodien in derselben Lage, und die
  // Jahreszeit hörte man nur noch an der Tonleiter.
  const spanne = sommer / Math.min(herbst, winter);
  assert.ok(spanne >= 1.4,
    'die Jahreszeiten liegen zu dicht beieinander: Sommer ab ' +
    sommer.toFixed(0) + ' Hz, dunkelste ab ' +
    Math.min(herbst, winter).toFixed(0) + ' Hz (Faktor ' + spanne.toFixed(2) + ')');
});

test('Die Änderungen sind Faktoren und ändern die Weisen nicht', () => {
  // `weiseFuer` gibt eine Kopie zurück. Änderte es die Vorlage, wäre die
  // Nacht nach dem ersten Abend dauerhaft – und jede weitere Nacht noch
  // langsamer.
  const vorher = JSON.stringify(WEISEN.winter);
  weiseFuer({ season: 'winter', nacht: true, drinnen: true });
  weiseFuer({ season: 'winter', nacht: true, drinnen: true });
  assert.equal(JSON.stringify(WEISEN.winter), vorher, 'die Vorlage wurde verändert');
  assert.ok(NACHT.beat > 1 && DRINNEN.beat > 1);
});
