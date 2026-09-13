/**
 * Wunschplätze – das Spiel nach dem Spiel.
 *
 * Bei hundert Prozent ist die Insel bunt und alle Meilensteine sind erreicht.
 * Danach lief nur der Tagesbetrieb weiter: dieselben Bitten, dieselbe Runde.
 * Die Wünsche sind das, was nicht aufhört – die Geister hören auf, Farbe zu
 * brauchen, und fangen an, sich Orte zu wünschen.
 *
 * Weil ein Wunsch aus Bausteinen zusammengesetzt wird statt geschrieben zu
 * sein, gilt hier dieselbe Gefahr wie damals bei der Feder, nur schlimmer:
 * Eine einzige unerfüllbare Kombination taucht irgendwann bei jedem auf und
 * bleibt dann für immer stehen. Deshalb prüft dieser Test JEDE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SORTEN, SORT_IDS, ORTE, ORT_IDS, ZUGABEN, ZUGAB_IDS, MAX_OFFEN,
  WUNSCH_MEILENSTEIN, ZUGABE_RADIUS,
  wunschBauen, pruefeWunsch, wunschLohn, wunschText, wunschTitel, wunschIcon,
  orteFuer, emptyWishes, wunschHier, wunschSorteHier, GEDULD_TAGE,
  forderungFuer, forderung, wunschKey, merken, GEDAECHTNIS, rangFuer,
  bisZumNaechstenRang, RAENGE, DAZU_AB,
} from '../../src/game/wishes.js';
import { World, TILE_SIZE } from '../../src/world/world.js';
import { isWalkable } from '../../src/art/tiles.js';
import { MAP_W, MAP_H } from '../../src/world/worldgen.js';
import { getItem, CAT, ITEM_LIST } from '../../src/game/items.js';
import { MILESTONES } from '../../src/game/milestones.js';
import { makeRng } from '../../src/core/rng.js';
import { RECIPES } from '../../src/game/recipes.js';
import { SPIRITS, SPIRIT_IDS } from '../../src/game/spirits.js';

const SEED = 4711;

function offeneWelt() {
  const welt = new World(SEED).populate();
  for (let r = 1; r <= 3; r++) welt.unlockRegion(r);
  return welt;
}

const WELT = offeneWelt();

/**
 * Eine begehbare Kachel, die diesen Ort erfüllt – oder null.
 *
 * `w` ist der Wunsch: Manche Orte hängen am Geist, der ihn äußert („bei
 * Mira"), und wissen ohne ihn nicht, wo sie sind.
 */
function stelleFuer(welt, ortId, w) {
  const ort = ORTE[ortId];
  const wunsch = w || { spirit: SPIRIT_IDS[0] };
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const x = (tx + 0.5) * TILE_SIZE;
      const y = (ty + 0.5) * TILE_SIZE;
      if (!isWalkable(welt.tileAtTile(tx, ty))) continue;
      if (!ort.test(welt, x, y, wunsch)) continue;
      return { x: x, y: y };
    }
  }
  return null;
}

/**
 * Eine Stelle, die den einen Ort erfüllt und den anderen NICHT.
 *
 * Nötig, weil die Orte sich überlappen: Die erste begehbare Waldkachel der
 * Karte liegt an der Küste und erfüllt „am Wasser" gleich mit. Wer die
 * Trennung prüfen will, muss eine Stelle suchen, an der wirklich nur eines
 * von beiden gilt.
 */
function stelleNur(welt, jaId, neinId) {
  const ja = ORTE[jaId];
  const nein = ORTE[neinId];
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const x = (tx + 0.5) * TILE_SIZE;
      const y = (ty + 0.5) * TILE_SIZE;
      if (!isWalkable(welt.tileAtTile(tx, ty))) continue;
      const probe = { spirit: SPIRIT_IDS[0] };
      if (!ja.test(welt, x, y, probe) || nein.test(welt, x, y, probe)) continue;
      return { x: x, y: y };
    }
  }
  return null;
}

