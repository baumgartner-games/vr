import * as THREE from 'three';
import { canLoadModels } from '../../core/chefFit';
import { FIGURE_FADE, gaitFor, type FigureGait } from '../../core/kaykitFigureFit';
import { disposeTree } from '../shared/environment';
import { figureGaitClip, figureStrikeClip } from './npcFigure';
import { pickClip } from '../../core/kaykitFigureFit';

/** Was ein NPC am Platz tut — dieselben zwei wie `npcBehavior.BehaviorPose`. */
export type NpcPose = 'sit' | 'interact';

/**
 * **Welche Spur eine Haltung ist**, der Reihe nach gefragt. Sitzen gibt es in
 * der Simulations-Bibliothek zweimal — auf dem Stuhl und auf dem Boden —, und
 * ohne beide bleibt die Figur wenigstens ruhig stehen.
 */
export const POSE_CLIPS: Readonly<Record<NpcPose, readonly string[]>> = {
  sit: ['Sit_Chair_Idle', 'Sit_Floor_Idle', 'Idle_B', 'Idle_A'],
  interact: ['Interact', 'Use_Item', 'Idle_B', 'Idle_A'],
};
import { npcSkin, type NpcKind, type NpcSkin } from './npcKinds';
import { bodyShape, hitParts } from './npcHit';
import type { KaykitFigure } from '../../core/kaykitFigure';

/**
 * **Das Modell eines NPC** — die Haut aus `npcKinds.ts`, gebaut.
 *
 * Ein Körper aus Klötzen und zwei Kugeln, und der steht **sofort**: keine
 * Datei, keine Leitung, kein WebGL. Die Gelenke sind vier — zwei Hüften, zwei
 * Schultern, jedes eine eigene Gruppe, deren X-Drehung der Schritt ist.
 *
 * **Und darüber kommt, wenn die Haut eine nennt, eine Figur aus dem Regal**
 * (`NpcSkin.figure`, `core/kaykitFigure.ts`). Sie kommt eine halbe Sekunde
 * später als der Körper, hängt in **derselben** Gruppe — Ursprung zwischen den
 * Füßen, vorn ist −Z, beides deckt sich — und blendet die Klötze aus, statt
 * sie wegzuwerfen: An ihnen hängen die Tests, die Maße und alles, was ohne
 * Datei weiterlaufen muss. Der Klötzchen-Körper ist damit kein Provisorium
 * mehr, sondern der **Ersatz**, und beide Wege sind gültige Ausgänge.
 *
 * **Der Ursprung liegt zwischen den Füßen.** Alles, was mit einem NPC
 * rechnet — der Collider, die Trefferzonen (`npcHit.ts`), der Punkt, an dem
 * er gesetzt wird —, rechnet von der Standfläche aus. Ein Modell, dessen
 * Ursprung in der Mitte steckt, versinkt bei jeder dieser Rechnungen zur
 * Hälfte im Boden.
 *
 * **In den Händen sitzt je ein leerer Anker** (`hands`). Er trägt heute
 * nichts; er ist die Stelle, an der später ein Werkzeug hängt — ein NPC mit
 * einer Schusswaffe ist genau das: dieselbe `Tool`-Instanz wie in einer
 * Spielerhand, nur an diesem Anker statt am Griffraum eines Controllers. Dass
 * der Anker schon jetzt da ist und richtig mitschwingt, ist der Unterschied
 * zwischen „später einhängen" und „später umbauen".
 */
export class NpcBody extends THREE.Group {
  readonly skin: NpcSkin;

  /**
   * **Der gebaute Körper, alles in einer Gruppe.**
   *
   * Sie ist erst mit der Figur entstanden, und zwar für genau zwei Handgriffe:
   * Ausblenden (`wearFigure`) und **Umfallen** (`setFallen`). Beides betrifft
   * die Klötze und nicht den NPC — eine Figur mit einem Skelett fällt um,
   * indem sie umfällt (`act('death')`), und nicht, indem jemand sie um die
   * Querachse kippt. Lebensbalken, Sichtkegel und Trefferzonen hängen
   * weiterhin darüber, denn sie sind Anzeigen und kein Körperteil.
   */
  private readonly blocks = new THREE.Group();

  /** Die vier Gelenke, deren X-Drehung den Gang macht. */
  private readonly legLeft = new THREE.Group();
  private readonly legRight = new THREE.Group();
  private readonly armLeft = new THREE.Group();
  private readonly armRight = new THREE.Group();
  /** Der Rumpf samt allem darüber — er wiegt beim Gehen mit. */
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();

  /**
   * Wo ein Werkzeug hinkäme, je Hand. Leer, bis jemand eines hineinhängt —
   * siehe der Klassenkommentar.
   */
  readonly hands: { left: THREE.Object3D; right: THREE.Object3D };

  /** Die Augen — sie leuchten, sobald das Hirn den Spieler bemerkt hat. */
  private readonly eyes: THREE.MeshStandardMaterial;

  /**
   * Der **Schädel**, offen daliegend: `npcBody.test.ts` misst an ihm nach, dass
   * die Trefferzone aus `npcHit.ts` wirklich dort liegt, wo der Kopf zu sehen
   * ist. Zwei Rechnungen, die dasselbe meinen, prüft man aneinander.
   */
  readonly skull: THREE.Mesh<THREE.SphereGeometry, THREE.Material>;

