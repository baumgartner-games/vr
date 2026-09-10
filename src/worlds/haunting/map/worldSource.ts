import type { HouseSpec } from '../house';
import type { DroneState, HauntState } from '../net';
import { ENTITY_PROFILES } from '../threat';
import { BOT_FOV, BOT_VISION, MONSTER_FOV } from '../perception';
import { MONSTERS, repairsFor, puzzleFor, puzzleSolved } from '../mission';
import { stationLayout } from '../stationLayout';
import { spaceAtMetres } from './geometry';
import { COMMAND } from '../roomGraph';
import type { MapSource } from './mapSource';
import type { MapEntity, MapItem, MapLight, MapRound } from './mapSnapshot';
import { TORCH_FOV, TORCH_RANGE } from './flatRound';

/**
 * **Was die 3D-Welt der Karte in die Hand gibt** — eine Handvoll Getter,
 * alle lesend, alle ohne three.js-Typen nach außen.
 *
 * `HauntingWorld` füllt dieses Objekt aus seinen privaten Feldern
 * (`mapSource()`); alles Weitere — Räume, Wände, Türen, Items — rechnet
 * `worldMapSource` hier aus Bauplan und Stand. Die Welt muss nur sagen, wo
 * ihre Lampen hängen, ob ein Türblatt offen ist und wer wo steht.
 */
export interface WorldHandles {
  spec(): HouseSpec;
  state(): HauntState;
  drone(): DroneState | null;
  lamps(): ReadonlyArray<{ id: string; x: number; z: number; color?: string; intensity: number }>;
  doorOpen(id: string): boolean;
  /** Der eigene Kopf — nur in der Technikerrolle; sonst `null`. */
  player(): { x: number; z: number; yaw: number; sprinting: boolean; moving: boolean } | null;
  /** Ob die Taschenlampe brennt und welches Werkzeug gehalten wird. */
  torch(): { lit: boolean; held: string };
  /** Der Modelltechniker der Bot-Runde. */
  bot(): { x: number; z: number; yaw: number } | null;
  /** Das Monster: Position aus dem Stand, Blick aus dem Modell. */
  monsterYaw(): number;
  /** Mitspieler, die als Techniker im Haus stehen. */
  peers(): ReadonlyArray<{ id: string; name: string; x: number; z: number; yaw: number }>;
  /** Der Stand der Rundenregeln (Paket Rundenregeln), wenn die Welt sie führt. */
  round?(): MapRound;
}

