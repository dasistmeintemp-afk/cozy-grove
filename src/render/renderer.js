/**
 * Szenen-Renderer.
 *
 * Ablauf pro Bild:
 *   1. Papier, dann die Insel als blasse Zeichnung
 *   2. dieselbe Szene koloriert in eine Zwischenfläche und durch die Farbmaske
 *      einblenden – so wächst Farbe nur dort, wo Geister zufrieden sind
 *   3. Tageszeit und Lichter
 *   4. Partikel, Kleintiere, Markierungen
 *
 * Gezeichnet wird durchgehend in Weltkoordinaten; Kamera und Zoom stecken in
 * der Transformation.
 */
import { makeCanvas, ctx2d, clamp } from '../core/util.js';
import { drawSprite, spr, hasSprite, ensureBild } from '../art/sprites.js';
import { defOf, spriteFor } from '../world/entities.js';
import { getItem } from '../game/items.js';
import { campfireLevelFor } from '../game/recipes.js';
import { seasonTint } from '../game/seasons.js';
import { sitzHoehe } from '../game/rest.js';
import { plaetzeVon, zeigtWas } from '../game/schaukasten.js';
import { INK } from '../art/painted.js';
import { TILE_SIZE, isWater } from '../art/tiles.js';

/** Diese Wesen behalten immer ihre Farbe – sie sind ja nicht verblasst. */
const ALWAYS_COLOR = { spirit: 1, fox: 1, hidden: 1, wanderer: 1 };

/**
 * Das Bezugsmaß für den Zoom – und damit, wie viel Welt ins Bild passt.
 *
 * Gemessen an vier Bildern des Vorbilds: Dort ist die Spielfigur rund
 * acht Prozent der Bildbreite hoch, bei uns waren es dreizehn. Die Folge
 * war nicht, dass Seli zu groß aussah – sie sah richtig aus –, sondern
 * dass zu WENIG ins Bild passte. Ein Bildschirm des Vorbilds zeigt sechzig
 * einzelne Dinge, unserer fünfundzwanzig, und daran hing der Eindruck von
 * Fülle, nicht an der Zahl der Dinge je Quadratmeter.
 *
 * Von 1560×880 auf 2080×1170: Das ist Faktor 1,33 in der Breite, also die
 * eineinhalbfache Fläche. Weiter wollte ich nicht gehen, ohne es zu
 * sehen – ab irgendwann ist die Figur ein Punkt, und das Spiel handelt
 * von ihr.
 */
const REFERENCE_W = 2080;
const REFERENCE_H = 1170;
// Obergrenze für die Zahl der gezeichneten Bildpunkte.
//
// Angehoben von 2,1 auf 3,2 Millionen: Auf einem Bildschirm mit doppelter
// Punktdichte will ein 1440×900 großes Fenster 5,2 Millionen – gedeckelt
// auf 2,1 blieben davon 0,63 Punkte je Bildschirmpunkt übrig, und genau
// diese Geräte benutzen die meisten Leute. Mit 3,2 sind es 0,78, und die
// Nachsteuerung darunter nimmt zurück, wenn es dafür zu langsam wird –
// das ist ihre Aufgabe, und seit der Schwellenkorrektur kann sie auch
// wieder hoch.
const MAX_PIXELS = 3200000;

/**
 * Luftperspektive – die Ferne verliert Farbe.
 *
 * Das Bild ist eine Draufsicht, aber keine senkrechte: Die Sprites sind
 * leicht geneigt gemalt, und was weiter oben im Bild steht, steht weiter
 * weg. Genau diese Staffelung war bisher nirgends zu sehen – ein Baum am
 * oberen Rand war so satt wie der, neben dem Seli steht. Dadurch las sich
 * das Ganze als Landkarte statt als Landschaft.
 *
 * Luft ist nicht durchsichtig; über Entfernung legt sie sich als blasser,
 * kühler Schleier vor alles. Das ist der älteste Trick der Landschafts-
 * malerei, und er kostet hier einen Verlauf je Bild.
 *
 * `DUNST_HOEHE` ist der Anteil der Bildhöhe, über den der Schleier
 * ausläuft. Bei weniger als etwa der Hälfte sieht man eine Kante, bei
 * mehr nebelt die Bildmitte ein, in der gespielt wird.
 */
const DUNST_HOEHE = 0.58;

/**
 * Deckung am oberen Bildrand.
 *
 * Die Obergrenze ist hier nicht Geschmack, sondern das Papier: Schon bei
 * 0,25 verschwand die Bleistiftzeichnung unter dem Schleier, und die ist
 * das Einzige, was dieses Spiel optisch zusammenhält. Gemessen (siehe die
 * Prüfung „Was oben im Bild steht, ist blasser"): Mit 0,18 verliert
 * derselbe Weltpunkt am oberen Rand rund ein Zehntel seiner Farbigkeit
 * gegenüber der Bildmitte – sichtbar, wenn man die Insel überblickt, und
 * unauffällig, wenn man nur läuft.
 */
const DUNST_STAERKE = 0.18;

/** Der Grundton des Schleiers: kühles, helles Graublau. */
const DUNST_HIMMEL = [220, 232, 243];

/**
 * Welche Arten je Exemplar ein wenig anders aussehen dürfen.
 *
 * Nur Gewachsenes und Gewordenes. Nicht die Deko: Was der Spieler selbst
 * hinstellt, soll genau so dastehen, wie er es hingestellt hat – eine Bank,
 * die von sich aus gespiegelt ist, wäre ein Möbelstück mit eigenem Willen.
 * Nicht die Stationen, nicht die Beete, nicht die Figuren.
 */
const STREU_ARTEN = { tree: 1, bush: 1, rock: 1, stump: 1 };

/**
 * Ein bisschen Unordnung je Exemplar: Spiegelung und Größe.
 *
 * Es gibt drei gemalte Fassungen je Baumart (siehe `sprites.js`), und das
 * ist viel – trotzdem standen im Bild acht Bäume, die wie derselbe Stempel
 * aussahen. Der Grund: Jede Instanz DERSELBEN Fassung ist pixelgleich, und
 * die drei Fassungen unterscheiden sich in der Breite nur um ±14 %.
 *
 * Spiegeln und Größe streuen kosten nichts und vervielfachen die
 * Unterschiede: Aus drei Fassungen werden sechs Silhouetten, und keine zwei
 * Bäume nebeneinander sind mehr gleich hoch.
 *
 * Alles hängt am ORT und nicht an der Nummer des Objekts: Ein Baum, der
 * gefällt wird und drei Tage später nachwächst, sieht danach wieder genauso
 * aus. Dasselbe Prinzip wie bei `variantAt` in `entities.js`.
 */
