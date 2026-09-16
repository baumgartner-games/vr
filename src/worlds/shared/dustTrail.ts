import * as THREE from 'three';

/**
 * **Der Staub hinter der Figur** — die kleinen Wölkchen, die beim Laufen
 * aufstieben und liegen bleiben.
 *
 * Bei _Overcooked_ ist das kein Zierrat, sondern die **Auskunft über das
 * Tempo**: Aus der Vogelperspektive ist eine rennende Figur eine Figur, die
 * ein Stück weiter oben ist als eben — woran man sieht, dass sie rennt, ist
 * die Spur dahinter. Genau dafür ist das hier da, und deshalb hängt es an der
 * Figur und nicht an einer Zone: Gestaubt wird, wo gelaufen wird.
 *
 * **Gebaut wie der Löschnebel nebenan** (`worlds/test/zones/kitchenSpray.ts`,
 * `SprayJet`) und mit denselben drei Regeln, weil sie sich dort bewährt haben:
 *
 * - **Geteilt wird alles**: eine Kugelform, ein Material, vierzehn Netze.
 * - **Keine Allokation je Bild**: Was ein Wölkchen ausmacht, steht in Feldern
 *   fester Länge; `update` rechnet daraus Ort und Größe.
 * - **Wer nichts zeigt, kostet nichts**: Solange niemand läuft und nichts mehr
 *   zu sehen ist, kehrt `update` in der ersten Zeile um und die Gruppe hängt
 *   gar nicht in der Szene.
 *
 * **Und die Wölkchen liegen in der Welt und nicht an der Figur.** Das ist der
 * ganze Unterschied zwischen einer Spur und einem Schal: Was ausgestoßen ist,
 * bleibt stehen, wo es ausgestoßen wurde, und die Figur läuft davon. Gerechnet
 * wird deshalb im Raum des Elternteils — die Welt kann verschoben stehen, und
 * ein Wölkchen, das seine Weltkoordinate mitbekäme, läge in einer gedrehten
 * Welt neben der Figur.
 */

/**
 * **Wie weit die Figur läuft, bis das nächste Wölkchen aufsteigt** — in
 * Metern.
 *
 * Am Weg gemessen und nicht an der Zeit, und das ist der Grund, warum die Spur
 * aussieht wie Schritte: Wer rennt, staubt schnell hintereinander, wer
 * schleicht, staubt selten, und wer steht, staubt gar nicht. Eine Uhr täte das
 * Letzte nicht — sie pustete der stehenden Figur weiter Wölkchen unter die
 * Füße.
 *
 * 0,35 m ist ein halber Schritt: Bei Laufgeschwindigkeit (2,6 m/s) sind das
 * gut sieben Wölkchen je Sekunde, und bei achtzehn Wölkchen mit einer
 * Dreiviertelsekunde Lebenszeit steht damit immer eine kleine Schwade hinter
 * der Figur statt einer Perlenkette einzelner Tupfen. Weiter auseinander sah
 * man im Bild zwei Punkte und keinen Staub.
 */
export const DUST_GAP = 0.35;

/**
 * **Ab welchem Sprung in einem Bild gar nicht gestaubt wird**, in Metern.
 *
 * Kein Mensch läuft 1,2 m in einem Bild; wer so weit kommt, ist **versetzt**
 * worden — durch ein Portal, über das Sprungmenü, von der Rettung nach einem
 * Sturz (`worlds/shared/fallRescue.ts`). Ohne diese Grenze rechnete `dustDue`
 * daraus zwanzig Wölkchen auf einmal und legte eine Staubwolke quer über die
 * halbe Welt, entlang einer Strecke, die niemand gelaufen ist.
 */
export const DUST_JUMP = 1.2;

/** Wie lange ein Wölkchen lebt, in Sekunden. */
const DUST_LIFE = 0.75;

/** Wie viele Wölkchen es überhaupt gibt — der Vorrat, der umläuft. */
const PUFFS = 18;

