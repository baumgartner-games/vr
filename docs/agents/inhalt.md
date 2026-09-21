# Was drin ist

Ein Kapitel des [Projektwissens](../../AGENTS.md) — dort steht der Wegweiser
über alle, und dort stehen die Arbeitsregeln.

- **Startseite: eine Frage, ein Knopf** (`core/screenView.startOptions`, mit
  Test). Welche Frage dasteht, entscheidet **eine** Eigenschaft des Geräts —
  ob der Browser eine immersive Sitzung starten kann:
  - **Mit Brille** gibt es „von oben oder aus den Augen" nicht (in der Brille
    ist nur das eine zu haben); gefragt wird nach **Sitzen oder Stehen**
    (`core/posture.ts`), und der Knopf heißt **Enter VR**.
  - **Ohne Brille** ist es umgekehrt: Die Haltung ändert am Bildschirm nichts,
    gefragt wird **Von oben oder Aus den Augen** (`core/screenView.ts`,
    vorbelegt nach Gerät — **Handy: von oben**, sonst aus den Augen), und der
    Knopf heißt **Beitreten**. Die Kennungen dahinter heißen weiter `2d` und
    `3d`, weil sie so im Speicher stehen; die Wörter stehen in
    `SCREEN_VIEW_LABELS`.

  Bis `detectXRSupport` antwortet, gilt „keine Brille": Das stimmt für fast
  jedes Gerät, der Knopf steht sofort da, und die Brille schreibt sich
  Millisekunden später selbst hinein — besser als ein toter Knopf „VR wird
  geprüft …", auf den jeder Schreibtisch wartet.
  **Die Wahl ist eine Zusage**: _Von oben_ führt in dieselbe Welt, nur aus der
  Kamera darüber, und die gibt es in **jeder** Welt (`core/TopDownCamera.ts`,
  siehe „Von oben: dieselbe Welt, eine Kamera") — „Beitreten" öffnet also die
  Welt, in der man ohnehin steht, nur von woanders angesehen. Vorher stand der
  Schalter da und die Spielwiese startete trotzdem den Hub in 3D: eine Wahl,
  die keine war. Umgeschaltet wird auch mitten im Spiel, unter
  **Menü → Ansicht**.
  Oben links derselbe **Menü-Knopf** wie im Spiel (`#landing-menu`): Welten,
  Bewegung, Aussehen, Grafik schon vor dem Start, als Seite (`ui/PageMenu.ts`).
  Einen **Hinweiskasten** mit fünf Zeilen Steuerung gab es hier auch einmal; er
  ist weg — was darin stand, steht im Menü, in dieser Datei und in der README,
  und auf einer Startseite liest es niemand.
  Unter `#haunting` hat sie ein zweites Gesicht: die **Startseite der Runde**
  — Name, Raum-Code, Verbinden, und derselbe eine Knopf in denselben Raum
  (`main.ts`, `data-landing="haunting"`; siehe [Haunting](./haunting.md#haunting--orbital-raumstation-für-eine-quest-und-zwei-mobilgeräte)).

- **Von oben: dieselbe Welt, eine Kamera** (`core/TopDownCamera.ts`,
  `core/topDownPose.ts` mit Test). Die Ansicht _Von oben_ ist kein zweites
  Spiel, sondern ein **Blickwinkel** auf die three.js-Szene, in der ein anderer
  gerade mit der Brille steht: eine feste Kamera schräg darüber, 55° geneigt,
  Norden oben, eng im Öffnungswinkel (30°) — die Optik von _Overcooked_. Man
  sieht dieselben Wände, dieselben Türen, dieselben Kisten wie in 3D, nur von
  woanders.
  - **Die Vorgeschichte in einem Absatz.** Bis September 2026 malte eine
    Spiele-Bibliothek (Phaser) dafür eine **eigene** Kachelwelt auf eine
    Leinwand über dem WebGL-Bild, und das WebGL-Bild wurde dabei nur geleert:
    1-m-Kacheln, gemalte 16-px-Sprites, ein eigener Held, ein eigener Editor.
    Das war ein Umweg, und zwar aus einem Missverständnis heraus — die Optik,
    die gemeint war (_Overcooked_), ist gar keine Pixelwelt, sondern eine
    3D-Szene aus fester Schrägsicht. Der Preis waren **zwei Wahrheiten**: Was
    man von oben umwarf, stand in 3D noch, eine Tür kannte nur ihre Hälfte,
    und wer in der Brille danebenstand, sah einen Spieler von oben gar nicht.
    Geblieben ist der richtige Gedanke darin — **dass ein 2D-Gitter sagt, wo
    alles steht** —, und der wohnt längst woanders, nämlich im Kachelgitter
    (`worlds/grid/`, Kacheln, Ebenen, Bausteine, Einbauten) mit dem
    Bauplatz als Editor (`worlds/editor/WorldEditor.ts`). Phaser und
    `src/world2d/` sind damit ersatzlos weg; der Weg dorthin und zurück steht
    in [dem Plan](../plan-2d-hub-interaktion.md).
  - **Wie die Kamera steht** (`topDownPose.ts`, ohne three.js, mit Test): Ziel
    ist die **Mitte des Rigs** und nicht der Kopf — sonst schöbe jedes Ducken
    das Bild —, die Kamera steht im Süden darüber (`topDownPosition`) und nickt
    genau so weit, dass sie das Ziel ansieht (`topDownPitch`). Der **Zoom**
    geht in **acht** Stufen als Abstand: 5 · 8 · 12 · 16 · 22 · 30 · 42 · 60 m,
    Vorgabe 16, das Rad
    sammelt 50 Einheiten je Stufe wie schon in der alten Kachelwelt — und die
    nächste Stufe wird **vom Abstand aus gerechnet, der gerade gilt**, nicht
    von der zuletzt gerasterten: Sonst spränge das Bild nach einem Pinch beim
    ersten Radklick dorthin zurück, wo es vor dem Pinch stand. **Die beiden
    obersten Stufen sind nachgetragen worden**, und der Grund ist die
    Testwelt: Ihr Gelände misst 73 × 105 m, und bei 30 m Abstand sieht man
    davon einen Ausschnitt — wer wissen wollte, wo die Kartbahn relativ zur
    Kletterwand liegt, musste hinlaufen. 60 m fassen das Gelände als Ganzes;
    darüber hinaus wird die Figur zum Punkt, und ein Blickwinkel, in dem man
    sich selbst sucht, ist keiner mehr. **Und die beiden untersten ebenso**,
    gemeldet aus der App auf dem Telefon: „In der PWA ist leider die maximale
    Zoom noch zu gering, da will ich näher rein zoomen können." Bei 12 m sieht
    man gut sechs Meter Breite — genug für einen Raum, zu wenig für das, was
    auf einem Tisch steht; 5 m sind knapp drei Meter, also die Figur und das,
    woran sie arbeitet. Beides läuft
    **weich** nach (`net/PoseSmoothing.SmoothPose`, 0,12 s): Ein Rig, das an
    jeder Fuge einen Zentimeter versetzt wird, zitterte sonst im ganzen Bild.
    Perspektivisch und nicht orthografisch, weil ein Podest und der Boden
    darunter sonst auf denselben Fleck fielen.
  - **Man sieht sich selbst.** Der eigene Körper liegt auf `LAYER_SELF_ONLY`
    und wird vom eigenen Auge nie gezeichnet; von oben ist dieses Auge aber ein
    Blick **auf** die Figur, also nimmt die Maske dieser Kamera die Ebene dazu
    (`core/viewLayers.ts` — dieselbe Regel wie Spiegel und Portalsichten). Der
    Kopf folgt dabei dem **Rig** und nicht der Desktop-Kamera
    (`PlayerAvatar.headFollowsRig`), sonst schaute er beim Laufen starr in eine
    Richtung von vorhin; und die Figur bekommt ihre **Handkugeln**
    (`AvatarBody`, `hands`), weil ein Koch ohne Hände von oben abgesägt
    aussieht — in der Brille bleiben sie aus, da sind die eigenen Hände die
    getrackten.
  - **Gelaufen wird in Weltrichtungen** (`FlatControls.walkNorthUp`): W ist
    Norden (−z) und bleibt Norden, auch wenn die Figur nach Süden schaut, D ist
    Osten (+x). Über dieselbe Physik wie am Schreibtisch (`rig.setIntent`,
    `PhysicsLocomotion`) — eine feste Kamera ist ein Blickwinkel und kein
    zweiter Antrieb. Shift sprintet, Leertaste springt, die **Maus dreht
    nichts** und fängt keinen Zeiger. Läuft niemand und zielt niemand, schaut
    die Figur dorthin, wohin sie zuletzt lief, weich gedreht (Twin-Stick-Regel
    ohne zweiten Stick).
  - **Vier Geräte, eine Absicht** (`FlatControls`, `core/gamepad.ts`). Von oben
    spielt man mit Tastatur, Maus, Gamepad und Glas, oft mit zweien
    gleichzeitig — und alle vier meinen dasselbe: laufen, **zielen**,
    benutzen, schießen, zoomen. Zusammengerechnet wird das an **einer** Stelle,
    in `FlatControls`; eine Welt, die selbst Tasten abhört, hätte dieselbe
    Taste zweimal.
    - **Zielen** ist der zweite Stick, und wo keiner ist, die Maus: Die
      Richtung wird auf dem **Schirm** gemessen — vom Zeiger zur Figur
      (`TopDownCamera.project(rig)`) — und mit `topDownPose.groundDirection`
      auf den Boden zurückgerechnet, samt der Stauchung nach Norden, die die
      Neigung der Kamera hineinrechnet. Ohne diese Division zielt die Figur zu
      flach, und man merkt es erst, wenn man danebenschießt. Wer zielt, dreht
      die Figur **hart** dorthin (ein Stock, der erst in einer Zehntelsekunde
      ankommt, zielt für den Spieler daneben); lässt er los, **bleibt die
      Richtung stehen** — der Laufrichtung folgt die Figur erst wieder, wenn
      sie auch läuft, und wer im Stehen gezielt hat, sieht die Waffe nicht zur
      Mitte zurückzucken. Und eine
      Mausbewegung holt das Zielen vom Stock zurück, nicht umgekehrt: Sonst
      zöge eine Maus, die beim Spielen mit dem Pad irgendwo auf dem Schirm
      liegt, die Figur dauernd zu sich.
    - **Benutzen und Schießen gehen ans Rig** und nicht an die Welt:
      `PlayerRig.requestUse()` ist eine **Flanke** (`takeUse()` liest sie und
      löscht sie, je Bild höchstens einmal), `setTrigger(0…1)` ist der Trigger
      der rechten Hand — derselbe Wert, den in der Brille der Controller
      liefert, damit die Pistole von oben keinen zweiten Weg bekommt. Was vor
      der Figur steht und was in ihrer Hand liegt, weiß die Welt; sie fragt
      dort nach (Paket P2 aus [dem Plan](../plan-2d-hub-interaktion.md)).
    - **Das Gamepad ist reine Rechnung** (`core/gamepad.ts`, mit Test): kein
      Plugin, nur `navigator.getGamepads()` je Bild und das Standard-Mapping
      (Sticks 0/1 und 2/3, `A` = 0, `B` = 1, LB/RB = 4/5, RT = 7, linker Stick
      gedrückt = 10). Die **Totzone von 0,2 ist rund und nicht quadratisch** —
      eine quadratische ließe einen leicht diagonal gehaltenen Stick auf einer
      Achse durch, und die Figur zuckte nach Norden statt stillzustehen —, und
      darüber wird neu skaliert, damit es hinter der Kante langsam anläuft
      statt mit einem Fünftel Tempo anzuspringen. Die Flanken der Knöpfe macht
      `ButtonState` aus `core/XRInput.ts`, dieselbe Klasse wie in der Brille
      und keine Abschrift. Außerhalb von _Von oben_ darf der Pad mitspielen:
      linker Stick läuft, rechter sieht sich um, `A` springt.
      - **Was davon wirklich ankommt, zeigt `/inputs.html`** (siehe
        [Die Eingabeseite](./seite.md#die-eingabeseite)): jeder Knopf mit seiner Nummer,
        das Bild des Controllers dazu, und darunter derselbe `readGamepad`, der
        im Spiel läuft. Sie ist der einzige Weg, ein Pad am Browser einer
        Konsole zu untersuchen — dort gibt es keine Entwicklerwerkzeuge.
      - **Und die Nummern sind nicht in Stein.** Die Knopfnummern oben sind die
        **Voreinstellung** (`DEFAULT_PLAN`); wer will, legt sie um, und wessen
        Treiber die Lage falsch meldet, richtet sie mit einer Gerätekarte
        (`core/inputMap.ts`, siehe
        [Zwei Karten](./seite.md#zwei-karten-wo-ein-knopf-sitzt-und-was-er-tut)).
        `readGamepad` bekommt dafür einen `ButtonPlan`; ohne einen gilt Zeile
        für Zeile das, was immer galt.
    - **Dass es das Glas überhaupt gibt, ist eine Einstellung** — _Menü →
      Grafik → Bildschirm-Steuerung_ mit drei Rasten
      (`graphicsSettings.screenPads`, gerechnet in `core/screenPads.ts`, gesetzt
      in `main.ts`). **Automatisch** ist die Voreinstellung und heißt: nur am
      Handy (`device.detectFlatRole`), und auch dort nur, solange **kein
      Gamepad** angesteckt ist — wer eines am Tablet hängen hat, hält schon
      einen echten Stock in der Hand und braucht keinen gemalten darüber, der
      ihm das halbe Bild nimmt. **An** zeigt sie auch am Schreibtisch, **aus**
      nimmt sie auch dem Telefon. Zwei Zustände stehen **vor** der Einstellung
      und lassen sich von ihr nicht überstimmen: in der Brille sieht niemand
      auf das Glas, und eine Welt mit eigener Steuerung
      (`WorldContext.touchStick`) hätte sonst zwei Stöcke übereinander. Die
      Bedingung stand einmal dreimal in `main.ts` und kannte je nur ihre
      Hälfte — wer die Brille absetzte, bekam die Stöcke auch dann zurück, wenn
      die Welt sie gerade selbst mitbrachte.
    - **Auf dem Glas** kommt rechts unten ein zweiter Stock dazu und darüber
      zwei runde Knöpfe `A`/`B` (`#touch-aim`, `#touch-a`, `#touch-b`); sie
      stehen nur von oben, weil sie sonst nichts bedeuten. Wie der linke Stock
      sind es Zeigerflächen und keine Knöpfe: Die Leiste liegt auf
      `pointer-events: none`, die Ereignisse kommen an der Leinwand an, und
      `FlatControls` sieht nach, über welchem Feld ein Finger aufgesetzt hat.
      Die beiden liegen **nebeneinander über dem Zielstock**, `B` links von
      `A`, auf derselben Höhe und mit einer Handbreit Luft zum Stock. Vorher
      saß `B` allein darüber und `A` darunter, und der Daumen, der den Stock
      hält, erwischte auf dem Weg nach oben zuerst den falschen.
    - **Zwei Finger in der oberen Hälfte zoomen** (`TopDownCamera.zoomScale`).
      Ein Pinch ist die Geste, mit der auf einem Telefon seit jeher gezoomt
      wird, und stufenlos: Der Abstand wird mit dem Faktor der Finger skaliert
      und zwischen der nächsten und der fernsten Stufe geklemmt
      (`topDownPose.zoomScaled`). **Obere Hälfte**, weil unten die beiden
      Stöcke und die Knöpfe liegen — ein zweiter Finger auf dem Zielstock ist
      kein Zoom, sondern jemand, der gerade zielt und läuft. Und **ohne
      Nachlaufen**, anders als die Raste: Ein Pinch ist direktes Anfassen, und
      ein Bild, das dem Finger eine Fünftelsekunde hinterherhinkt, fühlt sich
      kaputt an.
  - **`A` benutzt — überall** (`core/usable.ts` mit Test,
    `PortalWorld.useForward`).
    In der Brille legt man die Hand auf einen Knopf und drückt; von oben gibt
    es keine Hand, die man irgendwo hinlegt, sondern eine Figur, die irgendwo
    steht. `A`, `E`, Enter und der Touch-Knopf `A` fragen deshalb: **Was steht
    vor mir?** — ein Strahl aus der Brust, **1,5 m** weit, und wenn der nichts
    trifft, das, was die **Füße überlappen** (0,6 m). Der Strahl sticht die
    Überlappung, unter Gleichen gewinnt das Nächste; wer vor einer Druckplatte
    steht und auf den Knopf dahinter zeigt, meint den Knopf.
    - **Und das gilt in jeder Ansicht, nicht nur von oben.** Die Auswahl
      rechnet `PortalWorld` in jedem Bild, auch aus den Augen und in der
      Brille; was sich dabei ändert, ist allein die **Richtung**
      (`usable.aimForward`): von oben die des Rigs — dort dreht die Steuerung
      die ganze Figur zum Ziel —, sonst die **Kopfrichtung**, waagerecht
      projiziert (`PlayerRig.getHeadForward`), denn dort steht die Figur still
      und sieht sich um. Wer senkrecht nach unten schaut, hat keine waagerechte
      Richtung mehr; dann gilt wieder die Figur, sonst zeigte `A` beim Blick
      auf die eigenen Füße irgendwohin.
    - **Springen und Benutzen sind derselbe Knopf**, und das ist kein Konflikt,
      sondern die Regel jedes Spiels mit einem Knopf: `A` springt **nur, wenn
      nichts in Reichweite ist**. Die Welt legt dafür jeden Frame einen Zettel
      ans Rig (`PlayerRig.useCandidate`) — sie weiß als Einzige, was gerade vor
      der Figur steht —, und `A` liest ihn. Am Schreibtisch springt die
      Leertaste weiterhin immer: Dort ist eine Taste frei, und wer vor einem
      Knopf steht und trotzdem hüpfen will, soll das können. Beim
      **Weltwechsel** wird der Zettel zurückgesetzt (`standUp`), sonst stünde
      man in der neuen Welt vor nichts und käme trotzdem nicht vom Boden.
    - **Was gemeint ist, leuchtet** (`core/highlight.ts`). Ohne das ist die
      Auswahl eine Vermutung: Man drückt und sieht danach, was passiert ist.
      Das gewählte Ding bekommt deshalb einen **gelblichen Saum** (`0xffd35a`)
      — dieselbe Mechanik wie die schwarze Comic-Kontur, eine umgestülpte
      Hülle (`core/outlineShell.ts`), weil ein Nachbearbeitungsschritt in einer
      WebXR-Sitzung nicht zu haben ist. Er trägt eine eigene Marke, ein eigenes
      Material, wirft keinen Schatten, fängt keinen Strahl und sagt für sich
      selbst jeden weiteren Saum ab — sonst bekäme der Saum einen Saum, sobald
      der Comic-Modus das nächste Mal über die Szene läuft. Wo ein Usable
      **keine Geometrie** hat (eine Zone, ein Platz), liegt stattdessen ein
      **Ring auf dem Boden**: Eine umgestülpte Hülle von nichts ist nichts.
      **Der Saum ist die ganze Auskunft**, in jeder Ansicht. Daneben stand
      einmal eine Tafel in der Bildmitte („Tomate nehmen"), und sie sagte
      dasselbe ein zweites Mal — nur eben quer über der halben Küche statt
      dort, wo das Ding steht. Sie ist weg (`showUsePrompt` samt
      `USE_PROMPT_Y`); `Usable.usePrompt` bleibt als **Satz über die Tat**, den
      eine Welt selbst melden kann und den die Tests der Küche nachrechnen
      (`zones/kitchenCarry.kitchenPrompt`).
    - **Gerechnet wird auf dem Boden**, in x und z. Ein Knopf sitzt auf
      Hüfthöhe, ein Türgriff höher, eine Druckplatte am Boden — wer davorsteht,
      meint sie alle, und ein Strahl aus der Brust verfehlte die Platte um
      genau die Höhe der Brust. Jedes benutzbare Ding ist deshalb ein stehender
      Zylinder, mindestens 40 cm breit (`USE_RADIUS`): Auf einen vier
      Zentimeter großen Kippschalter zielt von oben niemand.
    - **Es ist dieselbe Wirkung wie in VR**, nicht eine zweite. Ein Knopf
      meldet sich mit `PortalWorld.addUsable(object, { use, usePrompt })` an;
      dahinter steht dieselbe Methode, die auch der Zeiger und die Hand
      aufrufen. Angemeldet wird in einer **Liste** der Welt und nicht in der
      Szene gesucht — die Frage „was ist hier benutzbar" steht in jedem Bild
      an, weil der gelbe Saum daran hängt. Am Objekt selbst hängt dieselbe
      Auskunft als `userData.usable`.
    - **Die Tafel ist ganz weg.** Sie begann einmal mit dem Namen des Knopfes
      (_A · Brötchen nehmen_), verlor ihn und behielt die Tat („Brötchen
      nehmen") — und auch die sagt der Saum schon, und zwar am Ding. In einer
      Küche im Gedränge stand damit dauernd ein Schild vor der Arbeitsfläche.
      Mit der Tafel fiel schon vorher `PlayerRig.useLabel` (sie war der einzige
      Ort, der den Namen des Knopfes je gelesen hat) und mit ihm
      `FlatControls.padSpoke`, das sich nur gemerkt hatte, ob zuletzt eine
      Taste oder ein Knopf sprach.
    - **Die Portal-Regel: Was man drücken kann, kann man auch treffen.** Der
      rote Knopf (`worlds/shared/redButton.ts`) hat einen Kollisionskörper an
      der Kuppel, und eine Kugel, die ihn unterwegs streift, ruft sein `use`
      auf und ist danach aufgebraucht (`PortalWorld.bulletTravelled`). Die
      Trefferfläche ist dabei um `SHOT_MARGIN` größer als der Körper: Eine
      Kugel fliegt nicht *in* einen Knopf hinein, sie bleibt an ihm stehen, und
      ihre Strecke endete sonst knapp außerhalb.
  - **Die Hand am Schirm** (`worlds/portal/screenHand.ts`). Von oben sieht man
    die Figur, und sie soll etwas halten — die Pistole vor allem, denn
    **Linksklick, `B` und RT sind ihr Trigger** (`PlayerRig.setTrigger`,
    `.trigger`). Am
    Schreibtisch gab es dafür bis dahin gar keine Hand: Werkzeuge hingen am
    Gürtel und kamen nur in eine Hand, die ein Controller trackte. Gebaut ist
    sie deshalb als das, was sie ersetzt — ein `ControllerState` ohne
    Controller, am Rig statt am Kopf. Damit läuft der **ganze** bestehende Weg
    (`takeTool`, `applyHold`, `onTrigger`, Zielkorrektur, Rückstoß), und es
    gibt keinen zweiten zum Schießen; das Werkzeug zeigt entlang −z des Rigs,
    also genau dorthin, wohin die Figur schaut. Sie entsteht mit der Ansicht
    und vergeht mit ihr; der Gürtel bleibt dabei unberührt. Und der **Strahl
    vom Schirm ruht** so lange (`Pointer.topDown`): Er käme aus der Kamera im
    Rig, die von oben niemand ansieht, und nähme dem Werkzeug seinen Trigger
    weg.
    - **Was darin liegt, wählt der Spieler** (`PortalWorld.screenTool()`).
      Lange stand dort fest, was die Welt beim Bauen hineingelegt hatte —
      ausgeliefert die Pistole, denn ein Trigger ohne Waffe bedeutet nichts —,
      und wer etwas anderes wollte, hatte Pech: In der Brille greift man ins
      Regal am Handgelenk, am Bildschirm gibt es keine Hand, die irgendwo
      hingreift. Jetzt sitzt unten rechts über `A` und `B` ein runder
      **Werkzeug-Knopf** (`#hud-tool`, `ui/ToolButton.ts`), der die Ikone des
      gewählten Werkzeugs zeigt — gezeichnet mit demselben Stift wie jede
      Menüzeile (`drawMenuIcon`), sonst lernt man zwei Bilder für ein Ding —,
      und ein Druck klappt eine **Seite** auf (`ui/PageMenu.ts`, eigener Baum).
      Tastatur: `Tab`; Gamepad: `Y`.
    - **Ganz oben steht die Hand (leer)**, und das ist eine Wahl und kein
      Fehlen: `screenTool()` gibt dann `null`, die Bildschirmhand bleibt leer,
      der Trigger tut nichts. Sie steht zuerst, weil sie die Ausnahme ist, die
      man am schnellsten wieder braucht — ein Werkzeug legt man weg, um etwas
      anderes zu tun. Darunter die Werkzeuge der Welt (`beltLoadout()`, sonst
      `TOOL_IDS`), und ein Tipp wählt **und schließt**: Eine Liste, die offen
      bleibt, verdeckt genau das, worauf man gerade zielen wollte. Was die Welt
      von sich aus hineinlegte, heißt jetzt `defaultScreenTool()` und ist
      bloß die Vorgabe.
  - **Aufgeschnitten wird, was über einem liegt** (`core/cutaway.ts` mit Test,
    Plan E8). Eine Kamera schräg über der Szene hat ein Problem, das eine
    Kamera in der Brille nie hatte: Sie steht **unter** dem Dach. In einem Haus
    ohne Fenster war das Bild von oben die Decke, in einer Stadt waren es die
    Dächer. Also verschwindet vor jedem Bild alles, dessen Ebene **über** der des Rigs
    liegt, und kommt danach wieder (`TopDownCamera.cut` / `.uncut`, gerufen in
    `App.step` — vor den Spiegeln und Portalsichten, die dieselbe Szene ja
    gleich noch einmal zeichnen). In der Brille und _Aus den Augen_ ändert sich
    dadurch nichts.
    - **Die Ebene hängt am Objekt** (`userData.level`) und wird nicht geraten:
      Ein Hochbett steht höher als eine Türklinke und ist trotzdem im selben
      Zimmer. `GridWorld` setzt sie beim Bauen aus dem Grundriss — Kacheln und
      Wände aus ihrer Etage, Bausteine und Einbauten aus ihrer Kachel, Massen
      aus ihrer Unterkante. Die **Decke** ist dabei der Sonderfall, und es ist
      der wichtige: Sie gehört dem Stockwerk **darüber**, denn sie ist dessen
      Boden — sonst sähe man in kein Zimmer hinein, dessen Haus nur eine Etage
      hat. Wer ohne Gitter baut, kann dieselbe Marke von Hand setzen
      (`World.viewLevel`), und mehr braucht es nicht. In Hub, Bauplatz und
      Testwelt steht ohnehin **kein Dach**: Ein Deckel, den man jedes Bild
      wieder wegnimmt, muss gar nicht erst gebaut werden.
    - **Welche Ebene das Rig ist, sagt die Kachel unter den Füßen**
      (`NavGraph.at`, `keyLevel`) — und die Höhe hat ein Wörtchen mitzureden:
      Ein Treppenlauf gehört ganz der unteren Etage (die Kachel darüber ist
      sein Loch), also zählt ab der **halben Stockwerkshöhe** schon die obere
      (`levelAtHeight`). Darüber liegt eine **Hysterese** an derselben Linie:
      Umgeschaltet wird beim Hinauf- wie beim Hinabgehen an derselben Höhe,
      sonst flackerte das ganze Stockwerk, sobald jemand auf der obersten Stufe
      einen halben Schritt zurücktritt (`levelStep`, rein, mit Test). Eine Welt
      ohne Antwort (`World.viewLevel` → `null`) wird gar nicht aufgeschnitten
      und sieht aus wie eh und je.
    - **Und die Kamera hebt sich mit der Ebene**, nicht mit den Füßen: Ihre
      Zielhöhe ist der Boden der Etage (`NavGraph.levelY`), weich nachgezogen
      von derselben Glättung wie die Figur. Mit den Füßen führe das Bild jede
      Treppenstufe einzeln mit.
  - **Und was daneben steht, wird durchsichtig** (`grid/wallGhost.ts` mit Test,
    umgesetzt in `GridWorld`). Das Aufschneiden nimmt weg, was **über** der
    Figur liegt; eine Wand auf derselben Ebene bleibt stehen — und die Kamera
    steht im Süden, also hinter jeder Wand, die südlich von der Figur liegt.
    In _Overcooked_ und den Sims ist das seit jeher dieselbe Antwort: Die Wand
    bleibt, wird aber durchsichtig.
    - **Gerechnet wird eine Strecke, kein Strahl in die Szene.** Jedes Bild
      geht eine Linie von der Kamera zur Mitte des Rigs gegen die Kästen des
      Gitters (`slabs`, Massen eingeschlossen) — seitwärts aber in der
      **Spalte der Figur** und nur gegen Wände, von denen die Kamera die andere
      Seite sieht als sie (`wallsHiding`, `GHOST_SHOULDER`). Beides ist eine
      Korrektur: Die Kamera zieht der Figur weich nach, und ein Strahl von der
      nachhinkenden Kamera aus erwischte beim Laufen die Wand **neben** ihr —
      nach Westen die eine, nach Osten spiegelbildlich die andere. Eine Wand,
      die neben der Figur entlangläuft, verliert keine Auskunft und bleibt
      deshalb stehen. Was sie schneidet, bekommt
      für dieses eine Bild ein **durchsichtiges Zwillingsmaterial** — gleiche
      Farbe, `transparent`, `opacity 0.25`, `depthWrite false` — und danach
      sein eigenes zurück. Die Zwillinge liegen in einer zweiten Palette und
      werden geteilt; ein Material je Quader wäre bei tausend Kacheln tausend.
      Die Auswahl selbst ist reine Rechnung, ohne three.js und ohne Raycaster,
      damit ein Test in Millisekunden nachrechnet, was man sonst nur in der
      Brille sieht.
    - **Böden zählen nicht.** Ein Blick von schräg oben geht über jede
      Bodenplatte hinweg, aber er **streift** sie — die Strecke zur Figur endet
      ja auf ihr. Wer Böden mitnähme, hätte in jedem Bild den halben Fußboden
      durchsichtig, und darunter ist nichts als Nacht. Also: die Sorte `floor`
      nie, und alles, was flacher als **Kniehöhe** ist, auch nicht
      (`GHOST_KNEE`) — eine Schwelle, eine Rampe, der Rand einer Druckplatte
      verdecken niemanden.
    - **Deshalb bleibt `batchGridGeometry()` in allen verbleibenden Welten
      `false`.** Zusammengefasste Geometrie spart Zeichenaufrufe und nimmt
      einem genau das, worum es hier geht: einen **einzelnen** Quader
      umzuschalten. Wer die Welten wieder zusammenfasst, hat entweder kein
      Ghosting mehr oder eine ganze Halle, die auf einmal durchsichtig wird.
  - **Umgeschaltet wird unter _Menü → Ansicht_** und auf der Startseite; die
    Wörter heißen _Von oben_ und _Aus den Augen_ und stehen an einer Stelle
    (`core/screenView.SCREEN_VIEW_LABELS`). Die **Kennungen** bleiben `2d` und
    `3d`: So stehen sie im Speicher jedes Browsers, der hier schon einmal offen
    war. In der Brille gibt es die Ansicht nicht — man steht darin.
    `World.ownsFlat` bleibt als Haken für eine Welt mit eigener Ansicht von
    oben; gesetzt hatte ihn nur Haunting, bis seine gemalte 2D-Karte mit dem
    1-m-Gitter ging (Paket H) — seither gilt auch dort die Kamera des Kerns.
    _Raster_, _Ebenen_, _Editor_ und _Plan
    zurücksetzen_ standen in diesem Menü, solange es eine eigene, gemalte
    Kachelwelt zu bemalen gab; gebaut wird jetzt im Bauplatz
    (`worlds/editor/WorldEditor.ts`).
- **Hub-Welt**: eine Halle, und von ihr gehen **Gänge** ab, an deren Wänden
  die Tore stehen — vier je Gang, zwei pro Seite und gegeneinander versetzt.
  Ausgelegt wird das aus nichts als der Länge der Weltenliste
  (`src/worlds/hub/hubGrid.ts`, mit Test): eine neue Welt bleibt damit das,
  was sie sein soll — ein Eintrag in der Registry. Der alte 90°-Bogen war für
  vier Welten hübsch und für zehn ein Gedränge.

  **Der Hub steht seit P4 auf dem Kachelgitter** (`GridWorld`, siehe _Welten
  auf dem Kachelgitter_), und das ist die Entscheidung, an der alles Weitere
  hängt: In der Brille und in der Ansicht _Von oben_ steht man im **selben**
  Raum, weil die Kamera ein Blickwinkel ist und keine zweite Welt. Boden,
  Wände und Navigationskarte kommen aus dem Grundriss; was `HubWorld` selbst
  baut, ist die Ausstattung — Himmel, Nebel, der Leuchtring auf dem
  Hallenboden, die Lichtbänder in den Gängen und die beiden Tafeln.

  Drei Sachen sind beim Umzug anders geworden, und alle drei, weil eine Welt
  auf dem Gitter genau vier Richtungen kennt: Es gibt **vier Gänge** (Nord,
  Ost, Süd, West) statt beliebig vieler auf einem Kreis — sind sie voll, werden
  sie **länger** statt mehr; die Tore schauen **zurück zur Halle** statt quer
  eingedreht, sodass man vom Eingang aus alle vier Schilder auf einmal liest;
  und die Halle ist ein **Quadrat**, dessen Rundung nur noch der Leuchtring auf
  dem Boden ist. Kein Dach über den Gängen,
  wie vorher auch: Von oben wäre ein gedeckelter Gang ein schwarzer Balken —
  aufgeschnitten wird zwar seit P7 (`core/cutaway.ts`), aber ein Deckel, den
  man ohnehin jedes Bild wieder wegnimmt, muss gar nicht erst stehen.

  **Auf Metergitter neu ausgelegt** (September 2026): Die Halle misst **elf
  mal elf** Kacheln (`HALL_HALF` = 5), die Gänge sind **drei** Kacheln breit,
  zwischen zwei Toren liegen **zwei** Kacheln, und das erste steht zwei
  Kacheln hinter dem Hallenrand. In Metern ist die Halle damit kleiner
  geworden als die sieben mal sieben von vorher (17,5 m) — und das ist der
  Punkt: Elf Meter sind ein Raum, den man in ein paar Schritten durchquert,
  und der Weg von Tor zu Tor ist keine Wanderung mehr. Was gleich geblieben
  ist, ist die Zusage des Tests: **jedes Tor ist vom Startpunkt aus wirklich
  zu erreichen**, und der Startpunkt liegt nie auf einer Torkachel.

  **Ein Tor ist ein Einbau** (`fixtures/gate.ts`, siehe _Einbauten_) und kein
  Möbel mit einem Zeigerziel daran: Man **geht hindurch**, statt darauf zu
  zeigen. Wer auf seine Kachel tritt und vier Zehntelsekunden stehen bleibt,
  ist drüben. Das Bild dazu — Podest, Ring in der Akzentfarbe, wirbelnde
  Scheibe, Schild (das sich zur Kamera dreht, siehe _Was die Kamera ansieht_) —
  steht in `hub/gate.ts`, weil die Werkzeugseite dasselbe
  Tor zeigt; dort steht es frei und in voller Größe, auf einer Kachel ein
  Sechstel kleiner, damit sein Sockel nicht in die Nachbarkachel ragt. Was
  hinter einem Tor liegt, trägt `HubWorld` beim Bauen aus `WORLDS` ein und
  nicht eine gespeicherte Datei — deshalb ist der Hub auch die eine Gitterwelt,
  an der **nicht** gebaut wird: Ein gespeicherter Hub wäre einer, in dem die
  Tore von letzter Woche stehen.

  **Der Rückweg**: Jede Gitterwelt setzt sich mit **einer Zeile** in `layout()`
  ein Tor `→ Hub` neben ihren Startpunkt — heute sind das der Bauplatz und die
  Testwelt. Neben ihren Startpunkt und nicht darauf: drei Kacheln Abstand,
  denn ein Tor direkt am Spawn ist eines, in das man beim ersten Schritt
  fällt, bevor man die Welt gesehen hat. Was kein Gitter hat, bleibt beim
  Handgelenkmenü, das ohnehin überall dasselbe kann.
- **Handgelenk-Menü**: an **beiden** Händen schwebt ein Button; ein Druck öffnet ein
  Panel, das der Hand folgt — inklusive Neigung, es kippt mit dem Handgelenk.
  Es ist zweimal dasselbe Menü, und immer nur **eins offen**: das zweite geht
  zu, sobald das erste aufgeht. Ein Menü nur links war genau so lange in
  Ordnung, wie die linke Hand nichts zu tun hatte — mit einer Waffe, einer
  Drohne oder einem Lenkrad darin kam man nur noch heran, indem man das Ding
  weglegte.
  Das Panel steht senkrecht auf dem Handrücken und schaut den Kopf an.
  Ausgewählt wird mit der anderen Hand: zielen und **Trigger oder `A`** drücken
  — Hovern allein löst nichts aus, und angetippt wird auch nichts. Ohne
  getrackte Hand hängt dasselbe Menü an der Blickrichtung.
  **Ohne Brille ist es eine Seite** (`ui/PageMenu.ts`, mit Test): Im
  Browserfenster — Startseite, Desktop, Handy — öffnet der runde Knopf **oben
  links** (`#hud-menu`, auf der Startseite `#landing-menu`) dasselbe Menü als
  DOM, mobile first: auf dem Telefon ein Blatt von unten mit Zeilen, die ein
  Daumen trifft, ab 640 Punkten Breite ein Kasten unter dem Knopf
  (`ui/pageMenu.css`, `z-index` 20, über allem). Es liest **denselben Baum**
  (`MenuEntry`) mit denselben Ikonen (`drawMenuIcon`) und **denselben Weg**
  (`menuNav.ts`): wer im Browser drei Ebenen tief steht und die Brille
  aufsetzt, steht dort auf derselben Seite. Zurück über den Pfeil im Kopf,
  Schließen über ×, Escape oder einen Tipp daneben; Schalter, Punkt,
  Abzeichen und Raster (Kacheln, Bildunterschrift darunter) wie am Arm; auf
  einer Nimm-Seite nimmt ein Tipp, und der Pfeil daneben öffnet die
  Einstellungen. Die kleinen Modelle (`preview`) gibt es dort nicht, die Ikone
  steht dafür. **Gezeichnet wird an Ort und Stelle**: Der Baum wird zweimal
  die Sekunde neu gebaut (Bildraten-Zeile), und `replaceChildren` riss dabei
  den Knopf unter dem Finger aus dem DOM — ein Tipp, der auf dem alten
  anfängt und auf dem neuen endet, ist kein Klick. Also werden frische Zeilen
  mit den stehenden verglichen (`data-key`, `outerHTML`) und nur geänderte
  getauscht; die Blätterstellung bleibt. **Welches Gesicht gilt, entscheidet
  `WristMenus`**: `presenting` (von `App` bei Sitzungsbeginn und -ende
  gesetzt) schickt `toggle`, `openSubmenu`, `isOpen`, `refresh` und
  `setStatus` an die Handgelenke oder an die Seite; beim Aufsetzen geht die
  Seite zu, beim Absetzen der Arm. Keine Welt weiß davon — `ctx.menu` ist
  dieselbe Klasse mit denselben Aufrufen. Öffnet ein Eintrag die Tastatur
  (`App.openKeys`), geht die Seite zu, weil die Tastatur ein Panel in der
  Szene ist und sonst dahinter läge. Die Kopfzeile im Web (`#hud`) ist damit
  **oben links der Menü-Knopf, oben rechts** Weltname, Verbindung und VR; auf
  einem schmalen Telefon fällt der Weltname weg, bevor ein Knopf es tut. Unten
  rechts steht der zweite runde Knopf, der **Werkzeug-Knopf** (`#hud-tool`) —
  er öffnet eine eigene Seite mit einem eigenen Baum und nicht einen Ast dieses
  Menüs, denn er beantwortet eine Frage, die man mitten im Zielen stellt
  (_Von oben_, „Die Hand am Schirm").
  Aufbau: **Welten** (Hub, Bauplatz, Testwelt, Spiel Haunting),
  **Werkzeuge**
  (das ganze Regal direkt in die Hand, und die Einstellungen jedes Werkzeugs
  dahinter), **Magischer Beutel** (Raster mit Companion Cube, Kugel, Domino,
  Pyramide, Quader, Planke, Zylinder, Kegel, Rampe, Stab, Murmel, Sektflasche
  und dem **Würfelsatz** W4, W6, W8, W12, W20 — siehe _Was aus dem Beutel
  kommt_),
  **NPC** (wer hier herumläuft — Haut und Hirn getrennt, dazu Spawnpunkte und
  Brutkäfige; siehe _Wer hier herumläuft_),
  **Bewegung** (Haltung, Augenhöhe, Sprint und Ducken), **Aussehen** (drei
  Zeilen: Kopf, Hut, Körper — siehe _Wie man aussieht_), **Grafik** (Schatten,
  Einfach oder Comic, dazu die Gitterlinien — siehe _Wie schön es aussieht_),
  **Einstellungen** und die Aktionen der Welt.
  Auf den Seiten **Werkzeuge** und **Magischer Beutel** nimmt **Greifen oder
  `A`** den Eintrag in genau die zeigende Hand, damit der Zieltrigger nicht
  versehentlich die Hand füllt. Das Raster kommt zurück, sobald du loslässt.
  Der **Trigger** hat dort eine andere Aufgabe: er geht in die
  **Einstellungen des Werkzeugs**, hinter den Pfeil am Zeilenende. Beides
  zugleich wäre das Schlimmste von beidem — man hätte das Ding in der Hand
  _und_ stünde eine Seite tiefer —, also merkt sich das Menü im Moment der
  Auswahl, womit gedrückt wurde.
  In der Zeile eines Werkzeugs steht statt der Strichzeichnung ein **kleines
  Modell des Werkzeugs selbst**, das sich langsam dreht: bei sechs Handschuhen
  und drei Pistolen ist eine Ikone bald keine Auskunft mehr. Es ist vom
  Regalexemplar abgeschrieben — nur die sichtbaren Netze, mit derselben
  Geometrie und demselben Material —, hängt am Panel und fängt **keinen
  Strahl** ab, die Zeile dahinter bleibt also genauso anfassbar wie vorher
  (`ui/WristMenu.ts`, `MenuEntry.preview`).
  Passt eine Seite nicht aufs Panel — das Werkzeugregal tut das längst nicht
  mehr —, wird geblättert, auf zwei Arten: **mit dem Stick der zeigenden Hand**
  hoch/runter, oder indem man den **Trigger hält und wischt**, wie auf einem
  Telefon; eine volle Panelhöhe schiebt eine volle Seite. Rechts zeigt ein
  Balken, wo man gerade ist. Links/rechts bleibt der Snap-Turn.
  Damit das Wischen nicht jedes Mal zuerst die Zeile drückt, auf der es
  anfängt, **wartet eine Auswahl im Handgelenkmenü aufs Loslassen** und fällt
  weg, sobald aus dem Druck ein Zug wird; `A` und die Maus wählen sofort aus,
  und alles außerhalb des Handgelenkmenüs bleibt, wie es war.
  Und **wer blättert, läuft nicht los**: zeigt eine Hand aufs offene Menü und
  benutzt ihren Stick, gehört der Stick diese Frame dem Menü und nicht den
  Beinen (`PlayerRig.menuStick`).
  Die **Zurück-Zeile bleibt als Kopf stehen**, egal wie weit man geblättert
  ist — wie der Kopf einer Webseite, und auf einer Rasterseite als Balken über
  den Kacheln. Vorher war sie schlicht der erste Eintrag der Liste und nach
  drei Zeilen weg; aus einer langen Seite kam man nur wieder heraus, indem man
  erst blind nach oben blätterte (`UIPanel`, `PageOptions.pinned`).
  **Das Menü bleibt stehen, wo man war** — auf der Seite und in der Liste, und
  zwar **für beide Hände gemeinsam**. Beides wurde ständig zurückgesetzt, und
  beides aus demselben Grund: der Baum
  wird bei jeder Änderung neu gebaut, und eine Zeile zu drücken ist ja gerade
  das, was ihre Beschriftung ändert. Ein Werkzeug aus dem Regal nehmen oder
  eine Einstellung eine Raste weiterschalten warf einen an den Anfang der
  Liste — beim Regal also vor jedem einzelnen Werkzeug erneut —, und Zumachen
  warf einen zusätzlich auf die oberste Ebene. Dasselbe eine Ebene höher: jedes
  Handgelenk hatte seinen eigenen Merkzettel, also fing das Menü an der rechten
  Hand wieder ganz oben an, wenn man es links drei Ebenen tief verlassen hatte
  — und genau dann macht man es rechts auf, wenn links etwas drinliegt.
  Jetzt liegt der Weg einmal da und wird von beiden Panels gelesen
  (`src/ui/menuNav.ts`, mit Test), samt der Zeile, in der man war. Wo man ist,
  sagt
  die Überschrift auf dem Panel und die _Zurück_-Zeile. Verschwindet eine Seite
  aus dem Baum, endet der Weg dorthin bei ihrer Elternseite. Die Blätterregel
  steht in `src/ui/pageScroll.ts` (mit Test), inklusive der Klemmung nach
  unten: eine Seite kann zwischen zwei Besuchen Zeilen verlieren, und ein übrig
  gebliebener Versatz zeigt sonst ein leeres Panel.
- **Zeigestrahl an beiden Händen**: jeder Controller hat seinen eigenen Strahl
  mit eigenem Cursor — was die eine Hand gerade hält, hindert die andere nicht
  am Zeigen. Das Panel eines Werkzeugs in der rechten Hand wird also mit der
  linken bedient und umgekehrt. Ruht ein Strahl auf einem Panel, gehört der
  Trigger **nur dieser einen Hand** dem Menü; die andere Hand feuert oder greift
  ungestört weiter. Zwei Ausnahmen: eine Hand, die ein Gerät mit beiden Fäusten
  hält (die Drohne), hat gar keinen Strahl, und das Handgelenk-Menü hört den
  Strahl der Hand, an der es hängt, nicht — sonst würde es beim Drehen des
  Handgelenks über den eigenen Knopf streichen.
- **Türkis heißt anfassen**: alles, was eine Hand nehmen darf, hat dieselbe
  Farbe — die Griffe der Werkzeuge, der Ring um die Linse der Taschenlampe,
  die Plätze am Gürtel, die Griffe an einem Kletterfelsen, das Lenkrad eines
  Karts. Eine Spülmaschine
  sagt einem auch nie, wo der Griff ist; sie färbt ihn, und danach greift
  jeder beim ersten Mal richtig. In VR wiegt das schwerer als daheim, weil ein
  Werkzeug ein Klotz aus Dreiecken ist und man ihm nicht ansieht, ob man es am
  Lauf oder am Schaft nehmen soll. Daneben ein zweiter, hellerer Ton fürs
  **Leuchten in dem Moment**, in dem die Hand nah genug ist — verwandt und
  bewusst nicht gleich, denn „das kann man nehmen" und „das kann man _jetzt_
  nehmen" sind zwei Nachrichten. Beide Zahlen stehen an genau einer Stelle
  (`src/core/colors.ts`), das Material dazu baut `grabMaterial()` in
  `tools/Tool.ts`; eine zweite türkise Zahl irgendwo im Code ist das, was die
  Regel nach drei Monaten kaputt macht.
- **Werkzeuggürtel**: an beiden Hüften hängt ein Platz für ein Werkzeug. Was
  in der Hand ist und in die Nähe eines Platzes kommt, lässt den Ring
  aufleuchten — dort loslassen legt es ab, Greifen nimmt es wieder. Jedes
  Werkzeug passt auf jeden Platz, sie lassen sich also frei tauschen.
- **Eine Hüfte merkt sich ihre Bestückung**, nicht ihr Exemplar
  (`BeltSlot.stored`). Wer die Pistole links herausnimmt, sie in die andere
  Hand gibt und rechts einsteckt, hat danach **an beiden Hüften** eine — links
  wächst nach, was dort hingehört. Vorher blieb dort ein leerer Ring zurück:
  das Umhängen war ein Weg, eine Waffe zu verlieren, und man holte sie sich im
  Regal wieder. Nachgefüllt wird nur eine Hüfte, an der wirklich etwas hing;
  ein Werkzeug aus dem Regal hat keine, und auf einer fremden Hüfte wächst
  ihm nichts nach.
- **Ein Werkzeug ist nicht ein Exemplar.** Es gibt je Id ein _gepooltes_ —
  daran hängen Beschriftung, Werte und das kleine Modell im Regal —, und
  daneben so viele Kopien, wie gebraucht werden (`PortalWorld.freshTool`).
  Vorher gab es genau eines, und damit war „zwei Pistolen" nicht vorgesehen:
  Wer sich aus dem Regal eine zweite in die andere Hand holte, bekam
  dieselbe, und sie verschwand aus der ersten Hand. Jetzt sind zwei Waffen
  zwei Waffen — einzeln zu nehmen, einzeln zu werfen, und danach liegen
  beide auf dem Boden.
- **Wo der Gürtel hängt, ist einstellbar** (`beltSettings.ts`, mit Test): drei
  Zahlen — Abstand zur Seite, Höhe als _Anteil der Augenhöhe_, Tiefe vor oder
  hinter der Körpermitte. Sie gelten für **beide** Hüften, gespiegelt; ein
  Gürtel, bei dem eine Seite tiefer hängt als die andere, ist kein Gürtel,
  sondern ein Versehen. Die Höhe steht als Anteil, damit sie mit dem
  mitwächst, der sie trägt, und im Sitzen nicht auf Brusthöhe rutscht.
  Verschoben wird mit dem **Gürtel-Justierer** (siehe unten), gespeichert wird
  im Browser (`bgvr.belt`).
- **Loslassen heißt fallen lassen**: wer ein Werkzeug irgendwo _anders_ als
  über einer Hüfte loslässt, lässt es fallen — es liegt dann als Objekt im
  Raum, kann angestoßen und von jeder Hand wieder aufgehoben oder in der Luft
  aufgefangen werden. Im selben Moment wächst auf der Hüfte, von der es kam,
  ein **neues** nach. Damit ist „Waffe ziehen, in die andere Hand geben, noch
  eine ziehen" eine durchgehende Bewegung.
  **Geworfen wird mit dem schnellsten Moment**, nicht mit dem letzten: wer
  wirft, öffnet die Hand am Ende der Bewegung, der Griffknopf meldet das ein
  paar Millisekunden später, und da bremst der Arm schon wieder ab. Ein
  geglättetes „jetzt" trifft dann genau in die Bremsphase — es fühlt sich an,
  als hätte das Spiel den Wurf einen Tick zu spät erkannt, und das hatte es
  auch. Genommen wird deshalb die schnellste Bewegung der letzten 0,14 s,
  über je zwei Bilder gemittelt, damit ein Trackingzucken keinen Wurf auslöst
  (`portal/throwMotion.ts`, mit Test).
  **Und der Drall geht mit**: ein hochgeworfener Dominostein taumelt, eine
  Taschenlampe flog lange wie ein Brett. Der Unterschied lag nicht an der
  Physik, sondern daran, woher die beiden ihre Drehung bekommen — ein
  gegriffener Gegenstand hängt als kinematischer Körper an der Hand, und Rapier
  liest seine Winkelgeschwindigkeit beim Loslassen aus zwei aufeinanderfolgenden
  Lagen ab; ein Werkzeug hängt als Kind der Hand im Szenengraph und bekommt
  seinen Körper erst in dem Moment, in dem es fällt, mit allem auf null.
  `HandSpeed` misst deshalb auch die **Drehung** der Hand (`spinBetween`, mit
  dem kürzeren Bogen, damit aus einer winzigen Drehung nicht gelegentlich eine
  fast volle in die falsche Richtung wird) und gibt sie nach derselben Regel
  weiter wie das Tempo: der schnellste Moment im Fenster. Gedeckelt bei gut
  drei Umdrehungen je Sekunde — ein Trackingaussetzer meldet sonst zweihundert
  Radiant. Das gleitende Messer behält seinen eigenen Überschlag: es dreht sich
  um die Ebene des Wurfs und nicht um das Handgelenk.
  **Und die Richtung ist nicht die Bewegungsrichtung**: Wer zielt, führt den Arm
  von oben nach unten und hält die Klinge dabei die ganze Zeit auf das Ziel —
  die Bewegung geht nach unten, gemeint ist geradeaus, und der Wurf landete im
  Boden. Zu beheben war das nicht, indem man die Hand anders bewegt; es _ist_
  die Wurfbewegung. Ein geworfenes Messer nimmt deshalb drei Antworten
  zusammen (`throwMotion.ts`, `throwDirection`, mit Test): wohin die Hand fuhr,
  **wohin sie am Ende zeigte** — der Zeigestrahl, gemittelt über die letzten
  0,06 s, in denen auch das etwas verspätet gemeldete Loslassen steckt, also
  ohne dass irgendetwas warten müsste — und **wohin geschaut wird**. Der Blick
  zieht wie in jedem Spiel mit Wurfwaffen: bis 10° zwischen Wurf und Blick ist
  er gemeint und gewinnt ganz, bis 35° verläuft sich seine Hilfe weich, darüber
  hinaus zählt nur die Hand. Wer geradeaus schaut und absichtlich nach rechts
  wirft, wirft nach rechts. Genommen wird dabei nicht die Blickrichtung,
  sondern der **Punkt, auf dem der Blick liegt** (`PortalWorld.gazeAim`, sonst
  zwölf Meter geradeaus): Der Blick geht vom Kopf aus, der Wurf von der Hand,
  und ein halber Meter Versatz sind auf fünf Meter gut fünf Grad daneben. Das
  alles gilt nur für einen **wirklichen Wurf** eines gleitenden Werkzeugs; ein
  fallengelassener Hammer fällt weiter dorthin, wohin er geschoben wurde.
- **Von Hand zu Hand**: ein gehaltenes Werkzeug kann die andere Hand
  übernehmen, ohne dass es dafür erst fallen muss. Beide Hände zusammenführen,
  die leere greift — fertig. Gemessen wird gegen den **Griffpunkt** der
  haltenden Hand und nicht gegen die Ausdehnung des Werkzeugs
  (`grabReach.ts`, `atHandGrip`/`HANDOVER_REACH`, 16 cm, mit Test): eine
  Taschenlampe ist dreißig Zentimeter lang, und wer sie übernimmt, fasst sie am
  Rohr an und nicht vorn an der Linse. Genau dort — und nur dort — leuchtet die
  Hand und öffnet sich zum Zugreifen, wie vor einem Gegenstand, plus einem
  Stups beim Ankommen; zwei Fäuste aneinander sieht man in der Brille schlecht.
  Eine Faust, die schon zu ist, bekommt das Zeichen nicht: das ist auch die
  Hand, die eben abgegeben hat, und sie soll das Werkzeug nicht im selben
  Atemzug zurücknehmen. Die Übergabe geht **vor** dem Gürtel — über einer Hüfte
  stehen die Hände nun einmal beieinander, und wer beide zusammenführt, meint
  das Werkzeug und nicht das Regal dahinter. Ein **geparktes** Werkzeug
  (in einer Schwerelos-Zone) bleibt liegen, und eines, das diese Hand ohnehin
  beansprucht
  (`claimsHand` — das Drohnendeck, ein Fach im Beutel), wird bedient statt
  genommen. Wie viele Exemplare gleichzeitig
  _außerhalb des Gürtels_ sein dürfen — herumliegend und in Händen zusammen —,
  sagt das Werkzeug selbst (`Tool.looseLimit`, normal eins), und zwar **pro
  Gürtelplatz**: kommt eins zu viel dazu, holt sich der Raum das älteste
  **liegende** von _diesem_ Platz zurück. Bei eins heißt das genau, was es
  soll: die frische Pistole von der linken Hüfte holt die von der linken
  Hüfte liegengelassene ein — und lässt die rechte in Ruhe. Genau daran ist
  die alte Zählung gescheitert: pro Werkzeug-Id gezählt waren eine Waffe
  links und eine rechts schon eins zu viel, und die zweite fallen zu lassen
  ließ die erste verschwinden. Zwei Hüften sind zwei Vorräte
  (`tools/looseBudget.ts`, mit Test). Beim Messer sind es fünf, also fünf
  pro Hüfte.
- **Werkzeuge** (alle in jeder Welt mit Gürtel):
  - **Portal-Waffen**: zwei einzelne und eine kombinierte (Trigger rot,
    Greifen blau, muss nicht dauerhaft gehalten werden).
  - **Größe & Position**: Blender-artige Griffe — sie erscheinen **vor dir**,
    nicht am Objekt, und wirken trotzdem auf das Objekt am anderen Ende des
    Raums. Achsen sind die des Objekts, nur nach deiner Blickrichtung sortiert.
  - **Gürtel-Justierer**: zielt auf eine Hüfte, Trigger wählt sie aus, die
    **andere Hand** greift zu und schiebt. Solange er in der Hand liegt,
    stehen um beide Hüften Kisten — die angezielte trägt die Greiffarbe, die
    gewählte leuchtet. Geschoben wird **relativ**: die Hüfte springt der Hand
    nicht entgegen, sondern nimmt mit, was die Hand seit dem Zugreifen
    zurückgelegt hat; anders ließe sich nichts um zwei Zentimeter versetzen.
    Beide Hüften bewegen sich dabei, gespiegelt. Loslassen speichert, ein
    zweiter Trigger gibt die Hüfte frei, `A`/`X` setzt zurück (dasselbe steht
    im Menü unter _Werkzeuge → Gürtel-Justierer → Gürtel_). Während eine Hüfte
    gewählt ist, gehört die andere Hand dem Gürtel (`claimsHand`): sie zieht
    dabei kein Werkzeug aus dem Halfter — sie greift ja genau dort zu.
  - **Pinsel** samt Palette auf der anderen Hand. Ausgewählt wird darauf auf
    **zwei** Arten, und beide sind Gesten, die es anderswo schon gibt:
    **antippen** mit der Pinselspitze — der kurze Weg, wenn die Hand ohnehin
    dort ist — oder **zielen und Trigger**, wie an jeder anderen Tafel. Dafür
    hängt die Palette als Pointer-Ziel im Raum (`ctx.pointer`) und hört dabei
    **nur auf die Pinselhand**: der Strahl der Hand, die sie trägt, striche
    sonst dauernd über sie hinweg und nähme genau dieser Hand ihren Trigger
    weg (`PointerTarget.ignore`). Antippen war eine Weile der einzige Weg, und
    das hieß: jede Farbe kostet einen Griff quer durch die Luft, auch wenn man
    gerade drei Meter weiter etwas anstreicht.
    Oben rechts steht ein **✕**: die Palette geht zu und bleibt zu, `A`/`X`
    macht sie wieder auf (und wieder zu). Sie ist die eine Tafel, die die ganze
    Zeit über der freien Hand schwebt — wer mit dem Pinsel in der Hand etwas
    _anderes_ tun will, soll sie wegräumen können, ohne den Pinsel wegzulegen.
    Trifft der Trigger eine **Leinwand** statt eines Objekts (die Staffelei,
    siehe unten), wird gemalt statt gestrichen: halten und ziehen ist ein
    Strich, und der Klecks wird mit dem vorigen verbunden, solange derselbe
    Strich läuft. Wo er landen würde, steht dabei schon auf dem Blatt: ein
    **Ring** in der geladenen Farbe, so breit wie der Strich selbst
    (`PaintSurface.aimAt`/`aimRay`, gezeichnet in `PaintBoard`). Aus zwei
    Metern auf eine Staffelei zu zielen hieß vorher: drücken und nachsehen —
    der Zeigestrahl endet irgendwo im Raum, und wo genau er das Blatt
    schneidet, sieht man einem Strich in der Luft nicht an. Gesucht wird er
    genau wie beim Malen (erst die Spitze, dann der Strahl, die erste Leinwand
    gewinnt), damit der Ring dort steht, wo der Trigger auch hinträfe. Liegt
    der Strahl gerade auf der **Palette**, gibt es keinen Ring: dann nimmt der
    Trigger eine Farbe und malt nicht.
    Die Palette hat drei Reiter: **Farben**, **Pinsel**
    und **Material** (Lack, Metall, Gummi, Eis, Stein, Glas, Leuchtend,
    Schaum — `materials.ts`, mit Test).
    Unter **Farben** stehen die zwölf festen Töne, darunter die **eigene
    Reihe** (sechs Plätze) und drei **Regler für Rot, Grün und Blau**. Zwölf
    Töne reichen, um eine Kiste anzustreichen; sie reichen nicht, um zu _malen_
    — jeder Ton, den sie nicht treffen, war vorher ein Ton, den es nicht gab.
    Ein Regler wird nicht getippt, sondern **gezogen**: Trigger halten und
    daran entlangfahren (oder mit der Pinselspitze daran entlangstreichen);
    ein Wert, den man nur antippen kann, stellt man in der Brille nie ein.
    _Speichern_ legt die gemischte Farbe vorn in die eigene Reihe (ohne
    Doppelte, die älteste fällt hinten heraus), _Weg_ nimmt sie wieder heraus,
    und ein leerer Platz nimmt sie auch direkt an. Sie überlebt den nächsten
    Start (`bgvr.brush`).
    Unter **Pinsel** stehen **Art** und **Breite** (`tools/brushSettings.ts`,
    mit Test). Vier Arten, und sie unterscheiden sich in dem, was man sieht:
    **Rund** (weiche Spitze, voller Ton), **Flach** (ein liegendes Rechteck,
    ein Drittel so hoch wie breit — quer gezogen ein Band, längs ein Strich),
    **Filzstift** (harte Kante) und **Sprühdose** (gestreute Punkte, jeder
    fast durchsichtig, erst das Bleiben macht sie dicht). Die Breite steht in
    **Millimetern auf der Leinwand** und nicht als Anteil des Blattes: eine
    Zahl, die man liest wie am Pinselkasten, und eine, die auf einer kleineren
    Leinwand nicht plötzlich etwas anderes bedeutet. Der Pinsel zeigt beides
    an sich selbst — die Spitze trägt die Farbe und wächst mit der Breite.
    Ein Abdruck, der keine runde Kappe ist, kann sich beim Ziehen nicht auf
    `lineCap` verlassen: Flachpinsel und Sprühdose stempeln ihn deshalb dicht
    an dicht die Strecke entlang (`stampCount`, ein Drittel der Breite
    Abstand). Ein Material ist beides zugleich, wie
    das Objekt _aussieht_ und wie es sich _verhält_: Gummi springt, Eis
    rutscht, Glas ist durchsichtig, Leuchtend leuchtet. **Lack** ist der Weg
    zurück, ohne ihn wäre jeder Strich endgültig. Ein Strich setzt immer
    beides — was die Palette zeigt, ist das, was das Objekt bekommt; eine
    Farbe, die je nach Vorgeschichte mal das Material mitnimmt und mal nicht,
    kann man in der Brille nicht lesen. Farbe und Material gehen über das Netz
    (ältere Mitspieler schicken nur die Farbe).
    Gehalten wird er am **Stiel**: der ist in Greiffarbe und liegt als Stab
    auf dem Zeigestrahl wie der Stiel des Hammers — nur **wie ein Stift**
    (`BRUSH_HAND_POSE`): Daumen und Zeigefinger kneifen ihn kurz hinter der
    Zwinge, der Mittelfinger stützt von unten, Ring- und kleiner Finger liegen
    eingerollt darunter, und der Stiel läuft nach hinten über die Schwimmhaut
    aus der Hand. Er lag davor als Stab **von oben** in der ganzen Faust, wie
    ein umgedrehter Hammerstiel — besser als die Hammerfaust davor, aber immer
    noch eine Faust, und in der Brille sah der Pinsel damit nach Werkzeug aus
    statt nach Stift. Kein sichtbarer Halterzylinder darunter, und er zeigt
    trotzdem dorthin, wohin man zeigt.
  - **Staffelei**: das Werkzeug, das eine **Leinwand hinstellt** — und damit
    das, was dem Pinsel bisher fehlte. Er konnte Dinge anstreichen; _malen_
    ging nicht, weil es nichts gab, worauf ein Strich ein Strich bleibt. In
    der Hand ist sie ein zusammengelegtes Bündel am Standardgriff; ein Kreis
    auf dem Boden zeigt, wohin sie kommt, **Trigger** stellt sie dort auf, mit
    dem Blatt zum Spieler. `A`/`X` **wischt das Blatt leer**, sonst
    wäre der erste misslungene Strich das Ende des Bildes.
    Danach ist die **Hand wieder leer**: das Bündel geht an den Gürtel
    (`ToolHost.stowTool`). Wer eine Staffelei abgestellt hat, hat sie
    abgestellt — sie danach noch als Bündel mitzutragen ist die Sorte Zustand,
    die man erst bemerkt, wenn man damit irgendwo hängenbleibt, und ein zweites
    Bündel auf dem Boden wäre eine zweite Staffelei, die keine ist.
    Umgestellt wird sie an ihren **beiden Traggriffen** an den Enden der
    Ablage: Hand daran, greifen, und sie liegt wieder im Arm
    (`ToolHost.takeTool`) — der nächste Trigger stellt _dieselbe_ woandershin,
    eine zweite holt man aus dem Regal. Die Griffe sind der Preis dafür, dass
    sie **kein Prop** ist: ohne Körper fasst keine Hand sie an, und einen
    Körper darf sie nicht haben (siehe unten). Sie sitzen weiter außen als die
    Leinwand breit ist, damit man beim Zupacken nicht ins Bild greift, und
    tiefer als deren Unterkante, damit man sie überhaupt sieht. Eine Hand, die
    schon etwas hält, greift dort nicht zu — wer mit dem Pinsel an der Leinwand
    steht, malt und räumt sie nicht ein.
    Gemalt wird mit dem Pinsel: Spitze ans Blatt oder von weiter weg
    daraufzielen, Trigger halten und ziehen; die Farbe kommt von der Palette.
    Sie ist mit Absicht **kein Hindernis** — man geht durch sie hindurch, und
    genau das ist die Bedingung fürs Malen: eine Pinselspitze muss das Blatt
    berühren dürfen, und ein Körper, der sie wegschiebt, verhindert es.
    Das Blatt steht **fünfzehn Zentimeter vor dem Dreibein** (`BOARD_Z`), und
    die Ablage wandert mit. Das ist keine Kosmetik: die beiden vorderen Beine
    kreuzen die Bildhöhe noch sieben Zentimeter vor der Achse, die Querlatte
    oben zwei — ein Blatt bei 7,5 cm lag damit _im_ Holz, von vorn sah man zwei
    Latten quer über der Leinwand, und der Pinsel malte auf einen Balken. Eine
    echte Staffelei stellt die Leinwand ohnehin **vor** die Beine auf eine
    Ablage und nicht zwischen sie.
    Die Verdrahtung dazu ist der Punkt, an dem man sie sich ansehen sollte:
    der Pinsel kennt keine Staffelei und die Staffelei keinen Pinsel. Beide
    kennen `PaintSurface` (`tools/paintCanvas.ts`), die Staffelei meldet ihre
    Leinwand über `Tool.paintSurface()`, und die Welt reicht sie über
    `ToolHost.paintSurfaces()` weiter. Wo ein Punkt oder ein Strahl auf dem
    Blatt landet, rechnet dasselbe Modul (mit Test), gezeichnet wird in
    `PaintBoard.ts`. Was gemalt wird, geht **nicht** über das Netz — ein Bild
    ist eine Leinwand voller Bildpunkte, und die schickt man nicht dreißigmal
    je Sekunde durch eine Peer-Verbindung.
  - **Pistole** mit Magazin (`x/∞` an der Seite). Unter
    _Einstellungen → Pistole_ steht jeder Wert einzeln: Stärke, Kugeltempo,
    Feuerrate, **Magazingröße**, Nachladezeit, Salvenlänge und Modus (Einzel,
    Salve, Automatik). Jede Zeile schaltet auf die nächste Raste weiter **und
    zeigt die rohe Zahl daneben** — und unter _Werte eingeben_ lässt sich jede
    davon über eine Tastatur direkt tippen. Dazu **Zielhilfen** (Rotpunkt,
    Kimme & Korn, Flugbahn, Röntgen, **Fernrohr** — oder alles ab), der
    **Zoom** des Fernrohrs (16×, 20×, 24×, 28×, 32×, 36× durchklicken oder
    zwischen 1 und 60 tippen) und die **Munition** (normal oder Leuchtspur).
  - **Messer**: das eine Werkzeug, das zum Loslassen gedacht ist. Aus der
    Bewegung heraus losgelassen fällt es nicht, sondern **fliegt weiter** —
    geradeaus, ohne Bogen, und überschlägt sich dabei **vorwärts**: die Spitze
    geht oben herum nach vorn, in der Ebene des Wurfs. Die Drehachse ist
    deshalb `oben × Flugrichtung` (`portal/throwMotion.ts`, mit Test) und
    nicht mehr die x-Achse des Werkzeugs — die liegt in der linken Hand anders
    herum als in der rechten, und aus derselben Wurfbewegung wurde einmal ein
    Überschlag nach vorn und einmal einer nach hinten. **Geflogen wird
    dorthin, wohin gezielt wurde** — aus Bewegung, Zeigerichtung der Hand und
    Blick zusammen, siehe „Loslassen heißt fallen lassen" weiter oben. Es bleibt
    stecken, wo es auftrifft (Wand, Kiste, egal). Fünf dürfen gleichzeitig
    unterwegs oder eingeschlagen sein; der sechste Wurf holt das erste
    zurück. Die Bahn wird pro Frame selbst abgetastet statt auf einen
    Abpraller zu warten — nur so bleibt es _stecken_, statt abzuprallen.
    Es war einmal ein **Wurfstern**, und der hatte keinen Griff — er lag „in
    den Fingerspitzen", also nirgends, und die Boxhand sah an ihm nach nichts
    aus. Das Messer hat einen: den **Standardgriff**, senkrecht in der Faust
    wie ein Pistolengriff, mit derselben Faust darum; die Klinge ragt oben aus
    der Faust heraus, entlang der Griffachse, die Schneide nach vorn
    (`tools/KnifeTool.ts`). Eine Weile lag es als **Stab** quer durch die Faust,
    wie die Taschenlampe damals, die Klinge auf dem Zeigestrahl — so hält man
    eine Lampe, kein Messer; um 90° gekippt also. Die
    Id heißt `knife`; im Kurzcode steht es auf dem Platz des Sterns.
  - **Großer Hammer**: ein Meter Stange, vorn ein Kopf aus Eisen — und das
    erste Werkzeug, das man **irgendwo** anfassen kann. Der türkise Belag am
    Stiel ist der Griff, und er ist absichtlich lang: weit hinten am Knauf hat
    man die ganze Reichweite, weit vorn die Kontrolle, und beides will man nicht
    als Einstellung, sondern mitten in der Bewegung. **Eine Hand** hält ihn wie
    jedes andere Werkzeug, entlang des Zeigestrahls, Kopf nach vorn — neu ist
    nur, _welcher Punkt_ des Stiels dabei in der Faust liegt. Die **zweite
    Hand** kommt dazu, sobald sie am Stiel zudrückt (sie zieht dann nichts mehr
    von der Hüfte, `claimsHand`); ab da liegt der Stab auf der Linie zwischen
    den beiden Fäusten, jede an ihrem Punkt, und der Kopf zeigt von der
    hinteren Hand weg. Vom **Boden** aufgehoben wird er dort, wo die Hand ihn
    anfasst (`Tool.onReach` — der eine Augenblick, in dem Werkzeug und Hand noch
    getrennt im Raum stehen); von der **Hüfte** kommt er im Standardgriff, denn
    dort greift man in einen Ring und nicht an eine Stelle des Werkzeugs.
    **Trigger halten** ist das Umgreifen: der Stiel bleibt
    stehen, wo er ist, und die Hände rutschen daran entlang — Loslassen, und er
    sitzt an den neuen Punkten. Kein Menü und keine Raste, sondern die Bewegung,
    die man auch mit einem echten Stiel macht. **Geschlagen** wird mit dem Kopf
    und nicht mit dem Trigger: was der Kopf schnell genug (ab 1,6 m/s) berührt,
    bekommt einen Stoß in die Richtung, in die der Kopf gerade fliegt, gedeckelt
    bei 9 m/s, damit ein Zucken nicht die halbe Halle wegschießt. Der Kopf wird
    als _Punkt_ gemessen und nicht als Strecke — in der Greifbox (Collider plus
    9 cm) verschwindet der Weg eines Bildes, ein wirklich schneller Schlag kann
    aber durch einen dünnen Dominostein hindurchgehen. Lässt die **führende**
    Hand los, fällt er, auch wenn die zweite noch am Stiel liegt: `heldBy`
    gehört der Welt, nicht dem Werkzeug (genau wie bei der Drohne). Die Rechnung
    steht in `tools/poleGrip.ts` mit Test, das Werkzeug in `tools/HammerTool.ts`.
  - **Stoppuhr**: das Werkzeug, mit dem man Physik _ansieht_. Sie liegt
    **eingemessen** in der Hand: Blatt zum Gesicht, die seitliche Kante in der
    Faust, die einen Controller hält (siehe _Ein Griff für alle Werkzeuge_),
    und der Gehäusemantel trägt die Greiffarbe. Ein **Knopf** an
    der Krone (oder `A`/`X`) öffnet ein Panel an der Uhr — dieselbe Mechanik
    wie beim Drohnen-Display —, und dort steht, was der **Trigger** tut
    (`stopwatchSettings.ts`, mit Test):
    **Zeit** legt den eingestellten Faktor an (angehalten, 0,05× Zeitlupe bis
    4× Zeitraffer) und nochmal drücken nimmt ihn weg;
    **Einzelbild** hält die Welt an, solange die Uhr in der Hand ist, und
    rechnet pro Druck die eingestellte Anzahl fester Schritte — die einzige
    Art, einen Durchschlag oder einen Portalübergang wirklich zu sehen;
    **Schnellladen** stellt die gespeicherte Aufstellung wieder her.
    **Welt speichern** und **Welt laden** stehen im Panel, und Speichern
    bewusst _nur_ dort: ein Trigger, der beides kann, überschreibt irgendwann
    genau den Stand, den man behalten wollte. Gemerkt werden Pose, Größe und
    Schwung jedes Props, im Speicher dieser Sitzung — ein Rücksetzpunkt für
    den Versuch, an dem man gerade ist, kein Spielstand. Loslassen der Uhr
    stellt die normale Geschwindigkeit wieder her.
    Mehr als 4× geht nicht: die Simulation rechnet höchstens vier feste
    Schritte pro Frame, alles darüber wäre eine Lüge im Menü. Und beim
    Schnellladen im Mehrspieler zieht der rechnende Spieler die Objekte
    wieder auf seinen Stand — es wirkt bei dem, der rechnet.
    **Für den Spieler gilt die Physik weiter, auch wenn die Welt steht.** Das
    war eine Weile nicht so, und der Fehler ist lehrreich: Rapier zieht die
    Collider ihren Körpern erst in `world.step()` nach. Solange die Welt
    Schritte macht, fällt das niemandem auf; bei angehaltener Zeit macht sie
    keine — und dann stand der Collider der Spielerkapsel für immer dort, wo die
    Uhr gedrückt wurde, während die Kapsel selbst weiterwanderte. Der
    Character-Controller tastete danach von der alten Stelle aus und fand weder
    Boden noch Wand: Man fiel durch den Boden und sprang aus dem Stand endlos
    weiter, weil er einen immer noch für stehend hielt. `PhysicsWorld.step`
    ruft deshalb `propagateModifiedBodyPositionsToColliders()`, wenn in diesem
    Bild kein Schritt fällig war — dieselbe Zeile, die auch ein Schritt als
    erstes täte. **Die Zeit steht, die Welt ist nicht weg.**
    Gehalten wird sie am **Rand** wie eine Taschenuhr: kein Standardgriff, der
    Mantel des Gehäuses in Greiffarbe, die Kante durch die Faust, das Gehäuse
    daneben in der Handfläche (`STOPWATCH_HAND_POSE` — die Faust der echten
    Hand, und die Uhr in der Brille dort hineingelegt, `RIM_HOLD`/`RIM_TILT`).
    Und das **Zifferblatt schaut zum Kopf** — lange schaute es nach vorn wie
    ein Lauf, und man sah den Zeiger nie.
  - **Taschenlampe**: eine **Stabtaschenlampe** — das Batterierohr _ist_ der
    Griff, in Greiffarbe, ein Stab wie der Stiel des Hammers (`POLE_GRIP`). Es
    liegt **im Griffpunkt**, dort, wo die Hand auch das Gerät hält
    (`holdPosition` null), und ist um **45° nach vorn gekippt**
    (`TORCH_PITCH`): die Faust steht aufrecht, das Licht geht nach vorn. Sie
    ist damit das einzige Werkzeug, das nicht entlang des Zeigestrahls zielt,
    sondern 45° darüber — eine Lampe ist kein Lauf.

    Die **Faust** dazu ist die am Stab in genau dieser Lage
    (`TORCH_HAND_POSE`: dieselben Finger und dieselbe Rolllage wie
    `POLE_HAND_POSE`, um die 45° aufgerichtet — `pitch -75` statt `-120` —,
    gerechnet mit `fistOnGrip`).

    Die beiden Umwege dorthin sind die Enden derselben Strecke. Einmal lag das
    Rohr ganz auf dem **Halterzylinder der Hand** — Achse auf Achse, gehalten
    wie das Gerät selbst — und leuchtete damit 77° an dem vorbei, worauf man
    zeigte, also fast senkrecht nach oben. Einmal lag es ganz auf dem
    **Zeigestrahl** — dann leuchtet sie zwar dorthin, wohin man zeigt, ist aber
    keine Lampe in der Faust mehr, sondern ein Rohr auf der Ziellinie, und die
    gezeichnete Hand lag eine Handbreit über der eigenen. Davor lag das Rohr im
    Griffpunkt ohne Kippung (parallel am Ziel vorbei), und ganz am Anfang war
    sie eine „Lampe mit Griff", das Rohr über der Faust und der Standardgriff
    quer darunter; das sah aus wie ein Megaphon.
    **Trigger** schaltet sie an und aus. Der **Lichtkegel**
    wird mit der _anderen_ Hand eingestellt: vorne an die Linse greifen (der
    Ring leuchtet, sobald die Hand nah genug ist) und mit gedrücktem Griff nach
    **rechts** ziehen macht ihn breit, nach **links** schmal. Genau das, was
    man an einer echten Lampe am Kopf dreht — und in einem dunklen Gang ist
    eine Geste zu finden, ein Menüeintrag nicht. Schmal ist dabei heller und
    reicht weiter, breit wäscht den Raum vor dir und stirbt nach ein paar
    Metern (`flashlightBeam.ts`, mit Jest-Test). Sie leuchtet, sobald sie in
    die Hand kommt, geht auf der Hüfte aus und **bleibt an, wenn man sie
    fallen lässt** — eine liegende Lampe ist die einzige Lichtquelle, die man
    im Dunkeln wiederfindet. Das Licht selbst bleibt immer in der Szene und
    wird nur auf null gedreht: three.js baut jeden Shader im Raum neu, wenn
    sich die _Anzahl_ der Lichter ändert, und ein Schalter ist kein Ruckler
    wert.

  - **Greifhaken**: Trigger schießt den Haken, Halten zieht dich hin; trifft
    er ein Objekt, kommt stattdessen das Objekt.
  - **Gravitationshandschuh**: Trigger zieht das anvisierte Objekt geradewegs
    in die Hand, Greifen stößt es weg. Bleibt in der Hand, bis er am Gürtel
    abgelegt wird.
    Alle drei Handschuhe werden **angezogen** (`Tool.worn`): sie zielen nicht,
    ihre Platte liegt auf dem Handrücken, die Manschette am
    Handgelenk, und ihre Lage im Griff _ist_ die Haltung der Hand, die sie
    trägt — ab Werk die Grundhaltung mit offenen Fingern (`WORN_HAND_POSE`),
    und sie folgen ihr Bild für Bild (`followHand`). Vorher hingen sie im
    Zeigestrahl, also 30° gegen die Hand verdreht und halb in der Handfläche.
    **Sie liegen jetzt wirklich auf der Hand.** `GLOVE_BACK` war die _Mitte_
    einer Platte und ist jetzt die **Haut** des Handrückens (1,7 cm — der
    dickere der beiden Handmodelle, der weiße Handschuh); jede Platte sitzt mit
    ihrer Unterseite darauf statt zur Hälfte darin. Und der **Emitter** liegt
    flach auf dem Handrücken über den Knöcheln, wie der Strahler eines
    Panzerhandschuhs: er stand aufrecht vor den Fingern, mit 4,5 cm Halbmesser
    — ein Reifen, der 7,5 cm über die Hand hinausragte und 3 cm darunter, und
    die ausgestreckten Finger gingen mitten hindurch. Die **Manschette** des
    Supermanhandschuhs lag eine Vierteldrehung falsch: ein waagerechter Teller
    von 9 cm Durchmesser um das Handgelenk, der hinter der Hand in der Luft
    endete; jetzt steht sie quer zum Unterarm und ist quer gedrückt, damit sie
    der Hand folgt (`core/gripFist.test.ts` misst beides nach).
  - **Translationshandschuh**: greift bis 30 m weit — das Objekt kommt dabei
    _nicht_ zu dir. Zwei Modi, `A` schaltet um: **Halten** lässt es genau dort
    stehen, wo es ist (Handdrehung dreht es), **Steuern** macht die Hand zum
    Joystick — Hand nach links, Objekt nach links; Hand nach vorne, Objekt nach
    vorne; je weiter aus der Mitte, desto schneller.
  - **Supermanhandschuh**: **Greifen** hebt dich vom Boden und lässt dich
    schweben, **Greifen** nochmal landet dich. Die Mitte des Handknüppels
    liegt im **Rig-Raum**, nicht im Weltraum: der Rig ist das, was fliegt, und
    eine im Zimmer festgenagelte Mitte war nach ein paar Sekunden Flug zwanzig
    Meter weit weg — der Knüppel stand dann auf Anschlag, egal wo die Hand
    war, und genau so fühlte sich „ich kann mich nicht mehr drehen" an. Mit gezogenem **Trigger** wird
    die Hand zum Flugzeug-Steuerknüppel: In der Ausgangslage (dort, wo die Hand
    beim Drücken war) fliegst du nicht; nach vorne fliegst du in Blickrichtung,
    nach oben steigst du. Zur **Seite** ist kein Seitwärtsschritt, sondern eine
    **Kurve** — die ganze Sicht dreht sich mit, damit man sitzen bleiben kann.
    Dasselbe macht der **Kopf**: schaust du im Flug nach links, ziehst du eine
    Linkskurve, und je schneller du fliegst, desto stärker. Schaust du wieder
    geradeaus, hört die Kurve auf — und „geradeaus“ ist dann die neue Richtung.
    **Volle Lehne ist volle Fahrt**, und was volle Fahrt heißt, steht unter
    _Einstellungen → Supermanhandschuh_: je eine Zahl für vorwärts, rückwärts,
    hoch, runter und quer, dazu Drehrate und Totzone, jede über eine Raste
    weiterschaltbar oder direkt tippbar. Vorher stand da ein fester Faktor pro
    Meter Handlehne, bei dem eine bequeme Bewegung keine drei Meter pro Sekunde
    gab und die Höchstgeschwindigkeit jenseits eines ausgestreckten Arms lag —
    von innen fühlte sich das nach Waten an. Dazu die Frage, die sich in der
    Brille sofort stellt: **wer lenkt welche Achse?** Vor/zurück, hoch/runter
    und links/rechts hängen wahlweise an der **Hand**, am **Kopf**, an beidem
    oder an nichts — Blick nach unten schiebt, Blick nach oben steigt, der vom
    Flugweg weggedrehte Kopf zieht die Kurve. Und wer lieber quer schiebt als
    zu drehen, schaltet die Hand auf _quer schieben_; der Kopf lenkt dann
    weiter (`tools/supermanSettings.ts`, gerechnet in `tools/supermanFlight.ts`,
    beide mit Test).
  - **Lötkolben**: eine **Lötpistole**, seit es nur noch einen Griff gibt —
    Stab über der Faust, Griff quer darunter, Spitze auf dem Zeigestrahl.
    Zwei Punkte antippen und die Objekte hängen zusammen —
    starr oder als Scharnier (Achse = Querachse des Kolbens). Der Modus wird
    mit der anderen Hand umgeschaltet (kleines Panel über ihr), _Trennen_
    löst alle Verbindungen eines Objekts wieder. Solange der Kolben in der
    Hand ist, stößt diese Hand nichts mehr an — man greift durch den Stapel,
    ohne ihn umzuwerfen.
  - **Röntgen-Scanner**: ein Bilderrahmen, den man vors Gesicht hält. Was
    darin liegt, wird durch Wände hindurch gezeichnet — begrenzt durch die
    vier Clipping-Ebenen vom Auge durch die Rahmenecken, deshalb bleibt der
    Effekt im Rahmen.
  - **Handspiegel**: derselbe Rahmen, dieselbe Faust, dasselbe Hochhalten —
    und darin steht diesmal, was **vor** ihm ist statt was hinter den Dingen
    liegt. Dazu eine Rückwand, denn ein Spiegel ist von hinten kein Fenster.
    Man sieht darin sich selbst: den eigenen Kopf, die eigene Hand, das
    Werkzeug in der anderen Faust. Vorher ging das nur, indem man sich zwei
    Portale so hinstellte, dass man sich selbst gegenübersteht. Der Trigger
    schaltet das Glas ab und wieder an, und am Gürtel ist es von selbst aus —
    ein Spiegel ist ein zweiter Durchgang durch die ganze Szene, und den soll
    nicht bezahlen, wer ihn nur mit sich herumträgt. Der große **Standspiegel**
    ist kein Werkzeug, sondern ein Ding aus dem Beutel (siehe unten); wie
    beides gerechnet wird, steht unter _Wie die Spiegel funktionieren_.
  - **Drohne**: ein flaches Gerät wie eine Handheld-Konsole — **zwei Griffe**,
    dazwischen das Display, darüber ein Knopf. Die Drohne selbst schwebt
    draußen im Raum, das Display zeigt ihr Bild, auch vom Boden aus.
    **Beide Griffe** müssen gehalten werden, dann schaltet **einer der beiden
    Trigger** (egal welcher) die Sicht hinaus auf die Drohne; nochmal Trigger,
    eine Hand loslassen oder das Werkzeug ablegen parkt sie. Während des Flugs
    sind Hände, Gürtelwerkzeuge und Handgelenk-Menü **nicht** zu sehen — sie
    fliegen ja nicht mit —, die Maschine selbst dagegen schon, und sie ist
    damit der ruhende Punkt gegen Motion Sickness. Der Knopf über dem Display
    (oder `A`/`X`) öffnet die **Drohnen-Einstellungen**: Flugmodus, **Tempo**
    (m/s) und **Drehrate** (°/s) — beide schalten pro Druck eine Raste weiter
    und zeigen die rohe Zahl daneben —, _Drohne neu setzen_, und ob das
    Herausnehmen eine alte Drohne verschrottet. Aus den zwei Zahlen baut
    `droneTuning()` das ganze Tuning: Steigrate hängt am Tempo, Nick- und
    Rollrate des Jets an der Drehrate (×1,25 bzw. ×2), damit nicht drei Regler
    gegeneinander stehen. Beide Werte liegen im Konfig-Code (hinten angehängt,
    ein alter Code liest sie als Auslieferungswerte).
    Zwei Flugmodi (`droneFlight.ts`, mit Jest-Test), und sie sehen verschieden
    aus:
    **Kopter** ist ein Hubschrauber — linker Stick schiebt sie waagerecht in
    Blickrichtung, rechter Stick dreht links/rechts **die Nase und die Sicht
    mit** und nimmt sie hoch und runter; die Lage bleibt waagerecht. Das Modell
    ist der kleine Quadrokopter, er hängt knapp unter der Blickachse.
    **Jet** ist ein kleines Flugzeug — linker Stick vor/zurück entlang der
    eigenen Nase und quer dazu, rechter Stick ist der Steuerknüppel: rollen und
    nicken um die _eigenen_ Achsen, Sicht samt Horizont kippt mit. Wer im
    Rollen zieht, fliegt eine echte Kurve. Dort **sitzt man im Cockpit**
    (`droneJet.ts`): fünf Meter Maschine mit Nase, Flächen und Leitwerk, und
    das Auge steckt in ihrer Kanzel. Alles darin ist um `JET_EYE` herum
    gebaut, nicht um den Rumpf — was ein Cockpit ausmacht, ist nicht, dass es
    da ist, sondern dass man es **sieht**, und das alte saß gute dreißig
    Zentimeter zu tief und zu weit vorn: technisch vorhanden, im Headset
    komplett unter dem Blickfeld. Jetzt liegt die Bordwand eine Handbreit
    unter dem Auge, das Instrumentenbrett schließt oben fast an den Horizont
    an, und es gibt **richtige Scheiben** statt einer Glasblase — Front, zwei
    Seiten und ein Dach, jede mit sichtbarem Rahmen. Der Rahmen ist der
    eigentliche Trick: Glas allein sieht man nicht, und was man nicht sieht,
    kann den Horizont auch nicht halten. Vorne bleibt frei (ein Rohr quer
    durchs Blickfeld ist im Headset kein Rahmen, sondern ein Balken), der
    Bügel steht hinter dem Kopf. Zwischen den Knien steht ein
    **Steuerknüppel**, der mit dem rechten Stick mitgeht — ein Cockpit, in dem
    sich nichts bewegt, ist eine Kulisse. Der Nachbrenner geht mit dem Schub
    an. Das Cockpit ist um einen _Menschen_
    gebaut, die Maschine richtet sich danach; sie wird deshalb weiter weg
    gesetzt als der Kopter und hält mehr Abstand zum Boden.
    Beim Parken richtet sie sich wieder waagerecht aus. Der Kopf bleibt in
    beiden Modi frei.
  - **Hirn**: ein Gehirn auf einem Halterzylinder, und das einzige Werkzeug,
    das nicht selbst etwas tut, sondern **jemanden hinstellt, der etwas tut**.
    Der Knopf hinten am Hirn (oder `A`/`X`) öffnet sein Panel — dieselbe
    Mechanik wie bei Drohne und Stoppuhr —, und dort stehen die zwei Hälften
    eines NPC **einzeln**: die **Haut** (Zombie, Übungspuppe, Hamster) und das **Hirn**
    (Stehen, Schlendern, Verfolgen), dazu Tempo, Leben und die zwei Zahlen
    eines Brutkäfigs. Was der **Trigger** setzt, sagt die Zeile _Setzen_: einen
    NPC, einen Spawnpunkt, einen Brutkäfig — oder er nimmt weg, worauf man
    zeigt. Ein **Kreis am Boden** sagt vorher, wohin es geht und ob es geht,
    wie beim Teleporter. Alles Weitere unter _Wer hier herumläuft_
    (`tools/BrainTool.ts`).
  - **Messband**: Trigger setzt Punkt 1, Trigger setzt Punkt 2, der Abstand
    bleibt im Raum stehen. Nimmt man das Band wieder in die Hand, ist die
    letzte Messung wieder da.
  - **Hängegleiter**: ein Drachen, unter dem man hängt — das erste Werkzeug,
    das ein Fahrzeug ist. Vom Gürtel genommen trägt man ihn auf den Schultern;
    **Trigger** (oder `A`) ist der Anlauf, oder man läuft einfach über eine
    Kante, und ab da trägt der Flügel. Gehalten wird die **Querstange** des
    Steuerbügels, mit einer Hand oder mit beiden (die zweite greift ans andere
    Ende und ist dann beansprucht, `claimsHand`). Die Stange hat **zwei Griffe
    mit fester Lage**, einen an jedem Ende, und in der Faust liegt sie quer wie
    ein Lenker (`BAR_GRIP`, `GLIDER_HAND_POSE` — von oben gehalten, Daumen zur
    Mitte). Sie ist die ganze Steuerung: **ziehen** heißt Nase runter und
    schneller, **drücken** Nase hoch und langsamer — und unter der Abrissfahrt
    trägt nichts mehr —, **kippen** legt den Flügel in die Kurve, und zwar auf
    die Seite, die dabei nach unten geht: rechte Hand tiefer, Kurve nach
    rechts; mit einer Hand kippt das Handgelenk (`barTilt`, `wristTilt`). Eine
    Weile hing am Bügel der Standardgriff senkrecht unter einem Rohr, und
    gelenkt wurde, indem man das Rohr seitlich vor dem Kopf verschob — das
    fühlte sich an wie ein Pistolengriff, der zufällig an einem Drachen hängt.
    Der Körper dreht sich mit der Bahn: wer eine Kurve
    fliegt, schaut hinterher dorthin, wohin er fliegt. Berührt die Kapsel
    wieder Boden, ist gelandet — mit dem Schwung, der noch da war.
    **Am Boden ist er ein Gegenstand wie jeder andere**: gehalten, solange die
    Hand zu ist, und losgelassen fällt er hin, liegt als gepacktes Bündel im
    Raum und wächst auf seiner Hüfte nach. Er war lange `sticky` — einmal
    nehmen, an der Hüfte wieder abgeben —, und das war die eine Stelle, an der
    ein Werkzeug sich anders benahm als alles daneben: man ließ los, und nichts
    geschah. **In der Luft gilt es nicht**: dort hängt man im Gerät, und eine
    Hand, die zwischendurch aufgeht, wirft niemanden aus zweihundert Metern
    Höhe. `GlideTool.update` setzt `sticky` deshalb Bild für Bild auf „fliegt
    gerade" — und wer beim Landen die Hand schon offen hatte, legt ihn im
    selben Augenblick hin.
    Das Segel hängt beim Fliegen **im Raum** und nicht an der Hand
    (`GlideTool`): jedes Bild wird es an die Fäuste gestellt, die Stange darin,
    das Segel darüber, gekippt und geneigt, wie der Flug es sagt. Ein zehn
    Meter breites Segel, das jedem Zucken des Handgelenks folgt, wäre kein
    Gleiter, sondern ein Fächer; in der Faust bleibt nur ein Stück Stange mit
    Griff. Solange man fliegt, steht dazu eine **Geisterstange** im Raum: die
    Ruhelage des Bügels, waagerecht, `BAR_NEUTRAL` vor dem Kopf, auf der Höhe
    der Hände — man sieht an ihr, wie weit man gezogen, gedrückt und gekippt
    hat. Am
    Gürtel ist er ein gepacktes Bündel, wie ein echter Drachen auch. Die
    Rechnung — ein Punkt mit einem Flügel dran, Auftrieb quer zur Bahn,
    Widerstand entlang, beides mit dem Quadrat der Fahrt — steht in
    `tools/glideFlight.ts` mit Test; die Zahlen sind auf Gefühl abgestimmt
    (Trimmfahrt 11 m/s, Gleitzahl 10), nicht auf ein Lehrbuch. Beide
    Fluggeräte fragen die Welt zwei Dinge, die vorher niemand fragte:
    `ToolHost.onGround()` und `playerVelocity()`.
  - **Flügel**: zwei Schwingen an den Armen, und die Arme sind die Steuerung.
    **Schlagen** — beide Hände zügig nach unten, gemessen im Raum des Rigs —
    gibt Schub schräg nach vorn und oben, vom Boden aus auch den Start; der
    Aufwärtsschlag ist das Ausholen und umsonst, und nur der gemeinsame Schlag
    zählt (die langsamere Hand). **Ausgebreitet** tragen sie, **angelegt** ist
    ein Sturzflug: wie weit die Hände auseinander sind, ist, wie viel Flügel
    da ist. Eine Hand **tiefer** als die andere kippt in die Kurve zu dieser
    Seite, beide Hände **nach vorn** heißt Nase runter, nach hinten Nase hoch.
    Steiler als der Hängegleiter (Gleitzahl 6) und wendiger — und das eine
    Gerät, mit dem man wieder **hoch**kommt, solange die Arme durchhalten. Der
    andere Arm ist beansprucht, solange man sie trägt: er ist ja ein Flügel.
    Gezeichnet werden sie im Raum, jedes Bild neu von der Schulter zur Hand
    und ein gutes Stück darüber hinaus (`WingsTool`). Am Gürtel sind sie ein
    zusammengelegtes Bündel Federn.
  - **Boxhand**: die Hand selbst, als Werkzeug. Sie sieht aus wie die
    gezeichnete Hand mit Controllern, liegt genau dort, wo diese liegt, und
    **zielt nicht** — eine Hand sitzt in der Faust und schießt nirgendwohin.
    Damit ist ihre Lage im Griff dieselbe Zahlenreihe, mit der `HandVisuals`
    die Hand zeichnet: misst man sie ein wie eine Pistole, landet das Ergebnis
    in der **Grundhaltung** dieser Hand und nicht im Werkzeug-Speicher
    (`tools/HandTool.ts`) — auf der Werkzeugseite schreibt der Regler für
    `hand-box` deshalb in `saveIdleHandPose`. Sie ersetzt das alte
    Justier-Werkzeug und den Tisch mit der Geisterhand: ein Weg statt dreier,
    und der, den man ohnehin kennt.
  - **Controller links / Controller rechts**: das echte Gerät als Werkzeug,
    eines je Hand (`tools/ControllerTool.ts`). Gezeigt wird das Modell aus dem
    Repository (siehe _Controller-Modelle_), bis es geladen ist der selbst
    gebaute. Auch sie zielen nicht. Die Hand daran ist die **Faust um den
    Handgriff** des Geräts (`CONTROLLER_HAND_POSE`, gerechnet wie jede andere
    Faust): der Handgriff liegt im Griffraum **entlang der Z-Achse** — aus dem
    Modell des Herstellers abgelesen, `core/controllerGrip.ts` —, der Kopf mit
    Stick und Tasten am -Z-Ende, der Trigger darunter; der Daumen liegt am
    Kopf, der Handrücken zeigt nach außen, der Zeigefinger zum Trigger. Vorher
    trug die Hand hier die gemessene Grundhaltung als Faust, und die stand 74°
    quer zum Handgriff — der Controller lag „absolut falsch in der Hand". Der
    selbst gebaute Controller ist dabei gleich mit umgebaut worden: sein
    Handgriff zeigte nach unten statt nach hinten. Der Sinn ist
    die Frage, die alles andere
    erklärt: **wo sitzt das Gerät eigentlich in meiner Faust?** Der Griffraum,
    den die Brille meldet, ist weder der Controller noch die Hand, sondern ein
    Punkt dazwischen — und gegen ihn wird jeder Versatz gemessen. Ab Werk
    liegen sie genau darin, denn die Profile sind so gezeichnet; was man
    einmisst, ist die Abweichung. Auf der Werkzeugseite steht der linke
    Controller in der linken Hand und der rechte in der rechten — das eine
    Werkzeug, das es je Hand gibt.
  - **Duplizier-Waffe**: anzielen, Trigger — und daneben steht dasselbe noch
    einmal: Form, Farbe, Material, Größe und Masse. Der Rahmen um das Ziel
    gehört dazu, in einem Stapel verdoppelt man sonst regelmäßig die falsche
    Kiste. Was aus dem Beutel kam, kennt seine Sorte und wird auch bei den
    Mitspielern gebaut; was eine Welt selbst gebaut hat (Zielscheibe,
    Hütchen), kann die Gegenseite nicht nachbauen — solche Kopien bleiben
    bewusst lokal, statt drüben als Loch zu erscheinen.
  - **Inspektor**: anzielen, und das Display sagt Masse, Maße, Tempo,
    Drehung, Höhe, Reibung, Rückprall, Material, Collider-Form, geteilte Id
    und ob das Ding schläft, getragen wird oder fliegt. Er liegt in der Hand
    **wie eine Waffe**, ohne Zusatzneigung: er lag eine Weile 23° nach vorn
    gekippt darin, damit das Display zum Gesicht zeigt, und rollte damit so
    weit über die Faust, dass er nicht mehr aussah wie etwas, das man hält,
    sondern wie etwas, das aus der Hand fällt. Das Display steht
    **aufrecht** auf dem Gehäuse — geneigt wird weder das eine noch das
    andere. Es lag zweimal geneigt darauf (0,45 rad, dann 45° nach hinten),
    beide Male mit der Rechnung, die ablesende Hand zeige nach vorn unten und
    die Neigung nehme das heraus; sie nimmt es aber nur bei genau dieser einen
    Handhaltung heraus und legt es überall sonst dazu — in der Hand, die
    geradeaus zeigt, hing der Schirm um 45° nach vorn gebeugt und man las ihn
    von der Kante. Wie schräg die Hand steht, ist Sache der Hand. Er
    verändert
    **nichts** — genau deshalb kann man ihn in einen wackeligen Stapel
    halten, ohne ihn umzuwerfen. Wenn eine Kiste anders fällt als erwartet,
    ist die Frage nie „wie sieht sie aus", sondern „was steht in ihr drin".
  - **Karte**: ein Blatt in der Hand mit der Umgebung von oben — Norden oben,
    ein Pfeil in der Mitte für einen selbst, ein Punkt je Mitspieler, Trigger
    zoomt. Sie zeigt nirgendwohin und zielt deshalb auch nicht; gezeichnet
    wird aus dem Kachelgitter der Welt. Ausführlich in _Die Karte in der Hand_.
  - **Teleporter**: hinzeigen, Kreis ansehen, Trigger — und dort stehen. Der
    Stick trägt einen über eine Fläche, die bis zum Horizont geht, und das ist
    eine Wanderung; die Portalwaffe kann es besser, verlangt dafür aber zwei
    Schüsse und eine Wand, die Portale hält. Gezielt wird wie mit ihr, entlang
    der Zielachse, dreißig Meter weit. **Ein Kreis auf der Fläche** sagt, wo man
    landet: grün heißt, es geht; **rot** heißt, zu steil — dieselbe Grenze, die
    auch beim Gehen gilt (`MAX_SLOPE_DEG`), denn worauf man nicht hinaufkommt,
    bleibt man auch nicht stehen; **kein Kreis** heißt, dort ist nichts. Die
    **Blickrichtung bleibt**, wie sie war — wer sich beim Teleportieren auch
    noch gedreht vorfindet, muss sich hinterher erst wieder zurechtfinden, und
    genau das macht die Übelkeit, die ein Teleporter vermeiden soll. Im Kart
    oder hinter einer Drohne geht er nicht: da gehört der Körper gerade jemand
    anderem (`tools/TeleportTool.ts`).
  - **Radiergummi**: löscht Objekte — für alle in der Sitzung.
  - **Magischer Beutel**: die Rasterseite des Handgelenk-Menüs als Gegenstand
    (`tools/MagicBagTool.ts`). Gehalten wird er **von außen am Saum**, wie ein
    Eimer am Rand: er hängt vor der Hand, sein Saum läuft durch den
    Griffpunkt, die Handfläche liegt außen daran und die Finger greifen über
    den Saum hinein (`BAG_GRIP`, `BAG_HAND_POSE` — ohne Zielkorrektur
    gerechnet, denn er zielt nicht). Am Gürtel hängt ein zugezogener Lederbeutel; in
    der Hand geht er auf, und in der Öffnung liegt ein **Raster** aus
    Miniaturen — jede das Ding selbst, mit `createPropShape` gebaut und auf
    Fachgröße gerechnet, keine Strichzeichnung. Die freie Hand sucht sich eines
    aus, und dafür gibt es **zwei Wege**: sie fährt hinein, oder sie **zeigt**
    aus dem Sessel darauf — die Ziellinie trifft die Rasterebene, und das Fach
    darunter ist gemeint (`tools/bagGrid.ts`, `cellAtRay`). Der Finger hat
    dabei Vorrang, wenn er wirklich in der Öffnung steht. Das gemeinte Fach
    leuchtet, ein Stups meldet es, am Saum
    steht der Name, und **Greifen** holt das Ding in Originalgröße
    genau dorthin, wo die Hand ist — bei allen in der Sitzung
    (`ToolHost.conjureProp`, derselbe Weg wie aus dem Menü). Der Strahl kam
    dazu, weil der Finger die Hand jedes Mal bis in den Beutel führt: richtig,
    solange man ihn vor sich hält, mühsam, sobald er nur in der Hand hängt.
    Der Vorrat liegt auf **Seiten**: sechs Fächer, links und rechts ein Pfeil,
    davor ein Punkt je Seite. Geblättert wird auf **drei** Arten, im Kreis —
    hinter der letzten Seite kommt wieder die erste (`bagGrid.ts`, `turnPage`):
    ein Pfeil wird angesteuert wie ein Fach und mit **Greifen** genommen, oder
    mit dem **Trigger** derselben Hand (ein Pfeil ist ein Knopf, und auf einen
    Knopf zeigt man); und der **Trigger der Hand, die den Beutel hält**,
    blättert ganz ohne die andere eine Seite weiter (`MagicBagTool.onTrigger`).
    Die dritte Art ist die, die man am Ende nimmt: die Pfeile setzen eine freie
    zweite Hand voraus, und die ist oft nicht frei. Am Saum steht dabei, wohin
    ein angesteuerter Pfeil führt.
    Ein **Fach** bleibt beim Greifen: der Trigger holte sonst ein Ding heraus,
    sobald der Strahl der anderen Hand über den Beutel streift.
    Alle siebzehn Sorten auf einmal hieß siebzehn Fächer von
    zweieinhalb Zentimetern, dicht an dicht in einer Öffnung von einer
    Handbreite — daneben zu greifen war der Normalfall. Sechs große Fächer
    trifft man.
    Das **Schild** steht dabei auf dem Saum, und zwar an dessen **höchster
    Stelle** (`placeLabel`) — oben, über allem, was darin liegt. Der Weg dorthin
    ging über zwei Fassungen: erst hing es zwei Handbreit senkrecht über der
    Mitte und stand damit genau in dem Blick, mit dem man in den Beutel schaut;
    dann stand es am Saum **gegenüber dem Kopf**, hinter dem Raster statt
    darüber, und beides war auf einmal zu lesen. Nur ist „gegenüber dem Kopf"
    eine Stelle, die wandert, sobald man den Kopf dreht — das Schild rutschte um
    den Saum herum, und bei einem gekippten Beutel landete es unten am tiefsten
    Punkt. Der höchste Punkt wandert nicht: er hängt nur daran, wie der Beutel
    gehalten wird. Gerechnet wird er ohne Suche — die Welt-Hochachse in den Raum
    des Beutels gedreht, ihr waagerechter Anteil normiert, und dorthin zeigt der
    Halbmesser, der am weitesten nach oben führt. Steht der Beutel aufrecht, hat
    der Saum keine höchste Stelle; dann gilt weiter das alte Gegenüber zum Kopf.
    Eines daran sieht wie ein Versehen aus und ist Absicht: Er **zielt nicht**
    (`alignToAim = false`) —
    er sitzt in der Faust wie ein Handschuh und nicht auf dem Zeigestrahl wie
    eine Waffe —, und sonst bewegt er sich wie **jedes andere Werkzeug**: er
    steckt im Griff und macht mit, was die Hand tut, Gieren, Nicken _und_
    Rollen. Zwei Runden lang hing er stattdessen **aufrecht im Raum**: eine
    eigene Rechnung (`hangUpright`) nahm der Hand erst das Nicken und das
    Rollen weg, dann nur noch das Rollen, damit die Öffnung oben bleibt und das
    Raster nicht ausgeschüttet wird. Das las sich vernünftig und fühlte sich
    falsch an — ein Ding in der Hand, das einer Drehung des Handgelenks nicht
    folgt, ist keines, das man hält, sondern eines, das an einem klebt; und
    weil das Raster an seiner Drehung hängt, kippte es dabei gegen die Finger,
    die hineingreifen. Wer ihn ausschütten will, darf ihn jetzt ausschütten.
    (Die Rechnung hatte nebenbei zwei Vorzeichenfallen: `hangUpright` nahm die
    Gierachse einmal mit `atan2(x, z)` statt `atan2(-x, -z)` und hängte den
    Beutel damit um 180° gedreht **hinter** die Hand — auf der Werkzeugseite
    unsichtbar, denn dort lief sie nie. Solches Zeug fällt mit ihr weg.)
    Und die greifende Hand gehört
    ihm, solange sie auf ein Fach oder einen Pfeil zeigt (`claimsHand`) —
    sonst risse derselbe Griff die Kiste hinter dem Beutel an sich, und in
    einem vollen Labor steht immer eine Kiste dahinter.
    Warum beides, Seite _und_ Werkzeug: Ein Menü ist ein Ort, an den man geht;
    ein Beutel ist etwas, das man dabeihat. Wer eine Reihe Dominosteine
    aufstellt, greift zwanzigmal hinein, ohne dazwischen zwanzigmal ein Panel
    zu öffnen.
- **Alles einstellbar, alles kopierbar**: Werkzeug-Posen, Handhaltungen,
  Anbauteile und die Waffenwerte liegen zusammen in einem **Konfig-Code** —
  einer Zeile, die kopiert, vorgelesen und wieder eingegeben werden kann
  (_Einstellungen → Konfig-Code_). Eine **Tastatur im Raum** nimmt rohe Zahlen
  und ganze Codes entgegen.
- **Handhaltung**: wie die leere Hand aussieht und wie sie ein **Objekt**
  hält, steht unter
  _Einstellungen → Hände_; wie sie ein **Werkzeug** greift, steht beim
  Werkzeug selbst (_Werkzeuge → … → Griff_, mit dem Trigger hinein). Zwölf
  Zahlen pro Haltung (Versatz, Neigung, fünf
  Finger, Spreizung), und ein Knopf spiegelt alles auf die andere Hand. Die
  Objekthaltung liegt unter derselben Mechanik wie ein Werkzeug (Pseudo-Id
  `grab`), wird also genauso getippt, gespiegelt und im Konfig-Code
  mitgeschleppt — und sie wird tatsächlich angewandt, sobald eine Hand etwas
  trägt.
- **Werkzeug-Einstellungen hängen am Werkzeug.** Vorher stand unter
  _Einstellungen_ eine Seite „Pistole" und eine Seite „Supermanhandschuh",
  während daneben das Werkzeugregal eine zweite Liste derselben Werkzeuge war:
  wer die Feuerrate ändern wollte, ging woandershin als dorthin, wo die
  Pistole liegt. Jetzt trägt jede Regalzeile ihre eigenen Werte hinter dem
  Pfeil — die eigenen Werte, wo es welche gibt, der Griff für beide Hände und
  ein Zurücksetzen der Lage in der Hand, das nur dieses eine Werkzeug betrifft
  (`clearPose`).
- **Sitzen oder stehen**: das Einzige, was eine Brille nicht selbst weiß. Sie
  meldet den Kopf über dem Zimmerboden und hat keine Ahnung, ob darunter ein
  Stuhl steht — ein sitzender Spieler ist für jede Welt schlicht ein sehr
  kleiner, und Küchentresen, Kartsitz und Horizont gehören plötzlich jemand
  Größerem. Gefragt wird einmal auf der Startseite, umgestellt wird unter
  _Menü → Bewegung → Haltung_: „Sitzend" hebt die Sicht auf Stehhöhe an und
  lässt die Füße stehen — dieselbe Mechanik wie das Ducken, nur andersherum.

  **Und wer versetzt wird, wird mit Anhebung versetzt** (`PlayerRig.placeAt`,
  mit Test). Das Absetzen rechnete lange nur das Ducken heraus und nicht die
  Sitz-Anhebung: Ein sitzender Spieler landete bei jedem `placeAt` und
  `placeFeetAt` um seine ganze Anhebung **unter** dem Punkt — nach dem
  Schutzschrank, beim Rundenstart, und der Rettungsknopf „Zurück auf den
  Boden" setzte ihn genauso tief wieder hin. Am Bildschirm und im Stehen war
  davon nichts zu sehen, denn dort ist die Anhebung null; der Befund hieß
  deshalb „in der Brille buggt man wieder im Boden" und kam nie vom Desktop.

  **Wie hoch die beiden sind, weiß auch niemand von allein.** Der Ausgleich
  hing lange an einer einzigen getippten Zahl — 1,65 m Augenhöhe im Stehen,
  für alle. Wer kleiner ist, sitzt danach zu hoch; wer größer ist, zu tief,
  und man merkt es nicht am Horizont, sondern an der eigenen Hand: ein
  Knopf auf Ellbogenhöhe steht dann irgendwo anders, weil der Boden
  unter dem Spieler um die Differenz falsch liegt. Also
  sind es **zwei eigene Zahlen**, stehend und sitzend, in Zentimetern und
  beide **messbar**: unter _Menü → Bewegung → Augenhöhe_ hinstellen bzw.
  hinsetzen, _Jetzt messen_ drücken, und die
  Brille schreibt ihre eigene Zahl hinein. Die Anhebung ist danach die
  Differenz der beiden und nicht mehr der Abstand zu einer _gerade gemessenen_
  Kopfhöhe — Vorbeugen im Sessel hob vorher die halbe Welt mit an
  (`core/posture.ts`, mit Test).

  **Und in der Küche stimmt die gemessene Zahl nicht mehr.** Die Küche ist
  **mit Absicht zu klein**: Ihre Möbel sind halbiert
  (`core/kitchenFit.KITCHEN_SCALE`), die Arbeitsplatten liegen auf einem halben
  Meter, und die Kochfigur dazwischen ist 1,60 m hoch mit Augen auf 0,91 m
  (`core/chefFit.ts`) — eine Küche wie bei _Overcooked_ und kein Wohnhaus. Wer
  dort mit seinen echten 1,65 m steht, hat alle Zahlen auf seiner Seite und
  trotzdem den falschen Blick: Er schaut steil von oben in eine Puppenstube,
  der Tresen liegt auf Kniehöhe, und ein Topf auf dem Herd ist ein Punkt weit
  unten. Also wird in der Küche nicht die Küche größer, sondern der **Spieler
  kleiner** — auf eine dritte, eigene Augenhöhe, ab Werk **115 cm**,
  einstellbar unter _Menü → Bewegung → Augenhöhe → In der Küche_ (100 bis
  180 cm, +5 pro Druck). Diese Zahl ist dreimal gewandert, und der Weg lohnt
  sich zu lesen: Hergeleitet standen dort **140**, weil es zwischen den beiden
  liegt, die es schon gibt (aus 120 cm schaut man der Arbeitsplatte ins
  Gesicht, aus 160 steht man wieder darüber). Im Headset fühlten sich 140 zu
  niedrig an, also **150**. Und dann hat jemand mit aufgesetzter Brille
  gekocht, am Regler gedreht, bis es stimmte, und **115** gemerkt. Die
  Richtung hat sich damit umgekehrt, und das ist kein Widerspruch, sondern der
  Unterschied zwischen *hinstellen* und *arbeiten*: Aus 150 cm sieht die Küche
  richtig aus, aus 115 cm **greift** sie sich richtig — die Platte liegt auf
  Bauchhöhe wie in einer echten Küche statt unter einem. Wer schon einmal am
  Regler gedreht hat, behält seine eigene Zahl: Der Auslieferungswert ersetzt
  eine **fehlende** und überschreibt keine gespeicherte
  (`core/posture.clampEyes`).

  **Ein Verhältnis und keine Differenz**, und daran hängt mehr, als es klingt.
  Eingestellt wird eine absolute Zahl — das ist die Frage, die man sich stellt
  („aus welcher Höhe will ich auf die Platte schauen?") —, umgesetzt wird sie
  als Faktor auf die eigene gemessene Stehhöhe: 115/165 für den
  voreingestellten Spieler, 115/195 für einen sehr großen. Beide landen damit
  auf **derselben** Höhe, was eine feste Absenkung nicht kann; sie hielte den
  Abstand und verfehlte einen von beiden. Und vor allem bleibt die Null die
  Null: Gestaucht wird der **Abstand zum Boden**, also bleibt der Boden der
  Boden. Wer sich in der Küche bückt, um etwas aufzuheben, kommt anteilig
  tiefer und nie darunter — eine feste Absenkung um 25 cm hätte den Kopf bei
  20 cm echter Augenhöhe fünf Zentimeter **unter** den Estrich gezogen, und
  die Hände lange davor (`core/posture.kitchenEyeScale`, mit Test).

  **Nur in der Brille, nur in der Küche.** Am Bildschirm — von oben wie aus den
  Augen — setzt das Spiel die Kamera selbst, dort gibt es keine echte
  Augenhöhe, die danebenliegen könnte; die Ansicht von oben ändert sich um
  keinen Millimeter. Und „Küche" ist genau ein Rechteck, `layout.KITCHEN` mit
  einem Meter Vorlauf nach außen, damit das Absacken vor der Türöffnung
  passiert und nicht mitten in ihr (`kitchenPlan.inKitchen`,
  `zones/kitchen.ts` → `fitEyes`). Gokart, Schießstand, Kletterwand, Haunting
  und Portale sehen nie etwas anderes als „unverändert"; beim Verlassen der
  Welt räumt `PlayerRig.standUp` zusätzlich auf. Im Rig ist es die dritte
  Verschiebung neben Ducken und Sitz-Anhebung und wird genauso geführt: Das
  Gestell sinkt, die **Füße bleiben stehen** (`PlayerRig.eyeScale`,
  `getFloorY`, mit Test) — und wer mittendrin versetzt wird, landet mit den
  Füßen auf dem Punkt und nicht einen Viertelmeter darunter.

  **Und gesprungen wird hier nicht.** In demselben Rechteck, in dem die
  Augenhöhe gilt, bleibt der Spieler am Boden — in **jeder** Ansicht, nicht
  nur in der Brille: Die Stauchung korrigiert eine echte Augenhöhe und die
  gibt es nur dort, der Sprung ist eine Regel des Raums. Die Möbel sind
  ohnehin bis auf 1,40 m gesperrt, damit nach dem ersten Sprung niemand auf
  der Küchenzeile steht und über Spüle und Herd hinweg die Wand entlangläuft
  (`kitchenBlocks.BLOCK_HEIGHT`); was ohne diese Sperre übrig blieb, war ein
  Hüpfen zwischen Herd und Spüle mitten in der Arbeit — und in der Brille ein
  `A`, das neben der Ausgabe absprang, statt den Teller zu nehmen.

  Der Merker sitzt im Gestell (`PlayerRig.jumpLock`, mit Test) und nicht in
  einer Steuerung: Brille, Tastatur, Pad und Bildschirmstock landen alle in
  demselben `intentJump`, also gibt es auch nur eine Prüfung — eine Sperre je
  Steuerung wären vier gewesen, und die vierte hätte jemand vergessen (genau
  der Fehler, an dem `PlayerRig.locked` im Konstrukt-Raum gescheitert ist,
  siehe [Bauen](./bauen.md)). Gesetzt wird er jedes Bild neu, drinnen wie
  draußen (`zones/kitchen.ts` → `holdFeet`), und beim Verlassen der Welt räumt
  `PlayerRig.standUp` ihn weg. Gehen, Ducken, Sprinten und Greifen rührt er
  nicht an.

  **Der Kopf bewegt sich mit — in allen drei Achsen.** Aus der Brille kam der
  Befund „wenn ich meinen Kopf bewege, scheint die Kameraposition starr zu
  bleiben; sie soll sich mitbewegen, wenn ich mich nach links, rechts oder
  vorn beuge". Die Drehung kam an, die Verschiebung nicht: 3DoF statt 6DoF.
  Das ist in der Brille nicht bloß unbequem — das Innenohr meldet eine
  Bewegung, die das Auge nicht sieht, und davon wird einem schlecht.

  Am Rig lag es nicht. Die Brille misst den Kopf, `three` setzt die Kamera im
  Rig auf genau diesen Punkt (`local-floor`, `renderer.xr.updateCamera`), und
  das Rig reicht ihn unangetastet durch. Auch die Küchen-Augenhöhe von eben
  ist unschuldig: `eyeScale` staucht den **Abstand zum Boden** und rechnet an
  `position.y` und an nichts sonst (`playerRig.test.ts`, „Der Kopfversatz der
  Brille").

  Es lag eine Etage tiefer, in `PhysicsLocomotion`. Die Kapsel folgt dem Kopf
  — wer im Zimmer einen Schritt tut, soll im Spiel nicht durch die Wand gehen
  —, und was ihr dabei **verwehrt** blieb, wurde bisher vom Rig abgezogen:
  `rig += applied − drift`. Steht die Kapsel an einem Möbel, gibt der
  Character-Controller nichts heraus, und die Rechnung schob das Rig um genau
  den Betrag zurück, den der Kopf sich gerade bewegt hatte. Der Kopf stand
  still. In der Küche ist das der Normalfall und nicht der Ausnahmefall: Man
  arbeitet dort an einem Tresen, und die Trefferkästen der Möbel reichen bis
  auf 1,40 m (`zones/kitchen.BLOCK_HEIGHT`, damit niemand auf die Küchenzeile
  springt) — also genau bis in die Augenhöhe, auf die die Küche den Spieler
  stellt. Jedes Beugen über den Herd lief gegen eine unsichtbare Wand.
  Gemessen: 40 cm Beugen kamen als 14 cm an; direkt am Möbel als null.

  **Zurückgeschoben wird jetzt nur der Schritt und nicht der Kopf.** Zwei
  Stücke. Die Kapsel wird nicht mehr um die Differenz zweier Kopfpunkte
  weitergeschoben, sondern auf den Kopf **zugesteuert** — gefragt ist der
  Rückstand (`Kopf − Kapsel`) und nicht der Schritt des letzten Bildes; ein
  Zielpunkt holt jeden Rückstand von selbst wieder ein, eine Differenz
  vergisst ihn. Und was die Welt weniger hergibt, als gefragt war, trifft
  **Schritt und Kopf anteilig** (`shareOf`): Vorher ging der ganze Fehlbetrag
  auf den Schritt und damit aufs Rig; jetzt hält eine Wand den Stock genauso
  auf wie vorher — aber sie nimmt dem Spieler nicht mehr seine eigenen Augen.

  **Beugen ist kein Gehen.** Der Kopf darf dem Körper eine halbe Armlänge
  vorauseilen (`LEAN_LIMIT`, 45 cm); darüber hinaus wird das Rig an den Körper
  zurückgeholt. Wer im Zimmer einfach weiterläuft, wo im Spiel eine Wand
  steht, kommt also 45 cm weit und dann nicht mehr — der Blick hängt nie
  beliebig weit im Nichts.

  Am Bildschirm ändert sich dadurch nichts: Dort sitzt die Kamera über dem
  Ursprung des Rigs, der Rückstand ist null, und die Rechnung ist Zeile für
  Zeile dieselbe wie vorher (`physics/playerFooting.test.ts` läuft unverändert
  durch). Gokart und Haunting rühren sie ohnehin nicht an — der Kart friert
  das Rig ein und setzt den Kopf selbst auf den Sitz, die Station lässt die
  2D-Runde laufen (`KernelLocomotion`). Geprüft wird beides mit echtem Rapier
  (`physics/playerLean.test.ts`): über den Tresen, zwischen zwei Zeilen, das
  Wiedereinholen beim Aufrichten, die Grenze an der Wand, der Stock an der
  Wand und der freie Raum.

  **Und die Küche fragt nach dem Kopf, nicht nach dem Ursprung.** In der
  Brille ist `rig.position` die Mitte des Spielraums und nicht der Spieler.
  Die Zone rechnete ihren Standpunkt daraus (`KitchenZone.aim`) — wer einen
  Meter neben der Mitte stand, arbeitete an der Station einen Meter weiter,
  zielte mit dem Löscher daneben, und die Stauchung (`fitEyes`) entschied an
  einem Punkt, der sich beim Beugen gar nicht mitbewegt. Jetzt steht dort der
  Kopf über dem Fußboden des Rigs, dieselbe Rechnung wie in
  `PlayerRig.placeFeetAt`; am Bildschirm ändert sie nichts.

- **Die Testwelt** (`src/worlds/test/`): der Prüfstand — **elf Zonen auf einem
  Gelände**, in zwei Minuten zu Fuß abzulaufen.

  Bis September 2026 gab es siebzehn Welten, und jede prüfte eine Sache: eine
  für die Portale, eine für den Schießstand, eine fürs Klettern, eine für die
  Wegsuche. Das war bequem zu bauen und unmöglich zu pflegen — wer am Kern
  etwas änderte, lud siebzehn Welten hintereinander und hatte danach den
  Verdacht, die entscheidende vergessen zu haben. Jetzt gibt es **eine**, und
  was von den anderen bleibt, sind ihre Module: Kartphysik, Trefferwertung,
  Kletterhalt, Effektzahlen, Türmathematik. Wer eine gelöschte Welt nachlesen
  will, holt sie sich mit `git show 3678f32:src/worlds/<welt>/<Datei>.ts`.

  **Norden ist oben und die Mitte ist der Startplatz.** Die Himmelsrichtung ist
  die Wegbeschreibung — wer eine Zone sucht, sucht eine Richtung:

  - **Start und Tor** (Mitte): Startplatz, ein Schild, der **Kleiderschrank**
    und drei Kacheln weiter das Tor zurück in den Hub.
  - **Effektquellen** (Norden): vier Düsen nebeneinander — Rauch, Feuer,
    Funken, Wasser —, je ein Knopf eine Kachel davor. Dieselben Zahlen wie im
    alten Effektlabor (`effects/effectKinds.ts`), importiert und nicht
    abgeschrieben. Vier Knöpfe nebeneinander statt einer mit Auswahl: Im Labor
    stand man davor und sah hin, hier läuft man vorbei. Jede Düse trägt die
    Farbe ihres Effekts, damit man von oben sieht, welche die Wasserfontäne
    ist.
  - **Interaktionen** (Nordwesten): eine Wand mit drei Türen in drei
    Betriebsarten (Schiebetür, Flügeltür, Drucktür), davor je ein Auslöser —
    Knopf, Hebel, Druckplatte —, daneben zwei Kisten zum Draufschieben, dazu
    eine Lampe mit Kippschalter. Dahinter liegt ein **Hof**, und das ist der
    ganze Punkt: Eine Tür, an der man vorbeigehen kann, ist ein Möbelstück.
    Weil hier wirklich getrennt wird, lässt es sich auch prüfen — mit
    geschlossenen Türen kommt vom Startplatz aus niemand hinter die Wand.
  - **Treppe und Podest** (Nordosten): fünf mal fünf Kacheln auf Ebene 1, eine
    Brüstung ringsum, vier Säulen darunter und eine **vier Kacheln lange**
    Treppe hinauf. Oben ein Hebel, der unten eine Lampe schaltet — der Beweis,
    dass ein `trigger` keine Etagengrenze kennt. Auf Säulen und nicht auf einer
    Wand, weil man von oben sonst nur sähe, dass etwas erscheint, und nie, dass
    darunter etwas war.
  - **Navigation** (Westen): ein enger Gang mit einer Kiste darin, eine Tür an
    seinem Ende, ein Stachelfeld und ein roter Knopf, der einen NPC von A nach
    B schickt. Der Gang ist ein **Umweg und keine Sackgasse**: Man kommt auch
    außen herum, und genau das zeigt er — eine Kiste macht ihre Kachel _teuer_
    und nicht _zu_. Das Stachelfeld ist eine Kachelnotiz und kein Objekt
    (`TileFacts.hazard`), also weiß ein NPC davon, bevor er hineinläuft.
  - **Schießstand** (Osten), **ohne Dach**: eine Schießlinie, Scheiben auf 5,
    10 und 20 m, zwei Stahlplatten und ein Kugelfang als Masse dahinter. Jeder
    Treffer zählt (`range/scoring.ts`), die Scheibe nach ihrem Ring. Fünf bis
    zwanzig Meter und nicht zehn bis hundert: Der alte Stand war 125 m tief,
    und das wäre hier der ganze Osten samt halber Kartbahn. Die Bank ist das,
    was sie in Wirklichkeit ist — eine **Küchenzeile**, derselbe geprüfte
    Baustein auf derselben Arbeitshöhe.
  - **Gokart** (Süden): eine Rundstrecke von 35 × 25 m aus Streckenteilen auf
    dem Gitter und eine Boxengasse mit zwei Karts darin. **Eingestiegen wird
    mit `A`** — das Kart meldet sich als `Usable` mit dem Hinweis
    _Einsteigen_ —, ausgestiegen mit `A` halten. Ausführlich unter _Die
    Kartzone_.
  - **Klettern** (Südosten): eine Wand mit Griffen aus drei Materialien und
    zwei Sprungkissen davor. Ausführlich unter _Klettern_.
  - **Zu jeder Zone springt man auch** (_Menü → Zu einer Zone_,
    `TestWorld.jumpMenu`): zehn Ziele, eines je Zone, und zwar **dieselben
    Kacheln**, an denen der Grundrisstest misst, ob eine Zone überhaupt
    erreichbar ist (`layout.ZONE_TILES`). Das Gelände misst 73 × 105 m; wer nur
    die Küche ansehen will, läuft sonst eine knappe Minute an drei Zonen
    vorbei, die er gerade nicht meint — und dieser Platz ist ein Prüfstand und
    keine Reise. Die Höhe kommt aus dem Graphen (`NavGraph.levelY`): Das Podest
    liegt auf Ebene 1, und wer dorthin auf y = 0 spränge, stünde unter seinem
    eigenen Deck.
  - **Angekommen wird in der Küche** (`TestWorld.spawnPoint`,
    `layout.KITCHEN_SPAWN`), und zwar auf genau der Kachel, auf die auch das
    Menü und `?at=kitchen` setzen. Hier stand der Startplatz im Süden, und das
    war die Ankunft für einen Besucher: Schild, Tor, neun Zonen ringsum. Seit
    die Seite ohne Adresse mit dieser Welt aufmacht
    (`worlds/index.DEFAULT_WORLD`), wäre er der zweite Umweg hintereinander —
    wer hier ankommt, kommt zum Arbeiten. Der Startplatz bleibt, was er war:
    der Anker seiner Zone und der Ort mit dem Tor zum Hub.
  - **Und auf eine einzelne Kachel setzt einen die Adresse** (`spawnAt.ts`):
    `/?at=21,-24#test` fängt auf genau dieser Kachel des Geländes an,
    `/?at=18,-16,1#test` eine Ebene höher auf dem Deck des Podests, und
    `/?at=kitchen#test` nimmt denselben Namen wie das Menü. Gerechnet wird in
    **Kacheln des Geländes** — dieselben Zahlen, die in `layout.ts` stehen und
    die ein Test ausgibt, wenn er über eine Kachel stolpert: Wer „Kachel 21,-24
    hat keinen Anschluss" liest, tippt sie in die Adresse und steht daneben.
    Sie gilt für die ganze Sitzung, also auch fürs Wiedereinsetzen nach einem
    Sturz. Warum eine Adresse und kein Zifferblock im Spiel: Das hier ist kein
    Spielzug, sondern das Werkzeug dessen, der die Welt **prüft** — er kommt
    von außen, mit einer Zahl in der Hand, und eine Adresse kann man
    aufschreiben, verschicken und in ein Testskript legen. Alles, was nicht
    eindeutig ist (ein Wort statt einer Zahl, ein unbekannter Name, eine halbe
    Koordinate), gibt den gewöhnlichen Startplatz: Geraten wird nicht, sonst
    sucht man im Gelände, warum man woanders steht.
  - **Küche** (ganz im Norden, hinter dem Podest): dreiunddreißig mal elf
    Kacheln mit den Möbeln aus dem Katalog (`core/kitchenFit.ts`, siehe
    _Modelle im Repository_), und zwar in **zwei Hälften**. Unter allem liegt
    ein **karierter Boden** (`zones/kitchenFloor.ts`): cremeweiß und
    schiefergrau im Wechsel, **ein halber Meter je Feld**, also zwei mal zwei
    Felder auf jeder Kachel des Meterrasters — eine Fuge, die schräg unter der
    Küchenzeile durchliefe, wäre schlimmer als gar keine. Er ist der
    Unterschied zwischen „hier stehen Möbel auf dem Gelände" und „hier ist ein
    Raum", und er ist bewusst **gegen das Schachbrett draußen** gewählt
    (`layout.HORIZON_COLORS`): Das ist grau auf weiß mit einem Meter je Feld,
    also zwei helle kühle Töne — drinnen sind die Felder halb so groß, die Töne
    wärmer und der Sprung zwischen ihnen mehr als doppelt so groß. Damit liest
    sich die Kante zwischen beiden als Schwelle und nicht als Versehen; ein
    Jest-Test rechnet Feldgröße, Kontrast und Ausrichtung nach. Gezeichnet wird
    das Muster vom selben Schachbrettzeichner wie der Boden bis zum Horizont
    (`shared/environment.checkerTexture`, samt Farbraum, Mipmaps und
    `anisotropy` gegen das Flimmern aus der Aufsicht); die Fliesen sind ein
    **eigenes Material** der Zone und keine neunte Sorte im Gitter — eine Sorte
    dort trägt einen Ton und kein Muster, und wie oft sich das Muster
    wiederholt, weiß nur, wer die Größe der Fläche kennt. Der Steinquader aus
    dem Grundriss bleibt darunter liegen: Er ist der Körper, auf dem gelaufen
    wird, und der Belag liegt zwei Millimeter darüber, damit die beiden nicht
    um jeden Bildpunkt streiten. Im Westen die
    Küche selbst — Zeile, zwei Herde, **Spülbecken und Abtropfgitter** und die
    Tellerkiste an der Wand, vier
    **Vorratskisten** an der Westwand — je eine für Brötchen, Patty, Salat und
    Tomate, offen und mit ihrer Zutat darin —, eine Insel aus Schneidebrett und
    Mülleimer, **zwei Bandbahnen** quer durch den Raum — vier Förderbänder
    (blau) und vier Zugbänder (orange), die sich von selbst holen, was auf der
    Kachel dahinter liegt —, vorn die Ausgabetheke
    mit den Wärmeschirmen einen Meter darüber, und südlich davon der
    **Gastraum**: drei Gästetische und die Geschirrrückgabe (die Türkacheln
    daneben bleiben frei, sonst stünde ein Tisch im Eingang). Dazu zwei Möbel,
    die nicht kochen, sondern die Küche selbst verwalten: der
    **Computer-Tisch** neben der Ankunft, der den **Möbelkatalog** aufmacht,
    und der **Kopierer** in der freien Mitte, der von einem Möbel ein zweites
    hergibt. Östlich anschließend, ohne Wand dazwischen, die **Werkhalle**
    (`kitchenPlan.PIPELINE`): acht freie Spalten für Bandstraßen, und in sechsen
    davon steht eine, die einen **Burger Deluxe** ohne Läufer zusammensetzt —
    Vorratskiste, Zugband, **sichere Kochstelle** (brät ohne jemanden davor und
    ohne anzubrennen), **Mixer** (hackt ohne jemanden davor), **Filterband**
    (zieht nur, was es gelernt hat) und **Kombinierer** (legt zusammen, was auf
    ihm liegt, mit dem, was von der Pfeilseite kommt). Die anderen zwei Spalten
    bleiben leer: Genau dafür ist die Halle da. **Der Schauraum dahinter ist
    weg** (September 2026): siebzehn Kacheln, auf denen jedes Katalogstück noch
    einmal einzeln und beschriftet stand. Denselben Katalog gibt es seit dem
    Konstrukt-Raum am **Rechner** — dort steht man mitten darin und hat jedes
    Stück in Reichweite, statt daran vorbeizulaufen —, und zwei Kataloge
    nebeneinander sind einer zu viel. Die Zone ist damit von siebenunddreißig
    auf zwanzig Kacheln geschrumpft (Küche plus Werkhalle). **Angefasst wird mit `A`**, und ein
    roter Knopf neben dem Eingang schaltet den **Baumodus** ein und wieder aus,
    in dem sich jedes Möbel samt allem, was darauf steht, versetzen lässt — das
    Einschalten räumt die Küche dabei ab, wie `B`/`Y` es täte (beides unter
    _Anfassen in der Küche_). Sie ist
    der Grund, warum das Gelände nach Norden gewachsen ist (`FIELD` ist heute
    73 × 105 m; das letzte Stück davon hatte die zweite Küche gekostet, die es
    nicht mehr gibt): Die Möbel sind groß — eine Spüle misst in der Quelle 4 × 2,1 m,
im Spiel also zwei Kacheln —, und in eine
    Lücke zwischen zwei bestehenden Zonen passt davon keine Reihe. Hinter dem
    Podest und nicht neben dem Schießstand, weil dessen Bahnen quer über den
    ganzen Osten bis zum Kugelfang laufen und eine Küche in der Schusslinie
    eine Küche mit Löchern ist. Ihr Schild ist zugleich die Probe auf den
    **Aushang**: Es trägt Überschrift, Aufzählung und Zitat, und wer es
    benutzt, schlägt es im Menü auf. An der **Nordwand** hängt dazu die
    **große Tafel** (`zones/kitchenNotice.ts`): 2,4 × 1,8 m, Markdown nicht im
    Menü, sondern gesetzt an der Wand — Überschriften, Aufzählung, Trennlinie,
    Zitat, Code. Sie dreht sich **nicht** mit (siehe _Was die Kamera ansieht_):
    Ein Text an einer Wand ist ein Gemälde. Die Nordwand ist dafür die
    richtige, weil die Kamera von oben aus dem Süden schaut — an der Westwand
    hinge derselbe Aushang für diesen Blick hochkant.
  - **Die zweite Küche ist weg** (September 2026). Ganz oben im Norden stand
    über der ersten ein Restaurant aus dem **zweiten** Möbelkatalog
    (`core/dinerFit.ts`, 156 Stücke aus _Restaurant Bits_, CC0 — siehe
    _Modelle im Repository_): vierundzwanzig mal vierundzwanzig Kacheln, ein
    **eingerichteter Raum** ohne Stationen, Uhren, Rezepte und ohne `update`.
    Er war die Antwort auf die Frage, die ihn gebaut hat — was von dem
    gekauften Baukasten können wir brauchen? —, und die ist beantwortet: Die
    Zutaten der ersten Küche kommen heute aus diesem Katalog
    (`zones/kitchenProps.ts`), durchblättern lässt er sich im Konstrukt-Raum,
    und ein Raum zum Ansehen daneben kostete nur Wege. Mit der Zone sind
    `zones/diner.ts`, `zones/dinerPlan.ts`, das Rechteck `DINER`, der Gang
    dorthin und der Eintrag _Zweite Küche_ im Sprungmenü gegangen; **der
    Katalog bleibt**.

    Das Gelände behält dabei seine Ausdehnung nach Norden (`FIELD`, 73 × 105 m):
    Es wächst mit dem, was darin steht, und einen Plan zu beschneiden, weil
    gerade nichts darauf steht, verschiebt jede Zahl darunter ein zweites Mal.
  - **Portaltafeln**: drei helle Tafeln — am Startplatz, auf dem Podest und an
    der Westwand der Navigation. Drei und nicht eine, weil ein Portal erst zu
    zweit etwas ist; die auf dem Podest ist der kürzeste Weg, die Treppe zu
    übergehen, und genau das soll man einmal ausprobiert haben.

  **Kein Dach, nirgends.** Von oben wäre jedes davon ein schwarzer Balken über
  genau dem, was man sehen will — und was die Figur verdeckt, macht ohnehin das
  Ghosting durchsichtig (siehe _Von oben_).

  **Gebaut werden darf hier** (`editable()` ist wahr), und das ist der Sinn des
  Metergitters: Wer eine feine Welt bauen will, braucht einen Ort, an dem er es
  probiert — mit Karte und Palette am Gürtel, mit Speicher und mit einer Datei
  zum Mitnehmen (_Welt sichern_, siehe _Speichern, exportieren, importieren_).
  Weil ein gespeicherter Stand den **ganzen** Grundriss ersetzt, steht alles,
  was auch danach noch gelten muss, in `planLoaded()`: das Tor zum Hub und jeder
  Einbau, den eine Zone braucht.

  **Und `planLoaded` läuft zweimal** — einmal beim Bauen und einmal nach dem
  Laden —, deshalb sind die Einbauten vom Rest des Grundrisses getrennt
  (`fitTest(plan)` neben `testPlan()`). Das geht nur mit Einbauten: Sie haben
  eine **Kennung**, und `putFixture` ersetzt nach Kennung. Ein Baustein hat
  keine; ein zweites Mal gesetzt stünde er zweimal da, und nach dem dritten
  Besuch wären es drei Bänke auf einer Kachel.

  **Die Zonen bekommen einen Vertrag und nicht diese Welt** (`zones/zone.ts`,
  `ZoneHost`). Der naheliegende Weg wäre gewesen, ihnen die `TestWorld` selbst
  in die Hand zu geben — und damit hätte jede Zone Zugriff auf den Editor, die
  Portale, das Menü und die Physik-Einstellungen. Nach dem dritten Umbau hätte
  eine davon etwas daran verstellt, und niemand wüsste welche. Sie dürfen
  bauen, anmelden und melden, und sonst nichts; dieselbe Entscheidung wie bei
  den Einbauten und aus demselben Grund. Sechs von zehn haben überhaupt Leben
  darin (Interaktionen, Navigation, Schießstand, Kart, Klettern und Küche), die
  anderen vier sind ein **Stempel** auf dem Grundriss und fertig
  (`stamp<Name>(plan)`).

  **Wo eine Zone liegt, steht in `layout.ts`** und nicht im Grundriss, und das
  ist kein Stilfehler, sondern ein Absturz weniger: Der Grundriss ruft die
  Zonen auf, und jede Zone will wissen, wo ihr Rechteck liegt — stünden die
  Rechtecke im Grundriss, importierte jede Zone ihn und er jede Zone, und beim
  ersten Import wäre die Hälfte der Konstanten `undefined`.

  **Geprüft, bevor jemand hineinläuft** (`testPlan.test.ts`, ohne three.js):
  dass jede Zone vom Startplatz aus erreichbar ist, dass die Treppe wirklich
  auf dem Podest endet, dass hinter die Türwand nur kommt, wer eine Tür
  aufmacht, und dass die ganze Welt eine Runde durch das Weltformat unverändert
  übersteht. Eine Ecke, in die man nicht kommt, merkt man sonst erst nach dem
  Laden, nach dem Aufsetzen, nach dem Hinlaufen.
- **Eigener Körper**: Rumpf, Kopf und die beiden Handkugeln gibt es, sie werden
  aber nur in Portalsichten und Spiegeln gezeichnet — und, solange die Sicht mit
  einer Drohne draußen ist, auch für den eigenen Blick zurück. Der
  zurückgelassene Körper wird
  dabei über den **ganzen Rahmen** festgehalten, in dem er stand
  (`PlayerAvatar.leaveBehind`), nicht über eine Kopfpose im mitfliegenden
  Rig-Raum: Die Figur rechnet mit dem Boden auf y = 0, und ein Rig, das zehn
  Meter steigt und sich dreht, zog sie jedes Mal lang. Direkt sieht man nur die eigenen Hände — und sich
  selbst, wenn man durch ein Portal schaut. Die anderen Spieler bekommen
  denselben Körper, samt Namensschild und der Waffe in ihrer Hand.
- **Einmessen: was vom Eingaberaum geblieben ist.** Es gab dafür eine eigene
  Welt — eine Kammer, deren einziger Zweck es war zu zeigen, was die Hände tun:
  zwei Controller-Modelle auf Augenhöhe, je Hand eine Tafel mit der Lage des
  Geräts in zwei Räumen, ein Achsenkreuz, eine Aufnahme der Handbeschleunigung,
  eine Bank mit Vibrationsmustern, und hinter der Rückwand ein Schießgang mit
  **zwei Justierständen** (der eine maß, wohin ein Werkzeug zeigt, der andere,
  wie die Faust darum liegt) und einem **Poseraum**, in dem ein Schwebekasten
  losgelassene Werkzeuge in der Luft hielt, damit man die blanke Hand daran
  legen konnte. Mit dem Umbau vom September 2026 ist sie weg.

  Was sie hervorgebracht hat, steht weiter da, und deshalb lohnt der Absatz:
  die **Rechnung** hinter beiden Ständen (`tune/handGrip.ts`, `toolPose.ts`),
  die **Feinjustage** mit ihrer Untersetzung (`tune/fineTune.ts`), die
  **Vibrationsmuster** (`tune/haptics.ts`), die **Aufnahme** der
  Beschleunigung (`tune/accelRecord.ts`), das **Controller-Modell** als
  Rückfall (`tune/InputModel.ts`), die **geteilte Handhaltung** über die
  Leitung (`tune/handShare.ts`) und jede Zahl, die damals gemessen wurde —
  `IDLE_HAND_POSE`, `GRIP_TO_RAY`, die drei Kurzcodes an Stoppuhr, Hammer und
  Drohne (siehe _Eingemessene Griffe_).

  **Justiert wird seither auf der Werkzeugseite** (`tools.html`, Knopf
  _Bearbeiten_, siehe _Bearbeiten auf der Werkzeugseite_): dieselben Speicher,
  dieselben Kurzcodes, ein Daumen statt zweier Hände. Was dabei fehlt, ist die
  Hälfte, für die es die Welt gab — eine Messung **am Gerät**, mit der eigenen
  Hand daran. Wer sie wiederhaben will, baut sie als Zone der Testwelt neu; die
  Rechnungen liegen alle bereit, und was an Aufbau nötig war, steht in
  `git show 3678f32:src/worlds/tune/`.

- **Haunting / Orbital**: eine Raumstation für eine Quest und zwei Telefone.
  Der Außentechniker sucht Gegenstände, löst Reparaturaufträge und kann nach
  drei Treffern verlieren. Die drei Nicht-VR-Rollen zeichnen dieselbe Karte
  wie die 2D-Welt, jede mit eigenen Schichten (`views/`): das **Archiv** die
  ganze Station mit Fracht und einer Raumakte je Zimmer — wohin ein Teil
  gehört, sieht es erst, wenn der Techniker es trägt —, die **Schalttafel**
  die Station ohne Wesen mit schaltbaren Türen und Lampen, dazu ihre
  Schalterliste als Blatt darüber, der **Späher** zwei Punkte alle
  dreieinhalb Sekunden. Schallköder gibt es nicht mehr. Der Zuschauer
  (3D-Puppenhaus) schlüpft auf Wunsch in jede dieser Ansichten, lesend;
  das Monster bleibt daneben. Wählbar sind
  6/8/10/12 größere Räume mit Gängen und drei Entitäten mit eigener Wahrnehmung. Sichere Tests bleiben bei ausgeschaltetem Licht gegnerfrei;
  vier Lehrzimmer liegen abseits der Missionskarte. Ausführlich:
  _Haunting / Orbital: Raumstation für eine Quest und zwei Mobilgeräte_.
- **Klettern** (`worlds/climb/`, Zone der Testwelt in `test/zones/climb.ts`):
  die Stelle, an der der **Greifknopf etwas anderes tut**. Überall sonst nimmt
  Greifen ein Ding in die Hand; hier hängt es den ganzen Spieler an die Wand.
  Von Griff zu Griff geführt wird dabei niemand — man fasst hin, wo man will,
  und die Welt rechnet aus, wie gut das war. Das Vorbild ist die Haltemechanik
  aus _Cairn_.

  **Die Wand steht auf dem Gitter, die Griffe nicht**, und die Grenze ist
  Absicht: Eine Wand ist Hülle und gehört auf Kachelkanten — hier eine **Masse**
  von acht Metern über eine Kachelreihe, denn als Kachelwände wären das zehn
  Stück von je 2,80 m und darüber Luft. Ein **Griff** dagegen ist kein
  Mobiliar, sondern das Spiel selbst, und seine Stelle auf zehn Zentimeter
  genau ist genau das, was ihn schwer oder leicht macht; auf eine Kachelkante
  gezogen wäre er neu einzumessen, für nichts. Die Wandreihe liegt dabei
  **außerhalb** der begehbaren Zone: Eine acht Meter hohe Masse auf einer
  begehbaren Kachel wäre ein Weg im Graphen, den man in Wirklichkeit nicht
  gehen kann — ein NPC liefe hinein und stünde.

  **Wie das Klettern selbst funktioniert.** Jede greifende Hand bekommt einen
  **Anker** in der Welt, und der Körper wird jedes Bild so weit verschoben,
  dass die Hände wieder dort sind. Zieht man die Hand herunter, geht der Körper
  hinauf; mehr ist Klettern nicht. Gefahren wird das über den **Flugmodus** der
  Fortbewegung (`PhysicsLocomotion.setFlight`, dieselbe Tür, durch die auch der
  Supermanhandschuh geht) und nicht über die Position des Rigs — dadurch
  bleiben Wände Wände, man klettert nicht in die Welt hinein, und beim
  Loslassen wird aus dem letzten Zug ein **Schwung** (gedeckelt, damit aus einem
  Klimmzug kein Raketenstart wird). Solange eine Hand hängt, ist der **linke
  Stick abgeschaltet** — wer hängt, geht nicht und springt nicht. Der rechte
  dreht weiter, denn wer sich an einer Wand hochzieht, will über die Schulter
  schauen wie überall sonst; danach wird jeder **Anker neu auf seinen Griff
  gesetzt**, sonst hinge die Hand einen halben Meter neben ihm in der Luft. Das
  ist auch die ehrlichere Bewegung — an einer echten Wand dreht sich der Körper
  um die Hände und nicht die Hände um den Körper.

  Damit der Greifknopf sich nicht mit dem normalen Greifen schlägt, klettert
  nur eine Hand, die wirklich **leer** ist (`PortalWorld.handFree`): Wer eine
  Kiste trägt, trägt eine Kiste. Und die Zone hört nur zu, **solange man vor
  ihr steht** (`NEAR`, vier Meter um ihr Rechteck): Ein Greifknopf, der quer
  über das ganze Gelände nach Griffen sucht, nähme der halben Welt ihr Greifen.

  **Was in den Halt eingeht** (`climb/gripQuality.ts`, mit Test — reine Zahlen,
  kein three.js). Heraus kommt eine Zahl je Hand und daraus der **Halt**
  (`support`):

  - **Material** (`climb/holds.ts`): _Sprosse_ (perfekt, Grundwert 1),
    _rauer Fels_ (0,44) und _glatter, glänzender Fels_ (0,24). Dazu, was jedes
    an Ausdauer frisst: 0, 1 und 1,9.
  - **Form**, aber nur so weit die Hand wirklich daraufsitzt (`seat`): Sprosse
    und Holm +0,36, Henkel +0,34, Spalte +0,30, Kante +0,26, Ballen +0,06,
    blanke Fläche nichts. Eine um einen halben Handteller verfehlte Kante ist
    keine Kante, sondern eine Wand — und genau das ist „wer keine gute Kante
    erwischt". Leisten, Sprossen, Risse und Holme haben dafür eine **Achse**:
    An ihnen entlang darf man überall zupacken, darüber und darunter nicht.
  - **Verspreizen** (Jamming): Stehen zwei Hände an **entgegengesetzten**
    Flächen, gibt es bis zu +0,40 — abhängig davon, wie genau sie gegeneinander
    stehen _und_ wie nah die Hände beieinander sind. Druck braucht einen
    Winkel; mit weit auseinandergerissenen Armen kann man nicht drücken.
  - **Neigung der Wand**: An einem Überhang schaut die Fläche nach unten, und
    dann gibt es nichts mehr hineinzudrücken — bis auf die Hälfte herunter,
    bei einem waagerechten Dach.
  - **Wie tief die Hände hängen**: voll von über dem Kopf bis vor die Brust,
    dann fallend bis auf die Hälfte, wenn sie auf Fußhöhe stehen.
  - **Spannweite**: bis 75 cm umsonst, ab 1,60 m bleiben 70 % übrig.
  - **Füße** auf etwas Festem: +0,18 (gemessen mit einem kurzen Strahl nach
    unten, denn `grounded` ist beim Klettern immer falsch — der Körper fliegt
    ja).
  - **Restkraft**: leere Ausdauer macht jeden Griff schlechter, aber höchstens
    auf 70 % — eine Todesspirale, aus der niemand mehr herausklettert, wäre
    keine Mechanik, sondern eine Strafe.

  Zwei Hände tragen mehr als eine (die bessere plus ein Drittel der anderen),
  einarmig hängen kostet 22 %. **Die Leiter ist von alledem ausgenommen**: Sie
  gibt immer 1, egal wie tief, wie weit, wie erschöpft. Eine Leiter, an der man
  nach zwei Minuten abrutscht, wäre keine.

  **Die Ausdauer** (`climb/stamina.ts`, mit Test) hängt an zwei Schwellen.
  Über **0,70** füllt sie sich wieder — aber **anlaufend** (1,2 s), denn wer
  sich für einen Wimpernschlag an einen Henkel hängt, hat sich nicht ausgeruht;
  eine Erholung, die sofort einsetzt, macht aus jedem guten Griff einen
  Schalter. Unter **0,18** ist es kein Halt mehr, sondern ein Streifen: Die
  Hand geht ab, und wer keine zweite mehr an der Wand hat, fällt. Dazwischen
  läuft sie aus, umso schneller je schlechter der Halt und je glatter das
  Material. Auf dem Boden füllt sie sich in drei Sekunden, an der Wand in
  sechs. Was dabei herauskommt, in Sekunden bis leer: zwei raue Henkel oder
  Kanten sind eine **Rast**, zwei raue Ballen 180 s, zwei raue Flächen 55 s,
  zwei glatte Kanten 95 s, zwei glatte Flächen **9 s** — und einarmig überall
  ein Drittel davon.

  **Die Anzeige** (`climb/ClimbHud.ts`) hängt wie die Trefferanzeige an der
  **Kamera** und liegt auf `LAYER_HUD` — ein Balken, der dem Kopf ein Bild
  hinterherläuft, ist das Erste in VR, wovon einem schlecht wird. Sie sitzt am
  **unteren Bildrand**, 45 cm unter der Blicklinie auf einen Meter (gut 24°),
  und dem Auge entgegengedreht, weil eine schräg gesehene Tafel eine gestauchte
  ist. Unten in der Mitte die Ausdauer, links und rechts je ein Haltbalken; die
  Anordnung ist die Anschrift, deshalb steht nichts daran. Auf den Haltbalken
  sitzen zwei feine Striche genau auf den beiden Schwellen — sonst wäre „gut"
  eine Farbe, die man glauben muss, statt einer Höhe, die man abliest.
  Gezeichnet wird sie **davor** und nicht darüber (`renderOrder` 4): Drei
  Balken, die quer durch eine Menüseite laufen, sind schlimmer als drei Balken,
  die man kurz nicht sieht. Abschaltbar im Menü.

  **Die Vibration** (`climb/gripHaptics.ts`, mit Test) ist bewusst **kein
  Dauerbrummen, dessen Stärke den Halt anzeigt**: Ein Motor, der die ganze Zeit
  läuft, wird nach zwanzig Sekunden nicht mehr wahrgenommen, verdeckt jede
  andere Rückmeldung und leert den Akku — und man merkt eine _Änderung_ ohnehin
  viel besser als einen _Pegel_. Also drei **Ereignisse**: (1) **Der Schlag
  beim Zupacken**, genau einer, und er ist die Antwort auf „habe ich das gut
  erwischt?" — guter Halt **kurz und hart** (1,0 / 60 ms), schlechter **schwach
  und lang** (0,15 / 190 ms); dieselben zwei Regler in die Gegenrichtung, und
  dadurch ohne Anzeige auseinanderzuhalten. (2) **Das Rutschen**: Solange ein
  Griff unter der Erholungsschwelle liegt, tickt es leicht weiter, und je
  schlechter der Halt, desto **schneller** die Folge — nicht lauter, schneller;
  ein beschleunigendes Ticken liest sich als Countdown, und das ist es auch.
  (3) **Die Warnung** ab einem Drittel Ausdauer, kurz und kräftig statt lang
  und weich. An der Leiter passiert nichts davon außer dem Schlag beim
  Zupacken — eine Welt, in der auch das sichere Material vibriert, hat kein
  sicheres Material mehr.

  **Der Weg hinunter: das Sprungkissen** (`climb/crashPad.ts`, mit Test —
  reine Zahlen, kein three.js). Jeder nimmt von oben denselben Weg zurück, und
  bis vor kurzem endete er an einer Bodenplatte: Der Kopf fällt mit gut zehn
  Metern in der Sekunde, und **im nächsten Bild steht er still**. Das ist in
  der Brille kein Aufkommen, sondern der kürzeste Weg zur Übelkeit — das Auge
  meldet eine Vollbremsung, von der der Gleichgewichtssinn nichts mitbekommen
  hat, und genau diese Lücke ist es, aus der Motion Sickness entsteht. Ein
  Fall lässt sich in VR nicht abschaffen, sein **Ende** schon.

  Das Kissen ist deshalb eine **Feder mit Dämpfer**, und seine Oberfläche ist
  der Boden, auf dem man steht: ein **kinematischer** Körper, der jedes Bild um
  die Einsinktiefe nach unten gesetzt wird. Aus dem einen Bild werden gut acht
  Zehntelsekunden, und keines davon ist ein Ruck. **Warum eine Feder und keine
  Bremsstrecke**: Bei einer Feder hängt die Zeit bis zum tiefsten Punkt _nicht_
  am Aufpralltempo — sie ist ihre Viertelperiode und damit für den Stolperer
  dieselbe wie für den Sprung aus sechs Metern. Eine feste Bremsstrecke täte das
  Gegenteil: Je schneller jemand ankommt, desto härter bremst sie ihn. Die eine
  Zahl, um die es geht, ist deshalb die **Kreisfrequenz** (`PAD_OMEGA` = 7);
  dass ein Sprung von oben trotzdem nicht durchschlägt, macht die
  **progressive Härte** — ein halb zusammengedrücktes Kissen wehrt sich stärker
  als eines in Ruhe, so wie Luft in einem Sack. Eine **Rampe** an seiner Kante
  führt wieder hinauf, flacher als das, was der Körper noch steigt.

  Die Griffe tragen die **Greif-Farben** aus `core/colors.ts` und keine zweiten:
  Sprossen leuchten hell, rauer Fels trägt den ruhigen Ton, glatter den dunklen;
  den Rest macht die Oberfläche, denn glatter Fels glänzt auch. Wer im Spiel
  gelernt hat, dass Türkis „hier anfassen" heißt, sucht an einer Wand voller
  bunter Klötze zuerst das Türkis. Geklettert wird mit **Controllern oder
  getrackten Händen**; am Schreibtisch kann man die Wand ansehen und daran
  entlanglaufen, aber nicht hinauf.

  **Was mit der Kletterhalle gegangen ist**, und das ist der ehrliche Teil: die
  sechs Routen nebeneinander (Leiterwand, Rauwand, Riss, Überhang, Glattwand,
  Kamin), die Podeste auf 6,50 m und die **Ausstiegshilfen**, mit denen man
  oben wirklich ankam — ein Schacht von 90 cm zwischen Wand und Podest, eine
  senkrechte Leiter darin, deren Holme oben um die Ecke und einen Meter über
  die Kante laufen, damit man sich hinüberhangeln kann. Die Zahlen dazu und
  warum sie so sind, stehen in `git show 3678f32:src/worlds/climb/ClimbWorld.ts`;
  hier steht eine Wand, an der man die Rechnung ausprobiert, und kein
  Lehrpfad.

- **Der Kleiderschrank und die Umkleide** (`grid/fixtures/wardrobe.ts`,
  `worlds/shared/wardrobeRack.ts`): der erste Einbau, der nicht die Welt ändert,
  sondern **den Spieler**.

  Er steht an einer Kante wie ein Regal — eine Kachel breit, einen halben Meter
  tief, 2,1 m hoch —, ist fest und benutzbar, und auf einer seiner beiden
  Türfronten hängt ein **Spiegel** (`worlds/shared/Mirror.ts`, derselbe wie am
  Standspiegel). Wer davorsteht und `A` drückt, steht im nächsten Augenblick
  **in** seinem Kleiderschrank: Die Welt verblasst, ein weißer Kachelboden kommt
  herauf, und um die Figur herum fahren die Sachen aus dem Boden, die sie
  anziehen kann (siehe _Der Konstrukt-Raum_).

  **Er tut das über ein Ereignis und nicht selbst.** `use` meldet
  `{ type: 'wardrobe' }`, und was daraus wird, entscheidet die Welt:
  `GridWorld.openWardrobe` bekommt den Schrank als **Anker** dazu
  (`view.handle ?? view.object`) und macht damit das Konstrukt auf — ohne ihn
  wüsste es weder, was stehen bleibt, noch, worauf man drücken muss, um wieder
  herauszukommen. Ein zweiter Druck auf denselben Schrank führt hinaus. Eine
  Einbau-Art, die `saveAppearance` riefe, wäre dagegen eine, die man ohne
  Speicher nicht mehr prüfen kann — und sie wüsste Dinge, die sie nichts
  angehen: wer davorsteht, was der anhat, und ob daraus ein Regal, eine Seite
  am Bildschirm oder eine Menüseite in der Brille wird. Es ist das einzige
  `FixtureEvent` **ohne Inhalt**, und genau das ist die Nachricht: Jemand hat
  den Schrank aufgemacht.

  **Der Spiegel brauchte dafür keinen neuen Bau-Kontext.** Der erste Verdacht
  war, `FixtureBuild` um einen Haken für Spiegel zu erweitern — der
  Standspiegel sieht ja so aus, als bräuchte er Renderer, Szene und Kamera. Er
  braucht sie nicht: Eine `MirrorSurface` ist ein gewöhnliches Mesh, und wer ihr
  ihr Bild malt, **sucht sie im Szenengraphen** (`MirrorRenderer.render` über
  `collectMirrors`). Ein Spiegel, der in `ctx.group` hängt, bekommt sein Bild
  also von selbst, und der Vertrag der Einbauten bleibt so klein, wie sein
  Kommentar es verspricht. Er kostet nur eines: **Freigeben** — das Glas hält
  ein eigenes Material, und erst dessen `dispose` meldet dem Zähler der Spiegel,
  dass es eines weniger ist.

  **Korpus in `solids`, Türen im Bild.** Dieselbe Teilung wie bei jedem Einbau,
  der aufhält: Was Körper hat, gehört in `solids` — dort wird es aus der Palette
  der Welt gebaut, bekommt Physik und wird von oben durchsichtig, wenn es die
  Figur verdeckt. Die beiden Türfronten sind das, was man **anfasst**, und
  hängen deshalb in der Gruppe: Was dort hängt, bekommt den gelben Saum, und
  ein Schrank, bei dem der ganze Kasten leuchtet, sagt weniger als einer, bei
  dem die Türen leuchten. Dieselbe Teilung entscheidet im Konstrukt, was stehen
  bleibt: Der **Anker** ist die Gruppe, also stehen Türen und Spiegel im weißen
  Raum, während der Korpus mit der Welt verblasst, zu der er gehört.

  **Er meldet sich aus einem Meter**, nicht mehr aus 0,7 m (`use.radius`). Der
  Halbmesser ist der Zylinder, den der Strahl treffen muss
  (`core/usable.pickUsable`), und 0,7 m maßen genau die beiden Türblätter — mehr
  hängt ja nicht in der Gruppe. Wer schräg davorstand, zielte daran vorbei und
  sah nichts leuchten, während jedes Küchenmöbel drei Meter weiter schon von der
  Seite antwortet: Ein Möbel ohne eigene Angabe bekommt die Ausdehnung seines
  Netzes (`PortalWorld.addUsable`, `objectRadius`), bei einer Küchenzeile auf
  einer Kachel gut 0,7 m, bei der Ausgabetheke über zwei Kacheln das Doppelte.
  Ein Meter ist die halbe Diagonale der Kachel plus eine Handbreit — und damit
  antwortet der Schrank aus derselben Entfernung und unter denselben Winkeln wie
  alles andere, vor dem man stehen kann.

  **Die Umkleide ist kein Blatt mehr, sondern ein Regal**
  (`worlds/shared/wardrobeRack.ts`). Bis eben klappte ein Druck auf den Schrank
  eine Liste mit Pfeilen auf, und eine Liste mit Pfeilen ist die eine Bedienung,
  von der man in einer Brille nichts hat: Man sieht das Kleidungsstück nicht,
  man liest seinen Namen. Jetzt stehen die **siebzehn** Sachen als Sachen da —
  vier Gesichter, acht Hüte, fünf Oberteile, in genau der Reihenfolge, in der
  `ui/wardrobeRows.ts` seine drei Zeilen baut. Zwei Umkleiden, die dieselben
  Sachen verschieden sortieren, driften nach der zweiten neuen Mütze
  auseinander, und dann sucht man im Regal an der Stelle, an der im Menü etwas
  anderes stand.

  Jedes Stück wird **einmal gebaut** und danach wiederverwendet (`made`), und
  zwar erst in dem Bild, in dem es aus dem Boden kommt: Siebzehn Avatarteile je
  Öffnen kosteten knapp eine Zehntelsekunde am Stück — genau die Pause nach dem
  Druck auf den Schrank — und hinterließen siebzehn frische Geometrien samt
  Materialien, die niemand wieder freigab (`buildHead` und die beiden anderen
  bauen alles neu). Herausgegeben wird deshalb erst die **Auskunft** (Fach,
  Name, ob man es anhat) und das Netz auf Abruf (`RackPiece.object`).

  Jedes Stück ist **handgroß** (30 bis 45 cm) und steht auf seinem eigenen Fuß,
  und die drei Verkleinerungen sind je eine Zahl pro Fach (0,55 für Köpfe, 0,44
  für Hüte, 0,5 für Oberteile), aus dem größten Stück des Fachs
  zurückgerechnet. **Eine** Zahl je Fach und keine Normierung Stück für Stück:
  Ein Zylinder ist höher als eine Krone, ein Bauhelm breiter als eine Mütze, und
  genau daran erkennt man sie auch verkleinert wieder. Der Rumpf wird dabei auf
  knapp zwei Drittel gestaucht (`BODY_STAND`) — in voller Höhe ist er eine
  kopflose Figur, gestaucht ist er eine **Büste**, und so stellen
  Kleidergeschäfte Oberteile hin. Für `none` steht ein **leerer Hutständer**
  dort, Pfosten und Knauf: `buildHeadgear('none')` gibt `null`, und ein leeres
  Brett sähe nicht nach einer Möglichkeit aus, sondern nach einer Lücke — dabei
  ist ausgerechnet _Barhäuptig_ die Auslieferung, und wer einen Hut wieder
  absetzen will, muss auch etwas **benutzen** können.

  **Was man anhat, trägt einen Reif um den Fuß** (`rack-worn`), flach, warm und
  selbstleuchtend. `RackPiece.worn` sagt es dem Aufrufer, aber ein Regal, in dem
  man erst etwas anvisieren muss, um zu erfahren, ob man es schon trägt, ist
  wieder ein Menü; ein Ring sagt es auf einen Blick und aus jeder Richtung, Text
  kann das nicht. Beim Anziehen **wandert** er, statt dass das Regal neu gebaut
  wird (`GridWorld.wearable`) — siebzehn Netze für eine Marke wegzuwerfen wäre
  das eine, die Auffahrt aus dem Boden ein zweites Mal vorzuführen das andere.
  Dafür bekommt **jedes** Stück seinen Reif, und sichtbar ist einer: Wandern
  kann nur, was da ist. Ein Ring, den es erst beim nächsten Neubau gäbe, wäre
  nach dem ersten Kleiderwechsel bei **keinem** Stück mehr zu sehen — der alte
  ginge aus, ein neuer entstünde nie. Wandern lässt ihn seit September 2026 das
  Regal selbst (`WardrobeRack.wear`) und nicht mehr eine Schleife im Aufrufer:
  Es weiß, welche Stücke schon gebaut sind, und es merkt sich das Aussehen für
  die, die erst noch aufzufahren haben. Wer alle Stücke eines Fachs anfasste, um
  einen Ring umzuschalten, baute genau die vorzeitig, die der Raum gerade
  langsam nachreicht.
  Und der Raum bleibt dabei **offen**: Wer sich umzieht, probiert, und wer
  probiert, will den nächsten Hut sehen, ohne zweimal durch eine halbe Sekunde
  Überblendung zu gehen (`ConstructItem.pick` gibt `false`).

  **Der Spiegel an der Tür ist die Rückmeldung** und kein Zierrat. Er ist mit
  den Türen das Einzige, was nicht verblasst, und er zeigt die Figur in dem, was
  sie gerade angezogen hat — deshalb braucht dieses Regal keine zweite Szene und
  keine Figur in Nahaufnahme daneben. Und **das Aussehen hängt weiter am
  Spieler** und nicht an der Welt (`core/appearance.ts`): `saveAppearance`
  speichert sofort, der eigene Körper und das Netz hören über
  `onAppearanceChange` zu, und angesagt wird es in der **Anmeldung** und nicht
  in der Pose (`hello`, Felder `hat`, `head`, `body` — siehe _Wie man
  aussieht_). Wer sich hier umzieht, läuft auch in der nächsten Welt so herum.

  **Das Blatt von früher gibt es noch, aber nur als Rückfall**
  (`ui/WardrobeMenu.ts`). Ohne Netz kein Konstrukt: `GridWorld.openWardrobe`
  bekommt den Schrank als Anker mitgereicht, und wenn keiner da ist, geht es
  über `ctx.openWardrobe()` den alten Weg — am Bildschirm die Seite mit der
  Figur daneben, in der Brille die Seite _Aussehen_ am Handgelenk. Das ist kein
  Notbehelf, sondern die ehrliche Antwort: Ein Schrank ohne sichtbaren Korpus
  wäre im Konstrukt ein weißer Raum mit nichts darin.

  **Die Seite am Bildschirm** ist eine Seite über dem Bild, geschnitten wie
  das Menü (`ui/pageMenu.css`): auf dem Telefon ein Blatt von unten, am
  Schreibtisch ein Kasten in der Mitte. Links drei Zeilen mit ‹ und › — Kopf,
  Hut, Körper (`ui/wardrobeRows.ts`) —, rechts **die Figur in Nahaufnahme**,
  unten _Fertig_. Die Figur ist eine **zweite Szene**: ein eigener Renderer in
  einem eigenen Canvas, ein `AvatarBody` darin, dasselbe Licht wie im Spiel —
  und beides entsteht beim Öffnen und ist beim Schließen wieder weg. Das ist die
  Stelle, an der man es falsch machen kann: Ein zweiter Renderer, der im
  Hintergrund weiterläuft, kostet auf der Quest genau die Bilder, die dem Spiel
  fehlen. Warum überhaupt eine zweite Szene und kein Ausschnitt der ersten: Die
  eigene Figur steht auf einer Ebene, die nur Portale und Spiegel zeichnen
  (`LAYER_SELF_ONLY`), und sie steht dort, wo der Spieler steht — nicht vor
  einem Vorhang, in den man hineinschaut.

  **Die Kamera hängt an den Maßen der Figur** (`CHEF_HEIGHT`) und nicht an
  denen des Spielers, und genau das war hier einmal falsch: Die Zahlen stammten
  aus der Zeit, in der der Avatar so hoch war wie sein Spieler — Kamera auf
  1,62 m, Blick auf 1,42 m. Seit die Figur ein Modell ist, ist sie 1,60 m hoch
  und ihre Augen liegen bei 0,91 m; die Kamera schaute damit einen halben Meter
  über ihren Hut hinweg, und in der Umkleide stand eine Mütze am unteren
  Bildrand. Man suchte Köpfe aus, die man nicht sah. Gezeigt wird jetzt die
  **ganze** Figur: Sie ist gedrungen genug, dass sie ins Bild passt, ohne dass
  der Kopf klein wird, und Jacke und Hände gehören zu dem, was man hier
  aussucht.

  **In der Brille gibt es diese Seite nicht.** Fällt der Schrank dort auf den
  alten Weg zurück, springt `App.openWardrobe` an die Seite _Aussehen_ am
  Handgelenk und baut kein zweites Canvas auf: Eine zweite Figur vor der Nase
  wäre ein Bild von einem Spiegel neben einem Spiegel, und sie kostete einen
  ganzen zweiten Renderer in der Sitzung, in der die Bilder am knappsten sind.

  **Gespeichert wird sofort** (`saveAppearance`); _Fertig_ schließt nur. Es gibt
  kein _Übernehmen_: Wer vor einem Spiegel steht und die Änderung nicht sieht,
  hat kein Umkleidemenü.

  **Die Zeilen sind eine eigene Datei** (`ui/wardrobeRows.ts`) und aus demselben
  Grund, aus dem `init`/`step` einer Einbau-Art rein sind: Was eine Zeile
  schaltet, ist eine Rechnung über drei Listen, und die prüft ein Test in
  Millisekunden. Was daraus für ein Knopf wird — DOM am Bildschirm, Menüzeile am
  Handgelenk, ein Stück auf einem Brett —, ist eine zweite Frage. Dieselbe
  Grenze läuft durch das Regal: `wardrobeRack.ts` liefert die Stücke und die
  Auskunft, was Anziehen heißt; wohin sie kommen und wer den Raum wieder
  zumacht, entscheidet `worlds/shared/construct.ts`.
- **Schilder** (`src/worlds/signs/`, Werkzeug `tools/SignTool.ts`): Tafeln, die
  man irgendwo hinstellt und beschriftet. Sie sind das Gegenstück zur
  Staffelei — die stellt eine Fläche zum _Malen_ hin, das Schild eine zum
  _Lesen_ —, und sie sind das, was eine **Lobby** braucht: Was ein Raum an
  Absprachen, Regeln und Plänen mit sich trägt, steht sonst im Chat und ist
  nach dem dritten Beitritt weggescrollt.
  **Bedienung**: In der Hand ist das Werkzeug eine kleine Tafel am Griff, auf
  der schon steht, was gleich aufgestellt wird. **Trigger** stellt hin — auf
  den Boden kommt das Schild auf einen Pfosten, an eine Wand flach darauf;
  wohin es käme, zeigt ein Umriss in Schildgröße. **A/X** beschriftet: zielt
  man dabei auf ein aufgestelltes Schild, wird dieses beschriftet, sonst der
  Entwurf in der Hand. **Greifen an einem der beiden Traggriffe** nimmt ein
  aufgestelltes Schild wieder auf (dieselbe Geste wie an der Staffelei, und aus
  demselben Grund: ein Schild ist kein Prop und hat keinen Körper, den eine Hand
  fassen könnte). Und mit **leerer Hand** genügt hinzeigen und Trigger — dann
  geht die Tastatur auf. Eine Hand mit einem Werkzeug zeigt hier nicht hin; sie
  hat mit ihrem Trigger etwas anderes vor (`PointerTarget.ignore`).
  **Was auf einer Tafel steht**, ist eine kleine Teilmenge Markdown:
  Überschriften, Aufzählungen (Punkte und Nummern), Zitat, Trennlinie, Code,
  Bild — und in der Zeile fett, kursiv, Code und Links. Sie ist **selbst
  geschrieben und nicht geladen**, und das ist die eine Entscheidung, die hier
  wirklich zählt: Eine Markdown-Bibliothek gibt HTML zurück, und HTML ist in
  einer WebXR-Szene kein Bild. Was man sieht, ist eine **Leinwand**
  (`CanvasTexture`) — der Umweg über ein `foreignObject` in einem SVG malt in
  der Brille entweder gar nicht oder gar nichts mehr, sobald ein fremdes Bild
  darin steckt: Die Leinwand ist dann „vergiftet" und lässt sich nicht mehr als
  Textur hochladen. Deshalb wird jedes Bild mit `crossOrigin = 'anonymous'`
  geladen, und was der Server nicht freigibt, bekommt einen Platzhalter mit
  seinem Alternativtext statt eines schwarzen Schildes.
  Der Weg dahin sind drei Schritte, und nur der letzte kennt eine Leinwand:
  Text → Blöcke (`signMarkup.ts`) → Zeilen mit festen Plätzen
  (`signLayout.ts`) → gezeichnet (`SignBoard.ts`). Alles bis dorthin ist ohne
  Brille prüfbar, und deshalb ist die Höhe, aus der das Rollen seine Grenzen
  zieht, keine geratene Zahl.
  **Einstellbar** ist im Menü unter dem Werkzeug: **Schriftgröße** (in
  Zentimetern _auf dem Schild_, nicht in Pixeln — nur so heißt „4 cm" auf der
  kleinen Tafel dasselbe wie auf der großen), **Markdown an/aus**,
  **Ausrichtung**, **Schriftfarbe** und **Hintergrund** (sechs bzw. sieben, als
  Liste statt als Farbkreis: wer im Headset einen Farbkreis bedienen soll,
  tippt am Ende Zahlen), **automatisches Rollen** (0 bis 16 cm/s, mit Pause
  oben und unten und einem Sprung zurück an den Anfang — rückwärts laufender
  Text liest sich wie ein Fehler), **Rollen von Hand** (Daumenstick der Hand,
  die auf das Schild zeigt; solange sie rollt, wartet das Automatische) und die
  **Maße** der Tafel. Jede Zeile ändert **zweierlei**: das Schild, vor dem man
  steht, und die Vorlage für das nächste — wer die Schrift größer stellt, will
  dieses Schild größer haben und das nächste nicht wieder von Hand einstellen.
  **Über das Netz** geht ein Schild als sieben Felder (Kennung, Fassung, Lage,
  Text, Aussehen, Art der Befestigung): Wer eines aufstellt, stellt es allen im
  Raum auf, und wer später dazukommt, sagt einmal Hallo und bekommt den Bestand
  nachgereicht (`SignRoom.ts`, Kanal `signs`). Dass dabei mehrere antworten,
  ist eingeplant — die höhere **Fassungsnummer** gewinnt, die gleiche verliert
  gegen das Bekannte (`signShare.ts`, mit Test), sonst spränge der Rollstand
  jedes Schildes bei jeder Begrüßung an den Anfang. Was hereinkommt, wird
  geprüft: Ein Schild mit einer Million Zeichen ist keine Nachricht, sondern
  eine stehende Bildrate. **Aufgehoben** werden die **eigenen** Schilder je
  Welt (`signStore.ts`) — die der anderen kommen über das Netz, wenn die
  anderen da sind; sie mitzuschreiben hieße, dass ein längst abgeräumtes Schild
  beim nächsten Besuch wieder an der Wand hängt. Schilder, die zu einer **Welt**
  gehören (eine Galerie, die zum Aufbau zählt), gehören niemandem: feste Kennung,
  nicht gespeichert, nicht verschickt — jeder baut dieselbe Halle. Die Tafel
  kann darüber hinaus **ohne Traggriffe** gebaut werden (`handles: false`) — für
  eine, die angeschraubt ist und nicht mitgenommen wird, wie der Aushang an der
  Küchenwand (`worlds/test/zones/kitchenNotice.ts`): Zwei türkise Griffe sagen
  in diesem Spiel „hier anfassen", und das ist ein Versprechen.
- **Tastatur des Geräts** (`src/core/systemKeyboard.ts`): In der Brille kann
  eine Texteingabe die **Systemtastatur** anfordern — der Meta-Quest-Browser
  blendet seine eigene ein, sobald in einer laufenden WebXR-Sitzung ein
  Eingabefeld des Dokuments den Fokus bekommt (dasselbe gilt für Wolvic und
  Pico). Sie kann Wortvorschläge, Umlaute, Diktat und die gekoppelte
  Bluetooth-Tastatur — alles, was eine selbstgemalte Tafel nie können wird.
  Drei Dinge sind daran wichtig: Sie tritt **neben** die Bordtastatur und nicht
  an ihre Stelle (ob eine Quest sie wirklich einblendet, erfährt kein Programm
  — es gibt kein Ereignis dafür, und eine Eingabe, die auf einer unsichtbaren
  Zusage beruht, hat man dann gar nicht); am **Schreibtisch** bleibt sie aus,
  weil dort die echte Tastatur steht und ein fokussiertes Feld jeden Anschlag
  doppelt zustellte; und **abgeschickt** wird nicht dort, sondern weiter mit
  _Fertig_ auf der Tafel im Raum. Unter _Werkzeuge → Schild → Tastatur_ steht
  die Wahl: _automatisch_, _Systemtastatur_, _Bordtastatur_.
  Das Tastenfeld selbst (`ui/KeyPanel.ts`) hat dafür eine vierte, **mehrzeilige**
  Belegung bekommen — vierzehn Spalten mit Umlauten, Satzzeichen und den
  Zeichen, aus denen Markdown besteht, ein hohes Feld, das die letzten Zeilen
  zeigt, und eine Eingabetaste, die eine **neue Zeile** macht statt abzuschicken
  (fertig ist man mit _Fertig_ oder `Strg`+`Eingabe`).
- **Die Eingabeseite** (`inputs.html`, `src/inputs/`, siehe
  [Die Eingabeseite](./seite.md#die-eingabeseite)): jeder Knopf des Pads mit seiner
  Nummer, ein gezeichneter Controller, auf dem leuchtet, was gedrückt ist, das
  Panel mit `gamepad.buttons[N]` daneben — und darunter derselbe `readGamepad`,
  der im Spiel läuft. Sie ist für den Browser einer Konsole gebaut, wo es keine
  Entwicklerwerkzeuge gibt und ein Knopf, der nichts tut, sonst unerklärlich
  bleibt.
- **Belegung und Gerätekarte** (`core/inputMap.ts` mit Test, `inputStore.ts`;
  auf der Seite und im Spiel unter _Menü → Eingaben_): Welcher Knopf und welche
  Taste was tun — und, davon getrennt, **wo eine Nummer an diesem Gerät
  wirklich sitzt**. Das zweite gibt es, weil manche Treiber die Lage falsch
  melden (ein Backbone am iPhone meldet den unteren Gesichtsknopf als
  `buttons[1]`); ein Tausch ist ein Handgriff, gilt nur für dieses Gerät, und
  danach stimmen Bild, Liste und Spiel. Alles gespeichert, alles einzeln oder
  ganz auf Standard zurückzusetzen; ohne eigene Einstellung ändert sich nichts.
- **Vollbild, wo keine Brille ist** (`core/fullscreen.ts`, siehe
  [Vollbild, wo keine Brille ist](./seite.md#vollbild-wo-keine-brille-ist)): ein Knopf auf
  der Startseite und im Streifen des Spiels. Auf einer Konsole oder am
  Fernseher kostet die Adresszeile ein Fünftel des Bildes; in der Brille gibt
  es ihn nicht, dort ist die Sitzung selbst das Vollbild.
- **Boden bis zum Horizont**: unter _jeder_ Welt liegt eine Fläche mit Raster,
  einen Kilometer im Quadrat, begehbar und portalfähig (`createGround` in
  `worlds/shared/environment.ts`). Vorher stand jede Welt auf ihrer eigenen
  Platte, und an deren Rand war Schluss — genau die Grenze, die eine Sandkiste
  nicht haben darf. Jetzt läuft man um das Labor herum, sieht sich die
  Kartbahn von außen an und kommt wieder zurück.

  Das Raster darauf ist ein **Schachbrett mit einem Meter je Feld**
  (`CHECKER_TILE`) — derselbe Meter, in dem gebaut wird (`nav/navTile.TILE`).
  Vorher war es eine einzelne Fläche mit einem Strich darum, alle vier Meter:
  eine Kachelgröße, die es in keiner Welt dieses Projekts gibt. Ein Raster, das
  nicht zu dem passt, in dem man Wände setzt, ist schlimmer als keines. Zwei
  abwechselnde Töne statt eines: Eine große einfarbige Ebene ist in der Brille
  kaum von Nebel zu unterscheiden, und ein Raster, dessen Felder man nicht
  **zählen** kann, sagt einem nicht, wie weit man gelaufen ist. Die zweite
  Farbe kommt ohne Angabe eine Spur heller als die erste heraus, damit jede
  Welt ihr Brett bekommt, ohne ihren Ton zu verlieren; wer es wie in **Portal**
  will — grau und weiß —, nennt sie (`horizonChecker()`, so macht es die
  Testwelt).

  Den Zeichner teilt sich dieser Boden inzwischen mit einem zweiten
  (`checkerTexture`): Die **Küche der Testwelt** ist ebenfalls kariert, mit
  halben Feldern und eigenen Tönen (`test/zones/kitchenFloor.ts`). Geteilt wird
  dabei nicht nur das Muster, sondern vor allem, was darum herum steht —
  sRGB-Farbraum, Mipmaps und `anisotropy`: die drei Einstellungen, ohne die ein
  Raster aus der Schrägsicht flimmert, und die man in einer zweiten Fassung
  garantiert einmal vergisst.
- **Rettung aus der Tiefe**: wer trotzdem unter die Welt fällt — durch ein
  Bodenportal, durch eine Ritze, durch einen Handschuh — kommt an derselben
  Stelle wieder heraus, auf dem **höchsten** Punkt, der dort steht. Von unten
  gesucht landete man im Keller eines Hauses, von oben landet man auf seinem
  Dach (`worlds/shared/fallRescue.ts`, mit Test).
- **Welt-Physik** (_Einstellungen → Welt-Physik_): **Schwerkraft**
  (schwerelos, Mond, Mars, Erde, schwer — oder getippt), **Sprungkraft**,
  **Reibung** und **Rückprall**, alles sofort wirksam und im Browser gemerkt
  (`src/core/worldPhysics.ts`, mit Test). _Welt-Standard_ ist eine eigene
  Zeile: Eine Welt darf ihre eigene Schwerkraft mitbringen (`worldGravity()` —
  ein Mond sagte dort 1,62), und eine einmal getippte Zahl darf nicht für immer
  über jeder Welt stehen. Reibung und Rückprall fassen die
  Objekte erst an, wenn jemand sie wirklich verstellt — sonst überschriebe der
  Start jede im Code eingestellte Kleinigkeit (alles aus dem Beutel 0,7, die
  Companion Cubes des Labors 0,8).
  Dazu **Körper stößt an**, und das ist ein Schalter: **aus**, wie
  ausgeliefert, bleibt der eigene Rumpf zwar fest — man geht nicht durch Kisten
  und steht weiter auf ihnen —, wirft aber nichts mehr um. Der eigene Körper
  ist das Einzige in der Welt, das man nicht sieht, und er stand ständig in
  etwas drin: der Stapel, an dem man vorbeiging, fiel, und das eben Abgelegte
  war beim Umdrehen weg. Wer Kisten mit dem Knie vor sich herschieben will,
  schaltet die Zeile an. Für die **Hände** gilt das ausdrücklich nicht: mit der
  Hand hinlangen heißt anstoßen wollen.
- **Weltenregistry**: eine neue Welt ist ein Eintrag plus ein Modul.
- **Peer-to-Peer-Sitzungen** (experimentell): beide Geräte tragen denselben
  Raum-Code ein und sind danach direkt verbunden — ohne eigenen Server.
- **Geteilte Welt**: Portale, Würfel und Dominos sind bei allen dieselben —
  wer schießt, wirft oder etwas aus dem Beutel holt, tut das für alle.
- **Zuschauer-Kamera**: Spieler auswählen und zusehen, aus dessen Augen
  (First Person) oder mit weicher Verfolgung von hinten (Third Person). Am PC
  im Panel unter _Zuschauen_, in VR unter **Menü → Verbindung → Zuschauen** —
  beide Seiten haben dieselben Möglichkeiten.
