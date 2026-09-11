/**
 * Browser-Rauchtest.
 *
 * Startet den Server, lädt das Spiel in einem echten Chromium, spielt ein
 * paar Aktionen durch und prüft, dass nichts in der Konsole kracht.
 *
 *   node tests/browser/smoke.mjs [--headed] [--shots <verzeichnis>]
 */
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
// Aus der Quelle, nicht abgeschrieben: Beim siebten Geist und beim elften
// Meilenstein hätte sonst eine Zahl im Test dagegengehalten.
import { SPIRIT_IDS } from '../../src/game/spirits.js';
import { MILESTONES } from '../../src/game/milestones.js';

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
    check('Ein Geist je Eintrag platziert', info.kinds.spirit === SPIRIT_IDS.length,
      JSON.stringify([info.kinds.spirit, SPIRIT_IDS.length]));
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
      // Eine Eiche suchen, die `findTarget` auch WIRKLICH anvisiert.
      //
      // Zwei Anläufe zuvor waren zu kurz gesprungen: Erst stand hier ein
      // selbst herausgesuchter Baum (und auf mancher Zufallsinsel lag etwas
      // anderes näher), dann wurde einfach geprüft, was findTarget wählt –
      // und das war in einem Lauf ein GEIST, der erwartungsgemäß kein Stumpf
      // wurde. Richtig ist beides zusammen: so lange Kandidaten durchgehen,
      // bis Wunsch und Ziel übereinstimmen.
      g.player.selectTool(1);
      let ziel = null;
      let t = null;
      const eichen = g.world.entities.filter((e) => e.kind === 'tree_oak' && !e.gone);
      for (const kandidat of eichen.slice(0, 40)) {
        g.player.x = kandidat.x;
        g.player.y = kandidat.y + 56;
        g.player.dir = 'up';
        const versuch = g.player.findTarget(g.world);
        if (versuch && versuch.entity === kandidat) { ziel = kandidat; t = versuch; break; }
      }
      if (!ziel) return { ok: false, why: 'keine anvisierbare Eiche' };
      const woodBefore = g.inventory.count('wood');
      for (let i = 0; i < 8 && ziel.kind !== 'tree_stump' && !ziel.gone; i++) {
        g.target = t;
        g.onInteract();
      }
      return {
        ok: true,
        woodBefore,
        woodAfter: g.inventory.count('wood'),
        art: ziel.kind,
        kind: ziel.kind,
        respawn: ziel.respawnDay,
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

    /* ---- Hinter einem offenen Fenster steht die Welt ---- */
    // `update()` kehrt bei offenem Fenster früh zurück – es kann sich nichts
    // ändern. Trotzdem wurde die ganze Szene weiter dreißigmal je Sekunde
    // gemalt (gemessen: 78 Zeichnungen in 2,5 s). Diese Arbeit lief gegen den
    // Aufbau des Fensters, und genau das hat beim Öffnen der Tasche geruckelt.
    const ruhe = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      let echt = 0;
      const orig = g.renderer.draw.bind(g.renderer);
      g.renderer.draw = function (a, b) { echt++; return orig(a, b); };
      const warten = (ms) => new Promise((r) => setTimeout(r, ms));

      g.panels.close();
      await warten(1000);
      const offen0 = echt;
      const ohne = echt;
      await warten(0);

      echt = 0;
      g.openPanel('inventory');
      await warten(1200);
      const mitFenster = echt;

      // Wird die Zeichenfläche neu angelegt, MUSS trotzdem noch einmal
      // gezeichnet werden – sonst stünde hinter dem Fenster eine leere Fläche.
      echt = 0;
      g.syncViewport();
      await warten(400);
      const nachGroessenwechsel = echt;

      g.panels.close();
      await warten(600);
      const wiederOhne = echt;

      g.renderer.draw = orig;
      return { ohne: ohne, mitFenster: mitFenster,
        nachGroessenwechsel: nachGroessenwechsel, wiederOhne: wiederOhne, offen0: offen0 };
    });
    check('Hinter einem offenen Fenster wird nicht weitergemalt',
      ruhe.ohne > 10 && ruhe.mitFenster <= 2, JSON.stringify(ruhe));
    check('Nach einem Größenwechsel wird trotzdem neu gezeichnet',
      ruhe.nachGroessenwechsel >= 1, JSON.stringify(ruhe));
    check('Nach dem Schließen läuft es wieder',
      ruhe.wiederOhne > 10, JSON.stringify(ruhe));

    // Und hinter dem Fenster darf keine leere Fläche stehen
    const nichtLeer = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.openPanel('inventory');
      await new Promise((r) => setTimeout(r, 400));
      g.syncViewport();
      await new Promise((r) => setTimeout(r, 500));
      const R = g.renderer;
      const d = R.ctx.getImageData(10, Math.round(R.h / 2), 200, 40).data;
      let min = 255; let max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        if (l < min) min = l;
        if (l > max) max = l;
      }
      g.panels.close();
      return { spanne: Math.round(max - min), hell: Math.round(max) };
    });
    check('Die Welt steht noch hinter dem Fenster',
      nichtLeer.spanne > 5 && nichtLeer.hell > 40, JSON.stringify(nichtLeer));

    /* ---- Ein Spielstand aus einer Datei, direkt am Start ---- */
    // Wer eine neuere Fassung des Spiels bekommt, öffnet eine andere Datei –
    // und der Browser bindet seinen Speicher womöglich an die alte. Dann steht
    // man vor „Neues Spiel" und hat den Eindruck, alles sei weg. Der Weg über
    // die Einstellungen hilft nicht: Dafür müsste man erst ein Spiel anfangen.
    const startLaden = await page.evaluate(() => {
      const knopf = document.getElementById('btn-load');
      return {
        vorhanden: !!knopf,
        beschriftet: knopf ? knopf.textContent.trim() : '',
      };
    });
    check('Der Startbildschirm bietet „Spielstand laden" an',
      startLaden.vorhanden && /Datei/.test(startLaden.beschriftet),
      JSON.stringify(startLaden));


    // Der ganze Weg, so wie ihn jemand geht, der eine neuere Fassung bekommt:
    // Stand aus dem laufenden Spiel herausschreiben, Browserspeicher leeren
    // (als wäre es eine andere Datei), Seite neu laden – und am Startbildschirm
    // die Datei einlesen.
    const merkmal = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.state.coins = 31337;
      const stand = g.toJSON();
      return { text: JSON.stringify(stand), tag: stand.day.day, muenzen: 31337 };
    });
    const standDatei = join(SHOT_DIR, 'pruef-spielstand.json');
    writeFileSync(standDatei, merkmal.text);

    await page.evaluate(() => {
      // So, als hätte der Browser den Speicher an die alte Datei gebunden.
      //
      // `frozen` muss dabei sein: Beim Neuladen feuert `pagehide`, und der
      // Sicherungshaken dort schriebe den Stand sofort wieder hin – dann
      // prüfte der Test gar nichts.
      window.CozyGrove.game.frozen = true;
      for (const k of Object.keys(localStorage)) {
        if (k.indexOf('seli-grove:save') === 0 || k.indexOf('cozy-grove:save') === 0) {
          localStorage.removeItem(k);
        }
      }
    });
    await page.reload({ waitUntil: 'load' });
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.ready), 60000, 'Grafik nach Neuladen');

    const ohneStand = await page.evaluate(() => ({
      weiter: !document.getElementById('btn-continue').hidden,
      laden: !document.getElementById('btn-load').hidden,
    }));
    check('Ohne Browserspeicher steht „Weiterspielen" nicht da – „Laden" schon',
      ohneStand.weiter === false && ohneStand.laden === true, JSON.stringify(ohneStand));

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#btn-load'),
    ]);
    await chooser.setFiles(standDatei);
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.game), 20000, 'Spiel nach Dateiladen');
    await page.waitForTimeout(900);
    const geladen = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      return { tag: g.day.day, muenzen: g.state.coins, gespeichert: !!localStorage.getItem('seli-grove:save:v1') };
    });
    check('Spielstand aus der Datei startet das Spiel dort weiter',
      geladen.tag === merkmal.tag && geladen.muenzen === merkmal.muenzen,
      JSON.stringify({ erwartet: merkmal.tag + '/' + merkmal.muenzen, bekommen: geladen }));
    check('Der geladene Stand liegt danach wieder im Browserspeicher',
      geladen.gespeichert === true, JSON.stringify(geladen));
    rmSync(standDatei, { force: true });

    /* ---- Jahreszeit und Tagesereignis ---- */
    // Beides hängt am Kalender des Rechners. Geprüft wird nicht, WELCHER Tag
    // heute ist – das wäre ein Test, der irgendwann von selbst rot wird –,
    // sondern dass die Wirkung wirklich ankommt.
    const kalender = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const r = { heute: g.today ? {
        season: g.today.season.id,
        event: g.today.event ? g.today.event.id : null,
      } : null };

      // Jedes Ereignis der Reihe nach anlegen und nachsehen, ob es wirkt
      const wirkung = {};
      const alt = g.today.event;
      function setze(id) {
        g.today.event = id ? { id: id, name: id, hint: 'x', icon: 'icon_star' } : null;
        g._applyToday();
      }
      setze(null);
      const normal = { verkauf: g.shop.sellPrice('wood'), schwarm: g.wildlife.swarm,
        fisch: g.fishing.boost };
      setze('market');
      wirkung.market = g.shop.sellPrice('wood') > normal.verkauf;
      setze('moths');
      wirkung.moths = g.wildlife.swarm === true;
      setze('shoal');
      wirkung.shoal = !!g.fishing.boost;
      setze(null);
      wirkung.zurueck = g.shop.sellPrice('wood') === normal.verkauf &&
        g.wildlife.swarm === false && g.fishing.boost === null;

      // Weltwirkungen: Fundtag und Blütentag
      setze('digs');
      g.world.newDay(g.day.day + 1, g._todayWorldEffects());
      const grabenViel = g.world.entities.filter((e) => e.kind === 'digspot').length;
      setze(null);
      g.world.newDay(g.day.day + 2, g._todayWorldEffects());
      const grabenNormal = g.world.entities.filter((e) => e.kind === 'digspot').length;
      setze('bloom');
      g.world.newDay(g.day.day + 3, g._todayWorldEffects());
      const bluehend = g.world.entities.filter((e) => e.fromEvent).length;
      setze(null);
      g.world.newDay(g.day.day + 4, g._todayWorldEffects());
      const danach = g.world.entities.filter((e) => e.fromEvent).length;

      g.today.event = alt;
      g._applyToday();
      return Object.assign(r, {
        wirkung: wirkung,
        grabenViel: grabenViel, grabenNormal: grabenNormal,
        bluehend: bluehend, blumenDanach: danach,
      });
    });
    check('Der Kalender bestimmt Jahreszeit und Tag',
      !!kalender.heute && ['spring', 'summer', 'autumn', 'winter'].indexOf(kalender.heute.season) >= 0,
      JSON.stringify(kalender.heute));
    check('Markttag, Falterzug und Schwarm wirken wirklich',
      kalender.wirkung.market && kalender.wirkung.moths && kalender.wirkung.shoal,
      JSON.stringify(kalender.wirkung));
    check('Nach dem Ereignis ist wieder ein normaler Tag',
      kalender.wirkung.zurueck === true, JSON.stringify(kalender.wirkung));
    check('Am Fundtag ist mehr gegraben worden',
      kalender.grabenViel > kalender.grabenNormal * 1.5,
      JSON.stringify({ viel: kalender.grabenViel, normal: kalender.grabenNormal }));
    check('Der Blütentag blüht – und ist am nächsten Tag vorbei',
      kalender.bluehend > 5 && kalender.blumenDanach === 0,
      JSON.stringify({ am: kalender.bluehend, danach: kalender.blumenDanach }));

    // Was heute für ein Tag ist, muss man ablesen können, ohne die Meldung
    // beim Aufwachen erwischt zu haben.
    const tagesZeile = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.openPanel('quests');
      const txt = document.getElementById('panel-body').textContent;
      g.panels.close();
      return {
        jahreszeit: txt.indexOf(g.today.season.name) >= 0,
        ereignis: !g.today.event || txt.indexOf(g.today.event.name) >= 0,
        wetter: txt.indexOf(g.weather.label) >= 0,
      };
    });
    check('Aufgabenfenster nennt Jahreszeit und Tagesereignis',
      tagesZeile.jahreszeit && tagesZeile.ereignis, JSON.stringify(tagesZeile));
    check('Und auch, was für ein Wetter ist',
      tagesZeile.wetter === true, JSON.stringify(tagesZeile));

    /* ---- Geburtstage und Sternenstaub ---- */
    // Zwei Tage im Jahr, die anders sind: der Geburtstag eines Geistes und
    // der Fund am Morgen nach einer Sternennacht.
    const feier = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      // Der Sternenstaub: Ereignis von gestern setzen, Tag wechseln lassen.
      g.state.lastEvent = 'stars';
      g.world.newDay(g.day.day + 1, g._todayWorldEffects());
      r.staubNachSternen = g.world.entities.filter((e) => e.kind === 'stardust' && !e.gone).length;

      // Und ohne Sternennacht liegt keiner da.
      g.state.lastEvent = null;
      g.world.newDay(g.day.day + 2, g._todayWorldEffects());
      r.staubSonst = g.world.entities.filter((e) => e.kind === 'stardust' && !e.gone).length;

      // Liegt er im Sand?
      g.state.lastEvent = 'stars';
      g.world.newDay(g.day.day + 3, g._todayWorldEffects());
      const staub = g.world.entities.filter((e) => e.kind === 'stardust' && !e.gone);
      r.imSand = staub.length > 0 && staub.every((e) => {
        const t = g.world.tileAt(e.x, e.y);
        return t === 2;   // T.SAND aus tiles.js
      });
      r.gemalt = staub.length > 0 && window.CozyGrove.art.has('stardust');
      g.state.lastEvent = null;
      g.world.newDay(g.day.day + 4, g._todayWorldEffects());
      return r;
    });
    check('Nach einer Sternennacht liegt Sternenstaub am Strand',
      feier.staubNachSternen >= 3, JSON.stringify(feier));
    check('An anderen Morgen liegt keiner',
      feier.staubSonst === 0, JSON.stringify(feier));
    check('Er liegt im Sand und ist gemalt',
      feier.imSand === true && feier.gemalt === true, JSON.stringify(feier));

    /* ---- Was die Jahreszeit bewirkt ---- */
    // Vier Jahreszeiten standen im Kalender und taten nichts: ein Wort im
    // Tagebuch, sonst war der Januar wie der Juli. Gemessen wird deshalb
    // nicht, dass es sie gibt, sondern dass man sie SIEHT und MERKT.
    const jahr = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const R = g.renderer;
      const alt = g.today.season;
      const altWetter = { kind: g.weather.kind, strength: g.weather.strength };

      // Wichtig: alles in EINEM synchronen Block. Dazwischen käme das
      // nächste Bild der Schleife und übermalte die Messung.
      const c = document.getElementById('game');
      const ctx = c.getContext('2d');
      const zeit = 12.5;
      function bild(seasonId, wetter) {
        g.today.season = { id: seasonId, name: seasonId };
        g._applyToday();
        g.weather.kind = wetter;
        g.weather.strength = wetter === 'clear' ? 0 : 0.9;
        g.weather.snap();
        R.draw(g, zeit);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let r = 0; let gr = 0; let b = 0;
        // Jedes 40. Pixel reicht für einen Mittelwert und ist schnell.
        for (let i = 0; i < d.length; i += 160) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
        const n = Math.floor(d.length / 160);
        return { r: r / n, g: gr / n, b: b / n, roh: d };
      }

      // Die Flocken allein, ohne den Farbschleier des Wetters: Die Wetter-
      // schicht malt in jeden beliebigen Kontext. Auf mittlerem Grau ist
      // eine Flocke hell (≈218), ein Regenstrich nicht (≈159) – der erste
      // Anlauf zählte einfach geänderte Pixel, und den bestand der Schnee
      // auch dann noch, als gar keine Flocke mehr gezeichnet wurde.
      function flocken(kind) {
        const off = document.createElement('canvas');
        off.width = 400;
        off.height = 300;
        const o = off.getContext('2d');
        o.fillStyle = '#808080';
        o.fillRect(0, 0, 400, 300);
        g.weather.kind = kind;
        g.weather.strength = 0.9;
        g.weather.snap();
        g.weather.update(0.016);
        g.weather.draw(o, 400, 300);
        const d = o.getImageData(0, 0, 400, 300).data;
        let hell = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 200) hell++;
        return hell;
      }

      const fruehling = bild('spring', 'clear');
      const herbst = bild('autumn', 'clear');
      const winter = bild('winter', 'clear');
      const schnee = bild('winter', 'snow');
      const regen = bild('winter', 'rain');

      const out = {
        // Herbst wärmer, Winter kühler – gemessen am Abstand Rot zu Blau.
        fruehlingRB: fruehling.r - fruehling.b,
        herbstRB: herbst.r - herbst.b,
        winterRB: winter.r - winter.b,
        // Schnee hellt auf, Regen dunkelt ab.
        klarHell: (winter.r + winter.g + winter.b) / 3,
        schneeHell: (schnee.r + schnee.g + schnee.b) / 3,
        regenHell: (regen.r + regen.g + regen.b) / 3,
        flockenSchnee: flocken('snow'),
        flockenRegen: flocken('rain'),
        flockenKlar: flocken('clear'),
        label: (function () {
          g.weather.kind = 'snow'; g.weather.strength = 0.9; g.weather.snap();
          return { wort: g.weather.label, faellt: g.weather.snowing };
        })(),
      };

      // Kommt die Jahreszeit bis zur Angel und bis zu den Faltern?
      g.today.season = { id: 'winter', name: 'Winter' };
      g._applyToday();
      out.falter = g.wildlife.season;
      const echt = g.fishing.cast;
      let gesehen;
      g.fishing.cast = function (welt, spieler, rng, nacht, stufe, js) {
        gesehen = js;
        return false;
      };
      g._castRod();
      g.fishing.cast = echt;
      out.angel = gesehen;

      g.today.season = alt;
      g._applyToday();
      g.weather.kind = altWetter.kind;
      g.weather.strength = altWetter.strength;
      g.weather.snap();
      return out;
    });
    check('Der Herbst färbt warm, der Winter kühl',
      jahr.herbstRB > jahr.fruehlingRB + 2 && jahr.winterRB < jahr.fruehlingRB - 1,
      JSON.stringify({ f: jahr.fruehlingRB.toFixed(1), h: jahr.herbstRB.toFixed(1),
        w: jahr.winterRB.toFixed(1) }));
    check('Schnee hellt auf, Regen dunkelt ab',
      jahr.schneeHell > jahr.klarHell && jahr.regenHell < jahr.klarHell,
      JSON.stringify({ klar: jahr.klarHell.toFixed(1), schnee: jahr.schneeHell.toFixed(1),
        regen: jahr.regenHell.toFixed(1) }));
    check('Es fallen wirklich Flocken – und sie sehen nicht aus wie Regen',
      jahr.flockenSchnee > 300 && jahr.flockenRegen < jahr.flockenSchnee / 4 &&
      jahr.flockenKlar === 0 &&
      jahr.label.wort === 'Schnee' && jahr.label.faellt === true,
      JSON.stringify({ schnee: jahr.flockenSchnee, regen: jahr.flockenRegen,
        klar: jahr.flockenKlar, label: jahr.label }));
    check('Die Jahreszeit kommt bis zur Angel und zu den Faltern',
      jahr.angel === 'winter' && jahr.falter === 'winter',
      JSON.stringify({ angel: jahr.angel, falter: jahr.falter }));

    /* ---- Der Garten ---- */
    // Der ganze Kreislauf an einem Stück: säen, Tage vergehen lassen, ernten.
    // Das ist die eine Sache im Spiel, die von gestern abhängt – wenn sie
    // still kaputtgeht, merkt es niemand, bis jemand drei Tage gewartet hat.
    const garten = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      g.inventory.add('seed_berry', 3);

      // Freie Wiese neben der Figur
      let ort = null;
      for (const luft of [110, 80, 60]) {
        for (let ty = 4; ty < 92 && !ort; ty++) {
          for (let tx = 4; tx < 92; tx++) {
            if (g.world.tileAtTile(tx, ty) !== 3) continue;
            if (g.world.queryNear(tx * 64 + 32, ty * 64 + 32, luft).filter((e) => !e.gone).length) continue;
            ort = { x: tx * 64 + 32, y: ty * 64 + 32 }; break;
          }
        }
        if (ort) break;
      }
      if (!ort) return { keinPlatz: true };
      g.player.x = ort.x; g.player.y = ort.y + 70; g.player.dir = 'up';
      g.camera.snapTo(g.player.x, g.player.y);

      const vorher = g.world.entities.filter((e) => e.kind === 'crop').length;
      g.startPlacing('seed_berry');
      g._updatePlacing();
      r.setzenGueltig = g.placing ? g.placing.valid : false;
      g.confirmPlacing();
      const beete = g.world.entities.filter((e) => e.kind === 'crop');
      r.neu = beete.length - vorher;
      const beet = beete[beete.length - 1];
      if (!beet) return r;
      r.frisch = { sprite: beet.sprite, grown: beet.grown, cropId: beet.cropId };

      // Unreif ernten darf nichts kosten
      const taschenVorher = g.inventory.count('berry');
      g.target = { entity: beet, def: { category: 'crop' } };
      g.harvestCrop(beet);
      r.unreif = {
        nochDa: g.world.entities.indexOf(beet) >= 0,
        beeren: g.inventory.count('berry') - taschenVorher,
      };

      // Tage vergehen lassen – ohne Regen
      const wetterAlt = g.weather.kind;
      g.weather.kind = 'clear';
      const verlauf = [];
      for (let i = 0; i < 3; i++) {
        g.growCrops('clear');
        verlauf.push({ grown: beet.grown, sprite: beet.sprite });
      }
      r.verlauf = verlauf;
      r.stufen = verlauf.map((v) => v.sprite).filter((v, i, a) => a.indexOf(v) === i).length;

      // Jetzt ernten
      const vorErnte = g.inventory.count('berry');
      g.harvestCrop(beet);
      r.ernte = {
        weg: g.world.entities.indexOf(beet) < 0,
        beeren: g.inventory.count('berry') - vorErnte,
      };
      g.weather.kind = wetterAlt;
      return r;
    });
    check('Saat lässt sich auf Wiese setzen',
      garten.setzenGueltig === true && garten.neu === 1, JSON.stringify(garten.frisch || garten));
    check('Frisch gesät ist ein Keimling',
      !!garten.frisch && garten.frisch.sprite === 'crop_berry_0' && garten.frisch.grown === 0,
      JSON.stringify(garten.frisch));
    check('Unreif ernten kostet das Beet nicht',
      !!garten.unreif && garten.unreif.nochDa === true && garten.unreif.beeren === 0,
      JSON.stringify(garten.unreif));
    check('Das Beet durchläuft sichtbar drei Stufen',
      garten.stufen >= 2 &&
      garten.verlauf[garten.verlauf.length - 1].sprite === 'crop_berry_2',
      JSON.stringify(garten.verlauf));
    check('Reif ernten gibt mehr als ein Busch',
      !!garten.ernte && garten.ernte.weg === true && garten.ernte.beeren >= 2,
      JSON.stringify(garten.ernte));

    // Regen zählt doppelt – das Wetter bekommt damit zum ersten Mal Folgen
    const regen = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const beet = g.world.entities.filter((e) => e.kind === 'crop')[0] ||
        (function () {
          g.inventory.add('seed_flower', 1);
          g.startPlacing('seed_flower');
          g._updatePlacing();
          g.confirmPlacing();
          return g.world.entities.filter((e) => e.kind === 'crop')[0];
        })();
      if (!beet) return { keins: true };
      beet.grown = 0;
      g.growCrops('clear');
      const trocken = beet.grown;
      beet.grown = 0;
      g.growCrops('rain');
      return { trocken: trocken, regen: beet.grown };
    });
    check('Regen lässt Beete schneller wachsen',
      !regen.keins && regen.regen === regen.trocken * 2, JSON.stringify(regen));

    // Und über einen Neustart hinweg muss das Beet stehenbleiben
    const gartenSpeichern = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      for (const e of g.world.entities.filter((x) => x.kind === 'crop')) g.world.remove(e);
      g.inventory.add('seed_herb', 1);
      g.startPlacing('seed_herb');
      g._updatePlacing();
      g.confirmPlacing();
      const beet = g.world.entities.filter((e) => e.kind === 'crop')[0];
      if (!beet) return { keins: true };
      beet.grown = 1;
      const delta = g._worldDelta();
      const eintrag = delta.added.filter((a) => a.k === 'crop')[0] || null;
      return { eintrag: eintrag, id: beet.id };
    });
    check('Beete stehen im Spielstand',
      !!gartenSpeichern.eintrag && gartenSpeichern.eintrag.c === 'herb' &&
      gartenSpeichern.eintrag.gw === 1,
      JSON.stringify(gartenSpeichern.eintrag));

    /* ---- Deko, die etwas tut ---- */
    // Von 26 aufstellbaren Stücken hing bei 17 außer dem Charmewert nichts.
    // Gemessen wird hier nicht die Tabelle – das tut der Einheitstest –,
    // sondern ob die Wirkung im laufenden Spiel wirklich ankommt.
    const wirkt = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};

      // Zwei gleiche Beete nebeneinander, eines mit Bienenkorb daneben.
      // Beide bekommen denselben Morgen; nur die Nachbarschaft trennt sie.
      const platz = { x: g.player.x + 200, y: g.player.y + 200 };
      // Eigene Nummern weit oberhalb der vergebenen: `add` legt sie ins
      // Register, und eine doppelte Nummer überschriebe ein echtes Objekt.
      let nr = 900001;
      const machBeet = (dx) => g.world.add({
        id: nr++, kind: 'crop', cropId: 'moon', grown: 0, plantedDay: g.day.day,
        x: platz.x + dx, y: platz.y, sprite: 'crop_moon_0',
      });
      const ohne = machBeet(0);
      const mit = machBeet(900);            // weit weg vom Korb
      const korb = g.world.add({
        id: nr++, kind: 'decor', itemId: 'beehive', x: mit.x + 40, y: mit.y, sprite: 'beehive',
      });
      r.hilfeOhne = g.beetHilfe(ohne.x, ohne.y).wachstum;
      r.hilfeMit = g.beetHilfe(mit.x, mit.y).wachstum;
      g.growCrops('clear');
      r.gewachsenOhne = ohne.grown;
      r.gewachsenMit = mit.grown;

      // Wetterhahn: ohne keiner, mit einem steht das Wetter von morgen da.
      r.vorherHahn = g.morgenWetter();
      const hahn = g.world.add({
        id: nr++, kind: 'decor', itemId: 'weathervane',
        x: g.player.x + 120, y: g.player.y, sprite: 'weathervane',
      });
      const m = g.morgenWetter();
      r.nachherHahn = m ? m.name : null;
      g.openPanel('quests');
      await new Promise((res) => setTimeout(res, 220));
      r.imFenster = document.getElementById('panel-body').textContent.indexOf('morgen ' + r.nachherHahn) >= 0;
      g.panels.close();

      // Aufräumen, damit der Rest des Tests eine normale Insel vorfindet
      for (const e of [ohne, mit, korb, hahn]) g.world.remove(e);
      return r;
    });
    check('Der Bienenkorb wirkt nur auf das Beet nebenan',
      wirkt.hilfeOhne === 0 && wirkt.hilfeMit === 1, JSON.stringify(wirkt));
    check('Und das Beet daneben wächst wirklich schneller',
      wirkt.gewachsenMit > wirkt.gewachsenOhne, JSON.stringify(wirkt));
    check('Ohne Wetterhahn keine Vorhersage, mit einem eine',
      wirkt.vorherHahn === null && !!wirkt.nachherHahn, JSON.stringify(wirkt));
    check('Und sie steht im Aufgabenfenster',
      wirkt.imFenster === true, JSON.stringify(wirkt));

    // Der Kescher zählte seine Falter mit und zeigte die Zahl nirgends.
    const zaehler = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const vorher = g.state.bugsCaught || 0;
      g.state.bugsCaught = vorher + 17;
      g.panels.nurFehlend = false;
      g.openPanel('found');
      await new Promise((r) => setTimeout(r, 300));
      const txt = document.getElementById('panel-body').textContent;
      g.panels.close();
      g.state.bugsCaught = vorher;
      return { steht: txt.indexOf((vorher + 17) + ' Falter gefangen') >= 0 };
    });
    check('Die gefangenen Falter stehen im Fundbuch',
      zaehler.steht === true, JSON.stringify(zaehler));

    /* ---- Wunschplätze: das Spiel nach dem Spiel ---- */
    // Bei hundert Prozent lief nur der Tagesbetrieb weiter. Wünsche sind
    // das, was nicht aufhört – und sie werden nicht durch Abgeben erfüllt,
    // sondern durch AUFSTELLEN. Genau das wird hier gemessen.
    const wunsch = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      // Vor dem Meilenstein wünscht sich niemand etwas.
      const gemerkt = g.state.milestones.insel;
      delete g.state.milestones.insel;
      r.vorher = g.wuenschenSchon();
      g.state.milestones.insel = gemerkt || g.day.day;
      r.nachher = g.wuenschenSchon();

      g.state.wishes = { offen: [], erfuellt: 0 };
      g._wuenscheNachfuellen(g.day.day);
      r.offen = g.wishes().length;

      // Einen Wunsch von Hand setzen, der sich sicher erfüllen lässt: ein
      // Sitzplatz beim Lagerfeuer.
      g.state.wishes.offen = [{
        id: 'test1', spirit: 'flamey', sorte: 'sitz', ort: 'lager',
        zugabe: 'keine', satz: 0, day: g.day.day, done: false,
      }];
      r.standVorher = g.wunschStand(g.state.wishes.offen[0]).erfuellt;

      // Im Fenster muss der Wunsch stehen.
      g.openPanel('quests');
      await new Promise((res) => setTimeout(res, 240));
      const txt = document.getElementById('panel-body').textContent;
      r.imFenster = txt.indexOf('Wunschplätze') >= 0 && txt.indexOf('zum Sitzen') >= 0;
      g.panels.close();

      // Bank neben das Lagerfeuer stellen – auf dem normalen Weg, nicht
      // per Hand in die Welt geschoben.
      const feuer = g.world.campfire;
      const muenzenVorher = g.state.coins;
      g.inventory.add('bench', 1);
      g.player.x = feuer.x + 120;
      g.player.y = feuer.y + 120;
      g.startPlacing('bench');
      await new Promise((res) => setTimeout(res, 120));
      r.platziert = !!g.placing;
      g.confirmPlacing();
      await new Promise((res) => setTimeout(res, 120));

      r.standNachher = g.state.wishes.offen.length === 0;
      r.erfuellt = g.state.wishes.erfuellt;
      r.lohn = g.state.coins - muenzenVorher;
      return r;
    });
    check('Vor dem Meilenstein wünscht sich niemand einen Ort',
      wunsch.vorher === false && wunsch.nachher === true, JSON.stringify(wunsch));
    check('Danach stehen Wünsche offen', wunsch.offen > 0, JSON.stringify(wunsch));
    check('Und sie stehen im Aufgabenfenster',
      wunsch.imFenster === true, JSON.stringify(wunsch));
    // Der Hinweis beim Aufstellen: Ohne ihn ist „am Wasser" ein Suchbild.
    const hinweis = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      g.state.milestones.insel = g.state.milestones.insel || g.day.day;
      const feuer = g.world.campfire;
      g.state.wishes = { offen: [{
        id: 'test2', spirit: 'flamey', sorte: 'sitz', ort: 'lager',
        zugabe: 'keine', satz: 0, day: g.day.day, done: false,
      }], erfuellt: 0 };

      g.inventory.add('bench', 2);
      g.inventory.add('lantern', 1);
      // Richtige Sorte, richtiger Ort
      g.player.x = feuer.x + 120;
      g.player.y = feuer.y + 120;
      g.startPlacing('bench');
      await new Promise((res) => setTimeout(res, 140));
      r.passt = g.ui._lastPrompt;
      g.cancelPlacing();

      // Richtige Sorte, falscher Ort – weit weg vom Feuer
      g.player.x = feuer.x + 2400;
      g.player.y = feuer.y;
      g.startPlacing('bench');
      await new Promise((res) => setTimeout(res, 140));
      r.falscherOrt = g.ui._lastPrompt;
      g.cancelPlacing();

      // Falsche Sorte
      g.player.x = feuer.x + 120;
      g.player.y = feuer.y + 120;
      g.startPlacing('lantern');
      await new Promise((res) => setTimeout(res, 140));
      r.falscheSorte = g.ui._lastPrompt;
      g.cancelPlacing();
      g.state.wishes = { offen: [], erfuellt: 0 };
      return r;
    });
    check('Der Hinweis sagt, wenn die Stelle einen Wunsch erfüllt',
      /erfüllt einen Wunsch/.test(hinweis.passt || ''), JSON.stringify(hinweis));
    check('Und wohin es sonst gehört',
      /gewünscht ist es/.test(hinweis.falscherOrt || ''), JSON.stringify(hinweis));
    check('Bei anderer Deko steht nichts davon',
      !/Wunsch|gewünscht/.test(hinweis.falscheSorte || ''), JSON.stringify(hinweis));

    /* ---- Sich hinsetzen ---- */

    const sitzen = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      const feuer = g.world.campfire;

      // Eine Bank dorthin stellen, wo Seli steht, und sie davor.
      g.player.x = feuer.x + 200;
      g.player.y = feuer.y + 200;
      const bank = g.world.add({
        id: 960001, kind: 'decor', itemId: 'bench',
        x: g.player.x, y: g.player.y - 60, sprite: 'bench',
      });
      g.player.dir = 'up';
      g.player.selectTool(0);
      const vorherX = g.player.x;
      const vorherY = g.player.y;

      // Der Hinweis lädt zum Sitzen ein, nicht zum Einpacken.
      g.target = g.player.findTarget(g.world);
      r.zielIstBank = !!(g.target && g.target.entity === bank);
      g._updatePrompt();
      r.hinweisStehend = g.ui._lastPrompt;

      // Hinsetzen
      g.onInteract();
      r.sitzt = !!g.player.sitzt;
      r.sprite = g.player.spriteName();
      r.aufDerBank = !!(g.player.sitzt && g.player.sitzt.entity === bank);
      g._updatePrompt();
      r.hinweisSitzend = g.ui._lastPrompt;

      // Sitzend rührt sie sich nicht vom Fleck, auch wenn man drückt.
      const sitzX = g.player.x;
      g.player.update(0.5, { x: 1, y: 0 }, g.world);
      r.bleibtSitzen = g.player.x === sitzX;

      // Die Tiere bekommen einen Punkt, auf den sie zufliegen.
      g._ruhen(0.016, { x: 0, y: 0 });
      r.ruhePunkt = !!g.wildlife.ruhe;

      // Nach ein paar Sekunden kommt ein Gedanke.
      const blasenVorher = g.ui.bubbles.length;
      for (let i = 0; i < 400; i++) g._ruhen(0.05, { x: 0, y: 0 });
      r.gedanke = g.ui.bubbles.length > blasenVorher;
      r.gedankenGemerkt = (g.state.gedanken || []).length;

      // Loslaufen stellt sie wieder auf den alten Platz.
      g._ruhen(0.016, { x: 0, y: 1 });
      r.stehtWieder = !g.player.sitzt;
      r.zurueck = Math.abs(g.player.x - vorherX) < 1 && Math.abs(g.player.y - vorherY) < 1;
      r.ruheWeg = !g.wildlife.ruhe;
      r.spriteStehend = g.player.spriteName();

      // Halten packt die Bank ein, Tippen nicht.
      g.target = g.player.findTarget(g.world);
      g.onInteract();
      const imBeutelVorher = g.inventory.count('bench');
      g.input.down.interact = false;
      g._ruhen(0.016, { x: 0, y: 0 });        // einmal loslassen
      g.input.down.interact = true;
      for (let i = 0; i < 5; i++) g._ruhen(0.05, { x: 0, y: 0 });   // 0,25 s
      r.kurzGehaltenNochDa = !!g.player.sitzt && g.inventory.count('bench') === imBeutelVorher;
      for (let i = 0; i < 12; i++) g._ruhen(0.05, { x: 0, y: 0 });  // insgesamt 0,85 s
      r.eingepackt = g.inventory.count('bench') > imBeutelVorher;
      r.stehtDanach = !g.player.sitzt;
      r.bankWeg = !!bank.gone;
      g.input.down.interact = false;

      // Wer die Taste beim Hinsetzen zu lange hält, hat sich hingesetzt –
      // und nicht die Bank eingepackt. Das ist der Fall, an dem die ganze
      // Sache sonst kippt: Derselbe Tastendruck bedeutet erst „hinsetzen"
      // und wäre einen Wimpernschlag später schon der Anfang vom Halten.
      const bank3 = g.world.add({
        id: 960003, kind: 'decor', itemId: 'bench',
        x: g.player.x, y: g.player.y - 60, sprite: 'bench',
      });
      const vorDemDruck = g.inventory.count('bench');
      g.input.down.interact = true;
      g.target = g.player.findTarget(g.world);
      g.onInteract();
      for (let i = 0; i < 40; i++) g._ruhen(0.05, { x: 0, y: 0 });  // zwei Sekunden halten
      r.haltenBeimHinsetzen = !!g.player.sitzt && !bank3.gone &&
        g.inventory.count('bench') === vorDemDruck;
      g.input.down.interact = false;
      g._ruhen(0.016, { x: 0, y: 0 });
      g.stehAuf(true);
      g.world.remove(bank3);

      // Schlafengehen lässt niemanden sitzen.
      const bank2 = g.world.add({
        id: 960002, kind: 'decor', itemId: 'bench',
        x: g.player.x, y: g.player.y - 60, sprite: 'bench',
      });
      g.target = g.player.findTarget(g.world);
      g.onInteract();
      r.sitztVorDemSchlafen = !!g.player.sitzt;
      g.sleep(false);
      r.sitztImSchlaf = !!g.player.sitzt;
      // `sleep` ist nicht nach dem Aufruf fertig: Nach gut einer Sekunde
      // wechselt der Tag, und danach geht der Rückblick von selbst auf. Wer
      // hier einfach weitermacht, dem steht er zwei Prüfungen später im
      // Fenster – gemessen stand im „Werkbank"-Fenster „Gestern auf der
      // Insel". Also abwarten und zumachen.
      await new Promise((res) => setTimeout(res, 2200));
      g.sleeping = false;
      g.panels.close();
      g.world.remove(bank2);
      if (!bank.gone) g.world.remove(bank);
      return r;
    });
    check('Vor einer Bank lädt der Hinweis zum Hinsetzen ein',
      sitzen.zielIstBank === true && sitzen.hinweisStehend === 'Hinsetzen',
      JSON.stringify(sitzen));
    check('E setzt Seli auf die Bank, und sie wird sitzend gezeichnet',
      sitzen.sitzt === true && sitzen.aufDerBank === true &&
      sitzen.sprite === 'player_sit', JSON.stringify(sitzen));
    check('Sitzend sagt der Hinweis, wie man wieder hochkommt',
      /Aufstehen/.test(sitzen.hinweisSitzend || '') &&
      /halten/.test(sitzen.hinweisSitzend || ''), JSON.stringify(sitzen));
    check('Wer sitzt, läuft nicht weiter',
      sitzen.bleibtSitzen === true, JSON.stringify(sitzen));
    check('Die Tiere bekommen einen Punkt, zu dem sie kommen',
      sitzen.ruhePunkt === true && sitzen.ruheWeg === true, JSON.stringify(sitzen));
    check('Nach ein paar Sekunden sagt Seli etwas über den Platz',
      sitzen.gedanke === true && sitzen.gedankenGemerkt > 0, JSON.stringify(sitzen));
    check('Loslaufen stellt sie auf – und zwar dorthin, wo sie stand',
      sitzen.stehtWieder === true && sitzen.zurueck === true &&
      sitzen.spriteStehend !== 'player_sit', JSON.stringify(sitzen));
    check('Kurz gedrückt bleibt die Bank stehen',
      sitzen.kurzGehaltenNochDa === true, JSON.stringify(sitzen));
    check('Lange gehalten wandert sie in die Tasche',
      sitzen.eingepackt === true && sitzen.stehtDanach === true &&
      sitzen.bankWeg === true, JSON.stringify(sitzen));
    check('Wer beim Hinsetzen zu lange drückt, sitzt – und packt nicht ein',
      sitzen.haltenBeimHinsetzen === true, JSON.stringify(sitzen));
    check('Schlafen geht man im Stehen',
      sitzen.sitztVorDemSchlafen === true && sitzen.sitztImSchlaf === false,
      JSON.stringify(sitzen));

    // Ein Wunsch, an dem nach zwölf Tagen gar nichts steht, wird
    // zurückgezogen – sonst wären drei, die einem nicht liegen, für immer
    // die einzigen drei. Wer angefangen hat, behält seinen.
    const geduld = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.milestones.insel = g.state.milestones.insel || g.day.day;
      const feuer = g.world.campfire;

      // a) Uralt und unangetastet -> muss gehen
      g.state.wishes = { offen: [{
        id: 'alt1', spirit: 'mira', sorte: 'tiere', ort: 'klippen',
        zugabe: 'keine', satz: 0, day: g.day.day - 40, done: false,
      }], erfuellt: 0 };
      g._wuenscheNachfuellen(g.day.day);
      const weg = !g.state.wishes.offen.some((w) => w.id === 'alt1');

      // b) Uralt, aber angefangen -> muss bleiben. Eine Bank ans Feuer
      // stellen und dann einen alten Sitzwunsch fürs Lager eintragen.
      const bank = g.world.add({
        id: 950001, kind: 'decor', itemId: 'bench',
        x: feuer.x + 100, y: feuer.y + 100, sprite: 'bench',
      });
      g.state.wishes = { offen: [{
        id: 'alt2', spirit: 'mira', sorte: 'sitz', ort: 'lager',
        zugabe: 'mehrere', satz: 0, day: g.day.day - 40, done: false,
      }], erfuellt: 0 };
      const angefangen = g.wunschStand(g.state.wishes.offen[0]).stueck;
      g._wuenscheNachfuellen(g.day.day);
      const bleibt = g.state.wishes.offen.some((w) => w.id === 'alt2');

      // Und aufgefüllt wird trotzdem auf drei.
      const voll = g.state.wishes.offen.length;
      g.world.remove(bank);
      g.state.wishes = { offen: [], erfuellt: 0 };
      return { weg, bleibt, angefangen, voll };
    });
    check('Ein unangetasteter Wunsch wird nach langer Zeit zurückgezogen',
      geduld.weg === true, JSON.stringify(geduld));
    check('Ein angefangener bleibt stehen, so lange man will',
      geduld.bleibt === true && geduld.angefangen > 0, JSON.stringify(geduld));
    check('Die Liste füllt sich danach wieder auf drei',
      geduld.voll === 3, JSON.stringify(geduld));

    // Rang und Gedächtnis: das, was „endlos" tragen muss.
    const endlos = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.milestones.insel = g.state.milestones.insel || g.day.day;
      g.state.wishes = { offen: [], erfuellt: 0, letzte: [] };
      g.openPanel('quests');
      await new Promise((r) => setTimeout(r, 220));
      const ohneRang = document.getElementById('panel-body').textContent;
      g.panels.close();

      g.state.wishes.erfuellt = 20;
      g.openPanel('quests');
      await new Promise((r) => setTimeout(r, 220));
      const mitRang = document.getElementById('panel-body').textContent;
      g.panels.close();

      // Gedächtnis: was zuletzt erfüllt wurde, darf nicht sofort wiederkommen.
      // Gefragt wird nach dem Namen, unter dem das Spiel SELBST sich einen
      // Wunsch merkt. Vorher setzte die Prüfung ihn sich aus Sorte und Ort
      // zusammen – und hielt damit Miras „Licht bei mir" und Brunos für
      // denselben Wunsch, obwohl es zwei verschiedene sind.
      g.state.wishes = { offen: [], erfuellt: 5, letzte: [] };
      g._wuenscheNachfuellen(g.day.day);
      const ersteDrei = g.state.wishes.offen.map((w) => g.wunschKennung(w));
      g.state.wishes.letzte = ersteDrei.slice();
      g.state.wishes.offen = [];
      g._wuenscheNachfuellen(g.day.day);
      const neueDrei = g.state.wishes.offen.map((w) => g.wunschKennung(w));
      const ueberschneidung = neueDrei.filter((k) => ersteDrei.indexOf(k) >= 0).length;

      g.state.wishes = { offen: [], erfuellt: 0, letzte: [] };
      return {
        ohneRang: /Zugezogen/.test(ohneRang),
        mitRang: /erfüllt/.test(mitRang) && /noch \d+ Wünsche|noch \d+ Wunsch|Hand der Insel/.test(mitRang),
        ersteDrei, neueDrei, ueberschneidung,
      };
    });
    check('Ohne erfüllte Wünsche steht kein Rang da',
      endlos.ohneRang === false, JSON.stringify(endlos));
    check('Mit erfüllten Wünschen steht der Rang im Fenster',
      endlos.mitRang === true, JSON.stringify(endlos));
    check('Zuletzt Erfülltes kommt nicht sofort wieder',
      endlos.ueberschneidung === 0, JSON.stringify(endlos));

    check('Aufstellen erfüllt den Wunsch – und er zahlt',
      wunsch.standVorher === false && wunsch.standNachher === true &&
      wunsch.erfuellt === 1 && wunsch.lohn > 100,
      JSON.stringify(wunsch));

    /* ---- Bequemlichkeiten ---- */
    const bequem = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};

      // 1) Passendes Werkzeug wird selbst genommen
      // Irgendein Objekt suchen, das ein anderes Werkzeug als die Hand braucht
      // und das findTarget auch wirklich anvisiert. Sich einen Stein
      // auszusuchen und zu hoffen reicht nicht: Auf mancher Zufallsinsel liegt
      // etwas anderes näher.
      let ziel = null;
      const kandidaten = g.world.entities.filter((e) => !e.gone &&
        (e.kind.indexOf('rock_') === 0 || e.kind.indexOf('tree_') === 0));
      for (const k of kandidaten.slice(0, 60)) {
        g.player.x = k.x; g.player.y = k.y + 50; g.player.dir = 'up';
        g.player.selectTool(0); // Hand – falsch für Stein und Baum
        const t = g.player.findTarget(g.world);
        if (t && t.entity === k && t.def.tool && t.def.tool !== 'hand') { ziel = { k, t }; break; }
      }
      if (ziel) {
        g.target = ziel.t;
        const vorher = g.player.tool.id;
        const hp = ziel.k.hp;
        g.onInteract();
        r.werkzeug = {
          art: ziel.k.kind, braucht: ziel.t.def.tool,
          vorher: vorher, nachher: g.player.tool.id,
          hpVorher: hp, hpNachher: ziel.k.hp,
        };
      }

      // 2) Taste halten arbeitet weiter, aber nur bei Werkzeugarbeit
      //
      // Nicht die erste Birke der Liste nehmen und hoffen: Der Rauchtest
      // würfelt seine Insel je Lauf neu, und stand dem Ziel ein Findling oder
      // ein zweiter Baum näher, visierte `findTarget` den an – dann fielen
      // null Schläge, und die Prüfung war rot, ohne dass etwas kaputt war.
      // Dieselbe Suche wie oben bei 1): eine nehmen, die wirklich anvisiert
      // wird.
      let baum = null;
      const birken = g.world.entities.filter((e) => e.kind === 'tree_birch' && !e.gone);
      for (const b of birken.slice(0, 40)) {
        g.player.x = b.x; g.player.y = b.y + 56; g.player.dir = 'up';
        g.player.selectTool(1);
        const t = g.player.findTarget(g.world);
        if (t && t.entity === b) { baum = b; break; }
      }
      if (baum) {
        g.player.x = baum.x; g.player.y = baum.y + 56; g.player.dir = 'up';
        g.player.selectTool(1);
        g.target = g.player.findTarget(g.world);
        const start = baum.hp;
        // Taste gedrueckt halten, ohne sie neu zu druecken
        let schlaege = 0;
        for (let i = 0; i < 40; i++) {
          g.player.swing = 0;              // Schwung ist durch
          g.target = g.player.findTarget(g.world);
          const vor = baum.hp;
          g._keepWorking();
          if (baum.hp !== vor) schlaege++;
          if (baum.kind === 'tree_stump') break;
        }
        r.halten = { start: start, schlaege: schlaege, kind: baum.kind };
      }

      // 3) Beim Geist darf Halten NICHTS tun
      //
      // Nicht den ERSTEN Geist der Liste nehmen und hoffen: Steht ihm ein
      // Busch oder ein Findling näher, visiert `findTarget` den an, und die
      // Prüfung fällt rot aus, ohne dass etwas kaputt ist. Dieselbe
      // Zufallsfalle wie bei der Birke weiter oben – der Rauchtest würfelt
      // seine Insel je Lauf neu.
      let geist = null;
      const geister = g.world.entities.filter((e) => e.kind === 'spirit' &&
        g.world.isUnlocked(e.region));
      for (const kandidat of geister) {
        g.player.x = kandidat.x; g.player.y = kandidat.y + 60; g.player.dir = 'up';
        const t = g.player.findTarget(g.world);
        if (t && t.entity === kandidat) { geist = kandidat; break; }
      }
      if (geist) {
        g.player.x = geist.x; g.player.y = geist.y + 60; g.player.dir = 'up';
        g.target = g.player.findTarget(g.world);
        const zielIstGeist = !!(g.target && g.target.entity === geist);
        let gerufen = 0;
        const echt = g.talkTo.bind(g);
        g.talkTo = function (e) { gerufen++; echt(e); };
        for (let i = 0; i < 10; i++) { g.player.swing = 0; g._keepWorking(); }
        g.talkTo = echt;
        r.geist = { zielIstGeist: zielIstGeist, gerufen: gerufen };
      }
      return r;
    });
    check('Passendes Werkzeug wird selbst genommen',
      !!bequem.werkzeug && bequem.werkzeug.vorher === 'hand' &&
      bequem.werkzeug.nachher === bequem.werkzeug.braucht &&
      bequem.werkzeug.hpNachher < bequem.werkzeug.hpVorher,
      JSON.stringify(bequem.werkzeug));
    // Geprüft wird das Verhalten, nicht eine Zahl: So viele Schläge wie der
    // Baum Trefferpunkte hatte, ohne dass die Taste dazwischen losgelassen
    // wird. Wie viele das sind, hängt davon ab, ob schon jemand an ihm war.
    check('Taste halten arbeitet weiter',
      bequem.halten && bequem.halten.schlaege >= 2 &&
      bequem.halten.schlaege === bequem.halten.start &&
      bequem.halten.kind === 'tree_stump',
      JSON.stringify(bequem.halten));
    check('Halten redet einen Geist nicht in Grund und Boden',
      bequem.geist && bequem.geist.zielIstGeist && bequem.geist.gerufen === 0,
      JSON.stringify(bequem.geist));

    /* ---- Feste ---- */

    const fest = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      const { FESTE } = await import('/src/game/festivals.js');
      const f = FESTE.lichter;

      // Es ist heute fast sicher kein Fest – die Gegenprobe.
      r.normalKeinFest = g.fest() === null || g.fest().id !== 'lichter';

      // Das Lichterfest herbeiführen: `refreshToday` liest das echte Datum,
      // also wird der fertige Tagesstand gesetzt und der Schmuck gestellt.
      const merkToday = g.today;
      const merkFeste = g.state.feste;
      g.today = Object.assign({}, g.today, { fest: f, event: f });
      g.state.feste = {};
      const schmuckVorher = g.world.entities.filter((e) => e.fest && !e.gone).length;
      r.gestellt = g._festSchmuck(g.day.day);
      r.schmuckVorher = schmuckVorher;
      r.schmuckDa = g.world.entities.filter((e) => e.fest && !e.gone).length;
      r.schmuckArten = Array.from(new Set(
        g.world.entities.filter((e) => e.fest && !e.gone).map((e) => e.itemId)));

      // Der Schmuck steht ums Lager.
      const feuer = g.world.campfire;
      r.amLager = g.world.entities.filter((e) => e.fest && !e.gone)
        .every((e) => Math.hypot(e.x - feuer.x, e.y - feuer.y) < 420);

      // Einpacken geht nicht.
      const stueck = g.world.entities.find((e) => e.fest && !e.gone);
      const vorher = stueck ? g.inventory.count(stueck.itemId) : 0;
      g.player.selectTool(0);
      if (stueck) g.pickDecor(stueck);
      r.nichtEinpackbar = !!stueck && !stueck.gone &&
        g.inventory.count(stueck.itemId) === vorher;

      // Der Geist sagt seinen Festsatz und gibt einmal eine Gabe.
      const geist = g.world.entities.find((e) => e.kind === 'spirit' &&
        g.world.isUnlocked(e.region));
      if (geist) {
        const { festSatz } = await import('/src/game/festivals.js');
        g.state.met = g.state.met || {};
        g.state.met[geist.spiritId] = 1;
        // Tasche leeren: Sonst nimmt der Geist beim zweiten Ansprechen ein
        // Mitbringsel an, und DAS gibt auch Glut – gemessen hielt die
        // Prüfung das für einen zweiten Festgruß.
        const merkSlots2 = g.inventory.slots;
        g.inventory.slots = [];
        const glutVorher = g.state.ember;
        g.ui.clearBubbles();
        g.talkTo(geist);
        const b = g.ui.bubbles[g.ui.bubbles.length - 1];
        // `textContent` einer Blase enthält auch die Zahlen der Symbole.
        // Gefragt ist deshalb, ob der Festsatz DARIN vorkommt.
        const soll = festSatz('lichter', geist.spiritId);
        r.satzPasst = !!b && !!soll && b.el.textContent.indexOf(soll) >= 0;
        r.glutDazu = g.state.ember - glutVorher;
        r.markeGesetzt = !!(g.state.feste || {})[geist.spiritId];
        // Beim zweiten Mal nicht noch einmal.
        const glutJetzt = g.state.ember;
        g.ui.clearBubbles();
        g.talkTo(geist);
        const b2 = g.ui.bubbles[g.ui.bubbles.length - 1];
        r.nurEinmal = g.state.ember === glutJetzt &&
          (!b2 || b2.el.textContent.indexOf(soll) < 0);
        g.inventory.slots = merkSlots2;
      }

      // Am nächsten Tageswechsel ist der Schmuck weg.
      g.today = Object.assign({}, g.today, { fest: null, event: null });
      g._festSchmuck(g.day.day + 1);
      r.danachWeg = g.world.entities.filter((e) => e.fest && !e.gone).length === 0;

      g.today = merkToday;
      g.state.feste = merkFeste;
      g.ui.clearBubbles();
      return r;
    });
    check('Am Fest schmückt sich die Insel',
      fest.gestellt > 3 && fest.schmuckVorher === 0 && fest.amLager === true,
      JSON.stringify({ gestellt: fest.gestellt, amLager: fest.amLager }));
    check('Und zwar mit mehreren verschiedenen Stücken',
      fest.schmuckArten && fest.schmuckArten.length >= 2,
      JSON.stringify(fest.schmuckArten));
    check('Festschmuck lässt sich nicht einpacken',
      fest.nichtEinpackbar === true, JSON.stringify(fest.nichtEinpackbar));
    check('Jeder Geist sagt seinen Festsatz und gibt einmal eine Gabe',
      fest.satzPasst === true && fest.glutDazu > 0 && fest.markeGesetzt === true &&
      fest.nurEinmal === true,
      JSON.stringify({ satz: fest.satzPasst, glut: fest.glutDazu,
        marke: fest.markeGesetzt, nurEinmal: fest.nurEinmal }));
    check('Am nächsten Morgen ist der Schmuck wieder weg',
      fest.danachWeg === true, JSON.stringify(fest.danachWeg));

    /* ---- Die Küche ---- */

    const kueche = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      const { GERICHTE } = await import('/src/game/kitchen.js');

      // Die Kochstelle steht im Lager und lässt sich ansprechen.
      const herd = g.world.entities.find((e) => e.kind === 'kitchen');
      r.stehtDa = !!herd;
      if (herd) {
        g.player.x = herd.x;
        g.player.y = herd.y + 70;
        g.player.dir = 'up';
        g.player.selectTool(0);
        g.target = g.player.findTarget(g.world);
        r.anvisierbar = !!(g.target && g.target.entity === herd);
        g._updatePrompt();
        r.hinweis = g.ui._lastPrompt;
      }

      // Kochen: Zutaten weg, Gericht da.
      const rez = GERICHTE[0];
      const merkSlots = g.inventory.slots;
      g.inventory.slots = [];
      for (const z of rez.zutaten) g.inventory.add(z.id, z.n);
      const zutatenVorher = rez.zutaten.map((z) => g.inventory.count(z.id));
      r.gekocht = g.cookDish(rez.id);
      r.imBeutel = g.inventory.count(rez.id);
      r.zutatenWeg = rez.zutaten.every((z, i) => g.inventory.count(z.id) < zutatenVorher[i]);

      // Ohne Zutaten geht es nicht, und es kostet auch nichts.
      const vorher = g.inventory.count(rez.id);
      r.ohneZutaten = g.cookDish(rez.id);
      r.nichtsPassiert = g.inventory.count(rez.id) === vorher;

      // Essen: Stärkung da, Gericht weg, Tempo wirkt.
      g.state.staerkung = null;
      const tempoVorher = g.player.tempo;
      r.gegessen = g.eatDish(rez.id);
      r.staerkung = g.staerkung() ? g.staerkung().id : null;
      r.aufgegessen = g.inventory.count(rez.id) === 0;
      r.tempoVorher = tempoVorher;
      r.tempoNachher = g.player.tempo;

      // Und sie hält nur heute.
      g.state.staerkung = { id: 'flink', tag: g.day.day - 1 };
      r.gesternWirktNicht = g.staerkung() === null;

      g.state.staerkung = null;
      g.player.tempo = 1;
      g.inventory.slots = merkSlots;
      return r;
    });
    check('Die Kochstelle steht im Lager und lässt sich ansprechen',
      kueche.stehtDa && kueche.anvisierbar && kueche.hinweis === 'Kochstelle',
      JSON.stringify(kueche));
    check('Kochen nimmt die Zutaten und gibt das Gericht',
      kueche.gekocht === true && kueche.imBeutel === 1 && kueche.zutatenWeg === true,
      JSON.stringify(kueche));
    check('Ohne Zutaten passiert gar nichts',
      kueche.ohneZutaten === false && kueche.nichtsPassiert === true,
      JSON.stringify(kueche));
    check('Essen gibt eine Stärkung, die man auch spürt',
      kueche.gegessen === true && !!kueche.staerkung && kueche.aufgegessen === true &&
      kueche.tempoNachher > kueche.tempoVorher,
      JSON.stringify(kueche));
    check('Die Stärkung von gestern wirkt heute nicht mehr',
      kueche.gesternWirktNicht === true, JSON.stringify(kueche));

    /* ---- Die Geister plaudern ---- */

    const plausch = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const r = {};
      // Einen Geist finden, den man wirklich anvisieren kann.
      let geist = null;
      for (const k of g.world.entities.filter((e) => e.kind === 'spirit' &&
        g.world.isUnlocked(e.region))) {
        g.player.x = k.x; g.player.y = k.y + 60; g.player.dir = 'up';
        const t = g.player.findTarget(g.world);
        if (t && t.entity === k) { geist = k; break; }
      }
      if (!geist) return { ok: false };
      r.ok = true;
      r.geist = geist.spiritId;

      // Alles abräumen, was vor dem Plaudern drankäme: Bitten, Mitbringsel,
      // Erstvorstellung. Dann ist „nichts zu tun" der Fall, um den es geht.
      //
      // Und alles davon wieder zurückstellen. Die Erstvorstellung ist der
      // Grund: Eine Prüfung weiter unten braucht einen Geist, den man noch
      // nicht kennt („Erstes Treffen stellt vor, statt gleich abzurechnen").
      // Ließe man `met` gesetzt, fiele sie – aber nur dann, wenn der Zufall
      // hier denselben Geist ausgesucht hat. Gemessen: einmal bestanden,
      // beim nächsten Lauf gefallen.
      const merkMet = Object.assign({}, g.state.met || {});
      const merkPlausch = g.state.plausch;
      const merkQuests = g.quests.quests;
      const merkSlots = g.inventory.slots;
      g.state.met = Object.assign({}, merkMet);
      g.state.met[geist.spiritId] = 1;
      g.state.plausch = {};
      g.quests.quests = [];
      g.inventory.slots = [];

      const gesagt = [];
      for (let i = 0; i < 30; i++) {
        g.ui.clearBubbles();
        g.talkTo(geist);
        const b = g.ui.bubbles[g.ui.bubbles.length - 1];
        gesagt.push(b ? b.el.textContent : '');
      }
      r.gesagt = gesagt;
      r.verschieden = new Set(gesagt).size;
      r.leer = gesagt.filter((s) => !s).length;
      // Zweimal dasselbe direkt hintereinander wäre der alte Zustand.
      r.direkteWiederholung = gesagt.filter((s, i) => i > 0 && s === gesagt[i - 1]).length;
      r.gemerkt = (g.state.plausch[geist.spiritId] || []).length;

      // Und es passt zur Lage: Bei Regen redet er über Regen.
      const { PLAUDEREI } = await import('/src/game/talk.js');
      g.weather.kind = 'rain';
      g.weather.strength = 1;
      g.weather.level = 1;
      g.state.plausch = {};
      let regenSaetze = 0;
      for (let i = 0; i < 30; i++) {
        g.ui.clearBubbles();
        g.talkTo(geist);
        const b = g.ui.bubbles[g.ui.bubbles.length - 1];
        const txt = b ? b.el.textContent : '';
        if ((PLAUDEREI[geist.spiritId].regen || []).indexOf(txt) >= 0) regenSaetze++;
      }
      r.regenSaetze = regenSaetze;
      g.weather.kind = 'clear';
      g.weather.strength = 0;
      g.weather.level = 0;

      g.ui.clearBubbles();
      g.state.met = merkMet;
      g.state.plausch = merkPlausch;
      g.quests.quests = merkQuests;
      g.inventory.slots = merkSlots;
      return r;
    });
    check('Ein Geist ohne Aufgabe sagt trotzdem etwas',
      plausch.ok && plausch.leer === 0, JSON.stringify(plausch && plausch.leer));
    check('Und nicht dreißigmal dasselbe',
      plausch.ok && plausch.verschieden >= 8 && plausch.direkteWiederholung === 0,
      JSON.stringify({ verschieden: plausch.verschieden, direkt: plausch.direkteWiederholung }));
    check('Das Gesagte merkt er sich',
      plausch.ok && plausch.gemerkt > 1, JSON.stringify(plausch && plausch.gemerkt));
    check('Bei Regen redet er über Regen',
      plausch.ok && plausch.regenSaetze >= 5,
      'Regensätze in 30 Zügen: ' + (plausch && plausch.regenSaetze));

    // Angeln muss auch neben Gestrüpp gehen
    const angelnAmUfer = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      // Uferkachel mit Wasser davor suchen und einen Busch danebenstellen
      let ort = null;
      for (let ty = 4; ty < 92 && !ort; ty++) {
        for (let tx = 4; tx < 92; tx++) {
          if (g.world.tileAtTile(tx, ty) !== 2 && g.world.tileAtTile(tx, ty) !== 3) continue;
          if (!g.world.waterAt(tx * 64 + 32, (ty - 1) * 64 + 32)) continue;
          ort = { x: tx * 64 + 32, y: ty * 64 + 32 };
          break;
        }
      }
      if (!ort) return { keinUfer: true };
      g.player.x = ort.x; g.player.y = ort.y; g.player.dir = 'up';
      // Einen Busch direkt daneben – er soll das Angeln NICHT verhindern.
      // Danach wird alles zurückgestellt: Der Test darf die Welt für die
      // folgenden Prüfungen nicht verändern.
      const busch = g.world.entities.find((e) => e.kind === 'bush_berry' && !e.gone);
      const alt = busch ? { x: busch.x, y: busch.y } : null;
      if (busch) { busch.x = ort.x + 30; busch.y = ort.y; g.world.reindex(busch); }
      const werkzeugVorher = g.player.toolIndex;
      g.player.selectTool(4); // Angel
      g.fishing.cancel();
      g.target = g.player.findTarget(g.world);
      const zielArt = g.target ? g.target.entity.kind : null;
      g.onInteract();
      const ergebnis = { zielArt: zielArt, angelt: g.fishing.active };
      g.fishing.cancel();
      g.player.selectTool(werkzeugVorher);
      if (busch && alt) { busch.x = alt.x; busch.y = alt.y; g.world.reindex(busch); }
      return ergebnis;
    });
    check('Angeln geht auch mit einem Busch daneben',
      !angelnAmUfer.keinUfer && angelnAmUfer.angelt === true, JSON.stringify(angelnAmUfer));

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

    // Ein Teppich liegt auf dem Boden. Nach der Tiefe einsortiert kam er vor
    // die Figur, sobald sie über ihm stand – gemessen an Bildpunkten war das
    // nicht sauber zu trennen (der Teppich hat fast Selis Farben), an der
    // Zeichenreihenfolge dagegen eindeutig.
    const schichten = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const R = g.renderer;
      // NICHTS wegräumen: Ein erster Entwurf setzte alles im Umkreis auf
      // `gone` und erwischte damit die Vorratstruhe – vier spätere Prüfungen
      // fielen um. Für die Reihenfolge braucht es nur Teppich und Figur.
      const heimX = g.player.x;
      const heimY = g.player.y;

      g.inventory.add('rug', 1);
      g.startPlacing('rug');
      g._updatePlacing();
      let versuche = 0;
      while (g.placing && !g.placing.valid && versuche++ < 40) {
        g.player.x += 24;
        g._updatePlacing();
      }
      g.confirmPlacing();
      const t = g.world.entities.filter((e) => e.kind === 'decor' && e.itemId === 'rug')[0];
      if (!t) return { fehler: 'kein Teppich' };
      g.camera.snapTo(g.player.x, g.player.y);
      // Knapp VOR die Figur: nach Tiefe sortiert käme er damit über sie.
      t.x = g.player.x;
      t.y = g.player.y + 22;
      g.world.reindex(t);

      const folge = [];
      const origE = R._drawEntity;
      const origP = R._drawPlayer;
      R._drawEntity = function (ctx, game, e, time) {
        if (e === t) folge.push('teppich');
        return origE.call(this, ctx, game, e, time);
      };
      R._drawPlayer = function (ctx, game, time) {
        folge.push('figur');
        return origP.call(this, ctx, game, time);
      };
      g.invalidate();
      for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(() => r()));
      R._drawEntity = origE;
      R._drawPlayer = origP;
      t.gone = true;
      g.player.x = heimX;
      g.player.y = heimY;
      g.camera.snapTo(heimX, heimY);
      return { flach: !!t.flat, folge: folge.slice(-2) };
    });
    check('Flaches liegt unter der Figur, auch wenn sie dahinter steht',
      schichten.flach === true && schichten.folge &&
      schichten.folge[0] === 'teppich' && schichten.folge[1] === 'figur',
      JSON.stringify(schichten));

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

    /* ---- Karte zeigt den Weg: Boote, Zuhause, Grundstück ---- */
    // Die Bucht auf der Insel stand nur im Fenstertext. Wer sie gekauft
    // hatte, suchte sie auf 96 mal 96 Kacheln – und die beiden Boote, also
    // der einzige Weg hinüber, standen auch nicht auf der Karte.
    //
    // Gemessen wird an den Pixeln, nicht am Code: Die Karte wird zweimal
    // gezeichnet, einmal mit und einmal ohne die Marke, und die Bilder
    // müssen sich unterscheiden.
    const marken = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.islePlot = Math.max(1, g.state.islePlot || 0);
      g.openPanel('map');
      await new Promise((r) => setTimeout(r, 260));
      const c = document.getElementById('map-canvas');
      if (!c) { g.panels.close(); return { keineKarte: true }; }
      const ctx = c.getContext('2d');
      const lesen = function () {
        g.panels._mapBase = null;
        g.panels._drawMap();
        return ctx.getImageData(0, 0, c.width, c.height).data;
      };
      const anders = function (a, b) {
        let n = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
        }
        return n;
      };

      const voll = lesen();
      // Boote weg – ändert sich das Bild?
      const boote = g.world.entities.filter((e) => e.kind === 'boat');
      for (const b of boote) b.kind = '_aus';
      const ohneBoot = lesen();
      for (const b of boote) b.kind = 'boat';
      // Und das Boot drüben erscheint erst mit der Insel: einmal mit
      // gesperrter, einmal mit offener Insel messen.
      const standInsel = g.world.unlocked.slice();
      g.world.unlocked[3] = false;
      const inselZu = lesen();
      g.world.unlocked[3] = true;
      const inselAuf = lesen();
      g.world.unlocked = standInsel;
      // Bucht weg
      const stand = g.state.islePlot;
      g.state.islePlot = 0;
      const ohneBucht = lesen();
      g.state.islePlot = stand;
      // Zuhause weg
      const heim = g.world.tent;
      const heimArt = heim ? heim.kind : null;
      if (heim) heim.kind = '_aus';
      const ohneHeim = lesen();
      if (heim) heim.kind = heimArt;

      g.panels.close();
      return {
        boote: boote.length,
        dBoot: anders(voll, ohneBoot),
        dBucht: anders(voll, ohneBucht),
        dHeim: anders(voll, ohneHeim),
        dInsel: anders(inselZu, inselAuf),
      };
    });
    check('Die Karte zeigt den Steg am Lager',
      marken.boote === 2 && marken.dBoot > 5, JSON.stringify(marken));
    check('Das Boot drüben kommt erst mit der Insel',
      marken.dInsel > 5, JSON.stringify(marken));
    check('Die Karte zeigt die gekaufte Bucht',
      marken.dBucht > 10, JSON.stringify(marken));
    check('Die Karte zeigt, wo man wohnt',
      marken.dHeim > 5, JSON.stringify(marken));

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
      // Warten, bis der Wert STEHT, statt eine feste Zeit abzusitzen.
      // Vorher waren es 420 ms, und auf einem langsamen Bild kam die Messung
      // vor dem neu gezeichneten Bild an: Die Prüfung fiel dann mit einer
      // Deckung von 0 durch, obwohl nichts kaputt war.
      const stabil = async function (wx, wy) {
        let letzte = -1;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 120));
          const v = deckung(wx, wy);
          if (v === letzte) return v;
          letzte = v;
        }
        return letzte;
      };

      g.colorField.sources.length = 0;
      g.colorField.sources.push({ x: px, y: py, r: 520, target: 520, key: 'gross' });
      g.colorField.markDirty();
      const alleine = await stabil(px + 300, py);

      // Zweite, kleine Quelle dazu – wie ein Gemütlichkeitskreis neben einem
      // Geist. Der Messpunkt liegt weit außerhalb von ihr.
      g.colorField.sources.push({ x: px - 60, y: py, r: 150, target: 150, key: 'klein' });
      g.colorField.markDirty();
      const zuZweit = await stabil(px + 300, py);

      g.colorField.sources.length = 0;
      for (const s of gemerkt) g.colorField.sources.push(s);
      g.colorField.markDirty();
      await new Promise((r) => setTimeout(r, 420));
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
      // Uhrzeit festnageln: Der Kontrast am Boden hängt sonst daran, wie weit
      // die Spieluhr während des Testlaufs gekommen ist.
      g.day.hour = 13;
      // Freie Graskachel suchen und die Figur daneben stellen
      // Auf einer engen Zufallsinsel gibt es nicht immer eine Kachel mit 120 px
      // Luft ringsum. Dann tut es auch weniger – gemessen wird ohnehin nur die
      // Kachelmitte.
      let ziel = null;
      for (const luft of [120, 90, 70]) {
        for (let ty = 4; ty < 92 && !ziel; ty++) {
          for (let tx = 4; tx < 92; tx++) {
            if (g.world.tileAtTile(tx, ty) !== 3) continue;
            if (g.world.queryNear(tx * 64 + 32, ty * 64 + 32, luft).filter((e) => !e.gone).length) continue;
            ziel = { x: tx, y: ty }; break;
          }
        }
        if (ziel) break;
      }
      // Findet sich auf dieser Zufallsinsel gar keine freie Kachel, wird
      // eine freigeräumt, statt die Prüfung aufzugeben. Gemessen wird hier
      // die ZEICHNUNG des Steinwegs – ob die Insel gerade voll steht, hat
      // damit nichts zu tun, und ein „keinPlatz" wäre ein Fehlschlag ohne
      // Messung. Verschoben, nicht gelöscht, und danach zurückgestellt.
      const beiseite = [];
      if (!ziel) {
        for (let ty = 6; ty < 90 && !ziel; ty++) {
          for (let tx = 6; tx < 90; tx++) {
            if (g.world.tileAtTile(tx, ty) !== 3) continue;
            ziel = { x: tx, y: ty }; break;
          }
        }
        if (!ziel) return { keinPlatz: true };
        for (const e of g.world.queryNear(ziel.x * 64 + 32, ziel.y * 64 + 32, 160)) {
          if (e.gone) continue;
          beiseite.push({ e, x: e.x, y: e.y });
          e.x += 5000;
          g.world.reindex(e);
        }
      }
      g.player.x = ziel.x * 64 + 32;
      g.player.y = ziel.y * 64 + 32 + 250;
      g.camera.snapTo(g.player.x, g.player.y);
      const warten = () => new Promise((r) => setTimeout(r, 700));
      // Gemessen wird, wie stark sich DIESELBEN Bildpunkte ändern. Der reine
      // Kontrast im Kästchen taugt nicht: Liegt zufällig eine Küstenlinie
      // darin, ist er schon vorher hoch, und die Steine gehen darin unter.
      function pixel() {
        const R = g.renderer;
        const sx = Math.round((ziel.x * 64 + 32 - g.camera.ox) * R.zoom);
        const sy = Math.round((ziel.y * 64 + 32 - g.camera.oy) * R.zoom);
        return R.ctx.getImageData(sx - 20, sy - 20, 40, 40).data;
      }
      await warten();
      const a = pixel();
      g.world.setTile(ziel.x, ziel.y, 5);
      g.ground.markTileDirty(ziel.x, ziel.y);
      await warten();
      const b = pixel();
      let geaendert = 0;
      let summe = 0;
      for (let i = 0; i < a.length; i += 4) {
        const la = a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11;
        const lb = b[i] * 0.3 + b[i + 1] * 0.59 + b[i + 2] * 0.11;
        const d = Math.abs(la - lb);
        summe += d;
        if (d > 12) geaendert++;
      }
      const n = a.length / 4;
      for (const b2 of beiseite) { b2.e.x = b2.x; b2.e.y = b2.y; g.world.reindex(b2.e); }
      return {
        anteilGeaendert: Math.round(geaendert / n * 100),
        mittlereAenderung: Math.round(summe / n),
        freigeraeumt: beiseite.length,
      };
    });
    check('Gelegter Steinweg hebt sich vom Boden ab',
      !weg.keinPlatz && weg.anteilGeaendert >= 25 && weg.mittlereAenderung >= 8,
      JSON.stringify(weg));

    /* ---- Fundstücke fallen auf ---- */
    // Die Karte zeigt ein Flämmchen. Am Ort stand ein blassgelber Kreis, den
    // man auf Papier nicht sah.
    const fund = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      let e = g.world.entities.filter((x) => x.kind === 'hidden' && !x.gone)[0];
      if (!e) {
        // Ob an diesem Tag ein Suchauftrag gewürfelt wurde, ist Zufall. Für
        // diese Prüfung wird deshalb notfalls eines von Hand ausgelegt – die
        // Frage ist, ob der Zeiger sichtbar ist, nicht ob es heute einen gibt.
        const baum = g.world.entities.filter((x) => x.kind && x.kind.indexOf('tree_') === 0 && !x.gone)[0];
        if (!baum) return { keins: true };
        e = {
          id: 990001, kind: 'hidden', x: baum.x - 8, y: baum.y - 60,
          sprite: 'memory_shell', itemId: 'memory_shell',
          hp: 1, hidden: false, respawnDay: 0, phase: 1.2, zBias: 2,
        };
        g.world.add(e);
      }
      // Uhrzeit festnageln: Nachts liegt ein blauer Schleier über allem, und
      // „warme Pixel" zählen wäre dann eine Messung der Tageszeit statt der
      // Sichtbarkeit. Die Spieluhr läuft während des Testlaufs weiter.
      g.day.hour = 13;
      g.player.x = e.x;
      g.player.y = e.y + 230;
      g.camera.snapTo(g.player.x, g.player.y);
      await new Promise((r) => setTimeout(r, 700));
      // Die Pixel derselben Stelle, roh. Verglichen wird später Pixel für
      // Pixel – ein Farbanteil in einem Kästchen sagt nur, wie warm die
      // Gegend ist, und die Gegend wechselt mit jedem Zufallsseed.
      function bild(wx, wy, r) {
        const R = g.renderer;
        const sx = Math.round((wx - g.camera.ox) * R.zoom);
        const sy = Math.round((wy - g.camera.oy) * R.zoom);
        return R.ctx.getImageData(sx - r, sy - r, r * 2, r * 2).data;
      }
      // Gemessen wird DIESELBE Stelle einmal ohne und einmal mit Fundstück.
      // Ein zweiter Ort als Vergleich taugt nicht: Herbstbäume, Sand und das
      // Lagerfeuer sind auch warm, und je nach Zufallsinsel liegt dort mehr
      // Farbe als beim Fundstück.
      //
      // Das Kästchen reicht von der Kachel bis über die Baumkronen (y-132),
      // denn dort schwebt das Flämmchen – der Teil, der immer zu sehen ist.
      // Auf ein wirklich neu gezeichnetes Bild warten statt auf die Uhr:
      // Seit das Spiel hinter offenen Fenstern und im Leerlauf Bilder
      // überspringt, sagt eine halbe Sekunde nichts darüber, ob das, was auf
      // dem Schirm steht, den geänderten Zustand schon zeigt. Diese Prüfung
      // maß darum unter Last einmal beide Male dasselbe Bild.
      async function neuZeichnen() {
        g.invalidate();
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => requestAnimationFrame(() => r()));
        }
      }
      e.gone = true;
      await neuZeichnen();
      const ohne = bild(e.x, e.y - 80, 70);
      e.gone = false;
      await neuZeichnen();
      const mit = bild(e.x, e.y - 80, 70);

      // Wie viele Pixel haben sich geändert, und wie stark?
      let geaendert = 0;
      let summe = 0;
      for (let i = 0; i < ohne.length; i += 4) {
        const d = Math.abs(ohne[i] - mit[i]) + Math.abs(ohne[i + 1] - mit[i + 1]) +
          Math.abs(ohne[i + 2] - mit[i + 2]);
        if (d > 24) geaendert++;
        summe += d;
      }
      return {
        pixel: ohne.length / 4,
        geaendert: geaendert,
        anteil: Math.round(geaendert / (ohne.length / 4) * 1000) / 10,
      };
    });
    // Gemessen wird die ÄNDERUNG an denselben Pixeln, nicht ein Farbanteil.
    // Ein Kästchen über Herbstlaub ist schon zu 65 % warm; ob ein Fundstück
    // darin liegt, macht daran nur ein Prozent aus – die Prüfung maß also die
    // Gegend, nicht das Fundstück.
    check('Fundstück ist im Bild zu erkennen',
      !fund.keins && fund.anteil > 1.5, JSON.stringify(fund));

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

    // Die Kopfzeile bricht auf schmalen Bildschirmen um. Lag die Aufgabenleiste
    // auf einem festen Abstand, deckte sie danach die Fensterknöpfe zu.
    const leiste = await page.evaluate(() => {
      const hud = document.getElementById('hud-top').getBoundingClientRect();
      const rail = document.getElementById('quest-rail').getBoundingClientRect();
      return { hudUnten: Math.round(hud.bottom), leisteOben: Math.round(rail.top) };
    });
    check('Aufgabenleiste liegt unter der Kopfzeile, nicht darauf',
      leiste.leisteOben >= leiste.hudUnten, JSON.stringify(leiste));

    // Auch die größte Einstellung muss auf dem Telefon halten. Wer sie wählt,
    // braucht sie – da darf nichts über den Rand laufen.
    const grossAufKlein = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.changeSetting('uiScale', '1.32');
      g.openPanel('inventory');
      await new Promise((r) => setTimeout(r, 400));
      const p = document.getElementById('panel').getBoundingClientRect();
      const b = document.getElementById('panel-body');
      const res = {
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        fensterPasst: p.right <= window.innerWidth + 1 && p.bottom <= window.innerHeight + 1,
        querScroll: b.scrollWidth > b.clientWidth + 1,
      };
      g.panels.close();
      g.changeSetting('uiScale', '1');
      return res;
    });
    check('Auch „Sehr groß" läuft auf dem Telefon nicht über',
      !grossAufKlein.overflowX && grossAufKlein.fensterPasst && !grossAufKlein.querScroll,
      JSON.stringify(grossAufKlein));

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);

    /* ---- Größe der Oberfläche ---- */
    // Sie hing an `--ui-scale`, das main.js bei jedem Bildwechsel neu setzte –
    // die Einstellung war damit wirkungslos, und die Fenster wuchsen ohnehin
    // nie mit: `body` stand fest auf 15 px, während nur die Anzeige über der
    // Insel skaliert wurde.
    const groesse = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      function messen() {
        const ico = document.querySelector('.hud-chip .ico');
        return {
          body: parseFloat(getComputedStyle(document.body).fontSize),
          hud: parseFloat(getComputedStyle(document.querySelector('.hud-chip')).fontSize),
          ico: ico ? Math.round(ico.getBoundingClientRect().width) : 0,
          knopf: Math.round(document.querySelector('.icon-btn').getBoundingClientRect().width),
        };
      }
      const warten = () => new Promise((r) => setTimeout(r, 260));
      g.changeSetting('uiScale', '1');
      await warten();
      const normal = messen();
      g.changeSetting('uiScale', '1.32');
      await warten();
      const gross = messen();
      g.changeSetting('uiScale', '0.85');
      await warten();
      const klein = messen();
      g.changeSetting('uiScale', '1');
      await warten();
      return { normal, gross, klein, gespeichert: g.settings.uiScale };
    });
    check('Fenstertext ist deutlich größer als die alten 15 px',
      groesse.normal.body >= 17, JSON.stringify(groesse.normal));
    check('Symbole in der Kopfzeile wachsen mit',
      groesse.gross.ico > groesse.normal.ico && groesse.normal.ico > groesse.klein.ico,
      JSON.stringify([groesse.klein.ico, groesse.normal.ico, groesse.gross.ico]));
    check('Die Einstellung ändert Schrift UND Knöpfe',
      groesse.gross.body > groesse.normal.body * 1.2 &&
      groesse.gross.knopf > groesse.normal.knopf * 1.2 &&
      groesse.klein.body < groesse.normal.body,
      JSON.stringify(groesse));

    // Sie muss auch das Neuladen überstehen – sonst stellt man sie jedes Mal neu.
    await page.evaluate(() => window.CozyGrove.game.changeSetting('uiScale', '1.15'));
    await page.reload({ waitUntil: 'load' });
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.ready), 60000, 'Grafik nach Neuladen');
    await page.click('#btn-continue');
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.game), 20000, 'Spiel nach Neuladen');
    await page.waitForTimeout(700);
    const nachher = await page.evaluate(() => ({
      wert: window.CozyGrove.game.settings.uiScale,
      user: getComputedStyle(document.documentElement).getPropertyValue('--ui-user').trim(),
    }));
    check('Die gewählte Größe übersteht das Neuladen',
      nachher.wert === 1.15 && parseFloat(nachher.user) === 1.15, JSON.stringify(nachher));
    await page.evaluate(() => window.CozyGrove.game.changeSetting('uiScale', '1'));

    // Die Aufgabenkarte muss sagen, WAS gewollt ist – nicht nur, wie weit es ist.
    const rail = await page.evaluate(() => {
      const karte = document.querySelector('.qcard');
      if (!karte) return { keine: true };
      const was = karte.querySelector('.what');
      return {
        titel: was ? was.textContent.trim() : null,
        sichtbar: was ? was.getBoundingClientRect().width > 30 : false,
        abgeschnitten: was ? was.scrollWidth > was.clientWidth + 1 : false,
      };
    });
    check('Aufgabenkarte nennt die Aufgabe beim Namen',
      !rail.keine && !!rail.titel && rail.titel.length > 3 && rail.sichtbar,
      JSON.stringify(rail));

    // Ein Botengang zählt nur, wenn man ihn wirklich hintragen muss.
    const bote = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const auf = g.world.entities.filter((e) => e.kind === 'spirit' &&
        g.world.isUnlocked(g.world.regionAtPixel(e.x, e.y)));
      const geister = (auf.length >= 2 ? auf
        : g.world.entities.filter((e) => e.kind === 'spirit')).slice(0, 2);
      const von = geister[0], zu = geister[1];
      // Vorstellung und Mitbringsel aus dem Weg räumen – geprüft wird die
      // Abgabe, nicht die Begrüßung.
      g.state.met[von.spiritId] = 1;
      g.state.met[zu.spiritId] = 1;
      if (!g.state.gifted) g.state.gifted = {};
      g.state.gifted[von.spiritId] = g.day.day;
      g.state.gifted[zu.spiritId] = g.day.day;
      // Alles andere beiseite: sonst zahlt ein fertiger Nebenauftrag mit und
      // das Ausrufezeichen stünde ohnehin überall.
      const beiseite = g.quests.quests;
      g.quests.quests = [];
      const q = {
        id: 'smoke_deliver', spirit: von.spiritId, type: 'deliver', itemId: 'stone',
        turnInAt: zu.spiritId, need: 2, have: 0, turnedIn: false, day: g.day.day,
        expires: g.day.day + 3, items: null, setKey: null, setName: null,
        rewards: { coins: 55, ember: 3, items: [] }, hiddenIds: null,
      };
      g.quests.quests.push(q);
      // Was schon in der Tasche liegt, mitzählen: Ob vorher Steine drin
      // waren, hängt am Zufallsseed und an dem, was frühere Prüfungen
      // abgebaut haben. Gemessen wird die Differenz, nicht der Bestand.
      const steineVorher = g.inventory.count('stone');
      g.inventory.add('stone', 2);

      const muenzenVorher = g.state.coins;
      g.talkTo(von);                       // beim Auftraggeber: nichts abgeben
      const beimAuftraggeber = g.state.coins;
      const nochDaBeimAuftraggeber = !!g.quests.byId('smoke_deliver');
      const markiert = g.spiritsWithReadyQuest().map((e) => e.spiritId);
      g.talkTo(zu);                        // beim Ziel: jetzt zählt es
      const beimZiel = g.state.coins;
      const nochOffen = !!g.quests.byId('smoke_deliver');
      g.quests.quests = beiseite;
      return {
        von: von.spiritId, zu: zu.spiritId, muenzenVorher, beimAuftraggeber, beimZiel,
        markiert, nochDaBeimAuftraggeber, nochOffen,
        steineVorher, steine: g.inventory.count('stone'),
      };
    });
    check('Botengang lässt sich beim Auftraggeber nicht abgeben',
      bote.beimAuftraggeber === bote.muenzenVorher && bote.nochDaBeimAuftraggeber,
      JSON.stringify(bote));
    check('Botengang wird beim Ziel abgegeben',
      bote.beimZiel > bote.beimAuftraggeber && !bote.nochOffen &&
      bote.steine === bote.steineVorher,
      JSON.stringify(bote));
    check('Das Ausrufezeichen steht über dem Ziel, nicht über dem Auftraggeber',
      bote.markiert.length === 1 && bote.markiert[0] === bote.zu,
      JSON.stringify(bote.markiert));

    // Bei „Aus dem Wald sammeln 1/3" muss dastehen, welche zwei fehlen.
    const sorten = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const q = {
        id: 'smoke_set', spirit: 'mira', type: 'set', itemId: null,
        items: ['berry', 'herb', 'resin'], setKey: 'wald', setName: 'Aus dem Wald',
        need: 3, have: 0, turnedIn: false, day: g.day.day, expires: g.day.day + 4,
        turnInAt: null, rewards: { coins: 90, ember: 4, items: [] }, hiddenIds: null,
      };
      g.quests.quests.unshift(q);
      g.inventory.add('berry', 1);
      // Was von den drei Sorten wirklich in der Tasche liegt – an dieser
      // Stelle im Durchlauf ist sie nicht mehr leer, und „genau eine ist
      // abgehakt" wäre eine Behauptung über den Verlauf, nicht über die Regel.
      const imBeutel = q.items.filter((id) => g.inventory.count(id) > 0);
      g.openPanel('quests');
      await new Promise((r) => setTimeout(r, 300));
      const reihe = Array.from(document.querySelectorAll('#panel .row'))
        .find((r) => r.querySelector('.parts'));
      const teile = reihe ? Array.from(reihe.querySelectorAll('.part')) : [];
      const erg = {
        gefunden: !!reihe,
        namen: teile.map((t) => t.textContent.trim()),
        abgehakt: teile.filter((t) => t.classList.contains('got')).length,
        sollAbgehakt: imBeutel.length,
        beeren: g.inventory.count('berry') > 0,
        beereAbgehakt: teile.some((t) => t.classList.contains('got') &&
          t.textContent.indexOf('Waldbeeren') >= 0),
        lesbar: teile.every((t) => t.getBoundingClientRect().width > 20),
      };
      g.panels.close();
      g.quests.quests = g.quests.quests.filter((x) => x.id !== 'smoke_set');
      return erg;
    });
    check('Sammelbitte zeigt jede geforderte Sorte einzeln',
      sorten.gefunden && sorten.namen.length === 3 && sorten.lesbar, JSON.stringify(sorten));
    check('Was schon in der Tasche liegt, ist abgehakt',
      sorten.abgehakt === sorten.sollAbgehakt && sorten.abgehakt >= 1 &&
      sorten.abgehakt < 3 && sorten.beereAbgehakt,
      JSON.stringify(sorten));

    // Die Gießkanne muss aussehen wie eine Gießkanne, nicht wie eine Hand.
    const kanne = await page.evaluate(() => {
      function pixel(name) {
        const art = window.CozyGrove.art.of(name);
        if (!art || !art.c) return null;
        const g = art.c.getContext('2d');
        const d = g.getImageData(0, 0, art.c.width, art.c.height).data;
        let deckend = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 24) deckend++;
        return { w: art.c.width, h: art.c.height, deckend };
      }
      return { kanne: pixel('tool_can'), symbol: pixel('icon_can'), hand: pixel('tool_hand') };
    });
    check('Die Gießkanne ist wirklich gezeichnet',
      !!kanne.kanne && kanne.kanne.deckend > 200, JSON.stringify(kanne.kanne));
    check('Ihr Symbol ist gezeichnet und nicht leer',
      !!kanne.symbol && kanne.symbol.deckend > 60, JSON.stringify(kanne.symbol));
    check('Sie sieht anders aus als die Hand',
      !!kanne.kanne && !!kanne.hand &&
      Math.abs(kanne.kanne.deckend - kanne.hand.deckend) > 60,
      JSON.stringify([kanne.kanne, kanne.hand]));

    // Gießen: ein Beet wächst dadurch einen Tag schneller, und nur einmal.
    const giessen = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.player.levels.can = 1;

      // Ein frisches Beet direkt vor die Figur setzen. Ein vorhandenes zu
      // verschieben ginge schief: der Suchraster kennt es dann noch an der
      // alten Stelle, und findTarget fände es nie.
      const beet = g.world.add({
        id: 990001, kind: 'crop', x: g.player.x + 40, y: g.player.y,
        sprite: 'crop_berry_0', cropId: 'berry', grown: 0, hp: 1, phase: 0,
      });
      g.player.dir = 'right';
      g.selectTool(6);
      const gewaehlt = g.player.tool.id;

      // Der Seed ist je Lauf zufällig. Liegt gerade ein verstecktes
      // Aufgabenstück neben der Figur, gewinnt es die Zielwahl, und die
      // Prüfung maß den Zufall statt das Beet. Was im Weg ist, wird für die
      // Messung kurz beiseitegeräumt.
      const beiseite = g.world.queryNear(g.player.x, g.player.y, 200).filter(function (o) {
        return o !== beet && !o.gone;
      });
      for (const o of beiseite) o.gone = true;
      g.target = g.player.findTarget(g.world);
      const gefunden = g.target ? g.target.entity.kind : null;
      g._updatePrompt();
      const el = document.getElementById('prompt-text');
      const hinweis = el ? el.textContent : '';

      g.onInteract();
      const nachErstem = beet.watered;
      g.onInteract();                       // zweimal am Tag zählt nicht
      const nachZweitem = beet.watered;

      // Ein Morgen vergeht
      const vorher = beet.grown;
      g.growCrops('clear');
      const mitGiessen = beet.grown - vorher;
      const zurueckgesetzt = beet.watered;

      // Und ein Morgen ohne Gießen zum Vergleich
      beet.grown = 0;
      beet.watered = 0;
      g.growCrops('clear');
      const ohneGiessen = beet.grown;

      for (const o of beiseite) o.gone = false;
      g.world.remove(beet);
      g.selectTool(0);
      return {
        gewaehlt, gefunden, hinweis, nachErstem, nachZweitem,
        mitGiessen, ohneGiessen, zurueckgesetzt,
      };
    });
    check('Taste 7 wählt die gebaute Gießkanne',
      giessen.gewaehlt === 'can', JSON.stringify(giessen.gewaehlt));
    check('Vor einem Beet steht „Gießen"',
      giessen.hinweis.indexOf('ießen') >= 0, JSON.stringify(giessen.hinweis));
    check('Gegossen wird einmal am Tag',
      giessen.nachErstem > 0 && giessen.nachZweitem === giessen.nachErstem,
      JSON.stringify(giessen));
    check('Ein gegossenes Beet wächst einen Schritt mehr',
      giessen.mitGiessen === giessen.ohneGiessen + 1, JSON.stringify(giessen));
    check('Am Morgen danach ist das Beet wieder trocken',
      giessen.zurueckgesetzt === 0, JSON.stringify(giessen.zurueckgesetzt));

    // Nicht gebaute Werkzeuge stehen nicht in der Leiste.
    const gurt = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      function sichtbar() {
        return Array.from(document.querySelectorAll('#toolbelt .tool'))
          .filter((b) => !b.hidden).length;
      }
      g.player.levels.can = 1;
      g.ui.refreshToolbelt();
      const mit = sichtbar();
      g.selectTool(0);
      g.player.levels.can = 0;
      g.ui.refreshToolbelt();
      const ohne = sichtbar();
      // Und der Rundlauf überspringt sie
      const besucht = [];
      for (let i = 0; i < 8; i++) { g.player.nextTool(); besucht.push(g.player.tool.id); }
      g.player.levels.can = 1;
      g.ui.refreshToolbelt();
      return { mit, ohne, besucht };
    });
    check('Ungebaute Werkzeuge stehen nicht in der Leiste',
      gurt.ohne === gurt.mit - 1 && gurt.mit === 7, JSON.stringify(gurt));
    check('Der Werkzeug-Rundlauf überspringt sie',
      gurt.besucht.indexOf('can') < 0, JSON.stringify(gurt.besucht));

    // Meilensteine: fällig heißt vergeben, mit Beigabe und dauerhafter Wirkung.
    const meilen = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.state.milestones = Object.create(null);
      g._perksChanged();
      const preisVorher = g.shop.sellPrice('wood');
      const muenzenVorher = g.state.coins;

      // Die Insel von Hand einfärben: ein sehr großer Kreis um das Lagerfeuer.
      const c = g.world.campfire;
      const s = g.colorField.addSource(c.x, c.y, 9000, 'test_gross');
      s.r = 9000;
      g.colorField.markDirty();
      const deckung = g.colorField.coverage(g.world);

      g._checkMilestones();
      const erreicht = Object.keys(g.state.milestones);
      const preisNachher = g.shop.sellPrice('wood');
      const muenzenNachher = g.state.coins;

      // Ein zweiter Durchlauf darf nichts noch einmal geben
      const nochmal = g.state.coins;
      g._checkMilestones();
      const doppelt = g.state.coins !== nochmal;

      // Und ein Bauplan, der vorher nicht dastand, steht jetzt da. Die Kanne
      // muss dafür ungebaut sein – Gebautes steht nicht mehr an der Werkbank.
      const hatte = g.player.levels.can;
      g.player.levels.can = 0;
      g.openPanel('craft');
      const bauplaene = document.getElementById('panel-body').innerText.indexOf('Gießkanne') >= 0;
      g.panels.close();
      g.player.levels.can = hatte;

      g.colorField.sources = g.colorField.sources.filter((x) => x.key !== 'test_gross');
      g.colorField.markDirty();
      return {
        deckung: Math.round(deckung * 100), anzahl: erreicht.length,
        preisVorher, preisNachher, muenzenVorher, muenzenNachher, doppelt, bauplaene,
      };
    });
    check('Volle Deckung vergibt alle Meilensteine',
      meilen.deckung >= 99 && meilen.anzahl === MILESTONES.length,
      JSON.stringify([meilen, MILESTONES.length]));
    check('Ihre Wirkung greift sofort: der Händler zahlt mehr',
      meilen.preisNachher > meilen.preisVorher, JSON.stringify(meilen));
    check('Die Beigabe kommt an', meilen.muenzenNachher > meilen.muenzenVorher,
      JSON.stringify(meilen));
    check('Kein Meilenstein wird zweimal vergeben', !meilen.doppelt, JSON.stringify(meilen));
    check('Ein freigeschalteter Bauplan steht danach an der Werkbank',
      meilen.bauplaene, JSON.stringify(meilen.bauplaene));

    // Die Leiter muss im Aufgabenfenster stehen – ein Ziel, das man nicht
    // sieht, ist kein Ziel.
    const leiter = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.milestones = Object.create(null);
      g._perksChanged();
      g.openPanel('quests');
      await new Promise((r) => setTimeout(r, 250));
      const text = document.getElementById('panel-body').innerText;
      const balken = document.querySelector('#panel-body .bar i');
      const erg = {
        ueberschrift: text.indexOf('Die Insel') >= 0,
        nennt: text.indexOf('Der erste Fleck') >= 0,
        prozent: /\d+% wieder bunt/.test(text),
        balken: balken ? balken.getBoundingClientRect().width : 0,
        weit: text.indexOf('Noch zu weit weg') >= 0,
      };
      g.panels.close();
      return erg;
    });
    check('Das Aufgabenfenster zeigt die Meilensteine',
      leiter.ueberschrift && leiter.nennt && leiter.prozent, JSON.stringify(leiter));
    check('Ferne Meilensteine verraten noch nichts', leiter.weit, JSON.stringify(leiter));

    /* ---- Das Grundstück ---- */
    const grund = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.plot = 1;
      g.world.plotStage = 1;
      const klein = g.plotStatus();

      // Ein Baum auf dem Grundstück und einer daneben, beide gefällt
      const baeume = g.world.entities.filter((e) => e.kind && e.kind.indexOf('tree_') === 0 && !e.gone);
      const drin = baeume.filter((e) => g.world.regionAtPixel(e.x, e.y) === 0 &&
        Math.abs(e.x - g.world.tent.x) < 400 && Math.abs(e.y - g.world.tent.y) < 300)[0];
      let treffer = null;
      if (drin) {
        g.state.plot = 4;                 // groß genug, dass er sicher drin liegt
        g.world.plotStage = 4;
        const id = drin.id;
        drin.gone = true;
        drin.origin = drin.kind;
        drin.kind = 'tree_stump';
        drin.respawnDay = g.day.day + 1;
        g.world.newDay(g.day.day + 3, {});
        treffer = { weg: !g.world.byId[id] };
      }

      // Auf eigenem Grund darf man näher ans Zelt bauen
      const zelt = g.world.tent;
      const nah = { x: zelt.x + 90, y: zelt.y + 60 };
      g.placing = null;
      const drinErlaubt = g._canPlaceAt(nah.x, nah.y);
      const grundDafuer = drinErlaubt ? null : g._placeReason(nah.x, nah.y);
      const drumherum = g.world.queryNear(nah.x, nah.y, 120).filter((e) => !e.gone)
        .map((e) => e.kind + '@' + Math.round(Math.sqrt((e.x - nah.x) ** 2 + (e.y - nah.y) ** 2)));
      g.state.plot = 1;
      g.world.plotStage = 1;

      // Ausbau kostet Glut und wächst
      g.state.ember = 0;
      g.expandPlot();
      const ohneGlut = g.state.plot;
      g.state.ember = 5000;
      g.expandPlot();
      const nachAusbau = g.plotStatus();

      g.state.plot = 1;
      g.world.plotStage = 1;
      return {
        kleinBreite: klein.bounds.x1 - klein.bounds.x0 + 1,
        grossBreite: nachAusbau.bounds.x1 - nachAusbau.bounds.x0 + 1,
        treffer, drinErlaubt, grundDafuer, drumherum, ohneGlut, stufe: nachAusbau.stufe,
        glut: g.state.ember,
      };
    });
    check('Auf dem Grundstück wächst nichts nach',
      grund.treffer && grund.treffer.weg === true, JSON.stringify(grund.treffer));
    check('Auf eigenem Grund darf man näher ans Lager bauen',
      grund.drinErlaubt === true,
      JSON.stringify({ grund: grund.grundDafuer, drumherum: grund.drumherum }));
    check('Ohne Glut wächst das Grundstück nicht',
      grund.ohneGlut === 1, JSON.stringify(grund.ohneGlut));
    check('Mit Glut wächst es – und wird sichtbar größer',
      grund.stufe === 2 && grund.grossBreite > grund.kleinBreite && grund.glut < 5000,
      JSON.stringify(grund));

    // Die Grenze muss man sehen, sonst weiß niemand, wo die Regel gilt.
    const grenze = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.plot = 2;
      g.world.plotStage = 2;
      const zelt = g.world.tent;
      g.player.x = zelt.x;
      g.player.y = zelt.y + 40;
      g.camera.snapTo(g.player.x, g.player.y);
      await new Promise((r) => requestAnimationFrame(() => r()));

      function bild() {
        const R = g.renderer;
        return R.ctx.getImageData(0, 0, R.ctx.canvas.width, R.ctx.canvas.height).data;
      }
      async function zeichnen() {
        g.invalidate();
        for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(() => r()));
      }
      await zeichnen();
      const mit = bild();
      const echt = g.plotRect;
      g.plotRect = function () { return null; };     // Grenze weglassen
      await zeichnen();
      const ohne = bild();
      g.plotRect = echt;
      await zeichnen();

      let anders = 0;
      for (let i = 0; i < mit.length; i += 4) {
        if (Math.abs(mit[i] - ohne[i]) + Math.abs(mit[i + 1] - ohne[i + 1]) +
            Math.abs(mit[i + 2] - ohne[i + 2]) > 24) anders++;
      }
      g.state.plot = 1;
      g.world.plotStage = 1;
      return { anders, pixel: mit.length / 4 };
    });
    check('Die Grenze des Grundstücks ist im Bild zu sehen',
      grenze.anders > 400, JSON.stringify(grenze));

    const lagerFenster = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.openPanel('plot');
      await new Promise((r) => setTimeout(r, 300));
      const text = document.getElementById('panel-body').innerText;
      const knoepfe = document.querySelectorAll('#panel-body [data-act="expandPlot"]').length;
      g.panels.close();
      return {
        nenntRegel: text.indexOf('wächst nichts nach') >= 0,
        nenntGroesse: /\d+ × \d+ Kacheln/.test(text),
        stufen: (text.match(/Lichtung|Hinterhof|Garten|Anwesen/g) || []).length,
        knoepfe,
      };
    });
    check('Das Lagerfenster nennt Größe, Regel und Ausbau',
      lagerFenster.nenntRegel && lagerFenster.nenntGroesse &&
      lagerFenster.stufen >= 4 && lagerFenster.knoepfe === 1,
      JSON.stringify(lagerFenster));

    /* ---- Das Haustier ---- */
    const tier = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const merkeMeilen = g.state.milestones;
      g.state.pet = null;
      g.syncPet();
      const ohneNapf = !!g.world.pet;

      // Napf aufstellen – erst dann kommt jemand vorbei.
      g.state.milestones = { werkzeugtag: true };
      g.inventory.add('bowl', 1);
      g.startPlacing('bowl');
      g._updatePlacing();
      let n = 0;
      while (g.placing && !g.placing.valid && n++ < 40) {
        g.player.x += 24;
        g._updatePlacing();
      }
      g.confirmPlacing();
      const napf = g.bowlEntity();
      const streuner = !!g.world.pet && g.petStatus().streuner;

      // Ohne Futter passiert nichts, und es wird auch nichts weggenommen.
      for (const id of ['fish_cod', 'fish_sardine', 'berry', 'mushroom', 'herb',
        'fish_mackerel', 'fish_roach', 'fish_trout', 'fish_catfish',
        'fish_moonfish', 'fish_goldcarp', 'rainmushroom']) {
        g.inventory.remove(id, 9999);
      }
      const hungerVorher = g.petStatus().fortschritt;
      g.day.day += 1;
      const ohneFutter = g.feedPet();

      // Mit Futter: drei Fütterungen, dann bleibt es
      g.inventory.add('fish_cod', 9);
      const schritte = [];
      for (let t = 0; t < 3; t++) {
        g.day.day += 1;
        g.feedPet();
        schritte.push(g.petStatus().fortschritt);
      }
      const zahm = g.petStatus().zahm;
      const fischWeg = 9 - g.inventory.count('fish_cod');

      // Zweimal am selben Tag geht nicht
      const nochmal = g.feedPet();

      // Es sucht einmal am Tag etwas – aber nur satt.
      g.world.pet.fund = null;
      g.state.pet.fundAm = 0;
      g.state.pet.laune = 100;
      const dig = g.world.entities.filter((e) => e.kind === 'digspot' && !e.gone)[0];
      let sucht = null;
      if (dig) {
        g.player.x = dig.x + 100;
        g.player.y = dig.y + 100;
        g._petSucht();
        sucht = !!g.world.pet.fund;
      }
      const fundAm = g.state.pet.fundAm;
      // Ein zweites Mal am selben Tag nicht
      g.world.pet.fund = null;
      g._petSucht();
      const zweitesMal = !!g.world.pet.fund;
      // Und hungrig gar nicht
      g.state.pet.fundAm = 0;
      g.state.pet.laune = 5;
      g._petSucht();
      const hungrigSucht = !!g.world.pet.fund;

      // Hunger nimmt nichts weg: es bleibt zahm
      g.state.pet.gefuettertAm = g.day.day - 30;
      g._petNewDay(g.day.day);
      const nachHunger = { laune: g.state.pet.laune, zahm: g.petStatus().zahm };

      // Es läuft mit. Beide Punkte müssen begehbar sein: Ein erster Entwurf
      // setzte Seli 700 Bildpunkte weiter und landete im Wasser – dann stand
      // das Tier still, und zwar völlig zu Recht.
      g.state.pet.laune = 100;
      g.world.pet.fund = null;
      g.world.pet.ruhe = null;
      const heim = g.world.tent;
      let start = null;
      let ziel = null;
      for (let r = 120; r <= 900 && !ziel; r += 40) {
        for (let i = 0; i < 16 && !ziel; i++) {
          const a = (i / 16) * Math.PI * 2;
          const px = heim.x + Math.cos(a) * r;
          const py = heim.y + Math.sin(a) * r;
          if (!g.world.canStand(px, py, 12, 8)) continue;
          if (!start) start = { x: px, y: py };
          else if (Math.hypot(px - start.x, py - start.y) > 600) ziel = { x: px, y: py };
        }
      }
      let weit = 0;
      let nah = 0;
      let bewegt = 0;
      if (start && ziel) {
        g.player.x = start.x;
        g.player.y = start.y;
        g.world.pet.x = start.x;
        g.world.pet.y = start.y;
        g.world.reindex(g.world.pet);
        g.player.x = ziel.x;
        g.player.y = ziel.y;
        weit = Math.hypot(g.world.pet.x - g.player.x, g.world.pet.y - g.player.y);
        for (let i = 0; i < 600; i++) {
          const vx = g.world.pet.x;
          const vy = g.world.pet.y;
          g._updatePet(1 / 30);
          if (g.world.pet.x !== vx || g.world.pet.y !== vy) bewegt++;
        }
        nah = Math.hypot(g.world.pet.x - g.player.x, g.world.pet.y - g.player.y);
      }

      // Es legt sich hin, wenn man stehen bleibt – und nur dann. Die
      // Bedingung fragte früher `player.vx`/`vy` ab, und die werden nie
      // gesetzt: Das Tier suchte sich nach fünf Sekunden eine Bank, während
      // man quer über die Insel rannte.
      g.state.pet.laune = 100;
      g.world.pet.fund = null;
      g.world.pet.ruhe = null;
      g.world.pet.stillZeit = 0;
      const ruheBank = g.world.add({
        id: 960101, kind: 'decor', itemId: 'bench',
        x: g.player.x + 80, y: g.player.y, sprite: 'bench',
      });
      g.player.moving = true;
      for (let i = 0; i < 400; i++) g._petRuht(0.05);     // 20 s im Laufen
      const legtSichImLaufen = !!g.world.pet.ruhe;
      g.player.moving = false;
      for (let i = 0; i < 200; i++) g._petRuht(0.05);     // 10 s im Stehen
      const legtSichImStehen = !!g.world.pet.ruhe;
      g.world.remove(ruheBank);
      g.world.pet.ruhe = null;

      // Napf einpacken, solange es fremd ist, verscheucht es wieder
      g.state.pet.zahm = 0;
      napf.gone = true;
      g.syncPet();
      const ohneNapfWeg = !!g.world.pet;

      g.state.milestones = merkeMeilen;
      g.state.pet = null;
      g.syncPet();
      return {
        ohneNapf, streuner, ohneFutter, hungerVorher, schritte, zahm, fischWeg,
        nochmal, sucht, fundAm, zweitesMal, hungrigSucht, nachHunger,
        weit: Math.round(weit), nah: Math.round(nah), bewegt, ohneNapfWeg,
        legtSichImLaufen, legtSichImStehen,
      };
    });
    check('Ohne Napf ist kein Tier da',
      tier.ohneNapf === false, JSON.stringify(tier));
    check('Der Napf lockt einen Streuner an',
      tier.streuner === true, JSON.stringify(tier));
    check('Ohne Futter lässt es sich nicht anlocken',
      tier.ohneFutter === false && tier.hungerVorher === 0, JSON.stringify(tier));
    check('Dreimal füttern, dann bleibt es',
      tier.schritte.join(',') === '1,2,3' && tier.zahm === true && tier.fischWeg === 3,
      JSON.stringify(tier));
    check('Zweimal am Tag füttern geht nicht',
      tier.nochmal === false, JSON.stringify(tier));
    check('Einmal am Tag findet es etwas',
      tier.sucht === true && tier.zweitesMal === false, JSON.stringify(tier));
    check('Im Laufen legt es sich nicht hin, im Stehen schon',
      tier.legtSichImLaufen === false && tier.legtSichImStehen === true,
      JSON.stringify(tier));
    check('Hungrig sucht es nichts',
      tier.hungrigSucht === false, JSON.stringify(tier));
    check('Hunger kostet Laune, aber nimmt einem das Tier nicht weg',
      tier.nachHunger.laune === 0 && tier.nachHunger.zahm === true,
      JSON.stringify(tier.nachHunger));
    check('Es läuft hinterher, ohne hängenzubleiben',
      tier.weit > 500 && tier.nah < 120 && tier.bewegt > 100, JSON.stringify(tier));
    check('Napf weg, Streuner weg – solange es noch fremd ist',
      tier.ohneNapfWeg === false, JSON.stringify(tier));

    /* ---- Das Lieblingsgeschenk ---- */
    const lieblings = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      // Flämmchen mag Holz, Hartholz und Harz – am liebsten Harz.
      const e = g.world.entities.filter(
        (x) => x.kind === 'spirit' && x.spiritId === 'flamey')[0];
      if (!e) return { fehler: 'kein Flämmchen' };
      g.state.met.flamey = 1;
      // Aufträge beiseite: Was für eine offene Bitte gebraucht wird, bietet
      // das Spiel nicht als Mitbringsel an – sonst misst die Prüfung, welche
      // Aufgaben heute zufällig offen sind.
      const beiseiteQ = g.quests.quests;
      g.quests.quests = [];
      for (const x of ['wood', 'hardwood', 'resin']) g.inventory.remove(x, 9999);

      // Nur Holz dabei: das wird gewählt.
      g.inventory.add('wood', 1);
      const beiHolz = g.likedInBag('flamey');
      // Harz dazu: jetzt hat das Lieblingsstück Vorrang.
      g.inventory.add('resin', 1);
      const beiBeidem = g.likedInBag('flamey');

      // Die Farbquelle entsteht erst, wenn der Geist etwas bekommen hat.
      // Ohne sie liefe `growByArea` ins Leere und die Prüfung verglich
      // zweimal die Null.
      if (!g.colorField.find('spirit_flamey')) {
        g.colorField.addSource(e.x, e.y, 200, 'spirit_flamey');
      }
      function schenken() {
        g.state.gifted = {};
        const glutVorher = g.state.ember;
        const quelle = g.colorField.find('spirit_flamey');
        const rVorher = quelle ? quelle.target : 0;
        g.giveGiftTo(e);
        const q2 = g.colorField.find('spirit_flamey');
        return { glut: g.state.ember - glutVorher, farbe: (q2 ? q2.target : 0) - rVorher };
      }
      // Erst das Lieblingsstück (liegt vorn), dann das gewöhnliche
      const mitLieb = schenken();
      const mitNormal = schenken();

      for (const x of ['wood', 'hardwood', 'resin']) g.inventory.remove(x, 9999);
      g.state.gifted = {};
      g.quests.quests = beiseiteQ;
      return { beiHolz, beiBeidem, mitLieb, mitNormal };
    });
    check('Das Lieblingsstück wird bevorzugt verschenkt',
      lieblings.beiHolz === 'wood' && lieblings.beiBeidem === 'resin',
      JSON.stringify(lieblings));
    check('Und bringt deutlich mehr Glut und Farbe',
      lieblings.mitLieb.glut > lieblings.mitNormal.glut &&
      lieblings.mitLieb.farbe > lieblings.mitNormal.farbe,
      JSON.stringify(lieblings));

    /* ---- Die Fanggröße ---- */
    const fang = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.state.records = {};
      const vorherTasche = g.inventory.count('fish_cod');

      // `result.fish` ist ein Gegenstand aus items.js. Der Fang wird über
      // `_onFishEvent` ausgelöst – denselben Weg, den das Angeln nimmt –,
      // damit mitgeprüft ist, dass die Größe dort überhaupt ankommt.
      const dorsch = { id: 'fish_cod', name: 'Dorsch', icon: 'icon_fish_cod' };
      const groessen = [];
      for (let i = 0; i < 40; i++) {
        g.fishing.result = { fish: dorsch, perfect: i % 5 === 0 };
        g._onFishEvent('catch');
        groessen.push(g.state.records.fish_cod || 0);
      }
      const rekord = g.state.records.fish_cod;
      const monoton = groessen.every((v, i) => i === 0 || v >= groessen[i - 1]);
      // Ein Fang legt auch wirklich einen Fisch in die Tasche
      const gefangen = g.inventory.count('fish_cod') - vorherTasche;

      g.state.records = {};
      g.fishing.result = null;
      return { rekord, monoton, gefangen, arten: groessen.length };
    });
    check('Jeder Fang bekommt ein Maß und der Rekord steigt nur',
      fang.rekord > 0 && fang.monoton === true, JSON.stringify(fang));
    check('Und der Fisch landet trotzdem in der Tasche',
      fang.gefangen > 0, JSON.stringify(fang));

    /* ---- Die Bucht auf der Insel ---- */
    const bucht = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const merkeMeilen = g.state.milestones;
      const merkeMuenzen = g.state.coins;
      g.state.islePlot = 0;
      g.world.islePlotStage = 0;

      // Ohne den Inselmeilenstein ist sie zu, auch mit vollem Beutel.
      g.state.milestones = Object.create(null);
      g.state.coins = 99999;
      g.expandIslePlot();
      const ohneInsel = g.state.islePlot;
      g.openPanel('plot');
      await new Promise((r) => setTimeout(r, 250));
      const textZu = document.getElementById('panel-body').innerText;

      // Mit Meilenstein, aber ohne Geld
      g.state.milestones = { insel: true };
      g.state.coins = 10;
      g.panels.render();
      g.expandIslePlot();
      const ohneGeld = g.state.islePlot;

      // Und jetzt kaufen
      g.state.coins = 99999;
      const vorher = g.state.coins;
      // Der Preis kommt aus der Quelle, nicht aus diesem Test – und er wird
      // VOR dem Kauf abgelesen, denn danach steht dort schon die nächste
      // Stufe. Abgeschrieben stand hier die 800, und beim ersten
      // Umbalancieren der Wirtschaft fiel die Prüfung rot aus, obwohl der
      // Kauf tadellos funktionierte.
      const sollPreis = g.islePlotStatus().kosten;
      g.expandIslePlot();
      const gekauft = {
        stufe: g.state.islePlot,
        bezahlt: vorher - g.state.coins,
        soll: sollPreis,
        welt: g.world.islePlotStage,
        rechteck: !!g.islePlotRect(),
      };
      g.panels.render();
      const textAuf = document.getElementById('panel-body').innerText;
      g.panels.close();

      // In der Bucht darf man dicht bauen – wie im Lager
      const b = g.islePlotStatus().bounds;
      const mitte = { x: (b.x0 + b.x1) / 2 * 64, y: (b.y0 + b.y1) / 2 * 64 };
      const eigen = g._aufEigenemGrund(mitte.x, mitte.y);

      g.state.islePlot = 0;
      g.world.islePlotStage = 0;
      g.state.milestones = merkeMeilen;
      g.state.coins = merkeMuenzen;
      return {
        ohneInsel, ohneGeld, gekauft, eigen,
        sagtZu: textZu.indexOf('sobald die Insel offen ist') >= 0,
        nenntStufen: (textAuf.match(/Die Bucht|Der Hain|Die Wiese|Die ganze Bucht/g) || []).length,
      };
    });
    check('Vor dem Inselmeilenstein ist die Bucht zu – und sagt es',
      bucht.ohneInsel === 0 && bucht.sagtZu, JSON.stringify(bucht));
    check('Ohne Münzen bleibt sie zu',
      bucht.ohneGeld === 0, JSON.stringify(bucht));
    check('Gekauft gehört sie dir, und die Welt weiß es',
      bucht.gekauft.stufe === 1 && bucht.gekauft.bezahlt === bucht.gekauft.soll &&
      bucht.gekauft.welt === 1 && bucht.gekauft.rechteck,
      JSON.stringify(bucht.gekauft));
    check('Dort gelten dieselben milden Abstände wie im Lager',
      bucht.eigen === true, JSON.stringify(bucht));
    check('Das Fenster zeigt alle vier Stufen der Bucht',
      bucht.nenntStufen >= 4, JSON.stringify(bucht));

    /* ---- Der Umzug ---- */
    const umzug = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const merkeMeilen = g.state.milestones;
      const merkeMuenzen = g.state.coins;
      const kachel = function (e) {
        return Math.floor(e.x / 64) + '|' + Math.floor(e.y / 64);
      };

      // Ohne gekaufte Bucht geht gar nichts.
      g.state.islePlot = 0;
      g.world.islePlotStage = 0;
      g.state.homeAt = 'camp';
      // Ein Zelt hat keinen Farbkreis (`houseColor(1)` ist 0). Für die
      // Prüfung der Quellen muss also gebaut sein.
      g.state.house = 3;
      g.syncHouse();
      const imLager = { haus: kachel(g.world.tent), kasten: kachel(g.world.mailbox) };
      const ohneBucht = g.moveHome('isle');

      // Bucht kaufen, dann umziehen
      g.state.milestones = { insel: true };
      g.state.coins = 99999;
      g.expandIslePlot();
      const gezogen = g.moveHome('isle');
      const drueben = { haus: kachel(g.world.tent), kasten: kachel(g.world.mailbox) };
      const region = g.world.regionAtPixel(g.world.tent.x, g.world.tent.y);
      // Der Briefkasten muss mitkommen, sonst wäre Post eine Bootsfahrt
      const kastenNah = Math.hypot(
        g.world.mailbox.x - g.world.tent.x, g.world.mailbox.y - g.world.tent.y) < 220;
      // Und man muss dort auch stehen können
      const stehtFrei = g.world.canStand(g.world.tent.x, g.world.tent.y + 90, 12, 8);
      // Am Haus wird geschlafen – auch drüben
      g.player.x = g.world.tent.x;
      g.player.y = g.world.tent.y + 90;
      g.player.dir = 'up';
      const beiseite = g.world.queryNear(g.player.x, g.player.y, 200).filter(function (o) {
        return o !== g.world.tent && !o.gone;
      });
      for (const o of beiseite) o.gone = true;
      const ziel = g.player.findTarget(g.world);
      const schlafbar = !!(ziel && ziel.entity === g.world.tent);
      for (const o of beiseite) o.gone = false;

      // Das Lager bleibt gefärbt: eigene Quelle je Platz, keine wandernde
      const quellen = ['house', 'house_isle'].filter((k) => !!g.colorField.find(k)).length;

      // Und die Welt neu aufbauen, wie beim Laden – das Haus muss dableiben
      const stand = JSON.parse(JSON.stringify(g.toJSON()));
      g.world.tent.x = 0;
      g.world.tent.y = 0;
      g.world.reindex(g.world.tent);
      g.syncHouse();
      const nachNeuaufbau = kachel(g.world.tent);

      const zurueck = g.moveHome('camp');
      const wiederDa = { haus: kachel(g.world.tent), kasten: kachel(g.world.mailbox) };

      g.state.islePlot = 0;
      g.world.islePlotStage = 0;
      g.state.homeAt = 'camp';
      g.state.house = 1;
      g.syncHouse();
      g.state.milestones = merkeMeilen;
      g.state.coins = merkeMuenzen;
      return {
        imLager, drueben, wiederDa, ohneBucht, gezogen, zurueck,
        region, kastenNah, stehtFrei, schlafbar, quellen, nachNeuaufbau,
        gespeichert: stand.state.homeAt,
      };
    });
    check('Ohne gekaufte Bucht bleibt das Haus im Lager',
      umzug.ohneBucht === false, JSON.stringify(umzug));
    check('Umgezogen steht das Haus auf der Insel',
      umzug.gezogen === true && umzug.region === 3 &&
      umzug.drueben.haus !== umzug.imLager.haus, JSON.stringify(umzug));
    check('Der Briefkasten zieht mit',
      umzug.kastenNah && umzug.drueben.kasten !== umzug.imLager.kasten,
      JSON.stringify(umzug));
    check('Vor dem Haus kann man stehen und schlafen',
      umzug.stehtFrei === true && umzug.schlafbar === true, JSON.stringify(umzug));
    check('Der alte Platz bleibt gefärbt – jeder Platz hat seine Quelle',
      umzug.quellen === 2, JSON.stringify(umzug));
    check('Nach dem Neuaufbau der Welt wohnt man noch drüben',
      umzug.nachNeuaufbau === umzug.drueben.haus && umzug.gespeichert === 'isle',
      JSON.stringify(umzug));
    check('Zurückziehen stellt Haus und Kasten wieder ins Lager',
      umzug.zurueck === true && umzug.wiederDa.haus === umzug.imLager.haus &&
      umzug.wiederDa.kasten === umzug.imLager.kasten, JSON.stringify(umzug));

    /* ---- Vom Zelt zum Haus ---- */
    const haus = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.house = 1;
      g.syncHouse();
      const zelt = g.world.tent;
      const vorher = {
        sprite: zelt.sprite, block: zelt.blockR, reach: zelt.reachR,
        stufe: g.houseStatus().stufe,
      };

      // Ohne Material passiert nichts – auch nicht heimlich.
      const stand = g.houseStatus();
      for (const c of stand.naechste.cost) g.inventory.remove(c.id, 9999);
      g.buildHouse();
      const ohneMaterial = g.state.house;

      // Mit Material: die Grafik wechselt, und das Material ist weg.
      for (const c of stand.naechste.cost) g.inventory.add(c.id, c.n);
      const bezahlt = stand.naechste.cost[0];
      g.buildHouse();
      const nachBau = {
        stufe: g.state.house, sprite: zelt.sprite,
        block: zelt.blockR, reach: zelt.reachR,
        restMaterial: g.inventory.count(bezahlt.id),
      };

      // Nachts leuchtet das eigene Fenster – vorher nicht.
      const lichterHaus = g.lightSources(0).filter(
        (L) => Math.abs(L.x - zelt.x) < 4 && Math.abs(L.y - (zelt.y - 110)) < 4).length;
      g.state.house = 1;
      g.syncHouse();
      const lichterZelt = g.lightSources(0).filter(
        (L) => Math.abs(L.x - zelt.x) < 4 && Math.abs(L.y - (zelt.y - 110)) < 4).length;

      // Der Farbkreis ums Haus bleibt, wenn man ihn einmal hat. Die ZAHL
      // festhalten, nicht die Quelle: `find` liefert beide Male dasselbe
      // Objekt, und ein Vergleich mit sich selbst geht immer aus.
      g.state.house = 3;
      g.syncHouse();
      const kreisGross = (g.colorField.find('house') || {}).target || 0;
      g.state.house = 2;
      g.syncHouse();
      const kreisKlein = (g.colorField.find('house') || {}).target || 0;

      // Die Stufe muss den Spielstand überleben: Wer tagelang Material
      // sammelt und nach dem Neuladen wieder im Zelt steht, hört auf.
      g.state.house = 3;
      const gespeichert = g.toJSON().state.house;

      g.state.house = 1;
      g.syncHouse();
      return {
        vorher, ohneMaterial, nachBau, lichterHaus, lichterZelt,
        kreisGross, kreisKlein, gespeichert,
      };
    });
    check('Die Ausbaustufe des Hauses wird gespeichert',
      haus.gespeichert === 3, JSON.stringify(haus.gespeichert));
    check('Ohne Material bleibt das Zelt stehen',
      haus.ohneMaterial === 1 && haus.vorher.sprite === 'tent', JSON.stringify(haus));
    check('Gebaut wechselt die Grafik und das Material ist bezahlt',
      haus.nachBau.stufe === 2 && haus.nachBau.sprite === 'house_2' &&
      haus.nachBau.restMaterial === 0, JSON.stringify(haus.nachBau));
    check('Das größere Haus blockiert mehr und reicht weiter',
      haus.nachBau.block > haus.vorher.block && haus.nachBau.reach > haus.vorher.reach,
      JSON.stringify({ vorher: haus.vorher, nachher: haus.nachBau }));
    check('Erst das Haus hat ein Fenster, das nachts leuchtet',
      haus.lichterHaus === 1 && haus.lichterZelt === 0, JSON.stringify(haus));
    check('Der Farbkreis ums Haus wird nie wieder kleiner',
      haus.kreisGross > 0 && haus.kreisKlein === haus.kreisGross, JSON.stringify(haus));

    const hausFenster = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.house = 1;
      g.syncHouse();
      const stand = g.houseStatus();
      for (const c of stand.naechste.cost) g.inventory.remove(c.id, 9999);
      g.openPanel('plot');
      await new Promise((r) => setTimeout(r, 300));
      const text = document.getElementById('panel-body').innerText;
      const knopf = document.querySelector('#panel-body [data-act="buildHouse"]');
      const gesperrt = knopf ? knopf.disabled : null;
      // Mit Material muss derselbe Knopf drückbar werden.
      for (const c of stand.naechste.cost) g.inventory.add(c.id, c.n);
      g.panels.render();
      const knopf2 = document.querySelector('#panel-body [data-act="buildHouse"]');
      const frei = knopf2 ? knopf2.disabled === false : null;
      g.panels.close();
      for (const c of stand.naechste.cost) g.inventory.remove(c.id, 9999);
      return {
        stufen: (text.match(/Das Zelt|Die Hütte|Das Haus|Haus mit Veranda/g) || []).length,
        // Die Kostenzeile zeigt Stand und Ziel, nicht nur das Ziel
        nenntStand: /0\/\d+/.test(text),
        // Weit entfernte Stufen verraten ihre Einkaufsliste noch nicht
        nurEineListe: (text.match(/\d+\/\d+/g) || []).length ===
          stand.naechste.cost.length,
        gesperrt, frei,
      };
    });
    check('Das Lagerfenster zeigt alle vier Wohnstufen',
      hausFenster.stufen >= 4, JSON.stringify(hausFenster));
    check('Die Baukosten zeigen, was man hat und was man braucht',
      hausFenster.nenntStand === true, JSON.stringify(hausFenster));
    check('Nur die nächste Stufe verrät ihre Einkaufsliste',
      hausFenster.nurEineListe === true, JSON.stringify(hausFenster));
    check('Der Bauknopf ist gesperrt, bis das Material da ist',
      hausFenster.gesperrt === true && hausFenster.frei === true,
      JSON.stringify(hausFenster));

    /* ---- Der letzte Abend ---- */
    // Der Abschluss darf sich nicht verpassen lassen: Der Ring am Feuer
    // wartet, bis man bei jedem war – auch über Nacht.
    const abend = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.finale = null;
      // Die ECHTE Heimat, nicht die Stelle, an der sie gerade stehen: Eine
      // frühere Prüfung vergibt alle Meilensteine, und damit versammeln sie
      // sich schon einmal. „Wo sie eben standen" wäre dann das Feuer.
      const heime = g.world.entities.filter((e) => e.kind === 'spirit')
        .map((e) => ({ id: e.spiritId, x: e.homeX, y: e.homeY }));

      g._startFinale();
      const feuer = g.world.campfire;
      const geister = g.world.entities.filter((e) => e.kind === 'spirit');
      const abstaende = geister.map((e) => Math.round(
        Math.sqrt((e.x - feuer.x) ** 2 + (e.y - feuer.y) ** 2)));
      const alleStehen = geister.every((e) => g.world.canStand(e.x, e.y, 5, 4));

      // Über Nacht bleiben sie stehen
      g._jitterSpirits(g.day.day + 1);
      const nachNacht = geister.map((e) => Math.round(
        Math.sqrt((e.x - feuer.x) ** 2 + (e.y - feuer.y) ** 2)));

      // Bei jedem vorbei
      const muenzenVorher = g.state.coins;
      const schritte = [];
      for (const e of geister) {
        g.state.met[e.spiritId] = 1;
        g.talkTo(e);
        schritte.push(Object.keys(g.state.finale.heard).length);
      }
      const fertig = g.state.finale.done;
      // Ein zweiter Besuch zählt nicht doppelt
      g.talkTo(geister[0]);
      const nochmal = Object.keys(g.state.finale.heard).length;

      // Und danach gehen sie am nächsten Morgen wieder heim
      g._jitterSpirits(g.day.day + 2);
      const heimgekehrt = geister.filter((e) => {
        const h = heime.filter((x) => x.id === e.spiritId)[0];
        return h && Math.abs(e.x - h.x) < 120 && Math.abs(e.y - h.y) < 120;
      }).length;

      return {
        anzahl: geister.length, abstaende, alleStehen, nachNacht,
        schritte, fertig, nochmal,
        muenzen: g.state.coins - muenzenVorher,
        heimgekehrt,
      };
    });
    check('Bei hundert Prozent stehen alle am Feuer',
      abend.abstaende.every((d) => d > 60 && d < 400) && abend.alleStehen,
      JSON.stringify(abend.abstaende));
    check('Sie warten auch über Nacht',
      JSON.stringify(abend.nachNacht) === JSON.stringify(abend.abstaende),
      JSON.stringify(abend.nachNacht));
    check('Jeder Besuch bringt einen Satz, jeder nur einmal',
      abend.schritte.join(',') === abend.schritte.map((_, i) => i + 1).join(',') &&
      abend.nochmal === abend.anzahl, JSON.stringify(abend.schritte));
    check('Wer bei allen war, hat den Abschluss',
      abend.fertig === true && abend.muenzen >= 500, JSON.stringify(abend));
    check('Danach gehen sie wieder heim',
      abend.heimgekehrt === abend.anzahl, JSON.stringify(abend.heimgekehrt));

    // Die Schlusssätze müssen nachlesbar sein – eine Sprechblase ist weg.
    const nachlese = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.openPanel('stories');
      await new Promise((r) => setTimeout(r, 300));
      const text = document.getElementById('panel-body').innerText;
      g.panels.close();
      return {
        ueberschrift: text.indexOf('Der letzte Abend') >= 0,
        schluss: text.indexOf('Bleib, so lange du magst') >= 0,
      };
    });
    check('Der letzte Abend steht in den Erinnerungen',
      nachlese.ueberschrift && nachlese.schluss, JSON.stringify(nachlese));

    /* ---- Kleinigkeiten, die den Weg glätten ---- */
    const rad = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.player.levels.can = 1;
      g.selectTool(0);
      const canvas = document.getElementById('game');
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      function raddrehen(dy) {
        canvas.dispatchEvent(new WheelEvent('wheel', {
          deltaY: dy, clientX: x, clientY: y, bubbles: true, cancelable: true,
        }));
      }
      const start = g.player.tool.id;
      raddrehen(120);
      await new Promise((r) => setTimeout(r, 120));
      const vor = g.player.tool.id;
      raddrehen(-120);
      await new Promise((r) => setTimeout(r, 120));
      const zurueck = g.player.tool.id;
      return { start, vor, zurueck };
    });
    check('Das Mausrad wechselt das Werkzeug',
      rad.vor !== rad.start && rad.zurueck === rad.start, JSON.stringify(rad));

    const filter = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.panels.nurFehlend = false;
      g.openPanel('found');
      await new Promise((r) => setTimeout(r, 300));
      const body = document.getElementById('panel-body');
      const alle = body.querySelectorAll('.slot').length;
      const fehlend = body.querySelectorAll('.slot.unknown').length;
      const knopf = Array.from(body.querySelectorAll('.tab'))
        .filter((t) => t.textContent.indexOf('Nur Fehlendes') >= 0)[0];
      if (knopf) knopf.click();
      await new Promise((r) => setTimeout(r, 300));
      const nachher = document.getElementById('panel-body').querySelectorAll('.slot').length;
      g.panels.nurFehlend = false;
      g.panels.close();
      return { alle, fehlend, nachher, knopfDa: !!knopf };
    });
    check('Das Fundbuch kann auf „nur Fehlendes" schalten',
      filter.knopfDa && filter.nachher === filter.fehlend && filter.nachher < filter.alle,
      JSON.stringify(filter));

    // Esc verlässt den Deko-Modus – das konnte es schon, aber niemand hat es
    // je geprüft.
    const escape = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.inventory.add('fence', 1);
      g.startPlacing('fence');
      const imModus = !!g.placing;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return { imModus, danach: !!g.placing };
    });
    check('Esc verlässt den Aufstell-Modus',
      escape.imModus && escape.danach === false, JSON.stringify(escape));

    /* ---- Fundbuch, Post und Truhe ---- */
    // Das Fundbuch muss sagen, WO das Fehlende steckt – „???" allein ist
    // eine Statistik, kein Ziel.
    const buch = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.openPanel('found');
      await new Promise((r) => setTimeout(r, 300));
      const body = document.getElementById('panel-body');
      const text = body.innerText;
      const balken = body.querySelector('.bar i');
      const reiter = Array.from(body.querySelectorAll('.tab')).map((t) => t.textContent.trim());
      // Ein noch nicht gefundenes Stück anklicken: dort muss ein Hinweis stehen
      const leer = Array.from(body.querySelectorAll('.slot.unknown'))[0];
      let hinweis = null;
      if (leer) {
        leer.click();
        await new Promise((r) => setTimeout(r, 250));
        hinweis = document.getElementById('panel-body').innerText;
      }
      g.panels.close();
      return {
        reiterMitZahl: reiter.filter((t) => /\d+\/\d+/.test(t)).length,
        balken: balken ? balken.getBoundingClientRect().width : -1,
        nenntLohn: text.indexOf('Vollständig:') >= 0 || text.indexOf('abgeholt') >= 0,
        hatHinweis: !!(hinweis && hinweis.indexOf('Noch nicht gefunden') >= 0),
        hinweisText: hinweis ? hinweis.slice(0, 200) : '',
      };
    });
    check('Das Fundbuch zeigt je Reihe, wie weit sie ist',
      buch.reiterMitZahl >= 6 && buch.balken >= 0, JSON.stringify(buch.reiterMitZahl));
    check('Es nennt, was die volle Reihe einbringt', buch.nenntLohn, JSON.stringify(buch.nenntLohn));
    check('Ein fehlendes Stück verrät, wo es steckt',
      buch.hatHinweis, JSON.stringify(buch.hinweisText));

    // Eine volle Reihe zahlt – einmal.
    const reihe = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.state.collected = Object.create(null);
      const muenzenVorher = g.state.coins;
      // Alle Saaten ins Fundbuch
      for (const id of ['seed_berry', 'seed_herb', 'seed_flower', 'seed_moon']) {
        g.inventory.found[id] = (g.inventory.found[id] || 0) + 1;
      }
      g._knownCount = -1;
      g._checkCollection();
      const nachher = g.state.coins;
      const abgeholt = !!g.state.collected.seed;
      g._knownCount = -1;
      g._checkCollection();
      return { muenzenVorher, nachher, nochmal: g.state.coins, abgeholt };
    });
    check('Eine volle Reihe im Fundbuch zahlt aus',
      reihe.nachher > reihe.muenzenVorher && reihe.abgeholt, JSON.stringify(reihe));
    check('Und zwar genau einmal', reihe.nochmal === reihe.nachher, JSON.stringify(reihe));

    // Post: Brief lesen bringt die Beilage in die Tasche.
    const post = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.mail = [{
        id: 'testbrief', day: g.day.day, from: 'mira', kind: 'thanks',
        subject: 'Mira Moos', text: 'Auf der Wiese steht heute etwas Neues.',
        gift: { id: 'berry', n: 3 }, read: false,
      }];
      const offenVorher = g.unreadMail();
      const beerenVorher = g.inventory.count('berry');
      g.openPanel('mail');
      await new Promise((r) => setTimeout(r, 300));
      const body = document.getElementById('panel-body');
      const zeile = body.querySelector('.row.letter');
      const warNeu = zeile ? zeile.classList.contains('neu') : false;
      if (zeile) zeile.click();
      await new Promise((r) => setTimeout(r, 300));
      const text = document.getElementById('panel-body').innerText;
      g.panels.close();
      return {
        offenVorher, offenNachher: g.unreadMail(),
        beeren: g.inventory.count('berry') - beerenVorher,
        warNeu, zeigtText: text.indexOf('Wiese') >= 0,
        gabeWeg: !g.state.mail[0].gift,
      };
    });
    check('Ungelesene Post wird gezählt und hervorgehoben',
      post.offenVorher === 1 && post.warNeu, JSON.stringify(post));
    check('Einen Brief lesen zeigt den Text und bringt die Beilage',
      post.zeigtText && post.beeren === 3 && post.offenNachher === 0 && post.gabeWeg,
      JSON.stringify(post));

    /* ---- Der Katalog: bestellen, warten, auspacken ---- */
    const katalog = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.orders = [];
      g.state.mail = [];
      // Die Meilensteine werden nur GELIEHEN: Spätere Prüfungen (Boot,
      // Insel, Wanda) hängen daran, und ein leerer Stand hier hat sie
      // stillschweigend mitgenommen.
      const merkeMeilen = g.state.milestones;
      const merkeMuenzen = g.state.coins;
      g.state.milestones = Object.create(null);      // nur die freie Auswahl
      const frei = g.catalog().filter((e) => e.offen);
      const zu = g.catalog().filter((e) => !e.offen);
      const stueck = frei[0];

      // Zu wenig Münzen: nichts passiert, und es wird nichts abgebucht.
      g.state.coins = stueck.preis - 1;
      const arm = g.orderFromCatalog(stueck.id);
      const armGeld = g.state.coins;

      // Gesperrtes lässt sich auch mit vollem Beutel nicht bestellen.
      g.state.coins = 99999;
      const gesperrt = zu.length ? g.orderFromCatalog(zu[0].id) : null;

      // Jetzt richtig
      const vorherGeld = g.state.coins;
      const ok = g.orderFromCatalog(stueck.id);
      const nachBestellung = {
        offen: g.openOrders().length,
        bezahlt: vorherGeld - g.state.coins,
        imKasten: g.unreadMail(),
      };

      // Höchstens drei gleichzeitig
      const rest = frei.slice(1);
      for (let i = 0; i < rest.length; i++) g.orderFromCatalog(rest[i].id);
      const maxOffen = g.openOrders().length;

      // Der nächste Morgen bringt die Pakete
      const hatte = g.inventory.count(stueck.id);
      g.state.mail = [];
      g._deliverMail(g.day.day + 1, { helped: {} });
      const pakete = (g.state.mail || []).filter((m) => m.kind === 'parcel');
      const nochOffen = g.openOrders().length;

      // Auspacken legt das Stück in die Tasche
      const meins = pakete.filter((m) => m.gift && m.gift.id === stueck.id)[0];
      if (meins) g.openLetter(meins.id);
      const bekommen = g.inventory.count(stueck.id) - hatte;

      // Und dasselbe Paket kommt am Tag darauf nicht noch einmal
      g.state.mail = [];
      g._deliverMail(g.day.day + 2, { helped: {} });
      const nochmal = (g.state.mail || []).filter((m) => m.kind === 'parcel').length;

      g.state.orders = [];
      g.state.mail = [];
      g.state.milestones = merkeMeilen;
      g.state.coins = merkeMuenzen;
      return {
        freie: frei.length, gesperrte: zu.length,
        arm, armGeld, armPreis: stueck.preis - 1,
        gesperrt, ok, nachBestellung, maxOffen,
        pakete: pakete.length, nochOffen, bekommen, nochmal,
        stueck: stueck.id,
      };
    });
    check('Der Katalog zeigt Offenes und Gesperrtes nebeneinander',
      katalog.freie >= 3 && katalog.gesperrte > 0, JSON.stringify(katalog));
    check('Ohne Münzen wird nicht bestellt – und nichts abgebucht',
      katalog.arm === false && katalog.armGeld === katalog.armPreis,
      JSON.stringify(katalog));
    check('Gesperrtes bleibt gesperrt, auch mit vollem Beutel',
      katalog.gesperrt === false, JSON.stringify(katalog));
    check('Bestellen kostet sofort und legt nichts in die Tasche',
      katalog.ok === true && katalog.nachBestellung.offen === 1 &&
      katalog.nachBestellung.bezahlt > 0 && katalog.nachBestellung.imKasten === 0,
      JSON.stringify(katalog.nachBestellung));
    check('Höchstens drei Bestellungen gleichzeitig',
      katalog.maxOffen === 3, JSON.stringify(katalog));
    check('Am nächsten Morgen liegen die Pakete im Kasten',
      katalog.pakete === 3 && katalog.nochOffen === 0, JSON.stringify(katalog));
    check('Ein Paket auspacken bringt genau das Bestellte',
      katalog.bekommen === 1, JSON.stringify(katalog));
    check('Und dasselbe Paket kommt kein zweites Mal',
      katalog.nochmal === 0, JSON.stringify(katalog));

    // Truhe: erst bezahlen, dann einlagern.
    const truhe = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      g.state.loan = { stage: 0, paid: 0 };
      g.storage = null;
      g.syncStorage();
      const vorher = { truheDa: !g.world.storage.gone, plaetze: g.storage.capacity };
      // Sie steht da – aber sie fasst nichts, bevor sie bezahlt ist.
      vorher.nimmtNichts = g.moveToStorage('wood', 1);

      g.state.coins = 100000;
      g.payLoanAmount(999999);           // erste Stufe ganz bezahlen
      const nachher = {
        stufe: g.state.loan.stage,
        truheDa: !g.world.storage.gone,
        plaetze: g.storage.capacity,
        muenzen: g.state.coins,
      };

      g.inventory.add('wood', 5);
      const rein = g.moveToStorage('wood', 3);
      const inTruhe = g.storage.count('wood');
      const raus = g.moveFromStorage('wood', 1);

      g.openPanel('storage');
      await new Promise((r) => setTimeout(r, 300));
      const haelften = document.querySelectorAll('#panel-body .haelfte').length;
      g.panels.close();
      return { vorher, nachher, rein, inTruhe, raus, nachRaus: g.storage.count('wood'), haelften };
    });
    // Sie steht von Anfang an da, wie das vertäute Boot – aber sie fasst
    // nichts, solange niemand für sie bezahlt hat.
    check('Vor dem Ausbau fasst die Truhe nichts',
      truhe.vorher.truheDa === true && truhe.vorher.plaetze === 0 &&
      truhe.vorher.nimmtNichts === 0, JSON.stringify(truhe.vorher));
    check('Bezahlen stellt die Truhe hin und gibt Fächer',
      truhe.nachher.stufe === 1 && truhe.nachher.truheDa && truhe.nachher.plaetze >= 16 &&
      truhe.nachher.muenzen < 100000, JSON.stringify(truhe.nachher));
    check('Dinge wandern in die Truhe und wieder heraus',
      truhe.rein === 3 && truhe.inTruhe === 3 && truhe.raus === 1 && truhe.nachRaus === 2,
      JSON.stringify(truhe));
    check('Das Truhenfenster zeigt Tasche und Truhe nebeneinander',
      truhe.haelften === 2, JSON.stringify(truhe.haelften));

    // Was zurückkommt, hält seinen Platz frei. Ein gefällter Baum ist nicht
    // weg – er steht in drei Tagen wieder da, und ohne diese Regel wuchs er
    // mitten durch die Bank, die man auf seinen Stumpf gestellt hatte.
    const platz = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      // Einen Baum suchen, bei dem WIRKLICH NUR der Baum im Weg ist: Steht
      // eine Bank oder ein Geist daneben, misst die Prüfung deren Abstand
      // statt der Regel. Der Test dafür ist die Regel selbst – ein Baum, den
      // man endgültig entfernt, muss seinen Platz freigeben.
      let baum = null;
      for (const e of g.world.entities) {
        if (e.kind !== 'tree_oak' || e.gone) continue;
        if (!g.world.isUnlocked(g.world.regionAtPixel(e.x, e.y))) continue;
        if (g._canPlaceAt(e.x, e.y)) continue;      // da steht ja der Baum
        e.gone = true;
        e.respawnDay = 0;
        const frei = g._canPlaceAt(e.x, e.y);
        e.gone = false;
        if (frei) { baum = e; break; }
      }
      if (!baum) return { keiner: true };
      const vorher = g._canPlaceAt(baum.x, baum.y);
      baum.gone = true;
      baum.respawnDay = g.day.day + 3;
      const gefaellt = g._canPlaceAt(baum.x, baum.y);
      baum.respawnDay = 0;
      const endgueltig = g._canPlaceAt(baum.x, baum.y);
      const daneben = g._canPlaceAt(baum.x + 130, baum.y + 130);
      baum.gone = false;
      baum.respawnDay = 0;
      return { vorher, gefaellt, endgueltig, daneben };
    });
    check('Auf einem stehenden Baum lässt sich nichts aufstellen',
      platz.vorher === false, JSON.stringify(platz));
    check('Auch nicht auf einem, der zurückkommt',
      platz.gefaellt === false, JSON.stringify(platz));
    check('Endgültig Entferntes gibt seinen Platz aber frei',
      platz.endgueltig === true, JSON.stringify(platz));

    // Die verschlossene Truhe steht da und hält ihren Platz
    const truheZu = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      g.state.loan = { stage: 0, paid: 0 };
      g.storage = null;
      g.syncStorage();
      const e = g.world.storage;
      // Blickrichtung setzen – ohne sie zeigt die Figur dorthin, wo die
      // Prüfung davor sie hingedreht hat, und der Hinweis misst den Zufall.
      g.player.x = e.x;
      g.player.y = e.y + 70;
      g.player.dir = 'up';
      // Der Seed ist je Lauf zufällig. Wächst gerade ein Kraut neben der
      // Truhe, gewinnt es die Zielwahl, und der Hinweis lautet „Sammeln" –
      // die Prüfung maß dann die Insel statt die Truhe. Was hier im Weg
      // steht, wird für die Messung kurz beiseitegeräumt.
      const beiseite = g.world.queryNear(e.x, e.y, 120).filter(function (o) {
        return o !== e && !o.gone;
      });
      for (const o of beiseite) o.gone = true;
      g.target = g.player.findTarget(g.world);
      g._updatePrompt();
      const anvisiert = g.target && g.target.entity === e;
      for (const o of beiseite) o.gone = false;
      const el = document.getElementById('prompt-text');
      const vorher = g.panels.current;
      g.useStation('storage', e);
      return {
        sichtbar: !e.gone,
        anvisiert,
        hinweis: el ? el.textContent : '',
        platzFrei: g._canPlaceAt(e.x, e.y),
        fensterAuf: g.panels.current !== vorher,
      };
    });
    check('Die Truhe steht von Anfang an da, nur verschlossen',
      truheZu.sichtbar && truheZu.anvisiert &&
      truheZu.hinweis === 'Verschlossen' && !truheZu.fensterAuf,
      JSON.stringify(truheZu));
    check('Und ihr Platz bleibt frei von Deko',
      truheZu.platzFrei === false, JSON.stringify(truheZu));

    /* ---- Die Stille Insel ---- */
    // Das Boot ist die einzige Verbindung. Vor dem Meilenstein muss es
    // festliegen, danach übersetzen – und drüben muss man auf Land stehen.
    const insel = await page.evaluate(async () => {
      const g = window.CozyGrove.game;
      const REGION_ISLE = 3;
      g.state.milestones = Object.create(null);
      g._perksChanged();
      g.world.unlocked[REGION_ISLE] = false;

      const boot = g.world.dock;
      // Blickrichtung setzen: Ohne sie hängt die Zielauswahl davon ab, wohin
      // die Figur in der Prüfung davor zuletzt gelaufen ist.
      g.player.x = boot.x;
      g.player.y = boot.y + 60;
      g.player.dir = 'up';

      // Den Steg freimachen, solange gemessen wird.
      //
      // `findTarget` gibt versteckten Aufgabenstücken 90 Punkte Vorsprung –
      // liegt auf dieser Zufallsinsel zufällig eines am Steg, gewinnt es
      // gegen das Boot, und die Prüfung liest den Hinweis für das falsche
      // Ding („Aufheben" statt „Vertäut"). Gemessen an einem Lauf, der
      // genau daran scheiterte.
      //
      // Verschoben statt gelöscht: Die Insel gehört den Prüfungen danach
      // noch, und ein weggeräumtes Aufgabenstück wäre eine Aufgabe, die
      // niemand mehr erfüllen kann.
      const beiseite = [];
      for (const e of g.world.queryNear(boot.x, boot.y, 300)) {
        if (e === boot || e.gone) continue;
        beiseite.push({ e, x: e.x, y: e.y });
        e.x += 4000;
        g.world.reindex(e);
      }
      const zurueckstellen = () => {
        for (const b of beiseite) { b.e.x = b.x; b.e.y = b.y; g.world.reindex(b.e); }
      };

      const vorher = { x: g.player.x, y: g.player.y };
      // Vertäut: ansprechen darf nichts bewirken
      g.useStation('boat', boot);
      await new Promise((r) => setTimeout(r, 200));
      const stehtNoch = Math.abs(g.player.x - vorher.x) < 1 && Math.abs(g.player.y - vorher.y) < 1;

      // Der Hinweis sagt es auch
      g.target = g.player.findTarget(g.world);
      g._updatePrompt();
      const el = document.getElementById('prompt-text');
      const hinweisZu = el ? el.textContent : '';

      // Meilenstein setzen -> Insel auf
      g.state.milestones.insel = g.day.day;
      g._openRegion(REGION_ISLE);
      const offen = g.world.isUnlocked(REGION_ISLE);
      g.target = g.player.findTarget(g.world);
      g._updatePrompt();
      const hinweisAuf = el ? el.textContent : '';
      zurueckstellen();

      // Übersetzen
      g.useStation('boat', boot);
      await new Promise((r) => setTimeout(r, 1600));
      const tx = Math.floor(g.player.x / 64);
      const ty = Math.floor(g.player.y / 64);
      const drueben = {
        x: g.player.x, y: g.player.y,
        aufLand: window.CozyGrove.game.world.canStand(g.player.x, g.player.y),
        region: g.world.regionAtPixel(g.player.x, g.player.y),
        gefroren: g.sleeping,
      };

      // Und zurück
      g.useStation('boat', g.world.isleDock);
      await new Promise((r) => setTimeout(r, 1600));
      const zurueck = {
        region: g.world.regionAtPixel(g.player.x, g.player.y),
        aufLand: g.world.canStand(g.player.x, g.player.y),
      };
      return { stehtNoch, hinweisZu, offen, hinweisAuf, drueben, zurueck };
    });
    check('Vor dem Meilenstein liegt das Boot fest',
      insel.stehtNoch && insel.hinweisZu === 'Vertäut', JSON.stringify(insel));
    check('Danach lädt es zum Übersetzen ein',
      insel.offen && insel.hinweisAuf === 'Übersetzen', JSON.stringify(insel));
    check('Die Überfahrt setzt einen auf der Insel an Land',
      insel.drueben.region === 3 && insel.drueben.aufLand && !insel.drueben.gefroren,
      JSON.stringify(insel.drueben));
    check('Und das Boot drüben bringt einen zurück',
      insel.zurueck.region !== 3 && insel.zurueck.aufLand, JSON.stringify(insel.zurueck));

    // Die offene Insel ist grau – und Wanda färbt ihre Ecke.
    const wanda = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const e = g.world.spiritEntity('wanda');
      const quelle = g.colorField.find('spirit_wanda');
      return {
        da: !!e,
        region: e ? g.world.regionAtPixel(e.x, e.y) : null,
        quelle: !!quelle,
        radius: quelle ? Math.round(quelle.target) : 0,
        auftraege: g.quests.active().filter((q) => q.spirit === 'wanda').length,
      };
    });
    check('Wanda steht auf der Insel und hat ihren Farbkreis',
      wanda.da && wanda.region === 3 && wanda.quelle && wanda.radius > 300,
      JSON.stringify(wanda));
    check('Sie stellt eigene Bitten', wanda.auftraege > 0, JSON.stringify(wanda));

    /* ---- Das Hochland ---- */
    const hochland = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const granit = g.world.entities.filter((e) => e.kind === 'rock_granite' && !e.gone);
      const geode = g.world.entities.filter((e) => e.kind === 'rock_geode' && !e.gone);
      const block = granit[0];
      if (!block) return { fehler: 'kein Granit' };
      g.world.unlocked[3] = true;

      // Mit der Spitzhacke vom ersten Tag geht hier nichts.
      g.player.x = block.x;
      g.player.y = block.y + 56;
      g.player.dir = 'up';
      g.player.selectTool(2);                 // 0 Hand, 1 Axt, 2 Spitzhacke
      // Im Hochland steht viel dicht beieinander. Ohne Freiräumen gewann mal
      // der Nachbarstein die Zielwahl, und die Prüfung maß den Zufall.
      const beiseite = g.world.queryNear(block.x, block.y, 220).filter(function (o) {
        return o !== block && !o.gone;
      });
      for (const o of beiseite) o.gone = true;
      const vorher = block.hp;

      function schlagen(stufe) {
        g.player.levels.pickaxe = stufe;
        const t = g.player.findTarget(g.world);
        if (!t || t.entity !== block) return 'nicht anvisiert';
        g.target = t;
        g.onInteract();
        return null;
      }
      const schwachGrund = schlagen(1);
      const schwachWirkung = vorher - block.hp;
      const starkGrund = schlagen(3);
      const starkWirkung = vorher - block.hp;

      const stein = g.inventory.count('granite');
      // Und ganz durch: Granit muss auch wirklich Granit hergeben
      for (let i = 0; i < 12 && !block.gone; i++) {
        const t = g.player.findTarget(g.world);
        if (!t || t.entity !== block) break;
        g.target = t;
        g.onInteract();
      }
      for (const o of beiseite) o.gone = false;
      return {
        granit: granit.length, geoden: geode.length,
        schwachWirkung, starkWirkung, schwachGrund, starkGrund,
        ausbeute: g.inventory.count('granite') - stein,
      };
    });
    check('Im Hochland stehen Granit und Geoden',
      hochland.granit > 8 && hochland.geoden > 0, JSON.stringify(hochland));
    check('Granit gibt erst ab Spitzhacke Stufe 3 nach',
      hochland.schwachWirkung === 0 && hochland.starkWirkung > 0,
      JSON.stringify(hochland));
    check('Und bringt dann Granit, den es sonst nirgends gibt',
      hochland.ausbeute > 0, JSON.stringify(hochland));

    // Die Nummern der Objekte werden beim Erzeugen der Welt vergeben. Kommt
    // in einer neueren Fassung etwas dazu, verschieben sie sich – ein alter
    // Spielstand darf dann nicht den falschen Baum verschwinden lassen.
    const versatz = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      const baum = g.world.entities.filter(
        (e) => e.kind && e.kind.indexOf('tree_') === 0 && !e.gone)[0];
      if (!baum) return { fehler: 'kein Baum' };
      // Ausdrücklich setzen: Ein frisches Objekt hat gar kein `gone`, und ein
      // Vergleich gegen `false` schlug dann an `undefined` fehl.
      baum.gone = false;
      // Ein Eintrag, der auf diese Nummer zeigt, aber eine andere Art nennt
      g._applyWorldDelta({ changed: [{ id: baum.id, k: 'rock_big', g: 1, o: null, r: 0 }] });
      const fremdeArt = baum.gone;
      // Und einer mit der richtigen Art
      g._applyWorldDelta({ changed: [{ id: baum.id, k: baum.kind, g: 1, o: null, r: 0 }] });
      const eigeneArt = baum.gone;
      baum.gone = false;
      return { fremdeArt, eigeneArt };
    });
    check('Ein Eintrag mit falscher Art lässt das Objekt stehen',
      versatz.fremdeArt === false && versatz.eigeneArt === true,
      JSON.stringify(versatz));

    // Ein Spielstand von VOR den Meilensteinen und der Gießkanne muss laufen,
    // ohne dass jemand etwas verliert. Das ist die eine Prüfung, an der ein
    // gespieltes Spiel hängt: Wer drei Wochen gesammelt hat, darf durch ein
    // neues Feld nicht bei null landen. Absichtlich über den echten Weg –
    // schreiben, neu laden, weiterspielen –, nicht über einen Abkürzungsaufruf.
    const altGeschrieben = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      // Tiefe Kopie: `toJSON` gibt lebende Verweise heraus, ein `delete`
      // darauf würde dem laufenden Spiel die Felder wegnehmen.
      const daten = JSON.parse(JSON.stringify(g.toJSON()));
      delete daten.state.milestones;
      delete daten.player.levels.can;
      daten.state.coins = 4242;
      daten.state.bagUpgrades = 1;
      daten.day.day = 21;
      // Farbe wie nach ein paar Wochen Spiel: groß genug für Meilensteine.
      const c = daten.color.filter((s) => s.k === 'campfire')[0];
      if (c) { c.r = 1500; c.t = 1500; }
      g.frozen = true;
      // Unter der ALTEN Adresse, aus der Zeit, als das Spiel anders hieß.
      // Damit prüft dieser Abschnitt zwei Dinge auf einmal: dass ein
      // Spielstand ohne die neuen Felder lädt – und dass er dabei auf die
      // heutige Adresse umzieht.
      window.localStorage.removeItem('seli-grove:save:v1');
      window.localStorage.setItem('cozy-grove:save:v1', JSON.stringify(daten));
      return { geschrieben: true, farbeVorher: c ? c.r : 0 };
    });
    check('Alter Spielstand liegt bereit', altGeschrieben.geschrieben);

    await page.reload({ waitUntil: 'load' });
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.ready), 60000, 'Grafik nach altem Stand');
    await page.waitForSelector('#btn-continue', { state: 'visible' });
    await page.click('#btn-continue');
    await waitFor(page, () => !!(window.CozyGrove && window.CozyGrove.game), 20000, 'Spiel nach altem Stand');
    // Meilensteine werden einmal je Sekunde geprüft – kurz Zeit geben.
    await page.waitForTimeout(2200);

    const alt = await page.evaluate(() => {
      const g = window.CozyGrove.game;
      return {
        muenzen: g.state.coins,
        tag: g.day.day,
        taschen: g.state.bagUpgrades,
        kanne: g.player.levels.can,
        werkzeug: g.player.tool.id,
        inLeiste: Array.from(document.querySelectorAll('#toolbelt .tool')).filter((b) => !b.hidden).length,
        farbe: Math.round(g.colorField.coverage(g.world) * 100),
        meilensteine: Object.keys(g.state.milestones || {}).length,
        verkauf: g.perks().sell,
        neueAdresse: !!window.localStorage.getItem('seli-grove:save:v1'),
        alteAdresse: !!window.localStorage.getItem('cozy-grove:save:v1'),
      };
    });
    check('Der Stand zieht dabei auf die heutige Adresse um',
      alt.neueAdresse === true && alt.alteAdresse === false, JSON.stringify(alt));
    // Mehr Münzen als gespeichert sind in Ordnung und sogar gewollt: die
    // nachgeholten Meilensteine zahlen ihre Beigabe aus. Weniger wäre der
    // Fehler, den diese Prüfung sucht.
    check('Ein Spielstand ohne die neuen Felder lädt vollständig',
      alt.muenzen >= 4242 && alt.tag === 21 && alt.taschen === 1, JSON.stringify(alt));
    check('Die Gießkanne fehlt darin, statt kaputt zu sein',
      alt.kanne === 0 && alt.werkzeug !== 'can' && alt.inLeiste === 6, JSON.stringify(alt));
    check('Ein alter Stand holt seine Meilensteine nach',
      alt.farbe >= 10 && alt.meilensteine >= 1, JSON.stringify(alt));
    check('Und ihre Wirkung gilt danach auch für ihn',
      alt.meilensteine < 5 || alt.verkauf > 1, JSON.stringify(alt));
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
