import * as THREE from 'three';
import { SINK_BOWL } from '../../../core/kitchenFit';
import { WATER_LOOK } from './kitchenProps';

/**
 * **Das Wasserleck am Spülbecken** — der Schaden als Rechnung, als Fontäne und
 * als Fortschritt an der Reparatur.
 *
 * Ein roter Knopf neben der Spüle macht sie kaputt (`kitchen.addLeakButton`):
 * Das Wasser **im** Becken ist danach weg — ein Becken, aus dem es spritzt,
 * steht nicht zugleich ruhig halb voll —, und stattdessen schießt es aus der
 * Armatur. Repariert wird mit der **Wasserpumpenzange**, die auf der
 * Arbeitsplatte daneben liegt: hingehen, zugreifen, drücken, dabeistehen.
 *
 * **Dieselbe Dreiteilung wie beim Feuerlöscher** (`kitchenSpray.ts`), und aus
 * demselben Grund: Ob es spritzt, wie weit die Reparatur ist und wann sie
 * fertig wird, sind reine Zahlen — ein Test rechnet sie in Millisekunden nach,
 * derselbe Fall im Headset ist eine Viertelstunde Hin- und Herlaufen. Nur die
 * Fontäne unten kennt three.js, und die Zone sagt ihr je Bild nur, wo das
 * Becken steht und ob es noch spritzt.
 *
 * **Warum das Leck nicht in `kitchenWork.ts` steht**, wo Schneiden, Spülen und
 * Mixen mit derselben Uhr laufen: Jene Uhr gehört dem **Ding auf** der Station
 * (`WorkState.item`, `workStage`) — sie fragt, was aus einem Salatkopf wird.
 * Hier liegt gar nichts auf der Station; kaputt ist das **Möbel**, und in
 * derselben Sekunde soll im Becken noch ein dreckiger Teller liegen dürfen.
 * Zwei Uhren an einer Station wären genau das, wogegen `kitchenWork.ts`
 * geschrieben ist — also bekommt die zweite ihre eigene Rechnung und ihren
 * eigenen Zustand (`Station.leak`).
 */

// --- die reine Rechnung -------------------------------------------------------

/**
 * **Wie lange die Reparatur dauert**, in Sekunden — vier.
 *
 * Die Zahl steht zwischen zwei anderen, die es schon gibt: Ein Teller ist nach
 * drei Sekunden gespült (`kitchenWork.WORK_SECONDS.wash`), ein brennender Herd
 * nach anderthalb aus (`kitchenSpray.SPRAY_SECONDS`). Löschen darf nicht lange
 * dauern, weil die halbe Küche solange steht; eine tropfende Spüle hält
 * dagegen niemanden auf — sie ist Arbeit und kein Notfall.
 *
 * Vier Sekunden sind deshalb die längste Handarbeit dieser Küche: lang genug,
 * dass man die Zange wirklich **holt**, statt sie im Vorbeigehen zu benutzen,
 * und kurz genug, dass man danebenbleibt, statt wegzulaufen und es zu
 * vergessen.
 */
export const REPAIR_SECONDS = 4;

/**
 * **Wie weit über dem Wasserspiegel die Fontäne austritt**, in Metern — knapp
 * zehn Zentimeter, also genau auf dem **Rand** des Beckens.
 *
 * Gerechnet und nicht geschrieben: Die Zone reicht der Fontäne die Ablage der
 * Station (`Station.deck`), und die liegt beim Spülbecken auf dem
 * Wasserspiegel (`core/kitchenFit.SINK_BOWL.water`, dieselbe Höhe, auf der der
 * dreckige Teller schwimmt). Gemeint ist aber die Armatur dahinter, und die
 * sitzt über dem Rand. Wer eine Handbreit tiefer anfinge, ließe das Wasser aus
 * dem Blech quellen statt aus dem Hahn.
 */
export const LEAK_LIFT = SINK_BOWL.rim - SINK_BOWL.water;

/**
 * **Was am Spülbecken kaputt ist und wie weit es schon wieder heil ist.**
 *
 * Drei Felder und keine Aufzählung aus vier Namen: `leaking` ist der Schaden,
 * `fixing` die laufende Reparatur, `time` ihre Sekunden. Eine `phase` daneben
 * wäre eine zweite Wahrheit über dieselben zwei Schalter — und die Frage, die
 * jede Stelle wirklich stellt, ist eine von beiden.
 *
 * Unveränderlich und zurückgegeben wie jede andere Uhr dieser Küche
 * (`kitchenClock.ts`, `kitchenWork.ts`): Der Zustand gehört an die Station,
 * nicht an die Rechnung.
 */
