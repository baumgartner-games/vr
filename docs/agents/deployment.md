# Deployment

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

`.github/workflows/deploy.yml` baut bei **jedem Push** (und in Pull Requests)
und lädt das Ergebnis als Artefakt hoch. Pushes auf `main` werden zusätzlich
auf den Branch `gh-pages` veröffentlicht — bewusst ohne GitHub-Pages-
Environment, damit keine Environment-Protection dazwischenfunkt. Nötig ist
nur die einmalige Einstellung:

> Repository → Settings → Pages → Source: **Deploy from a branch** →
> Branch `gh-pages`, Ordner `/ (root)`

Der Basispfad kommt aus `BASE_PATH` (im Workflow `/<repo-name>/`), lokal wird
von `/` ausgegangen.

## Wenn eine Seite aus einem Build läuft, den es nicht mehr gibt

Jede Welt wird erst beim Betreten nachgeladen — ein `import()` je Eintrag in
`worlds/index.ts`, also ein eigener Chunk je Welt, und jeder Chunk trägt den
Hash seines Inhalts im Dateinamen. Der Deploy schreibt `gh-pages` komplett neu;
danach gibt es die alten Dateinamen nicht mehr.

Eine Seite, die vorher geöffnet wurde, läuft trotzdem weiter — und in einer
Brille bleibt eine Seite schnell einen halben Tag offen, während zwischendurch
dreimal deployt wurde. Nur greift dann jeder Wechsel in eine Welt, die in
**dieser Sitzung** noch nicht geladen war, ins Leere: Der Server antwortet mit
404, das `import()` scheitert, und man bleibt stehen, wo man ist. Welten, die
schon einmal geladen waren, wechseln weiter, denn ihr Modul liegt im Speicher
des Browsers. Daran erkennt man den Fehler, und er sieht überhaupt nicht nach
einem Deploy aus, sondern nach kaputtem Routing:

> „Ins Portal Labor komme ich immer zurück, aber aus einer bestimmten Welt
> komme ich manchmal in keine andere mehr rein.“

Heilen lässt sich das nur durch **Neuladen** — eine neue `index.html` bringt
die neuen Dateinamen mit. Genau das passiert jetzt von selbst: `App.goTo`
meldet einen gescheiterten Ladeversuch über den Haken `onWorldFailed` an die
Seite, `main.ts` fragt `core/staleBuild.ts` (mit Test), ob der Fehler _dieser_
Fehler war, schreibt die gewünschte Welt in die Adresse und lädt neu. Man
steht danach dort, wo man hinwollte, statt dort, wo man war.

**Höchstens einmal je Welt**, vermerkt im `sessionStorage`: Nach dem Neuladen
steht die Welt in der Adresse und wird sofort wieder geladen — scheitert sie
erneut (kein Netz, ein echter Fehler im Modul), lädt die Seite sonst wieder
neu, und der Spieler sieht nie etwas anderes als den Ladebildschirm. Gibt es
den `sessionStorage` nicht, wird lieber gar nicht neu geladen: Eine Seite in
einer Neulade-Schleife ist schlimmer als eine, die einmal eine Welt nicht
öffnet.

Dazu gehört eine zweite Bremse in `App.goTo` selbst: **Es ist immer nur die
letzte Ladung gültig.** Ein dynamischer Import dauert, und wer im Menü zweimal
hintereinander tippt, hat zwei davon unterwegs; ohne die Marke räumte die
zweite die Welt der ersten ab, während deren `init` noch mitten im Aufbauen
war. Heraus kam eine halbe Welt, in der nichts mehr ging — und der Weg dorthin
war ein doppelter Tipper.

## Was ein Deploy für den Service Worker bedeutet

Seit die Seite als App installierbar ist (`src/sw.ts`), liegt ein Teil von ihr
im Telefon und nicht nur auf `gh-pages`. Drei Zusagen halten das zusammen, und
alle drei ziehen in dieselbe Richtung wie der Abschnitt darüber:

- **Seiten kommen erst aus dem Netz.** Eine `index.html` aus dem Speicher wäre
  genau der alte Build, gegen den `core/staleBuild.ts` ankämpft — nur diesmal
  ohne 404, an dem man ihn merkt. Erst wenn das Netz nichts hat, antwortet der
  Speicher.
- **Jeder Build hat seinen eigenen Speicher** (`bgvr-shell-<BUILD_ID>`, in der
  CI die ersten zwölf Stellen von `GITHUB_SHA`). Der neue Service Worker
  löscht beim Aktivieren die Speicher aller anderen: Ein halber alter Build
  kann nicht liegenbleiben.
- **Der Wechsel passiert beim nächsten Start**, nicht mitten in der Sitzung
  (kein `skipWaiting`). In der Zwischenzeit läuft die Seite aus dem alten
  Speicher weiter — was sie neu anfordert, hat ohnehin einen neuen Namen und
  kommt aus dem Netz.

Wer den Service Worker beim Entwickeln vom Hals haben will, braucht nichts zu
tun: Er meldet sich nur im fertigen Build an (`core/pwa.ts`). Wer ihn
ausprobieren will, nimmt `npm run build && npm run preview` — und wer ihn
loswerden will, nachdem er ihn einmal hatte, wirft ihn in den
Entwicklerwerkzeugen unter _Application → Service Workers_ hinaus.
