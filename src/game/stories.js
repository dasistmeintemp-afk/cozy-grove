/**
 * Erinnerungsketten – die Langzeitgeschichte der Insel.
 *
 * Die Tagesaufgaben sind Tagesarbeit: erledigt, vergessen. Damit die Insel ein
 * Abenteuer wird, hat jeder Geist eine eigene Geschichte aus vier Fundstücken,
 * die sich über viele Tage aufdeckt.
 *
 * **Ohne Text.** Jede Stufe ist ein Symbol. Vier Symbole nebeneinander ergeben
 * die Erinnerung – wer sie liest, liest sie selbst. Das passt zur Grundregel
 * des Spiels und braucht keine Dialogbäume.
 *
 * Eine Stufe wird erst freigeschaltet, wenn die Freundschaft weit genug ist.
 * Danach liegt das Stück irgendwo im Bereich des Geistes und wartet. Es geht
 * nicht in die Tasche: Aufheben schaltet die Stufe direkt weiter, sonst müsste
 * man Erinnerungen mit sich herumtragen und könnte sie verbrennen.
 *
 * Ist eine Kette vollständig, schenkt der Geist sein Andenken – ein Stück
 * Deko, das man aufstellen kann, und der einzige Weg, es zu bekommen.
 */
import { SPIRIT_IDS, SPIRITS } from './spirits.js';

/** Wie viele Aufgaben je Stufe nötig sind, bevor das nächste Stück auftaucht. */
export const QUESTS_PER_STAGE = 3;

/** Vier Stufen je Geist. */
export const STAGES = 4;

/**
 * Die Ketten. `icons` sind die vier Symbole der Erinnerung, `keepsake` das
 * Andenken am Ende. Beides greift auf vorhandene Grafiken zurück.
 */
export const STORIES = {
  flamey: {
    keepsake: 'keepsake_locket',
    icons: ['icon_wood', 'icon_ember', 'icon_shell', 'icon_memory_locket'],
    intro: 'Ich habe hier mal ein Feuer gehütet. Jetzt bin ich eins.',
    lines: [
      'Ich habe immer Holz nachgelegt. Für die, die noch unterwegs waren.',
      'Nachts war ich der einzige helle Fleck an der ganzen Küste.',
      'Einmal kam jemand aus dem Nebel und legte mir die hier hin.',
      'Sie ist nie wiedergekommen. Das Feuer habe ich trotzdem gehütet.',
    ],
    close: 'Jetzt darf es mal jemand anders warm haben.',
  },
  mira: {
    keepsake: 'keepsake_ribbon',
    icons: ['icon_flower_white', 'icon_herb', 'icon_flower_violet', 'icon_memory_ribbon'],
    intro: 'Ich habe hier gelebt. Die Wiese war meine.',
    lines: [
      'Die wuchsen vor meiner Tür. Gepflückt habe ich nie eine.',
      'Gegen Husten, gegen Fieber, gegen fast alles. Sagte ich jedenfalls.',
      'Die Kinder brachten mir welche, wenn wieder jemand gesund war.',
      'Eines Tages kam keins mehr. Gesammelt habe ich trotzdem weiter.',
    ],
    close: 'Die Wiese hat auf mich gewartet. Das ist schon viel.',
  },
  kiesel: {
    keepsake: 'keepsake_compass',
    icons: ['icon_shell', 'icon_driftwood', 'icon_bottle', 'icon_memory_compass'],
    intro: 'Käpt\'n war ich mal. Jetzt sitze ich am Strand.',
    lines: [
      'Vierzig Jahre auf See. Mitgebracht habe ich Muscheln.',
      'Mein Boot liegt da draußen. In Stücken.',
      'Die hier habe ich geschrieben, als klar war: ich komme nicht an.',
      'Er zeigte bis zuletzt nach Hause. Ich bin ihm nicht gefolgt.',
    ],
    close: 'Angekommen bin ich ja doch. Nur anders.',
  },
  bruno: {
    keepsake: 'keepsake_photo',
    icons: ['icon_hardwood', 'icon_mushroom', 'icon_feather', 'icon_memory_photo'],
    intro: 'Der Wald und ich, wir kennen uns lange.',
    lines: [
      'Ich kannte hier jeden Baum. Beim Namen.',
      'Und wo die guten stehen. Verrate ich aber nicht.',
      'Im Wald ist man nie allein. Man muss nur still sein.',
      'Da war ich jung. Der Wald war auch jünger.',
    ],
    close: 'Er steht noch. Das ist mehr, als man von mir sagen kann.',
  },
  tobi: {
    keepsake: 'keepsake_music',
    icons: ['icon_copper_ore', 'icon_shard', 'icon_gem', 'icon_memory_music'],
    intro: 'Ich habe Dinge gebaut. Manche gingen sogar.',
    lines: [
      'Daraus kann man alles machen. Fast alles.',
      'Nicht jeder Versuch geht gut aus. Der hier zum Beispiel.',
      'Sieben Jahre habe ich gesucht. Dann klang es endlich.',
      'Drei Töne spielte sie. Mehr habe ich nie hinbekommen.',
    ],
    close: 'Drei Töne. Aber die richtigen.',
  },
  nelly: {
    keepsake: 'keepsake_teacup',
    icons: ['icon_stone', 'icon_bone', 'icon_clay', 'icon_memory_teacup'],
    intro: 'Ganz oben bei den Klippen. Da war mein Platz.',
    lines: [
      'Mein Haus stand ganz oben. Aus genau diesen Steinen.',
      'Vor mir waren schon andere hier. Lange vor mir.',
      'Das Geschirr habe ich selbst gebrannt. Krumm, aber meins.',
      'Zwei Tassen habe ich immer hingestellt. Für alle Fälle.',
    ],
    close: 'Setz dich. Die zweite ist noch frei.',
  },
};

