/**
 * Wie schön es aussehen soll.
 *
 * Bis hierher gab es genau ein Bild: flache Farben, ein Himmelsverlauf, drei
 * Lichter und **keine Schatten** — gebaut für eine Brille, die sich ihr Bild
 * zweimal pro Frame verdienen muss. Das ist eine gute Voreinstellung und eine
 * schlechte einzige Möglichkeit: Wer am PC sitzt oder eine Quest 3 aufhat, hat
 * Luft übrig, und ein Sandkasten, der sie liegen lässt, sieht ärmer aus als er
 * müsste.
 *
 * Also zwei Stufen, und die untere ist ausdrücklich **das, was bisher war**:
 *
 * - **Einfach** — Zeile für Zeile derselbe Aufbau wie vorher. Wer nichts
 *   einstellt, merkt von dieser Datei nichts.
 * - **Comic** — dieselbe Welt als Zeichnung: eine **schwarze Kontur** um jedes
 *   Ding (`outlineShell.ts`), Licht, das in **Stufen** auf den Flächen liegt
 *   statt in einem Verlauf, und Schatten von der Sonne. Kein Umgebungsbild —
 *   eine Spiegelung ist genau das, was ein gezeichnetes Bild nicht hat.
 *
 * **Es waren einmal drei.** Dazwischen stand *Schön*: Schatten, ein
 * Umgebungsbild aus dem Himmel der Welt und ein schärferes Bild in der Brille;
 * daneben ein zweiter Schalter für **prozedurale Texturen** — ein Rauschen im
 * Shader, das jeder Oberfläche Körnung gab. Beides ist wieder heraus, und zwar
 * vollständig: die Stufe, der Schalter, das Umgebungsbild und der ganze
 * Shader-Umbau dahinter. Was bleibt, ist die Frage, für die es diese Datei
 * gibt — flach oder gezeichnet.
 *
 * Diese Datei ist **reine Rechnung und Beschriftung** — kein three.js. Wer die
 * Werte anwendet, ist `GraphicsQuality.ts`; wie sie in der Szene ankommen,
 * steht in `graphicsScene.ts`.
 *
 * Und eines steht hier ausdrücklich **nicht** drin: der Konfig-Code
 * (`configCode.ts`). Was ein Gerät leisten kann, ist keine Einstellung, die man
 * verschickt — ein Code aus einer Brille darf einem PC nicht die Schatten
 * abschalten und ein Code vom PC einer Brille keine aufzwingen.
 */

const KEY = 'bgvr.graphics';

/** Die beiden Stufen. `simple` ist das Bild, das dieses Projekt immer hatte. */
export type GraphicsMode = 'simple' | 'comic';

export const GRAPHICS_MODES = ['simple', 'comic'] as const;

