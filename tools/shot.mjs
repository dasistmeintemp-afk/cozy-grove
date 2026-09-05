/**
 * Schießt ein Bildschirmfoto einer Seite aus diesem Projekt.
 *   node tools/shot.mjs tools/style-preview.html .screenshots/stil.png [flagName]
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SHOT_PORT || 8141);

const pagePath = process.argv[2] || 'tools/style-preview.html';
const out = process.argv[3] || join(ROOT, '.screenshots', 'shot.png');
const readyFlag = process.argv[4] || '__previewReady';

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch (err) {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(join(globalRoot, 'noop.js'))('playwright');
  }
}

const { chromium } = loadPlaywright();
mkdirSync(dirname(resolve(ROOT, out)), { recursive: true });

const server = spawn(process.execPath, [join(ROOT, 'server.js')], {
  env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1' }),
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 });
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });

await page.goto('http://127.0.0.1:' + PORT + '/' + pagePath, { waitUntil: 'load' });
await page.waitForFunction((f) => window[f] === true, readyFlag, { timeout: 30000 });
await page.waitForTimeout(250);
await page.screenshot({ path: resolve(ROOT, out), fullPage: true });

if (problems.length) console.error(problems.join('\n'));
console.log('Bild: ' + out);
await browser.close();
server.kill();
