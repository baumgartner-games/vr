import * as THREE from 'three';
import { DEFAULT_APPEARANCE, type Appearance } from '../../core/appearance';
import {
  BODY_KINDS,
  BODY_LABELS,
  HEAD_KINDS,
  HEAD_LABELS,
  HEAD_RADIUS,
  HEAD_SUBS,
  bodyJacket,
  bodyTrim,
  buildBody,
  buildHead,
  type BodyKind,
  type HeadKind,
} from '../../core/avatarLook';
import { cloth, trim } from '../../core/chefStyle';
import {
  HEADGEAR_KINDS,
  HEADGEAR_LABELS,
  HEADGEAR_SUBS,
  buildHeadgear,
  type HeadgearKind,
} from '../../core/headgear';

/**
 * **Das Regal im Konstrukt** — die Umkleide, wenn sie kein Menü mehr ist.
 *
 * Bis hierher war Umziehen eine Liste mit Pfeilen: drei Zeilen, ‹ und ›, und
 * daneben ein Spiegel (`ui/wardrobeRows.ts`). Das funktioniert, aber es ist
 * eine Tabelle über etwas, das man anfassen können sollte — und in einer
 * Brille ist eine Tabelle das Letzte, was man bauen will. Wer den
 * Kleiderschrank benutzt, steht deshalb gleich **in** seinem Kleiderschrank:
 * Die Sachen stehen im Ring um einen herum auf den Kacheln, und wer eines
 * **benutzt**, trägt es.
 *
 * Diese Datei liefert nur die Stücke und die Auskunft, was Anziehen heißt.
 * Wohin sie kommen, wie weit der Strahl reicht und wer den Raum wieder
 * zumacht, entscheidet `worlds/shared/construct.ts` — dieselbe Trennung wie
 * zwischen `ui/wardrobeRows.ts` (was eine Zeile schaltet) und dem Menü, das
 * daraus Knöpfe macht. Was hier steht, lässt sich in Millisekunden nachmessen:
 * Jedes Stück ist ein Kasten mit bekanntem Ursprung und bekannter Größe.
 *
 * **Die Reihenfolge ist abgeschrieben und nicht neu erfunden.** Gesicht, Hut,
 * Oberteil — genau wie `wardrobeRows` seine drei Zeilen baut. Zwei Umkleiden,
 * die dieselben Sachen in verschiedener Reihenfolge zeigen, driften nach der
 * zweiten neuen Mütze auseinander, und dann sucht man im Regal an der Stelle,
 * an der im Menü etwas anderes stand.
 */

/**
 * **Wie groß ein Stück auf seiner Kachel höchstens wird**, in Metern — und wie
 * klein es mindestens bleibt.
 *
 * Handgroß ist die ganze Aussage. Darunter wird aus einer Mütze ein Knopf, den
 * man weder erkennt noch mit dem Strahl trifft; darüber steht kein Gegenstand
 * mehr auf einer Kachel, sondern ein abgetrenntes Stück Avatar in Lebensgröße —
 * und ein schwebender Kopf in Originalmaß ist in einer Brille keine Auswahl,
 * sondern ein Schreck.
 *
 * `construct.ts` stellt jedes Stück allein auf eine Kachel von einem Meter
 * (`TILE_SIZE`): Solange kein Stück über `RACK_PIECE_MAX` hinausgeht, bleibt zu
 * jeder Seite eine halbe Kachel Luft, und keines stößt ans nächste.
 */
export const RACK_PIECE_MIN = 0.3;
export const RACK_PIECE_MAX = 0.45;

