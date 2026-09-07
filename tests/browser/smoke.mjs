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
      // Geprüft wird das Objekt, das findTarget WIRKLICH wählt. Vorher stand
      // hier ein selbst herausgesuchter Baum, und auf mancher Zufallsinsel lag
      // ein anderes Objekt näher – dann schlug der Test ins Leere.
      const t = g.player.findTarget(g.world);
      if (!t) return { ok: false, why: 'nichts anvisierbar' };
      const ziel = t.entity;
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
        if (k.indexOf('cozy-grove:save') === 0) localStorage.removeItem(k);
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
      return { tag: g.day.day, muenzen: g.state.coins, gespeichert: !!localStorage.getItem('cozy-grove:save:v1') };
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
      };
    });
    check('Aufgabenfenster nennt Jahreszeit und Tagesereignis',
      tagesZeile.jahreszeit && tagesZeile.ereignis, JSON.stringify(tagesZeile));

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
      const baum = g.world.entities.find((e) => e.kind === 'tree_birch' && !e.gone);
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
      const geist = g.world.entities.find((e) => e.kind === 'spirit' &&
        g.world.isUnlocked(e.region));
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
      const warten = () => new Promise((r) => setTimeout(r, 420));

      g.colorField.sources.length = 0;
      g.colorField.sources.push({ x: px, y: py, r: 520, target: 520, key: 'gross' });
      g.colorField.markDirty();
      await warten();
      const alleine = deckung(px + 300, py);

      // Zweite, kleine Quelle dazu – wie ein Gemütlichkeitskreis neben einem
      // Geist. Der Messpunkt liegt weit außerhalb von ihr.
      g.colorField.sources.push({ x: px - 60, y: py, r: 150, target: 150, key: 'klein' });
      g.colorField.markDirty();
      await warten();
      const zuZweit = deckung(px + 300, py);

      g.colorField.sources.length = 0;
      for (const s of gemerkt) g.colorField.sources.push(s);
      g.colorField.markDirty();
      await warten();
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
      if (!ziel) return { keinPlatz: true };
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
      return {
        anteilGeaendert: Math.round(geaendert / n * 100),
        mittlereAenderung: Math.round(summe / n),
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
      function warm(wx, wy, r) {
        const R = g.renderer;
        const sx = Math.round((wx - g.camera.ox) * R.zoom);
        const sy = Math.round((wy - g.camera.oy) * R.zoom);
        const d = R.ctx.getImageData(sx - r, sy - r, r * 2, r * 2).data;
        let n = 0; let treffer = 0;
        for (let i = 0; i < d.length; i += 4) {
          n++;
          if (d[i] - d[i + 2] > 34) treffer++;
        }
        return Math.round(treffer / n * 100);
      }
      // Gemessen wird DIESELBE Stelle einmal ohne und einmal mit Fundstück.
      // Ein zweiter Ort als Vergleich taugt nicht: Herbstbäume, Sand und das
      // Lagerfeuer sind auch warm, und je nach Zufallsinsel liegt dort mehr
      // Farbe als beim Fundstück.
      //
      // Das Kästchen reicht von der Kachel bis über die Baumkronen (y-132),
      // denn dort schwebt das Flämmchen – der Teil, der immer zu sehen ist.
      e.gone = true;
      await new Promise((r) => setTimeout(r, 500));
      const ohne = warm(e.x, e.y - 80, 70);
      e.gone = false;
      await new Promise((r) => setTimeout(r, 500));
      const mit = warm(e.x, e.y - 80, 70);
      return { ohne: ohne, mit: mit };
    });
    check('Fundstück ist im Bild zu erkennen',
      !fund.keins && fund.mit >= fund.ohne + 5, JSON.stringify(fund));

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
