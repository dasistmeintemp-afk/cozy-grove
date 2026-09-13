/**
 * Die Jahreszeiten.
 *
 * Der Kalender kannte vier davon von Anfang an, und sie taten nichts: Ein
 * Wort im Tagebuch, ein Brief zum Wechsel – und selbst der kam für drei von
 * vier Jahreszeiten nie an, weil in der Brieftabelle deutsche Schlüssel
 * standen und im Kalender englische.
 *
 * Diese Tests wachen über die zwei Fehler, die eine Jahreszeit machen kann:
 * Sie darf niemanden aussperren (kein Tag ohne Fisch, kein Auftrag, der bis
 * zum Frühling wartet), und sie muss sich vom Nachbarn unterscheiden – sonst
 * hätte man die ganze Mühe auch lassen können.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SEASON_TINT, seasonTint, SEASON_WEATHER, seasonWeather, SEASON_ONLY,
  inSeason, seasonsOf, seasonPhrase, SEASON_REGROW, regrowDays,
} from '../../src/game/seasons.js';
import { SEASONS, SEASON_IDS } from '../../src/game/calendar.js';
import { getItem, fishesOf, bugsOf, ITEM_LIST, CAT, CONDITIONAL } from '../../src/game/items.js';
import { hintFor } from '../../src/game/collection.js';
import { weatherFor, WEATHER } from '../../src/render/weather.js';
import { QuestBook, QTYPE } from '../../src/game/quests.js';
import { World } from '../../src/world/world.js';
import { Inventory } from '../../src/game/inventory.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';

const SEED = 4711;

/* ---------------- Die Tabelle selbst ---------------- */

test('Jede Jahreszeit des Kalenders ist hier bekannt', () => {
  // Käme eine fünfte dazu oder würde eine umbenannt, fiele sie sonst
  // stillschweigend auf die Frühlingswerte zurück.
  for (const id of SEASON_IDS) {
    assert.ok(Object.prototype.hasOwnProperty.call(SEASON_TINT, id), id + ': kein Farbton');
    assert.ok(Object.prototype.hasOwnProperty.call(SEASON_WEATHER, id), id + ': kein Wetter');
    assert.ok(Object.prototype.hasOwnProperty.call(SEASON_REGROW, id), id + ': kein Nachwuchs');
  }
});

test('Der Farbschleier bleibt schwach genug für die Aquarellfarben', () => {
  assert.equal(seasonTint('spring'), null, 'der Frühling ist der Maßstab, er färbt nicht');
  let gefaerbt = 0;
  for (const id of SEASON_IDS) {
    const t = seasonTint(id);
    if (!t) continue;
    gefaerbt++;
    assert.ok(t.a > 0.03, id + ': so schwach sieht es keiner');
    assert.ok(t.a <= 0.12, id + ': übertüncht die Malerei');
    for (const k of ['r', 'g', 'b']) {
      assert.ok(t[k] >= 0 && t[k] <= 255, id + ': ' + k + ' liegt außerhalb');
    }
  }
  assert.equal(gefaerbt, 3, 'drei Jahreszeiten färben, der Frühling nicht');
  assert.equal(seasonTint('gibtesnicht'), null);
});

test('Die Wettermischungen unterscheiden sich wirklich', () => {
  for (const id of SEASON_IDS) {
    const m = seasonWeather(id);
    const summe = m.rain + m.fog + m.snow;
    assert.ok(summe > 0.1, id + ': fast immer klar, das ist keine Jahreszeit');
    assert.ok(summe < 0.85, id + ': kein einziger klarer Tag mehr');
  }
  // Schnee gehört dem Winter allein – sonst schneit es im Juli.
  for (const id of SEASON_IDS) {
    if (id === 'winter') assert.ok(SEASON_WEATHER[id].snow > 0.2, 'im Winter schneit es');
    else assert.equal(SEASON_WEATHER[id].snow, 0, id + ': hier darf kein Schnee fallen');
  }
  assert.ok(SEASON_WEATHER.summer.rain < SEASON_WEATHER.spring.rain, 'der Sommer ist trockener');
  assert.ok(SEASON_WEATHER.autumn.fog > SEASON_WEATHER.summer.fog, 'der Herbst hat den Nebel');
  // Ohne Angabe muss etwas Vernünftiges herauskommen, sonst reißen alte
  // Aufrufe und Spielstände ab.
  assert.deepEqual(seasonWeather(null), SEASON_WEATHER.spring);
});

/* ---------------- Was daraus am Himmel wird ---------------- */

