import {
  atHome,
  fitView,
  homeView,
  panLimit,
  pannedView,
  zoomedView,
  ZOOM_MAX,
  ZOOM_MIN,
  type ArchiveView,
} from './archiveView';

/** Ein Blatt, wie es die Kamera einpasst: 4 m breit, 3 m tief (halbe Kanten). */
const HALF = 4;
const TALL = 3;

describe('Der Ausschnitt des Archivars', () => {
  it('fängt beim ganzen Zimmer an', () => {
    const view = homeView();
    expect(view.zoom).toBe(ZOOM_MIN);
    expect(atHome(view)).toBe(true);
  });

  it('lässt sich nicht weiter herauszoomen als auf das ganze Zimmer', () => {
    const out = zoomedView(homeView(), 0.25, HALF, TALL);
    expect(out.zoom).toBe(ZOOM_MIN);
  });

  it('geht nicht näher heran als bis zum Anschlag', () => {
    const near = zoomedView(homeView(), 100, HALF, TALL);
    expect(near.zoom).toBe(ZOOM_MAX);
  });

  /**
   * **Wer alles sieht, hat nichts zu verschieben.** Ohne diese Null ließe
   * sich das eingepasste Zimmer aus dem Bild schieben, und der Archivar
   * stünde vor der schwarzen Maske um sein Zimmer herum.
   */
  it('verschiebt im ganzen Blatt gar nicht', () => {
    expect(panLimit(HALF, 1)).toBe(0);
    const moved = pannedView(homeView(), 3, -2, HALF, TALL);
    expect(moved.x).toBeCloseTo(0);
    expect(moved.z).toBeCloseTo(0);
  });

  it('lässt den Ausschnitt genau bis an den Blattrand wandern', () => {
    // Bei doppelter Vergrößerung ist der Ausschnitt halb so groß, seine Mitte
    // darf also um eine halbe Kante wandern — dann liegen die Ränder aufeinander.
    expect(panLimit(HALF, 2)).toBeCloseTo(2);
    expect(panLimit(TALL, 3)).toBeCloseTo(2);

    const view = zoomedView(homeView(), 2, HALF, TALL);
    const far = pannedView(view, 99, 99, HALF, TALL);
    expect(far.x).toBeCloseTo(2);
    expect(far.z).toBeCloseTo(1.5);
    const back = pannedView(view, -99, -99, HALF, TALL);
    expect(back.x).toBeCloseTo(-2);
    expect(back.z).toBeCloseTo(-1.5);
  });

  it('behält kleine Wege unverändert', () => {
    const view = zoomedView(homeView(), 4, HALF, TALL);
    const moved = pannedView(view, 0.5, -0.25, HALF, TALL);
    expect(moved.x).toBeCloseTo(0.5);
    expect(moved.z).toBeCloseTo(-0.25);
    expect(atHome(moved)).toBe(false);
  });

  /**
   * Beim Herauszoomen schrumpft der erlaubte Weg mit. Ohne das Nachziehen
   * hinge das Blatt danach schief im Bild — verschoben um mehr, als es bei
   * dieser Vergrößerung überhaupt geben darf.
   */
  it('zieht die Verschiebung beim Herauszoomen wieder herein', () => {
    const near = pannedView(zoomedView(homeView(), 4, HALF, TALL), 9, 9, HALF, TALL);
    expect(near.x).toBeCloseTo(3);
    const out = zoomedView(near, 0.5, HALF, TALL);
    expect(out.zoom).toBeCloseTo(2);
    expect(out.x).toBeCloseTo(2);
    expect(out.z).toBeCloseTo(1.5);
  });

  /**
   * Das Blatt wechselt seine Größe, sobald ein anderes Zimmer aufgeschlagen
   * wird oder das Telefon sich dreht. Ein Ausschnitt vom alten Blatt hängt
   * dann halb daneben.
   */
  it('stutzt einen alten Ausschnitt auf ein kleineres Blatt zurecht', () => {
    const wide: ArchiveView = { zoom: 2, x: 2, z: 1.5 };
    const small = fitView(wide, 2, 1);
    expect(small.x).toBeCloseTo(1);
    expect(small.z).toBeCloseTo(0.5);
  });

  it('macht aus Unsinn keinen Ausschnitt', () => {
    expect(zoomedView(homeView(), Number.NaN, HALF, TALL).zoom).toBe(ZOOM_MIN);
    const moved = pannedView({ zoom: 2, x: 1, z: 1 }, Number.NaN, Number.NaN, HALF, TALL);
    expect(moved.x).toBeCloseTo(1);
    expect(moved.z).toBeCloseTo(1);
    expect(fitView({ zoom: Number.NaN, x: Number.NaN, z: 0 }, HALF, TALL)).toEqual({
      zoom: ZOOM_MIN,
      x: 0,
      z: 0,
    });
  });
});
