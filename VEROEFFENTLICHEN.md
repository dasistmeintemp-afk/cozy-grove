# Seli Grove ins Netz stellen

Ziel: eine feste Adresse, die du einmal verschickst. Danach genügt ein Push,
und wer den Link öffnet, sieht die neue Fassung.

## Was im Projekt dafür vorbereitet ist

`npm run bundle` schreibt zwei Dinge:

- `dist/seli-grove.html` – die Einzeldatei zum Verschicken per Mail. Liegt
  bewusst außerhalb der Versionsverwaltung.
- `web/index.html` – **der veröffentlichte Stand.** Liegt mit im Projekt,
  zusammen mit `web/_headers`.

Dass die fertige Datei mit eingecheckt wird, ist eine bewusste Entscheidung:
Der Webhoster muss dadurch **nichts bauen**, sondern nur Dateien kopieren.
Ein Bauschritt bei ihm müsste Node starten und vorher die
Entwicklungswerkzeuge nachladen – darunter Playwright, das dabei ganze
Browser herunterlädt. Das kann fehlschlagen, und zwar ausgerechnet dann,
wenn du gerade verschicken willst. Der Preis ist eine 1,6 MB große Datei je
Stand in der Versionsgeschichte. Das ist der ruhigere Handel.

`web/_headers` setzt `Cache-Control: no-cache`. Das heißt nicht „nicht
speichern", sondern „vor dem Anzeigen nachfragen, ob es etwas Neueres gibt".
Ohne das zeigte ein Browser, der schon einmal da war, tagelang den alten
Stand – und der ganze Sinn der Adresse wäre hin.

Eine Prüfung (`tests/unit/web.test.js`) baut bei jedem `npm test` nach
nebenan und vergleicht. Wenn `web/index.html` nicht mehr zum Quelltext
passt, schlägt sie fehl. Damit kann der Link nicht stillschweigend eine alte
Fassung zeigen.

## Einrichten – einmalig, etwa fünf Minuten

Bei **Cloudflare Pages**, kostenlos, ohne Zahlungsdaten:

1. `dash.cloudflare.com` – Konto anlegen.
2. Links **Workers & Pages** → **Create** → Reiter **Pages** → **Connect to
   Git**.
3. GitHub verbinden und `dasistmeintemp-afk/cozy-grove` auswählen.
4. Im Formular:
   - **Project name:** `seli-grove` (bestimmt die Adresse)
   - **Production branch:** `claude/cozy-grove-web-game-9ol6vn`
   - **Framework preset:** `None`
   - **Build command:** leer lassen. Falls das Feld eine Eingabe verlangt:
     `echo ok`
   - **Build output directory:** `web`
5. **Save and Deploy.**

Danach liegt das Spiel unter `https://seli-grove.pages.dev`. Jeder weitere
Push auf diesen Zweig wird automatisch übernommen, meist in unter einer
Minute.

**Netlify** geht genauso: „Add new site" → „Import an existing project",
dieselben drei Felder (Branch, Build command leer, Publish directory `web`).

## Wie privat ist das?

Die Adresse ist **nicht auffindbar**, aber nicht geschützt: Wer den Link
hat, kommt rein. Für die meisten Fälle reicht das.

Wenn es wirklich nur bestimmte Leute sehen sollen, geht das bei Cloudflare
kostenlos: **Zero Trust** → **Access** → **Applications** → Self-hosted,
Domain `seli-grove.pages.dev`, als Regel „Emails" und die Adressen
eintragen. Wer die Seite öffnet, bekommt dann einen Anmeldecode per Mail.
Das sind noch einmal ein paar Minuten, und es macht das Verschicken etwas
umständlicher.

## Eigene Adresse

Wenn dir eine Domain gehört, kannst du sie bei Cloudflare unter **Custom
domains** davorhängen – dann heißt es `seli-grove.de` statt `…pages.dev`.
