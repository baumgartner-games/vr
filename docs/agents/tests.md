# Tests

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

**Getestet wird nur, was kritisch ist.** `npm test` fährt 26 Suiten mit gut
400 Tests in **unter zehn Sekunden**. Gewünscht: _„Wir sollten echt nur das
notwendigste testen."_

## Was bleibt

Ein Test steht hier nur, wenn ein Fehler darin **im Browser nicht auffällt**
oder **etwas zerstört, das man nicht zurückbekommt** — und nicht, weil sich eine
Funktion gut testen lässt.

| Bereich             | Suiten                                                                                                                             | Warum                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Navigation          | `nav/navTile`, `nav/navGraph`, `nav/navPath`, `nav/cellGrid`, `nav/cellRoute`, `nav/navAgent`, `haunting/navmesh/route`, `haunting/navmesh/pathSmoothing`, `haunting/stationNavigation` | Ein falscher Weg sieht aus wie ein dummer Bot, nicht wie ein Fehler; dass jeder Raum der Station erreichbar ist, sieht man in keiner einzelnen Runde. |
| Greifen             | `portal/grabReach`, `core/grabSettings`                                                                                            | Die Mathematik hinter dem Fern- und Handgriff, Vorzeichen eingeschlossen.                                                    |
| Boden und Portale   | `physics/playerFooting`, `portal/portalFall`, `portal/portalCrossing`                                                              | Durch den Boden fallen, bei jeder Bildrate; durch ein Portal fallen oder an seiner Wand hängen bleiben.                     |
| Speicherstände      | `grid/worldFile`, `grid/worldStore`, `core/configCode`, `portal/tools/gearCodec`, `npc/characterStore`                             | Ein Fehler im Format kostet gespeicherte Welten, Codes und Figuren — das ist nicht zurückzuholen.                            |
| Netz                | `net/hello`, `net/host`, `haunting/net`                                                                                            | Zwei Spieler, die sich nicht verstehen, testet niemand allein vor dem Rechner.                                               |
| App-Hülle           | `core/swRoutes`, `core/staleBuild`, `core/appVersion`, `worlds/index`                                                              | Geht das schief, startet nach einem Deploy gar nichts mehr — oder eine alte Fassung geht nicht weg.                         |

Die Navigation ist dabei selbst ausgedünnt: `stationNavigation` rechnet eine
Station statt drei und zehn Eingänge statt dreißig, und der Schrägen-Test in
`cellGrid` läuft acht Richtungen bei zwei Tempi und misst nur noch das
Schlimmste statt eines `expect` je Schritt (vorher 7 s, jetzt einen Bruchteil).

## Was weg ist

Am 3. Oktober 2026 sind **456 Suiten mit knapp 6000 Tests** gegangen: Küche,
Restaurant, Haunting-Regeln, Monster, Karten, Menüs, Hände, Werkzeuge,
Kart, Klettern, Schilder, Bauen und alles Übrige. Sie liefen zusammen eine
Minute in jedem CI-Lauf, und die Hälfte davon steckte im Haunting.

Wer an einer dieser Stellen rechnet und den alten Beleg haben will, holt ihn
aus der Geschichte — die Kapitel in `docs/agents/` nennen viele davon noch mit
Namen:

```
git show 49dfe5b:src/worlds/haunting/house.test.ts
git ls-tree -r --name-only 49dfe5b src | grep '\.test\.ts$'
```

Davor waren schon die vierzehn Rundensimulationen der langsamen Suite
(`test:slow`, gut acht Minuten) gegangen: `git show 336f520:…`.

## Die Regel, die bleibt

**Eine neue Suite muss sich die Aufnahme verdienen** — sie gehört in eine Zeile
der Tabelle oben, oder sie kommt nicht hinein. Wer eine aufnimmt, wiegt sie:
mehr als ein paar Sekunden heißt, sie rechnet zu viel. Nachsehen, wohin die Zeit
geht:

```
npx jest --silent --json --outputFile=/tmp/t.json
node -e "JSON.parse(require('fs').readFileSync('/tmp/t.json')).testResults \
  .map(r => [r.endTime - r.startTime, r.name]).sort((a,b) => b[0]-a[0]) \
  .slice(0,10).forEach(([ms,n]) => console.log((ms/1000).toFixed(1)+'s', n))"
```

## Rapier

Zwei Suiten starten wirklich Rapier (`physics/playerFooting`,
`portal/portalFall`): Ob ein Körper durch einen Boden fällt, entscheidet keine
Rechnung, sondern eine Kollisionsmaske in der Engine, und ein Nachbau davon
prüfte nur den Nachbau. Alles andere kommt ohne three.js-Renderer, WebGL,
WebXR und wasm aus.

## Die CI

Im Job `Build` (`.github/workflows/deploy.yml`) laufen bei jedem Push nur noch
`npm test` und `npm run build` — und der Build ist `tsc --noEmit && vite build`,
ein Typfehler bricht also dort ab; ein eigener Typecheck-Schritt war doppelt.

**Lint und Format laufen einmal die Woche** (`.github/workflows/lint.yml`,
montags früh, auch von Hand startbar). Den zuletzt grün geprüften Commit hält
`.github/lint-commit` fest; hat sich seitdem nichts geändert, läuft nichts. Ist
der Lauf rot, wird die Datei nicht fortgeschrieben, und GitHub meldet es —
repariert wird mit `npm run lint` und `npm run format`.

WebXR braucht einen sicheren Kontext. `localhost` reicht; für die Brille im
selben WLAN am einfachsten über HTTPS-Tunnel oder `vite dev --https` testen.
