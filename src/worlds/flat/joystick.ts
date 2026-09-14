/**
 * **Der Stock unter dem linken Daumen.**
 *
 * Reine Rechnung (`stickValue`) und ein kleines DOM-Bauteil darum. In Ruhe
 * steht der Stock sichtbar unten links (die Stelle setzt das CSS) — ein
 * Stock, den man erst durch Tippen ins Leere findet, ist auf dem Telefon
 * keiner. Aufgesetzt springt er dorthin, wo der Daumen liegt, und nicht an
 * die feste Stelle — ein Telefon hält man nie zweimal gleich; losgelassen
 * kehrt er zurück. Die Totzone verhindert, dass ein aufliegender Daumen den
 * Spieler kriechen lässt; jenseits des Sprintrings rennt er.
 */
export interface StickValue {
  /** Nach Osten, in [-1, 1]. */
  x: number;
  /** Nach Süden (auf dem Bild: nach unten), in [-1, 1]. */
  z: number;
  /** Wie weit der Stock ausgelenkt ist, in [0, 1]. */
  magnitude: number;
  sprint: boolean;
}

/** Wie weit man den Stock schieben kann, in Punkten. */
export const STICK_RADIUS = 56;
/** Unterhalb davon tut sich nichts. */
export const STICK_DEADZONE = 0.12;
/** Ab hier wird gerannt. */
export const SPRINT_RING = 0.88;

export function stickValue(dx: number, dy: number, radius = STICK_RADIUS): StickValue {
  const distance = Math.hypot(dx, dy);
  const raw = Math.min(1, distance / radius);
  if (raw < STICK_DEADZONE || distance === 0) return { x: 0, z: 0, magnitude: 0, sprint: false };
  // Die Totzone wird herausgerechnet, damit der erste Millimeter danach nicht springt.
  const magnitude = (raw - STICK_DEADZONE) / (1 - STICK_DEADZONE);
  return {
    x: (dx / distance) * magnitude,
    z: (dy / distance) * magnitude,
    magnitude,
    sprint: raw >= SPRINT_RING,
  };
}

export const IDLE: StickValue = { x: 0, z: 0, magnitude: 0, sprint: false };

export class Joystick {
  readonly element = document.createElement('div');
  private readonly base = document.createElement('div');
  private readonly knob = document.createElement('div');
  private pointer: number | null = null;
  private origin = { x: 0, y: 0 };
  value: StickValue = IDLE;

  constructor() {
    this.element.className = 'flat__stick';
    this.base.className = 'flat__stick-base';
    this.knob.className = 'flat__stick-knob';
    this.base.append(this.knob);
    this.element.append(this.base);
    this.element.style.touchAction = 'none';
    this.element.addEventListener('pointerdown', (event) => {
      if (this.pointer !== null) return;
      this.pointer = event.pointerId;
      const rect = this.element.getBoundingClientRect();
      this.origin = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.base.classList.add('is-live');
      this.base.style.left = `${this.origin.x}px`;
      this.base.style.top = `${this.origin.y}px`;
      this.move(0, 0);
      try {
        this.element.setPointerCapture?.(event.pointerId);
      } catch {
        // synthetische Zeiger in Tests
      }
    });
    this.element.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.pointer) return;
      const rect = this.element.getBoundingClientRect();
      this.move(
        event.clientX - rect.left - this.origin.x,
        event.clientY - rect.top - this.origin.y,
      );
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId !== this.pointer) return;
      this.pointer = null;
      this.value = IDLE;
      // Zurück an die Ruhestelle aus dem CSS, Knopf in die Mitte.
      this.base.classList.remove('is-live', 'is-sprint');
      this.base.style.left = '';
      this.base.style.top = '';
      this.knob.style.transform = '';
    };
    this.element.addEventListener('pointerup', release);
    this.element.addEventListener('pointercancel', release);
  }

  private move(dx: number, dy: number): void {
    this.value = stickValue(dx, dy);
    const length = Math.hypot(dx, dy);
    const clamp = Math.min(length, STICK_RADIUS);
    const kx = length ? (dx / length) * clamp : 0,
      ky = length ? (dy / length) * clamp : 0;
    this.knob.style.transform = `translate(${kx}px, ${ky}px)`;
    this.base.classList.toggle('is-sprint', this.value.sprint);
  }

  dispose(): void {
    this.element.remove();
  }
}
