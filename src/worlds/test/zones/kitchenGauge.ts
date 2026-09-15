import * as THREE from 'three';

/**
 * **Was über einer Küchenstation in der Luft steht** — der Fortschrittsbalken,
 * das Warndreieck und die Flammen am Herd.
 *
 * Bei _Overcooked_ ist die halbe Küche eine Anzeige: über der Pfanne läuft ein
 * Balken voll, kurz bevor es brennt blinkt ein Dreieck, und wenn es brennt,
 * sieht man es von der anderen Seite des Raumes. Genau das fehlte hier — die
 * Uhr am Herd lief, und zu sehen war sie erst, wenn das Patty schwarz war
 * (`kitchenRecipes.FRY_SECONDS`, `BURN_SECONDS`, `FIRE_SECONDS`).
 *
 * **Warum ein eigenes Modul und keine zweite Texttafel.** Das Projekt hat für
 * Schilder `ui/TextPlane.ts`, und die wäre hier die falsche Antwort: Sie malt
 * **Text** auf eine Leinwand (`document.createElement('canvas')`), und ein
 * Balken ist kein Text. Man müsste ihn je Bild neu zeichnen und die Textur
 * hochladen — 60-mal in der Sekunde je bratender Pfanne —, und das Modul wäre
 * in Jest nicht mehr zu laden (`core/chefFit.canLoadModels`: kein `document`).
 * Zwei Quads, deren eines man in x staucht, kosten nichts und laufen überall.
 * Wo wirklich **Wörter** an einer Station stehen sollen — „Hamburger serviert"
 * an der Ausgabetheke —, bleibt `TextPlane` zuständig; das hier nimmt ihr
 * nichts weg.
 *
 * **Geteilt wird alles**, wie beim Zutatensatz nebenan
 * (`kitchenProps.FoodKit`): Formen und Farben hängen in zwei Karten, jeder
 * Balken und jede Flamme borgt sie sich, und **ein** `dispose()` gibt sie
 * zurück. Eine Küche mit acht Herden soll nicht acht rote Materialien haben.
 *
 * **Und wer nichts anzeigt, kostet nichts.** Die Anzeigen hängen nicht auf
 * Vorrat in der Szene: Was niemand zeigt, ist entweder noch gar nicht gebaut
 * oder liegt abgehängt im Vorrat (`spare`). `update` kehrt sofort um, solange
 * nichts sichtbar ist. In der Küche steht die Regel: zwölf Möbel, von denen
 * meistens keines etwas zu sagen hat.
 *
 * **Nichts davon kennt die Zone.** Die Station sagt „hier, an dieser
 * Weltstelle, ein Balken bei 0,4 in warm" und beim nächsten Mal „weg damit" —
 * mehr geht nicht über diese Grenze. Der Schlüssel gehört der Station; wie sie
 * ihn bildet, ist ihre Sache.
 */

/** Wofür ein Balken steht — und damit, welche Farbe er hat. */
export type GaugeTone = 'cook' | 'burn' | 'chop';

/** Klein unter der Pfanne oder groß über dem brennenden Herd. */
export type FlameKind = 'cook' | 'fire';

/**
 * **Wie breit ein Balken ist**, in Metern.
 *
 * Eine Kachel ist 1 m breit (`worlds/nav/navTile.TILE`), und jedes Möbel der
 * Küche belegt eine davon (`core/kitchenFit.KITCHEN_PIECES`, `tiles`). Ein
 * Balken über der vollen Kachelbreite stieße an den des Nachbarherds; gut die
 * halbe Kachel steht erkennbar über **einem** Möbel.
 */
export const BAR_WIDTH = 0.55;

/**
 * **Und wie hoch**, in Metern — ein Neuntel seiner Breite.
 *
 * Gemessen an der Ansicht, für die er gedacht ist: Die Kamera von oben steht
 * 16 m weg und öffnet 30° (`core/topDownPose.ts`, `TOP_DOWN_DISTANCES[1]`,
 * `TOP_DOWN_FOV`), sieht also gut 8,5 m Bildhöhe. 6 cm wären dort ein Strich
 * von unter einem Prozent der Bildhöhe — bei 1080p sieben Pixel, und davon
 * gehen zwei an den Rand. 10 cm sind gut ein Prozent und bleiben auch auf der
 * fernsten Zoomstufe ein Balken und kein Faden.
 */
