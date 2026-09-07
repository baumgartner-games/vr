import type { NavLink } from './navGraph';
import { safeFall } from './navFall';
import {
  COST_PROFILES,
  CRITTER_PROFILE,
  HAZARD_FIRE,
  HAZARD_NONE,
  HAZARD_NAMES,
  HAZARD_COUNT,
  HAZARD_SPIKES,
  HAZARD_WATER,
  HUMAN_PROFILE,
  LINK_KINDS,
  VEHICLE_PROFILE,
  ZOMBIE_PROFILE,
  canTraverse,
  canUseLink,
  hazardCost,
  linkFactor,
  profileOf,
  shapeOf,
  slopeDegrees,
  type CostProfile,
  type EdgeShape,
} from './navProfile';
import { TILE, tileKey } from './navTile';

describe('Die Gefahren', () => {
  it('haben zu jeder einen Namen', () => {
    expect(HAZARD_NAMES).toHaveLength(HAZARD_COUNT);
  });

  it('kosten nichts, wo keine ist', () => {
    for (const profile of [HUMAN_PROFILE, ZOMBIE_PROFILE, VEHICLE_PROFILE]) {
      expect(hazardCost(profile, HAZARD_NONE)).toBe(0);
    }
  });

  it('addieren sich, wenn mehrere auf einer Kachel liegen', () => {
    const wet = hazardCost(ZOMBIE_PROFILE, HAZARD_WATER);
    expect(hazardCost(ZOMBIE_PROFILE, HAZARD_WATER | HAZARD_SPIKES)).toBe(wet);
    expect(hazardCost(HUMAN_PROFILE, HAZARD_WATER)).toBe(8);
  });

  it('machen aus einem „niemals" auch dann ein „niemals", wenn Gutes danebenliegt', () => {
    expect(hazardCost(HUMAN_PROFILE, HAZARD_WATER | HAZARD_FIRE)).toBe(Infinity);
  });

  it('trennen den, der die Grube sieht, von dem, der sie nicht sieht', () => {
    // Die eine Zeile Tabelle, an der das ganze Verhalten hängt.
    expect(hazardCost(HUMAN_PROFILE, HAZARD_SPIKES)).toBe(Infinity);
    expect(hazardCost(ZOMBIE_PROFILE, HAZARD_SPIKES)).toBe(0);
  });
});

describe('Die Profile', () => {
  it('sagen, welche Verbindung wer nehmen kann', () => {
    expect(canUseLink(HUMAN_PROFILE, 'ladder')).toBe(true);
    expect(canUseLink(ZOMBIE_PROFILE, 'ladder')).toBe(false);
    expect(canUseLink(VEHICLE_PROFILE, 'stairs')).toBe(false);
    expect(canUseLink(VEHICLE_PROFILE, 'portal')).toBe(true);
  });

  it('haben zu jeder Verbindungsart eine Zahl — auch zu einer neuen', () => {
    for (const profile of [HUMAN_PROFILE, ZOMBIE_PROFILE, VEHICLE_PROFILE]) {
      for (const kind of LINK_KINDS) {
        expect(typeof profile.link[kind]).toBe('number');
      }
      expect(profile.hazard).toHaveLength(HAZARD_COUNT);
    }
  });

  it('fallen auf den Menschen zurück, wenn die Id Unsinn ist', () => {
    expect(profileOf('gibt-es-nicht')).toBe(HUMAN_PROFILE);
    expect(profileOf(undefined)).toBe(HUMAN_PROFILE);
    expect(profileOf('zombie')).toBe(ZOMBIE_PROFILE);
  });

  it('geben jedem Beine, die zueinander passen', () => {
    for (const profile of COST_PROFILES) {
      // Springen ist nie weniger als treten, und wer nichts aushält, springt
      // auch nirgends hinunter.
      expect(profile.jumpUp).toBeGreaterThanOrEqual(profile.stepUp);
      expect(profile.maxSlope).toBeGreaterThan(0);
      expect(profile.health).toBeGreaterThan(0);
      expect(profile.dropDown).toBeGreaterThanOrEqual(0);
    }
  });
});