test('Der Winter bringt Schnee, der Sommer nie', () => {
  const zaehl = function (season) {
    const z = { clear: 0, rain: 0, fog: 0, snow: 0 };
    for (let seed = 0; seed < 12; seed++) {
      for (let day = 2; day <= 400; day++) z[weatherFor(seed * 997 + 13, day, season).kind]++;
    }
    return z;
  };
  const winter = zaehl('winter');
  const sommer = zaehl('summer');
  assert.ok(winter.snow > 1000, 'im Winter schneit es oft genug, um es zu bemerken');
  assert.equal(sommer.snow, 0, 'im Sommer fällt kein Schnee');
  assert.ok(sommer.clear > winter.clear, 'der Sommer hat die klareren Tage');
  // Jede Jahreszeit hat noch klare Tage – Dauerregen ist kein Wetter mehr.
  for (const id of SEASON_IDS) {
    const z = zaehl(id);
    assert.ok(z.clear > 600, id + ': kaum noch ein klarer Tag');
  }
});

test('Keine Jahreszeit sperrt etwas aus, das am Wetter hängt', () => {
  // Das ist die Falle, in die die erste Fassung fast gelaufen wäre: Der
  // Winter hatte fünf Prozent Regen, und Regenpilze wachsen NUR bei Regen.
  //
  // Entscheidend ist, dass eine Sitzung immer in EINER Jahreszeit spielt:
  // Der Kalender dreht sich mit dem echten Datum, ein Inseltag dauert aber
  // vierzehn Minuten. Wer im Januar spielt, hat Winter – heute, morgen und
  // in vierzig Inseltagen. Eine seltene Bedingung ist damit keine Seltenheit
  // mehr, sondern eine Sperre.
  const bedingungen = {};
  for (const it of CONDITIONAL) {
    if (it.onlyAt === 'night') continue;   // die Nacht kommt in jeder Jahreszeit
    bedingungen[it.onlyAt] = it.id;
  }
  assert.ok(Object.keys(bedingungen).length >= 2, 'zu wenige Wetterbedingungen gefunden');
  for (const id of SEASON_IDS) {
    for (const was of Object.keys(bedingungen)) {
      const p = SEASON_WEATHER[id][was] || 0;
      assert.ok(p >= 0.1,
        id + ': ' + bedingungen[was] + ' braucht „' + was + '", und das gibt es nur an '
        + Math.round(p * 100) + ' von 100 Tagen');
    }
  }
});

test('Der erste Tag bleibt klar, egal welche Jahreszeit', () => {
  for (const id of SEASON_IDS) {
    assert.equal(weatherFor(SEED, 1, id).kind, WEATHER.CLEAR);
    assert.equal(weatherFor(SEED, 1, id).strength, 0);
  }
});

test('Dasselbe Datum gibt dasselbe Wetter', () => {
  // Das Wetter liegt nicht im Spielstand; es muss sich aus Inselzahl, Tag
  // und Jahreszeit jedes Mal gleich ergeben.
  for (let day = 2; day < 40; day++) {
    assert.deepEqual(weatherFor(SEED, day, 'autumn'), weatherFor(SEED, day, 'autumn'));
  }
});

/* ---------------- Wer wann unterwegs ist ---------------- */

test('Die saisonalen Arten gibt es wirklich', () => {
  for (const id of Object.keys(SEASON_ONLY)) {
    assert.ok(getItem(id), id + ': steht in der Jahreszeitentabelle, aber nicht im Spiel');
    for (const s of SEASON_ONLY[id]) {
      assert.ok(SEASON_IDS.indexOf(s) >= 0, id + ': „' + s + '" ist keine Jahreszeit');
    }
  }
});

test('Keine Art ist länger als ein halbes Jahr fort', () => {
  // Der Grund ist handfest: Wer im Spätherbst anfängt und den Goldkarpfen
  // sucht, wartet sonst bis zum Frühling – und das Fundbuch bliebe
  // monatelang unvollständig, ohne dass irgendwo stünde, warum.
  for (const id of Object.keys(SEASON_ONLY)) {
    assert.ok(SEASON_ONLY[id].length >= 2, id + ': nur eine einzige Jahreszeit');
    assert.ok(SEASON_ONLY[id].length <= 3, id + ': das ist schon fast das ganze Jahr');
  }
});

test('Was nicht in der Tabelle steht, gibt es immer', () => {
  for (const it of ITEM_LIST) {
    if (SEASON_ONLY[it.id]) continue;
    for (const id of SEASON_IDS) {
      assert.equal(inSeason(it.id, id), true, it.id + ' darf nicht saisonal sein');
    }
  }
  // Ohne Angabe zählt der ganze Kalender – dafür gibt es Fundbuch und Tests.
  assert.equal(inSeason('fish_goldcarp', null), true);
  assert.equal(inSeason('fish_goldcarp', 'winter'), false);
  assert.equal(inSeason('fish_goldcarp', 'summer'), true);
  assert.equal(seasonsOf('wood'), null);
});

