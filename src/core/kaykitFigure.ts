import * as THREE from 'three';
import { disposeTree } from '../worlds/shared/environment';
import { kaykitScale } from './kaykitFit';
import { kaykitClips, kaykitModel } from './kaykitModel';
import {
  FIGURE_ACTIONS,
  FIGURE_ACT_FADE,
  FIGURE_BONES,
  FIGURE_FACING,
  FIGURE_FADE,
  GAIT_CLIPS,
  figureBoneName,
  figureScale,
  gaitFor,
  pickClip,
  type FigureAct,
  type FigureBone,
  type FigureGait,
} from './kaykitFigureFit';

/**
 * **Eine Figur aus dem Regal, die läuft.**
 *
 * Ein Fass aus dem Regal ist ein Netz: laden, hinstellen, fertig
 * (`core/kaykitModel.ts`). Eine Figur ist das nicht, und deshalb steht sie in
 * einer eigenen Datei:
 *
 * - Sie braucht ein **Skelett**, das wirklich ihres ist. `Object3D.clone`
 *   lässt die Knochen bei der Vorlage; das macht der Lader schon richtig
 *   (`SkeletonUtils.clone`), aber erst hier fällt auf, wozu.
 * - Sie braucht **fremde Bewegungen**. Keine Figur der Sammlung bringt eine
 *   eigene mit — die 14 Spurdateien liegen bei den Skeletten
 *   (`core/kaykitClips.ts`), und gebunden werden sie über die **Namen** der
 *   Knochen.
 * - Sie braucht einen **Mischer**, der je Bild weiterläuft, und ein Umschalten
 *   zwischen Gängen, das überblendet statt springt.
 * - Sie schaut in die **falsche Richtung** (`FIGURE_FACING`).
 * - Und sie ist nicht so groß, wie ihr Paket sagt, sondern so groß, wie die
 *   Zone sagt (`height`).
 *
 * Nichts davon gehört in den Lader des Regals: Ein Regal voller Fässer soll
 * keinen Mischer kennen.
 *
 * **Diese Datei darf kein Test importieren.** Sie hängt über
 * `core/kaykitModel.ts` an `GLTFLoader` und `import.meta`, und beides bringt
 * Jest zum Stehen. Wer sie benutzt, tut das hinter `canLoadModels()` und mit
 * dynamischem `import()` — das Muster steht in
 * `worlds/test/zones/kitchenDesk.ts` (`fillComputer`). Gerechnet wird
 * nebenan in `core/kaykitFigureFit.ts`, und das ist die Datei mit dem Test.
 */
export interface KaykitFigure {
  /** Ursprung zwischen den Füßen auf y=0, Blick nach −Z, genau `height` m hoch. */
  readonly root: THREE.Group;
  readonly path: string;
  readonly height: number;
  readonly mixer: THREE.AnimationMixer;
  readonly clips: readonly THREE.AnimationClip[];
  /** Anker: die Hand-/Kopfknochen, wenn das Skelett sie hat. */
  readonly bones: {
    handLeft: THREE.Object3D | null;
    handRight: THREE.Object3D | null;
    head: THREE.Object3D | null;
  };
  /** Überblenden auf einen Clip; `null`, wenn es ihn nicht gibt. once=true spielt einmal und hält am Ende (clampWhenFinished). */
  play(
    name: string,
    opts?: { fade?: number; once?: boolean; speed?: number },
  ): THREE.AnimationAction | null;
  /** Der Gang aus dem Tempo: Idle/Walk/Run per gaitFor, nur bei Wechsel überblenden. */
  gait(speed: number): void;
  /** Eine der Aktionen (`attack`/`hit`/`death`) — spielt einmal und kehrt (außer death) danach zum Gang zurück. */
  act(kind: FigureAct): boolean;
  update(dt: number): void;
  dispose(): void;
}

/**
 * **Eine Figur laden** — oder `null`, wenn daraus nichts wird.
 *
 * `path` ist eine Adresse im Regal (`character-animations/…/Mannequin_Medium.glb`),
 * `height` die Höhe in **Metern**, auf die die Figur gebracht wird. Die
 * Richtung ist Absicht: Die Hülle einer Zone — Collider, Trefferzone,
 * Augenhöhe — steht fest, und die Figur richtet sich danach. Umgekehrt hätte
 * jede neue Figur eine andere Hülle.
 *
 * **`null` ist ein normaler Ausgang**, wie überall im Regal: ein Checkout ohne
 * die gekauften Pakete, eine Adresse, die es nicht gibt, eine Leitung, die
 * abreißt. Geworfen wird nach außen nie — wer eine Figur bestellt, bekommt
 * eine oder keine, und die Zone läuft in beiden Fällen weiter.
 */
