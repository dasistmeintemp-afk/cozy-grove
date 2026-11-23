/**
 * Der gemalte Boden.
 *
 * Die Insel wird in Stücke zerlegt und je Stück zweimal abgelegt:
 *   wash – die weichen Farbflächen (Wiese, Sand, Wasser)
 *   ink  – Küstenlinie und Bodendetails, gestochen scharf
 *
 * Getrennt deshalb, weil die Farbe verschwinden darf, die Zeichnung aber nie:
 * unkoloriert wird einfach ein Papierschleier über die Farbfläche gelegt,
 * bevor die Tinte darüberkommt.
 */
import { makeCanvas, ctx2d } from '../core/util.js';
import { makeRng, hashString } from '../core/rng.js';
import {
  blob, smoothClosed, offsetShape, pathFrom, inkStroke, inkLine, blurCanvas, LIGHT,
} from './brush.js';
import { INK } from './painted.js';
import { T, TILE_SIZE, TILE_DEF, isWalkable, isWater } from './tiles.js';

/**
 * Kachelbreite eines Stücks.
 * Größere Stücke heißt weniger Verschnitt: Der Malrand (PAD) wird gebraucht,
 * damit der Weichzeichner am Stückrand echte Nachbardaten sieht, kostet aber
 * Speicher. Gezeichnet wird später nur der Kern.
 */
export const CHUNK_TILES = 8;
export const CHUNK_PX = CHUNK_TILES * TILE_SIZE;
export const CHUNK_PAD = 34;
const PAD = CHUNK_PAD;

/**
 * Die Farbflächen werden in halber Auflösung gemalt und beim Zeichnen wieder
 * hochskaliert. Sie sind ohnehin weichgezeichnet – man sieht keinen
 * Unterschied, aber das Weichzeichnen kostet nur ein Viertel. Genau daran
 * hing die Bildrate beim Laufen. Die Tinte bleibt in voller Auflösung.
 */
export const WASH_SCALE = 0.5;

/** Deterministischer Versatz eines Gitterpunkts – Nachbarkanten passen dadurch. */
function cornerJitter(cx, cy) {
  const r = makeRng(hashString('c' + cx + ':' + cy));
  return [(r() - 0.5) * 13, (r() - 0.5) * 13];
}

/** Organische Fläche über einer Kachel, etwas größer als die Kachel selbst. */
function tilePatch(tx, ty, grow) {
  const g = grow == null ? 0.62 : grow;
  return smoothClosed(
    blob((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE,
      TILE_SIZE * (0.5 + g), TILE_SIZE * (0.5 + g),
      hashString('t' + tx + ':' + ty), 0.16, 12),
    5
  );
}

/**
 * Abstand einer Kachel zum nächsten Land (Schachbrett-Abstand, gedeckelt).
 * Daraus entsteht der Flachwassersaum: je näher am Ufer, desto heller.
 */
function landDistance(world, tx, ty, max) {
  for (let d = 1; d <= max; d++) {
    for (let oy = -d; oy <= d; oy++) {
      for (let ox = -d; ox <= d; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== d) continue;
        if (isWalkable(world.tileAtTile(tx + ox, ty + oy))) return d;
      }
    }
  }
  return max + 1;
}

/**
 * Malt ein Bodenstück.
 * @param {object} world Weltmodell mit tileAtTile()
 * @param {number} ctx0 Stück-Spalte
 * @param {number} cty0 Stück-Zeile
 * @returns {{wash: HTMLCanvasElement, ink: HTMLCanvasElement, ox: number, oy: number}}
 */
/**
 * @param {object} pfade Abnutzung je Kachel (siehe `game/pfade.js`) – oder
 * nichts. Der Maler fragt sie nur ab; gezählt wird woanders.
 */
