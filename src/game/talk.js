/**
 * Geplauder – was ein Geist sagt, wenn es nichts zu tun gibt.
 *
 * Das Spiel hatte für diesen Fall genau einen Satz je Geist: „Genug für
 * heute." Wer eine Insel dreißig Tage spielt, hört ihn dreißigmal. Danach
 * spricht man die Geister nicht mehr an, weil man schon weiß, was kommt –
 * und damit hört die Insel auf, bewohnt zu sein.
 *
 * Das ist die eigentliche Decke eines Spiels ohne Ende, und sie lässt sich
 * nicht durch ein System heben, sondern nur durch Schreiben. Hier steht das
 * Geschriebene.
 *
 * **Die Regel, an der sich jeder neue Satz messen lassen muss:** Er sagt
 * etwas über DIESEN Geist oder über DIESEN Moment – Wetter, Jahreszeit,
 * Uhrzeit, wie gut man sich kennt, wie es um ihn herum aussieht. Ein Satz,
 * den jeder Geist an jedem Tag sagen könnte, gehört nicht hierher; davon gab
 * es schon einen.
 *
 * **Die zweite Regel:** Niemand bekommt einen Auftrag. Geplauder ist kein
 * versteckter Hinweis, keine Aufgabe, kein „Du solltest mal". Es ist die
 * Insel, die spricht, während man nichts zu erledigen hat.
 *
 * Aufbau wie bei den Ausruh-Gedanken in `rest.js`: Gruppen, Gewichte,
 * Gedächtnis. Nur dass hier jeder Geist seine eigenen Gruppen hat – sonst
 * klängen sieben Figuren gleich, und das wäre schlimmer als Schweigen.
 */
import { SPIRITS } from './spirits.js';

/**
 * Wie stark eine Gruppe gegenüber den anderen zählt.
 *
 * Das Ungewöhnliche zuerst: Schnee kommt selten, und wenn er kommt, soll
 * jemand etwas dazu sagen. Die Jahreszeit dagegen gilt ein Vierteljahr lang;
 * käme sie zu oft, hätte man ihren Satz nach drei Tagen ausgehört.
 */
export const GEWICHT = {
  wetter: 5,
  naehe: 4,
  deko: 3,
  zeit: 3,
  jahreszeit: 2,
  immer: 1,
};

/** So viele zuletzt gesagte Sätze werden gemieden – je Geist getrennt. */
export const PLAUDER_MERK = 10;

/**
 * Ab welcher Freundschaftsstufe jemand wärmer wird.
 *
 * Zehn Stufen gibt es, drei erledigte Bitten je Stufe. Vier heißt: Man hat
 * ungefähr zwölf Dinge füreinander getan. Das ist der Punkt, an dem Bruno
 * aufhört zu grummeln – früher wäre es geschenkt, später merkt es keiner.
 */
export const FREUND_AB = 4;

/**
 * Ab wann es um einen Geist herum „gemütlich" aussieht – und ab wann „kahl".
 *
 * Dieselbe Stufe, die das Spiel ohnehin ausrechnet (`cosyLevel`, 0 bis 5).
 * Zwei Tabellen dafür wären zwei Wahrheiten.
 */
export const GEMUETLICH_AB = 3;
export const KAHL_BIS = 0;

/**
 * Das Geschriebene.
 *
 * Sieben Figuren, und man soll sie auch ohne Namensschild auseinanderhalten:
 *
 *   Flämmchen   Feuergeist. Ein bis drei Wörter, nie ein Nebensatz. Alles
 *               ist warm oder kalt, hell oder dunkel.
 *   Mira        Die Wiese. Freundlich, riecht und sieht etwas, zeigt darauf.
 *   Kiesel      Vierzig Jahre zur See. Knapp, seemännisch, Wetter ist Arbeit.
 *   Bruno       Der Wald. Brummt. Sagt ein Wort, wo drei gingen.
 *   Tobi        Tüftler. Praktisch, begeistert, spricht über das Wie.
 *   Nelly       Klippen, Nadel, zwei Tassen. Höflich, gastgebend, ein wenig
 *               förmlich – und allein.
 *   Wanda       Die stille Insel. Wenig Worte, lange Blicke, Gezeiten.
 */