export const BAR_HEIGHT = 0.1;

/** Wie weit der dunkle Rand ringsum über den Balken hinaussteht, in Metern. */
const BAR_EDGE = 0.018;

/**
 * **Wie hoch über der Arbeitsplatte ein Balken schweben will**, in Metern —
 * ein Vorschlag an die Zone, keine Vorschrift (sie gibt die Stelle vor).
 *
 * „Eine Handbreit über der Platte" stimmt erst, wenn man mitzählt, was **auf**
 * der Platte liegt: Die Pfanne trägt 13 cm auf (Herd 0,55 m, Herd mit Pfanne
 * 0,68 m — `core/kitchenFit.KITCHEN_PIECES`), ein Brötchen 26 cm
 * (`kitchenProps.BUN_HEIGHT`). 30 cm über der Platte liegt der Balken also
 * eine Handbreit über dem höchsten Ding darauf — und mit 0,85 m über dem Boden
 * immer noch **unter** den Augen der Figur (0,914 m, `core/chefFit.CHEF_EYE`),
 * verdeckt von oben also kein Gesicht.
 */
export const GAUGE_LIFT = 0.3;

/**
 * **Wie groß das Warndreieck ist** (Seitenlänge in Metern) und wie hoch es
 * über der Platte steht.
 *
 * Es meint dasselbe wie der dritte Balken und steht darum darüber, nicht
 * daneben: 0,52 m über der Platte ist eine Balkenhöhe Luft über dem Balken auf
 * `GAUGE_LIFT`. Über dem Herd ist das 1,07 m — auf Kopfhöhe der Figur, und
 * damit das, was man von oben zuerst sieht.
 */
export const WARN_SIZE = 0.24;
export const WARN_LIFT = 0.52;

/**
 * **Wie weit ein Schild sich mindestens zurücklehnt**, im Bogenmaß (30°).
 *
 * Ein Schild dreht sich zur Kamera — nur zu **welcher**? Die Hauptansicht am
 * Schirm ist die Kamera von oben (`core/TopDownCamera.ts`), sie steht 55° über
 * der Waagerechten; eine Welt bekommt in `update` aber die Kamera aus den
 * Augen gereicht (`core/App.ts`: `world.update(dt, context)` — der Tausch auf
 * die Kamera von oben passiert erst für das **Bild**). Wer stur der gereichten
 * Kamera ins Gesicht sieht, steht von oben also fast hochkant im Bild und ist
 * auf ein knappes Drittel gestaucht (cos 55° = 0,57).
 *
 * Also lehnt sich jedes Schild **mindestens** 30° zurück, egal wer fragt: Von
 * oben bleiben 25° Rest (cos = 0,91, so gut wie unverkürzt), aus den Augen
 * sind es 30° (cos = 0,87) — beides liest sich. Steht die Kamera höher als 30°
 * — die von oben tut es —, gilt ihr echter Winkel und das Schild sieht sie
 * genau an.
 */
export const GAUGE_LEAN_MIN = (30 * Math.PI) / 180;

/** Die Farben der drei Balken — warm fürs Braten, rot fürs Verbrennen, hell fürs Schneiden. */
const TONE_COLOR: Readonly<Record<GaugeTone, number>> = {
  cook: 0xffa22e,
  burn: 0xe5361c,
  chop: 0xe8f3ff,
};

/** Der dunkle Grund hinter jedem Balken und die Tinte im Warndreieck. */
const DARK = 0x0b111c;
/** Die Fläche des Warndreiecks — dasselbe Rot wie der Verbrennen-Balken. */
const WARN_RED = 0xe5361c;

/** Wie schnell das Warndreieck pulst (Hz) und wie weit — sparsam, nicht hektisch. */
const WARN_HZ = 1.8;
const WARN_GROW = 0.1;
const WARN_FADE = 0.35;

