/**
 * Baut das ganze Spiel in EINE HTML-Datei.
 *
 * Wozu: Zum Verschenken. Das Spiel besteht aus ES-Modulen, und die lassen
 * sich nicht per `file://` laden – ein verschickter Ordner ist per Doppelklick
 * also tot, egal wie vollständig er ist. Wer das Spiel jemandem geben will,
 * der nicht mit Servern hantiert, braucht eine Datei, die einfach aufgeht.
 *
 * Was hineinwandert: die Oberfläche (CSS), die Schrift (als data:-URL, sonst
 * verweigern Browser sie über `file://`), und alle Module – umgeschrieben in
 * ein winziges Register, damit aus `import`/`export` ein klassisches Skript
 * wird. Bilder und Klänge braucht es nicht: die rechnet das Spiel ohnehin
 * beim Start selbst aus.
 *
 * Kein Ersatz für `npm start` beim Entwickeln – nur der Ausgabeweg.
 *
 *   node tools/bundle.mjs [--out=dist/seli-grove.html]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = resolve(ROOT, (args.find((a) => a.startsWith('--out=')) || '=dist/seli-grove.html').split('=')[1]);
const ENTRY = join(ROOT, 'src', 'main.js');

/* --------------------------------------------------------- Modulgraph */

const modules = new Map();   // id -> { id, code, deps }
const order = [];
const visiting = new Set();

function idOf(file) {
  return relative(ROOT, file).split('\\').join('/');
}

function collect(file, stack) {
  const id = idOf(file);
  if (modules.has(id)) return id;
  if (visiting.has(id)) {
    throw new Error('Ringschluss im Modulgraph: ' + stack.concat(id).join(' -> '));
  }
  visiting.add(id);

  const src = readFileSync(file, 'utf8');
  const deps = [];
  const code = transform(src, file, deps, stack.concat(id));

  visiting.delete(id);
  modules.set(id, { id: id, code: code });
  order.push(id);           // nach den Abhängigkeiten – das ist die Laufreihenfolge
  return id;
}

/* ------------------------------------------------------ Umschreibung */

/**
 * Aus `import`/`export` wird ein Register.
 *
 * Jedes Modul bekommt seinen eigenen Funktionsrumpf, damit gleichnamige
 * Hilfsfunktionen aus verschiedenen Dateien sich nicht in die Quere kommen.
 * Ein bloßes Aneinanderhängen der Dateien wäre der naheliegende Weg und
 * würde genau daran scheitern.
 */
function transform(src, file, deps, stack) {
  const dir = dirname(file);
  let out = src;

  // import { a, b as c } from './x.js';   (auch mehrzeilig)
  out = out.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';?[ \t]*$/gm,
    function (_m, names, spec) {
      const dep = collect(resolve(dir, spec), stack);
      deps.push(dep);
      const list = names.split(',').map(function (n) {
        const parts = n.trim().split(/\s+as\s+/);
        if (!parts[0]) return '';
        return parts.length > 1 ? parts[0] + ': ' + parts[1] : parts[0];
      }).filter(Boolean).join(', ');
      return 'const { ' + list + ' } = __req(' + JSON.stringify(dep) + ');';
    });

  // import * as ns from './x.js';
  out = out.replace(/^import\s*\*\s*as\s+(\w+)\s*from\s*'([^']+)';?[ \t]*$/gm,
    function (_m, ns, spec) {
      const dep = collect(resolve(dir, spec), stack);
      deps.push(dep);
      return 'const ' + ns + ' = __req(' + JSON.stringify(dep) + ');';
    });

  // Ausfuhren einsammeln und die Schlüsselwörter entfernen
  const exported = [];

  out = out.replace(/^export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
    function (_m, kind, name) { exported.push(name); return kind + ' ' + name; });

  out = out.replace(/^export\s+(async\s+)?function\s*(\*?)\s*([A-Za-z_$][\w$]*)/gm,
    function (_m, asy, star, name) {
      exported.push(name);
      return (asy || '') + 'function' + (star || '') + ' ' + name;
    });

  out = out.replace(/^export\s+class\s+([A-Za-z_$][\w$]*)/gm,
    function (_m, name) { exported.push(name); return 'class ' + name; });

  // export { a, b };  – reine Weitergabe schon vorhandener Namen
  out = out.replace(/^export\s*\{([^}]*)\};?[ \t]*$/gm, function (_m, names) {
    names.split(',').forEach(function (n) {
      const parts = n.trim().split(/\s+as\s+/);
      if (parts[0]) exported.push(parts[parts.length - 1].trim());
    });
    return '';
  });

  const rest = out.match(/^\s*(import|export)\s/m);
  if (rest) {
    throw new Error(idOf(file) + ': nicht umgeschriebene Anweisung – ' +
      out.split('\n').find(function (l) { return /^\s*(import|export)\s/.test(l); }));
  }

  // Ausfuhren am Ende eintragen: dann steht alles, was das Modul definiert,
  // auch wirklich schon da.
  const tail = exported.length
    ? '\n' + exported.map(function (n) { return '__e.' + n + ' = ' + n + ';'; }).join('\n') + '\n'
    : '';
  return out + tail;
}

