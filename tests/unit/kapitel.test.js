/**
 * Kapitel – trägt der zweite Bogen wirklich?
 *
 * Diese Datei prüft vor allem EINE Sache, und es ist die, um derer willen die
 * Kapitel überhaupt gebaut wurden: **dass sie nicht wieder an der Farbanzeige
 * hängen.** Das Spiel hatte elf Meilensteine auf einem Prozentbalken, und
 * genau das sollten die Kapitel nicht verdoppeln. Eine Zahl, die aus Versehen
 * zu hoch gerät – ein `boden` von 0,95 etwa –, macht aus einem Kapitel
 * stillschweigend wieder eine Prozentstufe. Das sieht man beim Lesen nicht und
 * beim Spielen erst nach Wochen, deshalb steht hier eine Prüfung dagegen.
 *
 * Die zweite Sache ist Regel 2: Kapitel legen sich übereinander, sie lösen
 * einander nicht ab. Ein `offeneKapitel`, das nur das jüngste herausgibt,
 * würde alles aus früheren Kapiteln abschalten – und ein Spiel, das einem die
 * Gezeiten wieder wegnimmt, wenn der Nachbar einzieht, wäre kaputt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  KAPITEL, KAPITEL_IDS,
  kapitelVon, offenAm, offeneKapitel, jetzigesKapitel, naechstesKapitel,
  emptyKapitel, neueKapitel, kapitelSteht, kapitelHat, sachenAus, kapitelStand,
} from '../../src/game/kapitel.js';

/**
 * Die Kapitel, deren Inhalt wirklich gebaut ist.
 *
 * Fast alles hier rechnet mit DIESER Liste und nicht mit `KAPITEL`: Ein
 * Kapitel ohne Inhalt geht nicht auf (siehe `inhalt` in `kapitel.js`), und
 * eine Prüfung, die trotzdem alle fünf erwartet, prüft eine Welt, die es
 * nicht gibt.
 */
const GEBAUT = KAPITEL.filter(function (k) { return k.inhalt; });

/** Ein Stand, in dem die ersten `n` gebauten Kapitel offen sind. */
function standMit(n) {
  const s = emptyKapitel();
  for (let i = 0; i < n && i < GEBAUT.length; i++) s.offen[GEBAUT[i].id] = 1 + i;
  return s;
}

test('die Zeit ist die Achse, nicht der Fortschritt', function () {
  // Der Kern der ganzen Bauart. Wer am Tag des Kapitels ankommt, soll es
  // bekommen – und zwar mit einem Fortschritt, den man an diesem Tag
  // normalerweise WIRKLICH hat. 100 % erreicht man bei rund 330 Aufträgen;
  // ein Boden über 0,8 würde ein Kapitel also hinter das Spielende schieben.
  for (const k of KAPITEL) {
    assert.ok(k.boden <= 0.8, k.id + ': boden ' + k.boden + ' schiebt das Kapitel hinter das Spielende');
  }

  // Und die Sicherung muss eine Sicherung bleiben: Sie darf nie strenger
  // sein als das, was man bis dahin ohnehin geschafft hat. Als grobes Maß
  // ein Prozentpunkt je Inseltag – wer zwölf Tage spielt, hat deutlich mehr
  // als 8 % eingefärbt.
  for (const k of KAPITEL) {
    assert.ok(k.boden <= k.ab / 100, k.id + ': boden ' + k.boden + ' ist strenger als der Tag ' + k.ab + ' hergibt');
  }
});

test('Kapitel legen sich übereinander und nehmen nichts weg', function () {
  // Regel 2. Am Tag des letzten gebauten Kapitels müssen ALLE gebauten
  // offen sein.
  const letztes = GEBAUT[GEBAUT.length - 1];
  const alle = offeneKapitel(letztes.ab, 1);
  assert.equal(alle.length, GEBAUT.length);

  // Und auf dem Weg dorthin wächst die Zahl nur, sie fällt nie.
  let vorher = 0;
  for (let tag = 1; tag <= letztes.ab + 30; tag++) {
    const n = offeneKapitel(tag, 1).length;
    assert.ok(n >= vorher, 'Tag ' + tag + ': von ' + vorher + ' auf ' + n + ' gefallen');
    vorher = n;
  }
  assert.equal(vorher, GEBAUT.length);

  // Dasselbe für die Sachen: Was ein Kapitel gebracht hat, bleibt da.
  let hatte = 0;
  for (let n = 1; n <= GEBAUT.length; n++) {
    const jetzt = sachenAus(standMit(n)).length;
    assert.ok(jetzt >= hatte, 'Kapitel ' + n + ': Sachen von ' + hatte + ' auf ' + jetzt + ' gefallen');
    hatte = jetzt;
  }
});

test('am ersten Tag ist man schon in einem Kapitel', function () {
  // Ein Bogen, der erst beim zweiten Punkt anfängt, sieht von vorn wie
  // keiner aus.
  const k = jetzigesKapitel(1, 0);
  assert.ok(k);
  assert.equal(k.id, 'ankunft');
  assert.ok(offenAm(KAPITEL[0], 1, 0));
});

