/**
 * Hilfswerkzeug: fotografiert die Welt in voller Farbe an mehreren Orten.
 *   node tools/look.mjs [--pale] [--zoom=1]
 * Legt die Bilder unter .screenshots/look-*.png ab.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.LOOK_PORT || 8141);
const args = process.argv.slice(2);
const PALE = args.indexOf('--pale') >= 0;
const ZOOM = Number((args.find((a) => a.startsWith('--zoom=')) || '=0').split('=')[1]) || 0;
const HOUR = Number((args.find((a) => a.startsWith('--hour=')) || '=13').split('=')[1]);
const SEED = Number((args.find((a) => a.startsWith('--seed=')) || '=7').split('=')[1]) || 7;
const WEATHER = (args.find((a) => a.startsWith('--weather=')) || '').slice(10);
const CLIP = (args.find((a) => a.startsWith('--clip=')) || '').slice(7);
const clipRect = CLIP ? (function () {
  const p = CLIP.split(',').map(Number);
  return { x: p[0], y: p[1], width: p[2], height: p[3] };
}()) : null;

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
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CozyGrove && window.CozyGrove.ready, null, { timeout: 90000 });
  // Feste Insel, damit zwei Läufe vergleichbar sind
  await page.evaluate((s) => {
    let n = s;
    Math.random = function () {
      n = (n * 1664525 + 1013904223) >>> 0;
      return n / 4294967296;
    };
  }, SEED);
  await page.evaluate(() => window.CozyGrove.start(null));
  await page.waitForTimeout(1200);

  // Ganze Insel einfaerben, damit man die Farbfassung beurteilen kann
  if (!PALE) {
    await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.colorField.sources.length = 0;
      g.colorField.sources.push({ x: 96 * 32, y: 96 * 32, r: 9000, target: 9000, key: 'all' });
      g.colorField.markDirty();
    });
  }
  if (ZOOM) await page.evaluate((z) => { window.CozyGrove.game.settings.zoom = z; }, ZOOM);
  await page.evaluate((h) => {
    const g = window.CozyGrove.game;
    g.day.hour = h;
    g.day.paused = true;
  }, HOUR);
  if (WEATHER) {
    await page.evaluate((k) => {
      const g = window.CozyGrove.game;
      g.weather.kind = k;
      g.weather.strength = 0.9;
      g.weather.snap();
    }, WEATHER);
  }

  const spots = await page.evaluate(() => {
    const g = window.CozyGrove.game;
    const out = [];
    out.push({ name: 'lager', x: g.player.x, y: g.player.y });
    const water = [];
    const forest = [];
    const cliff = [];
    for (const e of g.world.entities) {
      if (!e || e.gone) continue;
      if (/pine|tree/.test(e.kind || '')) forest.push(e);
      if (/rock/.test(e.kind || '')) cliff.push(e);
    }
    if (forest.length) out.push({ name: 'wald', x: forest[(forest.length / 2) | 0].x, y: forest[(forest.length / 2) | 0].y });
    if (cliff.length) out.push({ name: 'felsen', x: cliff[(cliff.length / 2) | 0].x, y: cliff[(cliff.length / 2) | 0].y });
    // Strandkante suchen: erste Sandkachel mit Wasser daneben
    const T = g.world.tileAtTile.bind(g.world);
    for (let ty = 4; ty < 92 && !water.length; ty += 2) {
      for (let tx = 4; tx < 92; tx += 2) {
        const t = T(tx, ty);
        if (t !== 2) continue;
        if (T(tx - 2, ty) <= 1 || T(tx + 2, ty) <= 1 || T(tx, ty - 2) <= 1 || T(tx, ty + 2) <= 1) {
          water.push({ name: 'strand', x: (tx + 0.5) * 64, y: (ty + 0.5) * 64 });
          break;
        }
      }
    }
    if (water.length) out.push(water[0]);
    return out;
  });

  for (const s of spots) {
    await page.evaluate((s) => {
      const g = window.CozyGrove.game;
      g.player.x = s.x; g.player.y = s.y;
      g.camera.snapTo(s.x, s.y);
      g.ground.prewarm(g.camera.ox, g.camera.oy, g.renderer.viewW, g.renderer.viewH);
    }, s);
    await page.waitForTimeout(1400);
    const out = join(ROOT, '.screenshots', 'look-' + s.name + (PALE ? '-blass' : '') + '.png');
    await page.screenshot(clipRect ? { path: out, clip: clipRect } : { path: out });
    console.log('geschrieben: ' + out);
  }

  await browser.close();
  server.kill();
}

run().catch((e) => { console.error(e); process.exit(1); });
