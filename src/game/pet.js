/**
 * Das Haustier.
 *
 * Ein Tier, das nur hinterherläuft, ist nach drei Tagen Tapete. Damit es
 * bleibt, braucht es zwei Dinge, und beide hängen an schon vorhandenen
 * Teilen des Spiels:
 *
 * 1. **Es findet etwas.** Einmal am Tag bleibt es an einer Grabstelle oder
 *    einem versteckten Aufgabenstück stehen und scharrt. Damit wird aus dem
 *    Absuchen der Karte ein „dem Tier hinterhergehen".
 * 2. **Es benutzt deine Möbel.** Stehst du still, sucht es sich Bank,
 *    Teppich, Hängematte oder Feuerschale und legt sich hin. Gemütlichkeit
 *    war bisher eine Zahl; jetzt sitzt etwas darauf.
 *
 * Und es kommt nicht aus einem Menü. Man kauft einen **Futternapf**, stellt
 * ihn hin, und irgendwann steht ein Streuner davor. Drei Morgen füttern,
 * dann bleibt er. Ein Menüpunkt „Haustier kaufen" wäre eine Kasse; ein
 * Napf, den man hinstellt, ist ein Versprechen.
 */

/** Ohne diesen Meilenstein steht der Napf nicht im Katalog. */
export const PET_MILESTONE = 'werkzeugtag';

/** So oft muss gefüttert werden, bis der Streuner bleibt. */
export const ZAHM_NOETIG = 3;

/** Laune von 0 bis 100. Füttern hebt, ein Tag ohne senkt. */
export const LAUNE_MAX = 100;
export const LAUNE_PRO_FUTTER = 34;
export const LAUNE_PRO_TAG = -18;
/** Ab hier sucht es nichts mehr – ein hungriges Tier hat anderes zu tun. */
export const LAUNE_SUCHT_AB = 40;

/**
 * Was das Tier frisst und wie gern.
 *
 * Fisch ist das Beste, Beeren und Pilze gehen immer, Kraut ist Beilage.
 * Bewusst Dinge, die man ohnehin sammelt: Ein eigenes Futteritem hieße eine
 * Ressource, die nur einem Zweck dient und sonst im Weg liegt.
 */
export const FUTTER = {
  fish_sardine: 3, fish_mackerel: 3, fish_cod: 3, fish_roach: 3, fish_trout: 3,
  fish_catfish: 4, fish_moonfish: 5, fish_goldcarp: 5,
  berry: 2, mushroom: 2, rainmushroom: 3,
  herb: 1,
};

export function futterWert(itemId) {
  return FUTTER[itemId] || 0;
}

/** Frischer Stand – wie `emptyLoan` beim Kredit. */
export function emptyPet() {
  return {
    art: null,          // 'cat' | 'dog', sobald ein Streuner da war
    zahm: 0,            // wie oft gefüttert, bevor es bleibt
    laune: 0,
    gefuettertAm: 0,    // Tag der letzten Fütterung
    fundAm: 0,          // Tag des letzten Fundes
    name: '',
    seit: 0,            // ab welchem Tag es dazugehört
  };
}

/**
 * Welche Art auf DIESER Insel auftaucht.
 *
 * Aus dem Seed, nicht aus einem Menü: Das Tier, das vorbeikommt, ist das
 * Tier, das vorbeikommt. Eine Auswahlliste machte daraus eine Bestellung.
 */
export function petArtFor(seed) {
  return ((seed >>> 3) & 1) ? 'dog' : 'cat';
}

export function istZahm(pet) {
  return !!(pet && pet.art && pet.zahm >= ZAHM_NOETIG);
}

/** Gehört uns noch nicht, steht aber schon da. */
export function istStreuner(pet) {
  return !!(pet && pet.art && pet.zahm < ZAHM_NOETIG);
}

/**
 * Die Laune am Morgen: ein Tag ohne Futter kostet.
 *
 * Bewusst ohne Strafe darüber hinaus – ein vernachlässigtes Tier läuft
 * nicht weg. Das ist dieselbe Regel wie beim Garten und beim Kredit: Das
 * Spiel nimmt einem nichts weg, es gibt nur weniger.
 */
export function launeAmMorgen(pet, tag) {
  if (!istZahm(pet)) return pet ? pet.laune : 0;
  const tageOhne = Math.max(0, tag - (pet.gefuettertAm || 0));
  if (tageOhne <= 0) return pet.laune;
  return Math.max(0, Math.min(LAUNE_MAX, pet.laune + LAUNE_PRO_TAG * tageOhne));
}

/** Darf heute noch gefüttert werden? Einmal am Tag, wie das Mitbringsel. */
export function darfFuettern(pet, tag) {
  return !!pet && (pet.gefuettertAm || 0) !== tag;
}

/** Sucht es heute noch etwas – oder hat es schon, oder ist ihm zu mau? */
export function suchtHeute(pet, tag) {
  if (!istZahm(pet)) return false;
  if ((pet.fundAm || 0) === tag) return false;
  return (pet.laune || 0) >= LAUNE_SUCHT_AB;
}

/** Das beste Futter in der Tasche – oder null. */
export function bestesFutter(inventory) {
  if (!inventory) return null;
  let best = null;
  let wert = 0;
  for (const id in FUTTER) {
    if (inventory.count(id) <= 0) continue;
    if (FUTTER[id] > wert) {
      wert = FUTTER[id];
      best = id;
    }
  }
  return best;
}

/** Stand fürs Fenster. */
export function petStatus(pet, tag) {
  const p = pet || emptyPet();
  return {
    art: p.art,
    zahm: istZahm(p),
    streuner: istStreuner(p),
    fortschritt: Math.min(ZAHM_NOETIG, p.zahm || 0),
    noetig: ZAHM_NOETIG,
    laune: Math.round(p.laune || 0),
    hungrig: darfFuettern(p, tag),
    suchtNoch: suchtHeute(p, tag),
    seit: p.seit || 0,
  };
}

/**
 * Worauf sich das Tier legt.
 *
 * Nicht jede Deko: Auf einem Zaunstück sitzt keine Katze, und auf dem
 * Wetterhahn schon gar nicht. Das ist der Punkt, an dem Gemütlichkeit
 * aufhört, eine Zahl zu sein – man sieht, dass die Bank benutzt wird.
 */
export const RUHE_DEKO = {
  bench: 1, rug: 1, mat: 1, hammock: 1, chair: 1, firebowl: 1,
  swing: 1, table: 1, bowl: 1,
};

export function istRuheplatz(itemId) {
  return !!RUHE_DEKO[itemId];
}

/** Wie das Tier gerade drauf ist – ein Wort, keine Zahl. */
export function launeWort(laune) {
  if (laune >= 80) return 'rundum zufrieden';
  if (laune >= LAUNE_SUCHT_AB) return 'gut gelaunt';
  if (laune >= 15) return 'hat Hunger';
  return 'sehr hungrig';
}