/** Deko hinstellen, ohne das Spiel zu bemühen. */
function stellHin(welt, itemId, x, y, nr) {
  return welt.add({
    id: 800000 + nr, kind: 'decor', itemId: itemId, x: x, y: y, sprite: itemId,
  });
}

/* ---------------- Die Bausteine ---------------- */

test('Jede Sorte besteht aus Deko, die es wirklich gibt', () => {
  // Ein Tippfehler hier wäre ein Wunsch, den man mit nichts erfüllen kann.
  for (const id of SORT_IDS) {
    const s = SORTEN[id];
    assert.ok(s.items.length >= 3, id + ': zu wenig Auswahl – das ist eine Einkaufsliste');
    for (const it of s.items) {
      const item = getItem(it);
      assert.ok(item, id + ': „' + it + '" gibt es nicht');
      assert.equal(item.cat, CAT.DECOR, id + ': ' + it + ' ist keine Deko');
      assert.ok(item.prop, id + ': ' + it + ' lässt sich nicht aufstellen');
    }
  }
});

test('Jede Sorte hat genug Auswahl, dass die Entscheidung eine bleibt', () => {
  // Der Grund für diese Prüfung, nachgerechnet: Bei vier Möglichkeiten und
  // zwölf Wünschen nach „einem Platz zum Sitzen" stellt man dreimal
  // dieselbe Bank hin. Ein Wunsch ist aber eine ENTSCHEIDUNG, kein Auftrag –
  // und eine Entscheidung braucht Möglichkeiten, die man noch nicht benutzt
  // hat. Fünf je Sorte sind das Minimum, unter dem es kippt.
  for (const id of SORT_IDS) {
    assert.ok(SORTEN[id].items.length >= 5,
      id + ' hat nur ' + SORTEN[id].items.length + ' Stücke');
  }
  // Und insgesamt so viel, dass man nicht ständig dasselbe aufstellt.
  const gesamt = SORT_IDS.reduce((n, id) => n + SORTEN[id].items.length, 0);
  assert.ok(gesamt >= 34, 'nur ' + gesamt + ' Stücke tragen alle Wünsche');
});

// Dass kein Stück in zwei Sorten steht, prüft weiter unten schon „Jede
// aufstellbare Deko kommt in höchstens einer Sorte vor". Zweimal dieselbe
// Regel wären zwei Stellen, an denen sie beim nächsten Mal geändert werden
// müsste – und eine davon vergäße man.

test('Der Meilenstein, ab dem gewünscht wird, existiert', () => {
  assert.ok(MILESTONES.some((m) => m.id === WUNSCH_MEILENSTEIN),
    WUNSCH_MEILENSTEIN + ' ist kein Meilenstein');
});

test('Jeder Ort kommt auf der Karte oft genug vor', () => {
  // Ein Ort mit drei passenden Kacheln wäre eine Schnitzeljagd, kein Wunsch.
  for (const id of ORT_IDS) {
    let n = 0;
    for (let ty = 2; ty < MAP_H - 2; ty += 2) {
      for (let tx = 2; tx < MAP_W - 2; tx += 2) {
        const x = (tx + 0.5) * TILE_SIZE;
        const y = (ty + 0.5) * TILE_SIZE;
        if (!isWalkable(WELT.tileAtTile(tx, ty))) continue;
        if (ORTE[id].test(WELT, x, y, { spirit: SPIRIT_IDS[0] })) n++;
      }
    }
    assert.ok(n >= 20, id + ': nur ' + n + ' passende Stellen auf der ganzen Karte');
  }
});

/* ---------------- Erfüllbarkeit ---------------- */

