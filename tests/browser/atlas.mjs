/**
 * Hilfswerkzeug: rendert alle Sprites als Uebersichtsbild.
 *   node tests/browser/atlas.mjs [ziel.png]
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.ATLAS_PORT || 8139);
const OUT = process.argv[2] || join(ROOT, '.screenshots', 'atlas.png');

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
body{margin:0;background:#20262e;color:#f3ece1;font:11px system-ui,sans-serif}
#wrap{display:flex;flex-wrap:wrap;gap:6px;padding:10px}
.cell{background:#2c343d;border:1px solid #3d464f;border-radius:6px;padding:4px;text-align:center;width:104px}
.cell canvas{image-rendering:pixelated;display:block;margin:0 auto;background:
 repeating-conic-gradient(#3a434d 0% 25%, #333b44 0% 50%) 50%/12px 12px}
.cell span{display:block;margin-top:3px;font-size:9px;color:#b9ae9d;word-break:break-all}
</style></head><body><div id="wrap"></div>
<script type="module">
import { initArt, spr } from './src/art/sprites.js';
initArt();
const wrap = document.getElementById('wrap');
const names = window.__names = [];
// Register auslesen: ueber spr() alle bekannten Namen einsammeln
import { PROPS } from './src/art/props.js';
import { ICONS } from './src/art/icons.js';
import { SPIRIT_LOOKS } from './src/art/critters.js';
for (const k of Object.keys(PROPS)) names.push(k);
for (const k of Object.keys(ICONS)) names.push('icon_' + k);
for (const d of ['down','up','side']) for (let f=0; f<3; f++) names.push('player_'+d+'_'+f);
for (const id of Object.keys(SPIRIT_LOOKS)) for (let f=0; f<2; f++) names.push('spirit_'+id+'_'+f);
names.push('spirit_flamey_0','spirit_flamey_1','fox_0','fox_1');
const SC = 3;
for (const name of names) {
  const s = spr(name);
  if (!s) continue;
  const cell = document.createElement('div');
  cell.className = 'cell';
  const c = document.createElement('canvas');
  c.width = s.w * SC; c.height = s.h * SC;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(s.c, 0, 0, c.width, c.height);
  // Ankerpunkt markieren
  g.fillStyle = 'rgba(255,80,80,0.9)';
  g.fillRect(s.ax*SC-1, s.ay*SC-1, 3, 3);
  cell.appendChild(c);
  const label = document.createElement('span');
  label.textContent = name + ' ' + s.w + 'x' + s.h;
  cell.appendChild(label);
  wrap.appendChild(cell);
}
window.__atlasReady = true;
</script></body></html>`;

async function run() {
  const { chromium } = loadPlaywright();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(join(ROOT, '__atlas.html'), PAGE);

  const server = spawn(process.execPath, [join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1' }),
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 600));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1160, height: 900 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/__atlas.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__atlasReady === true, null, { timeout: 15000 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT, fullPage: true });
  console.log('Atlas geschrieben: ' + OUT);
  await browser.close();
  server.kill();
  execSync('rm -f ' + join(ROOT, '__atlas.html'));
}

run().catch((e) => { console.error(e); process.exit(1); });
