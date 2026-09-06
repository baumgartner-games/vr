/**
 * **Was man von der Navigation sehen kann** — fünf Ebenen, einzeln
 * schaltbar.
 *
 * Alles auf einmal ist bei ein paar hundert Kacheln eine Wolke aus Linien, in
 * der man nichts mehr findet. Wer wissen will, warum ein Zombie stehen bleibt,
 * schaltet die Sperren an und alles andere aus; wer den Umweg sehen will, nur
 * die Wege. Das ist der ganze Grund, warum es fünf sind und nicht eine.
 *
 * Reine Daten und ein Zustand aus fünf Wahrheitswerten — kein three.js, damit
 * die Beschriftungen, die Voreinstellung und das Umschalten geprüft sind, bevor
 * jemand einen Knopf dafür an die Wand schraubt (`navLayers.test.ts`).
 */

export type NavLayer = 'tiles' | 'walls' | 'links' | 'blocked' | 'paths';

export interface NavLayerSpec {
  id: NavLayer;
  label: string;
  /** Was darauf zu sehen ist, in ein paar Worten. */
  sub: string;
  /** Die Farbe, in der diese Ebene gezeichnet wird. */
  color: number;
}

export const NAV_LAYERS: readonly NavLayerSpec[] = [
  {
    id: 'tiles',
    label: 'Kacheln',
    sub: 'Wo überhaupt Boden ist',
    color: 0x39d0ff,
  },
  {
    id: 'walls',
    label: 'Wände',
    sub: 'Was den Weg sperrt — Kanten in Gelb',
    color: 0xff5a5a,
  },
  {
    id: 'links',
    label: 'Verbindungen',
    sub: 'Treppen, Absprünge, Portale',
    color: 0x9d7bff,
  },
  {
    id: 'blocked',
    label: 'Sperren',
    sub: 'Was gerade im Weg steht',
    color: 0xff3bd0,
  },
  {
    id: 'paths',
    label: 'Wege',
    sub: 'Was die NPCs gerade laufen',
    color: 0x5ee0a0,
  },
];

export const NAV_LAYER_IDS: readonly NavLayer[] = NAV_LAYERS.map((layer) => layer.id);

export function layerSpec(id: string | undefined): NavLayerSpec {
  return NAV_LAYERS.find((layer) => layer.id === id) ?? NAV_LAYERS[0]!;
}

export type NavLayerState = Record<NavLayer, boolean>;

/**
 * Die Voreinstellung: **Kacheln und Wege**.
 *
 * Die beiden beantworten zusammen die Frage, die man zuerst hat — „wo kann er
 * hin, und wo will er gerade hin". Wände, Verbindungen und Sperren sind die
 * Antworten auf „warum nicht dorthin", und die braucht man erst, wenn etwas
 * nicht stimmt.
 */
export function defaultLayers(): NavLayerState {
  return { tiles: true, walls: false, links: false, blocked: false, paths: true };
}

export function noLayers(): NavLayerState {
  return { tiles: false, walls: false, links: false, blocked: false, paths: false };
}

export function allLayers(): NavLayerState {
  return { tiles: true, walls: true, links: true, blocked: true, paths: true };
}

/** Schaltet eine Ebene um und gibt zurück, ob sie jetzt an ist. */
export function toggleLayer(state: NavLayerState, id: NavLayer): boolean {
  state[id] = !state[id];
  return state[id];
}

/** Ob überhaupt etwas zu sehen ist. */
export function anyLayer(state: Readonly<NavLayerState>): boolean {
  return NAV_LAYER_IDS.some((id) => state[id]);
}

/**
 * Was gerade an ist, als Zeile — für die Meldung und die Unterzeile im Menü.
 *
 * „Aus", wenn nichts an ist: Eine leere Aufzählung liest sich wie ein Fehler.
 */
export function layerSummary(state: Readonly<NavLayerState>): string {
  const on = NAV_LAYERS.filter((layer) => state[layer.id]).map((layer) => layer.label);
  return on.length === 0 ? 'Aus' : on.join(' · ');
}

/**
 * Der nächste sinnvolle Sprung für einen einzelnen Schalter: alles an, wenn
 * gerade nichts an ist — sonst alles aus.
 *
 * Das ist, was ein Schalter „Navigation" tut, wenn es daneben fünf einzelne
 * gibt: Er ist der große Griff, nicht der sechste Feinregler.
 */
export function nextAll(state: Readonly<NavLayerState>): NavLayerState {
  return anyLayer(state) ? noLayers() : defaultLayers();
}
