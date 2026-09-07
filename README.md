# Cozy Grove – Web Edition

Ein gemütliches Insel-Sammelspiel im Browser. Die Insel hat ihre Farben verloren;
**Seli** bringt sie zurück, indem sie sammelt, angelt, baut – und den Geistern hilft.

**Die Änderung gegenüber dem Vorbild: fast keine Dialoge.** Was ein Geist möchte,
zeigt eine Karte aus Symbolen – kein Dialogbaum, kein Textblock. Gesprochen wird
nur, wo es etwas zu erzählen gibt: ein Satz zur Vorstellung, ein Satz je
Erinnerungsstück. Sechs Geister, je sechs Sätze; zusammen ergeben sie eine
kleine Biografie. Alles davon lässt sich in den Einstellungen abschalten
(„Nur Symbole“).

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

## Verschenken

```bash
npm run bundle     # dist/cozy-grove.html – baut und prüft in einem
```

Das ganze Spiel in **einer HTML-Datei**: Oberfläche, Schrift und alle Module
darin. Die Datei per Doppelklick zu öffnen genügt, kein Server, keine
Installation, kein Internet. Zum Verschicken gedacht – gut 500 kB, das passt
an eine E-Mail.

Der Umweg ist nötig, weil ES-Module sich nicht per `file://` laden lassen:
Ein verschickter Projektordner ist per Doppelklick tot, egal wie vollständig
er ist. `tools/bundle.mjs` schreibt darum `import`/`export` in ein winziges
Register um – jedes Modul in seinem eigenen Funktionsrumpf, sonst kämen sich
gleichnamige Hilfsfunktionen aus verschiedenen Dateien in die Quere. Die
Schrift wandert als `data:`-URL mit hinein, weil Browser eine nachgeladene
Schriftdatei über `file://` als fremden Ursprung ablehnen.

`tools/checkbundle.mjs` öffnet die fertige Datei anschließend genau so, wie
der Beschenkte sie öffnet – per `file://`, ohne Server – und prüft, dass die
Grafik entsteht, die Schrift sitzt, die Figur läuft, der Spielstand ein
zweites Öffnen übersteht und **keine einzige Anfrage nach außen** geht. Wer
eine Datei verschenkt, die er nur über `http` probiert hat, verschenkt eine
Vermutung.

Zum Weiterentwickeln bleibt `npm start` der Weg; die Einzeldatei ist nur der
Ausgabeweg.

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
| `1`–`6`, `Tab` | Werkzeug wählen |
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
  das; wer zehn Minuten hat, auch.
* **Achterlei Aufgaben.** Bringen, finden, angeln, einen *bestimmten* Fisch
  fangen, einen Ort aufsuchen, verbrennen, bauen, aufstellen. Nur knapp ein
  Drittel ist Hol-und-Bring; ein Test wacht darüber.
* **Bitten rotieren.** Jede Bitte gilt drei bis fünf Tage – im Aufgabenfenster
  steht, wie lange noch. Läuft eine ab, zieht der Geist sie am nächsten Morgen
  zurück und stellt eine andere; wer eine Aufgabe nicht mag, ist sie los.
  **Fertiges läuft nie ab**: Wer die drei Muscheln beisammen hat und erst
  morgen vorbeikommt, hat sie nicht umsonst gesucht. Und derselbe Geist
  verlangt nie zweimal gleichzeitig dasselbe.
* **Mitbringsel.** Jeder Geist mag ein paar bestimmte Dinge. Hast du eines
  davon dabei, schwebt ein Herz über ihm; ein Druck auf E, und er bekommt es.
  Das gibt Glut und ein Stück Farbe – einmal je Geist und Tag. Was gerade für
  eine offene Bitte gebraucht wird, bietet das Spiel nicht als Mitbringsel an.
* **Werkzeuge.** Hand, Axt, Spitzhacke, Schaufel, Angel, Kescher – jeweils in
  mehreren Stufen. Bessere Werkzeuge geben mehr Ertrag, größere Reichweite und
  öffnen neue Bereiche.
* **Lagerfeuer.** Verbrannte Fundstücke geben Glut (Handwerkswährung) und lassen
  das Feuer wachsen – und mit ihm den farbigen Kreis und die Rezeptliste.
* **Drei Bereiche.** Lager & Strand (Start) → Wald (umgestürzter Baumstamm,
  braucht Axt Stufe 2) → Klippen (Brückenbausatz an der Werkbank).
