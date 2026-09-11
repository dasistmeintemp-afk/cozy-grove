/**
 * Spielstand als Datei – unabhängig vom Browser.
 *
 * Der `localStorage` hängt am Browser, am Rechner und am Profil. Wer die
 * Einzeldatei weitergibt, den Browser wechselt oder seine Daten löscht, ist
 * seinen Fortschritt los. Hier liegt der Ausweg, in zwei Ausbaustufen:
 *
 *   Sichern / Laden   Eine Datei herunterladen bzw. auswählen. Funktioniert
 *                     in jedem Browser, auch per `file://`. Von Hand.
 *   Verknüpfen        Einmal eine Datei wählen; danach schreibt jedes
 *                     Speichern still dorthin. Braucht die File System Access
 *                     API – heute Chrome und Edge, nicht Safari und Firefox.
 *
 * Was ein Browser *nicht* darf: ungefragt auf die Festplatte schreiben. Die
 * erste Wahl der Datei ist deshalb immer ein Klick des Menschen, und daran
 * führt kein Weg vorbei; alles Weitere geht dann von selbst.
 *
 * Der Dateizeiger überlebt das Schließen: er liegt in einer winzigen
 * IndexedDB. Beim nächsten Öffnen fragt der Browser einmal nach Erlaubnis.
 */

const DB_NAME = 'seli-grove';
/**
 * Der Name von früher. Steht hier aus demselben Grund wie in `storage.js`:
 * Der Zeiger auf die verknüpfte Datei liegt unter dieser Adresse, und wer
 * einfach umbenennt, verliert ihn. Gelesen wird er nur, wenn unter dem neuen
 * Namen nichts liegt – danach steht der Zeiger an beiden Stellen, und die
 * alte fällt beim nächsten Löschen der Browserdaten von selbst weg.
 */
const ALT_DB_NAME = 'cozy-grove';
const STORE = 'handles';
const HANDLE_KEY = 'save';

/** Kann dieser Browser eine Datei dauerhaft verknüpfen? */
export function canLink() {
  return typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function' &&
    typeof window.indexedDB !== 'undefined';
}

/* ------------------------------------------------------- Herunterladen */

/** Schlägt einen Dateinamen vor, der den Stand erkennen lässt. */
export function suggestName(day) {
  const d = new Date();
  const p = function (n) { return (n < 10 ? '0' : '') + n; };
  return 'seli-grove-tag' + (day || 1) + '-' +
    d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.json';
}

/**
 * Lädt den Spielstand als Datei herunter.
 * @returns {boolean} ob der Browser mitgespielt hat
 */
export function download(text, filename) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'seli-grove.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Erst freigeben, wenn der Browser den Blob wirklich geholt hat
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return true;
  } catch (err) {
    console.warn('Herunterladen fehlgeschlagen', err);
    return false;
  }
}

/**
 * Lässt eine Datei auswählen und liest sie.
 * @returns {Promise<string|null>} Inhalt, oder null bei Abbruch
 */
export function openFile() {
  return new Promise(function (resolve) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    let done = false;
    function finish(value) {
      if (done) return;
      done = true;
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(value);
    }

    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) { finish(null); return; }
      const reader = new FileReader();
      reader.onload = function () { finish(String(reader.result)); };
      reader.onerror = function () { finish(null); };
      reader.readAsText(file);
    });
    // Ein Abbruch im Dateidialog meldet sich nicht zuverlässig. Ohne diese
    // Notbremse bliebe das Versprechen für immer offen.
    window.addEventListener('focus', function () {
      setTimeout(function () { if (!input.files || !input.files.length) finish(null); }, 800);
    }, { once: true });

    input.click();
  });
}

/* ---------------------------------------------------------- Verknüpfen */

