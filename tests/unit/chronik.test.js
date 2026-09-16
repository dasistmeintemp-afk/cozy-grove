/**
 * Die Chronik – stimmen die Zahlen, die sie erzählt?
 *
 * Sie führt mit Absicht keine eigene Buchführung: Alles kommt aus dem
 * Fundbuch, aus `records.js` und aus dem Aufgabenbuch. Geprüft wird deshalb
 * nicht, ob sie richtig ZÄHLT, sondern ob sie richtig LIEST – und ob sie an
 * den beiden Stellen ehrlich bleibt, an denen eine Zusammenfassung gern
 * schummelt:
 *
 * 1. **Der größte Fang.** Nicht die größte Zahl in Zentimetern. Ein Wels
 *    wird nun einmal länger als eine Sardine, und dann stünde dort für immer
 *    derselbe Fisch.
 * 2. **„1 Bitten erfüllt".** Der Satz, an dem ein sorgfältiges Spiel
 *    auffliegt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dingeGesamt, artenStand, groessterFang, bittenGesamt, zeitSatz,
  chronikZeilen, ZEIT_SAETZE,
} from '../../src/game/chronik.js';
import { ITEM_LIST, getItem, CAT } from '../../src/game/items.js';
import { spanneFuer } from '../../src/game/records.js';

test('Die Dinge werden zusammengezählt, nicht die Sorten', () => {
  assert.equal(dingeGesamt({ wood: 412, stone: 233 }), 645);
  assert.equal(dingeGesamt({}), 0);
  assert.equal(dingeGesamt(null), 0);
});

test('Erinnerungen zählen nicht zu den Arten, die man finden kann', () => {
  // Sie kommen aus den Geschichten, nicht aus der Welt. Eine Zahl, die man
  // nicht durch Suchen vollmachen kann, gehört nicht in eine
  // Fortschrittszeile.
  const stand = artenStand({});
  const erinnerungen = ITEM_LIST.filter((i) => i.id.indexOf('memory_') === 0 ||
    i.id.indexOf('keepsake_') === 0).length;
  assert.ok(erinnerungen > 0, 'es gibt gar keine Erinnerungen – die Prüfung misst nichts');
  assert.equal(stand.gibt, ITEM_LIST.length - erinnerungen);
  assert.equal(stand.kennt, 0);
});

test('Mehr Gefundenes als es gibt kann nicht herauskommen', () => {
  // Ein von Hand bearbeiteter Spielstand mit erfundenen Kennungen darf keine
  // „112 von 99" ergeben.
  const viel = {};
  for (const it of ITEM_LIST) viel[it.id] = 1;
  viel.gibtsnicht = 1;
  viel.auchnicht = 1;
  const stand = artenStand(viel);
  assert.ok(stand.kennt <= stand.gibt, stand.kennt + ' von ' + stand.gibt);
});

test('Der größte Fang misst an der Art, nicht in Zentimetern', () => {
  // Eine 21-cm-Sardine ist das größere Kunststück als ein mittelmäßiger Wels.
  const sardine = spanneFuer('fish_sardine');
  const wels = spanneFuer('fish_catfish');
  assert.ok(wels[1] > sardine[1], 'der Wels ist gar nicht größer – die Prüfung misst nichts');

  const fast = Math.round(sardine[1] - 1);            // fast so groß, wie eine Sardine wird
  const mittel = Math.round((wels[0] + wels[1]) / 2); // ein ganz normaler Wels
  assert.ok(mittel > fast, 'der Wels ist in cm kleiner – die Prüfung misst nichts');

  const best = groessterFang({ fish_sardine: fast, fish_catfish: mittel });
  assert.equal(best.id, 'fish_sardine',
    'in Zentimetern gemessen statt an der Art (' + fast + ' vs ' + mittel + ')');
  assert.equal(best.cm, fast);
});

test('Ohne einen einzigen Fang gibt es keinen größten', () => {
  assert.equal(groessterFang({}), null);
  assert.equal(groessterFang(null), null);
  // Und dann fehlt die Zeile ganz – „größter Fang: –" wäre ein Vorwurf.
  const zeilen = chronikZeilen({ tag: 3 });
  assert.equal(zeilen.filter((z) => z.key === 'fang').length, 0);
  const mit = chronikZeilen({ tag: 3, records: { fish_trout: 30 } });
  assert.equal(mit.filter((z) => z.key === 'fang').length, 1);
});

test('Bitten werden über alle Geister summiert', () => {
  assert.equal(bittenGesamt({ mira: 9, bruno: 8 }), 17);
  assert.equal(bittenGesamt(null), 0);
});

test('„1 Bitten erfüllt" sagt hier niemand', () => {
  const eins = chronikZeilen({ tag: 1, bitten: 1 });
  const tage = eins.find((z) => z.key === 'tage');
  const bitten = eins.find((z) => z.key === 'bitten');
  assert.equal(tage.wert + ' ' + tage.text, '1 Tag auf der Insel');
  assert.equal(bitten.wert + ' ' + bitten.text, '1 Bitte erfüllt');

  const viele = chronikZeilen({ tag: 34, bitten: 57 });
  assert.equal(viele.find((z) => z.key === 'tage').text, 'Tage auf der Insel');
  assert.equal(viele.find((z) => z.key === 'bitten').text, 'Bitten erfüllt');
});

test('Jede Zeile hat ein Symbol, das es gibt', () => {
  const zeilen = chronikZeilen({
    tag: 10, farbe: 0.4, bitten: 3,
    found: { wood: 5 }, records: { fish_trout: 30 },
  });
  assert.ok(zeilen.length >= 6, 'nur ' + zeilen.length + ' Zeilen');
  for (const z of zeilen) {
    assert.ok(z.icon && z.icon.indexOf('icon_') === 0, z.key + ': ' + z.icon);
    assert.ok(z.wert !== '' && z.wert != null, z.key + ' ohne Wert');
    assert.ok(z.text && z.text.length > 3, z.key + ' ohne Text');
  }
  // Der Fang borgt sich das Symbol des Fisches – also muss es ihn geben.
  const fang = zeilen.find((z) => z.key === 'fang');
  const id = fang.icon.slice('icon_'.length);
  assert.ok(getItem(id), 'das Symbol zeigt auf einen Fisch, den es nicht gibt: ' + id);
  assert.equal(getItem(id).cat, CAT.FISH);
});

test('Die Farbe steht in Prozent und rundet nicht nach oben weg', () => {
  const z = (f) => chronikZeilen({ tag: 1, farbe: f }).find((x) => x.key === 'farbe').wert;
  assert.equal(z(0), '0 %');
  assert.equal(z(0.415), '42 %');
  assert.equal(z(1), '100 %');
});

test('Der Satz zur Zeit geht nie zurück', () => {
  // Wie die Wohnstufe im Zimmer: Was einmal dasteht, verschwindet nicht
  // wieder, nur weil ein Tag vergeht.
  let stand = -1;
  for (let t = 0; t < 400; t++) {
    const satz = zeitSatz(t);
    const i = ZEIT_SAETZE.findIndex((s) => s.text === satz);
    assert.ok(i >= 0, 'ein Satz, der nicht in der Liste steht: ' + satz);
    assert.ok(i >= stand, 'Tag ' + t + ': der Satz geht zurück');
    stand = i;
  }
  assert.equal(stand, ZEIT_SAETZE.length - 1, 'der letzte Satz wird nie erreicht');
});

test('Die Sätze sind alle verschieden und ohne Ausrufezeichen', () => {
  const texte = ZEIT_SAETZE.map((s) => s.text);
  assert.equal(new Set(texte).size, texte.length, 'zwei gleiche Sätze');
  for (const t of texte) {
    assert.ok(/[.]$/.test(t), 'kein Punkt am Ende: „' + t + '"');
    assert.ok(t.indexOf('!') < 0, 'hier jubelt niemand: „' + t + '"');
  }
});
