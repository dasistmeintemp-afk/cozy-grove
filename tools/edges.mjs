/**
 * Hilfswerkzeug: findet Grafiken, deren Malerei den Rand ihrer Leinwand
 * berührt.
 *
 * Solche Grafiken werden abgeschnitten. Im Spiel sieht man das nicht am
 * einzelnen Objekt, sondern dort, wo sich viele überlagern: Die geraden
 * Schnittkanten addieren sich zu Rechtecken im Boden.
 *
 *   node tools/edges.mjs [--max=8]   Alphawert, ab dem der Rand als belegt gilt
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.EDGES_PORT || 8143);
const args = process.argv.slice(2);
const MAX = Number((args.find((a) => a.startsWith('--max=')) || '=8').split('=')[1]);

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
  const server = spawn(process.execPath, [join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1' }),
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 700));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CozyGrove && window.CozyGrove.ready, null, { timeout: 90000 });

  const bad = await page.evaluate(async (max) => {
    const m = await import('/src/art/sprites.js');
    // Bodenstücke füllen ihre Kachel absichtlich randlos aus
    const skip = { bridge: 1, path: 1 };
    const names = m.spriteNames().sort().filter((n) => !skip[n]);
    const probe = document.createElement('canvas');
    const g = probe.getContext('2d');
    const out = [];
    for (const name of names) {
      const a = m.spr(name);
      if (!a) continue;
      probe.width = a.w;
      probe.height = a.h;
      g.clearRect(0, 0, a.w, a.h);
      g.drawImage(a.c, 0, 0);
      const d = g.getImageData(0, 0, a.w, a.h).data;
      const at = (x, y) => d[(y * a.w + x) * 4 + 3];
      const side = { oben: 0, unten: 0, links: 0, rechts: 0 };
      for (let x = 0; x < a.w; x++) {
        side.oben = Math.max(side.oben, at(x, 0));
        side.unten = Math.max(side.unten, at(x, a.h - 1));
      }
      for (let y = 0; y < a.h; y++) {
        side.links = Math.max(side.links, at(0, y));
        side.rechts = Math.max(side.rechts, at(a.w - 1, y));
      }
      const worst = Math.max(side.oben, side.unten, side.links, side.rechts);
      if (worst > max) {
        out.push({
          name: name, w: a.w, h: a.h, worst: worst,
          sides: Object.keys(side).filter((k) => side[k] > max).join(' '),
        });
      }
    }
    return out;
  }, MAX);

  if (!bad.length) {
    console.log('Alle Grafiken haben Luft zum Rand.');
  } else {
    console.log(bad.length + ' Grafik(en) stossen an den Leinwandrand:');
    bad.sort((a, b) => b.worst - a.worst);
    for (const b of bad) {
      console.log('  ' + b.name.padEnd(24) + b.w + 'x' + b.h + '  Alpha ' + b.worst + '  (' + b.sides + ')');
    }
  }

  await browser.close();
  server.kill();
  process.exitCode = bad.length ? 1 : 0;
}

run().catch((e) => { console.error(e); process.exit(2); });
