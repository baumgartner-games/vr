import { evidenceCandidates, JOURNAL_ENTITIES } from './evidenceJournal';
import { ENTITY_EVIDENCE } from './threat';

describe('Archive evidence inference', () => {
  it('keeps all hypotheses open without measurements', () => {
    expect(evidenceCandidates(new Set())).toEqual(JOURNAL_ENTITIES);
  });
  it.each(JOURNAL_ENTITIES)('recognizes the actual three signatures of %s', (kind) => {
    expect(evidenceCandidates(new Set(ENTITY_EVIDENCE[kind].clues))).toEqual([kind]);
  });
  it('asks for another measurement when observations contradict one another', () => {
    expect(
      evidenceCandidates(
        new Set([ENTITY_EVIDENCE.stalker.clues[0]!, ENTITY_EVIDENCE.crawler.clues[2]!]),
      ),
    ).toEqual([]);
  });
});
