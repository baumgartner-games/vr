import { emptySnapshot, type MapSnapshot } from './mapSnapshot';
import { emptyField, type VisibilityField, type VisibilityMode } from './visibility';

/**
 * **Die Karte als Bauteil** — ein Canvas im DOM, das einen `MapSnapshot`
 * zeichnet und Berührungen zurückgibt.
 *
 * Sie weiß nichts von Rollen. Was sie zeigt, sagen ihr die **Layer**; was
 * sie mit einem Tipp tut, sagen ihr die **Handler**. Die Schalttafel baut
 * eine ohne Spieler- und Monstermarker (`layers.entities = false`), der
 * Späher eine mit gedrosselten Markern (`markers: { hz: 2 }`), die 2D-Welt
 * eine mit allem und dem Sichtbarkeitsfeld darüber. Dieselbe Klasse, drei
 * Einstellungen — nicht drei Klassen.
 *
 * **Pan und Pinch-Zoom** sind eingebaut (`MapViewState`), nicht die Sache
 * der Rollenansicht. Wer die Kamera führen will (die 2D-Welt folgt dem
 * Spieler), setzt `follow`; wer sie loslässt, bekommt die Gesten.
 *
 * **Phase 1 (`feat/map-core`)** füllt Zeichnen und Gesten. Die Schnittstelle
 * hier ist der Vertrag; die Methoden sind bis dahin bewusst leer, damit
 * Rollenansichten sie schon aufrufen und headless testen können.
 */

/** Welche Schichten gezeichnet werden. Alles `true` ist die 2D-Welt. */
export interface MapLayers {
  rooms: boolean;
  /** Raumnamen als Beschriftung. */
  labels: boolean;
  doors: boolean;
  lights: boolean;
  /** Fracht, Konsolen, Schränke, Aufgaben. */
  items: boolean;
  /** Spieler, Bot, Monster, Drohne, Mitspieler — als Ganzes. */
  entities: boolean;
  /** Das Sichtbarkeitsfeld darüber: Licht, Dunkel, Kegel, Geräusch. */
  visibility: boolean;
  /** Wegstrecken, wenn das Navmesh-Paket welche liefert. */
  routes: boolean;
}

export const ALL_LAYERS: Readonly<MapLayers> = {
  rooms: true,
  labels: true,
  doors: true,
  lights: true,
  items: true,
  entities: true,
  visibility: true,
  routes: false,
};

/** Die Schalttafel: Räume, Türen, Lichter — niemand, der sich bewegt. */
export const PANEL_LAYERS: Readonly<MapLayers> = {
  ...ALL_LAYERS,
  items: false,
  entities: false,
  visibility: false,
};

/**
 * Wie oft Marker nachgeführt werden. `'live'` mit jedem Snapshot,
 * `'none'` gar nicht (Marker werden nicht gezeichnet, auch wenn der Layer
 * an ist), `{ hz }` gedrosselt: Der Späher sieht das Monster als Punkt, der
 * springt, nicht als Punkt, der läuft.
 */
export type MarkerPolicy = 'live' | 'none' | { hz: number };

/** Wo die Karte hinschaut: Mitte in Metern, Zoom in Pixeln je Meter. */
export interface MapViewState {
  centreX: number;
  centreZ: number;
  /** Bildpunkte je Meter, in Gerätepunkten (vor der Pixeldichte). */
  scale: number;
  /** Drehung der Karte in Bogenmaß; 0 heißt Norden oben. */
  rotation: number;
}

export interface MapViewOptions {
  layers?: Partial<MapLayers>;
  markers?: MarkerPolicy;
  /** Ob Pan und Pinch-Zoom des Nutzers angenommen werden. */
  gestures?: boolean;
  /** Grenzen des Zooms in Pixeln je Meter. */
  minScale?: number;
  maxScale?: number;
  /** Womit die Karte anfängt — sonst das ganze Haus im Bild. */
  view?: Partial<MapViewState>;
  /** Der Modus des Sichtbarkeitsfelds, wenn der Layer an ist. */
  mode?: VisibilityMode;
  onRoomClick?: (roomId: string, at: { x: number; z: number }) => void;
  onEntityClick?: (entityId: string) => void;
  onDoorClick?: (doorId: string) => void;
  onLightClick?: (lightId: string) => void;
  onItemClick?: (itemId: string) => void;
  /** Ein Tipp ins Leere — Boden ohne Raum. */
  onGroundClick?: (at: { x: number; z: number }) => void;
  /** Der Nutzer hat gezogen oder gezoomt; `follow` ist damit aus. */
  onViewChange?: (view: MapViewState) => void;
}