// --- die Form des Geländes -------------------------------------------------

/** Ein Stück Gelände, wie das Abtasten es misst. */
function edge(rise: number, step = Math.abs(rise), gap = 0): EdgeShape {
  return { rise, step, gap };
}

describe('Die Steigung', () => {
  it('misst über eine Kachel', () => {
    expect(slopeDegrees(0)).toBeCloseTo(0);
    expect(slopeDegrees(TILE)).toBeCloseTo(45);
    // Hinunter ist so steil wie hinauf.
    expect(slopeDegrees(-1.2)).toBeCloseTo(slopeDegrees(1.2));
    // Eine Kante ohne waagerechte Strecke ist senkrecht und nicht unendlich.
    expect(slopeDegrees(1, 0)).toBe(90);
  });
});

describe('Was ein Profil hochkommt', () => {
  it('lässt jeden über die Bordsteinkante, der überhaupt Kanten nimmt', () => {
    // Das Fahrzeug nimmt keine — für zwei Tonnen Blech ist eine Kante eine
    // Kante, und das steht schon in seiner Kostenzeile (`link.drop`).
    for (const profile of COST_PROFILES) {
      const takes = canUseLink(profile, 'drop');
      expect(canTraverse(profile, 'drop', edge(profile.stepUp))).toBe(takes);
      expect(canTraverse(profile, 'drop', edge(-profile.stepUp))).toBe(takes);
    }
  });

  it('trennt die Stufe von der Steigung', () => {
    // **Der Kern der Sache, in vier Zeilen.** Dieselben 1,2 m hinauf: einmal in
    // einer Kante, einmal als Rampe aus 12-cm-Stufen. Die Kante zieht ein
    // Mensch sich hoch (`jumpUp`), die Rampe ist ihm mit 25,6° zu steil — und
    // umgekehrt käme er die Rampe hinauf, wäre sie flacher, während ihm dieselbe
    // Kante dann immer noch zu hoch wäre, wenn sie höher als `jumpUp` ist.
    expect(canTraverse(HUMAN_PROFILE, 'drop', edge(1.2, 1.2))).toBe(true);
    expect(canTraverse(HUMAN_PROFILE, 'stairs', edge(1.2, 0.12))).toBe(false);
    expect(canTraverse(HUMAN_PROFILE, 'stairs', edge(0.6, 0.12))).toBe(true);
    expect(canTraverse(HUMAN_PROFILE, 'drop', edge(1.6, 1.6))).toBe(false);
  });

  it('lässt niemanden eine Rampe hinauf, deren Stufen er nicht tritt', () => {
    // Eine flache Rampe mit einem Absatz mittendrin ist keine Rampe: Was der
    // Winkel erlaubt, verbietet die Stufe.
    expect(canTraverse(HUMAN_PROFILE, 'stairs', edge(0.6, 0.12))).toBe(true);
    expect(canTraverse(HUMAN_PROFILE, 'stairs', edge(0.6, 0.55))).toBe(false);
  });

  it('lässt das Kleintier steiler hinauf als den Menschen', () => {
    // Vier Beine kommen eine Böschung hinauf, die ein Mensch umgeht — und die
    // Behauptung steht in einer Zeile Tabelle, nicht in einer Zeile Code.
    const bank = edge(1, 0.1);
    expect(CRITTER_PROFILE.maxSlope).toBeGreaterThan(HUMAN_PROFILE.maxSlope);
    expect(canTraverse(CRITTER_PROFILE, 'stairs', bank)).toBe(true);
    expect(canTraverse(HUMAN_PROFILE, 'stairs', bank)).toBe(false);
  });

  it('lässt nur hinunterspringen, wer es überlebt', () => {
    // Dieselbe Kante, zwei Sorten: Der Zombie hält 2,4 m aus, der Hamster
    // nicht (`navFall.ts`) — und keiner der beiden hat dafür eine eigene Zeile.
    const roof = edge(-2.4, 2.4);
    expect(canTraverse(ZOMBIE_PROFILE, 'drop', roof)).toBe(true);
    expect(canTraverse(CRITTER_PROFILE, 'drop', roof)).toBe(false);
    // Und knapp darunter springt auch er.
    expect(
      canTraverse(CRITTER_PROFILE, 'drop', edge(-(safeFall(CRITTER_PROFILE.health) - 0.1))),
    ).toBe(true);
  });

  it('hält auch den zurück, der es überlebte, aber nicht will', () => {
    const timid: CostProfile = { ...HUMAN_PROFILE, dropDown: 2, health: 10000 };
    expect(canTraverse(timid, 'drop', edge(-1.9))).toBe(true);
    expect(canTraverse(timid, 'drop', edge(-2.5))).toBe(false);
  });

  it('misst beim Sprung die Weite und nicht die Steigung', () => {
    const gap = { rise: 0, step: 0, gap: 2 * TILE };
    expect(canTraverse(HUMAN_PROFILE, 'jump', gap)).toBe(true);
    // Der Zombie springt gar nicht — das steht schon in seiner Kostenzeile.
    expect(canTraverse(ZOMBIE_PROFILE, 'jump', gap)).toBe(false);
    // Und weiter als seine Weite springt auch der Mensch nicht.
    expect(canTraverse(HUMAN_PROFILE, 'jump', { rise: 0, step: 0, gap: 12 })).toBe(false);
    // Über die Lücke *hinauf* geht nur, was er sich auch an einer Kante
    // hochzöge.
    expect(canTraverse(HUMAN_PROFILE, 'jump', { rise: 3, step: 3, gap: 5 })).toBe(false);
  });

  it('fragt bei Portal und Leiter nicht nach der Höhe', () => {
    // Ein Portal versetzt, eine Leiter hat Sprossen: Wer sie benutzen darf,
    // steht in der Kostenzeile, und die Steigung dahinter ist keine.
    const shaft = edge(6, 6);
    expect(canTraverse(HUMAN_PROFILE, 'portal', shaft)).toBe(true);
    expect(canTraverse(HUMAN_PROFILE, 'ladder', shaft)).toBe(true);
    expect(canTraverse(ZOMBIE_PROFILE, 'ladder', shaft)).toBe(false);
  });
});

