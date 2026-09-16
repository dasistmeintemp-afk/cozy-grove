/**
 * Die Skizzen – was Seli von einem Platz mitnimmt.
 *
 * Draußen und drinnen berührten einander bisher nur über Möbel: Man trug
 * einen Stuhl hinein. **Was die Insel selbst hergibt – ein Abend an den
 * Klippen, der erste Schnee am Wasser – blieb draußen**, und an der Wand
 * hingen allgemeine Bilder, die überall hätten hängen können.
 *
 * **Kein Bildschirmfoto.** Gespeichert wird nicht, was zu sehen war, sondern
 * WORAUS es bestand: Ort, Jahreszeit, Tageszeit, Wetter. Gemalt wird daraus
 * beim Aufhängen. Drei Gründe, und der erste ist der wichtigste:
 *
 * 1. In diesem Projekt liegt keine einzige Bilddatei, und alles entsteht zur
 *    Laufzeit. Ein festgehaltener Bildausschnitt wäre der einzige Gegenstand
 *    im Spiel, der ein Abbild ist statt einer Zeichnung – und er sähe auch
 *    so aus, nämlich wie ein Foto in einem Aquarell.
 * 2. Vier Angaben im Spielstand statt einer Bilddatei. Ein Spielstand ist
 *    eine JSON-Datei, die man verschicken können soll.
 * 3. Der Maler kann daraus etwas machen, was der Ausschnitt nicht hergäbe:
 *    ein Bild, das den Platz MEINT statt ihn zu zeigen.
 *
 * **Eine Skizze je Ort und Jahreszeit.** Nicht je Tag: Sonst hätte man nach
 * drei Wochen vierzig Bilder von derselben Bank. So wird der Zettel eine
 * Sammlung – wer die Klippen im Winter will, muss im Winter hinauf –, und
 * sie kann nicht überlaufen: sieben Orte mal vier Jahreszeiten.
 */

/**
 * Die Orte, die eine eigene Skizze bekommen.
 *
 * Dieselben Kennungen wie bei den Wunschplätzen (`wishes.js`) – ein zweites
 * Ortsverzeichnis daneben wären zwei Wahrheiten darüber, wo man gerade ist.
 * `sitz`, `licht` und die anderen Sachwünsche stehen nicht dabei: Sie sagen,
 * was dort STEHT, nicht wo man ist.
 */
export const ORTE = {
  wasser: { name: 'Am Wasser', rang: 1 },
  wald: { name: 'Im Wald', rang: 2 },
  klippen: { name: 'An den Klippen', rang: 3 },
  insel: { name: 'Auf der Stillen Insel', rang: 4 },
  lager: { name: 'Am Lagerfeuer', rang: 0 },
  zuhause: { name: 'Zuhause', rang: 5 },
  abseits: { name: 'Weit weg von allem', rang: 6 },
};

export const ORT_IDS = Object.keys(ORTE);

/** Die Tageszeiten, in der Reihenfolge des Tages. */
export const ZEITEN = {
  morgen: 'am Morgen',
  tag: 'am Tag',
  abend: 'am Abend',
  nacht: 'in der Nacht',
};

export const JAHRESZEITEN = {
  spring: 'im Frühling',
  summer: 'im Sommer',
  autumn: 'im Herbst',
  winter: 'im Winter',
};

export const WETTER = {
  regen: 'im Regen',
  nebel: 'im Nebel',
  schnee: 'im Schnee',
};

/**
 * Welcher Ort gemeint ist, wenn mehrere zutreffen.
 *
 * Am Lagerfeuer steht man auch „bei deinem Zuhause" und oft auch „am
 * Wasser". Gemalt wird aber ein Bild, und ein Bild zeigt EINEN Platz. Der
 * Rang entscheidet, und er läuft von innen nach außen: das Lager zuerst,
 * „weit weg von allem" zuletzt. Wer am Feuer sitzt, hat eine Skizze vom
 * Feuer – nicht vom Wasser dahinter.
 */
export function ortAus(orte) {
  const liste = Array.isArray(orte) ? orte : [];
  let beste = null;
  for (let i = 0; i < liste.length; i++) {
    const o = ORTE[liste[i]];
    if (!o) continue;
    if (!beste || o.rang < ORTE[beste].rang) beste = liste[i];
  }
  return beste;
}

/** Welche Tageszeit `ruheLage` gerade meint. */
export function zeitAus(lage) {
  const l = lage || {};
  if (l.nacht) return 'nacht';
  if (l.abend) return 'abend';
  if (l.morgen) return 'morgen';
  return 'tag';
}

