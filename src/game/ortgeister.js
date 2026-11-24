/**
 * Ortsgeister – die beiden, die drinnen wohnen.
 *
 * Eine Höhle mit Erz darin ist ein Rohstofflager. Was sie zu einem ORT
 * macht, ist jemand, der dort ist und etwas von einem will. Genau das
 * unterscheidet die sieben Inselgeister von einem Beerenbusch, und genau
 * das fehlte Höhle und Mühle.
 *
 * **Warum sie keine gewöhnlichen Geister sind.** Die sieben draußen haben
 * jeder einen Farbkreis: Wer ihre Bitten erfüllt, färbt die Insel um sie
 * herum ein. Das kann ein Geist in einer Höhle nicht – dort gibt es keine
 * Insel zum Einfärben, und sein Kreis läge auf einer Karte, die man von
 * drinnen nie sieht. Ein Farbkreis am Höhleneingang wäre die naheliegende
 * Lösung und die falsche: Dann färbt man die Insel ein, indem man einem
 * Geist Dinge bringt, den man draußen gar nicht trifft.
 *
 * Sie geben deshalb **Münzen und Waren statt Farbe**. Das ist derselbe Weg,
 * den der Wanderer schon geht, und aus demselben Grund: Nicht jede Figur
 * im Spiel muss an derselben Zahl ziehen.
 *
 * **Was sie dafür haben, das sonst niemand hat: eine Kette.** Drei Bitten
 * nacheinander, die aufeinander aufbauen und eine kleine Geschichte
 * erzählen. Danach bleibt eine Bitte übrig, die sich wiederholt – damit
 * der Ort nicht tot ist, wenn die Geschichte erzählt ist.
 *
 * Alles, was sie verlangen, gibt es an IHREM Ort. Eine Bitte, für die man
 * die Höhle verlassen muss, wäre eine Bitte wie jede andere.
 */

/**
 * Wo im Raum sie stehen – als Anteil der Bodenfläche.
 *
 * Oben, hinten, abseits des Weges zum Ausgang. Ein Geist mitten im Raum
 * stünde einem beim Abbauen vor den Füßen.
 */
export const ORTGEISTER = [
  {
    id: 'glimm',
    ort: 'hoehle',
    name: 'Glimm',
    art: 'ortgeist_glimm',
    x: 0.80, y: 0.40,
    saetze: {
      gruss: [
        'Hier unten hört man den Berg atmen.',
        'Oh. Besuch.',
        'Leise. Der Stein schläft.',
      ],
      dank: ['Das glimmt gut.', 'Danke. Jetzt sehe ich dich.', 'Aah. Heller.'],
      warten: ['Noch nicht genug.', 'Hm. Fast.'],
      fertig: [
        'Ich habe alles, was ich brauche. Bleib trotzdem.',
        'Setz dich. Der Stein erzählt gleich weiter.',
      ],
      voll: ['Deine Tasche ist voll. Leg erst etwas ab.'],
    },
    /**
     * Die Kette. Drei Bitten, und jede sagt etwas über ihn.
     *
     * Erst sieht er nichts, dann hört er etwas, dann will er wissen, wie
     * es oben aussieht. Die Mondblume am Ende ist das einzige Stück von
     * draußen in der ganzen Kette, und sie ist der Punkt: Er fragt nach
     * dem Himmel.
     */
    bitten: [
      {
        satz: 'Mein Moos ist fast aus. Bringst du mir welches?',
        will: [{ id: 'leuchtmoos', n: 3 }],
        lohn: { coins: 60, items: [{ id: 'stone', n: 3 }] },
      },
      {
        satz: 'Hinter dem Stein klingt etwas. Hol es heraus?',
        will: [{ id: 'hoehlenkristall', n: 2 }],
        lohn: { coins: 140, items: [{ id: 'gem', n: 1 }] },
      },
      {
        satz: 'Wie sieht es oben aus? Bring mir etwas, das dort wächst.',
        will: [{ id: 'moonflower', n: 1 }, { id: 'leuchtmoos', n: 2 }],
        lohn: { coins: 220, items: [{ id: 'amber', n: 1 }] },
      },
    ],
    dauerbitte: {
      satz: 'Ein bisschen Moos? Für die dunklen Ecken.',
      will: [{ id: 'leuchtmoos', n: 2 }],
      lohn: { coins: 45, items: [] },
    },
  },
  {
    id: 'knarr',
    ort: 'muehle',
    name: 'Knarr',
    art: 'ortgeist_knarr',
    x: 0.80, y: 0.34,
    saetze: {
      gruss: [
        'Knarr. So heiße ich, so klinge ich.',
        'Der Wind ist heute faul.',
        'Vorsicht, der Boden ist mehlig.',
      ],
      dank: ['Das mahlt sich gut.', 'Guter Sack.', 'Jetzt läuft es wieder.'],
      warten: ['Da fehlt noch was.', 'Knarr. Noch nicht.'],
      fertig: [
        'Sie läuft wieder. Hör mal.',
        'Alles getan. Bleib und hör zu.',
      ],
      voll: ['Deine Tasche ist voll. So nehme ich nichts an.'],
    },
    bitten: [
      {
        satz: 'Der Stein läuft trocken. Hast du Mehl für mich?',
        will: [{ id: 'mehl', n: 3 }],
        lohn: { coins: 70, items: [{ id: 'wood', n: 4 }] },
      },
      {
        satz: 'Das Segeltuch ist hin. Flicken wir es.',
        will: [{ id: 'fiber', n: 4 }, { id: 'mehl', n: 2 }],
        lohn: { coins: 150, items: [{ id: 'hardwood', n: 3 }] },
      },
      {
        satz: 'Einmal noch mahlen wie früher. Alles, was du hast.',
        will: [{ id: 'mehl', n: 5 }, { id: 'herb', n: 2 }],
        lohn: { coins: 240, items: [{ id: 'seed_berry', n: 2 }] },
      },
    ],
    dauerbitte: {
      satz: 'Zwei Sack Mehl, dann läuft sie weiter.',
      will: [{ id: 'mehl', n: 2 }],
      lohn: { coins: 50, items: [] },
    },
  },
];

