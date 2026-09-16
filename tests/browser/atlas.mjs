/**
 * Hilfswerkzeug: rendert alle gemalten Grafiken als Übersichtsbild.
 *   node tests/browser/atlas.mjs [ziel.png] [--line] [--only=text] [--zoom=2]
 * `--only` filtert nach Namensteilen (mehrere per Komma), `--zoom` vergrößert.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.ATLAS_PORT || 8139);
const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith('--')) || join(ROOT, '.screenshots', 'atlas.png');
const LINE = args.indexOf('--line') >= 0;
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const ZOOM = Number((args.find((a) => a.startsWith('--zoom=')) || '=1').split('=')[1]) || 1;

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch (err) {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(join(globalRoot, 'noop.js'))('playwright');
  }
}

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#2a2f28;color:#e8e2d2;font:11px system-ui,sans-serif}
#wrap{display:flex;flex-wrap:wrap;gap:6px;padding:10px;align-items:flex-end}
.cell{background:#f4efe2;border:1px solid #3d464f;border-radius:6px;padding:4px;text-align:center}
.cell canvas{display:block;margin:0 auto}
.cell span{display:block;margin-top:3px;font-size:9px;color:#4a4038;word-break:break-all}
</style></head><body><div id="wrap"></div>
<script type="module">
import { initArt, spr, spriteNames, ensureRoom, seliBilder } from '../src/art/sprites.js';
import { raumZahl, AUSSTATTUNG_IDS } from '../src/game/interior.js';
import { TRACHT_IDS } from '../src/game/tracht.js';
initArt();
// Dasselbe gilt fuer die Trachten: Beim Start wird nur die erste gemalt.
for (const t of TRACHT_IDS) seliBilder(t);
// Zimmer werden erst beim Betreten gemalt (siehe ensureRoom). Fuer den
// Atlas heisst das: Ohne diese Schleife sind sie nicht im Register, und
// --only=room faende nichts.
for (let st = 1; st <= 4; st++) {
  for (let i = 0; i < raumZahl(st); i++) ensureRoom(st, AUSSTATTUNG_IDS[0], i);
}
const wrap = document.getElementById('wrap');
const LINE = ${LINE ? 'true' : 'false'};
const ONLY = ${JSON.stringify(ONLY)};
const ZOOM = ${ZOOM};
// Mehrere Namensteile durch Komma getrennt: --only=arch,torch,feeder.
// Vorher ging nur einer, und wer zwölf neue Stücke nebeneinander sehen
// wollte, musste zwölfmal aufrufen.
const teile = ONLY.split(',').map((t) => t.trim()).filter(Boolean);
const names = spriteNames().sort()
  .filter((n) => !teile.length || teile.some((t) => n.indexOf(t) >= 0));
const MAX = 150 * ZOOM;
for (const name of names) {
  const s = spr(name);
  if (!s) continue;
  const scale = Math.min(ZOOM, MAX / Math.max(s.w, s.h));
  const cell = document.createElement('div');
  cell.className = 'cell';
  const c = document.createElement('canvas');
  c.width = Math.round(s.w * scale);
  c.height = Math.round(s.h * scale);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(LINE ? s.g : s.c, 0, 0, c.width, c.height);
  g.fillStyle = 'rgba(220,60,60,0.9)';
  g.fillRect(s.ax * scale - 1.5, s.ay * scale - 1.5, 3, 3);
  cell.appendChild(c);
  const label = document.createElement('span');
  label.textContent = name + ' ' + s.w + '×' + s.h;
  cell.appendChild(label);
  wrap.appendChild(cell);
}
window.__atlasReady = true;
</script></body></html>`;

async function run() {
  const { chromium } = loadPlaywright();
  mkdirSync(dirname(resolve(ROOT, OUT)), { recursive: true });
  const pagePath = join(ROOT, 'tools', '__atlas.html');
  writeFileSync(pagePath, PAGE);

  const server = spawn(process.execPath, [join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1' }),
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 700));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/tools/__atlas.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__atlasReady === true, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(ROOT, OUT), fullPage: true });
  console.log('Atlas geschrieben: ' + OUT);
  await browser.close();
  server.kill();
  try { unlinkSync(pagePath); } catch (e) { /* egal */ }
}

run().catch((e) => { console.error(e); process.exit(1); });