/**
 * **Die drei Verkleinerungen** — je eine Zahl für Gesicht, Hut und Oberteil.
 *
 * `buildHead` und `buildHeadgear` rechnen in Kopfhalbmessern (32 cm,
 * `core/avatarLook.HEAD_RADIUS`), `buildBody` in Metern über der Rumpfkurve —
 * alle drei bauen **lebensgroß**. Auf der Kachel muss davon ein Gegenstand
 * werden, und zwar ohne dass die Teile ihre Verhältnisse verlieren: Ein
 * Zylinder ist höher als eine Krone, ein Bauhelm breiter als eine Mütze, und
 * genau daran erkennt man sie auch verkleinert wieder. Deshalb **eine** Zahl
 * je Fach und keine Normierung Stück für Stück auf dieselbe Kantenlänge.
 *
 * Die Zahlen sind aus der größten Ausführung jedes Fachs zurückgerechnet, mit
 * `RACK_PIECE_MAX` als Deckel:
 *
 * - **Kopf, 0,55.** Der längste ist der Vollbart: 74 cm von der Bartspitze bis
 *   zum Schopf. Verkleinert sind das 41 cm. Nach unten kann kein Kopf
 *   durchfallen, weil alle vier dieselbe Nase haben und quer durch sie 73 cm
 *   tief sind — 40 cm auf der Kachel.
 * - **Hut, 0,44.** Das Basecap ist mit seinem Schirm 96 cm tief und damit das
 *   ausladendste Stück überhaupt; verkleinert 42 cm. Die Krone als kleinstes
 *   bleibt mit 32 cm noch über `RACK_PIECE_MIN`.
 * - **Oberteil, 0,5.** Der Rumpf ist an seinem Saumwulst 76 cm breit, also 38
 *   cm auf der Kachel — und das ist die **Breite**, nicht die Höhe: Ein
 *   Oberteil im Regal ist breiter als hoch, und das ist genau richtig so.
 */
const HEAD_SCALE = 0.55;
const HAT_SCALE = 0.44;
const BODY_SCALE = 0.5;

/**
 * **Auf wie viel Rumpfhöhe der Torso gestaucht wird**, bevor er verkleinert
 * wird (`BodyShape.setHeight`).
 *
 * Ein Rumpf in voller Höhe ist eine kopflose Figur, und eine kopflose Figur
 * auf einer Kachel sieht nach Unfall aus. Gestaucht auf knapp zwei Drittel wird
 * daraus eine **Büste**: unten der dunkle Sockel der Hose, darüber die Jacke
 * mit Blende und Halstuch, breiter als hoch. Das ist die Form, in der
 * Kleidergeschäfte Oberteile hinstellen, und sie liest sich in der Brille
 * sofort als „Kleidungsstück" und nicht als „halber Mensch".
 */
const BODY_STAND = 0.62;

/**
 * Pfosten und Knauf des leeren Hutständers, in Kopfhalbmessern wie alles in
 * `core/headgear.ts` — er geht durch dieselbe Verkleinerung wie die Hüte.
 */
const STAND_HEIGHT = HEAD_RADIUS * 1.56;
const STAND_KNOB = HEAD_RADIUS * 0.62;

/** Halbmesser und Höhe des Fußes, auf dem jedes Stück steht. */
const FOOT_RADIUS = 0.105;
const FOOT_HEIGHT = 0.014;

/** Und der Reif, der um den Fuß des Getragenen liegt. */
const WORN_RADIUS = 0.12;
const WORN_TUBE = 0.014;

/** Ein Stück auf dem Regal — Netz, Name, und was Anziehen heißt. */
export interface RackPiece {
  /** Welches Fach: Gesicht, Hut oder Oberteil. */
  readonly slot: keyof Appearance;
  /** Der Wert, den `saveAppearance` bekommt, wenn man es nimmt. */
  readonly value: string;
  readonly label: string;
  /** Die Zeile darunter — `HEADGEAR_SUBS`, `HEAD_SUBS`, sonst leer. */
  readonly sub: string;
  /** Ob es das ist, was die Figur gerade trägt. */
  readonly worn: boolean;
  /**
   * **Das Netz — auf Abruf**, und beim zweiten Abruf dasselbe.
   *
   * Eine Methode und kein Feld, und das ist der Unterschied zwischen einem
   * Regal, das man betritt, und einem, auf das man wartet: Ein Stück zu bauen
   * kostet ein paar Millisekunden (ein Kopf mit Nase und Bart ist kein
   * Würfel), siebzehn davon kosten den Bruchteil einer Sekunde — und der
   * fällt genau in den Augenblick, in dem jemand `A` gedrückt hat und etwas
   * passieren soll. Der Konstrukt-Raum ruft die Stücke deshalb einzeln ab,
   * während sie nacheinander aus dem Boden fahren
   * (`shared/construct.ConstructRoom.paint`): Dann kostet jedes Bild eines
   * statt eines Bildes siebzehn.
   */
  object(): THREE.Object3D;
}