test('JEDE Kombination aus Sorte und Ort lässt sich erfüllen', () => {
  // Der wichtigste Test der Datei. Eine unerfüllbare Kombination taucht bei
  // jedem Spieler irgendwann auf und bleibt dann für immer stehen – dieselbe
  // Falle wie die Feder ohne Quelle, nur dass sie sich selbst nachlegt.
  let nr = 0;
  for (const sorte of SORT_IDS) {
    for (const ort of ORT_IDS) {
      const welt = offeneWelt();
      // Ortsgebundene Wünsche einmal je Geist durchprüfen – „bei Mira" und
      // „bei Bruno" sind zwei verschiedene Plätze.
      const geister = ORTE[ort].nameFuer ? SPIRIT_IDS : [SPIRIT_IDS[0]];
      for (const sid of geister) {
        const w = { sorte: sorte, ort: ort, spirit: sid, zugabe: 'keine', satz: 0 };
        const stelle = stelleFuer(welt, ort, w);
        assert.ok(stelle, ort + '/' + sid + ': keine einzige passende Stelle');
        // Ein einzelnes Stück der Sorte genügt für einen Wunsch ohne Zugabe.
        stellHin(welt, SORTEN[sorte].items[0], stelle.x, stelle.y, nr++);
        assert.equal(pruefeWunsch(w, welt).erfuellt, true,
          sorte + ' ' + ort + '/' + sid + ': mit passender Deko am passenden Ort nicht erfüllt');
      }
    }
  }
});

test('Auch die Zugaben lassen sich erfüllen', () => {
  let nr = 5000;
  for (const zugabe of ZUGAB_IDS) {
    const z = ZUGABEN[zugabe];
    const welt = offeneWelt();
    const stelle = stelleFuer(welt, 'wald');
    // Genug Stücke derselben Sorte, und genug Charme drumherum.
    const sorte = SORTEN.sitz;
    for (let i = 0; i < Math.max(3, z.stueck); i++) {
      stellHin(welt, sorte.items[i % sorte.items.length],
        stelle.x + i * 30, stelle.y, nr++);
    }
    // Charme auffüllen, falls die Zugabe ihn verlangt
    for (let i = 0; i < 6; i++) {
      stellHin(welt, 'moonlamp', stelle.x + 20, stelle.y + 20 + i * 10, nr++);
    }
    // Verlangt die Zugabe eine zweite Sorte, muss auch die dastehen.
    stellHin(welt, SORTEN.licht.items[0], stelle.x + 40, stelle.y + 20, nr++);
    const w = {
      sorte: 'sitz', ort: 'wald', spirit: SPIRIT_IDS[0], zugabe: zugabe,
      dazu: 'licht', satz: 0, forderung: forderungFuer(zugabe, 0),
    };
    assert.equal(pruefeWunsch(w, welt).erfuellt, true, zugabe + ': nicht erfüllbar');
  }
});

test('Falsche Sorte oder falscher Ort erfüllt nichts', () => {
  // Die Gegenprobe. Ohne sie prüfte der Test darüber nur, dass die Funktion
  // manchmal `true` sagt.
  const welt = offeneWelt();
  const imWald = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', imWald.x, imWald.y, 9001);

  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'keine' }, welt).erfuellt,
    true, 'die Bank im Wald erfüllt den Sitzwunsch im Wald');
  assert.equal(pruefeWunsch({ sorte: 'licht', ort: 'wald', zugabe: 'keine' }, welt).erfuellt,
    false, 'eine Bank ist kein Licht');
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'klippen', zugabe: 'keine' }, welt).erfuellt,
    false, 'die Bank steht im Wald, nicht auf den Klippen');
});

test('Eine Zugabe verlangt wirklich mehr', () => {
  const welt = offeneWelt();
  const stelle = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', stelle.x, stelle.y, 9100);
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'keine' }, welt).erfuellt, true);
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'mehrere' }, welt).erfuellt,
    false, 'eine einzelne Bank darf „nicht nur eins" nicht erfüllen');
  assert.equal(pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'gemuetlich' }, welt).erfuellt,
    false, 'eine einzelne Bank ist nicht „ringsum gemütlich"');
});

