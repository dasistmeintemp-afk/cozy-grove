/**
 * Gemütlichkeit – was aufgestellte Deko bewirkt.
 *
 * Vorher trug jedes Deko-Stück einen Wert `charm`, den nichts las. Man konnte
 * die Insel vollstellen, und außer der Ansicht änderte sich nichts; eine
 * Aufgabe „Deko aufstellen" zählte Stücke, sodass zehn Steinwege für acht
 * Münzen dasselbe wogen wie eine Mondlaterne für hundertzwanzig.
 *
 * Jetzt zählt, was um einen Geist herum steht:
 *
 *   Punkte  Die Summe der `charm`-Werte im Umkreis. Ein Zaunstück gibt 1,
 *           ein Blumenbeet 5, ein Andenken 10.
 *   Stufe   Fünf Stufen (0–4) mit steigenden Schwellen.
 *   Wirkung Um den Geist wächst ein zusätzlicher Farbkreis, und seine
 *           Aufgaben zahlen besser.
 *
 * Damit hat Einrichten einen Zweck, der zum Kern des Spiels gehört: Deko
 * bringt Farbe zurück. Und die Wirkung ist reversibel – nimmt man die Deko
 * wieder weg, schrumpft der Kreis. Das ist der Grund, warum das Farbfeld ein
 * `setTarget` bekommen hat: `grow` kann nur wachsen.
 */

/** Umkreis um einen Geist, in dem Deko zählt. */
export const COSY_RADIUS = 460;

/** Punkteschwellen für Stufe 1 bis 4. Stufe 0 hat keine. */
export const COSY_STEPS = [8, 20, 38, 62];

/** Höchste Stufe. */
export const COSY_MAX = COSY_STEPS.length;

/**
 * Summe der `charm`-Werte aller Deko im Umkreis eines Geistes.
 * @param {object} world
 * @param {string} spiritId
 * @param {function} getItem Nachschlagefunktion für Gegenstände
 */
export function charmAround(world, spiritId, getItem) {
  const e = world.spiritEntity ? world.spiritEntity(spiritId) : null;
  if (!e) return 0;
  const near = world.queryNear(e.x, e.y, COSY_RADIUS);
  let sum = 0;
  const r2 = COSY_RADIUS * COSY_RADIUS;
  for (let i = 0; i < near.length; i++) {
    const d = near[i];
    if (d.gone || d.kind !== 'decor' || !d.itemId) continue;
    const dx = d.x - e.x;
    const dy = d.y - e.y;
    if (dx * dx + dy * dy > r2) continue;
    const item = getItem(d.itemId);
    sum += item && item.charm ? item.charm : 1;
  }
  return sum;
}

/** Stufe 0..COSY_MAX zu einer Punktzahl. */
export function cosyLevel(points) {
  let lvl = 0;
  for (let i = 0; i < COSY_STEPS.length; i++) {
    if (points >= COSY_STEPS[i]) lvl = i + 1;
  }
  return lvl;
}

/** Punkte bis zur nächsten Stufe, oder null auf der höchsten. */
export function pointsToNext(points) {
  for (let i = 0; i < COSY_STEPS.length; i++) {
    if (points < COSY_STEPS[i]) return COSY_STEPS[i] - points;
  }
  return null;
}

/**
 * Wie weit der zusätzliche Farbkreis reicht.
 *
 * Bewusst an die Punkte gekoppelt, nicht nur an die Stufe: jedes einzelne
 * Stück soll etwas bewirken, sonst wartet man nur auf die nächste Schwelle.
 * Gedeckelt, damit ein zugestellter Fleck nicht die halbe Insel einfärbt –
 * Farbe soll weiter überwiegend von erledigten Aufgaben kommen.
 */
export function cosyRadius(points) {
  if (points <= 0) return 0;
  return Math.min(430, 90 + points * 5.5);
}

/** Aufschlag auf den Lohn der Aufgaben dieses Geistes. */
export function rewardFactor(level) {
  return 1 + level * 0.11;
}
