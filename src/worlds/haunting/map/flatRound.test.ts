import { COMMAND } from '../roomGraph';
import { COMMAND_DELAY } from '../rules/doorSeal';
import { puzzleFor } from '../mission';
import { doorWaypoint, spaceAtMetres } from './geometry';
import { FlatWalker } from './flatWalk';
import { FlatRound, MONSTER_ID, PLAYER_ID } from './flatRound';
import type { FloorPoint } from '../stationLayout';

const DT = 1 / 30;

function walkTo(round: FlatRound, goal: FloorPoint, limit = 120): boolean {
  const walker = new FlatWalker(round);
  for (let t = 0; t < limit; t += DT) {
    // Eine Runde, die unterwegs endet, ist angekommen.
    if (round.phase !== 'running') return true;
    const input = walker.input(goal, DT);
    if (!input) return true;
    round.step(DT, input);
  }
  return false;
}

describe('Eine Runde in der 2D-Welt', () => {
  it.each([1, 2, 3, 4, 5])('lässt sich im Test mit Seed %i ganz durchspielen', (seed) => {
    const round = new FlatRound(seed, { test: true });
    expect(round.snapshot().rooms.some((r) => r.id === COMMAND)).toBe(true);
    expect(round.state().monsterOn).toBe(false);
    const jobs = round.jobs();
    expect(jobs).toHaveLength(6);
    for (const job of jobs) {
      expect(walkTo(round, job.at)).toBe(true);
      if (job.kind === 'cargo') {
        round.act('interact');
        expect(round.drain().at(-1)?.text).toMatch(/geöffnet/);
        round.act('interact');
        expect(round.drain().at(-1)?.text).toMatch(/mitgenommen/);
      } else {
        round.act('interact');
        expect(round.puzzle).not.toBeNull();
        const repair = round.puzzle!;
        const puzzle = puzzleFor(round.state().crew, repair.id);
        expect(puzzle.open).toBe(true);
        if (repair.puzzle === 'wires')
          for (let plug = 0; plug < 4; plug++)
            round.solve({ kind: 'wire', plug, socket: repair.order.indexOf(plug) });
        else if (repair.puzzle === 'sequence')
          for (const digit of repair.code) round.solve({ kind: 'digit', digit: Number(digit) });
        else {
          for (let column = 0; column < 3; column++)
            while (puzzle.digits[column] !== Number(repair.code[column]))
              round.solve({ kind: 'turn', column });
          round.solve({ kind: 'send' });
        }
        expect(round.puzzle).toBeNull();
      }
    }
    expect(round.state().done).toHaveLength(3);
    expect(round.phase).toBe('running');
    expect(walkTo(round, round.graph.centre(COMMAND))).toBe(true);
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.phase).toBe('won');
  });

  it('verweigert die Konsole ohne das Ersatzteil', () => {
    const round = new FlatRound(3, { test: true });
    const console = round.jobs().find((j) => j.kind === 'console')!;
    expect(walkTo(round, console.at)).toBe(true);
    round.act('interact');
    expect(round.puzzle).toBeNull();
    expect(round.drain().at(-1)?.text).toMatch(/fehlt/);
  });

  it('steckt Werkzeuge aus der Fracht ein und schaltet sie durch', () => {
    const round = new FlatRound(3, { test: true });
    const jobIds = new Set(round.jobs().map((j) => j.id));
    const extra = round.items().find((i) => i.kind === 'cargo' && !jobIds.has(i.id))!;
    expect(walkTo(round, extra.at)).toBe(true);
    round.act('interact');
    round.act('interact');
    expect(round.tools.length).toBe(2);
    round.act('cycle');
    expect(round.activeTool).toBe(round.tools[1]);
    round.act('use');
    expect(round.drain().length).toBeGreaterThan(0);
  });

  it('versteckt sich im Schrank und kommt wieder heraus', () => {
    const round = new FlatRound(3, { test: true });
    const locker = round.items().find((i) => i.kind === 'locker')!;
    expect(walkTo(round, locker.at)).toBe(true);
    round.act('interact');
    expect(round.state().crew.hidden).not.toBe('');
    expect(round.entities()[0]!.concealed).toBe(true);
    round.step(DT, { x: 1, z: 0, sprint: true });
    expect(round.entities()[0]!.moving).toBe(false);
    round.act('interact');
    expect(round.state().crew.hidden).toBe('');
  });
});

