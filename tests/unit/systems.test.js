import test from 'node:test';
import assert from 'node:assert/strict';

import { Inventory } from '../../src/game/inventory.js';
import {
  QuestBook, QTYPE, questTitle, questIcon, QUEST_VERB, lifetimeOf, daysLeft,
  craftableAsks, CRAFTABLE_ASKS, COOK_ASKS, verlaesslich,
} from '../../src/game/quests.js';
import { World } from '../../src/world/world.js';
import { DayCycle, DAY_START, DAY_END } from '../../src/game/daycycle.js';
import { Fishing } from '../../src/game/fishing.js';
import { Shop, buyPrice } from '../../src/game/shop.js';
import { ColorField } from '../../src/world/colorfield.js';
import { makeRng, dailyRng, makeNoise2D, fbm } from '../../src/core/rng.js';
import { SPIRITS, SPIRIT_IDS, friendshipLevel, friendshipGift } from '../../src/game/spirits.js';
import { charmAround, cosyLevel, pointsToNext, cosyRadius, rewardFactor, COSY_STEPS, COSY_MAX, COSY_RADIUS } from '../../src/game/cosiness.js';
import { weatherFor, WEATHER } from '../../src/render/weather.js';
import { getItem, ITEM_LIST, CAT } from '../../src/game/items.js';
import { parseSave, SAVE_VERSION } from '../../src/game/game.js';
import { ENTITY_DEFS } from '../../src/world/entities.js';
import { RECIPES, CAMPFIRE_LEVELS } from '../../src/game/recipes.js';
import { GERICHTE, gerichtFuer } from '../../src/game/kitchen.js';
import {
  StoryBook, STORIES, STAGES, QUESTS_PER_STAGE, keepsakeOf, storyIcon,
} from '../../src/game/stories.js';

const SEED = 4711;

/* ---------------- Tasche ---------------- */

test('Tasche stapelt, entfernt und respektiert die Platzzahl', () => {
  const inv = new Inventory(3);
  assert.equal(inv.add('wood', 5), 5);
  assert.equal(inv.count('wood'), 5);
  assert.equal(inv.slots.length, 1, 'ein Stapel');

  assert.equal(inv.add('wood', 100), 100);
  assert.equal(inv.count('wood'), 105);
  assert.equal(inv.slots.length, 2, 'zweiter Stapel ab 99');

  assert.equal(inv.add('stone', 4), 4);
  assert.ok(inv.isFull());
  assert.equal(inv.add('berry', 1), 0, 'kein Platz mehr');

  assert.equal(inv.remove('wood', 100), 100);
  assert.equal(inv.count('wood'), 5);
  assert.equal(inv.remove('wood', 999), 5);
  assert.equal(inv.count('wood'), 0);
  assert.equal(inv.has('stone', 4), true);
  assert.equal(inv.has('stone', 5), false);
});

test('Tasche sortiert nach Kategorie', () => {
  const inv = new Inventory(30);
  inv.add('lantern', 1);
  inv.add('berry', 3);
  inv.add('wood', 2);
  inv.sort();
  assert.equal(inv.slots[0].id, 'wood');
  assert.equal(inv.slots[inv.slots.length - 1].id, 'lantern');
  assert.deepEqual(inv.usedCategories().sort(), ['decor', 'forage', 'material']);
});

test('Tasche lässt sich sichern und laden', () => {
  const inv = new Inventory(12);
  inv.add('wood', 7);
  inv.add('gem', 1);
  const back = Inventory.fromJSON(JSON.parse(JSON.stringify(inv.toJSON())));
  assert.equal(back.capacity, 12);
  assert.equal(back.count('wood'), 7);
  assert.equal(back.count('gem'), 1);

  // Unbekannte Gegenstände aus alten Ständen werden verworfen
  const dirty = Inventory.fromJSON({ capacity: 10, slots: [{ id: 'gibt_es_nicht', n: 3 }, { id: 'wood', n: 1 }] });
  assert.equal(dirty.slots.length, 1);
});

/* ---------------- Spielstand ---------------- */

test('Spielstandprüfung nimmt Gültiges an und weist Unfug ab', () => {
  assert.equal(parseSave('{').ok, false);
  assert.equal(parseSave('null').ok, false);
  assert.equal(parseSave('{"version":1}').ok, false, 'ohne Samen ist es keiner');
  assert.equal(parseSave('{"version":99,"seed":5}').ok, false, 'fremde Fassung');
  const gut = parseSave('{"version":' + SAVE_VERSION + ',"seed":5,"day":{"day":3}}');
  assert.equal(gut.ok, true);
  assert.equal(gut.data.seed, 5);
  // Jede Ablehnung muss sagen, WAS los ist – sonst steht man vor einem
  // stummen Knopf und weiß nicht, ob der Stand kaputt oder nur alt ist.
  for (const text of ['{', 'null', '{"version":99,"seed":5}']) {
    assert.ok(parseSave(text).reason.length > 8, text);
  }
});

test('Die Fassungsnummer des Spielstands bleibt, solange nur ergänzt wird', () => {
  // Alles, was seither dazugekommen ist – Beete, Saat, Fristen, Tagebuch,
  // Oberflächengröße –, ist zusätzlich. Ein alter Stand darf deshalb weiter
  // gelesen werden, und genau dafür steht diese Zahl still.
  assert.equal(SAVE_VERSION, 1);
});

/* ---------------- Aufgaben ---------------- */

function makeCtx() {
  const world = new World(SEED).populate();
  const inventory = new Inventory(60);
  return { world, inventory };
}

test('Tagesaufgaben nur für freigeschaltete Bereiche', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  qb.newDay(1, ctx.world, ctx);
  assert.ok(qb.active().length > 0);
  for (const q of qb.active()) {
    assert.equal(SPIRITS[q.spirit].region, 0, 'nur Lager-Geister am Anfang');
  }

  ctx.world.unlockRegion(1);
  qb.newDay(2, ctx.world, ctx);
  const regions = new Set(qb.active().map((q) => SPIRITS[q.spirit].region));
  assert.ok(regions.has(1), 'Waldgeister geben jetzt Aufgaben');
});

test('Der erste Tag hat genug für eine ganze Sitzung', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  qb.newDay(1, ctx.world, ctx);
  const perSpirit = Object.create(null);
  for (const q of qb.active()) perSpirit[q.spirit] = (perSpirit[q.spirit] || 0) + 1;
  // Zwei je Geist: ruhiger Einstieg, aber niemand steht nach drei Minuten da
  for (const id of Object.keys(perSpirit)) assert.equal(perSpirit[id], 2);
  assert.ok(qb.active().length >= 4, 'zu wenig zu tun am ersten Tag');
});

test('Nie mehr als drei offene Aufgaben pro Geist', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  for (let day = 1; day <= 8; day++) qb.newDay(day, ctx.world, ctx);
  const perSpirit = Object.create(null);
  for (const q of qb.active()) perSpirit[q.spirit] = (perSpirit[q.spirit] || 0) + 1;
  for (const id of Object.keys(perSpirit)) {
    assert.ok(perSpirit[id] <= 3, id + ' hat ' + perSpirit[id] + ' Aufgaben');
  }
});

