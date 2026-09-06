/**
 * Erinnerungsketten – die Langzeitgeschichte der Insel.
 *
 * Die Tagesaufgaben sind Tagesarbeit: erledigt, vergessen. Damit die Insel ein
 * Abenteuer wird, hat jeder Geist eine eigene Geschichte aus vier Fundstuecken,
 * die sich ueber viele Tage aufdeckt.
 *
 * **Ohne Text.** Jede Stufe ist ein Symbol. Vier Symbole nebeneinander ergeben
 * die Erinnerung – wer sie liest, liest sie selbst. Das passt zur Grundregel
 * des Spiels und braucht keine Dialogbaeume.
 *
 * Eine Stufe wird erst freigeschaltet, wenn die Freundschaft weit genug ist.
 * Danach liegt das Stueck irgendwo im Bereich des Geistes und wartet. Es geht
 * nicht in die Tasche: Aufheben schaltet die Stufe direkt weiter, sonst muesste
 * man Erinnerungen mit sich herumtragen und koennte sie verbrennen.
 *
 * Ist eine Kette vollstaendig, schenkt der Geist sein Andenken – ein Stueck
 * Deko, das man aufstellen kann, und der einzige Weg, es zu bekommen.
 */
import { SPIRIT_IDS, SPIRITS } from './spirits.js';

/** Wie viele Aufgaben je Stufe noetig sind, bevor das naechste Stueck auftaucht. */
export const QUESTS_PER_STAGE = 3;

/** Vier Stufen je Geist. */
export const STAGES = 4;

/**
 * Die Ketten. `icons` sind die vier Symbole der Erinnerung, `keepsake` das
 * Andenken am Ende. Beides greift auf vorhandene Grafiken zurueck.
 */
export const STORIES = {
  flamey: {
    keepsake: 'keepsake_locket',
    icons: ['icon_wood', 'icon_ember', 'icon_shell', 'icon_memory_locket'],
  },
  mira: {
    keepsake: 'keepsake_ribbon',
    icons: ['icon_flower_white', 'icon_herb', 'icon_flower_violet', 'icon_memory_ribbon'],
  },
  kiesel: {
    keepsake: 'keepsake_compass',
    icons: ['icon_shell', 'icon_driftwood', 'icon_bottle', 'icon_memory_compass'],
  },
  bruno: {
    keepsake: 'keepsake_photo',
    icons: ['icon_hardwood', 'icon_mushroom', 'icon_feather', 'icon_memory_photo'],
  },
  tobi: {
    keepsake: 'keepsake_music',
    icons: ['icon_copper_ore', 'icon_shard', 'icon_gem', 'icon_memory_music'],
  },
  nelly: {
    keepsake: 'keepsake_teacup',
    icons: ['icon_stone', 'icon_bone', 'icon_clay', 'icon_memory_teacup'],
  },
};

/** Welche Weltgrafik ein Fundstueck traegt. */
const PIECE_ART = {
  flamey: 'memory_locket',
  mira: 'memory_ribbon',
  kiesel: 'memory_compass',
  bruno: 'memory_photo',
  tobi: 'memory_music',
  nelly: 'memory_teacup',
};

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
 * Buchfuehrung ueber alle Ketten.
 *
 * `found[spiritId]` ist die Zahl gefundener Stuecke, `placed[spiritId]` die
 * Stufe, deren Stueck gerade in der Welt liegt (oder -1). Mehr braucht es
 * nicht: Wo genau es liegt, weiss die Welt selbst.
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
   * Darf jetzt ein Stueck ausgelegt werden?
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

  /** Ein Stueck wurde aufgehoben. Gibt die neue Zahl gefundener Stuecke. */
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

/** Nur fuer die Anzeige: Name des Geistes zu einer Kette. */
export function spiritName(spiritId) {
  return SPIRITS[spiritId] ? SPIRITS[spiritId].name : spiritId;
}
