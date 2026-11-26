/**
 * Der Garten an der Haustür.
 *
 * **Was gefehlt hat.** Säen konnte man längst – überall, wo Gras oder Erde
 * liegt. Genau das war das Problem: Ein Beet irgendwo im Wald ist kein
 * Garten, sondern ein vergessenes Beet. Man kam an ihm vorbei, wenn man
 * zufällig dort vorbeikam. Und die Fläche, die einem wirklich gehört – der
 * Streifen vor der eigenen Tür –, hatte überhaupt keine Aufgabe: Innen
 * zählt jedes Möbelstück, draußen am Lagerfeuer zählt jede Deko für die
 * Geister, aber direkt vor dem eigenen Haus zählte nichts.
 *
 * **Also beides auf einmal.** Vor der Tür liegen umgegrabene Beete: feste
 * Plätze, die mit dem Haus wachsen. Wer dort sät, sieht seine Beete jeden
 * Morgen beim Hinausgehen – und das ist der ganze Punkt.
 *
 * **Sie sind kein zweites Anbausystem.** Was dort wächst, ist dieselbe
 * `crop`-Pflanze wie überall, mit demselben Wachstum, demselben Gießen und
 * derselben Ernte. Der Garten gibt nur drei Dinge dazu:
 *
 * 1. **Die Plätze stehen fest.** Man sät nicht ungefähr vor die Tür,
 *    sondern ins Beet – es rastet ein.
 * 2. **Hier wächst auch, wo sonst nichts wüchse.** Das Beet ist
 *    umgegrabene Erde; ob darunter Sand oder Fels liegt, ist egal. Auf
 *    der Felseninsel ist das der Unterschied zwischen Garten und keinem
 *    Garten.
 * 3. **Ein Schritt mehr am Tag**, derselbe Summand wie Gießen oder ein
 *    Bienenkorb (siehe `growCrops`). Nicht weil der Boden besser wäre,
 *    sondern weil man im Vorbeigehen danach sieht.
 *
 * **Keine Pflicht, kein Verfall.** Wie beim Anbau überhaupt: Ein leeres
 * Beet ist ein leeres Beet, kein Vorwurf.
 *
 * Alles hier ist reine Rechnung auf einer Ausbaustufe und einem Punkt –
 * dieselbe Naht wie bei `werkbankFuer` und `hausFenster`.
 */

/**
 * Wie viele Beete je Ausbaustufe.
 *
 * Schon beim Zelt zwei: Der Garten ist das Erste, was man vor der eigenen
 * Tür tun kann, und er soll nicht auf das Haus warten. Danach wächst er
 * mit – das ist neben dem Zimmer der zweite Grund, überhaupt auszubauen.
 */
export const BEETE_JE_STUFE = [2, 3, 4, 6];

/** Wie groß ein Beet im Bild ist – siehe `paintGartenbeet`. */
export const BEET_B = 96;
export const BEET_H = 72;

/**
 * Wie weit die Beetspalten von der Hausmitte entfernt stehen.
 *
 * Fest und nicht je Stufe: siehe `gartenPlaetze`.
 */
export const SPALTE = 180;

/** Wie weit die Reihen auseinanderliegen. */
export const REIHE = 96;

/**
 * Wie nah man einem Beet kommen muss, damit die Saat einrastet.
 *
 * Höchstens halb so viel wie der Reihenabstand, und das ist keine
 * Feinheit: Bei 60 und Reihen im Abstand 78 reichte der Fangbereich des
 * vorderen Beets bis in das hintere. Wer vor dem vorderen stand und
 * säte, säte ins hintere – gemessen, nicht vermutet.
 */
export const EINRASTEN = 44;

/**
 * Wie viel ein Beet an der Tür am Tag zulegt.
 *
 * Derselbe Summand wie Gießen und wie der Bienenkorb – ein Schritt. Mehr
 * wäre keine Bequemlichkeit mehr, sondern ein Grund, nirgendwo sonst zu
 * säen, und dann wäre die ganze Insel wieder nur Kulisse.
 */
export const GARTEN_BONUS = 1;