/**
 * **Der Bausatz für das Regal** — geteilte Füße, geteilte Farben, ein
 * `dispose`.
 *
 * Einer je Konstrukt-Raum, wie der Zutatensatz und die Bänder einer Küche
 * (`worlds/test/zones/kitchenBelt.BeltKit`). Siebzehn Stücke teilen sich damit
 * vier Formen und eine Handvoll Farben, statt siebzehnmal dasselbe Scheibchen
 * zu drechseln.
 *
 * **Was `buildHead`, `buildHeadgear` und `buildBody` liefern, ist nicht
 * unseres.** Die drei bauen je Aufruf frische Netze, Geometrien und
 * Materialien — so sind sie geschrieben, und daran ändert ein Zwischenspeicher
 * hier nichts, außer dass zwei Stücke dieselbe Nase teilen und das nächste
 * `dispose` in `core/AvatarBody.ts` eine Geometrie freigäbe, die noch im Regal
 * hängt. Zwischengespeichert wird deshalb nur, was **diese Klasse selbst**
 * macht: Fuß, Reif, Ständer und deren Farben.
 *
 * **Die Grenze bei `dispose`** läuft an derselben Stelle: Es räumt die Karten
 * dieser Klasse leer und sonst nichts. Wer `pieces()` gerufen hat, wirft die
 * Gruppen einfach weg — der Konstrukt-Raum macht zu, und mit ihm geht alles,
 * was in ihm hing. Zweimal zu rufen ist kein Fehler; danach ist der Bausatz
 * leer und füllt sich beim nächsten `pieces()` von selbst wieder (dieselbe
 * Zusage wie bei `BeltKit`).
 */
export class WardrobeRack {
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshStandardMaterial>();
  /**
   * **Die gebauten Stücke**, unter `Fach:Wert` — gebaut beim ersten Abruf und
   * danach dieselben.
   *
   * Vorher baute **jeder** Aufruf von `pieces` alle siebzehn neu, und die
   * Begründung dafür war der Reif: Ein Regal, das sich einmal baut und dann
   * nur noch nachgefärbt wird, sei eine Sonderbehandlung für `worn`. Das war
   * schon damals nicht der Fall — der Aufrufer ließ den Reif längst wandern,
   * statt das Regal abzureißen (`GridWorld.wearable`) —, und es kostete
   * zweierlei: eine spürbare Pause bei jedem Öffnen, und siebzehn frische
   * Geometrien samt Materialien je Öffnen, die niemand wieder freigab
   * (`buildHead` und die beiden anderen bauen alles neu, siehe oben). Jetzt
   * gibt es jedes Stück genau einmal, und das Anziehen geht über `wear`.
   */
  private readonly made = new Map<string, THREE.Object3D>();
  /** Was die Figur zuletzt anhatte — daran hängt der Reif, auch bei Nachzüglern. */
  private look: Appearance | null = null;

  /**
   * **Alle Stücke, in der Reihenfolge Gesicht, Hut, Oberteil.**
   *
   * Was hier herauskommt, ist die **Auskunft** über das Regal und noch kein
   * Regal: Namen, Fächer und die Frage, ob man es anhat. Die Netze kommen
   * einzeln dazu, wenn sie gebraucht werden (`RackPiece.object`).
   *
   * `look` kommt herein und wird nicht aus `appearance()` geholt: Der Raum
   * zeichnet sich nach jeder Änderung neu und soll dann das Aussehen zeigen,
   * das er gerade bekommen hat (derselbe Gedanke wie in `wardrobeRows`).
   */
  pieces(look: Appearance): RackPiece[] {
    this.wear(look);
    return [
      ...HEAD_KINDS.map((kind) =>
        this.entry('head', kind, HEAD_LABELS[kind], HEAD_SUBS[kind], () => this.headPiece(kind)),
      ),
      ...HEADGEAR_KINDS.map((kind) =>
        this.entry('hat', kind, HEADGEAR_LABELS[kind], HEADGEAR_SUBS[kind], () =>
          this.hatPiece(kind),
        ),
      ),
      ...BODY_KINDS.map((kind) =>
        // Leer, und nicht `BODY_SUBS`: Dessen Zeilen beschreiben die Farbe
        // („Rot, mit heller Knopfleiste"), und die Farbe steht hier als Jacke
        // auf der Kachel. Eine Bildunterschrift, die das Bild vorliest, ist im
        // Menü eine Hilfe und vor dem Regal Text, den niemand liest.
        this.entry('body', kind, BODY_LABELS[kind], '', () => this.bodyPiece(kind)),
      ),
    ];
  }

