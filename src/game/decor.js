/**
 * Deko, die etwas tut.
 *
 * Aufgestellte Deko brachte bis hierher **Charmepunkte** – Farbe um die
 * Geister und besser bezahlte Aufgaben. Das ist eine echte Wirkung, aber es
 * ist für jedes Stück dieselbe: Ein Zierteich für 190 Münzen unterscheidet
 * sich von einem Zaunstück für acht nur durch die Zahl.
 *
 * Nachgezählt waren es **17 von 26** aufstellbaren Stücken, an denen außer
 * dem Charmewert nichts hing. Bei den meisten ist das ehrlich – ein Tisch
 * ist ein Tisch, ein Teppich ist ein Teppich. Bei einigen aber steht der
 * Name für ein Versprechen, das nichts einlöst: eine **Vogeltränke** ohne
 * Vögel, während über der Insel welche fliegen. Ein **Bienenkorb** ohne
 * Bienen. Ein **Wetterhahn**, der über das Wetter nichts sagt.
 *
 * Hier stehen genau diese Fälle. Die Regel dahinter ist eng gefasst:
 *
 *   Ein Stück bekommt eine Wirkung, wenn sein NAME sie schon behauptet.
 *
 * Das ist kein Feinschliff, sondern der Unterschied zwischen Einrichten und
 * Auslegen: Wer weiß, dass Bienen dem Beet nebenan helfen, stellt den Korb
 * nicht mehr dorthin, wo er hübsch aussieht, sondern dorthin, wo er wirkt –
 * und muss sich zwischen beidem entscheiden.
 */

/**
 * Wie weit ein Stück Deko auf seine Nachbarschaft wirkt.
 *
 * Rund zweieinhalb Kacheln. Groß genug, dass ein Korb mehrere Beete deckt
 * und man nicht je Pflanze eines braucht; klein genug, dass man ihn WOHIN
 * stellen muss. Bei acht Kacheln deckt einer das ganze Grundstück ab, und
 * die Entscheidung fällt weg.
 */
export const WIRK_RADIUS = 170;

/**
 * Was dem Beet nebenan hilft.
 *
 * `wachstum` zählt wie ein zusätzlicher Tag Wachstum, genau wie Regen und
 * die Gießkanne – kein neuer Rechenweg, sondern derselbe Summand.
 * `ernte` legt ein Stück auf die Ernte drauf.
 *
 * Beide sind bewusst +1 und nicht mehr. Nachgerechnet ist der Bienenkorb
 * damit genau so stark wie die GIESSKANNE, die es längst gibt: Beeren und
 * Kräuter zwei Tage → einer, Mondsaat vier → zwei. Er führt also nichts
 * Neues ein, sondern nimmt einem den täglichen Handgriff ab – für 380
 * Münzen und die Entscheidung, wohin er kommt. Ein zweiter Schritt oben
 * drauf machte aus dem Garten einen Automaten, und der Garten ist die eine
 * Sache im Spiel, die von gestern abhängt.
 *
 * Gemessen bringt das Rankgitter rund ein Drittel mehr Ernte je Beet
 * (2,95 → 3,95 Beeren).
 */
export const BEET_HILFE = {
  // Bienen bestäuben. Der Korb steht dafür in jedem Garten der Welt.
  beehive: { wachstum: 1, ernte: 0 },
  // Ranken tragen mehr, wenn sie klettern dürfen.
  trellis: { wachstum: 0, ernte: 1 },
  // Der Bonsai war das teuerste Stück der zweiten Katalogseite ohne jede
  // Wirkung – genau der Fehler, den der Zierteich schon einmal hatte. Wer
  // einen Baum in einer Schale so weit bringt, versteht etwas von Pflanzen;
  // dass die Beete daneben mehr hergeben, ist die naheliegendste Wirkung.
  bonsai: { wachstum: 0, ernte: 1 },
};

/** Die Stücke, die dem Garten helfen – für Hinweistexte. */
export const BEET_HELFER = Object.keys(BEET_HILFE);

/**
 * Was ein Beet an dieser Stelle von der Nachbarschaft bekommt.
 *
 * Jede Sorte zählt nur EINMAL, egal wie viele danebenstehen. Sonst wäre die
 * beste Einrichtung ein Feld aus zwanzig Bienenkörben, und das ist keine
 * Einrichtung mehr.
 *
 * @param {Array} nachbarn Deko-Objekte in der Nähe ({ itemId, x, y, gone })
 * @param {number} x
 * @param {number} y
 * @returns {{wachstum:number, ernte:number, arten:string[]}}
 */
