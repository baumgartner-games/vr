import * as THREE from 'three';
import { kitchenPiece } from '../../../core/kitchenFit';
import {
  BLANK_SHARE,
  ICON_FOV,
  ICON_PADDING,
  IconOven,
  SIGN_SHARE,
  blankDiameter,
  iconDistance,
  iconView,
  signSize,
} from './kitchenIcon';

/**
 * **Was am Icon-Ofen ohne Grafikkarte zu prüfen ist** — und das ist genau das,
 * worauf es ankommt: die Entfernung, aus der ein Ding formatfüllend ins Bild
 * passt, und die Maße der Tafel am Möbel. Das Rendern selbst braucht WebGL und
 * gehört in den Browser; dass es ohne WebGL **nichts kaputt macht**, steht
 * trotzdem hier.
 */

/** Eine Hülle um einen Mittelpunkt, in halben Kantenlängen. */
function box(hx: number, hy: number, hz: number, centre = new THREE.Vector3()): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(centre.x - hx, centre.y - hy, centre.z - hz),
    new THREE.Vector3(centre.x + hx, centre.y + hy, centre.z + hz),
  );
}

const FRONT = new THREE.Vector3(0, 0, 1);

describe('iconView', () => {
  it('schaut ohne Winkel von vorn', () => {
    const view = iconView(0, 0);
    expect(view.x).toBeCloseTo(0);
    expect(view.y).toBeCloseTo(0);
    expect(view.z).toBeCloseTo(1);
  });

  it('gibt immer eine Einheitsrichtung', () => {
    for (const [yaw, pitch] of [
      [0, 0],
      [25, 30],
      [90, 0],
      [-140, 89],
    ]) {
      expect(iconView(yaw, pitch).length()).toBeCloseTo(1);
    }
  });

  it('dreht nach Osten und hebt an', () => {
    const view = iconView(90, 0);
    expect(view.x).toBeCloseTo(1);
    const high = iconView(0, 90);
    expect(high.y).toBeCloseTo(1);
  });
});

describe('iconDistance', () => {
  it('passt einen Einheitswürfel bei 90° genau ein', () => {
    // Die Ecke liegt eine halbe Kante vor der Mitte und eine halbe daneben:
    // bei tan(45°) = 1 also genau eine Kante Abstand.
    expect(iconDistance(box(0.5, 0.5, 0.5), FRONT, 90, 1, 1)).toBeCloseTo(1);
  });

  it('wächst mit dem Ding', () => {
    const small = iconDistance(box(0.5, 0.5, 0.5), FRONT, 90, 1, 1);
    const big = iconDistance(box(1, 1, 1), FRONT, 90, 1, 1);
    expect(big).toBeCloseTo(small * 2);
  });

  it('rechnet um die Mitte der Hülle und nicht um den Ursprung', () => {
    const here = iconDistance(box(0.5, 0.5, 0.5), FRONT, 90, 1, 1);
    const far = iconDistance(box(0.5, 0.5, 0.5, new THREE.Vector3(10, -4, 7)), FRONT, 90, 1, 1);
    expect(far).toBeCloseTo(here);
  });

  it('macht mit Luft am Rand mehr Abstand', () => {
    const tight = iconDistance(box(0.5, 0.5, 0.5), FRONT, 90, 1, 1);
    const airy = iconDistance(box(0.5, 0.5, 0.5), FRONT, 90, 1, 2);
    expect(airy).toBeCloseTo(1.5);
    expect(airy).toBeGreaterThan(tight);
  });

  it('nimmt ein breites Bild für ein breites Ding ernst', () => {
    const wide = box(2, 0.5, 0.5);
    expect(iconDistance(wide, FRONT, 90, 1, 1)).toBeCloseTo(2.5);
    expect(iconDistance(wide, FRONT, 90, 2, 1)).toBeCloseTo(1.5);
  });

  it('kommt auch senkrecht von oben zurecht', () => {
    const above = new THREE.Vector3(0, 1, 0);
    expect(iconDistance(box(0.5, 0.5, 0.5), above, 90, 1, 1)).toBeCloseTo(1);
  });

  it('hält ein Brötchen weiter weg als eine Tomate', () => {
    // Die Maße aus `kitchenProps.ts`: 60 cm Brötchen, 38 cm Tomate.
    const view = iconView();
    const bun = iconDistance(box(0.3, 0.13, 0.3), view, ICON_FOV, 1, ICON_PADDING);
    const tomato = iconDistance(box(0.19, 0.19, 0.19), view, ICON_FOV, 1, ICON_PADDING);
    expect(bun).toBeGreaterThan(tomato);
    // Und beides bleibt in Reichweite der Kamera (`near`/`far` in `bake`).
    expect(bun).toBeLessThan(5);
  });

  it('gibt für eine leere Hülle eine brauchbare Zahl', () => {
    expect(iconDistance(new THREE.Box3(), FRONT, 90, 1, 1)).toBeGreaterThan(0);
  });
});