export async function loadKaykitFigure(path: string, height: number): Promise<KaykitFigure | null> {
  try {
    const model = await kaykitModel(path);
    if (!model) return null;
    // **Die Quellhöhe wird am Modell gemessen und nicht abgeschrieben**: Sie
    // entscheidet über das Skelett (`kaykitRigOf`), und eine Tabelle mit 85
    // Zahlen darin pflegt niemand. Gemessen wird **vor** dem Mischer, in der
    // Bindepose — das ist die T-Pose, und die ist bei allen Figuren eines
    // Skeletts dieselbe.
    const box = new THREE.Box3().setFromObject(model);
    const pack = kaykitScale(path);
    const metres = box.isEmpty() ? 0 : box.max.y - box.min.y;
    const source = pack > 0 ? metres / pack : 0;
    // **Nur eine Figur holt eine Bibliothek.** Ohne `SkinnedMesh` bleibt es
    // bei dem, was in der Datei selbst steht (meistens nichts) — ein Fass, das
    // dafür 936 kB lädt, ist ein Fass mit 936 kB zu viel.
    const clips = await kaykitClips(path, isSkinned(model) && source > 0 ? source : null);
    return new Figure(path, height, model, box, pack, clips);
  } catch (error: unknown) {
    console.warn(`Figur aus dem Regal nicht geladen (${path}).`, error);
    return null;
  }
}

class Figure implements KaykitFigure {
  readonly root = new THREE.Group();
  readonly mixer: THREE.AnimationMixer;
  readonly clips: readonly THREE.AnimationClip[];
  readonly bones: {
    handLeft: THREE.Object3D | null;
    handRight: THREE.Object3D | null;
    head: THREE.Object3D | null;
  };

  /** Die Spuren nach Namen — `play` sucht nicht in einer Liste. */
  private readonly byName = new Map<string, THREE.AnimationClip>();
  /** Was gerade führt; daraus wird beim nächsten Wechsel herausgeblendet. */
  private current: THREE.AnimationAction | null = null;
  /** Der Gang, den die Figur meint — auch während sie gerade zuschlägt. */
  private kind: FigureGait | null = null;
  /** Die einmalige Bewegung, solange sie läuft (`act`). */
  private acting: THREE.AnimationAction | null = null;
  /** Wer tot ist, geht nicht mehr. */
  private dead = false;
  private gone = false;

  constructor(
    readonly path: string,
    readonly height: number,
    private readonly model: THREE.Object3D,
    box: THREE.Box3,
    pack: number,
    clips: readonly THREE.AnimationClip[],
  ) {
    this.root.name = `kaykit-figure:${path}`;

    // **Drei Zeilen machen aus dem Modell eine Figur**, und jede hat ihren
    // Grund: der Maßstab über dem Paketmaßstab (`figureScale`), die Füße auf
    // null (der Ursprung dieser Dateien liegt zwar meist dort, aber „meist"
    // ist keine Zusage), und die Drehung, weil KayKit nach +Z schaut und
    // dieses Spiel nach −Z (`FIGURE_FACING`).
    const source = pack > 0 && !box.isEmpty() ? (box.max.y - box.min.y) / pack : 0;
    const extra = figureScale(source, pack, height);
    model.scale.multiplyScalar(extra);
    model.position.y = -box.min.y * extra;
    model.rotation.y = FIGURE_FACING;
    this.root.add(model);

    this.clips = fitClips(model, clips);
    for (const clip of this.clips) this.byName.set(clip.name, clip);

    // Der Mischer sitzt auf dem **Modell** und nicht auf `root`: Er bindet
    // über die Namen der Knoten unter seiner Wurzel, und die Gruppe darüber
    // trägt nur Maßstab und Drehung.
    this.mixer = new THREE.AnimationMixer(model);
    this.mixer.addEventListener('finished', this.onFinished);

    this.bones = {
      handLeft: findBone(model, 'handLeft'),
      handRight: findBone(model, 'handRight'),
      head: findBone(model, 'head'),
    };

    // **Stehen ist der Anfang.** Ohne das bliebe die Figur in ihrer Bindepose
    // — mit ausgestreckten Armen, bis sie das erste Mal losgeht.
    this.gait(0);
  }

