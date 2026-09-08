import type { MonsterKind } from './mission';
import { ENTITY_EVIDENCE } from './threat';

export const JOURNAL_ENTITIES = Object.keys(ENTITY_EVIDENCE) as MonsterKind[];

/** An inference from the crew's notes, never from the selected/spawned monster. */
export function evidenceCandidates(observed: ReadonlySet<string>): MonsterKind[] {
  return JOURNAL_ENTITIES.filter((kind) =>
    [...observed].every((clue) => ENTITY_EVIDENCE[kind].clues.includes(clue)),
  );
}
