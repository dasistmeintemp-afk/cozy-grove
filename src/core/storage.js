/**
 * Speicherstand im localStorage.
 * Safari im privaten Modus wirft beim Schreiben – deshalb ist alles gekapselt
 * und faellt still auf einen Speicher im Arbeitsspeicher zurueck.
 */

const KEY = 'cozy-grove:save:v1';
const SETTINGS_KEY = 'cozy-grove:settings:v1';

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

export function hasSave() {
  return readRaw(KEY) !== null;
}

export function loadSave() {
  const raw = readRaw(KEY);
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
}

export function loadSettings() {
  const raw = readRaw(SETTINGS_KEY);
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