export function paintGroundChunk(world, ctx0, cty0, pfade) {
  const abnutzung = pfade && pfade.stufe
    ? pfade.stufe
    : function () { return 0; };
  const tx0 = ctx0 * CHUNK_TILES;
  const ty0 = cty0 * CHUNK_TILES;
  const originX = tx0 * TILE_SIZE - PAD;
  const originY = ty0 * TILE_SIZE - PAD;
  const size = CHUNK_PX + PAD * 2;

  const washCanvas = makeCanvas(Math.round(size * WASH_SCALE), Math.round(size * WASH_SCALE));
  const wctx = ctx2d(washCanvas);
  wctx.imageSmoothingEnabled = true;
  wctx.scale(WASH_SCALE, WASH_SCALE);
  wctx.translate(-originX, -originY);

  const inkCanvas = makeCanvas(size, size);
  const ictx = ctx2d(inkCanvas);
  ictx.imageSmoothingEnabled = true;
  ictx.translate(-originX, -originY);

  // Kacheln inkl. Randring einsammeln und nach Ebene sortieren
  const cells = [];
  const ring = 2;
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const t = world.tileAtTile(tx, ty);
      cells.push({ tx: tx, ty: ty, t: t, layer: TILE_DEF[t].layer });
    }
  }
  cells.sort(function (a, b) { return a.layer - b.layer; });

  // Grundton: tiefes Wasser überall, darüber die Kachelflächen
  wctx.fillStyle = INK.waterDark;
  wctx.fillRect(originX, originY, size, size);

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    wctx.fillStyle = TILE_DEF[c.t].base;
    // Weg und Brücke bleiben eng an ihrer Kachel: sie sind gelegt, nicht
    // gewachsen. Mit dem üblichen Überstand würde eine einzelne Wegplatte als
    // handtellergroßer heller Fleck über die Wiese laufen.
    const grow = (c.t === T.PATH || c.t === T.BRIDGE) ? 0.16 : undefined;
    pathFrom(wctx, tilePatch(c.tx, c.ty, grow), true);
    wctx.fill();
  }

  // Flachwassersaum: Wasser nah am Land wird heller, direkt am Ufer fast weiß.
  // Das ist die auffälligste Eigenschaft der Vorlage – ohne diesen Saum stößt
  // die Wiese hart ans Meer.
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      if (!isWater(world.tileAtTile(tx, ty))) continue;
      const d = landDistance(world, tx, ty, 2);
      if (d > 2) continue;
      wctx.save();
      wctx.globalAlpha = d === 1 ? 0.72 : 0.34;
      wctx.fillStyle = d === 1 ? INK.foam : INK.waterLight;
      pathFrom(wctx, tilePatch(tx, ty, d === 1 ? 0.32 : 0.42), true);
      wctx.fill();
      wctx.restore();
    }
  }

  // Wiesenfelder: sehr große, sehr blasse Flächen in einem anderen Grün.
  //
  // Gemessen und angesehen: Die kleinen Lasuren geben der Wiese zwar eine
  // Körnung, aber über das ganze Bild hinweg bleibt sie EIN Grünton. In der
  // Vorlage besteht der Boden aus Zonen – hier ein trockeneres, dort ein
  // sattes Stück –, und genau das macht aus einer Fläche eine Landschaft.
  // Die Felder sind vier bis sieben Kacheln groß, also deutlich größer als
  // der sichtbare Ausschnitt körnig ist, und liegen auf einem groben Raster,
  // dessen Zellen nur von ihrer eigenen Nummer abhängen – sonst fiele an
  // jeder Stückgrenze eine gerade Kante auf.
  const FELD = 6;
  const c0 = Math.floor((tx0 - ring) / FELD) - 1;
  const c1 = Math.floor((tx0 + CHUNK_TILES + ring) / FELD) + 1;
  const d0 = Math.floor((ty0 - ring) / FELD) - 1;
  const d1 = Math.floor((ty0 + CHUNK_TILES + ring) / FELD) + 1;
  for (let cy = d0; cy <= d1; cy++) {
    for (let cx = c0; cx <= c1; cx++) {
      const r = makeRng(hashString('feld' + cx + ':' + cy));
      if (r() > 0.62) continue;
      const mx = (cx * FELD + r() * FELD) * TILE_SIZE;
      const my = (cy * FELD + r() * FELD) * TILE_SIZE;
      const rx = TILE_SIZE * (2.2 + r() * 1.6);
      const ry = TILE_SIZE * (1.8 + r() * 1.5);
      const ton = r();
      // Felder, die dieses Stück gar nicht berühren, werden übersprungen.
      // Das grobe Raster reicht absichtlich über den Rand hinaus, damit an
      // der Stückgrenze keine gerade Kante entsteht – ohne diese Prüfung
      // wurde aber rund die Hälfte der Flächen umsonst gefüllt, und große
      // halbdurchsichtige Flächen sind das Teuerste am ganzen Bodenmaler.
      if (mx + rx < originX || mx - rx > originX + size
        || my + ry < originY || my - ry > originY + size) continue;
      // Nur auf Gras. Ein Feld, das über das Meer liefe, wäre ein Schleier
      // auf dem Wasser – deshalb wird auf die Graskacheln im Umkreis
      // zugeschnitten, statt die Form einfach hinzumalen.
      const kx0 = Math.floor((mx - rx) / TILE_SIZE);
      const kx1 = Math.ceil((mx + rx) / TILE_SIZE);
      const ky0 = Math.floor((my - ry) / TILE_SIZE);
      const ky1 = Math.ceil((my + ry) / TILE_SIZE);
      // Erst zählen, dann zuschneiden. Der Zuschnitt auf hundert einzelne
      // Kachelrechtecke ist der teure Teil – im Inselinneren liegt ein Feld
      // aber fast immer vollständig auf Gras, und dort kann er entfallen.
      // Ohne diese Unterscheidung kostete der Boden neun Prozent Bildrate.
      let kacheln = 0;
      let fremd = 0;
      for (let ky = ky0; ky <= ky1; ky++) {
        for (let kx = kx0; kx <= kx1; kx++) {
          if (world.tileAtTile(kx, ky) === T.GRASS) kacheln++; else fremd++;
        }
      }
      if (!kacheln) continue;
      wctx.save();
      if (fremd) {
        wctx.beginPath();
        for (let ky = ky0; ky <= ky1; ky++) {
          for (let kx = kx0; kx <= kx1; kx++) {
            if (world.tileAtTile(kx, ky) !== T.GRASS) continue;
            wctx.rect(kx * TILE_SIZE, ky * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
        wctx.clip();
      }
      wctx.globalAlpha = 0.2 + r() * 0.16;
      wctx.fillStyle = ton < 0.4 ? INK.grassDark : ton < 0.75 ? INK.grassDry : INK.grassLight;
      pathFrom(wctx, smoothClosed(blob(mx, my, rx, ry,
        hashString('fb' + cx + ':' + cy), 0.2, 16), 6), true);
      wctx.fill();
      wctx.restore();
    }
  }

  // Kronenschatten.
  //
  // Unter einem Baum war der Boden bisher genauso hell wie auf der freien
  // Wiese – im Bild sah ein Wald deshalb aus wie Bäume, die auf eine
  // Rasenfläche gelegt wurden. Ein Schatten je Krone macht daraus einen
  // Ort mit Licht und Halbschatten, und wo viele Bäume stehen, überlagern
  // sich die Schatten von selbst zu dichtem Wald.
  //
  // Hier im gebackenen Boden und nicht je Bild: Bäume wachsen nicht und
  // gehen nicht spazieren. Fällt einer, wird das Stück ohnehin neu
  // gebacken.
  //
  // Der Versatz folgt derselben Sonne wie alle anderen Schatten im Spiel.
  if (world.queryNear) {
    const mx = (tx0 + CHUNK_TILES / 2) * TILE_SIZE;
    const my = (ty0 + CHUNK_TILES / 2) * TILE_SIZE;
    // Nur so weit, wie ein Schatten überhaupt reichen kann: halbe
    // Stückbreite plus Rand plus die größte Halbachse. Vorher war der
    // Radius fast anderthalb Stücke breit, und für jedes Stück wurden
    // dreimal so viele Bäume geprüft wie nötig.
    const nah = world.queryNear(mx, my, CHUNK_PX * 0.5 + PAD + 150);
    wctx.save();
    wctx.fillStyle = '#5d6b4e';
    for (let i = 0; i < nah.length; i++) {
      const e = nah[i];
      if (e.gone || !e.kind) continue;
      // Nur Bäume. Büsche warfen anfangs auch einen, mit halber Stärke –
      // gesehen hat man davon nichts, bezahlt wurde es trotzdem: Auf der
      // Insel stehen fast so viele Büsche wie Bäume, und jeder war eine
      // weitere halbdurchsichtige Fläche beim Backen.
      if (e.kind.indexOf('tree_') !== 0 || e.kind === 'tree_stump') continue;
      // Eine Ellipse, kein gezeichneter Klecks. Ein `blob` mit vierzehn
      // Punkten und fünf Glättungsdurchgängen ergibt 448 Stützpunkte – je
      // Baum. Bei dreißig Bäumen im Stück kostete das Backen so viel, dass
      // die Bildrate beim Laufen von 44 auf 34 fiel. Nach dem Weichzeichner
      // sieht man von der unruhigen Kante ohnehin nichts; die Unruhe steckt
      // stattdessen in den leicht verschiedenen Halbachsen.
      const hs = hashString('schatten' + Math.round(e.x) + ':' + Math.round(e.y));
      const r = 88 * (0.88 + ((hs >>> 7) & 255) / 255 * 0.26);
      wctx.globalAlpha = 0.15;
      wctx.beginPath();
      wctx.ellipse(e.x - LIGHT.x * 34, e.y - 22 - LIGHT.y * 12,
        r, r * (0.56 + ((hs >>> 17) & 255) / 255 * 0.14), 0, 0, 6.2832);
      wctx.fill();
    }
    wctx.restore();
  }

  // Trampelpfade: Dort, wo oft jemand langgeht, liegt Erde statt Gras.
  // Die Lasur allein macht wenig – sie liegt hier vor allem, damit der
  // Streifen auch koloriert warm wirkt. Das, was man wirklich sieht, sind
  // die fehlenden Grashalme weiter unten.
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const st = abnutzung(tx, ty);
      if (!st) continue;
      const r = makeRng(hashString('tritt' + tx + ':' + ty));
      wctx.save();
      wctx.globalAlpha = st === 2 ? 0.34 : 0.17;
      wctx.fillStyle = INK.dirtDark;
      pathFrom(wctx, smoothClosed(blob(
        (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE,
        TILE_SIZE * (0.54 + r() * 0.18), TILE_SIZE * (0.5 + r() * 0.18),
        hashString('tb' + tx + ':' + ty), 0.26, 14), 5), true);
      wctx.fill();
      wctx.restore();
    }
  }

  // Malerische Unruhe: größere, halbdurchsichtige Lasuren.
  // Wichtig: Ort und Aussehen hängen nur an der Kachel, nicht am Stück – sonst
  // würde dieselbe Lasur im Nachbarstück anders ausfallen und die Schnittkante
  // wäre als gerade Linie zu sehen.
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const r = makeRng(hashString('lasur' + tx + ':' + ty));
      if (r() > 0.55) continue;
      const t = world.tileAtTile(tx, ty);
      const water = isWater(t);
      const tone = water ? INK.waterDeep
        : t === T.SAND ? INK.sandShade
          : t === T.GRASS ? (r() < 0.5 ? INK.grassLight : INK.grassDark)
            : t === T.ROCKFLOOR ? INK.rockShade : INK.dirtDark;
      wctx.save();
      wctx.globalAlpha = water ? 0.3 : 0.2 + r() * 0.2;
      wctx.fillStyle = tone;
      pathFrom(wctx, smoothClosed(blob(
        (tx + r()) * TILE_SIZE, (ty + r()) * TILE_SIZE,
        TILE_SIZE * (water ? 1.3 : 0.7 + r() * 0.8),
        TILE_SIZE * (water ? 0.9 : 0.5 + r() * 0.7),
        hashString('lb' + tx + ':' + ty), 0.24, 14), 5), true);
      wctx.fill();
      wctx.restore();

      // Zweite, kleinere Lasur: das Gras bekommt dadurch die fleckige
      // Buntheit der Vorlage statt einer glatten Fläche.
      //
      // Die Mischung war vorher zu blass. `moss` (#a4b96e) ist ein helles,
      // gelbliches Oliv; in jeder zweiten Lasur, über einer ersten mit
      // `grassLight`, ergab das ausgebleichte Flecken statt einer Wiese –
      // im Bild sah der Rasen aus, als hätte jemand Farbe herausgewaschen.
      // Jetzt liegt der Schwerpunkt auf den beiden echten Grüntönen, und
      // das Oliv kommt nur noch in einem Fünftel der Fälle dazu.
      if (water || r() > 0.5) continue;
      wctx.save();
      wctx.globalAlpha = 0.16 + r() * 0.16;
      const w2 = r();
      wctx.fillStyle = t === T.GRASS
        ? (w2 < 0.45 ? INK.grassDark : w2 < 0.8 ? INK.grassLight : INK.moss)
        : t === T.SAND ? INK.sand : INK.dirtDark;
      pathFrom(wctx, smoothClosed(blob(
        (tx + r()) * TILE_SIZE, (ty + r()) * TILE_SIZE,
        TILE_SIZE * (0.3 + r() * 0.35), TILE_SIZE * (0.24 + r() * 0.3),
        hashString('lc' + tx + ':' + ty), 0.3, 12), 5), true);
      wctx.fill();
      wctx.restore();
    }
  }

  biomLasur(wctx, world, tx0, ty0, ring);

  steilkanten(wctx, world, tx0, ty0, ring);

  // EINMAL rechnen, zweimal benutzen: Die Farbfläche und die Risse in der
  // Tinte brauchen dieselbe Geometrie. Zweimal gerechnet kostete das
  // Backen eines Stücks spürbar – und ein Stück wird gebacken, während
  // jemand läuft.
  const waende = wandFlaechen(world, tx0, ty0, ring);
  uferwand(wctx, waende);

  blurCanvas(washCanvas, 3, 2);

  paintGroundInk(ictx, world, tx0, ty0, ring, abnutzung, waende);

  return { wash: washCanvas, ink: inkCanvas, ox: originX, oy: originY, size: size };
}