test('An jedem Tag des Jahres beißt etwas und fliegt etwas', () => {
  // Der eigentliche Fallstrick: Wenn die letzte Art einer Kombination
  // saisonal wird, steht man am Wasser und die Angel gibt keinen Fisch her.
  for (const id of SEASON_IDS) {
    for (const wasser of ['sea', 'fresh']) {
      for (const nacht of [false, true]) {
        const pool = fishesOf(wasser, nacht, id);
        assert.ok(pool.length >= 2,
          id + '/' + wasser + (nacht ? '/nachts' : '/tags') + ': nur ' + pool.length + ' Fisch');
      }
    }
    for (const nacht of [false, true]) {
      assert.ok(bugsOf(nacht, id).length >= 1,
        id + (nacht ? '/nachts' : '/tags') + ': kein einziger Falter');
    }
  }
});

test('Die Jahreszeit ändert wirklich, was im Wasser steht', () => {
  const sommer = fishesOf('fresh', true, 'summer').map((f) => f.id);
  const winter = fishesOf('fresh', true, 'winter').map((f) => f.id);
  assert.ok(sommer.indexOf('fish_goldcarp') >= 0, 'im Sommer steht der Goldkarpfen im Fluss');
  assert.ok(winter.indexOf('fish_goldcarp') < 0, 'im Winter nicht');

  const seeWinter = fishesOf('sea', true, 'winter').map((f) => f.id);
  const seeSommer = fishesOf('sea', true, 'summer').map((f) => f.id);
  assert.ok(seeWinter.indexOf('fish_moonfish') >= 0, 'der Mondfisch ist der Lohn des Winters');
  assert.ok(seeSommer.indexOf('fish_moonfish') < 0);

  assert.ok(bugsOf(false, 'autumn').map((b) => b.id).indexOf('bug_admiral') >= 0);
  assert.ok(bugsOf(false, 'winter').map((b) => b.id).indexOf('bug_admiral') < 0);
  assert.ok(bugsOf(true, 'spring').map((b) => b.id).indexOf('bug_luna') >= 0);
  assert.ok(bugsOf(true, 'autumn').map((b) => b.id).indexOf('bug_luna') < 0);
});

test('Ohne Jahreszeit bleibt die Liste vollständig', () => {
  // Fundbuch, Preisrechnung und alte Tests fragen ohne Kalender – sie sollen
  // alles sehen, nicht nur das, was heute gerade beißt.
  const alle = ITEM_LIST.filter((i) => i.cat === CAT.FISH && i.water === 'fresh').length;
  assert.equal(fishesOf('fresh', true).length, alle);
  assert.equal(bugsOf(true).length + bugsOf(false).length,
    ITEM_LIST.filter((i) => i.cat === CAT.BUG).length);
});

/* ---------------- Der Fingerzeig ---------------- */

test('Das Fundbuch sagt, wann es die Art gibt', () => {
  for (const id of Object.keys(SEASON_ONLY)) {
    const hinweis = hintFor(id);
    const namen = SEASON_ONLY[id].map((s) => SEASONS[s].name);
    for (const n of namen) {
      assert.ok(hinweis.indexOf(n) >= 0, id + ': „' + n + '" fehlt im Hinweis: ' + hinweis);
    }
  }
  // Und bei allem anderen steht kein überflüssiger Satz.
  assert.equal(hintFor('wood').indexOf('Nur im'), -1);
});

test('Der Jahreszeitensatz liest sich wie ein Satz', () => {
  assert.equal(seasonPhrase('fish_moonfish'), 'im Herbst und Winter');
  assert.equal(seasonPhrase('fish_goldcarp'), 'im Frühling und Sommer');
  assert.equal(seasonPhrase('wood'), '');
});

/* ---------------- Nachwuchs ---------------- */

test('Im Frühling wächst es nach, im Winter dauert es', () => {
  for (const tage of [1, 2, 3, 4, 6]) {
    const fruehling = regrowDays(tage, 'spring');
    const sommer = regrowDays(tage, 'summer');
    const winter = regrowDays(tage, 'winter');
    assert.ok(fruehling <= sommer, tage + ': der Frühling darf nicht langsamer sein');
    assert.ok(winter >= sommer, tage + ': der Winter darf nicht schneller sein');
    assert.ok(fruehling >= 1, 'nie unter einem Tag – sonst steht der Busch sofort wieder da');
  }
  // Bei einem Baum (drei bis vier Tage) muss man den Unterschied merken.
  assert.ok(regrowDays(4, 'winter') > regrowDays(4, 'spring') + 1, 'sonst fällt es nicht auf');
  assert.equal(regrowDays(3, null), 3, 'ohne Jahreszeit bleibt alles wie es war');
  assert.ok(regrowDays(0, 'winter') >= 1);
});

