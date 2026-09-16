/**
 * Die Weisen – was gerade gespielt wird.
 *
 * Bis hierher hatte das Spiel **eine** Melodie: sechzehn Töne, pentatonisch,
 * in zwei Fassungen (tags und nachts, unterschieden durch Tempo und eine
 * Transposition). Das ist eine Schleife von 14,7 Sekunden, und in einer
 * halben Stunde hört man sie etwa **hundertzwanzigmal**.
 *
 * Alles andere auf dieser Insel richtet sich nach Jahreszeit, Wetter, Ort und
 * Fest – die Farben, die Fische, die Falter, das Klangbett aus Brandung,
 * Wind, Grillen und Regen. Die Melodie war die einzige Schicht, die nichts
 * davon wusste.
 *
 * **Warum das hier liegt und nicht in `audio.js`.** Der Klangerzeuger in
 * `core/` weiß nichts vom Spiel und soll es auch nicht: Er bekommt gesagt,
 * was er spielen soll, so wie er sich das Klangbett sagen lässt
 * (`setAmbienceMix`). Hier stehen die Noten, dort steht der Lautsprecher.
 * Nebenbei heißt das: Diese Datei lässt sich ohne Browser prüfen.
 *
 * **Alles bleibt pentatonisch.** Fünf Töne je Tonleiter, keiner davon kann
 * gegen einen anderen klingen – dieselbe Entscheidung wie in der ersten
 * Fassung, nur jetzt mit vier verschiedenen Fünfern statt einem. Eine
 * Jahreszeit mit einer Tonleiter, in der ein falscher Ton möglich wäre, wäre
 * eine Jahreszeit, in der man die Musik ausschaltet.
 */

/**
 * Vier Tonleitern, je Jahreszeit eine – Halbtöne über dem Grundton.
 *
 * Alle fünftönig und alle ohne Halbtonreibung; sie unterscheiden sich im
 * Charakter, nicht in der Verträglichkeit:
 *
 *   dur       hell und offen          (die Leiter der ersten Fassung)
 *   sus       schwebend, ohne Terz    – nichts drängt irgendwohin
 *   weit      dunkel, große Schritte  – die wehmütigste der vier
 *   moll      ruhig und tief
 *
 * Es sind genau vier der fünf Umkehrungen derselben Fünftonleiter. Das ist
 * kein Zufall, sondern die ganze Auswahl: Mehr Fünfertonleitern OHNE
 * Halbtonschritt gibt es in zwölf Tönen nicht.
 *
 * Der erste Entwurf hatte hier Kumoi ([0, 2, 3, 7, 9]) für den Herbst, weil
 * es weich klingt – und einen Halbtonschritt zwischen 2 und 3 hat. Die
 * Klänge liegen 1,6 Takte lang übereinander; zwei Töne im Halbtonabstand
 * treffen sich dabei zwangsläufig und reiben. Die Prüfung hat es gefunden,
 * das Ohr hätte es später gefunden.
 */
export const LEITERN = {
  dur: [0, 2, 4, 7, 9],
  sus: [0, 2, 5, 7, 10],
  weit: [0, 3, 5, 8, 10],
  moll: [0, 3, 5, 7, 10],
};

/**
 * Was eine Weise ausmacht.
 *
 *   leiter    welche Tonleiter
 *   phrase    Stufen innerhalb der Leiter, in Schritten
 *   beat      Sekunden je Schritt – das Tempo
 *   lage      wie viele Stufen das Ganze verschoben wird
 *   dichte    0..1, wie oft ein Ton wirklich klingt (der Rest ist Pause)
 *   bass      alle wie viel Schritte ein Basston darunter liegt (0 = keiner)
 *   laut      Grundlautstärke eines Tons
 *
 * Die Phrasen sind bewusst verschieden lang (12 bis 20 Schritte). Bei überall
 * sechzehn liefen Melodie und Basston immer gleich, und jede Jahreszeit hätte
 * dieselbe Form mit anderen Tönen.
 */
export const WEISEN = {
  // Frühling: die Leiter der ersten Fassung, etwas rascher und höher. Alles
  // geht nach oben – das ist der ganze Trick an dieser Phrase.
  spring: {
    name: 'Frühling',
    leiter: 'dur', beat: 0.86, lage: 2, dichte: 0.78, bass: 8, laut: 0.06,
    phrase: [0, 2, 4, 3, 5, 4, 2, 1, 3, 5, 7, 5, 4, 2, 0, 2],
  },
  // Sommer: langsamer und ohne Terz, also ohne Richtung. Lange Nachmittage.
  summer: {
    name: 'Sommer',
    leiter: 'sus', beat: 1.04, lage: 2, dichte: 0.62, bass: 6, laut: 0.055,
    phrase: [0, 2, 4, 2, 5, 4, 2, 0, 4, 6, 4, 2],
  },
  // Herbst: dunkel und mit großen Schritten, und einer Phrase, die zweimal
  // ansetzt und beim zweiten Mal weiter hinunterfällt.
  autumn: {
    name: 'Herbst',
    leiter: 'weit', beat: 0.98, lage: 1, dichte: 0.7, bass: 8, laut: 0.06,
    phrase: [4, 3, 2, 3, 1, 0, 2, 1, 4, 3, 2, 0, -1, 0, 2, 1, 0, -2],
  },
  // Winter: dunkel, langsam, weit auseinander. Die wenigsten Töne von allen.
  winter: {
    name: 'Winter',
    leiter: 'moll', beat: 1.32, lage: 2, dichte: 0.5, bass: 10, laut: 0.05,
    phrase: [0, 2, 1, 4, 2, 0, -1, 0, 2, 4, 2, 1, 0, -2, 0, 1, 2, 0, -1, -3],
  },
};

