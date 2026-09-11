/**
 * Die Wirtschaft – steht der Lohn im Verhältnis zu den Zielen?
 *
 * Der Anlass war eine Messung, die das ganze Spiel betraf: Wer an einem Tag
 * alle 21 offenen Bitten erledigte, verdiente **3 400 bis 6 000 Münzen**.
 * Alles, was es im Spiel überhaupt zu kaufen gab – Vorratstruhe, Bucht und
 * der komplette Katalog –, kostete zusammen **30 085**. Das Spiel war nach
 * sechs bis acht Tagen leergekauft, während die Farbanzeige rund sechzehn
 * Tage braucht. Man besaß alles, lange bevor die Insel fertig war, und ab da
 * war jede weitere Münze bedeutungslos.
 *
 * Bei der Glut war es noch deutlicher: 460 für das gesamte Lagergrundstück
 * gegen 130 bis 250 am Tag – zwei Tage für etwas, das im eigenen Text „ein
 * Vorhaben, kein Nachmittag" heißt.
 *
 * Kein einziger Test hat das gesehen, weil alle Tests die Zahlen EINZELN
 * prüften. Dieser hier prüft das VERHÄLTNIS, und das ist die Größe, an der
 * ein Spiel zu früh zu Ende ist.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { QuestBook, QTYPE } from '../../src/game/quests.js';
import { World } from '../../src/world/world.js';
import { Inventory } from '../../src/game/inventory.js';
import { SEASONS } from '../../src/game/calendar.js';
import { STAGES as TRUHE } from '../../src/game/loan.js';
import { PLOT_STAGES, ISLE_PLOT_STAGES } from '../../src/game/plot.js';
import { KATALOG } from '../../src/game/catalog.js';
import { Shop } from '../../src/game/shop.js';
import { getItem } from '../../src/game/items.js';
import { gerichtFuer, zutatenWert } from '../../src/game/kitchen.js';

const SEED = 4711;

/**
 * Was ein Tag einbringt, wenn man ALLES erledigt.
 *
 * Die Obergrenze also, nicht der Normalfall – und genau die ist der Maßstab:
 * Ein Ziel, das dem fleißigsten Spieler in zwei Tagen zufällt, ist für alle
 * anderen auch keines.
 */
function tagesLohn(tag, freundStufe) {
  const welt = new World(SEED).populate();
  for (let r = 1; r <= 3; r++) welt.unlockRegion(r);
  const ctx = { world: welt, inventory: new Inventory(60), today: { season: SEASONS.summer } };
  const qb = new QuestBook();
  qb.newDay(1, welt, ctx);
  for (const sid of Object.keys(qb.completedBySpirit)) {
    qb.completedBySpirit[sid] = (freundStufe || 0) * 3;
  }
  qb.quests.length = 0;
  qb.newDay(tag, welt, ctx);
  let coins = 0;
  let ember = 0;
  let n = 0;
  for (const q of qb.active()) {
    n++;
    coins += (q.rewards && q.rewards.coins) || 0;
    ember += (q.rewards && q.rewards.ember) || 0;
  }
  return { coins: coins, ember: ember, auftraege: n };
}

const FRUEH = tagesLohn(3, 0);
const SPAET = tagesLohn(60, 10);

test('Ein Tag bringt genug für ein Zwischenziel, nicht für alles', () => {
  assert.ok(FRUEH.auftraege >= 14, 'zu wenige Bitten am Tag – Messung wäre wertlos');
  assert.ok(FRUEH.coins > 300, 'am Anfang muss sich ein Tag lohnen (' + FRUEH.coins + ')');
  assert.ok(FRUEH.coins < 1200, 'am Anfang zu viel (' + FRUEH.coins + ')');
  assert.ok(SPAET.coins < 2500, 'spät zu viel – dann ist jedes Ziel billig (' + SPAET.coins + ')');
});

test('Helfen lohnt mehr als verkaufen – bei JEDEM Gegenstand', () => {
  // Die Regel, um die sich das ganze Spiel dreht, und sie stand nie irgendwo.
  //
  // Beim ersten Umbalancieren habe ich sie prompt gebrochen: Eine Holbitte
  // zahlte `Wert × 0,7` je Stück, und damit lag das Abgeben bei allem, was
  // mehr als Holz wert ist, nur vier bis sieben Prozent über dem
  // Verkaufspreis. Man hätte das Kupfer verkauft und den Geistern das Holz
  // gebracht – in einem Spiel, das vom Helfen handelt.
  //
  // Gemessen an ECHTEN Aufträgen gegen den ECHTEN Ladenpreis, nicht an einer
  // hier abgeschriebenen Formel: Sonst prüfte der Test nur, dass ich zweimal
  // dasselbe getippt habe.
  const welt = new World(SEED).populate();
  for (let r = 1; r <= 3; r++) welt.unlockRegion(r);
  const ctx = { world: welt, inventory: new Inventory(60), today: { season: SEASONS.summer } };
  const shop = new Shop();
  shop.refresh(1, SEED);

  const schlecht = [];
  let geprueft = 0;
  // Über viele Tage sammeln, damit jeder Gegenstand aus den Holpools
  // mindestens einmal vorkommt – und am UNGÜNSTIGSTEN Tag: Tag eins.
  for (let runde = 0; runde < 40; runde++) {
    const qb = new QuestBook();
    qb.newDay(1, welt, ctx);
    for (const q of qb.active()) {
      if (q.type !== QTYPE.GATHER || !q.itemId) continue;
      const item = getItem(q.itemId);
      if (!item || !item.value) continue;
      geprueft++;
      const verkauf = shop.sellPrice(q.itemId) * q.need;
      if (q.rewards.coins <= verkauf * 1.2) {
        schlecht.push(item.name + ' ×' + q.need + ': ' + q.rewards.coins
          + ' abgeben vs ' + verkauf + ' verkaufen');
      }
    }
  }
  assert.ok(geprueft > 20, 'zu wenige Holbitten geprüft (' + geprueft + ')');
  assert.deepEqual([...new Set(schlecht)], [],
    'abgeben lohnt kaum mehr als verkaufen');
});

