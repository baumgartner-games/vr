import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import { PLAN_DOOR_H, PLAN_DOOR_W, PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  TILE,
  dirX,
  dirZ,
  keyX,
  keyZ,
  tileKey,
  type Dir,
} from '../nav/navTile';
import { FlashlightTool } from '../portal/tools';
import { playSlam, playSwitch } from '../../core/Audio';
import { pickHost } from '../../net/host';
import {
  generateHouse,
  onApron,
  roomAt,
  roomCentre,
  roomOf,
  tilesOf,
  DRONE_HOME,
  HOUSE,
  VAN_ID,
  type HouseDoor,
  type HouseRoom,
  type HouseSpec,
  type Rect,
} from './house';
import { housePlan } from './plan';
import {
  droneFov,
  lampAfter,
  routeLength,
  routeTo,
  stepAlong,
  tileAt,
  wrapAngle,
  DRONE_Y,
  HOP_TIME,
  LAMP_MIN,
  type DronePose,
  type DroneRoute,
  type DroneStatus,
} from './droneRoute';
import { flickerLevel, freshSpook, stepHaunt, type Spook } from './haunt';
import { fitView, homeView, pannedView, zoomedView, type ArchiveView } from './archiveView';
import { buildShip, buildCreature, animateCreature, roomAccent } from './shipArt';
import { ShipExperience } from './ShipExperience';
import {
  freshCrew,
  MONSTERS,
  ROOM_COUNTS,
  stationOptions,
  takeCrewHit,
  stepVitals,
  ventPairs,
  type StationOptions,
} from './mission';
import { rollSeed } from './rng';
import { StationUi } from './stationUi';
import { MOVE_TIME, seatOf, type Claim, type StationId } from './stations';
import {
  claimMessage,
  droneMessage,
  flipMessage,
  HAUNT_CHANNEL,
  HAUNT_ROOM,
  pickGameHost,
  readClaim,
  readDrone,
  readFlip,
  readState,
  stateMessage,
  type DroneState,
  type HauntState,
} from './net';
import type { GridPlan } from '../grid/gridPlan';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { PlanSolidKind } from '../grid/solids';
import type { Handedness } from '../../core/XRInput';
import type { Npc } from '../npc/Npc';

/**
 * **Haunting** — einer im Haus, die anderen im Van.
 *
 * Ein Spiel, in dem vier Leute dasselbe Haus kennen und keiner es in
 * derselben Sprache beschreiben kann. Der **Archivar** kennt Namen
 * („Bibliothek"), der **Späher** kennt Formen („L-förmig, zwei Türen"), der
 * **Drohnenpilot** kennt ein Zimmer *jetzt*, der **Hacker** kennt Schalter
 * ohne Ort — und der VR-Spieler kennt nur, was in seinem Lichtkegel steht,
 * ist dafür aber der Einzige mit Händen. Die Aufgabe ist simpel: drei Sachen
 * finden und in den Van bringen. Schwer ist sie, weil niemand dem anderen eine
 * Koordinate sagen kann.
 *
 * **Eine Quelle, viele Projektionen.** Über die Leitung geht der *Same* und
 * nicht das Haus (`house.ts`): Jedes Gerät baut denselben Grundriss selbst,
 * und deshalb ist die Drohnenkamera eine Kamera in der **eigenen** Kopie der
 * Welt und kein Videostrom. Was wirklich fließt, sind ein paar Dutzend Bytes
 * je Sekunde — Monsterposition, Türen, Licht, Aufgaben (`net.ts`).
 *
 * **Wer rechnet, ist der VR-Spieler** (`pickGameHost`). Die sonst übliche
 * Regel — wer am längsten in der Welt steht — würde hier einem Web-Spieler das
 * Monster geben, und wenn der den Laptop zuklappt, nimmt er die Runde mit. Im
 * Haus steht genau einer, und der geht so schnell nicht weg.
 *
 * **Das Monster ist ausgeschaltet, bis jemand es einschaltet.** Nicht aus
 * Vorsicht, sondern weil es die Rollen erst spielbar macht: Wer Archiv,
 * Späher, Drohne und Tafel einmal in Ruhe ausprobieren will, soll das können,
 * ohne dass ihm dabei jemand in den Nacken atmet. Der Schalter sitzt im
 * Handgelenkmenü und gehört dem, der die Brille aufhat — die Entscheidung, ob
 * es gruselig wird, trifft der, dem es passiert.
 */

/** Wie oft der Gastgeber den Stand verschickt, und jeder seinen Platz ansagt. */
const STATE_RATE = 1 / 4;
/** Und wie oft der Pilot seine Drohne ansagt. */
const DRONE_RATE = 1 / 10;

/**
 * Wie schnell sich der Rumpf bei den Zuschauern in den angesagten Winkel
 * dreht, als Anteil des Restes je Sekunde. Hoch genug, dass der Lichtkegel dem
 * Piloten folgt, statt hinterherzuschleifen; niedrig genug, dass die zehn
 * Ansagen je Sekunde nicht als zehn Stufen zu sehen sind.
 */
const DRONE_TURN = 14;

/**
 * Wie weit nach oben oder unten der Pilot schauen darf — 81°, fast senkrecht.
 *
 * Waagerecht dreht er **ganz** herum (der Anschlag bei gut zwei Dritteln einer
 * halben Umdrehung ist weg: Wer wissen will, ob ihm etwas folgt, muss sich
 * umdrehen können, und das Zurückstellen kostet einen Tipp auf den Blickstock).
 * Senkrecht bleibt ein Rest Anschlag, und zwar nicht aus Bequemlichkeit: Über
 * den Scheitel hinaus steht das Bild auf dem Kopf, und ein Lichtkegel, der
 * dabei nach hinten kippt, sagt dem VR-Spieler das Gegenteil von dem, was der
 * Pilot ansagt.
 */
const TILT_MOST = Math.PI * 0.45;

/**
 * Wie fein das Bild hinter der offenen Bedienung noch ist: ein Bildpunkt je
 * zehn CSS-Punkte. Als **Anteil** und nicht als Kachelgröße, weil die Leinwand
 * damit auf jedem Gerät dieselben Klötzchen zeigt — auf einem Telefon mit
 * dreifacher Dichte wären feste Bildpunkte drittel so groß.
 */
const VEIL_RATIO = 0.1;

/**
 * **Wie tief das Blatt des Archivars aufgeschnitten wird.**
 *
 * Knapp **unter dem Türsturz** und nicht knapp unter der Decke. Über jeder Tür
 * steht ein Sturz von der Türhöhe bis an die Decke (`levelBuild.doorParts`) —
 * eine Wandscheibe, die von oben aussieht wie Wand. Wer nur die Decke abnimmt,
 * legt ein Haus frei, in dem jede Tür zugemauert ist; genau das war der Grund,
 * aus dem der Archivar seine Türen nicht fand. Ein Fingerbreit tiefer, und aus
 * jeder Tür wird die Lücke, die sie ist.
 */
const PAPER_CUT = PLAN_DOOR_H - 0.05;

/**
 * Auf welcher Höhe die Türzeichen liegen: knapp unter dem Schnitt, und damit
 * über den Flächen, die das Blatt freiräumen (`maskAround`) — ein Zeichen,
 * das unter der Maske liegt, ist keines.
 */
const PAPER_MARK_Y = PAPER_CUT - 0.01;

/**
 * Womit auf dem Blatt gezeichnet wird — **hell**, denn Sepia frisst die Farbe
 * und lässt nur die Helligkeit übrig. Wände und Türbögen kommen aus derselben
 * Dose: Was gezeichnet ist, gehört zusammen.
 */
const PAPER_INK = 0xf6e6c4;

/**
 * Und der eine dunkle Strich: **das Blatt einer geschlossenen Tür.**
 *
 * Eine zugestellte Lücke in derselben hellen Farbe wäre schlicht Wand — man
 * müsste die Bögen zählen, um zu merken, dass dort eine Tür ist. Dunkel in
 * einer hellen Wand ist dagegen genau das, was es sein soll: etwas, das den
 * Durchgang zumacht.
 */
const PAPER_SHUT = 0x1b1610;

/**
 * **Wie schräg der Fernseher auf das Haus schaut**, in Bogenmaß.
 *
 * Zehn Grad neben dem Lot. Senkrecht von oben ist ein Grundriss — man sieht,
 * wo etwas steht, aber nicht, dass es steht; ein Bett und ein Teppich sind
 * dann derselbe Fleck. Die zehn Grad geben jedem Möbel eine Flanke und jeder
 * Wand eine Höhe, ohne dass die Wände sich gegenseitig verdecken. Weiter
 * geschrägt fängt die Südwand an, das halbe Haus zuzudecken.
 */
const SHOW_PITCH = (Math.PI / 180) * 80;

/** Der Öffnungswinkel dazu — eng genug, dass das Haus nicht gestaucht wirkt. */
const SHOW_FOV = 42;

/**
 * **Und wo ihm die Decke abgenommen wird.**
 *
 * Dieselbe Antwort wie in der Vorschau des Werkzeugkastens (`tools/worldCut.ts`):
 * eine Handbreit unter der Decke, damit Wände Wände bleiben und der Deckel
 * weg ist. Gemacht wird es hier mit einer Schnittebene und nicht mit der
 * vorderen Kappe der Kamera — die steht schräg im Raum, und ein schräger
 * Schnitt ließe hinten die halbe Decke stehen.
 */
const SHOW_CUT = PLAN_WALL_H - 0.4;

/** Der Himmel über dem Zuschauer: heller Tag, nicht die Nacht der anderen. */
const SHOW_SKY = 0x9dc0e4;

/** Wie nah man an eine Sache heran muss, um sie mitzunehmen. */

/** Wie hell eine brennende Zimmerlampe ist, wenn niemand an ihr rüttelt. */
const LAMP_ON = 22;

/** Die Lampe eines Zimmers: das Licht und das Glas, das zeigt, dass es an ist. */
interface Lamp {
  at: THREE.Vector3;
  color: number;
  glass: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
}

const _lampOff = new THREE.Color(0x2b3040);
const _lampOn = new THREE.Color(0xfff0cf);
const _head = new THREE.Vector3();
const _feet = new THREE.Vector3();
const _size = new THREE.Vector2();
/** Die Schnittebene, die dem Zuschauer die Decke abnimmt — einmal gebaut. */
const _lid = new THREE.Plane(new THREE.Vector3(0, -1, 0), SHOW_CUT);
const _noLid: THREE.Plane[] = [];
const _lidOn = [_lid];

export class HauntingWorld extends GridWorld {
  /** Der Bauplan dieser Runde. Steht vor dem ersten `layout()` fest. */
  private spec: HouseSpec = generateHouse(rollSeed(), 8);
  private state: HauntState = freshState(this.spec.seed);

  /** Alles, was zum Haus gehört und nicht aus dem Kachelplan kommt. */
  private readonly stage = new THREE.Group();
  /** Und alles, was sich bewegt — für die Sichten, die das nicht sehen dürfen. */
  private readonly live = new THREE.Group();
  /**
   * Der Van steht in einer eigenen Gruppe, weil er ein neues Haus **überlebt**:
   * `buildHouse` räumt seine Gruppe leer, und ein Van, der beim zweiten
   * Grundriss verschwindet, ist ein Spielabbruch mit Ansage.
   */
  private readonly vanRig = new THREE.Group();

  private readonly lamps = new Map<string, Lamp>();
  private experience: ShipExperience | null = null;
  private mountedRole = '';
  private flatTechnician = false;
  private readonly technicians = new Map<string, number>();
  private lampPool: THREE.PointLight[] = [];
  private testLight: THREE.AmbientLight | null = null;
  private monsterArt: THREE.Object3D | null = null;
  private previousFeet: THREE.Vector3 | null = null;
  private ventClock = 0;
  private ventExit: THREE.Vector3 | null = null;
  private readonly ventGoal = new THREE.Vector3();

  /** Das Monster, solange es eines gibt — nur beim Gastgeber ein echter NPC. */
  private monster: Npc | null = null;
  /**
   * **Was das Monster gerade anstellt** (`haunt.ts`).
   *
   * Die Zustandsmaschine läuft bei **allen** und nicht nur beim Gastgeber:
   * Aus ihr kommt das Flackern der Lampe, und das soll jeder sehen, ohne dass
   * es jemand ansagt. Angewendet — Licht aus, Tür zu — wird trotzdem nur beim
   * Gastgeber; bei allen anderen fällt das Ergebnis auf den Boden, und der
   * Stand kommt eine Viertelsekunde später ohnehin über die Leitung.
   */
  private spook: Spook = freshSpook();
  /** Bei allen anderen nur ein Klotz an der angesagten Stelle. */
  private blob: THREE.Object3D | null = null;

  /**
   * **Das Licht, unter dem der Archivar liest.**
   *
   * Sein Blatt darf nicht davon abhängen, ob im Haus jemand die Lampe
   * angemacht hat: Eine Akte ist eine Bauzeichnung und kein Kamerabild. Zwei
   * Lichter also, die immer in der Szene stehen und auf null gedreht sind —
   * hochgedreht wird nur für diesen einen Zeichendurchgang. Auf null gedreht
   * statt herausgenommen, weil three.js jeden Shader neu baut, sobald sich die
   * **Zahl** der Lichter ändert; ihre Stärke kostet nichts.
   */
  private paperLight: THREE.AmbientLight | null = null;
  private paperSun: THREE.DirectionalLight | null = null;
  /**
   * **Und das Tageslicht, unter dem der Fernseher läuft.**
   *
   * Dieselbe Bauart, anderer Zweck: Der Zuschauer sitzt nicht im Spiel,
   * sondern davor. Ein Fernseher, auf dem vier Leute im Dunkeln stochern, ist
   * für den Zuschauer ein schwarzes Bild — und der Grusel gehört ohnehin
   * denen, die drinstecken. Also heller Tag, und die Nacht bleibt im Haus.
   */
  private showLight: THREE.AmbientLight | null = null;
  private showSun: THREE.DirectionalLight | null = null;
  /** Die Kamera über dem ganzen Haus, zehn Grad neben dem Lot. */
  private showCam: THREE.PerspectiveCamera | null = null;
  /** Ob der Welt gerade die Decke abgenommen ist — nur für den Zuschauer. */
  private lidOff = false;
  /**
   * **Was neben dem aufgeschlagenen Zimmer liegt, gehört nicht aufs Blatt.**
   *
   * Vier dunkle Flächen, die alles außerhalb des Zimmerrechtecks zudecken —
   * die Akte des Archivars ist eine Seite je Zimmer und keine Karte. Ohne sie
   * sieht er den ganzen Hausausschnitt, kann die Zimmer nebeneinanderlegen und
   * hat damit genau die Übersicht, die er sich eigentlich erst erarbeiten
   * soll. Das ist keine Kosmetik: Es ist die Regel, an der seine Rolle hängt.
   */
  private readonly paperMask = new THREE.Group();
  /**
   * **Die Türzeichen auf dem Blatt** — je Tür eines, und zwei Sorten.
   *
   * Ein Grundriss zeichnet Türen, er fotografiert sie nicht: eine offene als
   * Schwelle mit dem Bogen, den das Blatt schlägt, eine geschlossene als
   * ausgefüllte Lücke. Ohne die Zeichen bleibt von einer Tür auch nach dem
   * tieferen Schnitt nur ein Stück dunkler Boden zwischen zwei Wandstücken —
   * auf einem Telefon, durch einen Sepiafilter, in einem braunen Zimmer.
   *
   * Sie hängen im Blatt und nicht in der Welt: Der VR-Spieler sieht echte
   * Türen und braucht keine Symbole, und ein Kreidestrich, der im Haus
   * herumschwebt, wäre ein Fehler mit Ansage.
   */
  private readonly paperDoors = new THREE.Group();
  /** Die Wandlinien je Zimmer — sichtbar ist immer nur das aufgeschlagene. */
  private readonly roomWalls = new Map<string, THREE.Object3D>();
  /** Welches Zeichen zu welcher Tür gehört — offen und zu, fertig gebaut. */
  private readonly doorMarks = new Map<
    string,
    { open: THREE.Object3D; shut: THREE.Object3D; arc: THREE.Object3D }
  >();
  /** Der Papierton liegt auf der Leinwand und nicht in der Szene. */
  private tinted = false;
  /** Und ob das Bild gerade grob gerastert hinter der Bedienung liegt. */
  private veiled = false;

