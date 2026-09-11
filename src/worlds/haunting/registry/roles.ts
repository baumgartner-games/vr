import type { PlayerRole } from '../../../core/types';
import { Registry, type Registered } from './registry';

/**
 * **Die Rollen in der Einsatzzentrale** — Archiv, Schalttafel, Späher,
 * Zuschauer, Monster und was die Nacht noch bringt.
 *
 * Bis vor Kurzem stand diese Liste als `StationId`-Union plus `STATIONS`-Array
 * in `stations.ts` und wurde in `stationUi.ts` per `if (station === …)`
 * verteilt. Heute meldet **jede Rolle sich selbst an**, aus einer eigenen
 * `*.register.ts`-Datei (`views/`, `monster/`); `stations.ts` kennt nur noch
 * die Stühle, und `stationUi.ts` baut die Seite aus dieser Registry.
 *
 * Eine Rolle ist Fakten plus ein `mount`, das ihre Ansicht baut. Das `mount`
 * bekommt einen `RoleHost`: den Stand als Karte, den Grundriss, die drei
 * Griffe der Schalttafel — und sonst nichts. Wer mehr braucht (das Monster
 * sein Steuer, der Archivar sein Loch in die 3D-Welt), holt es über
 * `host.extra`.
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
  /**
   * Der Grundriss mit allem, was nicht auf der Karte steht: Codes,
   * Fundhinweise, Rätsel. Nur der Archivar braucht ihn — und er ist der
   * Grund, aus dem es die Rolle gibt.
   */
  spec(): import('../house').HouseSpec;
  /** Meine Peer-Id. */
  me(): string;
  nameOf(peer: string): string;
  /**
   * **Die drei Griffe der Schalttafel**, jeder mit der Zeile, die er dem
   * Spieler sagt — `''` heißt: dafür gibt es keinen Schalter (die Hälfte der
   * Tafel liegt hinter dem Sicherungskasten, `panel.ts`).
   */
  door(doorId: string): string;
  light(roomId: string): string;
  lure(roomId: string): string;
  notify(message: string): void;
  /**
   * Was der Wirt darüber hinaus kann. Bewusst untypisiert an dieser Stelle:
   * Das Monster holt sich hier sein Steuer, der Archivar sein Loch für die
   * 3D-Welt; wer beides nicht braucht, sieht nichts davon.
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
   * **Wohin die Welt ihr Bild zeichnen soll**, in Bildpunkten — oder `null`,
   * wenn gerade keine Kamera gebraucht wird.
   *
   * Nicht nur für `surface: '3d'`: Der Archivar ist eine Karte und macht für
   * seine Raumakte trotzdem ein Loch auf, durch das die 3D-Welt das
   * aufgeschlagene Zimmer zeichnet. In der 2D-Welt gibt es diese Kamera nicht;
   * dort steht dieselbe Akte über einer herangezoomten Karte, und `viewport`
   * bleibt `null`.
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