  /**
   * **Anziehen** — der Reif wandert, das Regal bleibt stehen.
   *
   * Gemerkt wird das Aussehen und nicht nur der Reif: Ein Stück, das erst
   * später aus dem Boden kommt, muss beim Bauen schon wissen, ob es das
   * getragene ist. Sonst hätte ausgerechnet der zuletzt aufgefahrene Hut
   * keinen Reif, obwohl man ihn anhat.
   */
  wear(look: Appearance): void {
    this.look = look;
    for (const [key, object] of this.made) {
      const ring = object.getObjectByName('rack-worn');
      if (!ring) continue;
      const cut = key.indexOf(':');
      const slot = key.slice(0, cut) as keyof Appearance;
      ring.visible = look[slot] === key.slice(cut + 1);
    }
  }

  /** **Alles weg** — einmal je Raum, nicht je Stück. */
  dispose(): void {
    for (const shape of this.shapes.values()) shape.dispose();
    for (const skin of this.skins.values()) skin.dispose();
    this.shapes.clear();
    this.skins.clear();
    // Die Stücke hängen im Konstrukt-Raum, wenn der beim Weltwechsel noch
    // offen stand; er hängt sie zwar selbst wieder aus, aber die Reihenfolge
    // der beiden `dispose` ist nicht unsere Sache (`GridWorld.dispose`).
    for (const object of this.made.values()) object.removeFromParent();
    this.made.clear();
    this.look = null;
  }

  /**
   * **Ein Eintrag im Regal** — die Auskunft sofort, das Netz auf Abruf.
   *
   * Der Abruf legt das Gebaute unter `Fach:Wert` ab; zweimal gefragt kommt
   * zweimal dasselbe zurück, und das muss es auch: Der Reif hängt am Netz, und
   * zwei Netze für denselben Hut hätten zwei Meinungen darüber, ob man ihn
   * anhat.
   */
  private entry(
    slot: keyof Appearance,
    value: string,
    label: string,
    sub: string,
    build: () => THREE.Object3D,
  ): RackPiece {
    const key = `${slot}:${value}`;
    return {
      slot,
      value,
      label,
      sub,
      worn: this.look?.[slot] === value,
      object: () => {
        const made = this.made.get(key);
        if (made) return made;
        const fresh = build();
        this.made.set(key, fresh);
        return fresh;
      },
    };
  }

  // --- die drei Fächer ---------------------------------------------------------

  /**
   * **Ein Gesicht auf der Kachel.** Der gebaute Kopf steht um seinen
   * Mittelpunkt, also gut halb unter der Tischkante — `stand` schiebt ihn
   * hoch, statt hier eine Zahl je Kopfsorte zu raten.
   */
  private headPiece(kind: HeadKind): THREE.Object3D {
    return this.stand(
      buildHead(kind),
      HEAD_SCALE,
      `rack-head-${kind}`,
      this.look?.head === kind,
      this.footSkin(),
    );
  }

  /**
   * **Ein Hut auf der Kachel** — und für `none` der leere Ständer darunter.
   *
   * Der Hut bekommt die Jackenfarbe des Spielers mit (`buildHeadgear`, `tint`),
   * denn Basecap und Helm richten sich danach. Ein Regal, das blaue Helme
   * zeigt und rote aufsetzt, wäre eine Anprobe, der man nicht trauen kann.
   */
  private hatPiece(kind: HeadgearKind): THREE.Object3D {
    const look = this.look ?? DEFAULT_APPEARANCE;
    // **`buildHeadgear('none')` gibt `null`, und ein Loch im Regal ist keine
    // Wahl.** Im Menü war „Ohne" eine Zeile wie jede andere; hier wäre es eine
    // leere Kachel — und die sieht nicht aus wie eine Möglichkeit,
    // sondern wie eine Lücke, in der etwas fehlt. Wer barhäuptig herumlaufen
    // will, muss auch **etwas benutzen** können, um den Hut wieder abzusetzen;
    // sonst ist die einzige Option, die man nicht sieht, ausgerechnet die
    // Auslieferung (`appearance.DEFAULT_APPEARANCE`). Also steht dort ein
    // leerer Hutständer: ein Pfosten mit einem Knauf, wie im Flur — sichtbar
    // leer, und genau das ist die Aussage.
    const hat = buildHeadgear(kind, bodyJacket(look.body)) ?? this.emptyStand();
    return this.stand(hat, HAT_SCALE, `rack-hat-${kind}`, look.hat === kind, this.footSkin());
  }