describe('Das Monster in der 2D-Welt', () => {
  it.each([1, 2, 3, 4])('bleibt mit Seed %i vierzig Sekunden lang in der Station', (seed) => {
    const round = new FlatRound(seed, { roll: seed });
    let farthest = 0;
    const start = { x: round.monster.x, z: round.monster.z };
    for (let t = 0; t < 40; t += DT) {
      round.step(DT, { x: 0, z: 0, sprint: false });
      expect(spaceAtMetres(round.house, round.monster)).not.toBeNull();
      farthest = Math.max(
        farthest,
        Math.hypot(round.monster.x - start.x, round.monster.z - start.z),
      );
    }
    expect(farthest).toBeGreaterThan(3);
    const entities = round.entities();
    expect(entities.map((e) => e.id)).toEqual([PLAYER_ID, MONSTER_ID]);
    expect(round.state().monster).toEqual({ x: round.monster.x, z: round.monster.z });
  });

  it('trifft, wer ihm in die Arme läuft, und die Runde endet nach drei Treffern', () => {
    const round = new FlatRound(2);
    round.mode = 'omniscient';
    let hits = 0;
    for (let t = 0; t < 240 && round.phase === 'running'; t += DT) {
      const dx = round.monster.x - round.player.x,
        dz = round.monster.z - round.player.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 1) {
        round.step(DT, { x: 0, z: 0, sprint: false });
      } else {
        // Raumweise hin, wie ein Mensch mit der Karte.
        const here = round.player.space;
        const there = round.monster.space;
        let step = { x: round.monster.x, z: round.monster.z };
        if (here !== there) {
          const next = round.graph.next(here, there);
          const door = round.house.doors.find(
            (door) =>
              (door.a === here && (door.b ?? COMMAND) === next) ||
              ((door.b ?? COMMAND) === here && door.a === next),
          );
          if (door) step = doorWaypoint(door, round.graph.centre(next));
        }
        const sx = step.x - round.player.x,
          sz = step.z - round.player.z;
        const l = Math.hypot(sx, sz) || 1;
        round.step(DT, { x: sx / l, z: sz / l, sprint: true });
      }
      hits += round.drain().filter((e) => e.text.startsWith('Treffer')).length;
    }
    expect(round.phase).toBe('lost');
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(round.state().crew.hp).toBe(0);
  });

  it('sieht den Spieler im Dunkeln nicht, im Licht aber schon', () => {
    const round = new FlatRound(4);
    round.torch = false;
    // Alle Lampen aus: Das Monster hat nichts, wodurch es den Spieler sähe.
    round.haunt.lit.length = 0;
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.field.visibleEntities).toEqual([PLAYER_ID]);
    round.setMode('omniscient');
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.field.visibleEntities).toEqual([PLAYER_ID, MONSTER_ID]);
    expect(round.field.cones.length).toBe(2);
    expect(round.field.noise.some((n) => n.cause === 'monster')).toBe(true);
  });

  /**
   * **Der Ghost-Marker ist eine Erinnerung, keine Verfolgung** (`rules/ghosts.ts`).
   * Er wird bei Sichtkontakt gesetzt und bleibt danach stehen, wo er stand —
   * auch wenn das Monster längst zwei Räume weiter ist. Genau darauf baut der
   * Bluff: Wer weiß, dass der andere einen alten Punkt hat, läuft woandershin.
   */
  it('merkt sich das Monster beim Sichtkontakt und lässt den Punkt danach stehen', () => {
    const round = new FlatRound(4);
    round.torch = false;
    expect(round.haunt.ghosts).toEqual({ monster: null, technician: null });
    // „Alles sehen" ist der eine Fall, in dem der Techniker das Monster
    // sicher sieht, ohne dass es erst um die Ecke kommen muss.
    round.setMode('omniscient');
    round.step(DT, { x: 0, z: 0, sprint: false });
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.haunt.ghosts.monster).not.toBeNull();
    // Licht aus, Sicht realitätsnah: Von jetzt an sieht der Techniker nichts
    // mehr — und der Marker altert an seiner Stelle. Der erste Schritt danach
    // rechnet noch mit dem Sichtfeld des vorigen Bildes, setzt den Punkt also
    // ein letztes Mal; ab dann steht er.
    round.setMode('realistic');
    round.haunt.lit.length = 0;
    round.step(DT, { x: 0, z: 0, sprint: false });
    const mark = { ...round.haunt.ghosts.monster! };
    // Gesetzt wird mitten im Schritt, gemessen danach: ein Zehntelmeter Weg
    // liegt dazwischen, mehr nicht.
    expect(Math.hypot(mark.x - round.monster.x, mark.z - round.monster.z)).toBeLessThan(0.2);
    expect(mark.since).toBeCloseTo(round.haunt.time, 6);
    for (let t = 0; t < 8; t += DT) round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.field.visibleEntities).toEqual([PLAYER_ID]);
    expect(round.haunt.ghosts.monster).toEqual(mark);
    // Und das Monster ist inzwischen woanders — der Punkt ist eine Erinnerung.
    expect(Math.hypot(round.monster.x - mark.x, round.monster.z - mark.z)).toBeGreaterThan(1);
  });
});

