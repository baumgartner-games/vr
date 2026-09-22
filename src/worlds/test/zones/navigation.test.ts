import { TILE } from '../../nav/navTile';
import { centre } from '../layout';
import { SPIKES, spikeSpots } from './navigation';

/**
 * **Die neun Fallen stehen auf den neun Kacheln, die die Gefahr tragen.**
 *
 * Das Bild und die Notiz im Graphen sind in dieser Zone zwei getrennte Dinge
 * (`fitNavigation`, `plan.floor(… HAZARD_SPIKES)`) und wissen nichts
 * voneinander: Die eine kostet einen NPC den Weg, die andere sagt einem
 * Menschen, dass er hier nicht hindurchsoll. Liegen sie auseinander, stimmt
 * jede für sich und zusammen nichts — und man sieht es dem Standbild nicht an,
 * sondern merkt es erst, wenn ein Zombie neben den Stacheln zuckt.
 *
 * Nachgerechnet wird deshalb die **Rechnung** und nicht das Netz: Wo eine
 * Kopie steht, ist eine Kachelmitte (`layout.centre`) und sonst nichts. Das
 * Modell selbst braucht WebGL und kommt in Jest ohnehin nie an
 * (`core/chefFit.canLoadModels`).
 */
describe('spikeSpots', () => {
  it('stellt auf jede Kachel des Felds genau eine Falle', () => {
    const spots = spikeSpots();
    expect(spots).toHaveLength(SPIKES.w * SPIKES.d);

    const wanted = new Set<string>();
    for (let dz = 0; dz < SPIKES.d; dz++) {
      for (let dx = 0; dx < SPIKES.w; dx++) wanted.add(`${SPIKES.x + dx}/${SPIKES.z + dz}`);
    }
    const hit = new Set(spots.map((spot) => `${spot.x / TILE - 0.5}/${spot.z / TILE - 0.5}`));
    expect(hit).toEqual(wanted);
  });

  it('trifft die Kachelmitten und nicht die Kachelkanten', () => {
    for (const spot of spikeSpots()) {
      const x = Math.floor(spot.x / TILE);
      const z = Math.floor(spot.z / TILE);
      expect(spot.x).toBeCloseTo(centre(x));
      expect(spot.z).toBeCloseTo(centre(z));
    }
  });

  it('lässt keine Kopie über den Rand des Felds ragen', () => {
    // Eine Kopie ist genau eine Kachel breit (`SPIKES_MODEL`, 1,0 × 1,0 m):
    // Ihr Rand liegt eine halbe Kachel neben ihrer Mitte, und weiter als bis
    // an die Kante des Rechtecks darf er nicht — sonst stünden Stacheln auf
    // einer Kachel, die im Graphen harmlos ist.
    for (const spot of spikeSpots()) {
      expect(spot.x - TILE / 2).toBeGreaterThanOrEqual(SPIKES.x * TILE);
      expect(spot.x + TILE / 2).toBeLessThanOrEqual((SPIKES.x + SPIKES.w) * TILE);
      expect(spot.z - TILE / 2).toBeGreaterThanOrEqual(SPIKES.z * TILE);
      expect(spot.z + TILE / 2).toBeLessThanOrEqual((SPIKES.z + SPIKES.d) * TILE);
    }
  });

  it('deckt das Feld mittig ab — die Mitte der neun ist die Mitte des Felds', () => {
    const spots = spikeSpots();
    const mid = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mid(spots.map((spot) => spot.x))).toBeCloseTo((SPIKES.x + SPIKES.w / 2) * TILE);
    expect(mid(spots.map((spot) => spot.z))).toBeCloseTo((SPIKES.z + SPIKES.d / 2) * TILE);
  });
});