export interface LeakState {
  /** Ob es spritzt — dann steht kein Wasser im Becken. */
  readonly leaking: boolean;
  /** Ob gerade repariert wird; ohne `leaking` gibt es nichts zu reparieren. */
  readonly fixing: boolean;
  /** Sekunden an dieser Reparatur. */
  readonly time: number;
}

/** Ein Becken, das hält. */
export const TIGHT: LeakState = { leaking: false, fixing: false, time: 0 };

/**
 * **Der Knopf ist gedrückt** — ab jetzt spritzt es.
 *
 * Ein zweiter Druck ändert nichts und setzt vor allem **keine** laufende
 * Reparatur zurück: Ein Knopf, der einen mitten in der Arbeit wieder an den
 * Anfang wirft, ist kein Schalter, sondern eine Falle. Ob er überhaupt etwas
 * zu sagen hat, entscheidet die Zone an derselben Antwort — sie bekommt
 * denselben Zustand zurück, den sie hineingegeben hat.
 */
export function springLeak(state: LeakState): LeakState {
  if (state.leaking) return state;
  return { leaking: true, fixing: false, time: 0 };
}

/**
 * **Angesetzt** — mit der Zange in der Hand einmal drücken, und die Uhr läuft.
 *
 * Wie beim Ablegen auf dem Schneidebrett (`kitchenWork.onWork`) ist genau
 * **hier** der Punkt, an dem armiert wird: Ein Abbruch durch Weggehen kommt
 * durch bloßes Zurückkommen nicht wieder, er braucht diesen zweiten Druck. Und
 * ein Becken, das gar nicht spritzt, lässt sich auch nicht reparieren.
 */
export function startFix(state: LeakState): LeakState {
  if (!state.leaking) return state;
  return { leaking: true, fixing: true, time: 0 };
}

/** Was ein Bild an der Reparatur geändert hat. */
export interface LeakTick {
  readonly state: LeakState;
  /** Ob das Becken in **diesem** Bild dicht geworden ist — genau einmal. */
  readonly fixed: boolean;
}

/**
 * **Ein Bild lang geschraubt** — aber nur, solange jemand danebensteht.
 *
 * `near` ist die Figur am Becken, und sie zählt hier genauso wie am
 * Schneidebrett (`kitchenWork.advanceWork`): Wer weggeht, **bricht ab**, die
 * Zeit fällt auf null, und nur ein neues `startFix` fängt wieder an. Das ist
 * die Entscheidung, die aus einem Knopfdruck eine Tätigkeit macht — und sie
 * ist hier dieselbe wie dort, weil es dieselbe Sorte Arbeit ist.
 *
 * **Anders als beim Löschen fällt der Fortschritt nicht langsam zurück**
 * (`kitchenSpray.DOUSE_COOL`). Dort ist das Abkühlen der Preis fürs Schwenken
 * zwischen zwei Herden; hier gibt es nur **ein** Becken und nichts zu
 * schwenken — ein halber Rückfall wäre eine Zahl, die man nirgends sieht.
 *
 * Ist ohnehin nichts zu tun, kommt **derselbe** Zustand zurück und kein gleich
 * aussehender: Die Zone vergleicht auf Identität, um nicht in jedem Bild an
 * einem heilen Becken ein Netz anzufassen.
 */
export function advanceFix(state: LeakState, dt: number, near: boolean): LeakTick {
  if (!state.leaking || !state.fixing) return { state, fixed: false };
  if (!near) {
    if (state.time === 0) return { state: { ...state, fixing: false }, fixed: false };
    return { state: { leaking: true, fixing: false, time: 0 }, fixed: false };
  }
  // `NaN` käme aus einer Uhr, die noch nie gelaufen ist. Ein Fortschritt, der
  // einmal keine Zahl ist, ist es für immer — und das Becken spritzte dann bis
  // zum Verlassen der Zone weiter, ohne dass irgendwo ein Fehler stünde.
  const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const time = state.time + step;
  if (time < REPAIR_SECONDS) return { state: { ...state, time }, fixed: false };
  return { state: TIGHT, fixed: true };
}

/** Der Anteil 0…1 für den Balken über dem Becken. */
export function fixProgress(state: LeakState): number {
  if (!state.fixing || !Number.isFinite(state.time)) return 0;
  return Math.min(1, Math.max(0, state.time / REPAIR_SECONDS));
}

// --- die Fontäne als Bild -----------------------------------------------------

