/**
 * Die Vorratstruhe – und wie man sie abbezahlt.
 *
 * Münzen hatten bisher kein großes Ziel: Man kaufte Saat und ab und zu ein
 * Deko-Stück, und der Rest lag herum. Ein Vorhaben, das über Wochen läuft und
 * in RATEN bezahlt wird, macht aus Verkaufen eine Entscheidung – und aus
 * einem guten Markttag einen guten Tag.
 *
 * Bewusst ohne Zinsen, ohne Frist und ohne Mahnung: Es ist kein Kredit,
 * sondern ein Sparbuch mit Ziel. Wer nie einzahlt, verliert nichts. Das ist
 * dieselbe Regel wie beim Garten – nichts verdirbt, nichts bestraft.
 *
 * Was man dafür bekommt, ist PLATZ. Deko, Andenken und Vorräte fressen die
 * Tasche auf; eine Truhe neben dem Zelt nimmt sie auf, ohne dass man etwas
 * wegwerfen muss.
 */

/**
 * Die Ausbaustufen.
 *
 * `cost` ist die Summe, die für diese Stufe zusammenkommen muss, `slots` die
 * Zahl der Fächer danach. Die Sprünge werden größer, der Nutzen bleibt
 * gleichmäßig – so ist die erste Stufe nach einem guten Tag drin und die
 * letzte ein Vorhaben für Wochen.
 */
export const STAGES = [
  { id: 1, name: 'Eine Kiste', cost: 600, slots: 16, note: 'Ein Anfang. Passt neben das Zelt.' },
  { id: 2, name: 'Eine richtige Truhe', cost: 1600, slots: 32, note: 'Mit Deckel und Beschlag.' },
  { id: 3, name: 'Ein Vorratsschrank', cost: 3600, slots: 52, note: 'Fächer, sogar beschriftet.' },
  { id: 4, name: 'Der Schuppen', cost: 7500, slots: 80, note: 'Kein Möbelstück mehr. Ein Bauwerk.' },
];

export const MAX_STAGE = STAGES.length;

export function stageOf(n) {
  for (let i = 0; i < STAGES.length; i++) if (STAGES[i].id === n) return STAGES[i];
  return null;
}

/** Wie viele Fächer die Truhe bei diesem Ausbau hat. */
export function slotsAt(stage) {
  const s = stageOf(stage);
  return s ? s.slots : 0;
}

/** Die Stufe, an der gerade gebaut wird – oder null, wenn alles steht. */
export function nextStage(stage) {
  return stageOf((stage || 0) + 1);
}

/**
 * Der Stand des Vorhabens.
 *
 * @param {object} loan { stage, paid }
 * @returns {object} { stage, offen, ziel, gezahlt, fertig, naechste }
 */
export function statusOf(loan) {
  const stage = (loan && loan.stage) || 0;
  const gezahlt = (loan && loan.paid) || 0;
  const naechste = nextStage(stage);
  return {
    stage: stage,
    slots: slotsAt(stage),
    gezahlt: gezahlt,
    ziel: naechste ? naechste.cost : 0,
    offen: naechste ? Math.max(0, naechste.cost - gezahlt) : 0,
    fertig: !naechste,
    naechste: naechste,
  };
}

/**
 * Eine Rate einzahlen.
 *
 * Nie mehr als nötig und nie mehr, als man hat: Wer 500 Münzen hat und 200
 * schuldet, zahlt 200. Sonst müsste man rechnen, bevor man klickt.
 *
 * @returns {object} { gezahlt, fertigGeworden, stage }
 */
export function pay(loan, betrag, muenzen) {
  const stand = statusOf(loan);
  if (stand.fertig || betrag <= 0) return { gezahlt: 0, fertigGeworden: false, stage: stand.stage };
  const zahlbar = Math.max(0, Math.min(betrag, muenzen, stand.offen));
  if (zahlbar <= 0) return { gezahlt: 0, fertigGeworden: false, stage: stand.stage };

  loan.paid = stand.gezahlt + zahlbar;
  if (loan.paid >= stand.ziel) {
    loan.stage = stand.stage + 1;
    loan.paid = 0;
    return { gezahlt: zahlbar, fertigGeworden: true, stage: loan.stage };
  }
  return { gezahlt: zahlbar, fertigGeworden: false, stage: loan.stage };
}

/** Ein leerer Stand – für neue Spiele und für Spielstände ohne Truhe. */
export function emptyLoan() {
  return { stage: 0, paid: 0 };
}
