/**
 * Was eine Jahreszeit bewirkt.
 *
 * Der Kalender kannte vier Jahreszeiten von Anfang an – aber `today.season`
 * wurde an genau zwei Stellen benutzt: als Beschriftung im Tagebuch und für
 * einen Brief beim Wechsel. Vier Jahreszeiten, die reine Wörter waren.
 *
 * Hier steht, was daran hängt. Bewusst an drei Stellen und nicht mehr:
 *
 * 1. **Die Insel sieht anders aus.** Ein Farbton über dem ganzen Bild –
 *    dieselbe Stelle, an der schon Tageszeit und Wetter mitfärben, kostet
 *    also nichts extra. Frühling bleibt neutral: Er ist der Maßstab, an dem
 *    man die anderen drei erkennt.
 * 2. **Das Wetter ändert seine Mischung.** Im Winter fällt Schnee statt
 *    Regen, im Herbst liegt öfter Nebel, im Sommer ist meistens klar.
 * 3. **Manche Tiere gibt es nur zu ihrer Zeit.** Das ist der Grund,
 *    weiterzuspielen, wenn das Fundbuch fast voll ist – und der Grund, im
 *    Winter ans Wasser zu gehen, obwohl es ungemütlich ist.
 *
 * Calendar bleibt die Datumsquelle; hier steht nur die Wirkung.
 */

/**
 * Der Farbschleier je Jahreszeit.
 *
 * Schwach gehalten: Er soll die Stimmung kippen, nicht die Malerei
 * übertünchen. Alles über etwa zwölf Prozent frisst die Aquarellfarben auf,
 * für die das ganze Spiel gebaut ist.
 */
export const SEASON_TINT = {
  spring: null,
  summer: { r: 255, g: 226, b: 150, a: 0.07 },
  autumn: { r: 226, g: 146, b: 68, a: 0.11 },
  winter: { r: 206, g: 224, b: 240, a: 0.12 },
};

export function seasonTint(id) {
  return SEASON_TINT[id] || null;
}

/**
 * Wie oft welches Wetter kommt.
 *
 * Die Zahlen sind Schwellen auf einem Wurf zwischen 0 und 1, der Reihe nach
 * geprüft. Vorher galt für jeden Tag im Jahr dieselbe Mischung – 18 Prozent
 * Regen, 16 Prozent Nebel –, und ein Julitag sah aus wie ein Novembertag.
 */
export const SEASON_WEATHER = {
  spring: { rain: 0.30, fog: 0.14, snow: 0 },
  // Der Sommer ist die klarste Jahreszeit, aber sechs Prozent Nebel waren
  // dieselbe Falle wie unten beim Winterregen: Nebelkristalle gibt es NUR
  // im Nebel, und sie stecken in der Mondlaterne.
  summer: { rain: 0.12, fog: 0.12, snow: 0 },
  autumn: { rain: 0.22, fog: 0.30, snow: 0 },
  // Der Winter hatte zuerst fünf Prozent Regen – das las sich richtig und
  // war eine Falle: Regenpilze wachsen NUR an Regentagen, und eine Sitzung
  // spielt immer in einer Jahreszeit (der Kalender dreht sich mit dem echten
  // Datum, nicht mit dem Inseltag). Wer im Januar anfängt, hätte rund zwanzig
  // Inseltage auf seinen ersten Regenpilz gewartet. Jetzt regnet es auch im
  // Winter wie im Sommer; der Schnee nimmt sich seinen Anteil von den klaren
  // Tagen. Ein Test rechnet für jede Jahreszeit nach, dass nichts, was am
  // Wetter hängt, unerreichbar wird.
  winter: { rain: 0.12, fog: 0.16, snow: 0.30 },
};

export function seasonWeather(id) {
  return SEASON_WEATHER[id] || SEASON_WEATHER.spring;
}

/**
 * Wer wann unterwegs ist.
 *
 * Nur eine Handvoll Arten ist saisonal – wäre es die Mehrheit, hinge das
 * halbe Fundbuch am Kalender und man käme mit einem Spielstand, der im
 * Winter beginnt, wochenlang nicht weiter. So bleibt es ein Grund
 * hinzusehen, keine Sperre.
 *
 * Was hier NICHT steht, gibt es das ganze Jahr.
 */
export const SEASON_ONLY = {
  // Der Mondfisch steigt in den kalten, klaren Nächten auf.
  fish_moonfish: ['autumn', 'winter'],
  // Der Goldkarpfen steht im warmen Flachwasser.
  fish_goldcarp: ['spring', 'summer'],
  // Der Admiral fliegt spät im Jahr, der Mondfalter in lauen Nächten.
  bug_admiral: ['summer', 'autumn'],
  bug_luna: ['spring', 'summer'],
};

/** Ist diese Art gerade unterwegs? */
export function inSeason(itemId, season) {
  const s = SEASON_ONLY[itemId];
  if (!s) return true;
  if (!season) return true;
  return s.indexOf(season) >= 0;
}

/** Wann es diese Art gibt – für den Fingerzeig im Fundbuch. */
export function seasonsOf(itemId) {
  return SEASON_ONLY[itemId] || null;
}

/**
 * Wie schnell die Insel nachwächst.
 *
 * Der Faktor liegt auf den Tagen bis zum Nachwuchs: Im Frühling steht der
 * gefällte Baum früher wieder da, im Winter dauert es.
 *
 * Die Zahlen sind mit Absicht so eng, dass alles mit EINEM Tag Nachwuchs
 * unberührt bleibt – Beeren, Kräuter, Pilze, Blumen, Muscheln, Treibholz.
 * Das ist die tägliche Runde, und die soll im Januar genauso funktionieren
 * wie im Mai. Mit anderthalb statt einem Viertel wäre daraus ein Winter
 * geworden, in dem jede zweite Beere fehlt, und das ist kein gemütliches
 * Spiel mehr. Bewegen soll sich nur das Langsame: Bäume und große Findlinge.
 *
 * Und der Winter hat seine Entschädigung ohnehin – der Mondfisch ist der
 * wertvollste Fisch im Spiel, und es gibt ihn nur dann.
 */
export const SEASON_REGROW = {
  spring: 0.75,
  summer: 1,
  autumn: 1,
  winter: 1.25,
};

/** Tage bis zum Nachwuchs, mit der Jahreszeit gerechnet. Nie unter einem. */
export function regrowDays(tage, season) {
  const f = SEASON_REGROW[season] || 1;
  return Math.max(1, Math.round((tage || 1) * f));
}

export const SEASON_LABEL = {
  spring: 'Frühling', summer: 'Sommer', autumn: 'Herbst', winter: 'Winter',
};

/** „im Herbst und Winter" – für Hinweistexte. */
export function seasonPhrase(itemId) {
  const s = seasonsOf(itemId);
  if (!s) return '';
  const namen = s.map(function (x) { return SEASON_LABEL[x] || x; });
  if (namen.length === 1) return 'im ' + namen[0];
  return 'im ' + namen.slice(0, -1).join(', ') + ' und ' + namen[namen.length - 1];
}