test('kein Kapitel lässt sich verpassen', function () {
  // Regel 4: Wer drei Wochen wegbleibt, findet alles vor, was fällig war.
  // Geprüft als Sprung – nicht Tag für Tag, sondern direkt von 1 auf 60.
  const sprung = offeneKapitel(60, 1).map(function (k) { return k.id; });
  const schritt = [];
  for (let tag = 1; tag <= 60; tag++) {
    for (const k of offeneKapitel(tag, 1)) {
      if (schritt.indexOf(k.id) < 0) schritt.push(k.id);
    }
  }
  assert.deepEqual(sprung, schritt);

  // Und `neueKapitel` muss nach dem Sprung alle vier auf einmal melden.
  const neu = neueKapitel(emptyKapitel(), 60, 1);
  assert.equal(neu.length, sprung.length);
});

test('neueKapitel verändert den Stand nicht', function () {
  // Derselbe Schnitt wie bei `dueAt`. Die Schleife im Spiel fragt einmal je
  // Sekunde; eine Funktion, die beim Fragen schon einträgt, meldet beim
  // zweiten Mal nichts mehr – und die Meldung wäre weg, bevor sie jemand
  // gesehen hat.
  const stand = emptyKapitel();
  const erst = neueKapitel(stand, 40, 1);
  const nochmal = neueKapitel(stand, 40, 1);
  assert.ok(erst.length > 0);
  assert.deepEqual(erst.map(function (k) { return k.id; }), nochmal.map(function (k) { return k.id; }));
  assert.equal(Object.keys(stand.offen).length, 0);
});

test('was ein offenes Kapitel verspricht, löst das Spiel auch ein', function () {
  // Die Prüfung, die gefehlt hat – und der teuerste Fehler dieser ganzen
  // Reihe. Fünf Kapitel standen in der Liste, alle fünf gingen auf, aber
  // nur eines hatte gebauten Inhalt. Das Spiel meldete an Tag 12 „Das
  // Wasser steht heute tiefer als sonst. Da hinten liegt Grund frei", und
  // es gab keine Gezeiten; an Tag 55 „Am Strand steht Gepäck. Jemand
  // bleibt", und es kam niemand.
  //
  // Eine Prüfung auf die Daten allein hätte das nie gefunden: In den Daten
  // war alles in Ordnung. Deshalb liest diese hier die QUELLEN und hält
  // beide Seiten gegeneinander – was ein offenes Kapitel mitbringt, muss
  // irgendwo im Spiel abgefragt werden.
  const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
  let quelle = '';
  (function sammle(verzeichnis) {
    for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
      const pfad = join(verzeichnis, eintrag.name);
      if (eintrag.isDirectory()) sammle(pfad);
      else if (eintrag.name.endsWith('.js')) quelle += readFileSync(pfad, 'utf8');
    }
  })(wurzel);

  for (const k of KAPITEL) {
    for (const sache of k.bringt) {
      const gefragt = quelle.indexOf("hatSache('" + sache + "')") >= 0;
      if (k.inhalt) {
        assert.ok(gefragt,
          k.id + ' ist offen und verspricht „' + sache + '", aber nichts im Spiel fragt danach');
      } else {
        // Umgekehrt genauso wichtig: Steht der Inhalt schon im Spiel, soll
        // das Kapitel auch aufgehen. Sonst baut jemand die Gezeiten und
        // wundert sich, warum sie nie erscheinen.
        assert.ok(!gefragt,
          k.id + ': „' + sache + '" wird im Spiel abgefragt – dann setze `inhalt: true`');
      }
    }
  }
});

test('ein Kapitel ohne Inhalt bleibt zu und wird nicht angekündigt', function () {
  // Die Gegenprobe zur Regel oben: Ein unfertiges Kapitel darf weder
  // aufgehen noch als „bald" in der Anzeige stehen. Ein „in 0 Tagen", das
  // nie eintritt, ist dieselbe Lüge in klein.
  const ohne = KAPITEL.filter(function (k) { return !k.inhalt; });
  for (const k of ohne) {
    assert.equal(offenAm(k, 99999, 1), false, k.id + ' geht auf, obwohl es keinen Inhalt hat');
  }
  const offen = offeneKapitel(99999, 1);
  for (const k of offen) {
    assert.ok(k.inhalt, k.id + ' ist offen ohne Inhalt');
  }
  // Nach dem letzten GEBAUTEN Kapitel wird nichts mehr angekündigt.
  const letztesGebaute = KAPITEL.filter(function (k) { return k.inhalt; }).pop();
  assert.equal(naechstesKapitel(letztesGebaute.ab + 1, 1), null,
    'es wird noch etwas angekündigt, das es nicht gibt');
  // Und mindestens eines muss es geben, sonst prüft der Rest der Datei nichts.
  assert.ok(offen.length >= 2, 'nur ' + offen.length + ' Kapitel mit Inhalt');
});