export interface GraphicsSettings {
  mode: GraphicsMode;
  /**
   * **Wie groß die Brille ihr Bild rechnet**, als Anteil dessen, was sie
   * selbst vorschlägt (`XRWebGLLayer.framebufferScaleFactor`): 1 ist der
   * Vorschlag, 0,85 rechnet gut ein Viertel weniger Bildpunkte, 0,7 die
   * Hälfte. Das ist der eine Regler, der auf einer Quest **immer** zieht —
   * eine dunkle Station voller Lichter ist am Füllen der Bildpunkte am
   * teuersten, und ein Bild, das weicher ist, aber steht, ist in der Brille
   * das bessere. Gilt nur dort; am Bildschirm ändert er nichts. Und er gilt
   * **ab der nächsten Sitzung**: Die Brille nimmt die Puffergröße nur beim
   * Aufsetzen entgegen (`GraphicsQuality.applyRenderer`).
   */
  xrScale: XrScale;
  /**
   * **Die Bildrate im Bild** — das kleine Feld unten rechts (`FrameStats`),
   * das sonst nur F3 hervorholt. Als Häkchen unter Grafik, damit es auch am
   * Telefon geht, wo es kein F3 gibt; F3 schaltet dasselbe Häkchen.
   */
  showFps: boolean;
  /**
   * **Die Gitterlinien der Ebene, auf der man steht** — die Kanten der
   * Bodenkacheln, halbtransparent darübergelegt (`worlds/grid/GridWorld.ts`).
   *
   * Ab Werk **aus**: Ein Gitter über dem Boden ist eine Bauhilfe und keine
   * Welt. Wer aber eine Küche auf Kacheln von einem Meter baut, will sehen,
   * wo die Kachel aufhört — und in der Ansicht _Von oben_ ist genau das die
   * Frage, die man sonst durch Probieren beantwortet.
   *
   * Sie steht hier neben der Bildrate und nicht in einem Weltmenü, aus
   * demselben Grund wie alles auf dieser Seite: Eine Welt darf den Boden unter
   * dem Spieler ändern, nie aber seine Augen.
   */
  gridLines: boolean;
  /**
   * **Die Umrisse der Körper**, über alles andere gelegt
   * (`physics/HitboxView.ts`).
   *
   * Jeder Kasten, jede Kapsel, jeder Zylinder, den die Physik kennt — die
   * Wände, die Küchenmöbel, die Kisten, und vor allem der **Kreis um den
   * Spieler**, der von oben zeigt, wie breit er wirklich ist. Gezeichnet
   * **ohne Tiefenprüfung**: Die Linien liegen über allem, auch über dem, was
   * vor ihnen steht, denn ein Umriss, den das Möbel verdeckt, zu dem er
   * gehört, beantwortet keine Frage.
   *
   * Ab Werk **aus**. Das ist eine Werkstattansicht: Sie sagt, warum man
   * irgendwo hängen bleibt, warum ein Sprung nicht hinaufreicht und wo die
   * unsichtbare Sperre über einer Küchenzeile wirklich endet
   * (`worlds/test/zones/kitchen.ts`). Wer sie anlässt, spielt in einem
   * Drahtgitter.
   */
  hitBoxes: boolean;
  /**
   * **Ob die unsichtbaren Griffe sichtbar sind** (`core/handleView.ts`).
   *
   * Ein Griff ist eine Stelle mit Lage und Achse, an der die Hand andockt —
   * am Stiel der Pfanne, oben am Feuerlöscher, am Rand und unter dem Teller
   * (`core/grabHandles.ts`). Er ist absichtlich unsichtbar: Man soll die
   * Pfanne am Stiel nehmen, nicht einen Punkt am Stiel treffen. Nur lässt sich
   * eine Zahl, die man nicht sieht, auch nicht einmessen — und genau dafür
   * gibt es dieses Häkchen: ein kleines Achsenkreuz an jeder Griffstelle, in
   * jeder Ansicht.
   *
   * Ab Werk **aus**. Das ist ein Werkzeug zum Einmessen und kein Bühnenbild —
   * dieselbe Sorte Werkstattansicht wie die Hitboxen darüber, und aus
   * demselben Grund an derselben Stelle.
   */
  showHandles: boolean;
  /**
   * **Ob die Sonne Schatten wirft.**
   *
   * Ein eigener Schalter und keine Eigenschaft der Stufe, und das ist
   * nachgetragen worden: Schatten hingen am **Comic**, also am Bild mit
   * schwarzen Konturen und Licht in Stufen — wer nur Schatten wollte, bekam
   * eine Zeichnung dazu, und wer die Zeichnung nicht wollte, bekam eine Welt,
   * in der alles einen Zentimeter über dem Boden schwebt. Das sind zwei
   * Fragen, also sind es jetzt zwei Schalter.
   *
   * **Ab Werk an.** Das ist die eine Stelle, an der „Einfach ist, was bisher
   * war" nicht mehr stimmt, und zwar mit Absicht: Das Vorbild dieses Projekts
   * ist Overcooked, und dort sitzt jede Figur und jeder Tresen in einem
   * weichen Schlagschatten — er ist es, der aus einer Ansicht von schräg oben
   * einen Raum macht und nicht eine Collage. Wem das in der Brille zu teuer
   * ist, macht ihn hier aus; er ist der erste Regler, an dem man dreht, wenn
   * die Bildrate klemmt.
   */
  shadows: boolean;
  /**
   * **Ob sich die Figur beim Laufen staucht und streckt** — _squishy
   * movement_ (`core/squish.ts`, angewendet in `core/AvatarBody.ts`).
   *
   * Die erste Zeile unter _Animationen_, und sie steht dort, weil sie eine
   * Frage des Geschmacks ist und keine der Bildrate: Sie kostet zwei
   * Multiplikationen je Figur und Bild. Ab Werk **aus** — wer eine Figur
   * federn sehen will, sagt es; wer nichts einstellt, sieht die Figur, die
   * dieses Projekt immer hatte.
   */
  squish: boolean;
  /**
   * **Wie stark** — der Faktor auf den gemessenen Ausschlag
   * (`squish.SQUISH_AMPLITUDE`, neun Prozent der Höhe).
   *
   * Rasten und kein Schieberegler: Ein Menü, das in der Brille mit einem
   * Strahl bedient wird, hat keine Stelle für einen Wert, den man auf zwei
   * Nachkommastellen zieht. Und die fünf decken die ganze Frage ab — von
   * „gerade eben zu ahnen" bis „Gummiball". Die unterste (×0,25) ist
   * nachgereicht: Für ein Federn, das man nur bemerkt, wenn es fehlt, war
   * selbst ×0,5 noch zu viel.
   */
  squishScale: SquishScale;
  /**
   * **Wie schnell** — der Faktor auf die Taktphase, mit der die Figur durch
   * die Kurve läuft (`squish.squishPose`).
   *
   * **Ab Werk ×0,5**, und das ist eine Korrektur: Ein Federn je Schritt war
   * die erste Fassung und zu schnell — der Takt des Watschelns ist schon
   * zweimal je Doppelschritt, und eine Figur, die dazu ebenso oft ihre Höhe
   * wechselt, flimmert, statt zu federn. Bei ×0,5 zieht sich ein Federn über
   * zwei Schritte und legt damit eine ruhige Welle über das schnellere
   * Watscheln.
   *
   * Eine eigene Zeile und kein zweiter Sinn der Stärke: Wie **weit** die
   * Figur federt und wie **oft** sie es tut, sind zwei Fragen, und wer die
   * eine mit der anderen beantworten muss, bekommt keine von beiden richtig.
   */
  squishSpeed: SquishSpeed;
  /**
   * **Ob die Figur im Stehen atmet** — dieselbe Stauchung, nur langsamer und
   * flacher (`core/squish.ts`, `IDLE_AMPLITUDE`).
   *
   * Ein **eigener** Schalter und kein Anhängsel des Laufens, obwohl beide
   * dieselbe Rechnung benutzen: Wer die Figur beim Laufen federn sehen will,
   * will damit noch lange nicht, dass sie im Stand pumpt — und wer im
   * Gegenteil nur ein Lebenszeichen vor dem Tresen möchte, soll es bekommen,
   * ohne dass die Figur beim Gehen zum Gummiball wird. Zwei Fragen, zwei
   * Schalter, und darunter je eine Stärke und ein Tempo.
   *
   * Ab Werk **aus**, aus demselben Grund wie die Zeile darüber: Wer nichts
   * einstellt, sieht die Figur, die dieses Projekt immer hatte.
   */
  idleSquish: boolean;
  /**
   * **Wie tief** — der Faktor auf `squish.IDLE_AMPLITUDE` (drei Prozent der
   * Höhe, ein Drittel des Laufwertes).
   *
   * Dieselben acht Rasten wie beim Laufen, damit man nicht zwei Leitern
   * lernen muss — aber eben auf einen kleineren Grundwert, damit ×1 hier und
   * ×1 dort beide „ruhig" heißen und nicht dieselbe Strecke.
   */
  idleSquishScale: SquishScale;
  /**
   * **Wie oft** — der Faktor auf die Atemuhr (`squish.IDLE_PERIOD`, drei
   * Sekunden je Atemzug bei ×1).
   *
   * **Ab Werk ×1**, anders als beim Laufen: Dort ist ×0,5 die Vorgabe, weil
   * das Federn gegen das Watscheln anläuft. Der Atem läuft gegen nichts — er
   * hat seine eigene Uhr, und drei Sekunden sind schon der ruhige Wert.
   */
  idleSquishSpeed: SquishSpeed;
  /**
   * **Ob die Stöcke auf dem Glas liegen** — links der Stock zum Laufen, rechts
   * Zielstock und `A`/`B` (`index.html`, `#touch`).
   *
   * Drei Rasten und nicht zwei, weil sich die Frage auf zwei Arten falsch
   * beantworten lässt: Ein Telefon ohne Stöcke ist unbedienbar, ein
   * Schreibtisch mit Stöcken hat zwei Daumenflächen im Bild, die nie jemand
   * anfasst. **Automatisch** heißt deshalb: nur dort, wo ein Finger wirklich
   * das einzige Eingabegerät ist. Wer ein Gamepad am Tablet hängen hat, hält
   * schon einen echten Stock in der Hand und braucht keinen gemalten darüber;
   * wer am Schreibtisch trotzdem einen sehen will — zum Ausprobieren, für ein
   * Video —, stellt **an**.
   *
   * Gerechnet wird das nicht hier, sondern in `screenPads.ts`: Dort stehen
   * alle Eingaben beieinander, auch die, die keine Einstellung sind — die
   * Brille auf dem Kopf und die Welt, die ihre eigene Steuerung mitbringt.
   */
  screenPads: ScreenPads;
}

