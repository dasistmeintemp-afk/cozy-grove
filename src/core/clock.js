/**
 * Die Uhr der Spielschleife.
 *
 * Die Simulation läuft in festen Schritten von 1/60 s. Gezeichnet wird, wann
 * der Browser Zeit hat – auf einem 144-Hz-Bildschirm dreimal so oft, nach
 * einem langen Bild auch mal gar nicht. Diese Datei rechnet aus, wie viele
 * Schritte ein Bild bekommt und wo zwischen zwei Schritten das Bild steht.
 *
 * Eigene Datei, weil sich genau hier die Fehler verstecken, die man im Bild
 * sieht und im Code nicht: Sie ist ohne Browser prüfbar.
 */

export const FIXED_DT = 1 / 60;

/**
 * Wie viele Schritte ein Bild höchstens nachholt.
 *
 * Danach wird der Rest WEGGEWORFEN, nicht aufgehoben. Das ist der Unterschied
 * zwischen einer kurzen Verlangsamung und einem Sprung: Wer eine halbe Sekunde
 * stehenbleibt (Fenster im Hintergrund, ein teures Bodenstück, die
 * Speicherbereinigung), holte sonst dreißig Schritte auf – die Figur schoss
 * ein Stück über die Wiese, und der Rest der Schuld wurde noch über die
 * folgenden Bilder abgetragen.
 */
export const MAX_CATCHUP = 5;

/** Längeres Wegbleiben zählt gar nicht erst – etwa ein anderer Tab. */
export const MAX_FRAME = 0.25;

export function makeClock() {
  return { accumulator: 0, alpha: 0, dropped: 0 };
}

/**
 * Nimmt die verstrichene Zeit an und sagt, wie viele Simulationsschritte
 * dieses Bild ausführen soll.
 *
 * Danach steht in `clock.alpha`, wie weit der nächste Schritt schon
 * angebrochen ist (0 … 1). Damit zeichnet der Renderer den Zwischenstand,
 * statt bis zum nächsten fertigen Schritt zu warten.
 *
 * @param {{accumulator:number, alpha:number, dropped:number}} clock
 * @param {number} dt verstrichene Sekunden seit dem letzten Bild
 * @returns {number} Anzahl Schritte
 */
export function advance(clock, dt) {
  const d = dt > MAX_FRAME ? MAX_FRAME : (dt > 0 ? dt : 0);
  clock.accumulator += d;

  const grenze = FIXED_DT * MAX_CATCHUP;
  if (clock.accumulator > grenze) {
    clock.dropped += clock.accumulator - grenze;
    clock.accumulator = grenze;
  }

  let steps = 0;
  while (clock.accumulator >= FIXED_DT) {
    clock.accumulator -= FIXED_DT;
    steps++;
  }
  clock.alpha = clock.accumulator / FIXED_DT;
  return steps;
}

/**
 * Wie weit die Welt seit dem letzten Bild GEZEIGT wird, in Schritten.
 *
 * Nur für Tests und zum Nachdenken: Diese Zahl muss zur verstrichenen Zeit
 * passen, sonst sieht man ein Springen – auch wenn die Simulation völlig
 * gleichmäßig läuft.
 */
export function shownAdvance(steps, alphaBefore, alphaAfter) {
  return steps + (alphaAfter - alphaBefore);
}
