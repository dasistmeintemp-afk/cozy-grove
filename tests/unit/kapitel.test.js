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

import {
  KAPITEL, KAPITEL_IDS,
  kapitelVon, offenAm, offeneKapitel, jetzigesKapitel, naechstesKapitel,
  emptyKapitel, neueKapitel, kapitelSteht, kapitelHat, sachenAus, kapitelStand,
} from '../../src/game/kapitel.js';

/** Ein Stand, in dem die ersten `n` Kapitel offen sind. */
function standMit(n) {
  const s = emptyKapitel();
  for (let i = 0; i < n; i++) s.offen[KAPITEL[i].id] = 1 + i;
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
  // Regel 2. Am Tag des letzten Kapitels müssen ALLE offen sein.
  const letztes = KAPITEL[KAPITEL.length - 1];
  const alle = offeneKapitel(letztes.ab, 1);
  assert.equal(alle.length, KAPITEL.length);

  // Und auf dem Weg dorthin wächst die Zahl nur, sie fällt nie.
  let vorher = 0;
  for (let tag = 1; tag <= letztes.ab + 30; tag++) {
    const n = offeneKapitel(tag, 1).length;
    assert.ok(n >= vorher, 'Tag ' + tag + ': von ' + vorher + ' auf ' + n + ' gefallen');
    vorher = n;
  }
  assert.equal(vorher, KAPITEL.length);

  // Dasselbe für die Sachen: Was ein Kapitel gebracht hat, bleibt da.
  let hatte = 0;
  for (let n = 1; n <= KAPITEL.length; n++) {
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
  const mitGezeiten = KAPITEL.find(function (k) { return k.bringt.indexOf('gezeiten') >= 0; });
  assert.ok(mitGezeiten, 'kein Kapitel bringt die Gezeiten');
  const n = KAPITEL.indexOf(mitGezeiten) + 1;

  assert.equal(kapitelHat(standMit(n), 'gezeiten'), true);
  assert.equal(kapitelHat(standMit(n - 1), 'gezeiten'), false);
  // Eine Sache, die kein Kapitel bringt, gibt es nie.
  assert.equal(kapitelHat(standMit(KAPITEL.length), 'drachen'), false);
  // Und ohne Stand ist nichts da, statt zu krachen.
  assert.equal(kapitelHat(null, 'gezeiten'), false);
  assert.equal(kapitelHat(emptyKapitel(), 'gezeiten'), false);
});

test('naechstesKapitel nennt den ehrlichen Grund', function () {
  // Am Tag 1 fehlen Tage, kein Fortschritt.
  const a = naechstesKapitel(1, 1);
  assert.ok(a);
  assert.equal(a.kapitel.id, KAPITEL[1].id);
  assert.equal(a.tage, KAPITEL[1].ab - 1);
  assert.equal(a.fehltAnteil, 0);

  // Am Tag des Kapitels mit zu wenig Farbe fehlen keine Tage, aber Anteil.
  const k = KAPITEL[1];
  const b = naechstesKapitel(k.ab, 0);
  assert.equal(b.kapitel.id, k.id);
  assert.equal(b.tage, 0);
  assert.ok(b.fehltAnteil > 0);

  // Nach dem letzten kommt nichts mehr – und das muss `null` sein und nicht
  // ein Kapitel mit 0 Tagen, sonst zeigt die Anzeige für immer „bald".
  assert.equal(naechstesKapitel(9999, 1), null);
});

test('der Stand zählt in Kapiteln, nicht in Prozent', function () {
  const s = kapitelStand(standMit(3));
  assert.equal(s.offen, 3);
  assert.equal(s.gesamt, KAPITEL.length);
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
