/**
 * Größe der Oberfläche.
 *
 * Schrift, Symbole, Knöpfe und Fächer hängen im Stylesheet alle an einer
 * einzigen Zahl (`--ui-user`, siehe styles/ui.css). Hier steht, welche Werte
 * zur Wahl stehen und wie sie ins Dokument kommen.
 *
 * Eigene Datei, weil sowohl das Spiel (beim Anwenden der Einstellungen) als
 * auch das Einstellungsfenster (beim Zeichnen der Knopfreihe) sie braucht.
 * Läge sie in game.js, zeigten die beiden Module im Kreis aufeinander.
 */

/**
 * Sechs Stufen wären eine Schieberegler-Entscheidung. Vier reichen, und jede
 * ist von der nächsten deutlich zu unterscheiden.
 */
export const UI_SCALES = [
  [0.85, 'Klein'],
  [1, 'Normal'],
  [1.15, 'Groß'],
  [1.32, 'Sehr groß'],
];

export const UI_SCALE_MIN = 0.7;
export const UI_SCALE_MAX = 1.6;

/**
 * Setzt die Größe. Nur diese eine Zahl wandert ins Dokument, alles Weitere
 * rechnet das Stylesheet daraus aus.
 *
 * Ein unbekannter oder unsinniger Wert – etwa aus einer von Hand bearbeiteten
 * Einstellungsdatei – fällt still auf 1 zurück. Eine unlesbar kleine oder
 * bildschirmfüllende Oberfläche ließe sich nicht mehr zurückstellen: der
 * Knopf dafür säße mitten im Schaden.
 */
export function applyUiScale(value) {
  const n = Number(value);
  const gueltig = isFinite(n) && n >= UI_SCALE_MIN && n <= UI_SCALE_MAX ? n : 1;
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.setProperty('--ui-user', String(gueltig));
  }
  return gueltig;
}