test('Der Lohn steigt, aber er explodiert nicht', () => {
  // Vorher verdreifachte er sich im Lauf des Spiels. Wer am Tag 40 dreimal
  // so viel für dieselbe Bitte bekommt, für den kostet das letzte Ziel
  // weniger Arbeit als das erste – und dann gibt es kein spätes Spiel.
  const faktor = SPAET.coins / FRUEH.coins;
  assert.ok(faktor > 1.2, 'ganz ohne Zuwachs fühlt sich Freundschaft nach nichts an');
  assert.ok(faktor < 2.6, 'der Lohn wächst zu stark: Faktor ' + faktor.toFixed(2));
});

test('Das größte Ziel ist ein Vorhaben über Wochen', () => {
  // Die Zusicherung, an der das ganze späte Spiel hängt. Gemessen am
  // FLEISSIGSTEN Spieler, der jeden Tag alles erledigt und nichts anderes
  // kauft – für alle anderen dauert es länger.
  const groesste = Math.max(
    TRUHE[TRUHE.length - 1].cost,
    ISLE_PLOT_STAGES[ISLE_PLOT_STAGES.length - 1].coins
  );
  const tage = groesste / SPAET.coins;
  assert.ok(tage >= 8,
    'die letzte Stufe kostet nur ' + tage.toFixed(1) + ' volle Tage – das ist kein Vorhaben');
});

test('Alles zusammen dauert länger als die Insel selbst bunt zu machen', () => {
  // Der eigentliche Fehler von vorher, in einer Zeile: Die Farbanzeige
  // braucht rund 330 Aufträge, also etwa 16 Tage. Wenn die ganze Wirtschaft
  // in acht Tagen leergekauft ist, besitzt man alles, bevor die Insel fertig
  // ist – und ab da tut jede weitere Münze nichts mehr.
  const summe = TRUHE.reduce((n, s) => n + s.cost, 0)
    + ISLE_PLOT_STAGES.reduce((n, s) => n + s.coins, 0)
    + KATALOG.reduce((n, e) => n + e.preis, 0);
  const tage = summe / ((FRUEH.coins + SPAET.coins) / 2);
  assert.ok(tage > 20,
    'alles Kaufbare kostet nur ' + Math.round(tage) + ' Tage (' + summe + ' Münzen)');
});

test('Die erste Stufe jeder Leiter ist früh erreichbar', () => {
  // Die Gegenprobe zum Test darüber. Teurer machen ist leicht; teurer
  // machen, ohne den Anfang zuzumauern, ist der Punkt. Wer eine Woche auf
  // die erste Kiste wartet, hat kein Ziel, sondern eine Wand.
  assert.ok(TRUHE[0].cost <= FRUEH.coins * 2,
    'die erste Kiste kostet ' + TRUHE[0].cost + ' – zu viel für den Anfang');
  assert.ok(ISLE_PLOT_STAGES[0].coins <= FRUEH.coins * 3,
    'die erste Bucht-Stufe ist zu weit weg');
  assert.ok(KATALOG[0].preis <= FRUEH.coins,
    'das billigste Katalogstück muss an einem Tag drin sein');
});

test('Die Leitern steigen gleichmäßig, ohne Sprung ins Nichts', () => {
  const leitern = [
    ['Truhe', TRUHE.map((s) => s.cost)],
    ['Bucht', ISLE_PLOT_STAGES.map((s) => s.coins)],
    ['Lager', PLOT_STAGES.map((s) => s.ember).filter((n) => n > 0)],
  ];
  for (const [name, stufen] of leitern) {
    for (let i = 1; i < stufen.length; i++) {
      const faktor = stufen[i] / stufen[i - 1];
      assert.ok(faktor > 1.4, name + ': Stufe ' + (i + 1) + ' kostet kaum mehr als die davor');
      assert.ok(faktor < 4, name + ': Stufe ' + (i + 1) + ' springt um das '
        + faktor.toFixed(1) + '-fache');
    }
  }
});