export const PLAUDEREI = {
  flamey: {
    regen: ['Zisch.', 'Ich mach mich klein.'],
    nebel: ['Alles weich.', 'Ich seh nur mich.'],
    schnee: ['Kalt! Aber schön.', 'Es fällt und fällt.'],
    spring: ['Es wird wärmer. Endlich.', 'Grün!'],
    summer: ['Heute bin ich nicht der Wärmste.', 'Alles glüht ein bisschen.'],
    autumn: ['Es raschelt so gut.', 'Mehr Holz. Bitte.'],
    winter: ['Näher ran.', 'Ich reiche nicht weit heute.'],
    morgen: ['Ich bin noch ganz klein.', 'Gleich flacker ich richtig.'],
    nacht: ['Jetzt bin ich der Hellste.', 'Sieh mal, wie weit ich leuchte.'],
    freund: ['Du bist oft da.', 'Bei dir knister ich lieber.'],
    gemuetlich: ['Hier ist es schön geworden.', 'So viel Licht.'],
    kahl: ['Nur ich hier.', 'Etwas leer.'],
  },

  mira: {
    regen: ['Alles trinkt gerade.', 'Morgen steht hier mehr.'],
    nebel: ['Die Wiese hört einfach auf.', 'Man riecht mehr als man sieht.'],
    schnee: ['Darunter wartet alles.', 'Ganz still ist sie jetzt.'],
    spring: ['Schau mal, was aufgeht!', 'Das ging schnell dieses Jahr.'],
    summer: ['Es summt überall.', 'Am Mittag macht die Wiese Pause.'],
    autumn: ['Die Samen sind reif. Ich lasse sie.', 'Jetzt riecht es nach Erde.'],
    winter: ['Sie schläft nur.', 'Unter dem Grau ist alles noch da.'],
    morgen: ['Alles nass, alles glänzt.', 'Die ersten sind schon offen.'],
    nacht: ['Jetzt blüht anderes.', 'Riech mal – nachts ist es stärker.'],
    freund: ['Ich hab schon auf dich gewartet.', 'Mit dir schaut es sich schöner an.'],
    gemuetlich: ['Es sieht aus wie ein Garten.', 'Du hast ein gutes Auge.'],
    kahl: ['Ein bisschen nackt hier.', 'Etwas Farbe täte gut.'],
  },

  kiesel: {
    regen: ['Nass von oben, nass von unten.', 'Bei dem Wetter bleibt man an Land.'],
    nebel: ['Da draußen fährt jetzt keiner.', 'Man hört die Küste, mehr nicht.'],
    schnee: ['Salz und Schnee. Merkwürdig.', 'Auf See wäre das jetzt ungemütlich.'],
    spring: ['Gute Zeit zum Auslaufen. Früher.', 'Der Wind wird handlich.'],
    summer: ['Flaute. Nichts zu machen.', 'Zu ruhig für meinen Geschmack.'],
    autumn: ['Jetzt kommt was von Westen.', 'Da baut sich was auf.'],
    winter: ['Steh mal aus dem Wind.', 'Die See ist grau bis zum Grund.'],
    morgen: ['Um die Zeit war ich immer schon draußen.', 'Erste Wache.'],
    nacht: ['Keine Lichter da draußen.', 'Nachts hört man die Brandung weiter.'],
    freund: ['Du hältst durch. Das rechne ich dir an.', 'Setz dich. Kostet nix.'],
    gemuetlich: ['Sieht fast wohnlich aus.', 'Ordentlich, was du gemacht hast.'],
    kahl: ['Sand und Sand.', 'Hier steht nix rum.'],
  },

  bruno: {
    regen: ['Der Wald braucht das.', 'Unter den Kronen bleibt man trocken.'],
    nebel: ['Zwischen den Stämmen bleibt er hängen.', 'Man geht besser nicht weit.'],
    schnee: ['Alles leise jetzt.', 'Die Äste tragen schwer.'],
    spring: ['Es treibt aus.', 'Zu laut. Überall Vögel.'],
    summer: ['Im Schatten ist es auszuhalten.', 'Trocken. Mag ich nicht.'],
    autumn: ['Gute Zeit.', 'Alles fällt, wie es soll.'],
    winter: ['Jetzt sieht man, wie sie stehen.', 'Ohne Blätter ist der Wald ehrlich.'],
    morgen: ['Um die Zeit gehört er noch keinem.', 'Still. So mag ich ihn.'],
    nacht: ['Da draußen ist mehr los als tags.', 'Hörst du das? Ich schon.'],
    freund: ['Du bist in Ordnung.', 'Von mir aus kannst du bleiben.'],
    gemuetlich: ['Hmpf. Gefällt mir.', 'Passt hierher. Erstaunlich.'],
    kahl: ['Bäume reichen mir.', 'Steht ja nix rum. Gut so.'],
  },

  tobi: {
    regen: ['Das Dach hält. Zum Glück.', 'Gut für die Werkstatt. Kühl.'],
    nebel: ['Da sieht man die eigene Hand nicht.', 'Feinmechanik bei Nebel: schlechte Idee.'],
    schnee: ['Alles klemmt bei der Kälte.', 'Schnee ist eigentlich auch nur Wasser.'],
    spring: ['Neue Saison, neue Versuche!', 'Jetzt geht wieder was.'],
    summer: ['Das Harz wird weich. Praktisch.', 'Zu warm zum Löten.'],
    autumn: ['Beste Zeit zum Bauen.', 'Kühl genug für ordentliche Arbeit.'],
    winter: ['Die Finger machen nicht mit.', 'Drinnen geht alles besser.'],
    morgen: ['Frisch ans Werk!', 'Ich hab schon eine Idee.'],
    nacht: ['Beim Lampenlicht sieht man Fehler schlechter.', 'Noch eine Stunde. Nur noch eine.'],
    freund: ['Du verstehst das mit den Dingen.', 'Dir zeig ich das Nächste zuerst.'],
    gemuetlich: ['Gut durchdacht, das alles.', 'Sieht aus, als hätte es jemand geplant.'],
    kahl: ['Viel Platz für Ideen.', 'Da fehlt noch was. Irgendwas.'],
  },

  nelly: {
    regen: ['Auf den Klippen ist es jetzt ungemütlich.', 'Hörst du es auf den Steinen?'],
    nebel: ['Man sieht bis zur Kante. Weiter nicht.', 'Da bleibt man besser sitzen.'],
    schnee: ['Wie ein Tuch über allem.', 'Es wäre ein guter Tag für Tee.'],
    spring: ['Der Wind wird endlich freundlich.', 'Man kann wieder draußen sitzen.'],
    summer: ['Von hier oben sieht man weit.', 'Ein bisschen Zug ist immer.'],
    autumn: ['Es zieht jetzt von der See her.', 'Ich nähe mir was Wärmeres.'],
    winter: ['Kalt hier oben. Aber hell.', 'Ich habe die Hände in den Ärmeln.'],
    morgen: ['So früh liegt das Licht schön schräg.', 'Guten Morgen. Wirklich.'],
    nacht: ['Von hier sieht man jedes Licht der Insel.', 'Ich zähle sie manchmal.'],
    freund: ['Die zweite Tasse ist nicht mehr umsonst da.', 'Setz dich doch.'],
    gemuetlich: ['Das sieht jetzt nach etwas aus.', 'Ich muss sagen: hübsch.'],
    kahl: ['Steine, Wind und ich.', 'Es dürfte etwas gemütlicher sein.'],
  },

  wanda: {
    regen: ['Wasser von oben, Wasser ringsum.', 'Heute rauscht es doppelt.'],
    nebel: ['Jetzt ist die Insel wirklich allein.', 'Drüben gibt es gerade nicht.'],
    schnee: ['Er kommt bis ans Wasser und hört auf.', 'So still war es lange nicht.'],
    spring: ['Die Flut bringt wieder mehr mit.', 'Es treibt jetzt Grünes an.'],
    summer: ['Das Wasser ist warm bis nachmittags.', 'Lange Tage hier draußen.'],
    autumn: ['Die Wellen kommen weiter herauf.', 'Es treibt viel an dieser Tage.'],
    winter: ['Grau bis zum Rand.', 'Nichts kommt, nichts geht.'],
    morgen: ['Die Flut war schon da.', 'Ich sehe nach, was über Nacht kam.'],
    nacht: ['Drüben brennt das Feuer. Ich sehe es.', 'Nachts ist das Wasser lauter.'],
    freund: ['Du kommst wirklich immer wieder.', 'Zu zweit zählt es sich besser.'],
    gemuetlich: ['Es ist fast ein Zuhause geworden.', 'Schön, was hier steht.'],
    kahl: ['Nur Sand und ich.', 'Hier war noch nie viel.'],
  },
};