/** Welche Weltgrafik ein Fundstück trägt. */
const PIECE_ART = {
  flamey: 'memory_locket',
  mira: 'memory_ribbon',
  kiesel: 'memory_compass',
  bruno: 'memory_photo',
  tobi: 'memory_music',
  nelly: 'memory_teacup',
};

/**
 * Der Satz zu einer Stufe (0-basiert), oder null.
 *
 * Die Ketten waren bis hierher reine Symbolreihen – „wer sie liest, liest sie
 * selbst". Das war hübsch gedacht, aber wer die Insel zum ersten Mal sieht,
 * versteht so nicht, wer diese Geister eigentlich waren. Ein Satz je Stück
 * reicht: zusammen ergeben die vier eine kleine Biografie, und lang wird
 * trotzdem nichts.
 */
export function storyLine(spiritId, stage) {
  const s = STORIES[spiritId];
  if (!s || !s.lines || stage < 0 || stage >= s.lines.length) return null;
  return s.lines[stage];
}

/** Der Satz zum Abschluss der Kette. */
export function storyClose(spiritId) {
  const s = STORIES[spiritId];
  return s ? s.close : null;
}

/** Was ein Geist beim ersten Treffen über sich sagt. */
export function storyIntro(spiritId) {
  const s = STORIES[spiritId];
  return s ? s.intro : null;
}

export function storyArt(spiritId) {
  return PIECE_ART[spiritId] || 'memory_locket';
}

export function storyIcon(spiritId, stage) {
  const s = STORIES[spiritId];
  if (!s) return 'icon_sparkle';
  return s.icons[Math.min(stage, s.icons.length - 1)];
}

export function keepsakeOf(spiritId) {
  const s = STORIES[spiritId];
  return s ? s.keepsake : null;
}

/**
 * Buchführung über alle Ketten.
 *
 * `found[spiritId]` ist die Zahl gefundener Stücke, `placed[spiritId]` die
 * Stufe, deren Stück gerade in der Welt liegt (oder -1). Mehr braucht es
 * nicht: Wo genau es liegt, weiß die Welt selbst.
 */
export class StoryBook {
  constructor() {
    this.found = Object.create(null);
    this.placed = Object.create(null);
    for (let i = 0; i < SPIRIT_IDS.length; i++) {
      this.found[SPIRIT_IDS[i]] = 0;
      this.placed[SPIRIT_IDS[i]] = -1;
    }
  }

  foundOf(spiritId) {
    return this.found[spiritId] || 0;
  }

  isComplete(spiritId) {
    return this.foundOf(spiritId) >= STAGES;
  }

  /** Wie viele Ketten ganz sind. */
  completeCount() {
    let n = 0;
    for (let i = 0; i < SPIRIT_IDS.length; i++) {
      if (this.isComplete(SPIRIT_IDS[i])) n++;
    }
    return n;
  }

  /**
   * Darf jetzt ein Stück ausgelegt werden?
   * Eines nach dem anderen, und nur wenn der Geist genug Aufgaben kennt.
   */
  wantsPiece(spiritId, questsDone) {
    if (this.isComplete(spiritId)) return false;
    if (this.placed[spiritId] >= 0) return false;
    const stage = this.foundOf(spiritId);
    return questsDone >= (stage + 1) * QUESTS_PER_STAGE;
  }

  markPlaced(spiritId, stage) {
    this.placed[spiritId] = stage;
  }

  /** Ein Stück wurde aufgehoben. Gibt die neue Zahl gefundener Stücke. */
  collect(spiritId) {
    this.placed[spiritId] = -1;
    this.found[spiritId] = Math.min(STAGES, this.foundOf(spiritId) + 1);
    return this.found[spiritId];
  }

  toJSON() {
    return { found: this.found, placed: this.placed };
  }

  static fromJSON(data) {
    const b = new StoryBook();
    if (!data) return b;
    for (let i = 0; i < SPIRIT_IDS.length; i++) {
      const id = SPIRIT_IDS[i];
      if (data.found && data.found[id] != null) {
        b.found[id] = Math.max(0, Math.min(STAGES, data.found[id] | 0));
      }
      if (data.placed && data.placed[id] != null) b.placed[id] = data.placed[id] | 0;
    }
    return b;
  }
}

/** Nur für die Anzeige: Name des Geistes zu einer Kette. */
export function spiritName(spiritId) {
  return SPIRITS[spiritId] ? SPIRITS[spiritId].name : spiritId;
}
