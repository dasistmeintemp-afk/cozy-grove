/**
 * Der Katalog – bestellen und am nächsten Morgen auspacken.
 *
 * Er löst drei Dinge auf einmal, die einzeln je eine halbe Lösung wären:
 *
 * 1. **Deko.** Alles selbst zu bauen hieße, jedes Stück an ein Rezept und
 *    damit an Material zu hängen. Ein Katalog darf einfach eine Auswahl sein.
 * 2. **Wohin mit dem Geld.** Münzen hatten bisher die Vorratstruhe und den
 *    Händler mit seinen paar Tagesposten. Der Katalog nimmt beliebig viel und
 *    gibt dafür etwas, das man stehen sieht.
 * 3. **Die Post.** Ein Briefkasten, in dem nur Dankeszeilen liegen, ist nach
 *    einer Woche eine Textanzeige. Ein Paket ist ein Grund hinzugehen.
 *
 * Bezahlt wird beim Bestellen, geliefert wird am nächsten Morgen. Das Warten
 * ist der Punkt: Sofort im Rucksack wäre der Katalog ein zweiter Laden.
 */
import { getItem } from './items.js';

/** Wie viele Bestellungen gleichzeitig unterwegs sein dürfen. */
export const MAX_OFFEN = 3;

/**
 * Was im Katalog steht.
 *
 * `needs` ist ein Meilenstein: Die halbe Seite ist am ersten Tag noch leer,
 * und der Katalog wächst mit der Insel. `preis` liegt bewusst über dem
 * Sammlerwert des Stücks – Versand kostet, und das ist der Sinn der Sache.
 */
export const KATALOG = [
  { id: 'mat', preis: 90 },
  { id: 'chair', preis: 110 },
  { id: 'planter', preis: 145 },
  { id: 'table', preis: 165 },
  { id: 'bookstack', preis: 180 },
  { id: 'scarecrow', preis: 200 },
  { id: 'feeder', preis: 215, needs: 'fleck' },
  { id: 'paperlamp', preis: 230, needs: 'fleck' },
  { id: 'trellis', preis: 250, needs: 'fleck' },
  { id: 'bowl', preis: 260, needs: 'werkzeugtag' },
  { id: 'birdbath', preis: 285, needs: 'tasche' },
  { id: 'stonelamp', preis: 310, needs: 'tasche' },
  { id: 'firebowl', preis: 340, needs: 'tasche' },
  { id: 'beehive', preis: 380, needs: 'wald' },
  { id: 'hammock', preis: 390, needs: 'wald' },
  { id: 'bonsai', preis: 420, needs: 'wald' },
  { id: 'stringlights', preis: 430, needs: 'ruf' },
  { id: 'swing', preis: 455, needs: 'ruf' },
  { id: 'weathervane', preis: 495, needs: 'daumen' },
  { id: 'pond', preis: 560, needs: 'daumen' },
];

export function katalogEintrag(id) {
  for (let i = 0; i < KATALOG.length; i++) if (KATALOG[i].id === id) return KATALOG[i];
  return null;
}

/**
 * Der Katalog, wie er heute aussieht.
 *
 * Gesperrtes bleibt sichtbar, aber ohne Preis: Man soll wissen, dass es die
 * Schaukel gibt, sonst wirkt die Seite von Anfang an vollständig. Erfunden
 * wird nichts – jeder Eintrag zeigt auf einen echten Gegenstand.
 */
export function katalogFuer(hatMeilenstein) {
  const raus = [];
  for (let i = 0; i < KATALOG.length; i++) {
    const e = KATALOG[i];
    const item = getItem(e.id);
    if (!item) continue;
    raus.push({
      id: e.id,
      name: item.name,
      icon: item.icon,
      preis: e.preis,
      needs: e.needs || null,
      offen: !e.needs || !!(hatMeilenstein && hatMeilenstein(e.needs)),
    });
  }
  return raus;
}

/** Leerer Bestellzettel – wie `emptyLoan` beim Kredit. */
export function emptyOrders() {
  return [];
}

/**
 * Kann man das jetzt bestellen?
 *
 * @returns {{ok: boolean, grund: string}} `grund` ist leer, wenn es geht
 */
export function kannBestellen(id, muenzen, offen, hatMeilenstein) {
  const e = katalogEintrag(id);
  if (!e) return { ok: false, grund: 'Das steht nicht im Katalog' };
  if (e.needs && !(hatMeilenstein && hatMeilenstein(e.needs))) {
    return { ok: false, grund: 'Die Insel muss erst bunter werden' };
  }
  if ((offen || []).length >= MAX_OFFEN) {
    return { ok: false, grund: 'Erst auspacken, dann weiterbestellen' };
  }
  if (muenzen < e.preis) return { ok: false, grund: 'Zu wenig Münzen' };
  return { ok: true, grund: '' };
}

let bestellNr = 1;

/** Eine Bestellung aufgeben. Der Preis ist damit bezahlt. */
export function bestellen(id, tag) {
  const e = katalogEintrag(id);
  if (!e) return null;
  return { nr: 'b' + (bestellNr++) + '_' + tag, id: e.id, preis: e.preis, ab: tag + 1 };
}

/**
 * Was heute im Kasten liegt – und was noch unterwegs bleibt.
 *
 * Getrennt zurückgegeben, damit der Aufrufer die Liste ersetzt statt sie
 * beim Durchlaufen zu verändern.
 */
export function faellig(offen, tag) {
  const da = [];
  const bleibt = [];
  const liste = offen || [];
  for (let i = 0; i < liste.length; i++) {
    if (liste[i].ab <= tag) da.push(liste[i]);
    else bleibt.push(liste[i]);
  }
  return { da: da, bleibt: bleibt };
}