/**
 * **Wie groß ein Wölkchen anfängt und aufhört**, als Halbmesser in Metern.
 *
 * Es wächst, während es zerfällt — Staub, der aufgewirbelt wird, wird weiter
 * und dünner. 10 cm am Boden unter dem Fuß, 30 cm, wenn es verschwindet: Aus
 * 16 m Höhe (`core/topDownPose.ts`) ist eine Figur keine 40 Pixel hoch, und
 * ein Wölkchen von 15 cm war dort ein Staubkorn — gemessen im Browser, nicht
 * geschätzt. Drei Wölkchen dieser Größe hintereinander sind die Schwade, die
 * man bei _Overcooked_ hinter einem rennenden Koch sieht.
 */
const PUFF_MIN = 0.1;
const PUFF_MAX = 0.3;

/** Wie hoch ein Wölkchen steigt und wie weit es zurückbleibt, in Metern. */
const PUFF_RISE = 0.3;
const PUFF_DRIFT = 0.2;

/**
 * **Wie weit hinter den Füßen es entsteht**, in Metern.
 *
 * Ein Wölkchen, das mitten in der Figur aufginge, wäre von oben ein Fleck auf
 * ihrem Kopf. 0,18 m ist knapp hinter der Ferse — dort, wo der Fuß gerade
 * abgestoßen hat.
 */
const PUFF_BACK = 0.18;

/** Wie weit die Wölkchen seitlich streuen, in Metern — sonst ist es eine Linie. */
const PUFF_SPREAD = 0.11;

/** Ab welchem Anteil der Lebenszeit es wieder zusammenfällt (siehe `SprayJet`). */
const PUFF_HOLD = 0.45;

/**
 * **Wie deckend der Staub ist.**
 *
 * 0,45 je Wölkchen, und weil zwei bis drei einander überlappen, ist die
 * Schwade dicht, wo sie entsteht, und licht, wo sie ausläuft — dieselbe
 * Rechnung wie beim Löschnebel (`kitchenSpray.PUFF_ALPHA`). Deckend wäre
 * Rauch aus einem Auspuff, halbdurchsichtig ist aufgewirbelter Staub.
 */
const PUFF_ALPHA = 0.45;

/** Das Weiß des Staubs: ein warmes Grau, damit es nicht wie Löschschaum aussieht. */
const PUFF_WHITE = 0xf1ece4;

/**
 * **Wie viele Wölkchen dieses Stück Weg auslöst** — und was vom Rest übrig
 * bleibt.
 *
 * Eine reine Rechnung und deshalb hier und nicht in der Schleife: Sie ist die
 * einzige Stelle, an der entschieden wird, **wann** gestaubt wird, und sie hat
 * genau die zwei Fälle, die im Browser eine halbe Stunde Suchen wären — der
 * stehende Spieler (nichts) und der versetzte (auch nichts, siehe
 * `DUST_JUMP`).
 *
 * `carry` ist der Weg, der vom letzten Bild übrig blieb: Über zwei Bilder
 * hinweg zählt jeder Zentimeter, sonst hinge die Spur an der Bildrate.
 *
 * @param carry  Restweg aus den Bildern davor, in Metern
 * @param moved  Weg in diesem Bild, in Metern
 */
export function dustDue(
  carry: number,
  moved: number,
  gap = DUST_GAP,
  jump = DUST_JUMP,
): { puffs: number; rest: number } {
  // Ein Restweg, mit dem sich rechnen lässt: Was hier hereinkommt, kommt aus
  // einer Subtraktion zweier Orte, und die kann in einem Bild ohne Weltmatrix
  // auch einmal `NaN` sein.
  const held = Number.isFinite(carry) ? Math.max(0, carry) : 0;
  const step = Math.max(1e-3, gap);
  if (!Number.isFinite(moved) || moved <= 0) return { puffs: 0, rest: held };
  // Versetzt und nicht gelaufen: Der Rest geht mit, sonst staubte es beim
  // ersten Schritt nach dem Sprung doppelt.
  if (moved > jump) return { puffs: 0, rest: 0 };
  const total = held + moved;
  const puffs = Math.floor(total / step);
  return { puffs, rest: total - puffs * step };
}

/**
 * **Die Staubspur einer Figur** — eine je Welt, ein `dispose`.
 *
 * Sie bekommt je Bild, wo die Füße stehen und ob überhaupt gelaufen wird; den
 * Rest — wie weit, wie schnell, in welche Richtung — rechnet sie aus dem
 * Vergleich mit dem Bild davor. Eine Spur, die zusätzlich nach der
 * Geschwindigkeit fragte, hinge an der Steuerung, und davon gibt es in diesem
 * Projekt vier (Brille, Maus, Pad, Bordstock).
 */
