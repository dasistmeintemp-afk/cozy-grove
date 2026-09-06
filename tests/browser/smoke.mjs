/**
 * Browser-Rauchtest.
 *
 * Startet den Server, lädt das Spiel in einem echten Chromium, spielt ein
 * paar Aktionen durch und prüft, dass nichts in der Konsole kracht.
 *
 *   node tests/browser/smoke.mjs [--headed] [--shots <verzeichnis>]
 */
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.SMOKE_PORT || 8137);
const BASE = 'http://127.0.0.1:' + PORT + '/';

const args = process.argv.slice(2);
const HEADED = args.indexOf('--headed') >= 0;
const shotIdx = args.indexOf('--shots');
const SHOT_DIR = shotIdx >= 0 ? args[shotIdx + 1] : join(ROOT, '.screenshots');

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch (err) {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(join(globalRoot, 'noop.js'))('playwright');
  }
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail || '' });
  const mark = ok ? 'ok  ' : 'FAIL';
  console.log(mark + ' – ' + name + (ok || !detail ? '' : '  (' + detail + ')'));
}

async function waitFor(page, fn, timeout, label) {
  const started = Date.now();
  for (;;) {
    const v = await page.evaluate(fn);
    if (v) return v;
    if (Date.now() - started > (timeout || 8000)) throw new Error('Zeitüberschreitung: ' + (label || 'Bedingung'));
    await page.waitForTimeout(60);
  }
}

