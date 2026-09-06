/**
 * Winziger statischer Dateiserver ohne Abhängigkeiten.
 *
 * ES-Module lassen sich nicht per file:// laden (CORS), darum braucht das Spiel
 * einen HTTP-Server. `npm start` reicht -> http://localhost:8080
 */
import { createServer } from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = join(root, clean);
  if (full !== root && !full.startsWith(root + sep)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  let target = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);
  if (!target) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    let stat = await fs.stat(target);
    if (stat.isDirectory()) {
      target = join(target, 'index.html');
      stat = await fs.stat(target);
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 – nicht gefunden');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Cozy Grove läuft auf http://${HOST}:${PORT}`);
});