function wuchsStreuung(e, def) {
  if (!def || !STREU_ARTEN[def.category]) return undefined;
  const h = (Math.round(e.x) * 374761393) ^ (Math.round(e.y) * 668265263);
  const u = ((h >>> 5) & 1023) / 1023;
  const v = ((h >>> 15) & 1023) / 1023;
  return {
    // Der Uferbaum darf NICHT nach Zufall gespiegelt werden: Seine
    // Neigung kommt aus der Landschaft (Wind von der See, also vom Wasser
    // weg). Gemalt ist er nach rechts geneigt, also wird für die linke
    // Seite gespiegelt. Ohne diese Zeile stünden an derselben Bucht
    // Bäume, die sich gegenseitig anlehnen – und aus Wind würde Willkür.
    flip: e.lehnt ? e.lehnt < 0 : ((h >>> 2) & 1) === 1,
    // 0,84 bis 1,16. Vorher 0,90 bis 1,10 – im Bild sah der Wald dadurch
    // aus, als wäre derselbe Baum hundertmal eingefügt worden. Mehr als
    // das hier liest sich dagegen als verschiedene Arten.
    scale: 0.84 + u * 0.32,
    // Ein paar Grad Neigung. Das ist der billigste Unterschied von allen:
    // Gewachsenes steht nie exakt senkrecht, und nichts verrät ein
    // kopiertes Bild so sehr wie hundert exakt gleiche Lotrechte.
    rotate: (v - 0.5) * 0.085,
  };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = ctx2d(canvas, { alpha: false });
    this.ctx.imageSmoothingEnabled = true;
    this.zoom = 1;
    this.w = canvas.width;
    this.h = canvas.height;
    this.viewW = this.w;
    this.viewH = this.h;
    this._visible = [];
    this.stats = { entities: 0, chunks: 0 };
    // Auflösungsfaktor: sinkt auf schwachen Geräten automatisch
    this.quality = 1;
    this._cssW = 0;
    this._cssH = 0;
    this._dpr = 1;
    this._frameAvg = 16;
    this._sinceChange = 0;
    this._alloc();
    this.updateZoom();
  }

  _alloc() {
    this.colorCanvas = makeCanvas(this.w, this.h);
    this.colorCtx = ctx2d(this.colorCanvas);
    this.colorCtx.imageSmoothingEnabled = true;
    this.lightCanvas = makeCanvas(this.w, this.h);
    this.lightCtx = ctx2d(this.lightCanvas);
    this.lightCtx.imageSmoothingEnabled = true;
    // Eigene Fläche für die Farbmaske. Sie muss getrennt liegen, weil mehrere
    // Farbquellen sich VEREINIGEN müssen; siehe _drawColorPass().
    this.maskCanvas = makeCanvas(this.w, this.h);
    this.maskCtx = ctx2d(this.maskCanvas);
    this.maskCtx.imageSmoothingEnabled = true;
    this._vignette = null;
  }

  /**
   * Passt die Zeichenfläche an das Fenster an.
   * Der Zoom hält den sichtbaren Ausschnitt ungefähr gleich groß und
   * vergrößert die Grafik dabei höchstens minimal.
   */
  resize(cssW, cssH, dpr) {
    this._cssW = cssW;
    this._cssH = cssH;
    this._dpr = dpr || 1;
    const ratio = Math.min(this._dpr, 2) * this.quality;
    let pw = Math.max(320, Math.round(cssW * ratio));
    let ph = Math.max(200, Math.round(cssH * ratio));
    const total = pw * ph;
    if (total > MAX_PIXELS) {
      const k = Math.sqrt(MAX_PIXELS / total);
      pw = Math.round(pw * k);
      ph = Math.round(ph * k);
    }
    if (pw === this.w && ph === this.h) return false;

    this.canvas.width = pw;
    this.canvas.height = ph;
    this.w = pw;
    this.h = ph;
    this.ctx = ctx2d(this.canvas, { alpha: false });
    this.ctx.imageSmoothingEnabled = true;
    this._alloc();
    this.updateZoom();
    return true;
  }

  updateZoom() {
    this.zoom = clamp(Math.min(this.w / REFERENCE_W, this.h / REFERENCE_H), 0.5, 1.05);
    this.viewW = this.w / this.zoom;
    this.viewH = this.h / this.zoom;
  }

  /**
   * Beobachtet die Bildzeit und dreht die interne Auflösung nach.
   * Lieber ein etwas weicheres Bild als ein ruckelndes – gerade auf
   * Telefonen und in Browsern ohne Grafikbeschleunigung.
   */
  adapt(frameMs, camera) {
    this._frameAvg = this._frameAvg * 0.92 + Math.min(200, frameMs) * 0.08;
    this._sinceChange++;
    if (this._sinceChange < 120 || !this._cssW) return false;

    let q = this.quality;
    // **Die Schwelle zum Hochdrehen war unerreichbar.**
    //
    // Ein Browser zeichnet im Takt des Bildschirms. Auf 60 Hz ist eine
    // Bildzeit von 16,7 ms das BESTE, was es gibt – schneller geht nicht,
    // weil der Browser dazwischen wartet. Die alte Bedingung verlangte
    // weniger als 11 ms, also etwas, das auf 60 Hz nie eintritt.
    //
    // Die Folge: Die Auflösung konnte nur fallen. Ein einziger zäher
    // Moment beim Start – die ersten Bodenstücke werden gebacken, die
    // Grafiken entstehen – zog sie herunter, und dort blieb sie für immer.
    // Gemessen in einem 1280×800-Fenster: 1088×680 gezeichnet, also 0,85
    // Bildpunkte je Bildschirmpunkt, und das ganze Bild dadurch weich.
    //
    // 19 ms sind gut 52 Bilder je Sekunde. Wer das schafft, verträgt auch
    // die volle Auflösung; wer sie dann nicht mehr schafft, fällt über die
    // obere Schwelle wieder zurück.
    //
    // Und die liegt bei 24 ms, nicht bei 28: Achtundzwanzig sind erst 36
    // Bilder je Sekunde – das ist schon sichtbar zäh, und ein Spiel, das
    // dort noch auf voller Auflösung beharrt, hat die Abwägung falsch
    // herum. Zwischen beiden Schwellen liegen fünf Millisekunden; nach
    // einer Änderung vergehen 120 Bilder, bis wieder entschieden wird,
    // und der Mittelwert hat sich bis dahin längst eingependelt.
    if (this._frameAvg > 24 && q > 0.55) q = Math.max(0.55, q - 0.15);
    else if (this._frameAvg < 19 && q < 1) q = Math.min(1, q + 0.1);
    if (q === this.quality) return false;

    this.quality = q;
    this._sinceChange = 0;
    this._frameAvg = 16;
    const changed = this.resize(this._cssW, this._cssH, this._dpr);
    if (changed && camera) camera.resize(this.viewW, this.viewH);
    return changed;
  }

  _world(ctx, camX, camY) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, -camX * this.zoom, -camY * this.zoom);
  }

  _screen(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Das Hausinnere zeichnen.
   *
   * Ein eigener, viel kürzerer Weg als `draw`: Drinnen gibt es keinen Boden
   * aus Kacheln, keine Farbmaske, kein Wetter, keine Tageszeit und keine
   * Kamera, die hinterherfährt. **Der ganze Raum ist immer zu sehen** – das
   * ist die Idee hinter dem Zimmer, und sie spart hier die halbe Zeichenkette.
   *
   * Der Raum ist EIN Bild (siehe `paintRoom`). Darüber liegen nur die Stücke
   * und Seli, nach `y` sortiert – dieselbe Tiefensortierung wie draußen,
   * damit ein Stuhl vor ihr steht und der hinter ihr dahinter bleibt.
   */
  drawInterior(game, time) {
    const ctx = this.ctx;
    const raum = game.raum();
    this._screen(ctx);
    ctx.fillStyle = INK.paper;
    ctx.fillRect(0, 0, this.w, this.h);

    // Der Raum füllt das Bild, soweit er das kann.
    //
    // Nur zentriert sah die Zeltecke auf einem großen Bildschirm verloren aus
    // – ein Fingernagel Zimmer in einem Meer aus Papier. Also wird
    // vergrößert, bis er mit etwas Luft ringsum passt. Nach oben begrenzt,
    // denn der Raum ist ein gemaltes Bild: Über anderthalbfach wird aus dem
    // Aquarell Matsch.
    //
    // Oben und unten bleibt Platz für Kopf- und Werkzeugleiste. Ohne das lag
    // die TÜR genau hinter der Werkzeugleiste – im Bild sah alles gut aus,
    // und hinaus kam man nur, wenn man wusste, dass es dort weitergeht. Es
    // ist der einzige Ausgang; er darf nicht unter der Bedienung liegen.
    const obenFrei = 76;
    const untenFrei = 128;
    const seiteFrei = 56;
    const ganzH = raum.h + raum.wand;
    const platzH = Math.max(160, this.viewH - obenFrei - untenFrei);
    const innenZoom = clamp(Math.min(
      (this.viewW - seiteFrei * 2) / raum.w,
      platzH / ganzH
    ), 0.5, 1.5);
    const z = this.zoom * innenZoom;
    const ox = Math.round(Math.max(0, (this.viewW / innenZoom - raum.w) / 2));
    const oy = Math.round(Math.max(
      obenFrei / innenZoom,
      (obenFrei + platzH / 2 - (ganzH * innenZoom) / 2) / innenZoom
    ));
    game.innenOffset = { x: ox, y: oy + raum.wand, zoom: innenZoom };

    ctx.save();
    ctx.scale(z, z);
    drawSprite(ctx, game.raumSprite(), ox, oy, false);

    // Was an der Wand hängt, liegt VOR dem Wandbild und HINTER allem, was
    // auf dem Boden steht. Eine eigene Ebene, keine Tiefensortierung: Eine
    // Wand hat keine Tiefe.
    const wandStuecke = game.innenWand();
    for (let i = 0; i < wandStuecke.length; i++) {
      const s = wandStuecke[i];
      const item = getItem(s.id);
      if (!item || !item.prop) continue;
      // Eine Skizze hat ihr eigenes Bild – gemalt aus dem, was in ihr steht.
      // Alle anderen Wandstücke teilen sich eines je Kennung.
      const name = s.bild ? ensureBild(s.bild) : item.prop;
      drawSprite(ctx, name || item.prop, ox + s.x, oy + s.y, false);
    }

    // Stücke und Seli in EINER Liste, nach Tiefe sortiert. Das Bett steht
    // fest eingebaut mit drin: Es soll sich genauso einordnen wie ein Stuhl,
    // sonst liefe Seli davor, wenn sie dahinter steht.
    const liste = [];
    // In der Kammer steht keines – dort gibt `bettPunkt()` null zurück.
    const bett = game.bettPunkt();
    if (bett) liste.push({ y: bett.y, flach: false, sprite: 'bed', x: bett.x });
    const stuecke = game.innenStuecke();
    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const item = getItem(s.id);
      liste.push({
        y: s.y, flach: !!(item && item.flat),
        sprite: (item && item.prop) || null, x: s.x, itemId: s.id,
      });
    }
    // Was in einer Höhle oder in der Mühle steht. Es kommt aus derselben
    // Liste wie die Möbel und sortiert sich mit ein – nur heißt sein Bild
    // anders: Möbel tragen ihr Bild am Gegenstand, ein Felsbrocken an
    // seiner Objektart.
    const inhalt = game.ortInhalt();
    for (let i = 0; i < inhalt.length; i++) {
      const e = inhalt[i];
      liste.push({ y: e.y, flach: false, sprite: spriteFor(e.kind, e.x, e.y), x: e.x });
    }
    // Und der Geist, der dort wohnt – er sortiert sich mit ein wie alles
    // andere, sonst stünde er vor dem Felsen, hinter dem er steht.
    const ortgeist = game.ortGeistBild();
    if (ortgeist) {
      liste.push({ y: ortgeist.y, flach: false, sprite: ortgeist.sprite, x: ortgeist.x });
    }
    // Das Tier sortiert sich mit ein – sonst säße es vor dem Tisch, an dem
    // es gerade vorbeigelaufen ist.
    const tier = game.innenPetBild();
    if (tier) liste.push({ y: tier.y, flach: false, sprite: tier.sprite, x: tier.x, flip: tier.blick < 0 });
    // Und der Gast, aus demselben Grund: Er steht im Raum wie ein Möbel und
    // soll sich einordnen, statt vor oder hinter allem zu kleben.
    const gast = game.innenGastBild();
    if (gast) liste.push({ y: gast.y, flach: false, sprite: gast.sprite, x: gast.x });
    liste.sort(function (a, b) { return a.y - b.y; });

    const px = game.innen.x;
    const py = game.innen.y;
    // Raumkoordinaten zählen vom linken oberen Punkt des BODENS, nicht des
    // Bildes: Die Wand steht darüber und ist nicht begehbar.
    const bx = ox;
    const by = oy + raum.wand;

    // Flaches zuerst – Teppiche liegen unter allem, auch unter Seli.
    for (let i = 0; i < liste.length; i++) {
      const s = liste[i];
      if (s.flach && s.sprite) drawSprite(ctx, s.sprite, bx + s.x, by + s.y, false);
    }
    let selizeichnet = false;
    for (let i = 0; i < liste.length; i++) {
      const s = liste[i];
      if (s.flach) continue;
      if (!selizeichnet && s.y > py) {
        this._drawInnenSeli(ctx, game, bx + px, by + py);
        selizeichnet = true;
      }
      if (s.sprite) drawSprite(ctx, s.sprite, bx + s.x, by + s.y, false, s.flip ? { flip: true } : null);
      // Becken und Falterkasten zeigen ihren Inhalt auch drinnen – und der
      // kommt aus derselben Rechnung wie draußen.
      if (s.itemId) this._drawSchaukasten(ctx, game, s.itemId, bx + s.x, by + s.y, time);
    }
    if (!selizeichnet) this._drawInnenSeli(ctx, game, bx + px, by + py);

    // Der Umriss des Stücks, das gerade gesetzt wird.
    const p = game.placing;
    if (p && p.sprite) {
      ctx.globalAlpha = p.valid ? 0.72 : 0.34;
      // Wandstücke zählen von der Wandoberkante, nicht vom Boden.
      if (p.wand) drawSprite(ctx, p.sprite, ox + p.x, oy + p.y, false);
      else drawSprite(ctx, p.sprite, bx + p.x, by + p.y, false);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    this._drawInnenLicht(ctx, game, bx, by, z);
    this._screen(ctx);
    this.stats.entities = liste.length;
  }

  /**
   * Abendlicht im Zimmer.
   *
   * Dieselbe Technik wie draußen, nur viel kürzer: ein dunkler Überzug, und
   * jede Lampe stanzt ein weiches Loch hinein. Der Unterschied liegt in der
   * Stärke – drinnen wird es Dämmerung und nicht Nacht, damit niemand ohne
   * Laterne im Dunkeln sitzt (siehe `innenDunkel`).
   */
  _drawInnenLicht(ctx, game, bx, by, z) {
    const t = game.innenDunkel();
    if (t <= 0.01) return;
    const lc = this.lightCtx;
    this._screen(lc);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.w, this.h);
    // Ein tiefes Blau, kein Grau: Abendlicht ist kalt, Lampenlicht warm, und
    // erst der Unterschied macht die Laterne gemütlich.
    /**
     * Im Zimmer ist das Dunkel Abend, in der Höhle ist es Fels.
     *
     * Zwei Unterschiede, und beide waren zuerst falsch. Erstens die
     * FARBE: Ein tiefes Blau ist Abendlicht und richtig fürs Zimmer; in
     * einer Höhle gibt es keinen Abend, dort ist es braunschwarz. Mit
     * dem Blau sah die Höhle aus wie ein Zimmer bei Nacht.
     *
     * Zweitens die FLÄCHE: Der Überzug lag über dem ganzen Bild, also
     * auch über dem Papier rings um den Raum. Im Bild war dann alles
     * gleich grau getönt – der Raum nicht dunkler als sein Rand, und
     * damit war die Dunkelheit keine Eigenschaft des Ortes mehr,
     * sondern ein Filter über dem Bildschirm. Jetzt endet sie am Raum.
     */
    const ort = game.ort ? game.ort() : null;
    if (ort) {
      const raum = game.raum();
      const rx = bx;
      const ry = by - raum.wand;
      const rw = raum.w;
      const rh = raum.h + raum.wand;
      lc.setTransform(z, 0, 0, z, 0, 0);
      lc.fillStyle = 'rgba(28,23,18,' + t.toFixed(3) + ')';
      lc.fillRect(rx, ry, rw, rh);
      // Und der Ausgang leuchtet hinein: dieselbe Stelle, an der das
      // gemalte Tageslicht sitzt, damit Bild und Licht übereinstimmen.
      lc.globalCompositeOperation = 'destination-out';
      const ax = bx + raum.w / 2;
      const ay = by + raum.h;
      const loch = lc.createRadialGradient(ax, ay, 10, ax, ay, raum.h * 0.8);
      loch.addColorStop(0, 'rgba(0,0,0,0.9)');
      loch.addColorStop(0.5, 'rgba(0,0,0,0.4)');
      loch.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = loch;
      lc.fillRect(rx, ry, rw, rh);
      this._screen(lc);
      lc.globalCompositeOperation = 'source-over';
      this._screen(ctx);
      ctx.drawImage(this.lightCanvas, 0, 0);
      return;
    }

    lc.fillStyle = 'rgba(42,44,78,' + t.toFixed(3) + ')';
    lc.fillRect(0, 0, this.w, this.h);

    const lichter = game.innenLichter();
    if (lichter.length) {
      lc.setTransform(z, 0, 0, z, 0, 0);
      lc.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < lichter.length; i++) {
        const L = lichter[i];
        const x = bx + L.x;
        const y = by + L.y;
        const grad = lc.createRadialGradient(x, y, 0, x, y, L.r);
        grad.addColorStop(0, 'rgba(0,0,0,0.95)');
        grad.addColorStop(0.55, 'rgba(0,0,0,0.52)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = grad;
        lc.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
      }
      this._screen(lc);
      lc.globalCompositeOperation = 'source-over';
    }
    this._screen(ctx);
    ctx.drawImage(this.lightCanvas, 0, 0);
  }

  _drawInnenSeli(ctx, game, x, y) {
    const p = game.player;
    // Wie draußen: Wer sitzt, steht nicht auf dem Boden – der Fußpunkt
    // wandert um die Sitzhöhe des Möbels nach oben. Nur fürs Bild.
    const dy = p.sitzt ? sitzHoehe(p.sitzt.itemId) : 0;
    drawSprite(ctx, p.spriteName(), x, y - dy, false,
      p.flipped() ? { flip: true } : null);
  }

  draw(game, time) {
    const ctx = this.ctx;
    const cam = game.camera;
    const camX = cam.ox;
    const camY = cam.oy;
    const world = game.world;

    game.ground.beginFrame();

    this._screen(ctx);
    ctx.fillStyle = INK.paper;
    ctx.fillRect(0, 0, this.w, this.h);

    // 1 – Boden: blasse Zeichnung, darüber die Farbe durch die weiche Maske
    this._world(ctx, camX, camY);
    game.ground.draw(ctx, camX, camY, this.viewW, this.viewH, true);

    const sources = game.colorField.visibleSources(camX, camY, this.viewW, this.viewH);
    if (sources.length) this._drawColorPass(ctx, game, sources, camX, camY);

    // Das Meer bewegt sich. Über dem Boden, weil der gebacken ist.
    this._wasserGlitzern(ctx, game, camX, camY, time);

    // Wolkenschatten ziehen über Land und Wasser.
    this._wolkenSchatten(ctx, game, camX, camY, time);

    // Die Grenze liegt AUF dem Boden, unter allem, was darauf steht – sonst
    // liefe eine gestrichelte Linie quer über Zelt und Bäume.
    this._drawPlot(ctx, game, camX, camY);

    // 2 – Objekte in EINEM Durchgang. Wie farbig etwas ist, entscheidet die
    //     Farbquelle an seiner Position – das spart das zweite Malen der
    //     ganzen Szene und war der Grund für die schlechte Bildrate.
    const list = this._collectVisible(world, camX, camY);
    this._lastVisible = list;
    this._drawEntities(ctx, game, list, time);

    // 3 – Tageszeit, Lichter und Randabdunklung in EINEM Überzug
    this._drawOverlay(ctx, game, camX, camY, time);

    // 4 – Leben und Hinweise
    this._world(ctx, camX, camY);
    game.wildlife.draw(ctx, 0, 0, time);
    game.particles.draw(ctx, 0, 0);
    this._drawMarkers(ctx, game, time);
    this._screen(ctx);

    this.stats.entities = list.length;
    this.stats.chunks = game.ground.cachedCount;
  }

  _collectVisible(world, camX, camY) {
    const pad = 180;
    const list = this._visible;
    list.length = 0;
    world.queryRect(camX - pad, camY - pad, this.viewW + pad * 2, this.viewH + pad * 2, list);
    const seen = Object.create(null);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (seen[e.id]) continue;
      seen[e.id] = true;
      if (e.gone) continue;
      out.push(e);
    }
    out.sort(function (a, b) {
      return (a.y + (a.zBias || 0)) - (b.y + (b.zBias || 0));
    });
    return out;
  }

  /**
   * Blendet die kolorierte Fassung des Bodens durch die Farbmaske ein.
   *
   * Die Maske entsteht in einer EIGENEN Fläche und wird erst danach in einem
   * Zug angewandt. Vorher wurde jede Farbquelle einzeln mit `destination-in`
   * auf die Farbfläche gelegt – das multipliziert die Deckkraft, statt sie zu
   * vereinigen: bei zwei Quellen blieb nur ihr Schnitt farbig, und weil jede
   * Quelle ein Rechteck füllt, sprang die Kante sichtbar um, sobald eine
   * Quelle in den Blick geriet oder ihn verließ. Genau das war das Flackern
   * mit dem farbigen Rand rund um die Geister. Objekte fragen ihre Farbe
   * dagegen über `colorField.at()` ab, das den GRÖSSTEN Wert nimmt – Boden und
   * Bäume widersprachen sich also auch noch.
   */
  _drawColorPass(ctx, game, sources, camX, camY) {
    const box = this._sourceBox(sources, camX, camY);
    if (box.sw <= 0 || box.sh <= 0) return;
    // Derselbe Ausschnitt, in den Maßen der halb so großen Farbfläche.
    const bx = box.sx;
    const by = box.sy;
    const bw = box.sw;
    const bh = box.sh;

    // 1 – Maske: alle Quellen übereinander, normal deckend. Weißes Weiß über
    //     weißem Weiß addiert die Deckkraft (a1 + a2·(1-a1)) und ergibt damit
    //     die Vereinigung der Kreise.
    const mc = this.maskCtx;
    this._screen(mc);
    mc.clearRect(bx, by, bw, bh);
    mc.save();
    mc.beginPath();
    mc.rect(bx, by, bw, bh);
    mc.clip();
    this._world(mc, camX, camY);
    game.colorField.drawMask(mc, sources);
    mc.restore();

    // 2 – Der kolorierte Boden, auf denselben Ausschnitt begrenzt
    const cc = this.colorCtx;
    this._screen(cc);
    cc.clearRect(bx, by, bw, bh);
    cc.save();
    cc.beginPath();
    cc.rect(bx, by, bw, bh);
    cc.clip();
    this._world(cc, camX, camY);
    game.ground.draw(cc, camX, camY, this.viewW, this.viewH, false, false, {
      x: camX + box.sx / this.zoom,
      y: camY + box.sy / this.zoom,
      w: box.sw / this.zoom,
      h: box.sh / this.zoom,
    });
    this._screen(cc);
    cc.globalCompositeOperation = 'destination-in';
    cc.drawImage(this.maskCanvas, bx, by, bw, bh, bx, by, bw, bh);
    cc.globalCompositeOperation = 'source-over';
    cc.restore();

    this._screen(ctx);
    ctx.drawImage(this.colorCanvas, bx, by, bw, bh, bx, by, bw, bh);
    this._world(ctx, camX, camY);
  }


  /** Sichtbarer Ausschnitt, in dem überhaupt Farbe liegt (Bildschirmpixel). */
  _sourceBox(sources, camX, camY) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (s.x - s.r < x0) x0 = s.x - s.r;
      if (s.y - s.r < y0) y0 = s.y - s.r;
      if (s.x + s.r > x1) x1 = s.x + s.r;
      if (s.y + s.r > y1) y1 = s.y + s.r;
    }
    const sx = clamp(Math.floor((x0 - camX) * this.zoom), 0, this.w);
    const sy = clamp(Math.floor((y0 - camY) * this.zoom), 0, this.h);
    const ex = clamp(Math.ceil((x1 - camX) * this.zoom), 0, this.w);
    const ey = clamp(Math.ceil((y1 - camY) * this.zoom), 0, this.h);
    return { sx: sx, sy: sy, sw: Math.max(0, ex - sx), sh: Math.max(0, ey - sy) };
  }

  /**
   * Erst alles Flache, dann alles Aufrechte.
   *
   * Ein Teppich liegt auf dem Boden. Nach der Tiefe einsortiert kam er hinter
   * die Figur, sobald sie über ihm stand – gemessen wechselten 422 von 650
   * Bildpunkten im Rumpf die Farbe, der Teppich lag also über Seli. Flaches
   * gehört in denselben Durchgang wie die Grundstücksgrenze: unter allem, was
   * darauf steht. Untereinander bleiben die Teppiche nach Tiefe sortiert,
   * damit sich zwei überlappende sinnvoll schichten.
   */
  /**
   * Lichter, die über das Wasser wandern.
   *
   * Gemessen hatte das Bild ein Stillstandsproblem: Zwischen zwei Bildern
   * im Abstand einer Viertelsekunde änderten sich **1,6 bis 2,7 Prozent**
   * der Fläche. Achtzehn Pflanzenarten wiegen sich zwar im Wind, und Falter
   * fliegen – aber das Meer, das an der Küste die halbe Ansicht füllt, ist
   * Teil des gebackenen Bodens und stand deshalb vollkommen still. Ein
   * stilles Meer ist das, was ein Bild zu einem Bild macht statt zu einem
   * Ort.
   *
   * Deshalb hier und nicht im Boden: Was sich bewegt, kann nicht
   * zwischengespeichert werden.
   *
   * **Warum es so billig ist.** Nicht hundert einzelne `stroke()`-Aufrufe –
   * genau daran ist die Bildrate schon einmal gestorben, und im
   * Bodenzeichner steht die Lehre daraus. Alle Striche einer Helligkeit
   * landen in EINEM Pfad, also drei Striche je Bild für die ganze See.
   *
   * Die Striche hängen am Ort der Kachel und an der Zeit, nicht am Zufall:
   * Dasselbe Wasser kräuselt sich an derselben Stelle immer gleich, und
   * nichts flackert beim Scrollen.
   */
  _wasserGlitzern(ctx, game, camX, camY, time) {
    const world = game.world;
    const t0 = Math.floor(camX / TILE_SIZE) - 1;
    const t1 = Math.ceil((camX + this.viewW) / TILE_SIZE) + 1;
    const r0 = Math.floor(camY / TILE_SIZE) - 1;
    const r1 = Math.ceil((camY + this.viewH) / TILE_SIZE) + 1;

    // Drei Helligkeiten, drei Sammelpfade. Mehr Stufen sähe man nicht,
    // weniger ließe das Glitzern im Takt blinken.
    const bahnen = [[], [], []];
    for (let ty = r0; ty < r1; ty++) {
      for (let tx = t0; tx < t1; tx++) {
        if (!isWater(world.tileAtTile(tx, ty))) continue;
        // Drei Striche je Kachel, versetzt – einer allein ergibt ein Raster.
        for (let k = 0; k < 3; k++) {
          const h = ((tx * 73856093) ^ (ty * 19349663) ^ (k * 83492791)) >>> 0;
          const phase = (h % 1000) / 1000 * Math.PI * 2;
          // Langsam: eine volle Welle dauert gut zehn Sekunden. Schnelles
          // Glitzern sieht nach Strom aus, nicht nach Wasser.
          const w = Math.sin(time * 0.55 + phase);
          const hell = (w + 1) / 2;
          if (hell < 0.35) continue;
          const stufe = hell > 0.8 ? 2 : hell > 0.58 ? 1 : 0;
          const x = (tx + 0.18 + ((h >>> 11) % 100) / 100 * 0.5) * TILE_SIZE
            + Math.sin(time * 0.4 + phase) * 16;
          const y = (ty + 0.12 + ((h >>> 19) % 100) / 100 * 0.76) * TILE_SIZE;
          const lang = 26 + ((h >>> 7) % 26);
          bahnen[stufe].push(x, y, lang);
        }
      }
    }

    ctx.save();
    ctx.lineCap = 'round';
    // Tinte, nicht Weiß. Unkoloriertes Wasser liegt unter dem Papierschleier
    // fast bei Weiß – ein weißer Glanzstrich darauf war im Bild buchstäblich
    // nicht zu sehen (nachgemessen: die Bildänderung blieb bei 1,6 %).
    // Auf diesem Papier trägt nur die Linie.
    const staerken = [0.16, 0.26, 0.38];
    const breiten = [1.5, 1.9, 2.3];
    for (let s = 0; s < 3; s++) {
      const b = bahnen[s];
      if (!b.length) continue;
      ctx.globalAlpha = staerken[s];
      ctx.lineWidth = breiten[s];
      ctx.strokeStyle = INK.lineSoft;
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 3) {
        const x = b[i], y = b[i + 1], lang = b[i + 2];
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + lang / 2, y - 3.2, x + lang, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Die Wolkendecke – einmal gemalt, dann nur noch verschoben.
   *
   * Das Bild hatte keinen Himmel. Oben herum zieht nichts, und am Boden
   * ändert sich deshalb auch das Licht nie: Eine Lichtung sieht um zwei Uhr
   * genauso aus wie um drei. In beiden Vorbildern wandern Schatten über das
   * Gras, und das ist der Unterschied zwischen einer Kulisse und einem Tag.
   *
   * **Warum eine gebackene Kachel und keine Verläufe.** Ein paar große
   * `createRadialGradient`-Flächen je Bild kosten Füllrate, und zwar jedes
   * Bild aufs Neue. Hier entsteht die Decke EINMAL als 512er Kachel, und
   * danach ist jedes Bild eine einzige Füllung mit einem Muster. Damit die
   * Kachel nahtlos aneinanderstößt, wird jeder Fleck neunmal gemalt – auf
   * seinem Platz und auf allen acht Nachbarplätzen.
   *
   * Die Decke liegt über dem Boden und unter den Objekten: Ein Schatten, der
   * auch über Seli und die Bäume liefe, müsste mit deren Höhe verrechnet
   * werden, und ohne das sieht er aus wie ein Schleier vor der Kamera.
   */
  _wolkenKachel() {
    if (this._wolken) return this._wolken;
    const N = 512;
    const c = makeCanvas(N, N);
    const g = ctx2d(c);
    // Fester Startwert: Die Decke soll auf jeder Insel dieselbe sein, sonst
    // hinge das Wetterbild am Zufall der Weltnummer.
    let z = 0x5eed1;
    const rnd = () => {
      z = (z * 1664525 + 1013904223) >>> 0;
      return z / 4294967296;
    };
    for (let i = 0; i < 7; i++) {
      const cx = rnd() * N;
      const cy = rnd() * N;
      const rx = 90 + rnd() * 110;
      const ry = 60 + rnd() * 80;
      const a = 0.5 + rnd() * 0.5;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const x = cx + ox * N;
          const y = cy + oy * N;
          // Grob aussortieren, was diese Kachel nicht berührt
          if (x + rx < 0 || x - rx > N || y + ry < 0 || y - ry > N) continue;
          // Der Verlauf wird NACH dem Verschieben erzeugt, um den Nullpunkt
          // herum. Andersherum – erst der Verlauf bei (x,y), dann die
          // Verschiebung um (x,y) – landet er beim Doppelten und damit weit
          // neben seinem Fleck: Die Kachel war zu 94 Prozent leer, und im
          // Bild war von Wolken nichts zu sehen.
          const rad = Math.max(rx, ry);
          g.save();
          g.translate(x, y);
          g.scale(1, ry / rad);
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
          gr.addColorStop(0, 'rgba(0,0,0,' + a.toFixed(3) + ')');
          gr.addColorStop(0.55, 'rgba(0,0,0,' + (a * 0.55).toFixed(3) + ')');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(0, 0, rad, 0, 6.2832);
          g.fill();
          g.restore();
        }
      }
    }
    this._wolken = c;
    return c;
  }

  _wolkenSchatten(ctx, game, camX, camY, time) {
    const kachel = this._wolkenKachel();
    // Bei Regen und Schnee hängt die Decke ohnehin zu; dann wären einzelne
    // Schatten darin Unsinn. Sie schwächt sich dafür ab, statt zu verschwinden.
    const wetter = game.weather && game.weather.kind;
    const zu = wetter === 'rain' || wetter === 'snow' ? 0.35 : 1;

    // **Warum fertige Kacheln und kein Muster.** Der erste Versuch füllte den
    // sichtbaren Weltausschnitt mit `createPattern`. Das kostete dreizehn
    // Bilder je Sekunde – von 47 auf 34 –, weil der Kontext an dieser Stelle
    // auf die Welt verschoben UND auf den Zoom skaliert ist: Das Muster wird
    // dann in jedem Bild neu abgetastet statt nur kopiert. Jetzt wird für die
    // Wolken kurz auf Bildschirmmaße zurückgeschaltet, und die Kachel wird
    // schlicht nebeneinander gezeichnet. Dass die Schatten damit am
    // Bildschirm hängen statt an der Weltgröße, fällt nicht auf – der Zoom
    // ändert sich im Spiel nicht.
    //
    // Langsam: eine Wolke braucht gut zwei Minuten, um die Breite des
    // Bildschirms zu überqueren. Schneller sähe sie nach Vogelschwarm aus.
    const N = kachel.width;
    const z = this.zoom || 1;
    const vx = (-camX * z + time * 7) % N;
    const vy = (-camY * z + time * 2.4) % N;
    const ox = vx < 0 ? vx + N : vx;
    const oy = vy < 0 ? vy + N : vy;

    // Sechs Kachelkopien je Bild kosteten acht Bilder je Sekunde; eine
    // einzige bildschirmgroße Kopie kostet zwei. Deshalb wird die Decke in
    // einem eigenen Bild zwischengespeichert und nur dann neu gelegt, wenn
    // sie sich um mehr als zwei Bildpunkte verschoben hat. Im Stehen – also
    // immer dann, wenn man den Wolken überhaupt zusieht – ist das etwa
    // viermal je Sekunde statt fünfzigmal.
    if (!this._wolkenSchirm || this._wolkenSchirm.width !== this.w
      || this._wolkenSchirm.height !== this.h) {
      this._wolkenSchirm = makeCanvas(this.w, this.h);
      this._wolkenSchirmCtx = ctx2d(this._wolkenSchirm);
      this._wolkenOx = null;
    }
    // Sechs Bildpunkte, nicht zwei. Die Decke besteht aus sehr weichen,
    // sehr blassen Verläufen – ein Versatz von sechs Punkten ist daran nicht
    // zu sehen, spart beim Gehen aber zwei Drittel der Neuaufbauten.
    if (this._wolkenOx == null
      || Math.abs(ox - this._wolkenOx) > 6 || Math.abs(oy - this._wolkenOy) > 6) {
      const sc = this._wolkenSchirmCtx;
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.clearRect(0, 0, this.w, this.h);
      for (let y = oy - N; y < this.h; y += N) {
        for (let x = ox - N; x < this.w; x += N) sc.drawImage(kachel, x, y);
      }
      this._wolkenOx = ox;
      this._wolkenOy = oy;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.14 * zu;
    ctx.drawImage(this._wolkenSchirm, 0, 0);
    ctx.restore();
  }

  _drawEntities(ctx, game, list, time) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].flat) this._drawEntity(ctx, game, list[i], time);
    }
    const playerX = game.player.x;
    const playerY = game.player.y;
    let playerDrawn = false;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.flat) continue;
      if (!playerDrawn && e.y > playerY) {
        this._drawPlayer(ctx, game, time);
        playerDrawn = true;
      }
      // Alles, was NACH Seli gezeichnet wird, liegt vor ihr. Was sie
      // dabei verdeckt, wird durchsichtig - siehe `_verdeckung`.
      const deckung = playerDrawn ? this._verdeckung(e, playerX, playerY) : 1;
      if (deckung >= 1) {
        this._drawEntity(ctx, game, e, time);
      } else {
        ctx.save();
        ctx.globalAlpha = deckung;
        this._drawEntity(ctx, game, e, time);
        ctx.restore();
      }
    }
    if (!playerDrawn) this._drawPlayer(ctx, game, time);
  }

  /**
   * Wie deckend ein Objekt gezeichnet wird, das vor Seli steht.
   *
   * **Warum es das braucht.** Im Dschungel stehen 8 Baeume je 100
   * Kacheln, und ihre Kronen sind zweieinhalb Kacheln breit. Wer
   * hineinlaeuft, sieht sich selbst nicht mehr - und ein Spiel, in dem
   * man die Figur sucht, ist kaputt, egal wie schoen der Wald ist. Das
   * Problem gab es vorher auch schon (Nadelwald, dichtes Lager), nur
   * nicht so oft, dass es aufgefallen waere.
   *
   * **Die Pruefung laeuft ueber die echte Bildflaeche, nicht ueber den
   * Abstand.** Ein Abstandskreis um Seli waere billiger und falsch: Ein
   * Grasbueschel direkt vor ihren Fuessen verdeckt nichts und wuerde
   * trotzdem blass, ein Baum, dessen Fuss drei Kacheln weiter unten
   * steht, verdeckt ihren Kopf und bliebe deckend. Was zaehlt, ist, ob
   * sich die Bilder ueberschneiden.
   *
   * **Nicht ganz durchsichtig, sondern halb.** Ein Loch im Wald sieht
   * schlimmer aus als ein verdeckter Kopf. Bei 0,4 sieht man Seli
   * deutlich und den Baum immer noch als Baum.
   *
   * **Und weich, nicht schlagartig.** Beim Herumlaufen springt sonst
   * bei jedem Schritt ein Baum an und aus. Ueber die letzten 30
   * Bildpunkte der Ueberschneidung wird ueberblendet.
   */
  _verdeckung(e, px, py) {
    // Grob aussortieren, bevor irgendetwas nachgeschlagen wird: Das hier
    // laeuft fuer jedes sichtbare Objekt in jedem Bild.
    const dx = e.x - px;
    if (dx > 170 || dx < -170) return 1;
    const dy = e.y - py;
    if (dy > 330 || dy < 0) return 1;
    /**
     * Der Name kommt vom Objekt, nicht aus der Tabelle.
     *
     * `spriteFor` liefert null für alles, dessen Bild nicht in der
     * Objekttabelle steht – Geister, Fuchs, Haustier, Landmarken, der
     * Wanderer –, und `spr(null)` schreibt eine Warnung in die Konsole.
     * Eine Browserprüfung hat das sofort gemeldet. Sie tragen ihr Bild
     * aber selbst in `e.sprite`, und das ist ohnehin die richtige
     * Quelle: Es ist genau das, was gleich gezeichnet wird.
     */
    const name = e.sprite || spriteFor(e.kind, e.x, e.y);
    if (!name || !hasSprite(name)) return 1;
    const s = spr(name);
    if (!s) return 1;
    // Seli: ein Kasten um ihren Koerper. Die Fuesse sind ausgenommen -
    // was nur vor ihren Schuhen liegt, verdeckt sie nicht wirklich, und
    // der Boden vor ihr soll bewachsen bleiben.
    const sx0 = px - 20;
    const sx1 = px + 20;
    const sy0 = py - 72;
    const sy1 = py - 14;
    const ox0 = e.x - s.ax;
    const oy0 = e.y - s.ay;
    const ueber = Math.min(sx1, ox0 + s.w) - Math.max(sx0, ox0);
    const hoch = Math.min(sy1, oy0 + s.h) - Math.max(sy0, oy0);
    if (ueber <= 0 || hoch <= 0) return 1;
    // Die kleinere der beiden Ueberschneidungen entscheidet: Ein Objekt,
    // das nur mit einem Zipfel hereinragt, bleibt deckend.
    const tiefe = Math.min(ueber, hoch);
    if (tiefe >= 30) return 0.4;
    return 1 - (tiefe / 30) * 0.6;
  }

  /**
   * Zeichnet ein Objekt in dem Zustand, der zu seiner Position passt:
   * ganz blass, ganz farbig – oder auf halbem Weg überblendet.
   */
  _blend(ctx, game, name, x, y, opts) {
    const a = game.colorField.at(x, y);
    if (a <= 0.02) {
      drawSprite(ctx, name, x, y, true, opts);
      return;
    }
    if (a >= 0.98) {
      drawSprite(ctx, name, x, y, false, opts);
      return;
    }
    drawSprite(ctx, name, x, y, true, opts);
    const o = opts ? Object.assign({}, opts) : {};
    o.alpha = (o.alpha == null ? 1 : o.alpha) * a;
    drawSprite(ctx, name, x, y, false, o);
  }

  /**
   * Was in einem Becken schwimmt und in einem Kasten sitzt.
   *
   * Beides wird LEER gemalt; der Inhalt kommt von hier darüber, weil er am
   * Spielstand hängt und sich ändert, sobald man einen größeren Fisch fängt.
   * Ein Becken mit eingemaltem Fisch wäre ein Bild von einem Becken.
   *
   * Gezeichnet werden die Symbole der Tiere – dieselben, die im Fundbuch und
   * in der Tasche stehen. Eine zweite Seitenansicht je Fisch wäre schöner und
   * wären acht Grafiken mehr für etwas, das man in Daumennagelgröße sieht.
   *
   * Die Stellen kommen aus `schaukasten.js`: Drinnen und draußen wird
   * verschieden gezeichnet, und beide sollen denselben Fisch an derselben
   * Stelle zeigen.
   */
  _drawSchaukasten(ctx, game, itemId, x, y, time) {
    if (!zeigtWas(itemId)) return;
    const plaetze = plaetzeVon(itemId, {
      records: game.state.records,
      found: game.inventory.found,
    });
    const schwimmt = zeigtWas(itemId) === 'fisch';
    for (let i = 0; i < plaetze.length; i++) {
      const p = plaetze[i];
      // Fische ziehen langsam hin und her, Falter sitzen still. Ein Falter
      // im Schaukasten, der zappelt, wäre eine andere Geschichte.
      const wobX = schwimmt ? Math.sin(time * 0.55 + i * 2.3) * 11 : 0;
      const wobY = schwimmt ? Math.sin(time * 0.37 + i * 1.7) * 3 : 0;
      // Und sie drehen sich um, wenn sie am Rand ankommen: Die Grafik zeigt
      // nach rechts, gespiegelt schwimmt er nach links.
      const links = schwimmt && Math.cos(time * 0.55 + i * 2.3) < 0;
      this._drawKleinIcon(ctx, 'icon_' + p.id, x + p.dx + wobX, y + p.dy + wobY,
        p.groesse, links);
    }
  }

  /**
   * Ein Symbol mittig auf einen Punkt, in einer festen Größe.
   *
   * Nicht über `drawSprite(..., {scale})`: Das skaliert das Bild, nicht den
   * Ankerpunkt, und ein Fisch läge damit je nach Größe woanders im Becken.
   */
  _drawKleinIcon(ctx, name, cx, cy, groesse, flip) {
    const s = spr(name);
    if (!s) return;
    const k = groesse / Math.max(s.w, s.h);
    const w = s.w * k;
    const h = s.h * k;
    if (!flip) {
      ctx.drawImage(s.c, cx - w / 2, cy - h / 2, w, h);
      return;
    }
    ctx.save();
    ctx.translate(cx, cy - h / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(s.c, -w / 2, 0, w, h);
    ctx.restore();
  }

  _drawEntity(ctx, game, e, time) {
    const def = defOf(e.kind);
    const always = !!ALWAYS_COLOR[e.kind];
    let x = e.x;
    const y = e.y;

    if (def && def.sway) x += Math.sin(time * 1.2 + e.phase) * 2.4;

    switch (e.kind) {
      case 'spirit': {
        const bob = Math.sin(time * 1.6 + e.phase) * 6;
        const frame = Math.floor(time * 1.1 + e.phase) % 2;
        drawSprite(ctx, 'spirit_' + e.spiritId + '_' + frame, x, y + bob, false, { alpha: 0.96 });
        return;
      }
      case 'fox': {
        const frame = Math.floor(time * 1.6 + e.phase) % 2;
        drawSprite(ctx, 'fox_' + frame, x, y, false);
        return;
      }
      case 'wanderer': {
        // Langsamer als die Geister und ohne Schweben: Er ist kein Geist, er
        // steht auf dem Boden und wartet.
        const frame = Math.floor(time * 0.7 + e.phase) % 2;
        drawSprite(ctx, 'wanderer_' + frame, x, y, false);
        return;
      }
      case 'pet': {
        // Die Grafik zeigt nach rechts; nach links wird sie gespiegelt.
        // Immer farbig, wie alles, was lebt.
        const bob = e.laeuft ? 0 : Math.sin(time * 1.7 + e.phase) * 1.6;
        drawSprite(ctx, e.sprite, x, y + bob, false, { flip: e.blick === -1 });
        return;
      }
      case 'campfire': {
        this._blend(ctx, game, 'campfire', x, y);
        const lvl = campfireLevelFor(game.state.campfireFuel).level;
        const frame = Math.floor(time * 9) % 4;
        const scale = 0.55 + lvl * 0.12;
        ctx.save();
        ctx.translate(x, y - 16);
        ctx.scale(scale, scale);
        drawSprite(ctx, 'flame_' + frame, 0, 0, false);
        ctx.restore();
        return;
      }
      case 'hidden': {
        // Fundstücke müssen auf der ganzen Insel auffallen, auch im blassen
        // Teil. Ein blasscremefarbener Kreis auf Papier tat das nicht: die
        // Karte zeigte ein Flämmchen, am Ort stand scheinbar nichts. Jetzt
        // steht dort wirklich ein Flämmchen – ein warmer Schein, ein paar
        // aufsteigende Funken und ein Ring, der auf dem Boden liegt.
        const bob = Math.sin(time * 2.6 + e.phase) * 5;
        const puls = 0.5 + Math.sin(time * 2.2 + e.phase) * 0.5;
        ctx.save();

        // Ring am Boden: sagt, WO genau es liegt
        ctx.globalAlpha = 0.3 + puls * 0.22;
        ctx.strokeStyle = '#d8931f';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 26 + puls * 5, 10 + puls * 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Schein: warm, mit hartem Kern – sonst verschwindet er im Papier
        const glow = ctx.createRadialGradient(x, y + bob - 26, 2, x, y + bob - 26, 46);
        glow.addColorStop(0, 'rgba(255,214,132,0.72)');
        glow.addColorStop(0.45, 'rgba(255,196,104,0.34)');
        glow.addColorStop(1, 'rgba(255,196,104,0)');
        ctx.globalAlpha = 0.55 + puls * 0.3;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y + bob - 26, 46, 0, Math.PI * 2);
        ctx.fill();

        // Funken: drei, mit versetzter Phase, steigen und verlöschen
        ctx.globalAlpha = 1;
        for (let k = 0; k < 3; k++) {
          const t = ((time * 0.55 + e.phase * 0.3 + k * 0.34) % 1);
          const fx = x + Math.sin((time + k * 2.1) * 1.7 + e.phase) * (7 + k * 3);
          const fy = y + bob - 34 - t * 42;
          ctx.globalAlpha = (1 - t) * 0.75;
          ctx.fillStyle = k === 1 ? '#ffe6ac' : '#f5b34a';
          ctx.beginPath();
          ctx.arc(fx, fy, 2.6 - t * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        drawSprite(ctx, e.sprite, x, y + bob, false);
        return;
      }
      case 'bridge_spot': {
        this._blend(ctx, game, 'signpost', x, y);
        return;
      }
      default:
        break;
    }

    const name = e.sprite || (def && def.sprite);
    if (!name) return;
    if (e.lastHit != null) {
      const hitAge = time - e.lastHit;
      if (hitAge < 0.25) x += Math.sin(hitAge * 60) * 5;
    }
    const streu = wuchsStreuung(e, def);
    if (always) drawSprite(ctx, name, x, y, false, streu);
    else this._blend(ctx, game, name, x, y, streu);
    // Und was darin schwimmt. Immer farbig, auch wo die Insel noch blass
    // ist: Ein Fisch, den man gefangen hat, ist nicht verblasst.
    if (e.kind === 'decor' && e.itemId) {
      this._drawSchaukasten(ctx, game, e.itemId, x, y, time);
    }
  }

  _drawPlayer(ctx, game, time) {
    const p = game.player;
    // Gezeichnet wird der Zwischenstand, nicht der letzte fertige Schritt –
    // sonst zappelte die Figur gegen die weich mitlaufende Kamera.
    const pos = p.renderPos(game.camera.alpha);
    // Wer sitzt, steht nicht auf dem Boden: Der Fußpunkt wandert um die
    // Sitzhöhe des Möbels nach oben. Nur fürs Bild – in der Welt bleibt Seli
    // unten, sonst zielte und hörte sie einen halben Meter über sich.
    if (p.sitzt) pos.y -= sitzHoehe(p.sitzt.itemId);
    drawSprite(ctx, p.spriteName(), pos.x, pos.y, false, { flip: p.flipped() });

    if (p.swing > 0 && p.tool.sprite && p.tool.id !== 'hand') {
      const t = 1 - p.swing;
      const angle = (-0.9 + t * 2.1) * (p.dir === 'left' ? -1 : 1);
      const offX = p.dir === 'left' ? -26 : p.dir === 'right' ? 26 : (p.dir === 'up' ? 18 : -18);
      const offY = p.dir === 'up' ? -54 : -46;
      ctx.save();
      ctx.translate(pos.x + offX, pos.y + offY);
      ctx.rotate(angle);
      drawSprite(ctx, p.tool.sprite, 0, 0, false, { scale: 0.72 });
      ctx.restore();
    }

    const f = game.fishing;
    if (f.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(74,64,56,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - 62);
      ctx.lineTo(f.bobber.x, f.bobber.y);
      ctx.stroke();
      const bob = Math.sin(time * 5) * 4;
      ctx.fillStyle = f.state === 'bite' ? INK.berry : '#f6f1e6';
      ctx.beginPath();
      ctx.arc(f.bobber.x, f.bobber.y + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Der Dunstschleier über der Ferne.
   *
   * Er trägt die Farbe des Lichts, das gerade in der Luft steht, nicht
   * immer dasselbe Graublau: Mittags ist er ein kühler Hauch, am Abend
   * glüht er mit, und nachts löst sich die Ferne ins Dunkelblau auf. Das
   * ist derselbe Grund, aus dem ferne Berge bei Sonnenuntergang rosa sind
   * – der Dunst zeigt die Farbe des Himmels, nicht die der Landschaft.
   *
   * Deshalb wird zur Tagesfärbung hin gemischt, und zwar mit dem
   * Anderthalbfachen ihrer Deckung: Die Tönung selbst ist absichtlich
   * zurückhaltend, aber der Dunst BESTEHT aus ihr und darf sie nicht nur
   * andeuten. Bei reiner Übernahme der Deckung (0,24 am Abend) war der
   * Schleier zur goldenen Stunde noch grau.
   */
  _dunst(lc, tint) {
    const m = Math.min(1, tint.a * 1.6);
    const r = Math.round(DUNST_HIMMEL[0] + (tint.r - DUNST_HIMMEL[0]) * m);
    const g = Math.round(DUNST_HIMMEL[1] + (tint.g - DUNST_HIMMEL[1]) * m);
    const b = Math.round(DUNST_HIMMEL[2] + (tint.b - DUNST_HIMMEL[2]) * m);
    const pre = 'rgba(' + r + ',' + g + ',' + b + ',';
    const hoehe = this.h * DUNST_HOEHE;
    const verlauf = lc.createLinearGradient(0, 0, 0, hoehe);
    // Drei Stützpunkte, nicht zwei: Ein linearer Abfall ließ die obere
    // Hälfte durchgehend trüb wirken. Der Schleier soll dicht am Rand
    // sitzen und schnell nachlassen, so wie die Luft es tut.
    verlauf.addColorStop(0, pre + DUNST_STAERKE.toFixed(3) + ')');
    verlauf.addColorStop(0.34, pre + (DUNST_STAERKE * 0.38).toFixed(3) + ')');
    verlauf.addColorStop(1, pre + '0)');
    lc.fillStyle = verlauf;
    lc.fillRect(0, 0, this.w, hoehe);
  }

  /**
   * Das Schräglicht der goldenen Stunde.
   *
   * **Was die Lasur nicht kann.** Die Tagesfärbung ist eine
   * gleichmäßige Fläche: Sie zieht jeden Bildpunkt gleich weit zur
   * Abendfarbe. Gemessen hat das gewirkt – Wärme (Rot minus Blau) von
   * 31 mittags auf 72 um 18:24 –, und angesehen war es trotzdem kein
   * Sonnenuntergang, sondern ein Bild mit einem Braunfilter. Es fehlte
   * das, was spätes Licht ausmacht: Es kommt flach von EINER Seite.
   *
   * **Also ein Schein statt einer Lasur.** Ein waagerechter Verlauf,
   * additiv gezeichnet (`lighter`) wie die Laternen nachts: Wo er liegt,
   * wird es heller und wärmer, nicht brauner. Links stark, nach rechts
   * auslaufend – die Sonne steht im Westen.
   *
   * **Kosten.** Eine Verlaufsfüllung auf der Lichtebene, und nur
   * zwischen 17 und 19:45 Uhr. Die Ebene gibt es ohnehin; ein zweiter
   * bildschirmgroßer Durchgang auf den SCHIRM wäre teuer gewesen, dieser
   * hier kostet dasselbe wie der Dunstschleier daneben.
   */
  _schraeglicht(lc, game) {
    const s = game.day.goldeneStunde ? game.day.goldeneStunde() : 0;
    if (s <= 0.01) return;
    const vor = lc.globalCompositeOperation;
    lc.globalCompositeOperation = 'lighter';
    const verlauf = lc.createLinearGradient(0, 0, this.w, this.h * 0.6);
    // Drei Stützpunkte: Der Schein sitzt auf der Westseite und ist auf
    // zwei Dritteln der Breite weg. Ein Verlauf über das ganze Bild
    // hätte die Gegenseite mitgehoben und wäre wieder eine Lasur.
    verlauf.addColorStop(0, 'rgba(255,186,96,' + (0.38 * s).toFixed(3) + ')');
    verlauf.addColorStop(0.45, 'rgba(255,164,86,' + (0.15 * s).toFixed(3) + ')');
    verlauf.addColorStop(1, 'rgba(255,150,80,0)');
    lc.fillStyle = verlauf;
    lc.fillRect(0, 0, this.w, this.h);
    lc.globalCompositeOperation = vor;
  }

  /**
   * Tageszeit-Ton, Lichtkegel und Randabdunklung landen zusammen auf einer
   * Ebene. Ein einziger bildschirmgroßer Überzug statt zweier – auf schwachen
   * Geräten macht das den Unterschied.
   */
  _drawOverlay(ctx, game, camX, camY, time) {
    const tint = game.day.tint();
    const lc = this.lightCtx;
    this._screen(lc);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.w, this.h);

    /**
     * Tageszeit, Jahreszeit und Wetter in EINEM Überzug.
     *
     * Vorher waren es drei bildschirmgroße `fillRect` hintereinander.
     * Das Ergebnis ist dasselbe – Farbe über Farbe zu legen ist
     * assoziativ –, aber auf einem Rechner ohne Grafikkarte kostet jede
     * volle Fläche spürbar: Gemessen am Lagerfeuer, dem dichtesten Ort
     * des Spiels, brauchte die Überzugsebene 5,3 der 16,7 ms, die ein
     * Bild haben darf.
     *
     * Gerechnet wird mit derselben Formel, die der Browser benutzt:
     * a = a₁ + a₂·(1−a₁), und die Farbe gewichtet nach ihrem Anteil
     * daran. Die Jahreszeit liegt unter dem Wetter, weil sie den ganzen
     * Tag gilt und das Wetter die Abweichung darüber ist; der Frühling
     * hat keinen Ton – er ist der Maßstab, an dem man die anderen drei
     * erkennt. Und das Wetter liegt vor den Lichtern, damit eine Laterne
     * auch bei Regen ein Loch in die Trübung schneidet.
     */
    let tr = tint.r;
    let tg = tint.g;
    let tb = tint.b;
    let ta = tint.a;
    const drauf = function (r, g, b, a) {
      if (!(a > 0)) return;
      const neu = a + ta * (1 - a);
      if (neu <= 0) { ta = 0; return; }
      const w1 = a / neu;
      const w2 = (ta * (1 - a)) / neu;
      tr = r * w1 + tr * w2;
      tg = g * w1 + tg * w2;
      tb = b * w1 + tb * w2;
      ta = neu;
    };
    const jt = seasonTint(game.season ? game.season() : null);
    if (jt) drauf(jt.r, jt.g, jt.b, jt.a);
    const wt = game.weather && game.weather.tint();
    if (wt) drauf(wt.r, wt.g, wt.b, wt.a);
    if (ta >= 0.02) {
      lc.fillStyle = 'rgba(' + Math.round(tr) + ',' + Math.round(tg) + ','
        + Math.round(tb) + ',' + ta.toFixed(3) + ')';
      lc.fillRect(0, 0, this.w, this.h);
    }
    this._dunst(lc, { r: tr, g: tg, b: tb, a: ta });
    this._schraeglicht(lc, game);

    if (game.day.isDark()) {
      this._world(lc, camX, camY);
      lc.globalCompositeOperation = 'destination-out';
      const lights = game.lightSources(time);
      for (let i = 0; i < lights.length; i++) {
        const L = lights[i];
        if (L.x + L.r < camX || L.x - L.r > camX + this.viewW) continue;
        if (L.y + L.r < camY || L.y - L.r > camY + this.viewH) continue;
        const grad = lc.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
        const a = L.a == null ? 0.95 : L.a;
        grad.addColorStop(0, 'rgba(0,0,0,' + a + ')');
        grad.addColorStop(0.55, 'rgba(0,0,0,' + (a * 0.6) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = grad;
        lc.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      }
      lc.globalCompositeOperation = 'source-over';
      this._screen(lc);
    }
    lc.drawImage(this._vignetteLayer(), 0, 0);
    this._screen(ctx);
    ctx.drawImage(this.lightCanvas, 0, 0);

    /**
     * Und jetzt leuchten die Lichter wirklich.
     *
     * Bis hierher haben sie nur ein LOCH in den Nachtton gestanzt
     * (`destination-out`). Das macht die Stelle heller, aber nicht wärmer:
     * Gemessen war die Fläche am Lagerfeuer nachts (130,123,107) und die
     * Ecke des Bildes (124,116,97) – sechs Punkte Unterschied. Ein Feuer,
     * um das herum es genauso aussieht wie überall, ist kein Feuer.
     *
     * Deshalb kommt oben drauf ein additiver Schein in der Farbe der
     * Quelle. Er liegt VOR der Randabdunklung und wird mit `lighter`
     * gezeichnet – so addiert sich Licht, statt Farbe zu ersetzen, und
     * zwei Laternen nebeneinander sind heller als eine.
     *
     * Die Stärken sind klein gehalten (0,22 im Kern). Ein Schein, der die
     * Farben darunter ausbleicht, ist kein Licht mehr, sondern ein Fleck –
     * und das Aquarell darunter soll sichtbar bleiben.
     */
    if (game.day.isDark()) {
      const lichter = game.lightSources(time);
      this._world(ctx, camX, camY);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < lichter.length; i++) {
        const L = lichter[i];
        const warm = L.warm || 0;
        const kuehl = L.kuehl || 0;
        if (!warm && !kuehl) continue;
        if (L.x + L.r < camX || L.x - L.r > camX + this.viewW) continue;
        if (L.y + L.r < camY || L.y - L.r > camY + this.viewH) continue;
        const farbe = warm ? [255, 186, 104] : [168, 206, 236];
        const kraft = (warm || kuehl) * 0.22;
        const grad = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
        grad.addColorStop(0, 'rgba(' + farbe[0] + ',' + farbe[1] + ',' + farbe[2] + ',' + kraft.toFixed(3) + ')');
        grad.addColorStop(0.45, 'rgba(' + farbe[0] + ',' + farbe[1] + ',' + farbe[2] + ',' + (kraft * 0.45).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + farbe[0] + ',' + farbe[1] + ',' + farbe[2] + ',0)');
        ctx.fillStyle = grad;
        ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      this._screen(ctx);
    }
    // Tropfen und Schwaden zuletzt und im Bildschirmraum: sie liegen vor
    // allem, auch vor der Randabdunklung.
    if (game.weather) game.weather.draw(ctx, this.w, this.h);
  }

  /**
   * Das Flämmchen über einem Fundstück – hoch genug, um über Baumkronen zu
   * stehen.
   *
   * Es wird bewusst NACH allen Objekten gezeichnet. Der Schein am Boden liegt
   * in der Tiefenstaffelung und verschwindet deshalb hinter einem Baum, der
   * ein Stück weiter unten steht; die Karte verspricht dann ein Flämmchen, das
   * am Ort niemand sieht. Dieses hier ist immer da.
   */
  _drawFindWisps(ctx, game, time) {
    const list = this._lastVisible;
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.kind !== 'hidden') continue;
      const bob = Math.sin(time * 2.2 + e.phase) * 7;
      const x = e.x;
      const y = e.y - 132 + bob;
      const flack = 1 + Math.sin(time * 9 + e.phase * 3) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffcf7a';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.translate(x, y);
      ctx.scale(1, flack);
      // Tropfenform: unten rund, oben ausgezogen
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.bezierCurveTo(8, -6, 10, 3, 0, 10);
      ctx.bezierCurveTo(-10, 3, -8, -6, 0, -17);
      ctx.closePath();
      ctx.fillStyle = '#f0972a';
      ctx.fill();
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.bezierCurveTo(4, -2, 5, 2, 0, 5);
      ctx.bezierCurveTo(-5, 2, -4, -2, 0, -7);
      ctx.closePath();
      ctx.fillStyle = '#ffe3a6';
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Die Grenze des Grundstücks – eine gestrichelte Linie im Gras.
   *
   * Ohne sie weiß niemand, wo die Regeln wechseln: Innerhalb wächst nichts
   * nach und man darf näher ans Lager bauen, außerhalb nicht. Bewusst dünn
   * und blass – es ist ein Vermerk, kein Zaun.
   */
  _drawPlot(ctx, game, camX, camY) {
    if (!game.plotStatus) return;
    // Beide eigenen Grundstücke tragen dieselbe Linie: das Lager und die
    // Bucht auf der Insel. Sie liegen weit auseinander, also ist immer nur
    // eines im Bild – aber dieselbe Regel gilt für beide, und zwei
    // verschiedene Umrandungen hätten das Gegenteil behauptet.
    this._plotOutline(ctx, game.plotRect ? game.plotRect() : null, camX, camY);
    this._plotOutline(ctx, game.islePlotRect ? game.islePlotRect() : null, camX, camY);
  }

  _plotOutline(ctx, r, camX, camY) {
    if (!r) return;
    if (r.x + r.w < camX || r.x > camX + this.viewW) return;
    if (r.y + r.h < camY || r.y > camY + this.viewH) return;

    ctx.save();
    ctx.strokeStyle = INK.lineSoft;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 14]);
    ctx.lineCap = 'round';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
    // Eckpfosten: die Linie allein liest sich als Zeichenfehler, vier
    // Pflöcke sagen „das ist abgesteckt".
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = INK.wood;
    const ecken = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]];
    for (let i = 0; i < ecken.length; i++) {
      ctx.beginPath();
      ctx.ellipse(ecken[i][0], ecken[i][1] - 10, 4, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawMarkers(ctx, game, time) {
    this._drawFindWisps(ctx, game, time);
    const t = game.target;
    // Beim Sitzen kein Zielpfeil: Er zeigte auf die Bank, auf der man schon
    // sitzt, und wippte dabei über Selis Kopf. Das Ausruhen ist die eine
    // Stelle, an der das Spiel nichts zu zeigen hat.
    if (t && t.entity && !game.player.sitzt) {
      const e = t.entity;
      const s = spr(e.sprite || (defOf(e.kind) && defOf(e.kind).sprite));
      const top = e.y - (s ? s.ay : 48) - 18;
      const bob = Math.sin(time * 5) * 4;
      this._chevron(ctx, e.x, top + bob, t.matches || !defOf(e.kind).tool ? INK.line : INK.lineSoft);
    }

    const ready = game.spiritsWithReadyQuest();
    for (let i = 0; i < ready.length; i++) {
      const e = ready[i];
      const bob = Math.sin(time * 3 + e.phase) * 5;
      const x = e.x;
      const y = e.y - 168 + bob;
      ctx.save();
      ctx.fillStyle = INK.warm;
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x + 3, y + 22);
      ctx.lineTo(x - 3, y + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + 31, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Ein Umschlag über dem Briefkasten, solange Post ungelesen ist. Ohne
    // ihn müsste man jeden Morgen nachsehen gehen, ob sich der Weg lohnt –
    // und nach drei leeren Kästen geht niemand mehr hin.
    if (game.world.mailbox && game.unreadMail && game.unreadMail() > 0) {
      const m = game.world.mailbox;
      const bob = Math.sin(time * 2.8) * 4;
      const x = m.x;
      const y = m.y - 150 + bob;
      ctx.save();
      ctx.fillStyle = INK.paper;
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.rect(x - 13, y, 26, 18);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 13, y);
      ctx.lineTo(x, y + 11);
      ctx.lineTo(x + 13, y);
      ctx.stroke();
      ctx.restore();
    }

    // Wo das Haustier etwas gefunden hat. Ohne Zeichen säße es irgendwo im
    // Gras und man wüsste nicht, warum – der Fund ist der ganze Sinn.
    const fund = game.world.pet && !game.world.pet.gone ? game.world.pet.fund : null;
    if (fund && !fund.gone) {
      const bob = Math.sin(time * 3.1) * 5;
      const x = fund.x;
      const y = fund.y - 80 + bob;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#f2c063';
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2.2;
      // Ein kleiner Stern, dasselbe Zeichen wie bei den Meilensteinen
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 11 : 4.6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Herz: dieser Geist mag etwas, das gerade in der Tasche liegt. Ohne
    // Zeichen bliebe das Mitbringen eine versteckte Regel – man müsste jeden
    // Geist mit jedem Gegenstand ausprobieren.
    const mag = game.spiritsWantingGift();
    for (let i = 0; i < mag.length; i++) {
      const e = mag[i];
      const bob = Math.sin(time * 2.4 + e.phase + 1.1) * 4;
      const x = e.x + 26;
      const y = e.y - 150 + bob;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.9, 0.9);
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.bezierCurveTo(-13, -1, -8, -13, 0, -6);
      ctx.bezierCurveTo(8, -13, 13, -1, 0, 9);
      ctx.closePath();
      ctx.fillStyle = '#d4756b';
      ctx.fill();
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (game.placing) {
      const p = game.placing;
      ctx.save();
      ctx.globalAlpha = 0.72;
      drawSprite(ctx, p.sprite, p.x, p.y, false);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = p.valid ? 'rgba(107,150,74,0.9)' : 'rgba(196,90,74,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 4, 34, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _chevron(ctx, x, y, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 12);
    ctx.lineTo(x + 11, y - 12);
    ctx.lineTo(x, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Randabdunklung – sehr zurückhaltend.
   *
   * Sie sitzt in der Bildmitte, und die Kamera folgt der Figur: Ein kräftiger
   * Verlauf ist damit ein heller Kreis, der mit dem Spieler mitwandert. Genau
   * das steht der Kernmechanik im Weg – man soll an der Farbe ablesen können,
   * wo die Insel schon wieder lebt, nicht daran, wo man gerade steht. Bei 0.2
   * waren das 14 % Abdunklung in den Ecken, und der Kreis war deutlich zu
   * sehen. 0.06 rahmt das Bild noch, ohne die Farbe zu überstimmen.
   */
  _vignetteLayer() {
    if (!this._vignette) {
      const c = makeCanvas(this.w, this.h);
      const g = ctx2d(c);
      const grad = g.createRadialGradient(
        this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.52,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(96,84,60,0.06)');
      g.fillStyle = grad;
      g.fillRect(0, 0, this.w, this.h);
      this._vignette = c;
    }
    return this._vignette;
  }
}

export { TILE_SIZE, getItem };