async function run() {
  const { chromium } = loadPlaywright();
  mkdirSync(SHOT_DIR, { recursive: true });

  const server = spawn(process.execPath, [join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1' }),
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 700));

  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
    if (msg.type() === 'warning' && /Unbekanntes Sprite/.test(msg.text())) errors.push('sprite: ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('requestfailed', (req) => errors.push('request: ' + req.url() + ' ' + (req.failure() || {}).errorText));

  let exitCode = 0;
  try {
    const resp = await page.goto(BASE, { waitUntil: 'load' });
    check('Startseite lädt (HTTP ' + (resp && resp.status()) + ')', resp && resp.ok());

    await page.waitForSelector('#boot', { state: 'visible' });
    check('Startbildschirm sichtbar', true);
    await page.screenshot({ path: join(SHOT_DIR, '01-start.png') });

    // Die Grafik wird erst beim Start gemalt – das braucht einen Moment
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.ready), 60000, 'Grafik gemalt');
    check('Grafik erzeugt', true);

    const artNames = await page.evaluate(() => window.CozyGrove.art.names().length);
    check('Sprite-Register gefüllt (' + artNames + ')', artNames > 100, String(artNames));

    await page.click('#btn-new');
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.game), 20000, 'Spielstart');
    await page.waitForTimeout(1500);

    const info = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const kinds = {};
      for (const e of g.world.entities) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
      return {
        entities: g.world.entities.length,
        kinds,
        quests: g.quests.active().length,
        canvasW: g.renderer.w,
        canvasH: g.renderer.h,
        groundW: g.ground.w,
        colorSources: g.colorField.sources.length,
        coverage: g.colorField.coverage(g.world),
        day: g.day.day,
        px: g.player.x,
        py: g.player.y,
      };
    });
    check('Welt bevölkert (' + info.entities + ' Objekte)', info.entities > 300);
    check('Sechs Geister platziert', info.kinds.spirit === 6, JSON.stringify(info.kinds.spirit));
    check('Tagesaufgaben vergeben (' + info.quests + ')', info.quests > 0);
    check('Bodenschicht angelegt (' + info.groundW + 'px)', info.groundW > 4000);
    check('Lagerfeuer färbt den Startbereich', info.colorSources >= 1 && info.coverage > 0);

    const artMissing = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const has = window.CozyGrove.art.has;
      const missing = [];
      for (const e of g.world.entities) {
        const name = e.sprite;
        if (name && !has(name)) missing.push(e.kind + ' -> ' + name);
      }
      // Auch jede Aufgabenkarte und jeder Werkzeugknopf braucht sein Symbol
      for (const q of g.quests.active()) {
        if (q.itemId && !has('icon_' + q.itemId)) missing.push('quest -> icon_' + q.itemId);
      }
      return missing.slice(0, 8);
    });
    check('Alle Weltobjekte haben eine Grafik', artMissing.length === 0, artMissing.join(', '));

    await page.screenshot({ path: join(SHOT_DIR, '02-spielstart.png') });

    // Laufen
    const before = await page.evaluate(() => ({ x: window.CozyGrove.game.player.x, y: window.CozyGrove.game.player.y }));
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(600);
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyS');
    const after = await page.evaluate(() => ({ x: window.CozyGrove.game.player.x, y: window.CozyGrove.game.player.y }));
    check('Figur läuft', Math.abs(after.x - before.x) + Math.abs(after.y - before.y) > 8,
      JSON.stringify({ before, after }));

    // Werkzeug wechseln
    await page.keyboard.press('Digit2');
    await page.waitForTimeout(120);
    const tool = await page.evaluate(() => window.CozyGrove.game.player.tool.id);
    check('Werkzeugwechsel per Zifferntaste', tool === 'axe', tool);

    // Baum fällen: Figur direkt an einen Baum setzen und mehrfach schlagen
    const chopped = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const tree = g.world.entities.find((e) => e.kind === 'tree_oak' && !e.gone);
      if (!tree) return { ok: false, why: 'kein Baum' };
      g.player.x = tree.x;
      g.player.y = tree.y + 56;
      g.player.dir = 'up';
      g.player.selectTool(1);
      const woodBefore = g.inventory.count('wood');
      for (let i = 0; i < 6; i++) {
        g.target = g.player.findTarget(g.world);
        g.onInteract();
      }
      return {
        ok: true,
        woodBefore,
        woodAfter: g.inventory.count('wood'),
        kind: tree.kind,
        respawn: tree.respawnDay,
      };
    });
    check('Baum fällen gibt Holz', chopped.ok && chopped.woodAfter > chopped.woodBefore, JSON.stringify(chopped));
    check('Gefällter Baum wird zum Stumpf', chopped.kind === 'tree_stump', chopped.kind);

    // Der Baum muss nach der Wartezeit WIEDER SICHTBAR sein. Er kam zurück,
    // aber mit dem Grafiknamen ohne Fassungsnummer – den kennt die Zeichen-
    // schicht nicht, und der Baum stand unsichtbar im Weg.
    const zurueck = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const stumpf = g.world.entities.filter((e) => e.kind === 'tree_stump' && e.origin)[0];
      if (!stumpf) return { ok: false, why: 'kein Stumpf' };
      g.world.newDay(stumpf.respawnDay);
      return {
        ok: true,
        kind: stumpf.kind,
        sprite: stumpf.sprite,
        gemalt: !!window.CozyGrove.art.has(stumpf.sprite),
      };
    });
    check('Nachgewachsener Baum hat eine gemalte Grafik',
      zurueck.ok && zurueck.gemalt, JSON.stringify(zurueck));

    // Gegenprobe über die ganze Insel: kein Objekt darf auf eine Grafik
    // zeigen, die es nicht gibt.
    const ohneBild = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const fehlt = [];
      for (const e of g.world.entities) {
        if (e.gone || !e.sprite) continue;
        if (!window.CozyGrove.art.has(e.sprite)) fehlt.push(e.kind + '/' + e.sprite);
      }
      return fehlt.slice(0, 8);
    });
    check('Kein Objekt zeigt auf eine fehlende Grafik',
      ohneBild.length === 0, ohneBild.join(', '));

    // Sammeln
    const foraged = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const bush = g.world.entities.find((e) => e.kind === 'bush_berry' && !e.gone);
      if (!bush) return { ok: false };
      g.player.x = bush.x;
      g.player.y = bush.y + 48;
      g.player.dir = 'up';
      g.player.selectTool(0);
      g.target = g.player.findTarget(g.world);
      g.onInteract();
      return { ok: true, berries: g.inventory.count('berry') };
    });
    check('Beeren sammeln', foraged.ok && foraged.berries > 0, JSON.stringify(foraged));

    // Fenster öffnen
    for (const [key, title] of [['KeyI', 'Tasche'], ['KeyQ', 'Aufgaben'], ['KeyC', 'Werkbank'], ['KeyM', 'Karte']]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(200);
      const shown = await page.evaluate(() => ({
        open: !document.getElementById('panel-root').hidden,
        title: document.getElementById('panel-title').textContent,
        body: document.getElementById('panel-body').innerHTML.length,
      }));
      check('Fenster „' + title + '“ öffnet', shown.open && shown.title === title && shown.body > 40,
        JSON.stringify(shown));
      if (title === 'Karte') await page.screenshot({ path: join(SHOT_DIR, '03-karte.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }

    // Verbrennen -> Glut und Feuerstufe
    const burned = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.inventory.add('wood', 20);
      const emberBefore = g.state.ember;
      const lvlBefore = g.state.campfireFuel;
      g.burnItem('wood', 20);
      return { emberBefore, emberAfter: g.state.ember, fuelBefore: lvlBefore, fuelAfter: g.state.campfireFuel };
    });
    check('Verbrennen gibt Glut und nährt das Feuer',
      burned.emberAfter > burned.emberBefore && burned.fuelAfter > burned.fuelBefore, JSON.stringify(burned));

    // Bauen
    const crafted = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.inventory.add('wood', 10);
      g.inventory.add('fiber', 10);
      g.craftRecipe('fence');
      return g.inventory.count('fence');
    });
    check('Werkbank baut einen Zaun', crafted > 0, String(crafted));

    // Deko aufstellen
    const placed = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.startPlacing('fence');
      g._updatePlacing();
      const wasValid = g.placing && g.placing.valid;
      let tries = 0;
      while (g.placing && !g.placing.valid && tries++ < 40) {
        g.player.x += 24;
        g._updatePlacing();
      }
      const before = g.world.entities.filter((e) => e.kind === 'decor').length;
      g.confirmPlacing();
      return {
        wasValid,
        after: g.world.entities.filter((e) => e.kind === 'decor').length,
        before,
      };
    });
    check('Deko landet in der Welt', placed.after > placed.before, JSON.stringify(placed));

    // Angeln (Ablauf komplett durchspielen)
    const fished = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      // Freies Wasser suchen und die Figur davorstellen
      let target = null;
      for (let ty = 2; ty < g.world.h - 2 && !target; ty++) {
        for (let tx = 2; tx < g.world.w - 2; tx++) {
          if (!g.world.waterAt(tx * 64 + 32, ty * 64 + 32)) continue;
          if (!g.world.canStand(tx * 64 + 32, (ty + 2) * 64 + 32)) continue;
          target = { tx, ty };
          break;
        }
      }
      if (!target) return { ok: false, why: 'kein Ufer' };
      g.player.x = target.tx * 64 + 32;
      g.player.y = (target.ty + 2) * 64 + 32;
      g.player.dir = 'up';
      g.player.selectTool(4);
      g.target = null;
      g.onInteract();
      if (!g.fishing.active) return { ok: false, why: 'kein Wurf' };
      for (let i = 0; i < 400; i++) {
        const ev = g.fishing.update(0.05);
        if (ev === 'bite') break;
      }
      if (g.fishing.state !== 'bite') return { ok: false, why: 'kein Biss', state: g.fishing.state };
      g.fishing.press();
      g.fishing.marker = g.fishing.zoneStart + g.fishing.zoneSize / 2;
      const fishBefore = g.inventory.byCategory('fish').length;
      g.onInteract();
      return { ok: true, fishBefore, fishAfter: g.inventory.byCategory('fish').length };
    });
    check('Angeln bringt einen Fisch', fished.ok && fished.fishAfter > fished.fishBefore, JSON.stringify(fished));

    // Aufgabe abgeben
    const quest = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      let q = g.quests.active().find((x) => x.type === 'gather');
      if (!q) {
        q = {
          id: 'smoke_gather', spirit: 'mira', type: 'gather', itemId: 'berry',
          need: 2, have: 0, turnedIn: false, day: g.day.day,
          rewards: { coins: 40, ember: 3, items: [] }, hiddenIds: null,
        };
        g.quests.quests.push(q);
      }
      g.inventory.add(q.itemId, q.need);
      const e = g.world.spiritEntity(q.spirit);
      const coinsBefore = g.state.coins;
      const covBefore = g.colorField.coverage(g.world);

      // Beim ersten Mal stellt sich der Geist vor – das ist Absicht: erst
      // wissen, wer da steht, dann Geschäfte machen. Also zwei Ansprachen,
      // und die erste darf noch nichts auszahlen.
      g.talkTo(e);
      const coinsNachVorstellung = g.state.coins;
      g.talkTo(e);
      for (let i = 0; i < 400; i++) g.colorField.update(0.05);
      return {
        ok: true,
        coinsBefore,
        coinsNachVorstellung,
        coinsAfter: g.state.coins,
        covBefore,
        covAfter: g.colorField.coverage(g.world),
        done: g.quests.totalCompleted,
      };
    });
    check('Erstes Treffen stellt vor, statt gleich abzurechnen',
      quest.coinsNachVorstellung === quest.coinsBefore, JSON.stringify(quest));
    check('Aufgabe abgeben zahlt Münzen', quest.ok && quest.coinsAfter > quest.coinsBefore, JSON.stringify(quest));
    check('Abgabe bringt Farbe zurück', quest.ok && quest.covAfter > quest.covBefore,
      JSON.stringify({ vorher: quest.covBefore, nachher: quest.covAfter }));

    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SHOT_DIR, '04-farbe.png') });

    // Sperre entfernen -> Wald öffnen
    const unlocked = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.player.levels.axe = 2;
      const bar = g.world.logBarrier;
      g.player.x = bar.x;
      g.player.y = bar.y + 46;
      g.player.dir = 'up';
      g.player.selectTool(1);
      let hits = 0;
      for (let i = 0; i < 12; i++) {
        g.target = g.player.findTarget(g.world);
        if (g.target && g.target.entity === bar) hits++;
        g.onInteract();
      }
      return { unlocked: g.world.unlocked.slice(), gone: !!bar.gone, hits };
    });
    check('Baumstamm freigeschlagen öffnet den Wald', unlocked.unlocked[1] === true, JSON.stringify(unlocked));

    // Brücke bauen -> Klippen
    const bridge = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.inventory.add('bridge_kit', 1);
      g.useStation('bridge', g.world.bridgeSpot || { x: g.player.x, y: g.player.y });
      return { built: g.world.bridgeBuilt, unlocked: g.world.unlocked.slice() };
    });
    check('Brücke öffnet die Klippen', bridge.built && bridge.unlocked[2] === true, JSON.stringify(bridge));

    // Nachtstimmung
    await page.evaluate(() => { window.CozyGrove.game.day.hour = 22.5; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOT_DIR, '05-nacht.png') });
    const night = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      return { dark: g.day.isDark(), lights: g.lightSources(1).length, tint: g.day.tint().a };
    });
    check('Nacht hat Lichtquellen', night.dark && night.lights > 0 && night.tint > 0.3, JSON.stringify(night));

    // Schlafen -> neuer Tag. Bis hierhin wurde gefällt, gesammelt, geangelt
    // und aufgestellt: der Rückblick darf nicht leer sein.
    const slept = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const dayBefore = g.day.day;
      const buchVorher = JSON.parse(JSON.stringify(g.state.daybook || {}));
      g.sleep(false);
      await new Promise((r) => setTimeout(r, 3400));
      return {
        dayBefore, dayAfter: g.day.day, sleeping: g.sleeping,
        quests: g.quests.active().length,
        buchVorher,
        rueckblick: g.lastDaybook || null,
        fensterOffen: g.panels.current,
        neuesBuchTag: g.state.daybook && g.state.daybook.day,
      };
    });
    check('Schlafen startet den nächsten Tag', slept.dayAfter === slept.dayBefore + 1 && !slept.sleeping,
      JSON.stringify({ vor: slept.dayBefore, nach: slept.dayAfter }));
    check('Tagesrückblick zählt, was am Tag passiert ist',
      !!slept.rueckblick && slept.rueckblick.day === slept.dayBefore &&
      (slept.rueckblick.decor > 0 || slept.rueckblick.fish > 0 || slept.rueckblick.coins > 0),
      JSON.stringify(slept.rueckblick));
    check('Tagesrückblick öffnet sich nach dem Aufwachen',
      slept.fensterOffen === 'daybook', String(slept.fensterOffen));
    check('Die Strichliste beginnt am neuen Tag von vorn',
      slept.neuesBuchTag === slept.dayAfter, JSON.stringify(slept.neuesBuchTag));
    await page.screenshot({ path: join(SHOT_DIR, '06a-rueckblick.png') });
    await page.evaluate(() => window.CozyGrove.game.panels.close());
    await page.waitForTimeout(200);

    // Speichern und neu laden
    const saved = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.state.coins = 4242;
      g.save();
      return { coins: g.state.coins, day: g.day.day, decor: g.world.entities.filter((e) => e.kind === 'decor').length };
    });
    await page.reload({ waitUntil: 'load' });
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.ready), 60000, 'Grafik nach Neuladen');
    await page.waitForSelector('#btn-continue', { state: 'visible' });
    await page.click('#btn-continue');
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.game), 20000, 'Weiterspielen');
    await page.waitForTimeout(1200);
    const restored = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      return {
        coins: g.state.coins,
        day: g.day.day,
        decor: g.world.entities.filter((e) => e.kind === 'decor').length,
        bridge: g.world.bridgeBuilt,
        unlocked: g.world.unlocked.slice(),
      };
    });
    check('Spielstand wird geladen (Münzen)', restored.coins === saved.coins,
      saved.coins + ' -> ' + restored.coins);
    check('Spielstand behält Tag', restored.day === saved.day, saved.day + ' -> ' + restored.day);
    check('Spielstand behält aufgestellte Deko', restored.decor === saved.decor,
      saved.decor + ' -> ' + restored.decor);
    check('Spielstand behält Fortschritt', restored.bridge === true && restored.unlocked[1] && restored.unlocked[2],
      JSON.stringify(restored));

    await page.screenshot({ path: join(SHOT_DIR, '06-nach-neuladen.png') });

    /* ---- Aufstellen: der Punkt weicht Hindernissen aus ---- */
    // Vorher lag er starr 96 px voraus. Stand dort ein Baum, hieß es „Kein
    // Platz", und man musste blind herumlaufen. Gemessen über ein Raster ums
    // Lager: 74 % der Standorte gingen, jetzt über 95 %.
    const aufstellen = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.inventory.add('lantern', 999);
      const c = g.world.campfire;
      let starr = 0, gesucht = 0, gesamt = 0;
      let ohneGrund = 0;
      for (let dy = -300; dy <= 300; dy += 60) {
        for (let dx = -300; dx <= 300; dx += 60) {
          const x = c.x + dx, y = c.y + dy;
          if (!g.world.canStand(x, y, 14, 10)) continue;
          for (const dir of ['down', 'up', 'side']) {
            gesamt++;
            g.player.x = x; g.player.y = y; g.player.dir = dir;
            const f = g.player.facingPoint(96);
            if (g._canPlaceAt(Math.round(f.x), Math.round(f.y))) starr++;
            g.startPlacing('lantern');
            g._updatePlacing();
            if (g.placing.valid) gesucht++;
            else if (!g.placing.reason) ohneGrund++;
            g.cancelPlacing();
          }
        }
      }
      return { gesamt, starr, gesucht, ohneGrund,
        anteil: gesamt ? gesucht / gesamt : 0 };
    });
    check('Aufstellen findet fast immer einen Platz', aufstellen.anteil > 0.95,
      JSON.stringify(aufstellen));
    check('Misslingt es doch, steht ein Grund dabei', aufstellen.ohneGrund === 0,
      aufstellen.ohneGrund + ' ohne Grund');

    /* ---- Karte verrät nichts aus gesperrten Bereichen ---- */
    const karte = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      // An dieser Stelle des Tests ist die Brücke längst gebaut und alles
      // offen. Also einen Bereich kurz zusperren, prüfen, zurückstellen –
      // sonst prüfte der Test nur den Zustand, nicht die Regel.
      const vorher = g.world.unlocked.slice();
      let punkt = null;
      for (let ty = 4; ty < 92 && !punkt; ty++) {
        for (let tx = 4; tx < 92; tx++) {
          if (g.world.regionAtPixel((tx + 0.5) * 64, (ty + 0.5) * 64) === 1) {
            punkt = { x: (tx + 0.5) * 64, y: (ty + 0.5) * 64 };
            break;
          }
        }
      }
      if (!punkt) return { keinPunkt: true };
      const zeigt = (x, y) => g.world.isUnlocked(g.world.regionAtPixel(x, y));
      g.world.unlocked[1] = false;
      const gesperrt = zeigt(punkt.x, punkt.y);
      g.world.unlocked[1] = true;
      const offen = zeigt(punkt.x, punkt.y);
      g.world.unlocked = vorher;
      return { gesperrterBereich: gesperrt, offenerBereich: offen };
    });
    check('Karte zeigt keine Fundstücke in gesperrten Bereichen',
      karte.gesperrterBereich === false && karte.offenerBereich === true,
      JSON.stringify(karte));

    /* ---- Randabdunklung bleibt dezent ---- */
    // Sie sitzt in der Bildmitte, und die Kamera folgt der Figur: ein starker
    // Verlauf ist ein heller Kreis, der mitwandert – und der überstimmt genau
    // das Signal, um das sich das ganze Spiel dreht.
    const vignette = await page.evaluate(() => {
      const R = window.CozyGrove.game.renderer;
      R._vignette = null;
      const c = R._vignetteLayer();
      const ctx = c.getContext('2d');
      const a = (x, y) => ctx.getImageData(x, y, 1, 1).data[3];
      return { mitte: a(c.width >> 1, c.height >> 1), ecke: a(2, 2) };
    });
    check('Randabdunklung überstimmt die Farbe nicht',
      vignette.mitte === 0 && vignette.ecke <= 16, JSON.stringify(vignette));

    /* ---- Farbmaske: mehrere Quellen vereinigen sich ---- */
    // Der Fehler war, dass jede Farbquelle einzeln mit `destination-in` auf die
    // Farbfläche gelegt wurde. Das MULTIPLIZIERT die Deckkraft, statt sie zu
    // vereinigen: bei zwei Quellen blieb nur ihr Schnitt farbig, und weil jede
    // Quelle ein Rechteck füllt, sprang die Kante um, sobald eine Quelle in
    // den Blick geriet. Gemessen wird direkt die Deckkraft der Farbfläche –
    // die Bäume darüber holen sich ihre Farbe aus `colorField.at()` und wären
    // auch mit kaputtem Boden bunt.
    const maske = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const gemerkt = g.colorField.sources.slice();
      const px = g.player.x; const py = g.player.y;
      function deckung(wx, wy) {
        const R = g.renderer;
        const sx = Math.round((wx - g.camera.ox) * R.zoom);
        const sy = Math.round((wy - g.camera.oy) * R.zoom);
        const d = R.colorCanvas.getContext('2d').getImageData(sx - 6, sy - 6, 12, 12).data;
        let sum = 0; let n = 0;
        for (let i = 3; i < d.length; i += 4) { sum += d[i]; n++; }
        return Math.round(sum / n);
      }
      const warten = () => new Promise((r) => setTimeout(r, 420));

      g.colorField.sources.length = 0;
      g.colorField.sources.push({ x: px, y: py, r: 520, target: 520, key: 'gross' });
      g.colorField.markDirty();
      await warten();
      const alleine = deckung(px + 300, py);

      // Zweite, kleine Quelle dazu – wie ein Gemütlichkeitskreis neben einem
      // Geist. Der Messpunkt liegt weit außerhalb von ihr.
      g.colorField.sources.push({ x: px - 60, y: py, r: 150, target: 150, key: 'klein' });
      g.colorField.markDirty();
      await warten();
      const zuZweit = deckung(px + 300, py);

      g.colorField.sources.length = 0;
      for (const s of gemerkt) g.colorField.sources.push(s);
      g.colorField.markDirty();
      await warten();
      return { alleine, zuZweit };
    });
    check('Zweite Farbquelle löscht die erste nicht aus',
      maske.alleine > 150 && maske.zuZweit >= maske.alleine - 20,
      JSON.stringify(maske));

    // Die gemeldete Beobachtung wörtlich: an einem Geist vorbeilaufen. Sobald
    // dessen Farbquelle ins Bild rutschte, sprang die Färbung des Bodens um.
    // Derselbe Fleck Wiese muss beim Vorbeigehen gleich stark gefärbt bleiben.
    const vorbei = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const gemerkt = g.colorField.sources.slice();
      const px = g.player.x; const py = g.player.y;
      g.colorField.sources.length = 0;
      g.colorField.sources.push({ x: px, y: py, r: 620, target: 620, key: 'a' });
      g.colorField.sources.push({ x: px + 1500, y: py, r: 300, target: 300, key: 'b' });
      g.colorField.markDirty();

      function deckung(wx, wy) {
        const R = g.renderer;
        const sx = Math.round((wx - g.camera.ox) * R.zoom);
        const sy = Math.round((wy - g.camera.oy) * R.zoom);
        if (sx < 12 || sy < 12 || sx > R.w - 12 || sy > R.h - 12) return null;
        const d = R.colorCanvas.getContext('2d').getImageData(sx - 6, sy - 6, 12, 12).data;
        let sum = 0; let n = 0;
        for (let i = 3; i < d.length; i += 4) { sum += d[i]; n++; }
        return Math.round(sum / n);
      }

      const werte = [];
      for (let schritt = 0; schritt <= 8; schritt++) {
        g.player.x = px + schritt * 130;
        g.camera.snapTo(g.player.x, g.player.y);
        await new Promise((r) => setTimeout(r, 260));
        const v = deckung(px + 150, py);
        if (v != null) werte.push(v);
      }
      g.player.x = px;
      g.camera.snapTo(px, py);
      g.colorField.sources.length = 0;
      for (const s of gemerkt) g.colorField.sources.push(s);
      g.colorField.markDirty();
      await new Promise((r) => setTimeout(r, 300));

      let sprung = 0;
      for (let i = 1; i < werte.length; i++) {
        sprung = Math.max(sprung, Math.abs(werte[i] - werte[i - 1]));
      }
      return { werte, sprung };
    });
    check('Kein Farbsprung, wenn eine Quelle ins Bild kommt',
      vorbei.werte.length >= 4 && vorbei.sprung <= 20, JSON.stringify(vorbei));

    /* ---- Gelegter Steinweg ist auch unkoloriert zu sehen ---- */
    // Der Weg bestand nur aus seiner Grundfarbe. Unkoloriert liegt darüber ein
    // Papierschleier mit 0,76 Deckung – es blieb nichts übrig, und Aufstellen
    // wirkte kaputt.
    const weg = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      // Freie Graskachel suchen und die Figur daneben stellen
      let ziel = null;
      for (let ty = 4; ty < 92 && !ziel; ty++) {
        for (let tx = 4; tx < 92; tx++) {
          if (g.world.tileAtTile(tx, ty) !== 3) continue;
          if (g.world.queryNear(tx * 64 + 32, ty * 64 + 32, 120).filter((e) => !e.gone).length) continue;
          ziel = { x: tx, y: ty }; break;
        }
      }
      if (!ziel) return { keinPlatz: true };
      g.player.x = ziel.x * 64 + 32;
      g.player.y = ziel.y * 64 + 32 + 250;
      g.camera.snapTo(g.player.x, g.player.y);
      const warten = () => new Promise((r) => setTimeout(r, 700));
      function spanne() {
        const R = g.renderer;
        const sx = Math.round((ziel.x * 64 + 32 - g.camera.ox) * R.zoom);
        const sy = Math.round((ziel.y * 64 + 32 - g.camera.oy) * R.zoom);
        const d = R.ctx.getImageData(sx - 20, sy - 20, 40, 40).data;
        let min = 255; let max = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
          if (l < min) min = l;
          if (l > max) max = l;
        }
        return Math.round(max - min);
      }
      await warten();
      const vorher = spanne();
      g.world.setTile(ziel.x, ziel.y, 5);
      g.ground.markTileDirty(ziel.x, ziel.y);
      await warten();
      return { vorher, nachher: spanne() };
    });
    check('Gelegter Steinweg hebt sich vom Boden ab',
      !weg.keinPlatz && weg.nachher > weg.vorher * 1.8, JSON.stringify(weg));

    /* ---- Fundstücke fallen auf ---- */
    // Die Karte zeigt ein Flämmchen. Am Ort stand ein blassgelber Kreis, den
    // man auf Papier nicht sah.
    const fund = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const e = g.world.entities.filter((x) => x.kind === 'hidden' && !x.gone)[0];
      if (!e) return { keins: true };
      g.player.x = e.x;
      g.player.y = e.y + 230;
      g.camera.snapTo(g.player.x, g.player.y);
      await new Promise((r) => setTimeout(r, 700));
      function warm(wx, wy, r) {
        const R = g.renderer;
        const sx = Math.round((wx - g.camera.ox) * R.zoom);
        const sy = Math.round((wy - g.camera.oy) * R.zoom);
        const d = R.ctx.getImageData(sx - r, sy - r, r * 2, r * 2).data;
        let n = 0; let treffer = 0;
        for (let i = 0; i < d.length; i += 4) {
          n++;
          if (d[i] - d[i + 2] > 34) treffer++;
        }
        return Math.round(treffer / n * 100);
      }
      return { amOrt: warm(e.x, e.y - 26, 40), daneben: warm(e.x + 520, e.y - 26, 40) };
    });
    check('Fundstück ist im Bild zu erkennen',
      !fund.keins && fund.amOrt >= 6 && fund.amOrt > fund.daneben + 4, JSON.stringify(fund));

    /* ---- Mitbringsel ---- */
    const mitbringsel = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      // Alles, was irgendein Geist mag. Welcher Geist gerade erreichbar ist
      // und welche seiner Lieblingsstücke noch für eine offene Bitte gebraucht
      // werden, hängt am Zufallssamen – deshalb wird jeder Geist probiert.
      const idee = ['wood', 'hardwood', 'resin', 'flower_pink', 'flower_yellow',
        'flower_white', 'flower_violet', 'herb', 'berry', 'shell', 'driftwood',
        'fish_cod', 'fish_mackerel', 'mushroom', 'copper_ore', 'stone', 'shard',
        'fiber', 'gem'];
      const geister = g.world.entities.filter((e) => e.kind === 'spirit' &&
        g.world.isUnlocked(e.region));
      if (!geister.length) return { keiner: true };

      for (const geist of geister) {
        if (g.giftedToday(geist.spiritId)) continue;
        const vorherOhne = g.wantsGift(geist.spiritId);
        let gelegt = null;
        for (const id of idee) {
          g.inventory.add(id, 1);
          if (g.likedInBag(geist.spiritId) === id) { gelegt = id; break; }
          g.inventory.remove(id, 1);
        }
        if (!gelegt) continue;
        const gluetVorher = g.state.ember;
        const hatteVorher = g.inventory.count(gelegt);
        const willJetzt = g.wantsGift(geist.spiritId);
        const ok = g.giveGiftTo(geist);
        return {
          geist: geist.spiritId, vorherOhne, gelegt, willJetzt, ok,
          // Genau EIN Stueck wandert zum Geist – nicht der ganze Stapel.
          weg: g.inventory.count(gelegt) === hatteVorher - 1,
          glut: g.state.ember - gluetVorher,
          nochmal: g.wantsGift(geist.spiritId),
        };
      }
      return { nichtsPassendes: true };
    });
    check('Mitbringsel: Geist nimmt es an und zahlt Glut',
      mitbringsel.ok === true && mitbringsel.weg === true && mitbringsel.glut > 0,
      JSON.stringify(mitbringsel));
    check('Mitbringsel nur einmal am Tag je Geist',
      mitbringsel.nochmal === false, JSON.stringify(mitbringsel));

    /* ---- Spielstand als Datei: übernehmen und Neuladen überstehen ---- */
    // Der Weg für „anderer Browser, anderer Rechner". Die heikle Stelle ist
    // nicht das Schreiben, sondern das Neuladen danach: `location.reload()`
    // löst `pagehide` aus, und der Sicherungshaken dort schrieb einmal das
    // ALTE Spiel über den gerade geladenen Stand.
    const fremd = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const daten = g.toJSON();
      daten.state.coins = 9191;
      daten.day.day = 12;
      return JSON.stringify(daten);
    });
    const geprueft = await page.evaluate((txt) => {
      const g = window.CozyGrove.game;
      return {
        quatsch: g.applySaveText('kein json {{{'),
        version: g.applySaveText('{"version":99,"seed":1}'),
        leer: g.applySaveText(''),
        gut: g.applySaveText(txt),
      };
    }, fremd);
    check('Unbrauchbare Datei wird abgewiesen',
      geprueft.quatsch === false && geprueft.version === false && geprueft.leer === false,
      JSON.stringify(geprueft));
    check('Spielstand aus Datei wird übernommen', geprueft.gut === true);

    await page.waitForTimeout(1500);
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.ready), 60000, 'Grafik nach Übernahme');
    await page.waitForSelector('#btn-continue', { state: 'visible' });
    await page.click('#btn-continue');
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.game), 20000, 'Weiterspielen nach Übernahme');
    await page.waitForTimeout(1000);
    const uebernommen = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      return { coins: g.state.coins, day: g.day.day };
    });
    check('Übernommener Stand übersteht das Neuladen',
      uebernommen.coins === 9191 && uebernommen.day === 12, JSON.stringify(uebernommen));

    // Bildrate grob prüfen
    const fps = await page.evaluate(async () => {
      let frames = 0;
      const start = performance.now();
      await new Promise((resolve) => {
        function tick() {
          frames++;
          if (performance.now() - start > 1500) resolve();
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      return Math.round((frames / (performance.now() - start)) * 1000);
    });
    check('Flüssige Darstellung (' + fps + ' fps)', fps >= 30, String(fps));

    // Kleines Fenster / Hochformat: nichts darf überlaufen
    await page.setViewportSize({ width: 390, height: 780 });
    await page.waitForTimeout(600);
    const mobile = await page.evaluate(() => {
      const c = document.getElementById('game').getBoundingClientRect();
      return {
        fits: c.width <= window.innerWidth + 1 && c.height <= window.innerHeight + 1,
        w: Math.round(c.width),
        h: Math.round(c.height),
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    check('Passt auf ein Telefon im Hochformat', mobile.fits && !mobile.overflowX, JSON.stringify(mobile));
    await page.screenshot({ path: join(SHOT_DIR, '07-hochformat.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);
  } catch (err) {
    check('Testlauf ohne Ausnahme', false, err && err.message);
    exitCode = 1;
  }

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 6).join(' | '));

  await browser.close();
  server.kill();

  const failed = checks.filter((c) => !c.ok);
  console.log('\n' + (checks.length - failed.length) + '/' + checks.length + ' Prüfungen bestanden');
  console.log('Bildschirmfotos: ' + SHOT_DIR);
  if (failed.length) exitCode = 1;
  process.exit(exitCode);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
