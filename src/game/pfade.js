/**
 * Trampelpfade – die Insel merkt sich, wo du langgehst.
 *
 * Vier Hütten im Grünen sind noch kein Dorf. Was aus Häusern eine Siedlung
 * macht, sind die Wege dazwischen: ausgetretene Streifen, die niemand
 * gebaut hat und die trotzdem jeder benutzt. In beiden Vorbildern ist das
 * der stärkste Hinweis darauf, dass hier jemand lebt – und das Schöne
 * daran ist, dass er von ganz allein entsteht.
 *
 * **Keine Kachel wird umgewandelt.** Naheliegend wäre, abgelaufenes Gras zu
 * `T.DIRT` zu machen. Das hätte aber gleich drei Folgen, die niemand will:
 * Auf Erde wächst nichts mehr, der Streuwurf für Blumen und Pilze meidet
 * sie, und – die Lehre vom gelegten Steinweg – eine reine Grundfarbe
 * verschwindet unter dem Papierschleier ohnehin fast vollständig. Die
 * Abnutzung ist deshalb eine eigene Schicht, die der Bodenmaler
 * zusätzlich zeichnet: weniger Grasbüschel, eine erdige Lasur, ein paar
 * Kratzer. Am Spiel ändert sie nichts, nur am Bild.
 *
 * **Und sie wächst wieder zu.** Jeden Tag verliert jede Kachel einen
 * Schritt. Ein Pfad, den du eine Woche nicht gehst, ist weg – was einen
 * Weg erst zu einer Aussage über DICH macht statt zu einem Protokoll.
 * Nebenbei hält das den Spielstand klein: Ohne Verblassen wüchse die
 * Liste, solange jemand spielt.
 *
 * Alles hier ist reine Rechnung auf einem übergebenen Stand.
 */

/** Ab so vielen Schritten sieht man etwas. */
export const SCHWELLE = 14;

/** Ab so vielen Schritten ist der Weg deutlich. */
export const DEUTLICH = 34;

/** Mehr als das zählt nicht – sonst hielte sich ein alter Weg ewig. */
export const MAX_SCHRITTE = 48;

/**
 * So viele Kacheln merkt sich die Insel höchstens.
 *
 * 600 Kacheln sind rund 25 mal 25 – mehr als jedes Wegenetz, das jemand
 * wirklich läuft, und etwa sieben Kilobyte im Spielstand. Ist die Liste
 * voll, fliegt die am wenigsten begangene Kachel heraus: Ein Weg, der
 * gerade entsteht, soll einen verwachsenden nicht am Leben halten.
 */
export const MAX_KACHELN = 600;

/** Leerer Stand. */
export function emptyPfade() {
  return {};
}

const key = (tx, ty) => tx + ',' + ty;

/** Einen gespeicherten Stand einlesen und säubern. */
export function pfadeAus(roh) {
  const out = emptyPfade();
  if (!roh || typeof roh !== 'object') return out;
  for (const k in roh) {
    if (!/^-?\d+,-?\d+$/.test(k)) continue;
    const n = Math.floor(Number(roh[k]));
    if (!(n > 0)) continue;
    out[k] = Math.min(MAX_SCHRITTE, n);
  }
  return out;
}

/** Wie abgelaufen eine Kachel ist: 0 unberührt, 1 angedeutet, 2 deutlich. */
export function stufe(stand, tx, ty) {
  const n = stand ? stand[key(tx, ty)] : 0;
  if (!n || n < SCHWELLE) return 0;
  return n >= DEUTLICH ? 2 : 1;
}

/** Die rohe Zahl der Schritte auf einer Kachel. */
export function schritte(stand, tx, ty) {
  return (stand && stand[key(tx, ty)]) || 0;
}

/**
 * Einen Schritt zählen.
 *
 * @returns {boolean} ob sich das BILD geändert hat – nur dann muss das
 * Bodenstück neu gebacken werden. Das ist der ganze Grund für den
 * Rückgabewert: Ein Neubacken bei jedem Schritt wären fünfzig
 * Neuaufbauten je Sekunde.
 */
export function tritt(stand, tx, ty) {
  if (!stand) return false;
  const k = key(tx, ty);
  const vorher = stufe(stand, tx, ty);
  const n = (stand[k] || 0) + 1;
  stand[k] = Math.min(MAX_SCHRITTE, n);
  if (stand[k] === n && n === 1) platzSchaffen(stand);
  return stufe(stand, tx, ty) !== vorher;
}

/** Hält die Liste unter der Obergrenze. */
function platzSchaffen(stand) {
  const keys = Object.keys(stand);
  if (keys.length <= MAX_KACHELN) return 0;
  keys.sort(function (a, b) { return stand[a] - stand[b]; });
  const weg = keys.length - MAX_KACHELN;
  for (let i = 0; i < weg; i++) delete stand[keys[i]];
  return weg;
}

/**
 * Ein Tag vergeht: Jede Kachel verliert einen Schritt.
 *
 * @returns {Array} die Kacheln, deren BILD sich dabei geändert hat – damit
 * der Aufrufer genau die Bodenstücke neu backen lässt und nicht alle.
 */
export function verblassen(stand) {
  const geaendert = [];
  for (const k in stand) {
    const teile = k.split(',');
    const tx = Number(teile[0]);
    const ty = Number(teile[1]);
    const vorher = stufe(stand, tx, ty);
    stand[k] -= 1;
    if (stand[k] <= 0) delete stand[k];
    if (stufe(stand, tx, ty) !== vorher) geaendert.push([tx, ty]);
  }
  return geaendert;
}

/** Wie viele Kacheln gerade sichtbar abgelaufen sind. */
export function pfadStand(stand) {
  let sichtbar = 0;
  let deutlich = 0;
  for (const k in stand) {
    if (stand[k] >= DEUTLICH) { deutlich++; sichtbar++; } else if (stand[k] >= SCHWELLE) sichtbar++;
  }
  return { gemerkt: Object.keys(stand).length, sichtbar: sichtbar, deutlich: deutlich };
}