  /**
   * **Der Lebensbalken über dem Kopf** — zwei Sprites, kein Text.
   *
   * Ein Sprite steht in three.js immer quer zur Kamera, ohne dass jemand es
   * jedes Bild dorthin drehen müsste. Genau das braucht ein Balken: Man sieht
   * ihn von vorn, von der Seite und von oben — und von oben ist die Ansicht,
   * in der man das Labor testet.
   *
   * Zwei und nicht eine Textur: Die Füllung wird in der Breite gestaucht, und
   * damit sie dabei **links stehen bleibt** statt in der Mitte zu schrumpfen,
   * sitzt ihr Bezugspunkt am linken Rand (`center`). Eine Textur pro NPC wäre
   * bei dreißig Zombies dreißig Texturen für eine Sache, die aus zwei
   * Rechtecken besteht.
   */
  private readonly barBack: THREE.Sprite;
  private readonly barFill: THREE.Sprite;
  /**
   * Die beiden zusammen, in einer eigenen Gruppe.
   *
   * Nicht der Ordnung wegen: Ein Balken ist eine **Anzeige über** dem NPC und
   * kein Teil seines Körpers, und wer die Maße des Körpers nachmisst
   * (`npcBody.test.ts`), muss ihn deshalb weglassen können. Eine Gruppe mit
   * Namen ist die Stelle, an der das ohne Raten geht.
   */
  readonly bar = new THREE.Group();
  /** Wie breit der Balken ist, in Metern. */
  private readonly barWidth: number;
  /** Wann er zu sehen ist. */
  private bars: BarMode = 'hurt';
  /**
   * **Radius und Kegel, in denen er etwas mitbekommt** — oder `null`, solange
   * niemand danach gefragt hat.
   *
   * Gebaut wird er erst beim ersten Einschalten und danach nur noch versteckt:
   * Ein Fächer aus 24 Dreiecken je NPC ist bei dreißig Zombies nichts, und
   * dreißigmal neu zu bauen wäre bei jedem Umschalten ein Ruckler.
   */
  private sight: THREE.Group | null = null;
  /**
   * Die Trefferzonen als Drahtgitter — `null`, solange sie niemand sehen
   * wollte. Dieselbe Bauart wie der Sichtbereich, aus demselben Grund.
   */
  private hitView: THREE.Group | null = null;
  /** Wie voll er steht: 1 heißt unversehrt. */
  private fill = 1;

  /** Die Phase des Schritts, in Bogenmaß. */
  private phase = 0;
  /** Wie weit der Arm gerade ausholt: 0 = hängt, 1 = trifft. */
  private strike = 0;

  /**
   * **Die Puppe an den Fäden** — oder `null`, wenn der Gang die Arme führt.
   *
   * Ein übernommener oder abgespielter NPC (`Npc.puppet`) hat Hände, die
   * irgendwo *sind*: dort, wo die Hand des Spielers war, als er die Heizdecke
   * wegzog. Der Gang weiß davon nichts und würde die Arme jedes Bild wieder
   * pendeln lassen. Solange hier etwas steht, zeigen die Arme deshalb auf
   * ihre Ziele, und der Kopf dreht sich mit dem des Spielers; die Beine
   * gehen weiter ihren Schritt, denn der kommt aus dem Tempo und stimmt.
   *
   * Ziele stehen im **Raum des Modells**: Ursprung zwischen den Füßen, vorn
   * ist −Z, und der Gierwinkel ist schon herausgerechnet (`Npc.setPuppet`).
   *
   * **Mit einer Figur führen die Fäden nur Ort, Drehung und Tempo.** Die Arme
   * einer Puppe mit Skelett müssten über ihre Knochen laufen, und dabei stünde
   * ein Oberarm, den `setFromUnitVectors` auf ein Ziel dreht, gegen einen
   * Mischer, der ihn im selben Bild wieder zurückschreibt — der Ellbogen
   * darunter bliebe, wo die Spur ihn hat. Was dabei herauskäme, wäre ein Arm,
   * der halb zeigt und halb geht. Gezeigt wird deshalb, was stimmt: Die Figur
   * steht, wo der Spieler steht, dreht sich, wohin er schaut, und **geht**,
   * während er geht (der Gang kommt aus dem Tempo der Fäden) — die Arme gehen
   * mit ihrem Gang. Wer die Arme der Puppe sehen will, nimmt eine Haut ohne
   * Figur; dort führen die Fäden weiter jeden Klotz (`pull`).
   */
  puppet: PuppetPose | null = null;

