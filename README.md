# Cozy Grove – Web Edition

Ein gemütliches Insel-Sammelspiel im Browser. Die Insel hat ihre Farben verloren;
**Seli** bringt sie zurück, indem sie sammelt, angelt, baut – und den Geistern hilft.

**Die Änderung gegenüber dem Vorbild: fast keine Dialoge.** Was ein Geist möchte,
zeigt eine Karte aus Symbolen. Gesprochen wird höchstens ein kurzer Satz, und der
lässt sich in den Einstellungen komplett abschalten („Nur Symbole“).

Die Grafik ist **Tusche und Aquarell**, kein Pixelbrei – und sie entsteht
komplett im Browser: wackelige Tuschelinien, Farbflächen, die absichtlich ein
Stück neben der Kontur liegen, Papierkorn. Im Projekt liegt keine einzige
Bild- oder Audiodatei; alles wird beim Start gerechnet. Die einzige Fremddatei
ist die Schrift (`styles/fonts/`, 38 kB, freie Lizenz) – sie liegt lokal bei,
damit die Oberfläche überall gleich aussieht und trotzdem nichts aus dem Netz
nachgeladen wird.

Der **Klang** ebenso: zwanzig Einzelgeräusche, eine Melodie in Pentatonik und
ein Klangbett aus vier Rauschschichten – Brandung, Wind, Grillen, Regen. Das
Spiel mischt sie nach Ort und Uhrzeit; am Strand rauscht die See, im Wald der
Wind, nachts zirpt es. Abschaltbar unter „Umgebung“.

Unabhängige Fan-Hommage.

## Starten

```bash
npm start          # http://localhost:8080
```

Mehr braucht es nicht: kein Build-Schritt, keine Abhängigkeiten zur Laufzeit.
Der Server liegt bei, weil ES-Module sich nicht per `file://` laden lassen.
Jeder andere statische Webserver funktioniert genauso.

## Browser

Getestet und ausgelegt auf **Safari, Firefox und Chrome** (Desktop und Mobil).
Bewusst konservativ gebaut: keine Build-Kette, keine modernen Sonderfunktionen,
`localStorage` mit Rückfall auf den Arbeitsspeicher (Safari im privaten Modus),
Audio erst nach der ersten Nutzergeste, Touch-Steuerung mit Joystick.

## Steuerung

| Eingabe | Wirkung |
| --- | --- |
| `WASD` / Pfeiltasten | laufen |
| `E` / Leertaste | Werkzeug benutzen, reden, abgeben |
| `1`–`5`, `Tab` | Werkzeug wählen |
| `I` `Q` `C` `M` | Tasche · Aufgaben · Werkbank · Karte |
| `B` | Fundbuch |
| `G` | Erinnerungen |
| `F` | schlafen (am Zelt) |
| `R` / `X` | Deko versetzen / abbrechen |
| `Esc` | Menü, Fenster schließen |

Am Touchscreen: Joystick links, Aktionstaste rechts.

## Das Spielprinzip

* **Farbe zurückbringen.** Die Insel liegt zunächst als blasse Zeichnung da –
  wie ein Malbuch, das darauf wartet, ausgemalt zu werden. Um jeden zufriedenen
  Geist und um das Lagerfeuer wächst ein farbiger Kreis. Die Prozentanzeige oben
  zeigt, wie viel der Insel wieder Farbe hat. Was lebt (du, die Geister, der
  Händler, das Feuer), ist immer farbig.
* **Kein Warten auf die Uhr.** Ein Tag läuft von 6 bis 2 Uhr (Länge einstellbar),
  aber schlafen darfst du jederzeit – und bekommst sofort neue Aufgaben, neue
  Grabstellen, neues Ladenangebot. Wer eine Stunde am Stück spielen will, kann
  das; wer zehn Minuten hat, auch. Offene Aufgaben verfallen nie.
* **Achterlei Aufgaben.** Bringen, finden, angeln, einen *bestimmten* Fisch
  fangen, einen Ort aufsuchen, verbrennen, bauen, aufstellen. Nur knapp ein
  Drittel ist Hol-und-Bring; ein Test wacht darüber.
* **Werkzeuge.** Hand, Axt, Spitzhacke, Schaufel, Angel – jeweils in drei Stufen.
  Bessere Werkzeuge geben mehr Ertrag und öffnen neue Bereiche.
* **Lagerfeuer.** Verbrannte Fundstücke geben Glut (Handwerkswährung) und lassen
  das Feuer wachsen – und mit ihm den farbigen Kreis und die Rezeptliste.
* **Drei Bereiche.** Lager & Strand (Start) → Wald (umgestürzter Baumstamm,
  braucht Axt Stufe 2) → Klippen (Brückenbausatz an der Werkbank).