/**
 * Wo die Beete liegen – vom FUSSPUNKT des Hauses aus gerechnet.
 *
 * Links und rechts abwechselnd, damit der Weg zur Tür frei bleibt: Der
 * erste Entwurf setzte alle Beete links in einen Block, und das Haus sah
 * aus, als stünde es am Rand eines Ackers. Zwei Spalten, die die Tür
 * einrahmen, lesen sich als Garten.
 *
 * **Die Plätze hängen NICHT an der Ausbaustufe.** Der erste Entwurf
 * rückte die Spalten mit dem Kollisionsradius des Hauses nach außen –
 * und damit wanderte beim Ausbau der ganze Garten. Was man vorgestern
 * gesät hatte, stand danach neben dem Beet statt darin, verlor den
 * Schritt am Tag, und ein neues Beet wurde darüber gemalt. Die Zahl ist
 * deshalb fest und am größten Haus gemessen: 180 abzüglich halber
 * Beetbreite sind 132, und der größte Kollisionsradius (Haus mit
 * Veranda) ist 122.
 *
 * Mit der Stufe wächst nur die ANZAHL.
 *
 * @returns {Array} [{x, y}] – x nach rechts, y nach VORN (unten)
 */
export function gartenPlaetze(stufe) {
  const st = Math.max(1, Math.min(BEETE_JE_STUFE.length, Math.round(stufe || 1)));
  const n = BEETE_JE_STUFE[st - 1];
  const raus = [];
  for (let i = 0; i < n; i++) {
    const reihe = Math.floor(i / 2);
    const links = i % 2 === 0;
    raus.push({
      x: links ? -SPALTE : SPALTE,
      // VOR dem Haus, nicht daneben. Bei 24 lag die Oberkante des Beets
      // 12 Punkte über dem Fußpunkt – also unter der gemalten Hauswand,
      // und beim Zelt und der Hütte sah man vom ersten Beet nur die
      // untere Hälfte.
      y: 58 + reihe * REIHE,
    });
  }
  return raus;
}

/**
 * Die Beete in Weltkoordinaten – ALLE, auch die, wo nichts hinpasst.
 *
 * Wer sie wirklich braucht, filtert selbst: Das Haus kann am Wasser, am
 * Fels oder zwischen Bäumen stehen, und ein Beet im Teich wäre ein Beet
 * im Teich. Was an einer Stelle steht, weiß nur die Welt; deshalb gibt
 * es diese Liste roh heraus und `Game.gartenbeete()` siebt sie – an
 * EINER Stelle, damit Bild und Regel dieselben Beete meinen.
 */
export function gartenBeete(stufe, hausX, hausY) {
  const plaetze = gartenPlaetze(stufe);
  const raus = [];
  for (let i = 0; i < plaetze.length; i++) {
    raus.push({ i: i, x: hausX + plaetze[i].x, y: hausY + plaetze[i].y });
  }
  return raus;
}

/**
 * Das Beet, in das dieser Punkt einrastet – oder null.
 *
 * Nur eines, nämlich das nächste: Zwei überlappende Fänge wären ein Punkt,
 * der je nach Rundung mal hier und mal dort landet.
 *
 * Nimmt die FERTIGE Beetliste und rechnet sie nicht selbst aus. Der Grund
 * steht bei `gartenBeete`: Welche Beete es wirklich gibt, hängt davon ab,
 * was an ihrer Stelle steht, und das weiß nur die Welt.
 */
export function beetAn(beete, x, y, tol) {
  const r = tol == null ? EINRASTEN : tol;
  let bestes = null;
  let d2 = r * r;
  for (let i = 0; i < (beete || []).length; i++) {
    const dx = beete[i].x - x;
    const dy = beete[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < d2) { d2 = d; bestes = beete[i]; }
  }
  return bestes;
}

/**
 * Liegt dieser Punkt auf einem Beet?
 *
 * Mit der WIRKLICHEN Beetfläche gerechnet, nicht mit dem Fangradius: Die
 * Frage „wächst das hier im Garten" ist eine andere als „rastet die Saat
 * hier ein". Eine Pflanze am Rand des Fangbereichs steht neben dem Beet
 * und soll dann auch nicht den Schritt extra bekommen.
 */
export function imGarten(beete, x, y) {
  for (let i = 0; i < (beete || []).length; i++) {
    if (Math.abs(beete[i].x - x) <= BEET_B / 2 &&
        Math.abs(beete[i].y - y) <= BEET_H / 2) return true;
  }
  return false;
}

/** Wie viele Beete bepflanzt sind – für den Hinweis im Fenster. */
export function gartenStand(beete, pflanzen) {
  let belegt = 0;
  for (let i = 0; i < (beete || []).length; i++) {
    for (let k = 0; k < (pflanzen || []).length; k++) {
      const p = pflanzen[k];
      if (p.gone) continue;
      if (Math.abs(p.x - beete[i].x) <= BEET_B / 2 &&
          Math.abs(p.y - beete[i].y) <= BEET_H / 2) { belegt++; break; }
    }
  }
  return { belegt: belegt, beete: (beete || []).length };
}