test('Entfernte Deko zählt nicht zur Nachbarschaft', () => {
  // Knapp außerhalb, nicht weit weg: `queryNear` arbeitet auf einem Raster
  // von 160 Pixeln und liefert bei Reichweite 260 gemessen auch noch Dinge
  // in 280 und 320 Pixeln Entfernung. Die genaue Abstandsprüfung dahinter
  // ist also keine Zierde – mit Kandidaten in doppelter Entfernung hätte
  // dieser Test sie gar nicht bemerkt.
  const welt = offeneWelt();
  const stelle = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', stelle.x, stelle.y, 9200);
  // Auf VERSCHIEDENE Seiten: Nebeneinander wären die beiden füreinander in
  // Reichweite und zählten sich gegenseitig – dann stünde dort ja auch
  // wirklich ein Platz, nur eben nicht bei der Bank.
  stellHin(welt, 'chair', stelle.x + ZUGABE_RADIUS + 20, stelle.y, 9201);
  stellHin(welt, 'hammock', stelle.x - ZUGABE_RADIUS - 20, stelle.y, 9202);
  const stand = pruefeWunsch({ sorte: 'sitz', ort: 'wald', zugabe: 'mehrere' }, welt);
  assert.equal(stand.erfuellt, false,
    'drei Sitzgelegenheiten außer Reichweite sind kein gemeinsamer Platz');
  assert.equal(stand.stueck, 1, 'keine steht mit einer anderen beieinander');
});

test('Der Fortschritt sagt, wie weit es noch ist', () => {
  // Ohne Rückmeldung wäre ein Wunsch Raten. Die Zahl muss also steigen,
  // wenn man etwas danebenstellt.
  const welt = offeneWelt();
  const stelle = stelleFuer(welt, 'wald');
  stellHin(welt, 'bench', stelle.x, stelle.y, 9300);
  const w = { sorte: 'sitz', ort: 'wald', zugabe: 'gemuetlich' };
  const vorher = pruefeWunsch(w, welt).charme;
  stellHin(welt, 'moonlamp', stelle.x + 40, stelle.y, 9301);
  const nachher = pruefeWunsch(w, welt).charme;
  assert.ok(nachher > vorher, 'die Gemütlichkeit muss steigen (' + vorher + ' → ' + nachher + ')');
});

/* ---------------- Nachschub ---------------- */

test('Wünsche wiederholen sich nicht innerhalb der offenen Liste', () => {
  const rng = makeRng(99);
  const belegt = Object.create(null);
  const gebaut = [];
  for (let i = 0; i < MAX_OFFEN; i++) {
    const w = wunschBauen(WELT, 'mira', 10, rng, belegt);
    assert.ok(w, 'kein Wunsch gebaut');
    const key = w.sorte + ':' + w.ort;
    assert.ok(!belegt[key], 'derselbe Wunsch zweimal offen: ' + key);
    belegt[key] = 1;
    gebaut.push(key);
  }
  assert.equal(new Set(gebaut).size, MAX_OFFEN);
});

test('Drei Wünsche kommen von drei verschiedenen Geistern', () => {
  // Sonst redet einer viel und die anderen sechs gar nicht. Nachgebaut wird
  // hier die Auswahl aus `_wuenscheNachfuellen`: erst die, die noch keinen
  // offenen Wunsch haben.
  const alle = SPIRIT_IDS.filter((id) => WELT.isUnlocked(SPIRITS[id].region));
  assert.ok(alle.length >= MAX_OFFEN, 'zu wenige Geister – Test prüft nichts');
  for (let runde = 0; runde < 50; runde++) {
    const rng = makeRng(runde * 31 + 7);
    const offen = [];
    const belegt = Object.create(null);
    const frei = alle.slice();
    const rest = [];
    while (offen.length < MAX_OFFEN) {
      const topf = frei.length ? frei : rest;
      const sid = topf[Math.floor(rng() * topf.length)];
      const w = wunschBauen(WELT, sid, 10, rng, belegt);
      if (!w) break;
      belegt[w.sorte + ':' + w.ort] = 1;
      const k = frei.indexOf(sid);
      if (k >= 0) { frei.splice(k, 1); rest.push(sid); }
      offen.push(w);
    }
    const wer = new Set(offen.map((w) => w.spirit));
    assert.equal(wer.size, offen.length,
      'Runde ' + runde + ': zwei Wünsche vom selben Geist');
  }
});