/**
 * Die Abbruchkante am Ufer – das Land bekommt Höhe.
 *
 * Bis hierher war die Insel eine Landkarte: Gras hörte auf, Wasser fing
 * an, beides in derselben Ebene. Im Vorbild liegt das Land HÖHER als das
 * Wasser, und was man sieht, ist nicht die Grenze, sondern die Wand
 * darunter – eine braune Felskante mit der Grasnarbe als Überhang oben
 * drauf. Das ist der stärkste Tiefeneindruck im ganzen Bild und zugleich
 * die größte dunkle Fläche darin.
 *
 * **Nur an Südkanten.** Eine Wand sieht man nur dort, wo die Kante zum
 * Betrachter zeigt – also wo unter dem Land Wasser liegt. An einer
 * Nordküste schaut man von oben auf die Grasnarbe und sieht keine Wand;
 * malte man dort eine, läge sie auf dem Land. Dieselbe Regel wie beim
 * Felsabsatz eine Funktion weiter unten.
 *
 * **Und ohne Treppenstufen.** Die Oberkante jeder Kachel ist leicht
 * gewellt, und die Welligkeit kommt aus `cornerJitter` an den geteilten
 * Eckpunkten: Die rechte Ecke einer Kachel und die linke der nächsten
 * fragen denselben Gitterpunkt und bekommen denselben Wert. Ohne das
 * zerfiele eine lange Küste in lauter einzeln wackelnde Kacheln.
 */
const WAND_HOEHE = 48;

/**
 * Die Bodenlasur des Bioms.
 *
 * Jedes Biom bekommt einen eigenen Ton über die Grundfarbe: der
 * Nadelwald dunkel und kühl, der Birkenhain hell, die Heide erdig, das
 * Geröll steinig. Das ist die Hälfte dessen, was eine Gegend als Gegend
 * lesbar macht – die andere Hälfte ist, was darauf wächst.
 *
 * Die Lasur hängt an der KACHEL und nicht am Stück, genau wie die
 * übrigen Lasuren: Sonst wäre die Schnittkante zwischen zwei
 * Bodenstücken als gerade Linie zu sehen. Und sie ist schwach gehalten –
 * ein Nadelwald, dessen Boden sattgrün ist, sieht aus wie ein Teppich.
 */
function biomLasur(g, world, tx0, ty0, ring) {
  if (!world.biomTonAtTile) return;
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const t = world.tileAtTile(tx, ty);
      if (t !== T.GRASS && t !== T.DIRT && t !== T.ROCKFLOOR) continue;
      // Den TON holt der Maler von der Welt, nicht die Biomtabelle: Die
      // Zeichenschicht soll nicht wissen, dass es Biome gibt, genauso
      // wenig wie sie den Spielstand kennt. Sie bekommt eine Farbe.
      const ton = world.biomTonAtTile(tx, ty);
      if (!ton) continue;
      const farbe = INK[ton[0]];
      if (!farbe) continue;
      g.save();
      g.globalAlpha = ton[1];
      g.fillStyle = farbe;
      pathFrom(g, tilePatch(tx, ty, 0.7), true);
      g.fill();
      g.restore();
    }
  }
}