* **Angeln** als kleines Geschicklichkeitsspiel, mit Tag- und Nachtfischen.
* **Einrichten, das zählt.** Gebaute Deko lässt sich frei aufstellen – der
  Vorschaupunkt weicht Bäumen und Steinen selbst aus, statt „Kein Platz" zu
  sagen; nur wenn im Umkreis wirklich nichts frei ist, steht der Grund dabei.
  Laternen leuchten nachts. Jedes Stück trägt **Gemütlichkeitspunkte** – ein Zaunstück 1,
  ein Blumenbeet 5, ein Andenken 10. Was im Umkreis eines Geistes steht, zählt
  für ihn zusammen: um ihn wächst ein zusätzlicher Farbkreis, und seine
  Aufgaben zahlen besser. Vier Stufen, im Aufgabenfenster als Punktreihe zu
  sehen. Packt man die Deko wieder ein, schrumpft der Kreis auch wieder –
  anders als die Farbe aus erledigten Aufgaben, die bleibt.
* **Leben ringsum – und zum Anfassen.** Tags Falter, nachts Motten, die zum
  nächsten Licht streben, dazu Vögel und springende Fische. Fünf Falterarten
  lassen sich mit dem **Kescher** fangen: drei am Tag, zwei nur nachts, jede
  in ihrer eigenen Farbe und unterschiedlich selten. Der seltenste ist der
  wertvollste; ein Test wacht darüber. Ein Schlag daneben schreckt die Falter
  ringsum auf, und sie fliegen zwei Sekunden lang doppelt so schnell – blind
  wischen lohnt sich nicht. Ist kein Falter in der Nähe, verhält sich der
  Kescher wie jedes andere Werkzeug und man kann damit reden und aufheben.
* **Wetter.** Manche Tage bringen Regen, manche Nebel. Was ein Tag bekommt,
  hängt nur an Insel und Tagnummer – es steht fest, bevor der Tag beginnt.
  Und es zählt: **Mondblumen** wachsen nur nachts, **Regenpilze** nur an
  Regentagen, **Nebelkristalle** nur im Nebel. Sie verschwinden wieder, sobald
  die Bedingung fällt, und sind die Zutaten der Mondlaterne.
* **Fundbuch.** Alles, was je durch die Tasche ging, mit Gesamtzahl. Was noch
  fehlt, steht als Schattenriss da.
* **Erinnerungen.** Jeder Geist hat eine Geschichte aus vier Fundstücken, die
  sich über viele Tage aufdeckt. Ein Stück erscheint erst, wenn du ihm oft genug
  geholfen hast, und liegt dann irgendwo in seinem Bereich. Zu jedem gehört
  **ein Satz**, den er am Fundort sagt; im Fundbuch der Erinnerungen stehen sie
  untereinander und lassen sich in Ruhe nachlesen. Käpt'n Kiesel war vierzig
  Jahre auf See und ist nie angekommen; Mira hat Kräuter gesammelt, bis keine
  Kinder mehr kamen. Ist eine Kette vollständig, schenkt der Geist sein
  Andenken: aufstellbare Deko, die es auf keinem anderen Weg gibt.
* **Freundschaft.** Alle drei erledigten Aufgaben steigt die Stufe bei einem
  Geist. Das bringt ein Geschenk, mehr Farbe ringsum und dauerhaft besseren
  Lohn für seine Aufgaben.
* **Jahreszeiten nach dem echten Kalender.** Im April steht die Insel in
  frischem Grün, im Juli tief und satt, im Oktober in Gold, im Januar hell und
  kühl. Wiese, Kronen, Büsche und Moos wechseln mit – ohne eine einzige
  zusätzliche Grafik: Es wird ohnehin alles beim Start gemalt, und die
  Jahreszeit steht davor fest. Keine davon ist grau; das Spiel handelt vom
  Zurückbringen der Farbe, ein trister Winter widerspräche genau dem.
* **Ein Tagesereignis je echtem Kalendertag.** Markttag (der Händler zahlt ein
  Drittel mehr), Fundtag (doppelt so viele Grabstellen), Blütentag (die Insel
  blüht, morgen wieder vorbei), Falterzug (viel mehr Falter), Fischschwarm
  (eine Art beißt zwölfmal so oft – der einzige verlässliche Weg zu einem sehr
  seltenen Fisch) und die Sternennacht (Sternschnuppen, dreimal so viele
  Mondblumen). Etwa jeder vierte Tag hat bewusst keines: Wäre jeden Tag etwas
  Besonderes, wäre nichts mehr besonders. Es steht oben im Aufgabenfenster.

  Warum das **Datum** und nicht die Uhrzeit: Ein Inseltag dauert 14 Minuten.
  An die echte Uhr gebunden liefen zwei Uhren gegeneinander – mittags auf der
  Insel, Mitternacht im Fenster –, und wer abends spielt, käme an alles nicht
  heran, was vormittags passiert. Das Datum ist grob genug: Es macht jeden Tag
  anders, ohne jemanden auszusperren, und zwei Leute am selben Tag erleben
  dasselbe.