/* ---------------------------------------------------------- Bauen */

function dataUrlFont(cssDir, relPath) {
  const buf = readFileSync(resolve(cssDir, relPath));
  return 'data:font/woff2;base64,' + buf.toString('base64');
}

function buildCss() {
  const cssPath = join(ROOT, 'styles', 'ui.css');
  const cssDir = dirname(cssPath);
  let css = readFileSync(cssPath, 'utf8');
  // Die Schrift muss mit hinein: über `file://` lehnen Browser eine
  // nachgeladene Schriftdatei ab (fremder Ursprung), eine data:-URL nicht.
  css = css.replace(/url\(["']?(\.\/[^"')]+\.woff2)["']?\)/g, function (_m, rel) {
    return 'url("' + dataUrlFont(cssDir, rel) + '")';
  });
  return css;
}

function buildJs() {
  collect(ENTRY, []);
  let js = '(function () {\n"use strict";\n' +
    'var __defs = {}, __cache = {};\n' +
    'function __req(id) {\n' +
    '  if (__cache[id]) return __cache[id];\n' +
    '  var e = __cache[id] = {};\n' +
    '  __defs[id](e);\n' +
    '  return e;\n' +
    '}\n';
  for (let i = 0; i < order.length; i++) {
    const m = modules.get(order[i]);
    js += '\n__defs[' + JSON.stringify(m.id) + '] = function (__e) {\n' + m.code + '\n};\n';
  }
  js += '\n__req(' + JSON.stringify(idOf(ENTRY)) + ');\n})();\n';
  return js;
}

function buildHtml(css, js) {
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8');

  // Schrift-Vorladen und Stylesheet raus, Stil direkt hinein
  html = html.replace(/<link rel="preload"[^>]*>\s*/, '');
  html = html.replace(/<!--[\s\S]*?-->\s*(?=<link rel="stylesheet")/, '');
  html = html.replace(/<link rel="stylesheet"[^>]*>/,
    '<style>\n' + css + '\n</style>');

  // Modul-Startpunkt raus, gebündeltes Skript hinein.
  // Am Ende des Body: ein klassisches Skript läuft dort nach dem Aufbau der
  // Seite, genau wie das aufgeschobene Modul vorher.
  html = html.replace(/<script type="module"[^>]*><\/script>/,
    '<script>\n' + js + '</script>');

  html = html.replace('</head>',
    '<!-- Einzeldatei-Fassung zum Verschenken, gebaut mit tools/bundle.mjs.\n' +
    '     Zum Weiterentwickeln das Projekt selbst nehmen: npm start -->\n</head>');
  return html;
}

const css = buildCss();
const js = buildJs();
const html = buildHtml(css, js);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf8');

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log('geschrieben: ' + relative(ROOT, OUT) + '  (' + kb + ' kB, ' +
  order.length + ' Module)');
