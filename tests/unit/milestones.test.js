/**
 * Meilensteine und die Farbkurve.
 *
 * Der Kern hier ist nicht die Liste, sondern die KURVE: Vorher stand die
 * Anzeige nach rund 130 Aufträgen auf 100 %, also nach knapp zwei Wochen. Die
 * Tests unten halten fest, dass sie jetzt lange trägt und trotzdem am Anfang
 * genauso schnell losgeht.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MILESTONES, MILESTONE_IDS, milestoneById, dueAt, nextOpen, perksOf,
} from '../../src/game/milestones.js';
import { ColorField, radiusForArea } from '../../src/world/colorfield.js';
import { World } from '../../src/world/world.js';
import { SPIRITS, SPIRIT_IDS } from '../../src/game/spirits.js';
import { CAMPFIRE_LEVELS } from '../../src/game/recipes.js';
import { RECIPES } from '../../src/game/recipes.js';
import { Player, TOOLS } from '../../src/game/player.js';
import { makeEntity } from '../../src/world/entities.js';

test('Meilensteine steigen an und haben alle Hand und Fuß', () => {
  let vorher = 0;
  const ids = Object.create(null);
  for (const m of MILESTONES) {
    assert.ok(m.at > vorher, m.id + ': Schwelle steigt nicht');
    assert.ok(m.at <= 1);
    vorher = m.at;
    assert.ok(!ids[m.id], 'doppelte Kennung ' + m.id);
    ids[m.id] = 1;
    assert.ok(m.name && m.name.length <= 26, m.id + ': Name zu lang');
    assert.ok(m.hint && m.hint.length > 10, m.id + ': braucht einen Hinweis');
    // Nie nur eine Urkunde: jeder Meilenstein gibt etwas zu bauen,
    // eine dauerhafte Wirkung oder eine Beigabe.
    const gibtRezept = RECIPES.some(function (r) { return r.needs === m.id; });
    assert.ok(gibtRezept || m.perks || m.gift, m.id + ' gibt nichts her');
  }
  assert.equal(MILESTONES[MILESTONES.length - 1].at, 1, 'der letzte steht auf 100 %');
});

test('Jeder Bauplan mit Bedingung nennt einen echten Meilenstein', () => {
  for (const r of RECIPES) {
    if (!r.needs) continue;
    assert.ok(milestoneById(r.needs), r.id + ': unbekannter Meilenstein ' + r.needs);
  }
  // Und andersherum: die Meilensteine, die Baupläne versprechen, halten das.
  for (const id of ['fleck', 'tasche', 'werkzeugtag', 'wald', 'daumen']) {
    assert.ok(RECIPES.some(function (r) { return r.needs === id; }),
      id + ' verspricht Baupläne, gibt aber keine frei');
  }
});

test('Fällig ist, was die Deckung hergibt – und nur einmal', () => {
  assert.deepEqual(dueAt(0.05, {}).map((m) => m.id), []);
  assert.deepEqual(dueAt(0.10, {}).map((m) => m.id), ['fleck']);
  assert.deepEqual(dueAt(0.21, {}).map((m) => m.id), ['fleck', 'tasche']);
  // Schon erreichtes kommt nicht wieder
  assert.deepEqual(dueAt(0.21, { fleck: 3 }).map((m) => m.id), ['tasche']);
  assert.deepEqual(dueAt(0.21, { fleck: 3, tasche: 4 }), []);
  // Der letzte greift auch, wenn die grobe Abtastung knapp unter 100 % bleibt
  assert.ok(dueAt(0.997, {}).some((m) => m.id === 'ganz'));
});

test('Der nächste offene Meilenstein ist der erste, der fehlt', () => {
  assert.equal(nextOpen({}).id, MILESTONE_IDS[0]);
  assert.equal(nextOpen({ fleck: 1 }).id, MILESTONE_IDS[1]);
  const alle = Object.create(null);
  for (const id of MILESTONE_IDS) alle[id] = 1;
  assert.equal(nextOpen(alle), null);
});

test('Wirkungen zählen nur, was erreicht ist', () => {
  const leer = perksOf({});
  assert.equal(leer.sell, 1);
  assert.equal(leer.grow, 0);
  assert.equal(leer.seeds, false);

  const mit = perksOf({ ruf: 1, daumen: 2, ganz: 3 });
  assert.ok(mit.sell > 1.1, 'Guter Ruf zahlt mehr');
  assert.equal(mit.grow, 1, 'Grüner Daumen ist ein Schritt mehr am Tag');
  assert.equal(mit.seeds, true);
  assert.equal(mit.reward, 1, 'Die Insel dankt fehlt noch');
});

test('Gleiche Fläche heißt: der große Kreis wächst langsamer', () => {
  const klein = radiusForArea(100, 130000) - 100;
  const gross = radiusForArea(900, 130000) - 900;
  assert.ok(klein > gross * 3, 'kleiner Kreis muss deutlich stärker wachsen');
  // Die Fläche stimmt wirklich
  const r = radiusForArea(400, 130000);
  assert.ok(Math.abs((Math.PI * r * r - Math.PI * 400 * 400) - 130000) < 1);
  // Nie schrumpfen, auch nicht bei Unsinn
  assert.equal(radiusForArea(500, 0), 500);
  assert.equal(radiusForArea(500, -9), 500);
});

test('growByArea wächst das Ziel, nicht den Ist-Wert', () => {
  const f = new ColorField();
  f.addSource(0, 0, 240, 'a');
  const s = f.find('a');
  assert.equal(s.r, 0, 'die Farbe blüht erst noch auf');
  f.growByArea('a', 130000);
  assert.ok(s.target > 240);
  assert.equal(s.r, 0);
  assert.equal(f.growByArea('gibtesnicht', 1000), null);
});

/**
 * Wie viele Aufträge bis zu dieser Deckung? Das ist die eigentliche Frage.
 *
 * Absichtlich mit dem Weg, den das Spiel wirklich geht: Am Anfang steht nur
 * das Lager offen, der Wald kommt später dazu, die Klippen zuletzt. Mit allen
 * drei Bereichen von Anfang an läge die Deckung schon vor dem ersten Auftrag
 * bei zehn Prozent, und jede Zahl darunter wäre geschönt.
 */
