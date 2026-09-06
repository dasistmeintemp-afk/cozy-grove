/**
 * Prüft die Einzeldatei so, wie der Beschenkte sie öffnet: per `file://`,
 * ohne Server.
 *
 * Das ist der ganze Zweck des Werkzeugs. „Die Datei wurde gebaut" heißt
 * nicht, dass sie aufgeht: über `file://` gelten andere Regeln als über
 * http – Schriften, Speicher und Module verhalten sich dort anders. Wer eine
 * Datei verschenkt, die er nur über http probiert hat, verschenkt eine
 * Vermutung.
 *
 *   node tools/checkbundle.mjs [dist/cozy-grove.html]
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, process.argv[2] || 'dist/cozy-grove.html');

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch (err) {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(join(globalRoot, 'noop.js'))('playwright');
  }
}

let fails = 0;
function check(name, ok, extra) {
  console.log((ok ? 'ok   – ' : 'FEHL – ') + name + (ok || !extra ? '' : '  [' + extra + ']'));
  if (!ok) fails++;
}

async function run() {
  if (!existsSync(FILE)) {
    console.error('Nicht gefunden: ' + FILE + '\nErst bauen: node tools/bundle.mjs');
    process.exit(2);
  }
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });

  const problems = [];
  page.on('pageerror', (e) => problems.push('Seitenfehler: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('Konsole: ' + m.text()); });
  // Jede Anfrage nach außen wäre ein Fehler: die Datei soll für sich stehen.
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:')) external.push(r.url()); });

  await page.goto(pathToFileURL(FILE).href, { waitUntil: 'load' });

  check('Datei ist eine einzige und nicht zu groß',
    statSync(FILE).size < 4 * 1024 * 1024, Math.round(statSync(FILE).size / 1024) + ' kB');

  await page.waitForFunction(() => window.CozyGrove && window.CozyGrove.ready, null, { timeout: 120000 });
  check('Grafik wird ohne Server gemalt', true);

  check('Keine Anfrage nach außen', external.length === 0, external.join(', '));

  const font = await page.evaluate(async () => {
    await document.fonts.ready;
    return { geladen: document.fonts.check('700 16px Nunito') };
  });
  check('Schrift kommt aus der Datei selbst', font.geladen);

  await page.evaluate(() => window.CozyGrove.start(null));
  await page.waitForTimeout(1500);

  const live = await page.evaluate(() => {
    const g = window.CozyGrove.game;
    return {
      figur: !!g.player,
      objekte: g.world.entities.length,
      gemalt: !!(g.ground && g.ground.frame >= 0),
    };
  });
  check('Insel steht', live.figur && live.objekte > 100, JSON.stringify(live));

  // Laufen, damit wirklich etwas passiert
  const bewegt = await page.evaluate(async () => {
    const g = window.CozyGrove.game;
    const x0 = g.player.x;
    for (let i = 0; i < 60; i++) g.player.update(1 / 60, { x: 1, y: 0 }, g.world);
    return Math.abs(g.player.x - x0);
  });
  check('Figur läuft', bewegt > 8, 'Strecke ' + Math.round(bewegt));

  // Speichern ist über file:// die wackeligste Stelle.
  // Den Schlüsselnamen nicht raten, sondern nachsehen, was dazukommt –
  // sonst prüft man am Ende nur den eigenen Tippfehler.
  const save = await page.evaluate(() => {
    const g = window.CozyGrove.game;
    const vorher = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) vorher.push(window.localStorage.key(i));
    } catch (e) { return { fehler: e.message }; }
    g.state.coins = 4321;
    g.save();
    const treffer = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      const v = window.localStorage.getItem(k);
      if (v && v.indexOf('4321') >= 0) treffer.push(k);
    }
    return { dauerhaft: g.storagePersistent, schluessel: treffer, vorher: vorher.length };
  });
  check('Spielstand wird gesichert', !!(save.schluessel && save.schluessel.length),
    JSON.stringify(save));

  const neu = await page.evaluate((key) => {
    // So wie beim zweiten Öffnen: Spielstand einlesen
    if (!key) return null;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw).state.coins : null;
  }, (save.schluessel && save.schluessel[0]) || null);
  check('Spielstand kommt beim nächsten Öffnen zurück', neu === 4321, 'Münzen ' + neu);

  check('Keine Fehler in der Konsole', problems.length === 0, problems.slice(0, 3).join(' | '));

  await page.screenshot({ path: join(ROOT, '.screenshots', 'einzeldatei.png') });
  await browser.close();

  console.log('');
  console.log(fails ? fails + ' Prüfung(en) fehlgeschlagen' : 'Die Einzeldatei läuft per Doppelklick.');
  process.exitCode = fails ? 1 : 0;
}

run().catch((e) => { console.error(e); process.exit(2); });