function idb(name) {
  return new Promise(function (resolve, reject) {
    const req = window.indexedDB.open(name || DB_NAME, 1);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function idbPut(key, value) {
  return idb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function idbGet(key, name) {
  return idb(name).then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

/**
 * Den Dateizeiger holen – notfalls von der alten Adresse.
 *
 * Der Umzug passiert beim Fund: einmal unter den neuen Namen schreiben,
 * danach wird die alte Datenbank nicht mehr gelesen. Schlägt das Schreiben
 * fehl, ist das kein Beinbruch – der Zeiger ist trotzdem da, und beim
 * nächsten Start wird es noch einmal versucht.
 */
function holeZeiger(key) {
  return idbGet(key).then(function (gefunden) {
    if (gefunden) return gefunden;
    return idbGet(key, ALT_DB_NAME).then(function (alt) {
      if (!alt) return null;
      return idbPut(key, alt).then(function () { return alt; },
        function () { return alt; });
    });
  });
}

let handle = null;
let pendingName = null;

/** Name der verknüpften Datei, oder null. */
export function linkedName() {
  return handle ? handle.name : null;
}

/**
 * Name einer gemerkten Datei, für die die Erlaubnis noch fehlt.
 *
 * Über `file://` überlebt die Erlaubnis das Schließen des Fensters nicht –
 * der Zeiger schon. Ohne diesen Zwischenzustand hätte der Spieler beim
 * nächsten Start das Gefühl, seine Einrichtung sei weg, und würde sie jedes
 * Mal neu vornehmen. So steht sie da und braucht einen Klick.
 */
export function pendingLinkName() {
  return handle ? null : pendingName;
}

/**
 * Holt einen früher gewählten Dateizeiger zurück.
 * @returns {Promise<string|null>} Dateiname, wenn die Erlaubnis noch steht
 */
export function restoreLink() {
  if (!canLink()) return Promise.resolve(null);
  return holeZeiger(HANDLE_KEY).then(function (h) {
    if (!h) { pendingName = null; return null; }
    pendingName = h.name || null;
    // Ohne Nutzergeste lässt sich Erlaubnis nur abfragen, nicht erbitten.
    if (!h.queryPermission) { handle = h; return h.name; }
    return h.queryPermission({ mode: 'readwrite' }).then(function (state) {
      if (state !== 'granted') return null;
      handle = h;
      return h.name;
    });
  }).catch(function () { return null; });
}

/**
 * Fragt für einen zurückgeholten Zeiger die Erlaubnis an. Braucht eine
 * Nutzergeste – aus einem Klick heraus aufrufen.
 */
export function requestLinkPermission() {
  if (!canLink()) return Promise.resolve(null);
  return holeZeiger(HANDLE_KEY).then(function (h) {
    if (!h || !h.requestPermission) return null;
    return h.requestPermission({ mode: 'readwrite' }).then(function (state) {
      if (state !== 'granted') return null;
      handle = h;
      pendingName = null;
      return h.name;
    });
  }).catch(function () { return null; });
}

/**
 * Legt eine neue Spielstandsdatei an und verknüpft sie.
 * @returns {Promise<string|null>} Dateiname, oder null bei Abbruch
 */
export function linkNew(suggested) {
  if (!canLink()) return Promise.resolve(null);
  return window.showSaveFilePicker({
    suggestedName: suggested || 'seli-grove.json',
    types: [{ description: 'Cozy-Grove-Spielstand', accept: { 'application/json': ['.json'] } }],
  }).then(function (h) {
    handle = h;
    pendingName = null;
    return idbPut(HANDLE_KEY, h).then(function () { return h.name; });
  }).catch(function () { return null; });
}

/**
 * Verknüpft eine vorhandene Datei und liest sie gleich aus.
 * @returns {Promise<{name: string, text: string}|null>}
 */
export function linkExisting() {
  if (!canLink() || typeof window.showOpenFilePicker !== 'function') return Promise.resolve(null);
  return window.showOpenFilePicker({
    multiple: false,
    types: [{ description: 'Cozy-Grove-Spielstand', accept: { 'application/json': ['.json'] } }],
  }).then(function (list) {
    const h = list[0];
    return h.getFile().then(function (f) { return f.text(); }).then(function (text) {
      handle = h;
      pendingName = null;
      return idbPut(HANDLE_KEY, h).then(function () {
        return { name: h.name, text: text };
      });
    });
  }).catch(function () { return null; });
}

/** Schreibt in die verknüpfte Datei. Still – Fehler dürfen nichts stören. */
export function writeLinked(text) {
  if (!handle || !handle.createWritable) return Promise.resolve(false);
  return handle.createWritable().then(function (w) {
    return w.write(text).then(function () { return w.close(); });
  }).then(function () { return true; }).catch(function () { return false; });
}

/** Liest die verknüpfte Datei. */
export function readLinked() {
  if (!handle || !handle.getFile) return Promise.resolve(null);
  return handle.getFile().then(function (f) { return f.text(); }).catch(function () { return null; });
}

/** Löst die Verknüpfung. Die Datei selbst bleibt liegen. */
export function unlink() {
  handle = null;
  pendingName = null;
  if (!canLink()) return Promise.resolve();
  return idbPut(HANDLE_KEY, null).catch(function () { /* egal */ });
}
