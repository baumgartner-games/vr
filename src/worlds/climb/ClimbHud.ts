import * as THREE from 'three';
import { LAYER_HUD } from '../../ui/ScoreHud';
import { TextPlane } from '../../ui/TextPlane';
import { RECOVER_AT, SLIP_AT } from './stamina';

/**
 * **Die drei Balken im Blickfeld** — Ausdauer in der Mitte, links und rechts
 * daneben der Halt der jeweiligen Hand.
 *
 * Sie hängen wie die Trefferanzeige an der **Kamera** und liegen auf
 * `LAYER_HUD`: Ein Balken, der dem Kopf ein Bild hinterherläuft, ist das
 * Erste in VR, wovon einem schlecht wird — und ein Balken, den auch die
 * Portalkameras oder die Drohne zeichnen, schwebt plötzlich mitten im Raum.
 *
 * Sie liegen am **unteren Bildrand** und nicht mitten im Blickfeld: Was beim
 * Klettern zählt, ist die Wand vor der Nase; die Ausdauer sieht man nach, wenn
 * man sie wissen will.
 *
 * Die Anordnung ist die Anschrift: der linke Balken gehört zur linken Hand.
 * Deshalb steht auch nichts daran — man liest ihn nicht, man sieht ihn.
 * Farbe sagt den Rest, und sie sagt an beiden Balken **dasselbe**: Türkis
 * heißt gut (über der Erholungsschwelle), Bernstein heißt, es läuft aus, Rot
 * heißt, gleich ist die Hand weg. Auf den Haltbalken sitzen dazu zwei feine
 * Striche genau auf den beiden Schwellen — ohne sie wäre „gut“ eine Farbe,
 * die man glauben muss, statt einer Höhe, die man ablesen kann.
 *
 * Unter dem Ausdauerbalken steht ein Wort, und zwar nur eines: *Ausdauer*.
 * Es ist einmal auf eine Leinwand gezeichnet und ändert sich nie — ein HUD,
 * das jedes Bild eine Textur neu malt, kostet mehr als es sagt.
 */

/**
 * Wie weit vor dem Auge alles hängt, und wie tief unter der Blicklinie.
 *
 * `DROP` ist der eigentliche Regler: 0,45 m auf einen Meter sind gut 24° unter
 * geradeaus — **an den unteren Bildrand, aber nicht darüber hinaus**. Bei den
 * 0,2 m von vorher (11°) lagen die Balken mitten im Blickfeld und damit die
 * ganze Zeit mit an der Wand; ganz unten am Rand wiederum sähe man sie nur
 * noch, wenn man den Kopf senkt, und dann kann man sie auch weglassen. So
 * liegen sie da, wo man ohnehin hinschaut, wenn man nachsieht, wo die Füße
 * hin sollen.
 */
const DISTANCE = 1;
const DROP = 0.45;

/** Der Ausdauerbalken. */
const BAR_W = 0.26;
const BAR_H = 0.022;
/** Die beiden Haltbalken daneben — schmal und hochkant. */
const GRIP_W = 0.022;
const GRIP_H = 0.13;
/** Luft zwischen Ausdauer- und Haltbalken. */
const GAP = 0.035;

/**
 * **Wie früh die Anzeige gezeichnet wird** — und warum das eine Zahl unter 10
 * sein muss.
 *
 * Sie liegt ohne Tiefentest auf dem Glas (`flatten`): Sonst verschwände sie
 * hinter jeder Wand, an der man gerade hängt, und an einer Wand hängt man hier
 * die ganze Zeit. Ohne Tiefentest entscheidet aber allein die Reihenfolge, wer
 * über wem liegt — und mit den 60 von vorher lag sie über *allem*, auch über
 * dem aufgeklappten Handgelenkmenü (`UIPanel`, Reihenfolge 10). Drei Balken,
 * die quer durch eine Menüseite laufen, sind schlimmer als drei Balken, die
 * man kurz nicht sieht.
 *
 * Also davor statt darüber: Die Anzeige wird als Erste gezeichnet, das Menü
 * danach und deshalb darüber. Gegenüber der Welt ändert das nichts — die ist
 * längst gezeichnet, wenn die durchsichtigen Sachen an die Reihe kommen.
 */
