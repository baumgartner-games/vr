import { COMMAND } from '../roomGraph';
import { COMMAND_DELAY } from '../rules/doorSeal';
import { freshStamina, PLAYER_STAMINA, puzzleFor, stepStamina } from '../mission';
import { doorCentre, doorWaypoint, spaceAtMetres } from './geometry';
import { FlatWalker } from './flatWalk';
import { FlatRound, MONSTER_ID, PLAYER_ID } from './flatRound';
import { STILL } from '../monster/monsterHelm';
import { cargoOf } from '../rules/cargo';
import { DROP_SPACING } from '../rules/blood';
import { LOCK_COOLDOWN } from '../rules/doorLocks';
import { LAMP_RANGE } from '../rules/lamps';
import { CARGO_OPEN_SECONDS } from '../rules/chore';
import type { FloorPoint } from '../stationLayout';

const DT = 1 / 30;

/**
 * **Eine Kiste aufklappen dauert fünf Sekunden** (`rules/chore.ts`): tippen,
 * dann stillstehen, bis der Balken durch ist. Wer dabei liefe, finge von vorn
 * an — deshalb steht diese Hilfe still.
 */
function openCrate(round: FlatRound): void {
  round.act('interact');
  for (let t = 0; round.busy && t < CARGO_OPEN_SECONDS + 1; t += DT)
    round.step(DT, { x: 0, z: 0, sprint: false });
}

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
        openCrate(round);
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

  /**
   * **Eine Hand, ein Ersatzteil** (`rules/archiveGoals.ts`) — dieselbe Regel
   * wie im Schiff. Die zweite Kiste geht auf, das Teil bleibt darin.
   */
  it('lässt kein zweites Ersatzteil in die Hand', () => {
    const round = new FlatRound(3, { test: true });
    const parts = cargoOf(round.house).filter((slot) => slot.loot.kind === 'part');
    expect(parts.length).toBeGreaterThan(1);
    const [first, second] = parts as [(typeof parts)[0], (typeof parts)[0]];
    for (const box of [first, second]) {
      const item = round.items().find((i) => i.id === box.id)!;
      expect(walkTo(round, item.at)).toBe(true);
      openCrate(round);
      round.act('interact');
    }
    const held = round.state().crew.inventory;
    const taskOf = (box: (typeof parts)[0]): string =>
      box.loot.kind === 'part' ? box.loot.taskId : '';
    expect(held).toContain(taskOf(first));
    expect(held).not.toContain(taskOf(second));
    expect(round.drain().at(-1)?.text).toMatch(/Beide Hände voll/);
    // Die zweite Kiste bleibt offen und unerledigt.
    expect(round.items().find((i) => i.id === second.id)?.state).toBe('open');
  });

  it('steckt Werkzeuge aus der Fracht ein und schaltet sie durch', () => {
    const round = new FlatRound(3, { test: true });
    // Nicht mehr „irgendeine Kiste, die kein Auftrag ist": Seit in jedem Raum
    // zwei bis drei stehen, ist die erste beste meistens leer.
    const box = cargoOf(round.house).find((slot) => slot.loot.kind === 'tool')!;
    const item = round.items().find((i) => i.id === box.id)!;
    expect(walkTo(round, item.at)).toBe(true);
    openCrate(round);
    round.act('interact');
    expect(round.tools.length).toBe(2);
    round.act('cycle');
    expect(round.activeTool).toBe(round.tools[1]);
    round.act('use');
    expect(round.drain().length).toBeGreaterThan(0);
  });

  it('gibt aus einer leeren Kiste nichts her — und meldet das beim zweiten Griff', () => {
    const round = new FlatRound(3, { test: true });
    const box = cargoOf(round.house).find((slot) => slot.loot.kind === 'empty')!;
    const item = round.items().find((i) => i.id === box.id)!;
    expect(walkTo(round, item.at)).toBe(true);
    const before = [...round.tools];
    openCrate(round);
    expect(round.state().crew.opened).toContain(box.id);
    expect(round.items().find((i) => i.id === box.id)?.state).toBe('open');
    round.act('interact');
    expect(round.drain().at(-1)?.text).toBe('Leer.');
    expect(round.tools).toEqual(before);
    expect(round.state().crew.inventory).not.toContain('');
    // Danach ist die Kiste erledigt und lädt niemanden mehr zum Nachsehen ein.
    const after = round.items().find((i) => i.id === box.id)!;
    expect(after.state).toBe('taken');
    expect(after.interactive).toBe(false);
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

  /**
   * **Wer blutet, wird verfolgt** (`rules/blood.ts`). Vor dem ersten Treffer
   * liegt nichts auf dem Boden, danach fällt alle `DROP_SPACING` Meter ein
   * Tropfen — und die Liste, die die Karte zeichnet, ist dieselbe, die im
   * Stand übers Netz geht.
   */
  it('zieht nach einem Treffer eine Blutspur hinter sich her', () => {
    const round = new FlatRound(4);
    expect(round.blood.drops).toEqual([]);
    // Ein paar Meter laufen, ohne getroffen zu sein: kein Tropfen.
    for (let t = 0; t < 2; t += DT) round.step(DT, { x: 0, z: 1, sprint: false });
    expect(round.blood.drops).toEqual([]);
    // Das Monster steht plötzlich daneben — Treffer.
    round.monster.x = round.player.x;
    round.monster.z = round.player.z;
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.state().crew.hp).toBe(2);
    // Der Treffer fällt am Ende des Bildes, der erste Tropfen im nächsten —
    // und zwar dort, wo der Schlag saß, ohne dass jemand einen Schritt tut.
    expect(round.blood.drops).toEqual([]);
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.blood.drops).toHaveLength(1);
    // Und das Vieh soll ihn jetzt in Ruhe lassen; geprüft wird die Spur.
    round.monster.x += 40;
    const first = round.blood.drops[0]!;
    expect(Math.hypot(first.x - round.player.x, first.z - round.player.z)).toBeLessThan(0.5);
    // Und ab jetzt tropft es beim Laufen — nach Strecke, nicht nach Zeit.
    const walker = new FlatWalker(round);
    const goal = round.jobs()[0]!.at;
    for (let t = 0; t < 10; t += DT) {
      const input = walker.input(goal, DT);
      if (!input) break;
      round.step(DT, input);
    }
    expect(round.blood.drops.length).toBeGreaterThan(2);
    for (let i = 1; i < round.blood.drops.length; i++)
      expect(
        Math.hypot(
          round.blood.drops[i]!.x - round.blood.drops[i - 1]!.x,
          round.blood.drops[i]!.z - round.blood.drops[i - 1]!.z,
        ),
      ).toBeGreaterThan(DROP_SPACING * 0.9);
    // Dieselbe Liste in Stand und Snapshot — zwei Listen wären zwei Spuren.
    expect(round.state().blood).toBe(round.blood.drops);
    expect(round.snapshot().blood).toEqual(round.blood.drops);
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
    // **Die Runde beginnt dunkel** (seit dem Paket „Schalttafel"), also wird
    // erst eine Lampe angemacht und dann geprüft, dass der Snapshot beides
    // mitbekommt. Vorher stand hier „nimm irgendeine brennende" — die gibt es
    // zu Rundenbeginn nicht mehr.
    expect(snapshot.lights.filter((l) => l.kind === 'lamp' && l.on)).toEqual([]);
    const room = round.house.rooms[0]!.id;
    round.switchLight(room);
    round.step(DT, { x: 0, z: 0, sprint: false });
    const before = round.snapshot().lights.find((l) => l.kind === 'lamp' && l.on)!;
    expect(before.roomId).toBe(room);
    round.switchLight(room);
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
  function runThrough(players: number, chasing = false): { waited: number; text: string } {
    const round = new FlatRound(4, { players });
    const door = round.house.doors.find((d) => d.b !== null)!;
    const near = doorWaypoint(door, round.graph.centre(door.a));
    const far = doorWaypoint(door, round.graph.centre(door.b!));
    expect(round.place(near)).toBe(true);
    // Das Monster steht dicht hinter ihm — das ist die Verfolgung. Solange es
    // **steht**, entscheidet allein die Ansage über den Zeitpunkt; dafür sitzt
    // ein Steuer daran, das nichts tut (`monster/monsterDriver.ts`). Vorher
    // stand hier nur ein Kommentar, es bleibe stehen — und seit das Monster
    // schneller **geht** als der Techniker (Paket M2), tat es das nicht mehr.
    if (!chasing) round.driver = { active: () => true, decide: () => STILL };
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

  /**
   * **Und genau das kostet die Zentrale ihre Sekunden.**
   *
   * Seit das Monster schneller geht, als der Techniker geht, und knapp unter
   * seinem Sprint jagt (Paket M2, `mission.ts`), ist ein Verfolger in der
   * Zeit, die ein Zuruf braucht, durch die Tür — und dann ist der Riegel
   * umsonst („zu spät ist zu spät", `stepSeal`). Allein macht der Techniker
   * sie selbst zu und ist davon nicht betroffen; das ist der ganze
   * Unterschied zwischen den beiden Besetzungen und der Grund, warum die
   * Trainingsziele zwei verschiedene Zahlen sind.
   */
  it('verliert die Tür, wenn das Monster dem Zuruf davonläuft', () => {
    const chased = runThrough(5, true);
    expect(chased.waited).toBe(Infinity);
    expect(chased.text).not.toMatch(/Zentrale verriegelt/);
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

/**
 * **Die Puste, in der Runde gemessen** (`mission.ts`).
 *
 * Der Sprint galt hier unbegrenzt, und damit war jede Verfolgung in dem
 * Augenblick entschieden, in dem der Techniker den Stock nach vorn drückte.
 * Was der Test nachrechnet, ist genau das: Nach `PLAYER_STAMINA` Sekunden
 * kommt in derselben Zeit weniger Weg heraus als davor.
 */
describe('Die Puste des Technikers in der 2D-Runde', () => {
  /** Nach Osten rennen und messen, wie weit es in `seconds` Sekunden geht. */
  function sprint(round: FlatRound, seconds: number): number {
    const from = { x: round.player.x, z: round.player.z };
    for (let t = 0; t < seconds - 1e-9; t += DT) round.step(DT, { x: 1, z: 0, sprint: true });
    return Math.hypot(round.player.x - from.x, round.player.z - from.z);
  }

  it('läuft die ersten Sekunden schneller als die danach', () => {
    const round = new FlatRound(7, { test: true });
    // Die Zentrale ist lang genug für eine gerade Strecke; im Zweifel bremst
    // eine Wand beide Hälften gleichermaßen, deshalb wird nur verglichen.
    const first = sprint(round, PLAYER_STAMINA);
    const second = sprint(round, PLAYER_STAMINA);
    expect(second).toBeLessThan(first);
  });

  it('gibt dem Sprint genau die Sekunden, die in `mission.ts` stehen', () => {
    // Mit 1/30 s je Bild geht die letzte Scheibe nicht glatt auf; verlangt
    // wird deshalb „auf ein Bild genau" und keine Punktlandung.
    const stamina = freshStamina();
    let steps = 0;
    while (stepStamina(stamina, DT, true) === 1 && steps < 10000) steps++;
    expect(Math.abs(steps * DT - PLAYER_STAMINA)).toBeLessThanOrEqual(DT);
  });
});

/**
 * **Eine Runde fortsetzen statt anfangen** (`FlatResume`) — der Weg von 3D
 * nach 2D mitten im Spiel (`HauntingWorld.switchView`).
 *
 * Bis hierher baute der Konstruktor immer eine frische Runde: Techniker an der
 * Zentrale, Monster am anderen Ende, Uhr auf null. Für eine Runde, die
 * *anfängt*, ist das richtig — und für die eine, die nur die Ansicht wechselt,
 * war es ein Neustart mit Ansage.
 */
describe('Eine 2D-Runde, die eine laufende übernimmt', () => {
  /** Eine Runde, in der schon etwas passiert ist: Uhr, Türen, Gepäck, Wunde. */
  function running(): FlatRound {
    const round = new FlatRound(11, { test: true });
    const state = round.state();
    state.time = 96.5;
    state.crew.hp = 2;
    state.crew.inventory.push('radar');
    state.shut = ['d1'];
    state.lit = ['r1'];
    state.done = ['t0'];
    state.monsterOn = true;
    // Zwei wirkliche Räume, nicht zwei Zahlen: Die Stelle soll in einem Raum
    // liegen, sonst prüft der Test nur, dass sich Meter kopieren lassen.
    const rooms = round.graph.spaces.filter((id) => id !== COMMAND);
    const here = round.graph.centre(rooms[1]!);
    const there = round.graph.centre(rooms[rooms.length - 1]!);
    state.monster = { x: there.x, z: there.z };
    state.technician = { x: here.x, z: here.z, yaw: 1.2, moving: true };
    round.locks.chosen = 'd1';
    round.locks.until = 104;
    round.blood.until = 120;
    round.blood.drops.push({ x: 6, z: -9, since: 90 });
    return round;
  }

  it('übernimmt den Stand, statt einen frischen zu würfeln', () => {
    const before = running();
    const state = before.state();
    const after = new FlatRound(11, { resume: { state, ...before.books() } });
    // **Derselbe Stand, nicht eine Abschrift davon**: Der Gastgeber sagt genau
    // den an, in dem gespielt wird — sonst hätte er nach dem Wechsel zwei.
    expect(after.state()).toBe(state);
    expect(after.state().time).toBe(96.5);
    expect(after.state().crew.hp).toBe(2);
    expect(after.state().shut).toEqual(['d1']);
    expect(after.state().lit).toEqual(['r1']);
    expect(after.state().done).toEqual(['t0']);
  });

  it('stellt Techniker und Monster dorthin, wo sie standen', () => {
    const before = running();
    const state = before.state();
    const after = new FlatRound(11, { resume: { state, ...before.books() } });
    expect(after.player.x).toBeCloseTo(state.technician!.x);
    expect(after.player.z).toBeCloseTo(state.technician!.z);
    expect(after.player.yaw).toBeCloseTo(1.2);
    // Und in dem Raum, in dem diese Stelle liegt — nicht in der Zentrale.
    expect(after.player.space).not.toBe(COMMAND);
    expect(after.player.space).toBe(after.graph.spaceAt(after.player));
    expect(after.monster.x).toBeCloseTo(state.monster!.x);
    expect(after.monster.z).toBeCloseTo(state.monster!.z);
    expect(after.monster.space).toBe(after.graph.spaceAt(after.monster));
  });

  it('nimmt Riegel, Wunde und Werkzeuge mit', () => {
    const before = running();
    const after = new FlatRound(11, { resume: { state: before.state(), ...before.books() } });
    expect(after.locks.chosen).toBe('d1');
    expect(after.locks.until).toBe(104);
    // Die Sperren kommen als **Abschrift**: Wer weitergibt, gibt keinen Draht
    // zurück in die Runde, die er gerade schließt.
    expect(after.locks).not.toBe(before.locks);
    expect(after.blood.until).toBe(120);
    // Eine Spur, nicht zwei: Die Tropfenliste des Standes *ist* die der Buchführung.
    expect(after.blood.drops).toBe(after.state().blood);
    expect(after.blood.drops).toEqual([{ x: 6, z: -9, since: 90 }]);
    // Was der Techniker aufgesammelt hat, hat er auch nach dem Wechsel in der Hand.
    expect(after.tools).toContain('radar');
  });

  it('würfelt ohne Übernahme weiter eine frische Runde', () => {
    const fresh = new FlatRound(11, { test: true });
    expect(fresh.state().time).toBe(0);
    expect(fresh.player.space).toBe(COMMAND);
    expect(fresh.tools).toEqual(['flashlight']);
  });

  it('läuft danach ganz normal weiter', () => {
    const before = running();
    const state = before.state();
    const after = new FlatRound(11, { resume: { state, ...before.books() } });
    const was = after.state().time;
    for (let t = 0; t < 1; t += DT) after.step(DT, { x: 0, z: 0, sprint: false });
    expect(after.state().time).toBeGreaterThan(was);
    expect(after.state().phase).toBe('running');
  });
});

/**
 * **Die 2D-Runde beginnt dunkel** — wie die Mission im Headset.
 *
 * Sie startete einmal mit allen Räumen hell, und damit war sie für alles, was
 * sie eigentlich prüfen soll, das falsche Spiel: Die Taschenlampe war Zierde,
 * die Schalttafel ein Ausschalter, und das Monster sah den Techniker quer
 * durch die beleuchtete Station. Seit diesem Paket geht Licht nur noch an,
 * wenn jemand einen Schalter umlegt — und dann nach denselben Regeln wie in
 * 3D (`rules/lamps.ts`), aus derselben Buchführung.
 */
describe('Licht in der 2D-Runde', () => {
  it('fängt in jedem Raum aus an', () => {
    for (const seed of [1, 2, 3]) {
      const round = new FlatRound(seed, { test: true });
      expect(round.state().lit).toEqual([]);
      expect(round.snapshot().lights.filter((l) => l.kind === 'lamp' && l.on)).toEqual([]);
    }
  });

  it('lässt höchstens zwei Lampen gleichzeitig brennen', () => {
    const round = new FlatRound(1, { test: true });
    const rooms = round.house.rooms.slice(0, 3).map((room) => room.id);
    expect(round.switchLight(rooms[0]!)).toBe('Licht an.');
    expect(round.switchLight(rooms[1]!)).toBe('Licht an.');
    expect(round.state().lit.slice().sort()).toEqual(rooms.slice(0, 2).slice().sort());
    // Die dritte macht die älteste aus — und sagt es.
    expect(round.switchLight(rooms[2]!)).toBe('Licht an · dafür geht ein anderes aus.');
    expect(round.state().lit).not.toContain(rooms[0]);
    expect(round.state().lit).toHaveLength(2);
  });

  it('macht eine Lampe nach ihrer Zeit von selbst wieder aus', () => {
    const round = new FlatRound(1, { test: true });
    const room = round.house.rooms[0]!.id;
    round.switchLight(room);
    expect(round.state().lit).toContain(room);
    // Länger als die längste Brenndauer, dann ist sie sicher durch.
    for (let t = 0; t < LAMP_RANGE[1] + 1; t += DT) round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.state().lit).not.toContain(room);
  });
});

/**
 * **Was die Karte über eine Tür sagt, die abkühlt** (`rules/doorLocks.ts`):
 * Sie ist offen, sie ist nicht gesperrt, und sie zählt vierzig Sekunden
 * herunter. Daraus wird der grüne Balken über der Tür.
 */
describe('Die abkühlende Tür in der 2D-Runde', () => {
  it('zeigt die Restzeit, solange sie nicht wieder gesperrt werden darf', () => {
    const round = new FlatRound(1, { test: true });
    const door = round.house.doors.find((one) => one.b)!;
    expect(round.lockDoor(door.id)).toMatch(/verriegelt/);
    // Gesperrt: der rote Balken, keine Abkühlung.
    expect(round.doorHold(door.id)!.cooling).toBeUndefined();
    expect(round.lockDoor(door.id)).toBe('Tür entriegelt.');
    const warm = round.doorHold(door.id)!;
    expect(warm.cooling).toBe(true);
    expect(warm.total).toBe(LOCK_COOLDOWN);
    expect(warm.left).toBeCloseTo(LOCK_COOLDOWN, 6);
    // Und der Schalter sagt es, statt wortlos nichts zu tun.
    expect(round.lockDoor(door.id)).toBe('Der Riegel ist noch warm.');
    // Und die Karte zeichnet den grünen Balken: `MapDoor.cooling` statt `hold`.
    round.step(DT, { x: 0, z: 0, sprint: false });
    const drawn = round.snapshot().doors.find((one) => one.id === door.id)!;
    expect(drawn.locked).toBe(false);
    expect(drawn.hold).toBeUndefined();
    expect(drawn.cooling?.total).toBe(LOCK_COOLDOWN);
    for (let t = 0; t < LOCK_COOLDOWN + 1; t += DT) round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.doorHold(door.id)).toBeNull();
    expect(round.lockDoor(door.id)).toMatch(/verriegelt/);
  });
});

/**
 * **Und ab und zu fährt ein Schott von selbst auf** (`rules/doorGlitch.ts`) —
 * ohne dass jemand davorsteht, und nie ein gesperrtes.
 */
describe('Der Stationsfehler an den Schotten', () => {
  it('öffnet in einer Runde mehrmals eine Tür, an der niemand steht', () => {
    const round = new FlatRound(2, { test: true });
    const doors = round.house.doors.map((door) => door.id);
    let ghosts = 0;
    for (let t = 0; t < 300; t += DT) {
      round.step(DT, { x: 0, z: 0, sprint: false });
      for (const id of doors) {
        if (!round.doorOpen(id)) continue;
        const door = round.house.doors.find((one) => one.id === id)!;
        const at = doorCentre(door);
        // Der Techniker steht still in der Zentrale; ein Schott irgendwo im
        // Schiff, das offen steht, hat niemanden vor sich.
        if (Math.hypot(at.x - round.player.x, at.z - round.player.z) > 6) ghosts++;
      }
    }
    expect(ghosts).toBeGreaterThan(0);
  });

  it('fährt nie ein gesperrtes Schott auf', () => {
    const round = new FlatRound(3, { test: true });
    const door = round.house.doors.find((one) => one.b)!;
    round.lockDoor(door.id);
    for (let t = 0; t < 300; t += DT) {
      round.step(DT, { x: 0, z: 0, sprint: false });
      if (!round.state().shut.includes(door.id)) {
        // Die Sperre läuft von selbst ab; danach ist die Tür keine gesperrte mehr.
        round.lockDoor(door.id);
        continue;
      }
      expect(round.doorOpen(door.id)).toBe(false);
    }
  });
});