test('Die Geduld ist lang, aber nicht unendlich', () => {
  // Wünsche laufen bewusst nicht ab – ein Ort ist keine Bitte mit Frist.
  // Aber ohne jede Bewegung wären drei Wünsche, die einem nicht liegen, für
  // immer die einzigen drei: Die Liste füllt ja nur auf.
  assert.ok(GEDULD_TAGE >= 8, 'kürzer als eine Woche wäre eine Frist');
  assert.ok(GEDULD_TAGE <= 30, 'länger als ein Monat merkt niemand');
});

test('Sie gehen nicht aus', () => {
  // Der ganze Sinn: Nach hundert erfüllten Wünschen muss noch einer kommen.
  const rng = makeRng(5);
  const gesehen = new Set();
  for (let i = 0; i < 400; i++) {
    const w = wunschBauen(WELT, 'mira', 10 + i, rng, null);
    assert.ok(w, 'nach ' + i + ' Wünschen kam keiner mehr');
    gesehen.add(w.sorte + ':' + w.ort + ':' + w.zugabe);
  }
  assert.ok(gesehen.size > 60,
    'nur ' + gesehen.size + ' verschiedene Wünsche – das wiederholt sich zu schnell');
});

test('Das Gedächtnis hält die Wiederholung auf Abstand', () => {
  // Die Zahl, an der „gefühlt endlos" hängt. Gemessen ohne Gedächtnis kam
  // die erste Wiederholung im Median beim ELFTEN Wunsch, im schlechtesten
  // Fall beim vierten – nichts wirkt schneller ausgelutscht als dieselbe
  // Bitte, die man vorgestern erfüllt hat.
  const erste = [];
  for (let lauf = 0; lauf < 60; lauf++) {
    const rng = makeRng(lauf * 911 + 3);
    let letzte = [];
    const gesehen = [];
    let wdh = null;
    for (let i = 0; i < 60; i++) {
      const belegt = Object.create(null);
      for (const k of letzte) belegt[k] = 1;
      const w = wunschBauen(WELT, 'mira', 10 + i, rng, belegt, i);
      const key = wunschKey(w);
      if (gesehen.indexOf(key) >= 0 && wdh === null) wdh = i + 1;
      gesehen.push(key);
      letzte = merken(letzte, w);
    }
    if (wdh) erste.push(wdh);
  }
  erste.sort((a, b) => a - b);
  const median = erste[Math.floor(erste.length / 2)];
  assert.ok(median >= 16,
    'erste Wiederholung schon beim ' + median + '. Wunsch – das fühlt sich nicht endlos an');
  assert.ok(erste[0] >= 10, 'im schlechtesten Fall beim ' + erste[0] + '. Wunsch');
});

test('Das Gedächtnis vergisst irgendwann – sonst gingen die Wünsche aus', () => {
  const liste = [];
  let l = liste;
  for (let i = 0; i < GEDAECHTNIS * 3; i++) {
    l = merken(l, { sorte: 'sitz', ort: 'wasser', spirit: 's' + i });
  }
  assert.equal(l.length, GEDAECHTNIS, 'die Liste muss eine feste Länge haben');
});

test('Derselbe Platz bei zwei Geistern sind zwei Wünsche', () => {
  // „Ein Platz zum Sitzen bei Mira" und derselbe bei Bruno liegen auf zwei
  // Seiten der Insel. Über einen Kamm geschoren würde das Gedächtnis die
  // halbe Abwechslung wegsperren, die der Ort gerade erst gebracht hat.
  const a = wunschKey({ sorte: 'sitz', ort: 'beiMir', spirit: 'mira' });
  const b = wunschKey({ sorte: 'sitz', ort: 'beiMir', spirit: 'bruno' });
  assert.notEqual(a, b, 'zwei Geister, zwei Schlüssel');
  // Bei ortsfesten Wünschen dagegen ist der Geist egal – „am Wasser" ist
  // „am Wasser", egal wer fragt.
  assert.equal(wunschKey({ sorte: 'sitz', ort: 'wasser', spirit: 'mira' }),
    wunschKey({ sorte: 'sitz', ort: 'wasser', spirit: 'bruno' }));
});