/**
 * Die Steilkanten im Landesinneren.
 *
 * Dieselbe Idee wie am Ufer, nur dass die Wand hier zwischen zwei
 * Landstücken steht statt zwischen Land und Wasser. Gezeichnet wird sie
 * auf den Kacheln, die die Weltgenerierung als `T.CLIFF` hingestellt hat
 * – also am FUSS der oberen Fläche, nicht auf ihr.
 *
 * Die Form ist der übliche Kachelklecks und kein Rechteck: Er greift über
 * die Kachelgrenze hinaus, und dadurch verschmelzen benachbarte
 * Wandkacheln zu einer durchgehenden Wand statt zu einer Treppe.
 */
function steilkanten(g, world, tx0, ty0, ring) {
  const hoehe = world.hoeheAtTile
    ? function (tx, ty) { return world.hoeheAtTile(tx, ty); }
    : function () { return 0; };
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      if (world.tileAtTile(tx, ty) !== T.CLIFF) continue;
      const y = ty * TILE_SIZE;
      // Der Verlauf hat dieselbe Reihenfolge wie am Ufer: oben die
      // frische Erde unter der Grasnarbe, dann der Absturz ins Dunkle,
      // unten wieder aufgehellt. Erst der helle Saum lässt die Narbe
      // überhängen.
      const grad = g.createLinearGradient(0, y - 4, 0, y + TILE_SIZE + 6);
      grad.addColorStop(0, INK.uferLicht);
      grad.addColorStop(0.22, INK.uferTief);
      grad.addColorStop(0.72, INK.ufer);
      grad.addColorStop(1, INK.uferLicht);
      g.save();
      g.fillStyle = grad;
      pathFrom(g, tilePatch(tx, ty, 0.56), true);
      g.fill();
      // Liegt unter der Wand wieder Land, wirft sie ihren Schatten
      // darauf. Ohne den steht die Wand auf der Wiese wie aufgeklebt.
      if (isWalkable(world.tileAtTile(tx, ty + 1)) && hoehe(tx, ty + 1) <= hoehe(tx, ty)) {
        g.globalAlpha = 0.3;
        const sg = g.createLinearGradient(0, y + TILE_SIZE - 2, 0, y + TILE_SIZE + 22);
        sg.addColorStop(0, INK.uferTief);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sg;
        g.fillRect(tx * TILE_SIZE - 4, y + TILE_SIZE - 2, TILE_SIZE + 8, 24);
      }
      g.restore();
    }
  }
}

/**
 * Die Oberkante der Steilkanten und die Risse darin.
 *
 * Die Oberkante ist der wichtigste Strich im ganzen Bild der Wand: Sie
 * ist die Linie, an der die obere Grasnarbe abbricht. Gezeichnet wird sie
 * genau auf der Grenze zur höheren Nachbarkachel, mit demselben
 * Eckenzittern wie alle anderen Kanten – so treffen sich die Striche
 * zweier Nachbarkacheln.
 */
function steilkantenTinte(g, world, tx0, ty0, ring) {
  const hoehe = world.hoeheAtTile
    ? function (tx, ty) { return world.hoeheAtTile(tx, ty); }
    : function () { return 0; };
  const risse = [];
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      if (world.tileAtTile(tx, ty) !== T.CLIFF) continue;
      const z = hoehe(tx, ty);
      const x0 = tx * TILE_SIZE;
      const y0 = ty * TILE_SIZE;
      const seiten = [
        [0, -1, [x0, y0], [x0 + TILE_SIZE, y0]],
        [-1, 0, [x0, y0], [x0, y0 + TILE_SIZE]],
        [1, 0, [x0 + TILE_SIZE, y0], [x0 + TILE_SIZE, y0 + TILE_SIZE]],
        [0, 1, [x0, y0 + TILE_SIZE], [x0 + TILE_SIZE, y0 + TILE_SIZE]],
      ];
      for (let k = 0; k < seiten.length; k++) {
        const sx = seiten[k][0];
        const sy = seiten[k][1];
        if (hoehe(tx + sx, ty + sy) <= z) continue;
        if (!isWalkable(world.tileAtTile(tx + sx, ty + sy))) continue;
        const a = seiten[k][2];
        const b = seiten[k][3];
        const ja = cornerJitter(Math.round(a[0] / 8), Math.round(a[1] / 8));
        const jb = cornerJitter(Math.round(b[0] / 8), Math.round(b[1] / 8));
        inkStroke(g, [
          [a[0] + ja[0] * 0.4, a[1] + ja[1] * 0.4],
          [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
          [b[0] + jb[0] * 0.4, b[1] + jb[1] * 0.4],
        ], {
          closed: false, width: 3.0, vary: 0.4,
          seed: hashString('sk' + tx + ':' + ty + ':' + k),
          color: INK.line, alpha: 0.85,
        });
      }
      const rng = makeRng(hashString('skr' + tx + ':' + ty));
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const x = x0 + (0.15 + rng() * 0.7) * TILE_SIZE;
        const oy = y0 + 6 + rng() * 8;
        risse.push([x, oy, x + (rng() - 0.5) * 6, oy + TILE_SIZE * (0.3 + rng() * 0.4)]);
      }
    }
  }
  if (!risse.length) return;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = INK.line;
  g.globalAlpha = 0.3;
  g.lineWidth = 1.9;
  g.beginPath();
  for (let i = 0; i < risse.length; i++) {
    const r = risse[i];
    g.moveTo(r[0], r[1]);
    g.lineTo(r[2], r[3]);
  }
  g.stroke();
  g.restore();
}

/**
 * Wie stark die Küstenlinie hier zittert. Dieselbe Zahl wie beim
 * Hauptstrich der Küste – nur dann sitzt die Wand unter dem Strich.
 */
const WAND_JITTER = 13;

/**
 * Die Wandflächen eines Stücks.
 *
 * Für jeden Küstenabschnitt wird geprüft, ob darüber Land und darunter
 * Wasser liegt; nur dann sieht man eine Wand. Ihre Höhe hängt davon ab,
 * wie WAAGERECHT der Abschnitt verläuft: Eine Kante quer zum Blick zeigt
 * ihre ganze Fläche, eine längs dazu fast keine. Ohne diesen Faktor liefen
 * an Ost- und Westküsten braune Bänder NEBEN dem Land durchs Wasser.
 *
 * Der erste Versuch zog die Wand an den Kachelgrenzen hoch statt an der
 * Küstenlinie. Auf einer diagonalen Küste ergab das einzelne braune
 * Rechtecke, die im Wasser schwammen – der Strich lief diagonal durch die
 * Kachel, die Wand saß an ihrem Rand.
 */