/**
 * Warum Herbst und Winter nicht noch tiefer liegen.
 *
 * Der erste Entwurf setzte sie auf 0 und -2 – die dunkleren Jahreszeiten
 * sollten auch tiefer klingen. Nachgerechnet kam dabei heraus: Der Winter
 * fiel nachts mit dem Basston auf **27 Hz**. Das gibt kein Notebook und kein
 * Telefon wieder; die Jahreszeit, in der die Musik am meisten trägt, wäre
 * die einzige gewesen, in der man nichts hört.
 *
 * Die Tiefe kommt jetzt aus der PHRASE, nicht aus der Lage: Die Winterphrase
 * fällt von sich aus drei Stufen unter den Grundton, die Herbstphrase zwei –
 * die Frühlingsphrase keine. Dazu die Tonleiter, das langsamste Tempo und
 * die wenigsten Töne. Das reicht, und es bleibt hörbar.
 */


/**
 * Am Fest klingt es anders – an allen vier gleich.
 *
 * Eine eigene Weise je Fest wären vier weitere Phrasen für vier Tage im Jahr.
 * Was ein Festtag braucht, ist, dass man beim Aufwachen HÖRT, dass heute
 * etwas ist – dafür reicht eine, und sie steht über der Jahreszeit.
 */
export const FEST_WEISE = {
  name: 'Fest',
  leiter: 'dur', beat: 0.7, lage: 4, dichte: 0.88, bass: 4, laut: 0.062,
  phrase: [0, 2, 4, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0],
};

/**
 * Wie die Nacht und das Zimmer die Weise verändern.
 *
 * Als Faktoren auf die gewählte Weise, nicht als eigene Weisen: Sonst gäbe es
 * vier Jahreszeiten mal Tag/Nacht mal drinnen/draußen – sechzehn Melodien,
 * die man einzeln pflegen müsste. So bleibt es bei fünf Phrasen.
 *
 * **Nachts** wird alles langsamer, tiefer und dünner. **Drinnen** wird es
 * leiser und dünner, aber NICHT tiefer: Ein Zimmer ist kein Keller, es ist
 * nur ruhiger.
 *
 * `NACHT.lage` war -3 und ist -1. Eine Stufe sind hier zwei bis drei
 * Halbtöne – drei Stufen waren fast eine Oktave, und sie kamen ZUSÄTZLICH
 * zur Lage der Jahreszeit und zusätzlich zu den sieben Stufen, die der
 * Basston unter der Melodie liegt. Drei Verschiebungen nach unten
 * übereinander, und der Winter lag nachts unter allem, was ein Lautsprecher
 * hergibt. Eine Stufe hört man immer noch; zusammen mit dem langsameren
 * Takt, den Pausen und der geringeren Lautstärke ist die Nacht deutlich
 * genug.
 */
export const NACHT = { beat: 1.45, lage: -1, dichte: 0.72, laut: 0.85 };
export const DRINNEN = { beat: 1.12, lage: 0, dichte: 0.6, laut: 0.62 };

/** Die Tonleiter einer Weise – oder Dur, falls jemand sich vertippt hat. */
export function leiterVon(weise) {
  return LEITERN[weise && weise.leiter] || LEITERN.dur;
}

/**
 * Welche Weise gerade gilt.
 *
 * Reihenfolge: Das Fest schlägt die Jahreszeit – wie beim Tagesereignis, und
 * aus demselben Grund. Nacht und Zimmer verändern danach, was herauskam.
 *
 * @param {object} lage {season, fest, nacht, drinnen}
 */
export function weiseFuer(lage) {
  const l = lage || {};
  const grund = l.fest ? FEST_WEISE : (WEISEN[l.season] || WEISEN.spring);
  const raus = {
    name: grund.name,
    // `toene`, nicht `leiter`: Was hier herausfällt, geht an den
    // Klangerzeuger und muss FERTIG sein – die Halbtöne selbst, nicht ihr
    // Name. Die erste Fassung reichte `leiter: 'dur'` weiter; eine
    // Zeichenkette hat auch eine Länge und auch einen Index, die Rechnung
    // lief durch, und jeder Ton kam als NaN heraus. Zwei Feldnamen, zwei
    // Bedeutungen: `leiter` ist oben ein Name, `toene` hier eine Liste.
    toene: leiterVon(grund),
    phrase: grund.phrase,
    beat: grund.beat,
    lage: grund.lage,
    dichte: grund.dichte,
    bass: grund.bass,
    laut: grund.laut,
  };
  if (l.nacht) {
    raus.name += ', nachts';
    raus.beat *= NACHT.beat;
    raus.lage += NACHT.lage;
    raus.dichte *= NACHT.dichte;
    raus.laut *= NACHT.laut;
  }
  if (l.drinnen) {
    raus.name += ', drinnen';
    raus.beat *= DRINNEN.beat;
    raus.lage += DRINNEN.lage;
    raus.dichte *= DRINNEN.dichte;
    raus.laut *= DRINNEN.laut;
  }
  return raus;
}

/**
 * Eine Kennung, an der man merkt, dass sich etwas geändert hat.
 *
 * Der Klangerzeuger fängt die Phrase von vorn an, sobald sie eine andere ist –
 * sonst stünde man mitten in der Winterphrase und spielte ab Schritt neun im
 * Frühling weiter. Der Name allein reicht dafür: Er enthält Jahreszeit, Fest,
 * Nacht und Zimmer.
 */
export function weisenName(lage) {
  return weiseFuer(lage).name;
}

/** Wie lange eine Weise braucht, bis sie sich wiederholt – in Sekunden. */
export function schleifenDauer(weise) {
  return weise.phrase.length * weise.beat;
}