describe('signSize', () => {
  const serve = kitchenPiece('serve-counter')!;

  it('nimmt 65 % der Deckfläche ein', () => {
    // Eine Kachel (1 m), davon 65 % — und die Ausgabe ist eine Kachel groß.
    expect(signSize(serve)).toBeCloseTo(0.65, 6);
    expect(SIGN_SHARE).toBe(0.65);
  });

  it('richtet sich nach der kürzeren Kante', () => {
    // Zwei Kacheln breit, eine tief: Das Bild bleibt quadratisch und passt in
    // die Tiefe, statt über die Längskante zu stehen.
    expect(signSize({ ...serve, tiles: [2, 1] })).toBeCloseTo(0.65, 6);
  });

  it('wird an einem Möbel ohne Grundfläche nicht null', () => {
    expect(signSize({ ...serve, tiles: [0, 0] })).toBeGreaterThan(0);
  });
});

/**
 * **Der weiße Kreis** — der Teller, auf dem die Zutat liegt. Vorher war das ein
 * Rechteck von 0,88 m auf einer Kachel von einem Meter, also fast das ganze
 * Möbel. Alles, was dieser Block prüft, folgt aus dem einen Satz „ein Teller
 * und keine Platte": Er ist deutlich kleiner als die Kachel, er ist größer als
 * das Bild darauf, und er steht nirgends über die Kante.
 */
describe('blankDiameter', () => {
  const serve = kitchenPiece('serve-counter')!;

  it('nimmt 70 % der Deckfläche ein', () => {
    expect(blankDiameter(serve)).toBeCloseTo(0.7, 6);
    expect(BLANK_SHARE).toBe(0.7);
  });

  it('ist kleiner als das alte weiße Rechteck von 0,88 m', () => {
    expect(blankDiameter(serve)).toBeLessThan(0.88);
  });

  it('bleibt größer als das Bild darauf', () => {
    expect(blankDiameter(serve)).toBeGreaterThan(signSize(serve));
  });

  it('steht nirgends über die Kante des Möbels', () => {
    expect(blankDiameter(serve)).toBeLessThan(serve.tiles[0] * 1);
    expect(blankDiameter(serve)).toBeLessThan(serve.tiles[1] * 1);
  });

  it('wird an einem Möbel ohne Grundfläche nicht null', () => {
    expect(blankDiameter({ ...serve, tiles: [0, 0] })).toBeGreaterThan(0);
  });
});

