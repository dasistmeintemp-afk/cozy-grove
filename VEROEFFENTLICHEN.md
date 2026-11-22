# Seli Grove ins Netz stellen

Ziel: eine feste Adresse, die du einmal verschickst. Danach genügt ein Push,
und wer den Link öffnet, sieht die neue Fassung.

---

## Vorweg: Dein Projekt steht öffentlich auf GitHub

`github.com/dasistmeintemp-afk/cozy-grove` ist derzeit **public**. Jeder
kann den Quelltext lesen, und seit `web/index.html` dazugekommen ist, kann
auch jeder das Spiel direkt von dort laden. Das widerspricht dem, was du
wolltest.

Umstellen dauert eine Minute und ändert an der Veröffentlichung unten
nichts – Cloudflare kommt auch an ein privates Projekt heran:

1. `github.com/dasistmeintemp-afk/cozy-grove` öffnen
2. **Settings** (oben rechts im Reiter-Band)
3. ganz nach unten zu **Danger Zone**
4. **Change repository visibility** → **Make private** → den
   Projektnamen zur Bestätigung eintippen

Mach das am besten **vor** Schritt 3 weiter unten. Stellst du später um,
musst du Cloudflare die Berechtigung noch einmal erteilen.

---

## Was im Projekt dafür schon vorbereitet ist

`npm run bundle` schreibt zwei Dinge:

- `dist/seli-grove.html` – die Einzeldatei zum Verschicken per Mail. Liegt
  bewusst **außerhalb** der Versionsverwaltung.
- `web/index.html` – **der veröffentlichte Stand**, zusammen mit
  `web/_headers`. Liegt **mit** im Projekt.

Dass die fertige Datei mit eingecheckt wird, ist eine Entscheidung gegen den
naheliegenden Weg: Der Hoster muss dadurch **nichts bauen**, sondern nur
Dateien kopieren. Ein Bauschritt bei ihm müsste Node starten und vorher die
Entwicklungswerkzeuge nachladen – darunter Playwright, das dabei ganze
Browser herunterlädt. Das kann fehlschlagen, und zwar ausgerechnet dann,
wenn du gerade verschicken willst. Der Preis ist eine 1,6 MB große Datei je
Stand in der Versionsgeschichte. Das ist der ruhigere Handel.

`web/_headers` setzt `Cache-Control: no-cache`. Das heißt nicht „nicht
speichern", sondern „vor dem Anzeigen nachfragen, ob es etwas Neueres gibt".
Ohne das zeigte ein Browser, der schon einmal da war, tagelang den alten
Stand – und die feste Adresse wäre sinnlos.

Drei Prüfungen in `tests/unit/web.test.js` passen darauf auf. Die mittlere
baut das Spiel bei jedem `npm test` nach nebenan und vergleicht Zeichen für
Zeichen. Passt `web/index.html` nicht mehr zum Quelltext, schlägt sie fehl.
Damit kann hinter dem Link nicht stillschweigend eine alte Fassung stehen.

---

## Einrichten bei Cloudflare Pages

Kostenlos, ohne Zahlungsdaten. Rechne mit zehn Minuten beim ersten Mal.

Die Benennungen in der Oberfläche ändern sich hin und wieder. Wenn etwas
leicht anders heißt, such nach dem sinngleichen Begriff – die Reihenfolge
stimmt.

### Schritt 1 – Konto anlegen

`dash.cloudflare.com/sign-up` öffnen, Mailadresse und Passwort eingeben,
Bestätigungsmail abrufen, auf den Link klicken.

Du wirst danach vermutlich gefragt, ob du eine Domain hinzufügen willst.
**Überspringen.** Du brauchst keine.

### Schritt 2 – Projekt anlegen

1. In der linken Seitenleiste **Workers & Pages** anklicken.
2. Knopf **Create** (oder **Create application**).
3. Den Reiter **Pages** wählen – nicht Workers.
4. **Connect to Git** anklicken.

> Falls du stattdessen nur „Upload assets" siehst: Du bist im falschen
> Reiter. Pages und Workers sehen sich inzwischen sehr ähnlich.

### Schritt 3 – GitHub verbinden

1. **GitHub** wählen, dann **Add account** bzw. **Connect GitHub**.
2. GitHub fragt nach der Erlaubnis. Wähle **Only select repositories** und
   setze den Haken bei `cozy-grove`. (Alle Projekte freizugeben geht auch,
   ist aber unnötig.)
3. **Install & Authorize**. Du landest wieder bei Cloudflare.
4. In der Liste `dasistmeintemp-afk/cozy-grove` auswählen → **Begin setup**.

> Wenn das Projekt in der Liste fehlt: In GitHub unter
> **Settings → Applications → Cloudflare Pages → Configure** den Haken
> nachtragen.

### Schritt 4 – Die vier Felder

