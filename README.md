# Seli Grove – Web Edition

Ein gemütliches Insel-Sammelspiel im Browser. Die Insel hat ihre Farben verloren;
**Seli** bringt sie zurück, indem sie sammelt, angelt, baut – und den Geistern hilft.

**Die Grundentscheidung: fast keine Dialoge.** Was ein Geist möchte, zeigt eine
Karte aus Symbolen – kein Dialogbaum, kein Textblock, kein Weiterklicken.
Gesprochen wird nur, wo es etwas zu erzählen gibt: ein Satz zur Vorstellung,
ein Satz je Erinnerungsstück. Sieben Geister, je sechs Sätze; zusammen ergeben
sie eine kleine Biografie. Alles davon lässt sich in den Einstellungen
abschalten („Nur Symbole“).

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

Ein eigenständiges Spiel – Welt, Figuren, Regeln, Grafik und Klang stammen
aus diesem Projekt.

## Starten

```bash
npm start          # http://localhost:8080
```

Mehr braucht es nicht: kein Build-Schritt, keine Abhängigkeiten zur Laufzeit.
Der Server liegt bei, weil ES-Module sich nicht per `file://` laden lassen.
Jeder andere statische Webserver funktioniert genauso.

## Verschenken

```bash
npm run bundle     # dist/seli-grove.html – baut und prüft in einem
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
| `1`–`7`, `Tab` | Werkzeug wählen (7 = Gießkanne, sobald gebaut) |
| Mausrad | Werkzeug wechseln, ohne die Finger zu bewegen |
| `E` an Bank, Stuhl, Hängematte, Schaukel | hinsetzen · nochmal tippen: aufstehen · halten: einpacken |
| `E` an der Kochstelle | kochen und essen |
| `E` am Boot | zur Stillen Insel übersetzen und zurück |
| `I` `Q` `C` `M` | Tasche · Aufgaben · Werkbank · Karte |
| `B` | Fundbuch |
| `E` am Briefkasten | Post lesen |
| `E` an der Truhe | Vorrat ein- und auslagern |
| `G` | Erinnerungen |
| `L` | Dein Lager (Grundstück, Bucht, Hausausbau, Umzug) |
| `F` | schlafen (am eigenen Haus, wo es auch steht) |
| `R` / `X` | Deko versetzen / abbrechen |
| `Esc` | Menü, Fenster schließen |

Am Touchscreen: Joystick links, Aktionstaste rechts.

## Das Spielprinzip

* **Farbe zurückbringen.** Die Insel liegt zunächst als blasse Zeichnung da –
  wie ein Malbuch, das darauf wartet, ausgemalt zu werden. Um jeden zufriedenen
  Geist und um das Lagerfeuer wächst ein farbiger Kreis. Die Prozentanzeige oben
  zeigt, wie viel der Insel wieder Farbe hat. Was lebt (du, die Geister, der
  Händler, das Feuer), ist immer farbig.

  Gezählt wird nur, was **offen** ist: „wie viel von dem, was du erreichen
  kannst". Sonst hinge die Zahl von Anfang an an Land, das du gar nicht
  betreten darfst. Ein neuer Bereich senkt sie darum – und das ist der Sinn
  der Sache: Es gibt wieder etwas zu tun. Gemessen fällt sie beim Wald von
  40 auf 27 %, bei den Klippen von 54 auf 45 %, bei der Stillen Insel nur von
  51 auf 49 % (Wandas Farbkreis fängt größer an als bei allen anderen, damit
  ihre Insel nicht als grauer Fleck beginnt). Erreichte Meilensteine bleiben
  dabei erreicht.

  **Jede Bitte färbt gleich viel Boden ein**, nicht gleich viel Radius. Das
  klingt nach Rechnerei und ist der Unterschied zwischen zwei Wochen und zwei
  Monaten: Mit festem Radiuszuwachs färbt der hundertste Auftrag ein
  Vielfaches dessen ein, was der erste einfärbte – gemessen stand die Anzeige
  nach rund 130 Aufträgen auf 100 %. Nach gleicher Fläche sind es rund 330,
  und die ersten Tage fühlen sich fast unverändert an (Auftrag 1: 5,3 % vorher,
  4,7 % jetzt).
* **Dein Grundstück.** Um das Zelt herum ist ein Rechteck abgesteckt, als
  gestrichelte Linie im Gras zu sehen. **Innerhalb wächst nichts nach** – was
  du dort fällst und wegräumst, bleibt weg –, Grabstellen und Blütentage
  lassen es aus, und du darfst dichter ans Lager bauen als draußen.

  Das ist der Unterschied zwischen „Platz haben" und „bauen können". Gemessen
  sind vom Lagerbereich über achtzig Prozent der Kacheln frei, aber das größte
  zusammenhängende freie Quadrat misst nur **6×6** – und rund 190 Kacheln sind
  von Dingen belegt, die nachwachsen. Freigeräumt gibt das volle Grundstück
  **22×22** her, also mehr als das Dreizehnfache an Fläche am Stück.

  Vier Stufen, bezahlt in Glut (0/120/400/1100): Lichtung 15×11 → Hinterhof
  21×15 → Garten 27×19 → Anwesen 33×23. Zu roden sind auf der ersten Stufe
  ein knappes Dutzend Bäume und Steine, auf der letzten rund 120 – ein
  Vorhaben, kein Nachmittag. `L` öffnet das Fenster.
* **Die Bucht auf der Insel.** Der zweite Bauplatz, und der einzige ohne
  Betrieb. Das Lager ist gewachsen, aber es bleibt das Lager: Feuer,
  Werkbank, Händler und Briefkasten stehen mitten darin, und wer sich etwas
  Eigenes hinstellt, baut zwischen fremden Möbeln. Drüben gibt es das nicht.

  Vier Stufen, bezahlt in **Münzen** (1000 → 3000 → 7500 → 16000): Die Bucht
  13×15 → Der Hain 15×21 → Die Wiese 17×25 → Die ganze Bucht 19×31. Damit
  zieht jede Währung an ihrer eigenen Sache – Glut am Lagergrundstück,
  Material am Haus, Münzen an Truhe, Katalog und Bucht –, und es ist der
  einzige Kauf, der nach oben offen ist.

  Der Mittelpunkt ist gemessen, nicht geraten: Die Insel ist schmal, ein
  Rechteck kann dort schnell halb im Wasser liegen. Über acht Seeds hinweg
  ist die Stelle bei (9|60) die beste, die sie hergibt; gemessen sind 77 bis
  84 % davon Land (431 bis 469 Kacheln), gegen 93 bis 95 % im Lager. Dieselbe
  Regel wie dort: **innerhalb wächst nichts nach**, und man darf dicht bauen.

  Und man kommt hin. Das klingt selbstverständlich und war es nicht: Die
  Insel besteht aus drei übereinanderliegenden Kernen, und zwischen ihnen
  entschied allein das Rauschen – ein Münzwurf je Kachel. Gemessen war das
  **Hochland bei allen geprüften Seeds unerreichbar** und der Süden mit der
  Bucht bei zwei von acht: Wer sein Grundstück gekauft hatte, stand davor,
  und dazwischen lag Wasser. Jetzt werden zwei schmale **Landengen** gegraben
  statt erhofft, wie die Furt über den Fluss und die Anlandungen der Brücke.
  Über 40 Seeds sind seither mindestens 99,8 % der Insel vom Anleger aus zu
  Fuß erreichbar, und ein Test prüft nicht mehr die Form, sondern den Weg.
* **Der Umzug.** Sobald die Bucht dir gehört, kannst du **dein Haus dorthin
  umziehen** – und jederzeit zurück. Es bleibt EIN Zuhause: Ein zweites
  hieße zwei Fragen, die das Spiel nicht hat, nämlich in welchem man schläft
  und in welches die Post kommt.

  Der **Briefkasten zieht mit**; ein Kasten, der im Lager stehen bliebe,
  hieße jeden Morgen eine Bootsfahrt. Lagerfeuer, Werkbank, Händler und die
  Geister bleiben dagegen, wo sie sind — genau das ist der Unterschied
  zwischen den beiden Plätzen: Das Lager hat den Betrieb, die Bucht hat die
  Ruhe. Umziehen kostet nichts. Es ist eine Entscheidung, kein Kauf, und wer
  es sich anders überlegt, soll zurückdürfen, ohne dafür zu bezahlen.

  Der alte Platz **bleibt gefärbt**: Jeder der beiden Plätze hat seine eigene
  Farbquelle, statt dass eine dem Haus hinterherwandert. Farbe verschwindet
  auf dieser Insel nie wieder, auch nicht, weil man weggezogen ist.
* **Vom Zelt zum Haus.** Mitten auf dem Grundstück steht dein Zuhause, und es
  bleibt kein Zelt: Hütte → Haus → Haus mit Veranda. Bezahlt wird in
  **Material** – Holz, Hartholz, Stein, Ton, Kupfer –, also genau in dem, was
  beim Freiräumen des eigenen Grundstücks ohnehin anfällt. Damit zieht jede
  der drei langen Währungen an etwas Eigenem: Münzen an der Vorratstruhe,
  Glut am Grundstück, Material am Haus.

  Jede Stufe ist von außen zu sehen, nicht nur in einer Liste: Die bemalte
  Fläche wächst von 324×266 Bildpunkten (Zelt) über 289×264 und 342×318 auf
  395×376, dazu kommen ein zweites Fenster, ein Schornstein, ein Giebelfenster
  und zuletzt Dielen mit Vordach und zwei Laternen. Ab der Hütte **leuchtet
  nachts dein eigenes Fenster** (150 → 210 → 280), und ums Haus liegt ein
  eigener Farbkreis (120 → 260 → 420), der wie der des Lagerfeuers nie wieder
  kleiner wird. Kollision und Reichweite wachsen mit – sonst liefe man durch
  die eigene Wand oder käme nicht mehr an die eigene Tür.
* **Und du kannst hinein.** Vier Ausbaustufen von außen und nichts dahinter –
  das war die größte Lücke im Spiel: Man baute sich ein Haus mit Veranda und
  konnte nicht hineingehen. **`E` am Haus, und du stehst drinnen.**

  Drinnen ist es anders als draußen, und zwar mit Absicht:

  * **Der ganze Raum ist immer zu sehen.** Keine Kamera, die hinterherfährt –
    man sieht, was man eingerichtet hat, in einem Bild. Das ist der halbe
    Grund, warum Einrichten Spaß macht. Der Raum wird dafür so groß gezogen,
    wie er neben Kopf- und Werkzeugleiste passt.
  * **Niemand will hier etwas.** Kein Geist wünscht sich etwas, keine Bitte
    zeigt hinein, keine Gemütlichkeitszahl wird für jemand anderen gezählt.
    Was hier steht, steht, weil es dir gefällt. Draußen gehört alles halb der
    Insel; das hier ist der Gegenpol.
  * **Es wirkt trotzdem.** Ein Zuhause, in dem es schön ist, färbt die Insel
    um sich herum weiter ein – bis zu 120 Punkte zusätzlich auf den Farbkreis
    des Hauses. Bewusst klein: Das Haus selbst bringt 120 bis 420. Ein
    Zimmer, das den halben Fleck einfärbte, machte aus dem Einrichten eine
    Pflicht.

  **Der Raum wächst mit dem Haus** – Zeltecke (420×300) → Stube → Zimmer →
  Zimmer mit Veranda (960×620), und mit ihm die Zahl der Stücke, die
  hineinpassen. Ab dem großen Haus kommt ein **zweiter Raum** dazu, die
  Kammer. Ab der Hütte sind es Dielen und eine Bretterwand mit Fenster,
  und das Licht daraus fällt als heller Fleck auf den Boden; die Zeltecke ist
  Stoff und gestampfte Erde.

  Hingestellt wird wie draußen: aus der Tasche auswählen, Platz suchen, `E`.
  Aufheben mit der Hand, **auf Sitzmöbel setzt du dich** (tippen setzt hin,
  halten packt ein – dieselbe Geste wie draußen). **Am Bett wird geschlafen,
  an der Tür geht es hinaus** – und draußen steht Seli wieder genau da, wo
  sie hineingegangen ist. Zwei Stellen bleiben frei: der Streifen vor der Tür
  und das Bett. Wer seinen Ausgang zustellen könnte, hätte die einzige
  Sackgasse im ganzen Spiel gefunden, und die gibt es hier nicht.

  Beet und Wegstück lassen sich drinnen nicht setzen – ein Beet im Zimmer
  hätte keine Sonne, und ein Wegstück endete an der Wand.
* **Wand und Boden zum Wechseln.** Vier Ausstattungen – *Holz und Kalk*,
  *Moos und Eiche*, *Abendblau*, *Sand und Muschel* –, umzustellen im
  Grundstücksfenster. Sie **kosten nichts**: Drinnen soll nichts Pflicht
  sein, auch nicht das Bezahlen.

  Gemalt wird erst, wenn eine Ausstattung wirklich benutzt wird. Vier
  Ausbaustufen mal vier Ausstattungen sind sechzehn Bilder bis 1000×810 – für
  fünfzehn davon, die niemand ansieht.
* **Abendlicht drinnen.** Wird es draußen dunkel, legt sich auch im Zimmer
  ein kühler Ton über alles – und **jede Lampe, die du hingestellt hast,
  schneidet ein warmes Loch hinein.** Erst dadurch tut eine Laterne im
  Zimmer etwas.

  Und zwar **Dämmerung, nicht Nacht**: Man sieht abends alles, auch ohne
  eine einzige Lampe. Ein Zimmer, in dem man ohne Laterne festsitzt, machte
  aus dem Aufstellen eine Pflicht.
* **An die Wand.** Die Rückwand ist eine eigene Ebene mit eigenen Stücken:
  **Bild**, **Wandbrett**, **Kranz** und **Hängepflanze**. Zwei baut man an
  der Werkbank, zwei kommen aus dem Katalog. Sie hängen, sie stehen nicht –
  man läuft darunter hindurch, und draußen gibt es dafür keinen Platz (das
  Spiel sagt es auch, statt einen raten zu lassen).

  Die Höhe steht fest. Wer sie selbst wählen könnte, richtete zwanzig Minuten
  lang Bilder gerade aus; eine Reihe auf gleicher Höhe sieht ohnehin besser
  aus. Waagerecht folgt der Vorschaupunkt Seli und weicht nach links und
  rechts aus, wenn es eng wird.

  **Zwei Stellen bleiben frei:** vor dem Fenster und hinter dem Bett. Das
  erste nähme dem Zimmer sein Licht, das zweite wäre ein Bild, das man
  aufhängt und nie wieder sieht. Abgenommen wird nah an der Wand mit Blick
  nach oben – sonst hinge man beim Vorbeilaufen Bilder ab.
* **Zwei Räume ab dem großen Haus.** Oben rechts in der Rückwand geht eine Tür
  weiter: vom **Zimmer** in die **Kammer** und wieder zurück. Jeder Raum hat
  eigene Möbel, eigene Wandstücke und eine eigene Ausstattung.

  **Warum nicht einfach ein größeres Zimmer.** Weil das dasselbe getan und
  weniger gekostet hätte. Der Grund ist ein anderer: Ein Raum hat **einen**
  Ton. Wer Wand und Boden auf Abendblau stellt, stellt damit alles auf
  Abendblau, und jedes Stück, das nicht dazu passt, muss weg. Mit zwei Räumen
  wird aus dem Einrichten zum ersten Mal eine Entscheidung, die man zweimal
  treffen darf – vorn das Wohnliche, hinten die Werkstatt.

  **Die Kammer ist kleiner**, hat **kein Bett** und **keinen Ausgang**:
  Geschlafen und hinausgegangen wird vorn. Ein zweiter Ausgang wäre dieselbe
  Sache an zwei Stellen, und ein zweites Bett auch.

  **Und sie hat kein Fenster.** Ihr Licht fällt durch die Verbindungstür. Das
  ist kein Sparen: Ein Fenster hätte mitten in einer ohnehin kurzen Wand
  gestanden und von den Aufhängeplätzen die Hälfte gekostet – gemessen, nicht
  vermutet. So sind es zwei verschiedene Orte statt zweier Größen desselben.

  Vor der Tür und über ihr bleibt frei, wie am Ausgang auch: Ein zugestellter
  Durchgang wäre die einzige Sackgasse, die dieses Spiel anbieten könnte, und
  ein Kranz darüber wäre ein Kranz, durch den man hindurchläuft.

  **Im Spielstand steht jetzt eine Liste von Räumen** statt eines Zimmers mit
  einem Anhängsel. Ein Stand aus der Zeit davor wird beim Laden zum vorderen
  Raum – wer sein Zimmer eingerichtet hat, findet es unverändert wieder, und
  die Kammer kommt leer dazu.
* **Das Tier kommt mit hinein.** Ist es zahm, folgt es dir durch die Tür,
  läuft dir im Zimmer hinterher und legt sich neben dich, sobald du stehen
  bleibst oder dich hinsetzt. Ein Streuner, der noch am Napf sitzt, folgt
  einem nicht ins Haus.
* **Ein Teppich bindet zusammen, was darauf steht.** Bis hierher war
  Einrichten eine Frage der **Zahl**: acht Stühle an acht Wänden zählten so
  viel wie eine Sitzgruppe. Jetzt zählt auch das Danebenstellen – ein Tisch
  mit zwei Stühlen auf einem Teppich ist eine **Gruppe**, und jedes gebundene
  Stück zählt doppelt.

  Nur flache Stücke binden (Teppich, Matte, Trittsteine), und ein Teppich
  bindet höchstens drei. Sonst wäre die beste Antwort ein Teppich mit zwanzig
  Stühlen darauf, und aus dem Einrichten würde ein Stapeln.
* **Gedanken im eigenen Zimmer.** Wer sich drinnen hinsetzt, bekommt nach ein
  paar Sekunden einen Satz – aus einer eigenen Gruppe, nicht aus der, die vom
  Haus von *außen* handelt. „Draußen ist noch einiges zu tun. Draußen."
  Mitgezählt werden das Möbelstück, auf dem sie sitzt, die Stücke ringsum,
  das Wetter (den Regen hört man auch drinnen) und die Jahreszeit.
* **Was kommt.** Die Insel hat **elf Termine im Jahr** – sieben Geburtstage
  und vier Feste – und erzählte von jedem erst an dem Morgen, an dem er da
  war. Damit lieferte sie nur die Hälfte von dem, was ein Fest sein soll:

  > Ein **Termin**. Etwas, von dem man WEISS, dass es kommt, und auf das man
  > sich freuen kann.

  Jetzt steht im Aufgabenfenster, was in den nächsten Tagen ansteht – beim
  Geburtstag samt Lieblingsstück, damit man es suchen gehen kann. Und einmal
  je Termin sagt die Insel es morgens auch von selbst: einmal, nicht sieben
  Morgen hintereinander. Nichts davon verlangt etwas.

  **Sieben Tage Vorlauf, und die Zahl ist gemessen.** Sie ist das kleinste
  Fenster, bei dem niemand durchfällt, der einmal die Woche spielt – die
  Geburtstage hängen am echten Kalender, und wer sonntags spielt, hätte bei
  kürzerem Vorlauf schlicht Pech. Gleichzeitig steht damit an **4 von 5
  Tagen** nichts dort; bei vierzehn Tagen wäre es fast jeder zweite, und was
  so oft dasteht, liest niemand mehr.
* **Becken und Falterkasten.** Fische und Falter landeten im Fundbuch, in der
  Küche und in Bitten – und damit **nirgends, wo man sie ansieht**. Die
  Fanggrößen geben jedem Fang ein Maß in Zentimetern, und diese Zahl lebte
  danach in einer Liste. Angel und Zimmer berührten einander an keiner Stelle.

  Jetzt gibt es zwei Möbelstücke, die zeigen, was man gefangen hat: das
  **Becken** (aus dem Katalog) mit deinen drei besten Fischen und den
  **Falterkasten** (Werkbank) mit deinen drei seltensten Faltern. Drinnen wie
  draußen aufstellbar, und die Fische ziehen ihre Runden.

  **Sie verlangen keine Verwaltung.** Man wählt nicht aus, was hineinkommt, es
  gibt kein Einsetzen und kein Herausnehmen – sie zeigen von selbst, was
  gerade das Beste ist, und ändern sich, sobald du einen größeren Fisch
  fängst. Ein Fenster mit Auswahllisten wäre mehr Bedienung als Freude, und es
  gäbe eine Art, sein Becken „falsch" einzurichten. Davon gibt es hier nichts.

  **Der beste Fisch ist nicht der längste.** Gemessen wird, wie nah der Fang
  an dem war, was diese **Art** hergibt – eine 21-cm-Sardine ist das größere
  Kunststück als ein mittelmäßiger Wels. Sonst schwämmen für immer dieselben
  drei Arten im Becken.

  Ein Museum wäre die naheliegende Antwort und steht in den Fanggrößen
  ausdrücklich als „zu groß für dieses Spiel" verworfen. Das hier ist die
  kleine Fassung davon.
* **Die Chronik.** Der Tagesrückblick zeigt einen Tag und ist am nächsten
  Morgen weg; über die ganze Zeit gab es nichts. Ganz unten im
  Aufgabenfenster steht jetzt, wie lange du schon hier bist, wie viel Farbe
  zurück ist, wie viele Bitten erfüllt sind, wie vielen Dingen du begegnet
  bist – und dein größter Fang.

  **Sie zählt nichts Neues mit.** Alle Zahlen liegen längst im Spielstand:
  Das Fundbuch weiß, wie viel von jeder Sorte je in der Tasche lag, die
  Fanggrößen kennen jeden Rekord. Eine zweite Buchführung wäre eine zweite
  Wahrheit, die irgendwann von der ersten abweicht.

  Der größte Fang wird **an der Art** gemessen und nicht in Zentimetern: Ein
  Wels wird nun einmal länger als eine Sardine, und dann stünde dort für
  immer derselbe Fisch. Eine 21-cm-Sardine ist das größere Kunststück.
* **Der Wanderer.** Etwa einmal die Woche steht morgens jemand am Strand, den
  es hier sonst nicht gibt: ein Mensch mit Hut, Umhang, Sack und Stab. Er
  bleibt einen Tag. Am nächsten Morgen ist er weg.

  **Vier Regeln unterscheiden ihn von einem Geist.** Er *bleibt nicht* – kein
  Farbkreis, keine Freundschaftsstufe, keine Erinnerungskette. Er *stellt
  keine Aufgabe* – er sucht etwas und hat etwas dabei, das ist ein Tausch und
  keine Bitte; nichts davon landet im Aufgabenbuch, nichts läuft ab. Er *gibt,
  was es sonst nicht gibt* – beim zweiten Tausch die **Reiselaterne**, das
  einzige Stück im Spiel, das aus keiner Werkbank und keinem Katalog kommt.
  Und *ihn zu verpassen kostet nichts* – er kommt wieder, wie der Geburtstag
  und das Fest.

  Gesucht wird immer etwas, das man im Vorbeigehen aufhebt: drei Muscheln,
  vier Kräuter, zwei Scherben. Dafür gibt es Münzen und etwas Seltenes –
  Meerkristall, Bernstein, Sternenstaub, Mondsaat. Einmal am Tag; sonst stünde
  man mit dreißig Muscheln vor ihm und ginge mit drei Meerkristallen weg. Ist
  die Tasche voll, wird **gar nicht erst** getauscht: Wer erst abgibt und dann
  keinen Platz mehr hat, hätte drei Muscheln für nichts gegeben.

  **Wann er kommt, ist eine gemessene Zahl und keine geratene.** Der erste
  Entwurf war ein Tageswurf – jeden Morgen 17 % Chance. Im Schnitt kam
  dasselbe heraus wie jetzt (alle sieben Tage), aber über 400 Inseln und ein
  Jahr gemessen lagen zwischen zwei Besuchen **bis zu 66 Tage**, und auf
  mancher Insel stand er das erste Mal erst an Tag 46 da. Jetzt wird nicht
  gewürfelt, *ob* er heute kommt, sondern *an welchem Tag dieser Woche*:

  |                    | Tageswurf 17 % | Fenster von 7 |
  | ------------------ | -------------- | ------------- |
  | Besuche im Jahr    | 33 – 69        | 51 – 52       |
  | Tage dazwischen    | 1 – **66**     | 2 – **12**    |
  | erster Besuch      | Tag 8, spät **46** | Tag 8, spät **11** |

  Dass er nie zwei Tage hintereinander dasteht, fällt dabei aus der Bauart
  heraus statt aus einem Nachtrag: Der Tag im Fenster wird aus 1…6 gewählt,
  nie 0, und damit liegt zwischen zwei Fenstern immer mindestens ein Tag.

  **Er steht am Strand und ausdrücklich nicht am Boot.** Das Boot wäre die
  schönere Erklärung dafür, woher er kommt – aber im Bildschirmfoto stand er
  darin, und schlimmer: Über 250 Inseln gemessen zielte die Taste in 1,5 % der
  Stellungen auf das *Boot* statt auf ihn. Wer reden will und stattdessen
  übersetzt, hat den schlechtesten Fehler erwischt, den diese Insel zu bieten
  hat. Dagegen half kein Punktezuschlag und kein größerer Abstand; jetzt sucht
  er sich eine Sandkachel mit ausdrücklichem Abstand zu allem, was eine
  Station ist. Gemessen: **null**.

  Am Morgen sagt eine Meldung, dass jemand da ist, und auf der Karte steht ein
  Punkt. Was er sucht, sagt er selbst – ein Aushang mit seiner Einkaufsliste
  machte aus dem Besuch eine Aufgabe. Am **letzten Abend** kommt er nicht: Der
  gehört den sieben.
* **Der letzte Abend.** Bei hundert Prozent versammeln sich alle sieben
  Geister am Lagerfeuer und warten dort – nicht einen Tag lang, sondern so
  lange, bis du bei jedem warst. Jeder sagt einen Satz; wer alle gehört hat,
  bekommt das letzte Wort der Insel. Danach geht es weiter: Am nächsten
  Morgen stehen alle wieder an ihren Plätzen. Ein gemütliches Spiel darf
  nicht zumachen, nur weil man fertig ist. Die sieben Sätze stehen zum
  Nachlesen im Erinnerungsfenster – eine Sprechblase ist nach acht Sekunden
  weg, und das sind die Sätze, auf die alles zuläuft.
* **Wunschplätze – das Spiel nach dem Spiel.** Danach hörte das Spiel nicht
  auf, aber es ging auch nicht weiter: derselbe Tagesbetrieb, dieselbe Runde.
  Ab der Stillen Insel (also weit vor dem Ende) fangen die Geister an, sich
  **Orte** zu wünschen statt Gegenstände:

  > *Ich hätte gern einen Platz zum Sitzen am Wasser.*
  > *Nachts ist es dunkel oben an den Klippen. Ein Licht wäre schön.*
  > *Es fehlt etwas für die Vögel drüben auf der Stillen Insel. Und ringsum
  > sollte es gemütlich sein.*

  Erfüllt wird so ein Wunsch nicht durch Abgeben, sondern durch
  **Aufstellen** – und was man hinstellt, bleibt stehen. Damit wird aus
  Einrichten zum ersten Mal eine Aufgabe mit einer richtigen und vielen
  falschen Antworten: Die Bank muss ans Wasser, nicht irgendwohin.

  Ein Wunsch besteht aus drei Teilen, alle aus Dingen, die das Spiel ohnehin
  weiß: **Sorte** (ein Sitzplatz, ein Licht, etwas Grünes, etwas für die
  Tiere, ein Weg, ein gedeckter Tisch), **Ort** (am Wasser, im Wald, oben an
  den Klippen, drüben auf der Insel, beim Lagerfeuer, bei deinem Zuhause,
  weit weg von allem – **oder beim Geist selbst**, was in Wahrheit sieben
  Orte sind) und **Zugabe** (ringsum gemütlich; nicht nur eins; oder eine
  zweite Sorte am selben Platz). Das sind **84 unterscheidbare Plätze** und
  mit den Zugaben über dreihundert Wünsche, ohne dass einer davon
  geschrieben werden müsste – die *Sätze* dagegen sind geschrieben, zwei je
  Sorte, sonst läse sich jeder Wunsch wie eine Datenbankzeile.

  **Damit es sich endlos anfühlt**, reicht ein großer Vorrat nicht. Gemessen
  kam die erste Wiederholung anfangs schon beim **elften** Wunsch, im
  schlechtesten Fall beim vierten – gemieden wurden ja nur die drei gerade
  offenen. Drei Dinge halten sie jetzt auf Abstand:

  * Das Spiel **merkt sich die letzten 16 erfüllten** und wiederholt sie
    nicht. Damit rückt die erste Wiederholung im Median auf den **24.**
    Wunsch (frühestens den 18.).
  * „Ein Sitzplatz bei Mira" und derselbe bei Bruno gelten als **zwei**
    Wünsche – zwei Plätze auf zwei Seiten der Insel.
  * Die **Ansprüche wachsen**: „ringsum gemütlich" verlangt mit 40 erfüllten
    Wünschen 32 Punkte statt 14, „nicht nur eins" fünf Stück statt drei. Ab
    dem achten Wunsch kommt die vierte Zugabe dazu – ein Stück einer
    **zweiten** Sorte am selben Platz, die einzige, bei der man zwei Dinge
    zusammendenken muss. Flach und gedeckelt: Der fünfzigste Wunsch soll
    nicht dieselbe Handbewegung sein wie der erste, aber auch keine halbe
    Insel voll Deko verlangen. Die Forderung wird beim Anlegen in den Wunsch
    geschrieben – sonst würde einer, den man liegen lässt, hinter dem Rücken
    teurer, und das wäre eine Strafe fürs Nachdenken.

  Dazu ein **Wort statt einer Zahl**: „Zugezogen", „Inselgärtnerin", „Wer
  weiß, wo was hingehört", zuletzt „Hier ist alles an seinem Platz". Kein
  Rang mit Rechten – aber bei einer Beschäftigung, die nie fertig wird, ist
  das die einzige Form von Fortschritt, die man aufschreiben kann, ohne sie
  zu beenden.

  Eine Sorte ist immer eine **Gruppe**: „ein Platz zum Sitzen" nimmt Bank,
  Stuhl, Hängematte oder Schaukel. Ein Wunsch nach genau einem Gegenstand
  wäre eine Einkaufsliste. Jede Sorte enthält mindestens ein Stück von der
  **Werkbank** – sonst hinge ein Wunsch am Geld, und wer gerade pleite ist,
  sähe drei Wünsche stehen, an die er nicht herankommt.

  **Beim Aufstellen sagt das Spiel, ob die Stelle passt.** „Am Wasser" heißt
  in Zahlen 150 Pixel; wer die Bank zweihundert daneben hinstellt, sähe sonst
  nichts passieren und wüsste nicht, warum. Steht die Bank richtig, heißt es
  „Hier aufstellen – erfüllt einen Wunsch"; ist nur die Stelle falsch,
  „gewünscht ist es am Wasser". Das ist der Unterschied zwischen einer
  Aufgabe und einem Suchbild. Im Aufgabenfenster steht dazu, wie weit die
  Zugabe noch ist („Gemütlichkeit 9/14").

  Der Lohn **wächst mit der Zahl der erfüllten Wünsche** (280 → 1 200 Münzen,
  gedeckelt nach 25). Nötig, weil ein Tag Bitten spät im Spiel rund 1 800
  bringt: Ein fester Lohn von 260 wäre dann Kleingeld für mehr Arbeit, und
  man ließe genau die Aufgabe liegen, die das späte Spiel tragen soll.

  Keine Frist, keine Strafe: Wer drei Tage überlegt, wo die Bank hinsoll, hat
  richtig gespielt. Und wer die Deko später wieder wegnimmt, verliert die
  Belohnung nicht – der Wunsch war erfüllt, und das bleibt er.

  Die drei offenen Wünsche kommen immer von **drei verschiedenen Geistern**;
  sonst redet einer viel und die anderen sechs gar nicht. Und einer, an dem
  nach zwölf Tagen noch **gar nichts** steht, wird zurückgezogen – nicht als
  Frist, sondern weil sich sonst drei Wünsche, die einem nicht liegen, für
  immer festsetzen: Die Liste füllt ja nur auf. Wer angefangen hat, behält
  seinen Wunsch so lange er mag.

  Ein Test prüft **jede** der Kombinationen einzeln auf Erfüllbarkeit. Eine
  einzige unerfüllbare tauchte sonst irgendwann bei jedem auf und bliebe
  dann für immer stehen – dieselbe Falle wie die Feder ohne Quelle, nur dass
  sie sich selbst nachlegt.
* **Meilensteine.** An der Farbanzeige hängen elf Stationen von 10 % bis
  100 %. Jede gibt entweder etwas Neues zu **bauen** oder etwas dauerhaft
  Besseres – nie nur eine Urkunde: die Gießkanne, eine dritte Taschen-
  erweiterung, vierte Werkzeugstufen, **die Stille Insel**, ein Händler, der
  dauerhaft mehr zahlt, Beete, die schneller wachsen, ein größerer Feuerkreis.
  Im Aufgabenfenster steht die ganze Leiter mit Balken; der nächste Schritt
  steht vollständig da, weit Entferntes bleibt stumm. Gemessen liegen die elf
  Stationen bei 2/8/19/49/59/101/136/182/244/272/402 erledigten Aufträgen –
  bei fünfzehn am Tag gut vier Wochen, mit etwas Neuem alle ein bis drei Tage.
* **Kein Warten auf die Uhr.** Ein Tag läuft von 6 bis 2 Uhr (Länge einstellbar),
  aber schlafen darfst du jederzeit – und bekommst sofort neue Aufgaben, neue
  Grabstellen, neues Ladenangebot. Wer eine Stunde am Stück spielen will, kann
  das; wer zehn Minuten hat, auch.
* **Zwölferlei Aufgaben.** Bringen, finden, angeln, einen *bestimmten* Fisch
  fangen, einen Ort aufsuchen, verbrennen, bauen, aufstellen – und vier, bei
  denen es nicht um die Stückzahl geht:
  * **Sammelbitte:** drei oder vier *verschiedene* Dinge einer Gruppe. „Sechs
    Beeren" erledigt man an einem Busch, „von jeder Waldsorte eine" schickt
    einen über die halbe Insel. Im Aufgabenfenster steht jede Sorte einzeln;
    was schon in der Tasche liegt, ist abgehakt. Abgegeben wird von jeder
    Sorte genau eines – der Vorrat bleibt.
  * **Botengang:** ein Geist gibt ihn auf, ein *anderer* nimmt ihn an. Die
    einzige Bitte, bei der es darauf ankommt, wohin man geht; das
    Ausrufezeichen steht über dem Ziel, nicht über dem Auftraggeber.
  * **Anbau:** aus dem eigenen Beet. Bindet den Garten an die Geister, statt
    ihn danebenstehen zu lassen.
  * **Kochbitte:** „Mach mir eine Waldsuppe." Die längste Kette, die eine
    Bitte hier auslöst – erst wissen, was hineingehört, dann die Zutaten von
    drei verschiedenen Stellen holen, dann ans Feuer. Deshalb gilt sie sechs
    Tage statt drei. Gefragt wird nur nach Gerichten, deren Zutaten es
    **verlässlich** gibt: Die Mondblume kommt jede Nacht, der Regenpilz
    vielleicht die ganze Woche nicht.

  Nur knapp ein Drittel ist Hol-und-Bring; ein Test wacht darüber. Über
  sechzig Tage gemessen – Bereiche nacheinander geöffnet, Bitten laufen normal
  ab – kommen so rund **85 verschiedene Aufgabenkarten** zusammen, und noch in
  der letzten Woche taucht eine auf, die es vorher nicht gab. (Über drei
  Inselsamen nachgemessen: 84, 86, 86; letzte neue Karte an Tag 56, 59, 59.)
* **Bitten rotieren.** Jede Bitte gilt drei bis sechs Tage – im Aufgabenfenster
  steht, wie lange noch. Läuft eine ab, zieht der Geist sie am nächsten Morgen
  zurück und stellt eine andere; wer eine Aufgabe nicht mag, ist sie los.
  **Fertiges läuft nie ab**: Wer die drei Muscheln beisammen hat und erst
  morgen vorbeikommt, hat sie nicht umsonst gesucht. Und derselbe Geist
  verlangt nie zweimal gleichzeitig dasselbe.
* **Das Fundbuch mit Folgen.** Jede Kategorie ist eine Reihe, und eine volle
  Reihe zahlt aus – Münzen, Glut, manchmal einen Edelstein. Wichtiger noch:
  Wer auf ein leeres Feld tippt, erfährt, **wo das Fehlende steckt**
  („Blüht nur nachts", „Im Fluss, nur nachts", „Aus Erzbrocken, mit Glück").
  Ein leeres Feld mit „???" sagt nur, DASS etwas fehlt; der Reiz einer
  Sammlung kommt daher, dass man weiß, wohin man laufen muss. Ein Test wacht
  darüber, dass jeder Gegenstand einen Fingerzeig hat und keiner erfunden ist.
* **Post.** Neben dem Zelt steht ein Briefkasten. Wem du hilfst, der schreibt
  dir am nächsten Morgen – zwei Sätze und ein Mitbringsel, im Ton des Geistes.
  Ein Umschlag über dem Kasten zeigt, dass etwas drin liegt; ohne ihn müsste
  man jeden Morgen nachsehen und ginge nach drei leeren Kästen nicht mehr hin.
  **Dank gibt es nur für wirkliche Hilfe** – ein Dankesbrief für nichts wäre
  eine Floskel, und Floskeln merkt man beim dritten Mal.

  Die Beilage hängt an der **Freundschaft**, nicht am Zufall allein: Anfangs
  eine Handvoll von dem, was der Geist selbst mag; wer ihn länger kennt,
  bekommt auch mal Saat, einen Edelstein oder etwas für die Wohnung. Dreimal
  dasselbe Holz, und man macht den vierten Brief nicht mehr auf.
* **Der Katalog.** Beim Händler unter „Katalog": zwanzig Stücke Deko zum
  Bestellen, von der Bastmatte für 90 bis zum Zierteich für 560 Münzen.
  Bezahlt wird sofort, **geliefert am nächsten Morgen als Paket im
  Briefkasten** – höchstens drei Bestellungen gleichzeitig.

  Der Umweg über die Post ist der Punkt. Käme das Stück gleich in die Tasche,
  wäre der Katalog ein zweiter Laden und der Briefkasten bliebe, was er war.
  So löst eine Sache drei Dinge: Deko, die nicht an einem Rezept hängen muss;
  ein Ziel für Münzen, das beliebig viel aufnimmt; und ein Grund, morgens
  zuerst zum Kasten zu gehen. Die halbe Seite ist am ersten Tag noch gesperrt,
  aber **sichtbar** – wer die Schaukel durchgestrichen sieht, weiß, dass es
  weitergeht.
* **Die Vorratstruhe.** Vier Ausbaustufen, in Raten beim Händler bezahlt:
  800 → 2600 → 7000 → 16000 Münzen für am Ende 80 Fächer. Damit haben Münzen
  zum ersten Mal ein großes Ziel, und ein guter Markttag ist ein guter Tag.
  Kein Kredit im eigentlichen Sinn: keine Zinsen, keine Frist, keine Mahnung –
  wer nie einzahlt, verliert nichts. Dieselbe Regel wie im Garten.
* **Feste.** Die Insel hatte zwei Sorten Kalender: die Jahreszeit, die ein
  Vierteljahr gilt, und das Tagesereignis, das sich nach einer Zufallszahl
  richtet. Was fehlte, war ein **Termin** – etwas, von dem man weiß, dass es
  kommt. Vier Feste an festen Daten, eines je Jahreszeit:

  | Fest | Datum | |
  | --- | --- | --- |
  | **Blütenfest** | 1. Mai | Die ganze Insel blüht |
  | **Mittsommernacht** | 21. Juni | Der längste Tag |
  | **Erntefest** | 12. Oktober | Lange Tische auf der Wiese |
  | **Lichterfest** | 21. Dezember | Die längste Nacht, überall brennt Licht |

  An dem Tag **schmückt sich das Lager** – acht Stücke ums Feuer herum, je
  Fest andere, am nächsten Morgen wieder weg und nicht einpackbar. **Jeder
  Geist sagt etwas dazu**, mit eigenen Worten für jedes Fest (28 Sätze), und
  gibt **einmal eine Gabe**.

  Ein Fest schlägt das Tagesereignis: Zwei Besonderheiten an einem Tag wären
  keine mehr. Und wie beim Geburtstag gibt es **keine Strafe fürs Verpassen** –
  was man dieses Jahr nicht holt, kommt nächstes Jahr wieder.
* **Die Küche.** Das Spiel hatte 86 Gegenstände, und alles Gesammelte ging
  genau zwei Wege: verkaufen oder abgeben. Die **Kochstelle** im Lager ist der
  dritte. Neun Gerichte aus dem, was wächst – Beerenmus, Waldsuppe,
  Mondblütenkuchen –, und jedes ist **etwa doppelt so viel wert wie seine
  Zutaten**. Ein Test rechnet das für jedes einzelne nach.

  Wer eines **isst**, bekommt bis zum Schlafengehen eine **Stärkung**: `Flink`
  (man läuft schneller), `Kräftig` (Werkzeuge nehmen einen Schlag weniger) oder
  `Glücklich` (seltene Fische beißen öfter an). Immer nur eine; ein zweites
  Gericht tauscht sie.

  **Kein Hunger, keine Anzeige, keine Strafe.** Niemand muss essen – wer nie
  kocht, spielt das Spiel von gestern, und ein Test hält genau das fest. Und
  **Seli isst kein Tier**: kein Fisch, kein Ei, kein Honig. Auch das steht als
  Prüfung da, nicht nur als Vorsatz.

  Und jemand fragt danach. Vier Geister bitten um Gekochtes – Flämmchen, weil
  die Kochstelle neben seinem Feuer steht; Mira, weil bei ihr fast alles
  wächst, was in den Topf kommt; Nelly, die für alle deckt; und Wanda, die
  allein auf ihrer Insel sitzt. Ein verschenktes Gericht bekommt außerdem
  seinen **eigenen Dank**: Es ist das einzige Mitbringsel im Spiel, das nicht
  gefunden, sondern *gemacht* wurde, und Brunos „Brauchbar." wurde dem nicht
  gerecht.
* **Genug Deko, dass die Wünsche eine Wahl bleiben.** Ein Wunsch lautet „ein
  Platz zum Sitzen am Wasser", nicht „eine Bank" – die **Sorte** ist die
  Entscheidung. Bei vier Möglichkeiten ist sie nach zwölf Wünschen keine mehr.
  Deshalb **zwölf neue Stücke, zwei je Sorte**: Baumstumpfhocker und
  Steinbank, Steinlaterne und Fackel, Blumenkasten und Bonsai, Igelhaus und
  Futterhäuschen, Trittsteine und Torbogen, Wäscheleine und Bücherkiste.
  Sieben davon baut man an der Werkbank, vier kommen aus dem Katalog.
  **36 Stücke** tragen die Wünsche jetzt statt 27.
* **Die Geister reden.** Wer nichts abzugeben hat, bekam bisher einen einzigen
  Satz: „Genug für heute." Dreißig Tage lang denselben. Jetzt sagt jeder Geist
  etwas zur **Lage** – zum Wetter, zur Jahreszeit, zur Uhrzeit, dazu wie gut
  man sich kennt und wie es um ihn herum aussieht. **189 Sätze**, in sieben
  deutlich verschiedenen Stimmen: Flämmchen sagt nie einen Nebensatz, Bruno
  brummt, Kiesel redet wie ein Seemann, Nelly wie eine Gastgeberin.

  Keiner davon erteilt einen Auftrag – ein Test wacht darüber. Geplauder ist
  die Insel, die spricht, während man nichts zu erledigen hat.
* **Ausruhen.** Man konnte Bänke bauen, Stühle bestellen, eine Hängematte
  aufhängen und eine Schaukel aufstellen – und sich in nichts davon
  hineinsetzen. Jetzt schon: **`E` vor einem Sitzmöbel, und Seli setzt sich
  hin.** Loslaufen stellt sie wieder auf, Halten packt das Stück ein.

  Sitzen bringt mit Absicht **nichts Zählbares** – keine Münzen, keine Glut,
  keinen Fortschritt. Es bringt drei andere Dinge: Falter, Motten und Vögel
  drehen langsam auf sie zu, statt weiterzuziehen; die Bedienung tritt
  zurück, damit man die Insel sieht und nicht die Zahlen; und nach ein paar
  Sekunden **sagt sie etwas über den Platz**. Wer die Bank ans Wasser
  stellt, bekommt andere Sätze als jemand, der sie in den Wald stellt – und
  das ist die einzige Belohnung dafür, sich Gedanken über einen Platz zu
  machen, die nicht in Zahlen ausgedrückt ist.
* **Das Haustier.** Ein Tier, das nur hinterherläuft, ist nach drei Tagen
  Tapete. Deshalb hat es eine Aufgabe: **Einmal am Tag findet es dir etwas** –
  es bleibt an einer Grabstelle oder einem versteckten Aufgabenstück stehen,
  und ein Stern zeigt, wo. Aus dem Absuchen der Karte wird ein
  Hinterhergehen. Und bleibst du wirklich stehen, sucht es sich ein
  **Möbelstück**: Bank, Teppich, Hängematte, Feuerschale. Gemütlichkeit war
  bisher eine Zahl; jetzt sitzt etwas darauf.

  Und **setzt du dich selbst hin, legt es sich neben dich.** Dieser Satz stand
  hier schon, bevor er stimmte: Weil Bank, Baumstumpf und Steinbank alle als
  Ruheplätze zählen, kletterte es meistens auf genau das Möbelstück, auf dem
  Seli gerade saß – zwei Figuren, die sich überlappen. Jetzt geht es auf die
  Seite, auf der es ohnehin steht, und legt sich daneben. Das ist die einzige
  Stelle, an der Sitzen und Tier einander überhaupt bemerken, und mehr braucht
  es nicht.

  Es kommt nicht aus einem Menü. Ab dem Meilenstein „Werkzeugtag" steht ein
  **Futternapf** im Katalog (260 Münzen). Stell ihn hin, und irgendwann sitzt
  ein Streuner davor – Katze oder Hund entscheidet der Seed deiner Insel, nicht
  eine Auswahlliste. **Dreimal füttern, dann bleibt er.** Es frisst Fisch am
  liebsten, Beeren und Pilze gehen auch; einmal am Tag, wie das Mitbringsel.

  Ein ausgelassener Tag kostet Laune, und ein hungriges Tier sucht nichts
  mehr. Weglaufen tut es nie – dieselbe Regel wie im Garten und beim Kredit:
  Das Spiel nimmt einem nichts weg, es gibt nur weniger. Packst du den Napf
  wieder ein, *bevor* der Streuner bleibt, hast du ihn verscheucht; danach
  hängt er an dir, nicht an der Schüssel.

  **Und du gibst ihm einen Namen.** Das Feld dafür stand von Anfang an im
  Spielstand und wurde von nichts gesetzt und von nichts gelesen – ein leeres
  Feld, das jeden Abend mitgespeichert wurde. Jetzt steht im Grundstücksfenster
  ein Knopf dafür, sobald das Tier bleibt (einen Streuner, der morgen
  vielleicht nicht wiederkommt, tauft man nicht). Danach heißt es nicht mehr
  „Es hat etwas gefunden", sondern „Moos hat etwas gefunden" – und genau das
  ist der ganze Unterschied.
* **Mitbringsel.** Jeder Geist mag ein paar bestimmte Dinge. Hast du eines
  davon dabei, schwebt ein Herz über ihm; ein Druck auf E, und er bekommt es.
  Das gibt Glut und ein Stück Farbe – einmal je Geist und Tag. Was gerade für
  eine offene Bitte gebraucht wird, bietet das Spiel nicht als Mitbringsel an.

  Jeder hat ein **Lieblingsstück** (Flämmchen Harz, Mira Sternblumen, Nelly
  einen Meerkristall). Das zählt doppelt an Glut und mehr als doppelt an
  Farbe, hat beim Verschenken Vorrang und steht mit einem ★ im Hinweis.
  Vorher war jedes gemochte Ding gleich viel wert – man warf hin, was oben in
  der Tasche lag. Jetzt lohnt es sich, das Richtige aufzuheben.
* **Federn.** Sie standen von Anfang an in der Gegenstandsliste, im
  Botengang-Pool der Aufträge und im Fundbuch – aber es gab sie **nirgends**:
  kein Objekt ließ sie fallen, kein Rezept, kein Laden, kein Katalog, keine
  Post. Gemessen waren das acht unlösbare Aufträge in neunzig Tagen, und die
  Materialreihe im Fundbuch konnte nie voll werden. Der Fingerzeig sagte
  sogar „Aus Grabstellen" – und Grabstellen gaben keine.

  Jetzt liegen sie im Gras unter Bäumen und am Strand (rund 34 je Insel), und
  **unter einem aufgestellten Vogelhaus** liegt morgens mit halber Chance
  eine. Damit tut auch das Vogelhaus endlich etwas: Es war bis dahin das
  einzige Stück Deko ganz ohne Wirkung – ein Haus für Vögel, in dem nie einer
  war, während über der Insel welche fliegen. Ein Test prüft seither, dass
  **jeder Gegenstand eine Quelle hat**, dass kein Auftragspool auf
  Unerreichbares zeigt und dass jede Fundbuchreihe vollmachbar ist.
* **Fanggrößen.** Jeder Fisch wird gemessen, und das Fundbuch merkt sich
  deinen größten je Art – dazu, wie groß die Art überhaupt werden kann.
  Bessere Angel und ein perfekter Anhieb schieben die Größe nach oben, den
  Rest macht der Zufall (zwei Würfe gemittelt, damit Ausreißer selten
  bleiben). Vorher war jede Sardine dieselbe Sardine: einmal gefangen,
  abgehakt, danach nur noch Ware.
* **Werkzeuge.** Hand, Axt, Spitzhacke, Schaufel, Angel, Kescher – jeweils in
  mehreren Stufen. Bessere Werkzeuge geben mehr Ertrag, größere Reichweite und
  öffnen neue Bereiche. Die vierten Stufen hängen an Meilensteinen und kosten
  Edelsteine; darauf arbeitet man hin.
* **Die Gießkanne.** Das einzige Werkzeug, das du nicht von Anfang an hast –
  gebaut wird sie beim ersten Meilenstein. Ein gegossenes Beet wächst einen Tag
  schneller, einmal am Tag, ohne Strafe fürs Auslassen: Wie der ganze Garten
  ist sie ein Angebot, keine Pflicht. Solange sie nicht gebaut ist, steht sie
  auch nicht in der Werkzeugleiste.
* **Blumen, die beieinanderstehen.** Der Garten konnte lange nur eines: säen,
  warten, ernten. **Wo** die Beete lagen, war gleichgültig – vier verstreute
  Blumenbeete brachten dasselbe wie vier nebeneinander.

  Jetzt lohnt sich das Beieinander. Wer Blumenbeete nebeneinander legt, kann
  beim Ernten eine **Dämmerblume** bekommen: die eine Blume im Spiel, die
  nirgends wild wächst. Man findet sie nicht, man zieht sie. Jedes Nachbarbeet
  erhöht die Chance (etwa 9 % je Beet, bei vieren ist Schluss), und **Gießen
  legt noch etwas drauf** – gezählt wird dabei, ob das Beet *während des
  Wachsens* gegossen wurde, nicht am Erntetag. Das ist kein Detail: Ein reifes
  Beet lässt sich gar nicht mehr gießen, eine Regel am Erntetag wäre also ein
  toter Zweig gewesen.

  Wie alles im Garten eine **Chance, keine Bedingung**: Die normale Ernte
  kommt so oder so, und ein schlecht gelegter Garten ist keine Strafe. Die
  Kanne hatte damit übrigens ihre zweite Aufgabe – die interessantere.
* **Lagerfeuer.** Verbrannte Fundstücke geben Glut (Handwerkswährung) und lassen
  das Feuer wachsen – und mit ihm den farbigen Kreis und die Rezeptliste.
* **Vier Bereiche.** Lager & Strand (Start) → Wald (umgestürzter Baumstamm,
  braucht Axt Stufe 2) → Klippen (Brückenbausatz an der Werkbank) → **Stille
  Insel** (draußen im Wasser, nur mit dem Ruderboot – und das fährt erst, wenn
  die Insel zur Hälfte wieder Farbe hat).

  Die Insel ist der einzige Meilenstein, der die WELT ändert: eine ganze Ecke
  dazu, mit einem siebten Geist (Wanda Watt, eigene Bitten, eigene
  Erinnerungskette) und dichten Vorkommen an Erz, Muscheln und Treibholz –
  genau dem, was die letzten Werkzeugstufen brauchen. Die beiden Boote liegen
  von Anfang an an ihren Ufern; bis dahin sind sie vertäut. So weiß man, dass
  da draußen etwas ist, lange bevor man hinkommt.

  **Sie ist lang, nicht rund, und zerfällt in zwei Hälften.** Anfangs bestand
  sie aus einem einzigen Kern und hatte gemessen 199 begehbare Kacheln – gegen
  1227 im Lager, 881 im Wald und 526 auf den Klippen. Man stand nach zwei
  Minuten wieder am Boot. Nach Osten kann sie nicht wachsen, dort liegt der
  Sund; nach Norden und Süden war dagegen alles frei, von 96 Zeilen benutzte
  sie sechzehn. Jetzt sind es **rund 900 Kacheln über 67 Zeilen** – mehr als
  die Klippen. Die Fahrt von einem Ende zum anderen ist selbst schon etwas.

  Im Norden liegt das **Hochland**: Felsboden statt Gras, Kiefern statt
  Birken. Dort und nur dort stehen **Granitblöcke (ab Spitzhacke Stufe 3)**
  und **Geoden (Stufe 4)**, aus denen Granit und Bernstein kommen. Beides gibt
  es sonst nirgends, und an der Werkbank warten drei Rezepte darauf –
  Steinlaterne, Bernsteinlicht und zwölf Wegstücke auf einmal. Damit haben die
  beiden letzten Werkzeugstufen einen Grund über sich hinaus, und ein Bereich,
  den man mit dem Werkzeug vom ersten Tag leerräumt, wäre bloß größer gewesen.

  Getrennt wird sie von einem **ausgehobenen Sund**, nicht von Glück: Fluss und
  Kanal werden aus demselben Grund gegraben. Über zweihundert Seeds gemessen
  wächst ohne ihn bei einem eine Landbrücke hinüber – ein Test prüft genau
  das, mit allen zweihundert.
* **Angeln** als kleines Geschicklichkeitsspiel, mit Tag- und Nachtfischen.
* **Einrichten, das zählt.** **25 Stücke Deko** – zehn von der Werkbank,
  fünfzehn aus dem Katalog: Tisch und Stühle, Hängematte, Schaukel,
  Feuerschale, Lichterkette, Papierlampion, Pflanzkübel, Rankgitter,
  Vogeltränke, Bienenkorb, Vogelscheuche, Wetterhahn, Bastmatte und Zierteich.
  Alles lässt sich frei aufstellen – der Vorschaupunkt weicht Bäumen und
  Steinen selbst aus, statt „Kein Platz" zu sagen; nur wenn im Umkreis wirklich
  nichts frei ist, steht der Grund dabei.

  Was flach am Boden liegt – Teppich, Bastmatte, Zierteich –, wird **vor allem
  Aufrechten** gezeichnet, im selben Durchgang wie die Grundstücksgrenze. Nach
  der Tiefe einsortiert lag der Teppich über Seli, sobald sie darauf stand.

  Laternen, Feuerschale, Lampion und Lichterkette leuchten nachts. Jedes Stück
  trägt **Gemütlichkeitspunkte** – ein Zaunstück 1, ein Blumenbeet 5, ein
  Zierteich 12. Was im Umkreis eines Geistes steht, zählt für ihn zusammen: um
  ihn wächst ein zusätzlicher Farbkreis, und seine Aufgaben zahlen besser. Vier
  Stufen, im Aufgabenfenster als Punktreihe zu sehen. Packt man die Deko wieder
  ein, schrumpft der Kreis auch wieder – anders als die Farbe aus erledigten
  Aufgaben, die bleibt.
* **Deko, die etwas tut.** Charmepunkte sind eine echte Wirkung, aber für
  jedes Stück dieselbe: Nachgezählt hing bei **17 von 26** aufstellbaren
  Stücken außer dem Punktwert nichts. Bei den meisten ist das ehrlich – ein
  Tisch ist ein Tisch. Bei einigen stand der Name für ein Versprechen, das
  nichts einlöste. Die haben jetzt genau das, was ihr Name behauptet:

  | | |
  |---|---|
  | **Bienenkorb** | Beete in Reichweite wachsen einen Schritt schneller |
  | **Rankgitter** | Beete in Reichweite geben ein Stück mehr her |
  | **Vogeltränke**, **Zierteich** | Vögel und Falter kommen näher |
  | **Vogelscheuche** | hält sie fern – auch die, die du fangen willst |
  | **Wetterhahn** | sagt an, was für ein Wetter morgen wird |
  | **Windspiel** | klingt, wenn du vorbeigehst |
  | **Zierteich** | das Haustier legt sich gern daneben |

  Die Reichweite ist rund zweieinhalb Kacheln – groß genug, dass ein Korb
  mehrere Beete deckt, klein genug, dass man ihn **wohin** stellen muss.
  Jede Sorte zählt nur einmal, egal wie viele danebenstehen: Sonst wäre die
  beste Einrichtung ein Feld aus zwanzig Bienenkörben. Tränke und
  Vogelscheuche heben einander auf, und genau daran sieht man, dass beide
  etwas tun. Beim Aufstellen sagt eine Zeile, wie viele Beete in Reichweite
  liegen – ohne sie wäre die Wirkung ein Gerücht.

  Nachgerechnet ist der Bienenkorb **genau so stark wie die Gießkanne**, die
  es längst gibt (Beeren zwei Tage → einer, Mondsaat vier → zwei). Er führt
  also nichts Neues ein, sondern nimmt den täglichen Handgriff ab – für 380
  Münzen und die Entscheidung, wohin er kommt. Der Wetterhahn kostet gar
  keine Maschinerie: Das Wetter hing immer schon nur an Insel, Tag und
  Jahreszeit und steht damit fest, lange bevor der Tag beginnt.
* **Leben ringsum – und zum Anfassen.** Tags Falter, nachts Motten, die zum
  nächsten Licht streben, dazu Vögel und springende Fische. Fünf Falterarten
  lassen sich mit dem **Kescher** fangen: drei am Tag, zwei nur nachts, jede
  in ihrer eigenen Farbe und unterschiedlich selten. Der seltenste ist der
  wertvollste; ein Test wacht darüber. Ein Schlag daneben schreckt die Falter
  ringsum auf, und sie fliegen zwei Sekunden lang doppelt so schnell – blind
  wischen lohnt sich nicht. Ist kein Falter in der Nähe, verhält sich der
  Kescher wie jedes andere Werkzeug und man kann damit reden und aufheben.
* **Wetter.** Manche Tage bringen Regen, manche Nebel, im Winter fällt
  **Schnee** – langsam und seitlich pendelnd, damit er nicht wie weißer Regen
  aussieht. Was ein Tag bekommt, hängt an Insel, Tagnummer und **Jahreszeit**
  und steht fest, bevor der Tag beginnt. Die Mischung unterscheidet sich
  deutlich: im Sommer sind drei von vier Tagen klar, im Herbst liegt an fast
  jedem dritten Nebel, im Winter schneit es an fast jedem dritten. Und es
  zählt: **Mondblumen** wachsen nur nachts, **Regenpilze** nur an Regentagen,
  **Nebelkristalle** nur im Nebel. Sie verschwinden wieder, sobald die
  Bedingung fällt, und sind die Zutaten der Mondlaterne. Genau deshalb hat
  jede Jahreszeit von jedem Wetter mindestens jeden zehnten Tag: Eine Sitzung
  spielt immer in EINER Jahreszeit – der Kalender dreht sich mit dem echten
  Datum, ein Inseltag dauert vierzehn Minuten –, und ein Winter mit fünf
  Prozent Regen wäre für den Regenpilz keine Seltenheit mehr, sondern eine
  Sperre. Ein Test rechnet das nach. Was für ein Tag ist, steht oben im
  Aufgabenfenster: Jahreszeit und Wetter nebeneinander.
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
  Jahreszeit steht davor fest. Darüber liegt ein schwacher Farbschleier über
  dem ganzen Bild, der auch Sand, Wasser und Fels mitnimmt; der Frühling hat
  keinen, er ist der Maßstab, an dem man die anderen drei erkennt. Keine
  davon ist grau; das Spiel handelt vom Zurückbringen der Farbe, ein trister
  Winter widerspräche genau dem – ein Test rechnet das für Palette *und*
  Schleier nach.

  Und die Jahreszeit ist nicht nur Farbe. Sie mischt das **Wetter** (siehe
  oben), sie entscheidet, **wer unterwegs ist** – der Goldkarpfen steht im
  Frühling und Sommer im Fluss, der Mondfisch im Herbst und Winter im Meer,
  der Admiral fliegt im Sommer und Herbst, der Mondfalter im Frühling und
  Sommer –, und sie ändert, **wie schnell nachwächst**, was man abschlägt:
  Ein Baum steht im Frühling nach zwei Tagen wieder da, im Winter nach vier.
  Die tägliche Runde bleibt davon unberührt: Beeren, Kräuter, Pilze, Blumen,
  Muscheln und Treibholz kommen in jeder Jahreszeit jeden Tag. Im Fundbuch
  steht bei den vier saisonalen Arten, wann es sie gibt, und ein Geist bittet
  nie um etwas, das gerade gar nicht da ist – dieselbe Regel wie bei der
  Feder, nur zeitlich. Zum Wechsel kommt ein Brief, der in einem Nebensatz
  sagt, was sich ändert.
* **Geburtstage.** Jeder der sieben Geister hat einen – an einem echten
  Kalendertag, über sieben verschiedene Monate verteilt, also im Mittel alle
  sieben Wochen einer. Das Geburtstagskind sagt es **einmal** am Tag, bevor
  es zum Tagesgeschäft übergeht (beim vierten Ansprechen wäre der Geburtstag
  eine Sperre vor der Abgabe), und oben im Aufgabenfenster steht, wer heute
  dran ist und was er am liebsten mag. Ein Geschenk zählt an dem Tag
  **dreifach** – an Glut und an Farbe.

  Das ist bewusst viel: Ein Geburtstag, an dem sich nichts ändert, ist ein
  Datum. Es gibt ihn je Geist einmal im Jahr, und man kann ihn nicht
  herbeispielen – er kommt, wenn er kommt. Ein Test rechnet nach, dass jeder
  Geist genau einmal im Jahr drankommt, dass keine zwei am selben Tag sind
  und dass kein Datum erwischt wurde, das es gar nicht jedes Jahr gibt (der
  30. Juni ist in Ordnung, der 29. Februar wäre es nicht).
* **Sternenstaub.** Am Morgen nach einer **Sternennacht** liegt er am
  Spülsaum – ein seltener Fund, wertvoll wie eine Handvoll Fische.

  Die Sternschnuppen selbst bleiben, was sie sind: ein Bild ohne Aufgabe.
  Man muss nachts nicht draußen sein, nichts drücken und nichts treffen. Wer
  durchgeschlafen hat, findet am Morgen dasselbe. Das ist der Unterschied
  zwischen „schön, dass du aufgepasst hast" und „du hättest aufpassen
  müssen" – und der Grund, warum die Belohnung einen Tag später kommt und
  nicht im selben Moment.

  Er wächst **nicht** nach wie Treibholz, sondern wird vom Ereignis ausgelegt
  und am nächsten Morgen wieder abgeräumt. Sonst läge nach dem zehnten
  Sternenhimmel überall Staub, und das Seltene wäre Kulisse.
* **Ein Tagesereignis je Inseltag.** Markttag (der Händler zahlt ein
  Drittel mehr), Fundtag (doppelt so viele Grabstellen), Blütentag (die Insel
  blüht, morgen wieder vorbei), Falterzug (viel mehr Falter), Fischschwarm
  (eine Art beißt zwölfmal so oft – der einzige verlässliche Weg zu einem sehr
  seltenen Fisch) und die Sternennacht (Sternschnuppen, dreimal so viele
  Mondblumen). Etwa jeder vierte Tag hat bewusst keines: Wäre jeden Tag etwas
  Besonderes, wäre nichts mehr besonders. Es steht oben im Aufgabenfenster.

  Welches Ereignis kommt, hängt an **Kalendertag und Inseltag zusammen**. Der
  Kalendertag allein war ein Fehler, den man erst beim Spielen merkt: Ein
  Inseltag dauert 14 Minuten, wer einen Nachmittag spielt, schläft dreißigmal
  – und hatte dreißigmal denselben Falterzug. Gemessen ergaben 30 Inseltage an
  einem echten Tag **genau ein** Ereignis; die anderen fünf bekam man an
  diesem Tag nie zu sehen. Mit dem Inseltag in der Rechnung sind es fünf bis
  sechs verschiedene, und ein Test rechnet es nach.

  Was dabei erhalten bleibt: Zwei Leute, die am selben Kalendertag an ihrem
  Tag 7 stehen, erleben dasselbe – die Inselzahl steckt bewusst **nicht** mit
  drin. An die echte **Uhr** ist weiterhin nichts gebunden: Sonst liefen zwei
  Uhren gegeneinander (mittags auf der Insel, Mitternacht im Fenster), und wer
  abends spielt, käme an alles nicht heran, was vormittags passiert.
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
* **Die Karte zeigt den Weg.** Lagerfeuer, Geister, Fundstücke, Auftragsziele
  und du selbst standen von jeher darauf – die eigenen **Grundstücke**, das
  **Zuhause** und die beiden **Boote** nicht. Damit stand die Bucht auf der
  Insel nur im Fenstertext, und der einzige Weg hinüber stand nirgends: Wer
  sie gekauft hatte, suchte sie auf 96 mal 96 Kacheln. Die Boote erscheinen
  erst, wenn die Insel offen ist; vorher wären sie ein Hinweis auf eine Tür,
  die noch zu ist.
* **Fundstücke sind zu sehen.** Wo auf der Karte ein goldener Punkt liegt,
  steht in der Welt ein Flämmchen über den Baumkronen, dazu ein warmer Schein
  und ein Ring auf dem Boden. Der Punkt auf der Karte ist ein Versprechen, das
  am Ort eingelöst wird.

## Die Geister

Sieben Stück, alle wortkarg: Flämmchen (Lagerfeuer), Mira Moos (Wiese),
Käpt'n Kiesel (Strand), Bruno Borke (Wald), Tobi Tüftler (Werkstatt),
Nelly Nadel (Klippen) und Wanda Watt (Stille Insel). Jeder vergibt höchstens
drei Bitten gleichzeitig, und jede davon gilt drei bis fünf Tage.

Wanda ist die einzige, die man erst freischalten muss – sie gehört zum
Meilenstein bei 50 %. Ihre Kette endet wie bei allen anderen mit einem
Andenken, das es nur bei ihr gibt: eine Muschelkette.

## Seli

Die Spielfigur: blonde Frau, schulterlanger Bob unter einer Hutkrempe, blaues
Oberteil, Halstuch, Rock, Stiefel. Zehn Bilder – drei Blickrichtungen zu je drei
Schritten und eine Sitzhaltung. Sie und die anderen Lebewesen bleiben immer
farbig, auch wo die Insel noch blass ist.

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
Testbrowser gemessen. Abdunkeln reicht völlig.

**Die Küste** hat einen dreistufigen Saum: Wasser dicht am Land wird fast weiß,
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
npm test               # 586 Tests: Welt, Wetter, Jahreszeiten, Deko, Wünsche, Ausruhen, Geplauder, Küche, Feste, der Wanderer …
npm run test:browser   # 357 Prüfungen im echten Browser, mit Bildschirmfotos
npm run test:all
```

Der Browsertest legt Bildschirmfotos unter `.screenshots/` ab.

Dazu drei Werkzeuge zum Hinsehen:

```bash
node tests/browser/atlas.mjs           # alle Grafiken als Übersichtsbild
node tests/browser/atlas.mjs --only=player_,bench --zoom=2.5  # eine Auswahl, groß
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
beim Verlassen der Seite), unter `seli-grove:save:v1`. Im privaten Modus von
Safari fällt das Spiel still auf einen Speicher im Arbeitsspeicher zurück – die
Einstellungen weisen darauf hin.

**Spielstände aus früheren Fassungen ziehen von selbst um.** Sie lagen unter
einem anderen Schlüssel; beim ersten Start wird ein Stand von dort einmal
übernommen und der alte Platz geräumt. Ein Name im Browser-Speicher ist eine
**Adresse**, kein Titel – deshalb wird umgezogen und nicht umbenannt. Wer
umbenennt, wirft damit jeden vorhandenen Spielstand weg.

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
