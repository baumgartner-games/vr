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
 * bekommt einen `RoleHost`: den Stand als Karte, den Grundriss, die zwei
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
  /**
   * **Die Buchführung der Runde** (`rules/archiveGoals.ArchiveState`): die
   * Uhr, was aus den Kisten heraus ist, was erledigt ist, was der Techniker
   * gerade trägt und was im Gang liegt.
   *
   * Sie steht **neben** dem Snapshot und nicht darin, und das ist kein
   * Versehen: Der Snapshot ist das *Bild* der Station — was man sähe, stünde
   * man davor —, und genau deshalb steht dort weder ein Teilename noch, was
   * jemand in der Hand hält (`map/worldSource.ts`: „Auf der Kiste steht ihr
   * Kennzeichen, nie der Teilename"). Der Archivar liest aber keine Station,
   * er liest Papiere, und das hier sind seine Papiere: Ohne sie könnte er
   * nicht unterscheiden, ob ein Teil getragen wird oder irgendwo liegt — und
   * genau daran hängt, was er verraten darf (`rules/archiveGoals.ts`).
   */
  ledger(): import('../rules/archiveGoals').ArchiveState;
  /** Meine Peer-Id. */
  me(): string;
  nameOf(peer: string): string;
  /**
   * **Die zwei Griffe der Schalttafel**, jeder mit der Zeile, die er dem
   * Spieler sagt — `''` heißt: dafür gibt es keinen Schalter (die Hälfte der
   * Tafel liegt hinter dem Sicherungskasten, `panel.ts`).
   *
   * Es waren einmal drei: Der dritte war der Schallköder, ein Radio je zwei
   * Zimmer, das das Monster anlockte. Er ist weg, und zwar überall — wer den
   * richtigen Knopf gefunden hatte, parkte das Vieh in einer Ecke, und der
   * Rest der Runde fand ohne es statt (`panel.ts`).
   */
  door(doorId: string): string;
  light(roomId: string): string;
  /**
   * **Die Tafel, so weit sie zu sehen ist** (`panel.visibleSwitches`) — keine
   * Aktion, sondern die Auskunft, welche Schalter es überhaupt gibt und wie
   * sie beschriftet sind.
   *
   * Sie steht hier und nicht im Grundriss, obwohl `spec().switches` alle
   * kennt: Welche Hälfte davon vor dem Sicherungskasten sichtbar ist, weiß
   * nur der Wirt (`HauntState.fuse`), und eine Rolle, die sich die Liste
   * selbst zusammensuchte, verriete genau das, was der Kasten verbergen soll.
   */
  switches(): readonly import('../panel').PanelSwitch[];
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