/**
 * **Wie viele Tropfen die Fontäne hat.**
 *
 * Zweiunddreißig, und die Zahl folgt derselben Rechnung wie beim Nebel des
 * Löschers (`kitchenSpray.PUFFS`): Bei einer Lebenszeit von gut zwei Dritteln
 * einer Sekunde und 60 Bildern je Sekunde startet damit alle zwei Bilder einer
 * neu. Dichter muss es nicht sein — ein Leck ist ein Spritzer und keine Dusche
 * —, und billiger geht es kaum: zweiunddreißig Kugeln aus **einer** Form und
 * **einem** Material.
 */
const DROPS = 32;

/**
 * **Wie schnell das Wasser austritt**, in Metern je Sekunde, und wie hoch es
 * damit kommt.
 *
 * 3,2 m/s senkrecht sind nach `v²/2g` genau **52 cm** Steighöhe: Die Fontäne
 * steht damit knapp über der Schulter der Figur (1,60 m, `core/chefFit`), wenn
 * sie auf dem Beckenrand bei gut einem halben Meter anfängt — von oben sieht
 * man sie über die halbe Küche, und trotzdem verdeckt sie niemanden, der
 * davorsteht. Ein Strahl bis an die Decke wäre ein Rohrbruch; einer, der nur
 * blubbert, wäre von oben gar nicht zu sehen.
 */
const DROP_SPEED = 3.2;

/** Die Erdbeschleunigung, mit der jeder Tropfen zurückfällt. */
const GRAVITY = 9.81;

/**
 * **Wie lange ein Tropfen fliegt**, in Sekunden.
 *
 * Gerechnet und nicht gewählt: `2·v/g` ist die Zeit, nach der er wieder auf
 * seiner Austrittshöhe ankommt — also genau die Wurfbahn, die man sieht, und
 * keine Sekunde länger. Ein Tropfen, der darüber hinaus weiterlebt, fiele
 * durch die Arbeitsplatte.
 */
const DROP_LIFE = (2 * DROP_SPEED) / GRAVITY;

/**
 * **Wie schräg die Fontäne auffächert** — der halbe Öffnungswinkel, 28°.
 *
 * Ein undichter Anschluss spritzt nicht senkrecht wie ein Springbrunnen,
 * sondern schief und in alle Richtungen. 28° sind bei der Wurfhöhe oben gut
 * 30 cm seitlicher Versatz: Das Wasser bleibt über dem Becken (0,80 × 0,50 m,
 * `core/kitchenFit.SINK_BOWL`) und regnet nicht auf den Gang daneben.
 */
const DROP_FAN = (28 * Math.PI) / 180;

/**
 * **Wie groß ein Tropfen ist**, als Halbmesser in Metern.
 *
 * Gut drei Zentimeter, und das ist bewusst kein echter Tropfen: Gespielt wird
 * diese Küche von **oben**, aus 16 m Höhe (`core/topDownPose.ts`), und dort
 * ist ein Spritzer von 2 mm gar nichts. Die Zahl ist an der Düse des Löschers
 * gemessen worden, nicht an der Natur — sein erstes Nebelbällchen hat 5 cm
 * (`kitchenSpray.PUFF_MIN`), und ein Wassertropfen, der kleiner ist als der
 * feinste Nebel daneben, sähe aus wie ein Bildfehler.
 */
const DROP_RADIUS = 0.032;

/**
 * **Die Fontäne aus dem Leck** — eine je Zone, ein `dispose`.
 *
 * Gebaut wie der Nebel des Löschers nebenan (`kitchenSpray.SprayJet`) und mit
 * denselben drei Regeln, die dort ausführlich begründet sind: **alles geteilt**
 * (eine Kugelform, ein Material, vierundzwanzig Netze), **keine Allokation je
 * Bild** (alles, was einen Tropfen ausmacht, steht in Feldern fester Länge),
 * und **wer nichts zeigt, kostet nichts** (solange es dicht ist, kehrt
 * `update` in der ersten Zeile um, und die Gruppe hängt gar nicht in der
 * Szene).
 *
 * **Was hier anders ist als dort, ist die Bahn.** Der Nebel fliegt geradeaus
 * und hängt am Ende ein wenig durch; Wasser fliegt eine **Wurfparabel** und
 * kommt zurück. Deshalb steht hier `GRAVITY` statt eines gewählten Durchhangs,
 * und deshalb ist die Lebenszeit gerechnet und nicht gesetzt: Ein Tropfen
 * lebt genau so lange, wie sein Wurf dauert.
 *
 * **Und die Gruppe dreht sich nicht.** Der Löscher zielt irgendwohin, ein Leck
 * nicht: Es spritzt nach oben, wo immer das Becken steht. Übrig bleibt die
 * Verschiebung — und die zieht `update` jedes Bild nach, weil im Baumodus
 * jemand das Becken aufheben und anderswo hinstellen darf.
 */