  /**
   * **Eine Jacke auf der Kachel**, als Büste.
   *
   * `buildBody` will ein Material für die Farbe der Rolle — Halstuch und
   * Schürzenband tragen es. Hier ist die Rolle die Jacke selbst, also bekommt
   * es `bodyTrim`: dieselbe Farbe, die auch Knöpfe und Ringe absetzt, und
   * damit ein Kragen, der sich vom Stoff darunter unterscheidet. Ein Halstuch
   * in Jackenfarbe verschwände in der Jacke, und die weiße Ausführung hätte
   * dann eine weiße Fläche ohne jede Kante.
   *
   * Der **Fuß** trägt dazu `bodyJacket`: ein Farbfleck, der auch von hinten
   * sagt, welche der fünf hier steht. Von vorn machen das Blende und Kragen,
   * von hinten sind vier von fünf Jacken derselbe gewölbte Rücken.
   */
  private bodyPiece(kind: BodyKind): THREE.Object3D {
    const shape = buildBody(
      kind,
      this.skin(`suit:${kind}`, () => cloth(bodyTrim(kind))),
    );
    shape.setHeight(BODY_STAND);
    return this.stand(
      shape.group,
      BODY_SCALE,
      `rack-body-${kind}`,
      this.look?.body === kind,
      this.skin(`foot:${kind}`, () => cloth(bodyJacket(kind))),
    );
  }

  // --- Fuß, Reif, Ständer ------------------------------------------------------

  /**
   * **Ein Stück auf seinen Fuß stellen** — und das ist die ganze Zusage dieser
   * Datei: Danach liegt der **Ursprung unten in der Mitte**, und der
   * Konstrukt-Raum muss von keinem einzigen Stück wissen, wie es gebaut ist.
   *
   * Gemessen wird und nicht gerechnet. Ein Kopf steht um seinen Mittelpunkt,
   * ein Hut um den Mittelpunkt des Kopfes, den er gar nicht dabei hat, und ein
   * Rumpf auf seiner eigenen Null — drei verschiedene Nullpunkte, und bei
   * siebzehn Stücken wären das siebzehn Verschiebungen, die beim nächsten
   * Schnauzer wieder danebenliegen. Ein `Box3` über das fertig verkleinerte
   * Teil kostet einmal je Stück und stimmt immer.
   *
   * Verschoben wird das Teil **in** seiner Gruppe, nicht die Gruppe: Die
   * Gruppe ist das, was `construct.ts` auf die Kachelmitte stellt, und die soll
   * bei (0, 0, 0) anfangen.
   */
  private stand(
    part: THREE.Object3D,
    scale: number,
    name: string,
    worn: boolean,
    footSkin: THREE.Material,
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = name;

    part.scale.multiplyScalar(scale);
    const box = new THREE.Box3().setFromObject(part);
    part.position.x -= (box.min.x + box.max.x) / 2;
    part.position.z -= (box.min.z + box.max.z) / 2;
    // Aufgesetzt, nicht eingelassen: Das Teil fängt oben auf dem Fuß an.
    part.position.y += FOOT_HEIGHT - box.min.y;
    group.add(part);

    const foot = new THREE.Mesh(
      this.shape(
        'foot',
        // Unten eine Spur breiter als oben — eine gedrechselte Scheibe, kein
        // ausgestanztes Plättchen. Zwanzig Segmente, weil der Fuß in der
        // Brille nie größer als eine Handfläche ist.
        () => new THREE.CylinderGeometry(FOOT_RADIUS, FOOT_RADIUS * 1.06, FOOT_HEIGHT, 20),
      ),
      footSkin,
    );
    foot.name = 'rack-foot';
    foot.position.y = FOOT_HEIGHT / 2;
    group.add(foot);

    // **Jedes Stück bekommt seinen Reif, sichtbar ist nur einer.** Anziehen
    // lässt der Aufrufer den Reif wandern, ohne das Regal neu zu bauen
    // (`GridWorld.wearable` schaltet `rack-worn` um) — und schalten kann er
    // nur, was da ist. Ein Reif, den es erst beim nächsten Neubau gäbe, wäre
    // nach dem ersten Kleiderwechsel bei **keinem** Stück mehr zu sehen: Der
    // alte ginge aus, ein neuer entstünde nie.
    const ring = this.wornRing();
    ring.visible = worn;
    group.add(ring);
    return group;
  }