export function worldMapSource(world: WorldHandles): MapSource {
  const spaceOf = (spec: HouseSpec, at: { x: number; z: number }): string => {
    const space = spaceAtMetres(spec, at);
    return space === null ? '' : space === COMMAND ? COMMAND : space.id;
  };
  return {
    spec: () => world.spec(),
    state: () => world.state(),
    drone: () => world.drone(),
    lamps: () => world.lamps(),
    doorOpen: (id) => world.doorOpen(id),
    round: world.round ? () => world.round!() : undefined,
    entities: () => {
      const spec = world.spec();
      const state = world.state();
      const out: MapEntity[] = [];
      const me = world.player();
      const torch = world.torch();
      if (me)
        out.push({
          id: 'player',
          kind: 'player',
          label: 'Techniker',
          at: { x: me.x, z: me.z },
          yaw: me.yaw,
          roomId: spaceOf(spec, me),
          concealed: !!state.crew.hidden || state.crew.venting > 0,
          moving: me.moving,
          sprinting: me.sprinting,
          held: torch.held,
          sense: { fov: BOT_FOV, range: BOT_VISION, hearing: 0 },
        });
      const bot = world.bot();
      if (bot && state.crew.simulation)
        out.push({
          id: 'bot',
          kind: 'bot',
          label: 'Bot',
          at: { x: bot.x, z: bot.z },
          yaw: bot.yaw,
          roomId: spaceOf(spec, bot),
          concealed: !!state.crew.hidden,
          moving: true,
          sprinting: false,
          held: '',
          sense: { fov: BOT_FOV, range: BOT_VISION, hearing: 0 },
        });
      if (state.monsterOn && state.monster) {
        const kind = state.crew.options.monster;
        const profile = ENTITY_PROFILES[kind];
        out.push({
          id: 'monster',
          kind: 'monster',
          label: MONSTERS.find((m) => m.id === kind)?.name ?? profile.label,
          at: { x: state.monster.x, z: state.monster.z },
          yaw: world.monsterYaw(),
          roomId: spaceOf(spec, state.monster),
          concealed: state.crew.venting > 0,
          moving: true,
          sprinting: false,
          held: '',
          sense: { fov: MONSTER_FOV, range: profile.vision, hearing: profile.hearing },
        });
      }
      const drone = world.drone();
      if (drone)
        out.push({
          id: 'drone',
          kind: 'drone',
          label: 'Drohne',
          at: { x: drone.x, z: drone.z },
          yaw: drone.yaw,
          roomId: spaceOf(spec, drone),
          concealed: false,
          moving: !!drone.target,
          sprinting: false,
          held: '',
        });
      for (const peer of world.peers())
        out.push({
          id: `peer:${peer.id}`,
          kind: 'peer',
          label: peer.name,
          at: { x: peer.x, z: peer.z },
          yaw: peer.yaw,
          roomId: spaceOf(spec, peer),
          concealed: false,
          moving: false,
          sprinting: false,
          held: '',
        });
      return out;
    },
    items: () => {
      const spec = world.spec();
      const state = world.state();
      const crew = state.crew;
      const layout = stationLayout(spec);
      const out: MapItem[] = [];
      const repairs = repairsFor(spec);
      for (const placement of layout) {
        if (placement.kind === 'cargo') {
          const task = spec.tasks.find((t) => t.roomId === placement.roomId);
          const taken = task
            ? state.taken.includes(task.id) || state.done.includes(task.id)
            : false;
          out.push({
            id: placement.id,
            kind: 'cargo',
            label: task ? task.label : 'Fracht',
            roomId: placement.roomId,
            at: { x: placement.approach.x, z: placement.approach.z },
            state: taken ? 'taken' : crew.opened.includes(placement.id) ? 'open' : 'closed',
            interactive: !taken,
          });
        } else if (placement.kind === 'locker') {
          out.push({
            id: placement.id,
            kind: 'locker',
            label: 'Schutzschrank',
            roomId: placement.roomId,
            at: { x: placement.approach.x, z: placement.approach.z },
            state: state.destroyed.includes(placement.roomId)
              ? 'destroyed'
              : crew.hidden === placement.roomId
                ? 'open'
                : 'locked',
            interactive: !state.destroyed.includes(placement.roomId),
          });
        } else if (placement.kind === 'console' && placement.repairId) {
          const repair = repairs.find((r) => r.id === placement.repairId);
          const solved = repair ? puzzleSolved(repair, puzzleFor(crew, repair.id)) : false;
          out.push({
            id: placement.id,
            kind: 'console',
            label: repair?.title ?? 'Konsole',
            roomId: placement.roomId,
            at: { x: placement.approach.x, z: placement.approach.z },
            state: solved ? 'solved' : 'broken',
            interactive: !solved,
          });
        }
      }
      out.push({
        id: 'fuse',
        kind: 'fuse',
        label: 'Sicherungskasten',
        roomId: spec.fuse.roomId,
        at: { x: (spec.fuse.x + 0.5) * 2.5, z: (spec.fuse.z + 0.5) * 2.5 },
        state: state.fuse ? 'open' : 'closed',
        interactive: true,
      });
      return out;
    },
    carriedLights: () => {
      const lights: MapLight[] = [];
      const me = world.player();
      const torch = world.torch();
      if (me && torch.lit)
        lights.push({
          id: 'torch',
          roomId: spaceOf(world.spec(), me),
          at: { x: me.x, z: me.z },
          on: true,
          radius: TORCH_RANGE,
          kind: 'torch',
          yaw: me.yaw,
          fov: TORCH_FOV,
          color: '#ffe9b0',
        });
      const drone = world.drone();
      if (drone?.light)
        lights.push({
          id: 'drone-light',
          roomId: spaceOf(world.spec(), drone),
          at: { x: drone.x, z: drone.z },
          on: true,
          radius: 9,
          kind: 'drone',
          yaw: drone.yaw,
          fov: (60 * Math.PI) / 180,
          color: '#e8f4ff',
        });
      return lights;
    },
  };
}