/**
 * **Wie eine Flamme gebaut ist** — Anzahl der Zungen, Höhe, Breite, Streuung,
 * alles in Metern.
 *
 * Die kleine sitzt **unter der Pfanne**: Die Pfanne steht auf der Platte und
 * ist 13 cm hoch, also reichen 18 cm Zungen bis an ihren Rand und lecken
 * daran, statt sie zu verschlucken. Die große ist 0,85 m hoch und steht damit
 * auf einem Herd von 0,55 m bis auf 1,40 m — über der Figur (1,60 m,
 * `core/chefFit.CHEF_HEIGHT`) sieht man sie von oben über die halbe Küche,
 * unter ihrem Scheitel verdeckt sie niemanden, der davorsteht.
 */
const FLAME_SHAPE: Readonly<Record<FlameKind, FlameShape>> = {
  cook: { tongues: 3, height: 0.18, width: 0.14, spread: 0.11, hz: 7 },
  fire: { tongues: 5, height: 0.85, width: 0.34, spread: 0.24, hz: 4.5 },
};

interface FlameShape {
  readonly tongues: number;
  readonly height: number;
  readonly width: number;
  readonly spread: number;
  /** Wie schnell sie flackert — das kleine Feuer zuckt, das große wogt. */
  readonly hz: number;
}

/** Die Farben der Flammen: außen die Glut, innen der helle Kern. */
const FLAME_COLOR: Readonly<Record<FlameKind, { edge: number; core: number }>> = {
  cook: { edge: 0xff6a1e, core: 0xffd257 },
  fire: { edge: 0xff3a14, core: 0xffb02a },
};

/** Ein Balken: der dunkle Grund, die Füllung davor, und wofür er gerade steht. */
interface Bar {
  readonly group: THREE.Group;
  readonly fill: THREE.Mesh;
  tone: GaugeTone;
}

/** Eine Flamme: ihre Zungen und deren Phasen, damit sie nicht im Gleichschritt zucken. */
interface Flame {
  readonly group: THREE.Group;
  readonly tongues: THREE.Mesh[];
  readonly phases: number[];
  readonly kind: FlameKind;
}

/**
 * **Die Anzeigen einer Küche** — eine je Zone, ein `dispose`.
 *
 * Alle drei Sorten hängen an einem Schlüssel, den die Station vergibt, und
 * jede Sorte für sich: Ein Herd zeigt Balken **und** Flammen **und** kurz vor
 * dem Feuer sein Dreieck, alles unter demselben Schlüssel. `clear(key)` nimmt
 * alles davon auf einmal weg — das ist die Zeile, die eine Station schreibt,
 * wenn jemand die Pfanne herunternimmt.
 */
export class KitchenGauges {
  /** Woran die Anzeigen hängen — der Baum der Zone. */
  private readonly parent: THREE.Object3D;

  private readonly bars = new Map<string, Bar>();
  private readonly warns = new Map<string, THREE.Object3D>();
  private readonly flames = new Map<string, Flame>();

  /**
   * **Der Vorrat**: was abgehängt wurde, aber gebaut bleibt.
   *
   * Ein Herd blendet seinen Balken zwischen zwei Pattys aus und gleich wieder
   * ein. Ihn dabei wegzuwerfen hieße, je Patty ein paar Objekte zu bauen und
   * gleich wieder zum Einsammeln freizugeben — und genau das ist der Fehler,
   * den der Zutatensatz nebenan schon einmal hatte
   * (`kitchenProps.FoodKit`, „zwanzig Materialien").
   */
  private readonly spareBars: Bar[] = [];
  private readonly spareWarns: THREE.Object3D[] = [];
  private readonly spareFlames: Flame[] = [];

  /** Geteilte Formen und Farben — beide werden erst gebaut, wenn jemand sie will. */
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshBasicMaterial>();

  /** Die Uhr fürs Pulsen und Flackern — sie läuft nur, solange etwas zu sehen ist. */
  private clock = 0;

  constructor(parent: THREE.Object3D) {
    this.parent = parent;
  }

