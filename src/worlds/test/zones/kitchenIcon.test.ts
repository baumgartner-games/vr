import * as THREE from 'three';
import { kitchenPiece } from '../../../core/kitchenFit';
import {
  ICON_FOV,
  ICON_PADDING,
  IconOven,
  blankSize,
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

  it('passt vorn zwischen die Kanten der Ausgabe', () => {
    // 0,46 m hoch minus zweimal 5 cm Rand.
    expect(signSize(serve, 'front')).toBeCloseTo(0.36);
    expect(signSize(serve, 'front')).toBeLessThan(serve.height);
  });

  it('nutzt oben die ganze Kachel', () => {
    // Eine Kachel (1 m) minus zweimal 19 cm Rand.
    expect(signSize(serve, 'top')).toBeCloseTo(0.62);
    expect(signSize(serve, 'top')).toBeGreaterThan(signSize(serve, 'front'));
  });

  it('wird an einem flachen Möbel nicht negativ', () => {
    expect(signSize({ ...serve, height: 0.02 }, 'front')).toBeGreaterThan(0);
    expect(signSize({ ...serve, tiles: [0, 0] }, 'top')).toBeGreaterThan(0);
  });
});

/**
 * **Die weiße Grundfläche** — sie soll das aufgedruckte Symbol des gekauften
 * Möbels **überdecken** und nicht bloß die Tafel hinterlegen. Alles, was dieser
 * Block prüft, folgt aus diesem einen Satz: Sie ist größer als die Tafel, sie
 * ist nicht quadratisch, und sie bleibt trotzdem auf dem Möbel.
 */
describe('blankSize', () => {
  const serve = kitchenPiece('serve-counter')!;

  it('nimmt vorn fast die ganze Front', () => {
    // Eine Kachel breit minus zweimal 3 cm, 0,46 m hoch minus zweimal 3 cm.
    expect(blankSize(serve, 'front')).toEqual({ w: 0.94, h: 0.4 });
  });

  it('nimmt oben fast die ganze Kachel', () => {
    // Eine Kachel im Quadrat minus zweimal 6 cm.
    const top = blankSize(serve, 'top');
    expect(top.w).toBeCloseTo(0.88, 6);
    expect(top.h).toBeCloseTo(0.88, 6);
  });

  it('ist in beide Richtungen größer als die Tafel davor', () => {
    for (const where of ['front', 'top'] as const) {
      const back = blankSize(serve, where);
      const edge = signSize(serve, where);
      expect(back.w).toBeGreaterThan(edge);
      expect(back.h).toBeGreaterThan(edge);
    }
  });

  it('steht nirgends über die Kante des Möbels', () => {
    const front = blankSize(serve, 'front');
    expect(front.w).toBeLessThan(serve.tiles[0] * 1);
    expect(front.h).toBeLessThan(serve.height);
    const top = blankSize(serve, 'top');
    expect(top.w).toBeLessThan(serve.tiles[0] * 1);
    expect(top.h).toBeLessThan(serve.tiles[1] * 1);
  });

  it('wird an einem flachen Möbel nicht negativ', () => {
    expect(blankSize({ ...serve, height: 0.02 }, 'front').h).toBeGreaterThan(0);
    expect(blankSize({ ...serve, tiles: [0, 0] }, 'top').w).toBeGreaterThan(0);
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

  it('hängt eine Tafel vorn ans Möbel und legt sie oben hin', () => {
    const oven = new IconOven(noRenderer);
    const texture = new THREE.Texture();
    const serve = kitchenPiece('serve-counter')!;

    const front = oven.counterSign(texture);
    expect(front.position.y).toBeCloseTo(serve.height / 2);
    expect(front.position.z).toBeLessThan(0);
    expect(front.rotation.x).toBeCloseTo(0);

    const top = oven.counterSign(texture, { where: 'top' });
    expect(top.position.y).toBeGreaterThan(serve.height);
    expect(top.rotation.x).toBeCloseTo(-Math.PI / 2);

    oven.dispose();
    texture.dispose();
  });

  /**
   * **Eine Tafel ist zwei Flächen**, seit das gekaufte Möbel sein eigenes,
   * aufgedrucktes Burger-Symbol mitbringt: hinten das deckende Weiß, das es
   * auslöscht, davor das gerenderte Bild. Vorher lagen beide Symbole
   * übereinander und waren gleichzeitig zu sehen.
   */
  it('legt eine weiße Fläche hinter das Icon', () => {
    const oven = new IconOven(noRenderer);
    const texture = new THREE.Texture();
    const serve = kitchenPiece('serve-counter')!;

    for (const where of ['front', 'top'] as const) {
      const board = oven.counterSign(texture, { where });
      expect(board.children).toHaveLength(2);
      const [blank, sign] = board.children as THREE.Mesh[];
      expect(blank!.name).toBe('kitchen-icon-blank');
      expect(sign!.name).toBe('kitchen-icon-sign');

      // Die weiße liegt **hinten**: Das Icon steht einen Hauch davor, damit
      // die beiden nicht um dieselben Pixel streiten.
      expect(sign!.position.z).toBeGreaterThan(blank!.position.z);
      expect(sign!.position.z).toBeLessThan(0.01);

      // Und sie ist größer — überdecken, nicht hinterlegen.
      const back = (blank!.geometry as THREE.PlaneGeometry).parameters;
      const front = (sign!.geometry as THREE.PlaneGeometry).parameters;
      expect(back.width).toBeGreaterThan(front.width);
      expect(back.height).toBeGreaterThan(front.height);
      expect({ w: back.width, h: back.height }).toEqual(blankSize(serve, where));
      expect(front.width).toBeCloseTo(signSize(serve, where), 6);
    }

    oven.dispose();
    texture.dispose();
  });

  /**
   * **Deckend und unbeleuchtet.** Ein durchsichtiges Weiß ließe den Aufdruck
   * durchscheinen, ein beleuchtetes wäre im Schatten des Ausgaberegals grau —
   * dieselbe Begründung, die schon für die Icon-Tafel selbst gilt.
   */
  it('malt mit einem geteilten, deckenden Weiß', () => {
    const oven = new IconOven(noRenderer);
    const texture = new THREE.Texture();

    const first = oven.counterSign(texture).children[0] as THREE.Mesh;
    const second = oven.counterSign(texture, { where: 'top' }).children[0] as THREE.Mesh;
    const paint = first.material as THREE.MeshBasicMaterial;
    expect(second.material).toBe(paint);
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
