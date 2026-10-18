/**
 * **Hexland von Hand spielen, ohne Browser** — für Agenten, die selbst Runden
 * spielen und dabei Taktiken für _Intelligent_ suchen.
 *
 *   npm run hexplay -- new <Datei> [Samen]   neue normale Runde
 *   npm run hexplay -- show <Datei> [n=12]   Brett, Aufträge, Hand, die n besten Lagen
 *   npm run hexplay -- place <Datei> q r rot Kachel legen
 *   npm run hexplay -- auto <Datei> [k=1] [smart|optimized]   k Züge nach einer Strategie
 *
 * Kanten in Brettrichtung, Kante 0 bei +x, dann je 60° Richtung +z; Kürzel:
 * F Wald, H Stadt, A Weizen (Acker), g Wiese, w Wasser, r Weg.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  HexBoard,
  edgeAt,
  hexKey,
  neighbour,
  type Terrain,
} from '../../src/worlds/hexland/hexRules';
import { bestPlacement, scorePlacement, type Strategy } from '../../src/worlds/hexland/hexPlanner';

const CODE: Record<Terrain, string> = {
  forest: 'F',
  house: 'H',
  field: 'A',
  grass: 'g',
  water: 'w',
  road: 'r',
};
const [cmd, file, ...rest] = process.argv.slice(2);
if (!cmd || !file) {
  console.log('new|show|place|auto <Datei> …');
  process.exit(1);
}

function load(): HexBoard {
  const board = new HexBoard(1);
  if (!board.load(readFileSync(file!, 'utf8'))) throw new Error('kein Spielstand');
  return board;
}

function save(board: HexBoard): void {
  writeFileSync(file!, board.save());
}

function show(board: HexBoard, n: number): void {
  const s = board.scoring();
  console.log(
    `Punkte ${s.total} (Aufträge ${s.tasks}, Flaggen ${s.flags}, Fluss ${s.river}, Weg ${s.road}) · Stapel ${board.stack.length} · gelegt ${board.placed}`,
  );
  const deck = new Map<string, number>();
  for (const t of board.tasks)
    deck.set(`${CODE[t.terrain]}${t.target}`, (deck.get(`${CODE[t.terrain]}${t.target}`) ?? 0) + 1);
  console.log(
    `Auftragsstapel (${board.tasks.length}): ${[...deck].map(([k, v]) => `${k}×${v}`).join(' ')}`,
  );
  console.log('Brett (q,r: Kanten 0..5, Auftrag):');
  for (const t of board.tiles.values()) {
    const edges = [0, 1, 2, 3, 4, 5].map((e) => CODE[edgeAt(t.spec, t.rot, e)]).join('');
    const q = t.spec.quest;
    const p = board.questProgress(t);
    const quest = q
      ? ` · Auftrag ${CODE[q.terrain]}${q.target} ${q.state}${p ? ` ${p.size}/${p.target}` : ''}`
      : '';
    const flag = t.spec.flag ? ` · Flagge ${CODE[t.spec.flag]}` : '';
    console.log(`  ${t.q},${t.r}: ${edges}${quest}${flag}`);
  }
  const spec = board.current;
  if (!spec) {
    console.log('Partie vorbei.');
    return;
  }
  const q = spec.quest;
  console.log(
    `Hand: ${spec.base} ${spec.edges.map((t) => CODE[t]).join('')} (ungedreht)${q ? ` · Auftrag ${CODE[q.terrain]}${q.target}` : ''}${spec.flag ? ` · Flagge ${CODE[spec.flag]}` : ''}`,
  );
  const rows: Array<{ text: string; score: number }> = [];
  for (const slot of board.openSlots()) {
    for (let rot = 0; rot < 6; rot++) {
      const score = scorePlacement(board, spec, slot.q, slot.r, rot, 'smart');
      if (score === null) continue;
      const a = board.assess(spec, slot.q, slot.r, rot);
      const edges = [0, 1, 2, 3, 4, 5].map((e) => CODE[edgeAt(spec, rot, e)]).join('');
      const around = [0, 1, 2, 3, 4, 5]
        .map((e) => {
          const nb = neighbour(slot, e);
          const t = board.at(nb.q, nb.r);
          return t ? CODE[edgeAt(t.spec, t.rot, (e + 3) % 6)] : '.';
        })
        .join('');
      rows.push({
        score,
        text: `  ${slot.q},${slot.r} rot ${rot}: ${edges} gegen ${around} · smart ${score.toFixed(1)} · fertig ${a.completes} (+${a.points}) näher ${a.closer.toFixed(2)} wächst ${a.progress} bereit ${a.ready} kaputt ${a.breaks}`,
      });
    }
  }
  rows.sort((x, y) => y.score - x.score);
  console.log(`Lagen (${rows.length}, beste ${n} nach smart):`);
  for (const row of rows.slice(0, n)) console.log(row.text);
  void hexKey;
}

const board = cmd === 'new' ? null : load();
if (cmd === 'new') {
  const seed = Number(rest[0] ?? Date.now() % 1e9);
  const fresh = new HexBoard(seed);
  fresh.reset(seed);
  save(fresh);
  show(fresh, 12);
} else if (cmd === 'show') {
  show(board!, Number(rest[0] ?? 12));
} else if (cmd === 'place') {
  const [q, r, rot] = rest.map(Number);
  const result = board!.place(q!, r!, rot!);
  if (!result) {
    console.log('Passt so nicht.');
    process.exit(1);
  }
  console.log(
    `+${result.points} · erfüllt ${result.questsDone.join(',') || '–'} · verpasst ${result.questsFailed.join(',') || '–'}`,
  );
  save(board!);
  show(board!, 12);
} else if (cmd === 'auto') {
  const k = Number(rest[0] ?? 1);
  const strategy = (rest[1] ?? 'smart') as Strategy;
  for (let i = 0; i < k && board!.current; i++) {
    const best = bestPlacement(board!, strategy);
    if (!best) break;
    board!.place(best.q, best.r, best.rot);
  }
  save(board!);
  show(board!, 12);
}