export const ORTGEIST_IDS = ORTGEISTER.map(function (g) { return g.id; });

/** Der Geist, der in diesem Innenort wohnt – oder null. */
export function ortgeistFuer(ortId) {
  for (let i = 0; i < ORTGEISTER.length; i++) {
    if (ORTGEISTER[i].ort === ortId) return ORTGEISTER[i];
  }
  return null;
}

export function ortgeistById(id) {
  for (let i = 0; i < ORTGEISTER.length; i++) {
    if (ORTGEISTER[i].id === id) return ORTGEISTER[i];
  }
  return null;
}

/**
 * Welche Bitte gerade offen ist.
 *
 * Nach der dritten kommt die Dauerbitte, und zwar immer dieselbe – nicht
 * eine zufällige aus einer Liste. Ein Geist, der jeden Tag etwas anderes
 * will, ist ein Auftragsbrett; einer, der immer dasselbe will, ist jemand,
 * den man kennt.
 */
export function offeneBitte(geist, stufe) {
  if (!geist) return null;
  const s = stufe | 0;
  if (s < geist.bitten.length) return geist.bitten[s];
  return geist.dauerbitte;
}

/** Ist die Geschichte dieses Geistes erzählt? */
export function ketteFertig(geist, stufe) {
  return !!geist && (stufe | 0) >= geist.bitten.length;
}

/** Der leere Stand im Spielstand. */
export function emptyOrtgeister() {
  const raus = Object.create(null);
  for (let i = 0; i < ORTGEISTER.length; i++) {
    raus[ORTGEISTER[i].id] = { stufe: 0, gegeben: 0, letzterTag: 0 };
  }
  return raus;
}

/**
 * Was davon aus einem Spielstand übernommen wird.
 *
 * Nur Zahlen, und jede begrenzt: Ein alter Spielstand, der den Geist noch
 * nicht kennt, bekommt einen frischen Stand, und einer mit einer Stufe
 * jenseits der Kette rutscht auf deren Ende statt ins Leere zu zeigen.
 */
export function ortgeisterAus(roh) {
  const raus = emptyOrtgeister();
  if (!roh || typeof roh !== 'object') return raus;
  for (let i = 0; i < ORTGEISTER.length; i++) {
    const g = ORTGEISTER[i];
    const e = roh[g.id];
    if (!e || typeof e !== 'object') continue;
    raus[g.id] = {
      stufe: Math.max(0, Math.min(g.bitten.length, Number(e.stufe) || 0)),
      gegeben: Math.max(0, Number(e.gegeben) || 0),
      letzterTag: Math.max(0, Number(e.letzterTag) || 0),
    };
  }
  return raus;
}