test('Bitten laufen ab und machen Platz für neue', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  qb.newDay(1, ctx.world, ctx);
  const ersteTag = qb.active().map((q) => q.id);
  assert.ok(ersteTag.length > 0);
  for (const q of qb.active()) {
    assert.ok(q.expires > 1, 'jede Bitte braucht eine Frist');
    assert.equal(q.expires, 1 + lifetimeOf(q.type));
  }

  // Weit genug in die Zukunft, dass alles vom ersten Tag abgelaufen ist
  for (let day = 2; day <= 7; day++) qb.newDay(day, ctx.world, ctx);
  const nochDa = qb.active().filter((q) => ersteTag.indexOf(q.id) >= 0);
  assert.equal(nochDa.length, 0, 'liegengebliebene Bitten vom ersten Tag: ' + nochDa.length);
  assert.ok(qb.active().length > 0, 'aber es gibt neue');
});

test('Fertige Bitten laufen NICHT ab', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  qb.newDay(1, ctx.world, ctx);
  // Eine Sammelaufgabe erfüllen, aber nicht abgeben
  const q = qb.active().filter((x) => x.type === QTYPE.GATHER)[0];
  assert.ok(q, 'kein Sammelauftrag am ersten Tag');
  ctx.inventory.add(q.itemId, q.need);
  for (let day = 2; day <= 9; day++) qb.newDay(day, ctx.world, ctx);
  assert.ok(qb.byId(q.id), 'die erfüllte Bitte wurde weggeworfen');
});

test('Abgelaufene Suchaufträge räumen ihre Fundstücke weg', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  let q = null;
  for (let day = 1; day <= 12 && !q; day++) {
    qb.newDay(day, ctx.world, ctx);
    q = qb.active().filter((x) => x.type === QTYPE.FIND && x.hiddenIds && x.hiddenIds.length)[0];
  }
  assert.ok(q, 'kein Suchauftrag erzeugt');
  const ids = q.hiddenIds.slice();
  for (const id of ids) assert.ok(ctx.world.byId[id], 'Fundstück fehlt schon vorher');

  const bis = q.expires;
  for (let day = q.day + 1; day <= bis + 1; day++) qb.newDay(day, ctx.world, ctx);
  assert.equal(qb.byId(q.id), null, 'der Auftrag läuft nicht ab');
  for (const id of ids) {
    assert.equal(ctx.world.byId[id], undefined, 'verwaistes Fundstück ' + id + ' liegt noch herum');
  }
});

test('Ein Geist stellt nicht zweimal dieselbe Bitte gleichzeitig', () => {
  const ctx = makeCtx();
  for (let day = 1; day < 40; day++) {
    const qb = new QuestBook();
    qb.newDay(day, ctx.world, ctx);
    const gesehen = Object.create(null);
    for (const q of qb.active()) {
      // Maßstab ist die Karte, die im Spiel steht: zwei Bitten mit derselben
      // Überschrift sind für den Spieler dieselbe Bitte, auch wenn intern
      // andere Zutaten dranhängen.
      const k = q.spirit + '|' + questTitle(q);
      assert.ok(!gesehen[k], 'doppelt an Tag ' + day + ': ' + k);
      gesehen[k] = 1;
    }
  }
});

test('Alte Spielstände bekommen ihre Frist nachgetragen', () => {
  const alt = { seq: 9, total: 0, done: {}, quests: [
    { id: 'q1_3', spirit: 'mira', type: QTYPE.GATHER, itemId: 'berry', need: 3, have: 0,
      turnedIn: false, day: 3, rewards: { coins: 1, ember: 1, items: [] }, hiddenIds: null },
  ] };
  const qb = QuestBook.fromJSON(alt);
  assert.equal(qb.active()[0].expires, 3 + lifetimeOf(QTYPE.GATHER));
});

test('Aufgaben sind nicht überwiegend Hol-und-Bring', () => {
  const ctx = makeCtx();
  const arten = Object.create(null);
  let gesamt = 0;
  for (let day = 2; day < 60; day++) {
    const qb = new QuestBook();
    qb.newDay(day, ctx.world, ctx);
    for (const q of qb.active()) { arten[q.type] = (arten[q.type] || 0) + 1; gesamt++; }
  }
  const holen = (arten[QTYPE.GATHER] || 0) + (arten[QTYPE.FIND] || 0);
  assert.ok(holen / gesamt < 0.45,
    'Sammeln und Finden machen ' + Math.round(holen / gesamt * 100) + '% aus');
  // Mindestens fünf verschiedene Arten kommen wirklich vor
  assert.ok(Object.keys(arten).length >= 5, 'zu wenig Abwechslung: ' + JSON.stringify(arten));
});

test('Sammelaufgabe: Fortschritt aus der Tasche, Abgabe verbraucht', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const q = {
    id: 'test1', spirit: 'mira', type: QTYPE.GATHER, itemId: 'berry',
    need: 3, have: 0, turnedIn: false, day: 1,
    rewards: { coins: 30, ember: 2, items: [] }, hiddenIds: null,
  };
  qb.quests.push(q);

  assert.equal(qb.progress(q, ctx), 0);
  assert.equal(qb.isReady(q, ctx), false);
  assert.equal(qb.turnIn(q, ctx), null, 'zu früh');

  ctx.inventory.add('berry', 5);
  assert.equal(qb.progress(q, ctx), 3);
  assert.ok(qb.isReady(q, ctx));

  const reward = qb.turnIn(q, ctx);
  assert.equal(reward.coins, 30);
  assert.equal(ctx.inventory.count('berry'), 2, 'genau drei verbraucht');
  assert.equal(qb.active().length, 0);
  assert.equal(qb.completedBySpirit.mira, 1);
  assert.equal(qb.totalCompleted, 1);
});

test('Sammelbitte zählt Sorten, nicht Stückzahl', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const q = {
    id: 'set1', spirit: 'mira', type: QTYPE.SET, itemId: null,
    items: ['berry', 'herb', 'resin'], setKey: 'wald', setName: 'Aus dem Wald',
    need: 3, have: 0, turnedIn: false, day: 1,
    rewards: { coins: 90, ember: 4, items: [] }, hiddenIds: null,
  };
  qb.quests.push(q);

  // Ein Sack voll Beeren erfüllt nichts – es fehlen zwei Sorten.
  ctx.inventory.add('berry', 20);
  assert.equal(qb.progress(q, ctx), 1, 'zwanzig Beeren sind trotzdem eine Sorte');
  assert.equal(qb.isReady(q, ctx), false);

  ctx.inventory.add('herb', 1);
  ctx.inventory.add('resin', 1);
  assert.equal(qb.progress(q, ctx), 3);

  assert.ok(qb.turnIn(q, ctx));
  // Von jeder Sorte genau eines, nicht der ganze Stapel.
  assert.equal(ctx.inventory.count('berry'), 19, 'der Beerenvorrat bleibt');
  assert.equal(ctx.inventory.count('herb'), 0);
  assert.equal(ctx.inventory.count('resin'), 0);
});