export class LeakJet {
  /** Woran die Fontäne hängt — der Baum der Zone. */
  private readonly parent: THREE.Object3D;
  private readonly group = new THREE.Group();
  private readonly drops: THREE.Mesh[] = [];

  private readonly shape: THREE.SphereGeometry;
  private readonly skin: THREE.MeshBasicMaterial;

  /** Was einen Tropfen von den anderen unterscheidet — Felder fester Länge. */
  private readonly ages = new Float32Array(DROPS);
  private readonly outX = new Float32Array(DROPS);
  private readonly outZ = new Float32Array(DROPS);
  private readonly lift = new Float32Array(DROPS);

  /** Ob gerade etwas fliegt — die Zahl, an der `update` umkehrt. */
  private live = false;

  constructor(parent: THREE.Object3D) {
    this.parent = parent;
    this.group.name = 'kitchen-leak';

    // Grob und mit Absicht: Ein Tropfen von 2 cm Halbmesser ist auf dem Schirm
    // ein Punkt, und ob er aus 35 oder aus 400 Dreiecken besteht, sieht ihm
    // niemand an.
    this.shape = new THREE.SphereGeometry(DROP_RADIUS, 7, 5);
    this.skin = new THREE.MeshBasicMaterial({
      // **Derselbe Blauton wie das Wasser im Becken und im Topf**
      // (`kitchenProps.WATER_LOOK`): Was aus dem Hahn kommt, ist dasselbe
      // Wasser, das eben noch im Becken stand — zwei Töne wären zwei
      // Flüssigkeiten.
      color: WATER_LOOK.color,
      transparent: true,
      opacity: WATER_LOOK.opacity,
      // Ohne Tiefenschreiben, weil sich durchsichtige Kugeln sonst gegenseitig
      // ausstanzen; ohne Tonwertkurve, damit die Fontäne in jedem Licht
      // dieselbe ist (derselbe Grund wie bei `kitchenSpray.SprayJet`).
      depthWrite: false,
      toneMapped: false,
    });

    for (let i = 0; i < DROPS; i++) {
      const drop = new THREE.Mesh(this.shape, this.skin);
      drop.name = `kitchen-leak-drop:${i}`;
      // Wasser wirft hier keinen Schatten und fängt keinen Strahl: Getroffen
      // wird am Becken und nicht an einem Tropfen.
      drop.castShadow = false;
      drop.receiveShadow = false;
      drop.raycast = () => {};
      drop.visible = false;
      this.drops.push(drop);
      this.group.add(drop);

      // Ein fester, aber ungleichmäßiger Fächer — wie beim Nebel
      // (`kitchenSpray.scatter`): Derselbe Tropfen fliegt immer dieselbe Bahn,
      // damit ein Leck bei jedem Anschalten gleich aussieht und `update` kein
      // `Math.random` je Bild braucht.
      const around = drip(i * 2) * Math.PI * 2;
      // Die Wurzel verteilt die Tropfen über die **Fläche** des Kegels statt
      // über seinen Halbmesser; ohne sie schießt die Hälfte senkrecht hoch.
      const tilt = Math.sqrt(drip(i * 2 + 1)) * DROP_FAN;
      this.outX[i] = Math.cos(around) * Math.sin(tilt) * DROP_SPEED;
      this.outZ[i] = Math.sin(around) * Math.sin(tilt) * DROP_SPEED;
      this.lift[i] = Math.cos(tilt) * DROP_SPEED;
      this.ages[i] = DROP_LIFE;
    }
  }