describe('Eine Verbindung von der richtigen Seite', () => {
  const from = tileKey(1, 1, 0);
  const to = tileKey(1, 0, 0);
  const ledge: NavLink = {
    id: 'kante',
    from,
    to,
    kind: 'drop',
    cost: 3,
    both: true,
    open: true,
    rise: -2,
    step: 2,
  };

  it('dreht die Höhe um, wenn man sie rückwärts läuft', () => {
    expect(shapeOf(ledge, to).rise).toBe(-2);
    expect(shapeOf(ledge, from).rise).toBe(2);
  });

  it('lässt hinunter, was nicht hinauf geht', () => {
    // **Die eine Kante, zwei Antworten** — und genau deshalb fragt die Wegsuche
    // mit der Kachel, auf die es zugeht, und nicht mit der Richtung des
    // Eintrags.
    expect(linkFactor(HUMAN_PROFILE, ledge, to)).toBe(HUMAN_PROFILE.link.drop);
    expect(linkFactor(HUMAN_PROFILE, ledge, from)).toBe(Infinity);
  });

  it('hält eine Verbindung ohne Form für eben', () => {
    // Portale und alles von Hand Eingehängte haben keine Steigung — und was
    // keine hat, darf jeder benutzen, der seine Art benutzen darf.
    const flat: NavLink = { id: 'p', from, to, kind: 'portal', cost: 0.2, both: true, open: true };
    expect(linkFactor(ZOMBIE_PROFILE, flat, to)).toBe(ZOMBIE_PROFILE.link.portal);
    expect(linkFactor(VEHICLE_PROFILE, { ...flat, kind: 'stairs' }, to)).toBe(Infinity);
  });
});
