/**
 * Speicherstand im localStorage.
 * Safari im privaten Modus wirft beim Schreiben – deshalb ist alles gekapselt
 * und fällt still auf einen Speicher im Arbeitsspeicher zurück.
 */

const KEY = 'seli-grove:save:v1';
const SETTINGS_KEY = 'seli-grove:settings:v1';

/**
 * Die Adressen aus der Zeit, als das Spiel anders hieß.
 *
 * Ein Name im Browser-Speicher ist keine Beschriftung, sondern eine Adresse:
 * Wer ihn einfach ändert, wirft damit jeden vorhandenen Spielstand weg.
 * Deshalb wird nicht umbenannt, sondern UMGEZOGEN – beim ersten Lesen einmal
 * kopiert und der alte Platz geräumt. Wer das Spiel schon gespielt hat,
 * merkt davon nichts; wer neu anfängt, hinterlässt den alten Namen nie.
 *
 * Stehen bleiben dürfen die beiden Zeilen trotzdem nicht ewig: Sobald
 * absehbar ist, dass niemand mehr einen Stand von vorher hat, können sie
 * samt `umziehen` weg.
 */
const ALT_KEY = 'cozy-grove:save:v1';
const ALT_SETTINGS_KEY = 'cozy-grove:settings:v1';

let memoryFallback = Object.create(null);
let usesFallback = false;

function backend() {
  if (usesFallback) return null;
  try {
    const ls = window.localStorage;
    const probe = '__cg_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch (err) {
    usesFallback = true;
    return null;
  }
}

function readRaw(key) {
  const ls = backend();
  if (!ls) return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : null;
  try {
    return ls.getItem(key);
  } catch (err) {
    usesFallback = true;
    return null;
  }
}

function writeRaw(key, value) {
  const ls = backend();
  if (!ls) {
    memoryFallback[key] = value;
    return false;
  }
  try {
    ls.setItem(key, value);
    return true;
  } catch (err) {
    usesFallback = true;
    memoryFallback[key] = value;
    return false;
  }
}

function removeRaw(key) {
  const ls = backend();
  if (!ls) {
    delete memoryFallback[key];
    return;
  }
  try {
    ls.removeItem(key);
  } catch (err) {
    /* egal */
  }
}

export function isPersistent() {
  return backend() !== null;
}

/**
 * Unter der neuen Adresse nachsehen – und sonst unter der alten nachziehen.
 *
 * Das Räumen hängt am Erfolg des Schreibens: Im privaten Fenster schlägt es
 * fehl, und dann bleibt der alte Platz das Original. Einen Stand zu löschen,
 * den man nicht woanders untergebracht hat, wäre der eine Fehler, den man
 * hier nicht machen darf.
 */
function umziehen(key, altKey) {
  const jetzt = readRaw(key);
  if (jetzt !== null) return jetzt;
  const alt = readRaw(altKey);
  if (alt === null) return null;
  if (writeRaw(key, alt)) removeRaw(altKey);
  return alt;
}

export function hasSave() {
  return umziehen(KEY, ALT_KEY) !== null;
}

export function loadSave() {
  const raw = umziehen(KEY, ALT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== 1) return null;
    return data;
  } catch (err) {
    console.warn('Speicherstand unlesbar, wird ignoriert.', err);
    return null;
  }
}

export function writeSave(data) {
  return writeRaw(KEY, JSON.stringify(data));
}

export function clearSave() {
  removeRaw(KEY);
  // Auch den alten Platz, sonst käme ein gelöschter Stand beim nächsten
  // Start als „Weiterspielen" zurück.
  removeRaw(ALT_KEY);
}

export function loadSettings() {
  const raw = umziehen(SETTINGS_KEY, ALT_SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function writeSettings(data) {
  return writeRaw(SETTINGS_KEY, JSON.stringify(data));
}