test('Botengang wird beim Ziel abgegeben, nicht beim Auftraggeber', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const q = {
    id: 'del1', spirit: 'mira', type: QTYPE.DELIVER, itemId: 'shell',
    turnInAt: 'flamey', need: 2, have: 0, turnedIn: false, day: 1,
    rewards: { coins: 50, ember: 3, items: [] }, hiddenIds: null,
  };
  qb.quests.push(q);
  ctx.inventory.add('shell', 2);

  assert.deepEqual(qb.openAtSpirit('flamey').map((x) => x.id), ['del1'],
    'abgegeben wird bei Flamey');
  assert.deepEqual(qb.openAtSpirit('mira'), [],
    'bei Mira steht nichts zum Abgeben');
  // Der Auftrag gehört aber weiter zu Mira – sie hat ihn gestellt.
  assert.deepEqual(qb.openForSpirit('mira').map((x) => x.id), ['del1']);

  assert.ok(qb.turnIn(q, ctx));
  assert.equal(ctx.inventory.count('shell'), 0);
  assert.equal(qb.completedBySpirit.mira, 1, 'die Freundschaft zählt beim Auftraggeber');
});

test('Botengang schickt nie zum Auftraggeber selbst zurück', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const rng = makeRng(7);
  let gesehen = 0;
  for (let i = 0; i < 400; i++) {
    const q = qb.generate('mira', 5, ctx.world, ctx, rng);
    if (!q || q.type !== QTYPE.DELIVER) continue;
    gesehen++;
    assert.notEqual(q.turnInAt, 'mira');
    assert.ok(ctx.world.isUnlocked(SPIRITS[q.turnInAt].region),
      'Ziel muss erreichbar sein: ' + q.turnInAt);
  }
  assert.ok(gesehen > 0, 'keine einzige Botengang-Bitte erzeugt');
});

test('Jede Sammel- und Botengangsorte ist ein echter Gegenstand', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const rng = makeRng(31);
  let geprueft = 0;
  for (let i = 0; i < 900; i++) {
    const q = qb.generate('flamey', 9, ctx.world, ctx, rng);
    if (!q) continue;
    const ids = q.type === QTYPE.SET ? q.items
      : (q.type === QTYPE.DELIVER || q.type === QTYPE.GROW) ? [q.itemId] : null;
    if (!ids) continue;
    for (const id of ids) {
      assert.ok(getItem(id), 'kein Gegenstand: ' + id);
      geprueft++;
    }
  }
  assert.ok(geprueft > 20, 'zu wenig geprüft: ' + geprueft);
});

test('Sammelbitte fordert lauter verschiedene Sorten', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const rng = makeRng(5);
  let gesehen = 0;
  for (let i = 0; i < 600; i++) {
    const q = qb.generate('kiesel', 9, ctx.world, ctx, rng);
    if (!q || q.type !== QTYPE.SET) continue;
    gesehen++;
    assert.equal(new Set(q.items).size, q.items.length, 'doppelt: ' + q.items);
    assert.equal(q.need, q.items.length);
    assert.ok(q.items.length >= 3);
  }
  assert.ok(gesehen > 0, 'keine einzige Sammelbitte erzeugt');
});

test('Suchaufgabe legt versteckte Fundstücke in der Welt ab', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const rng = makeRng(99);
  let quest = null;
  for (let i = 0; i < 40 && !quest; i++) {
    const q = qb.generate('mira', 1, ctx.world, ctx, rng);
    if (q.type === QTYPE.FIND) quest = q;
  }
  assert.ok(quest, 'eine Suchaufgabe erzeugt');
  assert.equal(quest.hiddenIds.length, quest.need);

  for (const id of quest.hiddenIds) {
    const e = ctx.world.byId[id];
    assert.ok(e, 'Fundstück existiert');
    assert.equal(e.kind, 'hidden');
    assert.equal(e.questId, quest.id);
  }

  qb.quests.push(quest);
  qb.notify('found', { questId: quest.id }, ctx);
  assert.equal(qb.progress(quest, ctx), 1);

  qb.dropHidden(quest, ctx.world);
  assert.equal(ctx.world.byId[quest.hiddenIds[0]], undefined);
});

test('Angel- und Brennaufgaben zählen Ereignisse', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const fishQ = {
    id: 'f1', spirit: 'kiesel', type: QTYPE.FISH, itemId: null, need: 2, have: 0,
    turnedIn: false, day: 1, rewards: { coins: 1, ember: 1, items: [] }, hiddenIds: null,
  };
  const burnQ = {
    id: 'b1', spirit: 'flamey', type: QTYPE.BURN, itemId: null, need: 5, have: 0,
    turnedIn: false, day: 1, rewards: { coins: 1, ember: 1, items: [] }, hiddenIds: null,
  };
  qb.quests.push(fishQ, burnQ);

  qb.notify('fish', {}, ctx);
  assert.equal(qb.progress(fishQ, ctx), 1);
  qb.notify('fish', {}, ctx);
  qb.notify('fish', {}, ctx);
  assert.equal(qb.progress(fishQ, ctx), 2, 'nicht über das Ziel hinaus');

  qb.notify('burn', { n: 9 }, ctx);
  assert.equal(qb.progress(burnQ, ctx), 5);
});

test('Aufgabenkarten haben Titel und vorhandenes Symbol', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  ctx.world.unlockRegion(1);
  ctx.world.unlockRegion(2);
  for (let day = 1; day <= 12; day++) qb.newDay(day, ctx.world, ctx);
  assert.ok(qb.active().length > 0);
  for (const q of qb.active()) {
    assert.ok(questTitle(q).length > 0);
    // Der Name muss zum Register passen; ob die Grafik existiert, prüft der
    // Browsertest – im Node-Lauf gibt es kein Canvas.
    assert.match(questIcon(q), /^icon_[a-z0-9_]+$/);
    assert.ok(q.rewards.coins > 0);
    assert.ok(q.need > 0);
  }
});

test('Aufgabenbuch überlebt Speichern und Laden', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  qb.newDay(1, ctx.world, ctx);
  const json = JSON.parse(JSON.stringify(qb.toJSON()));
  const back = QuestBook.fromJSON(json);
  assert.equal(back.active().length, qb.active().length);
  assert.equal(back.totalCompleted, qb.totalCompleted);
});

/* ---------------- Baubitten ---------------- */

/**
 * Ein Spiel mit einem Lagerfeuer einer bestimmten Stufe.
 *
 * `CAMPFIRE_LEVELS` nennt den Brennstoff je Stufe; hier wird so viel
 * eingelegt, dass genau diese Stufe erreicht ist.
 */
function ctxMitFeuer(stufe) {
  const ctx = makeCtx();
  const lvl = CAMPFIRE_LEVELS.filter((l) => l.level <= stufe).pop();
  ctx.state = { campfireFuel: lvl.fuel };
  return ctx;
}

test('Die Baubitten kommen aus den Bauplänen, nicht aus einer Handliste', () => {
  // Der Anlass: Zwölf neue Baupläne kamen dazu, und niemand bat um sie.
  // Jetzt genügt ein Rezept, damit auch gefragt werden kann.
  const alle = CRAFTABLE_ASKS;
  assert.ok(alle.length >= 15,
    'nur ' + alle.length + ' Baubitten – die Liste hinkt den Bauplänen hinterher');
  for (const id of alle) {
    const rec = RECIPES.find((r) => r.id === id);
    assert.ok(rec, id + ': dazu gibt es gar keinen Bauplan');
    assert.equal(rec.out && rec.out.id, id,
      id + ': der Bauplan liefert etwas anderes, die Bitte zeigt ins Leere');
  }
  // Die Gegenprobe: Jede Deko, die sich bauen lässt, kommt auch vor.
  for (const rec of RECIPES) {
    if (rec.kind !== 'item' || rec.once || rec.needs) continue;
    if (!rec.out || rec.out.id !== rec.id) continue;
    const bedingt = rec.cost.some((c) => { const z = getItem(c.id); return !!(z && z.onlyAt); });
    if (bedingt) continue;
    assert.ok(alle.indexOf(rec.id) >= 0, rec.name + ' steht im Bauplan, aber in keiner Bitte');
  }
});

