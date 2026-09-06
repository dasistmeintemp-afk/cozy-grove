/**
 * Hilfswerkzeug: fotografiert jedes Fenster der Oberfläche.
 *
 * Die Fenster sind der Teil des Spiels, den man beim Spielen am seltensten
 * lange ansieht und beim Bauen am häufigsten ändert. Ohne Bilder fällt hier
 * nichts auf – ein zu blasser Text, ein Knopf ohne Rand, eine Karte, auf der
 * die Insel im Papier verschwindet.
 *
 *   node tools/panels.mjs              alle Fenster, kolorierte Insel
 *   node tools/panels.mjs --pale       am ersten Tag, Insel noch blass
 *   node tools/panels.mjs --only=map
 *
 * Legt die Bilder unter .screenshots/ui-*.png ab.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PANELS_PORT || 8144);
const args = process.argv.slice(2);
const PALE = args.indexOf('--pale') >= 0;
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const HOUR = Number((args.find((a) => a.startsWith('--hour=')) || '=13').split('=')[1]);
const SEED = Number((args.find((a) => a.startsWith('--seed=')) || '=7').split('=')[1]) || 7;

const PANELS = ['inventory', 'quests', 'craft', 'shop', 'found', 'stories', 'map', 'settings'];

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch (err) {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(join(globalRoot, 'noop.js'))('playwright');
  }
}

async function run() {
  const { chromium } = loadPlaywright();
  mkdirSync(join(ROOT, '.screenshots'), { recursive: true });

  const server = spawn(process.execPath, [join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1' }),
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 700));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CozyGrove && window.CozyGrove.ready, null, { timeout: 90000 });

  await page.evaluate((s) => {
    let n = s;
    Math.random = function () {
      n = (n * 1664525 + 1013904223) >>> 0;
      return n / 4294967296;
    };
  }, SEED);
  await page.evaluate(() => window.CozyGrove.start(null));
  await page.waitForTimeout(1200);

  // Der Startbildschirm gehört auch dazu – vor allem der.
  if (!ONLY || ONLY === 'boot') {
    await page.evaluate(() => { document.getElementById('boot').classList.remove('hidden'); });
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(ROOT, '.screenshots', 'ui-start.png') });
    console.log('geschrieben: .screenshots/ui-start.png');
    await page.evaluate(() => { document.getElementById('boot').classList.add('hidden'); });
  }

  // Genug Habe, damit die Fenster nicht leer sind
  await page.evaluate((pale) => {
    const g = window.CozyGrove.game;
    const ids = ['wood', 'hardwood', 'stone', 'copper_ore', 'fiber', 'resin', 'clay',
      'shell', 'feather', 'driftwood', 'berry', 'mushroom', 'herb', 'flower_pink',
      'flower_yellow', 'flower_white', 'bone', 'shard', 'bottle', 'gem',
      'fish_sardine', 'fish_cod', 'fish_trout', 'lantern', 'bench', 'fence'];
    for (const id of ids) g.inventory.add(id, 4);
    g.state.coins = 480;
    g.state.ember = 220;
    if (!pale) {
      g.colorField.sources.length = 0;
      g.colorField.sources.push({ x: 96 * 32, y: 96 * 32, r: 9000, target: 9000, key: 'all' });
      g.colorField.markDirty();
    }
  }, PALE);

  await page.evaluate((h) => {
    const g = window.CozyGrove.game;
    g.day.hour = h;
    g.day.paused = true;
  }, HOUR);
  await page.waitForTimeout(400);

  if (!ONLY || ONLY === 'hud') {
    await page.screenshot({ path: join(ROOT, '.screenshots', 'ui-hud.png') });
    console.log('geschrieben: .screenshots/ui-hud.png');
  }

  for (const name of PANELS) {
    if (ONLY && ONLY !== name) continue;
    const ok = await page.evaluate((n) => {
      try {
        window.CozyGrove.game.openPanel(n);
        return !document.getElementById('panel-root').hidden;
      } catch (err) {
        return 'FEHLER: ' + err.message;
      }
    }, name);
    if (ok !== true) { console.log('  ' + name + ': ' + ok); continue; }
    await page.waitForTimeout(320);
    const file = join(ROOT, '.screenshots', 'ui-' + name + '.png');
    await page.screenshot({ path: file });
    console.log('geschrieben: .screenshots/ui-' + name + '.png');

    // Läuft das Fenster über, gibt es ein zweites Bild vom unteren Ende.
    // Ohne das bleibt alles unterhalb der Kante ungesehen – genau dort steht
    // erfahrungsgemäß das, was zuletzt hinzugefügt wurde.
    const scrolled = await page.evaluate(() => {
      const b = document.getElementById('panel-body');
      if (!b || b.scrollHeight <= b.clientHeight + 8) return false;
      b.scrollTop = b.scrollHeight;
      return true;
    });
    if (scrolled) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(ROOT, '.screenshots', 'ui-' + name + '-unten.png') });
      console.log('geschrieben: .screenshots/ui-' + name + '-unten.png');
    }

    await page.evaluate(() => window.CozyGrove.game.panels.close());
    await page.waitForTimeout(120);
  }

  await browser.close();
  server.kill();
}

run().catch((e) => { console.error(e); process.exit(2); });