  /**
   * Die Figur aus dem Regal, sobald sie da ist — und `null`, solange oder
   * falls sie es nicht wird.
   */
  private figure: KaykitFigure | null = null;
  /**
   * Ob dieser Körper schon weggeräumt war, als die Figur ankam.
   *
   * Der Wettlauf ist echt und nicht hypothetisch: Ein Zombie, den man im
   * selben Atemzug setzt und wieder wegräumt, bekommt seine Datei danach —
   * und eine Figur, die niemandem mehr gehört, hinge für immer im Speicher
   * (dasselbe `gone` wie in `core/AvatarBody.ts` und `zones/kitchenDesk.ts`).
   */
  private gone = false;
  /** Der Gang, den die Figur gerade zeigt — `null`, solange keiner gesetzt ist. */
  private figureGait: FigureGait | null = null;
  /**
   * Wie lange der Schlag der Figur noch läuft, in Sekunden.
   *
   * Solange etwas darin steht, wird der Gang **nicht** gewechselt: Ein Schlag,
   * den der nächste Schritt abschneidet, ist ein Zucken. Die Zahl ist die
   * Länge der Spur selbst und keine geschätzte — deshalb spielt der Körper den
   * Schlag mit `play()` ab und nicht mit `act()` (`npcFigure.ts`).
   */
  private figureStriking = 0;
  /** Ob der Körper im letzten Bild schon ausgeholt hat (`update`). */
  private swung = false;
  /** Ob die Figur ihren Tod schon gespielt hat — einmal und nicht je Bild. */
  private figureDead = false;
  /**
   * **Eine Haltung statt eines Gangs** — sitzen, hantieren
   * (`npcBehavior.ts`, `BehaviorPose`). Solange eine gilt, wechselt der Gang
   * nicht; die Klötzchen knicken dafür nur die Beine ein.
   */
  private posed: NpcPose | null = null;
  private posedPlaying = false;