  /**
   * **Einen Balken an dieser Weltstelle zeigen.**
   *
   * Jedes Bild zu rufen ist der gedachte Fall: Der Aufruf sucht den Schlüssel,
   * schiebt den Balken an seinen Platz und staucht die Füllung — kein neues
   * Objekt, keine neue Zahl im Speicher.
   *
   * @param key  der Schlüssel der Station (sie vergibt ihn, sie kennt ihn)
   * @param at   **Mitte** des Balkens, in Weltmaß (`GAUGE_LIFT` über der Platte)
   * @param part Anteil 0…1; alles darüber und darunter wird geklemmt
   * @param tone welche Farbe — Braten, Verbrennen, Schneiden
   */
  bar(key: string, at: THREE.Vector3, part: number, tone: GaugeTone): void {
    let bar = this.bars.get(key);
    if (!bar) {
      bar = this.spareBars.pop() ?? this.buildBar();
      this.parent.add(bar.group);
      this.bars.set(key, bar);
    }
    if (bar.tone !== tone) {
      bar.tone = tone;
      bar.fill.material = this.skin(`fill:${tone}`, TONE_COLOR[tone], 1);
    }
    this.place(bar.group, at);
    // `NaN` käme aus einer Uhr, die noch nie gelaufen ist; ein Balken, dessen
    // Breite keine Zahl ist, verschwindet in three.js kommentarlos aus dem Bild
    // und man sucht ihn im Herd.
    const clamped = Number.isFinite(part) ? Math.min(1, Math.max(0, part)) : 0;
    bar.fill.scale.x = Math.max(clamped, 1e-4) * BAR_WIDTH;
    bar.fill.visible = clamped > 0.002;
  }

  /**
   * **Das Warndreieck zeigen** — oder mit `null` wieder wegnehmen.
   *
   * @param at **Mitte** des Dreiecks, in Weltmaß (`WARN_LIFT` über der Platte)
   */
  warn(key: string, at: THREE.Vector3 | null): void {
    if (!at) {
      const gone = this.warns.get(key);
      if (!gone) return;
      this.warns.delete(key);
      gone.removeFromParent();
      this.spareWarns.push(gone);
      return;
    }
    let sign = this.warns.get(key);
    if (!sign) {
      sign = this.spareWarns.pop() ?? this.buildWarn();
      this.parent.add(sign);
      this.warns.set(key, sign);
    }
    this.place(sign, at);
  }

  /**
   * **Flammen an einer Stelle** — klein unter der Pfanne (`cook`) oder groß
   * über dem brennenden Herd (`fire`). `null` nimmt sie weg.
   *
   * @param at **Fuß** der Flamme, in Weltmaß: die Herdplatte selbst. Anders als
   *   Balken und Dreieck steht sie **auf** etwas, statt darüber zu schweben —
   *   eine Flamme, die man mittig setzt, steckt zur Hälfte im Möbel.
   */
  flame(key: string, at: THREE.Vector3 | null, kind: FlameKind = 'cook'): void {
    const old = this.flames.get(key);
    if (!at || (old && old.kind !== kind)) {
      if (old) {
        this.flames.delete(key);
        old.group.removeFromParent();
        this.spareFlames.push(old);
      }
      if (!at) return;
    }
    let flame = this.flames.get(key);
    if (!flame) {
      const index = this.spareFlames.findIndex((spare) => spare.kind === kind);
      flame = index >= 0 ? this.spareFlames.splice(index, 1)[0]! : this.buildFlame(kind);
      this.parent.add(flame.group);
      this.flames.set(key, flame);
    }
    this.place(flame.group, at);
  }

  /** **Alles zu diesem Schlüssel weg** — Balken, Dreieck und Flammen auf einmal. */
  clear(key: string): void {
    const bar = this.bars.get(key);
    if (bar) {
      this.bars.delete(key);
      bar.group.removeFromParent();
      this.spareBars.push(bar);
    }
    this.warn(key, null);
    this.flame(key, null);
  }

