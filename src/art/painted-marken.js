/**
 * Landmarken – die Dinge, an denen man einen Ort wiedererkennt.
 *
 * Biome machen Gegenden unterscheidbar: Man weiß, dass man im Nadelwald
 * steht und nicht auf der Heide. Was sie nicht können, ist einen
 * EINZELNEN Ort unverwechselbar machen – ein Birkenhain sieht aus wie
 * jeder andere Birkenhain, und „beim Birkenhain" ist deshalb keine
 * Ortsangabe. Dafür braucht es Dinge, die es nur einmal gibt.
 *
 * Jede dieser sechs steht genau einmal auf der Insel, und jede ist groß
 * genug, dass man sie von weitem sieht. Sie sind der Grund, warum man
 * sagen kann „beim Wrack" statt „im Süden" – und das ist der Unterschied
 * zwischen einer Karte und einer Gegend, in der man sich auskennt.
 *
 * Alle sechs entstehen aus denselben Werkzeugen wie der Rest: Tusche und
 * Aquarell, kein einziges Bild von außen. Sie sind nur größer, und
 * deshalb bekommen sie mehr Innenleben – ein Fels von 300 Punkten
 * Breite, der nur ein Umriss mit einer Lasur ist, sieht aus wie ein
 * aufgeblasener Kiesel.
 */
import {
  blob, teardrop, smoothClosed, offsetShape, pathFrom, clipTo,
  inkStroke, inkLine, wash, washGroup, paintObject, groundShadow, LIGHT,
} from './brush.js';
import { makeRng } from '../core/rng.js';
import { INK, fill, made, dot } from './painted.js';

/**
 * Das Schiffswrack.
 *
 * Halb im Sand, zur Seite gekippt, der Rumpf aufgebrochen. Es ist die
 * größte Landmarke und steht am Strand – das Erste, was man sieht, wenn
 * man mit dem Boot ankommt, und zugleich die Erklärung, warum auf dieser
 * Insel überhaupt jemand gestrandet ist.
 *
 * Die Neigung steckt in den Punkten und nicht in einer Drehung: Ein
 * gedrehtes Schiff hebt sich an einer Seite aus dem Sand, ein geneigt
 * GEBAUTES liegt darin.
 */