function auftraegeBis(ziel) {
  const world = new World(4711).populate();
  const f = new ColorField();
  const c = world.campfire;
  if (c) f.sources.push({ x: c.x, y: c.y, r: 0, target: 0, key: 'campfire' });
  const geister = [];

  function oeffnen(region, feuerStufe) {
    world.unlockRegion(region);
    const feuer = CAMPFIRE_LEVELS[feuerStufe - 1];
    const cf = f.find('campfire');
    if (cf) cf.r = Math.max(cf.r, feuer.radius);
    for (const id of SPIRIT_IDS) {
      if (SPIRITS[id].region !== region || f.find(id)) continue;
      const e = world.spiritEntity(id);
      if (!e) continue;
      const s = { x: e.x, y: e.y, r: SPIRITS[id].colorStart, target: 0, key: id };
      f.sources.push(s);
      geister.push(s);
    }
    f._dirty = true;
  }

  oeffnen(0, 1);
  if (f.coverage(world) >= ziel) return 0;
  for (let q = 1; q <= 2000; q++) {
    // Der Wald öffnet nach etwa einem Tag, die Klippen nach dreien.
    if (q === 25) oeffnen(1, 3);
    if (q === 70) oeffnen(2, 4);
    const s = geister[q % geister.length];
    s.r = radiusForArea(s.r, SPIRITS[s.key].colorArea);
    f._dirty = true;
    if (f.coverage(world) >= ziel) return q;
  }
  return Infinity;
}

test('Die Insel ganz zu färben dauert Wochen, nicht Tage', () => {
  const bisVoll = auftraegeBis(0.995);
  // Gemessen rund 330. Bei knapp fünfzehn erledigten Aufträgen am Tag sind
  // das gut drei Wochen. Vorher waren es 130, also keine zwei Wochen.
  assert.ok(bisVoll > 240, 'zu schnell voll: ' + bisVoll + ' Aufträge');
  assert.ok(bisVoll < 600, 'zu zäh: ' + bisVoll + ' Aufträge');
});

