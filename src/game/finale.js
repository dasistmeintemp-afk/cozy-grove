/**
 * Der letzte Abend.
 *
 * Bei hundert Prozent war bisher Schluss, ohne dass jemand etwas dazu sagte:
 * eine Meldung, ein Vorteil im Laden, und dann lief das Spiel weiter, als
 * wäre nichts gewesen. Das ist kein Ende, sondern ein Aufhören.
 *
 * Der Abschluss macht daraus einen Abend. Alle sieben Geister versammeln
 * sich am Lagerfeuer und warten dort – nicht einen Tag lang, sondern so
 * lange, bis man bei jedem war. Jeder sagt einen Satz. Wer alle gehört hat,
 * bekommt das letzte Wort der Insel.
 *
 * Danach geht es weiter. Ein gemütliches Spiel darf nicht zumachen, nur weil
 * man fertig ist: Am nächsten Morgen stehen alle wieder an ihren Plätzen,
 * die Bitten kommen wie immer, und die Insel bleibt bunt.
 */
import { SPIRITS, SPIRIT_IDS } from './spirits.js';

/**
 * Was jeder zum Schluss sagt.
 *
 * Ein Satz je Geist, im selben Ton wie ihre Erinnerungen – Flämmchen
 * knistert, Bruno brummt, Wanda zählt Wellen. Zusammengelesen ergeben sie,
 * worum es die ganze Zeit ging, ohne dass es jemand ausspricht.
 */
export const FINALE_LINES = {
  flamey: 'Ich habe es hüten wollen. Dass es jemand größer macht, kam mir nie in den Sinn.',
  mira: 'Die Wiese blüht jetzt bis zum Wasser. Sie hat nur gewartet, wie ich.',
  kiesel: 'Vierzig Jahre gesucht, wo ich hin will. Es war die ganze Zeit hier.',
  bruno: 'Hmpf. Der Wald steht bunt. Du kannst zufrieden sein. Ich bin es auch.',
  tobi: 'Ich habe nachgemessen: Es fehlt nichts mehr. Zum ersten Mal.',
  nelly: 'Von oben sieht man alles auf einmal. Es ist schöner, als ich es in Erinnerung hatte.',
  wanda: 'Ich habe vom Wasser aus zugesehen, wie es zurückkam. Jeden Abend ein Stück mehr.',
};

/** Das letzte Wort, wenn man bei allen war. */
export const FINALE_CLOSE =
  'Die Insel ist wieder ganz. Bleib, so lange du magst – es gibt immer etwas zu tun.';

/** Wie viele Geister zum Abschluss sprechen. */
export const FINALE_COUNT = SPIRIT_IDS.filter(function (id) {
  return !!FINALE_LINES[id];
}).length;

/** Der Satz eines Geistes, oder null. */
export function finaleLine(spiritId) {
  return FINALE_LINES[spiritId] || null;
}

/** Wer noch nicht gesprochen hat. */
export function stillSilent(gehoert) {
  return SPIRIT_IDS.filter(function (id) {
    return FINALE_LINES[id] && !(gehoert && gehoert[id]);
  });
}

/** Haben alle gesprochen? */
export function allHeard(gehoert) {
  return stillSilent(gehoert).length === 0;
}

/**
 * Wo die Geister sich hinstellen: ein Ring um das Feuer.
 *
 * Absichtlich ein Ring und keine Reihe – man soll um das Feuer herumgehen
 * und bei jedem stehenbleiben, nicht eine Schlange abarbeiten.
 *
 * @param {object} feuer  Weltkoordinaten des Lagerfeuers
 * @param {number} n      wie viele Plätze
 * @param {number} radius Abstand vom Feuer
 */
export function circleSpots(feuer, n, radius) {
  const out = [];
  const r = radius || 190;
  for (let i = 0; i < n; i++) {
    // Bei -90° anfangen, damit niemand genau vor dem Feuer im Weg steht.
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    out.push({ x: feuer.x + Math.cos(a) * r, y: feuer.y + Math.sin(a) * r * 0.72 });
  }
  return out;
}

export { SPIRITS, SPIRIT_IDS };