/**
 * **An / Aus / Automatisch** — die Rasten der Bildschirm-Steuerung.
 *
 * `auto` steht vorn, weil es die Voreinstellung ist und ein Druck auf die
 * Zeile von dort losgeht; danach kommt das, was man am ehesten will, wenn die
 * Automatik daneben lag.
 */
export type ScreenPads = 'auto' | 'on' | 'off';
export const SCREEN_PADS = ['auto', 'on', 'off'] as const;

export const SCREEN_PADS_LABELS: Readonly<Record<ScreenPads, string>> = {
  auto: 'Automatisch',
  on: 'An',
  off: 'Aus',
};

export const SCREEN_PADS_SUBS: Readonly<Record<ScreenPads, string>> = {
  auto: 'Nur am Handy — und dort nur, solange kein Gamepad angesteckt ist',
  on: 'Immer, auch am Schreibtisch',
  off: 'Nie · Tastatur, Maus oder Gamepad',
};

/**
 * **Die acht Rasten der Stärke**, als Vielfaches des gemessenen Ausschlags.
 * `1` ist der Wert, der in `core/squish.ts` steht.
 *
 * **Viertelschritte, und zwar überall dieselben.** Erst waren es fünf Rasten
 * mit einem Loch zwischen ×1 und ×1,5, und spätestens neben dem Atmen war
 * das nicht mehr zu halten: Vier Regler mit drei verschiedenen Leitern sind
 * vier Regler, die man einzeln lernen muss. Jetzt geht jeder von ihnen in
 * Vierteln von ×0,25 bis ×2 — acht Drücke im Kreis, und wer einen davon
 * kennt, kennt alle.
 */