test('Es gibt genug wirklich verschiedene Wünsche', () => {
  let n = 0;
  for (const s of SORT_IDS) {
    for (const o of ORT_IDS) n += ORTE[o].nameFuer ? SPIRIT_IDS.length : 1;
  }
  assert.ok(n >= 80, 'nur ' + n + ' unterscheidbare Wünsche – zu wenig für dauerhaft');
  assert.ok(n * ZUGAB_IDS.length >= 300, 'mit den Zugaben müssen es hunderte sein');
});

test('Die Ansprüche wachsen – flach und gedeckelt', () => {
  // Sonst ist der fünfzigste Wunsch dieselbe Handbewegung wie der erste.
  // Aber auch nicht so, dass irgendwann eine halbe Insel voll Deko nötig ist.
  const frueh = forderungFuer('gemuetlich', 0);
  const spaet = forderungFuer('gemuetlich', 40);
  const sehrSpaet = forderungFuer('gemuetlich', 400);
  assert.ok(spaet.charme > frueh.charme * 1.5, 'nach 40 Wünschen muss mehr verlangt werden');
  assert.equal(sehrSpaet.charme, forderungFuer('gemuetlich', 200).charme, 'gedeckelt');
  assert.ok(sehrSpaet.charme <= 40, 'mehr als 40 Charme ist eine halbe Insel');

  const stueckFrueh = forderungFuer('mehrere', 0).stueck;
  const stueckSpaet = forderungFuer('mehrere', 400).stueck;
  assert.ok(stueckSpaet > stueckFrueh, 'auch die Stückzahl wächst');
  assert.ok(stueckSpaet <= 6, 'aber nicht ins Unermessliche');
  // Ohne Zugabe bleibt es ein einzelnes Stück, für immer.
  assert.equal(forderungFuer('keine', 400).stueck, 1);
  assert.equal(forderungFuer('keine', 400).charme, 0);
});

test('Ein Wunsch behält seine Forderung, wenn man ihn liegen lässt', () => {
  // Sonst würde er hinter dem Rücken teurer – eine Strafe fürs Nachdenken.
  const w = wunschBauen(WELT, 'mira', 10, makeRng(4), null, 0);
  assert.ok(w.forderung, 'die Forderung muss im Wunsch stehen');
  assert.deepEqual(forderung(w), w.forderung);
  // Und ein alter Spielstand ohne das Feld fällt sauber auf die Tabelle
  // zurück, statt undefined durchzureichen.
  const alt = { sorte: 'sitz', ort: 'wald', zugabe: 'gemuetlich' };
  assert.ok(forderung(alt).charme > 0, 'Rückfall auf die Grundwerte');
});

test('Die zweite Sorte kommt erst später – und ist nie dieselbe', () => {
  const rng = makeRng(11);
  let frueh = 0;
  for (let i = 0; i < 300; i++) {
    if (wunschBauen(WELT, 'mira', 10, rng, null, 0).zugabe === 'dazu') frueh++;
  }
  assert.equal(frueh, 0, 'vor ' + DAZU_AB + ' erfüllten Wünschen darf sie nicht kommen');

  let spaet = 0;
  for (let i = 0; i < 300; i++) {
    const w = wunschBauen(WELT, 'mira', 10, rng, null, DAZU_AB + 5);
    if (w.zugabe !== 'dazu') continue;
    spaet++;
    assert.ok(w.dazu, 'ohne zweite Sorte wäre der Wunsch unerfüllbar');
    assert.notEqual(w.dazu, w.sorte, '„ein Sitzplatz, und ein Sitzplatz dabei" ist ein Tippfehler');
    const t = wunschText(w);
    assert.ok(t.indexOf('$DAZU') < 0, 'Platzhalter stehen geblieben: ' + t);
    assert.ok(t.indexOf(SORTEN[w.dazu].name) >= 0, 'die zweite Sorte steht nicht im Satz');
  }
  assert.ok(spaet > 10, 'später muss sie oft genug vorkommen (' + spaet + ')');
});

