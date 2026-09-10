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

import { QuestBook } from '../../src/game/quests.js';
import { World } from '../../src/world/world.js';
import { Inventory } from '../../src/game/inventory.js';
import { SEASONS } from '../../src/game/calendar.js';
import { STAGES as TRUHE } from '../../src/game/loan.js';
import { PLOT_STAGES, ISLE_PLOT_STAGES } from '../../src/game/plot.js';
import { KATALOG } from '../../src/game/catalog.js';

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