  /**
   * **Ein Bild weiter**: Schilder drehen sich zur Kamera, das Dreieck pulst,
   * die Flammen flackern.
   *
   * Zu rufen ist das aus dem `update` der Zone, mit **der** Kamera, aus der
   * gerade gesehen wird (`WorldContext.camera`). Wer es vergisst, bekommt
   * stehende Schilder in der Richtung, in der sie zuletzt standen — keine
   * Ausnahme, nur falsch herum.
   *
   * Solange nichts zu sehen ist, kostet der Aufruf einen Vergleich und kehrt
   * um; auch die Uhr steht dann still.
   */
  update(dt: number, camera: THREE.Camera): void {
    if (this.bars.size === 0 && this.warns.size === 0 && this.flames.size === 0) return;
    this.clock += dt;

    // Die Kamera einmal in den Raum des Elternteils holen und nicht je Schild:
    // Die Drehung, die gleich gesetzt wird, gilt in genau diesem Raum.
    camera.getWorldPosition(_eye);
    this.parent.worldToLocal(_eye);

    for (const bar of this.bars.values()) face(bar.group, _eye);

    if (this.warns.size > 0) {
      const pulse = (Math.sin(this.clock * WARN_HZ * Math.PI * 2) + 1) / 2;
      // Ein Material für alle Dreiecke heißt: Sie pulsen im Gleichschritt. Das
      // ist kein Zugeständnis, sondern besser — zwei Herde, die verschieden
      // schnell blinken, sehen aus wie zwei verschiedene Meldungen.
      const alpha = 1 - WARN_FADE * (1 - pulse);
      const red = this.skins.get('warn:face');
      const ink = this.skins.get('warn:ink');
      if (red) red.opacity = alpha;
      if (ink) ink.opacity = alpha;
      const grow = 1 + WARN_GROW * pulse;
      for (const sign of this.warns.values()) {
        face(sign, _eye);
        sign.scale.setScalar(grow);
      }
    }

    for (const flame of this.flames.values()) {
      const shape = FLAME_SHAPE[flame.kind];
      for (let i = 0; i < flame.tongues.length; i++) {
        const tongue = flame.tongues[i]!;
        const phase = flame.phases[i]!;
        // Zwei Schwingungen übereinander, eine schnell und eine halb so
        // schnell: Eine allein sieht aus wie ein atmender Kegel, zwei sehen
        // aus wie Feuer. Was in die Höhe geht, geht in der Breite ab —
        // eine Flamme hat ein Volumen, sie wächst nicht einfach.
        const wobble =
          0.6 * Math.sin(this.clock * shape.hz * Math.PI * 2 + phase) +
          0.4 * Math.sin(this.clock * shape.hz * Math.PI + phase * 1.7);
        const wide = tongue.userData['wide'] as number;
        const high = tongue.userData['high'] as number;
        const thin = wide * (1 - 0.12 * wobble);
        tongue.scale.set(thin, high * (1 + 0.28 * wobble), thin);
      }
    }
  }

  /**
   * **Alles ab und alles weg** — beim Verlassen der Zone.
   *
   * Abgehängt wird, was hängt **und** was im Vorrat liegt; freigegeben werden
   * die geteilten Formen und Farben, jede genau einmal. Danach ist dieser Satz
   * leer und lässt sich wieder füllen — nötig ist das nicht, aber ein
   * `dispose`, nach dem ein zweiter Aufruf abstürzt, ist eine Falle.
   */
  dispose(): void {
    for (const bar of this.bars.values()) bar.group.removeFromParent();
    for (const sign of this.warns.values()) sign.removeFromParent();
    for (const flame of this.flames.values()) flame.group.removeFromParent();
    this.bars.clear();
    this.warns.clear();
    this.flames.clear();
    this.spareBars.length = 0;
    this.spareWarns.length = 0;
    this.spareFlames.length = 0;

    for (const shape of this.shapes.values()) shape.dispose();
    for (const skin of this.skins.values()) skin.dispose();
    this.shapes.clear();
    this.skins.clear();
    this.clock = 0;
  }

  // --- gebaut wird hier ------------------------------------------------------