* **Angeln** als kleines Geschicklichkeitsspiel, mit Tag- und Nachtfischen.
* **Einrichten, das zählt.** Gebaute Deko lässt sich frei aufstellen; Laternen
  leuchten nachts. Jedes Stück trägt **Gemütlichkeitspunkte** – ein Zaunstück 1,
  ein Blumenbeet 5, ein Andenken 10. Was im Umkreis eines Geistes steht, zählt
  für ihn zusammen: um ihn wächst ein zusätzlicher Farbkreis, und seine
  Aufgaben zahlen besser. Vier Stufen, im Aufgabenfenster als Punktreihe zu
  sehen. Packt man die Deko wieder ein, schrumpft der Kreis auch wieder –
  anders als die Farbe aus erledigten Aufgaben, die bleibt.
* **Leben ringsum.** Tags Schmetterlinge und Vögel, nachts Motten, die zum
  nächsten Licht streben – und zu jeder Zeit springen Fische aus dem Wasser.
* **Wetter.** Manche Tage bringen Regen, manche Nebel. Was ein Tag bekommt,
  hängt nur an Insel und Tagnummer – es steht fest, bevor der Tag beginnt.
  Und es zählt: **Mondblumen** wachsen nur nachts, **Regenpilze** nur an
  Regentagen, **Nebelkristalle** nur im Nebel. Sie verschwinden wieder, sobald
  die Bedingung fällt, und sind die Zutaten der Mondlaterne.
* **Fundbuch.** Alles, was je durch die Tasche ging, mit Gesamtzahl. Was noch
  fehlt, steht als Schattenriss da.
* **Erinnerungen.** Jeder Geist hat eine Geschichte aus vier Fundstücken, die
  sich über viele Tage aufdeckt. Ein Stück erscheint erst, wenn du ihm oft genug
  geholfen hast, und liegt dann irgendwo in seinem Bereich. Vier Symbole
  nebeneinander ergeben die Erinnerung – wer sie liest, liest sie selbst. Ist
  eine Kette vollständig, schenkt der Geist sein Andenken: aufstellbare Deko,
  die es auf keinem anderen Weg gibt.
* **Freundschaft.** Alle drei erledigten Aufgaben steigt die Stufe bei einem
  Geist. Das bringt ein Geschenk, mehr Farbe ringsum und dauerhaft besseren
  Lohn für seine Aufgaben.

## Die Geister

Sechs Stück, alle wortkarg: Flämmchen (Lagerfeuer), Mira Moos (Wiese),
Käpt'n Kiesel (Strand), Bruno Borke (Wald), Tobi Tüftler (Werkstatt),
Nelly Nadel (Klippen). Jeder vergibt höchstens zwei Aufgaben gleichzeitig,
offene Aufgaben verfallen nie.

## Seli

Die Spielfigur: blonde Frau, schulterlanger Bob unter einer Hutkrempe, blaues
Oberteil, Halstuch, Rock, Stiefel. Neun Bilder – drei Blickrichtungen zu je drei
Schritten. Sie und die anderen Lebewesen bleiben immer farbig, auch wo die Insel
noch blass ist.

## Aufbau

```
index.html            Gerüst und Startbildschirm
styles/ui.css         Oberfläche – Papier und Tinte, dieselbe Palette wie die Welt
styles/fonts/         Nunito (SIL OFL 1.1) – die einzige Datei, die nicht gerechnet wird
src/core/             Zufall, Speichern, Eingabe, Klang, Hilfsfunktionen
src/art/              Mal-Werkzeugkasten und alle Grafiken (im Code gemalt)
  brush.js              Formen, Tuschelinie, Silhouetten-Kontur, Weichzeichner
  painted*.js           Natur, Bauten, Figuren, Symbole, Boden
  sprites.js            Register: legt beim Start jede Grafik zweimal an
src/world/            Inselgenerierung, Weltmodell, Objekte, Farbfeld
src/game/             Spielkern, Figur, Tasche, Aufgaben, Erinnerungen, Laden …
src/render/           Kamera, Boden, Szenen-Renderer, Partikel, Kleintiere, Wetter
src/ui/               HUD, Sprechblasen, modale Fenster
tests/unit/           Node-Tests ohne Browser
tests/browser/        Rauchtest im echten Chromium
tools/                Werkzeuge zum Hinsehen (siehe Tests)
```

**Wie der Stil entsteht.** Jedes Objekt wird in fünf Durchgängen gemalt: weicher
Bodenschatten, Farbflächen (die anschließend weichgezeichnet werden), farbige
Feinheiten, eine einzige Außenkontur aus der Silhouette, dann Innenlinien. Der
Kontur-Trick ist der wichtigste: Die gefüllte Form wird ringsum versetzt kopiert
und die Mitte ausgestanzt – so bekommt eine Baumkrone aus sechs Lappen *eine*
Außenlinie statt sechs sich kreuzender Kringel. Jede Grafik fällt dabei zweimal
an, koloriert und als blasse Zeichnung.

Der Durchgang dazwischen ist neu und wichtig: **Blattbüschel** in den Kronen,
**Nadelsäume** an jeder Fichtenetage. Sie liegen hinter dem Weichzeichner (also
scharf), aber vor dem Entfärben – koloriert ein grüner Strich, im Malbuch ein
blasses Grau. Stünden sie bei den Innenlinien, bliebe im unkolorierten Zustand
ein grüner Fleck stehen. Ohne sie ist eine Baumkrone eine eingefärbte Fläche,
mit ihnen eine Zeichnung. Aus demselben Grund werden Moos, Halstücher und
alles andere, was auf einer Form liegt statt neben ihr, auf diese Form
beschnitten – die Lasuren liegen absichtlich ein Stück versetzt und schwebten
sonst frei über der Kante.