  /**
   * **Ein Bild weiter.**
   *
   * @param at das **Becken** in Weltkoordinaten — die Ablage der Station; die
   *           Austrittshöhe darüber rechnet die Fontäne selbst (`LEAK_LIFT`).
   *           **`null` heißt: es spritzt nicht mehr**, und der Rest fällt zu
   *           Boden. Eine Stelle und ein Schalter wären zwei Angaben, von
   *           denen die eine sinnlos ist, sobald die andere `false` sagt — die
   *           Zone müsste dann einen Ort für ein Leck erfinden, das es nicht
   *           gibt.
   *
   * **Die Gruppe wandert nur, solange es spritzt.** Was schon fliegt, fliegt
   * dort zu Ende, wo es ausgetreten ist — dieselbe Zusage wie beim Nebel, und
   * sie kostet nichts: Ein repariertes Becken, das seine letzten Tropfen
   * hinter einem herzöge, sähe aus wie ein zweites Leck.
   */
  update(dt: number, at: THREE.Vector3 | null): void {
    const on = at !== null;
    // Der Normalfall in einer Küche, in der nichts kaputt ist: ein Vergleich.
    if (!on && !this.live) return;
    if (at) {
      if (!this.live) this.burst(at);
      else this.aim(at);
    }

    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    let live = false;
    for (let i = 0; i < DROPS; i++) {
      const drop = this.drops[i]!;
      let age = this.ages[i]! + step;
      if (age >= DROP_LIFE) {
        if (!on) {
          // Durchgeflogen, und es spritzt nicht mehr: Der Tropfen bleibt genau
          // auf seiner Lebenszeit stehen und fängt beim nächsten Leck sauber
          // wieder vorn an.
          this.ages[i] = DROP_LIFE;
          drop.visible = false;
          continue;
        }
        age -= DROP_LIFE;
      }
      this.ages[i] = age;
      live = true;

      // Noch nicht geboren: Beim Anschalten starten die Tropfen versetzt, damit
      // die Fontäne aufsteigt und nicht auf einen Schlag dasteht.
      if (age < 0) {
        drop.visible = false;
        continue;
      }

      // Die Wurfparabel, und sonst nichts: gleichförmig zur Seite, gebremst
      // nach oben.
      drop.position.set(
        this.outX[i]! * age,
        this.lift[i]! * age - 0.5 * GRAVITY * age * age,
        this.outZ[i]! * age,
      );
      drop.visible = true;
    }

    this.live = live;
    // Der letzte Tropfen ist unten: Die Gruppe hängt sich selbst ab, und das
    // nächste `update` kehrt wieder in der ersten Zeile um.
    if (!live) this.group.removeFromParent();
  }

  /**
   * **Alles ab und alles weg** — beim Verlassen der Zone.
   *
   * Zweimal zu rufen ist kein Fehler; dieselbe Zusage wie bei
   * `kitchenSpray.SprayJet`.
   */
  dispose(): void {
    this.group.removeFromParent();
    this.live = false;
    for (let i = 0; i < DROPS; i++) {
      this.ages[i] = DROP_LIFE;
      this.drops[i]!.visible = false;
    }
    this.shape.dispose();
    this.skin.dispose();
  }

  // --- gerechnet wird hier ----------------------------------------------------

  /** Aufgerissen: Die Gruppe kommt in die Szene, die Tropfen starten versetzt. */
  private burst(at: THREE.Vector3): void {
    for (let i = 0; i < DROPS; i++) {
      // Negativ heißt „kommt gleich": Über die Lebenszeit verteilt startet
      // einer nach dem anderen, und die Fontäne wächst nach oben heraus.
      this.ages[i] = -(i / DROPS) * DROP_LIFE;
    }
    this.live = true;
    this.aim(at);
    this.parent.add(this.group);
  }

  /**
   * **Die Austrittsstelle an ihren Platz** — über dem Beckenrand
   * (`LEAK_LIFT`).
   *
   * Gehoben wird **vor** dem Umrechnen, solange die Zahl noch in der Welt
   * steht; danach ist „oben" das Oben der Zone und nicht mehr das der Welt
   * (derselbe Kniff wie in `kitchenSpray.SprayJet.aim`, nur ohne Richtung —
   * ein Leck zielt nirgendwohin).
   */
  private aim(at: THREE.Vector3): void {
    _at.set(at.x, at.y + LEAK_LIFT, at.z);
    this.parent.worldToLocal(_at);
    this.group.position.copy(_at);
  }
}

/**
 * **Eine feste Streuung** zu einer Nummer — derselbe Tropfen bekommt immer
 * dieselbe.
 *
 * Kein `Math.random`, und aus demselben Grund wie beim Nebel des Löschers
 * (`kitchenSpray.scatter`): Eine Fontäne, die sich bei jedem Anschalten anders
 * auffächert, lässt sich nicht nachstellen. Die Zahlen sind gegen jene
 * verschoben (`+ 0,5` im Sinus), damit Nebel und Fontäne nicht denselben
 * Fächer bekommen — zwei Effekte mit derselben Streuung sehen verwandt aus,
 * und verwandt sind sie nicht.
 */
function drip(i: number): number {
  const x = Math.sin((i + 0.5) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Einer für alle: Wer je Bild einen Vektor baut, baut je Bild einen Vektor. */
const _at = new THREE.Vector3();
