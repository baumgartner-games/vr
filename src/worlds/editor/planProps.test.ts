import {
  PLACEABLE,
  PROP_CLEARANCE,
  addProp,
  nextPropId,
  propNear,
  readProps,
  removeProp,
  standingY,
  writeProps,
  type PlanProp,
} from './planProps';

describe('Die Liste der Gegenstände', () => {
  it('zählt die Kennungen hoch und vergibt keine zweimal', () => {
    const props: PlanProp[] = [];
    expect(addProp(props, 'cube', 0, 0).id).toBe('prop-1');
    expect(addProp(props, 'sphere', 1, 0).id).toBe('prop-2');
    removeProp(props, 'prop-1');
    // Die 1 ist frei, wird aber nicht wiederverwendet: Sonst hieße nach dem
    // Löschen zweimal dasselbe gleich, sobald jemand rückgängig macht.
    expect(addProp(props, 'cube', 2, 0).id).toBe('prop-3');
  });

  it('kommt auch mit einer Liste ohne lesbare Kennungen zurecht', () => {
    expect(nextPropId([{ id: 'was?', kind: 'cube', x: 0, z: 0, yaw: 0 }])).toBe('prop-1');
  });

  it('nimmt nur heraus, was drin ist', () => {
    const props: PlanProp[] = [];
    addProp(props, 'cube', 0, 0);
    expect(removeProp(props, 'prop-9')).toBe(false);
    expect(removeProp(props, 'prop-1')).toBe(true);
    expect(props).toHaveLength(0);
  });

  it('findet das nächstgelegene und nichts jenseits der Reichweite', () => {
    const props: PlanProp[] = [];
    addProp(props, 'cube', 0, 0);
    const near = addProp(props, 'sphere', 1, 0);
    expect(propNear(props, 1.1, 0, 0.5)).toBe(near);
    expect(propNear(props, 5, 5, 0.5)).toBeNull();
  });
});

describe('Auf dem Boden stehen', () => {
  it('setzt die Mitte um die halbe Höhe nach oben, plus einen Hauch Luft', () => {
    expect(standingY(0.16)).toBeCloseTo(0.16 + PROP_CLEARANCE);
    // Und der Hauch ist wirklich einer: Ein Ding, das um einen Zentimeter
    // schwebte, fiele beim Hinsetzen sichtbar.
    expect(PROP_CLEARANCE).toBeLessThan(0.01);
    expect(PROP_CLEARANCE).toBeGreaterThan(0);
  });
});

describe('Speichern und laden', () => {
  it('bringt dieselbe Liste wieder zurück', () => {
    const props: PlanProp[] = [];
    addProp(props, 'cube', 1.25, -3.75, 0.5);
    addProp(props, 'ramp', -6.25, 1.25);
    expect(readProps(writeProps(props))).toEqual(props);
  });

  it('überlebt jeden Unsinn im Speicher', () => {
    expect(readProps(null)).toEqual([]);
    expect(readProps({})).toEqual([]);
    expect(readProps('nichts')).toEqual([]);
    expect(readProps({ props: 'auch nichts' })).toEqual([]);
  });

  it('wirft weg, was es nicht mehr gibt, und behält den Rest', () => {
    const raw = {
      v: 1,
      props: [
        { id: 'prop-1', kind: 'einhorn', x: 0, z: 0, yaw: 0 },
        { id: 'prop-2', kind: 'cube', x: 'links', z: 0, yaw: 0 },
        { id: 'prop-3', kind: 'cube', x: 2.5, z: 5 },
      ],
    };
    const back = readProps(raw);
    expect(back).toHaveLength(1);
    expect(back[0]).toEqual({ id: 'prop-3', kind: 'cube', x: 2.5, z: 5, yaw: 0 });
  });

  it('bietet genau das an, was auch im Beutel liegt', () => {
    expect(PLACEABLE).toContain('cube');
    expect(PLACEABLE.length).toBeGreaterThan(5);
    expect(new Set(PLACEABLE).size).toBe(PLACEABLE.length);
  });
});
