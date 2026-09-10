import { FlatRound, MONSTER_ID } from '../map/flatRound';
import { readMonsterInput, type MonsterNetInput } from '../net';
import { SUIT_LIVES } from '../rules/roundRules';
import { VENT_ENTER_SECONDS } from '../vents/ventTravel';
import { NetMonsterControl, NET_MONSTER_STALE } from './netMonsterControl';
import { NetMonsterPort } from './netMonsterPort';

const DT = 1 / 30;
const IDLE = { x: 0, z: 0, sprint: false };

/** Eine Nachricht, wie sie vom Telefon käme — alles, was nicht gesagt ist, ist null. */
function says(part: Partial<MonsterNetInput>): MonsterNetInput {
  return { x: 0, z: 0, sprint: false, attack: 0, interact: 0, vent: 0, ...part };
}

/**
 * Der Gastgeber mit einer 2D-Runde als Welt: Das Steuer hängt als `driver`
 * in der Runde, die Station gilt als besetzt, und die Uhr läuft mit der Runde.
 */
function host(seed = 3): {
  round: FlatRound;
  control: NetMonsterControl;
  occupied: { value: boolean };
  clock: { now: number };
  /** Eine Nachricht vom Telefon — sie wird danach im Takt wiederholt, wie das Telefon es tut. */
  say: (part: Partial<MonsterNetInput>) => void;
  /** Dasselbe mit einer fertigen Nachricht, wie sie von der Leitung kommt. */
  feed: (input: MonsterNetInput) => void;
  step: (frames: number) => void;
} {
  const round = new FlatRound(seed, { roll: 1 });
  const occupied = { value: true };
  const clock = { now: 100 };
  const control = new NetMonsterControl(
    {
      house: () => round.house,
      state: () => round.haunt,
      rider: () => round.monster,
      ride: () => round.ventRide,
      occupied: () => occupied.value,
    },
    () => clock.now,
  );
  round.driver = control;
  // Die erste Nachricht ist der Platz: Zähler bei null, nichts gedrückt.
  let last = says({});
  control.accept(last);
  const feed = (input: MonsterNetInput): void => {
    last = input;
    control.accept(last);
  };
  const say = (part: Partial<MonsterNetInput>): void => feed(says(part));
  const step = (frames: number): void => {
    for (let i = 0; i < frames; i++) {
      round.step(DT, IDLE);
      round.haunt.ride = round.ventRide.phase;
      clock.now += DT;
      // Zehn Ansagen je Sekunde, immer derselbe Stand: Das ist die Leitung.
      if (i % 3 === 2) control.accept(last);
    }
  };
  return { round, control, occupied, clock, say, feed, step };
}