function wandFlaechen(world, tx0, ty0, ring) {
  const kanten = kuestenKanten(world, tx0, ty0, ring, WAND_JITTER);
  const out = [];
  for (let i = 0; i < kanten.length; i++) {
    const a = kanten[i][0];
    const b = kanten[i][1];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const oben = world.tileAtTile(Math.floor(mx / TILE_SIZE), Math.floor((my - 22) / TILE_SIZE));
    const unten = world.tileAtTile(Math.floor(mx / TILE_SIZE), Math.floor((my + 22) / TILE_SIZE));
    if (!isWalkable(oben) || !isWater(unten)) continue;
    // Ein STRAND hat keine Felskante. Sand läuft flach ins Wasser, und
    // genau dieser Unterschied macht aus einer Insel mit Wand ringsum
    // eine Landschaft: hier Steilküste, dort Bucht. Im ersten Entwurf lag
    // das braune Band auch unter dem Sand, und der Strand sah aus, als
    // hinge er in der Luft.
    if (oben === T.SAND) continue;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const quer = Math.abs(dx) / len;
    if (quer < 0.3) continue;
    const h = WAND_HOEHE * quer;
    // Die Unterkante wackelt stark, die obere kaum: Oben schneidet die
    // Grasnarbe sauber ab, unten bricht der Fels ins Wasser. Der
    // Zitterwert hängt am ENDPUNKT, nicht am Abschnitt – zwei Abschnitte
    // teilen sich ihn und die Wand bleibt durchgehend.
    const ja = cornerJitter(Math.round(a[0]), Math.round(a[1]));
    const jb = cornerJitter(Math.round(b[0]), Math.round(b[1]));
    out.push({
      a: a, b: b,
      ua: [a[0], a[1] + h * (0.82 + ja[0] * 0.022)],
      ub: [b[0], b[1] + h * (0.82 + jb[0] * 0.022)],
      h: h,
    });
  }
  return out;
}

/**
 * Die Abbruchkante am Ufer – das Land bekommt Höhe.
 *
 * Bis hierher war die Insel eine Landkarte: Gras hörte auf, Wasser fing
 * an, beides in derselben Ebene. Im Vorbild liegt das Land HÖHER als das
 * Wasser, und was man sieht, ist nicht die Grenze, sondern die Wand
 * darunter – eine braune Felskante mit der Grasnarbe als Überhang oben
 * drauf. Das ist der stärkste Tiefeneindruck im ganzen Bild und zugleich
 * die größte dunkle Fläche darin.
 */
function uferwand(g, flaechen) {
  for (let i = 0; i < flaechen.length; i++) {
    const f = flaechen[i];
    g.save();
    // Der Verlauf macht die Fläche zur Wand, und seine Reihenfolge ist
    // nicht beliebig: oben ein schmaler heller Streifen – die frische
    // Erde direkt unter der Grasnarbe –, dann der Absturz ins Dunkle,
    // unten wieder etwas aufgehellt vom Wasser. Erst dieser helle Saum
    // lässt die Narbe überhängen; ohne ihn ist es ein brauner Balken.
    const y0 = Math.min(f.a[1], f.b[1]);
    const grad = g.createLinearGradient(0, y0, 0, y0 + f.h);
    grad.addColorStop(0, INK.uferLicht);
    grad.addColorStop(0.18, INK.uferTief);
    grad.addColorStop(0.66, INK.ufer);
    grad.addColorStop(1, INK.uferLicht);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(f.a[0], f.a[1]);
    g.lineTo(f.b[0], f.b[1]);
    g.lineTo(f.ub[0], f.ub[1]);
    g.lineTo(f.ua[0], f.ua[1]);
    g.closePath();
    g.fill();
    // Und die Wand wirft ihren Schatten aufs Wasser davor.
    g.globalAlpha = 0.4;
    const sg = g.createLinearGradient(0, y0 + f.h * 0.82, 0, y0 + f.h * 0.82 + 20);
    sg.addColorStop(0, INK.waterDark);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(f.ua[0], f.ua[1] - 2);
    g.lineTo(f.ub[0], f.ub[1] - 2);
    g.lineTo(f.ub[0], f.ub[1] + 20);
    g.lineTo(f.ua[0], f.ua[1] + 20);
    g.closePath();
    g.fill();
    g.restore();
  }
}

/**
 * Senkrechte Risse in der Uferwand.
 *
 * Sie liegen in der Tinte, nicht in der Farbe: Eine Wand ohne Struktur
 * ist ein brauner Balken, und im unkolorierten Zustand wäre von ihr sonst
 * gar nichts zu sehen.
 */
function uferRisse(g, flaechen) {
  const striche = [];
  for (let i = 0; i < flaechen.length; i++) {
    const f = flaechen[i];
    const rng = makeRng(hashString('riss' + Math.round(f.a[0]) + ':' + Math.round(f.a[1])));
    const n = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const u = 0.12 + rng() * 0.76;
      const x = f.a[0] + (f.b[0] - f.a[0]) * u;
      const y = f.a[1] + (f.b[1] - f.a[1]) * u;
      const tief = f.h * (0.35 + rng() * 0.45);
      striche.push([x, y + 4 + rng() * 4, x + (rng() - 0.5) * 5, y + tief]);
    }
  }
  if (!striche.length) return;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = INK.line;
  g.globalAlpha = 0.34;
  g.lineWidth = 1.9;
  g.beginPath();
  for (let i = 0; i < striche.length; i++) {
    const t = striche[i];
    g.moveTo(t[0], t[1]);
    g.lineTo(t[2], t[3]);
  }
  g.stroke();
  g.restore();
}

/**
 * Die beiden Stützpunkte zwischen benachbarten Kachelmitten.
 *
 * Auf Modulebene und nicht in `contour`, weil die Uferwand DIESELBEN
 * Punkte braucht: Sie wird aus der Küstenlinie nach unten gezogen, und
 * nur wenn beide aus derselben Rechnung kommen, sitzt die Wand genau
 * unter dem Strich statt daneben.
 */
function midH(tx, ty, j) { // zwischen (tx,ty) und (tx+1,ty)
  const o = cornerJitter(tx * 2 + 1, ty * 2);
  return [(tx + 1) * TILE_SIZE + o[0] * (j / 13), (ty + 0.5) * TILE_SIZE + o[1] * (j / 13)];
}
function midV(tx, ty, j) { // zwischen (tx,ty) und (tx,ty+1)
  const o = cornerJitter(tx * 2, ty * 2 + 1);
  return [(tx + 0.5) * TILE_SIZE + o[0] * (j / 13), (ty + 1) * TILE_SIZE + o[1] * (j / 13)];
}

/**
 * Alle Küstenabschnitte eines Stücks als Strecken, in derselben
 * Marching-Squares-Rechnung wie die Tuschelinie.
 */
function kuestenKanten(world, tx0, ty0, ring, j) {
  const out = [];
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const a = isWalkable(world.tileAtTile(tx, ty)) ? 1 : 0;
      const b = isWalkable(world.tileAtTile(tx + 1, ty)) ? 1 : 0;
      const c = isWalkable(world.tileAtTile(tx + 1, ty + 1)) ? 1 : 0;
      const d = isWalkable(world.tileAtTile(tx, ty + 1)) ? 1 : 0;
      const code = a | (b << 1) | (c << 2) | (d << 3);
      if (code === 0 || code === 15) continue;
      const top = midH(tx, ty, j);
      const right = midV(tx + 1, ty, j);
      const bottom = midH(tx, ty + 1, j);
      const left = midV(tx, ty, j);
      switch (code) {
        case 1: case 14: out.push([left, top]); break;
        case 2: case 13: out.push([top, right]); break;
        case 3: case 12: out.push([left, right]); break;
        case 4: case 11: out.push([right, bottom]); break;
        case 6: case 9: out.push([top, bottom]); break;
        case 7: case 8: out.push([left, bottom]); break;
        case 5: out.push([left, top]); out.push([right, bottom]); break;
        case 10: out.push([top, right]); out.push([left, bottom]); break;
        default: break;
      }
    }
  }
  return out;
}

