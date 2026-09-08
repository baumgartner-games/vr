import * as THREE from 'three';
import type { PlayerRig } from '../../core/PlayerRig';
import type { Handedness, XRInput } from '../../core/XRInput';
import type { MenuEntry } from '../../ui/menu';
import {
  COMFORT_HAPTICS,
  COMFORT_TURNS,
  COMFORT_TURN_LABELS,
  comfortSettings,
  comfortVignetteTarget,
  stepComfortVignette,
  type ComfortCue,
  type ComfortSettings,
  type ComfortVignette,
} from './comfortSettings';

const STORAGE = 'bgvr.haunting.comfort.v1';
const VIGNETTES: readonly ComfortVignette[] = ['off', 'soft', 'strong'];
const VIGNETTE_LABELS: Record<ComfortVignette, string> = {
  off: 'Aus',
  soft: 'Sanft',
  strong: 'Stark',
};

export interface HauntingComfortHost {
  rig: PlayerRig;
  camera: THREE.PerspectiveCamera;
  input: XRInput;
  presenting(): boolean;
  /** False while a menu or a remote camera owns the view. */
  enabled(): boolean;
  changed?(): void;
}

/** Local VR preferences; never changes the room host's gameplay state. */
export class HauntingComfort {
  private current: ComfortSettings;
  private readonly previousTurn: { mode: PlayerRig['turnMode']; snap: number; smooth: number };
  private readonly previousPosition = new THREE.Vector3();
  private readonly previousRotation = new THREE.Quaternion();
  private hasPosition = false;
  private amount = 0;
  private elapsed = 0;
  private readonly pulseTimes = new Map<string, number>();
  private disposed = false;
  private readonly mask: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor(private readonly host: HauntingComfortHost) {
    this.current = readSettings();
    this.previousTurn = {
      mode: host.rig.turnMode,
      snap: host.rig.snapAngle,
      smooth: host.rig.smoothTurnSpeed,
    };
    this.applyTurn();
    this.mask = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        uniforms: { amount: { value: 0 }, primaryView: { value: 1 } },
        vertexShader:
          'varying vec2 vEdge; void main(){vEdge=position.xy;gl_Position=vec4(position.xy,-1.,1.);}',
        fragmentShader:
          'varying vec2 vEdge; uniform float amount; uniform float primaryView; void main(){float rim=smoothstep(.46,.94,length(vEdge));gl_FragColor=vec4(0.,0.,0.,rim*amount*primaryView);}',
      }),
    );
    this.mask.name = 'haunting-vr-comfort-border';
    this.mask.frustumCulled = false;
    this.mask.renderOrder = 1005;
    this.mask.visible = false;
    // Reflected cameras have a negative determinant. The player's comfort
    // overlay belongs to their own eyes, not to the training mirror image.
    this.mask.onBeforeRender = (_renderer, _scene, camera) => {
      this.mask.material.uniforms.primaryView!.value = camera.matrixWorld.determinant() > 0 ? 1 : 0;
    };
    host.camera.add(this.mask);
  }

  get settings(): Readonly<ComfortSettings> {
    return this.current;
  }

  set(values: Partial<ComfortSettings>): void {
    if (this.disposed) return;
    this.current = comfortSettings({ ...this.current, ...values });
    this.applyTurn();
    try {
      globalThis.localStorage?.setItem(STORAGE, JSON.stringify(this.current));
    } catch {
      /* Session preferences still work without storage. */
    }
    this.host.changed?.();
  }

  update(dt: number): void {
    if (this.disposed) return;
    const time = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
    this.elapsed += time;
    const rig = this.host.rig;
    const active = this.host.presenting() && this.host.enabled();
    // Only the rig moves for artificial locomotion. Real head movement and
    // looking around therefore never darken the view.
    const distance = this.hasPosition ? rig.position.distanceTo(this.previousPosition) : 0;
    const angle = this.hasPosition ? rig.quaternion.angleTo(this.previousRotation) : 0;
    const speed = time > 0 && distance < 1 ? distance / time : 0;
    this.previousPosition.copy(rig.position);
    this.previousRotation.copy(rig.quaternion);
    this.hasPosition = true;
    // A held snap-turn stick stops turning after one step, so it must not
    // leave the border closed until the stick is released.
    const turning =
      !rig.paused && !rig.locked && rig.menuStick !== 'right' && angle > 0.001 && angle < 0.9;
    const target = active ? comfortVignetteTarget(this.current.vignette, speed, turning) : 0;
    this.amount =
      active && this.current.vignette !== 'off'
        ? stepComfortVignette(this.amount, target, time)
        : 0;
    this.mask.material.uniforms.amount!.value = this.amount;
    this.mask.visible = active && this.amount > 0.003;
  }

  pulse(cue: ComfortCue, hand: Handedness | null = null): void {
    if (this.disposed || !this.current.haptics || !this.host.presenting()) return;
    const pulse = COMFORT_HAPTICS[cue];
    const hands: readonly Handedness[] = hand ? [hand] : ['left', 'right'];
    for (const side of hands) {
      const key = `${side}:${cue}`;
      if (this.elapsed - (this.pulseTimes.get(key) ?? -Infinity) < 0.06) continue;
      this.pulseTimes.set(key, this.elapsed);
      this.host.input.get(side)?.pulse(pulse.intensity, pulse.milliseconds);
    }
  }

  menu(): MenuEntry[] {
    return [
      {
        id: 'ship:comfort',
        label: 'VR-Komfort',
        icon: 'controller',
        sub: 'Drehung, Sichtfeldrand und Rückmeldung',
        children: [
          {
            id: 'ship:comfort:turn',
            label: `Drehung: ${COMFORT_TURN_LABELS[this.current.turn]}`,
            icon: 'controller',
            sub: 'Schrittweise oder fließend · rechter Stick',
            run: () =>
              this.set({
                turn: COMFORT_TURNS[
                  (COMFORT_TURNS.indexOf(this.current.turn) + 1) % COMFORT_TURNS.length
                ]!,
              }),
          },
          {
            id: 'ship:comfort:vignette',
            label: `Komfortrand: ${VIGNETTE_LABELS[this.current.vignette]}`,
            icon: 'scope',
            sub: 'Nur bei künstlicher Bewegung · Mitte bleibt frei',
            run: () =>
              this.set({
                vignette:
                  VIGNETTES[(VIGNETTES.indexOf(this.current.vignette) + 1) % VIGNETTES.length]!,
              }),
          },
          {
            id: 'ship:comfort:haptics',
            label: 'Controller-Vibration',
            icon: 'controller',
            checked: this.current.haptics,
            run: () => this.set({ haptics: !this.current.haptics }),
          },
        ],
      },
    ];
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.host.rig.turnMode = this.previousTurn.mode;
    this.host.rig.snapAngle = this.previousTurn.snap;
    this.host.rig.smoothTurnSpeed = this.previousTurn.smooth;
    this.mask.removeFromParent();
    this.mask.geometry.dispose();
    this.mask.material.dispose();
    this.pulseTimes.clear();
  }

  private applyTurn(): void {
    const turn = this.current.turn;
    this.host.rig.turnMode = turn.startsWith('snap') ? 'snap' : 'smooth';
    if (turn.startsWith('snap'))
      this.host.rig.snapAngle = THREE.MathUtils.degToRad(turn === 'snap45' ? 45 : 30);
    else
      this.host.rig.smoothTurnSpeed = THREE.MathUtils.degToRad(
        turn === 'smooth45' ? 45 : turn === 'smooth90' ? 90 : 60,
      );
  }
}

function readSettings(): ComfortSettings {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE);
    return comfortSettings(raw ? (JSON.parse(raw) as unknown) : undefined);
  } catch {
    return comfortSettings(undefined);
  }
}