Jetzt kommt der einzige Bildschirm, auf den es ankommt:

| Feld | Eintrag |
|---|---|
| **Project name** | `seli-grove` |
| **Production branch** | `claude/cozy-grove-web-game-9ol6vn` |
| **Framework preset** | `None` |
| **Build command** | **leer lassen** |
| **Build output directory** | `web` |

Zu zweien davon lohnt ein Wort:

**Production branch.** Die Voreinstellung ist `main` – dort liegt die
Arbeit aber nicht. Der Zweig oben ist der, auf dem entwickelt wird. Nimmst
du `main`, baut Cloudflare etwas Altes oder gar nichts.

**Build command leer.** Genau das ist der Grund, warum `web/` mit im
Projekt liegt. Verlangt das Feld partout eine Eingabe, schreib `echo ok`
hinein – das tut nichts und erfüllt die Form.

Dann **Save and Deploy**.

### Schritt 5 – Warten und nachsehen

Es läuft ein Protokoll durch, meist unter einer Minute. Am Ende steht
**Success** und darunter die Adresse:

```
https://seli-grove.pages.dev
```

Öffne sie. Du solltest den Startbildschirm von Seli Grove sehen.

---

## Ab jetzt

Nichts weiter. Jeder Push auf `claude/cozy-grove-web-game-9ol6vn` wird
automatisch übernommen, meist in unter einer Minute. Wer den Link schon hat,
bekommt beim nächsten Neuladen die neue Fassung – dafür sorgt `_headers`.

Wenn du selbst etwas änderst und von Hand pushst, denk an `npm run bundle`
vorher. Vergisst du es, meldet `npm test` es dir.

---

## Wenn etwas nicht klappt

**Die Seite zeigt eine Dateiliste statt des Spiels.**
Das Output directory stimmt nicht. Projekt → **Settings** → **Builds &
deployments** → `web` eintragen → unter **Deployments** den letzten Eintrag
→ **Retry deployment**.

**„404 – Nothing is here yet".**
Entweder der falsche Zweig, oder der Build lief noch nicht durch. Unter
**Deployments** steht, welcher Zweig gebaut wurde.

**Der Build schlägt fehl und redet von npm oder Node.**
Dann steht doch etwas im Build-Command-Feld. Leeren, neu auslösen.

**Dein Freund sieht noch die alte Fassung.**
Einmal hart neu laden (Strg+Umschalt+R bzw. Cmd+Umschalt+R). Passiert das
öfter, stimmt etwas mit `web/_headers` nicht – die Datei muss im
veröffentlichten Ordner liegen, nicht daneben.

**Der Spielstand ist weg.**
Spielstände hängen an der Adresse. Der Stand aus einer per Mail
verschickten Datei zieht nicht mit auf die Webseite um – ein Mal neu
anfangen ist unvermeidlich. Ab dann bleibt er.

---

## Wie privat ist das?

Die Adresse ist **nicht auffindbar, aber nicht geschützt**: Wer den Link
hat, kommt rein. Suchmaschinen finden sie nur, wenn jemand irgendwo darauf
verlinkt. Für einen Link an eine Person reicht das.

Wenn es wirklich nur bestimmte Leute sehen sollen, geht das bei Cloudflare
kostenlos:

1. Linke Seitenleiste → **Zero Trust** (beim ersten Mal wird ein Team-Name
   abgefragt; der freie Tarif reicht, Zahlungsdaten können dabei abgefragt
   werden, es wird aber nichts abgebucht)
2. **Access** → **Applications** → **Add an application** →
   **Self-hosted**
3. Domain: `seli-grove.pages.dev`
4. Policy: Action **Allow**, Include → **Emails** → die Adressen eintragen,
   die reindürfen

Wer die Seite dann öffnet, bekommt einen einmaligen Code per Mail. Das ist
echter Schutz, kostet aber beim Empfänger jedes Mal einen Zwischenschritt.

---

## Eigene Adresse

Wenn dir eine Domain gehört: Projekt → **Custom domains** → **Set up a
custom domain**. Gehört die Domain schon zu deinem Cloudflare-Konto, ist es
ein Klick; sonst nennt Cloudflare dir den Eintrag, den du beim Anbieter der
Domain hinterlegen musst. Danach heißt es `seli-grove.de` statt
`…pages.dev`.

---

## Netlify als Alternative

Dieselbe Idee, falls du Cloudflare nicht magst: „Add new site" → „Import an
existing project" → GitHub → Projekt wählen → Branch
`claude/cozy-grove-web-game-9ol6vn`, Build command leer, Publish directory
`web`. Die Adresse ist dann ein Zufallsname wie
`cozy-marzipan-8f3a1c.netlify.app`, den du unter **Site configuration →
Change site name** umbenennen kannst. Passwortschutz kostet dort Geld,
Cloudflare Access nicht.