export class DustTrail {
  private readonly parent: THREE.Object3D;
  private readonly group = new THREE.Group();
  private readonly puffs: THREE.Mesh[] = [];

  private readonly shape: THREE.SphereGeometry;
  private readonly skin: THREE.MeshBasicMaterial;

  /** Was ein Wölkchen ausmacht — Felder fester Länge statt eines Objekts je Stück. */
  private readonly ages = new Float32Array(PUFFS);
  private readonly baseX = new Float32Array(PUFFS);
  private readonly baseY = new Float32Array(PUFFS);
  private readonly baseZ = new Float32Array(PUFFS);
  private readonly awayX = new Float32Array(PUFFS);
  private readonly awayZ = new Float32Array(PUFFS);

  /** Der Ringpuffer: Das nächste Wölkchen ist das älteste. */
  private next = 0;
  /** Wie viele gerade zu sehen sind — die Zahl, an der `update` umkehrt. */
  private live = 0;
  /** Wo die Füße im letzten Bild standen, im Raum des Elternteils. */
  private readonly last = new THREE.Vector3();
  private started = false;
  /** Restweg bis zum nächsten Wölkchen (`dustDue`). */
  private carry = 0;

  constructor(parent: THREE.Object3D) {
    this.parent = parent;
    this.group.name = 'dust-trail';

    // Grob mit Absicht: Ein Staubwölkchen ist eine weiche helle Fläche von
    // 17 cm, und ob sie aus 35 oder 400 Dreiecken besteht, sieht ihr niemand an.
    this.shape = new THREE.SphereGeometry(1, 7, 5);
    this.skin = new THREE.MeshBasicMaterial({
      color: PUFF_WHITE,
      transparent: true,
      opacity: PUFF_ALPHA,
      // Wie beim Löschnebel: ohne Tiefenschreiben, weil sich durchsichtige
      // Kugeln sonst gegenseitig ausstanzen, und ohne Tonwertkurve, damit der
      // Staub in jedem Licht derselbe ist.
      depthWrite: false,
      toneMapped: false,
    });

    for (let i = 0; i < PUFFS; i++) {
      const puff = new THREE.Mesh(this.shape, this.skin);
      puff.name = `dust-puff:${i}`;
      // Staub wirft keinen Schatten und fängt keinen Strahl: Er ist Farbe und
      // kein Ding (`core/usable.ts` zielt auf Möbel, nicht auf Wölkchen).
      puff.castShadow = false;
      puff.receiveShadow = false;
      puff.raycast = () => {};
      puff.visible = false;
      this.ages[i] = DUST_LIFE;
      this.puffs.push(puff);
      this.group.add(puff);
    }
  }