test('Niemand bittet um Werkzeug, Tasche oder die einmalige Brücke', () => {
  for (const id of CRAFTABLE_ASKS) {
    const rec = RECIPES.find((r) => r.id === id);
    assert.equal(rec.kind, 'item', id + ': das kann man gar nicht abgeben');
    assert.ok(!rec.once, id + ': einmalig – nach dem ersten Mal unerfüllbar');
    assert.ok(!rec.needs, id + ': hängt an einem Meilenstein');
  }
});

test('Keine Baubitte hängt an Wetter oder Nachtzeit', () => {
  // Vier Tage Frist und kein einziger Nebeltag wären dieselbe tote Aufgabe,
  // die beim Fischfang schon einmal auffiel.
  for (const id of CRAFTABLE_ASKS) {
    const rec = RECIPES.find((r) => r.id === id);
    for (const c of rec.cost) {
      const z = getItem(c.id);
      assert.ok(!(z && z.onlyAt),
        id + ' braucht ' + c.id + ', und das gibt es nur bei ' + z.onlyAt);
    }
  }
});

test('Am kleinen Feuer wird nur erbeten, was am kleinen Feuer geht', () => {
  // Der eigentliche Fehler: Die alte Liste enthielt Laterne und Vogelhaus,
  // beide ab Stufe 2. Wer am ersten Tag danach gefragt wurde, bekam an der
  // Werkbank „Das Feuer ist noch zu klein" und sah vier Tage lang zu.
  for (let stufe = 1; stufe <= 3; stufe++) {
    const pool = craftableAsks(stufe);
    assert.ok(pool.length > 0, 'Stufe ' + stufe + ': gar nichts zu bauen');
    for (const id of pool) {
      const rec = RECIPES.find((r) => r.id === id);
      assert.ok((rec.fire || 1) <= stufe,
        'Stufe ' + stufe + ': ' + id + ' braucht Feuerstufe ' + rec.fire);
    }
  }
});

test('Ein größeres Feuer macht die Bitten reicher', () => {
  const a = craftableAsks(1);
  const b = craftableAsks(2);
  const c = craftableAsks(3);
  assert.ok(b.length > a.length, 'Stufe 2 bringt nichts Neues');
  assert.ok(c.length > b.length, 'Stufe 3 bringt nichts Neues');
  // Und nichts fällt wieder weg – was man einmal bauen konnte, bleibt.
  for (const id of a) assert.ok(b.indexOf(id) >= 0, id + ' verschwindet bei Stufe 2');
  for (const id of b) assert.ok(c.indexOf(id) >= 0, id + ' verschwindet bei Stufe 3');
});

test('Am ersten Tag ist jede Baubitte auch wirklich baubar', () => {
  // Die Probe am laufenden Aufgabenbuch statt nur an der Liste: Hier hängt
  // alles zusammen – Feuerstufe, Bittenwahl und was die Werkbank hergibt.
  const ctx = ctxMitFeuer(1);
  const qb = new QuestBook();
  let gesehen = 0;
  for (let tag = 1; tag <= 40; tag++) {
    qb.newDay(tag, ctx.world, ctx);
    for (const q of qb.active()) {
      if (q.type !== QTYPE.CRAFT) continue;
      gesehen++;
      const rec = RECIPES.find((r) => r.out && r.out.id === q.itemId && r.id === q.itemId);
      assert.ok(rec, q.itemId + ': keine Bauanleitung');
      assert.equal(rec.fire || 1, 1,
        'Tag ' + tag + ': „' + q.itemId + '" braucht Feuerstufe ' + rec.fire +
        ', das Feuer hat 1');
    }
    for (const q of qb.active()) q.expires = tag;   // Platz für den nächsten Tag
  }
  assert.ok(gesehen >= 5, 'nur ' + gesehen + ' Baubitten in 40 Tagen – prüft nichts');
});

/* ---------------- Kochbitten ---------------- */

test('Um jedes Gericht kann gebeten werden – bis auf das vom Wetter', () => {
  // Die Küche war das einzige System des Spiels, das an keiner Bitte hing:
  // kochen, verkaufen, verschenken – aber niemand hat je danach gefragt.
  assert.ok(COOK_ASKS.length >= 6, 'nur ' + COOK_ASKS.length + ' Gerichte erbittbar');
  for (const id of COOK_ASKS) {
    assert.ok(gerichtFuer(id), id + ': das ist gar kein Gericht');
    assert.ok(getItem(id), id + ': den Gegenstand gibt es nicht');
  }
  // Die Gegenprobe: Was fehlt, fehlt aus genau einem Grund.
  for (const g of GERICHTE) {
    if (COOK_ASKS.indexOf(g.id) >= 0) continue;
    const wetter = g.zutaten.some((z) => !verlaesslich(z.id));
    assert.ok(wetter, g.name + ' fehlt in den Kochbitten, hängt aber an keinem Wetter');
  }
});

test('Keine Kochbitte wartet auf Regen oder Nebel', () => {
  // Sechs Tage Frist und kein einziger Regentag wären dieselbe tote Aufgabe,
  // die beim Fischfang schon einmal auffiel.
  for (const id of COOK_ASKS) {
    for (const z of gerichtFuer(id).zutaten) {
      const it = getItem(z.id);
      assert.ok(verlaesslich(z.id),
        id + ' braucht ' + z.id + ', und das gibt es nur bei ' + (it && it.onlyAt));
    }
  }
});

test('Die Nacht zählt als verlässlich, das Wetter nicht', () => {
  // Der Unterschied, um den es geht: Die Nacht kommt jeden Tag, der Nebel
  // vielleicht die ganze Woche nicht.
  assert.equal(verlaesslich('moonflower'), true, 'die Nacht kommt jeden Tag');
  assert.equal(verlaesslich('rainmushroom'), false);
  assert.equal(verlaesslich('fogcrystal'), false);
  assert.equal(verlaesslich('berry'), true);
  assert.equal(verlaesslich('gibtsnicht'), true, 'Unbekanntes darf nicht alles sperren');
  // Und der Mondblütenkuchen ist deshalb wirklich dabei – sonst prüfte der
  // Satz oben nur eine Regel ohne Fall.
  assert.ok(COOK_ASKS.indexOf('dish_mooncake') >= 0, 'die Nachtzutat wird doch gesperrt');
});