export type SquishScale = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;
export const SQUISH_SCALES: readonly SquishScale[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * **Die Beschriftung einer Raste** — dieselbe Leiter für Stärke und Tempo,
 * beim Laufen wie im Stehen, deshalb genau eine Tabelle.
 */
export const SQUISH_SCALE_LABELS: Readonly<Record<SquishScale, string>> = {
  0.25: '×0,25',
  0.5: '×0,5',
  0.75: '×0,75',
  1: '×1',
  1.25: '×1,25',
  1.5: '×1,5',
  1.75: '×1,75',
  2: '×2',
};

export const SQUISH_SCALE_SUBS: Readonly<Record<SquishScale, string>> = {
  0.25: 'Gerade eben zu ahnen · zwei Zentimeter auf die ganze Figur',
  0.5: 'Kaum zu sehen · ein Hauch Leben in der Figur',
  0.75: 'Zurückhaltend · ein Stück unter dem gemessenen Wert',
  1: 'Der gemessene Wert · knapp ein Zehntel der Höhe',
  1.25: 'Eine Spur mehr · zu sehen, ohne aufzufallen',
  1.5: 'Deutlich · die Figur federt sichtbar bei jedem Schritt',
  1.75: 'Kräftig · einen Schritt vor dem Gummiball',
  2: 'Cartoon · ein Gummiball mit Kochmütze',
};

/**
 * **Die acht Rasten des Tempos** — der Faktor auf die Taktphase.
 *
 * Dieselbe Leiter wie bei der Stärke, und nach oben ist jetzt ×2 und nicht
 * mehr ×1 Schluss. Das ×1 als Decke war eine Vorsichtsmaßnahme aus der
 * ersten Fassung — ein Federn je Schritt war zu schnell, also sollte es
 * nichts Schnelleres geben. Wer einen Trickfilm will, darf jetzt trotzdem
 * darüber hinaus: Die Vorgabe bleibt ×0,5, und was darüber liegt, sucht sich
 * aus, wer hinsieht.
 */
export type SquishSpeed = SquishScale;
export const SQUISH_SPEEDS: readonly SquishSpeed[] = SQUISH_SCALES;

export const SQUISH_SPEED_LABELS: Readonly<Record<SquishSpeed, string>> = SQUISH_SCALE_LABELS;

export const SQUISH_SPEED_SUBS: Readonly<Record<SquishSpeed, string>> = {
  0.25: 'Ganz ruhig · ein Heben und Senken auf vier Schritte',
  0.5: 'Die Vorgabe · ein Federn auf zwei Schritte, ruhiger als der Schritt',
  0.75: 'Etwas flüssiger · ein Federn auf knapp anderthalb Schritte',
  1: 'Im Takt der Schritte · so schnell wie das Watscheln, und damit hektisch',
  1.25: 'Schneller als der Schritt · fünf Federn auf vier Schritte',
  1.5: 'Anderthalbfach · das Federn läuft dem Watscheln davon',
  1.75: 'Fast zweimal je Schritt · ein Flirren, und das mit Absicht',
  2: 'Zweimal je Schritt · Trickfilm mit aufgedrehtem Tempo',
};

/**
 * **Wie tief die Figur im Stehen atmet** — dieselben acht Rasten, nur mit
 * einem anderen Grundwert dahinter (`squish.IDLE_AMPLITUDE`, drei Prozent
 * statt neun). Bei ×2 ist das Atmen deshalb immer noch flacher als ein
 * Schritt bei ×1.
 */
export const IDLE_SQUISH_SCALE_SUBS: Readonly<Record<SquishScale, string>> = {
  0.25: 'Kaum ein Zittern · gut einen Zentimeter',
  0.5: 'Der Atem eines Schlafenden',
  0.75: 'Leise · ein Stück unter dem gemessenen Wert',
  1: 'Der gemessene Wert · knapp fünf Zentimeter, ruhiger Atem',
  1.25: 'Etwas tiefer · quer durch den Raum zu sehen',
  1.5: 'Tief · die Figur holt sichtbar Luft',
  1.75: 'Sehr tief · als käme sie gerade vom Laufen',
  2: 'Außer Atem · der Brustkorb geht wie ein Blasebalg',
};

/**
 * **Wie schnell sie das tut** — der Faktor auf die Atemuhr, und die zählt in
 * Sekunden (`squish.IDLE_PERIOD`, drei je Atemzug bei ×1). Deshalb stehen
 * hier Sekunden und keine Schritte: Ein Atemzug hat mit dem Gehtempo nichts
 * zu tun, und eine Figur, die im Stand die Luft anhält, war genau der
 * Fehler, den diese Uhr behebt.
 */
export const IDLE_SQUISH_SPEED_SUBS: Readonly<Record<SquishSpeed, string>> = {
  0.25: 'Ein Atemzug auf zwölf Sekunden · Tiefschlaf',
  0.5: 'Ein Atemzug auf sechs Sekunden · sehr ruhig',
  0.75: 'Ein Atemzug auf vier Sekunden · entspannt',
  1: 'Die Vorgabe · ein Atemzug auf drei Sekunden',
  1.25: 'Ein Atemzug auf gut zwei Sekunden · wach',
  1.5: 'Ein Atemzug auf zwei Sekunden · aufmerksam',
  1.75: 'Ein Atemzug auf knapp zwei Sekunden · angespannt',
  2: 'Ein Atemzug auf anderthalb Sekunden · außer Puste',
};

/** Die drei Rasten des Reglers, von scharf nach flüssig. */
export type XrScale = 1 | 0.85 | 0.7;
export const XR_SCALES: readonly XrScale[] = [1, 0.85, 0.7];

export const XR_SCALE_LABELS: Readonly<Record<XrScale, string>> = {
  1: 'Voll',
  0.85: 'Mittel',
  0.7: 'Flüssig',
};

export const XR_SCALE_SUBS: Readonly<Record<XrScale, string>> = {
  1: 'So groß, wie die Brille es vorschlägt · schärfstes Bild',
  0.85: 'Ein Viertel weniger Bildpunkte · kaum weicher, spürbar flüssiger',
  0.7: 'Die Hälfte der Bildpunkte · weicher, aber die Bildrate steht',
};

/** Was ausgeliefert wird: das Bild von vorher, ohne alles Neue. */
export const DEFAULT_GRAPHICS: GraphicsSettings = {
  mode: 'simple',
  xrScale: 1,
  showFps: false,
  gridLines: false,
  hitBoxes: false,
  showHandles: false,
  shadows: true,
  squish: false,
  squishScale: 1,
  squishSpeed: 0.5,
  idleSquish: false,
  idleSquishScale: 1,
  idleSquishSpeed: 1,
  screenPads: 'auto',
};

export const GRAPHICS_MODE_LABELS: Record<GraphicsMode, string> = {
  simple: 'Einfach',
  comic: 'Comic',
};

export const GRAPHICS_MODE_SUBS: Record<GraphicsMode, string> = {
  simple: 'Flache Farben ohne Konturen',
  comic: 'Schwarze Konturen und Licht in Stufen · zeichnet alles zweimal',
};

/**
 * Die Zahlen hinter einer Stufe.
 *
 * Eine Stufe ist im Menü ein Wort und im Renderer ein Dutzend Werte; dazwischen
 * steht dieses Objekt, damit weder das Menü noch der Renderer die Übersetzung
 * kennen muss — und damit sie sich testen lässt.
 */
export interface GraphicsProfile {
  /** Ob die hellste Sonne der Welt Schatten wirft. */
  shadows: boolean;
  /** Kantenlänge der Schattenkarte in Pixeln. */
  shadowMapSize: number;
  /**
   * Halbe Kantenlänge des Kastens, den die Schattenkarte abdeckt, in Metern.
   *
   * Eine einzelne Karte kann nicht die ganze Welt: 500 Meter Boden auf 2048
   * Pixel wären 25 Zentimeter pro Pixel, und ein Schatten mit 25 Zentimeter
   * Auflösung ist ein Fleck. Also deckt sie einen Kasten **um den Spieler**
   * herum ab und wandert mit ihm mit (`aimSun`).
   */
  shadowRange: number;
  /** Wie weit die Sonne für die Schattenrechnung hinter den Spieler rückt. */
  shadowDistance: number;
  /**
   * **Wie weich der Rand eines Schattens ist**, in Texeln der Schattenkarte
   * (`DirectionalLightShadow.radius`).
   *
   * Das Vorbild hat **keine** harten Kanten: In Overcooked liegt unter jeder
   * Figur ein weicher Fleck, und eine scharfe Silhouette auf dem Kachelboden
   * sähe daneben aus wie ein Aufkleber. Der Wert kostet nichts an Karte,
   * sondern nur ein paar Abtastungen beim Zeichnen.
   */
  shadowRadius: number;
  /**
   * Womit Hemisphären- und Umgebungslicht multipliziert werden.
   *
   * Der unscheinbarste Wert hier und der wichtigste: Ein Schatten ist nur so
   * dunkel, wie das Licht daneben hell ist, und diese Welten leuchten ihr
   * Grundlicht mit 1,5 aus. Auf voller Stärke war der schönste Schatten ein
   * Hauch — man sah ihn erst, wenn man das Grundlicht herunterdrehte.
   */
  ambientScale: number;
  /**
   * Womit die Brille ihren Bildpuffer multipliziert. Über 1 heißt: größer
   * rechnen als anzeigen, also weniger Treppen an den Kanten.
   */
  framebufferScale: number;
  /** 0 ist scharf bis zum Rand, 1 ist am billigsten (`XR.setFoveation`). */
  foveation: number;
  /**
   * In wie vielen Stufen das Licht liegt; 0 heißt: in keiner, also im Verlauf.
   *
   * Drei ist die Zahl, bei der man die Stufen sieht, ohne dass eine Wand zur
   * Schachbrettfläche wird: hell, halb, Schatten.
   */
  toonBands: number;
  /** Ob jedes Ding eine schwarze Kontur bekommt. */
  outlines: boolean;
  /**
   * Wie breit sie ist — als Anteil der **halben Bildhöhe**, nicht in Metern
   * und nicht in Pixeln.
   *
   * In Metern wäre sie an einer fernen Wand unsichtbar und an einer nahen
   * fingerdick; in Pixeln müsste jemand wissen, wie groß das Bild ist, und in
   * einer Brille weiß das niemand vorher. Ein Anteil der Bildhöhe ist auf
   * jedem Gerät derselbe Strich.
   */
  outlineWidth: number;
  /** Und wie breit sie in Metern höchstens werden darf. */
  outlineMaxGrow: number;
  /** Ihre Farbe. Nicht ganz schwarz — ein Hauch Blau steht der Nacht besser. */
  outlineColor: number;
}

/**
 * Der Bildaufbau zu einer Einstellung.
 *
 * **Einfach ist überall der Auslieferungszustand von three.js bzw. der Wert,
 * den `App` schon immer gesetzt hat** — die Stufe darf nichts kosten und nichts
 * verändern, sonst ist „wie bisher" gelogen.
 */
export function graphicsProfile(
  settings: Pick<GraphicsSettings, 'mode' | 'xrScale'> & Partial<Pick<GraphicsSettings, 'shadows'>>,
): GraphicsProfile {
  const comic = settings.mode === 'comic';
  // Ein alter gespeicherter Stand kennt das Feld nicht; ohne Angabe gilt die
  // Vorgabe und nicht „aus".
  const shadows = settings.shadows ?? DEFAULT_GRAPHICS.shadows;
  return {
    shadows,
    shadowMapSize: 2048,
    // **Sechzehn Meter um den Kopf**, also ein Kasten von zweiunddreißig.
    // Vierzehn waren es, solange es nur die Brille gab; von oben reicht der
    // Blick weiter. Weiter als das geht nicht ohne Preis: 2048 Pixel auf
    // vierzig Meter sind zwei Zentimeter je Texel, und daran verliert eine
    // Figur von 1,60 m ihren Schatten — das wurde gebaut und angesehen.
    shadowRange: 16,
    shadowDistance: 26,
    // Weich, aber nicht verwaschen: Bei 2,5 Texeln blieb von einem Tisch nur
    // noch ein Hauch übrig.
    shadowRadius: 1.5,
    // **Ein Schatten ist nur so dunkel, wie das Licht daneben hell ist**, und
    // diese Welten leuchten ihr Grundlicht mit 1,5 aus. Auf voller Stärke war
    // der schönste Schatten ein Hauch. Der Comic dämpft dabei etwas stärker:
    // Zwei Stufen brauchen Mitteltöne zwischen sich. Ohne Schatten bleibt
    // alles, wie es war — ein dunkleres Bild ohne Gegenleistung wäre ein
    // Rückschritt.
    ambientScale: shadows ? (comic ? 0.7 : 0.76) : comic ? 0.7 : 1,
    // Der Comic will ein schärferes Bild, der Regler ein flüssigeres — beides
    // multipliziert sich, damit „Flüssig" auch im Comic flüssig ist.
    framebufferScale: (comic ? 1.2 : 1) * settings.xrScale,
    // Eine Kontur von zwei Pixeln verträgt keine verwaschenen Bildränder.
    foveation: comic ? 0.3 : 1,
    toonBands: comic ? 3 : 0,
    outlines: comic,
    outlineWidth: 0.006,
    outlineMaxGrow: 0.05,
    outlineColor: 0x101319,
  };
}

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampGraphics(settings: Partial<GraphicsSettings> | undefined): GraphicsSettings {
  const raw = settings ?? {};
  // Ein gespeicherter Stand von gestern kann `fancy` sagen — die Stufe gibt es
  // nicht mehr, und aus etwas, das es nicht gibt, wird der Auslieferungszustand.
  const mode = GRAPHICS_MODES.includes(raw.mode as GraphicsMode)
    ? (raw.mode as GraphicsMode)
    : DEFAULT_GRAPHICS.mode;
  const xrScale = XR_SCALES.includes(raw.xrScale as XrScale)
    ? (raw.xrScale as XrScale)
    : DEFAULT_GRAPHICS.xrScale;
  const showFps = raw.showFps === true;
  const gridLines = raw.gridLines === true;
  const hitBoxes = raw.hitBoxes === true;
  const showHandles = raw.showHandles === true;
  // **Nicht `=== true`**, anders als die beiden darüber: Die Schatten sind ab
  // Werk **an**, und ein gespeicherter Stand von gestern kennt das Feld noch
  // gar nicht. Wer sie ausmacht, hat `false` gespeichert und bekommt `false`.
  const shadows = raw.shadows ?? DEFAULT_GRAPHICS.shadows;
  // Und hier wieder `=== true`: Die Stauchung ist ab Werk aus, ein alter
  // Speicher kennt sie nicht, und „kenne ich nicht" heißt dann auch aus.
  const squish = raw.squish === true;
  const squishScale = SQUISH_SCALES.includes(raw.squishScale as SquishScale)
    ? (raw.squishScale as SquishScale)
    : DEFAULT_GRAPHICS.squishScale;
  // Ein Stand von gestern kennt das Tempo noch nicht — und bekommt damit
  // genau das, was die Zeile beheben soll: das halbe.
  const squishSpeed = SQUISH_SPEEDS.includes(raw.squishSpeed as SquishSpeed)
    ? (raw.squishSpeed as SquishSpeed)
    : DEFAULT_GRAPHICS.squishSpeed;
  // Und das Atmen ist die jüngere der beiden Bewegungen: Ein Stand von
  // gestern kennt keines der drei Felder, und „kenne ich nicht" heißt auch
  // hier aus — wer die Seite nie geöffnet hat, bekommt keine atmende Figur
  // untergeschoben.
  const idleSquish = raw.idleSquish === true;
  const idleSquishScale = SQUISH_SCALES.includes(raw.idleSquishScale as SquishScale)
    ? (raw.idleSquishScale as SquishScale)
    : DEFAULT_GRAPHICS.idleSquishScale;
  const idleSquishSpeed = SQUISH_SPEEDS.includes(raw.idleSquishSpeed as SquishSpeed)
    ? (raw.idleSquishSpeed as SquishSpeed)
    : DEFAULT_GRAPHICS.idleSquishSpeed;
  // Aus demselben Grund kein `=== 'on'`: Ein Stand von gestern kennt die Raste
  // nicht, und „kenne ich nicht" heißt hier **automatisch** und nicht „aus" —
  // sonst stünde ein Telefon, das gestern noch Stöcke hatte, heute ohne da.
  const screenPads = SCREEN_PADS.includes(raw.screenPads as ScreenPads)
    ? (raw.screenPads as ScreenPads)
    : DEFAULT_GRAPHICS.screenPads;
  return {
    mode,
    xrScale,
    showFps,
    gridLines,
    hitBoxes,
    showHandles,
    shadows,
    squish,
    squishScale,
    squishSpeed,
    idleSquish,
    idleSquishScale,
    idleSquishSpeed,
    screenPads,
  };
}

/** Ein Druck auf die Zeile: die nächste Stufe, oben wieder von vorn. */
export function nextGraphicsMode(mode: GraphicsMode): GraphicsMode {
  const index = GRAPHICS_MODES.indexOf(mode);
  return GRAPHICS_MODES[(index + 1) % GRAPHICS_MODES.length]!;
}

/** Ein Druck auf den Regler: die nächste Raste, von scharf nach flüssig und wieder von vorn. */
export function nextXrScale(scale: XrScale): XrScale {
  const index = XR_SCALES.indexOf(scale);
  return XR_SCALES[(index + 1) % XR_SCALES.length]!;
}

/** Ein Druck auf den Faktor: die nächste Raste, oben wieder von vorn. */
export function nextSquishScale(scale: SquishScale): SquishScale {
  const index = SQUISH_SCALES.indexOf(scale);
  return SQUISH_SCALES[(index + 1) % SQUISH_SCALES.length]!;
}

/** Ein Druck auf das Tempo: die nächste Raste, oben wieder von vorn. */
export function nextSquishSpeed(speed: SquishSpeed): SquishSpeed {
  const index = SQUISH_SPEEDS.indexOf(speed);
  return SQUISH_SPEEDS[(index + 1) % SQUISH_SPEEDS.length]!;
}

/**
 * **Wie stark die Figur wirklich federt** — der Faktor, wenn der Schalter an
 * ist, und sonst glatt 0.
 *
 * Die eine Stelle, an der die beiden Einstellungen zu einer Zahl werden:
 * `AvatarBody` soll nicht wissen müssen, dass es zwei sind, und ein
 * ausgeschalteter Schalter mit Faktor ×2 muss dasselbe ergeben wie gar keine
 * Stauchung.
 */
export function squishAmount(
  settings: Partial<Pick<GraphicsSettings, 'squish' | 'squishScale'>>,
): number {
  return settings.squish ? (settings.squishScale ?? DEFAULT_GRAPHICS.squishScale) : 0;
}

/**
 * **Wie schnell die Figur federt** — der Faktor für `squish.squishPose`.
 *
 * Aus demselben Grund eine eigene kleine Funktion wie `squishAmount`: Ein
 * gespeicherter Stand, der das Feld noch nicht kennt, bekommt die Vorgabe und
 * nicht die 0 — und 0 hieße hier, dass die Figur in einer Haltung einfriert.
 */
export function squishTempo(settings: Partial<Pick<GraphicsSettings, 'squishSpeed'>>): number {
  return settings.squishSpeed ?? DEFAULT_GRAPHICS.squishSpeed;
}

/**
 * **Wie tief die Figur im Stehen atmet** — das Gegenstück zu `squishAmount`,
 * und aus demselben Grund eine eigene kleine Funktion: `AvatarBody` soll
 * nicht wissen müssen, dass hinter dem Atem ein Schalter und eine Raste
 * stehen.
 */
export function idleSquishAmount(
  settings: Partial<Pick<GraphicsSettings, 'idleSquish' | 'idleSquishScale'>>,
): number {
  return settings.idleSquish ? (settings.idleSquishScale ?? DEFAULT_GRAPHICS.idleSquishScale) : 0;
}

/** **Wie schnell sie atmet** — der Faktor auf `squish.IDLE_PERIOD`. */
export function idleSquishTempo(
  settings: Partial<Pick<GraphicsSettings, 'idleSquishSpeed'>>,
): number {
  return settings.idleSquishSpeed ?? DEFAULT_GRAPHICS.idleSquishSpeed;
}

/**
 * Wie die Zeile _Animationen_ unter ihrer Überschrift steht.
 *
 * Eine eigene Zeile und nicht ein Anhängsel der Grafik-Zeile: Unter der
 * Überschrift steht, was **auf dieser Seite** eingestellt ist, und wer die
 * Seite zumacht, will dort lesen, ob die Figur jetzt federt.
 */
export function animationSummary(
  settings: Partial<
    Pick<
      GraphicsSettings,
      | 'squish'
      | 'squishScale'
      | 'squishSpeed'
      | 'idleSquish'
      | 'idleSquishScale'
      | 'idleSquishSpeed'
    >
  >,
): string {
  // Beide Zahlen je Bewegung, auch die vorgegebene: Auf dieser Seite steht
  // je Bewegung ein Paar aus Stärke und Tempo, und wer von ihr zurückkommt,
  // will lesen, wie **beide** stehen. Und beide Bewegungen stehen
  // nebeneinander — seit es das Atmen gibt, ist „Squishy an" keine Antwort
  // mehr auf die Frage, was die Figur tut.
  const parts: string[] = [];
  if (settings.squish) {
    const scale = settings.squishScale ?? DEFAULT_GRAPHICS.squishScale;
    const speed = settings.squishSpeed ?? DEFAULT_GRAPHICS.squishSpeed;
    parts.push(`Laufen ${SQUISH_SCALE_LABELS[scale]} im Tempo ${SQUISH_SPEED_LABELS[speed]}`);
  }
  if (settings.idleSquish) {
    const scale = settings.idleSquishScale ?? DEFAULT_GRAPHICS.idleSquishScale;
    const speed = settings.idleSquishSpeed ?? DEFAULT_GRAPHICS.idleSquishSpeed;
    parts.push(`Atmen ${SQUISH_SCALE_LABELS[scale]} im Tempo ${SQUISH_SPEED_LABELS[speed]}`);
  }
  if (parts.length === 0) return 'Nichts Besonderes · die Figur läuft, wie sie immer lief';
  return parts.join(' · ');
}

/** Ein Druck auf die Zeile: automatisch → an → aus und wieder von vorn. */
export function nextScreenPads(pads: ScreenPads): ScreenPads {
  const index = SCREEN_PADS.indexOf(pads);
  return SCREEN_PADS[(index + 1) % SCREEN_PADS.length]!;
}

/**
 * Wie die Seite im Menü unter ihrer Überschrift steht.
 *
 * Genannt wird nur, was **vom Auslieferungszustand abweicht**: Eine Zeile, in
 * der „keine Gitterlinien" steht, sagt niemandem etwas — eine, in der
 * „Gitterlinien" steht, erklärt das Gitter auf dem Boden.
 */
export function graphicsSummary(
  settings: Pick<GraphicsSettings, 'mode' | 'xrScale'> &
    Partial<
      Pick<
        GraphicsSettings,
        | 'gridLines'
        | 'hitBoxes'
        | 'showHandles'
        | 'shadows'
        | 'squish'
        | 'squishScale'
        | 'idleSquish'
        | 'idleSquishScale'
        | 'screenPads'
      >
    >,
): string {
  const scale = settings.xrScale === 1 ? '' : ` · Brille ${XR_SCALE_LABELS[settings.xrScale]}`;
  const grid = settings.gridLines ? ' · Gitterlinien' : '';
  const boxes = settings.hitBoxes ? ' · Hitboxen' : '';
  const grips = settings.showHandles ? ' · Griffe' : '';
  // Genannt wird die Abweichung: „mit Schatten" sagt niemandem etwas, „ohne
  // Schatten" erklärt ein Bild, in dem alles zu schweben scheint.
  const shade = settings.shadows === false ? ' · ohne Schatten' : '';
  // Und ebenso: Genannt wird die Stauchung nur, wenn es sie gibt — samt
  // Faktor, denn zwischen ×0,5 und ×2 liegt der ganze Unterschied.
  const squishy = settings.squish
    ? ` · Squishy ${SQUISH_SCALE_LABELS[settings.squishScale ?? DEFAULT_GRAPHICS.squishScale]}`
    : '';
  // Und das Atmen daneben, nach derselben Regel: Eine Figur, die im Stand
  // nicht mehr stillsteht, erklärt sich mit einem Wort.
  const breath = settings.idleSquish
    ? ` · Atmen ${SQUISH_SCALE_LABELS[settings.idleSquishScale ?? DEFAULT_GRAPHICS.idleSquishScale]}`
    : '';
  // Und ebenso hier: Die Automatik ist der Normalfall und steht nicht in der
  // Zeile — wer sie überstimmt hat, soll aber lesen können, warum sein Handy
  // ohne Stöcke oder sein Schreibtisch mit welchen dasteht.
  const pads =
    settings.screenPads && settings.screenPads !== DEFAULT_GRAPHICS.screenPads
      ? ` · Bildschirm-Steuerung ${settings.screenPads === 'on' ? 'an' : 'aus'}`
      : '';
  return `${GRAPHICS_MODE_LABELS[settings.mode]}${scale}${grid}${boxes}${grips}${shade}${squishy}${breath}${pads}`;
}

// --- der Speicher ----------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

/** Läuft nach jeder Änderung — der Renderer hört hier zu, das Menü auch. */
export function onGraphicsChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function graphics(): GraphicsSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampGraphics(raw ? (JSON.parse(raw) as Partial<GraphicsSettings>) : {});
  } catch {
    return { ...DEFAULT_GRAPHICS };
  }
}

/** Speichert die Änderung und gibt zurück, was davon angekommen ist. */
export function saveGraphics(settings: Partial<GraphicsSettings>): GraphicsSettings {
  const next = clampGraphics({ ...graphics(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode; nothing we can do about it */
  }
  for (const listener of listeners) listener();
  return next;
}

/** Zurück auf das Bild von vorher. */
export function clearGraphics(): GraphicsSettings {
  return saveGraphics({ ...DEFAULT_GRAPHICS });
}