test('Der Anfang bleibt trotzdem schnell', () => {
  // Der erste Meilenstein darf nicht hinter einer Woche liegen – sonst hat
  // die gestreckte Kurve den Einstieg mitgestreckt.
  assert.ok(auftraegeBis(MILESTONES[0].at) <= 20, 'der erste Fleck kommt zu spät');
});

test('Die Meilensteine verteilen sich über den ganzen Weg', () => {
  let vorher = 0;
  for (const m of MILESTONES) {
    const n = auftraegeBis(m.at >= 1 ? 0.995 : m.at);
    assert.ok(n > vorher, m.id + ' liegt nicht hinter dem vorigen');
    // Keine Durststrecke: zwischen zwei Meilensteinen liegen nie mehr als
    // achtzig Aufträge, sonst passiert eine Woche lang nichts. Der letzte
    // Schritt darf länger sein – die letzten Kacheln liegen hinter Felsen und
    // in Ecken, das ist der Schlussspurt und als solcher gewollt.
    const grenze = m.at >= 1 ? 130 : 80;
    assert.ok(n - vorher <= grenze, m.id + ': ' + (n - vorher) + ' Aufträge Abstand');
    vorher = n;
  }
});

/* ---------------- Die Gießkanne ---------------- */

test('Die Gießkanne ist am Anfang nicht dabei', () => {
  const p = new Player(0, 0);
  const i = TOOLS.map(function (t) { return t.id; }).indexOf('can');
  assert.ok(i >= 0, 'die Kanne muss es geben');
  assert.equal(p.levels.can, 0);
  assert.equal(p.owns(i), false);
  // Auswählen geht nicht, und der Rundlauf springt daran vorbei
  p.selectTool(i);
  assert.notEqual(p.toolIndex, i);
  const besucht = [];
  for (let n = 0; n < TOOLS.length + 2; n++) { p.nextTool(); besucht.push(p.tool.id); }
  assert.equal(besucht.indexOf('can'), -1);

  p.levels.can = 1;
  assert.equal(p.owns(i), true);
  p.selectTool(i);
  assert.equal(p.tool.id, 'can');
});

test('Ein alter Spielstand kennt die Kanne nicht – und läuft weiter', () => {
  const alt = { x: 10, y: 20, dir: 'down', tool: 3, levels: { hand: 1, axe: 2, pickaxe: 1, shovel: 1, rod: 1, net: 1 } };
  const p = Player.fromJSON(alt);
  assert.equal(p.levels.can, 0, 'ungebaut, nicht undefined');
  assert.equal(p.levels.axe, 2, 'was dastand, bleibt stehen');
  // Und ein Stand, in dem die Kanne gewählt war, aber fehlt, hängt nicht fest
  const kaputt = Player.fromJSON({ x: 0, y: 0, tool: 6, levels: { can: 0 } });
  assert.equal(kaputt.tool.id, 'hand');
});

test('Vor einem Beet gewinnt das Beet, nicht der Baum daneben', () => {
  const world = new World(4711).populate();
  const p = new Player(1000, 1000);
  p.dir = 'right';
  // Der Baum steht sogar NÄHER am Zielpunkt als das Beet – nur so entscheidet
  // wirklich, ob ein Beet als ansprechbar gilt, und nicht die Entfernung.
  const baum = makeEntity('tree_oak', 1044, 1000);
  const beet = makeEntity('crop', 1064, 1000, { cropId: 'berry', grown: 0 });
  world.add(beet);
  world.add(baum);

  // Mit der Gießkanne: das Beet. Vorher gewann jeder Baum, weil ein Beet
  // nicht als „ansprechbar" galt und darum Punktabzug bekam.
  p.levels.can = 1;
  p.selectTool(TOOLS.map(function (t) { return t.id; }).indexOf('can'));
  assert.equal(p.findTarget(world).entity.kind, 'crop');

  // Mit der Axt gewinnt der Baum – dafür ist sie da.
  p.selectTool(1);
  assert.equal(p.findTarget(world).entity.kind, 'tree_oak');
});
