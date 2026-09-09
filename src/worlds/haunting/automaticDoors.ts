type Position = { x: number; y?: number; z: number };

/** Logical locks are separate from the local, physically animated proximity doors. */
export class AutomaticDoors {
  private readonly doors = new Map<string, { open: boolean; hold: number }>();

  isOpen(id: string): boolean {
    return this.doors.get(id)?.open ?? false;
  }

  step(
    id: string,
    at: { x: number; z: number; alongX: boolean },
    locked: boolean,
    occupants: readonly Position[],
    dt: number,
  ): boolean {
    let state = this.doors.get(id);
    if (!state) this.doors.set(id, (state = { open: false, hold: 0 }));
    const near = occupants.some((p) => {
      if (!Number.isFinite(p.x + p.z) || (p.y !== undefined && (p.y < -0.5 || p.y > 3.3)))
        return false;
      const cross = Math.abs(at.alongX ? p.x - at.x : p.z - at.z);
      const normal = Math.abs(at.alongX ? p.z - at.z : p.x - at.x);
      return cross < 1.8 && normal < 3.2;
    });
    // An occupied threshold must never be closed around a capsule, even when
    // control locks the door at exactly the moment somebody walks through it.
    const occupied = occupants.some((p) => {
      if (p.y !== undefined && (p.y < -0.5 || p.y > 3.3)) return false;
      const cross = Math.abs(at.alongX ? p.x - at.x : p.z - at.z);
      const normal = Math.abs(at.alongX ? p.z - at.z : p.x - at.x);
      return cross < 1 && normal < 0.85;
    });
    const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.25)) : 0;
    state.hold = near && !locked ? 1.2 : Math.max(0, state.hold - elapsed);
    state.open = (!locked && state.hold > 0) || (state.open && occupied);
    return state.open;
  }

  clear(): void {
    this.doors.clear();
  }
}