Um jede Zeichenfläche liegt ein Rand. Ohne ihn schneidet die Leinwand die
Malerei ab – am einzelnen Baum kaum zu sehen, aber wo sich viele überlagern,
addieren sich die geraden Schnittkanten zu Rechtecken im Boden.

**Die Oberfläche ist aus demselben Material wie die Welt.** Statt dunklem Glas
liegen Karten aus Büttenpapier auf der Insel, mit derselben Tuschekante, die
auch jeder Baum bekommt – die Farbwerte in `styles/ui.css` sind wörtlich die
aus `INK` in `src/art/painted.js`. Von Hand gezeichnet ist nichts exakt rund:
jede Ecke hat vier verschiedene Radien. Unter jeder Karte liegt ein harter
Versatz statt eines weichen Schlagschattens, wie bei einem Aufkleber.

**Die Schrift** ist rund und freundlich statt Systemgrau: **Nunito**, als
Variable Font mit dem Gewichtsbereich 400–800 in einer einzigen 38-kB-Datei,
nur im Lateinschnitt (der deckt ä ö ü ß ab). Sie liegt im Projekt und wird vom
eigenen Server ausgeliefert – kein Aufruf bei Google, kein Netz zur Laufzeit,
und überall dieselbe Optik statt „rund auf dem Mac, nüchtern auf Windows".
`font-display: swap` sorgt dafür, dass sofort gelesen werden kann und die
Datei nur nachrückt; dahinter steht trotzdem die volle Kette bis
`sans-serif`, denn für Zeichen außerhalb des Schnitts (✕, ↻) greift der
Browser zeichenweise zurück.

Der Schleier hinter einem Fenster ist eine schlichte warme Fläche, kein
`backdrop-filter`. Der kostet jedes Bild einen bildschirmfüllenden Durchgang,
und ohne Grafikkarte liefert er statt der Insel eine schwarze Fläche – im
Testbrowser gemessen. Das Vorbild dimmt seine Szene ohnehin nur ab.

**Die Küste** trägt den Saum des Vorbilds: Wasser dicht am Land wird fast weiß,
eine Kachel weiter hell türkis, danach erst die Tiefe. Daneben läuft eine breite
weiße Linie um die Insel – die Brandung.

**Wie die Farbe zurückkommt.** Der Boden liegt in Stücken zwischengespeichert
vor, getrennt nach Farbfläche und Tinte: Unkoloriert kommt ein Papierschleier
zwischen beide, die Zeichnung bleibt. Objekte werden je nach Position überblendet
– dadurch muss die Szene nicht zweimal gezeichnet werden.

**Leistung.** Die interne Auflösung passt sich der Bildrate an: Wird es eng,
rechnet das Spiel etwas gröber, statt zu ruckeln. Weichgezeichnet wird über
`ctx.filter`, wo der Browser das kann – einmal wirklich ausprobiert, nicht nur
abgefragt, weil Safari es erst seit Version 17 beherrscht. Ein Bodenstück
kostet damit 7 statt 14 ms, und die schlechteste Bildzeit beim Laufen fiel von
44 auf 18 ms.

## Tests

```bash
npm test               # 86 Tests: Welt, Wetter, Aufgaben, Tasche, Erinnerungen …
npm run test:browser   # 36 Prüfungen im echten Browser, mit Bildschirmfotos
npm run test:all
```

Der Browsertest legt Bildschirmfotos unter `.screenshots/` ab.

Dazu drei Werkzeuge zum Hinsehen:

```bash
node tests/browser/atlas.mjs           # alle Grafiken als Übersichtsbild
node tests/browser/atlas.mjs --only=player_ --zoom=2.5   # eine Auswahl, groß
node tools/look.mjs                    # die Welt an vier Orten, in voller Farbe
node tools/look.mjs --pale --hour=22   # unkoloriert, nachts
node tools/look.mjs --weather=rain     # bei Regen (oder fog)
node tools/edges.mjs                   # findet abgeschnittene Grafiken
node tools/panels.mjs                  # jedes Fenster der Oberfläche (auch das Ende langer Listen)
node tools/panels.mjs --pale --only=map
```

`--line` beim Atlas zeigt die unkolorierte Fassung. `tools/edges.mjs` endet mit
Rückgabewert 1, wenn eine Grafik an ihren Leinwandrand stößt – das ist die
Prüfung gegen die Rechtecke im Boden.

## Speicherstand

Wird automatisch im `localStorage` gesichert (alle 20 Sekunden, beim Schlafen und
beim Verlassen der Seite). Im privaten Modus von Safari fällt das Spiel still auf
einen Speicher im Arbeitsspeicher zurück – die Einstellungen weisen darauf hin.