  constructor(kind: NpcKind) {
    super();
    const skin = npcSkin(kind);
    this.skin = skin;
    this.name = `npc-${skin.id}`;
    this.blocks.name = 'npc-blocks';
    this.add(this.blocks);

    const flesh = new THREE.MeshStandardMaterial({ color: skin.palette.skin, roughness: 0.85 });
    const cloth = new THREE.MeshStandardMaterial({ color: skin.palette.cloth, roughness: 0.95 });
    this.eyes = new THREE.MeshStandardMaterial({
      color: skin.palette.eye,
      roughness: 0.4,
      emissive: new THREE.Color(skin.palette.eye).multiplyScalar(0.25),
    });

    // **Die Maße kommen aus derselben Rechnung wie die Trefferzonen**
    // (`npcHit.bodyShape`): Was man sieht, *ist* das, worauf man zielt. Sie
    // hängen alle an der Körperhöhe — eine Haut, die morgen 1,4 m groß ist, ist
    // dann ein Kind und kein zerquetschter Erwachsener.
    const h = skin.height;
    const shape = bodyShape(h, skin.radius);
    const hip = shape.hip;
    const shoulder = shape.shoulder;
    const width = shape.width;
    const legLength = hip;
    const armLength = shape.armLength;
    const headRadius = shape.headRadius;

    const box = (
      w: number,
      height: number,
      d: number,
      material: THREE.Material,
    ): THREE.Mesh<THREE.BoxGeometry, THREE.Material> =>
      new THREE.Mesh(new THREE.BoxGeometry(w, height, d), material);

    // --- Beine ----------------------------------------------------------------
    for (const [group, side] of [
      [this.legLeft, -1],
      [this.legRight, 1],
    ] as const) {
      group.position.set((side * width) / 4, hip, 0);
      const limb = box(width * 0.34, legLength, shape.legDepth, cloth);
      limb.name = 'npc-leg';
      // Der Klotz hängt am Gelenk und dreht sich um dessen Achse, also sitzt
      // seine Mitte eine halbe Länge darunter.
      limb.position.y = -legLength / 2;
      group.add(limb);
      const foot = box(width * 0.36, h * 0.045, skin.radius * 1.15, cloth);
      foot.position.set(0, -legLength + h * 0.02, -skin.radius * 0.14);
      group.add(foot);
      this.blocks.add(group);
    }

    // --- Rumpf ---------------------------------------------------------------
    this.chest.position.y = hip;
    this.blocks.add(this.chest);
    const torso = box(width, shoulder - hip, shape.depth, cloth);
    torso.name = 'npc-torso';
    torso.position.y = (shoulder - hip) / 2;
    this.chest.add(torso);

    // --- Kopf ----------------------------------------------------------------
    this.head.position.y = shoulder - hip;
    this.chest.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 16, 12), flesh);
    this.skull = skull;
    // Die Kugel sitzt so, dass ihr Scheitel genau die Körperhöhe erreicht —
    // dieselbe Rechnung wie in `headOf`, sonst zielt man daneben.
    skull.position.y = h - headRadius - shoulder;
    this.head.add(skull);
    for (const side of [-1, 1] as const) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.2, 10, 8), this.eyes);
      // Die Augen sitzen im Gesicht und nicht im Nacken: -Z ist vorne.
      eye.position.set(
        side * headRadius * 0.38,
        skull.position.y + headRadius * 0.18,
        -headRadius * 0.82,
      );
      this.head.add(eye);
    }

    // --- Arme ----------------------------------------------------------------
    this.hands = { left: new THREE.Object3D(), right: new THREE.Object3D() };
    for (const [group, side, hand] of [
      [this.armLeft, -1, this.hands.left],
      [this.armRight, 1, this.hands.right],
    ] as const) {
      group.position.set((side * width) / 2, shoulder - hip, 0);
      // Ein Zombie streckt die Arme nach vorn; alles andere lässt sie hängen.
      // Es ist dieselbe Kette, nur um 80° vorgedreht — **nach vorn**, und das
      // Vorzeichen ist der ganze Punkt: Der Arm hängt nach −Y, und eine
      // *positive* Drehung um X schiebt ihn nach −Z, also dorthin, wo auch die
      // Augen hinsehen (`ARMS_OUT`). Mit dem falschen Vorzeichen streckte er
      // sie nach hinten und sah aus, als ergäbe er sich.
      group.rotation.x = skin.arms === 'out' ? ARMS_OUT : 0;
      const limb = box(width * 0.28, armLength, width * 0.28, flesh);
      limb.position.y = -armLength / 2;
      group.add(limb);
      hand.position.y = -armLength;
      group.add(hand);
      this.chest.add(group);
    }

    // --- der Lebensbalken -----------------------------------------------------
    // Er hängt **am Körper und nicht am Kopf**: Der Kopf nickt und wiegt beim
    // Gehen mit, und ein Balken, der mitwippt, ist schwerer zu lesen als einer,
    // der über dem NPC steht.
    this.barWidth = skin.radius * 2.6;
    const above = h + skin.radius * 0.7;
    this.barBack = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0x10141c, transparent: true, opacity: 0.75 }),
    );
    this.barBack.name = 'npc-health-back';
    this.barBack.scale.set(this.barWidth, BAR_HEIGHT, 1);
    this.barBack.position.y = above;
    this.barFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: HEALTH_FULL }));
    this.barFill.name = 'npc-health-fill';
    // Linker Rand als Bezugspunkt: von dort wächst und schrumpft die Füllung.
    this.barFill.center.set(0, 0.5);
    this.barFill.scale.set(this.barWidth * BAR_INSET, BAR_HEIGHT * 0.62, 1);
    this.barFill.position.set(-(this.barWidth * BAR_INSET) / 2, above, 0);
    // Über dem Rücken, damit die Füllung nicht im schwarzen Grund verschwindet.
    this.barFill.renderOrder = 1;
    this.bar.name = 'npc-health';
    this.bar.add(this.barBack, this.barFill);
    this.add(this.bar);
    this.setHealth(1);

    this.callFigure();
  }

  /**
   * **Die Figur bestellen** — wenn die Haut eine nennt und die Umgebung eine
   * laden kann.
   *
   * **Der Import ist dynamisch und die Frage steht davor**
   * (`core/chefFit.canLoadModels`): `core/kaykitFigure.ts` zieht `GLTFLoader`
   * und `import.meta` mit sich, und beides bringt einen Jest-Lauf zum Stehen.
   * Wo es kein WebGL gibt, wird das Modul deshalb gar nicht erst angefasst —
   * dasselbe Muster wie beim Koch (`core/AvatarBody.ts`) und beim Rechner auf
   * dem Küchentisch (`worlds/test/zones/kitchenDesk.ts`).
   *
   * `void`, weil hier niemand wartet: Ein NPC, der erst erscheint, wenn eine
   * Datei da ist, ist in der Brille ein NPC, der fehlt.
   */
  private callFigure(): void {
    const path = this.skin.figure;
    if (!path || !canLoadModels()) return;
    void import('../../core/kaykitFigure').then(async (module) => {
      const figure = await module.loadKaykitFigure(path, this.skin.height);
      if (!figure) return;
      // **Wer zu spät kommt, wird sofort wieder weggeworfen.** Sonst hinge
      // eine Figur samt Mischer an einem Körper, den es nicht mehr gibt.
      if (this.gone) {
        figure.dispose();
        return;
      }
      this.wearFigure(figure);
    });
  }

  /**
   * **Die Figur anziehen** — sie kommt in dieselbe Gruppe, die Klötze gehen
   * aus.
   *
   * Ausgeblendet und nicht weggeworfen (`visible = false`): An den Klötzen
   * hängen die Maße, die Tests und der Fall, dass später doch jemand ohne
   * Figur dasteht. Sie kosten unsichtbar nichts — three.js zeichnet einen
   * unsichtbaren Teilbaum gar nicht erst.
   *
   * **Die Hände ziehen um.** Der Anker, an dem später ein Werkzeug hängt,
   * sitzt bis hierher am Klötzchen-Arm und schwingt mit ihm; ab jetzt sitzt er
   * **im Handknochen** der Figur und schwingt mit ihr (`bones.handLeft/Right`).
   * Fehlt der Knochen — nicht jede Figur hat einen —, bleibt er, wo er war:
   * ein Anker an einem unsichtbaren Arm ist immer noch an der ungefähr
   * richtigen Stelle, und das ist mehr als keiner.
   */
  private wearFigure(figure: KaykitFigure): void {
    this.figure = figure;
    this.blocks.visible = false;
    this.add(figure.root);

    for (const [anchor, bone] of [
      [this.hands.left, figure.bones.handLeft],
      [this.hands.right, figure.bones.handRight],
    ] as const) {
      if (!bone) continue;
      // Im Knochen gilt sein Maßstab: Die Figur ist auf ihre Höhe gerechnet,
      // und was in ihrer Hand hängt, wird mit ihr größer und kleiner. Das ist
      // dieselbe Abmachung wie bei der Spielerfigur (`core/AvatarBody.ts`,
      // `POSE_SCALE`) — nur kommt die Zahl hier aus dem Modell.
      anchor.position.set(0, 0, 0);
      anchor.quaternion.identity();
      bone.add(anchor);
    }

    // Welchen Gang sie zeigt, entscheidet das nächste Bild (`update`): Der
    // Lader lässt sie stehen, und wer gerade läuft, läuft eine Sechzigstel
    // Sekunde später auch als Figur. Ein Gang, der hier geraten würde, wäre
    // genau diese eine Sechzigstel früher und dafür womöglich falsch.
    this.figureGait = null;
  }

  /**
   * Wie voll der Balken steht — 1 ist unversehrt, 0 ist leer.
   *
   * Die Farbe geht dabei von Grün über Gelb nach Rot: Man soll auf zwanzig
   * Meter sehen, wie es um jemanden steht, ohne die Länge eines Balkens mit
   * der eines anderen zu vergleichen.
   */
  setHealth(fraction: number): void {
    this.fill = Math.min(1, Math.max(0, fraction));
    const width = this.barWidth * BAR_INSET;
    // Nie ganz auf null: Ein Sprite der Breite 0 ist weg, und „fast tot" soll
    // man noch sehen.
    this.barFill.scale.x = Math.max(width * 0.02, width * this.fill);
    this.barFill.material.color.setHex(
      this.fill > 0.6 ? HEALTH_FULL : this.fill > 0.3 ? HEALTH_HALF : HEALTH_LOW,
    );
    this.applyBars();
  }

  /**
   * **Den Sichtbereich zeigen** — der Ring, in dem er den Spieler bemerkt, und
   * der Kegel, in den er dabei schaut.
   *
   * Zwei Formen und nicht eine, weil es zwei Zahlen sind und sie verschieden
   * viel bedeuten: Der **Ring** ist das, woran heute wirklich entschieden wird,
   * ob ein Zombie einen bemerkt (`npcBrains.ts`, `tuning.sense` — eine
   * Entfernung, sonst nichts). Der **Kegel** ist die Richtung, in die er
   * schaut, und er zählt heute nur für die Sinne, die eine Karte lesen
   * (`nav/navPerception.ts`). Wer beides sieht, sieht auch den Unterschied —
   * und das ist die halbe Erklärung dafür, warum einer einen im Rücken bemerkt.
   *
   * Der Fächer liegt **flach auf dem Boden** und dreht sich mit dem Modell:
   * Von oben ist er dann genau das, was auf einer Karte ein Sichtkegel ist.
   */
  setSight(view: { range: number; fov: number; color: number } | null): void {
    if (view && !this.sight) this.sight = this.buildSight(view);
    if (!this.sight) return;
    this.sight.visible = view !== null;
  }

  private buildSight(view: { range: number; fov: number; color: number }): THREE.Group {
    const group = new THREE.Group();
    group.name = 'npc-sight';
    // Eine Handbreit über dem Boden, sonst flimmert er darin.
    group.position.y = 0.05;
    group.rotation.x = -Math.PI / 2;

    const half = THREE.MathUtils.degToRad(Math.min(180, Math.max(1, view.fov)));
    // Der Kegel schaut nach vorn, und vorne ist −Z; in der gedrehten Ebene ist
    // das +Y, also fängt der Kreisausschnitt bei 90° minus dem halben Winkel an.
    const fan = new THREE.Mesh(
      new THREE.CircleGeometry(view.range, 48, Math.PI / 2 - half, half * 2),
      new THREE.MeshBasicMaterial({
        color: view.color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    fan.name = 'npc-sight-cone';
    fan.renderOrder = 898;
    group.add(fan);

    // Der Ring als eigene Punktkette und nicht als `RingGeometry` mit gleichem
    // Innen- und Außenmaß: Die hätte jeden Punkt doppelt, und eine Linie durch
    // doppelte Punkte ist ein Stern.
    const points: number[] = [];
    const steps = 64;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      points.push(Math.cos(angle) * view.range, Math.sin(angle) * view.range, 0);
    }
    const circle = new THREE.BufferGeometry();
    circle.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const ring = new THREE.LineLoop(
      circle,
      new THREE.LineBasicMaterial({ color: view.color, transparent: true, opacity: 0.7 }),
    );
    ring.name = 'npc-sight-ring';
    ring.renderOrder = 899;
    group.add(ring);

    this.add(group);
    return group;
  }

  /**
   * **Die Trefferzonen zeigen** — genau die Kästen, gegen die gerechnet wird.
   *
   * Sie kommen aus `npcHit.hitParts()` und nicht aus dieser Datei: Ein
   * Drahtgitter, das man selbst noch einmal ausrechnet, zeigt beim nächsten
   * Umbau die alte Form und beweist damit das Gegenteil von dem, wofür man es
   * eingeschaltet hat. Der Kopf ist eine Kugel, Rumpf und Beine sind Kästen,
   * und alle drei hängen **am Modell** — sie drehen sich also mit ihm, so wie
   * die Rechnung es tut (`HitBody.yaw`).
   *
   * Gebaut wird beim ersten Einschalten, danach nur noch versteckt: dieselbe
   * Regel wie beim Sichtkegel.
   */
  setHitView(on: boolean): void {
    if (on && !this.hitView) this.hitView = this.buildHitView();
    if (!this.hitView) return;
    this.hitView.visible = on;
  }

  private buildHitView(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'npc-hitbox';
    const parts = hitParts({
      feet: { x: 0, y: 0, z: 0 },
      height: this.skin.height,
      radius: this.skin.radius,
    });
    const line = (color: number): THREE.LineBasicMaterial =>
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, toneMapped: false });

    // Der Kopf in seiner eigenen Farbe: Er ist die Zone, die vierfach zählt,
    // und genau deshalb schaltet man diese Ansicht ein.
    const head = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(parts.head.radius, 12, 8)),
      line(HIT_HEAD_COLOR),
    );
    head.name = 'npc-hitbox-head';
    head.position.set(parts.head.center.x, parts.head.center.y, parts.head.center.z);
    group.add(head);

    for (const [name, part] of [
      ['npc-hitbox-torso', parts.torso],
      ['npc-hitbox-legs', parts.legs],
    ] as const) {
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(
          new THREE.BoxGeometry(part.half.x * 2, part.half.y * 2, part.half.z * 2),
        ),
        line(HIT_BODY_COLOR),
      );
      wire.name = name;
      wire.position.set(part.center.x, part.center.y, part.center.z);
      group.add(wire);
    }

    for (const child of group.children) child.renderOrder = 900;
    this.add(group);
    return group;
  }

  /** Wann der Balken zu sehen ist: immer, nur bei Schaden, oder gar nicht. */
  setBars(mode: BarMode): void {
    this.bars = mode;
    this.applyBars();
  }

  private applyBars(): void {
    const on =
      this.bars === 'always'
        ? this.fill > 0
        : this.bars === 'hurt' && this.fill > 0 && this.fill < 1;
    this.barBack.visible = on;
    this.barFill.visible = on;
  }

  /**
   * Ein Bild des Gangs.
   *
   * @param speed wie schnell er gerade läuft, in m/s — daraus kommt der Takt.
   * @param striking ob er gerade zuschlägt.
   */
  update(dt: number, speed: number, striking: boolean): void {
    // Die Schrittfrequenz hängt am Tempo: langsam schlurft er, schnell hetzt
    // er. Sonst tanzt ein stehender NPC auf der Stelle.
    this.phase += dt * (2.6 + speed * 2.2);
    const swing = Math.min(0.7, speed * 0.42);
    const step = Math.sin(this.phase) * swing;

    this.legLeft.rotation.x = step;
    this.legRight.rotation.x = -step;
    // Der Rumpf wiegt halb so weit mit und im Gegentakt zum linken Bein.
    this.chest.rotation.y = -step * 0.18;
    this.chest.position.y = this.skin.height * 0.47 - Math.abs(step) * 0.03;

    this.strike = THREE.MathUtils.damp(this.strike, striking ? 1 : 0, 14, dt);
    const base = this.skin.arms === 'out' ? ARMS_OUT : 0;
    // Beim Schlagen holen beide Arme aus und kommen nach unten durch; sonst
    // pendeln sie gegen die Beine. Das Ausholen geht **zurück** in Richtung
    // hängender Arme, also gegen die Grundhaltung.
    const hit = this.strike * (Math.sin(this.phase * 3.4) * 0.5 + 0.5) * 0.9;
    const sway = (1 - this.strike) * -step * 0.6;
    // `set` und nicht `.x`: Eine Puppe hat den Arm womöglich seitlich gedreht,
    // und ein Gang, der nur die X-Drehung schreibt, ließe das stehen.
    this.armLeft.rotation.set(base - hit + sway, 0, 0);
    this.armRight.rotation.set(base - hit - sway, 0, 0);
    this.head.rotation.set(0, 0, 0);
    if (this.puppet) this.pull(this.puppet);
    this.faceBar();

    // **Und dasselbe Bild für die Figur, wenn sie da ist.** Sie bekommt
    // dieselben zwei Zahlen wie die Klötze — Tempo und „holt gerade aus" —,
    // macht aber etwas anderes daraus: einen Gang und einen Schlag statt
    // Gelenkwinkeln.
    // **Eine Haltung** knickt die Klötzchen-Beine nach vorn — ein Stuhl, auf
    // dem ein Kasten mit geraden Beinen „sitzt", steht in ihm.
    if (this.posed === 'sit') {
      this.legLeft.rotation.x = -1.35;
      this.legRight.rotation.x = -1.35;
      this.chest.position.y = this.skin.height * 0.47 - this.skin.height * 0.2;
    }
    if (this.figure) {
      if (striking && !this.swung) this.swing();
      this.driveFigure(dt, speed);
    }
    this.swung = striking;
  }

  /**
   * **Eine Haltung einnehmen — oder wieder gehen** (`null`).
   *
   * Die Spur kommt aus `POSE_CLIPS`: Sitzen ist `Sit_Chair_Idle` aus der
   * Simulations-Bibliothek (`core/kaykitClips.ts`), Hantieren `Interact`.
   * Fehlt sie dem Skelett, bleibt die Figur im Stand — ein normaler Ausgang
   * und kein Fehler.
   */
  setPose(pose: NpcPose | null): void {
    if (pose === this.posed) return;
    this.posed = pose;
    this.posedPlaying = false;
    // Zurück in den Gang: Der nächste `driveFigure` wählt ihn neu.
    this.figureGait = null;
  }

  get pose(): NpcPose | null {
    return this.posed;
  }

  /**
   * **Ein Schlag** — einmal je Schlag und nicht je Bild.
   *
   * Zwei rufen das: der Körper selbst, sobald er zu schlagen anfängt (die
   * Flanke von `striking` — das ist auch der Hieb gegen eine Tür), und `Npc`,
   * sobald das Hirn wirklich trifft (`stepBrain`, `attack`). Beides ist nötig
   * und beides ist zu wenig für sich allein: `striking` steht die ganze Zeit
   * an, solange einer in Reichweite steht (dann käme genau **ein** Schlag),
   * und `attack` kennt die Tür nicht.
   *
   * Wer schon schlägt, schlägt nicht noch einmal: Eine Spur, die jedes Bild
   * von vorn anfängt, ist ein Zittern.
   */
  swing(): void {
    const figure = this.figure;
    if (!figure || this.figureDead || this.figureStriking > 0) return;
    const name = figureStrikeClip(clipNames(figure));
    if (name === null) return;
    // **`play` und nicht `act`**, und zwar wegen der Dauer: Nur die Spur
    // selbst weiß, wie lang sie ist, und der Körper braucht die Zahl, um
    // danach in seinen Gang zurückzufinden (`npcFigure.ts`).
    const action = figure.play(name, { once: true });
    if (!action) return;
    this.figureStriking = Math.max(0.1, action.getClip().duration);
    this.figureGait = null;
  }

  /**
   * **Der Gang der Figur** — aus dem Tempo, und nur beim Wechsel.
   *
   * Hier steht, was sonst `KaykitFigure.gait` täte, und der Grund steht in
   * `npcFigure.ts`: Welche Spur ein Gang ist, entscheidet die **Haut**
   * (`NpcSkin.gaits`) — ein Zombie steht mit erhobenen Fäusten da und eine
   * Übungspuppe nicht, und mehr als die Wahl der Spur trennt die beiden
   * nicht.
   */
  private driveFigure(dt: number, speed: number): void {
    const figure = this.figure!;
    if (this.figureStriking > 0) {
      this.figureStriking = Math.max(0, this.figureStriking - dt);
      figure.update(dt);
      return;
    }
    if (this.posed && !this.figureDead) {
      if (!this.posedPlaying) {
        const name = pickClip(clipNames(figure), POSE_CLIPS[this.posed]);
        if (name) figure.play(name, { fade: FIGURE_FADE * 2 });
        this.posedPlaying = true;
      }
      figure.update(dt);
      return;
    }
    if (!this.figureDead) this.playGait(gaitFor(speed), FIGURE_FADE);
    figure.update(dt);
  }

  /** Auf einen Gang überblenden — oder nichts tun, wenn er schon läuft. */
  private playGait(gait: FigureGait, fade: number): void {
    const figure = this.figure;
    if (!figure || gait === this.figureGait) return;
    const name = figureGaitClip(this.skin, gait, clipNames(figure));
    // **Kein Name ist ein gültiger Ausgang**: Die Figur bleibt stehen, wie sie
    // steht, statt in ihre Bindepose zu fallen. Gemerkt wird der Gang
    // trotzdem, sonst wird es bei jedem Bild noch einmal versucht.
    this.figureGait = gait;
    if (name === null) return;
    figure.play(name, { fade });
  }

  /**
   * Zieht an den Fäden: Jeder Arm, der ein Ziel hat, zeigt von seiner
   * Schulter dorthin — ein Gelenk, keine Ellbogen; die Länge stimmt nur, wenn
   * die Hand des Spielers gerade so weit weg war wie die der Puppe, und das
   * ist ihr egal. Der Kopf nimmt Nick- und Gierwinkel des Spielerkopfes,
   * gedeckelt, damit die Puppe ihn nicht auf den Rücken dreht.
   */
  private pull(pose: PuppetPose): void {
    for (const [arm, target] of [
      [this.armLeft, pose.left],
      [this.armRight, pose.right],
    ] as const) {
      if (!target) continue;
      // Die Schulter im Raum des Modells: Rumpf plus Gelenk. Der Rumpf wiegt
      // um Y mit (`chest.rotation.y`), also wird das Ziel in seinen Raum
      // gedreht, bevor gerechnet wird.
      _shoulder.copy(arm.position).add(this.chest.position);
      _reach.copy(target).sub(_shoulder);
      _reach.applyAxisAngle(_up, -this.chest.rotation.y);
      if (_reach.lengthSq() < 1e-6) continue;
      _reach.normalize();
      arm.quaternion.setFromUnitVectors(_down, _reach);
    }
    this.head.rotation.set(
      THREE.MathUtils.clamp(pose.headPitch, -HEAD_PITCH, HEAD_PITCH),
      THREE.MathUtils.clamp(pose.headYaw, -HEAD_YAW, HEAD_YAW),
      0,
      'YXZ',
    );
  }

  /**
   * **Der Balken dreht sich nicht mit.**
   *
   * Ein Sprite steht immer quer zur Kamera, seine *Stelle* aber kommt aus der
   * Kette darüber — und die dreht sich mit dem NPC. Die Füllung wächst vom
   * linken Rand aus (`barFill.center`), und bei einem, der einen ansieht
   * (Gierwinkel um 180°), ist genau dieser linke Rand plötzlich der rechte:
   * Der grüne Balken stand dann **neben** seinem Rahmen statt darin. Man
   * bemerkt es nur bei dem, der auf einen zukommt — also bei jedem Zombie.
   *
   * Deshalb nimmt die Balkengruppe die Drehung des Modells wieder heraus. Sie
   * ist eine Anzeige über ihm und kein Körperteil (siehe `bar`).
   */
  private faceBar(): void {
    this.bar.rotation.y = -this.rotation.y;
  }

  /**
   * Ob die Augen leuchten: der NPC hat jemanden bemerkt.
   *
   * **Eine Figur aus dem Regal bemerkt nichts sichtbar**, und das bleibt auch
   * so: Sie hat keine Augen als eigenes Teil, und ihre Materialien gehören der
   * Vorlage im Speicher und **allen anderen Kopien** (`core/kaykitModel.ts`,
   * geteilte Geometrie). Wer hier ein Material aufleuchten ließe, ließe jeden
   * Zombie in der Halle aufleuchten, sobald einer von ihnen jemanden sieht.
   * Wer sehen will, wer wen bemerkt hat, schaltet die Sichtbereiche ein.
   */
  setAlert(alert: boolean): void {
    this.eyes.emissive.setHex(this.skin.palette.eye);
    this.eyes.emissive.multiplyScalar(alert ? 0.9 : 0.25);
  }

  /**
   * Umfallen: das Ganze kippt um die eigene Querachse und sinkt dabei ein
   * wenig ein. `t` läuft von 0 (steht) bis 1 (liegt).
   */
  setFallen(t: number): void {
    const eased = Math.min(1, Math.max(0, t));
    // **Eine Figur fällt nicht, sie stirbt.** Sie hat eine Spur dafür
    // (`Death_A`), und die ist alles, was ein Sterbender braucht: Sie endet
    // liegend und bleibt dort stehen (`clampWhenFinished`). Gekippt wird nur
    // der gebaute Körper — der hat keine Spur, und für ihn ist Umkippen die
    // ehrlichste Form von Umfallen, die vier Klötze hergeben.
    if (this.figure && eased > 0 && !this.figureDead) {
      this.figureDead = true;
      this.figureStriking = 0;
      this.figure.act('death');
    }
    this.blocks.rotation.x = -eased * Math.PI * 0.5;
    this.blocks.position.y = -eased * this.skin.radius * 0.5;
    // Wer liegt, hat keinen Balken mehr: er kippte mit dem Körper nach vorn und
    // läge quer über ihm. Und keine Trefferzone: Ein Gefallener wird nicht mehr
    // getroffen (`Npc.zoneOf`), und ein Kasten um ihn herum behauptete das
    // Gegenteil.
    if (eased > 0) {
      this.barBack.visible = false;
      this.barFill.visible = false;
      if (this.hitView) this.hitView.visible = false;
    }
  }

  dispose(): void {
    this.gone = true;
    // **Die Figur zuerst und für sich**: Sie hält einen Mischer und hängt an
    // einem Modell, das sie sich mit allen anderen Kopien teilt — was daran
    // wirklich ihres ist, weiß nur sie (`core/kaykitFigure.dispose`).
    if (this.figure) {
      this.figure.dispose();
      this.figure.root.removeFromParent();
      this.figure = null;
    }
    disposeTree(this);
    this.eyes.dispose();
    this.barBack.material.dispose();
    this.barFill.material.dispose();
  }
}