  /**
   * **Ein Bild weiter.**
   *
   * @param at      wo die Füße stehen, in Weltkoordinaten
   * @param walking ob die Figur überhaupt zu Fuß unterwegs ist
   *
   * `walking` ist kein Tempo, sondern eine Erlaubnis: Wer im Kart sitzt oder
   * durch ein Portal fällt, bewegt sich auch — staubt aber nicht. Wie **weit**
   * gelaufen wurde, sieht die Spur selbst.
   */
  update(dt: number, at: THREE.Vector3, walking: boolean): void {
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;

    _feet.copy(at);
    this.parent.worldToLocal(_feet);
    if (!this.started) {
      this.last.copy(_feet);
      this.started = true;
    }

    const dx = _feet.x - this.last.x;
    const dz = _feet.z - this.last.z;
    const moved = Math.hypot(dx, dz);
    this.last.copy(_feet);

    // Der Normalfall in einer stehenden Welt: zwei Vergleiche.
    if (!walking && this.live === 0) {
      this.carry = 0;
      return;
    }

    const due = dustDue(this.carry, walking ? moved : 0);
    this.carry = due.rest;
    if (due.puffs > 0) {
      if (this.live === 0) this.parent.add(this.group);
      // Rückwärts: Das zuletzt gesetzte Wölkchen gehört an die Stelle, an der
      // die Füße **jetzt** stehen, und die davor liegen dahinter.
      for (let n = due.puffs - 1; n >= 0; n--) {
        this.spawn(_feet, dx / (moved || 1), dz / (moved || 1), n / due.puffs);
      }
    }

    let live = 0;
    for (let i = 0; i < PUFFS; i++) {
      const puff = this.puffs[i]!;
      const age = this.ages[i]! + step;
      if (age >= DUST_LIFE) {
        this.ages[i] = DUST_LIFE;
        puff.visible = false;
        continue;
      }
      this.ages[i] = age;
      live++;

      const t = age / DUST_LIFE;
      puff.position.set(
        this.baseX[i]! + this.awayX[i]! * PUFF_DRIFT * t,
        this.baseY[i]! + PUFF_RISE * t,
        this.baseZ[i]! + this.awayZ[i]! * PUFF_DRIFT * t,
      );
      const grow = PUFF_MIN + (PUFF_MAX - PUFF_MIN) * t;
      // Dasselbe Ausblenden über die Größe wie beim Löschnebel: Alle teilen
      // sich ein Material, also gibt es genau eine Deckkraft — und ein
      // Wölkchen, das in sich zusammenfällt, löst sich auf, statt zu blitzen.
      const fade = t < PUFF_HOLD ? 1 : 1 - (t - PUFF_HOLD) / (1 - PUFF_HOLD);
      puff.scale.setScalar(grow * fade);
      puff.visible = fade > 0.02;
    }

    this.live = live;
    if (live === 0) this.group.removeFromParent();
  }

  /**
   * **Alles ab und alles weg** — beim Verlassen der Welt.
   *
   * Zweimal zu rufen ist kein Fehler; danach ist die Spur leer und ließe sich
   * wieder füllen (dieselbe Zusage wie bei `SprayJet`).
   */
  dispose(): void {
    this.group.removeFromParent();
    this.live = 0;
    this.carry = 0;
    this.started = false;
    for (let i = 0; i < PUFFS; i++) {
      this.ages[i] = DUST_LIFE;
      this.puffs[i]!.visible = false;
    }
    this.shape.dispose();
    this.skin.dispose();
  }

  /**
   * **Ein Wölkchen setzen** — hinter den Füßen, seitlich versetzt.
   *
   * `back` ist der Anteil eines Wegstücks, um den es hinter der jetzigen
   * Stelle liegt: Wer in einem Bild zwei Wölkchen auslöst, soll nicht zwei an
   * derselben Stelle haben, sondern eines pro halbem Schritt.
   *
   * Die Streuung ist **fest** und nicht gewürfelt (dieselbe Überlegung wie bei
   * `kitchenSpray.scatter`): Dieselbe Runde sieht zweimal gleich aus, und ein
   * Test, der die Spur nachrechnet, ist keine Wette.
   */
  private spawn(at: THREE.Vector3, dirX: number, dirZ: number, back: number): void {
    const i = this.next;
    this.next = (this.next + 1) % PUFFS;

    const side = scatter(i) * 2 - 1;
    const step = DUST_GAP * back;
    this.baseX[i] = at.x - dirX * (PUFF_BACK + step) - dirZ * side * PUFF_SPREAD;
    this.baseY[i] = at.y + PUFF_MIN;
    this.baseZ[i] = at.z - dirZ * (PUFF_BACK + step) + dirX * side * PUFF_SPREAD;
    // Nach hinten und zur Seite weg, also gegen die Laufrichtung: Staub bleibt
    // zurück, er läuft nicht mit.
    this.awayX[i] = -dirX + dirZ * side * 0.4;
    this.awayZ[i] = -dirZ - dirX * side * 0.4;
    this.ages[i] = 0;
    this.puffs[i]!.visible = true;
  }
}

/**
 * **Eine feste Streuung** zu einer Nummer — dasselbe Wölkchen bekommt immer
 * dieselbe. Derselbe Sinus-Trick wie in `kitchenSpray.scatter` und aus
 * demselben Grund: Zahlen, die aussehen wie gewürfelt und es nicht sind.
 */
function scatter(i: number): number {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Einer für alle: Wer je Bild einen Vektor baut, baut je Bild einen Vektor. */
const _feet = new THREE.Vector3();