  play(
    name: string,
    opts: { fade?: number; once?: boolean; speed?: number } = {},
  ): THREE.AnimationAction | null {
    const clip = this.byName.get(name);
    if (!clip || this.gone) return null;
    const once = opts.once === true;
    const fade = Math.max(0, opts.fade ?? (once ? FIGURE_ACT_FADE : FIGURE_FADE));
    const speed = Number.isFinite(opts.speed) ? (opts.speed as number) : 1;

    const next = this.mixer.clipAction(clip);
    const previous = this.current;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Number.POSITIVE_INFINITY);
    // **Am Ende stehenbleiben statt zurückschnappen**: Ein Toter, der nach
    // seiner letzten Kurve wieder aufsteht, ist kein Toter.
    next.clampWhenFinished = once;
    next.setEffectiveTimeScale(speed);
    next.setEffectiveWeight(1);
    next.play();
    if (previous && previous !== next) {
      if (fade > 0) next.crossFadeFrom(previous, fade, false);
      else previous.stop();
    }
    this.current = next;
    return next;
  }

  gait(speed: number): void {
    const kind = gaitFor(speed);
    if (kind === this.kind) return;
    // **Gemerkt wird immer**, gewechselt nicht: Wer mitten im Schlag zu laufen
    // anfängt, läuft, sobald der Schlag vorbei ist (`onFinished`). Ein Gang,
    // der den Schlag abschneidet, macht aus jedem Treffer ein Zucken.
    this.kind = kind;
    if (this.acting || this.dead) return;
    this.startGait(FIGURE_FADE);
  }

  act(kind: FigureAct): boolean {
    if (this.gone) return false;
    const name = pickClip(this.byName.keys(), FIGURE_ACTIONS[kind]);
    if (name === null) return false;
    const action = this.play(name, { once: true, fade: FIGURE_ACT_FADE });
    if (!action) return false;
    this.acting = action;
    this.dead = kind === 'death';
    return true;
  }

  update(dt: number): void {
    if (this.gone || !Number.isFinite(dt) || dt <= 0) return;
    this.mixer.update(dt);
  }

  dispose(): void {
    if (this.gone) return;
    this.gone = true;
    this.mixer.removeEventListener('finished', this.onFinished);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    // **Hier endet das Aufräumen am geteilten Modell** (`disposeTree` hält bei
    // `userData.sharedAssets` an): Geometrie und Textur gehören der Vorlage im
    // Speicher und allen anderen Kopien, nicht dieser Figur.
    disposeTree(this.root);
  }

  /**
   * Zurück in den gemerkten Gang. Fehlt die Spur — ein Skelett ohne
   * `Walking_A`, eine Bibliothek, die nicht ankam —, passiert nichts, und die
   * Figur bleibt so stehen, wie sie steht.
   */
  private startGait(fade: number): void {
    const name = pickClip(this.byName.keys(), GAIT_CLIPS[this.kind ?? 'idle']);
    if (name === null) return;
    this.play(name, { fade });
  }

  private readonly onFinished = (event: { action: THREE.AnimationAction }): void => {
    if (this.gone || event.action !== this.acting) return;
    this.acting = null;
    // Der Tote bleibt liegen; alle anderen nehmen den Gang wieder auf, den sie
    // inzwischen gemeint haben.
    if (!this.dead) this.startGait(FIGURE_FADE);
  };
}

/** Ob in diesem Baum ein Skelett steckt — dieselbe Frage wie im Lader. */
function isSkinned(model: THREE.Object3D): boolean {
  let found = false;
  model.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}

/**
 * **Den Knochen zu einem Anker suchen** — den ersten, den es gibt.
 *
 * Gesucht wird unter den Namen aus `FIGURE_BONES`, und zwar in der Schreibweise
 * des Baums (`figureBoneName`: `handslot.r` → `handslotr`). Der Name aus der
 * Datei wird trotzdem mitprobiert: Wenn `three` die Regel eines Tages ändert,
 * soll hier nicht stillschweigend `null` herauskommen.
 */
function findBone(model: THREE.Object3D, anchor: FigureBone): THREE.Object3D | null {
  for (const wanted of FIGURE_BONES[anchor]) {
    const clean = figureBoneName(wanted);
    const hit = model.getObjectByName(clean) ?? model.getObjectByName(wanted);
    if (hit) return hit;
  }
  return null;
}

/**
 * **Spuren, die ins Leere zeigen, fallen weg.**
 *
 * Die Bibliotheken bewegen das ganze Skelett, die Figur hat aber nicht immer
 * jeden Knochen: `tools/kaykit-model.mjs` wirft beim Aufbereiten weg, was
 * nichts häutet, und deshalb fehlen zum Beispiel dem `Mannequin_Medium.glb`
 * die beiden `handslot`-Knochen (nachgemessen; `Dummy.glb` und die Roboter
 * haben sie). `three` sieht darüber hinweg, aber es sagt je Spur einmal
 * „wasn't found" in die Konsole — und eine Konsole, in der bei jeder Figur
 * dasselbe steht, liest niemand mehr.
 *
 * Die **Spuren selbst werden geteilt**, nicht kopiert: Ein neuer `AnimationClip`
 * über dieselben `KeyframeTrack`-Objekte kostet ein Array und sonst nichts.
 */
function fitClips(
  model: THREE.Object3D,
  clips: readonly THREE.AnimationClip[],
): readonly THREE.AnimationClip[] {
  const nodes = new Set<string>();
  model.traverse((object) => {
    if (object.name) nodes.add(object.name);
  });
  const out: THREE.AnimationClip[] = [];
  for (const clip of clips) {
    const tracks = clip.tracks.filter((track) => {
      const node = nodeOf(track.name);
      // Eine Spur ohne Knoten bindet an die Wurzel selbst — die ist immer da.
      return node === null || nodes.has(node);
    });
    if (tracks.length === 0) continue;
    out.push(
      tracks.length === clip.tracks.length
        ? clip
        : new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode),
    );
  }
  return out;
}

/** Der Knotenname einer Spur (`handslotr.quaternion` → `handslotr`). */
function nodeOf(track: string): string | null {
  try {
    return THREE.PropertyBinding.parseTrackName(track).nodeName ?? null;
  } catch {
    // Ein Name, den `three` selbst nicht liest, wird nicht von hier aus
    // weggeworfen: Dann soll die Bindung meckern und nicht die Spur fehlen.
    return null;
  }
}