test('Eine Kochbitte nimmt das Gericht und zahlt dafür', () => {
  const ctx = makeCtx();
  const qb = new QuestBook();
  const q = {
    id: 'koch1', spirit: 'mira', type: QTYPE.COOK, itemId: 'dish_forestsoup',
    need: 1, have: 0, turnedIn: false, day: 1, expires: 7,
    rewards: { coins: 87, ember: 2, items: [] }, hiddenIds: null,
  };
  qb.quests.push(q);

  assert.equal(qb.progress(q, ctx), 0, 'ohne Suppe kein Fortschritt');
  assert.equal(qb.isReady(q, ctx), false);
  assert.equal(qb.turnIn(q, ctx), null, 'abgeben geht noch nicht');

  ctx.inventory.add('dish_forestsoup', 1);
  assert.equal(qb.progress(q, ctx), 1);
  assert.equal(qb.isReady(q, ctx), true);
  const lohn = qb.turnIn(q, ctx);
  assert.ok(lohn && lohn.coins > 0, 'nichts bezahlt');
  assert.equal(ctx.inventory.count('dish_forestsoup'), 0, 'die Suppe liegt noch in der Tasche');
  assert.equal(qb.totalCompleted, 1);
});

test('Kochbitten kommen im laufenden Spiel wirklich vor', () => {
  // Ein Auftragstyp, den niemand vergibt, ist toter Code. Gemessen an einem
  // echten Aufgabenbuch über vierzig Tage.
  const ctx = makeCtx();
  for (let r = 1; r <= 3; r++) ctx.world.unlockRegion(r);
  const qb = new QuestBook();
  const wer = Object.create(null);
  let n = 0;
  for (let tag = 1; tag <= 40; tag++) {
    qb.newDay(tag, ctx.world, ctx);
    for (const q of qb.active()) {
      if (q.type !== QTYPE.COOK) continue;
      n++;
      wer[q.spirit] = 1;
      assert.ok(COOK_ASKS.indexOf(q.itemId) >= 0, 'Tag ' + tag + ': ' + q.itemId + ' steht nicht im Topf');
      assert.equal(questIcon(q), 'icon_' + q.itemId);
      assert.ok(/kochen$/.test(questTitle(q)), 'seltsamer Titel: ' + questTitle(q));
    }
    for (const q of qb.active()) q.expires = tag;
  }
  assert.ok(n >= 5, 'nur ' + n + ' Kochbitten in 40 Tagen');
  assert.ok(Object.keys(wer).length >= 2,
    'nur ein einziger Geist kocht je – dann ist es seine Eigenart und kein Auftragstyp');
});

test('Eine Kochbitte gilt länger als jede Holbitte', () => {
  // Zutaten von drei Stellen holen und dann ans Feuer: Das ist die längste
  // Kette, die eine Bitte in diesem Spiel auslöst.
  assert.ok(lifetimeOf(QTYPE.COOK) > lifetimeOf(QTYPE.GATHER));
  assert.ok(lifetimeOf(QTYPE.COOK) >= lifetimeOf(QTYPE.CRAFT));
});

/* ---------------- Tageslauf ---------------- */

test('Uhr läuft und endet beim Schlafenszeitpunkt', () => {
  const c = new DayCycle(1); // eine Minute pro Tag – schnell durchlaufen
  assert.equal(c.hour, DAY_START);
  assert.equal(c.clockString(), '06:00');
  assert.equal(c.isNight(), false);

  let ended = false;
  for (let i = 0; i < 60 * 10 && !ended; i++) ended = c.update(0.1);
  assert.ok(ended, 'Tag endet');
  assert.equal(c.hour, DAY_END);
  assert.ok(c.isNight());

  const dayBefore = c.day;
  c.sleep();
  assert.equal(c.day, dayBefore + 1);
  assert.equal(c.hour, DAY_START);
});

test('Tagesfärbung ist mittags neutral und nachts dunkel', () => {
  const c = new DayCycle(14);
  c.hour = 13;
  assert.ok(c.tint().a < 0.02, 'mittags ohne Schleier');
  c.hour = 23;
  const night = c.tint();
  assert.ok(night.a > 0.4, 'nachts dunkel');
  assert.ok(night.b > night.r, 'kühler Ton');
  assert.ok(c.isDark());
});

test('Tageslauf lässt sich sichern', () => {
  const c = new DayCycle(9);
  c.day = 5;
  c.hour = 14.25;
  const back = DayCycle.fromJSON(JSON.parse(JSON.stringify(c.toJSON())));
  assert.equal(back.day, 5);
  assert.equal(back.clockString(), '14:15');
  assert.equal(back.dayMinutes, 9);
});

/* ---------------- Angeln ---------------- */

test('Angel-Minispiel durchläuft alle Zustände', () => {
  const world = new World(SEED);
  const player = { facingPoint: () => ({ x: 32, y: 32 }) }; // offenes Meer am Kartenrand
  const f = new Fishing();
  const rng = makeRng(7);

  assert.ok(world.waterAt(32, 32), 'dort ist Wasser');
  assert.ok(f.cast(world, player, rng, false, 1));
  assert.ok(f.active);
  assert.ok(f.fish);

  let sawBite = false;
  for (let i = 0; i < 400; i++) {
    const ev = f.update(0.05);
    if (ev === 'bite') { sawBite = true; break; }
  }
  assert.ok(sawBite, 'es beisst');

  assert.equal(f.press(), 'hooked');
  assert.equal(f.state, 'reel');

  // Marker in die Zone schieben, dann drücken
  f.marker = f.zoneStart + f.zoneSize / 2;
  assert.equal(f.press(), 'catch');
  assert.ok(f.result.fish);
  assert.equal(f.active, false);
});

test('Ausserhalb der Zone gibt es keinen Fisch', () => {
  const world = new World(SEED);
  const player = { facingPoint: () => ({ x: 32, y: 32 }) };
  const f = new Fishing();
  f.cast(world, player, makeRng(3), false, 1);
  for (let i = 0; i < 400; i++) if (f.update(0.05) === 'bite') break;
  f.press();
  f.marker = f.zoneStart > 0.5 ? 0 : 1;
  assert.equal(f.press(), 'miss');
});

test('An Land kann man nicht auswerfen', () => {
  const world = new World(SEED).populate();
  const camp = world.campfire;
  const player = { facingPoint: () => ({ x: camp.x, y: camp.y }) };
  const f = new Fishing();
  assert.equal(f.cast(world, player, makeRng(1), false, 1), false);
  assert.equal(f.active, false);
});

test('Bessere Angel macht die Zone größer', () => {
  const world = new World(SEED);
  const player = { facingPoint: () => ({ x: 32, y: 32 }) };
  const a = new Fishing();
  const b = new Fishing();
  a.cast(world, player, makeRng(5), false, 1);
  b.cast(world, player, makeRng(5), false, 2);
  assert.ok(b.zoneSize > a.zoneSize);
});

/* ---------------- Laden ---------------- */

test('Laden wechselt täglich, aber reproduzierbar', () => {
  const s1 = new Shop().refresh(3, SEED);
  const s2 = new Shop().refresh(3, SEED);
  const s3 = new Shop().refresh(4, SEED);
  assert.deepEqual(s1.stock, s2.stock, 'gleicher Tag, gleiches Angebot');
  // Vier bis sechs wechselnde Waren plus die Saat, die immer liegt
  const wechselnd = s1.stock.filter((x) => getItem(x.id).cat !== CAT.SEED);
  assert.ok(wechselnd.length >= 4 && wechselnd.length <= 6,
    'wechselnde Waren: ' + wechselnd.length);
  assert.notDeepEqual(s1.stock.map((s) => s.id), s3.stock.map((s) => s.id));
  assert.ok(s1.wanted);
});