export function beetHilfe(nachbarn, x, y) {
  const gesehen = Object.create(null);
  let wachstum = 0;
  let ernte = 0;
  const r2 = WIRK_RADIUS * WIRK_RADIUS;
  for (let i = 0; i < (nachbarn || []).length; i++) {
    const d = nachbarn[i];
    if (!d || d.gone || d.kind !== 'decor' || !d.itemId) continue;
    const hilfe = BEET_HILFE[d.itemId];
    if (!hilfe || gesehen[d.itemId]) continue;
    const dx = d.x - x;
    const dy = d.y - y;
    if (dx * dx + dy * dy > r2) continue;
    gesehen[d.itemId] = 1;
    wachstum += hilfe.wachstum;
    ernte += hilfe.ernte;
  }
  return { wachstum: wachstum, ernte: ernte, arten: Object.keys(gesehen) };
}

/**
 * Deko, die Tiere anzieht oder vertreibt.
 *
 * Das Gegenstück zueinander: Die Tränke holt sie her, die Vogelscheuche
 * hält sie fern. Steht beides nebeneinander, hebt es sich auf – und genau
 * das soll es, weil man dann sieht, dass beide etwas tun.
 */
export const LOCKT = { birdbath: 1, pond: 1, feeder: 1, hedgehogbox: 1 };
export const VERSCHEUCHT = { scarecrow: 1 };

/** Reichweite für Tiere – weiter als beim Beet, sie fliegen ja. */
export const TIER_RADIUS = 260;

/**
 * Wie sehr ein Ort für Tiere taugt: 1 normal, mehr lockt, 0 vertreibt.
 *
 * @param {Array} nahe Deko-Objekte in der Nähe
 */
export function tierGunst(nahe, x, y) {
  let lockt = 0;
  let scheucht = 0;
  const r2 = TIER_RADIUS * TIER_RADIUS;
  for (let i = 0; i < (nahe || []).length; i++) {
    const d = nahe[i];
    if (!d || d.gone || d.kind !== 'decor' || !d.itemId) continue;
    const dx = d.x - x;
    const dy = d.y - y;
    if (dx * dx + dy * dy > r2) continue;
    if (LOCKT[d.itemId]) lockt++;
    if (VERSCHEUCHT[d.itemId]) scheucht++;
  }
  if (scheucht > lockt) return 0;
  return 1 + Math.min(3, lockt - scheucht);
}

/** Sagt dieses Stück das Wetter von morgen an? */
export function istWetterhahn(itemId) {
  return itemId === 'weathervane';
}

/** Klingt dieses Stück, wenn man vorbeigeht? */
export const KLINGT = { windchime: 1 };

export function klingt(itemId) {
  return !!KLINGT[itemId];
}

/**
 * Was ein Stück tut, in einem Satz.
 *
 * EINE Quelle für zwei Leser: den Katalog, wo man kauft, und das Fundbuch,
 * wo man nachschlägt. Stünde es zweimal da, wiche eines beim ersten Ändern
 * ab – und die Bienen halfen dann laut Katalog dem Beet und laut Fundbuch
 * nicht.
 *
 * Kurz halten. Der Satz steht in einer Zeile unter dem Preis.
 */
export const WIRKUNG = {
  beehive: 'Beete in der Nähe wachsen einen Schritt schneller.',
  trellis: 'Beete in der Nähe geben ein Stück mehr her.',
  birdbath: 'Vögel und Falter kommen näher.',
  pond: 'Vögel und Falter kommen näher. Das Tier legt sich gern daneben.',
  scarecrow: 'Hält Vögel und Falter fern – auch die, die du fangen willst.',
  weathervane: 'Sagt an, was für ein Wetter morgen wird.',
  windchime: 'Klingt, wenn du vorbeigehst.',
  birdhouse: 'Morgens liegt manchmal eine Feder darunter.',
  bowl: 'Stell ihn hin und warte, wer kommt.',
  feeder: 'Vögel und Falter kommen näher.',
  // Dieselbe Wirkung wie die Tränke, aber nicht derselbe Satz: Ein
  // Igelhaus, das ausdrücklich Falter anzieht, wäre schlicht falsch.
  hedgehogbox: 'Tiere bleiben lieber in der Nähe.',
  bonsai: 'Beete in der Nähe geben ein Stück mehr her.',
  aquarium: 'Zeigt deine drei besten Fänge.',
  buttercase: 'Zeigt deine drei seltensten Falter.',
};

export function wirkungVon(itemId) {
  return WIRKUNG[itemId] || '';
}