const ORDER = 4;

const RAIL = 0x0b1220;
const GOOD = 0x5ee0a0;
const WARN = 0xffc857;
const BAD = 0xff3b2f;
/** Ein Halt, den es gerade nicht gibt — die Hand ist an keiner Wand. */
const IDLE = 0x39414f;

const _good = new THREE.Color(GOOD);
const _warn = new THREE.Color(WARN);
const _bad = new THREE.Color(BAD);

/** Wo die beiden Haltbalken stehen — die linke Hand links, die rechte rechts. */
const GRIP_X = BAR_W / 2 + GAP + GRIP_W / 2;
/** Und wie hoch ihr Fuß sitzt: Unterkante bündig mit dem Ausdauerbalken. */
const GRIP_BASE = -BAR_H / 2;

/** Ein Balken: die Schiene dahinter und die Füllung, die daran wächst. */
interface Bar {
  fill: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Entlang welcher Achse die Füllung wächst. */
  axis: 'x' | 'y';
}

export class ClimbHud extends THREE.Group {
  private readonly stamina: Bar;
  private readonly grips: Record<'left' | 'right', Bar>;
  private readonly label: TextPlane;
  private readonly parts: Array<{ dispose(): void }> = [];

  constructor() {
    super();
    this.name = 'climb-hud';
    this.position.set(0, -DROP, -DISTANCE);
    // So weit unten ist die Tafel schräg im Blick, und eine schräg gesehene
    // Tafel ist eine gestauchte. Also dreht sie sich dem Auge entgegen —
    // genau um den Winkel, um den sie unter ihm hängt.
    //
    // Das Vorzeichen ist der ganze Punkt, und es stand lange falsch herum: Ein
    // positives `rotation.x` kippt die Normale einer Tafel **nach unten**
    // (aus (0,0,1) wird (0,−sin, cos)) und damit vom Auge weg. Die Tafel hing
    // also nicht um 24° zurückgedreht, sondern um 24° weiter nach vorn — knapp
    // 50° schräg im Blick statt null. Mit dem Minus zeigt ihre Normale exakt
    // auf das Auge, und man sieht senkrecht darauf.
    this.rotation.x = -Math.atan2(DROP, DISTANCE);
    this.layers.set(LAYER_HUD);

    this.stamina = this.bar(0, 0, BAR_W, BAR_H, 'x');
    this.grips = {
      left: this.bar(-GRIP_X, GRIP_BASE + GRIP_H / 2, GRIP_W, GRIP_H, 'y'),
      right: this.bar(GRIP_X, GRIP_BASE + GRIP_H / 2, GRIP_W, GRIP_H, 'y'),
    };

    for (const x of [-GRIP_X, GRIP_X]) {
      for (const [level, color] of [
        [RECOVER_AT, GOOD],
        [SLIP_AT, BAD],
      ] as const) {
        this.tick(x, GRIP_BASE + GRIP_H * level, color);
      }
    }

    this.label = new TextPlane({
      width: 0.16,
      height: 0.04,
      title: 'Ausdauer',
      accent: GOOD,
      background: 'rgba(9, 14, 26, 0.0)',
      align: 'center',
    });
    this.label.position.set(0, -BAR_H / 2 - 0.028, 0);
    this.label.renderOrder = ORDER;
    this.flatten(this.label);
    this.add(this.label);
    this.parts.push(this.label);
  }

  /** Hängt sich an die Kamera und macht ihr die HUD-Ebene sichtbar. */
  mount(camera: THREE.Camera): void {
    if (this.parent !== camera) camera.add(this);
    camera.layers.enable(LAYER_HUD);
  }

  unmount(camera: THREE.Camera): void {
    this.removeFromParent();
    camera.layers.disable(LAYER_HUD);
    this.dispose();
  }

