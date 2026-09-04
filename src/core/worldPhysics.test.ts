import {
  DEFAULT_WORLD_PHYSICS,
  EARTH_GRAVITY,
  PHYSICS_FIELDS,
  clampPhysicsField,
  clampWorldPhysics,
  effectiveGravity,
  gravityLabel,
  gravityName,
  nextPhysicsStep,
  physicsFieldLabel,
  saveWorldPhysics,
  worldPhysics,
} from './worldPhysics';

const gravity = PHYSICS_FIELDS[0]!;
const bounce = PHYSICS_FIELDS.find((field) => field.key === 'bounce')!;

describe('Welt-Physik', () => {
  it('liefert die Erde aus, und überlässt der Welt die Schwerkraft', () => {
    expect(DEFAULT_WORLD_PHYSICS.gravity).toBe(EARTH_GRAVITY);
    expect(DEFAULT_WORLD_PHYSICS.autoGravity).toBe(true);
  });

  it('holt jeden Wert in seinen Bereich', () => {
    expect(clampPhysicsField(gravity, -5)).toBe(0);
    expect(clampPhysicsField(gravity, 999)).toBe(gravity.max);
    expect(clampPhysicsField(bounce, 0.5)).toBe(0.5);
  });

  it('macht aus Unsinn den Auslieferungswert', () => {
    expect(clampPhysicsField(gravity, undefined)).toBe(DEFAULT_WORLD_PHYSICS.gravity);
    expect(clampPhysicsField(gravity, 'schwer')).toBe(DEFAULT_WORLD_PHYSICS.gravity);
    expect(clampWorldPhysics(undefined)).toEqual(DEFAULT_WORLD_PHYSICS);
  });

  it('schaltet zur nächsten Raste und fängt oben wieder an', () => {
    expect(nextPhysicsStep(gravity, 0)).toBe(1.62);
    expect(nextPhysicsStep(gravity, 9.81)).toBe(16);
    expect(nextPhysicsStep(gravity, 25)).toBe(0);
  });

  it('bricht nicht an einem Wert, der auf keiner Raste liegt', () => {
    // Getippt oder von einer Welt geerbt: die nächste Raste ist die erste darüber.
    expect(nextPhysicsStep(gravity, 5)).toBe(9.81);
    expect(nextPhysicsStep(gravity, 40)).toBe(0);
  });

  it('lässt der Welt ihre Schwerkraft, bis jemand eine eigene setzt', () => {
    const auto = clampWorldPhysics({ autoGravity: true, gravity: 25 });
    expect(effectiveGravity(auto, 1.62)).toBe(1.62);
    const manual = clampWorldPhysics({ autoGravity: false, gravity: 25 });
    expect(effectiveGravity(manual, 1.62)).toBe(25);
  });

  it('nennt die Schwerkräfte, die man kennt', () => {
    expect(gravityName(1.62)).toBe('Mond');
    expect(gravityName(9.81)).toBe('Erde');
    expect(gravityName(0)).toBe('schwerelos');
    expect(gravityName(7)).toBeNull();
    expect(gravityLabel(clampWorldPhysics({}), 1.62)).toContain('Welt-Standard');
    expect(gravityLabel(clampWorldPhysics({ autoGravity: false, gravity: 16 }), 9.81)).toBe(
      '16.00 m/s²',
    );
  });

  it('schreibt die Einheit nur dort hin, wo es eine gibt', () => {
    expect(physicsFieldLabel(gravity, 9.81)).toBe('9.81 m/s²');
    expect(physicsFieldLabel(bounce, 0.3)).toBe('0.30');
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    expect(worldPhysics()).toEqual(DEFAULT_WORLD_PHYSICS);
    expect(saveWorldPhysics({ gravity: 1.62, autoGravity: false }).gravity).toBe(1.62);
  });
});
