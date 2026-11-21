/**
 * Eigene Ortsnamen – der Brunnen, der dem Spiel nicht gehört.
 *
 * Drei Brunnen tragen die Länge dieses Spiels, und zwei davon sind endlich:
 * die Zeit (echter Kalender, Kapitel) und die benannten Momente. Beide
 * schreibe ich, also laufen sie irgendwann aus. Der dritte ist der einzige,
 * der es nicht tut – und zwar genau deshalb, weil **der Spieler das Ziel
 * setzt und nicht ich**: was er selbst baut und einrichtet.
 *
 * Dieses Modul ist der kleinste Griff an diesen Brunnen und vermutlich der
 * wirksamste. Es gibt dem Spieler nichts Neues zu tun – es nimmt das, was er
 * ohnehin tut, und **erkennt es an**. Wer eine Ecke zum „Mondgarten" erklärt,
 * hört die Insel danach seine Sprache zurücksprechen: Die Skizze heißt „Der
 * Mondgarten im Herbst" und nicht „Im Wald im Herbst", und in der Chronik
 * steht ein Ort, den es nur auf dieser einen Insel gibt.
 *
 * Das ist der ganze Trick, und er kostet fast nichts: Aus einer Karte wird
 * ein Ort. Die Aufgabe des Spiels ist nicht, Ziele zu geben, sondern die zu
 * ehren, die sich jemand selbst gesetzt hat.
 *
 * **Woran der Name hängt.** An einem aufgestellten Wegweiser – ein Stück
 * Deko, das es längst gibt und das bis hierher nichts tat außer hübsch
 * dastehen. Deshalb braucht es kein neues Werkzeug und keine neue Taste: Man
 * stellt ein Schild auf und schreibt darauf.
 *
 * **Warum die Namen hier und nicht am Objekt liegen.** Der Spielstand
 * schreibt für Deko eine feste Feldliste (siehe `_worldDelta`); ein eigenes
 * Feld am Wegweiser würde beim Speichern verschwinden. Eine eigene Liste ist
 * ehrlicher als ein Feld, das es nach dem Neuladen nicht mehr gibt.
 */

/**
 * Wie weit ein Name reicht.
 *
 * 300 Pixel, und das ist absichtlich kleiner als die 380 beim eigenen Haus
 * (siehe `WUNSCH_ORTE.zuhause`): Ein selbst gegebener Name soll eine ECKE
 * meinen und nicht eine Himmelsrichtung. Wer zwei Schilder in Sichtweite
 * aufstellt, soll zwei Orte haben.
 */
export const RADIUS = 300;

/**
 * Wie viele Orte man benennen darf.
 *
 * Acht. Nicht aus Sparsamkeit: Wenn jeder Busch einen Namen hat, hat kein
 * Ort mehr einen. Die Begrenzung ist das, was die Namen wertvoll macht –
 * dieselbe Überlegung wie bei den Tagesereignissen, nur von der anderen
 * Seite.
 */
export const MAX = 8;

/** Wie lang ein Name werden darf. Ein Schild ist schmal. */
export const NAME_MAX = 24;

/**
 * Welche Zeichen auf einem Schild stehen dürfen.
 *
 * Strenger als `saeubereName` beim Tier, und das aus zwei Gründen. Der
 * harmlose: Auf einem geschnitzten Wegweiser steht kein `#@%`. Der andere:
 * Dieser Name landet in mehr Oberflächen als der Tiername – in
 * Skizzentiteln, in der Chronik, in Meldungen –, und das Spiel kann
 * Spielstände aus einer Datei laden. Nachgemessen ist der Weg dicht (alles
 * geht durch `escapeHtml` oder `textContent`), aber eine zweite Schranke an
 * der Quelle kostet nichts und hält auch dann, wenn später jemand eine neue
 * Anzeige dazuschreibt und das Entwerten vergisst.
 */