test('Saat gibt es jeden Tag zu kaufen', () => {
  // Ein Garten, für den man auf das richtige Tagesangebot warten muss, ist
  // keiner. Deshalb liegen die drei einfachen Saaten immer im Regal.
  for (let day = 1; day <= 30; day++) {
    const shop = new Shop().refresh(day, SEED);
    const ids = shop.stock.map((x) => x.id);
    for (const id of ['seed_berry', 'seed_herb', 'seed_flower']) {
      assert.ok(ids.indexOf(id) >= 0, 'Tag ' + day + ': ' + id + ' fehlt');
    }
  }
  // Die Mondsaat kommt nur manchmal – sonst wäre sie nichts Besonderes
  let mondTage = 0;
  for (let day = 1; day <= 60; day++) {
    const shop = new Shop().refresh(day, SEED);
    if (shop.stock.some((x) => x.id === 'seed_moon')) mondTage++;
  }
  assert.ok(mondTage > 5 && mondTage < 40, 'Mondsaat an ' + mondTage + ' von 60 Tagen');
});

test('Tagesgesuch zahlt mehr', () => {
  const shop = new Shop().refresh(2, SEED);
  const normal = shop.sellPrice('stone');
  assert.ok(normal > 0);
  shop.wanted = 'stone';
  shop.wantedBonus = 3;
  assert.equal(shop.sellPrice('stone'), 9);
  assert.equal(shop.sellPrice('memory_locket'), 0, 'Erinnerungen sind unverkäuflich');
});

test('Kaufpreis liegt über dem Verkaufspreis', () => {
  for (const id of ['wood', 'stone', 'fiber', 'resin']) {
    assert.ok(buyPrice(id) > new Shop().sellPrice(id), id);
  }
});

test('Warenbestand nimmt beim Kauf ab', () => {
  const shop = new Shop().refresh(5, SEED);
  const entry = shop.stock[0];
  const before = entry.left;
  assert.equal(shop.take(entry.id, 1), 1);
  assert.equal(shop.entry(entry.id).left, before - 1);
  assert.equal(shop.take(entry.id, 999), before - 1, 'nie mehr als vorhanden');
});

/* ---------------- Farbfeld ---------------- */

test('Farbfeld wächst und deckt Fläche ab', () => {
  const world = new World(SEED).populate();
  const cf = new ColorField();
  assert.equal(cf.coverage(world), 0);

  cf.addSource(world.campfire.x, world.campfire.y, 460, 'campfire');
  for (let i = 0; i < 200; i++) cf.update(0.05);
  const src = cf.find('campfire');
  assert.ok(Math.abs(src.r - 460) < 1, 'Radius erreicht: ' + src.r);
  assert.equal(cf.at(world.campfire.x, world.campfire.y), 1);
  assert.equal(cf.at(world.campfire.x + 1600, world.campfire.y), 0);

  const cov = cf.coverage(world);
  assert.ok(cov > 0 && cov < 0.5, 'Teilabdeckung: ' + cov);

  cf.grow('campfire', 240);
  for (let i = 0; i < 200; i++) cf.update(0.05);
  assert.ok(cf.coverage(world) > cov, 'mehr Farbe nach dem Wachsen');
});

test('Farbfeld überlebt Speichern und Laden', () => {
  const cf = new ColorField();
  cf.addSource(100, 200, 80, 'spirit_mira');
  for (let i = 0; i < 100; i++) cf.update(0.05);
  const back = ColorField.fromJSON(JSON.parse(JSON.stringify(cf.toJSON())));
  assert.equal(back.sources.length, 1);
  assert.equal(back.find('spirit_mira').x, 100);
  assert.ok(back.at(100, 200) > 0.9);
});

/* ---------------- Zufall ---------------- */

test('Zufallsgenerator ist deterministisch und gleichverteilt', () => {
  const a = makeRng(42);
  const b = makeRng(42);
  const values = [];
  for (let i = 0; i < 1000; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
    values.push(v);
  }
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05, 'Mittelwert ' + mean);
});

test('Tageszufall unterscheidet sich pro Tag und Zweck', () => {
  assert.equal(dailyRng(1, 5, 'quests')(), dailyRng(1, 5, 'quests')());
  assert.notEqual(dailyRng(1, 5, 'quests')(), dailyRng(1, 6, 'quests')());
  assert.notEqual(dailyRng(1, 5, 'quests')(), dailyRng(1, 5, 'shop')());
});

test('Rauschfunktion bleibt im Wertebereich', () => {
  const n = makeNoise2D(7);
  for (let i = 0; i < 500; i++) {
    const v = fbm(n, i * 0.13, i * 0.07, 4, 2, 0.5);
    assert.ok(v >= 0 && v <= 1, 'Wert ' + v);
  }
});

test('Wetter hängt nur an Insel und Tag', () => {
  for (let day = 2; day < 40; day++) {
    const a = weatherFor(1234, day);
    const b = weatherFor(1234, day);
    assert.deepEqual(a, b, 'Tag ' + day + ' muss reproduzierbar sein');
  }
});

test('Der erste Tag ist immer klar', () => {
  for (let seed = 1; seed < 60; seed++) {
    assert.equal(weatherFor(seed, 1).kind, WEATHER.CLEAR);
    assert.equal(weatherFor(seed, 1).strength, 0);
  }
});

test('Wetter bleibt überwiegend klar, aber nicht immer', () => {
  const count = { clear: 0, rain: 0, fog: 0 };
  for (let day = 2; day < 400; day++) count[weatherFor(99, day).kind]++;
  assert.ok(count.clear > count.rain + count.fog,
    'klare Tage sollen überwiegen: ' + JSON.stringify(count));
  assert.ok(count.rain > 10, 'es soll auch regnen: ' + count.rain);
  assert.ok(count.fog > 10, 'es soll auch neblig sein: ' + count.fog);
});

test('Wetterstärke bleibt im Wertebereich', () => {
  for (let day = 1; day < 300; day++) {
    const w = weatherFor(7, day);
    assert.ok(w.strength >= 0 && w.strength <= 1, 'Stärke ' + w.strength);
    if (w.kind === WEATHER.CLEAR) assert.equal(w.strength, 0);
    else assert.ok(w.strength > 0.3, 'sichtbares Wetter braucht Stärke');
  }
});

test('Das Fundbuch merkt sich alles, was durch die Tasche ging', () => {
  const inv = new Inventory(4);
  assert.equal(inv.everFound('wood'), false);
  inv.add('wood', 3);
  assert.equal(inv.everFound('wood'), true);
  assert.equal(inv.found.wood, 3);

  // Wieder weggeben löscht den Eintrag nicht
  inv.remove('wood', 3);
  assert.equal(inv.count('wood'), 0);
  assert.equal(inv.everFound('wood'), true);

  // Nachschub zählt dazu
  inv.add('wood', 2);
  assert.equal(inv.found.wood, 5);
});

test('Das Fundbuch zählt nur, was wirklich Platz hatte', () => {
  const inv = new Inventory(1);
  inv.add('wood', 99);
  const before = inv.found.wood;
  inv.add('stone', 5);          // kein Platz mehr
  assert.equal(inv.count('stone'), 0);
  assert.equal(inv.everFound('stone'), false);
  assert.equal(inv.found.wood, before);
});