test('Die Glut hält mit dem Lagergrundstück Schritt', () => {
  // Glut hat genau EIN großes Ziel. Sie war so reichlich, dass das
  // Grundstück nach zwei Tagen fertig war.
  const gesamt = PLOT_STAGES.reduce((n, s) => n + (s.ember || 0), 0);
  const tage = gesamt / SPAET.ember;
  assert.ok(tage >= 8, 'das ganze Grundstück kostet nur ' + tage.toFixed(1) + ' volle Tage');
  assert.ok(tage < 60, 'so lange wartet niemand (' + tage.toFixed(1) + ' Tage)');
  // Und die zweite Stufe ist die, die man als Erstes sieht.
  const zweite = PLOT_STAGES[1].ember;
  assert.ok(zweite <= FRUEH.ember * 5, 'die zweite Stufe ist zu weit weg (' + zweite + ')');
});

/**
 * Koch- und Holbitten aus denselben Läufen, mit ihrem Einsatz.
 *
 * `einsatz` ist, was man hineinsteckt: beim Holen der Wert der Stücke, beim
 * Kochen der Wert der Zutaten. Damit werden zwei Auftragsarten vergleichbar,
 * die auf den ersten Blick nichts miteinander zu tun haben.
 *
 * Bei höchster Freundschaft, denn dort ist der Lohn am größten.
 */
function kochUndHolen() {
  const welt = new World(SEED).populate();
  for (let r = 1; r <= 3; r++) welt.unlockRegion(r);
  const ctx = { world: welt, inventory: new Inventory(60), today: { season: SEASONS.summer } };
  const shop = new Shop();
  shop.refresh(1, SEED);

  const cook = [];
  const gather = [];
  for (let tag = 1; tag <= 60; tag++) {
    const qb = new QuestBook();
    for (const sid of Object.keys(qb.completedBySpirit)) qb.completedBySpirit[sid] = 30;
    qb.newDay(tag, welt, ctx);
    for (const q of qb.active()) {
      const item = q.itemId ? getItem(q.itemId) : null;
      if (!item || !item.value) continue;
      if (q.type === QTYPE.COOK) {
        cook.push({
          name: item.name,
          coins: q.rewards.coins,
          verkauf: shop.sellPrice(q.itemId),
          einsatz: zutatenWert(gerichtFuer(q.itemId)),
        });
      } else if (q.type === QTYPE.GATHER) {
        gather.push({
          name: item.name,
          coins: q.rewards.coins,
          verkauf: shop.sellPrice(q.itemId) * q.need,
          einsatz: item.value * q.need,
        });
      }
    }
  }
  return { cook: cook, gather: gather };
}

test('Kochen lohnt mehr als verkaufen – bei jedem Gericht', () => {
  // Dieselbe Regel wie bei der Holbitte, angewandt auf die Küche: Wer die
  // Waldsuppe abgibt, statt sie zu verkaufen, darf dabei nicht draufzahlen.
  // Ein Spiel, das vom Helfen handelt, macht das Helfen nicht zur teuren
  // Variante.
  const { cook } = kochUndHolen();
  const schlecht = cook.filter((c) => c.coins <= c.verkauf * 1.2)
    .map((c) => c.name + ': ' + c.coins + ' abgeben vs ' + c.verkauf + ' verkaufen');
  assert.ok(cook.length >= 10, 'zu wenige Kochbitten geprüft (' + cook.length + ')');
  assert.deepEqual([...new Set(schlecht)], [], 'kochen lohnt kaum mehr als verkaufen');
});

test('Kochen lohnt mehr als die Zutaten roh abzugeben – aber es ersetzt nicht alles', () => {
  // Die Wahl, vor der der Spieler wirklich steht: Ich habe drei Blüten. Gebe
  // ich sie Mira, oder mache ich erst Salat daraus?
  //
  // Wäre die Antwort „egal", wäre die ganze Küche Zierde – dann kocht
  // niemand. Wäre sie „immer kochen, alles andere ist Zeitverschwendung",
  // hätte das Spiel ab Tag drei nur noch einen einzigen Weg.
  //
  // Gemessen wird deshalb der MÜNZE-JE-EINSATZ von echten Aufträgen, beide
  // Sorten aus denselben Läufen – nicht gegen eine hier abgeschriebene
  // Formel, sonst prüfte der Test nur, dass ich zweimal dasselbe getippt
  // habe.
  const { cook, gather } = kochUndHolen();
  assert.ok(gather.length >= 20, 'zu wenige Holbitten zum Vergleichen');

  const schnitt = (liste) => liste.reduce((n, c) => n + c.coins / c.einsatz, 0) / liste.length;
  const kochen = schnitt(cook);
  const holen = schnitt(gather);

  assert.ok(kochen > holen,
    'kochen bringt je Einsatz nicht mehr als roh abgeben (' +
    kochen.toFixed(2) + ' gegen ' + holen.toFixed(2) + ') – dann kocht niemand');
  assert.ok(kochen < holen * 3,
    'kochen bringt das ' + (kochen / holen).toFixed(1) + '-fache einer Holbitte – ' +
    'dann lohnt sich nichts anderes mehr');
});