/**
 * Die Namen der Spuren einer Figur — `pickClip` fragt danach, und eine Liste
 * aus Clips ist keine aus Namen.
 */
function* clipNames(figure: KaykitFigure): Iterable<string> {
  for (const clip of figure.clips) yield clip.name;
}

/** Wann ein Lebensbalken zu sehen ist. */
export type BarMode = 'off' | 'hurt' | 'always';

/** Die Fäden einer Puppe — siehe `NpcBody.puppet`. */
export interface PuppetPose {
  /** Wohin die linke Hand zeigt, im Raum des Modells; `null` lässt den Arm dem Gang. */
  left: THREE.Vector3 | null;
  right: THREE.Vector3 | null;
  /** Nicken des Kopfes in Bogenmaß, positiv nach oben. */
  headPitch: number;
  /** Drehung des Kopfes gegen den Körper, in Bogenmaß, positiv nach links. */
  headYaw: number;
}

/** Weiter nickt und dreht keine Puppe den Kopf. */
const HEAD_PITCH = Math.PI * 0.35;
const HEAD_YAW = Math.PI * 0.4;

const _shoulder = new THREE.Vector3();
const _reach = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _up = new THREE.Vector3(0, 1, 0);

/** Die drei Stellungen, wie das Menü sie durchschaltet und beschriftet. */
export const NPC_BAR_MODES: ReadonlyArray<{ id: BarMode; label: string; sub: string }> = [
  { id: 'hurt', label: 'bei Schaden', sub: 'Erst wenn jemand etwas abbekommen hat' },
  { id: 'always', label: 'immer', sub: 'Über jedem, der steht — zum Prüfen' },
  { id: 'off', label: 'aus', sub: 'Gar keine Balken' },
];

/**
 * Wie weit ein ausgestreckter Arm nach vorn zeigt, in Bogenmaß.
 *
 * **Positiv ist vorn**: Der Arm hängt entlang −Y, und eine Drehung um +X
 * schiebt ihn nach −Z — dorthin, wo das Gesicht ist.
 */
const ARMS_OUT = Math.PI * 0.44;

/** Die Farben der Trefferzonen-Ansicht: Kopf und Rumpf. */
const HIT_HEAD_COLOR = 0xff3b2f;
const HIT_BODY_COLOR = 0x39d0ff;

/** Die Höhe des Balkens, in Metern. */
const BAR_HEIGHT = 0.075;
/** Wie viel von der Breite die Füllung im Rahmen einnimmt. */
const BAR_INSET = 0.9;

const HEALTH_FULL = 0x5ee0a0;
const HEALTH_HALF = 0xffc857;
const HEALTH_LOW = 0xff3b2f;