/**
 * Küstenlinie als echte Kontur (Marching Squares über die Kachelmitten).
 *
 * Zöge man einfach die Kanten zwischen Land- und Wasserkacheln nach, entstünde
 * eine Treppe. Läuft die Linie stattdessen durch die Mittelpunkte zwischen
 * benachbarten Kachelmitten, ergeben sich saubere Diagonalen – und weil diese
 * Punkte zu einem Kachelpaar gehören, passen sie über Stückgrenzen hinweg
 * zusammen.
 */
function contour(g, world, tx0, ty0, ring, classify, width, color, alpha, jitter) {
  const j = jitter == null ? 11 : jitter;

  function segment(a, b, tx, ty, tag) {
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const o = cornerJitter(tx * 3 + tag, ty * 5 + tag);
    inkStroke(g, [a, [mid[0] + o[0] * 0.5, mid[1] + o[1] * 0.5], b], {
      closed: false, width: width, vary: 0.4,
      seed: hashString('s' + tx + ':' + ty + ':' + tag), color: color, alpha: alpha,
    });
  }

  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      const a = classify(world.tileAtTile(tx, ty)) ? 1 : 0;
      const b = classify(world.tileAtTile(tx + 1, ty)) ? 1 : 0;
      const c = classify(world.tileAtTile(tx + 1, ty + 1)) ? 1 : 0;
      const d = classify(world.tileAtTile(tx, ty + 1)) ? 1 : 0;
      const code = a | (b << 1) | (c << 2) | (d << 3);
      if (code === 0 || code === 15) continue;

      const top = midH(tx, ty, j);
      const right = midV(tx + 1, ty, j);
      const bottom = midH(tx, ty + 1, j);
      const left = midV(tx, ty, j);

      switch (code) {
        case 1: case 14: segment(left, top, tx, ty, 1); break;
        case 2: case 13: segment(top, right, tx, ty, 2); break;
        case 3: case 12: segment(left, right, tx, ty, 3); break;
        case 4: case 11: segment(right, bottom, tx, ty, 4); break;
        case 6: case 9: segment(top, bottom, tx, ty, 6); break;
        case 7: case 8: segment(left, bottom, tx, ty, 7); break;
        case 5: segment(left, top, tx, ty, 51); segment(right, bottom, tx, ty, 52); break;
        case 10: segment(top, right, tx, ty, 101); segment(left, bottom, tx, ty, 102); break;
        default: break;
      }
    }
  }
}

/**
 * Kurze senkrechte Striche unterhalb einer Felskante – die Stufe.
 * Gezeichnet wird nur dort, wo unter dem Felsboden kein Felsboden mehr liegt.
 */
function rockStep(g, world, tx0, ty0, ring) {
  const marks = [];
  for (let ty = ty0 - ring; ty < ty0 + CHUNK_TILES + ring; ty++) {
    for (let tx = tx0 - ring; tx < tx0 + CHUNK_TILES + ring; tx++) {
      if (world.tileAtTile(tx, ty) !== T.ROCKFLOOR) continue;
      if (world.tileAtTile(tx, ty + 1) === T.ROCKFLOOR) continue;
      const rng = makeRng(hashString('step' + tx + ':' + ty));
      const y = (ty + 1) * TILE_SIZE;
      for (let i = 0; i < 4; i++) {
        const x = (tx + (i + 0.5) / 4) * TILE_SIZE + (rng() - 0.5) * 7;
        marks.push([x, y - 3, x + (rng() - 0.5) * 4, y + 7 + rng() * 7]);
      }
    }
  }
  if (!marks.length) return;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = INK.rockDeep;
  g.globalAlpha = 0.45;
  g.lineWidth = 2.0;
  g.beginPath();
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    g.moveTo(m[0], m[1]);
    g.lineTo(m[2], m[3]);
  }
  g.stroke();
  g.restore();
}

/** Küstenlinie und Bodendetails. */
/**
 * @param {Function} abnutzung Stufe des Trampelpfads je Kachel. Wird
 * durchgereicht und nicht hier geholt: Die Tintenschicht kennt den
 * Spielstand nicht, sie bekommt eine Frage, die sie stellen darf.
 */