test('Der Rang wächst mit und endet nicht in einer Rangliste', () => {
  assert.equal(rangFuer(0).name, RAENGE[0].name);
  let letzter = '';
  for (const r of RAENGE) {
    assert.ok(r.name.length > 4, 'ein Rang braucht ein Wort');
    assert.notEqual(r.name, letzter, 'zwei gleiche Ränge');
    letzter = r.name;
    assert.equal(rangFuer(r.ab).name, r.name);
  }
  assert.equal(rangFuer(99999).name, RAENGE[RAENGE.length - 1].name);
  assert.ok(bisZumNaechstenRang(0) > 0, 'am Anfang gibt es ein nächstes Wort');
  assert.equal(bisZumNaechstenRang(99999), null, 'ganz oben steht keine Zahl mehr');
});

test('Gesperrte Bereiche kommen nicht vor', () => {
  // Dieselbe Regel wie bei den Tagesbitten: kein Wunsch nach den Klippen,
  // bevor die Brücke steht.
  const zu = new World(SEED).populate();
  const offen = orteFuer(zu);
  assert.ok(offen.indexOf('wald') < 0, 'der Wald ist noch zu');
  assert.ok(offen.indexOf('klippen') < 0, 'die Klippen sind noch zu');
  assert.ok(offen.indexOf('lager') >= 0, 'das Lager ist von Anfang an offen');
  assert.ok(offen.length >= 3, 'am Anfang muss es trotzdem Wünsche geben können');

  const rng = makeRng(3);
  for (let i = 0; i < 60; i++) {
    const w = wunschBauen(zu, 'flamey', 5, rng, null);
    assert.ok(offen.indexOf(w.ort) >= 0, w.ort + ' ist gesperrt und wurde trotzdem gewünscht');
  }
});

/* ---------------- Text und Lohn ---------------- */

test('Jeder Wunsch hat einen Satz, der wie ein Satz aussieht', () => {
  for (const sorte of SORT_IDS) {
    for (const ort of ORT_IDS) {
      for (const zugabe of ZUGAB_IDS) {
        for (const satz of [0, 1, 2, 3]) {
          const t = wunschText({ sorte: sorte, ort: ort, zugabe: zugabe, satz: satz });
          assert.ok(t.length > 15, sorte + '/' + ort + ': Satz zu kurz');
          assert.ok(t.indexOf('$ORT') < 0, sorte + '/' + ort + ': Platzhalter stehen geblieben');
          assert.ok(/[.!?]$/.test(t), sorte + '/' + ort + ': endet ohne Satzzeichen – „' + t + '"');
          assert.ok(t.indexOf('undefined') < 0, 'undefined im Text');
        }
      }
      const titel = wunschTitel({ sorte: sorte, ort: ort });
      assert.ok(titel.length > 5 && titel.indexOf('undefined') < 0, 'Titel kaputt: ' + titel);
      assert.ok(/^icon_/.test(wunschIcon({ sorte: sorte })), 'kein Symbol');
    }
  }
});

test('Ein Wunsch lohnt spürbar – und gibt Deko zurück', () => {
  const ohne = wunschLohn({ zugabe: 'keine' }, 0);
  const mit = wunschLohn({ zugabe: 'gemuetlich' }, 0);
  assert.ok(ohne.coins >= 200, 'ein Wunsch kostet Deko, die Geld gekostet hat');
  assert.ok(mit.coins > ohne.coins, 'die Zugabe muss sich auszahlen');
  assert.ok(ohne.items.length > 0, 'wer Deko verbaut, soll auch etwas zurückbekommen');
  for (const it of ohne.items) assert.ok(getItem(it.id), it.id + ' gibt es nicht');
});