  private droneBody: THREE.Object3D | null = null;
  /**
   * **Die Wiege, in der Kamera, Kuppel und Scheinwerfer hängen.**
   *
   * Sie kippt nach oben und unten; nach links und rechts dreht sich der ganze
   * Rumpf. Getrennt, weil ein Kopter, der sich zum Hochschauen selbst auf den
   * Rücken legt, für den VR-Spieler nach Absturz aussieht — und seine
   * Positionslampe mit auf den Kopf stellt.
   */
  private droneHead: THREE.Object3D | null = null;
  private droneCam: THREE.PerspectiveCamera | null = null;
  /** Der Scheinwerfer, den der Pilot schaltet — und den alle sehen. */
  private droneLamp: THREE.SpotLight | null = null;
  /** Die Kuppel darüber: dass sie leuchtet, sieht man auch von hinten. */
  private droneGlass: THREE.MeshBasicMaterial | null = null;
  private topCam: THREE.OrthographicCamera | null = null;
  private drone: DroneState = {
    x: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    target: '',
    hop: 0,
    lamp: 1,
    // **Sie fängt mit brennendem Scheinwerfer an**, und das ist keine
    // Bequemlichkeit: Sie steht am Van, dort zehrt der Kegel nichts, und ohne
    // ihn schaut der Pilot in seinem ersten Bild in eine schwarze Nacht und
    // hält das Gerät für kaputt. Was er stattdessen sieht, ist die Hauswand
    // mit der Tür darin — und nebenbei, wozu der Knopf oben rechts gut ist.
    light: true,
  };
  /**
   * **Wohin der Pilot schaut, wenn er nicht geradeaus schaut.**
   *
   * Ein Winkel neben der Flugrichtung, kein zweiter Kurs: Die Drohne fliegt
   * ihre Bahn weiter, sie **dreht sich nur darauf**. Andersherum wäre das
   * Wischen eine zweite Steuerung, die gegen die Wegsuche arbeitet — und die
   * eine Regel, an der hier alles hängt („sie fliegt keine Luftlinie"), wäre
   * durch eine Fingerbewegung ausgehebelt.
   *
   * **Gedreht wird der Rumpf und nicht die Kamera.** Vorher saß der Winkel an
   * der Kamera allein, und das war eine Bildeinstellung: Der Pilot sah zur
   * Seite, der Scheinwerfer leuchtete weiter geradeaus, und im Haus stand eine
   * Drohne, die stur in eine Richtung starrte, während ihr Pilot etwas ganz
   * anderes ansagte. Der Kegel ist das Einzige, was der Pilot dem VR-Spieler
   * wirklich geben kann — er muss dorthin zeigen, wo der Pilot hinsieht.
   */
  private droneLook = 0;
  /**
   * **Und wie weit der Kopf dabei nach oben oder unten sieht** — positiv nach
   * oben.
   *
   * Ein Zimmer hat nicht nur Ecken, sondern auch eine Decke und einen Boden:
   * Was unter dem Tisch liegt und was über der Tür hängt, findet niemand, der
   * nur waagerecht schwenken kann. Begrenzt bleibt es trotzdem — eine Drohne,
   * die senkrecht nach oben starrt, weiß nicht mehr, wo vorn ist, und der
   * VR-Spieler sähe einen Lichtkegel, der ihm nichts mehr sagt.
   */
  private dronePitch = 0;
  /** Wo sie steht und wohin sie schaut — die Bahn rechnet `droneRoute.ts`. */
  private dronePose: DronePose = { x: 0, z: 0, yaw: 0 };
  /** Der Weg, den sie gerade abfliegt, und wie oft er neu gesucht wird. */
  private droneRoute: DroneRoute = { tiles: [], complete: true, grounded: true };
  private droneThink = 0;
  /** Ob ich sie gerade selbst fliege — der Wechsel darauf ist die Übergabe. */
  private piloting = false;
  /** Woran erkannt wird, dass der Scheinwerfer wirklich umgelegt wurde. */
  private droneLit = false;
  /** Die Zimmer, in denen sie schon war — das Einzige, was der Pilot behält. */
  private readonly droneSeen = new Set<string>();
  /**
   * **Wie der Archivar sein Blatt gerade hält** (`archiveView.ts`).
   *
   * Eingepasst ist immer das ganze Zimmer; hier steht nur, wie weit er darüber
   * hinaus herangegangen ist und wohin er geschoben hat. Ein *relativer*
   * Ausschnitt und keine zweite Kamera: Wer ein anderes Zimmer aufschlägt,
   * bekommt wieder das ganze — und die Rechnung dahin ist dieselbe geblieben.
   */
  private archive: ArchiveView = homeView();
  /**
   * Die halben Kanten des Blattes und des Bildes, in Metern.
   *
   * Sie fallen beim Zielen der Kamera an (`aimArchive`) und hängen an Zimmer
   * *und* Bildform: Ein gedrehtes Telefon ist ein anderes Blatt. Drei Zahlen
   * und nicht zwei, weil oben ein Streifen des Bildes hinter der Kopfzeile
   * liegt: `half` und `sheet` sind das **Blatt**, an dem die Verschiebung
   * endet, `tall` ist das ganze **Bild** — und ein Wisch über das Bild rechnet
   * mit dem Bild, sonst folgt das Blatt dem Finger nicht.
   */
  private archiveFit = { half: 5, sheet: 5, tall: 5 };

  private ui: StationUi | null = null;
  /**
   * Wer wo sitzt — und **wann das hier ankam**.
   *
   * Angesagt wird eine Dauer, und eine Dauer altert: Wer sie so stehen lässt,
   * wie sie ankam, hält jeden für jünger, als er ist — besonders den, dessen
   * Tab im Hintergrund liegt und deshalb seltener etwas schickt. Dieselbe
   * Rechnung wie `NetSession.seniorityOf`, aus demselben Grund.
   */
  private readonly claims = new Map<string, Claim & { heardAt: number }>();
  /** An welches Gerät ich gerade gehe, und seit wann ich dort sitze. */
  private wanted: StationId | null = null;
  /**
   * **Seit wann**, nicht **wie lange**.
   *
   * Aufsummierte Bildzeiten wären hier falsch, und man sieht es erst mit zwei
   * Geräten: Ein Browser-Tab im Hintergrund bekommt kaum noch Bilder, seine
   * Dauer wächst also langsamer als die des Tabs, den gerade jemand ansieht —
   * und dann gewinnt beim Streit um ein Gerät nicht der, der zuerst da war,
   * sondern der, dessen Fenster oben liegt. Die Uhr läuft überall gleich.
   */
  private seatedAt = clock();
  private hostId = '';
  private sendTimer = 0;
  private droneTimer = 0;
  /**
   * Woran erkannt wird, dass sich an den Türen etwas geändert hat — und das
   * Fragezeichen heißt „noch nie gebaut". Es unterscheidet den ersten Aufbau
   * von einer Tür, die zufällt: Nur die zweite macht ein Geräusch.
   */
  private builtDoors = '?';

  // --- die Welt ------------------------------------------------------------

  protected override layout(): GridPlan {
    return housePlan(this.spec, new Set(this.state.shut), this.state.crew.options.test);
  }

  protected override worldId(): string {
    return 'haunting';
  }

  protected override editorTitle(): string {
    return 'Haunting / Orbital';
  }

  /**
   * **Draußen ist Abend, nicht Nacht.**
   *
   * Der Himmel ist das Einzige an dieser Welt, das nichts kostet und trotzdem
   * überall ankommt: Er steht hinter dem Haus, wenn man davorsteht, und er ist
   * das, was in einem Fenster oder in der offenen Haustür steht, wenn man
   * drinnen davor steht. Genau deshalb ist er ein Dämmerungsblau und kein
   * Schwarz — eine schwarze Scheibe in einer schwarzen Wand ist kein Fenster.
   */
  protected override skyColor(): number {
    return 0x020711;
  }