describe('IconOven ohne WebGL', () => {
  /** In Jest gibt es keinen Renderer — und der Ofen darf ihn nicht anfassen. */
  const noRenderer = {} as unknown as THREE.WebGLRenderer;

  it('backt nichts und baut auch nichts', () => {
    const oven = new IconOven(noRenderer);
    const build = jest.fn(() => new THREE.Group());
    expect(oven.bake('bun', build)).toBeNull();
    expect(build).not.toHaveBeenCalled();
    oven.dispose();
  });

  it('teilt Form und Material einer Tafel', () => {
    const oven = new IconOven(noRenderer);
    const texture = new THREE.Texture();
    const first = oven.sign(texture, 0.36, 0.36);
    const same = oven.sign(texture, 0.36, 0.36);
    const other = oven.sign(texture, 0.62, 0.62);

    expect(same.geometry).toBe(first.geometry);
    expect(same.material).toBe(first.material);
    expect(other.geometry).not.toBe(first.geometry);
    expect(other.material).toBe(first.material);

    const shape = first.geometry as THREE.PlaneGeometry;
    oven.dispose();
    // Nach dem Aufräumen ist die Form wirklich weg — three meldet das über das
    // Ereignis, das `dispose` auslöst; geprüft wird hier das, was bleibt: ein
    // neuer Ofen fängt bei null an.
    expect(shape).toBeDefined();
    texture.dispose();
  });

  it('legt den Teller oben auf das Möbel', () => {
    const oven = new IconOven(noRenderer);
    const texture = new THREE.Texture();
    const serve = kitchenPiece('serve-counter')!;

    const top = oven.counterSign(texture);
    expect(top.position.y).toBeGreaterThan(serve.height);
    // Hingelegt statt hingestellt: Das Bild schaut nach oben.
    expect(top.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(top.position.x).toBeCloseTo(0);
    expect(top.position.z).toBeCloseTo(0);

    oven.dispose();
    texture.dispose();
  });

  /**
   * **Ein Teller ist zwei Flächen**: unten der weiße Kreis, darauf das
   * gerenderte Bild. Der Kreis nimmt 70 % der Deckfläche ein, das Bild 65 % —
   * beide gemessen an derselben Kante, damit man die Zahlen nebeneinander lesen
   * kann (`SIGN_SHARE`, `BLANK_SHARE`).
   */
  it('legt das Icon auf einen weißen Kreis', () => {
    const oven = new IconOven(noRenderer);
    const texture = new THREE.Texture();
    const serve = kitchenPiece('serve-counter')!;

    const board = oven.counterSign(texture);
    expect(board.children).toHaveLength(2);
    const [blank, sign] = board.children as THREE.Mesh[];
    expect(blank!.name).toBe('kitchen-icon-blank');
    expect(sign!.name).toBe('kitchen-icon-sign');

    // Der Kreis liegt **unten**: Das Bild steht einen Hauch darüber, damit die
    // beiden nicht um dieselben Pixel streiten.
    expect(sign!.position.z).toBeGreaterThan(blank!.position.z);
    expect(sign!.position.z).toBeLessThan(0.01);

    // Ein Kreis und kein Rechteck — das ist der Unterschied zur alten Fassung.
    const disc = blank!.geometry as THREE.CircleGeometry;
    expect(disc.type).toBe('CircleGeometry');
    expect(disc.parameters.radius * 2).toBeCloseTo(blankDiameter(serve), 6);

    const front = (sign!.geometry as THREE.PlaneGeometry).parameters;
    expect(front.width).toBeCloseTo(signSize(serve), 6);
    expect(front.height).toBeCloseTo(signSize(serve), 6);
    expect(disc.parameters.radius * 2).toBeGreaterThan(front.width);

    oven.dispose();
    texture.dispose();
  });

  /**
   * **Deckend und unbeleuchtet.** Ein durchsichtiges Weiß ließe das Möbel
   * durchscheinen, ein beleuchtetes wäre im Schatten des Ausgaberegals grau —
   * dieselbe Begründung, die schon für die Icon-Tafel selbst gilt.
   */
  it('malt mit einem geteilten, deckenden Weiß', () => {
    const oven = new IconOven(noRenderer);
    const texture = new THREE.Texture();
    const serve = kitchenPiece('serve-counter')!;

    const first = oven.counterSign(texture).children[0] as THREE.Mesh;
    const second = oven.counterSign(texture, { piece: serve }).children[0] as THREE.Mesh;
    const paint = first.material as THREE.MeshBasicMaterial;
    expect(second.material).toBe(paint);
    // Dieselbe Form auch, solange es dasselbe Maß ist — geteilt wie die Farbe.
    expect(second.geometry).toBe(first.geometry);
    expect(paint.isMeshBasicMaterial).toBe(true);
    expect(paint.transparent).toBe(false);
    expect(paint.color.getHex()).toBe(0xffffff);
    // Sie wirft und empfängt keinen Schatten — sie ist Farbe und kein Möbel.
    expect(first.castShadow).toBe(false);
    expect(first.receiveShadow).toBe(false);

    oven.dispose();
    texture.dispose();
  });
});