* **Der Garten.** Die eine Sache im Spiel, die von *gestern* abhängt: Saat
  kaufst du beim Händler (drei Sorten liegen immer im Regal, die Mondsaat nur
  manchmal), säst sie auf Wiese oder Erde, und in zwei bis vier Tagen steht
  dort etwas. Drei sichtbare Wachstumsstufen – jeden Morgen ist das Beet
  anders. **Regen zählt doppelt**; damit hat das Wetter zum ersten Mal Folgen,
  die über das Bild hinausgehen. Geerntet wird mehr, als eine wilde Fundstelle
  hergibt, und ein Teil sät sich selbst nach. Nichts verdorrt, nichts muss
  gegossen werden: Wer eine Woche wegbleibt, findet seine Ernte vor. Und weil
  die Geister ohnehin Beeren, Kräuter und Blumen wollen, kannst du zum ersten
  Mal für morgen planen statt nur zu suchen.
* **Weniger Handgriffe.** Das passende Werkzeug nimmt sich das Spiel selbst –
  statt „Dafür brauchst du: Axt" wird gefällt. Die Taste gedrückt halten
  arbeitet weiter, bis der Baum liegt (nur Werkzeugarbeit: Geister redet man
  weiterhin einzeln an). Und die Angel hat vor der Ernte Vorrang, wenn Wasser
  vor dir liegt – vorher gewann der Busch am Ufer.
* **Lesbare Oberfläche.** Schrift, Symbole, Knöpfe und Fächer hängen an einer
  einzigen Zahl. Sie setzt sich aus zwei Faktoren zusammen: der Anpassung an
  das Fenster (misst main.js an der echten Bühne) und der Einstellung
  „Größe der Oberfläche“ mit vier Stufen von Klein bis Sehr groß. Die
  Aufgabenkarten am Rand nennen die Aufgabe beim Namen, statt nur ein Symbol
  und „4/6“ zu zeigen.
* **Tagesrückblick.** Nach dem Aufwachen steht kurz da, was gestern passiert
  ist: erledigte Bitten, Fundstücke, Fische, Falter, Aufgestelltes,
  Mitbringsel, Münzen, Glut – und ganz oben, wie viel Farbe dazugekommen ist.
  Nach einem Tag, an dem nichts geschah, bleibt er weg.
* **Fundstücke sind zu sehen.** Wo auf der Karte ein goldener Punkt liegt,
  steht in der Welt ein Flämmchen über den Baumkronen, dazu ein warmer Schein
  und ein Ring auf dem Boden. Der Punkt auf der Karte ist ein Versprechen, das
  am Ort eingelöst wird.

## Die Geister

Sechs Stück, alle wortkarg: Flämmchen (Lagerfeuer), Mira Moos (Wiese),
Käpt'n Kiesel (Strand), Bruno Borke (Wald), Tobi Tüftler (Werkstatt),
Nelly Nadel (Klippen). Jeder vergibt höchstens drei Bitten gleichzeitig, und
jede davon gilt drei bis fünf Tage.

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

**Nichts malen, was sich nicht ändert.** Ist ein Fenster offen, steht die
Welt – `update()` kehrt früh zurück. Gemalt wurde sie trotzdem weiter, 78 Mal
in 2,5 Sekunden. Diese Arbeit lief gegen den Aufbau des Fensters selbst; das
war das Ruckeln beim Öffnen der Tasche. Jetzt wird hinter einem offenen
Fenster genau ein Bild gezeichnet (Zeichenzeit 9–12 ms auf 0,0 ms, Bildabstand
von schwankenden ~32 ms auf glatte 16,7 ms). Ändert sich die Zeichenfläche,
setzt `game.invalidate()` das zurück – sonst stünde dort eine leere Leinwand.