  /** Der Balken: dunkler Grund, Füllung davor, am **linken** Rand verankert. */
  private buildBar(): Bar {
    const group = new THREE.Group();
    group.name = 'kitchen-gauge-bar';
    // Erst drehen, dann kippen (`face`): In der Reihenfolge `XYZ` kippte das
    // Schild um die **Welt**achse und stünde schief im Bild.
    group.rotation.order = 'YXZ';

    const track = new THREE.Mesh(
      this.shape('quad', () => new THREE.PlaneGeometry(1, 1)),
      this.skin('track', DARK, 0.85),
    );
    track.scale.set(BAR_WIDTH + 2 * BAR_EDGE, BAR_HEIGHT + 2 * BAR_EDGE, 1);
    quiet(track);

    const fill = new THREE.Mesh(
      // Ein Quad, dessen Ursprung auf seiner **linken Kante** liegt: Dann ist
      // der Anteil eine Zahl in `scale.x` und nicht zwei (Breite und
      // Verschiebung), die beim nächsten Umbau auseinanderlaufen.
      this.shape('quad-left', () => new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0)),
      this.skin('fill:cook', TONE_COLOR.cook, 1),
    );
    fill.position.set(-BAR_WIDTH / 2, 0, 0.003);
    fill.scale.set(BAR_WIDTH, BAR_HEIGHT, 1);
    quiet(fill);

    group.add(track, fill);
    return { group, fill, tone: 'cook' };
  }

  /** Das Warndreieck: dunkler Grund, rote Fläche, ein Ausrufezeichen darin. */
  private buildWarn(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-gauge-warn';
    group.rotation.order = 'YXZ';

    const quad = this.shape('quad', () => new THREE.PlaneGeometry(1, 1));
    const ink = this.skin('warn:ink', DARK, 1);
    const triangle = this.shape('triangle', makeTriangle);

    // Der dunkle Grund steht ringsum über und ist der Grund, aus dem das
    // Dreieck auch vor einer weißen Kachelwand ein Dreieck bleibt.
    const back = new THREE.Mesh(triangle, ink);
    back.scale.setScalar(WARN_SIZE * 1.16);
    quiet(back);

    const front = new THREE.Mesh(triangle, this.skin('warn:face', WARN_RED, 1));
    front.scale.setScalar(WARN_SIZE);
    front.position.z = 0.003;
    quiet(front);

    // Balken und Punkt im Maß des **ungestauchten** Dreiecks (Seite 1), damit
    // eine andere Größe nichts verschiebt.
    const stem = new THREE.Mesh(quad, ink);
    stem.scale.set(0.1, 0.3, 1);
    stem.position.set(0, 0.11, 0.006);
    quiet(stem);

    const dot = new THREE.Mesh(quad, ink);
    dot.scale.set(0.1, 0.1, 1);
    dot.position.set(0, -0.12, 0.006);
    quiet(dot);

    front.add(stem, dot);
    group.add(back, front);
    return group;
  }

  /** Die Flamme: eine hohe Zunge in der Mitte, kleinere im Kranz darum. */
  private buildFlame(kind: FlameKind): Flame {
    const shape = FLAME_SHAPE[kind];
    const colors = FLAME_COLOR[kind];
    const group = new THREE.Group();
    group.name = `kitchen-gauge-flame:${kind}`;

    // Ein Kegel mit dem Fuß auf y = 0 und ohne Boden: Er steht auf der Platte,
    // und einen Deckel, den nie jemand sieht, zeichnet man auch nicht.
    const cone = this.shape('flame', () =>
      new THREE.ConeGeometry(0.5, 1, 7, 1, true).translate(0, 0.5, 0),
    );

    const tongues: THREE.Mesh[] = [];
    const phases: number[] = [];
    for (let i = 0; i < shape.tongues; i++) {
      // Die erste Zunge ist der **Kern**: mittig, höher und heller. Die
      // anderen stehen im Kranz darum und sind kleiner — eine Flamme aus
      // gleich großen Kegeln sieht aus wie ein Zaun.
      const core = i === 0;
      const tongue = new THREE.Mesh(
        cone,
        this.skin(
          `flame:${kind}:${core ? 'core' : 'edge'}`,
          core ? colors.core : colors.edge,
          0.85,
          true,
        ),
      );
      // Der Kegel ist einen Meter hoch und einen breit (Halbmesser 0,5); Höhe
      // und Breite kommen deshalb getrennt aus der Form. Beide bleiben am Netz
      // stehen, weil das Flackern gleich darauf aufsetzt.
      const high = core ? shape.height : shape.height * 0.62;
      const wide = core ? shape.width : shape.width * 0.7;
      tongue.scale.set(wide, high, wide);
      tongue.userData['wide'] = wide;
      tongue.userData['high'] = high;
      if (!core) {
        const around = ((i - 1) / Math.max(1, shape.tongues - 1)) * Math.PI * 2;
        tongue.position.set(Math.cos(around) * shape.spread, 0, Math.sin(around) * shape.spread);
      }
      quiet(tongue);
      tongues.push(tongue);
      phases.push(i * 1.7);
      group.add(tongue);
    }
    return { group, tongues, phases, kind };
  }

  // --- geteilte Formen und Farben -------------------------------------------

  private shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    return shape;
  }

  /**
   * Eine Farbe, geteilt. **Immer `MeshBasicMaterial`**, und das ist Absicht:
   * Eine Anzeige soll in jedem Licht gleich aussehen — und der Comic-Durchlauf
   * lässt unbeleuchtete Materialien in Ruhe (`core/graphicsScene.ts`), also
   * bekommt kein Balken einen schwarzen Saum um sich.
   */
  private skin(key: string, color: number, opacity: number, glow = false): THREE.MeshBasicMaterial {
    let skin = this.skins.get(key);
    if (!skin) {
      skin = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        toneMapped: false,
        depthWrite: false,
        // Von beiden Seiten: Wer von hinten an einen Herd tritt, soll nicht vor
        // einem unsichtbaren Balken stehen.
        side: THREE.DoubleSide,
        ...(glow ? { blending: THREE.AdditiveBlending } : {}),
      });
      this.skins.set(key, skin);
    }
    return skin;
  }

  /** Die Weltstelle in den Raum des Elternteils und dorthin damit. */
  private place(object: THREE.Object3D, at: THREE.Vector3): void {
    _at.copy(at);
    this.parent.worldToLocal(_at);
    object.position.copy(_at);
  }
}