function paintGroundInk(g, world, tx0, ty0, ring, abnutzung, waende) {
  const r = Math.min(ring, 1);
  // Brandung zuerst: eine breite weiße Linie, die um die Küste herumwandert.
  // Der andere Zitterwert lässt sie neben der Tuschelinie laufen – so entsteht
  // der Schaumsaum der Vorlage statt einer sauberen Doppellinie.
  contour(g, world, tx0, ty0, r, isWalkable, 5.5, '#ffffff', 0.5, 19);
  contour(g, world, tx0, ty0, r, isWalkable, 3.2, INK.line, 0.9, 13);
  contour(g, world, tx0, ty0, r,
    function (t) { return t !== T.SAND && isWalkable(t); },
    1.7, INK.lineSoft, 0.3, 9);
  // Der Felsboden liegt höher als die Wiese. Eine kräftigere Kante plus kurze
  // Striche darunter lassen ihn als flache Stufe lesen – wie die Kreidekanten
  // der Vorlage, aber ohne eine Wand über begehbaren Boden zu malen.
  contour(g, world, tx0, ty0, r,
    function (t) { return t === T.ROCKFLOOR; },
    2.6, INK.rockDeep, 0.65, 11);
  rockStep(g, world, tx0, ty0, r);
  uferRisse(g, waende);
  steilkantenTinte(g, world, tx0, ty0, r);

  // Bodendetails: Grasbüschel, Kiesel, Wellenkringel.
  // Alles in wenigen Sammelpfaden – tausend einzelne stroke()-Aufrufe pro
  // Bodenstück waren der Grund, warum die Bildrate beim Laufen einbrach.
  const grass = [];
  const waves = [];
  const scratches = [];
  const pebbles = [];
  const fronds = [];
  const swell = [];
  const rippel = [];
  const pathStones = [];
  const planks = [];

  for (let ty = ty0 - 1; ty < ty0 + CHUNK_TILES + 1; ty++) {
    for (let tx = tx0 - 1; tx < tx0 + CHUNK_TILES + 1; tx++) {
      const t = world.tileAtTile(tx, ty);
      const rng = makeRng(hashString('d' + tx + ':' + ty));
      const bx = (tx + 0.2 + rng() * 0.6) * TILE_SIZE;
      const by = (ty + 0.2 + rng() * 0.6) * TILE_SIZE;
      const tritt = abnutzung(tx, ty);
      if (t === T.GRASS) {
        // Vier Büschel je Kachel. Vorher waren es zwei, von denen eines
        // oft ausfiel – rund vier Halme auf 64 mal 64 Bildpunkte. Die
        // Wiese war dadurch über weite Strecken eine glatte Fläche, auf
        // der nur die Lasuren lagen, und genau das sah nach Farbe statt
        // nach Zeichnung aus. Alle Halme landen ohnehin in EINEM
        // Sammelpfad, die Zahl kostet also kaum etwas.
        // Auf einem Trampelpfad wächst weniger. Das ist der eigentliche
        // Effekt – die erdige Lasur allein verschwindet unter dem
        // Papierschleier, die FEHLENDEN Halme sieht man sofort.
        const halme = tritt === 2 ? 0 : tritt === 1 ? 2 : 4;
        for (let k = 0; k < halme; k++) {
          if (rng() > 0.82) continue;
          const gx = (tx + rng()) * TILE_SIZE;
          const gy = (ty + rng()) * TILE_SIZE;
          const blades = 2 + ((rng() * 3) | 0);
          // Kurze und lange Büschel gemischt: gleich hohe Halme überall
          // ergeben einen Kamm, keinen Rasen.
          const hoch = 0.55 + rng() * 0.85;
          for (let i = 0; i < blades; i++) {
            const x = gx + (i - (blades - 1) / 2) * 6;
            grass.push([x, gy + 7, x + (rng() - 0.5) * 11, gy + 7 - (15 + rng() * 11) * hoch]);
          }
        }
        // Farnwedel: ein Bogen mit Fiedern, gibt der Wiese Struktur
        if (!tritt && rng() < 0.2) fronds.push([bx, by, rng() < 0.5 ? -1 : 1]);
        // Auf dem Trampelpfad stattdessen Trittspuren. Ohne sie wäre eine
        // deutlich ausgetretene Kachel vollkommen leer – gemessen null
        // Prozent Tinte –, und auf der unkolorierten Insel sähe man vom
        // ganzen Weg nichts. Ein Weg ist aber gerade dort eine Zeichnung.
        if (tritt) {
          const n = tritt === 2 ? 3 : 2;
          for (let k = 0; k < n; k++) {
            const sx2 = (tx + 0.12 + rng() * 0.7) * TILE_SIZE;
            const sy2 = (ty + 0.14 + rng() * 0.72) * TILE_SIZE;
            const lang = 9 + rng() * 13;
            scratches.push([sx2, sy2, sx2 + lang, sy2 + (rng() - 0.5) * 5]);
          }
        }
      } else if (t === T.SAND) {
        if (rng() < 0.5) {
          pebbles.push([bx, by, 3.5 + rng() * 1.5]);
          pebbles.push([bx + 11, by + 5, 3 + rng()]);
        }
        // Rippelmarken im Sand
        if (rng() < 0.4) {
          const y = (ty + rng()) * TILE_SIZE;
          scratches.push([(tx + 0.05) * TILE_SIZE, y, (tx + 0.85) * TILE_SIZE, y + (rng() - 0.5) * 9]);
        }
      } else if (isWater(t)) {
        // Nah am Ufer kräuselt es, draußen ist die See ruhig – gleichmäßig
        // verteilte Kringel überall sahen aus wie ein Muster, nicht wie Wasser.
        const near = landDistance(world, tx, ty, 5) <= 4;
        if (rng() < (near ? 0.42 : 0.14)) {
          waves.push([bx, by, 8 + rng() * 14, 0.5 + rng(), 3.2 + rng()]);
        }
        // Lange, flache Züge parallel zum Ufer
        if (near && rng() < 0.3) {
          const y = (ty + rng()) * TILE_SIZE;
          swell.push([(tx - 0.3) * TILE_SIZE, y, (tx + 1.3) * TILE_SIZE, y + (rng() - 0.5) * 14]);
        }
      } else if (t === T.TIDEFLAT) {
        /**
         * Rippelmarken – das Einzige, woran man das Watt erkennt.
         *
         * Gemessen: Die Grundfarbe der Kachel macht im Bild KEINEN
         * Unterschied. Vier Farben von hell bis dunkel ergaben denselben
         * Pixelwert, weil die Farbschicht unkoloriert fast vollständig
         * unter dem Papierschleier verschwindet – dasselbe Problem, das
         * beim Steinweg weiter unten schon einmal beschrieben ist. Im
         * Spiel stand Seli damit scheinbar auf dem Wasser.
         *
         * Also Tinte statt Farbe, und zwar das Zeichen, das ein trocken
         * gefallener Meeresboden wirklich trägt: drei lange, wellige Züge
         * je Kachel, quer zum Ufer. Dichter als die Rippel im Sand (dort
         * eine mit 40 % Wahrscheinlichkeit) – der Unterschied zwischen
         * Strand und Watt muss man SEHEN, nicht erraten.
         */
        for (let k = 0; k < 3; k++) {
          const y = (ty + (k + 0.5) / 3 + (rng() - 0.5) * 0.12) * TILE_SIZE;
          rippel.push([
            (tx - 0.15) * TILE_SIZE, y,
            (tx + 1.15) * TILE_SIZE, y + (rng() - 0.5) * 7,
            4 + rng() * 5,
          ]);
        }
        // Dazwischen liegt, was das Wasser liegen gelassen hat.
        if (rng() < 0.35) pebbles.push([bx, by, 2.5 + rng() * 1.5]);
      } else if (t === T.ROCKFLOOR) {
        if (rng() < 0.45) scratches.push([bx - 9, by, bx + 10, by - 4]);
        if (rng() < 0.3) pebbles.push([bx + 6, by + 12, 3 + rng() * 2]);
      } else if (t === T.DIRT && rng() < 0.35) {
        pebbles.push([bx, by, 2.5 + rng() * 1.5]);
      } else if (t === T.PATH) {
        // Ein gelegter Weg braucht Tinte, sonst ist er nicht da.
        //
        // Bisher bestand er nur aus seiner Grundfarbe in der Farbschicht – und
        // die verschwindet unkoloriert fast vollständig unter dem Papierschleier
        // (0,76 Deckung). Wer im blassen Teil der Insel einen Steinweg legte,
        // sah nichts und hielt das Aufstellen für kaputt.
        for (let k = 0; k < 4; k++) {
          const sx = (tx + 0.28 + (k % 2) * 0.44 + (rng() - 0.5) * 0.07) * TILE_SIZE;
          const sy = (ty + 0.28 + ((k / 2) | 0) * 0.44 + (rng() - 0.5) * 0.07) * TILE_SIZE;
          const seed = hashString('ps' + tx + ':' + ty + ':' + k);
          pathStones.push({
            pts: smoothClosed(blob(sx, sy, TILE_SIZE * 0.19, TILE_SIZE * 0.16, seed, 0.18, 12), 5),
            seed: seed,
          });
        }
      } else if (t === T.BRIDGE) {
        for (let k = 0; k < 3; k++) {
          const y = (ty + (k + 1) / 4) * TILE_SIZE + (rng() - 0.5) * 3;
          planks.push([tx * TILE_SIZE - 1, y, (tx + 1) * TILE_SIZE + 1, y + (rng() - 0.5) * 4]);
        }
      }
    }
  }

  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';

  if (grass.length) {
    g.strokeStyle = INK.lineSoft;
    g.globalAlpha = 0.42;
    g.lineWidth = 1.7;
    g.beginPath();
    for (let i = 0; i < grass.length; i++) {
      const b = grass[i];
      g.moveTo(b[0], b[1]);
      g.quadraticCurveTo((b[0] + b[2]) / 2 - 3, (b[1] + b[3]) / 2, b[2], b[3]);
    }
    g.stroke();
  }

  if (fronds.length) {
    // Neutrale Tinte, kein Grün: die Tintenschicht bleibt auch im
    // unkolorierten Zustand sichtbar und wäre sonst ein Farbfleck im Malbuch.
    g.strokeStyle = INK.lineSoft;
    g.globalAlpha = 0.5;
    g.lineWidth = 1.8;
    g.beginPath();
    for (let i = 0; i < fronds.length; i++) {
      const f = fronds[i];
      const dir = f[2];
      g.moveTo(f[0], f[1] + 9);
      g.quadraticCurveTo(f[0] + dir * 6, f[1] - 4, f[0] + dir * 17, f[1] - 13);
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        const px = f[0] + dir * (6 * 2 * t * (1 - t) + 17 * t * t);
        const py = f[1] + 9 + (-13 * 2 * t * (1 - t) - 22 * t * t);
        g.moveTo(px, py);
        g.lineTo(px + dir * 7, py - 5);
        g.moveTo(px, py);
        g.lineTo(px - dir * 4, py - 6);
      }
    }
    g.stroke();
  }

  if (scratches.length) {
    g.strokeStyle = INK.lineSoft;
    g.globalAlpha = 0.35;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < scratches.length; i++) {
      const b = scratches[i];
      g.moveTo(b[0], b[1]);
      g.quadraticCurveTo((b[0] + b[2]) / 2, (b[1] + b[3]) / 2 + 4, b[2], b[3]);
    }
    g.stroke();
  }

  if (rippel.length) {
    // Etwas kräftiger als die Rippel im Sand (0,35 / 1,5): Das Watt ist
    // nass, und nasse Rinnen zeichnen sich schärfer ab als trockener Sand.
    g.strokeStyle = INK.lineSoft;
    g.globalAlpha = 0.42;
    g.lineWidth = 1.7;
    g.beginPath();
    for (let i = 0; i < rippel.length; i++) {
      const b = rippel[i];
      g.moveTo(b[0], b[1]);
      g.quadraticCurveTo((b[0] + b[2]) / 2, (b[1] + b[3]) / 2 + b[4], b[2], b[3]);
    }
    g.stroke();
  }

  if (swell.length) {
    g.strokeStyle = '#ffffff';
    g.globalAlpha = 0.22;
    g.lineWidth = 3.2;
    g.beginPath();
    for (let i = 0; i < swell.length; i++) {
      const s = swell[i];
      g.moveTo(s[0], s[1]);
      g.quadraticCurveTo((s[0] + s[2]) / 2, (s[1] + s[3]) / 2 - 7, s[2], s[3]);
    }
    g.stroke();
  }

  if (waves.length) {
    g.strokeStyle = '#ffffff';
    g.globalAlpha = 0.5;
    g.lineWidth = 1.8;
    g.beginPath();
    for (let i = 0; i < waves.length; i++) {
      const w = waves[i];
      g.moveTo(w[0] + Math.cos(w[3]) * w[2], w[1] + Math.sin(w[3]) * w[2]);
      g.arc(w[0], w[1], w[2], w[3], w[4]);
    }
    g.stroke();
  }

  if (pathStones.length) {
    // Heller Kern, dann die Kontur – so liest sich der Stein auch dort als
    // Stein, wo der Papierschleier alle Farbe geschluckt hat.
    g.globalAlpha = 0.62;
    g.fillStyle = '#e2dac6';
    g.beginPath();
    for (let i = 0; i < pathStones.length; i++) {
      const pts = pathStones[i].pts;
      g.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
      g.closePath();
    }
    g.fill();
    g.globalAlpha = 1;
    for (let i = 0; i < pathStones.length; i++) {
      inkStroke(g, pathStones[i].pts, {
        width: 1.9, vary: 0.3, seed: pathStones[i].seed, color: INK.line, alpha: 0.72,
      });
    }
  }

  if (planks.length) {
    g.strokeStyle = INK.line;
    g.globalAlpha = 0.6;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < planks.length; i++) {
      const p = planks[i];
      g.moveTo(p[0], p[1]);
      g.lineTo(p[2], p[3]);
    }
    g.stroke();
  }

  if (pebbles.length) {
    g.globalAlpha = 0.5;
    g.fillStyle = '#bcaf90';
    g.beginPath();
    for (let i = 0; i < pebbles.length; i++) {
      const b = pebbles[i];
      g.moveTo(b[0] + b[2], b[1]);
      g.ellipse(b[0], b[1], b[2], b[2] * 0.72, 0, 0, Math.PI * 2);
    }
    g.fill();
  }
  g.restore();
}