**Ruhiges Bild.** Die Simulation läuft in festen Schritten von 1/60 s,
gezeichnet wird, wann der Browser Zeit hat. Passen mal ein, mal zwei Schritte
in ein Bild, bewegte sich die Welt abwechselnd um 4 und 8 Pixel – die Figur
schien zu springen, obwohl sie völlig gleichmäßig lief. Das Bild zeigt jetzt
den Zwischenstand (`camera.alpha`), und nach einem Aussetzer wird nicht
nachgeholt, sondern weitergespielt: Sonst schoss die Figur nach jedem langen
Bild ein Stück über die Wiese. Gemessen an 900 Bildern mit realistischem
Zittern: Abweichung zwischen gezeigtem Weg und verstrichener Zeit vorher
median 0,06 und bis zu 0,97 Schritte, jetzt exakt 0. Die Rechnung dahinter
steht in `src/core/clock.js` und ist ohne Browser geprüft.

**Leistung.** Die interne Auflösung passt sich der Bildrate an: Wird es eng,
rechnet das Spiel etwas gröber, statt zu ruckeln. Weichgezeichnet wird über
`ctx.filter`, wo der Browser das kann – einmal wirklich ausprobiert, nicht nur
abgefragt, weil Safari es erst seit Version 17 beherrscht. Ein Bodenstück
kostet damit 7 statt 14 ms, und die schlechteste Bildzeit beim Laufen fiel von
44 auf 18 ms.

## Tests

```bash
npm test               # 129 Tests: Welt, Wetter, Aufgaben, Uhr, Garten, Kalender …
npm run test:browser   # 87 Prüfungen im echten Browser, mit Bildschirmfotos
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
node tools/bundle.mjs                  # alles in eine HTML-Datei
node tools/checkbundle.mjs             # öffnet sie per file:// und prüft sie
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

**Ein Spielstand überlebt neue Fassungen.** Die Fassungsnummer steht auf 1
und bleibt dort, solange nur ergänzt wird – Beete, Saat, Fristen, Tagebuch,
Oberflächengröße sind alles zusätzliche Felder, die ein alter Stand einfach
nicht hat. Nachgemessen mit einem echten Spielstand aus einer älteren Fassung:
Tag, Münzen, Glut, Tasche, Deko, gelegte Wege, gefällte Bäume mitsamt
Nachwachstag, freigeschaltete Bereiche, Farbquellen, Aufträge, Erinnerungen,
Werkzeugstufen und Standort kommen unverändert an.

**Am Startbildschirm steht „Spielstand aus Datei laden“.** Genau dort braucht
man ihn: Wer eine neuere Fassung bekommt, öffnet eine andere Datei, und der
Browser bindet den Speicher womöglich an die alte. Dann sähe man nur „Neues
Spiel“ – und wer das drückt, hat den alten Stand überschrieben.

**Unabhängig vom Browser** geht es über die Einstellungen, Abschnitt
„Spielstand“:

* **Sichern / Laden** legt eine `.json`-Datei an bzw. holt sie zurück – auch
  in einem anderen Browser oder auf einem anderen Rechner. Funktioniert
  überall, auch per `file://`.
* **Immer in eine Datei schreiben** verknüpft einmalig eine Datei; danach geht
  jedes Speichern zusätzlich dorthin, ohne weiteres Zutun. Legt man sie in
  einen Ordner, der mitwandert, wandert der Spielstand mit. Braucht die File
  System Access API – heute Chrome und Edge, nicht Safari und Firefox; wo sie
  fehlt, erscheint der Abschnitt gar nicht erst.

  Die **Verknüpfung bleibt gemerkt**, die Erlaubnis dazu nicht: Über `file://`
  vergisst der Browser sie beim Schließen, aus Sicherheitsgründen. Damit das
  nicht wie ein Datenverlust aussieht, steht die gemerkte Datei beim nächsten
  Start mit einem Knopf „Bestätigen“ in den Einstellungen, und eine kurze
  Meldung weist darauf hin. Ein Klick, dann läuft es weiter wie gehabt –
  einrichten muss man nichts noch einmal.

Was ein Browser **nicht** darf, ist ungefragt auf die Festplatte schreiben.
Die erste Wahl der Datei ist deshalb immer ein Klick des Menschen; alles
Weitere geht dann von selbst.

Beim Übernehmen einer Datei lädt die Seite neu. Das Spiel friert sich vorher
selbst ein (`frozen`) – ohne das schrieb der Sicherungshaken an `pagehide`
beim Neuladen noch den **alten** Stand über den gerade geladenen. Ein
Browsertest wacht darüber.