/**
 * Eine Skizze aus dem, was `ruheLage()` ohnehin weiß.
 *
 * Nichts davon ist fürs Zeichnen erfunden worden: Die Ortsprüfungen kommen
 * von den Wünschen, Wetter und Jahreszeit vom Tag, die Tageszeit von der
 * Uhr. Genau dieselben Angaben, aus denen Seli beim Ausruhen ihre Sätze
 * wählt – sie sagt etwas über den Platz, und jetzt behält sie ihn auch.
 *
 * @returns {?object} {ort, jahreszeit, zeit, wetter, tag} – oder null
 */
export function skizzeAus(lage, tag) {
  const l = lage || {};
  const ort = ortAus(l.orte);
  if (!ort) return null;
  if (!JAHRESZEITEN[l.jahreszeit]) return null;
  return {
    ort: ort,
    jahreszeit: l.jahreszeit,
    zeit: zeitAus(l),
    wetter: WETTER[l.wetter] ? l.wetter : null,
    tag: tag | 0,
  };
}

/**
 * Woran zwei Skizzen als dieselbe erkannt werden.
 *
 * Ort und Jahreszeit, sonst nichts. Tageszeit und Wetter stehen zwar IN der
 * Skizze – sie machen sie zu einer bestimmten Erinnerung –, aber sie machen
 * sie nicht zu einer neuen: Wer eine Woche lang jeden Abend auf derselben
 * Bank sitzt, soll nicht sieben Bilder davon bekommen.
 */
export function kennung(skizze) {
  if (!skizze) return null;
  return skizze.ort + ':' + skizze.jahreszeit;
}

/** Steht die schon im Zettel? */
export function schonDa(bilder, skizze) {
  const k = kennung(skizze);
  if (!k) return true;
  const liste = bilder || [];
  for (let i = 0; i < liste.length; i++) {
    if (kennung(liste[i]) === k) return true;
  }
  return false;
}

/**
 * Wie die Skizze heißt.
 *
 * „An den Klippen, im Herbst, am Abend" – und bei Wetter ein viertes Stück.
 * Der Titel ist die ganze Beschriftung: Ein Bild, unter dem ein Datum steht,
 * ist ein Beleg; eines, unter dem ein Ort und eine Jahreszeit stehen, ist
 * eine Erinnerung.
 */
export function titel(skizze) {
  if (!skizze || !ORTE[skizze.ort]) return '';
  const teile = [ORTE[skizze.ort].name, JAHRESZEITEN[skizze.jahreszeit], ZEITEN[skizze.zeit]];
  if (skizze.wetter && WETTER[skizze.wetter]) teile.push(WETTER[skizze.wetter]);
  return teile.filter(Boolean).join(', ');
}

/** Wie viele es überhaupt geben kann. */
export function moeglich() {
  return ORT_IDS.length * Object.keys(JAHRESZEITEN).length;
}

/**
 * Eine Skizze aus einem Spielstand – oder null.
 *
 * Streng: Was hier durchkommt, geht an den Maler, und der rechnet mit
 * Kennungen, die es gibt. Ein Spielstand ist eine Datei, die man von Hand
 * ändern kann.
 */
export function skizzeAusRoh(roh) {
  if (!roh || typeof roh !== 'object') return null;
  if (!ORTE[roh.ort]) return null;
  if (!JAHRESZEITEN[roh.jahreszeit]) return null;
  return {
    ort: roh.ort,
    jahreszeit: roh.jahreszeit,
    zeit: ZEITEN[roh.zeit] ? roh.zeit : 'tag',
    wetter: WETTER[roh.wetter] ? roh.wetter : null,
    tag: Number.isFinite(roh.tag) ? roh.tag | 0 : 0,
  };
}

/** Der ganze Zettel aus einem Spielstand – ohne Doppelte. */
export function bilderAus(roh) {
  if (!Array.isArray(roh)) return [];
  const raus = [];
  const gesehen = Object.create(null);
  for (let i = 0; i < roh.length; i++) {
    const s = skizzeAusRoh(roh[i]);
    if (!s) continue;
    const k = kennung(s);
    if (gesehen[k]) continue;
    gesehen[k] = true;
    raus.push(s);
  }
  return raus;
}

/**
 * Der Zettel, sortiert wie er im Fenster stehen soll.
 *
 * Nach Ort, dann nach Jahreszeit – nicht nach Aufnahmetag. Eine Liste in der
 * Reihenfolge des Findens wächst unten an und sieht nach Verlauf aus; nach
 * Ort sortiert sieht man auf einen Blick, welche Jahreszeit an den Klippen
 * noch fehlt. Dasselbe wie im Fundbuch.
 */
export function sortiert(bilder) {
  const jz = Object.keys(JAHRESZEITEN);
  return (bilder || []).slice().sort(function (a, b) {
    const d = ORTE[a.ort].rang - ORTE[b.ort].rang;
    if (d) return d;
    return jz.indexOf(a.jahreszeit) - jz.indexOf(b.jahreszeit);
  });
}
