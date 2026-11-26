/**
 * Der veröffentlichte Stand – passt er noch zum Quelltext?
 *
 * `web/index.html` ist die Datei, die der Webhoster ausliefert. Sie liegt
 * absichtlich mit im Projekt, damit beim Hoster kein Bauschritt nötig ist
 * und deshalb auch keiner fehlschlagen kann. Der Preis dafür: Sie kann
 * veralten. Wer am Quelltext etwas ändert und vor dem Einchecken vergisst,
 * neu zu bauen, verschickt einen Link, hinter dem die vorletzte Fassung
 * steht – und merkt es nicht, weil lokal alles stimmt.
 *
 * Genau das fängt diese Prüfung ab: Sie baut nach nebenan und vergleicht.
 * Das `--out=` ist dabei wesentlich; ohne das würde der Bau `web/` zuerst
 * überschreiben und hinterher mit sich selbst vergleichen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEITE = join(ROOT, 'web', 'index.html');

test('die veröffentlichte Seite liegt im Projekt', () => {
  assert.ok(existsSync(SEITE), 'web/index.html fehlt – einmal `npm run bundle`');
  assert.ok(existsSync(join(ROOT, 'web', '_headers')), 'web/_headers fehlt');
});

test('der veröffentlichte Stand ist nicht veraltet', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'seli-web-'));
  const frisch = join(ordner, 'probe.html');
  try {
    execFileSync(process.execPath, [join(ROOT, 'tools', 'bundle.mjs'), '--out=' + frisch],
      { cwd: ROOT, stdio: 'pipe' });
    const neu = readFileSync(frisch, 'utf8');
    const alt = readFileSync(SEITE, 'utf8');
    assert.equal(alt.length, neu.length,
      'web/index.html passt nicht mehr zum Quelltext – einmal `npm run bundle` und mit einchecken');
    assert.equal(alt, neu,
      'web/index.html passt nicht mehr zum Quelltext – einmal `npm run bundle` und mit einchecken');
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('der Zwischenspeicher darf den alten Stand nicht festhalten', () => {
  // `no-cache` heißt nicht „nicht speichern", sondern „vor dem Anzeigen
  // nachfragen". Ohne das zeigte ein Browser, der schon einmal da war,
  // tagelang die alte Fassung – und der ganze Sinn der Adresse wäre hin.
  const kopf = readFileSync(join(ROOT, 'web', '_headers'), 'utf8');
  assert.match(kopf, /^\/\*/m, 'die Regel muss für alle Pfade gelten');
  assert.match(kopf, /Cache-Control:\s*no-cache/i);
});

test('Keine Überschrift steht im selben Fenster zweimal', () => {
  // „Dein Zuhause" stand im Lager-Fenster zweimal, acht Zeilen
  // auseinander, über zwei verschiedenen Dingen: oben die vier
  // Ausbaustufen, darunter die Wohnlichkeit. Im Bild fällt so etwas nie
  // auf – man liest die Abschnitte nacheinander und nicht am Stück.
  //
  // Gelesen wird der Quelltext, nicht das fertige Fenster: Die
  // Überschriften stehen als Zeichenketten in `panels.js`, und ein
  // Browserlauf dafür wäre zwei Minuten für eine Zeile.
  const quelle = readFileSync(
    new URL('../../src/ui/panels.js', import.meta.url), 'utf8');
  const gefunden = Object.create(null);
  const doppelt = [];
  const re = /<h3[^>]*>([^<+']+)<\/h3>/g;
  let m = re.exec(quelle);
  while (m) {
    const titel = m[1].trim();
    // Überschriften mit eingesetzten Werten („· 3 von 9") stehen nur
    // einmal im Quelltext; hier zählt der feste Teil.
    if (titel && gefunden[titel]) doppelt.push(titel);
    gefunden[titel] = 1;
    m = re.exec(quelle);
  }
  assert.deepEqual(doppelt, [], 'doppelte Überschrift: ' + doppelt.join(', '));
});
