import type { HouseSpec } from '../house';
import type { HauntState } from '../net';
import type { ArchiveView } from '../archiveView';
import type { RoleHost } from '../registry/roles';

/**
 * **Was die drei Geräte über den `RoleHost` hinaus brauchen.**
 *
 * Der Snapshot (`host.snapshot()`) reicht zum Zeichnen; zum **Schalten** und
 * zum **Nachschlagen** nicht. Die Schalttafel muss wissen, welcher Schalter
 * zu welcher Tür gehört (`spec.switches`), der Archivar liest Codes und
 * Hinweise aus dem Bauplan (`lockerCode`, `repairsFor`), und beide sehen die
 * Radios nur im Stand (`state.loud`, der Snapshot kennt sie nicht). Deshalb
 * hängen Bauplan und Stand als Getter an `host.extra` — bewusst untypisiert
 * in der Registry (`registry/roles.ts`), hier mit Namen.
 *
 * Die Archiv-Griffe (`archive*`, `showRoom`) gibt es nur, wo eine 3D-Welt
 * ein Zimmer in die Raumakte zeichnet (`stationUi.ts`); in der 2D-Welt
 * fehlen sie, und die Akte zeichnet stattdessen die Karte des Zimmers.
 */
export interface ViewExtras {
  spec(): HouseSpec;
  state(): HauntState;
  /** Welches Zimmer die 3D-Welt in die Raumakte zeichnen soll — `''` keins. */
  showRoom?(roomId: string): void;
  /** Wie der Archivar sein Blatt gerade hält (`archiveView.ts`). */
  archiveView?(): ArchiveView;
  /** Näher heran oder weiter weg — Faktor über 1 heißt näher. */
  archiveZoom?(factor: number): void;
  /** Das Blatt verschieben, in Anteilen des Bildes. */
  archivePan?(dx: number, dz: number): void;
  /** Und wieder auf das ganze Zimmer zurück. */
  archiveHome?(): void;
}

export function extrasOf(host: RoleHost): ViewExtras | null {
  const extra = host.extra;
  if (!extra || typeof extra !== 'object') return null;
  const it = extra as Partial<ViewExtras>;
  return typeof it.spec === 'function' && typeof it.state === 'function'
    ? (it as ViewExtras)
    : null;
}
