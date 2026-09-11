# HANDOVER

Ein Abschnitt je Paket (`BOUNDARIES.md`). Beim Zusammenführen werden die
Abschnitte untereinander gehängt.

## Auftrag „Startseite der Runde: Lobby, drei Wege, Rettung aus dem Boden"

Branch `claude/haunting-startseite-raum-jo76qa`. Der Wunsch in zwei Sätzen:
Drei Spieler (Brille, Handy, Handy) geben **Name und denselben Raum-Code** ein
und stehen dann in **einer Lobby**; erst dort wählt jeder **Enter VR**, **Web
3D** oder **2D Einsatzzentrale**, und alle bleiben im selben Raum. Dazu soll
der Brillenspieler sich am Handgelenk aus dem Boden holen können.

### Was drin ist

- **Zwei Gesichter der Startseite** (`index.html`, `style.css`, `main.ts`):
  `main.ts` setzt unter `#haunting` `data-landing="haunting"` auf `#landing`;
  `only-generic` versteckt Spielwiese-Knöpfe, „Zusammen spielen" und Hinweise,
  `only-haunting` zeigt `#haunt-start`. Versteckt, nicht abgebaut — `NetPanel`
  braucht seine Felder.
- **Erst die Lobby, dann die Wege** (`#haunt-lobby`, `refreshHaunt`,
  `renderHauntPeers`): Die Liste der Geräte im Raum (ich zuerst, Name und
  Gerät, „schon drin") und die drei Knöpfe erscheinen erst mit der
  Verbindung. Geprüft mit drei Tabs über `?net=local`: Jeder sieht die zwei
  anderen, alle landen in `crew-test`, der Bildschirm als Techniker (3D), die
  Handys als Zuschauer des Technikers (2D).
- **Der Raum aus der Adresse** (`worlds/haunting/net.hauntRoomFrom`, mit
  Test): `?room=` geputzt, sonst `HAUNT_ROOM`. Seite und Welt
  (`HauntingWorld.joinTable`) lesen dieselbe Zeile; ein getippter Code geht
  beim Verbinden als `?room=` in die Adresse zurück.
- **Die Welt lädt erst mit dem Knopf.** `joinTable` verbindet beim Betreten,
  wenn keine Verbindung steht; die Seite sammelt jetzt erst alle in der Lobby
  und lädt dann (`startHaunting`). Für die Brille wird die XR-Sitzung vorher
  aus dem Klick heraus angefragt.
- **Was dieses Gerät ist** (`rules/lobby.arriveAs`, mit Test): „Web 3D" →
  Techniker im Schiff; „2D Einsatzzentrale" → Karte von oben, gemerkter Platz
  bleibt, nur ein gemerkter Techniker wird Zuschauer des Technikers.
- **Feststecken? Zurück auf den Boden** (`HauntingWorld.unstickPlayer`,
  `haunt:rescue`): mitten ins eigene Zimmer (`safeRoomSpawn`), draußen in die
  Zentrale; `ShipExperience.leaveLocker` ist dafür öffentlich. Geprüft im
  Browser: aus `y = −2` in der Cafeteria auf deren Mitte, von unter dem
  Vorplatz auf `COMMAND_HOME`.
- `App.setPlayerName` ist öffentlich: verbunden und den Namen doch noch
  geändert heißt umbenennen, nicht neu verbinden.
- Der Browser-Smoke betritt die Welt über Verbinden → `#haunt-centre`.

- **Nachtrag (zweiter PR): Der Techniker am Bildschirm zählt.** Befund des
  Besitzers: Client 1 „Web 3D", Client 2 „2D Einsatzzentrale" — beim Start aus
  der Zentrale spielte ein Bot den Techniker, und Client 1 schien nicht in der
  Lobby zu sein. Zwei Ursachen: „Web 3D" stand erst nach einem Tipp auf den
  Reiter „Techniker" am Stock (`flatTechnician`), und `startRound`,
  `lockTechnician`, `technicianEyes`, `technicianFocus` und die Karte kannten
  nur `peer.role === 'vr'` als Menschen im Anzug. Jetzt: `init` setzt
  `flatTechnician` aus der Lobby; `wearsSuit`/`roomHasTechnician`/`suitPeer`
  zählen Brille **oder** Herzschlag. Geprüft mit zwei Tabs (`?net=local`):
  Client 1 sofort am Stock und Gastgeber, Client 2 sieht „Techniker: Mensch"
  und Client 1 auf der Karte, der Start aus der Zentrale läuft bei Client 1
  ohne Bot, Client 2 wird Zuschauer der Netzrunde und sieht 3,2 m Bewegung von
  Client 1. Dazu **„Ich" auf jeder Zeile der Tafel** (`[data-setup-me]`) —
  außer auf der des Technikers, sobald ihn jemand trägt: Dann steht dort
  **der Name des Menschen im Anzug** (`[data-setup-suit]`, `suitName`)
  statt Ich · Mensch · Bot, weil Brille und „Web 3D" direkt als Techniker
  hereinkommen.
  Hinweis für Browser-Tests: Zwei SwiftShader-Szenen in einem Headless-Browser
  lassen die Hintergrundseite fast stehen (ein Bild je Sekunde, dt-Klammer
  50 ms) — der Herzschlag reißt dann ab. Der Test treibt `App.frame` deshalb
  per Timer.

### Was offen bleibt

- Die Welt liest die Lobby beim Aufbau aus dem Speicher. Käme sie einmal
  schon geladen auf die Startseite (heute nicht: sie lädt erst mit dem Knopf),
  müsste `setupRole` sie noch einmal lesen.
- „Enter VR" ließ sich nur ohne Brille prüfen (Playwright hat keine): Der Weg
  fragt die Sitzung aus dem Klick an und verbindet daneben; ob der Quest-Browser
  die Geste über das `await` hinweg gelten lässt, zeigt erst die Brille.

## Auftrag „Techniker-Wegsuche, Runden-Kopf, Kisten, Archiv-Funk"

Branch `claude/techniker-bot-routing-ui-eq3tfd`. Eine Liste aus einer Session
am Telefon: fünfzehn Punkte, von „der Bot läuft dem Monster durch die Arme" bis
„die Rollenwahl ist unpraktisch". Abgearbeitet ist, was für sich steht; was an
der Sitzordnung im Netz hängt, steht unter **Was offen bleibt** — mit dem
Grund, warum es nicht nebenbei geht.

### Was drin ist

- **Die Scheu des fliehenden Technikers hat einen harten Kern**
  (`stationNavigation.RouteAvoid.core`, `CORE_WEIGHT` = 1000;
  `technicianBot.DREAD_CORE` = Schlagreichweite + eine Kachel). Der weiche
  Trichter kostete vier je Rasterschritt — einen Meter Umweg, und den zahlt ein
  Fliehender jederzeit. Dazu die zwei Löcher, ohne die der Kern nichts getan
  hätte: Der **Schnurzug** zog den Bogen hinterher wieder gerade (`coreCrossed`
  macht den Kern für die Glättung zur Wand), und eine einmal **geplante Route**
  blieb stehen, während das Monster weiterlief
  (`navmesh/flatNavigator.crossesCore`, `CORE_TOLERANCE`, `CORE_HOLD`).
- **Der Kopf einer Runde ist eine Spalte aus drei Zeilen** (`.flat__top`):
  Rollenknöpfe mit dem Zahnrad am Ende, darunter links Auftrag und Uhr,
  darunter die Sprungknöpfe. Der Rollenstreifen (`views/roleStrip.ts`) hing
  vorher an einem eigenen Abstand von oben und lag über „Zum Spieler"; er ist
  jetzt die erste Zeile des Kopfs und verschwindet mit ihm, sobald ein Overlay
  offen ist. Neu in der Zeile: **Zuschauer** (`RoleStripHost.extras`,
  `FlatMode.setWatching`) — Bot am Stock, Karte allwissend.
- **Die Erinnerung an die letzte Position** (`rules/ghosts.ts`) wird über der
  Dunkelheit gezeichnet statt darunter und verfällt nach `GHOST_TTL` = 10 s
  statt 25.
- **Eine Kiste aufzuklappen kostet fünf Sekunden** (`rules/chore.ts`): Balken,
  Stillstehen, Umschauen erlaubt, Weggehen bricht ab. In beiden Welten und für
  beide Bots. **Und vor einer Tür steht keine Kiste mehr**
  (`stationLayout.CARGO_DOOR_DEPTH`).
- **Der Archivar aus Zahlen funkt** (`rules/archiveRadio.ts`) — wo das Teil
  liegt, und mit dem Teil in der Hand, wohin damit und welche Liste dazugehört.
  Nur, wo am Archiv wirklich ein Bot rechnet; nur bei Lagewechsel.
- **Der Ansichtswechsel mitten in der Runde** (`rules/lobby.viewSwap`): Der
  Knopf wurde dem Zuschauer angeboten und dann abgewiesen (`switchView` stand
  zweimal im selben Objektliteral, das unbedingte gewann), und mit der
  Bot-Runde in 2D hielt die Welt sich für „schon in 3D". Jetzt darf auch der
  Zuschauer wechseln — die Vorführung fängt dabei auf der anderen Seite von
  vorn an, weil sie kein Stand ist, der reist.
- **„Monster: Mensch" sagt jetzt, wenn niemand am Steuer sitzt.** Die Routine
  weiterzurechnen war richtig; dass es niemand erfuhr, war der Fehler.

- **Die Tafel hat fünf Plätze** (`rules/roundSetup.ts`, zweiter PR dieses
  Auftrags): Techniker / Rot / Gelb / Blau / Monster, je Mensch · Bot · Aus,
  die drei Fähigkeiten als Lampen je Platz, und **kein „Ich"** — wer ich
  bin, ist die Wahl der Lobby (`LobbyChoice.me`, `MyRole`), die Reiterzeile
  ist diese Wahl (`stationUi.choose`), dazu „Zuschauer: Techniker" und
  „Zuschauer: Alles". Die Stühle heißen Farben (`stations.StationId`),
  Archiv / Schalttafel / Späher sind Ansichten, die ein Stuhl je nach Lampen
  aufschlägt. Das Häkchen „Testen" ist weg (Monster auf „Aus"). Die Brille
  stellt dieselbe Tafel ein (`haunt:seat-*`, `haunt:powers`).
- **Ziele nur mit Archiv** (`goalPrecision`): ohne die Fähigkeit kein
  Kompass, kein Saum, keine Liste — in 2D und 3D. Schalten nur mit
  Schalttafel (`applyFlip`).
- **Wer den Platz Monster nimmt, steuert es** — auch der Gastgeber (sein
  Port speist die eigene Runde); ohne Brille im Raum auf der Karte von oben.
- **3D:** Schutzschrank ohne Code (ein Tipp), von innen ein Geist mit
  Lüftungsschlitzen (`ghostLocker`); Farbband der Kiste unter dem Schild
  (`BAND_AT` 0,4); Atem als weiße Fläche (`helmetCondensation.ts`);
  Schonfrist sechs Sekunden und das Monster hält vier davon inne
  (`HIT_GRACE`, `HIT_LULL`, `monsterRoutine.rest`, beide Welten); ein
  Wiedereinstieg landet auf dem Boden (`movePlayerTo` sucht ihn mit dem
  eigenen Strahl).
- **2D:** Im Schrank bleibt nur der Lichtkreis (`map/visibility.ts`).
- **Zuschauer über dem Deck** (`watchLens.ts`, `views/watchRole.ts`): Stock
  und Finger fliegen, zwei Finger und Rad zoomen, „Zurück über das Deck";
  **„Durch seine Augen"** setzt die Kamera in den Kopf des Technikers
  (Brillenpose mit Drehung, sonst Ort und Gierwinkel in Augenhöhe) —
  „Zuschauer: Techniker" fängt so an.
- **Ein Optionsmenü für beide Welten** (`map/optionsMenu.ts`): Das Zahnrad
  der 2D-Welt und „⚙ Optionen" im Schiff (Browser, nie Brille) zeichnen
  dieselbe Liste mit denselben Worten; „Rolle wechseln", „2D von oben" und
  „Missionsmenü" sind darin aufgegangen.

### Was offen bleibt

- **Das Live-Bild eines 2D-Technikers** hat keine Neigung: Der Stand trägt
  nur `{x, z, yaw}` (`HauntState.technician`); die Brille schickt ihre ganze
  Kopfpose. Wer beim Zuschauen auch das Hoch- und Runterschauen eines
  Desktop-Technikers will, muss `pose` des Peers lesen statt des Stands —
  `technicianEyes` nimmt heute die Brillenpose zuerst, dann den Stand.
- **Das Panel des Desktop-Technikers** hat neben dem Optionsmenü noch seine
  Handgriffe („Mission, Ausrüstung & Testdeck"): Hände, Medkit, Ablegen, was
  vor einem liegt, und das Testdeck. Das ist die Steuerung und kein Menü; ob
  davon noch etwas ins Zahnrad wandern soll, entscheidet der Besitzer.

## Auftrag „Einsatzzentrale nach dem Merge von #93"

Branch `claude/3d-lighting-hud-0zbxk7`. Zwei Linien sind hier
zusammengekommen: die Struktur aus #93 (Rollen-Registry, Karten statt
Sonderansichten, keine Drohne) und die Wünsche des Besitzers aus dieser
Session (Lobby als Reiterzeile, Fähigkeiten statt Plätze, Tafel, Zuschauer-
Linse, Archiv-Ziele erst mit dem Teil in der Hand). **Die Struktur gewinnt,
die Wünsche gewinnen inhaltlich** — was #93 als Seite gebaut hat, ist
geblieben; was es weggelassen hat, steht jetzt in der Rolle, zu der es gehört,
und nicht wieder in `stationUi.ts`.

### Was drin ist

- **`stationUi.ts` bleibt der Rahmen** (699 Zeilen aus `main`, jetzt gut 800):
  Reiterzeile als Rollenwahl (`writeBar`), Auftragsstreifen, Aufbau-Seite,
  Endkarte — und ein Platz, in den die Rolle aus der Registry gehängt wird.
  Zurück kamen aus diesem Branch: die **zwei Häkchen**, die **Verteilung** mit
  der Spalte „Ich", der **eine Startknopf**, `take`/`choose`/`switchRights`/
  `NO_ROLE_HINT`, `roleLabel`. Weg blieben: Titel, `.lobby__seats`,
  Absichts-Kacheln, „Bot-Runde ansehen", „Mission spielen (2D)", „Test ohne
  Monster (2D)". `StationHost` hat `botRound`, `mission`, `test` und
  `flatMode` verloren (niemand ruft sie mehr) und `vr`, `switchView`,
  `archiveDesk` zurückbekommen; `lure` ist weg.
- **`ABILITY_STATIONS` zeigt jetzt auf drei Rollen** statt auf zwei Geräte:
  Späher → `scout`, Schalttafel → `hack`, Archiv → `archive`. Seit #93 hat
  jede Fähigkeit ihre eigene Karte; „Einsatzkontrolle" ist deshalb nur noch
  der **Name** dafür, Späher und Schalttafel zugleich zu halten, und kein
  Gerät mit zwei Reitern mehr.
- **`RoleHost` hat zwei Griffe und zwei neue Auskünfte.** `lure` ist weg
  (Schallköder gestrichen, `HauntState.loud` gibt es nicht mehr); dafür:
  - `switches()` — die Tafel, so weit der Sicherungskasten sie freigibt
    (`visibleSwitches(spec.switches, state.fuse)`). Sie steht beim Wirt und
    nicht im Grundriss, weil `spec.switches` **alle** kennt und eine Rolle,
    die sich die Liste selbst zusammensuchte, genau das verriete, was der
    Kasten verbergen soll.
  - `ledger()` — die Buchführung der Runde (`rules/archiveGoals.ArchiveState`:
    Uhr, `taken`, `done`, `crew.inventory`, `dropped`). Sie steht **neben**
    dem Snapshot, weil der Snapshot das *Bild* der Station ist: Auf einer
    Kiste steht ihr Kennzeichen und nie der Teilename, und was jemand in der
    Hand hält, steht dort überhaupt nicht. Ohne sie könnte der Archivar nicht
    unterscheiden, ob ein Teil getragen wird oder irgendwo liegt — und genau
    daran hängt, was er verraten darf.
- **Die Tafel ist zurück, bei der Schalttafel** (`views/panelRole.ts`): ein
  Blatt über der Karte, das der Knopf „Tafel" oben rechts aufschlägt
  (`is-sheet`, dieselbe Form wie die Raumakte des Archivars). Eine Zeile je
  Schalter mit seiner Beschriftung, abkühlende Schotts grün, mit Restzeit und
  abgeschaltet. **Entschieden**: Blatt statt Streifen unter der Karte — zwölf
  Schalter unter einem Grundriss sind auf einem Telefon hochkant entweder ein
  Grundriss von drei Zentimetern oder eine Liste, die man nicht zu Ende rollt.
  Das CSS ist von `stationDashboard.css` (`.haunt__switch*`) nach
  `views/views.css` (`.role__switch*`) gewandert: Die Tafel läuft auch über
  der 2D-Welt, wo es keine Einsatzzentrale gibt.