export function paintWrack(opts) {
  const o = opts || {};
  const seed = o.seed || 801;
  const w = 420;
  const h = 330;
  const cx = w / 2;
  const baseY = h - 18;
  const rng = makeRng(seed);

  /**
   * Der erste Entwurf war eine flache Schale mit einem Stock darin.
   *
   * Der Fehler: Rumpf und Deck waren zwei Flächen derselben Form, die
   * zweite nur nach innen versetzt. Von oben gesehen ergibt das eine
   * Schüssel. Ein Schiff erkennt man nicht an seinem Grundriss, sondern
   * an der BORDWAND – an der hohen Seite, die aus dem Sand ragt, und an
   * den Spanten, die dort hervorstehen, wo sie gebrochen ist.
   *
   * Deshalb jetzt: ein hoher Rumpf, nach rechts zum Bug ansteigend, mit
   * einer eigenen Deckslinie quer darüber. Die hintere Hälfte ist
   * aufgebrochen, dort stehen die Spanten frei.
   */
  const bordY = baseY - 150;
  const rumpf = smoothClosed([
    [cx - 170, baseY - 26], [cx - 158, baseY - 78], [cx - 120, bordY + 10],
    [cx - 30, bordY - 14], [cx + 80, bordY - 36], [cx + 158, baseY - 96],
    [cx + 176, baseY - 40], [cx + 150, baseY + 2], [cx - 40, baseY + 10],
  ], 3);
  // Die Deckslinie: von der hinteren Bordkante zur vorderen, ein Stück
  // unterhalb der Oberkante. Alles darüber ist Bordwand, alles darunter
  // Rumpf – und genau daran sieht man, dass das Ding hohl ist.
  const deckslinie = [
    [cx - 112, bordY + 26], [cx - 20, bordY + 4], [cx + 76, bordY - 16],
    [cx + 146, baseY - 86],
  ];
  // Die Spanten der aufgebrochenen Hälfte: Rippen, die aus dem Rumpf
  // nach oben stehen. Sie sind das, was ein Wrack von einem Boot
  // unterscheidet.
  const spanten = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = cx - 150 + t * 120;
    const y = baseY - 70 + t * -40;
    spanten.push([[x, y + 50], [x - 10, y - 20], [x + 6 + rng() * 10, y - 54 - rng() * 30]]);
  }
  const mast = smoothClosed([
    [cx + 46, bordY - 24], [cx + 62, bordY - 26],
    [cx + 86, baseY - 318], [cx + 72, baseY - 320],
  ], 2);
  const rah = smoothClosed([
    [cx + 30, baseY - 268], [cx + 126, baseY - 254],
    [cx + 126, baseY - 244], [cx + 30, baseY - 258],
  ], 1);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.0,
    outline: 2.4,
    shadow: function (g) { groundShadow(g, cx, baseY + 4, 180, 32, seed, 0.2); },
    wash: function (g) {
      wash(g, rumpf, INK.wood, { seed: seed + 1, dx: -3, dy: 3, scale: 1.03 });
      // Die Bordwand ist die SCHATTENSEITE: Sie steht fast senkrecht und
      // bekommt kaum Licht. Ohne diesen Unterschied liegt das Schiff
      // flach.
      g.save();
      clipTo(g, [rumpf]);
      g.globalAlpha = 0.55;
      g.fillStyle = INK.woodDark;
      g.beginPath();
      g.moveTo(deckslinie[0][0], deckslinie[0][1]);
      for (let i = 1; i < deckslinie.length; i++) g.lineTo(deckslinie[i][0], deckslinie[i][1]);
      g.lineTo(cx + 190, baseY + 20);
      g.lineTo(cx - 190, baseY + 20);
      g.closePath();
      g.fill();
      g.restore();
      // Spanten als breite Striche.
      g.save();
      g.strokeStyle = INK.wood;
      g.lineCap = 'round';
      g.lineWidth = 10;
      g.beginPath();
      for (let i = 0; i < spanten.length; i++) {
        const sp = spanten[i];
        g.moveTo(sp[0][0], sp[0][1]);
        g.quadraticCurveTo(sp[1][0], sp[1][1], sp[2][0], sp[2][1]);
      }
      g.stroke();
      g.restore();
      wash(g, mast, INK.wood, { seed: seed + 3 });
      wash(g, rah, INK.woodDark, { seed: seed + 4 });
      // Algen und Moos an der Wasserseite: Das Wrack liegt seit Jahren
      // da, und ohne diesen Bewuchs sieht es aus wie frisch gestrandet.
      g.save();
      clipTo(g, [rumpf]);
      g.globalAlpha = 0.5;
      for (let i = 0; i < 8; i++) {
        const x = cx - 160 + rng() * 320;
        const y = baseY - 10 - rng() * 60;
        g.fillStyle = i % 2 ? INK.moss : INK.leafDeep;
        pathFrom(g, smoothClosed(blob(x, y, 22 + rng() * 26, 12 + rng() * 11,
          seed + 30 + i, 0.3, 12), 4), true);
        g.fill();
      }
      g.restore();
    },
    shape: function (g) {
      fill(g, rumpf);
      fill(g, mast);
      fill(g, rah);
      g.save();
      g.lineCap = 'round';
      g.lineWidth = 11;
      g.beginPath();
      for (let i = 0; i < spanten.length; i++) {
        const sp = spanten[i];
        g.moveTo(sp[0][0], sp[0][1]);
        g.quadraticCurveTo(sp[1][0], sp[1][1], sp[2][0], sp[2][1]);
      }
      g.stroke();
      g.restore();
    },
    detail: function (g) {
      // Die Planken laufen der Bordwand nach, nicht waagerecht: Sie sind
      // das, was die Wölbung des Rumpfs sichtbar macht.
      g.save();
      clipTo(g, [rumpf]);
      g.globalAlpha = 0.32;
      g.strokeStyle = INK.woodDark;
      g.lineWidth = 2.4;
      g.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const d = i * 15;
        g.beginPath();
        g.moveTo(cx - 180, deckslinie[0][1] + d + 14);
        g.bezierCurveTo(cx - 60, deckslinie[1][1] + d, cx + 60, deckslinie[2][1] + d,
          cx + 182, deckslinie[3][1] + d);
        g.stroke();
      }
      g.restore();
    },
    ink: function (g) {
      // Die Deckskante – die wichtigste Linie des ganzen Wracks.
      inkStroke(g, deckslinie, {
        closed: false, width: 3.2, vary: 0.35, seed: seed + 60, alpha: 0.85,
      });
      for (let i = 0; i < spanten.length; i++) {
        const sp = spanten[i];
        inkLine(g, sp[0][0], sp[0][1], sp[2][0], sp[2][1],
          { width: 2.2, bend: 0.22, seed: seed + 70 + i, alpha: 0.6 });
      }
      // Bullaugen in der Bordwand – nichts sagt schneller „Schiff".
      for (let i = 0; i < 3; i++) {
        dot(null, g, cx + 10 + i * 56, baseY - 96 + i * 8, 12, INK.rockDeep, seed + 90 + i);
      }
      inkLine(g, cx + 54, bordY - 24, cx + 80, baseY - 316,
        { width: 3.2, bend: 0.03, seed: seed + 110, alpha: 0.85 });
      // Ein Tau, das vom Rahnock herunterhängt.
      inkLine(g, cx + 124, baseY - 250, cx + 136, baseY - 150,
        { width: 1.8, bend: 0.5, seed: seed + 120, alpha: 0.55 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Das Walgerippe.
 *
 * Ein Bogen aus Rippen im Sand, dazu der lange Schädel. Es ist die
 * stillste der sechs Marken und die, die am meisten erzählt: Hier liegt
 * etwas sehr Großes sehr lange.
 */
export function paintGerippe(opts) {
  const o = opts || {};
  const seed = o.seed || 811;
  const w = 340;
  const h = 210;
  const cx = w / 2;
  const baseY = h - 16;
  const rng = makeRng(seed);

  // Das Rückgrat als Kette von Wirbeln, leicht gebogen.
  const wirbel = [];
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    wirbel.push([cx - 128 + t * 232, baseY - 18 - Math.sin(t * Math.PI) * 26]);
  }
  // Die Rippen stehen paarweise nach oben weg und werden nach hinten
  // kürzer – ein Bogen, kein Zaun.
  const rippen = [];
  for (let i = 1; i < 9; i++) {
    const p = wirbel[i];
    const laenge = 46 + Math.sin((i / 9) * Math.PI) * 50;
    for (const s of [-1, 1]) {
      rippen.push([p, [p[0] + s * laenge * 0.55, p[1] - laenge],
        [p[0] + s * laenge * 0.78, p[1] - laenge * 0.4]]);
    }
  }
  const schaedel = smoothClosed([
    [cx - 128, baseY - 22], [cx - 160, baseY - 44], [cx - 196, baseY - 40],
    [cx - 206, baseY - 18], [cx - 176, baseY - 4], [cx - 132, baseY - 6],
  ], 4);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 2.2,
    shadow: function (g) { groundShadow(g, cx - 10, baseY + 2, 150, 26, seed, 0.17); },
    wash: function (g) {
      wash(g, schaedel, INK.bone || '#ece2cc', { seed: seed + 1, scale: 1.04 });
      washGroup(g, [offsetShape(schaedel, -LIGHT.x * 14, -LIGHT.y * 12, 0.72)],
        INK.rockShade, { alpha: 0.45 });
      // Die Knochen selbst werden als breite Striche in die Farbebene
      // gelegt, nicht als Flächen: Ein Knochen ist eine Linie mit Dicke.
      g.save();
      g.strokeStyle = INK.bone || '#ece2cc';
      g.lineCap = 'round';
      g.lineWidth = 11;
      g.beginPath();
      for (let i = 0; i < rippen.length; i++) {
        const r = rippen[i];
        g.moveTo(r[0][0], r[0][1]);
        g.quadraticCurveTo(r[1][0], r[1][1], r[2][0], r[2][1]);
      }
      g.stroke();
      g.lineWidth = 15;
      g.beginPath();
      g.moveTo(wirbel[0][0], wirbel[0][1]);
      for (let i = 1; i < wirbel.length; i++) g.lineTo(wirbel[i][0], wirbel[i][1]);
      g.stroke();
      g.restore();
    },
    shape: function (g) {
      fill(g, schaedel);
      g.save();
      g.lineCap = 'round';
      g.lineWidth = 12;
      g.beginPath();
      for (let i = 0; i < rippen.length; i++) {
        const r = rippen[i];
        g.moveTo(r[0][0], r[0][1]);
        g.quadraticCurveTo(r[1][0], r[1][1], r[2][0], r[2][1]);
      }
      g.moveTo(wirbel[0][0], wirbel[0][1]);
      for (let i = 1; i < wirbel.length; i++) g.lineTo(wirbel[i][0], wirbel[i][1]);
      g.lineWidth = 16;
      g.stroke();
      g.restore();
    },
    ink: function (g) {
      for (let i = 0; i < rippen.length; i++) {
        const r = rippen[i];
        inkLine(g, r[0][0], r[0][1], r[2][0], r[2][1],
          { width: 2.0, bend: (r[2][0] > r[0][0] ? -0.5 : 0.5), seed: seed + 20 + i, alpha: 0.55 });
      }
      // Die Wirbel einzeln andeuten, sonst ist das Rückgrat ein Rohr.
      for (let i = 0; i < wirbel.length; i++) {
        inkLine(g, wirbel[i][0], wirbel[i][1] - 9, wirbel[i][0], wirbel[i][1] + 9,
          { width: 1.8, bend: 0, seed: seed + 50 + i, alpha: 0.45 });
      }
      dot(null, g, cx - 178, baseY - 32, 9, INK.rockDeep, seed + 80);
      // Ein paar Muscheln davor – das Gerippe liegt am Wasser.
      for (let i = 0; i < 4; i++) {
        const x = cx - 120 + rng() * 240;
        inkLine(g, x, baseY + 4, x + 10, baseY + 2,
          { width: 1.6, bend: 0.6, seed: seed + 90 + i, alpha: 0.4 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Der Steinkreis.
 *
 * Sieben aufrechte Findlinge im Kreis, einer umgefallen. Er steht auf
 * der Heide, weil man ihn dort von weitem sieht – und weil eine offene
 * Fläche mit sieben Steinen darauf ein Ort ist und eine offene Fläche
 * ohne sie nur Platz.
 */
export function paintSteinkreis(opts) {
  const o = opts || {};
  const seed = o.seed || 821;
  const w = 330;
  const h = 230;
  const cx = w / 2;
  const baseY = h - 14;
  const rng = makeRng(seed);

  // In die Tiefe gestaffelt: Die hinteren Steine stehen höher im Bild
  // und sind kleiner. Ohne das liegt der Kreis flach wie ein Zifferblatt.
  const steine = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const px = cx + Math.cos(a) * 126;
    const py = baseY - 26 + Math.sin(a) * 44;
    const tiefe = (Math.sin(a) + 1) / 2;
    const hoch = 58 + tiefe * 54;
    const breit = 20 + tiefe * 12;
    const umgefallen = i === 4;
    if (umgefallen) {
      steine.push({
        form: smoothClosed([
          [px - hoch * 0.6, py], [px - hoch * 0.6, py - breit * 1.1],
          [px + hoch * 0.6, py - breit * 0.8], [px + hoch * 0.6, py + 2],
        ], 2),
        y: py, liegt: true,
      });
    } else {
      steine.push({
        form: smoothClosed([
          [px - breit, py], [px - breit * 0.86, py - hoch * 0.6],
          [px - breit * 0.6, py - hoch], [px + breit * 0.5, py - hoch * 1.04],
          [px + breit * 0.92, py - hoch * 0.5], [px + breit, py],
        ], 2),
        y: py, liegt: false,
      });
    }
  }
  steine.sort(function (a, b) { return a.y - b.y; });

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 2.3,
    shadow: function (g) {
      for (let i = 0; i < steine.length; i++) {
        groundShadow(g, 0, 0, 1, 1, seed, 0);
      }
      groundShadow(g, cx, baseY - 14, 140, 40, seed, 0.14);
    },
    wash: function (g) {
      for (let i = 0; i < steine.length; i++) {
        const s = steine[i];
        wash(g, s.form, INK.rock, { seed: seed + i, dx: -2, dy: 2, scale: 1.04 });
        washGroup(g, [offsetShape(s.form, -LIGHT.x * 15, -LIGHT.y * 13, 0.74)],
          INK.rockShade, { alpha: 0.6 });
        washGroup(g, [offsetShape(s.form, -LIGHT.x * 26, -LIGHT.y * 22, 0.48)],
          INK.rockDeep, { alpha: 0.4 });
        // Flechten: der Grund, warum ein Findling nicht grau ist.
        g.save();
        clipTo(g, [s.form]);
        g.globalAlpha = 0.4;
        g.fillStyle = i % 2 ? INK.moss : INK.leafDark;
        for (let k = 0; k < 3; k++) {
          pathFrom(g, smoothClosed(blob(
            s.form[0][0] + rng() * 34, s.y - rng() * 70,
            9 + rng() * 11, 7 + rng() * 8, seed + 40 + i * 3 + k, 0.35, 10), 4), true);
          g.fill();
        }
        g.restore();
      }
    },
    shape: function (g) {
      for (let i = 0; i < steine.length; i++) fill(g, steine[i].form);
    },
    ink: function (g) {
      // Risse: zwei bis drei je Stein, immer senkrecht. Ein waagerechter
      // Riss liest sich als Fuge und macht aus dem Findling Mauerwerk.
      for (let i = 0; i < steine.length; i++) {
        const s = steine[i];
        const n = 2 + Math.floor(rng() * 2);
        for (let k = 0; k < n; k++) {
          const x = s.form[0][0] + 8 + rng() * 26;
          const y0 = s.y - 12 - rng() * 30;
          inkLine(g, x, y0, x + (rng() - 0.5) * 8, y0 - 18 - rng() * 22,
            { width: 1.7, bend: 0.1, seed: seed + 60 + i * 4 + k, alpha: 0.4 });
        }
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Der Torbogen.
 *
 * Eine Ruine aus hellem Stein, von Efeu überwachsen – ein Tor, das
 * nirgendwohin führt. Es ist die einzige Marke, die von Menschen
 * gebaut wurde, und deshalb die einzige, die eine Frage stellt.
 */
export function paintTorbogen(opts) {
  const o = opts || {};
  const seed = o.seed || 831;
  const w = 260;
  const h = 290;
  const cx = w / 2;
  const baseY = h - 16;
  const rng = makeRng(seed);

  const saeuleB = 34;
  const hoch = 196;
  const links = smoothClosed([
    [cx - 92 - saeuleB / 2, baseY], [cx - 96 - saeuleB / 2, baseY - hoch * 0.7],
    [cx - 92 - saeuleB / 2, baseY - hoch],
    [cx - 92 + saeuleB / 2, baseY - hoch], [cx - 88 + saeuleB / 2, baseY - hoch * 0.4],
    [cx - 92 + saeuleB / 2, baseY],
  ], 2);
  const rechts = smoothClosed([
    [cx + 92 - saeuleB / 2, baseY], [cx + 88 - saeuleB / 2, baseY - hoch * 0.5],
    [cx + 92 - saeuleB / 2, baseY - hoch],
    [cx + 92 + saeuleB / 2, baseY - hoch], [cx + 96 + saeuleB / 2, baseY - hoch * 0.6],
    [cx + 92 + saeuleB / 2, baseY],
  ], 2);
  // Der Bogen: außen ein Halbkreis, innen ein engerer – die Differenz
  // ist das Mauerwerk.
  const bogen = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (i / 18) * Math.PI;
    bogen.push([cx + Math.cos(a) * 110, baseY - hoch + Math.sin(a) * 74]);
  }
  for (let i = 18; i >= 0; i--) {
    const a = Math.PI + (i / 18) * Math.PI;
    bogen.push([cx + Math.cos(a) * 76, baseY - hoch + Math.sin(a) * 50]);
  }
  const bogenForm = smoothClosed(bogen, 1);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 2.3,
    shadow: function (g) { groundShadow(g, cx, baseY + 2, 120, 24, seed, 0.19); },
    wash: function (g) {
      const teile = [links, rechts, bogenForm];
      for (let i = 0; i < teile.length; i++) {
        wash(g, teile[i], INK.rock, { seed: seed + i, dx: -2, dy: 2, scale: 1.03 });
        washGroup(g, [offsetShape(teile[i], -LIGHT.x * 13, -LIGHT.y * 11, 0.78)],
          INK.rockShade, { alpha: 0.55 });
      }
      // Efeu: Es wächst an der linken Säule hoch und über den Bogen. Ohne
      // den Bewuchs ist die Ruine ein Modell, kein Ort.
      //
      // Efeu wächst in Büscheln mit Lücken, nicht als Band. Der erste
      // Entwurf setzte sechzehn gleich große Kleckse in gleichem Abstand
      // übereinander – das ergab einen grünen Balken, der die Säule
      // zustrich, statt sie zu bewachsen. Jetzt entscheidet der Zufall,
      // ob an einer Stelle überhaupt etwas sitzt, und die Größen gehen
      // weit auseinander.
      g.save();
      for (let i = 0; i < 22; i++) {
        if (rng() < 0.34) continue;
        const t = i / 21;
        const x = cx - 92 + Math.sin(t * 9) * 20 + (rng() - 0.5) * 20;
        const y = baseY - t * (hoch + 24);
        const r = 7 + rng() * rng() * 20;
        g.globalAlpha = 0.5 + rng() * 0.35;
        g.fillStyle = rng() < 0.4 ? INK.leafDark : INK.leaf;
        pathFrom(g, smoothClosed(blob(x, y, r, r * (0.6 + rng() * 0.4),
          seed + 50 + i, 0.34, 10), 4), true);
        g.fill();
      }
      for (let i = 0; i < 14; i++) {
        if (rng() < 0.4) continue;
        const a = Math.PI + (i / 13) * Math.PI * 0.75;
        const r = 6 + rng() * rng() * 17;
        g.globalAlpha = 0.5 + rng() * 0.32;
        g.fillStyle = rng() < 0.45 ? INK.leafDark : INK.leaf;
        pathFrom(g, smoothClosed(blob(cx + Math.cos(a) * (100 + rng() * 14),
          baseY - hoch + Math.sin(a) * (68 + rng() * 10), r, r * 0.75,
          seed + 70 + i, 0.34, 10), 4), true);
        g.fill();
      }
      g.restore();
    },
    shape: function (g) {
      fill(g, links);
      fill(g, rechts);
      fill(g, bogenForm);
    },
    ink: function (g) {
      // Die Fugen des Mauerwerks – waagerecht, versetzt. Sie sind der
      // ganze Unterschied zwischen Stein und Fels.
      g.save();
      clipTo(g, [links, rechts]);
      g.globalAlpha = 0.34;
      g.strokeStyle = INK.line;
      g.lineWidth = 1.8;
      for (let i = 1; i < 8; i++) {
        const y = baseY - (i / 8) * hoch;
        g.beginPath();
        g.moveTo(cx - 140, y);
        g.lineTo(cx + 140, y);
        g.stroke();
      }
      g.restore();
      for (let i = 1; i < 7; i++) {
        const a = Math.PI + (i / 7) * Math.PI;
        inkLine(g, cx + Math.cos(a) * 78, baseY - hoch + Math.sin(a) * 51,
          cx + Math.cos(a) * 108, baseY - hoch + Math.sin(a) * 72,
          { width: 1.8, bend: 0, seed: seed + 90 + i, alpha: 0.4 });
      }
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Der Leuchtturm.
 *
 * Die höchste Marke, und die einzige, die nachts etwas tut: Sein Licht
 * ist von überall zu sehen. Er steht an der Küste auf Fels – dort, wo
 * ein Leuchtturm steht.
 */
export function paintLeuchtturm(opts) {
  const o = opts || {};
  const seed = o.seed || 841;
  const w = 220;
  const h = 400;
  const cx = w / 2;
  const baseY = h - 14;
  const hoch = 300;

  // Nach oben verjüngt, aber nicht gerade: Ein Turm aus zwei geraden
  // Linien ist ein Kegel, keine gemauerte Wand.
  const turm = smoothClosed([
    [cx - 56, baseY], [cx - 50, baseY - hoch * 0.4], [cx - 36, baseY - hoch * 0.82],
    [cx - 32, baseY - hoch], [cx + 32, baseY - hoch],
    [cx + 36, baseY - hoch * 0.8], [cx + 52, baseY - hoch * 0.38], [cx + 56, baseY],
  ], 2);
  const galerie = smoothClosed([
    [cx - 44, baseY - hoch], [cx - 44, baseY - hoch - 16],
    [cx + 44, baseY - hoch - 16], [cx + 44, baseY - hoch],
  ], 1);
  const laterne = smoothClosed([
    [cx - 28, baseY - hoch - 16], [cx - 24, baseY - hoch - 62],
    [cx + 24, baseY - hoch - 62], [cx + 28, baseY - hoch - 16],
  ], 1);
  const dach = smoothClosed([
    [cx - 34, baseY - hoch - 62], [cx, baseY - hoch - 104],
    [cx + 34, baseY - hoch - 62],
  ], 1);

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.8,
    outline: 2.4,
    shadow: function (g) { groundShadow(g, cx, baseY + 2, 78, 20, seed, 0.22); },
    wash: function (g) {
      wash(g, turm, INK.paper, { seed: seed + 1, dx: -2, dy: 2, scale: 1.03 });
      washGroup(g, [offsetShape(turm, -LIGHT.x * 20, -LIGHT.y * 10, 0.7)],
        INK.rockShade, { alpha: 0.5 });
      // Die roten Bänder: zwei breite Streifen um den Turm. Sie sind
      // das, was einen weißen Zylinder zum Leuchtturm macht.
      g.save();
      clipTo(g, [turm]);
      g.globalAlpha = 0.85;
      g.fillStyle = INK.berry || '#c3486b';
      for (let i = 0; i < 2; i++) {
        const y = baseY - hoch * (0.3 + i * 0.34);
        g.fillRect(cx - 70, y, 140, 34);
      }
      g.restore();
      wash(g, galerie, INK.rockDeep, { seed: seed + 3 });
      wash(g, laterne, INK.glass || '#a9d7e0', { seed: seed + 4 });
      wash(g, dach, INK.berry || '#c3486b', { seed: seed + 5 });
    },
    shape: function (g) {
      fill(g, turm);
      fill(g, galerie);
      fill(g, laterne);
      fill(g, dach);
    },
    ink: function (g) {
      // Das Geländer der Galerie.
      for (let i = 0; i <= 8; i++) {
        const x = cx - 44 + (i / 8) * 88;
        inkLine(g, x, baseY - hoch - 16, x, baseY - hoch,
          { width: 1.6, bend: 0, seed: seed + 20 + i, alpha: 0.55 });
      }
      // Die Scheiben der Laterne.
      for (let i = 1; i < 4; i++) {
        const x = cx - 28 + (i / 4) * 56;
        inkLine(g, x, baseY - hoch - 60, x, baseY - hoch - 18,
          { width: 1.5, bend: 0, seed: seed + 40 + i, alpha: 0.5 });
      }
      // Die Tür – der Maßstab. Ohne sie weiß niemand, wie hoch der Turm
      // ist; mit ihr sieht man es sofort.
      inkStroke(g, smoothClosed([
        [cx - 15, baseY], [cx - 15, baseY - 34], [cx, baseY - 44],
        [cx + 15, baseY - 34], [cx + 15, baseY],
      ], 2), { closed: true, width: 2.4, vary: 0.3, seed: seed + 60, alpha: 0.8 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Der hohle Riesenbaum.
 *
 * Ein Stamm, viel dicker als jeder andere, mit einer Höhle darin, die
 * groß genug für einen Menschen ist. Er steht im Nadelwald und ist dort
 * der einzige Laubbaum – ein Riese zwischen lauter Kiefern fällt mehr
 * auf als ein Riese zwischen Riesen.
 */
export function paintHohlerBaum(opts) {
  const o = opts || {};
  const seed = o.seed || 851;
  const w = 300;
  const h = 380;
  const cx = w / 2;
  const baseY = h - 16;
  const rng = makeRng(seed);

  const stamm = smoothClosed([
    [cx - 92, baseY], [cx - 112, baseY - 16], [cx - 82, baseY - 70],
    [cx - 70, baseY - 160], [cx - 62, baseY - 228],
    [cx + 60, baseY - 232], [cx + 72, baseY - 150],
    [cx + 86, baseY - 62], [cx + 114, baseY - 14], [cx + 92, baseY],
  ], 3);
  const hoehle = smoothClosed([
    [cx - 36, baseY - 4], [cx - 44, baseY - 60], [cx - 24, baseY - 104],
    [cx + 10, baseY - 112], [cx + 38, baseY - 76], [cx + 36, baseY - 4],
  ], 4);
  // Die Krone sitzt hoch und ist breit – ein Riese hat mehr Krone als
  // Stamm, sonst ist er ein Mast.
  const lobes = [
    smoothClosed(teardrop(cx, baseY - 282, 92, 70, seed + 1, 0.16), 6),
    smoothClosed(blob(cx - 84, baseY - 244, 58, 44, seed + 2, 0.2), 6),
    smoothClosed(blob(cx + 88, baseY - 238, 56, 42, seed + 3, 0.2), 6),
    smoothClosed(blob(cx - 20, baseY - 324, 60, 40, seed + 4, 0.2), 6),
  ];

  const res = paintObject(w, h, {
    seed: seed,
    blur: 2.0,
    outline: 2.5,
    shadow: function (g) { groundShadow(g, cx, baseY + 2, 104, 26, seed, 0.22); },
    wash: function (g) {
      for (let i = 0; i < lobes.length; i++) {
        wash(g, lobes[i], INK.leaf, { seed: seed + 10 + i, scale: 1.05 });
      }
      washGroup(g, lobes.map(function (l) {
        return offsetShape(l, -LIGHT.x * 20, -LIGHT.y * 18, 0.8);
      }), INK.leafDark, { alpha: 0.6 });
      washGroup(g, lobes.map(function (l) {
        return offsetShape(l, -LIGHT.x * 34, -LIGHT.y * 30, 0.56);
      }), INK.leafDeep, { alpha: 0.4 });
      wash(g, stamm, INK.trunk, { seed: seed + 20, dx: -3, dy: 3, scale: 1.03 });
      washGroup(g, [offsetShape(stamm, -LIGHT.x * 24, -LIGHT.y * 18, 0.8)],
        INK.trunkShade, { alpha: 0.6 });
      // Die Höhle ist dunkel, und zwar richtig dunkel: Ein Loch, in das
      // man hineinsehen kann, ist kein Loch.
      g.save();
      g.fillStyle = INK.line;
      g.globalAlpha = 0.86;
      pathFrom(g, hoehle, true);
      g.fill();
      g.restore();
      // Moos am Fuß.
      g.save();
      clipTo(g, [stamm]);
      g.globalAlpha = 0.45;
      g.fillStyle = INK.moss;
      for (let i = 0; i < 5; i++) {
        pathFrom(g, smoothClosed(blob(cx - 80 + rng() * 160, baseY - 10 - rng() * 40,
          26 + rng() * 20, 13 + rng() * 10, seed + 40 + i, 0.3, 12), 4), true);
        g.fill();
      }
      g.restore();
    },
    shape: function (g) {
      fill(g, stamm);
      for (let i = 0; i < lobes.length; i++) fill(g, lobes[i]);
    },
    detail: function (g) {
      // Die Rinde: lange, leicht gebogene Furchen. Bei einem Baum dieser
      // Größe ist die Rinde das Erste, was man sieht.
      g.save();
      clipTo(g, [stamm]);
      g.globalAlpha = 0.3;
      g.strokeStyle = INK.trunkShade;
      g.lineWidth = 3.0;
      g.lineCap = 'round';
      for (let i = 0; i < 11; i++) {
        const x = cx - 96 + i * 19 + rng() * 6;
        g.beginPath();
        g.moveTo(x, baseY - 4);
        g.bezierCurveTo(x + 8, baseY - 90, x - 8, baseY - 160, x + 4, baseY - 226);
        g.stroke();
      }
      g.restore();
    },
    ink: function (g) {
      inkStroke(g, hoehle, {
        closed: true, width: 3.0, vary: 0.4, seed: seed + 60, alpha: 0.9,
      });
      // Zwei dicke Wurzeln, die aus dem Stamm in den Boden laufen.
      inkLine(g, cx - 86, baseY - 10, cx - 134, baseY + 2,
        { width: 3.4, bend: 0.3, seed: seed + 70, alpha: 0.7 });
      inkLine(g, cx + 88, baseY - 12, cx + 136, baseY + 2,
        { width: 3.4, bend: -0.3, seed: seed + 71, alpha: 0.7 });
    },
  });
  return made(res, w, h, cx, baseY);
}

/**
 * Die alte Mühle.
 *
 * Halb eingefallen, die Flügel schief, das Dach offen. Sie steht auf
 * der Wiese und ist die Marke, die am meisten nach „hier hat einmal
 * jemand gelebt" aussieht – genau das Gefühl, von dem dieses Spiel
 * handelt.
 */
export function paintMuehle(opts) {
  const o = opts || {};
  const seed = o.seed || 861;
  const w = 360;
  const h = 420;
  const cx = w / 2;
  const baseY = h - 16;
  const hoch = 210;
  const rng = makeRng(seed);

  const turm = smoothClosed([
    [cx - 82, baseY], [cx - 74, baseY - hoch * 0.5], [cx - 56, baseY - hoch],
    [cx + 56, baseY - hoch], [cx + 74, baseY - hoch * 0.5], [cx + 82, baseY],
  ], 2);
  // Die Kappe sitzt schief auf dem Turm und ist zur Hälfte weggebrochen –
  // darum ist es eine Ruine und kein Modell.
  const kappe = smoothClosed([
    [cx - 66, baseY - hoch], [cx - 40, baseY - hoch - 56],
    [cx + 10, baseY - hoch - 46], [cx + 26, baseY - hoch - 12],
    [cx + 66, baseY - hoch],
  ], 2);

  /**
   * Die Nabe steht ÜBER der Kappe, nicht davor.
   *
   * Im ersten Entwurf saß sie auf Dachhöhe. Von den vier Flügeln zeigten
   * damit zwei nach unten, verschwanden im Turm und verschmolzen mit
   * dessen Umriss – im Bild blieb ein Bündel Stöcke an der oberen linken
   * Ecke. Eine Mühle erkennt man am KREUZ, und ein Kreuz braucht freien
   * Himmel um sich herum.
   */
  const nabe = [cx - 4, baseY - hoch - 106];
  const fluegel = [];
  for (let i = 0; i < 4; i++) {
    // 0,32 statt genau auf der Diagonale: Ein Kreuz, das exakt auf 45
    // Grad steht, sieht gezeichnet aus. Diese Mühle steht seit Jahren.
    const a = (i / 4) * Math.PI * 2 + 0.32;
    // Einer ist abgebrochen. Welcher, hängt am Samen – aber dass einer
    // fehlt, ist die halbe Geschichte.
    const laenge = i === 2 ? 58 : 118;
    const dir = [Math.cos(a), Math.sin(a)];
    const quer = [-dir[1], dir[0]];
    const br = 15;
    fluegel.push({
      a: a, dir: dir, quer: quer, laenge: laenge,
      form: smoothClosed([
        [nabe[0] + quer[0] * br, nabe[1] + quer[1] * br],
        [nabe[0] + dir[0] * laenge + quer[0] * br * 0.7,
          nabe[1] + dir[1] * laenge + quer[1] * br * 0.7],
        [nabe[0] + dir[0] * laenge - quer[0] * br * 0.7,
          nabe[1] + dir[1] * laenge - quer[1] * br * 0.7],
        [nabe[0] - quer[0] * br, nabe[1] - quer[1] * br],
      ], 1),
    });
  }

  const res = paintObject(w, h, {
    seed: seed,
    blur: 1.9,
    outline: 2.4,
    shadow: function (g) { groundShadow(g, cx, baseY + 2, 96, 24, seed, 0.21); },
    wash: function (g) {
      wash(g, turm, INK.rock, { seed: seed + 1, dx: -2, dy: 2, scale: 1.03 });
      washGroup(g, [offsetShape(turm, -LIGHT.x * 20, -LIGHT.y * 12, 0.74)],
        INK.rockShade, { alpha: 0.58 });
      // Verwitterung: Flecken auf dem Mauerwerk. Ein gleichmäßig grauer
      // Turm ist ein Zylinder, kein Gemäuer.
      g.save();
      clipTo(g, [turm]);
      g.globalAlpha = 0.3;
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 3 === 0 ? INK.moss : i % 3 === 1 ? INK.rockDeep : INK.dirtDark;
        pathFrom(g, smoothClosed(blob(cx - 80 + rng() * 160, baseY - rng() * hoch,
          16 + rng() * 22, 11 + rng() * 16, seed + 20 + i, 0.33, 12), 4), true);
        g.fill();
      }
      g.restore();
      wash(g, kappe, INK.woodDark, { seed: seed + 2 });
      for (let i = 0; i < fluegel.length; i++) {
        wash(g, fluegel[i].form, INK.wood, { seed: seed + 40 + i, scale: 1.02 });
      }
    },
    shape: function (g) {
      fill(g, turm);
      fill(g, kappe);
      for (let i = 0; i < fluegel.length; i++) fill(g, fluegel[i].form);
    },
    ink: function (g) {
      // Die Querlatten – ohne sie sind die Flügel vier Bretter.
      for (let i = 0; i < fluegel.length; i++) {
        const f = fluegel[i];
        inkLine(g, nabe[0] + f.dir[0] * 12, nabe[1] + f.dir[1] * 12,
          nabe[0] + f.dir[0] * f.laenge, nabe[1] + f.dir[1] * f.laenge,
          { width: 2.0, bend: 0, seed: seed + 60 + i, alpha: 0.6 });
        const n = f.laenge > 80 ? 5 : 2;
        for (let k = 1; k <= n; k++) {
          const t = k / (n + 1);
          const px = nabe[0] + f.dir[0] * f.laenge * t;
          const py = nabe[1] + f.dir[1] * f.laenge * t;
          inkLine(g, px - f.quer[0] * 12, py - f.quer[1] * 12,
            px + f.quer[0] * 12, py + f.quer[1] * 12,
            { width: 1.7, bend: 0, seed: seed + 80 + i * 6 + k, alpha: 0.5 });
        }
      }
      // Die Welle von der Nabe in die Kappe.
      inkLine(g, nabe[0], nabe[1], cx - 10, baseY - hoch - 40,
        { width: 3.4, bend: 0, seed: seed + 120, alpha: 0.75 });
      dot(null, g, nabe[0], nabe[1], 13, INK.woodDark, seed + 130);
      // Tür und zwei Fenster – der Maßstab. Ohne sie weiß niemand, wie
      // groß das Gebäude ist.
      inkStroke(g, smoothClosed([
        [cx - 18, baseY], [cx - 18, baseY - 44], [cx, baseY - 56],
        [cx + 18, baseY - 44], [cx + 18, baseY],
      ], 2), { closed: true, width: 2.6, vary: 0.3, seed: seed + 140, alpha: 0.82 });
      for (let i = 0; i < 2; i++) {
        inkStroke(g, smoothClosed(blob(cx - 32 + i * 64, baseY - 120, 15, 18,
          seed + 150 + i, 0.08, 10), 3),
        { closed: true, width: 2.2, vary: 0.3, seed: seed + 160 + i, alpha: 0.72 });
      }
      // Das Mauerwerk, leicht gebogen: Der Turm ist rund.
      g.save();
      clipTo(g, [turm]);
      g.globalAlpha = 0.3;
      g.strokeStyle = INK.line;
      g.lineWidth = 1.7;
      for (let i = 1; i < 8; i++) {
        const y = baseY - (i / 8) * hoch;
        g.beginPath();
        g.moveTo(cx - 96, y - 4);
        g.quadraticCurveTo(cx, y + 7, cx + 96, y - 4);
        g.stroke();
      }
      g.restore();
    },
  });
  return made(res, w, h, cx, baseY);
}