describe('Das Steuer übers Netz beim Gastgeber', () => {
  it('steuert nur bei besetzter Station, laufender Runde und frischer Nachricht', () => {
    const { round, control, occupied, clock } = host();
    expect(control.active()).toBe(true);
    occupied.value = false;
    expect(control.active()).toBe(false);
    occupied.value = true;
    round.haunt.phase = 'lost';
    expect(control.active()).toBe(false);
    round.haunt.phase = 'running';
    round.haunt.monsterOn = false;
    expect(control.active()).toBe(false);
    round.haunt.monsterOn = true;
    // Das Telefon in der Tasche: Nach der Frist rechnet wieder die KI.
    clock.now += NET_MONSTER_STALE + 0.1;
    expect(control.active()).toBe(false);
    control.accept(says({}));
    expect(control.active()).toBe(true);
  });

  it('bewegt das Monster mit dem Stock und lässt es ohne Stock stehen', () => {
    const { round, say, step } = host();
    const start = { x: round.monster.x, z: round.monster.z };
    step(30);
    expect(round.monster.x).toBe(start.x);
    expect(round.monster.z).toBe(start.z);
    say({ x: 1, z: 0 });
    step(30);
    expect(round.monster.x).toBeGreaterThan(start.x + 0.5);
    expect(round.snapshot().entities.find((e) => e.id === MONSTER_ID)?.moving).toBe(true);
    const walked = round.monster.x - start.x;
    say({ x: 0, z: 0 });
    step(10);
    expect(round.monster.x - start.x).toBe(walked);
    // Rennen ist schneller.
    Object.assign(round.monster, start);
    say({ x: 1, z: 0, sprint: true });
    step(30);
    expect(round.monster.x - start.x).toBeGreaterThan(walked * 1.2);
  });

  it('führt die Differenz der Zähler genau einmal aus', () => {
    const { round, control, step } = host();
    round.mode = 'omniscient';
    round.place({ x: round.monster.x + 1, z: round.monster.z });
    step(2);
    // Drei Nachrichten mit demselben Stand sind ein Druck.
    control.accept(says({ attack: 1 }));
    control.accept(says({ attack: 1 }));
    control.accept(says({ attack: 1 }));
    const strikes = [
      control.decide(DT).strike,
      control.decide(DT).strike,
      control.decide(DT).strike,
    ];
    expect(strikes).toEqual([true, false, false]);
    // Von eins auf drei sind zwei Drücke.
    control.accept(says({ attack: 3 }));
    expect([
      control.decide(DT).strike,
      control.decide(DT).strike,
      control.decide(DT).strike,
    ]).toEqual([true, true, false]);
    // Ein Zähler, der zurückspringt (neues Telefon), holt nichts nach.
    control.accept(says({ attack: 1 }));
    expect(control.decide(DT).strike).toBe(false);
    control.accept(says({ attack: 2 }));
    expect(control.decide(DT).strike).toBe(true);
  });

  it('trifft mit dem Knopf nur in Reichweite — im Freien und in der Kabine', () => {
    const { round, say, step } = host();
    round.mode = 'omniscient';
    // Weit weg: Der Druck verpufft.
    const far = round.graph.centre(round.player.space);
    expect(round.place(far)).toBe(true);
    step(2);
    say({ attack: 1 });
    step(2);
    expect(round.haunt.crew.hp).toBe(SUIT_LIVES);
    // Daneben, ohne Knopf: nichts. Mit Knopf: ein Leben.
    round.place({ x: round.monster.x + 1, z: round.monster.z });
    step(60);
    expect(round.haunt.crew.hp).toBe(SUIT_LIVES);
    say({ attack: 2 });
    step(2);
    expect(round.haunt.crew.hp).toBe(SUIT_LIVES - 1);
    // In die Kabine; das Monster davor; Angreifen reißt sie auf.
    const cabin =
      round.items().find((i) => i.kind === 'locker' && i.roomId === round.monster.space) ??
      round.items().find((i) => i.kind === 'locker')!;
    expect(round.place(cabin.at)).toBe(true);
    step(1);
    round.act('interact');
    expect(round.haunt.crew.hidden).toBe(cabin.roomId);
    // Zu weit von der Kabine: Der Knopf gilt nicht.
    Object.assign(round.monster, { x: cabin.at.x + 4, z: cabin.at.z, space: cabin.roomId });
    round.haunt.crew.invulnerable = 0;
    say({ attack: 3 });
    step(2);
    expect(round.haunt.crew.hidden).toBe(cabin.roomId);
    expect(round.rules.cabinUsable(cabin.roomId)).toBe(true);
    Object.assign(round.monster, { x: cabin.at.x + 0.6, z: cabin.at.z, space: cabin.roomId });
    say({ attack: 4 });
    step(2);
    expect(round.haunt.crew.hidden).toBe('');
    expect(round.haunt.crew.hp).toBe(SUIT_LIVES - 2);
    expect(round.rules.cabinUsable(cabin.roomId)).toBe(false);
  });

  it('steigt auf Interagieren ein, wählt das Ziel und steigt drüben erst auf Knopf aus', () => {
    const { round, control, say, step } = host(2);
    const reactor = round.vents.flap('vent-reactor')!;
    Object.assign(round.monster, { x: reactor.approach.x, z: reactor.approach.z, space: 'r2' });
    step(1);
    say({ interact: 1, vent: 1 });
    expect(round.ventRide.phase).toBe('entering');
    expect(round.ventRide.to?.id).toBe('vent-lower-engine');
    expect(control.notes.at(-1)).toBe('Einsteigen · nach Lower Engine.');
    step(Math.ceil((VENT_ENTER_SECONDS + 0.2) / DT));
    expect(round.ventRide.phase).toBe('riding');
    step(Math.ceil(20 / DT));
    // Ein Spieler bleibt sitzen, bis er aussteigt — auch nach zwanzig Sekunden.
    expect(round.ventRide.phase).toBe('arrived');
    expect(round.haunt.ride).toBe('arrived');
    // Dieselbe Nachricht noch dreimal: kein zweiter Druck.
    say({ interact: 1 });
    say({ interact: 1 });
    expect(round.ventRide.phase).toBe('arrived');
    say({ interact: 2 });
    expect(round.ventRide.phase).toBe('exiting');
    step(Math.ceil(2 / DT));
    expect(round.ventRide.busy).toBe(false);
    expect(round.monster.space).toBe('r5');
  });

  it('bricht Holztüren auf und lässt Stahl stehen', () => {
    const { round, control, say, step } = host(2);
    const { doorCentre } = jest.requireActual<typeof import('../map/geometry')>('../map/geometry');
    // Die Station hat nur Stahltüren (`house.ts`); eine davon wird für den
    // Test zu Holz — die Regel gilt dem Material, nicht der Stelle.
    const [steel, wood] = round.house.doors;
    wood!.material = 'wood';
    round.haunt.shut.push(wood!.id, steel!.id);
    const shut = round.haunt.shut;
    Object.assign(round.monster, doorCentre(steel!));
    step(1);
    say({ interact: 1 });
    expect(control.notes.at(-1)).toBe('Stahl. Das hält.');
    expect(round.haunt.shut).toContain(steel!.id);
    Object.assign(round.monster, doorCentre(wood!));
    step(1);
    say({ interact: 2 });
    expect(control.notes.at(-1)).toBe('Holz splittert.');
    expect(round.haunt.shut).not.toContain(wood!.id);
    // In derselben Liste, nicht in einer neuen: Die Welt hält sich an dieses Array.
    expect(round.haunt.shut).toBe(shut);
  });

  /**
   * **Die ganze Strecke**: Stock und Knopf auf dem Telefon, die Nachricht
   * über die Leitung, das Steuer beim Gastgeber, die Runde bewegt das
   * Monster und reißt die Kabine auf — wie `monsterRole.test.ts` es lokal
   * tut, nur mit einer Leitung dazwischen.
   */
  it('spielt vom Telefon bis zur aufgerissenen Kabine', () => {
    const { round, feed, step } = host();
    round.mode = 'omniscient';
    const port = new NetMonsterPort({
      snapshot: () => round.snapshot(),
      state: () => round.haunt,
      owned: () => true,
    });
    expect(port.claim()).toBe(true);
    const wire = (): void => {
      const message = JSON.parse(JSON.stringify(port.message())) as unknown;
      feed(readMonsterInput(message)!);
    };
    wire();
    const start = { x: round.monster.x, z: round.monster.z };
    port.input({ x: 1, z: 0, sprint: false });
    wire();
    step(30);
    expect(round.monster.x).toBeGreaterThan(start.x + 0.5);
    port.input({ x: 0, z: 0, sprint: false });
    wire();
    // Der Techniker versteckt sich; das Monster stellt sich davor.
    const cabin =
      round.items().find((i) => i.kind === 'locker' && i.roomId === round.monster.space) ??
      round.items().find((i) => i.kind === 'locker')!;
    expect(round.place(cabin.at)).toBe(true);
    step(1);
    round.act('interact');
    expect(round.haunt.crew.hidden).toBe(cabin.roomId);
    Object.assign(round.monster, { x: cabin.at.x + 0.6, z: cabin.at.z, space: cabin.roomId });
    step(1);
    expect(port.act('attack')).toBe('');
    // Zehn Ansagen je Sekunde: Der Druck kommt mehrfach an, wirkt aber einmal.
    wire();
    wire();
    wire();
    step(2);
    expect(round.haunt.crew.hidden).toBe('');
    expect(round.haunt.crew.hp).toBe(SUIT_LIVES - 1);
    expect(round.rules.cabinUsable(cabin.roomId)).toBe(false);
    expect(round.snapshot().items.find((i) => i.id === `locker-${cabin.roomId}`)?.state).toBe(
      'destroyed',
    );
  });
});
