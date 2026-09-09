/**
 * Meilensteine – der lange Bogen.
 *
 * Gemessen hatte das Spiel ein Kurzstreckenproblem: Die Geschichte aller sechs
 * Geister war nach 72 Aufträgen durch, die Freundschaft nach 180, und die
 * Farbanzeige – das eine, was von Anfang bis Ende laufen soll – stand nach
 * rund 130 Aufträgen auf 100 %. Nach knapp zwei Wochen stieg keine Zahl mehr.
 *
 * Zwei Dinge ändern das. Erstens wächst die Farbe jetzt nach Fläche statt nach
 * Radius (siehe `ColorField.growByArea`): Jeder Auftrag färbt gleich viel
 * Boden ein, und weil ein großer Kreis für denselben Zuwachs mehr Radius
 * braucht, streckt sich die Anzeige von selbst – gemessen 100 % erst bei rund
 * 330 Aufträgen statt bei 130. Zweitens hängen an dieser Anzeige jetzt
 * Stationen, die etwas hergeben.
 *
 * Die Regel dabei: Ein Meilenstein gibt entweder etwas Neues zu BAUEN oder
 * etwas dauerhaft Besseres – nie nur eine Urkunde. Und einmal erreicht bleibt
 * erreicht: Wer eine Bank versetzt und dadurch einen halben Prozentpunkt
 * verliert, verliert nicht seine Werkzeuge.
 */

/**
 * Die Stationen, aufsteigend.
 *
 * `at`      Anteil der eingefärbten Insel (0..1)
 * `unlocks` Baupläne, die dieser Meilenstein freigibt (siehe `needs` im Rezept)
 * `perks`   dauerhafte Wirkungen, siehe `perksOf`
 * `gift`    einmalige Beigabe beim Erreichen
 */
export const MILESTONES = [
  {
    id: 'fleck', at: 0.10,
    name: 'Der erste Fleck',
    hint: 'Die Gießkanne lässt sich bauen.',
    icon: 'icon_can',
    gift: { items: [{ id: 'seed_berry', n: 2 }] },
  },
  {
    id: 'tasche', at: 0.20,
    name: 'Mehr passt hinein',
    hint: 'Eine dritte Taschenerweiterung an der Werkbank.',
    icon: 'icon_bag',
    gift: { coins: 60 },
  },
  {
    id: 'werkzeugtag', at: 0.33,
    name: 'Werkzeugtag',
    hint: 'Schaufel und Angel bekommen eine dritte Stufe.',
    icon: 'icon_shovel',
    gift: { ember: 10 },
  },
  {
    id: 'wald', at: 0.45,
    name: 'Der Wald erwacht',
    hint: 'Axt und Spitzhacke bekommen eine vierte Stufe.',
    icon: 'icon_axe',
    gift: { items: [{ id: 'hardwood', n: 4 }] },
  },
  {
    /**
     * Der einzige Meilenstein, der die WELT ändert.
     *
     * Absichtlich in der Mitte: Zu früh wäre die Insel ein zweiter Anfang,
     * zu spät ein Nachschlag. Hier hat man alles gesehen, was das Festland
     * hergibt, und bekommt eine ganze Ecke dazu – mit einem siebten Geist,
     * der eigene Bitten stellt, und den Vorkommen, die die letzten
     * Werkzeugstufen brauchen.
     */
    id: 'insel', at: 0.50,
    name: 'Die Stille Insel',
    hint: 'Die Boote am Sund fahren. Draußen wartet eine Insel – und Wanda Watt.',
    icon: 'icon_boat',
    unlocksRegion: 3,
    gift: { items: [{ id: 'driftwood', n: 3 }] },
  },
  {
    id: 'ruf', at: 0.58,
    name: 'Guter Ruf',
    hint: 'Der Händler zahlt dauerhaft ein Fünftel mehr.',
    icon: 'icon_coin',
    perks: { sell: 1.2 },
    gift: { coins: 120 },
  },
  {
    id: 'daumen', at: 0.70,
    name: 'Grüner Daumen',
    hint: 'Beete wachsen jeden Tag einen Schritt schneller. Und der Kescher bekommt eine vierte Stufe.',
    icon: 'icon_seed_berry',
    perks: { grow: 1 },
    gift: { items: [{ id: 'seed_moon', n: 1 }] },
  },
  {
    id: 'feuer', at: 0.82,
    name: 'Das große Feuer',
    hint: 'Der Lichtkreis des Lagerfeuers wächst um ein Viertel.',
    icon: 'icon_campfire',
    perks: { fire: 1.25 },
    gift: { ember: 25 },
  },
  {
    id: 'dank', at: 0.92,
    name: 'Die Insel dankt',
    hint: 'Alle Bitten zahlen ein Fünftel mehr.',
    icon: 'icon_heart',
    perks: { reward: 1.2 },
  },
  {
    id: 'see', at: 0.96,
    name: 'Ruhige See',
    hint: 'Die Angel bekommt eine vierte Stufe – selbst der seltenste Fisch wird fangbar.',
    icon: 'icon_rod',
    gift: { items: [{ id: 'seed_moon', n: 2 }] },
  },
  {
    id: 'ganz', at: 1,
    name: 'Die Insel ist ganz',
    hint: 'Nichts ist mehr blass. Der Laden führt von jetzt an jede Saat, jeden Tag.',
    icon: 'icon_star',
    perks: { seeds: true },
    gift: { coins: 300, ember: 50 },
  },
];

