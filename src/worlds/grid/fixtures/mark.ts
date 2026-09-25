import * as THREE from 'three';
import { TILE } from '../../nav/navTile';
import type {
  FixtureBuild,
  FixtureEvent,
  FixtureInput,
  FixtureKind,
  FixturePlacement,
  FixtureView,
} from './index';

/**
 * **Bodenmarken für Wandtests** — eine Kachel Start, eine „darf hin" (grün),
 * eine „darf nicht hin" (rot).
 *
 * Gewünscht: _„ich denke ich würde gerne für die wände test cases definieren
 * wollen, wo der spieler hin dürfte und wohin nicht. dafür wären weitere floor
 * tiles 1x1 gut (grün und rot, start punkt des spielers)"_.
 *
 * Geprüft wird in der Welt (`GridWorld.checkMarks`): Von jeder Startmarke aus
 * wird das Zellgitter geflutet, mit genau der Regel, mit der auch gegangen
 * wird (`CellGrid.canStep`, 2×2-Block). Eine grüne Marke ist bestanden, wenn
 * die Flut sie erreicht, eine rote, wenn nicht. Das Ergebnis steht am Rand der
 * Marke — weiß bestanden, magenta blinkend durchgefallen — und als Zeile am
 * Handgelenk, sobald sich die Zahl ändert.
 *
 * Eine Marke hält niemanden auf und kostet nichts: Sie ist Farbe auf dem
 * Boden und kein Möbel.
 */

export type MarkRole = 'start' | 'go' | 'stop';

export interface MarkState {
  /** Das Urteil der Welt — `null`, solange es keine Startmarke gibt. */
  verdict: 'pass' | 'fail' | null;
  /** Uhr fürs Blinken. */
  clock: number;
}

interface MarkView extends FixtureView {
  frame: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
}

const PLATE = 0.9;
const COLOURS: Record<MarkRole, number> = { start: 0x3b82f6, go: 0x22c55e, stop: 0xef4444 };
const PASS = 0xffffff;
const FAIL = 0xff2bd6;

/** Der Rahmen um die Marke: vier Leisten als eine Form. */
function frameGeometry(): THREE.BufferGeometry {
  const outer = PLATE / 2 + 0.03,
    inner = PLATE / 2 - 0.06;
  const shape = new THREE.Shape([
    new THREE.Vector2(-outer, -outer),
    new THREE.Vector2(outer, -outer),
    new THREE.Vector2(outer, outer),
    new THREE.Vector2(-outer, outer),
  ]);
  shape.holes.push(
    new THREE.Path([
      new THREE.Vector2(-inner, -inner),
      new THREE.Vector2(-inner, inner),
      new THREE.Vector2(inner, inner),
      new THREE.Vector2(inner, -inner),
    ]),
  );
  return new THREE.ShapeGeometry(shape);
}

function markKind(role: MarkRole, kind: string, label: string): FixtureKind<MarkState> {
  return {
    kind,
    label,
    accent: COLOURS[role],
    edge: false,
    cost: 1,
    init(): MarkState {
      return { verdict: null, clock: 0 };
    },
    step(
      state: MarkState,
      _place: FixturePlacement,
      input: FixtureInput,
      dt: number,
    ): FixtureEvent[] {
      state.verdict = input.verdict ?? null;
      state.clock += dt;
      return [];
    },
    solid(): boolean {
      return false;
    },
    build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
      const group = new THREE.Group();
      group.name = `fixture:${place.id}`;
      group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(PLATE * TILE, PLATE * TILE),
        new THREE.MeshBasicMaterial({ color: COLOURS[role], transparent: true, opacity: 0.8 }),
      );
      plate.rotation.x = -Math.PI / 2;
      plate.position.y = 0.012;
      plate.name = `mark-${role}`;
      group.add(plate);
      if (role === 'start') {
        // Ein Pfeil nach Norden, damit man die Startmarke von oben erkennt.
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.4, 3),
          new THREE.MeshBasicMaterial({ color: 0xffffff }),
        );
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.y = 0.03;
        group.add(arrow);
      }
      const frame = new THREE.Mesh(frameGeometry(), new THREE.MeshBasicMaterial({ color: PASS }));
      frame.rotation.x = -Math.PI / 2;
      frame.position.y = 0.016;
      frame.visible = false;
      group.add(frame);
      ctx.group.add(group);
      const view: MarkView = { object: group, handle: null, frame };
      return view;
    },
    apply(view: FixtureView, state: MarkState): void {
      const frame = (view as MarkView).frame;
      if (state.verdict === null) {
        frame.visible = false;
        return;
      }
      frame.material.color.setHex(state.verdict === 'pass' ? PASS : FAIL);
      // Durchgefallen blinkt, damit es von oben auffällt.
      frame.visible = state.verdict === 'pass' || Math.floor(state.clock * 3) % 2 === 0;
    },
  };
}

export const MARK_START = markKind('start', 'mark-start', 'Start (Wandtest)');
export const MARK_GO = markKind('go', 'mark-go', 'Darf hin (grün)');
export const MARK_STOP = markKind('stop', 'mark-stop', 'Darf nicht hin (rot)');

/** Welche Rolle eine Art spielt — `null` für jede andere. */
export function markRole(kind: string): MarkRole | null {
  if (kind === MARK_START.kind) return 'start';
  if (kind === MARK_GO.kind) return 'go';
  if (kind === MARK_STOP.kind) return 'stop';
  return null;
}
