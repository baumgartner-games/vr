/**
 * Woraus ein Objekt ist — und was das für die Physik heißt.
 *
 * Der Pinsel konnte bisher nur eine Farbe geben, und Farbe ist die eine
 * Eigenschaft, die man in der Brille sofort sieht und die *nichts* ändert. Ein
 * Sandkasten will die andere Hälfte: eine Kiste aus Gummi springt, eine aus
 * Eis rutscht, eine aus Metall glänzt und wiegt schwerer in der Hand. Deshalb
 * hat der Pinsel jetzt zwei Seiten — **Farben** und **Material** —, und ein
 * Material ist beides zugleich: wie es aussieht und wie es sich verhält.
 *
 * Reine Daten, kein three.js und kein Rapier: was `roughness` und `friction`
 * daraus machen, ist Sache von `PortalWorld.styleProp`. Die IDs gehen über das
 * Netz, sie sind also Teil des Protokolls und werden nicht umbenannt.
 */

export interface SurfaceMaterial {
  /** Geht über das Netz — bleibt, wie es ist. */
  id: string;
  label: string;
  /** 0 = Spiegel, 1 = Kreide. */
  roughness: number;
  metalness: number;
  /** 1 = undurchsichtig. */
  opacity: number;
  /** Wie stark das Material von sich aus leuchtet, 0 bis 1. */
  glow: number;
  friction: number;
  /** Rückprall: 0 ist ein Sandsack, 0,9 ein Flummi. */
  bounce: number;
  /** Was es in einem Satz ist. */
  sub: string;
}

/**
 * Die Materialien, die zur Wahl stehen. „Lack" ist der Auslieferungszustand
 * jedes Props — es muss einen Weg zurück geben, sonst ist jeder Pinselstrich
 * endgültig.
 */
export const MATERIALS: readonly SurfaceMaterial[] = [
  {
    id: 'paint',
    label: 'Lack',
    roughness: 0.45,
    metalness: 0.15,
    opacity: 1,
    glow: 0,
    friction: 0.7,
    bounce: 0.05,
    sub: 'Wie ausgeliefert',
  },
  {
    id: 'metal',
    label: 'Metall',
    roughness: 0.18,
    metalness: 0.95,
    opacity: 1,
    glow: 0,
    friction: 0.5,
    bounce: 0.15,
    sub: 'Glänzt, rutscht ein wenig',
  },
  {
    id: 'rubber',
    label: 'Gummi',
    roughness: 0.95,
    metalness: 0,
    opacity: 1,
    glow: 0,
    friction: 1.4,
    bounce: 0.75,
    sub: 'Springt und hält',
  },
  {
    id: 'ice',
    label: 'Eis',
    roughness: 0.08,
    metalness: 0.1,
    opacity: 0.72,
    glow: 0.04,
    friction: 0.02,
    bounce: 0.1,
    sub: 'Fast keine Reibung',
  },
  {
    id: 'stone',
    label: 'Stein',
    roughness: 1,
    metalness: 0,
    opacity: 1,
    glow: 0,
    friction: 0.9,
    bounce: 0.02,
    sub: 'Stumpf und schwer',
  },
  {
    id: 'glass',
    label: 'Glas',
    roughness: 0.05,
    metalness: 0.1,
    opacity: 0.35,
    glow: 0,
    friction: 0.25,
    bounce: 0.25,
    sub: 'Durchsichtig',
  },
  {
    id: 'glow',
    label: 'Leuchtend',
    roughness: 0.6,
    metalness: 0,
    opacity: 1,
    glow: 0.9,
    friction: 0.7,
    bounce: 0.05,
    sub: 'Leuchtet von selbst',
  },
  {
    id: 'foam',
    label: 'Schaum',
    roughness: 1,
    metalness: 0,
    opacity: 1,
    glow: 0,
    friction: 1.1,
    bounce: 0,
    sub: 'Schluckt jeden Stoß',
  },
];

export const DEFAULT_MATERIAL: SurfaceMaterial = MATERIALS[0]!;

/** Das Material zu einer Id — Unbekanntes wird zu Lack, nie zu `undefined`. */
export function findMaterial(id: string | null | undefined): SurfaceMaterial {
  return MATERIALS.find((material) => material.id === id) ?? DEFAULT_MATERIAL;
}

/** Braucht dieses Material eine durchsichtige Fläche? */
export function isTransparent(material: SurfaceMaterial): boolean {
  return material.opacity < 1;
}