- **Das Archiv verrät das Ziel erst mit dem Teil in der Hand**
  (`rules/archiveGoals.ts` statt eines eigenen `jobs()`): die Kiste immer, mit
  dem Namen des Teils daran; Linie, „hierher", Reparaturraum und Freigabecode
  erst, wenn der Techniker trägt; ein abgelegtes Teil nach `DROPPED_SEEN`
  = 5 s. Die Karte zeigt **keine Lampen** mehr (`lights: false`), und die
  Raumakte liegt **ganzseitig ohne Karte dahinter** (`is-sheet`) und rollt.
  Nebenbei behoben: Die Paarung Kiste ↔ Auftrag lief über die **Beschriftung**
  der Kiste und fand in der 2D-Welt deshalb nie etwas — dort heißt eine Kiste
  „Kiste 2 · blau" und nicht wie ihr Inhalt. Jetzt über die Kennung aus
  `rules/cargo.ts`.
- **Der Zuschauer schlüpft in die Rollen der anderen** (`views/watchRole.ts`,
  `watchLens.ts`). **Entschieden**: Die Linse gehört der Ansicht, nicht
  `stationUi.ts` — `StationUi.watchLens` und `shownStation` bleiben als API
  für die Welt, lesen sie aber aus der Ansicht. Gezeigt wird die **angemeldete
  Ansicht** der gewählten Rolle aus der Registry, mit einem Wirt, dessen
  `door`/`light` `''` zurückgeben; es gibt keinen Nachbau, der auseinanderlaufen
  könnte. `WatchSeat` hat `drone` verloren und `control` in `panel` umbenannt
  (`seatStation` zeigt jetzt auf Rollenkennungen).
- **Der Rollenstreifen der 2D-Welt fragt `switchRights`**
  (`RoleStripHost.rights`, `inCentre: false`): Wer in 2D spielt, ist der
  Techniker und wechselt nur in einer Test-Runde. Die Knöpfe bleiben stehen
  und werden abgeschaltet, mit dem Grund als Titel — ein Streifen, der in der
  einen Runde da ist und in der nächsten fehlt, ist einer, den man sucht.
- **Aufgeräumt**: der Drohnen-Block, `.haunt__view`/`.haunt__vtools`/
  `.haunt__vbtn*`, `.haunt__scout`, `.haunt__sheet`, `.haunt__rooms`,
  `.haunt__tasks`, `.haunt__fact*`, `.haunt__watch-*`, `.haunt__tabs` und die
  zweispaltige Archivseite sind aus `haunting.css` und
  `stationDashboard.css` verschwunden (rund 22 KB). **Dabei gefunden**: Der
  Merge hatte `.haunt.is-view .haunt__body { display: none; }` aus der
  Drohnenzeit stehen gelassen — das hätte jede Rollenkarte unsichtbar
  gemacht, sobald das alte Regelwerk wieder gegriffen hätte.

### Was offen bleibt

- **Der Sicherungskasten wirkt in der 2D-Welt nie.** `FlatRound` setzt
  `fuse: false` und legt ihn nie um; die Tafel zeigt dort also dauerhaft nur
  die sichtbare Hälfte. In der 3D-Welt gibt es den Kasten als Gegenstand.
- **Über das Netz sagt ein Telefon weiterhin *eine* Rolle an**
  (`Claim.station`), nicht seine Fähigkeiten. Wer zwei hält, meldet die des
  zuletzt gewählten Reiters. Die feinere Ansage gehört in `net.ts`.
- **Der Zuschauer sieht das Archiv nur, wenn er selbst ein Zimmer aufschlägt.**
  Das alte „Blatt folgt dem Techniker" (`followArchive`) ist mit der alten
  Zuschauerseite weggefallen; die aufgeschlagene Rollenansicht hat keinen
  Grund, dem Techniker zu folgen, und der Zuschauer sieht ihn ja nicht.

## Auftrag „Rollen aus der Registry, Karten statt Sonderansichten, Drohne gestrichen"

Branch `claude/non-vr-roles-mapview-m0gjby` (Claude Code im Browser).

### Was drin ist

- **Paket `views/` angelegt** (`BOUNDARIES.md` Abschnitt 2). Je Rolle eine
  Datei plus `<rolle>.register.ts`: `archiveRole`, `panelRole`, `scoutRole`,
  `watchRole`, dazu `roleShell.ts` (Kleinkram), `archiveDesk.ts` (der Vertrag
  für das Loch in die 3D-Welt), `roleStrip.ts` (Rollenwechsel über der
  2D-Welt) und `views.css`. `registry/legacyRoles.register.ts` ist damit weg —
  es gibt keine Platzhalter-Rollen mehr.
- **Die drei Nicht-VR-Rollen zeichnen dieselbe `MapView` wie die 2D-Welt**,
  jede mit eigenen Schichten. Archiv: ganze Karte mit Fracht und Zielräumen,
  Linie von der Kiste zur Konsole, „hierher" beim getragenen Teil, Raumakte
  per Tipp auf ein Zimmer (Codes groß, Bild des Raums: in 3D das Loch mit
  Zoom/Wisch, in 2D eine herangezoomte Karte), **keine Missionsliste**.
  Schalttafel: Karte ohne Wesen, Türen und Lampen per Tipp (der Schallköder
  ist inzwischen wieder gestrichen, siehe „Einsatzzentrale nach dem Merge von
  #93"). Späher: grüner Techniker- und roter
  Monster-Punkt, neue Peilung alle 3,5 s, dazwischen verblassen, **keine
  Interpolation**.
- **`stationUi.ts` baut die Seite aus der Registry.** Der `if (station === …)`-
  Verteiler mit fünf Seitenmethoden (Radarschirm, Aktenblatt, Schalterliste,
  Cockpit, Zuschauerzeilen), der Späher-Canvas, das EKG, die Reiter, der
  Raumwähler, die Bild-Werkzeugecke und die Panel-Form sind weg; übrig sind
  Kopfzeile, Auftragsstreifen, Geräteübersicht und Endkarte. Die Kacheln der
  Übersicht kommen aus `listRoles()`.
- **`stations.ts` ist nur noch die Sitzordnung** (`{ id, shared? }`). Name,
  Zeile und „Sieht:" stehen bei der Rolle; `StationFacts.view` ist weg (das
  sagt heute `RoleDefinition.surface`). `hack` ist eine echte Station statt
  eines Altnamens für `scout`.