export const PLAUDER_IDS = Object.keys(PLAUDEREI);

/**
 * Welche Gruppen zu einer Lage passen, mitsamt Gewicht.
 *
 * `lage` kommt aus dem Spiel:
 *
 *   { wetter, jahreszeit, morgen, nacht, freund, gemuetlich, kahl }
 *
 * Unbekanntes fällt weg, statt zu stören – ein Geist ohne eigenen Satz für
 * Schnee schweigt darüber und sagt etwas anderes.
 */
export function gruppenFuer(spiritId, lage) {
  const eigen = PLAUDEREI[spiritId];
  const l = lage || {};
  const raus = [];
  const dazu = function (id, gewicht) {
    if (!id) return;
    if (!saetzeFuer(spiritId, id).length) return;
    for (let i = 0; i < raus.length; i++) if (raus[i].id === id) return;
    raus.push({ id: id, gewicht: gewicht });
  };
  if (!eigen) { dazu('immer', GEWICHT.immer); return raus; }

  dazu(l.wetter, GEWICHT.wetter);
  if (l.freund) dazu('freund', GEWICHT.naehe);
  // Gemütlich und kahl schließen sich aus – dazwischen sagt niemand etwas
  // über die Deko, und das ist richtig so: „mittelmäßig eingerichtet" ist
  // keine Beobachtung.
  if (l.gemuetlich) dazu('gemuetlich', GEWICHT.deko);
  else if (l.kahl) dazu('kahl', GEWICHT.deko);
  // Genau eine Tageszeit, Morgen vor Nacht – dieselbe Regel wie beim
  // Ausruhen, und aus demselben Grund: Die Dämmerung ist dunkel, aber Morgen.
  if (l.morgen) dazu('morgen', GEWICHT.zeit);
  else if (l.nacht) dazu('nacht', GEWICHT.zeit);
  dazu(l.jahreszeit, GEWICHT.jahreszeit);
  dazu('immer', GEWICHT.immer);
  return raus;
}

