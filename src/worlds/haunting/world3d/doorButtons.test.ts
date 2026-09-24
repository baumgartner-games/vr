import { buttonPressed, doorButtonSpots, type ButtonDoor } from './doorButtons';
import { DIR_E, DIR_N } from '../../nav/navTile';

/** **Vor und hinter jeder Tür ein Knopf** — wo sie liegen und wann einer gedrückt ist. */
describe('Türknöpfe', () => {
  const door: ButtonDoor = { id: 'd', x: 3, z: 5, dir: DIR_E };

  it('liegen auf der Kachel der Tür und auf der dahinter', () => {
    expect(doorButtonSpots(door)).toEqual([
      { x: 3.5, z: 5.5 },
      { x: 4.5, z: 5.5 },
    ]);
    expect(doorButtonSpots({ ...door, dir: DIR_N })[1]).toEqual({ x: 3.5, z: 4.5 });
  });

  it('sind gedrückt, wenn jemand auf einer der beiden Kacheln steht', () => {
    expect(buttonPressed(door, [{ x: 3.2, z: 5.9 }])).toBe(true);
    expect(buttonPressed(door, [{ x: 4.8, z: 5.1 }])).toBe(true);
    // Zwei Kacheln daneben ist niemand auf dem Knopf — auch wenn die Automatik
    // dort schon aufmacht.
    expect(buttonPressed(door, [{ x: 1.5, z: 5.5 }])).toBe(false);
    expect(buttonPressed(door, [{ x: 3.5, z: 6.7 }])).toBe(false);
    expect(buttonPressed(door, [])).toBe(false);
  });
});