  /**
   * Neue Werte. `null` heißt: Diese Hand hält gerade nichts — der Balken
   * bleibt dann leer und grau stehen, statt zu verschwinden. Ein Balken, der
   * verschwindet, sieht aus wie ein Fehler; einer, der leer ist, sieht aus
   * wie eine leere Hand.
   */
  setValues(stamina: number, left: number | null, right: number | null): void {
    this.fill(this.stamina, stamina, staminaColor(stamina));
    this.fill(this.grips.left, left ?? 0, left === null ? new THREE.Color(IDLE) : gripColor(left));
    this.fill(
      this.grips.right,
      right ?? 0,
      right === null ? new THREE.Color(IDLE) : gripColor(right),
    );
  }

  dispose(): void {
    for (const part of this.parts) part.dispose();
    this.parts.length = 0;
    this.clear();
  }

  private fill(bar: Bar, value: number, color: THREE.Color): void {
    const share = Math.min(1, Math.max(0, value));
    // Die Füllung wächst aus ihrem Nullpunkt heraus, nicht aus der Mitte —
    // dafür steckt die Geometrie schon um eine halbe Länge verschoben drin.
    if (bar.axis === 'x') bar.fill.scale.x = share;
    else bar.fill.scale.y = share;
    bar.fill.visible = share > 0.002;
    bar.fill.material.color.copy(color);
  }

  /** Schiene plus Füllung, an einem Punkt, wachsend entlang einer Achse. */
  private bar(x: number, y: number, width: number, height: number, axis: 'x' | 'y'): Bar {
    const group = new THREE.Group();
    group.position.set(x, y, 0);
    group.layers.set(LAYER_HUD);
    this.add(group);

    const rail = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.006, height + 0.006),
      new THREE.MeshBasicMaterial({ color: RAIL, transparent: true, opacity: 0.72 }),
    );
    this.flatten(rail);
    rail.renderOrder = ORDER;
    group.add(rail);
    this.parts.push({ dispose: () => disposeMesh(rail) });

    const geometry = new THREE.PlaneGeometry(width, height);
    // Nullpunkt an den Anfang: nach rechts beim Ausdauerbalken, nach oben bei
    // den beiden Haltbalken.
    if (axis === 'x') geometry.translate(width / 2, 0, 0);
    else geometry.translate(0, height / 2, 0);
    const fill = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: GOOD, transparent: true, opacity: 0.95 }),
    );
    fill.position.set(axis === 'x' ? -width / 2 : 0, axis === 'y' ? -height / 2 : 0, 0.0005);
    this.flatten(fill);
    fill.renderOrder = ORDER + 1;
    group.add(fill);
    this.parts.push({ dispose: () => disposeMesh(fill) });

    return { fill, axis };
  }

  /** Ein feiner Strich quer über die beiden Haltbalken: eine der Schwellen. */
  private tick(x: number, y: number, color: number): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(GRIP_W + 0.014, 0.0035),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
    );
    mesh.position.set(x, y, 0.001);
    this.flatten(mesh);
    mesh.renderOrder = ORDER + 2;
    this.add(mesh);
    this.parts.push({ dispose: () => disposeMesh(mesh) });
  }

  /** Auf dem Glas, nicht dahinter — und nur für das eigene Auge. */
  private flatten(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>): void {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.depthTest = false;
    material.depthWrite = false;
    material.toneMapped = false;
    mesh.frustumCulled = false;
    mesh.layers.set(LAYER_HUD);
  }
}

/** Grün, solange es reicht; bernstein, wenn es knapp wird; rot am Ende. */
function staminaColor(value: number): THREE.Color {
  if (value > 0.55) return _good;
  return value > 0.25 ? _warn : _bad;
}

/** Dieselben drei Farben, aber an den beiden Schwellen des Halts. */
function gripColor(value: number): THREE.Color {
  if (value >= RECOVER_AT) return _good;
  return value >= SLIP_AT ? _warn : _bad;
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}