/**
 * Die Sätze einer Gruppe.
 *
 * `immer` ist der Sonderfall und der Grund, warum das hier eine Funktion
 * ist: Es sind die Begrüßungen aus `spirits.js`. Die standen dort seit jeher
 * geschrieben – einundzwanzig Zeilen – und wurden von keiner Stelle im Spiel
 * je angezeigt. Jetzt sind sie der Grundstock, auf den alles zurückfällt.
 */
export function saetzeFuer(spiritId, gruppe) {
  if (gruppe === 'immer') {
    const s = SPIRITS[spiritId];
    return (s && s.lines && s.lines.greet) || [];
  }
  const eigen = PLAUDEREI[spiritId];
  return (eigen && eigen[gruppe]) || [];
}

/**
 * Ein Satz zur Lage – nie leer, nie zweimal kurz hintereinander.
 *
 * Gleiches Vorgehen wie bei den Ausruh-Gedanken: Gruppen, in denen noch
 * etwas Ungesagtes steht, haben Vorrang; ist alles verbraucht, kommt lieber
 * eine Wiederholung als Schweigen.
 */
export function waehlePlauderei(spiritId, lage, letzte, rnd) {
  const zufall = rnd || Math.random;
  const gruppen = gruppenFuer(spiritId, lage);
  if (!gruppen.length) return '';
  const gemieden = letzte || [];

  const frisch = gruppen.filter(function (g) {
    return saetzeFuer(spiritId, g.id).some(function (s) { return gemieden.indexOf(s) < 0; });
  });
  const wahl = frisch.length ? frisch : gruppen;

  let summe = 0;
  for (let i = 0; i < wahl.length; i++) summe += wahl[i].gewicht;
  let wurf = zufall() * summe;
  let gruppe = wahl[wahl.length - 1];
  for (let i = 0; i < wahl.length; i++) {
    wurf -= wahl[i].gewicht;
    if (wurf < 0) { gruppe = wahl[i]; break; }
  }

  const alle = saetzeFuer(spiritId, gruppe.id);
  const offen = alle.filter(function (s) { return gemieden.indexOf(s) < 0; });
  const topf = offen.length ? offen : ohneLetzten(alle, gemieden);
  return topf[Math.floor(zufall() * topf.length) % topf.length];
}

/**
 * Ist alles gesagt, kommt lieber eine Wiederholung als Schweigen – aber
 * niemals derselbe Satz zweimal hintereinander.
 *
 * Ohne diese Zeile hing die Regel an der Größe des Vorrats: Bei einer Lage
 * mit vielen Gruppen ist immer etwas Ungesagtes da, bei einer mageren nicht.
 * Gemessen im laufenden Spiel: bei dreißig Zügen eine unmittelbare
 * Wiederholung – und im Unit-Test keine, weil der eine reiche Lage benutzte.
 * Das ist genau die Sorte Fehler, die eine Prüfung mit zu bequemen Daten
 * durchwinkt.
 */
function ohneLetzten(alle, gemieden) {
  const zuletzt = gemieden && gemieden.length ? gemieden[0] : null;
  if (!zuletzt || alle.length < 2) return alle;
  const rest = alle.filter(function (s) { return s !== zuletzt; });
  return rest.length ? rest : alle;
}


/** Den Satz vormerken, damit er so bald nicht wiederkommt. */
export function merkePlauderei(letzte, satz) {
  const liste = [satz].concat((letzte || []).filter(function (s) { return s !== satz; }));
  return liste.slice(0, PLAUDER_MERK);
}