  /**
   * **Der Reif unter dem, was man anhat.**
   *
   * `RackPiece.worn` sagt es dem Aufrufer, aber ein Regal, in dem man erst
   * etwas anvisieren muss, um zu erfahren, ob man es schon trägt, ist wieder
   * ein Menü. Ein flacher, warmer Ring um den Fuß sagt es auf einen Blick und
   * aus jeder Richtung — Text kann das nicht, der steht immer nur auf einer
   * Seite.
   *
   * Warm und **selbstleuchtend**: Das Konstrukt ist ein dunkler Raum, und eine
   * Farbe, die nur unter Licht warm ist, ist dort grau. Der Ring liegt flach
   * am Boden auf (Mitte auf Schlauchhöhe), damit er den Ursprung des Stückes
   * nicht nach unten zieht.
   */
  private wornRing(): THREE.Mesh {
    const ring = new THREE.Mesh(
      this.shape('worn', () => new THREE.TorusGeometry(WORN_RADIUS, WORN_TUBE, 8, 28)),
      this.skin(
        'worn',
        () =>
          new THREE.MeshStandardMaterial({
            color: 0xf6b04a,
            emissive: 0x6a3f0a,
            roughness: 0.45,
            metalness: 0.1,
          }),
      ),
    );
    ring.name = 'rack-worn';
    ring.rotation.x = Math.PI / 2;
    ring.position.y = WORN_TUBE;
    // Der Reif ist Auskunft und kein Gegenstand: Er darf den Strahl nicht vor
    // dem Stück abfangen, das über ihm steht (`core/usable.ts`).
    ring.raycast = () => {};
    return ring;
  }

  /**
   * **Der leere Hutständer** für `none` — Pfosten, Knauf, sonst nichts.
   *
   * Schmal und hoch: Ein Ständer, der so breit wäre wie ein Zylinder, sähe aus
   * wie ein Hut, den man nur nicht erkennt. So ist er das einzige Stück im
   * Hutfach, das man schon am Umriss nicht für eine Kopfbedeckung hält — und
   * genau das soll „Ohne“ heißen.
   */
  private emptyStand(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'rack-hat-stand';
    const wood = this.skin('stand', () => trim(0x6f6152, 0.75));
    const post = new THREE.Mesh(
      this.shape(
        'post',
        () => new THREE.CylinderGeometry(HEAD_RADIUS * 0.19, HEAD_RADIUS * 0.24, STAND_HEIGHT, 14),
      ),
      wood,
    );
    post.position.y = STAND_HEIGHT / 2;
    const knob = new THREE.Mesh(
      this.shape('knob', () => new THREE.SphereGeometry(STAND_KNOB, 16, 12)),
      wood,
    );
    // Der Knauf sitzt auf dem Pfosten und steckt zur Hälfte in ihm — eine
    // Kugel oben auf einem Stab wäre ein Lutscher. Gestaucht ist er, weil ein
    // Hutständer den Schädel andeutet und keinen Ball.
    knob.position.y = STAND_HEIGHT + STAND_KNOB * 0.5;
    knob.scale.set(1, 0.78, 1);
    group.add(post, knob);
    return group;
  }

  // --- geteilte Formen und Farben ------------------------------------------------

  /** Die Farbe der Füße, die keine eigene haben: dunkles, mattes Holz. */
  private footSkin(): THREE.MeshStandardMaterial {
    return this.skin('foot', () => trim(0x32302b, 0.85));
  }

  private shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    return shape;
  }

  private skin(key: string, make: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
    let skin = this.skins.get(key);
    if (!skin) {
      skin = make();
      this.skins.set(key, skin);
    }
    return skin;
  }
}
