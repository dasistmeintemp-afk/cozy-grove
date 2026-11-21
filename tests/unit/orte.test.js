/**
 * Eigene Ortsnamen – hält die Quelle, was die Anzeige voraussetzt?
 *
 * Das Besondere an diesen Namen: Sie sind das einzige im Spiel, das der
 * SPIELER schreibt und das Spiel danach ausgibt – in Skizzentiteln, in der
 * Chronik, in Meldungen. Alles andere ist von mir. Und das Spiel kann
 * Spielstände aus einer Datei laden.
 *
 * Deshalb steht hier mehr Prüfung auf der Eingabe als sonst irgendwo:
 * nachgemessen ist der Anzeigeweg dicht (`escapeHtml` bzw. `textContent`),
 * aber eine Schranke an der Quelle hält auch dann noch, wenn später jemand
 * eine neue Anzeige dazuschreibt und das Entwerten vergisst. Eine
 * Sicherheitsannahme, die an einer Stelle liegt, ist eine, die man brechen
 * kann, ohne sie zu sehen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RADIUS, MAX, NAME_MAX,
  saeubereOrtsname, orteAus, emptyOrte,
  ortHier, nameHier, ortAnStelle, nochPlatz, benenne, vergesse, orteStand,
} from '../../src/game/orte.js';

test('ein Name vom Spieler kann kein Markup sein', function () {
  // Die wichtigste Prüfung der Datei. Nicht, weil der Anzeigeweg undicht
  // wäre – er ist dicht –, sondern weil er es bleiben soll, auch wenn
  // später jemand eine neue Zeile Anzeige schreibt.
  const boese = [
    '<img src=x onerror="alert(1)">',
    '<script>alert(1)</script>Moos',
    '"><b>fett</b>',
    "';window.x=1;//",
    '&lt;schon entwertet&gt;',
  ];
  for (const roh of boese) {
    const sauber = saeubereOrtsname(roh);
    for (const z of ['<', '>', '"', '&', ';', '(', ')', '=', '/']) {
      assert.ok(sauber.indexOf(z) < 0,
        'aus ' + JSON.stringify(roh) + ' wurde ' + JSON.stringify(sauber) + ' – „' + z + '" ist noch drin');
    }
  }
  // Und das Spiel lehnt nicht ab, es säubert: Wer Unsinn eingibt, bekommt
  // keinen Fehler, sondern das, was davon übrig ist.
  assert.equal(saeubereOrtsname('<b>Mondgarten</b>'), 'b Mondgarten b');
  assert.equal(saeubereOrtsname('Mond-Garten!!!'), 'Mond-Garten');
});

test('gute Namen bleiben heil – auch mit Umlauten', function () {
  // Die Gegenprobe. Eine Schranke, die „Übers Wäldchen" verstümmelt, ist
  // keine Sicherheit, sondern ein Fehler – und in einem deutschen Spiel ein
  // besonders ärgerlicher.
  for (const gut of ['Mondgarten', 'Übers Wäldchen', 'Großer Stein', "Annas Bank", 'Platz 2', 'Süd-Ost']) {
    assert.equal(saeubereOrtsname(gut), gut, gut + ' wurde verändert');
  }
  // Steuerzeichen werden zu einem Leerzeichen, nicht gelöscht: Aus
  // „Moos\nZweite" darf nicht „MoosZweite" werden.
  assert.equal(saeubereOrtsname('Moos\nZweite'), 'Moos Zweite');
  assert.equal(saeubereOrtsname('  viel   Luft  '), 'viel Luft');
  assert.ok(saeubereOrtsname('x'.repeat(200)).length <= NAME_MAX);
  assert.equal(saeubereOrtsname(null), '');
  assert.equal(saeubereOrtsname(42), '');
});

test('ein verdorbener Spielstand bringt die Liste nicht durcheinander', function () {
  // Genau der Fall, für den die Säuberung da ist: eine Datei von außen.
  const roh = [
    { name: 'Mondgarten', x: 100, y: 200 },
    { name: '<script>x</script>', x: 10, y: 10 },     // wird gesäubert
    { name: '', x: 5, y: 5 },                          // leer: fällt weg
    { name: 'Ohne Ort' },                              // keine Koordinaten
    { name: 'Unendlich', x: Infinity, y: 0 },          // kaputte Zahl
    { name: 'Text', x: 'nah', y: 'fern' },             // falscher Typ
    null,
    'gar kein Objekt',
  ];
  const liste = orteAus(roh);
  assert.equal(liste.length, 2, JSON.stringify(liste));
  assert.equal(liste[0].name, 'Mondgarten');
  assert.equal(liste[1].name, 'script x script');
  for (const o of liste) {
    assert.ok(isFinite(o.x) && isFinite(o.y), 'kaputte Koordinate durchgekommen');
  }
  // Und mehr als MAX kommen nie heraus, auch nicht aus einer Datei.
  const viele = [];
  for (let i = 0; i < MAX + 20; i++) viele.push({ name: 'Ort ' + i, x: i * 1000, y: 0 });
  assert.equal(orteAus(viele).length, MAX);
  assert.deepEqual(orteAus(null), []);
  assert.deepEqual(emptyOrte(), []);
});

test('der nächste Ort gewinnt, nicht der erste in der Liste', function () {
  // Sonst verhielte sich das Spiel je nach Reihenfolge des Aufstellens
  // anders, und das wäre für den Spieler reine Willkür.
  const orte = [
    { name: 'Weit', x: 250, y: 0 },
    { name: 'Nah', x: 20, y: 0 },
  ];
  assert.equal(nameHier(orte, 0, 0), 'Nah');
  // Auch umgekehrt in der Liste.
  assert.equal(nameHier(orte.slice().reverse(), 0, 0), 'Nah');
});

test('ein Name reicht genau so weit wie RADIUS', function () {
  const orte = [{ name: 'Mondgarten', x: 0, y: 0 }];
  assert.equal(nameHier(orte, RADIUS - 10, 0), 'Mondgarten');
  assert.equal(nameHier(orte, RADIUS + 10, 0), null);
  // Und kleiner als das eigene Haus (380): ein Name soll eine ECKE meinen.
  assert.ok(RADIUS < 380, 'der Radius ist so groß wie eine Himmelsrichtung');
  assert.equal(nameHier([], 0, 0), null);
  assert.equal(ortHier(null, 0, 0), null);
});

test('benennen, umbenennen, zurücknehmen', function () {
  let orte = emptyOrte();

  orte = benenne(orte, 500, 500, 'Mondgarten');
  assert.equal(orte.length, 1);
  assert.equal(nameHier(orte, 500, 520), 'Mondgarten');

  // Umbenennen an derselben Stelle legt keinen zweiten an.
  orte = benenne(orte, 510, 505, 'Sternplatz');
  assert.equal(orte.length, 1, 'Umbenennen hat einen zweiten Ort angelegt');
  assert.equal(nameHier(orte, 500, 500), 'Sternplatz');

  // Ein leerer Name nimmt den Namen zurück.
  orte = benenne(orte, 500, 500, '   ');
  assert.equal(orte.length, 0);
  assert.equal(nameHier(orte, 500, 500), null);

  // Und ein Name, von dem nach dem Säubern nichts übrig ist, zählt als leer.
  orte = benenne(emptyOrte(), 0, 0, '###');
  assert.equal(orte.length, 0);
});

test('mehr als MAX geht nicht – aber Umbenennen geht immer noch', function () {
  let orte = emptyOrte();
  for (let i = 0; i < MAX; i++) orte = benenne(orte, i * 1000, 0, 'Ort ' + i);
  assert.equal(orte.length, MAX);
  assert.equal(nochPlatz(orte), false);

  // Der neunte wird abgelehnt – und zwar mit `null`, damit der Aufrufer
  // sagen kann, warum, statt still nichts zu tun.
  assert.equal(benenne(orte, 99000, 0, 'Zu viel'), null);

  // Ein bestehender lässt sich trotzdem umbenennen: Die Grenze gilt für
  // die ANZAHL, nicht fürs Ändern. Sonst wäre man mit acht Namen für immer
  // festgelegt.
  const neu = benenne(orte, 0, 0, 'Anders');
  assert.ok(neu, 'Umbenennen scheitert, obwohl die Liste nur voll ist');
  assert.equal(neu.length, MAX);
  assert.equal(nameHier(neu, 0, 0), 'Anders');
});

test('wird das Schild abgebaut, ist der Name weg', function () {
  let orte = benenne(emptyOrte(), 300, 300, 'Mondgarten');
  assert.ok(ortAnStelle(orte, 300, 300));
  orte = vergesse(orte, 300, 300);
  assert.equal(orte.length, 0);
  // Ein Abbau irgendwo anders lässt den Namen stehen.
  let zwei = benenne(emptyOrte(), 300, 300, 'Mondgarten');
  zwei = vergesse(zwei, 5000, 5000);
  assert.equal(zwei.length, 1);
  assert.deepEqual(orteStand(zwei), { vergeben: 1, moeglich: MAX });
  assert.deepEqual(orteStand(null), { vergeben: 0, moeglich: MAX });
});
