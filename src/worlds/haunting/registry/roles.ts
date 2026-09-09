import type { PlayerRole } from '../../../core/types';
import { Registry, type Registered } from './registry';

/**
 * **Die Rollen im Van** — Archiv, Schalttafel, Späher, Zuschauer und
 * was die Nacht noch bringt.
 *
 * Die Sitzplätze (`StationId`, `STATIONS` in `stations.ts`) bleiben die
 * Liste, die über die Leitung geht; **was eine Rolle zeigt**, kommt aus
 * dieser Registry, je Rolle aus einer eigenen `*.register.ts`-Datei
 * (`views/`). `stationUi.ts` holt sich das `mount` zur Kennung des Platzes
 * und braucht keinen Switch mehr.
 *
 * Eine Rolle ist Fakten plus ein `mount`, das ihre Ansicht baut. Das `mount`
 * bekommt einen `RoleHost` — dieselbe Handvoll Getter und Aktionen, die
 * `StationHost` in `stationUi.ts` anbietet, ohne die Archivspezialitäten.
 * Wer die braucht, holt sie sich über `host.extra`.
 */
export interface RoleFacts extends Registered {
  readonly id: string;
  label: string;
  /** Eine Zeile, die sagt, was man hier tut. */
  tagline: string;
  /** Was diese Rolle sieht — und was ausdrücklich nicht. */
  sees: string;
  /** Welche Endgeräte sie annimmt; leer heißt alle Nicht-VR. */
  roles?: PlayerRole[];
  /** Ob mehrere gleichzeitig daran dürfen (der Fernseher). */
  shared?: boolean;
  /**
   * Was die Rolle zum Zeichnen braucht: `'dom'` nur Seiten, `'map'` die
   * 2D-Karte, `'3d'` eine three.js-Kamera (Drohne, Archivblatt, Fernseher).
   */
  surface: 'dom' | 'map' | '3d';
  /**
   * Ob sie in der Rollenwahl steht. Verborgene Rollen (`hack` als Altname)
   * sind erreichbar, aber nicht angeboten.
   */
  hidden?: boolean;
}

/** Was eine Rollenansicht von der Welt bekommt — lesend und mit Aktionen. */
export interface RoleHost {
  /** Der Stand der Runde, jederzeit frisch. */
  snapshot(): import('../map/mapSnapshot').MapSnapshot;
  /** Meine Peer-Id. */
  me(): string;
  nameOf(peer: string): string;
  /** Die Aktionen, die eine Rolle auslösen darf. */
  flip(switchId: string, on: boolean): void;
  notify(message: string): void;
  /**
   * Was `StationHost` darüber hinaus kann. Bewusst untypisiert an dieser
   * Stelle: Die Altrollen kennen ihre Extras, neue Rollen sollen keine brauchen.
   */
  extra?: unknown;
}

/** Was eine gebaute Rollenansicht zurückgibt. */
export interface RoleView {
  element: HTMLElement;
  /** Wird aus dem Takt der Welt gerufen, gedrosselt auf Telefonrate. */
  update(dt: number): void;
  dispose(): void;
  /**
   * Nur bei `surface: '3d'`: wohin die Welt zeichnen soll, in Bildpunkten,
   * oder `null`, wenn gerade keine Kamera gebraucht wird.
   */
  viewport?(): { x: number; y: number; w: number; h: number } | null;
}

export interface RoleDefinition extends RoleFacts {
  mount(host: RoleHost): RoleView;
}

export const roles = new Registry<RoleDefinition>('roles');

export function registerRole(role: RoleDefinition): RoleDefinition {
  return roles.register(role);
}

export function listRoles(): RoleDefinition[] {
  return roles.list().filter((role) => !role.hidden);
}