describe('Der Snapshot der 2D-Welt', () => {
  it('ist serialisierbar und kennt Türen, Lichter und Items', () => {
    const round = new FlatRound(9, { test: true });
    const snapshot = round.snapshot();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(snapshot.doors.length).toBe(round.house.doors.length);
    expect(snapshot.lights.filter((l) => l.kind === 'lamp').length).toBe(round.lamps().length);
    expect(snapshot.lights.some((l) => l.kind === 'torch')).toBe(true);
    expect(snapshot.items.filter((i) => i.kind === 'console')).toHaveLength(3);
    expect(snapshot.entities.map((e) => e.id)).toEqual([PLAYER_ID]);
    expect(snapshot.bounds.maxX).toBeGreaterThan(snapshot.bounds.minX);
    const before = snapshot.lights.find((l) => l.kind === 'lamp' && l.on)!;
    round.haunt.lit = round.haunt.lit.filter((id) => id !== before.roomId);
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.snapshot().lights.find((l) => l.id === before.id)!.on).toBe(false);
  });
});

describe('Die Tür hinter dem Techniker', () => {
  /**
   * **Der eine Vorteil des Technikers.** Wer verfolgt durch eine Tür geht,
   * hinter dem fällt sie zu — allein sofort, im Team erst nach dem Zuruf
   * (`rules/doorSeal.ts`). Geprüft wird beides an derselben Tür und mit
   * demselben Schritt: Nur die Besetzung der Runde ist anders.
   */
  function runThrough(players: number): { waited: number; text: string } {
    const round = new FlatRound(4, { players });
    const door = round.house.doors.find((d) => d.b !== null)!;
    const near = doorWaypoint(door, round.graph.centre(door.a));
    const far = doorWaypoint(door, round.graph.centre(door.b!));
    expect(round.place(near)).toBe(true);
    // Das Monster steht dicht hinter ihm — das ist die Verfolgung. Es bleibt
    // stehen (kein Ziel), damit nur die Ansage über den Zeitpunkt entscheidet.
    round.monster.x = near.x;
    round.monster.z = near.z;
    round.monster.space = door.a;
    round.state().monster = { x: near.x, z: near.z };
    expect(walkTo(round, far, 20)).toBe(true);
    const crossed = round.state().time;
    const texts: string[] = [];
    let waited = Infinity;
    for (let t = 0; t < 4; t += DT) {
      round.step(DT, { x: 0, z: 0, sprint: false });
      for (const event of round.drain()) texts.push(event.text);
      if (round.state().shut.includes(door.id)) {
        waited = round.state().time - crossed;
        break;
      }
    }
    return { waited, text: texts.join(' | ') };
  }

  it('fällt allein sofort zu', () => {
    const alone = runThrough(2);
    expect(alone.waited).toBeLessThan(0.5);
    expect(alone.text).toMatch(/Tür fällt hinter dir zu/);
  });

  it('braucht im Team erst den Zuruf — dieselbe Tür, eine Sekunde später', () => {
    const crew = runThrough(5);
    expect(crew.waited).toBeGreaterThanOrEqual(COMMAND_DELAY[0]);
    expect(crew.waited).toBeLessThanOrEqual(COMMAND_DELAY[1] + 0.5);
    expect(crew.text).toMatch(/Zentrale verriegelt/);
  });
});

describe('Türen machen Geräusche', () => {
  /**
   * **Ein Blatt, das fährt, ist zu hören.** Für den, der es sieht, sagt die
   * Welle nur, dass da eine Tür ging — nicht, wer hindurchging.
   */
  it('legt eine Welle auf die Karte, wenn eine automatische Tür auffährt', () => {
    const round = new FlatRound(4, { test: true });
    const door = round.house.doors.find((d) => d.b !== null)!;
    expect(round.place(doorWaypoint(door, round.graph.centre(door.a)))).toBe(true);
    round.step(DT, { x: 0, z: 0, sprint: false });
    const opened = round.noises().filter((n) => n.cause === 'door');
    expect(opened.length).toBeGreaterThan(0);
    expect(opened[0]!.by).toBe('');
    expect(round.snapshot().doors.find((d) => d.id === door.id)?.open).toBe(true);
  });
});