export class MapView {
  /** Das Element, das in die Seite gehängt wird. Größe kommt aus dem CSS. */
  readonly element: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private snapshot: MapSnapshot = emptySnapshot();
  private field: VisibilityField;
  private layers: MapLayers;
  private markers: MarkerPolicy;
  private state: MapViewState = { centreX: 0, centreZ: 0, scale: 12, rotation: 0 };
  private following: string | null = null;

  constructor(private readonly options: MapViewOptions = {}) {
    this.layers = { ...ALL_LAYERS, ...options.layers };
    this.markers = options.markers ?? 'live';
    this.field = emptyField(options.mode ?? 'realistic');
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mapview__canvas';
    this.element = document.createElement('div');
    this.element.className = 'mapview';
    this.element.append(this.canvas);
    if (options.view) this.state = { ...this.state, ...options.view };
  }

  /** Einen neuen Zustand hineingeben. Zeichnet beim nächsten Bild. */
  setSnapshot(snapshot: MapSnapshot): void {
    this.snapshot = snapshot;
  }

  /** Das Sichtbarkeitsfeld dazu — von `visibility.ts`, nicht selbst gerechnet. */
  setVisibility(field: VisibilityField): void {
    this.field = field;
  }

  setLayers(layers: Partial<MapLayers>): void {
    this.layers = { ...this.layers, ...layers };
  }

  setMarkers(policy: MarkerPolicy): void {
    this.markers = policy;
  }

  /** Die Kamera setzen — schaltet `follow` aus. */
  setView(view: Partial<MapViewState>): void {
    this.following = null;
    this.state = { ...this.state, ...view };
  }

  getView(): MapViewState {
    return { ...this.state };
  }

  /** Der Kamera ein Wesen nachführen; `null` lässt sie los. */
  follow(entityId: string | null): void {
    this.following = entityId;
  }

  /** Das ganze Haus ins Bild. */
  fit(): void {
    this.following = null;
  }

  /** Ein Bild zeichnen. Die Ansicht ruft das aus ihrem Takt — nicht die Karte. */
  draw(): void {
    // Phase 1.
  }

  /** Von Bildpunkten (relativ zum Canvas) in Meter. */
  toWorld(px: number, py: number): { x: number; z: number } {
    const rect = this.canvas.getBoundingClientRect();
    const cos = Math.cos(this.state.rotation),
      sin = Math.sin(this.state.rotation);
    const dx = (px - rect.width / 2) / this.state.scale;
    const dy = (py - rect.height / 2) / this.state.scale;
    return {
      x: this.state.centreX + dx * cos - dy * sin,
      z: this.state.centreZ + dx * sin + dy * cos,
    };
  }

  /** Und zurück: Meter in Bildpunkte relativ zum Canvas. */
  toScreen(x: number, z: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const cos = Math.cos(this.state.rotation),
      sin = Math.sin(this.state.rotation);
    const dx = x - this.state.centreX,
      dz = z - this.state.centreZ;
    return {
      x: rect.width / 2 + (dx * cos + dz * sin) * this.state.scale,
      y: rect.height / 2 + (-dx * sin + dz * cos) * this.state.scale,
    };
  }

  dispose(): void {
    this.element.remove();
  }

  /** Nur für Tests und Ansichten, die wissen wollen, was gerade drin ist. */
  get current(): {
    snapshot: MapSnapshot;
    field: VisibilityField;
    layers: MapLayers;
    markers: MarkerPolicy;
    following: string | null;
    gestures: boolean;
  } {
    return {
      snapshot: this.snapshot,
      field: this.field,
      layers: { ...this.layers },
      markers: this.markers,
      following: this.following,
      gestures: this.options.gestures ?? true,
    };
  }
}