  /** Fast nichts — aber nicht *ganz* nichts: die eigenen Hände muss man sehen. */
  protected override lightIntensity(): number {
    return 0.11;
  }

  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x3a4b58, wall: 0x728590, wood: 0x4c6370, door: 0x536d7b };
  }

  protected override batchGridGeometry(): boolean {
    return true;
  }

  protected override gridDoorVisible(): boolean {
    return false;
  }

  /** Eine Hand bleibt frei — in diesem Haus will man eine Lampe halten. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override welcome(): string {
    return 'HAUNTING / ORBITAL · Sichere Einsatzzentrale. Mission oder Test am Terminal wählen. Archiv + Einsatzkontrolle auf zwei Handys.';
  }

  /** Man fängt **draußen** an, am Van, mit dem Haus vor sich. */
  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, (HOUSE.z + HOUSE.d + 1.6) * TILE);
  }

  /**
   * **Wohin ein Verfolger läuft.**
   *
   * Nicht immer zum Spieler: Läuft irgendwo ein Radio, geht er dorthin. Das
   * ist der einzige Hebel, den der Hacker auf das Monster hat — und der
   * Grund, warum ein Schalter mit der Aufschrift `X` etwas wert sein kann.
   */
  protected override npcTarget(target: THREE.Vector3): THREE.Vector3 | null {
    if (this.state.phase !== 'running' || this.state.crew.options.test || this.state.crew.hp === 0)
      return null;
    if (this.ventExit) return null;
    if (
      this.monster &&
      this.ventClock > (MONSTERS.find((m) => m.id === this.state.crew.options.monster)?.vent ?? 28)
    ) {
      const at = this.monster.feet(_feet);
      const current = roomAt(this.spec, Math.floor(at.x / TILE), Math.floor(at.z / TILE));
      const vent =
        current && ventPairs(this.spec).find((v) => v.a === current.id || v.b === current.id);
      if (vent) {
        const sign = vent.a === current?.id ? -1 : 1;
        return target.set(
          vent.x * TILE + (vent.dir === 1 ? (sign * TILE) / 2 : 0),
          0,
          vent.z * TILE + (vent.dir === 2 ? (sign * TILE) / 2 : 0),
        );
      }
    }
    if (this.state.crew.hidden) {
      const rooms = this.spec.rooms.filter((r) => r.id !== this.state.crew.hidden);
      const roam = roomCentre(rooms[Math.floor(this.state.time / 6) % rooms.length]!);
      return target.set((roam.x + 0.5) * TILE, 0, (roam.z + 0.5) * TILE);
    }
    const room = this.state.loud[0];
    if (room) {
      const found = roomOf(this.spec, room);
      if (found) {
        const at = roomCentre(found);
        return target.set((at.x + 0.5) * TILE, 0, (at.z + 0.5) * TILE);
      }
    }
    const wish = super.npcTarget(target);
    if (!wish) return null;
    const tile = tileAt(wish.x, wish.z);
    if (roomAt(this.spec, keyX(tile), keyZ(tile))) return wish;
    // **Draußen geht es nicht hinterher.** Seit die Drohne einen Hangar hat,
    // gehört der Vorplatz zum Gitter — und ohne diese Zeile liefe das Monster
    // dem Spieler bis an den Van nach. Der Van ist die Stelle, an der abgelegt
    // wird; was dort steht, macht aus einer Runde eine Belagerung. Es wartet
    // stattdessen hinter der Haustür, und das ist gruseliger als beides.
    const entry = roomOf(this.spec, this.spec.entryRoom) ?? this.spec.rooms[0];
    if (!entry) return wish;
    const at = roomCentre(entry);
    return target.set((at.x + 0.5) * TILE, 0, (at.z + 0.5) * TILE);
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.roof = PLAN_WALL_H;
    this.root.add(this.stage);
    this.root.add(this.live);
    this.root.add(this.vanRig);
    this.buildHouse();
    this.buildVan();
    this.buildDrone();
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // Der Nebel hat die Farbe des Himmels und nicht die der Nacht: Was in ihm
    // verschwindet, soll in die Dämmerung verschwinden und nicht in ein Loch.
    // Etwas dünner als vorher, damit vom Van aus überhaupt ein Haus zu sehen
    // ist — drinnen ändert das nichts, dort ist auf zwölf Meter ohnehin eine
    // Wand.
    ctx.scene.fog = new THREE.FogExp2(0x07131e, 0.016);
    ctx.net.on(HAUNT_CHANNEL, (data, from) => this.receive(data, from));
    this.joinTable(ctx);

    this.setupRole(ctx);
    this.applyLights();
  }

  private setupRole(ctx: WorldContext): void {
    this.mountedRole = ctx.role;
    this.ui?.dispose();
    this.ui = null;
    this.wanted = null;
    this.claims.delete(ctx.net.localId);
    if (ctx.role === 'vr') {
      // Nur in der Brille schwebt eine eingeschaltete Taschenlampe im Van —
      // man muss sie im Dunkeln ja finden können.
      const torch = this.placeTool(
        'flashlight',
        new THREE.Vector3(0.6, 1.1, (HOUSE.z + HOUSE.d + 1.4) * TILE),
        undefined,
        true,
      );
      if (torch instanceof FlashlightTool) torch.setLit(true);
    } else {
      this.buildStationViews();
      this.ui = new StationUi({
        spec: () => this.spec,
        state: () => this.state,
        drone: () => this.drone,
        claims: () => this.currentClaims(),
        me: () => ctx.net.localId,
        technician: () => {
          this.flatTechnician = true;
        },
        link: () => ({
          peers: [...ctx.net.peers.values()].filter((p) => p.world === 'haunting').length,
          vr: [...ctx.net.peers.values()].some(
            (p) =>
              p.world === 'haunting' &&
              (p.role === 'vr' || clock() - (this.technicians.get(p.id) ?? -Infinity) < 3000),
          ),
          room: ctx.net.room,
        }),
        nameOf: (peer) => ctx.net.peers.get(peer)?.name ?? 'jemand',
        seat: () => seatOf(this.currentClaims(), ctx.net.localId),
        wanted: () => this.wanted,
        arriving: () => Math.max(0, MOVE_TIME - this.seated),
        sit: (station) => this.sit(station),
        flip: (id, on) => this.flip(id, on),
        flyTo: (roomId) => this.setDroneTarget(roomId),
        droneStatus: () => this.droneStatus(),
        droneSeen: () => this.droneSeen,
        droneLight: () => this.toggleDroneLight(),
        droneLook: () => this.droneLook,
        dronePitch: () => this.dronePitch,
        droneTurn: (radians) => this.turnDroneView(this.droneLook + radians, this.dronePitch),
        droneTilt: (radians) => this.turnDroneView(this.droneLook, this.dronePitch + radians),
        droneFace: () => this.turnDroneView(0, 0),
        archiveView: () => this.archive,
        archiveZoom: (factor) => this.zoomArchive(factor),
        archivePan: (dx, dz) => this.panArchive(dx, dz),
        archiveHome: () => {
          this.archive = homeView();
        },
      });
    }
    this.applyLights();
  }

  override dispose(ctx: WorldContext): void {
    ctx.net.off(HAUNT_CHANNEL);
    ctx.scene.fog = null;
    // Die Leinwand gehört der ganzen Seite und nicht dieser Welt: Was hier an
    // ihr verstellt wurde, geht hier auch wieder ab.
    this.veilView(false);
    this.paperTint(false);
    // Die Schnittebene gehört dem Renderer und nicht dieser Welt: Wer sie
    // stehen ließe, schnitte der nächsten Welt die Decke ab.
    this.liftLid(false);
    this.ui?.dispose();
    this.ui = null;
    this.experience?.dispose();
    this.experience = null;
    dispose(this.stage);
    dispose(this.live);
    dispose(this.vanRig);
    dispose(this.paperMask);
    dispose(this.paperDoors);
    this.doorMarks.clear();
    this.roomWalls.clear();
    this.lamps.clear();
    this.monster = null;
    this.blob = null;
    this.droneBody = null;
    this.droneHead = null;
    this.droneCam = null;
    this.droneLamp = null;
    this.droneGlass = null;
    this.topCam = null;
    this.paperLight = null;
    this.paperSun = null;
    this.paperTint(false);
    super.dispose(ctx);
  }

  // --- was gebaut wird ------------------------------------------------------

  /** Lampen, Merkmale, Aufgaben und der Sicherungskasten — alles aus dem Plan. */
  private buildHouse(): void {
    this.experience?.dispose();
    this.experience = null;
    dispose(this.stage);
    this.lamps.clear();
    this.stage.add(buildShip(this.spec));
    this.lampPool = Array.from({ length: 4 }, () => {
      const light = new THREE.PointLight(0xcce8e6, 0, 9, 2);
      this.stage.add(light);
      return light;
    });
    this.testLight = new THREE.AmbientLight(0xd5e9f3, 0);
    this.stage.add(this.testLight);
    for (const room of this.spec.rooms) this.buildLamp(room.id, roomCentre(room));
    if (this.context) this.mountExperience(this.context);
    if (this.ui) this.buildDoorMarks();
  }

  private mountExperience(ctx: WorldContext): void {
    this.experience?.dispose();
    this.experience = new ShipExperience({
      ctx,
      spec: () => this.spec,
      state: () => this.state,
      say: (text) => this.announce(text),
      configure: (options) => this.configureStation(options),
      start: () => this.startMission(),
      test: () => this.testMission(),
      door: (id) => this.manualDoor(id),
      travel: (at) => this.movePlayerTo(ctx, at),
      route: (from, room) => {
        const c = roomCentre(room);
        return this.grid ? routeTo(this.grid.graph, from, tileKey(c.x, c.z, 0)) : null;
      },
    });
    this.stage.add(this.experience.root);
  }

  private buildLamp(roomId: string, at: { x: number; z: number }): void {
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 12),
      new THREE.MeshBasicMaterial({ color: 0x2b3040, toneMapped: false }),
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set((at.x + 0.5) * TILE, PLAN_WALL_H - 0.14, (at.z + 0.5) * TILE);
    this.stage.add(glass);
    this.lamps.set(roomId, {
      glass,
      at: glass.position.clone(),
      color: roomAccent(roomOf(this.spec, roomId)?.kind ?? ''),
    });
  }

  /** Der Van vor der Haustür: der Ablagetisch und die Monitore. */
  private buildVan(): void {
    const z = (HOUSE.z + HOUSE.d + 1.2) * TILE;
    const metal = new THREE.MeshStandardMaterial({
      color: 0x39414f,
      roughness: 0.5,
      metalness: 0.4,
    });

    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.1), metal);
    table.position.set(0, 0.85, z);
    this.vanRig.add(table);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), metal);
      leg.position.set(side * 1.05, 0.42, z);
      this.vanRig.add(leg);
    }

    // Ein Monitor je Station. Sie zeigen (noch) nicht, was die Stationen sehen
    // — aber sie sagen, wer gerade an welchem Gerät sitzt, und das ist die
    // Auskunft, für die der VR-Spieler den Weg zurückgeht. Der fünfte ist der
    // Fernseher: kein Gerät, sondern das Fenster für die, die zusehen.
    const colors = [0x4aa8ff, 0xff6b6b, 0x5ee0a0, 0xffc857, 0xb98cff];
    const step = 0.55;
    colors.forEach((color, index) => {
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.46, 0.32),
        new THREE.MeshBasicMaterial({ color, toneMapped: false, opacity: 0.55, transparent: true }),
      );
      screen.position.set((index - (colors.length - 1) / 2) * step, 1.4, z - 0.5);
      this.vanRig.add(screen);

      // **Und ein Platz davor, in derselben Farbe.** Vier Leute sitzen an
      // diesem Tisch, und der VR-Spieler sieht von ihnen nichts als vier
      // Monitore — ein Hocker je Gerät macht aus der Ansage „ich hab den
      // grünen" eine Stelle im Raum, an der jemand sitzt. Sie stehen hinter
      // dem Tisch, also südlich davon: Wer die Brille aufsetzt, steht
      // zwischen ihnen und dem Haus und läuft nicht durch sie hindurch.
      const stool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.08, 14),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          emissive: color,
          emissiveIntensity: 0.25,
        }),
      );
      stool.position.set(-0.9 + index * 0.6, 0.52, z + 1.6);
      this.vanRig.add(stool);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), metal);
      post.position.set(-0.9 + index * 0.6, 0.24, z + 1.6);
      this.vanRig.add(post);
    });

    this.buildPad();
    this.buildDusk();
  }

  /**
   * **Der Hangar der Drohne** — ein Ring auf dem Vorplatz, dort, wo sie steht.
   *
   * Ohne ihn ist `DRONE_HOME` eine Zahl in einer Datei: Die Drohne schwebt
   * über einer Stelle, die genauso aussieht wie jede andere, und „zurück zum
   * Van" heißt für den, der im Haus steht, nichts. Mit ihm ist es ein Ort, auf
   * den man zeigen kann.
   */
  private buildPad(): void {
    const x = (DRONE_HOME.x + 0.5) * TILE;
    const z = (DRONE_HOME.z + 0.5) * TILE;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.46, 24),
      new THREE.MeshBasicMaterial({ color: 0x5ee0a0, toneMapped: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    // Einen Zentimeter über dem Boden: In derselben Ebene streiten sich zwei
    // Flächen um jeden Bildpunkt, und das flimmert.
    ring.position.set(x, 0.01, z);
    this.vanRig.add(ring);
  }

  /**
   * **Die Abendsonne über dem Vorplatz** — und warum sie in Wahrheit eine
   * Leuchte ist.
   *
   * Draußen soll es Licht geben und drinnen nicht, und das ist mit einer
   * richtigen Sonne genau dann zu haben, wenn jemand die Schatten bezahlt: Ein
   * `DirectionalLight` scheint ohne Schattenkarte **durch das Dach**, und die
   * Schattenkarte gibt es nur in der Stufe „Comic" (`core/graphicsSettings.ts`,
   * ausgeliefert wird „Einfach"). Eine Sonne, die in der Auslieferung das halbe
   * Haus aufhellt, nimmt diesem Spiel das Einzige, worauf es steht.
   *
   * Also hängt hier ein **Scheinwerfer tief über dem Vorplatz** statt einer
   * Sonne am Himmel. Er ist warm wie ein später Nachmittag, sein Kegel zeigt auf den
   * Vorplatz, und vor allem: Seine Reichweite (`distance`) endet ein paar
   * Meter hinter der Hauswand. Was davon in das Zimmer hinter der Haustür
   * fällt, ist ein Rest — und der sieht aus wie das, was er sein soll: Licht,
   * das durch Tür und Fenster hereinfällt. Im zweiten Zimmer ist davon nichts
   * mehr übrig, weil dort die Reichweite zu Ende ist.
   */
  private buildDusk(): void {
    const sun = new THREE.SpotLight(0xb7e2ef, 32, 11, 1.05, 0.5, 1);
    // Aus Südwesten und von oben: Von genau oben glänzt nur der Boden, von der
    // Seite bekommt auch die Hauswand etwas ab — und die ist das, worauf der
    // Pilot in seinem ersten Bild schaut.
    sun.position.set(-3, 2.7, (HOUSE.z + HOUSE.d + 2.4) * TILE);
    sun.target.position.set(0, 0, (HOUSE.z + HOUSE.d + 0.8) * TILE);
    this.vanRig.add(sun);
    this.vanRig.add(sun.target);
  }

  /**
   * **Die Drohne steht bei allen im Haus** — auch in der Brille.
   *
   * Eine Weile gab es sie nur bei den Web-Spielern, weil nur die eine Kamera
   * daran brauchen. Mit dem Scheinwerfer geht das nicht mehr: Ein Licht, das
   * der VR-Spieler nicht sieht, ist keine Hilfe, sondern eine
   * Helligkeitseinstellung — und die halbe Rolle des Piloten wäre weg. Der
   * Körper kostet nichts, die Kameras kommen weiterhin nur dort dazu, wo eine
   * Station sie aufmacht.
   */
  private buildDrone(): void {
    const body = new THREE.Group();

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.1, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x5ee0a0, toneMapped: false }),
    );
    body.add(shell);
    // Die Positionslampe: schwach, immer an, und sie sagt nur „hier bin ich".
    // Kurze Reichweite mit Absicht — eine, die bis an die Decke trägt, färbt
    // dem Piloten den oberen Bildrand grün und nimmt dem Haus sein Dunkel.
    body.add(new THREE.PointLight(0x5ee0a0, 0.7, 3.2, 2));

    // **Der Kopf sitzt in einer Wiege.** Kuppel, Scheinwerfer und Kamera hängen
    // daran; nach oben und unten kippt sie, nach links und rechts dreht sich
    // der ganze Rumpf. Ein Kopter, der sich zum Hochschauen selbst auf den
    // Rücken legt, sähe für den VR-Spieler nach Absturz aus — und drehte
    // nebenbei seine Positionslampe mit.
    const head = new THREE.Group();
    body.add(head);
    this.droneHead = head;

    // Die Kuppel über dem Scheinwerfer. Sie leuchtet mit, damit man von
    // *überall* sieht, dass das Licht an ist — der Kegel zeigt nach vorn, und
    // wer hinter der Drohne steht, sähe sonst nichts.
    const glass = new THREE.MeshBasicMaterial({ color: 0x123024, toneMapped: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), glass);
    dome.position.set(0, 0.05, 0.1);
    head.add(dome);
    this.droneGlass = glass;

    // Ein Kegel und kein Punktlicht: Eine Drohne, die rundherum leuchtet,
    // nimmt dem Haus das Dunkel — mit dem Kegel muss der Pilot **zielen**, und
    // dafür muss ihm jemand sagen, wohin.
    const lamp = new THREE.SpotLight(0xdff2ff, 0, 16, 0.42, 0.55, 1.6);
    lamp.position.set(0, 0.02, 0.1);
    lamp.target.position.set(0, -0.6, 3);
    head.add(lamp);
    head.add(lamp.target);
    this.droneLamp = lamp;

    this.live.add(body);
    this.droneBody = body;
    this.parkDrone();
    this.applyDroneLight();
  }

  /** Die Kameras, aus denen die Stationen ihr Bild bekommen. */
  private buildStationViews(): void {
    // Der Öffnungswinkel steht hier nur als Startwert: Was der Pilot wirklich
    // sieht, hängt an der Form seines Bildes und wird beim Zeichnen gerechnet
    // (`droneRoute.droneFov`) — ein Kinostreifen und ein hochkantes Vollbild
    // brauchen zwei verschiedene senkrechte Winkel für denselben Ausblick.
    const droneCam = new THREE.PerspectiveCamera(droneFov(1), 1, 0.05, 60);
    droneCam.rotation.order = 'YXZ';
    // **Sie schaut nach vorn, und „vorn" ist +Z.** Der Gierwinkel der Drohne
    // ist `atan2(dx, dz)`, damit zeigt ihre lokale +Z-Achse in die
    // Flugrichtung — eine Kamera von der Stange schaut aber nach −Z. Ohne die
    // halbe Drehung flog der Pilot rückwärts durch das Haus und der
    // Scheinwerfer leuchtete hinter ihm her.
    // Und sie bleibt dort: Was der Pilot wischt, dreht den **Rumpf**, und die
    // Kamera hängt daran (`turnDroneView`).
    droneCam.rotation.y = Math.PI;
    // Und sie sitzt **vor** der Drohne, nicht in ihr: Rumpf und Lampenkuppel
    // stehen im Weg, sobald die Kamera nach vorn schaut, und eine nahe
    // Schnittebene löste das nur, indem sie ein Loch in alles andere schnitte.
    droneCam.position.set(0, 0.03, 0.28);
    // In die Wiege und nicht an den Rumpf: Der Pilot schaut dorthin, wohin
    // sein Scheinwerfer leuchtet, und beide kippen deshalb an einem Stück.
    this.droneHead?.add(droneCam);
    this.droneCam = droneCam;

    const dark = new THREE.MeshBasicMaterial({ color: 0x0a0d14, toneMapped: false });
    for (let i = 0; i < 4; i++) {
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dark);
      quad.rotation.x = -Math.PI / 2;
      this.paperMask.add(quad);
    }
    this.paperMask.visible = false;
    this.root.add(this.paperMask);

    this.paperDoors.visible = false;
    this.root.add(this.paperDoors);
    this.buildDoorMarks();

    const paper = new THREE.AmbientLight(0xfff0dc, 0);
    this.root.add(paper);
    this.paperLight = paper;
    const sun = new THREE.DirectionalLight(0xffffff, 0);
    sun.position.set(6, 14, 4);
    this.root.add(sun);
    this.paperSun = sun;

    // Der Archivar schaut senkrecht von oben auf **ein** Zimmer. Der Ausschnitt
    // wird beim Zeichnen gesetzt, weil er vom gewählten Zimmer abhängt.
    const top = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 40);
    top.rotation.order = 'YXZ';
    top.rotation.x = -Math.PI / 2;
    this.root.add(top);
    this.topCam = top;

    // **Der Fernseher**: das ganze Haus, zehn Grad neben dem Lot. Wohin er
    // rückt, hängt an der Form des Bildes und wird beim Zeichnen gerechnet
    // (`aimShow`) — ein hochkantes Telefon und ein Fernseher quer brauchen
    // zwei verschiedene Abstände für dasselbe Haus.
    const show = new THREE.PerspectiveCamera(SHOW_FOV, 1, 0.5, 160);
    show.rotation.order = 'YXZ';
    show.rotation.x = -SHOW_PITCH;
    this.root.add(show);
    this.showCam = show;

    const day = new THREE.AmbientLight(0xeaf2ff, 0);
    this.root.add(day);
    this.showLight = day;
    const noon = new THREE.DirectionalLight(0xfff6e6, 0);
    noon.position.set(9, 18, 14);
    this.root.add(noon);
    this.showSun = noon;
  }

  /**
   * **Ein Türzeichen für jede Tür**, offen und zu, fertig gebaut.
   *
   * Gebaut und dann nur noch ein- und ausgeblendet: Die Türen gehen im Spiel
   * dauernd auf und zu (der Hacker legt Schalter um), und Geometrie, die
   * dabei jedes Mal neu entsteht, ist ein Speicherleck mit Zeitplan.
   *
   * Die Zeichen sind die aus einem Grundriss: **offen** ein schmaler Strich in
   * der Öffnung und der Viertelbogen, den das Blatt schlägt; **zu** die
   * ausgefüllte Lücke. Beide in Papierfarbe — hell genug, dass sie durch den
   * Sepiafilter kommen, und die Form sagt die Auskunft, nicht die Farbe.
   */
  private buildDoorMarks(): void {
    dispose(this.paperDoors);
    this.doorMarks.clear();
    this.roomWalls.clear();
    const ink = new THREE.MeshBasicMaterial({
      color: PAPER_INK,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const shutInk = new THREE.MeshBasicMaterial({
      color: PAPER_SHUT,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    for (const room of this.spec.rooms) {
      const walls = this.wallsOf(room, ink);
      walls.visible = false;
      this.paperDoors.add(walls);
      this.roomWalls.set(room.id, walls);
    }

    for (const door of this.spec.doors) {
      const { x, z, alongX } = doorEdge(door);
      const open = new THREE.Group();
      const shut = new THREE.Group();

      // **Offen ist die Lücke selbst die Auskunft**: Zwischen den beiden
      // Wandstücken bleibt Platz, und der Bogen sagt, dass dort eine Tür
      // schwingt und keine Wand fehlt. Ein Strich quer durch die Lücke stand
      // hier einmal — er machte den Durchgang optisch wieder zu.
      const pivot = new THREE.Group();
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(PLAN_DOOR_W - 0.07, PLAN_DOOR_W, 20, 1, 0, Math.PI / 2),
        ink,
      );
      arc.rotation.x = -Math.PI / 2;
      pivot.add(arc);
      open.add(pivot);

      // Und zu: das Blatt steht in der Lücke, **dunkel** in der hellen Wand.
      // Ein heller Pfropfen wäre schlicht Wand gewesen — man müsste die Bögen
      // zählen, um zu merken, dass dort überhaupt eine Tür ist.
      const plug = new THREE.Mesh(
        new THREE.PlaneGeometry(PLAN_DOOR_W, PLAN_WALL_T + 0.12),
        shutInk,
      );
      plug.rotation.x = -Math.PI / 2;
      if (!alongX) plug.rotation.z = Math.PI / 2;
      shut.add(plug);

      for (const mark of [open, shut]) {
        mark.position.set(x, PAPER_MARK_Y, z);
        mark.visible = false;
        this.paperDoors.add(mark);
      }
      this.doorMarks.set(door.id, { open, shut, arc: pivot });
    }
  }

  /**
   * **Die Wände eines Zimmers, als Linien auf dem Blatt.**
   *
   * Sie sind der Grund, aus dem die Türen vorher im Zimmer zu schweben
   * schienen: Der Schnitt geht durch jede Wand, und eine aufgeschnittene Wand
   * ist von oben ein offener Kasten — man sieht durch sie hindurch. Der
   * Archivar sah also einen Boden, ein paar Möbel und einen Bogen im Nichts.
   * Gezeichnet wird deshalb, was gemeint ist: ein Strich auf jeder Kante, die
   * das Zimmer begrenzt, mit einer **Lücke, wo eine Tür sitzt** (zwei
   * Wandstücke links und rechts davon, genau wie die Pfosten im Haus).
   *
   * Gebaut wird je Zimmer und nicht je Haus: Auf dem Blatt liegt immer nur
   * eines, und zwei Zimmer teilen sich zwar eine Wand, aber jedes zeichnet
   * seine eigene — das kostet ein paar Rechtecke und spart die Frage, wem sie
   * gehört.
   */
  private wallsOf(room: HouseRoom, ink: THREE.Material): THREE.Object3D {
    const group = new THREE.Group();
    // **Bis in die Ecke hinein.** Eine Linie, die genau an der Kachelkante
    // endet, lässt in jeder Zimmerecke ein Quadrat von einer halben Wandstärke
    // frei — vier schwarze Zähne im hellen Rahmen. Also ragt jede Linie an
    // ihren Enden um genau diese halbe Stärke über die Kante hinaus.
    const reach = TILE / 2 + PLAN_WALL_T / 2;

    for (const tile of tilesOf(room.rect)) {
      for (const dir of DIRS) {
        const nx = tile.x + dirX(dir);
        const nz = tile.z + dirZ(dir);
        const next = roomAt(this.spec, nx, nz);
        if (next && next.id === room.id) continue;
        // **Genau die Kanten, an denen im Haus wirklich eine Wand steht**
        // (`plan.innerWalls` und die Außenmauer): zwischen zwei verschiedenen
        // Zimmern und am Rand des Hauses. Eine Kachel ohne Zimmer *im* Haus
        // wäre eine Lücke im Bauplan und bekommt auch dort keine Wand.
        if (!next && inside(HOUSE, nx, nz)) continue;
        const edge = edgeCentre(tile.x, tile.z, dir);
        const door = this.doorAt(tile.x, tile.z, dir);
        const parts: Array<[number, number]> = door
          ? [
              [reach - PLAN_DOOR_W / 2, -(reach + PLAN_DOOR_W / 2) / 2],
              [reach - PLAN_DOOR_W / 2, (reach + PLAN_DOOR_W / 2) / 2],
            ]
          : [[reach * 2, 0]];
        for (const [len, shift] of parts) {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(len, PLAN_WALL_T), ink);
          bar.rotation.x = -Math.PI / 2;
          if (!edge.alongX) bar.rotation.z = Math.PI / 2;
          bar.position.set(
            edge.x + (edge.alongX ? shift : 0),
            PAPER_MARK_Y - 0.005,
            edge.z + (edge.alongX ? 0 : shift),
          );
          group.add(bar);
        }
      }
    }
    return group;
  }

  /** Ob auf dieser Kachelkante eine Tür sitzt — egal, von welcher Seite gefragt. */
  private doorAt(x: number, z: number, dir: Dir): HouseDoor | undefined {
    const edge = edgeCentre(x, z, dir);
    return this.spec.doors.find((door) => {
      const at = doorEdge(door);
      return Math.abs(at.x - edge.x) < 0.01 && Math.abs(at.z - edge.z) < 0.01;
    });
  }

  /**
   * **Welche Zeichen gerade gelten** — und es sind nur die des aufgeschlagenen
   * Zimmers.
   *
   * Die Zeichen liegen über den Flächen, die alles andere freiräumen; ohne
   * diese Auswahl schwebten die Türen der Nachbarzimmer über dem schwarzen
   * Rand und machten aus dem Blatt doch wieder eine Karte.
   */
  private markDoors(roomId: string): void {
    const room = roomOf(this.spec, roomId) ?? this.spec.rooms[0];
    const shut = new Set(this.state.shut);
    for (const [id, walls] of this.roomWalls) walls.visible = id === room?.id;
    for (const door of this.spec.doors) {
      const mark = this.doorMarks.get(door.id);
      if (!mark) continue;
      const mine = !!room && (door.a === room.id || door.b === room.id);
      const closed = shut.has(door.id);
      mark.open.visible = mine && !closed;
      mark.shut.visible = mine && closed;
      if (mine && room && !closed) this.swingInto(mark.arc, door, room);
    }
  }

  /**
   * **Den Türbogen in das aufgeschlagene Zimmer drehen.**
   *
   * Der Bogen ist ein Viertelkreis vom Pfosten aus: Er fängt in der Wand an
   * (dort steht das Blatt, wenn die Tür zu ist) und endet quer im Zimmer (dort
   * steht es offen). Welcher der beiden Pfosten der Angelpunkt ist, hängt
   * daran, auf welcher Seite das Zimmer liegt — der gebaute Bogen läuft von
   * seiner örtlichen +X-Achse nach −Z, und gedreht wird er so, dass aus diesen
   * beiden Richtungen „die Wand entlang" und „ins Zimmer hinein" wird.
   */
  private swingInto(pivot: THREE.Object3D, door: HouseDoor, room: HouseRoom): void {
    const edge = doorEdge(door);
    // Die Wandrichtung, und die Richtung ins Zimmer: Die eine liegt fest, die
    // andere zeigt dorthin, wo die Mitte des Zimmers liegt.
    let ax = edge.alongX ? 1 : 0;
    let az = edge.alongX ? 0 : 1;
    const mid = roomCentre(room);
    const inx = edge.alongX ? 0 : Math.sign((mid.x + 0.5) * TILE - edge.x) || 1;
    const inz = edge.alongX ? Math.sign((mid.z + 0.5) * TILE - edge.z) || 1 : 0;
    // Beide Drehsinne sind möglich; der gebaute Bogen kennt nur einen. Zeigt
    // das Paar in die falsche Richtung herum, hängt er am anderen Pfosten.
    if (ax * inz - az * inx > 0) {
      ax = -ax;
      az = -az;
    }
    pivot.rotation.y = Math.atan2(-az, ax);
    pivot.position.set((-ax * PLAN_DOOR_W) / 2, 0, (-az * PLAN_DOOR_W) / 2);
  }

  // --- der Stand ------------------------------------------------------------

  /** Wie lange ich schon an meinem Gerät sitze, in Sekunden. */
  private get seated(): number {
    return (clock() - this.seatedAt) / 1000;
  }

  private get isHost(): boolean {
    return this.hostId !== '' && this.hostId === this.context?.net.localId;
  }

  override update(dt: number, ctx: WorldContext): void {
    if (this.flatTechnician) ctx = { ...ctx, role: 'vr' };
    if (this.mountedRole !== ctx.role) {
      this.context = ctx;
      this.setupRole(ctx);
      this.mountExperience(ctx);
      ctx.refreshWorldMenu();
    }
    super.update(dt, ctx);
    this.refreshHost(ctx);

    if (this.isHost) {
      this.state.time += dt;
      this.trackMonster();
      this.checkItems(ctx);
      this.stepCrew(dt, ctx);
    }

    this.stepSpook(dt);
    this.applyDoors();
    // **Das Licht wird je Bild gesetzt und nicht je Änderung**, seit es
    // flackert: Eine Lampe, die nur beim Umlegen eines Schalters angefasst
    // wird, zuckt nicht. Sieben Lampen je Bild kosten nichts.
    this.applyLights();
    this.applyBlob();
    this.experience?.update(dt);
    if (this.monsterArt && this.monster) {
      this.monsterArt.rotation.y = this.monster.model.rotation.y;
      this.monsterArt.visible = this.state.crew.venting <= 0;
      animateCreature(this.monsterArt, this.state.time);
    }
    this.flyDrone(dt);

    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = STATE_RATE;
      if (ctx.role === 'vr') ctx.net.emit(HAUNT_CHANNEL, { kind: 'technician' });
      if (this.isHost) ctx.net.emit(HAUNT_CHANNEL, stateMessage(this.state));
      if (this.wanted) ctx.net.emit(HAUNT_CHANNEL, claimMessage(this.wanted, this.seated));
    }
    if (this.wanted) {
      // **Die eigene Sitzdauer steht auch in der eigenen Liste.** Nur die
      // Ansage zu füllen und den eigenen Eintrag auf null stehen zu lassen war
      // der Fehler, den erst zwei Geräte zeigen: Jeder hielt den anderen für
      // den Älteren, und beide sahen „weggeschubst".
      this.claims.set(ctx.net.localId, {
        id: ctx.net.localId,
        station: this.wanted,
        seniority: this.seated,
        heardAt: clock(),
      });
    }

    this.expireClaims();
    this.ui?.refresh();
  }

  /** Wer die Runde rechnet — der VR-Spieler, sonst der Älteste. */
  private refreshHost(ctx: WorldContext): void {
    const here = [...ctx.net.peers.values()].filter((peer) => peer.world === ctx.net.world);
    const candidates = [
      { id: ctx.net.localId, seniority: ctx.net.localSeniority, vr: ctx.role === 'vr' },
      ...here.map((peer) => ({
        id: peer.id,
        seniority: ctx.net.seniorityOf(peer),
        vr: peer.role === 'vr' || clock() - (this.technicians.get(peer.id) ?? -Infinity) < 3000,
      })),
    ];
    const next = pickGameHost(candidates) || pickHost(candidates);
    if (next !== this.hostId) this.hostId = next;
  }

  private receive(data: unknown, from: string): void {
    if (typeof data === 'object' && data !== null && 'kind' in data && data.kind === 'technician') {
      this.technicians.set(from, clock());
      return;
    }
    const state = readState(data);
    if (state && from !== this.context?.net.localId && from === this.hostId) {
      this.adopt(state);
      return;
    }
    const claim = readClaim(data, from);
    if (claim) {
      this.claims.set(from, { ...claim, heardAt: clock() });
      return;
    }
    const drone = readDrone(data);
    if (
      drone &&
      from !== this.context?.net.localId &&
      seatOf(this.currentClaims(), from) === 'drone'
    ) {
      // Die Stelle wird gesetzt, der Winkel wird **angefahren**: Er steht in
      // der Nachricht (`net.DroneState.yaw`), weil eine Drohne, die im Stehen
      // schwenkt, keinen Weg hinterlässt, aus dem er sich ableiten ließe — und
      // ein gesetzter Winkel bei zehn Ansagen je Sekunde sichtbar ruckelt.
      this.droneBody?.position.set(drone.x, DRONE_Y, drone.z);
      this.drone = drone;
      this.applyDroneLight();
      return;
    }
    const flip = readFlip(data);
    if (flip && this.isHost && ['hack', 'scout'].includes(seatOf(this.currentClaims(), from) ?? ''))
      this.applyFlip(flip.id, flip.on);
  }

  /**
   * **Die Ansprüche, wie sie jetzt gelten** — jede angesagte Dauer plus die
   * Zeit, die seit ihrer Ankunft vergangen ist. Der eigene Platz kommt von der
   * eigenen Uhr und nicht aus der Liste.
   */
  private currentClaims(): Claim[] {
    const me = this.context?.net.localId ?? '';
    const now = clock();
    const out: Claim[] = [];
    for (const claim of this.claims.values()) {
      const seniority =
        claim.id === me ? this.seated : claim.seniority + (now - claim.heardAt) / 1000;
      out.push({ id: claim.id, station: claim.station, seniority });
    }
    return out;
  }

  /** Wer sich zehn Sekunden nicht gemeldet hat, sitzt an keinem Gerät mehr. */
  private expireClaims(): void {
    const me = this.context?.net.localId ?? '';
    const now = clock();
    for (const [peer, claim] of this.claims) {
      if (peer !== me && now - claim.heardAt > 10000) this.claims.delete(peer);
    }
  }

  /** Den Stand des Gastgebers übernehmen — samt Haus, wenn es ein anderes ist. */
  private adopt(next: HauntState): void {
    if (next.seed !== this.spec.seed || next.crew.options.rooms !== this.spec.rooms.length) {
      this.spec = generateHouse(next.seed, next.crew.options.rooms);
      this.state = next;
      this.spook = freshSpook();
      this.grid?.replaceWith(housePlan(this.spec, new Set(next.shut), next.crew.options.test));
      this.builtDoors = next.shut.join(',');
      this.buildHouse();
      this.parkDrone();
      return;
    }
    this.state = next;
  }

  // --- was im Haus passiert -------------------------------------------------

  /** Der Gastgeber liest die Stelle des Monsters ab und sagt sie an. */
  private trackMonster(): void {
    if (!this.state.monsterOn) {
      this.state.monster = null;
      return;
    }
    if (!this.monster) return;
    const at = this.monster.feet(_feet);
    this.state.monster = { x: at.x, z: at.z };
  }

  /** Bei allen anderen steht an dieser Stelle ein Klotz — mehr braucht es nicht. */
  private applyBlob(): void {
    if (this.isHost) return;
    const at = this.state.monster;
    if (!at) {
      if (this.blob) this.blob.visible = false;
      return;
    }
    if (!this.blob) {
      const blob = buildCreature(this.state.crew.options.monster);
      this.live.add(blob);
      this.blob = blob;
    }
    this.blob.visible = true;
    this.blob.position.set(at.x, 0, at.z);
    this.blob.visible = this.state.crew.venting <= 0;
    animateCreature(this.blob, this.state.time);
  }

  /**
   * **Aufheben, indem man hingeht.**
   *
   * Kein Griff, keine Physik: Was hier eingesammelt wird, sind keine Kisten,
   * sondern Aufgaben — und ein Andenken, das man dreimal danebengreift, weil
   * es im Dunkeln liegt, macht das Spiel nicht schwerer, sondern zäher.
   * Schwer soll die Frage sein, in *welchem* Zimmer es liegt.
   */
  private checkItems(ctx: WorldContext): void {
    if (ctx.role !== 'vr' || this.state.phase !== 'running' || this.state.crew.simulation) return;
    ctx.rig.getHeadPosition(_head);
    if (
      this.state.done.length >= 3 &&
      this.state.crew.hp > 0 &&
      onApron(Math.floor(_head.x / TILE), Math.floor(_head.z / TILE))
    ) {
      this.state.phase = 'won';
      this.removeMonster();
      this.announce('MISSION ERFÜLLT · Alle Systeme online. Crew zurück in der Zentrale.');
    }
  }

  protected override takeHit(_direction: THREE.Vector3, _strength: number): void {
    const ctx = this.context;
    if (!ctx || !this.monster) return;
    ctx.rig.getHeadPosition(_head);
    const at = this.monster.feet(_feet);
    if (
      !roomAt(this.spec, Math.floor(_head.x / TILE), Math.floor(_head.z / TILE)) ||
      Math.hypot(at.x - _head.x, at.z - _head.z) > 1.65
    )
      return;
    if (!this.isHost || !takeCrewHit(this.state.crew, this.state.phase === 'running')) return;
    for (const hand of ['left', 'right'] as const) this.context?.input.get(hand)?.pulse(0.65, 120);
    playSwitch(false);
    if (this.state.crew.hp === 0) {
      this.state.phase = 'lost';
      this.removeMonster();
      this.announce(
        'MISSION GESCHEITERT · Drei Treffer. Neuer Versuch oder sicherer Test im Missionsmenü.',
      );
    } else
      this.announce(
        `Treffer · Anzug ${this.state.crew.hp}/3. Abstand gewinnen, Schutzschrank oder Medkit nutzen.`,
      );
    this.context?.refreshWorldMenu();
  }

  private stepCrew(dt: number, ctx: WorldContext): void {
    if (ctx.role !== 'vr') return;
    ctx.rig.getHeadPosition(_head);
    const speed =
      this.previousFeet && dt > 0
        ? Math.min(6, Math.hypot(_head.x - this.previousFeet.x, _head.z - this.previousFeet.z) / dt)
        : 0;
    if (!this.previousFeet) this.previousFeet = _head.clone();
    else this.previousFeet.copy(_head);
    const monster = this.state.monster;
    const distance = monster ? Math.hypot(monster.x - _head.x, monster.z - _head.z) : Infinity;
    stepVitals(this.state.crew, dt, speed, distance);
    if (this.state.crew.options.test) {
      this.state.monsterOn = false;
      this.state.monster = null;
      this.state.crew.hp = 3;
      if (this.monster) this.removeMonster();
      return;
    }
    if (!this.monster || !this.state.monsterOn || this.state.phase !== 'running') return;
    this.ventClock += dt;
    if (this.ventExit) {
      if (this.state.crew.venting > 0) return;
      const exit = this.ventExit;
      this.ventExit = null;
      const body = this.monster.entry.body;
      body.setTranslation({ x: exit.x, y: this.monster.skin.height / 2 + 0.06, z: exit.z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.monster.holder.position.set(exit.x, this.monster.skin.height / 2, exit.z);
      this.physics?.syncColliders();
      this.ventClock = 0;
      return;
    }
    const interval = MONSTERS.find((m) => m.id === this.state.crew.options.monster)!.vent;
    if (this.ventClock < interval) return;
    const at = this.monster.feet(_feet);
    const room = roomAt(this.spec, Math.floor(at.x / TILE), Math.floor(at.z / TILE));
    const vent = room && ventPairs(this.spec).find((v) => v.a === room.id || v.b === room.id);
    if (!vent) {
      this.ventClock = 0;
      return;
    }
    const sign = vent.a === room?.id ? -1 : 1;
    this.ventGoal.set(
      vent.x * TILE + (vent.dir === 1 ? (sign * TILE) / 2 : 0),
      0,
      vent.z * TILE + (vent.dir === 2 ? (sign * TILE) / 2 : 0),
    );
    if (Math.hypot(at.x - this.ventGoal.x, at.z - this.ventGoal.z) > 1.5) return;
    this.ventExit = new THREE.Vector3(
      vent.x * TILE - (vent.dir === 1 ? (sign * TILE) / 2 : 0),
      0,
      vent.z * TILE - (vent.dir === 2 ? (sign * TILE) / 2 : 0),
    );
    this.state.crew.venting = 2;
    this.experience?.burst('smoke', new THREE.Vector3(vent.x * TILE, 2.6, vent.z * TILE));
    if (distance < 12) playSlam();
  }

  private manualDoor(id: string): void {
    if (!this.isHost || this.context?.role !== 'vr' || this.state.phase !== 'running') return;
    const door = this.spec.doors.find((d) => d.id === id);
    if (!door) return;
    const shut = this.state.shut.indexOf(id);
    if (shut >= 0) this.state.shut.splice(shut, 1);
    else this.state.shut.push(id);
  }

  /** Ein Schalter der Tafel, angewendet beim Gastgeber. */
  private applyFlip(id: string, on: boolean): void {
    const entry = this.spec.switches.find((one) => one.id === id);
    if (!entry) return;

    const list =
      entry.kind === 'light' ? this.state.lit : entry.kind === 'radio' ? this.state.loud : null;

    if (list) {
      const at = list.indexOf(entry.target);
      if (on && at < 0) list.push(entry.target);
      if (!on && at >= 0) list.splice(at, 1);
      return;
    }
    // Türen: `on` heißt offen, und die Liste führt die geschlossenen.
    const shut = this.state.shut.indexOf(entry.target);
    if (!on && shut < 0) this.state.shut.push(entry.target);
    if (on && shut >= 0) this.state.shut.splice(shut, 1);
  }

  /** Vom Hacker aus: bitten, nicht selbst tun. Gerechnet wird beim Gastgeber. */
  private flip(id: string, on: boolean): void {
    if (this.isHost) this.applyFlip(id, on);
    else this.context?.net.emit(HAUNT_CHANNEL, flipMessage(id, on));
  }

  /**
   * **Türen bewegen sich über den Plan**, und der Plan baut die Welt neu.
   *
   * Nur wenn sich wirklich etwas geändert hat: Ein `setDoor` je Bild wäre ein
   * Neubau je Bild, und dann ruckelt das Haus, solange irgendwo eine Tür zu
   * ist.
   */
  private applyDoors(): void {
    const now = this.state.shut.join(',') + `/test:${this.state.crew.options.test}`;
    if (now === this.builtDoors) return;
    const before = this.builtDoors;
    this.builtDoors = now;
    const shut = new Set(this.state.shut);
    for (const door of this.spec.doors) {
      this.grid?.door(door.x, door.z, door.dir, 0, !shut.has(door.id));
    }
    this.grid?.door(2, 4, 3, 0, this.state.crew.options.test);
    this.hearSlam(before, shut);
  }

  /**
   * **Eine Tür, die zufällt, macht ein Geräusch — aber nur im Haus.**
   *
   * Im Van bleibt es still, und das ist keine Sparsamkeit: Der Hacker legt
   * seine Schalter blind um, und ein Schlag im Lautsprecher sagte ihm, dass
   * gerade *irgendwo* eine Tür zugefallen ist — geschenkt und ohne Zuruf.
   * Genau das ist die Sorte Auskunft, die diese Welt keiner Station umsonst
   * gibt (`stations.ts`). Der im Haus dagegen soll es hören: Es ist das
   * Einzige, was ihm sagt, dass das Monster eben an einer Tür vorbeigekommen
   * ist, ohne dass er es gesehen hat.
   *
   * Beim allerersten Aufbau schweigt es (`builtDoors` steht dann auf `?`):
   * Wer in eine laufende Runde kommt, in der schon eine Tür zu ist, hat sie
   * nicht zufallen hören.
   */
  private hearSlam(before: string, shut: ReadonlySet<string>): void {
    if (before === '?' || this.context?.role !== 'vr') return;
    const had = new Set(before ? before.split(',') : []);
    for (const id of shut) {
      if (had.has(id)) continue;
      playSlam();
      return;
    }
  }

  /**
   * **Der Spuk: bei allen gerechnet, nur beim Gastgeber angewendet.**
   *
   * Gerechnet wird er überall, weil aus ihm das Flackern kommt und ein Zucken,
   * das jedes Gerät für sich aus derselben Monsterposition ableitet, keine
   * einzige Nachricht kostet. Angewendet — Licht aus, Tür zu — wird er beim
   * Gastgeber, und von dort kommt er als ganz gewöhnlicher Stand zurück: Für
   * den Hacker sieht ein Licht, das das Monster ausgemacht hat, aus wie eines,
   * das jemand ausgemacht hat. Genau so soll es sein.
   */
  private stepSpook(dt: number): void {
    const out = stepHaunt(
      this.spook,
      {
        spec: this.spec,
        monster: this.state.monsterOn ? this.state.monster : null,
        lit: this.state.lit,
        shut: this.state.shut,
      },
      dt,
    );
    this.spook = out.spook;
    if (!this.isHost) return;

    const lit = this.state.lit.indexOf(out.lightOut);
    if (out.lightOut && lit >= 0) this.state.lit.splice(lit, 1);
    if (out.doorShut && !this.state.shut.includes(out.doorShut)) {
      this.state.shut.push(out.doorShut);
    }
  }

  /**
   * Die Lampen, wie sie **jetzt** brennen — samt dem Zucken der einen, in
   * deren Zimmer das Monster steht (`haunt.flickerLevel`).
   *
   * Das Glas geht denselben Weg wie das Licht: Eine Kugel, die in voller
   * Helligkeit weiterleuchtet, während der Raum darunter blinkt, sieht aus
   * wie ein Fehler in der Beleuchtung und nicht wie eine Lampe, die gleich
   * ausgeht.
   */
  private applyLights(): void {
    const lit = new Set(this.state.lit);
    const bright = this.state.crew.options.test && this.state.crew.options.bright;
    if (this.testLight) this.testLight.intensity = bright || this.state.crew.simulation ? 1.25 : 0;
    this.context?.rig.getHeadPosition(_head);
    const active = [...this.lamps.entries()].filter(([id]) => bright || lit.has(id));
    active.sort((a, b) => a[1].at.distanceToSquared(_head) - b[1].at.distanceToSquared(_head));
    for (let i = 0; i < this.lampPool.length; i++) {
      const light = this.lampPool[i]!;
      const entry = active[i];
      light.intensity = 0;
      if (entry) {
        const [id, lamp] = entry;
        const glow = !bright && id === this.spook.room ? flickerLevel(this.spook.since) : 1;
        light.position.copy(lamp.at);
        light.color.setHex(lamp.color);
        light.intensity = LAMP_ON * glow;
      }
    }
    for (const [id, lamp] of this.lamps)
      lamp.glass.material.color.lerpColors(_lampOff, _lampOn, bright || lit.has(id) ? 1 : 0);
  }

  // --- die Drohne -----------------------------------------------------------

  /**
   * **Die Drohne startet draußen, über ihrem Ring auf dem Vorplatz.**
   *
   * Eine Weile parkte sie im Zimmer hinter der Haustür, weil es vor dem Haus
   * keine Kacheln gab und die Wegsuche mit einem Startpunkt außerhalb des
   * Graphen nichts anfängt. Seit der Vorplatz zum Gitter gehört (`house.APRON`)
   * ist das andersherum richtig: Der Pilot setzt sich hin und sieht den Van,
   * den Vorplatz und die Hauswand mit der Tür darin — die erste Ansage, die im
   * Van fällt. Vorher sah er ein dunkles Zimmer und wusste weder, wo er ist,
   * noch wohin.
   */
  private parkDrone(): void {
    const body = this.droneBody;
    if (!body) return;
    // **Mit dem Rücken zum Van und dem Haus im Bild.** Der Gierwinkel ist
    // `atan2(dx, dz)`, und nach Norden ist das π — wer hier eine Null
    // hinschreibt, setzt den Piloten in seinem ersten Bild vor eine
    // Tischplatte.
    const yaw = Math.PI;
    this.dronePose = { x: (DRONE_HOME.x + 0.5) * TILE, z: (DRONE_HOME.z + 0.5) * TILE, yaw };
    body.position.set(this.dronePose.x, DRONE_Y, this.dronePose.z);
    body.rotation.y = yaw;
    this.droneLook = 0;
    this.dronePitch = 0;
    if (this.droneHead) this.droneHead.rotation.x = 0;
    this.drone = {
      x: this.dronePose.x,
      z: this.dronePose.z,
      yaw,
      pitch: 0,
      target: '',
      hop: 0,
      lamp: this.drone.lamp,
      light: this.drone.light,
    };
    this.droneRoute = { tiles: [], complete: true, grounded: true };
    this.droneSeen.clear();
    this.droneSeen.add(VAN_ID);
  }

  /**
   * **Ein Zimmer antippen heißt: such dir einen Weg dorthin.**
   *
   * Nicht „flieg dorthin". Der Unterschied ist der ganze Rest des Spiels — was
   * dabei herauskommt, hängt an den Türen, und die gehören dem VR-Spieler und
   * dem Hacker (`droneRoute.ts`). Ein zweites Antippen desselben Zimmers ruft
   * sie zurück auf der Stelle: Ein Knopf, der nur eine Richtung kennt, ist auf
   * einem Telefon ein Knopf, den man versehentlich drückt und nicht mehr los
   * wird.
   */
  private setDroneTarget(roomId: string): void {
    if (this.drone.target === roomId) {
      // **Abbrechen geht immer.** Die Sperre steht gegen das nächste Zimmer,
      // nicht gegen die Umkehr — ein Knopf, der eine falsche Eingabe eine ganze
      // Sperre lang festhält, ist auf einem Telefon eine Strafe fürs
      // Danebentippen.
      this.drone.target = '';
      this.droneRoute = { tiles: [], complete: true, grounded: true };
      this.droneThink = 0;
      this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
      return;
    }
    // Und sie fliegt nicht dorthin, wo sie schon schwebt: Das kostete eine
    // Sperre für einen Flug von null Metern.
    if (this.drone.hop > 0 || (!this.drone.target && this.droneRoom() === roomId)) return;
    this.drone.target = roomId;
    this.drone.hop = HOP_TIME;
    // **Beim Losfliegen schaut sie wieder nach vorn** — und nur dann.
    //
    // Umsehen dreht seit Neuestem ganz herum, und genau deshalb braucht der
    // Start diese Zeile: Wer gerade nach hinten geschaut hat und dann ein
    // Zimmer antippt, flöge sonst rückwärts los und sähe von seinem eigenen
    // Flug die Wand, die hinter ihm wegzieht. Zurückgestellt wird **nur** hier
    // und nicht laufend: Ein Blick, den die Welt jede Sekunde wieder
    // geradezieht, ist kein Blick, sondern ein Gummiband — sobald sie fliegt,
    // gehört der Kopf wieder dem Piloten.
    this.turnDroneView(0, 0);
    this.droneRoute = { tiles: [], complete: true, grounded: true };
    this.droneThink = 0;
    this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
  }

  /** Der Scheinwerfer — vom Piloten geschaltet, bei allen im Haus zu sehen. */
  private toggleDroneLight(): void {
    // Aus geht immer; an nur, wenn wirklich noch etwas in der Ladung steckt.
    if (!this.drone.light && this.drone.lamp < LAMP_MIN) return;
    this.drone.light = !this.drone.light;
    this.applyDroneLight();
    playSwitch(this.drone.light);
    this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
  }

  /**
   * **Umsehen, ohne umzukehren** — in beiden Achsen.
   *
   * Was der Pilot wischt, ist ihr Kopf und nicht ihr Kurs: Die Bahn kommt
   * weiter aus der Wegsuche. Waagerecht dreht sich dabei der ganze Rumpf
   * (`faceDrone`), senkrecht nur die Wiege mit Kamera, Kuppel und
   * Scheinwerfer — ein Kopter, der sich zum Hochschauen auf den Rücken legt,
   * sähe im Haus nach Absturz aus.
   *
   * **Waagerecht geht es ganz herum** (`wrapAngle`): Der alte Anschlag bei gut
   * zwei Dritteln einer halben Umdrehung war als Schutz gegen den verlorenen
   * Horizont gedacht und war in Wahrheit eine Drohne, die sich nicht umsehen
   * kann — wer hören will, ob hinter ihr etwas steht, dreht sich um. Zurück
   * geradeaus kommt der Pilot mit einem Tipp auf den Blickstock, und solange
   * sein Blick daneben steht, leuchtet der. Senkrecht bleibt der Anschlag
   * (`TILT_MOST`), denn über den Scheitel hinaus steht das Bild auf dem Kopf.
   */
  private turnDroneView(yaw: number, pitch: number): void {
    this.droneLook = wrapAngle(yaw);
    this.dronePitch = Math.min(TILT_MOST, Math.max(-TILT_MOST, pitch));
    this.faceDrone();
  }

  /**
   * **Den Rumpf dorthin drehen, wo der Pilot hinsieht** — Flugrichtung plus
   * Blickwinkel, und die Kamera hängt als Kind daran.
   *
   * Nur beim Piloten: Bei allen anderen ist der Winkel eine angesagte Zahl, in
   * die sich der Rumpf hineindreht (`turnDroneBody`). Zwei Stellen, die
   * denselben Rumpf drehen, drehten ihn gegeneinander.
   */
  private faceDrone(): void {
    const body = this.droneBody;
    if (!body || !this.piloting) return;
    body.rotation.y = this.dronePose.yaw + this.droneLook;
    this.drone.yaw = body.rotation.y;
    // Nach oben sehen heißt: die Wiege *gegen* die X-Achse kippen. Eine
    // Drehung um +X legt die Blickachse nach unten — das Vorzeichen sieht man
    // einer Zahl nicht an, im Bild dafür sofort.
    if (this.droneHead) this.droneHead.rotation.x = -this.dronePitch;
    this.drone.pitch = this.dronePitch;
  }

  /**
   * **Bei allen anderen dreht sich die Drohne hin, statt zu springen.**
   *
   * Der Winkel kommt zehnmal je Sekunde über die Leitung; direkt gesetzt wäre
   * das ein Ruckeln in zehn Stufen, und ausgerechnet der Lichtkegel im Haus
   * würde dabei springen. Der Nachlauf ist bildratenunabhängig — bei 45 Hz
   * dieselbe Zeit wie bei 120 — und nimmt immer den kürzeren Bogen: Ohne das
   * dreht sich eine Drohne, die über den Vollkreis läuft, einmal komplett
   * andersherum.
   */
  private turnDroneBody(dt: number): void {
    const body = this.droneBody;
    if (!body) return;
    const step = Math.min(1, dt * DRONE_TURN);
    const gap = Math.atan2(
      Math.sin(this.drone.yaw - body.rotation.y),
      Math.cos(this.drone.yaw - body.rotation.y),
    );
    body.rotation.y += gap * step;
    // Die Wiege braucht den kürzeren Bogen nicht: Sie kippt nur zwischen zwei
    // Anschlägen und kommt nie über den Vollkreis.
    const head = this.droneHead;
    if (head) head.rotation.x += (-this.drone.pitch - head.rotation.x) * step;
  }

  private applyDroneLight(): void {
    const on = this.drone.light && this.drone.lamp > 0;
    // Nur bei Wechsel: Diese Zeile läuft in jedem Bild, und eine Farbe, die
    // sechzigmal je Sekunde auf denselben Wert gesetzt wird, ist sechzigmal
    // je Sekunde ein `needsUpdate` an einem Material, das sich nicht geändert
    // hat.
    if (on === this.droneLit) return;
    this.droneLit = on;
    if (this.droneLamp) this.droneLamp.intensity = on ? 7 : 0;
    if (this.droneGlass) this.droneGlass.color.setHex(on ? 0xdff2ff : 0x123024);
  }

  /**
   * **Geflogen wird auf Zimmer und nicht auf Punkte.**
   *
   * Der Pilot tippt auf die Karte, die Drohne sucht sich den Weg — mit einem
   * Profil, das über Möbel hinwegfliegt und **keine Tür aufmacht**. Wohin sie
   * kommt, hängt damit daran, was der VR-Spieler und der Hacker offen gelassen
   * haben: Abhängigkeit in beide Richtungen, ohne eine einzige Sonderregel.
   */
  private flyDrone(dt: number): void {
    const body = this.droneBody;
    if (!body) return;
    // **Sperre und Ladung laufen bei allen mit**, nicht nur beim Piloten. Sonst
    // stünden beide Uhren still, sobald niemand am Gerät sitzt — und der
    // Nächste, der sich hinsetzt, erbte eine Sperre von vor drei Minuten und
    // eine Lampe, die sich in der Zwischenzeit nicht erholt hat.
    this.drone.hop = Math.max(0, this.drone.hop - dt);
    this.drone.lamp = lampAfter(this.drone.lamp, dt, this.drone.light, this.droneRoom() === VAN_ID);

    const mine = seatOf(this.currentClaims(), this.context?.net.localId ?? '') === 'drone';
    if (!mine) {
      // Bei allen anderen ist sie nur eine angesagte Stelle — die Bahn rechnet
      // der Pilot, und zweimal gerechnet käme sie zweimal woanders an.
      this.piloting = false;
      this.applyDroneLight();
      this.turnDroneBody(dt);
      return;
    }

    if (!this.piloting) {
      // **Wer sich gerade erst hingesetzt hat, übernimmt sie da, wo sie
      // steht.** Die eigene Bahn steht noch am Hangar aus `parkDrone`; ohne
      // diese Zeile springt die Drohne im ersten Bild eines Pilotenwechsels
      // zurück ins Zimmer hinter der Haustür — und der Vorgänger sieht es.
      this.piloting = true;
      this.dronePose = { x: this.drone.x, z: this.drone.z, yaw: body.rotation.y };
      // **Wer sich hinsetzt, schaut geradeaus.** Der Winkel des Vorgängers
      // steckt schon in der Drehung des Rumpfes, die hier gerade zur
      // Flugrichtung erklärt wird; ein zweites Mal daraufgerechnet stünde die
      // Drohne quer, und der Neue hielte sein erstes Bild für kaputt. Die
      // Wiege dagegen steht absolut — ihren Winkel übernimmt er, statt ihn zu
      // vergessen, sonst ruckte das Bild beim Platzwechsel waagerecht.
      this.droneLook = 0;
      this.dronePitch = this.drone.pitch;
      this.droneRoute = { tiles: [], complete: true, grounded: true };
      this.droneThink = 0;
    }

    if (this.drone.target) this.stepDrone(dt);
    this.spendLamp();

    body.position.set(this.dronePose.x, DRONE_Y, this.dronePose.z);
    this.drone.x = this.dronePose.x;
    this.drone.z = this.dronePose.z;
    // Erst die Bahn, dann der Blick darauf: `faceDrone` rechnet beides
    // zusammen und schreibt den Winkel in die Ansage.
    this.faceDrone();
    this.noteDroneRoom();

    this.droneTimer -= dt;
    if (this.droneTimer <= 0) {
      this.droneTimer = DRONE_RATE;
      this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
    }
  }

  /**
   * Ein Stück des Weges — und der Weg kommt aus dem Navigationsgraphen
   * (`droneRoute.ts`, mit Test, der einen Weg wirklich abfliegt).
   *
   * **Neu gesucht wird zweimal je Sekunde**, nicht nur beim Antippen: Der
   * Hacker macht Türen zu, während sie unterwegs ist, und eine Drohne, die
   * ihren Weg beim Start ein für alle Mal berechnet hat, fliegt danach durch
   * eine geschlossene Tür. Billig ist das, weil ein Haus achtundvierzig
   * Kacheln hat.
   *
   * Findet der Graph keinen Weg, bleibt der beste Teilweg übrig — sie fliegt
   * also bis vor die verschlossene Tür und bleibt dort. Genau das soll der
   * Pilot sehen: nicht „Fehler", sondern *hier ist zu*, und die Station sagt
   * es ihm auch mit Worten (`droneStatus`).
   */
  /**
   * **Die Kachel, auf die sie gerade zufliegt** — Zimmermitte oder Hangar.
   *
   * Der Van ist hier ein Ziel wie jedes andere und kein Sonderfall im Flug:
   * Was ihn unterscheidet, ist nur, dass seine Kachel nicht aus der
   * Zimmerliste kommt. Die Wegsuche dahinter ist dieselbe — samt der Haustür,
   * die zu sein kann.
   */
  private droneGoal(): { x: number; z: number } | null {
    if (this.drone.target === VAN_ID) return DRONE_HOME;
    const room = roomOf(this.spec, this.drone.target);
    return room ? roomCentre(room) : null;
  }

  private stepDrone(dt: number): void {
    const graph = this.grid?.graph;
    const goal = this.droneGoal();
    if (!graph || !goal) return;

    this.droneThink -= dt;
    if (this.droneThink <= 0) {
      this.droneThink = 0.5;
      this.droneRoute = routeTo(graph, this.dronePose, tileKey(goal.x, goal.z, 0));
      if (!this.droneRoute.grounded) {
        // Kein Startpunkt: Sie schwebt neben dem Gitter — dorthin kommt sie
        // nur, wenn jemand am Haus etwas geändert hat, während sie flog.
        this.parkDrone();
        return;
      }
    }

    if (!stepAlong(this.dronePose, this.droneRoute, dt)) {
      // Angekommen — oder vor einer Tür, die zu ist. Beides heißt: Sie steht.
      // Das Ziel bleibt stehen, damit der Pilot in der Station sieht, wohin
      // sie wollte, statt eine Anzeige zu bekommen, die sich selbst löscht.
      if (this.droneRoute.complete) this.drone.target = '';
    }
  }

  /**
   * **Wenn die Ladung alle ist, geht das Licht von selbst aus** — und zwar
   * beim Piloten, damit es alle mitbekommen.
   *
   * Heruntergezählt hat `flyDrone` schon, bei jedem im Van. Hier steht nur der
   * Schluss daraus: Eine Lampe, die bei null einfach weiterbrennt, wäre eine
   * Anzeige und keine Ladung — und der Pilot, der sie danach ausschaltet,
   * bekäme einen Knopf, der nichts tut.
   */
  private spendLamp(): void {
    if (!this.drone.light || this.drone.lamp > 0) return;
    this.drone.light = false;
    this.applyDroneLight();
    playSwitch(false);
    this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
  }

  /** In welchem Zimmer sie gerade ist — und dass sie dort einmal war. */
  private droneRoom(): string {
    const tile = tileAt(this.drone.x, this.drone.z);
    const x = keyX(tile);
    const z = keyZ(tile);
    const room = roomAt(this.spec, x, z);
    if (room) return room.id;
    // Der Vorplatz ist für den Piloten ein Ort wie ein Zimmer: Dort steht der
    // Van, dort lädt sie, und dorthin schickt er sie zurück.
    return onApron(x, z) ? VAN_ID : '';
  }

  private noteDroneRoom(): void {
    const room = this.droneRoom();
    if (room) this.droneSeen.add(room);
  }

  /**
   * **Was der Pilot über seinen Flug erfährt.**
   *
   * Nur so viel, wie eine Drohne wirklich weiß: wo sie ist, wie weit sie noch
   * zu fliegen hat und ob sie überhaupt hinkommt. Kein Grundriss und keine
   * Abzweigung — die gehören dem Archivar. Die eine Zeile, auf die es
   * ankommt, ist `blocked`: Sie ist die Stelle, an der aus einer Wegsuche eine
   * Ansage an den Rest des Vans wird — „irgendwo dazwischen ist zu, macht
   * auf".
   */
  private droneStatus(): DroneStatus {
    const here = this.droneRoom();
    if (!this.drone.target) return { kind: 'idle', here, metres: 0 };
    const metres = routeLength(this.dronePose, this.droneRoute);
    if (!this.droneRoute.complete) return { kind: 'blocked', here, metres };
    return { kind: 'flying', here, metres };
  }

  // --- der Van --------------------------------------------------------------

  /** Sich an ein Gerät setzen. Wer schon länger dort sitzt, bleibt sitzen. */
  private sit(station: StationId): void {
    if (this.wanted === station) return;
    this.wanted = station;
    this.seatedAt = clock();
    const ctx = this.context;
    if (!ctx) return;
    this.claims.set(ctx.net.localId, {
      id: ctx.net.localId,
      station,
      seniority: 0,
      heardAt: clock(),
    });
    ctx.net.emit(HAUNT_CHANNEL, claimMessage(station, 0));
  }

  // --- gezeichnet wird je Station verschieden --------------------------------

  /**
   * **Zwei Sichten kommen aus der Welt, zwei aus dem Grundriss.**
   *
   * Drohne und Archiv brauchen Geometrie — man soll ein Klavier von einer
   * Werkbank unterscheiden. Der Späher darf sie ausdrücklich *nicht* haben,
   * und die Schalttafel hat mit dem Haus gar nichts zu tun; beide zeichnet die
   * Oberfläche selbst (`stationUi.ts`). Deshalb steht hier nur die Hälfte.
   *
   * **Und nicht in jedem Bild.** Das Archiv ist ein Standbild — es ändert sich,
   * wenn jemand ein anderes Zimmer aufschlägt, und sonst nie. Ein
   * Überwachungsbild, das alle zwei Sekunden zuckt, ist auf einem Telefon
   * nicht der Kompromiss, sondern der Ton, den man haben will.
   */
  override render(ctx: WorldContext): boolean {
    const ui = this.ui;
    if (!ui) {
      this.liftLid(this.state.crew.simulation);
      return false;
    }
    const station = ui.station;
    const archive = station === 'archive';
    const show = station === 'watch';
    this.veilView(ui.veiled);
    // Die Decke bleibt nur dem Zuschauer weg, und sie geht nur bei Wechsel ab:
    // Eine Schnittebene, die je Bild kommt und geht, baut three.js jedes Mal
    // jeden Shader neu.
    this.liftLid(show);
    const rect = ui.viewport();
    const renderer = ctx.renderer;
    renderer.getSize(_size);
    renderer.setScissorTest(false);
    renderer.setClearColor(show ? SHOW_SKY : 0x05070c, 1);
    renderer.clear();
    if (!rect) return true;

    const aspect = rect.w / Math.max(1, rect.h);
    // **Was oben schon vergeben ist**, als Anteil des Bildes: Kopfzeile und
    // Auftragsstreifen liegen darüber. Beide Kameras, die ein Ganzes zeigen —
    // der Grundriss des Archivars und das Haus des Fernsehers —, lassen den
    // Streifen frei, statt ihre obere Kante darunter zu schieben.
    const head = Math.min(0.5, ui.headroom() / Math.max(1, rect.h));
    const camera = station === 'drone' ? this.droneCam : show ? this.showCam : this.topCam;
    if (!camera) return true;
    if (archive) this.aimArchive(ui.selected, aspect, head);
    if (show) this.aimShow(aspect, head);

    // Der Archivar sieht **keine Lebewesen**: keinen Mitspieler, kein Monster,
    // keine Drohne. Sein Blatt ist ein Grundriss und keine Überwachung.
    this.live.visible = !archive;
    ctx.avatars.visible = !archive;
    if (this.paperLight) this.paperLight.intensity = archive ? 2.2 : 0;
    if (this.paperSun) this.paperSun.intensity = archive ? 1.4 : 0;
    this.paperMask.visible = archive;
    this.paperDoors.visible = archive;
    if (archive) this.markDoors(ui.selected);
    this.paperTint(archive);
    // **Der Zuschauer sieht Tag.** Der Nebel gehört zum Grusel derer, die
    // drinstecken; über dem Puppenhaus wäre er nur eine Milchglasscheibe.
    const fog = ctx.scene.fog;
    if (show) ctx.scene.fog = null;
    if (this.showLight) this.showLight.intensity = show ? 3.4 : 0;
    if (this.showSun) this.showSun.intensity = show ? 2.2 : 0;

    const y = _size.y - rect.y - rect.h;
    renderer.setScissorTest(true);
    renderer.setScissor(rect.x, y, rect.w, rect.h);
    renderer.setViewport(rect.x, y, rect.w, rect.h);
    if (camera instanceof THREE.PerspectiveCamera && !show) {
      camera.aspect = aspect;
      // **Der Öffnungswinkel hängt an der Form des Bildes.** Der Pilot zieht
      // sein Bild vom Kinostreifen aufs Vollbild und zurück; bliebe der
      // senkrechte Winkel dabei stehen, sähe er im Streifen fast nichts mehr
      // nach oben und im hochkanten Vollbild fast nichts mehr zur Seite
      // (`droneRoute.droneFov`). Der Fernseher behält seinen Winkel und rückt
      // stattdessen ab (`aimShow`): Ein Haus, das man von außen ansieht, soll
      // nicht mit dem Fenster die Perspektive wechseln.
      camera.fov = droneFov(camera.aspect);
      camera.updateProjectionMatrix();
    }
    renderer.render(ctx.scene, camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, _size.x, _size.y);
    this.live.visible = true;
    ctx.avatars.visible = true;
    if (this.paperLight) this.paperLight.intensity = 0;
    if (this.paperSun) this.paperSun.intensity = 0;
    if (this.showLight) this.showLight.intensity = 0;
    if (this.showSun) this.showSun.intensity = 0;
    ctx.scene.fog = fog;
    this.paperMask.visible = false;
    this.paperDoors.visible = false;
    return true;
  }

  /**
   * **Dem Haus die Decke abnehmen** — für den Zuschauer, und nur für ihn.
   *
   * Eine Schnittebene am Renderer statt einer nahen Kappe an der Kamera: Die
   * steht zehn Grad schräg im Raum, und ein Schnitt senkrecht zu ihrer
   * Blickrichtung ließe hinten die halbe Decke stehen. Und nur bei **Wechsel**,
   * weil three.js jeden Shader neu baut, sobald sich die Zahl der Ebenen
   * ändert — je Bild wäre das ein Ruckeln ohne Grund.
   */
  private liftLid(on: boolean): void {
    const renderer = this.context?.renderer;
    if (!renderer || on === this.lidOff) return;
    this.lidOff = on;
    renderer.clippingPlanes = on ? _lidOn : _noLid;
  }

  /**
   * **Den Fernseher so weit weg stellen, dass das Haus hineinpasst.**
   *
   * Der Öffnungswinkel bleibt und der Abstand wandert — andersherum sähe
   * dasselbe Haus auf einem Telefon nach Fischauge und auf einem Fernseher
   * nach Teleobjektiv aus. Gerechnet wird beides einzeln, quer und der Länge
   * nach, und die schlimmere der beiden Zahlen gewinnt: Ein hochkantes Handy
   * hat quer zu wenig Platz, ein Fernseher der Länge nach.
   */
  private aimShow(aspect: number, head: number): void {
    const camera = this.showCam;
    if (!camera) return;
    const cx = (HOUSE.x + HOUSE.w / 2) * TILE;
    const cz = (HOUSE.z + HOUSE.d / 2) * TILE;
    // Ein Kachelrand ringsum: Das Haus soll im Bild stehen und nicht daran
    // kleben — und im Süden liegt der Vorplatz mit dem Van, den man gern
    // mitsieht, wenn die Drohne heimkommt.
    const wide = (HOUSE.w + 1) * TILE;
    // Nach Süden ein Stück mehr: Dort liegen der Vorplatz und der Van, und wer
    // zusieht, will sehen, wie die Drohne heimkommt und was auf dem Tisch
    // landet. Und oben der Streifen für die Zeilen, die über dem Bild liegen.
    const deep = ((HOUSE.d + 3.4) * TILE) / Math.max(0.2, 1 - head);
    const rise = Math.tan(((SHOW_FOV / 2) * Math.PI) / 180);
    const far = Math.max(deep / (2 * rise), wide / (2 * rise * aspect));
    const look = cz + 1.2 * TILE - (head / 2) * deep;
    camera.position.set(cx, Math.sin(SHOW_PITCH) * far, look + Math.cos(SHOW_PITCH) * far);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  /**
   * **Das Bild hinter der Bedienung wird grob.**
   *
   * Die Schalttafel des Piloten liegt auf durchsichtigem Grund über seinem
   * Kamerabild — und ein bewegtes Bild unter Knöpfen zieht den Blick immer auf
   * sich. Statt es zuzudecken (dann wäre der Vollbild-Grund umsonst) wird es
   * **gerastert**: Man sieht weiter, dass die Drohne fliegt und ob das Licht
   * brennt, aber nichts mehr, worauf man hinsehen müsste.
   *
   * Gerastert wird über die **Auflösung** und nicht über einen Filter: Die
   * Leinwand bekommt für diese Zeit einen winzigen Bildspeicher, den der
   * Browser hart hochskaliert (`image-rendering: pixelated`). Das kostet
   * nichts — es zeichnet weniger, nicht mehr —, es ist wirklich verpixelt und
   * nicht weichgezeichnet, und es ist genau die Stelle, an der später ein
   * eigener Filter (CRT, Rauschen) sitzen wird.
   *
   * Nur bei Wechsel: `setPixelRatio` legt den Bildspeicher neu an.
   */
  private veilView(on: boolean): void {
    const renderer = this.context?.renderer;
    if (!renderer || on === this.veiled) return;
    // In der Brille wird nicht gerastert — dort gibt es diese Bedienung nicht,
    // und eine halbierte Auflösung im Headset wäre kein Effekt, sondern ein
    // Fehler.
    if (renderer.xr.isPresenting) return;
    this.veiled = on;
    renderer.setPixelRatio(on ? VEIL_RATIO : Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.imageRendering = on ? 'pixelated' : '';
  }

  /**
   * **Der Papierton.**
   *
   * Ein Sepiafilter auf der Leinwand statt eines zweiten Materialsatzes in der
   * Szene: Während das Archiv offen ist, steht auf der Leinwand ohnehin nichts
   * anderes, und ein Filter im CSS kostet nichts, wo ein eigener
   * Render-Durchgang jedes Material doppelt hielte. Gesetzt wird er nur bei
   * Wechsel — ein `style.filter` je Bild ist ein Umbruch je Bild.
   */
  private paperTint(on: boolean): void {
    if (on === this.tinted) return;
    this.tinted = on;
    const canvas = this.context?.renderer.domElement;
    if (canvas) canvas.style.filter = on ? 'sepia(0.72) contrast(1.12) brightness(1.06)' : '';
  }

  /**
   * Die Kamera des Archivars über das aufgeschlagene Zimmer stellen.
   *
   * **Und unter die Decke.** Das Haus hat eine, sonst käme Licht von oben
   * hinein — von oben sieht man deshalb zuerst den Deckel. Die vordere
   * Schnittebene liegt darum knapp darunter: Was näher an der Kamera ist als
   * `near`, wird weggeschnitten, und das ist genau die Decke. Ein Puppenhaus
   * mit abgenommenem Dach, ohne dass irgendwo Geometrie verschwinden muss.
   */
  private aimArchive(roomId: string, aspect: number, head: number): void {
    const camera = this.topCam;
    const room = roomOf(this.spec, roomId) ?? this.spec.rooms[0];
    if (!camera || !room) return;
    const cx = (room.rect.x + room.rect.w / 2) * TILE;
    const cz = (room.rect.z + room.rect.d / 2) * TILE;
    const above = PLAN_WALL_H + 6;
    // **Beide Seiten einzeln gemessen**, und erst dann auf das Seitenverhältnis
    // aufgeblasen. Vorher stand hier die längere Seite für beide, und ein
    // 4×2-Zimmer lag als schmaler Streifen in der Mitte eines halbleeren
    // Blattes — auf einem Telefon ist das die Hälfte des Bildschirms für nichts.
    // **Ein Rand, der das Zimmer nicht anstößt.** Die Wandlinien liegen auf den
    // Kachelkanten und ragen zur Hälfte nach draußen; ein Blatt, das genau am
    // Zimmer endet, schneidet sie an. Ein halbes Feld Luft ringsum ist der
    // Unterschied zwischen „der Grundriss steht im Bild" und „der Grundriss
    // klebt am Rand" — und auf einem Telefon ist genau das die Frage, ob man
    // ihn ganz sieht.
    const padX = framed(room.rect.w * TILE);
    const padZ = framed(room.rect.d * TILE);
    // **Eingepasst wird in die freie Fläche, nicht in das Bild.** Oben liegen
    // Kopfzeile und Auftragsstreifen darüber; ein Zimmer, das genau das Bild
    // füllt, steckt mit seiner Nordwand dahinter. Also wird für die Fläche
    // *unter* den Zeilen gerechnet und der Ausschnitt danach nach oben
    // verlängert — das Zimmer rutscht nach unten, und oben bleibt frei, was
    // ohnehin verdeckt ist.
    const free = Math.max(0.2, 1 - head);
    const half = Math.max(padX, (padZ * aspect) / free);
    const tall = half / aspect;
    const sheet = tall * free;
    // **Das eingepasste Blatt ist das Maß für alles Weitere.** Es ändert sich
    // mit dem Zimmer und mit der Form des Fensters; ein Ausschnitt, der auf
    // dem vorigen Blatt erlaubt war, hängt sonst halb daneben (`fitView`).
    this.archiveFit = { half, sheet, tall };
    const view = fitView(this.archive, half, sheet);
    this.archive = view;
    const hw = half / view.zoom;
    const hh = tall / view.zoom;
    // Die halbe verdeckte Höhe, in Metern: So weit rückt die Kamera nach
    // Norden, damit das Zimmer unter den Zeilen hervorkommt.
    const lift = hh * head;
    // Verschoben wird die Kamera und nicht das Blatt: Die Maske ringsum rechnet
    // ohnehin von der Kameramitte aus, und ein verschobenes Blatt wäre eine
    // zweite Wahrheit darüber, wo das Zimmer steht.
    camera.position.set(cx + view.x, above, cz + view.z - lift);
    camera.left = -hw;
    camera.right = hw;
    camera.top = hh;
    camera.bottom = -hh;
    // **Unter dem Türsturz und nicht unter der Decke** (`PAPER_CUT`): Über jeder
    // Tür steht eine Wandscheibe bis an die Decke, und von oben sieht sie aus
    // wie Wand. Wer nur den Deckel abnimmt, legt ein Haus frei, in dem jede
    // Tür zugemauert ist.
    camera.near = above - PAPER_CUT;
    camera.far = above + 2;
    camera.updateProjectionMatrix();
    this.maskAround(room.rect, camera.position.x, camera.position.z, hw, hh);
  }

  /**
   * **Näher heran ans Blatt** — die Zange auf dem Telefon, das Rad am Laptop.
   *
   * Der Anschlag steckt in `archiveView.ts` und nicht hier: Wie weit ein
   * Archivar heranziehen darf, ist eine Regel und keine Kameraeinstellung.
   */
  private zoomArchive(factor: number): void {
    const { half, sheet } = this.archiveFit;
    this.archive = zoomedView(this.archive, factor, half, sheet);
  }

  /**
   * **Und das Blatt darunter durchschieben.**
   *
   * Herein kommen Anteile des Bildes (`StationHost.archivePan`), gerechnet
   * wird in Metern: Eine ganze Bildbreite ist `2 · half / zoom` Meter, und
   * genau deshalb schiebt derselbe Wisch im Zoom weniger weit — das Blatt
   * folgt dem Finger und nicht einer Zahl.
   *
   * **Umgekehrtes Vorzeichen**, weil der Finger das Blatt zieht und nicht die
   * Kamera: Wer nach rechts wischt, schiebt das Zimmer nach rechts, also die
   * Kamera nach links.
   */
  private panArchive(dx: number, dz: number): void {
    const { half, sheet, tall } = this.archiveFit;
    const zoom = this.archive.zoom;
    this.archive = pannedView(
      this.archive,
      (-dx * 2 * half) / zoom,
      (-dz * 2 * tall) / zoom,
      half,
      sheet,
    );
  }

  /**
   * Die vier Flächen um das aufgeschlagene Zimmer legen.
   *
   * Ein Rand von einer halben Wandstärke bleibt frei: Die Wände sitzen auf den
   * Kachelkanten und ragen zur Hälfte nach draußen — ohne den Rand wäre das
   * Zimmer auf dem Blatt eines ohne Wände.
   */
  private maskAround(rect: Rect, cx: number, cz: number, hw: number, hh: number): void {
    // **Genau eine halbe Wandstärke**, und keinen Zentimeter mehr: Die Wände
    // sitzen auf den Kachelkanten und ragen zur Hälfte nach draußen, also
    // endet das Blatt an ihrer Außenkante. Vorher stand hier eine ganze
    // Wandstärke, und in dem Streifen dazwischen schaute der Boden des
    // Nachbarzimmers hervor — ein zweiter heller Rand um den ersten, der wie
    // eine doppelte Wand aussah.
    const edge = PLAN_WALL_T / 2;
    const x0 = rect.x * TILE - edge;
    const x1 = (rect.x + rect.w) * TILE + edge;
    const z0 = rect.z * TILE - edge;
    const z1 = (rect.z + rect.d) * TILE + edge;
    // **Knapp unter dem Schnitt und mit ihm zusammen gewandert.** Die Flächen
    // müssen unter der vorderen Kappe liegen, sonst schneidet die Kamera das
    // Blatt weg statt die Decke — und der Archivar sähe das halbe Haus. Sie
    // dürfen aber auch nicht tiefer als nötig hängen: Was zwischen ihnen und
    // dem Schnitt steht, bleibt sichtbar. Die Türzeichen liegen eine Handbreit
    // darüber (`PAPER_MARK_Y`) und werden deshalb nicht zugedeckt.
    const y = PAPER_CUT - 0.03;
    const spans: Array<[number, number, number, number]> = [
      [cx - hw, cz - hh, cx + hw, z0],
      [cx - hw, z1, cx + hw, cz + hh],
      [cx - hw, z0, x0, z1],
      [x1, z0, cx + hw, z1],
    ];
    this.paperMask.children.forEach((quad, index) => {
      const [ax, az, bx, bz] = spans[index]!;
      const w = Math.max(0, bx - ax);
      const d = Math.max(0, bz - az);
      quad.scale.set(Math.max(w, 0.001), Math.max(d, 0.001), 1);
      quad.position.set((ax + bx) / 2, y, (az + bz) / 2);
      quad.visible = w > 0.001 && d > 0.001;
    });
  }

  // --- das Menü in der Brille ------------------------------------------------

  override menu(): MenuEntry[] {
    if (this.context?.role !== 'vr')
      return [
        {
          id: 'haunt:technician',
          label: 'Als Techniker am Desktop testen',
          sub: 'Übernimmt die VR-Rolle ohne Headset · WASD und Maus',
          icon: 'cube',
          accent: 0x65dce5,
          run: () => {
            this.flatTechnician = true;
          },
        },
      ];
    const entry = (id: string, label: string, sub: string, run: () => void): MenuEntry => ({
      id,
      label,
      sub,
      icon: 'cube',
      accent: 0x65dce5,
      run,
    });
    return [
      entry(
        'haunt:start',
        'Mission starten',
        'Drei Systeme reparieren und zur Zentrale zurückkehren',
        () => this.startMission(),
      ),
      entry(
        'haunt:test',
        'TEST / ohne Monster',
        'Sicher üben · Ausrüstung und beleuchtetes Testlabor',
        () => this.testMission(),
      ),
      entry(
        'haunt:light',
        `Testlicht: ${this.state.crew.options.bright ? 'an' : 'aus'}`,
        'Auch im Dunkeln ohne Monster testen',
        () => {
          if (this.state.crew.options.test)
            this.state.crew.options.bright = !this.state.crew.options.bright;
        },
      ),
      entry(
        'haunt:rooms',
        `Station: ${this.state.crew.options.rooms} Räume`,
        '6 / 8 / 10 / 12 · neue Station',
        () =>
          this.configureStation({
            ...this.state.crew.options,
            rooms: ROOM_COUNTS[(ROOM_COUNTS.indexOf(this.state.crew.options.rooms as 6) + 1) % 4]!,
          }),
      ),
      entry(
        'haunt:monster-kind',
        `Gegner: ${MONSTERS.find((m) => m.id === this.state.crew.options.monster)!.name}`,
        'Drei Erscheinungen mit anderem Tempo und Schachtverhalten',
        () =>
          this.configureStation({
            ...this.state.crew.options,
            monster:
              MONSTERS[
                (MONSTERS.findIndex((m) => m.id === this.state.crew.options.monster) + 1) %
                  MONSTERS.length
              ]!.id,
          }),
      ),
      ...(this.experience?.menu() ?? []),
    ];
  }

  private joinTable(ctx: WorldContext): void {
    if (!ctx.net.connected)
      ctx.join(new URLSearchParams(location.search).get('room') || HAUNT_ROOM);
  }

  private removeMonster(): void {
    if (this.monsterArt) {
      this.monsterArt.removeFromParent();
      dispose(this.monsterArt);
      this.monsterArt = null;
    }
    this.director?.clear();
    this.monster = null;
    this.state.monster = null;
    this.state.monsterOn = false;
    this.ventExit = null;
    this.ventClock = 0;
    this.state.crew.venting = 0;
  }

  private startMission(): void {
    if (!this.isHost || this.context?.role !== 'vr') return;
    const options = { ...this.state.crew.options, test: false, bright: false };
    this.newRound(options);
    this.state.phase = 'running';
    this.state.monsterOn = true;
    const far = roomOf(this.spec, this.spec.fuse.roomId) ?? this.spec.rooms[0]!;
    const at = roomCentre(far);
    const kind = MONSTERS.find((m) => m.id === options.monster)!;
    this.monster =
      this.director?.spawn({
        kind: 'zombie',
        brain: 'chase',
        speed: kind.speed,
        health: 10000,
        at: new THREE.Vector3((at.x + 0.5) * TILE, 0, (at.z + 0.5) * TILE),
      }) ?? null;
    if (this.monster) {
      this.monster.model.visible = false;
      this.monsterArt = buildCreature(options.monster);
      this.monsterArt.position.y = -this.monster.skin.height / 2;
      this.monster.holder.add(this.monsterArt);
    }
    this.state.lit = [this.spec.entryRoom];
    this.announce(
      'Mission läuft. Archiv: Aufträge und Codes. Einsatzkontrolle: Radar, Puls, Licht und Türen. Nach drei Reparaturen zurück zur Zentrale.',
    );
  }

  private testMission(): void {
    if (!this.isHost || this.context?.role !== 'vr') return;
    this.newRound({ ...this.state.crew.options, test: true, bright: true });
    this.state.phase = 'running';
    this.state.crew.opened = ['test-supply'];
    this.announce(
      'TEST AKTIV · Kein Monster, kein Schaden. Testschrank rechts ist bestückt; Labor geöffnet. Testlicht lässt sich abschalten.',
    );
  }

  private configureStation(options: StationOptions): void {
    if (!this.isHost || this.context?.role !== 'vr') return;
    this.newRound(stationOptions(options));
    this.announce(
      `Neue Station: ${this.spec.rooms.length} Räume. Mission oder sicheren Test wählen.`,
    );
  }

  private newRound(options: StationOptions = this.state.crew.options): void {
    if (!this.isHost) return;
    this.removeMonster();
    this.spook = freshSpook();
    this.spec = generateHouse(rollSeed(), options.rooms);
    this.state = freshState(this.spec.seed, options);
    this.previousFeet = null;
    this.grid?.replaceWith(housePlan(this.spec, new Set(), options.test));
    this.builtDoors = '?';
    if (this.blob) {
      dispose(this.blob);
      this.blob.removeFromParent();
      this.blob = null;
    }
    this.buildHouse();
    this.parkDrone();
    if (this.context) this.movePlayerTo(this.context, this.spawnPoint());
    this.context?.net.emit(HAUNT_CHANNEL, stateMessage(this.state));
    this.context?.refreshWorldMenu();
  }
}

/**
 * **Eine Gruppe leeren und dabei wirklich freigeben.**
 *
 * `Group.clear()` nimmt die Kinder heraus und lässt Geometrien und Materialien
 * im Grafikspeicher stehen. Bei einer Welt, die man einmal betritt, fällt das
 * nie auf; bei einer, die je Runde ein neues Haus baut, ist es nach dem
 * fünften Abend das Haus, das nicht mehr lädt.
 */
function dispose(group: THREE.Object3D): void {
  for (const child of [...group.children]) {
    child.traverse((one) => {
      const mesh = one as Partial<THREE.Mesh>;
      mesh.geometry?.dispose();
      const material = mesh.material;
      for (const part of Array.isArray(material) ? material : material ? [material] : []) {
        (part as THREE.MeshBasicMaterial).map?.dispose();
        part.dispose();
      }
    });
    group.remove(child);
  }
}

/** Eine Uhr, die auch dann weiterläuft, wenn dieser Tab keine Bilder bekommt. */
function clock(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function freshState(seed: number, options: StationOptions = stationOptions(null)): HauntState {
  return {
    seed,
    phase: 'briefing',
    crew: freshCrew(options),
    time: 0,
    monsterOn: false,
    monster: null,
    shut: [],
    lit: [],
    loud: [],
    fuse: false,
    taken: [],
    done: [],
  };
}

/**
 * **Wo eine Tür wirklich sitzt** — auf der Kante und nicht auf der Kachel.
 *
 * Der Bauplan sagt „an dieser Kachel, in dieser Richtung"; gezeichnet wird auf
 * der Kante dazwischen. Der Späherschirm setzt seinen Punkt großzügig in die
 * Kachelmitte, weil dort ein Pixel reicht — auf dem Blatt des Archivars läge
 * das Zeichen dann anderthalb Meter neben der Tür, mitten im Zimmer.
 *
 * `alongX` sagt, wie die Kante liegt: nach Norden und Süden läuft sie quer
 * (entlang X), nach Osten und Westen längs. Dieselbe Unterscheidung wie beim
 * Bauen der Wände (`levelBuild`), und aus demselben Grund.
 */
function doorEdge(door: { x: number; z: number; dir: Dir }): {
  x: number;
  z: number;
  alongX: boolean;
} {
  return edgeCentre(door.x, door.z, door.dir);
}

/**
 * Die Mitte einer Kachelkante, in Metern — und wie sie liegt.
 *
 * `alongX` sagt, ob die Kante quer läuft (nach Norden und Süden) oder längs
 * (nach Osten und Westen). Dieselbe Unterscheidung wie beim Bauen der Wände
 * (`levelBuild`), und aus demselben Grund: Danach richtet sich jedes Rechteck,
 * das auf einer Wand liegt.
 */
function edgeCentre(x: number, z: number, dir: Dir): { x: number; z: number; alongX: boolean } {
  const alongX = dir === DIR_N || dir === DIR_S;
  return {
    x: (x + (dir === DIR_E ? 1 : alongX ? 0.5 : 0)) * TILE,
    z: (z + (dir === DIR_S ? 1 : alongX ? 0 : 0.5)) * TILE,
    alongX,
  };
}

/**
 * **Wie viel Luft ein Zimmer auf dem Blatt ringsum bekommt** — halbe Kante
 * plus Rand, in Metern.
 *
 * Anteilig und nicht als feste Zahl: Ein fester Rand von anderthalb Metern ist
 * bei einem 15-Meter-Saal ein Strich und bei einer 5-Meter-Kammer ein Drittel
 * des Blattes. Der Anteil hält beide Blätter gleich voll; der Mindestrand
 * sorgt dafür, dass die Wandlinie nicht die Bildkante anschneidet — sie liegt
 * auf der Kachelkante und ragt zur Hälfte nach draußen.
 */
function framed(size: number): number {
  return size / 2 + Math.max(TILE * 0.25, size * 0.06);
}

/** Ob eine Kachel in einem Rechteck liegt — für „ist das noch das Haus?". */
function inside(rect: Rect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.w && z >= rect.z && z < rect.z + rect.d;
}