export const MILESTONE_IDS = MILESTONES.map(function (m) { return m.id; });

export function milestoneById(id) {
  for (let i = 0; i < MILESTONES.length; i++) if (MILESTONES[i].id === id) return MILESTONES[i];
  return null;
}

/**
 * Welche Meilensteine bei dieser Deckung fällig sind, aber noch fehlen.
 *
 * Absichtlich eine Liste und kein einzelner: Ein alter Spielstand, der schon
 * weit ist, holt beim ersten Start alles auf einmal nach.
 */
export function dueAt(coverage, erreicht) {
  const out = [];
  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i];
    // Die letzte Stufe steht auf 100 %; die Abtastung der Deckung ist grob,
    // darum reicht ein Hauch darunter. Sonst wartet man auf eine letzte
    // Kachel hinter einem Felsen.
    const schwelle = m.at >= 1 ? 0.995 : m.at;
    if (coverage + 1e-9 < schwelle) continue;
    if (erreicht && erreicht[m.id]) continue;
    out.push(m);
  }
  return out;
}

/** Der Meilenstein, der diesen Bereich aufschließt – oder null. */
export function milestoneForRegion(region) {
  for (let i = 0; i < MILESTONES.length; i++) {
    if (MILESTONES[i].unlocksRegion === region) return MILESTONES[i];
  }
  return null;
}

/** Der nächste noch offene Meilenstein – oder null, wenn alle stehen. */
export function nextOpen(erreicht) {
  for (let i = 0; i < MILESTONES.length; i++) {
    if (!erreicht || !erreicht[MILESTONES[i].id]) return MILESTONES[i];
  }
  return null;
}

/**
 * Die dauerhaften Wirkungen aller erreichten Meilensteine.
 *
 * Faktoren multiplizieren sich, damit später einmal zwei Stufen derselben
 * Wirkung nebeneinander stehen können, ohne dass eine die andere überschreibt.
 */
export function perksOf(erreicht) {
  const p = { sell: 1, reward: 1, fire: 1, grow: 0, seeds: false };
  if (!erreicht) return p;
  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i];
    if (!erreicht[m.id] || !m.perks) continue;
    if (m.perks.sell) p.sell *= m.perks.sell;
    if (m.perks.reward) p.reward *= m.perks.reward;
    if (m.perks.fire) p.fire *= m.perks.fire;
    if (m.perks.grow) p.grow += m.perks.grow;
    if (m.perks.seeds) p.seeds = true;
  }
  return p;
}