test('Das Fundbuch überlebt Speichern und Laden', () => {
  const inv = new Inventory(10);
  inv.add('shell', 2);
  inv.add('berry', 1);
  inv.remove('berry', 1);
  const back = Inventory.fromJSON(JSON.parse(JSON.stringify(inv.toJSON())));
  assert.equal(back.everFound('shell'), true);
  assert.equal(back.everFound('berry'), true);
  assert.equal(back.foundCount(), 2);
});

test('Alte Spielstände ohne Fundbuch bekommen eines aus der Tasche', () => {
  const back = Inventory.fromJSON({ capacity: 10, slots: [{ id: 'wood', n: 4 }] });
  assert.equal(back.everFound('wood'), true);
  assert.equal(back.found.wood, 4);
});

test('Freundschaft schenkt ab Stufe 1 und wird größer', () => {
  for (const id of SPIRIT_IDS) {
    assert.equal(friendshipGift(id, 0), null, id + ' darf auf Stufe 0 nichts geben');
    const low = friendshipGift(id, 1);
    const high = friendshipGift(id, 8);
    assert.ok(low.coins > 0 && low.ember > 0, id + ' Stufe 1');
    assert.ok(high.coins > low.coins, id + ': höhere Stufe muss mehr geben');
    assert.ok(high.ember >= low.ember, id + ': Glut darf nicht schrumpfen');
  }
});

test('Geschenke verweisen nur auf echte Gegenstände', () => {
  for (const id of SPIRIT_IDS) {
    for (let level = 1; level <= 10; level++) {
      const gift = friendshipGift(id, level);
      for (const entry of gift.items) {
        assert.ok(getItem(entry.id), id + ' Stufe ' + level + ': ' + entry.id + ' gibt es nicht');
        assert.ok(entry.n > 0);
      }
    }
  }
});

test('Ein Erinnerungsstück erst ab Stufe 5', () => {
  assert.equal(friendshipGift('mira', 4).items.some((i) => i.id === 'gem'), false);
  assert.equal(friendshipGift('mira', 5).items.some((i) => i.id === 'gem'), true);
});

test('Freundschaftsstufe steigt alle drei Aufgaben und deckelt bei 10', () => {
  assert.equal(friendshipLevel(0), 0);
  assert.equal(friendshipLevel(2), 0);
  assert.equal(friendshipLevel(3), 1);
  assert.equal(friendshipLevel(29), 9);
  assert.equal(friendshipLevel(30), 10);
  assert.equal(friendshipLevel(300), 10);
});

test('Jeder Geist hat eine Erinnerungskette mit vier Symbolen', () => {
  for (const id of SPIRIT_IDS) {
    const st = STORIES[id];
    assert.ok(st, id + ' braucht eine Kette');
    assert.equal(st.icons.length, STAGES, id + ': vier Stufen');
    assert.ok(keepsakeOf(id), id + ' braucht ein Andenken');
  }
});

test('Andenken sind echte, aufstellbare Gegenstände', () => {
  for (const id of SPIRIT_IDS) {
    const item = getItem(keepsakeOf(id));
    assert.ok(item, id + ': Andenken fehlt in der Gegenstandsliste');
    assert.ok(item.prop, id + ': Andenken muss aufstellbar sein');
    assert.equal(item.value, 0, id + ': Andenken darf man nicht verkaufen');
    assert.equal(item.burn, 0, id + ': Andenken darf man nicht verbrennen');
  }
});

test('Ein Stück erscheint erst nach genug Aufgaben, und nur eines', () => {
  const b = new StoryBook();
  assert.equal(b.wantsPiece('flamey', 0), false);
  assert.equal(b.wantsPiece('flamey', QUESTS_PER_STAGE - 1), false);
  assert.equal(b.wantsPiece('flamey', QUESTS_PER_STAGE), true);

  b.markPlaced('flamey', 0);
  assert.equal(b.wantsPiece('flamey', 99), false, 'solange eines liegt, kein zweites');

  b.collect('flamey');
  assert.equal(b.foundOf('flamey'), 1);
  assert.equal(b.wantsPiece('flamey', QUESTS_PER_STAGE), false, 'Stufe 2 braucht mehr');
  assert.equal(b.wantsPiece('flamey', QUESTS_PER_STAGE * 2), true);
});

test('Eine volle Kette liefert nichts mehr nach', () => {
  const b = new StoryBook();
  for (let k = 0; k < STAGES; k++) { b.markPlaced('mira', k); b.collect('mira'); }
  assert.equal(b.isComplete('mira'), true);
  assert.equal(b.foundOf('mira'), STAGES);
  assert.equal(b.wantsPiece('mira', 999), false);
  // Weiter einsammeln darf nicht über vier hinausgehen
  b.collect('mira');
  assert.equal(b.foundOf('mira'), STAGES);
});

test('Das Geschichtsbuch überlebt Speichern und Laden', () => {
  const b = new StoryBook();
  b.markPlaced('bruno', 0);
  b.collect('bruno');
  b.markPlaced('nelly', 0);
  const back = StoryBook.fromJSON(JSON.parse(JSON.stringify(b.toJSON())));
  assert.equal(back.foundOf('bruno'), 1);
  assert.equal(back.placed.nelly, 0);
  assert.equal(back.completeCount(), 0);
});

test('Beschädigte Spielstände brechen das Geschichtsbuch nicht', () => {
  const back = StoryBook.fromJSON({ found: { flamey: 99, mira: -5, gibtsnicht: 3 } });
  assert.equal(back.foundOf('flamey'), STAGES, 'auf vier gedeckelt');
  assert.equal(back.foundOf('mira'), 0, 'nicht negativ');
  assert.equal(back.completeCount(), 1);
});

test('Alle Symbole der Ketten verweisen auf angelegte Grafiken', () => {
  const icons = Object.create(null);
  for (const item of ITEM_LIST) icons[item.icon] = true;
  for (const id of SPIRIT_IDS) {
    for (let k = 0; k < STAGES; k++) {
      const name = storyIcon(id, k);
      assert.ok(name.indexOf('icon_') === 0, id + ' Stufe ' + k + ': ' + name);
    }
  }
});

test('Wetter- und Nachtvorkommen sind sauber definiert', () => {
  const bedingt = ITEM_LIST.filter((i) => i.onlyAt);
  assert.equal(bedingt.length, 3, 'Mondblume, Regenpilz, Nebelkristall');
  const arten = bedingt.map((i) => i.onlyAt).sort();
  assert.deepEqual(arten, ['fog', 'night', 'rain']);
  for (const item of bedingt) {
    assert.ok(item.value > 20, item.id + ' soll sich lohnen: ' + item.value);
    assert.ok(ENTITY_DEFS[item.id], item.id + ' braucht eine Objektdefinition');
    assert.equal(ENTITY_DEFS[item.id].category, 'forage');
    // Kein respawn: sie kommen über die Bedingung zurück, nicht über Tage
    assert.equal(ENTITY_DEFS[item.id].respawn, undefined, item.id);
  }
});

test('Die Mondlaterne braucht die bedingten Funde', () => {
  const rec = RECIPES.find((r) => r.id === 'moonlamp');
  assert.ok(rec, 'Rezept fehlt');
  const zutaten = rec.cost.map((c) => c.id);
  assert.ok(zutaten.indexOf('moonflower') >= 0, 'braucht Mondblume');
  assert.ok(zutaten.indexOf('fogcrystal') >= 0, 'braucht Nebelkristall');
  const lampe = getItem('moonlamp');
  assert.ok(lampe.light > getItem('lantern').light, 'leuchtet weiter als die Laterne');
});