test('jedes Kapitel bringt etwas, was es vorher nicht gab', function () {
  // Regel 3. „Ankunft" ist der Zustand am Anfang und darf leer sein; jedes
  // weitere muss eine Sache mitbringen, sonst ist es ein Zwischentitel.
  const gesehen = [];
  for (const k of KAPITEL) {
    if (k.id === 'ankunft') { assert.equal(k.bringt.length, 0); continue; }
    assert.ok(k.bringt.length > 0, k.id + ' bringt nichts mit');
    for (const s of k.bringt) {
      assert.ok(gesehen.indexOf(s) < 0, s + ' kommt in zwei Kapiteln vor');
      gesehen.push(s);
    }
  }
});

test('kapitelHat fragt nach der Sache, nicht nach der Nummer', function () {
  // Die Abfrage muss das Umsortieren der Liste überleben – deshalb über die
  // Sache. Geprüft, indem genau das Kapitel offen ist, das sie bringt.
  // Am Beispiel der Sternbilder – also an einem Kapitel, das es WIRKLICH
  // gibt. Vorher standen hier die Gezeiten, und als deren Kapitel still
  // zuging, prüfte der Test eine Sache, die niemand mehr bekommen kann.
  const sache = 'sternbilder';
  const mitSache = GEBAUT.find(function (k) { return k.bringt.indexOf(sache) >= 0; });
  assert.ok(mitSache, 'kein gebautes Kapitel bringt „' + sache + '"');
  const n = GEBAUT.indexOf(mitSache) + 1;

  assert.equal(kapitelHat(standMit(n), sache), true);
  assert.equal(kapitelHat(standMit(n - 1), sache), false);
  // Eine Sache, die kein Kapitel bringt, gibt es nie.
  assert.equal(kapitelHat(standMit(GEBAUT.length), 'drachen'), false);
  // Und ohne Stand ist nichts da, statt zu krachen.
  assert.equal(kapitelHat(null, sache), false);
  assert.equal(kapitelHat(emptyKapitel(), sache), false);
});

test('naechstesKapitel nennt den ehrlichen Grund', function () {
  // Am Tag 1 fehlen Tage, kein Fortschritt.
  const a = naechstesKapitel(1, 1);
  assert.ok(a);
  assert.equal(a.kapitel.id, GEBAUT[1].id);
  assert.equal(a.tage, GEBAUT[1].ab - 1);
  assert.equal(a.fehltAnteil, 0);

  // Am Tag des Kapitels mit zu wenig Farbe fehlen keine Tage, aber Anteil.
  const k = GEBAUT[1];
  const b = naechstesKapitel(k.ab, 0);
  assert.equal(b.kapitel.id, k.id);
  assert.equal(b.tage, 0);
  assert.ok(b.fehltAnteil > 0);

  // Nach dem letzten kommt nichts mehr – und das muss `null` sein und nicht
  // ein Kapitel mit 0 Tagen, sonst zeigt die Anzeige für immer „bald".
  assert.equal(naechstesKapitel(9999, 1), null);
});

test('der Stand zählt in Kapiteln, nicht in Prozent', function () {
  const s = kapitelStand(standMit(2));
  assert.equal(s.offen, 2);
  // Gezählt wird nur, was es gibt: Sonst stünde dort für immer „2 von 5"
  // und die fehlenden drei wären ein Versprechen in Zahlenform.
  assert.equal(s.gesamt, GEBAUT.length);
  assert.equal(kapitelStand(emptyKapitel()).offen, 0);
  assert.equal(kapitelStand(null).offen, 0);
});

test('die Liste ist sauber', function () {
  assert.equal(KAPITEL_IDS.length, new Set(KAPITEL_IDS).size, 'doppelte Kennung');
  // Aufsteigend, sonst stimmt die Reihenfolge der Meldungen nicht.
  for (let i = 1; i < KAPITEL.length; i++) {
    assert.ok(KAPITEL[i].ab > KAPITEL[i - 1].ab, KAPITEL[i].id + ' kommt nicht nach ' + KAPITEL[i - 1].id);
    assert.ok(KAPITEL[i].boden >= KAPITEL[i - 1].boden, KAPITEL[i].id + ': boden fällt');
  }
  for (const k of KAPITEL) {
    assert.ok(k.name && k.hint && k.icon, k.id + ': Name, Hinweis oder Bild fehlt');
    // Jedes Kapitel außer dem ersten wird gemeldet und braucht den Satz dazu.
    if (k.id !== 'ankunft') assert.ok(k.auftakt, k.id + ': kein Auftakt');
    assert.equal(kapitelVon(k.id), k);
  }
  assert.equal(kapitelVon('gibtsnicht'), null);
  assert.equal(kapitelSteht(standMit(1), 'ankunft'), true);
  assert.equal(kapitelSteht(standMit(1), 'zuzug'), false);
});
