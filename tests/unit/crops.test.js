import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CROPS, CROP_IDS, SEED_IDS, cropOfSeed, stageOf, daysToRipe, growthPerDay, harvestOf,
  kreuzChance, kreuzungVon, KREUZ_MAX, KREUZ_GENUG,
} from '../../src/game/crops.js';
import { getItem, CAT } from '../../src/game/items.js';
import { makeRng } from '../../src/core/rng.js';

test('Zu jeder Saat gibt es einen Gegenstand und umgekehrt', () => {
  for (const id of CROP_IDS) {
    const c = CROPS[id];
    const item = getItem(c.seed);
    assert.ok(item, c.seed + ' fehlt in der Gegenstandsliste');
    assert.equal(item.cat, CAT.SEED);
    assert.equal(item.plant, c.id, 'die Saat zeigt auf die falsche Pflanze');
    assert.ok(item.prop, 'ohne prop kann man sie nicht setzen');
    assert.equal(item.burn, 0, 'Saat darf nicht im Feuer landen');
    assert.equal(cropOfSeed(c.seed), c);
  }
  assert.equal(SEED_IDS.length, CROP_IDS.length);
});

test('Was geerntet wird, gibt es wirklich', () => {
  for (const id of CROP_IDS) {
    for (const out of CROPS[id].yields) {
      assert.ok(getItem(out), id + ' liefert unbekanntes ' + out);
    }
  }
});

test('Drei sichtbar verschiedene Stufen, auch bei der schnellsten Saat', () => {
  for (const id of CROP_IDS) {
    const c = CROPS[id];
    const gesehen = new Set();
    for (let tag = 0; tag <= c.days; tag++) gesehen.add(stageOf(tag, c.days));
    assert.deepEqual([...gesehen].sort(), [0, 1, 2],
      id + ' zeigt nur die Stufen ' + [...gesehen].join(','));
    assert.equal(stageOf(0, c.days), 0, 'frisch gesät ist Keimling');
    assert.equal(stageOf(c.days, c.days), 2, 'am Reifetag ist reif');
    assert.equal(stageOf(c.days + 5, c.days), 2, 'reif bleibt reif');
  }
});

test('Verbleibende Tage zählen bis null herunter', () => {
  const c = CROPS.flower;
  assert.equal(daysToRipe(c, 0), c.days);
  assert.equal(daysToRipe(c, 1), c.days - 1);
  assert.equal(daysToRipe(c, c.days), 0);
  assert.equal(daysToRipe(c, c.days + 3), 0, 'nie negativ');
});

test('Regen lässt schneller wachsen, sonstiges Wetter nicht langsamer', () => {
  assert.equal(growthPerDay('rain'), 2);
  assert.equal(growthPerDay('fog'), 1);
  assert.equal(growthPerDay(null), 1);
  assert.equal(growthPerDay('clear'), 1);
});

test('Die Ernte lohnt sich und trägt sich weiter', () => {
  const rng = makeRng(4242);
  for (const id of CROP_IDS) {
    const c = CROPS[id];
    let summe = 0;
    let saatZurueck = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const out = harvestOf(c, rng);
      const ernte = out.filter((o) => o.id !== c.seed);
      assert.equal(ernte.length, 1, 'genau eine Sorte je Ernte');
      assert.ok(ernte[0].n >= c.amount[0] && ernte[0].n <= c.amount[1],
        id + ' liefert ' + ernte[0].n);
      assert.ok(c.yields.indexOf(ernte[0].id) >= 0);
      summe += ernte[0].n;
      if (out.some((o) => o.id === c.seed)) saatZurueck++;
    }
    // Ein Beet muss mehr bringen als die Saat kostet, sonst wäre Säen ein
    // Verlustgeschäft und niemand täte es zweimal.
    const wert = getItem(c.yields[0]).value * (summe / N);
    assert.ok(wert > getItem(c.seed).value * 0.9,
      id + ': Ernte ' + wert.toFixed(1) + ' gegen Saatpreis ' + getItem(c.seed).value);
    // Und ein guter Teil sät sich selbst nach – sonst rennt man dauernd zum Laden
    const anteil = saatZurueck / N;
    assert.ok(anteil > 0.3 && anteil < 0.6, id + ': Saat zurück bei ' + Math.round(anteil * 100) + ' %');
  }
});

test('Blumensaat bringt Abwechslung, die anderen sind verlässlich', () => {
  const rng = makeRng(77);
  const bunt = new Set();
  for (let i = 0; i < 200; i++) {
    bunt.add(harvestOf(CROPS.flower, rng).filter((o) => o.id !== CROPS.flower.seed)[0].id);
  }
  assert.ok(bunt.size >= 3, 'nur ' + bunt.size + ' Blumensorten');

  const beeren = new Set();
  for (let i = 0; i < 50; i++) {
    beeren.add(harvestOf(CROPS.berry, rng).filter((o) => o.id !== CROPS.berry.seed)[0].id);
  }
  assert.equal(beeren.size, 1, 'Beerensaat soll berechenbar sein');
});