- **`RoleHost` neu geschnitten**: `snapshot`, `spec`, `me`, `nameOf`,
  `door`/`light`/`lure` (die Griffe der Schalttafel, jeder mit seiner
  Antwortzeile), `notify`, `extra`. `flip`/`flyTo` sind weg. (`lure` ist
  inzwischen wieder weg, dafür kamen `ledger` und `switches` dazu — siehe
  „Einsatzzentrale nach dem Merge von #93".)
- **Rollenwechsel im 2D-Testmodus**: `views/roleStrip.ts` als Streifen über
  der Szene; die Rollen lesen dieselbe laufende `FlatRound`
  (`FlatMode.roleHost()`), nichts wird neu aufgebaut. `FlatRound.lure()` kam
  dazu — ein Schallköder, der über das Hörmodell ruft, solange er läuft
  (`LURE_PULSE`), statt über eine Sonderregel. (Auch der ist inzwischen wieder
  weg.)
- **Die Drohne ist gestrichen**: Rolle, Ansicht, Körper, Kamera, Flug,
  Netznachricht `kind: 'drone'` (`DroneState`, `readDrone`, `droneMessage`),
  `DRONE_HOME`, `DRONE_PROFILE`, Hangar-Ring, `MapEntityKind`/`MapLight`-Sorte
  `drone`, `flatArt.drawDrone` und das CSS dazu.
- **`droneRoute.ts` → `navmesh/route.ts`** (Paket `nav`): `RoutePose`,
  `RoutePath`, `stepAlong`, `routeLength`, `turnTowards`, `wrapAngle`,
  `shortestTurn`. Die Kachelvariante (`routeTo`, `tiles`, `tileAt`) und alles
  Drohnen-Eigene (Flughöhe, `droneFov`, Lampenladung, `HOP_TIME`) sind weg;
  `stationRoute` hat damit auch seinen `height`-Parameter verloren, weil
  nichts mehr über Möbel hinwegfliegt.
- **CSS-Importe in Jest**: `moduleNameMapper` auf `tools/cssStub.cjs`. Vorher
  stand in jeder betroffenen Testdatei ein eigenes `jest.mock('./…css')`, und
  die vier Suiten, die eine neue Datei mitzogen, fielen mit
  „Unexpected token '.'" um.

### Was offen bleibt

- **Der Sicherungskasten hat keine Wirkung mehr.** `visibleSwitches` wird in
  `panelSwitch` mit `state.fuse` gefragt (vorher stand dort hart `true`),
  also ist die halbe Tafel wieder erst nach dem Kasten schaltbar. Ob das so
  gewollt ist oder ob die Karte alles schalten darf, entscheidet der
  Auftraggeber.
- **`archiveMap.ts`** (Altmodul samt Test) ist weiterhin unbenutzt. Es war
  schon vorher tot; gelöscht wurde es nicht, weil es außerhalb dieses
  Auftrags liegt.
- **Der Fernseher ist unverändert** — ausdrücklich so gewollt („Die Ansicht
  der Station mag ich aktuell"). Er ist die einzige Rolle mit `surface: '3d'`.

## Auftrag „Werkzeug-Icons, Möbel in 2D, Schall, Monster-Mechanik"

Branch `claude/3d-tool-rendering-mechanics-1t62ab` (Claude Code im Browser).
Sechs Punkte aus einer Nachricht; einer davon (die Strahlenschatten hinter
Fensterpfosten) blieb ausdrücklich beim Auftraggeber.

### Was drin ist

- **Werkzeug-Icons aus den 3D-Modellen** (`map/toolIcons.ts`). Das kleine
  3D-Bild im Loch war nie sichtbar — `.flat` liegt opak über dem
  WebGL-Canvas. Statt das Loch freizustellen wird jedes Modell
  (`buildToolModel`, aus `flatStage.ts` hierher gezogen) **einmal** in einen
  eigenen, winzigen Renderer gezeichnet, posterisiert und mit dunkler Kontur
  versehen (`comicPixels`, reine `ImageData`-Rechnung, ohne WebGL prüfbar),
  das Bild gepuffert, der GL-Kontext danach weggeworfen. `HauntingWorld`
  reicht den Puffer mit `FlatMode.setToolIcons` herein; die 2D-Welt hängt ein
  gewöhnliches Canvas in den Wechseln-Knopf und kennt weiterhin kein three.js.
  `map/flatStage.ts` und `FlatMode.viewport()` sind weg.
- **Möbel in der 2D-Szene** (`flatArt.drawFixture`, `flatScene`). Tische,
  Werkbänke und Inseln standen längst im Snapshot (`fixtures` aus
  `stationLayout`) — die Karte zeichnete sie, das Spielbild nicht. Jetzt malt
  die Szene sie in ihrer eigenen Handschrift: Grundfläche gedreht wie im
  Schiff, Körper nach Norden, hellere Deckfläche, konvexe Hülle als Umriss.
  Die Farben sind aus `marks.ts` nach `fixtureDimensions.MARK_COLORS`
  gewandert und `blockFor` aus `plan.ts` dazu — dieselbe Zahl für 3D-Klotz,
  Karte, Szene und Archiv, in einer Datei, die kein three.js kennt. Die Höhe
  kommt über `markHeight` aus der **Bausteinhöhe** (`grid/blocks.ts`), nicht
  aus `FIXTURE_CATALOG`: Das ist die Hülle für die Aufstellung, und ein
  Esstisch stünde damit 1,6 m hoch im Bild.
- **Schall über die freien Felder** (`map/noiseSpread.ts`). Die Wellen der
  Karte liefen als Kreis: ein Schritt durch drei Wände und über den leeren
  Weltraum. Jetzt flutet `spreadNoise` über die Bodenkacheln — Wand nein, Tür
  nur offen, Schächte leiten in beide Richtungen wie im Hörmodell —, und
  `tileGrid` baut das Feld einer Station einmal (Nachbarschaft mit
  Türkennung, Wände in Fächern je Kachel). `MapView` puffert die geflutete
  Welle je Geräusch, solange sie klingt. Gezeichnet wird sie jetzt **ganz
  hinten**, direkt auf den Böden — und wer das Monster spielt, sieht seine
  eigenen Wellen gar nicht.
- **Das Monster hört sich nicht mehr selbst** (`audio/soundscape.ts`,
  `selfMonster`): Wer es spielt, bekam seine eigenen Schritte, seinen Ruf und
  einen Herzschlag vor sich selbst auf die Ohren.
- **Zuschlagen ist kein Knopf mehr.** Wer in Reichweite steht, wird getroffen
  — von der KI wie von einem Spieler am Steuer (`FlatRound.tick`). Der
  verbliebene Knopf gilt immer dem **nächsten** Ding
  (`monsterHelm.nearestTarget`): Klappe, Kabine oder gesperrte Tür, nur eines
  auf einmal, hervorgehoben als pulsierender Ring auf der Karte
  (`MapViewOptions.highlight`). Kabinen darf das Monster überall aufreißen.
- **Keine Sperre hält ewig** (`rules/doorLocks.ts`): von Hand gesperrt
  `HOLD_RANGE` 8–10 s (gewürfelt), zugefallen `SLAM_HOLD` 20 s; darüber ein
  Balken auf Karte und Szene (`MapDoor.hold` über `MapSource.doorHold`). Und
  das Monster kann **am Riegel ziehen** (`pryLock`): der erste Zug nie, danach
  `pryChance` 0,3 und je Zug +0,15, im Takt `PRY_COOLDOWN` 1,1 s. Im Mittel
  gut drei Züge — weniger, als das Warten kostet. Auch die KI zieht so, statt
  vor Stahl für immer zu stehen.
- **Der Techniker geht dem Monster aus dem Weg** (`stationNavigation.ts`,
  `RouteAvoid`): eine Stelle, deren Umkreis je Rasterschritt Aufschlag kostet
  — teuer, nicht verboten, denn eine bewegliche Wand sperrt ihn irgendwann in
  einer Ecke ein. `FlatNavigator.aim` und `FlatWalker.input` reichen sie
  durch; der `TechnicianBot` setzt sie, solange er weiß, wo es steht
  (`DREAD_MEMORY`), **mit steigendem Gewicht, je weniger Leben er hat**. Sein
  Zwischenziel sucht er zwei Zimmer weit statt eines.

### Entscheidungen

- **Icons puffern statt das Loch freizustellen.** Ein freigestelltes Loch
  hätte die ganze 2D-Oberfläche durchsichtig machen müssen und wäre bei jedem
  neuen Panel wieder kaputtgegangen; ein von Hand gemaltes 2D-Icon wäre eine
  zweite Quelle für dasselbe Werkzeug. Der Puffer kostet einen GL-Kontext für
  die Dauer eines Bildes und danach nichts mehr.
- **Wellen über Kacheln statt über das Hörmodell.** `audio/hearing.ts`
  rechnet Wege über Türen und Schächte und gibt effektive Meter zurück — gut
  für Lautstärke, nutzlos für eine Fläche. `noiseSpread` flutet stattdessen
  und liefert je Kachel eine Weglänge; beide Modelle sagen dasselbe, nur in
  verschiedener Form.
- **Der Netzzähler `attack` bleibt im Protokoll** (`net.ts`), damit ein alter
  Gastgeber die `monster`-Nachricht noch versteht. Er wird nur nicht mehr
  hochgezählt.

### Offen

- Die **Strahlenschatten** hinter Fensterpfosten und Türblättern
  (`visibility.ts`, 5°-Strahlen) sind unverändert — der Auftraggeber will sie
  sich selbst ansehen.
- Der Snapshot der 3D-Welt führt weiterhin keine `noises()`; die Wellen
  laufen nur in der 2D-Runde. `MapDoor.hold` liefert die 3D-Welt dagegen jetzt
  (`HauntingWorld` über `worldSource.doorHold`).
- Die Icons werden beim ersten Zugriff gebacken, also im ersten Bild der
  2D-Welt. Auf einem langsamen Telefon ist das ein sichtbarer Ruckler; ein
  Backen beim Laden der Welt wäre der nächste Schritt.
- `NetMonsterPort.target()` rät aus dem Snapshot, was der Gastgeber
  entscheidet (Klappenreichweite über die Klappe statt über den Standplatz
  davor). Bei 10 Hz reicht das für die Beschriftung; ein Feld im Stand wäre
  genauer.

## Auftrag „Verteilung, Türsperre, 2D-Karte, Kompass"

Branch `claude/game-mechanics-2d-graphics-fxjdkh` (Claude Code im Browser).
Zwölf Wünsche aus einer Nachricht; hier steht je Wunsch, was gebaut wurde
und was offen blieb. Zusammengeführt mit `main` nach #83 (Lüftungsnetz,
Netz-Monster, `FlatNavigator`) — die Wege der Karte lesen jetzt
`FlatNavigator.remaining`, und in der gemeinsamen 2D-Runde teilen sich Tafel
am Telefon und Techniker am Stock eine Buchführung der Riegel
(`HauntingWorld.stepFlat`: `this.locks = round.locks`).

### Was drin ist

- **Türen** (`rules/doorLocks.ts`): gewollt gesperrt ist immer nur eine Tür
  (Tafel, Techniker vor Ort, 2D-Runde teilen den einen Riegel), zugefallene
  Türen halten `SLAM_HOLD` 20 s und gehen von selbst auf, die Tafel darf sie
  vorher freigeben. Buchführung beim Gastgeber, nichts auf der Leitung.
- **Verteilung** (`rules/roundSetup.ts`, `roundSetupPanel.ts`): Techniker,
  Monster, Plätze der Zentrale (Archivar, Schalttafel, Späher; Mensch oder
  Bot), im Van, im Optionsmenü der 2D-Welt und im Menü der Brille; die drei
  Kacheln sind Voreinstellungen. Bot-Plätze geben dem Techniker in 2D
  Peilung, Tafel-Tipp und Raumakte (`SoloPowers`, `FlatMode`).
- **2D-Karte** (`map/mapView.ts`): Brettspiel-Handschrift, Türen als
  Blätter mit Schloss, Möbel aus `stationLayout` (`MapSnapshot.fixtures`),
  Astronauten mit Händen, Geräusche als Wellen über die Kacheln
  (`MapSnapshot.noises`), Ziele mit Randdreiecken, Schachtbögen mit
  Zielraum, Option „Zielpfade".
- **Kabelrätsel in 2D**: Symbole wie an der Konsole; Overlay nur bei
  Änderung neu gebaut (Taps gingen verloren, weil die Knöpfe je Bild aus
  dem DOM fielen); Panels unter dem HUD der Seite.
- **Kompass** (`objectiveCompass.ts`) am Desktop; Ziele aus
  `HauntingWorld.objectives`.
- **Jest** in zwei Geschwindigkeiten (`jest.config.cjs`, `SLOW`; CI-Job
  `Slow tests`).

### Offen

- Der Kompass in der Brille: DOM ist dort unsichtbar; ein Streifen an der
  Kamera wie `ShipExperience.hud` wäre der Weg.
- Ein Monster aus Fleisch im Schiff (3D) gibt es über die Tafel nicht; die
  Station `monster` am Telefon (#83) bleibt der Weg dahin.
- Der Snapshot der 3D-Welt (`worldSource.ts`) führt Möbel, aber keine
  Geräuschwellen — die Telefone sehen sie erst, wenn `HauntingWorld` ein
  `noises()` liefert.
- ~~Die Wellen sind nicht gegen Wände beschnitten (nur auf Boden).~~
  Erledigt: `map/noiseSpread.ts` flutet über die freien Felder, durch Türen
  nur offen, für das Monster auch durch die Schächte.
- PR #79 (Rollenansichten `views/`) berührt `stationUi.ts` und
  `HauntingWorld.ts` an denselben Stellen wie dieser Auftrag (Van-Seite,
  StationHost); wer ihn mergt, nimmt die Kachel „Verteilung" und die drei
  Host-Haken (`setup`, `setSetup`, `startSetup`) mit.

## Auftrag „offene Handover-Punkte" — was aus den Fragen der Pakete wurde

Branch `claude/offene-handover-probleme-xhocfk` (Claude Code im Browser, PR
#83). Der Auftraggeber hat die offenen Fragen der Abschnitte unten
entschieden; hier steht je Entscheidung, was gebaut wurde, was dabei
entschieden wurde und was offen blieb. Die alten Abschnitte bleiben als
Geschichte stehen; erledigte Punkte sind dort mit „→ erledigt" markiert.

### Entscheidungen des Auftraggebers

- `ventPairs` nicht mehr nutzen, dafür `VentNet` — auch in 3D.
- Zustand `destroyed` in 3D: neues Modell, Funken alle paar Sekunden, nicht
  betretbar; der Bot meidet zerstörte Kabinen.
- Das Monster reißt nur Kabinen auf, in denen es den Spieler vermutet oder
  hineingehen sah.
- Timer (Sauerstoff) für alle Mitspieler, Anzug-Leben für den Anzug-Spieler
  und die Anzeigetafel.
- Die Uhr wird **nicht** angehalten; „Lebenserhaltung" heißt um, weil der
  Sauerstoff keine Reparatur ist.
- „Van" heißt überall „Einsatzzentrale".
- 2D-Welt auch im VR-/Weltmenü; 2D- und 3D-Welt beide netzfähig; die
  Monster-Rolle netzfähig.
- 2D-Monster mit Wegsuche — **eine** Navigation für beide Welten auf dem
  Kachelgitter.
- Raumschilder bleiben neben/über der Tür; Deckenhöhe geprüft, nicht geändert
  (siehe unten).

### 1. Lüftungsnetz in 3D (`vents/`, `HauntingWorld`)

**Was drin ist.** `vents/npcVentRide.ts` (`NpcVentRide`) bündelt Netz,
Fahrt (`VentTravel`) und Lotse (`VentPilot`) für einen Rapier-Körper: drei
Handgriffe (`hold`, `place`, `effect`), `step(dt, rider, autoExit)`,
`venting()` liefert das Signal für alle bestehenden Leser von
`crew.venting` (0,5…3 s, solange verborgen; sonst 0), `steer(...)` reicht an
den Lotsen durch. `HauntingWorld` hat `readonly vents`, `readonly ventRide`,
`npcRide` (je Spawn, weil Intervall und Tempo von der Monstersorte hängen),
`monsterDriver: MonsterDriver | null`, `monsterRider()`. Während der Fahrt
steht der Körper an der Einstiegsklappe (Geschwindigkeit null je Bild,
unsichtbar über `venting`), bei `arrived`/`exited` an `to.approach`.
`vents/ventArt.ts` bekam `VentFlapArt.setOpen(id)`: Lamellen kippen, der
Leuchtstreifen wird zum Balken — weiterhin zwei Draw-Calls. Der Snapshot der
3D-Welt liefert jetzt Klappen-Items (`open`) und `ventLinks`
(`WorldHandles.vents?()`). Die alten Wandgitter in `shipArt` und
`ventPairs`/`ventDestination` in `mission.ts` sind weg.

**Entscheidungen.**

- **Das Layout bleibt byte-identisch.** Die alten Reservierungen an jeder
  gemeinsamen Wand hatten alle Layouts geprägt; ohne sie ändern sich 2362
  Platzierungen und die Balance-Tests (800 Runden) fallen. Sie bleiben
  deshalb als Layoutregel (`stationLayout.ts`, `sharedWalls`), dazu je Klappe
  Standplatz-Gasse und Freiraum. Nur `vent-communications` rückte von `x: 8`
  nach `x: 5` (dieselbe Nordwand), weil dort in allen 100 Seeds die Wandkachel
  frei ist. Ergebnis: 0 abweichende Platzierungen.
- `ventPilot` bekam ein optionales `reach`: Der Rapier-Körper hält 1,15 m vor
  seinem Ziel (`npcBrain.reach`), mit dem alten 0,9 m wäre die KI in 3D nie
  eingestiegen (`NPC_VENT_REACH` 1,395 m).
- `vents/ventPlacement.ts` rechnet Klappenmaße ohne `map/geometry`, weil
  `stationLayout → ventGraph → geometry → roomGraph → stationLayout` ein
  Importkreis wäre.
- Wahrnehmung beim Ein-/Aussteigen (sichtbar, ~2 s) bleibt in 3D wie üblich
  über `threat.ts`; die 2D-Runde sperrt für die ganze Fahrt. Nicht angeglichen
  (kein Eingriff in `threat.ts`).

**Offen.** Klappenzustand für Mitspieler über das Netz (heute nur beim
Gastgeber sichtbar). Kein Hardware-Test des Einstiegs mit echtem Körper.

**Tests.** `vents/npcVentRide.test.ts`, `vents/ventArt.test.ts`,
`vents/worldVents.test.ts`; `stationLayout.test.ts` prüft über 100 Seeds den
Standplatz jeder Klappe.

### 2. Zerstörte Kabinen in 3D und der Verdachts-Angriff (`rules/`, `ShipExperience`, `monsterRoutine`)

**Was drin ist.** `HauntState.destroyed: string[]` ist die Liste (Raum-Ids),
`RoundRules` hält keine eigene mehr, sondern bekommt einen Getter auf den
Stand — damit geht sie ohne Abgleich über `stateMessage`, `adopt(next)` hat
sie automatisch, `worldSource`/`rules.status` stimmen auf Nicht-Gastgebern.
`STATION_PROTOCOL` wurde 6 (jetzt 7, Abschnitt 5). `fixtureModels.buildBrokenLocker()` ist das Wrack
(Blatt hängt schief, Pfosten geknickt, Beulen, Brandfleck, bernstein
glimmender Rahmen; `LOCKER_SIZE`, fünf Draw-Calls); `ShipExperience` tauscht
je Bild nach `state.destroyed`, funkt über `rules/cabinWreck.ts` (3–6 s,
eigener Takt je Wrack), lehnt Code und Eintritt ab (`ZERSTÖRT / KEIN
SCHUTZ`). `missionBot` überspringt Wracks; wird seine Kabine aufgerissen,
flieht er mit Funkspruch. **Routine:** `RoutineOutput.cabin` nennt die Kabine;
beim Schnüffeln am Schrank des verdächtigen Raums wechselt sie in `breach`
(0,5 s), reißt auf und kehrt in die Suche zurück — ohne Schrei, ohne
`savour`; die gesehene Kette bleibt. `breakLocker(at, room)` zerstört `room`,
Treffer nur bei `crew.hidden === room`; `flatRound` und `roundSim` analog.
Der alte Betrug (Schnüffeln wird nur bei besetztem Schrank zu `caught`) ist
raus.

**Balance.** Gemessen wie `botTraining.test.ts` (4×200 Runden): vorher
64,0 %, jetzt 63,5 %. `DEFAULT_TUNING` unangetastet.

**Offen.** `roundSim.ts` führt keine Wrack-Liste (Balance-Datei) — der
Sim-Techniker kann sich in einer aufgerissenen Kabine erneut verstecken. Das
Monster schnüffelt und reißt auch an bereits zerstörten Kabinen erneut
(0,5 s Verlust); ein `usable(id)` in `RoutineWorld` wäre der nächste Schritt.
Sichtprüfung des Wracks im Browser steht aus.

**Tests.** `rules/cabinWreck.test.ts`, `monsterRoutine.test.ts` (+2),
`rules/roundRules.test.ts` (+2), `missionBot.test.ts` (+2),
`fixtureModels.test.ts` (+1), `ShipExperience.test.ts` (+1),
`mission.test.ts`/`netReplay.test.ts` (Version 5 wird abgewiesen).

### 3. Uhr und Anzug für alle, Umbenennungen, 2D-Welt im Weltmenü

**Was drin ist.** `rules/roundHud.ts` (headless: Uhr `O₂ m:ss`, Pips,
Kabinenzeile, Warnung unter 60 s, Farben, Endtexte). `stationUi.writeQuest`
zeigt jedem Mitspieler Sauerstoff, Anzug-Leben als drei Pips und zerstörte
Kabinen; Klasse `is-low` unter einer Minute; „Radar & Anzug" hat eine
Zeile dazu; die Endkarte nennt den Grund (`MapRound.ending`). Die Uhr wird
per `[data-oxygen]` in-place geschrieben, damit die Seite nicht jede Sekunde
neu gebaut wird (das nähme dem Daumen den Schalter weg). `ShipExperience`:
Desktop-Titel mit Uhr; in der Brille ein schmaler Streifen an der Kamera
(0,34 × 0,085 m, einmal je Sekunde gemalt, nur bei laufender Mission).
`StationHost.round?()`/`ShipHost.round?()` liefern `rules.status(state)`.
`mission.ts`: „Nahrungsversorgung sichern" (Id `oxygen` bleibt).
„Van" → „Einsatzzentrale" in allen Texten und Kommentaren; Bezeichner
(`vanPage`, `buildVan`, `data-van`, Item-Id `van`) bleiben.
`HauntingWorld.menu()` hat „2D-Welt von oben" auch für die Rolle `vr`. Beim
Zusammenführen mit `main` (#82, „Checkbox als Einstellung") wurde der
Umschalter durch die Einstellung `flatWanted` ersetzt: Der Eintrag legt sie
um, gestartet wird mit Bot-Runde, Mission oder Test (`startRound`); in der
Brille gibt es keine Karte von oben, der Eintrag steht dort nur außerhalb
einer XR-Sitzung. Das Beenden der XR-Sitzung aus dem Menü heraus ist damit
entfallen.

**Deckenhöhe (nichts geändert).** `PLAN_WALL_H` 2,80 m, Wegweiser-Band
2,40–2,74 m: Türschild 2,437–2,703 m, Kreuzungsschild füllt das Band —
6 bis 10 cm Luft zur Decke, keine Kollision. Raumschilder bei 2,39 m ± 0,21
auf der türfreien Kachel. Eine höhere Decke nähme Wegweiser, Hüllenkasten
und Rohr mit (relativ zu `PLAN_WALL_H`), die Raumschilder, die Türleuchte
(`PLAN_DOOR_H + 0,18`) aber nicht — sie müssten dann auf `PLAN_WALL_H − 0,41`
umgehängt werden. Gewinn wäre nur Luft; geometrisch reicht es heute.

**Offen.** Streifen und XR-Ende sind nur mit Headset prüfbar. Der
Browser-Smoke kennt Checkbox und Menüeintrag nicht.

**Tests.** `rules/roundHud.test.ts`; `stationUi.test.ts` (+2).

### 4. Eine Navigation für beide Welten (`navmesh/flatNavigator.ts`)

**Was drin ist.** `FlatNavigator`: Route aus `stationRoute` auf dem
`NavGraph` von `StationTravelPlan.graph(spec, shut, false)` (also `housePlan`
mit inkrementellen Türupdates), Cursor, Neuplanung nur wenn das Ziel mehr
als 0,75 m gewandert, das Monster 0,75 m von der Route weg oder eine Sperre
geändert ist (13–15 Routen in 240 s Spielzeit). `flatRound.moveMonster`
fährt die Wegpunkte mit dem vorhandenen `stepMonster` ab; Warten vor einer
gesperrten Tür ohne Umweg (`FlatLeg.door`, 0,9 m davor) und „Holz splittert."
nach 2,5 s bleiben; Stahl hält. Der Techniker aus Zahlen (`flatWalk.ts`)
läuft über einen eigenen `FlatNavigator` mit `PLAYER_RADIUS`. Lotse,
Schachtfahrt und der `driver`-Pfad (Spieler am Steuer läuft direkt) sind
unverändert.

**Entscheidungen.**

- Eigener Adapter statt `StationNpcNavigator`: Der Headset-Navigator plant
  per Timer alle 0,55 s neu und kennt weder `route.complete` noch das Ziel;
  für eine 600-s-Runde headless wären das ~1000 Routen. Dieselbe Wegsuche,
  dieselbe Glättung, derselbe Graph — nur sparsamer geplant.
- **Fächerindex in `stationNavigation.segmentClear`** (kachelweise über die
  Wandquader statt `obstacles.some(...)`): ein Weg kostete 88 ms, davon 80 in
  `softenCorners`/`pullString`; jetzt ≈ 14 ms. Über 6272 Start-Ziel-Paare
  byteidentisch verglichen. Kommt 3D-Monster, Bot und Drohne genauso zugute.
- Kein Umbau von `slide`/`walkable`: Die 2D-Kollision bleibt die
  Raumgeometrie, die Route hält von sich aus ≥ 0,1 m mehr Abstand.

**Laufzeit.** `botRound flatVents monsterRole flatRound`: 64,9 s vorher,
62,5 s nachher (105 s ohne Fächerindex). Neue Suite ≈ 42 s.

**Offen.** Vorplatzhülle (`extract.apronWalls`, siehe Paket nav unten)
unverändert; die Wandtests prüfen `wallSegments(spec)` plus Türblätter. Die
Route wird noch nicht auf der Karte gezeichnet (`round.navigator.remaining`
liegt für `MapViewOptions.routes` bereit). Bot-Runden enden anders (Seed 1
nach 91 s statt 146 s), die Tests prüfen nur Enden und Determinismus. In 2D
gibt es weiter keine Modulkollision: Die Route umgeht Schränke, `slide`
nicht.

**Tests.** `navmesh/flatNavigation.test.ts` (Route ist Suffix der
`stationRoute`-Route über drei Samen, nie durch eine Wand, Holztür/Stahltür,
Umweg, Techniker erreicht sechs Ziele).

**Nach dem Merge mit #84 (Hörmodell):** Die Alarmleiter lässt die Routine
zwischen dem Geräusch hinter einer gesperrten Tür und dem eigenen Raum
pendeln; ein Wartezähler, der bei jedem Zielwechsel neu anfing, ließ Holz erst
nach neun Sekunden splittern. Der Zähler in `moveMonster` hängt jetzt an der
**Tür**, nicht am Ziel des Moments: Er läuft, solange das Monster an der
gesperrten Tür steht, und endet erst, wenn es sie verlässt oder sie offen ist.
Dazu `netMonsterControl.test.ts`: Rennen ist um `tuning.monster.hunt` (nach dem
Nachtrainieren 1,15) schneller als Gehen, der Test verlangt nun > 1,05 statt
> 1,2.

### 5. Netz: Monster-Rolle und 2D-Welt (`monster/`, `net.ts`, `stations.ts`, `HauntingWorld`)

**Was drin ist.** `STATION_PROTOCOL` war hier **7** (inzwischen 8, seit die
Ghost-Marker im Stand stehen — AGENTS.md hat den aktuellen Stand). Neue Nachricht
`{ kind: 'monster', x, z, sprint, attack, interact, vent }` — Stock auf
[-1, 1] begrenzt, `attack`/`interact` ganzzahlige **Zähler**, `vent` 0–15;
Sender ist der Besitzer der neuen Station `monster` (`stations.ts`, fünfte
Kachel, `view: false`), im Drohnentakt, nur solange die Ansicht das Steuer
hält; Empfänger ist der Gastgeber, nur vom Besitzer (wie `flip`).
`HauntState.technician: { x, z, yaw, moving } | null` (der 2D-Techniker;
`moving`, damit das Monster-Telefon ihn hören kann) und `HauntState.ride:
VentPhase`. Drei headless Dateien in `monster/`: `monsterHelm.ts` (die
gemeinsame Übersetzung von Stock und Knöpfen — `FlatMonsterControl`
delegiert jetzt dorthin), `netMonsterPort.ts` (`MonsterPort` fürs Telefon:
Zähler, `message()`, Klappenziele/Tür/Status aus Snapshot und Stand) und
`netMonsterControl.ts` (`MonsterDriver` beim Gastgeber: `accept`, `active`,
`decide`, `NET_MONSTER_STALE` 3 s). `stationUi.page('monster')` baut die
Ansicht über `mountMonsterView` (`StationHost.snapshot?/monsterPort?/notify?`),
hält sie über Neuschriften und gibt sie beim Verlassen frei;
`registry/legacyRoles.register.ts` überspringt `monster` (schon selbst
angemeldet). `HauntingWorld`: `netMonster` ist der `monsterDriver`; der
Navigator gibt bei aktivem Steuer das Ziel direkt zurück; Treffer nur per
Knopf (`takeHit` sperrt Berührungsschläge, solange das Steuer aktiv ist).
**2D-Welt übers Netz:** `tick` ist in `stepFlat` + `tickNet` geteilt;
`stepFlat` übernimmt `flat.round.haunt` per `adopt` (Hausneubau bei
Seedwechsel), füllt `technician`, `ride`, `venting`, hängt den Netz-Fahrer als
`round.driver` ein; `refreshHost` zählt den 2D-Spieler als `vr`. Nach dem
Merge mit #82 hängt das an `openFlat`/`closeFlat`: **Mission und Test** in 2D
sind die gemeinsame Runde (`flatShared`) — `openFlat` lehnt ab, wenn ein
anderer Techniker spielt, startet auf `this.spec.seed`, `closeFlat` stellt
einen frischen Stand her und sagt ihn an; die 2D-**Bot-Runde** bleibt eine
lokale Vorführung ohne Herzschlag und ohne Stand für andere (wie die
3D-Bot-Runde). `mapSnapshot().player()` kommt aus `state.technician`.

**Entscheidungen.**

- **Zähler statt Tastenzustände**, das erste Paket ist nur Abgleich, und
  zurückspringende Zähler (neues Telefon) holen nichts nach — sonst würde
  nach Gastgeberwechsel ein alter Stand als Salve Schläge ausgeführt.
  Ausstehende Schläge sind auf 3 gedeckelt.
- **Interagieren wirkt beim Empfang, Angreifen in `decide`:** Während der
  Schachtfahrt fragt keine Welt `decide` — „Aussteigen" muss trotzdem
  ankommen.
- **`active()` hat eine Frische-Frist:** besetzt, Runde läuft, Nachricht
  jünger als 3 s. Telefon in der Tasche → KI übernimmt. Alternative wäre reine
  Besetzung, dann stünde das Monster still.
- `flip` braucht in der 2D-Welt keine Änderung: `applyFlip` arbeitet auf
  `this.state`, das im Flat dieselbe Referenz wie `flat.round.haunt` ist.
- `monster.css` wird in `stationUi.ts` importiert; Tests mocken es.

**Offen / nur mit Geräten prüfbar.** Monster-Telefon gegen 3D-Techniker
(der Rapier-Körper friert ein, wenn der Techniker näher als 1,15 m steht —
Eigenschaft von `npcBrain.reach`); 2D-Gastgeber mit Telefonen; Latenz bei
10 Hz; CSS der Monster-Ansicht in `.haunt__body` auf echten Telefonen; der
Fortschrittsbalken der Fahrt ist aus `crew.venting` geschätzt. Kommt ein
VR-Spieler in einen Raum, in dem schon jemand 2D spielt, entscheidet
Seniorität — nicht getestet. Spielt der 2D-Spieler lokal „Als Monster", hat
`FlatMonsterControl` Vorrang. Kein Browser-Smoke für die neue Station.

**Tests.** `net.test.ts` (neu), `monster/netMonsterPort.test.ts`,
`monster/netMonsterControl.test.ts` (samt ganzer Sequenz Telefon-Port → JSON
→ Fahrer → `FlatRound` reißt die Kabine auf), `stations.test.ts`,
`stationUi.test.ts`, `netReplay.test.ts`.

### 6. Die 2D-Welt als gezeichnete Szene (`map/flatScene.ts`, `map/flatArt.ts`)

Nachtrag des Auftraggebers mit einem Screenshot aus Among Us: „so meinte ich
die 2D-Grafik". Die Spielansicht der 2D-Welt (Rollen Techniker und Bot) ist
seitdem eine gezeichnete Szene; `MapView` bleibt für die Telefone der
Einsatzzentrale, die Monster-Rolle und als Kartenoverlay in der 2D-Welt.

**Was drin ist.** `FlatScene` mit derselben Andockform wie `MapView`
(`setSnapshot`, `setVisibility`, `follow`, Zoom/Pan, `tap`, `toScreen`/
`toWorld`). Böden mit 1,25-m-Plattenraster (Gänge heller mit Rillen),
Raumnamen blass-rot mit Linie, Wände als Band mit Oberkante um `WALL_H` = 0,6 m
nach Norden und Vorderseite mit Grat und Paneelfugen, Türen mit Schwelle,
Pfosten, Schiebeblatt und grüner/roter Leuchte, Fenster als Scheiben.
Zeichenreihenfolge: Böden → Namen → z-Wände → gemeinsam nach z sortierte
Liste aus x-Wänden, Türblättern, Requisiten, Lampen und Figuren → Dunkelheit
→ Namen der sichtbaren Figuren. Dunkelheit: ein einmal angelegtes
Offscreen-Canvas, schwarz, `destination-out` mit radialem Verlauf (1 m weicher
Rand) je `lit`-Region, `self` und eigenem Kegel; `omniscient` dunkelt
unbeleuchtete Räume nur ab. Kamera folgt der Figur, 84 px/m am Desktop und
64 px/m unter 480 px Breite (Figur ≈ 100/77 px), Zoom 28–140. `flatArt.ts`:
`drawCrewmate` (Spiegelung je Blickrichtung, Beine wechseln beim Gehen),
`drawMonster` je Sorte mit atmenden Glutaugen, `drawProp` für Fracht, Konsole,
Spind (offen, zerstört mit Glut und Funken), Klappe, Sicherungskasten,
Schleuse, Kiste, `drawLamp`, `drawDrone`, `drawName`; `crewColor` (Spieler
grün, andere per Hash stabil). HUD in `flatMode.ts`/`flat.css` nach der
Vorlage: Balken „Aufgaben erledigt", O₂-Uhr, Anzug-Pips, Aufgabenliste mit
`(n/2)` (1 = Teil in der Hand, 2 = abgeliefert), Reiter „Aufgaben", oben
rechts Karte und Zahnrad, unten rechts „Benutzen" groß (hell bei Ziel),
„Werkzeug", „Wechseln". Screenshot: `docs/orbital/flat-scene.png`, Abschnitt
in `docs/orbital-qa.md`.

**Entscheidungen.**

- Türlücken werden in `FlatScene.wallPieces` noch einmal aus allen
  Wandstücken geschnitten: Die Fensterfront der Einsatzzentrale aus
  `extract.ts` läuft ungeteilt über die Schleuse (siehe Vorplatzhülle im
  Paket nav), sonst liefen Figuren sichtbar durch die Scheibe. `extract.ts`
  bewusst nicht angefasst.
- Figuren nur, wenn sie in `field.visibleEntities` stehen — dasselbe Modell
  wie die Karte und die Rollenansichten.
- Gesten sind in `FlatScene` dupliziert statt aus `MapView` herausgezogen,
  um `MapView` nicht anzufassen. Die Monstersorte wird aus dem `label`
  erraten; ein Feld im Snapshot wäre sauberer.

**Offen.**

- ~~Das 3D-Werkzeugbild im Loch (`flatStage`) war schon vorher nicht
  sichtbar.~~ Erledigt: gepufferte Comic-Icons aus den 3D-Modellen
  (`map/toolIcons.ts`), siehe Auftrag „Werkzeug-Icons, Möbel in 2D, Schall,
  Monster-Mechanik".
- Die Schatten aus `visibility.ts` (5°-Strahlen) erscheinen als schwarze
  Keile hinter Fensterpfosten und Türblättern — im Szenenstil auffälliger als
  auf der Karte.
- Der Kasten oben links überdeckt in der Einsatzzentrale den Raumnamen;
  Gangnamen sind lang und stehen nur in breiten Gängen. Gehanimation und
  Pinch-Zoom nur per Test geprüft, nicht am Gerät. ~~Requisiten der 3D-Welt
  (Tische, Inseln) fehlen in 2D.~~ Erledigt: `flatArt.drawFixture` zeichnet
  `MapSnapshot.fixtures` auch in der Szene.

**Tests.** `map/flatScene.test.ts`, `map/flatArt.test.ts`,
`map/flatMode.test.ts` (erweitert).

## Paket gameplay — Rundenregeln, Lüftungssystem, Monster-Rolle

Branch `feat/monster-gameplay` (in der Browser-Session als
`claude/monster-gameplay-ant41n`). Drei Etappen, drei Commits; der Stand je
Etappe steht am Ende dieses Abschnitts. Neuer Code liegt in
`src/worlds/haunting/rules/**`, `vents/**` und `monster/**`; `BOUNDARIES.md`
hat dafür einen Abschnitt 6 bekommen, weil es vorher keinen gab.

### Etappe A — Rundenregeln (`rules/`)

**Das Problem.** Techniker in die Kabine, Monster reißt sie auf, Techniker in
die nächste Kabine — und die erste stand danach wieder da wie neu. In der
3D-Bot-Runde (sicherer Test) verlor der Anzug dabei nicht einmal ein Leben.
Nichts an der Runde konnte sie beenden.

**Was drin ist.**

- `rules/roundRules.ts`: `RoundRules` hält die zerstörten Kabinen und rechnet
  den Rest aus `HauntState`. `cabinStrike(crew)` macht die Kabine kaputt,
  stellt den Techniker in den Raum und kostet ein Leben — **auch wenn er
  gerade unverwundbar war**; sonst wäre die Kabine wieder ein Ausweg. Im
  sicheren Test bleibt der Anzug ganz, die Kabine ist trotzdem hin.
  `step(state)` beendet die Runde, wenn `ROUND_SECONDS - time` bei null ist.
  Anzug-Leben **sind** `crew.hp` (drei, `mission.ts`), kein zweiter Zähler;
  Sauerstoff und Rundenlimit sind **eine** Uhr (`HauntState.time`).
- Contract: `MapSnapshot.round` (`MapRound`: `phase`, `oxygen`, `limit`,
  `suit`, `suitMax`, `cabinsDestroyed`, `ending`), Schrank-Zustand
  `destroyed` mit `interactive: false`. `MapSource.round?()` und
  `WorldHandles.round?()` sind optional, damit Quellen ohne Regeln
  weiterlaufen.
- 2D-Runde (`map/flatRound.ts`): Sauerstoff-Ende, Kabinenangriff über
  `rules.cabinStrike`, zerstörte Kabinen weder als Ziel des Knopfs noch als
  Versteck; `round()` als `MapSource`. HUD zeigt `O₂ m:ss`, die Endkarte den
  Grund (`map/flatMode.ts`).
- 3D-Welt (`HauntingWorld.ts`): ein Import, ein Feld, `rules.step` nach der
  Uhr (Runde verloren, Monster weg, Ansage), `rules.destroyCabin` in
  `breakLocker`, `rules.reset` in `newRound`, `round` im `mapSnapshot`.
- `rules/technicianBot.ts` + `rules/botRound.ts`: ein Techniker aus Zahlen
  für die 2D-Runde (Aufträge, Flucht, Kabine — wie `roundSim.ts`, aber gegen
  die echte `FlatRound` mit demselben Stock und denselben Knöpfen) und
  `simulateFlatRound(seed)`, der eine ganze Runde headless ausspielt.

**Der Beleg** (`rules/botRound.test.ts`): fünf Bot-Runden auf fünf Stationen,
die Hälfte mit einem Techniker, der die Kabine dem freien Feld immer vorzieht
(`hide: 1`). Jede endet von selbst — Sauerstoff, Anzug oder Flucht —, nie
durch die Reißleine eine Minute hinter dem Limit. Das Protokoll steht im Test
als `console.info`; beim Schreiben dieses Abschnitts: siehe unten
„Stand je Etappe".

**Entscheidungen und Alternativen.**

- **Die Uhr läuft weiter, auch wenn „Lebenserhaltung stabilisieren" repariert
  ist.** Sonst wäre nach der zweiten Reparatur wieder eine Runde ohne Ende
  möglich. „Sauerstoffversorgung wiederherstellen" heißt: alle drei Systeme
  und zurück in die Zentrale. Alternative: die Uhr bei reparierter
  Lebenserhaltung anhalten — eine Zeile in `RoundRules.oxygenLeft`.
- **Kabinenangriff schlägt Unverwundbarkeit.** `takeCrewHit` lehnt einen
  Treffer binnen drei Sekunden nach dem letzten ab; für den Kabinenangriff
  wird die Frist vorher auf null gesetzt und danach neu gewährt (`mission.ts`
  unverändert).
- **Nur eine Klappe je Raum.** Räume sind hier klein (vier mal vier
  Kacheln); zwei Klappen im selben Raum wären Deko. Wer die Cafeteria
  zweifach anschließen will, fügt eine Zeile in `ventNet.data.ts` ein.
- **Der Bot der 2D-Runde erkennt Gefahr wie `roundSim.ts`** (Abstand und
  Raumkarte), nicht über das Sichtbarkeitsfeld. Ein Bot, der das Monster erst
  im Licht sieht, würde die Schleife nie erreichen, die ein Mensch mit Ohren
  erreicht. Er gewinnt gegen das 2D-Monster selten — die Balance der 2D-Runde
  ist nicht Gegenstand dieser Etappe.
- **Zwei Messstellen im Sichtbarkeitsmodell** (`map/visibility.ts`, Paket
  map): `litAt` prüft erst den Radius, dann das Polygon; `LitCache` merkt sich
  je Lampe nur den Stand der Türen in ihrer Reichweite statt aller Türen.
  Vorher warf jede automatische Tür irgendwo in der Station alle Lampenflächen
  weg — eine Bot-Runde brauchte 20 s statt 7 s, und ein Telefon rechnet
  dasselbe. Verhalten unverändert (`visibility.test.ts` grün).

**Fremde Dateien, die ich angefasst habe.** `map/flatRound.ts` (Import,
Feld, fünf kleine Hooks), `map/flatMode.ts` (HUD-Zeile, Endkarte),
`map/mapSnapshot.ts` (`MapRound`, `round?`, Doku des Schrank-Zustands),
`map/mapSource.ts`, `map/extract.ts`, `map/worldSource.ts` (je das optionale
`round`), `map/visibility.ts` (die zwei Messstellen), `map/index.ts`
(`MapRound` exportiert), `HauntingWorld.ts` (siehe oben), `BOUNDARIES.md`
(Abschnitt 6).

**Offen / nicht gemacht.**

- → erledigt (Abschnitt 2 oben). Die **3D-Bot-Runde** kennt jetzt die Uhr und zerstörte Kabinen, aber der
  Modelltechniker (`missionBot.ts`, über `ShipExperience`) wählt seine Kabine
  noch aus allen — dafür bräuchte `MissionBotHost` ein `cabinUsable`, das
  durch `ShipExperience` durchgereicht wird (zwei Grenzfall-Dateien). Ebenso
  kann der VR-Spieler in 3D eine zerstörte Kabine noch betreten
  (`ShipExperience.hide`). Beides endet spätestens am Sauerstoff.
- → erledigt (Abschnitt 3 oben). Die Schalttafel in der Einsatzzentrale zeigt `MapSnapshot.round` noch nicht (Paket
  Rollenansichten): Timer, Anzug und Kabinen liegen im Contract bereit.
- `map/index.ts` ist aus Jest nicht importierbar (zieht `flatMode.ts` mit CSS
  nach sich); `rules/` und `monster/` importieren deshalb `map/flatRound`,
  `map/flatWalk` und `map/mapSnapshot` direkt. Vorschlag an Paket map: den
  Index in einen headless Teil und einen DOM-Teil trennen.

### Etappe B — Lüftungssystem (`vents/`)

**Was drin ist.**

- `vents/ventNet.data.ts`: **das Netz als Daten** — vierzehn Klappen (eine
  je Raum, an Innenwänden zu Gängen, nie in einer Türöffnung) und neun
  Verbindungen in vier getrennten Netzen (Reaktor–Triebwerke,
  Sicherheit–MedBay–Elektrik, Cafeteria–Admin, Lager–Kommunikation,
  Waffen–O2–Navigation–Schilde). Wer das Netz ändert, ändert diese Datei.
- `vents/ventGraph.ts`: `VentNet` baut aus Daten und Bauplan die Klappen in
  Metern (`at` an der Wand, `approach` davor) und **prüft die Daten** beim
  Bauen (Kachel im Raum, Wand am Rand, keine Türöffnung, bekannte Klappen in
  jeder Verbindung). `ventGraph.test.ts` prüft das gegen vier Samen.
- `vents/ventTravel.ts`: `VentTravel`, die Fahrt als Zustandsmaschine —
  einsteigen (1,2 s, sichtbar, Klappe offen), fahren (Länge des Schachts
  durch 3,5 m/s, mindestens 2,5 s, **unsichtbar**: `concealed`), ankommen,
  aussteigen (0,9 s, Klappe drüben offen). Die KI steigt sofort aus
  (`autoExit`), ein Spieler muss den Knopf drücken. Der Zustand liegt in der
  Maschine und nicht beim Steuernden — deshalb übersteht er einen Wechsel
  der Steuerung (Etappe C).
- `vents/ventPilot.ts`: **wie die KI fährt.** Die Routine kennt keine
  Schächte und bleibt unangetastet; der Lotse liest ihr Ziel und biegt es auf
  eine Klappe um, wenn Umweg, Ein-/Aussteigen und Fahrt zusammen mindestens
  sechs Meter Weg sparen. Pause zwischen Fahrten aus `MONSTERS[].vent`.
- `vents/ventArt.ts`: die Klappen in 3D — Rahmen, vier Lamellen, ein
  Leuchtstreifen, alles in einer `ShipBatch` (zwei Draw-Calls für die ganze
  Station). `vents/vents.register.ts` meldet Modell und Netz als Assets an.
- Contract: Klappen als `MapItem` der Sorte `vent` (`closed`/`open`, nie
  `interactive`), `MapSnapshot.ventLinks` als Graph, `MapSource.ventLinks?()`.
  Das Monster im Schacht ist `concealed` — das Sichtbarkeitsmodell nimmt es
  damit in beiden Modi aus `visibleEntities`; im Modus „Alles sehen" bleibt
  der blasse Marker an der Einstiegsklappe stehen, was für die Prüfansicht
  gewollt ist. `MapView` zeichnet eine Klappe als Gitter (kleine Ergänzung
  im `items`-Zweig).
- 2D-Runde (`map/flatRound.ts`): drei Felder, vier Zeilen im Konstruktor,
  der Fahrt-Schritt am Anfang des Monsterblocks (im Schacht wird weder
  wahrgenommen noch gelaufen noch getroffen), der Lotse vor `moveMonster`,
  Klappen in `items()`, `ventLinks()`, `concealed` am Monster, und die
  automatischen Türen ignorieren ein Monster im Schacht.
- 3D-Welt (`HauntingWorld.buildHouse`): ein Import, ein `stage.add`.

**Entscheidungen und Alternativen.**

- **Die alte Schacht-Logik der 3D-Welt bleibt, wie sie ist.** `HauntingWorld`
  lässt das Monster weiter über `mission.ventPairs` (jede gemeinsame Wand)
  mit Rauch und zwei Sekunden Unsichtbarkeit springen. Sie auf den neuen
  Graphen umzustellen hieße, `npcTarget`, `stepMonster`-Schachtteil und
  `monsterVent` umzuschreiben (~60 Zeilen der gemeinsamen Grenzfall-Datei)
  und die Fahrt mit dem NPC-Körper zu verheiraten. Das ist der nächste
  Schritt, nicht dieser: Die neuen Klappen stehen in 3D sichtbar an den
  Wänden, das Netz und die Fahrt sind headless fertig und getestet, und die
  Umstellung ist damit ein Austausch von drei Methoden. Bis dahin gibt es
  in 3D zwei Sorten Gitter: die alten hoch an den Wänden (`shipArt`) und die
  neuen Klappen unten.
- **Klappenwahl bei zwei Zielen:** `enter(rider, choice)` nimmt die
  Datenreihenfolge; die KI rechnet die bessere aus, die Monster-Rolle zeigt
  die Ziele als Knöpfe (Etappe C).
- **Der Schacht ist Luftlinie.** Die Fahrtdauer ist die Luftlinie zwischen
  den Klappen durch `VENT_SPEED`; ein echter Kanalverlauf brächte nichts,
  was man auf der Karte sähe.
- **Kein Hören im Schacht.** Das Monster nimmt während der Fahrt nichts
  wahr, sein Gedächtnis läuft in der Zeit nicht ab (der Wahrnehmungsblock
  wird übersprungen). Alternative: Gedächtnis weiterlaufen lassen — eine
  Zeile vor dem `return` im Fahrt-Schritt.

**Fremde Dateien, die ich angefasst habe.** `map/flatRound.ts` (siehe
oben), `map/mapSnapshot.ts` (`ventLinks?`), `map/mapSource.ts`,
`map/extract.ts` (je `ventLinks`), `map/mapView.ts` (Gitter für `vent`,
zwei Farben), `HauntingWorld.ts` (Import, ein Aufruf in `buildHouse`).

### Etappe C — Monster-Rolle (`monster/`)

**Was drin ist.**

- `monster/monster.register.ts`: die Rolle `monster` (`surface: 'map'`,
  nicht `shared`) über `registerRole` aus der eigenen Datei, dazu der
  Ansichtsmodus `monster:senses` für das Publikum `monster`. Keine zentrale
  Liste angefasst; `registry/discover.ts` findet die Datei per Glob. Die
  Datei lädt auch `monster.css` — deshalb importiert sie **nur** Vite.
- `monster/monsterDriver.ts`: die zwei Schnittstellen. `MonsterDriver` ist
  die Seite der Simulation (`active()`, `decide(dt): RoutineOutput` — dieselbe
  Form wie die Routine, damit Kabinenangriff, Treffer, Bewegung und Snapshot
  nicht wissen müssen, wer entschieden hat). `MonsterPort` ist die Seite der
  Ansicht (Stock, `attack`/`interact`, Schachtziel wählen, Stand);
  `monsterPortOf(host)` holt ihn geprüft aus `host.extra`.
- `monster/flatMonsterControl.ts`: beides für die 2D-Runde. Hängt sich als
  `round.driver` ein. Ziel einen Meter voraus, Tempo aus dem Sprintring,
  **Angreifen** trifft nur in Reichweite (Techniker im Freien: die Runde
  prüft den Abstand; Kabine: zwei Meter), **Interagieren** ist einsteigen,
  aussteigen, abbrechen oder eine verriegelte Holztür aufbrechen (Stahl
  hält).
- `monster/monsterView.ts`: die Ansicht. `MapView` im Modus `realistic` aus
  Sicht des Monsters (`computeVisibility` mit `viewerId: 'monster'`, also
  eigener Kegel, Licht, Sichtlinie — dasselbe Modell, mit dem die Runde
  entscheidet, ob es den Techniker sieht) **plus Hören**: Wer sich in
  Hörweite bewegt und nicht zu sehen ist, wird als Geräuschring gezeichnet,
  nicht als Marker. Stock links, rechts Angreifen und Interagieren, darüber
  die Zielwahl, wenn eine Klappe zwei Ziele hat. Ohne Port ist die Ansicht
  ein Zuschauerfenster in die Wahrnehmung des Monsters.
- `monster/monsterSession.ts`: das Bündel für die 2D-Welt — Steuer, Bot als
  Techniker (`rules/technicianBot.ts`) und Ansicht über einen `RoleHost`,
  dessen `snapshot()` aus der laufenden Runde kommt und dessen `extra.monster`
  das Steuer ist. `FlatMode` bietet im Optionsmenü „Als Monster spielen" an;
  die nächste Runde tauscht dann Stock und drei Knöpfe gegen die
  Monster-Ansicht, und die Endkarte spricht aus Sicht des Monsters.
- 2D-Runde (`map/flatRound.ts`): ein Feld `driver`; im Monsterblock
  `piloted` = Spieler am Steuer → Entscheidung vom Steuer statt von der
  Routine, Bewegung direkt über `stepMonster` (kein Türrouting, kein Lotse),
  Treffer nur mit `strike`; die Fahrt steigt bei einem Spieler nicht von
  selbst aus. `FlatOptions.role` (nur `FlatMode` liest es).

**Der Wechsel bricht keine Runde.** Der Zustand der Fahrt liegt in
`VentTravel` (Runde), nicht im Steuer. Verlässt der Spieler die Rolle
mitten im Schacht, steigt die KI drüben aus und macht weiter; setzt sich ein
Spieler, während die KI fährt, wartet die Fahrt drüben auf seinen Knopf.
Beides steht in `monsterRole.test.ts`. Die Routine wird währenddessen nicht
gerechnet und macht danach an ihrem alten Ziel weiter; das Gedächtnis des
Monsters (gesehen, gehört) läuft in beiden Fällen mit.

**Entscheidungen und Alternativen.**

- **Hören in der Ansicht ist Luftlinie mal Lärm** (Sprint 1, Gehen 0,45 der
  Hörweite aus `sense.hearing`), die Runde selbst rechnet über `earshot` der
  Raumkarte (Wände dämpfen). Die Ansicht hat nur den Snapshot; wer es genau
  will, reicht `earshot` über den Snapshot mit — oder das Paket Audio bringt
  sein Feld. So hört der Spieler eher etwas mehr als die KI, nie weniger.
- **Ein Spieler trifft nur mit dem Knopf**, die KI durch Berührung. Ein
  Monster, das beim Vorbeilaufen automatisch zuschlägt, nimmt dem Spieler
  die einzige Entscheidung, die er hat.
- → erledigt (Abschnitt 5 oben). **Netzspiel fehlt.** Der Port ist lokal (2D-Welt). Für den Van müsste die
  Eingabe des Monsterspielers über `net.ts` zum Gastgeber, der das Monster
  rechnet — eine neue Nachricht, also `STATION_PROTOCOL` (nur nach
  Absprache). Der `MonsterDriver` in `HauntingWorld` wäre dann ein
  Netzempfänger mit derselben `decide`-Form; die Ansicht bleibt dieselbe.
- **`Joystick` ist nicht im Contract** (`map/index.ts` exportiert ihn
  nicht); die Ansicht importiert `map/joystick.ts` direkt und nutzt dessen
  CSS-Klassen für Basis und Knopf. Vorschlag an Paket map: `Joystick` in den
  Index aufnehmen.

**Fremde Dateien, die ich angefasst habe.** `map/flatRound.ts`
(`driver`, `piloted`-Zweige, `FlatOptions.role`), `map/flatMode.ts`
(`session`, `playRole`, Menüpunkt, Endkarte, `restart`, `dispose`).

### Offene Fragen an dich

- → erledigt (Abschnitt 1 oben). **3D-Monster auf den Vent-Graphen umstellen?** Netz, Fahrt und Klappen
  sind fertig; offen ist nur der Umbau von `npcTarget`/`stepMonster`/
  `monsterVent` in `HauntingWorld` (Grenzfall, ~60 Zeilen). Bis dahin
  springt das 3D-Monster weiter über die alten Wandpaare.
- → entschieden: nein, die Uhr läuft durch; die Reparatur heißt jetzt
  „Nahrungsversorgung sichern" (Abschnitt 3 oben). **Uhr bei reparierter Lebenserhaltung anhalten?** Heute nein (sonst wäre
  die Schleife wieder möglich); wenn doch, eine Zeile in `oxygenLeft`.
- → erledigt (Abschnitt 5 oben). **Monster-Rolle im Van übers Netz** — braucht eine Nachricht in `net.ts`
  (Protokoll 5 → 6) und einen Netz-`MonsterDriver` in `HauntingWorld`.
- → erledigt (Abschnitt 2 oben). **Bot der 3D-Runde und VR-Spieler bei zerstörten Kabinen** — je eine
  Zeile in `missionBot.ts`/`ShipExperience.ts`, sobald das Paket
  Rollenansichten dort ohnehin arbeitet.

### Stand je Etappe

**C — fertig.** `monster/monsterRole.test.ts` (Registry, Steuer ersetzt
die KI und gibt sie zurück, Treffer nur mit Knopf, Schachtfahrt mit Zielwahl
und Warten auf den Ausstieg, Wechsel mitten in der Fahrt in beide Richtungen,
Holztür, Karte aus Monstersicht mit Hören) und `monster/monsterMode.test.ts`
(2D-Welt als Monster, Rollenwechsel im Menü, Endkarte).

**B — fertig.** `vents/*.test.ts`: Datennetz gegen vier Samen, Fahrt
Schritt für Schritt, 2D-Runde (Klappen und Graph im Snapshot, Techniker kann
keine Klappe benutzen, Monster während der Fahrt für Techniker und
Schalttafel unsichtbar und ohne Treffer, KI nimmt über vier Samen und 240 s
mindestens eine Abkürzung).

**A — fertig.** Typecheck, Lint, Prettier und alle Tests grün. Der Testlauf
(`rules/botRound.test.ts`, Stand des Commits):

```
Seed 1: suit nach 66 s · Anzug 0/3 · 0 Kabinen zerstört · 0× versteckt · 0/3 repariert
Seed 2: escaped nach 368 s · Anzug 3/3 · 0 Kabinen zerstört · 2× versteckt · 3/3 repariert
Seed 3: oxygen nach 600 s · Anzug 1/3 · 0 Kabinen zerstört · 4× versteckt · 0/3 repariert
Seed 4: oxygen nach 600 s · Anzug 3/3 · 0 Kabinen zerstört · 10× versteckt · 2/3 repariert
Seed 5: oxygen nach 600 s · Anzug 2/3 · 1 Kabinen zerstört · 131× versteckt · 0/3 repariert
```

Seed 5 ist die alte Schleife — 131-mal versteckt, das Monster kommt nicht
heran —, und sie endet jetzt am Sauerstoff. Seed 1 endet am Anzug, Seed 2
mit der Flucht in die Zentrale.

## Paket audio — Geräusche, Hörmodell, Wahrnehmung des Monsters

Zwei Stufen, zwei Merges. Stufe 1 (PR #78): das Hörmodell, fünf
Platzhalter-Cues, Regie und Mixer, angeschlossen in 2D und Headset. Stufe 2
(dieser Stand): **ein** Hörmodell für alle — auch für die Wahrnehmung des
Monsters —, Schächte als Schallweg, die Alarmleiter, echte CC0-Aufnahmen,
Ambiente mit Regler. Branch der Session: `claude/audio-horror-vr-v6stx1`.
Alles Neue liegt in `src/worlds/haunting/audio/**`; die eine Tür ist
`audio/index.ts`.

### Die Regel, die alles ordnet

**Alle haben dieselben Ohren; wer weiter zu hören ist, ist lauter.** Die
Hörweite `HEARING` = 12 m gilt für Spieler und Monster (alle drei Sorten,
`ENTITY_PROFILES[*].hearing`). Reichweite = Lautstärke × 12 m, und die
Lautstärken stehen in **einer** Tabelle (`audio/cues.ts`, `NOISE`), aus der
Spieler, Monster, 2D-Runde, Headset und Trainingssimulation lesen:

| Quelle                          | Lautstärke | hörbar bis |
| ------------------------------- | ---------- | ---------- |
| Spieler schleicht (geduckt)     | 0,25       | 3 m        |
| Spieler geht                    | 0,5        | 6 m        |
| Rätselzug, Schalter             | 0,5 / 0,6  | 6 / 7,2 m  |
| Fracht, Konsole, Schrank        | 0,8        | 9,6 m      |
| Tür ver-/entriegeln (**laut**)  | 1,0        | 12 m       |
| Spieler rennt (**laut**)        | 1,5        | 18 m       |
| Tür knallt zu (**laut**)        | 2,0        | 24 m       |
| Monster lauert                  | 0          | still      |
| Monster schleicht               | 0,5        | 6 m        |
| Monster geht                    | 1,2        | 14,4 m     |
| Monster rennt                   | 2,0        | 24 m       |
| Monster ruft                    | 3,5        | 42 m       |
| Monster kratzt im Schacht       | 2,0        | 24 m       |

Damit hört ein gehender Spieler ein gehendes Monster gut acht Meter, bevor
es ihn hört. Das ist die Asymmetrie des Spiels — Lautstärke, nicht Gehör.
`botTuning.monster.hearing` bleibt als Vielfaches der Hörweite des Monsters
ein Regler des Trainings (Voreinstellung siehe „Balance").

### Was drin ist

- **Hörmodell** (`audio/hearing.ts`): rechnet auf dem `MapSnapshot` den Weg
  des Schalls in **effektiven Metern**. Drei Wege, der kürzeste zählt: die
  Luftlinie mit Dämpfung je Wand (`WALL_LOSS` 9), Glas (`GLASS_LOSS` 6) und
  geschlossenem Türblatt (`DOOR_LOSS` 4); der Weg **über Türen** (Dijkstra,
  um Ecken); und **durch Schächte** — eine Klappe führt zur verbundenen
  Klappe für die Länge des Schachts plus `VENT_LOSS` 3 m, in beide
  Richtungen. Klappen und Verbindungen kommen aus `MapSnapshot.items`
  (Sorte `vent`) und `MapSnapshot.ventLinks` des Pakets Lüftungssystem.
  Zurück kommt die Entfernung, die **Herkunft** (Quelle, letzte Tür oder
  Klappe im Raum des Zuhörers) und `via`: `air`, `door`, `vent`, `wall`.
- **Wahrnehmung des Monsters** (`threat.ts`, jetzt auf dem Hörmodell):
  `hearNoises(hearing, world, monsterAt, sources, acuity)` bringt die
  Geräusche des Schritts an die Ohren des Monsters, `stepAwareness` führt
  die **Alarmleiter**:
  1. Ein leises Geräusch (unter `LOUD` = 1): **aufmerksam** — die Routine
     wird langsamer (`stalk`).
  2. Ein zweites, in einem neuen Fenster (`NOISE_WINDOW` 2,5 s): **lauernd**
     — es dreht sich zur Herkunft (`facing`) und steht `LURK` = 4 s horchend.
  3. Ein drittes: **sicher** — Jagd zur Stelle, aus der es kam, im
     Renntempo, mit Ruf. Solange es weiter hört, wandert die Stelle mit.
  Zwei Schritte hintereinander sind ein Geräusch: gezählt wird höchstens
  einmal je Fenster. Stille baut die Stufen ab, eine je `ALERT_DECAY` = 8 s.
  Ein **lautes** Geräusch (Tür, Sprint nebenan) setzt sofort auf Stufe 2 und
  gibt der Routine den Ort einmal mit (`loud`): Sie geht hin und sucht den
  Raum ab, oder sie lauert (`tuning.stakeout`). **Jagen** tut es nur bei
  Sicht, Berührung oder dritter Stufe. `ThreatState` hat dafür vier neue
  Felder (`alert`, `facing`, `quiet`, `loud`), alle über `readThreat`
  begrenzt; `threatAlert(crew)`/`takeAlert(state)` holen sie für die
  Routine ab.
- **Routine** (`monsterRoutine.ts`): `RoutineInput` bekommt `alert`,
  `facing`, `loud`; `RoutineOutput` bekommt `face` (wohin es schaut, wenn es
  steht und horcht); `RoutineWorld` optional `spaceAt`. Ein Ruf bei der
  Jagd kommt aus der Regie (Tempo `hunt`), der Schrei vor der Kabine bleibt.
- **Cues** (`audio/cues.ts`, `audio/cues.register.ts`): elf Cues — eigener
  Schritt, Monster geht, rennt, ruft, kratzt im Schacht, Herzschlag,
  Brummen, Dunkelheit, Knarren, Blech. Jeder hat Dateien (Varianten, aus
  denen zufällig gewählt wird), eine Spitzenlautstärke und einen
  Platzhalter. `load()` liefert die Bytes der Dateien als Versprechen — nur
  mit Seite, `fetch` und Audiogerät; sonst gleich den Platzhalter und keinen
  Netzzugriff (Jest).
- **Regie** (`audio/soundscape.ts`): wie in Stufe 1, dazu Schleichen
  (leiser, längerer Takt), das Kratzen im Schacht aus der nächsten Klappe,
  der Ruf bei jeder Jagd unabhängig von der Entfernung, und die
  **Ambiente**: Brummen (Strom an) bzw. gedämpft (Strom aus), Dunkelheit
  (Strom aus: voll; eigener Raum unbeleuchtet: 0,6), und alle 12–30 s ein
  Knarren oder Blech in einem zufälligen Raum — mit Ort, durch dieselben
  Türen, als Fehlalarm. Das Monster hört diese Fehlalarme nicht.
- **Mixer** (`audio/mixer.ts`): sechs Stimmen für Ereignisse, je Schleife
  eine feste Stimme, zwei Busse (Effekte, Ambiente) am Master. Bytes werden
  entpackt, sobald der Kontext läuft (`decodeAudioData`, einmal je Datei);
  bis dahin klingt der Platzhalter, danach wird auch eine laufende Schleife
  getauscht.
- **Einstellungen** (`audio/settings.ts`): Effekte und Ambiente, je aus /
  leise / normal, im Browser gespeichert (`haunting.audio.v1`). 2D-Welt:
  Abschnitt „Ton" im Optionsmenü; Headset: Zeile „Ambiente" im Menü neben
  „Ton".
- **Dateien** (`public/audio/haunting/`, 25 Ogg, 396 KB): CC0 aus
  `lavenderdotpet/CC0-Public-Domain-Sounds` (Kenney, Ben Burnes,
  OpenGameArt-Pakete), mit ffmpeg auf Mono/44,1 kHz gebracht, normalisiert,
  geschnitten, teils in der Tonhöhe verschoben. Quellen je Datei in
  `public/audio/haunting/CREDITS.md`. **Ohne Datei:** der Herzschlag — in
  den erreichbaren Quellen lag keine Aufnahme; er bleibt synthetisch.

### Wo es angeschlossen ist

- **2D-Runde** (`map/flatRound.ts`): Die Wahrnehmung des Monsters läuft
  über `stepAwareness` mit dem Hörmodell auf dem Snapshot der Runde; die
  Schritte des Spielers und jedes Hantieren (`interact`, `use`, `solve`)
  gehen als Geräusche hinein. Meldungen: „Etwas horcht." (Stufe 2), „Es hat
  dich gehört." (Stufe 3), „Es hat dich gesehen." Wer steht und horcht,
  dreht sich zur Herkunft (`face`).
- **Headset** (`HauntingWorld.stepCrew`, 10 Hz): eigene Schritte nach Tempo
  und Ducken, das Hantieren aus `ShipExperience.sound()` über einen neuen
  Host-Callback `noise`, alles durch `hearNoises` auf `mapSnapshot()`. Die
  Routine bekommt `threatAlert(crew)`, das Modell dreht sich beim Horchen
  (`monsterFace`). `acousticField` bleibt für die Anzeige der Bot-Runde.
- **Trainingssimulation** (`roundSim.ts`): dieselbe Leiter auf einer
  Hörwelt aus dem Bauplan (`hearingWorld(seed)`: Räume, Wände, Türen mit
  Näherungsöffnung, Klappen). Der Techniker macht Gehen-, Sprint- und
  Arbeitslärm.
- **Monster-Rolle** (`monster/monsterView.ts`): Der Geräuschring des
  Spielers am Ort, woher es zu kommen scheint — mit demselben Modell statt
  Luftlinie.
- **Regie der Geräusche** wie in Stufe 1: `map/flatMode.ts`, `ShipExperience`.

### Balance

Die Wahrnehmung des Monsters ist umgestellt, also wurden die Gewichte
**neu trainiert** (`trainBots` von den alten Gewichten aus, acht Läufe mit
den Samen 1–8, je vierzig Schritte à 64 Runden) und nachgemessen
(`botTraining.test.ts`, vier Messreihen à 200 Runden). Mit den alten
Gewichten gewann der Techniker im Mittel 66 % (im Band), aber der
Stopp-Test des Trainings (32 Runden, Same 0) stand daneben; mit gleichen
Ohren (`hearing` 1,0) 72 %. Genommen ist Lauf 1: Techniker 65,5 / 69 / 66,5
/ 67 % (Mittel 67 %), Stopp-Test genau am Ziel. `DEFAULT_TUNING` steht
jetzt auf diesen Zahlen; auffällig gegenüber vorher: Monster langsamer
(0,75) mit kürzerem Gedächtnis (0,4) und mehr Auflauern (0,3), Techniker
vorsichtiger erst bei 8 m, dafür mit längerer Wartezeit (11 s). `hearing`
blieb bei 1,2 — das Training hält das Monster gern etwas hellhöriger; wer
strikt gleiche Ohren will, setzt 1,0 und trainiert nach (dann liegt der
Techniker bei etwa 72 %).

### Fremde Dateien, die ich angefasst habe

Stufe 1 (siehe PR #78): `shipAudio.ts` (+Test), `ShipExperience.ts`,
`HauntingWorld.ts`, `map/flatMode.ts`. Stufe 2 dazu, alle auf Anweisung des
Auftraggebers („Wahrnehmung auf dasselbe Modell"):

- `threat.ts` (Balance): Wahrnehmung neu — `ThreatInput.noises` statt
  `speed`/`hearingDistance`, `seen` als Übersteuerung, `stepAwareness` als
  Kern ohne Crew, `hearNoises`, `threatAlert`/`takeAlert`, vier Felder in
  `ThreatState`; `ENTITY_PROFILES[*].hearing` = 12. `threat.test.ts` neu.
- `monsterRoutine.ts` (Balance): siehe oben; drei neue Eingaben, eine neue
  Ausgabe, `LURK`. Bestehende Tests unverändert grün.
- `roundSim.ts` (Balance): Wahrnehmungsblock ersetzt, `hearingWorld(seed)`.
  `roundSim.test.ts`: der Vergleich langsamer/schneller Techniker misst 24
  statt 12 Runden — mit Arbeitslärm lagen beide in zwölf Runden auf Same
  1000 gleichauf (6:6), in 24 Runden 16:12, in 96 Runden 67:61.
- `botTuning.ts` (Balance): `DEFAULT_TUNING` neu aus dem Training (siehe
  „Balance").
- `map/flatRound.ts` (Paket map): Wahrnehmungsblock ersetzt, `noise()`,
  `threat`-Getter, Meldungen, `face`.
- `HauntingWorld.ts` (gemeinsam): Imports, vier Felder, der Hörblock im
  10-Hz-Zweig von `stepCrew`, `stepThreat`-Eingabe, `...threatAlert(crew)`
  und `monsterFace` in `stepRoutine`, drei Zeilen vor `monsterArt.rotation`,
  ein Host-Callback `noise`.
- `ShipExperience.ts` (gemeinsam): `ShipHost.noise?`, eine Zeile in
  `sound()`, eine Menüzeile „Ambiente".
- `map/flatMode.ts` (Paket map): Abschnitt „Ton" im Optionsmenü, ein Zweig
  in `optionClick`.
- `monster/monsterView.ts` (Paket gameplay): `perceive` über `hearNoises`;
  `monster/flatMonsterControl.ts`: `face: null` in der Ausgabe.

### Entscheidungen, Abweichungen

- **Ein Monstertyp im Fokus.** Abgestimmt und getestet ist der Verlorene
  (`stalker`); die anderen zwei Sorten bleiben wählbar und benutzen dieselben
  Cues und Lautstärken, nur ihren eigenen Takt.
- **Hören ist nicht Wissen.** Das Monster bekommt vom Hörmodell die
  Herkunft (`from`), nicht die Quelle: Kommt der Schall durch eine Tür, geht
  es zur Tür; aus demselben Raum kennt es die Richtung.
- **Der Ruf hängt am Tempo, nicht an der Nähe.** Wer jagt, ruft — auch weit
  weg. Der Herzschlag dagegen hängt an der Nähe (und an `chase` des Headsets).
- **Schächte hören beide.** Das Kratzen des Monsters im Schacht kommt aus der
  nächsten Klappe; ein Spieler, der neben einer Klappe rennt, ist im
  verbundenen Raum zu hören. Das fahrende Monster selbst hört weiter nichts
  (`flatRound`: der Fahrt-Schritt kehrt vor der Wahrnehmung zurück).
- **Dateien statt Platzhalter, aber Platzhalter als Netz.** Jede Datei, die
  fehlt oder nicht ankommt, ersetzt der Platzhalter — ohne Warnung im Spiel,
  mit `console.warn`.
- **`ArrayBuffer` statt `AudioBuffer` in der Registry.** Entpacken braucht
  einen Kontext, und den gibt es erst nach der ersten Geste; die Bytes
  kommen vorher, das Entpacken danach — nichts davon im Bild.
- **Netz:** Die Sound-Bibliotheken (freesound, opengameart, kenney, mixkit,
  pixabay, sonniss) sind aus dieser Umgebung gesperrt (403 des
  Egress-Proxys); GitHub ist erreichbar. Deshalb ein Sparse-Clone eines
  CC0-Sammel-Repositorys.
- **Kosten**: ein Hörweg 0,14 ms in Jest; Quellen jenseits der Reichweite
  kosten keine Suche. Headset: 10 Hz Wahrnehmung, 20 Hz Regie. Die
  Simulation hat das Modell zuerst **dreizehnfach** langsamer gemacht (60
  Runden 1,9 s statt 0,14 s; auf dem CI-Läufer 4,1 s und damit über dem
  Limit von `roundSim.test.ts`) — Ursache waren die Türschleife und 260
  Wandstrahlen je Schritt, auch wenn der Techniker weit weg war. Jetzt
  prüft `roundSim.ts` erst die Luftlinie gegen die größtmögliche
  Reichweite und setzt Türen und Hörmodell nur an, wenn sie darunter
  liegt; `Hearing` filtert Wände und Räume über vorberechnete Umrisse
  (`wallBounds`, `roomBounds`) und rechnet `Math.sqrt` statt `Math.hypot`.
  60 Runden ≈ 0,5 s, die Rundenergebnisse sind bitgleich zu vorher (die
  Gewichte gelten weiter). Wer weiter sparen will: `routeBlocked` in
  `stationLayout.ts` und `stepAwareness` sind die nächsten Posten.

### Bekannte Lücken

- Das 3D-Monster fährt noch über die alten Wandpaare (`mission.ventPairs`),
  nicht über den Vent-Graphen (offene Frage des Pakets gameplay); der
  Snapshot des Headsets führt deshalb keine Klappen, und dort gibt es kein
  Hören durch Schächte, bis das umgestellt ist.
- In der 2D-Welt haben Türen, Klacken und der Schrei vor der Kabine weiter
  keinen Ton; das Zufallen einer Tür durch den Spuk erzeugt für das Monster
  kein Geräusch (es ist sein eigenes).
- Mitspieler und Bot machen für den Spieler keine Schrittgeräusche.
- Der Browser-Smoke prüft keinen Ton und lädt die Dateien nicht.

### Offene Fragen an dich

- Sollen die übrigen `ShipAudio`-Geräusche (Türen, Funken, Klacken, Schrei)
  als Cues mit Dateien in die Registry ziehen? Dann gibt es einen Mixer und
  ein Budget, und die 2D-Welt bekommt sie geschenkt.
- Soll eine Aufnahme den synthetischen Herzschlag ersetzen, sobald eine
  Quelle erreichbar ist?

### Tests

`audio/*.test.ts`: Hörmodell (Luftlinie, um die Ecke, geschlossene Tür,
Wand ohne Tür, geteilte Wand einmal, **Schacht in beide Richtungen mit
Herkunft aus der Klappe**, echte Station, gleiche Ohren und Lautstärken,
Abfall, alle Raumpaare); Regie (Takte, Kennung, Schleichen/Gehen/Rennen,
Reichweiten 14,4/24/42 m, durch die Wand und geschlossene Tür, Kratzen im
Schacht, Herzschlag, Stille, Hinweise, Nachführen, Ambiente mit Strom,
Licht und Fehlalarmen); Registry ohne Netzzugriff und mit `fetch`; Mixer
(Bytes → Aufnahmen, Stimmen, Schleifen mit Tausch, Busse, Nachführen);
Einstellungen; `HauntingAudio`. `threat.test.ts`: die Leiter Stufe für
Stufe, Abbau, lautes Geräusch einmalig, Sicht und Berührung, eigenes
Sehmodell, Schutz, Versteck, Snapshot-Grenzen, `hearNoises`,
`stepAwareness`. `monsterRoutine.test.ts`, `roundSim.test.ts`,
`flatRound.test.ts`, `monsterRole.test.ts` unverändert grün.

## Paket nav — Navmesh / Pathfinding

Branch: `claude/navmesh-path-smoothing-jhml50` (der Auftrag nannte
`feat/navmesh`; die Browser-Session bekommt ihren Branch vom Harness und darf
auf keinen anderen pushen — siehe „Abweichungen"). Alles Neue liegt in
`src/worlds/haunting/navmesh/**`.

### Der Befund

Die Zickzack-Wege kommen aus `stationRoute` (`stationNavigation.ts`): ein A*
auf einem Raster mit **vier** Nachbarn und 0,25 m Schritt. Ein Weg schräg durch
einen Raum ist dort eine Treppe aus Viertelmetern; der Kurvenschleifer
(`softenCorners`) rundet danach jede Stufe mit drei Stützpunkten. Vom
Eingang ins Zimmer `r2` (Seed 2, 14 Räume) kamen so 243 Wegpunkte auf 61,65 m
mit 4 585° Richtungswechsel heraus. Diesen Weg laufen das Monster in 3D
(`StationNpcNavigator`), der Bot (`missionBot`) und die Drohne. Das Monster
der **2D-Welt** (`FlatRound.moveMonster`) ging bis zur zweiten Runde Raum für
Raum über Türwegpunkte; seit der zweiten Runde läuft es denselben Weg wie in
3D (siehe „Zweite Runde").

### Was drin ist

- **Schnurzug** (`navmesh/pathSmoothing.ts`, `pullString`): Sichtlinien-
  Verkürzung über den fertigen Rasterweg. Vom Anker aus wird der entfernteste
  Wegpunkt genommen, den eine gerade Strecke erreicht (`SegmentClear`), mit
  vier Blicken über eine verdeckte Ecke hinweg (`LOOKAHEAD`). Zwei Durchgänge:
  erst mit dem Radius der Wegsuche **plus `SMOOTH_MARGIN` (0,1 m)**, dann
  durch die übrig gebliebenen Rasterketten (Türlauf, Gasse zwischen Modulen,
  Gang mit versetzten Türen) mit dem Radius allein (`PullOptions.tight`). Eine
  Abkürzung aus dem ersten Durchgang wird im zweiten nie wieder enger gezogen.
  Strecken zwischen benachbarten Rasterpunkten bleiben unangetastet — die hat
  der A* schon geprüft. Der Weg wird dadurch nie länger und nie enger als das
  Raster.
- **Abstandsprüfung über die 2D-Welt** (`navmesh/snapshotClearance.ts`,
  `snapshotSegmentClear`): dieselbe `SegmentClear`-Form, aber gegen
  `MapSnapshot.walls` und geschlossene Türblätter — die Geometrie aus dem
  Contract des Pakets `map`. Heute die zweite, unabhängige Prüfung in den
  Tests; morgen die Prüfung, mit der `FlatRound` denselben Schnurzug bekommen
  kann.
- **Andockung** in `stationRoute`: Der Schnurzug läuft **vor** dem
  Kurvenschleifer, der dann nur noch echte Ecken rundet. Der Vertrag des
  Pakets steht in `navmesh/index.ts`.

### Zweite Runde — das 2D-Monster läuft denselben Weg, und der Weg ist gehbar

Die Rückfrage war: 2D und 3D nutzen dieselbe Wegsuche und Glättung, aber ist
damit sichergestellt, dass man den Weg dort auch **gehen** kann? Bis dahin
war nur die Geometrie geprüft (Quader der Wegsuche, Wände des Snapshots),
nicht das Bewegungsmodell. Das ist in der 2D-Welt eine eigene Rechnung:
`walkable` rückt jeden Raum um halbe Wanddicke plus Körperradius ein und
lässt Türen nur als kleine Insel zu, `slide` verwirft jeden Schritt, der
hinausführt. Zwei Dinge sind dazugekommen:

- **`FlatRound.moveMonster` läuft jetzt über `stationRoute`** — derselbe
  `StationNpcNavigator` wie in 3D (Raster, Schnurzug, Kurvenschleifer,
  gesperrte Türen als Wand, Neuplanung alle 0,55 s oder wenn Ziel oder
  Standort springen). Welche Tür es auf dem Weg nimmt, sagt weiterhin die
  Raumkarte: Ist sie gesperrt, ist das Ziel der Punkt **davor** auf der
  eigenen Seite (`doorPath`), dort wartet es wie bisher — Holz splittert nach
  2,5 s, Stahl hält, bis die Routine ein anderes Ziel wählt. Der Umweg über
  die Raummitte bei Stillstand bleibt als Sicherheitsnetz. Gibt es keinen
  Weg (mehr), steht das Monster, statt in eine Wand zu laufen.
- **`navmesh/flatWalk.test.ts` geht den Weg wirklich.** Für die 45 Paare
  läuft ein Körper mit `MONSTER_RADIUS` (0,4 m) den geglätteten Weg in
  7-cm-Schritten mit `slide` ab, wie es `stepMonster` tut. Jeder Schritt muss
  ganz ankommen — kein Gleiten, kein Verwerfen —, jeder Wegpunkt muss
  `walkable` sein, und am Ende steht der Körper auf 5 cm am Ziel. Dazu: Der
  Teilweg vor einer gesperrten Tür wird ebenso ohne verworfenen Schritt
  gegangen und endet diesseits des Blatts; und in zwei ganzen 2D-Runden kommt
  das Monster durch mindestens drei Räume, ohne je länger als fünf Sekunden
  auf der Stelle zu stehen. Die bestehenden 2D-Tests (bleibt in der Station,
  trifft den Spieler durch Türen hindurch, sieht nur im Licht) laufen mit der
  neuen Bewegung unverändert durch.

Warum die Zahlen zusammenpassen: Die Wegsuche hält mit 0,45 m Abstand zur
Wand**fläche** (Wand 0,25 m dick), also 0,575 m zur Mittellinie; `walkable`
verlangt 0,125 + 0,4 = 0,525 m. Der nächste gültige Rasterpunkt liegt 0,5 m
vor der Fläche, eine Abkürzung streift die Fläche frühestens mit dem Radius.
In der Tür (1,2 m) liegt die Rasterspur 0,475 m vom Pfosten, die Türinsel
der 2D-Welt erlaubt 0,6 m. Mit 0,5 m Abstand (dem 3D-Aufschlag von 0,1 auf
0,4) käme dagegen **keine** Tür mehr durch — deshalb bekommt der Navigator
einen `comfort`-Parameter (Vorgabe 0,1 wie bisher; die 2D-Welt gibt 0,05).

**Was das für 3D heißt.** Dort ist das Bewegungsmodell die Physikkapsel,
und die ist headless nicht zu prüfen (Auftrag: 3D muss nicht getestet
werden). Die Sicherung dort ist dieselbe wie vor der Glättung: Das Raster
ist aus denselben Metermaßen gebaut wie Kunst und Physik (`stationNavigation.ts`,
„same metre dimensions as art and physics"), der Weg hält den Körperradius
plus 0,1 m, und jede Abkürzung ist mit demselben Kapseltest geprüft wie
vorher jeder Rasterpunkt. Was sich für 3D geändert hat, ist nur, **welche**
Punkte übrig bleiben — nicht, wogegen sie geprüft sind.

**Kosten.** Eine Wegsuche kostet in Jest 60–120 ms (der A* über bis zu
96 000 Rasterzellen, unverändert seit vor der Glättung). Die Monster-Tests
in `flatRound.test.ts` brauchen damit 48 s statt 20 s, die ganze Suite
121 s statt 68 s. Im Browser rechnet dieselbe Wegsuche seit jeher für das
3D-Monster; die 2D-Welt hat jetzt dieselbe Last, alle 0,55 s ein Weg.

### Messung — dieselben Start-Ziel-Paare vorher und nachher

Drei Stationen (Seeds 2, 9, 1009, je 14 Räume), Radius 0,45 m; je Station
vom Eingangsraum in jedes Zimmer, von der Zentrale zum Eingang und quer vom
letzten ins erste Zimmer — 45 Paare. „Punkte" ist der gelieferte Weg
**einschließlich** der Bogenstützen des Kurvenschleifers (alle 12 cm; die
gibt es weiterhin, nur nicht mehr an jeder Treppenstufe). „Drehung" ist die
Summe aller Richtungswechsel — das Maß für Zickzack, das die Länge allein
nicht zeigt. Tabelle mit `NAV_METRICS=1 npx jest stationSmoothing`.

| Seed | Start → Ziel | Länge vorher (m) | Länge nachher (m) | Punkte vorher | Punkte nachher | Drehung vorher (°) | Drehung nachher (°) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | r0 → r1 | 37.82 | 37.80 | 44 | 40 | 251 | 203 |
| 2 | r0 → r2 | 61.65 | 57.66 | 243 | 98 | 4585 | 441 |
| 2 | r0 → r3 | 60.88 | 58.92 | 110 | 68 | 1975 | 424 |
| 2 | r0 → r4 | 31.34 | 31.10 | 37 | 33 | 261 | 125 |
| 2 | r0 → r5 | 73.48 | 71.72 | 93 | 47 | 1435 | 334 |
| 2 | r0 → r6 | 70.07 | 67.33 | 120 | 72 | 1665 | 329 |
| 2 | r0 → r7 | 42.50 | 42.50 | 1 | 1 | 0 | 0 |
| 2 | r0 → r8 | 25.82 | 25.59 | 44 | 40 | 348 | 211 |
| 2 | r0 → r9 | 42.32 | 39.79 | 128 | 82 | 2058 | 490 |
| 2 | r0 → r10 | 56.77 | 52.89 | 215 | 133 | 4128 | 560 |
| 2 | r0 → r11 | 44.42 | 42.64 | 75 | 54 | 1665 | 142 |
| 2 | r0 → r12 | 69.19 | 67.70 | 70 | 23 | 1125 | 90 |
| 2 | r0 → r13 | 60.70 | 57.74 | 139 | 69 | 2385 | 192 |
| 2 | command → r0 | 13.14 | 11.35 | 62 | 31 | 1130 | 112 |
| 2 | r13 → r0 | 59.35 | 58.22 | 101 | 52 | 1337 | 212 |
| 9 | r0 → r1 | 37.88 | 36.88 | 50 | 20 | 611 | 79 |
| 9 | r0 → r2 | 63.21 | 59.34 | 228 | 108 | 4045 | 461 |
| 9 | r0 → r3 | 62.63 | 61.56 | 80 | 67 | 1255 | 399 |
| 9 | r0 → r4 | 31.34 | 31.10 | 37 | 33 | 261 | 125 |
| 9 | r0 → r5 | 74.49 | 72.50 | 123 | 70 | 2065 | 335 |
| 9 | r0 → r6 | 70.00 | 67.50 | 131 | 72 | 2025 | 333 |
| 9 | r0 → r7 | 42.50 | 42.50 | 1 | 1 | 0 | 0 |
| 9 | r0 → r8 | 25.82 | 25.59 | 44 | 40 | 348 | 211 |
| 9 | r0 → r9 | 42.28 | 40.26 | 112 | 95 | 1337 | 555 |
| 9 | r0 → r10 | 57.18 | 54.05 | 183 | 95 | 3407 | 437 |
| 9 | r0 → r11 | 44.38 | 42.63 | 73 | 54 | 1485 | 149 |
| 9 | r0 → r12 | 69.24 | 67.70 | 70 | 23 | 1305 | 90 |
| 9 | r0 → r13 | 60.89 | 57.98 | 149 | 79 | 3015 | 192 |
| 9 | command → r0 | 13.14 | 11.35 | 62 | 31 | 1130 | 112 |
| 9 | r13 → r0 | 59.15 | 57.86 | 91 | 59 | 1150 | 205 |
| 1009 | r0 → r1 | 37.88 | 36.88 | 50 | 20 | 611 | 79 |
| 1009 | r0 → r2 | 62.28 | 58.47 | 257 | 104 | 4585 | 454 |
| 1009 | r0 → r3 | 61.62 | 59.35 | 115 | 92 | 1885 | 416 |
| 1009 | r0 → r4 | 31.34 | 31.10 | 37 | 33 | 261 | 125 |
| 1009 | r0 → r5 | 74.04 | 72.09 | 128 | 69 | 2155 | 335 |
| 1009 | r0 → r6 | 70.09 | 67.50 | 122 | 72 | 1665 | 333 |
| 1009 | r0 → r7 | 42.50 | 42.50 | 1 | 1 | 0 | 0 |
| 1009 | r0 → r8 | 25.82 | 25.59 | 44 | 40 | 348 | 211 |
| 1009 | r0 → r9 | 42.45 | 40.00 | 118 | 83 | 1878 | 524 |
| 1009 | r0 → r10 | 56.75 | 53.01 | 193 | 123 | 3048 | 584 |
| 1009 | r0 → r11 | 44.34 | 42.54 | 73 | 44 | 1485 | 132 |
| 1009 | r0 → r12 | 69.77 | 68.75 | 46 | 43 | 765 | 90 |
| 1009 | r0 → r13 | 61.58 | 59.83 | 79 | 77 | 1215 | 185 |
| 1009 | command → r0 | 13.14 | 11.35 | 62 | 31 | 1130 | 112 |
| 1009 | r13 → r0 | 59.29 | 58.05 | 92 | 82 | 1330 | 205 |
| Σ | 45 Paare | 2256.49 | 2178.79 | 4333 | 2604 | 70140 | 11335 |

Über alle Paare: Länge −3,4 %, Punkte −40 %, Drehung −84 %. Die Länge fällt
wenig, weil der Rasterweg ohnehin durch dieselben Türen muss und ein
Großteil jeder Strecke gerader Gang ist; was fällt, ist das Wackeln. Kein
Paar wurde länger (Test). Die Rechenzeit je Weg sinkt leicht (≈ 65 → ≈ 58 ms
in Jest, Seed 2, 14 Räume, kalter Cache je Aufruf), weil der Kurvenschleifer
weniger Ecken bekommt.

### Kollisionsfreiheit

`navmesh/stationSmoothing.test.ts` prüft jeden geglätteten Weg zweimal, mit
Geometrien, die voneinander nichts wissen: gegen die Quader der 3D-Welt
(Wände, Türrahmen aus `housePlan(spec).solids()`, Module aus `stationLayout`)
mit dem Kapseltest `routeBlocked` beim Radius — und gegen die Raumwände des
`MapSnapshot` (`wallSegments(spec)`) mit Radius plus halber Wanddicke. Dazu:
Jede Türkreuzung liegt so mittig, dass der Körper in die 1,2 m passt, und
schneidet die Türlinie mit höchstens 20° zur Senkrechten — eine Abkürzung
passt mit Radius plus Spielraum nur in ±5 cm um die Mitte, ohne Spielraum in
±15 cm. Eine geschlossene Tür wird weiterhin nicht gekürzt (Teilweg endet
davor), die Drohne (Radius 0,22, fliegt über niedrige Module) bekommt
dieselbe Glättung und bleibt frei.

### Entscheidungen und Alternativen

- **Sichtlinie statt Trichter.** Der Funnel-/String-Pulling-Algorithmus
  braucht eine Folge konvexer Polygone mit gemeinsamen Portalen. Die Räume
  sind zwar Rechtecke, aber mit Schränken, Konsolen und Fracht darin — nicht
  konvex frei —, und die Wegsuche selbst kennt nur ein Raster und Quader.
  Zu dieser Datenstruktur passt der Strahl gegen dieselben Quader
  (`segmentClear`, jetzt mit wählbarem Radius); ein Portalnetz daneben wäre
  eine zweite Geometrie, die mit der ersten in Deckung zu halten wäre. Für
  die 2D-Welt allein (Räume ohne Module) wäre der Trichter über die Türen
  exakt; sobald sie Module bekommt, gilt dort dasselbe Argument.
- **Zwei Durchgänge statt einem Radius.** Nur mit Spielraum blieben in
  Gängen mit versetzten Türen und in Gassen zwischen Modulen Treppen stehen
  (Drehung −71 % statt −84 %); nur ohne Spielraum streifte jede Abkürzung
  Ecken mit genau dem Radius. Jetzt: Luft, wo Luft ist; sonst der Radius,
  mit dem auch das Raster gültig war.
- **`SMOOTH_MARGIN` = 0,1 m.** Mehr, und keine Abkürzung käme mehr durch
  eine Gasse (`LANE` = Radius + 0,13); weniger, und man sieht das Monster
  Ecken schneiden.
- **Der Kurvenschleifer bleibt, wie er war** (Bögen mit dem Radius allein,
  Stützpunkte alle 12 cm). Er ist der Grund, warum „Punkte nachher" nicht
  stärker fällt: Jede echte Ecke kostet weiterhin bis zu 20 Stützpunkte.
  Ihn mit Spielraum rechnen zu lassen, nähme den Bogen an jeder Türlaufecke
  weg (die Kette liegt dort ohnehin näher als der Spielraum) — das wäre für
  die Drohne ein Rückschritt.
- **`stationRoute` bekommt ein optionales `smooth = true`.** Nur damit sich
  vorher und nachher auf denselben Paaren messen lassen; kein Aufrufer
  setzt es.

### Fremde Dateien, die ich angefasst habe (Minimaländerungen)

- `src/worlds/haunting/stationNavigation.ts` (Grenzfall Paket nav): ein
  Import, ein optionaler siebter Parameter `smooth`, ein `radius`-Parameter
  mit Vorgabe an `segmentClear`, ein Aufruf von `pullString` vor
  `softenCorners`. Kein Refactor.
- `src/worlds/haunting/stationNpcNavigator.ts` (Grenzfall Paket nav): ein
  optionaler dritter Konstruktorparameter `comfort` (Vorgabe 0,1 — die 3D-Welt
  merkt nichts).
- `src/worlds/haunting/map/flatRound.ts` (Paket map; dessen HANDOVER hatte
  die Stelle ausdrücklich angeboten: „Das Paket Navmesh kann
  `FlatRound.moveMonster` später mit einer echten Wegsuche füttern"): zwei
  Imports, eine Konstante `ROUTE_COMFORT`, zwei Felder (`travel`,
  `navigator`), und der Rumpf von `moveMonster` — die Türwahl und das Warten
  an gesperrten Türen sind unverändert, nur der Schritt kommt jetzt aus dem
  Navigator statt aus `nextThroughDoor`. Sonst nichts angefasst.
- `HANDOVER.md`: dieser Abschnitt.

### Abweichungen

- **Branch.** Entwickelt auf `claude/navmesh-path-smoothing-jhml50` statt
  `feat/navmesh`: Diese Session bekommt ihren Branch zugewiesen und darf auf
  keinen anderen pushen (AGENTS.md, „Sessions, die nicht auf `main` pushen
  dürfen"). Der Umweg wird zu Ende gegangen: PR, grüne CI, Merge, Branch weg.
- **Tests importieren `map`-Dateien direkt** (`map/geometry`,
  `map/mapSnapshot`) statt über `map/index.ts`: Der Index zieht `flatMode.ts`
  und damit CSS, und das bricht Jest (steht so in BOUNDARIES.md). Der Code
  selbst importiert von `map/index.ts` nur Typen.
- **2D-Monster nachgezogen** (zweite Runde, auf Zuruf): `FlatRound.moveMonster`
  (Paket map) läuft jetzt über `stationRoute`, siehe oben. Vorher ging es
  Raum für Raum und war von der Glättung nicht betroffen.

### Offene Fragen an dich

- **Vorplatzhülle der Karte.** `map/extract.ts` (`apronWalls`) setzt die
  Schleusenlücke an die **Nordkante** des Vorplatzes (`z0`); in den drei
  gemessenen Stationen liegt die Haustür an der **Südkante** (`z1`, −52,5 m).
  Der Weg von der Zentrale zum Eingang schneidet auf der Karte daher ein
  „Fenster" — vorher wie nachher, also nichts, was die Glättung verursacht.
  Ich habe die Vorplatzhülle deshalb aus der Kartenprüfung gelassen und
  nichts am Paket `map` geändert. Gehört ans Paket `map`.
- → erledigt (Abschnitt 4 oben; die Umsetzung aus #81 über
  `StationNpcNavigator` wurde beim Zusammenführen durch `navmesh/flatNavigator.ts`
  ersetzt — gleiche Wegsuche, sparsamere Neuplanung, Umweg statt Warten, wenn
  es einen gibt, Techniker aus Zahlen auf demselben Weg). **Soll das Monster der 2D-Welt** denselben Weg bekommen wie in 3D
  (`stationRoute` + Schnurzug statt Raum für Raum)? Dann lässt sich die
  Glättung auch in der 2D-Welt *sehen*, nicht nur messen.
- **Türwahl in 2D** (#81): dort wartete das Monster vor einer gesperrten Tür
  der Raumkarte, auch wenn das Raster einen Umweg fände. Mit
  `FlatNavigator` nimmt es den Umweg, wenn es einen gibt — wie in 3D; die
  Balance-Dateien blieben unangetastet, `botRound.test.ts` bleibt grün.
- **Testzeit** (#81: 121 s Suite): mit dem Fächerindex in `segmentClear`
  (Abschnitt 4 oben) ist die Suite bei ≈ 90 s.
- **Punkte je Ecke.** Wenn 20 Stützpunkte je Bogen für das Monster zu viel
  sind (die Drohne braucht sie), wäre ein eigener Schleifer mit weiterem
  Abstand der nächste Schritt — nicht in diesem Auftrag.

### Tests

`src/worlds/haunting/navmesh/pathSmoothing.test.ts` (Schnurzug, Blick über
die Ecke, zweiter Durchgang, Abstandsrechnung, Snapshot-Prüfung) und
`stationSmoothing.test.ts` (45 Paare: vollständig, nie länger, frei nach
beiden Geometrien, Türkreuzungen, Drohne, geschlossene Tür) und
`flatWalk.test.ts` (45 Paare mit `slide` abgelaufen, gesperrte Tür, zwei
ganze 2D-Runden). Die bestehenden `stationNavigation.test.ts`,
`stationNpcNavigator.test.ts` und `map/flatRound.test.ts` laufen unverändert.

## Paket world3d — 3D-Welt / Kleinkram

Branch `feat/world-3d` — in dieser Session vom Harness als
`claude/world-3d-passthrough-signs-24ycry` vergeben. Alles Neue liegt in
`src/worlds/haunting/world3d/**`.

### Was drin ist

- **Weltraum statt Passthrough** (`world3d/spaceBackdrop.ts`). Ursache des
  Fehlers: `App.enterVR` fragt für jede Welt **zuerst** `immersive-ar` an
  (damit der AR-Knopf im Schießgang funktioniert). Auf der Quest meldet
  diese Sitzung `environmentBlendMode: 'alpha-blend'`, und three.js
  (`WebGLBackground.render`) löscht dann **grundsätzlich auf durchsichtig**
  — eine `scene.background`-Farbe wird ausdrücklich übergangen, damit das
  Kamerabild durchkommt. Haunting hatte draußen aber nur diese Farbe
  (`skyColor`) und 960 Punkte à 16 cm in 100 m Entfernung, kleiner als ein
  Pixel. Durch jedes Hüllenfenster war deshalb das Wohnzimmer zu sehen.
  Behoben, indem der Weltraum **Geometrie** ist: eine Kugel von innen
  (`BackSide`, undurchsichtig, dieselbe Farbe wie `skyColor`) und 1400
  Sterne als `Points` mit fester Pixelgröße, beide mit `renderOrder` nach
  der Hülle, damit der Tiefentest verdeckte Fragmente verwirft. Zwei
  Draw-Calls, in VR, AR und am Schreibtisch dasselbe Bild.
- **Wegweiser** (`world3d/signposts.ts`, reine Rechnung; `world3d/signMesh.ts`,
  three.js). Über **jeder Öffnung** zwischen zwei Räumen hängt auf beiden
  Seiten ein Schild mit dem Namen dessen, was dahinter liegt. Öffnungen sind
  die Türen aus `spec.doors`; Türen zwischen zwei Gängen (der Generator legt
  an einer Kreuzung eine je Kachel) fallen zu **einem** Kreuzungsstück mit
  einem breiteren Schild zusammen. Führt die Öffnung in einen Gang, steht
  darunter, wohin er führt: die Räume mit Tür an diesem Gang (Räume vor
  Gängen, höchstens vier, dann `+n`), ohne den Raum, in dem man steht. Die
  Namen kommen aus `map/extract.roomsOf` — exakt die der 2D-Karte, samt
  „Einsatzzentrale" für den Vorplatz.
- **Budget**: alle Texte in **einem** Canvas-Atlas (512×80 je Schild, vier
  Spalten), **ein** Material, **ein** Mesh je Raum (`wayfinding-signs`), das
  in der Raumgruppe der Hülle hängt und mit ihr vom Raum-Culler abgeschaltet
  wird. Auf der Station sind das 68 Schilder in 28 Meshes; sichtbar sind
  meist zwei bis vier. Das Schild der Zentrale hängt in `station-command-hull`.
- **Platzierung**: Band 2,40–2,74 m über dem Türkopf (Statusleuchte der
  Schiebetür bis 2,30 m, Rohr bei 2,38 m bleiben frei), 0,365 m vor der
  Wandmitte wie die bestehenden Raumschilder. Die Höhe folgt der Breite (1,7 m
  über einer Tür, bis 2,4 m über einer Kreuzung).
- **Registry**: `world3d/world3d.register.ts` meldet den Weltraum als
  `model`-Asset an. Eingebaut wird er trotzdem direkt in `shipArt.buildShip`,
  weil noch niemand Modelle aus der Registry abholt.

### Fremde Dateien, die ich angefasst habe

- `src/worlds/haunting/shipArt.ts` (Grenzfall world3d): drei Imports, die
  Punktwolke durch `buildSpaceBackdrop(spec)` ersetzt, die Schilder-Meshes in
  die Raumgruppen gehängt (`signAccent` dazu), und die beiden
  **Raumschilder** (`room-identification`) rücken auf die türfreie Kachel,
  die der Wandmitte am nächsten liegt (`closedTileX`) — vorher standen sie
  auf der Wandmitte, also oft genau über einer Tür, wo jetzt der Wegweiser
  hängt (und wo sie schon vorher die Statusleuchte der Tür verdeckten). Auf
  einer ganz offenen Wand (Kreuzung) entfällt das Raumschild.
- `src/worlds/haunting/shipArt.test.ts`: der Raumschild-Test erwartet jetzt
  ein Schild je geschlossener Nord-/Südwand und prüft, dass keines über einer
  Tür oder einem Fenster hängt.
- `AGENTS.md`: ein Absatz im Haunting-Abschnitt (Weltraum, Wegweiser).
- `HauntingWorld.ts`, `house.ts`, `map/**`: **nicht** angefasst.

### Entscheidungen und Alternativen

- **Geometrie statt Sitzungswahl.** Die Alternative wäre, in `App.enterVR`
  (`src/core/**`, nicht mein Abschnitt) `immersive-vr` zu verlangen, sobald
  eine Welt keinen Passthrough will. Das ginge nur beim Start der Sitzung,
  nicht beim Weltwechsel durch ein Portal, und es nähme dem Schießgang seinen
  AR-Knopf. Eine Welt, die einen Himmel hat, zeichnet ihn — dann ist die
  Sitzungsart egal.
- **Schilder nur an Öffnungen, nicht frei im Gang.** „Kreuzung" ist im
  Grundriss immer die Stelle, an der zwei Gangrechtecke aneinanderstoßen
  (`spec.passages` überlappen nicht); dort hängt das Schild über der
  offenen Wand. Ein hängender Wegweiser mitten im Gang hätte eigene
  Aufhängung, Kollision mit der Drohne und eine zweite Datenquelle gebraucht.
- **Eine Zeile je Ziel, keine Pfeile.** Das Schild hängt über dem Durchgang,
  den es meint; ein Pfeil sagte nichts, was die Position nicht schon sagt.
  Pfeilglyphen in `system-ui` wären auf der Quest außerdem nicht garantiert.
- **`roomsOf` aus `map/extract` statt aus `map/index`.** `map/index.ts`
  reexportiert `FlatMode`, das CSS importiert — ein statischer Import bricht
  Jest (`HANDOVER` des Pakets map sagt das selbst). `HauntingWorld` macht es
  genauso. Sobald der Index CSS-frei ist, kann der Import wandern.

### Offene Fragen an dich

- → entschieden: bleiben so; Deckenhöhe geprüft und nicht geändert (Abschnitt 3 oben). Die **Raumschilder** liegen jetzt neben der Tür statt auf der Wandmitte.
  Wenn das Bild dadurch unruhig wirkt, ist die Alternative, sie an die
  Ost-/Westwand zu hängen (dort gibt es keine) statt sie zu verschieben.
- Der Weltraum ist eine einfarbige Kugel plus Sterne. Ein Planet oder Nebel
  (eine Textur auf der Kugel, weiterhin ein Draw-Call) ist ein kleiner Schritt,
  aber Geschmack — bitte sagen, ob gewünscht.
- Nicht auf der Brille gemessen: Ich hatte keine Quest. Zwei zusätzliche
  Draw-Calls und ein 2048×1360-Atlas sollten die 72 Hz nicht berühren; die
  Zahl gehört trotzdem in `docs/orbital-qa.md`, sobald jemand misst.

### Tests

`src/worlds/haunting/world3d/*.test.ts` — Ableitung der Wegweiser (jede
Öffnung zwei Schilder, Namen gleich denen der Karte, im eigenen Raum vor der
richtigen Wand, nie überlappend, Ziel-Liste ohne den eigenen Raum, Kreuzungen
zusammengefasst; Station mit zwei Samen und das alte Haus), das Mesh (ein
Material und ein Atlas für alle, ein Mesh je Raum, Band über dem Türkopf,
Vorderseite in den Raum) und der Weltraum (undurchsichtig, von innen, nach
der Hülle gezeichnet, Sterne in Pixeln, gleichverteilt, deterministisch).

## Paket map — 2D-Kern + Sichtbarkeit

Branches: `feat/map-contract` (Phase 0, Contract + BOUNDARIES.md) und
`feat/map-core` (Phase 1, Implementierung). Alles Neue liegt in
`src/worlds/haunting/map/**` und `src/worlds/haunting/registry/**`.

### Was drin ist

- **Contract** (`map/index.ts`, `registry/index.ts`): `MapSnapshot`,
  `MapSource`, `MapView`, Sichtbarkeitsmodell, Registries für Rollen,
  Ansichtsmodi und Assets, `*.register.ts`-Discovery per `import.meta.glob`.
- **Geometrie** (`map/geometry.ts`): Wände mit Türlücken aus den
  Raumrechtecken (das *sind* die Bounding-Boxen, aus denen `GridWorld` die
  3D-Wände baut), Sichtlinien, Begehbarkeit mit Gleiten an Wänden, Türnischen,
  und der zweistufige Weg durch eine Tür (`nextThroughDoor`).
- **Sichtbarkeit** (`map/visibility.ts`): Lichtflächen per Strahlwurf gegen
  Wände und geschlossene Türblätter, Eigenradius 1,5 m, Sichtkegel,
  Geräuschradien; zwei Modi. `LitCache` hält die Flächen der Deckenlampen,
  solange keine Tür auf- oder zugeht.
- **Extraktion** (`map/extract.ts`, `map/worldSource.ts`): der Snapshot aus
  Bauplan + Stand + einer Handvoll Getter der Welt. `HauntingWorld.mapSnapshot()`
  ist die Stelle, an der Rollenansichten ihn abholen — reiner Lesezugriff.
- **2D-Welt** (`map/flatRound.ts`, `map/flatMode.ts`): eine ganze Runde ohne
  three.js — Stock, drei Knöpfe (Werkzeug wechseln / benutzen / interagieren),
  Fracht, Konsolen mit den drei Rätseln als Overlay, Schutzschränke, Türen
  ver-/entriegeln, Lampen schalten, Monster aus `monsterRoutine.ts` auf der
  Raumkarte, Spuk aus `haunt.ts`, Treffer und Puls aus `mission.ts`.
  Optionsmenü mit genau den zwei Modi aus `viewModesFor('flat')`.
  Das aktive Werkzeug steht als gepuffertes Comic-Icon im Wechseln-Knopf
  (`map/toolIcons.ts`), einmal aus dem 3D-Modell gerendert — im 2D-Modus
  läuft danach kein WebGL mehr.
- **Umschaltung**: Checkbox „2D-Welt von oben" über den Kacheln im Van
  (`stationUi.vanPage`). Sie ist seit dem UI-Fix nur noch eine Einstellung:
  Gestartet wird mit „Bot-Runde ansehen", „Mission spielen" oder „Test ohne
  Monster" (`HauntingWorld.startRound`), und läuft die 2D-Runde, fassen
  `HauntingWorld.tick` und `render` die 3D-Welt nicht an. Die dritte Rolle
  `bot` in `FlatOptions.role` lässt den Techniker aus Zahlen spielen.

### Fremde Dateien, die ich angefasst habe (Minimaländerungen)

- `src/worlds/haunting/stationUi.ts` (Paket Rollenansichten): zwei optionale
  Felder in `StationHost` (`flatMode`, `flatActive`), die Checkbox-Kachel in
  `vanPage`, ein `else if` in `onClick`. Kein Refactor.
- `src/worlds/haunting/HauntingWorld.ts` (gemeinsam): Imports, zwei Felder
  (`flat`, seit den Werkzeug-Icons `flatIcons`), zwei Host-Callbacks, ein Kurzschluss am Anfang von
  `tick` und von `render`, zwei Zeilen in `dispose`, und zwei neue Methoden
  (`toggleFlat`, `mapSnapshot`). Nichts Bestehendes verschoben oder umbenannt.

### Entscheidungen und Alternativen

- **Grundrisse aus den Rechtecken statt aus `THREE.Box3`.** Die Welt baut
  ihre Wände aus genau diesen Rechtecken; eine Szene zu durchsuchen hätte
  dasselbe ergeben, nur langsamer und nicht headless testbar. Alternative:
  `Box3.setFromObject` je Raumgruppe — bleibt möglich, falls das Paket 3D-Welt
  später Räume baut, die nicht mehr auf dem Kachelgitter liegen.
- **Die 2D-Welt ist eine eigene Runde, kein Spiegel der 3D-Runde.** Der
  Auftrag verlangt „ausschließlich 2D gerendert *und simuliert*". Deshalb
  läuft `FlatRound` mit eigenem Zustand, ohne Netz und ohne Host — wie die
  Bot-Runde. Alternative: die 3D-Physik weiterlaufen lassen und nur das Bild
  ersetzen; das hätte den 3D-Pfad nicht entlastet.
- **Bewegung: Gleiten an Rechtecken statt Navmesh.** Räume sind konvex, also
  reicht das für Spieler und Monster; das Monster geht Raum für Raum über
  die Türen der Raumkarte. Das Paket Navmesh kann `FlatRound.moveMonster`
  später mit einer echten Wegsuche füttern (`MapSnapshot.walls`).
- **Sprint am Stock**: jenseits von 88 % Auslenkung wird gerannt (kein
  vierter Knopf). Ausdauer gibt es in 2D nicht — der 3D-Techniker hat sie
  auch nur als Anzeige (`exertion`).
- **Türen im Einzelspiel**: Es gibt keine Schalttafel-Rolle in der 2D-Welt.
  Deshalb darf der Spieler jede Tür in Reichweite ver- und entriegeln und
  jede Lampe am Raummittelpunkt schalten. Das Monster splittert Holztüren
  nach 2,5 s, Stahl hält.
- **Radar/Röntgen** sind in 2D Textmeldungen (Richtung + Entfernung bzw.
  nächste Fracht), kein eigenes Bild.
- **Geräuschradien sind Zeichenradien** (12 m Sprint, 5 m Gehen, Hörweite
  des Monsters aus `ENTITY_PROFILES`); die echte Wahrnehmung rechnet wie
  `roundSim.ts` über `earshot` der Raumkarte. Wer die Radien mit dem
  akustischen Feld von `perception.ts` in Deckung bringen will: Paket Audio.
- **Marker-Drosselung** liegt in `MapView` (`markers: { hz }`), nicht im
  Snapshot: Der Späher soll springende Punkte sehen, die Schalttafel gar keine.

### Bekannte Lücken

- Keine Schächte für den Spieler und kein Schachtverhalten des Crawlers in 2D.
- Kein Sicherungskasten-Rätsel in 2D (`fuse` steht nur als Item auf der Karte).
- Kein Hören für den Spieler (Schritte des Monsters) — nur Sehen.
- `worldSource.player()` liefert `moving: false` (die Welt kennt die
  Laufgeschwindigkeit nicht ohne den Rig zu befragen); Sprint aus `exertion`.
- Die Drohne der 3D-Welt taucht im Snapshot auf, hat aber keinen eigenen
  2D-Modus.
- Browser-Smoke (`npm run test:browser`) kennt die Checkbox noch nicht.
- `registry/discover.ts` nutzt `import.meta.glob` — nur Vite, nie aus Jest
  importieren. Tests registrieren selbst.

### Offene Fragen an dich

- → erledigt (Abschnitt 5 oben). Soll die 2D-Welt später **netzfähig** sein (Host rechnet, Telefone zeigen)?
  Dann müsste `FlatRound` seinen `HauntState` über `net.ts` senden; der Typ
  passt schon, `STATION_PROTOCOL` bliebe bei 5.
- → erledigt: Eintrag im Weltmenü des Technikers (Abschnitt 3 oben). Soll die Checkbox auch dem VR-Spieler angeboten werden (Handmenü), oder
  bleibt sie in der Einsatzzentrale?
- (Der Branch existiert auf `origin` nicht mehr.) `claude/vr-map-view-g13344` auf `origin` (6. 9.) ist ein unmerged Branch
  mit einer allgemeinen Karte für alle Welten (`shared/mapScene.ts`). Nicht
  berührt; sie überschneidet sich thematisch, aber nicht im Code.

### Tests

`src/worlds/haunting/map/*.test.ts` — Geometrie, Sichtbarkeit, Rätselregeln,
ganze headless Runden mit fünf Samen (Fracht holen, drei Konsolen lösen,
zurück zum Van), Monster über vier Samen (bleibt in der Station, trifft,
sieht nur im Licht), Stock, `MapView` (jsdom), `FlatMode` (jsdom).
Registry-Tests in `registry/registry.test.ts`.