const ERLAUBT = /[A-Za-zÄÖÜäöüß0-9 \-']/;

/**
 * Einen eingegebenen Namen in einen brauchbaren verwandeln.
 *
 * Nicht ablehnen, sondern säubern: Wer „Mond-Garten!!!" eingibt, bekommt
 * „Mond-Garten" und keine Fehlermeldung. Eine Eingabe zurückzuweisen, weil
 * ein Ausrufezeichen darin steht, wäre genau die Sorte Strenge, die dieses
 * Spiel nicht hat.
 */
export function saeubereOrtsname(roh) {
  if (typeof roh !== 'string') return '';
  let raus = '';
  for (let i = 0; i < roh.length; i++) {
    const z = roh[i];
    raus += ERLAUBT.test(z) ? z : ' ';
  }
  return raus.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

/** Die Liste aus einem Spielstand – immer ein Feld, nie `undefined`. */
export function orteAus(roh) {
  if (!Array.isArray(roh)) return [];
  const raus = [];
  for (let i = 0; i < roh.length; i++) {
    const o = roh[i];
    if (!o || typeof o !== 'object') continue;
    const name = saeubereOrtsname(o.name);
    if (!name) continue;
    if (!(typeof o.x === 'number') || !(typeof o.y === 'number')) continue;
    if (!isFinite(o.x) || !isFinite(o.y)) continue;
    raus.push({ name: name, x: o.x, y: o.y });
    if (raus.length >= MAX) break;
  }
  return raus;
}

/** Leerer Stand. */
export function emptyOrte() {
  return [];
}

/**
 * Welcher benannte Ort hier gilt – oder `null`.
 *
 * Der NÄCHSTE gewinnt, nicht der erste in der Liste. Wer zwei Schilder
 * dicht beieinander stehen hat, steht an dem, bei dem er näher steht – alles
 * andere wäre willkürlich und würde sich je nach Reihenfolge des Aufstellens
 * anders verhalten.
 */
export function ortHier(orte, x, y) {
  const liste = Array.isArray(orte) ? orte : [];
  let beste = null;
  let bestD = RADIUS * RADIUS;
  for (let i = 0; i < liste.length; i++) {
    const o = liste[i];
    const dx = o.x - x;
    const dy = o.y - y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) { beste = o; bestD = d; }
  }
  return beste;
}

/** Der Name hier – oder `null`. Bequemlichkeit für die Anzeige. */
export function nameHier(orte, x, y) {
  const o = ortHier(orte, x, y);
  return o ? o.name : null;
}

/** Steht an dieser Stelle schon ein Schild? Für das Umbenennen und Abbauen. */
export function ortAnStelle(orte, x, y, tol) {
  const liste = Array.isArray(orte) ? orte : [];
  const t = (tol == null ? 48 : tol);
  for (let i = 0; i < liste.length; i++) {
    const o = liste[i];
    if (Math.abs(o.x - x) <= t && Math.abs(o.y - y) <= t) return o;
  }
  return null;
}

/** Ist noch Platz für einen weiteren Namen? */
export function nochPlatz(orte) {
  return (Array.isArray(orte) ? orte.length : 0) < MAX;
}

/**
 * Einen Ort benennen oder umbenennen. Gibt die neue Liste heraus.
 *
 * Ein leerer Name entfernt den Eintrag – so nimmt man ein Schild zurück,
 * ohne es abzubauen. `null` kommt heraus, wenn nichts geschehen kann; der
 * Aufrufer sagt dann, warum.
 */
export function benenne(orte, x, y, roh) {
  const liste = orteAus(orte);
  const name = saeubereOrtsname(roh);
  const da = ortAnStelle(liste, x, y);

  if (!name) {
    if (!da) return liste;
    return liste.filter(function (o) { return o !== da; });
  }
  if (da) {
    return liste.map(function (o) {
      return o === da ? { name: name, x: o.x, y: o.y } : o;
    });
  }
  if (!nochPlatz(liste)) return null;
  return liste.concat([{ name: name, x: x, y: y }]);
}

/** Einen Ort an dieser Stelle vergessen – wenn das Schild abgebaut wird. */
export function vergesse(orte, x, y) {
  const liste = orteAus(orte);
  const da = ortAnStelle(liste, x, y);
  if (!da) return liste;
  return liste.filter(function (o) { return o !== da; });
}

/** Wie viele Namen vergeben sind und wie viele möglich: {vergeben, moeglich}. */
export function orteStand(orte) {
  return { vergeben: (Array.isArray(orte) ? orte.length : 0), moeglich: MAX };
}