test('Die tägliche Runde bleibt in jeder Jahreszeit täglich', () => {
  // Das ist die Grenze, an der die Jahreszeit aufhört, gemütlich zu sein:
  // Beeren, Kräuter, Pilze, Blumen, Muscheln und Treibholz kommen mit einem
  // Tag Nachwuchs. Wären sie im Winter jeden zweiten Tag weg, hätte man ein
  // Vierteljahr lang ein halb leeres Spiel.
  const taeglich = [];
  for (const kind of Object.keys(ENTITY_DEFS)) {
    if (ENTITY_DEFS[kind].respawn === 1) taeglich.push(kind);
  }
  assert.ok(taeglich.length > 8, 'zu wenige tägliche Quellen gefunden – Test prüft nichts');
  for (const id of SEASON_IDS) {
    assert.equal(regrowDays(1, id), 1, id + ': das Tägliche darf nicht länger brauchen');
  }
});

/* ---------------- Aufträge ---------------- */

test('Kein Geist bittet um etwas, das gerade nicht da ist', () => {
  // Dieselbe Falle wie bei der Feder, nur zeitlich: Eine Bitte um den
  // Goldkarpfen im Winter läuft nach fünf Tagen unerfüllt ab, und der
  // Spieler hat die ganze Zeit am falschen Wasser gestanden.
  for (const id of SEASON_IDS) {
    const world = new World(SEED).populate();
    for (let r = 1; r <= 3; r++) world.unlockRegion(r);
    const ctx = { world: world, inventory: new Inventory(60), today: { season: SEASONS[id] } };
    const qb = new QuestBook();
    let geprueft = 0;
    for (let day = 1; day <= 90; day++) {
      qb.newDay(day, world, ctx);
      for (const q of qb.active()) {
        if (q.type !== QTYPE.CATCH) continue;
        geprueft++;
        assert.equal(inSeason(q.itemId, id), true,
          id + ', Tag ' + day + ': ' + q.itemId + ' gibt es jetzt gar nicht');
      }
    }
    assert.ok(geprueft > 20, id + ': zu wenige Fang-Aufträge geprüft (' + geprueft + ')');
  }
});

test('Wechselt die Jahreszeit, rückt die unmöglich gewordene Bitte ab', () => {
  // Der Rest des Jahres ist abgesichert – bleibt der eine Tag, an dem sich
  // der Kalender dreht. Eine Bitte gilt drei bis fünf Tage; wird sie am
  // letzten Sommertag ausgesprochen, steht der Goldkarpfen mitten in ihrer
  // Laufzeit nicht mehr im Fluss. Sie muss dann zurückgezogen werden, wie
  // jede abgelaufene auch – der Spieler bekommt es morgens gemeldet.
  const world = new World(SEED).populate();
  for (let r = 1; r <= 3; r++) world.unlockRegion(r);
  const sommer = { world: world, inventory: new Inventory(60), today: { season: SEASONS.summer } };
  const qb = new QuestBook();

  // Eine Sommerbitte um den Goldkarpfen von Hand einhängen – auf sie zu
  // warten hieße, den Test vom Zufall abhängig zu machen.
  qb.quests.push({
    id: 'test1', spirit: 'kiesel', type: QTYPE.CATCH, itemId: 'fish_goldcarp',
    need: 1, have: 0, day: 10, expires: 14,
  });
  assert.equal(qb.expire(11, world, sommer).length, 0, 'im Sommer bleibt sie stehen');
  assert.equal(qb.quests.length, 1);

  const winter = Object.assign({}, sommer, { today: { season: SEASONS.winter } });
  const raus = qb.expire(11, world, winter);
  assert.equal(raus.length, 1, 'im Winter muss sie abrücken');
  assert.equal(raus[0].itemId, 'fish_goldcarp');
  assert.equal(qb.quests.length, 0);
});

test('Ganzjährige Bitten bleiben beim Wechsel stehen', () => {
  // Die Gegenprobe: Würde hier zu viel abgeräumt, wäre der Wechsel ein Tag,
  // an dem die halbe Liste verschwindet.
  const world = new World(SEED).populate();
  const ctx = { world: world, inventory: new Inventory(60), today: { season: SEASONS.winter } };
  const qb = new QuestBook();
  qb.quests.push({
    id: 'test2', spirit: 'mira', type: QTYPE.GATHER, itemId: 'wood',
    need: 3, have: 0, day: 10, expires: 14,
  });
  qb.quests.push({
    id: 'test3', spirit: 'kiesel', type: QTYPE.CATCH, itemId: 'fish_moonfish',
    need: 1, have: 0, day: 10, expires: 14,
  });
  assert.equal(qb.expire(11, world, ctx).length, 0);
  assert.equal(qb.quests.length, 2);
});
