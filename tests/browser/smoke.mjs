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
      g.talkTo(e);
      for (let i = 0; i < 400; i++) g.colorField.update(0.05);
      return {
        ok: true,
        coinsBefore,
        coinsAfter: g.state.coins,
        covBefore,
        covAfter: g.colorField.coverage(g.world),
        done: g.quests.totalCompleted,
      };
    });
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

    // Schlafen -> neuer Tag
    const slept = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const dayBefore = g.day.day;
      g.sleep(false);
      await new Promise((r) => setTimeout(r, 2800));
      return { dayBefore, dayAfter: g.day.day, sleeping: g.sleeping, quests: g.quests.active().length };
    });
    check('Schlafen startet den nächsten Tag', slept.dayAfter === slept.dayBefore + 1 && !slept.sleeping,
      JSON.stringify(slept));

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