test('Die Mondsaat ist die teure und die langsamste', () => {
  const mond = CROPS.moon;
  for (const id of CROP_IDS) {
    if (id === 'moon') continue;
    assert.ok(mond.days >= CROPS[id].days, 'Mondsaat wächst nicht am längsten');
    assert.ok(getItem(mond.seed).value > getItem(CROPS[id].seed).value,
      'Mondsaat ist nicht die teuerste');
  }
});

/* ---------------- Blumen, die beieinanderstehen ---------------- */

test('Ein einzelnes Beet zieht gar nichts – auch gegossen nicht', () => {
  // Die Regel heißt „beieinander". Ohne Nachbarn ist sie nicht erfüllt, und
  // Gießen darf sie nicht ersetzen: Sonst wäre die Dämmerblume eine Frage
  // der Geduld und nicht der Anordnung.
  assert.equal(kreuzChance(0, false), 0);
  assert.equal(kreuzChance(0, true), 0);
  assert.equal(kreuzChance(-3, true), 0, 'Unsinn darf keine Chance werden');
});

test('Je mehr Beete beieinander, desto eher – bis zu einer Grenze', () => {
  let vorher = 0;
  for (let n = 1; n <= KREUZ_GENUG; n++) {
    const jetzt = kreuzChance(n, false);
    assert.ok(jetzt > vorher, n + ' Nachbarn bringen nicht mehr als ' + (n - 1));
    vorher = jetzt;
  }
  // Und darüber hinaus nicht weiter. Sonst wäre die beste Antwort ein Feld
  // aus vierzig Beeten, und aus dem Garten würde eine Fabrik.
  assert.equal(kreuzChance(40, true), KREUZ_MAX);
  assert.equal(kreuzChance(400, true), KREUZ_MAX);
});

test('Gießen hilft, ersetzt aber kein zweites Beet', () => {
  assert.ok(kreuzChance(1, true) > kreuzChance(1, false), 'Gießen tut nichts');
  assert.ok(kreuzChance(1, true) < kreuzChance(3, false),
    'eine gegossene Einzelnachbarschaft schlägt drei Beete – dann legt niemand mehr an');
});

test('Die Chance bleibt eine Chance', () => {
  // Kein Wert über einem Drittel bis zur Hälfte: Die Dämmerblume soll ein
  // guter Morgen sein und keine Ernte.
  for (let n = 0; n <= 20; n++) {
    for (const g of [false, true]) {
      const c = kreuzChance(n, g);
      assert.ok(c >= 0 && c <= 0.5, n + '/' + g + ': ' + c);
    }
  }
  assert.ok(KREUZ_MAX < 0.5, 'öfter als jede zweite Ernte ist keine Seltenheit mehr');
});

test('Nur die Blumensaat kann etwas ziehen', () => {
  // Sonst käme die Dämmerblume auch aus einem Beerenbeet, und der Name
  // stimmte nicht mehr.
  const mit = CROP_IDS.filter((id) => !!kreuzungVon(CROPS[id]));
  assert.deepEqual(mit, ['flower'], 'gezogen wird aus: ' + mit.join(', '));
  assert.equal(kreuzungVon(null), null);
  assert.equal(kreuzungVon({}), null);
});

test('Die Dämmerblume gibt es wirklich, und sie steht in keiner Ernteliste', () => {
  const id = kreuzungVon(CROPS.flower);
  const item = getItem(id);
  assert.ok(item, id + ' gibt es nicht');
  assert.equal(item.cat, CAT.FORAGE);
  // Der Punkt der ganzen Sache: Sie ist der einzige Fund, den man nicht
  // findet. Stünde sie in `yields`, käme sie aus jedem Beet von selbst.
  for (const cid of CROP_IDS) {
    assert.ok(CROPS[cid].yields.indexOf(id) < 0,
      id + ' steht in der Ernteliste von ' + cid + ' – dann ist sie nichts Besonderes');
  }
  // Und sie hängt an keiner Bedingung: Wer nachts nicht spielt, soll sie
  // trotzdem ziehen können.
  assert.ok(!item.onlyAt, 'sie wartet auf ein Wetter oder eine Uhrzeit');
});

test('Sie ist mehr wert als die Blumen, aus denen sie kommt', () => {
  const id = kreuzungVon(CROPS.flower);
  const wert = getItem(id).value;
  for (const y of CROPS.flower.yields) {
    assert.ok(wert > getItem(y).value * 2,
      'die Dämmerblume ist kaum mehr wert als eine ' + getItem(y).name);
  }
  // Aber nicht mehr als die Mondblume: Die kostet eine Nacht, diese eine
  // Anordnung – und eine Nacht ist der grössere Einsatz.
  assert.ok(wert < getItem('moonflower').value, 'sie schlägt die Mondblume');
});