test('Neue Aufgabenarten: Fangen zählt nur den richtigen Fisch', () => {
  const qb = new QuestBook();
  const q = { id: 'x', type: QTYPE.CATCH, itemId: 'fish_cod', have: 0, need: 1 };
  qb.quests.push(q);
  qb.notify('fish', { id: 'fish_sardine' }, null);
  assert.equal(q.have, 0, 'falscher Fisch darf nicht zählen');
  qb.notify('fish', { id: 'fish_cod' }, null);
  assert.equal(q.have, 1);
});

test('Neue Aufgabenarten: Hingehen zählt erst am Ziel', () => {
  const qb = new QuestBook();
  const q = { id: 'y', type: QTYPE.VISIT, spot: { x: 1000, y: 1000 }, have: 0, need: 1 };
  qb.quests.push(q);
  qb.notify('visit', { x: 1400, y: 1000 }, null);
  assert.equal(q.have, 0, 'weit weg zählt nicht');
  qb.notify('visit', { x: 1040, y: 1010 }, null);
  assert.equal(q.have, 1, 'nah genug zählt');
});

test('Jede Aufgabenart hat Titel, Verb und Symbol', () => {
  for (const key of Object.keys(QTYPE)) {
    const type = QTYPE[key];
    // Eine Attrappe mit allen Feldern, die irgendeine Art liest – so fällt
    // auf, wenn eine neue Art einen Titel ohne passendes Feld baut.
    const q = {
      type: type, itemId: 'wood', need: 2, have: 0, spot: { x: 0, y: 0 },
      items: ['berry', 'herb', 'resin'], setKey: 'wald', setName: 'Aus dem Wald',
      turnInAt: 'flamey',
    };
    const titel = questTitle(q);
    assert.ok(titel && titel.length > 0, type + ' braucht einen Titel');
    assert.ok(titel.length <= 34, type + ': Titel zu lang – "' + titel + '"');
    assert.ok(QUEST_VERB[type], type + ' braucht ein Verb');
    assert.ok(questIcon(q).indexOf('icon_') === 0, type + ' braucht ein Symbol');
  }
});


/* ---------------- Gemütlichkeit ---------------- */

/** Kleine Welt-Attrappe: ein Geist an (0,0) und ein paar Deko-Stücke. */
function fakeWorld(decor) {
  const spirit = { x: 0, y: 0, kind: 'spirit' };
  const list = decor.map((d) => ({
    kind: 'decor', itemId: d.id, x: d.x || 0, y: d.y || 0, gone: !!d.gone,
  }));
  return {
    spiritEntity: () => spirit,
    queryNear: () => list,
  };
}

test('Gemütlichkeit zählt Charme, nicht Stücke', () => {
  // Drei Steinwege (je 1) sind weniger wert als eine Mondlaterne (9).
  const wege = charmAround(fakeWorld([
    { id: 'path_tile' }, { id: 'path_tile' }, { id: 'path_tile' },
  ]), 'mira', getItem);
  const lampe = charmAround(fakeWorld([{ id: 'moonlamp' }]), 'mira', getItem);
  assert.equal(wege, 3);
  assert.equal(lampe, 9);
  assert.ok(lampe > wege, 'teure Deko muss mehr zählen');
});

test('Gemütlichkeit ignoriert Entferntes und Abgeräumtes', () => {
  const weit = charmAround(fakeWorld([
    { id: 'moonlamp', x: COSY_RADIUS + 40 },
  ]), 'mira', getItem);
  assert.equal(weit, 0, 'außerhalb des Umkreises zählt nicht');

  const weg = charmAround(fakeWorld([{ id: 'moonlamp', gone: true }]), 'mira', getItem);
  assert.equal(weg, 0, 'eingepackte Deko zählt nicht');
});

test('Gemütlichkeitsstufen steigen monoton und decken die Schwellen', () => {
  assert.equal(cosyLevel(0), 0);
  assert.equal(cosyLevel(COSY_STEPS[0] - 1), 0);
  for (let i = 0; i < COSY_STEPS.length; i++) {
    assert.equal(cosyLevel(COSY_STEPS[i]), i + 1, 'Schwelle ' + COSY_STEPS[i]);
  }
  assert.equal(cosyLevel(9999), COSY_MAX, 'nie über die höchste Stufe');

  let last = -1;
  for (let p = 0; p <= 100; p++) {
    const lvl = cosyLevel(p);
    assert.ok(lvl >= last, 'darf bei mehr Punkten nicht fallen');
    last = lvl;
  }
});

test('Bis zur nächsten Stufe fehlt genau die Differenz', () => {
  for (let i = 0; i < COSY_STEPS.length; i++) {
    const knapp = COSY_STEPS[i] - 1;
    if (i > 0 && knapp < COSY_STEPS[i - 1]) continue;
    assert.equal(pointsToNext(knapp), 1, 'bei ' + knapp + ' fehlt genau 1');
  }
  assert.equal(pointsToNext(9999), null, 'auf der höchsten Stufe fehlt nichts');
});

test('Der Deko-Farbkreis wächst, ist aber gedeckelt', () => {
  assert.equal(cosyRadius(0), 0, 'ohne Deko kein Kreis');
  assert.ok(cosyRadius(10) > cosyRadius(5), 'mehr Punkte, größerer Kreis');
  assert.ok(cosyRadius(100000) <= 430, 'gedeckelt – Farbe kommt weiter von Aufgaben');
});

test('Lohnaufschlag steigt mit der Stufe und ist nie kleiner als 1', () => {
  assert.equal(rewardFactor(0), 1);
  for (let l = 1; l <= COSY_MAX; l++) {
    assert.ok(rewardFactor(l) > rewardFactor(l - 1), 'Stufe ' + l);
  }
  assert.ok(rewardFactor(COSY_MAX) < 1.7, 'Aufschlag darf den Lohn nicht verdoppeln');
});

test('Jedes aufstellbare Stück trägt Charme', () => {
  for (const item of ITEM_LIST) {
    if (item.cat !== CAT.DECOR || !item.prop) continue;
    assert.ok(item.charm > 0, item.id + ' braucht einen Charme-Wert');
  }
});

test('Farbfeld kann auch wieder schrumpfen', () => {
  const f = new ColorField();
  f.setTarget(100, 100, 300, 'cosy_test');
  for (let i = 0; i < 400; i++) f.update(1 / 60);
  assert.ok(f.find('cosy_test').r > 290, 'wächst auf das Ziel, war ' + f.find('cosy_test').r);
  f.setTarget(100, 100, 0, 'cosy_test');
  for (let i = 0; i < 800; i++) f.update(1 / 60);
  assert.ok(f.find('cosy_test').r < 1, 'schrumpft wieder, war ' + f.find('cosy_test').r);
});

test('Erledigtes bleibt: grow schrumpft nie', () => {
  const f = new ColorField();
  f.addSource(0, 0, 200, 'spirit_x');
  f.grow('spirit_x', 100);
  assert.equal(f.find('spirit_x').target, 300);
  f.grow('spirit_x', 0);
  assert.equal(f.find('spirit_x').target, 300, 'grow darf nichts wegnehmen');
});