test('Der Lohn wächst mit – aber nicht ins Unendliche', () => {
  // Nötig, weil ein Tag Bitten spät im Spiel rund 1 800 Münzen bringt: Ein
  // fester Lohn von 260 wäre dann Kleingeld für mehr Arbeit, und man ließe
  // genau die Aufgabe liegen, die das späte Spiel tragen soll.
  const erster = wunschLohn({ zugabe: 'keine' }, 0).coins;
  const spaeter = wunschLohn({ zugabe: 'keine' }, 25).coins;
  const viel = wunschLohn({ zugabe: 'keine' }, 200).coins;
  assert.ok(spaeter > erster * 2, 'nach 25 Wünschen muss es sich deutlich lohnen');
  assert.equal(viel, spaeter, 'gedeckelt – der hundertste darf nicht alles davor schlagen');
  assert.ok(viel < 2000, 'ein einzelner Wunsch darf keinen ganzen Tag ersetzen');
});

test('Jede Sorte lässt sich OHNE Geld erfüllen', () => {
  // Sonst hinge ein Wunsch am Katalog, und wer gerade pleite ist, sieht drei
  // Wünsche stehen, an die er nicht herankommt. Für jede Sorte muss also
  // mindestens ein Stück an der Werkbank zu bauen sein.
  const baubar = Object.create(null);
  for (const r of RECIPES) if (r.out) baubar[r.out.id] = 1;
  for (const id of SORT_IDS) {
    const geht = SORTEN[id].items.filter((it) => baubar[it]);
    assert.ok(geht.length > 0,
      id + ': nichts davon lässt sich bauen – ' + SORTEN[id].items.join(', '));
  }
});

test('Beim Aufstellen sagt das Spiel, ob die Stelle passt', () => {
  // Ohne diese Auskunft ist ein Wunsch ein Suchbild: „am Wasser" heißt in
  // Zahlen 150 Pixel, und wer die Bank zweihundert daneben hinstellt, sähe
  // nichts passieren und wüsste nicht, warum.
  const welt = offeneWelt();
  const amWasser = stelleFuer(welt, 'wasser');
  const imWald = stelleNur(welt, 'wald', 'wasser');
  assert.ok(imWald, 'kein Waldplatz ohne Wasser gefunden');
  const offen = [{ sorte: 'sitz', ort: 'wasser', zugabe: 'keine', satz: 0 }];

  assert.ok(wunschHier(offen, 'bench', amWasser.x, amWasser.y, welt),
    'die Bank am Wasser muss als Treffer erkannt werden');
  assert.equal(wunschHier(offen, 'bench', imWald.x, imWald.y, welt), null,
    'im Wald ist es kein Treffer');
  assert.equal(wunschHier(offen, 'lantern', amWasser.x, amWasser.y, welt), null,
    'eine Laterne ist kein Sitzplatz');

  // Und die nützlichere Hälfte: richtige Sorte, falscher Ort.
  assert.ok(wunschSorteHier(offen, 'hammock'), 'die Hängematte zählt als Sitzplatz');
  assert.equal(wunschSorteHier(offen, 'lantern'), null);
  assert.equal(wunschSorteHier(null, 'bench'), null, 'ohne offene Wünsche kein Absturz');
});

test('Ein frischer Spielstand hat eine leere Wunschliste', () => {
  const w = emptyWishes();
  assert.deepEqual(w.offen, []);
  assert.equal(w.erfuellt, 0);
});

test('Jede aufstellbare Deko kommt in höchstens einer Sorte vor', () => {
  // Sonst erfüllte ein einziges Stück zwei verschiedene Wünsche auf einmal,
  // und der zweite fühlte sich geschenkt an.
  const wo = Object.create(null);
  for (const id of SORT_IDS) {
    for (const it of SORTEN[id].items) {
      assert.ok(!wo[it], it + ' steht in „' + wo[it] + '" und in „' + id + '"');
      wo[it] = id;
    }
  }
  // Und es bleibt genug übrig, das in keiner Sorte steht – nicht jedes Stück
  // muss für einen Wunsch taugen.
  const deko = ITEM_LIST.filter((i) => i.cat === CAT.DECOR && i.prop
    && i.id.indexOf('keepsake_') !== 0);
  const frei = deko.filter((i) => !wo[i.id]);
  assert.ok(frei.length >= 2, 'jedes einzelne Stück ist verplant');
});
