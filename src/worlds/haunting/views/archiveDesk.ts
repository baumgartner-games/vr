import type { ArchiveView } from '../archiveView';
import type { RoleHost } from '../registry/roles';

/**
 * **Das Loch, durch das die 3D-Welt ein Zimmer zeichnet.**
 *
 * Der Archivar schlägt eine Raumakte auf, und darin steht ein Bild des
 * Zimmers. In der 3D-Welt ist das kein gemaltes Bild, sondern **die Welt
 * selbst**: eine Kamera senkrecht über dem aufgeschlagenen Zimmer, gezeichnet
 * in ein Rechteck der Seite (`HauntingWorld.render`, `aimArchive`). Man sieht
 * das Klavier, weil dort ein Klavier steht — nicht, weil jemand ein Symbol
 * dafür gemalt hat.
 *
 * In der 2D-Welt gibt es diese Kamera nicht. Dort steht an derselben Stelle
 * eine herangezoomte Karte, und `archiveDeskOf` gibt `null` zurück. Die
 * Ansicht kennt beide Fälle; sie ist deshalb dieselbe Ansicht und nicht zwei.
 *
 * Geliefert wird der Tisch über `host.extra` — derselbe Weg, auf dem sich die
 * Monster-Rolle ihr Steuer holt (`monster/monsterDriver.ts`): Der Vertrag der
 * Registry kennt keine Kameras, und das soll so bleiben.
 */
export interface ArchiveDesk {
  /** Welches Zimmer die Kamera zeigen soll; `''` schließt die Akte. */
  open(roomId: string): void;
  /** Wie der Ausschnitt gerade steht (`archiveView.ts`). */
  view(): ArchiveView;
  /** Näher heran (Faktor über 1) oder weiter weg. */
  zoom(factor: number): void;
  /** Verschieben, in **Anteilen des Bildes** und nicht in Metern. */
  pan(dx: number, dz: number): void;
  /** Zurück auf das ganze Zimmer. */
  home(): void;
}

/** Den Tisch aus `host.extra` holen — untypisiert per Vertrag, deshalb hier geprüft. */
export function archiveDeskOf(host: RoleHost): ArchiveDesk | null {
  const extra = host.extra as { archive?: unknown } | null | undefined;
  const desk = extra?.archive as Partial<ArchiveDesk> | undefined;
  if (
    desk &&
    typeof desk.open === 'function' &&
    typeof desk.view === 'function' &&
    typeof desk.zoom === 'function' &&
    typeof desk.pan === 'function' &&
    typeof desk.home === 'function'
  )
    return desk as ArchiveDesk;
  return null;
}
