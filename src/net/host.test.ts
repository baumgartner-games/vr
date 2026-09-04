/**
 * Die eine Eigenschaft, an der alles hängt: **jeder rechnet dasselbe aus**. Ein
 * Gastgeber, über den sich zwei Geräte uneinig sind, ist schlimmer als gar
 * keiner — dann simulieren beide und schieben sich die Ergebnisse gegenseitig
 * über die eigenen.
 */
import { pickHost, type HostCandidate } from './host';

describe('pickHost', () => {
  it('nimmt den, der am längsten da ist', () => {
    expect(
      pickHost([
        { id: 'z', seniority: 300 },
        { id: 'a', seniority: 4 },
      ]),
    ).toBe('z');
  });

  it('lässt einen Dazugekommenen die Welt nicht übernehmen', () => {
    // Genau der alte Fehler: 'a' ist gerade erst hereingekommen und hätte mit
    // der kleinsten Id gewonnen.
    const wohnend: HostCandidate = { id: 'z', seniority: 812 };
    const neu: HostCandidate = { id: 'a', seniority: 0 };
    expect(pickHost([wohnend, neu])).toBe('z');
    expect(pickHost([neu, wohnend])).toBe('z');
  });

  it('entscheidet bei gleicher Standzeit über die kleinste Id', () => {
    expect(
      pickHost([
        { id: 'm', seniority: 12 },
        { id: 'b', seniority: 12 },
      ]),
    ).toBe('b');
  });

  it('lässt sich von einem Zehntel Unterschied nicht umstimmen', () => {
    // Standzeiten wachsen lokal weiter und kommen gerundet über das Netz; ein
    // Wackeln im Millisekundenbereich darf den Gastgeber nicht hin- und
    // herschieben.
    expect(
      pickHost([
        { id: 'm', seniority: 12.001 },
        { id: 'b', seniority: 12 },
      ]),
    ).toBe('b');
  });

  it('ist von der Reihenfolge unabhängig', () => {
    const all: HostCandidate[] = [
      { id: 'a', seniority: 10 },
      { id: 'b', seniority: 90 },
      { id: 'c', seniority: 90 },
      { id: 'd', seniority: 3 },
    ];
    const wanted = 'b';
    for (const start of [0, 1, 2, 3]) {
      const rotated = [...all.slice(start), ...all.slice(0, start)];
      expect(pickHost(rotated)).toBe(wanted);
    }
    expect(pickHost([...all].reverse())).toBe(wanted);
  });

  it('kommt mit einem allein zurecht — und mit niemandem', () => {
    expect(pickHost([{ id: 'nur-ich', seniority: 0 }])).toBe('nur-ich');
    expect(pickHost([])).toBe('');
  });

  it('bleibt beim selben, während alle gleichmäßig älter werden', () => {
    const tick = (all: HostCandidate[], seconds: number): HostCandidate[] =>
      all.map((one) => ({ ...one, seniority: one.seniority + seconds }));
    let all: HostCandidate[] = [
      { id: 'z', seniority: 30 },
      { id: 'a', seniority: 0 },
    ];
    for (let i = 0; i < 100; i++) {
      all = tick(all, 1);
      expect(pickHost(all)).toBe('z');
    }
  });
});