/**
 * **Ein Schild sieht die Kamera an** — Gieren voll, Nicken mindestens
 * `GAUGE_LEAN_MIN` (siehe dort, warum).
 *
 * Gerechnet wird im Raum des Elternteils: `eye` ist die Kamera darin, und die
 * gesetzte Drehung gilt genau dort. Die Ordnung `YXZ` steht am Objekt und
 * nicht hier — sie gehört zu ihm und nicht zu einem Aufruf.
 */
function face(object: THREE.Object3D, eye: THREE.Vector3): void {
  const dx = eye.x - object.position.x;
  const dy = eye.y - object.position.y;
  const dz = eye.z - object.position.z;
  const flat = Math.hypot(dx, dz);
  // Steht die Kamera **senkrecht** darüber, gibt es kein Gieren mehr; dann
  // bleibt das Schild stehen, wie es stand, und legt sich nur flach.
  const lean = flat > 1e-4 ? Math.atan2(dy, flat) : Math.PI / 2;
  const yaw = flat > 1e-4 ? Math.atan2(dx, dz) : object.rotation.y;
  object.rotation.set(-Math.max(lean, GAUGE_LEAN_MIN), yaw, 0);
}

/**
 * **Ein gleichseitiges Dreieck mit der Seitenlänge 1**, Spitze oben, Schwerpunkt
 * im Ursprung — damit `scale` die Seitenlänge ist und sonst nichts.
 *
 * Von Hand und nicht als `ShapeGeometry`: Drei Punkte sind drei Punkte, und
 * der Triangulierer dafür zieht `ShapeUtils` in ein Bündel, das ihn sonst
 * nirgends braucht.
 */
function makeTriangle(): THREE.BufferGeometry {
  const height = Math.sqrt(3) / 2;
  const top = (height * 2) / 3;
  const bottom = -height / 3;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, top, 0, -0.5, bottom, 0, 0.5, bottom, 0], 3),
  );
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2));
  return geometry;
}

/**
 * **Eine Anzeige ist kein Ding der Welt**: Sie wirft keinen Schatten, fängt
 * keinen Strahl (`core/usable.ts` zielt auf Möbel, nicht auf Balken) und wird
 * **nach** allem anderen gezeichnet, damit sie vor der Kachelwand steht und
 * nicht darin.
 */
function quiet(mesh: THREE.Mesh): void {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 6;
  mesh.raycast = () => {};
}

/** Einer für alle: Wer je Bild einen Vektor baut, baut je Bild einen Vektor. */
const _at = new THREE.Vector3();
const _eye = new THREE.Vector3();