/* ------------------------------------------------- Aufstellbare Bodenstücke */

/** Kleine Bodenflächen zum Aufstellen: Steinweg und Brückenplanken. */
export function paintGroundDecal(kind, seed) {
  const s = TILE_SIZE;
  const color = makeCanvas(s, s);
  const cctx = ctx2d(color);
  const line = makeCanvas(s, s);
  const lctx = ctx2d(line);
  const rng = makeRng(seed);

  function draw(g, pale) {
    g.imageSmoothingEnabled = true;
    if (kind === 'path') {
      const stones = [];
      for (let i = 0; i < 4; i++) {
        const x = s * (0.28 + (i % 2) * 0.44);
        const y = s * (0.28 + Math.floor(i / 2) * 0.44);
        stones.push(smoothClosed(blob(x, y, s * 0.19, s * 0.16, seed + i, 0.18, 12), 5));
      }
      g.fillStyle = pale ? '#e7e2d4' : '#d5c8ad';
      for (let i = 0; i < stones.length; i++) { pathFrom(g, stones[i], true); g.fill(); }
      for (let i = 0; i < stones.length; i++) {
        inkStroke(g, stones[i], { width: 2.0, vary: 0.3, seed: seed + 10 + i, color: INK.line, alpha: 0.8 });
      }
    } else {
      g.fillStyle = pale ? '#e9e3d3' : INK.wood;
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 3; i++) {
        const y = (i + 1) * (s / 4) + (rng() - 0.5) * 3;
        inkLine(g, -2, y, s + 2, y + (rng() - 0.5) * 4,
          { width: 2.0, bend: 0.02, seed: seed + 20 + i, color: INK.line, alpha: 0.7 });
      }
      inkLine(g, 1, 0, 1, s, { width: 2.4, bend: 0, seed: seed + 30, color: INK.line, alpha: 0.6 });
      inkLine(g, s - 1, 0, s - 1, s, { width: 2.4, bend: 0, seed: seed + 31, color: INK.line, alpha: 0.6 });
    }
  }

  draw(cctx, false);
  draw(lctx, true);
  return { color: color, line: line, w: s, h: s, ax: s / 2, ay: s / 2 };
}
