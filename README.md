# Cozy Grove – Web Edition

Ein gemütliches Insel-Sammelspiel im Browser. Die Insel hat ihre Farben verloren;
**Seli** bringt sie zurück, indem sie sammelt, angelt, baut – und den Geistern hilft.

**Die Änderung gegenüber dem Vorbild: fast keine Dialoge.** Was ein Geist möchte,
zeigt eine Karte aus Symbolen. Gesprochen wird höchstens ein kurzer Satz, und der
lässt sich in den Einstellungen komplett abschalten („Nur Symbole“).

Die Grafik ist **Tusche und Aquarell**, kein Pixelbrei – und sie entsteht
komplett im Browser: wackelige Tuschelinien, Farbflächen, die absichtlich ein
Stück neben der Kontur liegen, Papierkorn. Im Projekt liegt keine einzige
Bild- oder Audiodatei.

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
* **Tagesrhythmus.** Ein Tag läuft von 6 bis 2 Uhr (Länge einstellbar). Schlafen
  im Zelt bringt neue Aufgaben, neue Grabstellen, neues Ladenangebot.
  Abgebaute Bäume und Steine wachsen nach ein paar Tagen nach.
* **Werkzeuge.** Hand, Axt, Spitzhacke, Schaufel, Angel – jeweils in drei Stufen.
  Bessere Werkzeuge geben mehr Ertrag und öffnen neue Bereiche.
* **Lagerfeuer.** Verbrannte Fundstücke geben Glut (Handwerkswährung) und lassen
  das Feuer wachsen – und mit ihm den farbigen Kreis und die Rezeptliste.
* **Drei Bereiche.** Lager & Strand (Start) → Wald (umgestürzter Baumstamm,
  braucht Axt Stufe 2) → Klippen (Brückenbausatz an der Werkbank).
* **Angeln** als kleines Geschicklichkeitsspiel, mit Tag- und Nachtfischen.
* **Einrichten.** Gebaute Deko lässt sich frei aufstellen; Laternen leuchten
  nachts, und manche Geister wünschen sich Deko in ihrer Nähe.

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
styles/ui.css         Oberfläche
src/core/             Zufall, Speichern, Eingabe, Klang, Hilfsfunktionen
src/art/              Mal-Werkzeugkasten und alle Grafiken (im Code gemalt)
  brush.js              Formen, Tuschelinie, Silhouetten-Kontur, Weichzeichner
  painted*.js           Natur, Bauten, Figuren, Symbole, Boden
  sprites.js            Register: legt beim Start jede Grafik zweimal an
src/world/            Inselgenerierung, Weltmodell, Objekte, Farbfeld
src/game/             Spielkern, Spielfigur, Tasche, Aufgaben, Laden, Angeln …
src/render/           Kamera, Bodenschicht, Szenen-Renderer, Partikel, Kleintiere
src/ui/               HUD, Sprechblasen, modale Fenster
tests/unit/           Node-Tests ohne Browser
tests/browser/        Rauchtest im echten Chromium
tools/                Werkzeuge zum Hinsehen (siehe Tests)
```

**Wie der Stil entsteht.** Jedes Objekt wird in vier Durchgängen gemalt: weicher
Bodenschatten, Farbflächen (die anschließend weichgezeichnet werden), eine
einzige Außenkontur aus der Silhouette, dann Innenlinien. Der Kontur-Trick ist
der wichtigste: Die gefüllte Form wird ringsum versetzt kopiert und die Mitte
ausgestanzt – so bekommt eine Baumkrone aus sechs Lappen *eine* Außenlinie statt
sechs sich kreuzender Kringel. Jede Grafik fällt dabei zweimal an, koloriert und
als blasse Zeichnung.

Um jede Zeichenfläche liegt ein Rand. Ohne ihn schneidet die Leinwand die
Malerei ab – am einzelnen Baum kaum zu sehen, aber wo sich viele überlagern,
addieren sich die geraden Schnittkanten zu Rechtecken im Boden.

**Die Küste** trägt den Saum des Vorbilds: Wasser dicht am Land wird fast weiß,
eine Kachel weiter hell türkis, danach erst die Tiefe. Daneben läuft eine breite
weiße Linie um die Insel – die Brandung.

**Wie die Farbe zurückkommt.** Der Boden liegt in Stücken zwischengespeichert
vor, getrennt nach Farbfläche und Tinte: Unkoloriert kommt ein Papierschleier
zwischen beide, die Zeichnung bleibt. Objekte werden je nach Position überblendet
– dadurch muss die Szene nicht zweimal gezeichnet werden.

**Leistung.** Die interne Auflösung passt sich der Bildrate an: Wird es eng,
rechnet das Spiel etwas gröber, statt zu ruckeln.

## Tests

```bash
npm test               # 51 Tests: Weltgenerierung, Aufgaben, Tasche, Angeln …
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
node tools/edges.mjs                   # findet abgeschnittene Grafiken
```

`--line` beim Atlas zeigt die unkolorierte Fassung. `tools/edges.mjs` endet mit
Rückgabewert 1, wenn eine Grafik an ihren Leinwandrand stößt – das ist die
Prüfung gegen die Rechtecke im Boden.

## Speicherstand

Wird automatisch im `localStorage` gesichert (alle 20 Sekunden, beim Schlafen und
beim Verlassen der Seite). Im privaten Modus von Safari fällt das Spiel still auf
einen Speicher im Arbeitsspeicher zurück – die Einstellungen weisen darauf hin.
