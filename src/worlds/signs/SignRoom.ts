import * as THREE from 'three';
import { SignBoard } from './SignBoard';
import { mergeSign, sanitizeSign, signId, type SharedSign, type SignMount } from './signShare';
import { clampSign, type SignSettings } from './signSettings';
import { signSummary } from './signMarkup';
import { saveSignTemplate, saveSigns, signTemplate, storedSigns } from './signStore';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';

/**
 * **Der Schilderwart** — alle aufgestellten Schilder einer Welt an einer
 * Stelle, samt dem Weg zu den anderen Spielern.
 *
 * Derselbe Schnitt wie beim Regisseur der NPCs (`worlds/npc/NpcDirector.ts`):
 * Die Welt reicht ein paar Fähigkeiten herein (`SignWorld`), der Bestand
 * reicht ein paar Befehle heraus (`SignControl`), und das Werkzeug kennt nur
 * die Fähigkeit, nicht ihren Besitzer. Ein Schild-Werkzeug (`tools/SignTool.ts`)
 * weiß deshalb nicht, was ein Netzwerkkanal ist, und diese Datei weiß nicht,
 * wie eine Hand ein Werkzeug hält.
 *
 * **Über das Netz geht es, und das ist der Punkt der ganzen Sache.** Ein
 * Schild, das nur der sieht, der es aufgestellt hat, ist eine Notiz; ein
 * Schild, das alle im Raum sehen, ist ein Aushang — und der ist der Grund,
 * warum es das Werkzeug gibt. Verschickt werden sieben Felder pro Schild
 * (`signShare.ts`), nicht mehr: Ein Schild bewegt sich nicht, es hängt, und
 * hängende Dinge brauchen keinen Strom aus Posen.
 *
 * Wer neu dazukommt, sagt einmal Hallo; jeder, der etwas kennt, antwortet mit
 * seinem Bestand. Dass dabei dieselbe Nachricht mehrfach eintrifft, ist
 * eingeplant — die Fassungsnummer entscheidet (`mergeSign`), und die doppelte
 * verliert.
 */

/** Der Kanal, auf dem Schilder reisen. */
const CHANNEL = 'signs';

/** Wie weit man ein Schild anzielen kann, in Metern. */
const AIM_RANGE = 30;

/** Was ein neues Schild trägt, solange niemand etwas hineingeschrieben hat. */
export const EMPTY_SIGN_TEXT = '# Neues Schild\n\nMit A/X beschriften.';

export interface SignAskText {
  title: string;
  sub?: string;
  value: string;
  hint?: string;
  /** Als Feld und nicht als Methode — sie wird einzeln weitergereicht. */
  commit: (text: string) => void;
}

/** Was der Wart von seiner Welt braucht. */
export interface SignWorld {
  /** Woran die Schilder hängen. */
  readonly root: THREE.Object3D;
  /** Der laufende Kontext — Zeiger, Eingabe und Sitzung stecken darin. */
  context(): WorldContext | null;
  /**
   * In welcher Welt das hier steht; der Speicher trennt danach.
   *
   * Als Frage und nicht als Feld: Die Sitzung erfährt erst *nach* dem Aufbau
   * einer Welt, welche es ist (`App.goTo`) — ein beim Bauen abgeschriebener
   * Name wäre der der vorigen.
   */
  worldId(): string;
  notify(message: string): void;
  /**
   * Ob diese Hand ein Werkzeug hält.
   *
   * Eine leere Hand, die auf ein Schild zeigt und abdrückt, will es
   * **bearbeiten**. Eine Hand mit dem Schild-Werkzeug will damit ein neues
   * aufstellen — und würde sonst beides gleichzeitig tun.
   */
  handBusy(hand: Handedness): boolean;
  /** Die mehrzeilige Tastatur der Welt (`ui/KeyPanel.ts`, Belegung `lines`). */
  askText(request: SignAskText): void;
}

export interface SignPlacement {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  /** Wohin es sehen soll — der Kopf dessen, der es hinstellt. */
  towards?: THREE.Vector3;
  text?: string;
  settings?: SignSettings;
}

/** Und was ein Werkzeug oder ein Menü damit tun darf. */
export interface SignControl {
  /** Stellt ein Schild auf. `null`: Dort geht keines hin. */
  place(request: SignPlacement): SignBoard | null;
  /** Nimmt eines wieder auf und gibt zurück, was daraufstand. */
  take(board: SignBoard): { text: string; settings: SignSettings } | null;
  remove(board: SignBoard): void;
  /** Öffnet die Tastatur für dieses Schild — oder für das zuletzt angefasste. */
  edit(board?: SignBoard | null): boolean;
  /**
   * Dieselbe Tastatur für einen Text, der noch auf **keinem** Schild steht.
   *
   * Der Entwurf in der Hand: Man schreibt erst und stellt dann hin — und nicht
   * umgekehrt, denn ein leeres Schild aufzustellen, nur um es beschriften zu
   * dürfen, ist ein Umweg, den man jedes Mal geht.
   */
  compose(value: string, commit: (text: string) => void): void;
  /** Das Schild, auf das dieser Strahl trifft. */
  aimAt(origin: THREE.Vector3, direction: THREE.Vector3): SignBoard | null;
  /** Das Schild, an dessen Traggriff diese Hand liegt. */
  handleAt(point: THREE.Vector3): SignBoard | null;
  /** Das zuletzt aufgestellte, bearbeitete oder angezielte. */
  current(): SignBoard | null;
  /** Die Einstellungen, die das Menü gerade bearbeitet. */
  settings(): SignSettings;
  /** Setzt sie — auf das aktuelle Schild und auf die Vorlage für das nächste. */
  apply(patch: Partial<SignSettings>): SignSettings;
  boards(): readonly SignBoard[];
  /** Räumt alle eigenen weg. Gibt zurück, wie viele es waren. */
  clear(): number;
}

interface SignEntry {
  id: string;
  board: SignBoard;
  rev: number;
  /** Selbst aufgestellt: nur die werden gespeichert und beim Aufräumen entfernt. */
  mine: boolean;
}

type Message =
  | { t: 'hello' }
  | { t: 'state'; signs: SharedSign[] }
  | { t: 'set'; sign: SharedSign }
  | { t: 'gone'; id: string };

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _forward = new THREE.Vector3(0, 0, 1);
const _look = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _direction = new THREE.Vector3();

/** Flacher als das ist ein Boden, steiler als das eine Wand. */
const FLOOR_NORMAL = 0.75;
const WALL_NORMAL = 0.55;

export class SignRoom implements SignControl {
  private readonly entries = new Map<string, SignEntry>();
  /** Welches Schild welche Hand gerade anzielt — für das Rollen von Hand. */
  private readonly hovered = new Map<Handedness, SignBoard>();
  private focus: SignBoard | null = null;
  private template: SignSettings;
  private counter = 0;
  private greeted = false;

  constructor(private readonly world: SignWorld) {
    this.template = signTemplate();
    const net = world.context()?.net;
    net?.on(CHANNEL, (data, from) => this.receive(data as Message, from));
  }

  // --- Bestand --------------------------------------------------------------

  boards(): readonly SignBoard[] {
    return [...this.entries.values()].map((entry) => entry.board);
  }

  current(): SignBoard | null {
    return this.focus;
  }

  settings(): SignSettings {
    return this.focus ? this.focus.settings : this.template;
  }

  /**
   * Eine Einstellung ändern — am angefassten Schild **und** an der Vorlage.
   *
   * Beides zusammen, weil beides gemeint ist: Wer die Schrift größer macht,
   * während er vor einem Schild steht, will dieses Schild größer haben; und er
   * will das nächste nicht wieder von vorn einstellen.
   */
  apply(patch: Partial<SignSettings>): SignSettings {
    const base = this.settings();
    const next = clampSign({ ...base, ...patch });
    this.template = saveSignTemplate(next);
    const board = this.focus;
    if (board) {
      board.setSettings(next);
      this.touch(board);
    }
    return next;
  }

  place(request: SignPlacement): SignBoard | null {
    const context = this.world.context();
    if (!context) return null;
    const normal = request.normal;
    const mount: SignMount | null =
      normal.y >= FLOOR_NORMAL ? 'post' : Math.abs(normal.y) <= WALL_NORMAL ? 'wall' : null;
    if (!mount) return null;

    const settings = clampSign(request.settings ?? this.template);
    const board = new SignBoard({
      text: request.text ?? EMPTY_SIGN_TEXT,
      settings,
      mount,
    });

    if (mount === 'post') {
      // Auf dem Boden: die Tafel über ihrem Pfosten, mit dem Gesicht zu dem,
      // der sie hinstellt. Ein Schild, das man erst umdrehen muss, ist keines.
      board.position.copy(request.point);
      board.position.y += 1.05 + settings.height / 2;
      const towards = request.towards ?? _look.copy(request.point).add(_forward);
      board.rotation.set(
        0,
        Math.atan2(towards.x - request.point.x, towards.z - request.point.z),
        0,
      );
    } else {
      // An der Wand: flach darauf, ein paar Millimeter davor.
      board.position.copy(request.point).addScaledVector(normal, 0.03);
      board.quaternion.setFromUnitVectors(_forward, _direction.copy(normal).normalize());
    }

    const id = signId(context.net.localId, this.counter++);
    this.adopt(id, board, true);
    this.focus = board;
    this.broadcast(id);
    this.persist();
    return board;
  }

  take(board: SignBoard): { text: string; settings: SignSettings } | null {
    const entry = this.entryOf(board);
    if (!entry) return null;
    const carried = { text: board.text, settings: board.settings };
    this.remove(board);
    return carried;
  }

  remove(board: SignBoard): void {
    const entry = this.entryOf(board);
    if (!entry) return;
    this.drop(entry);
    this.world.context()?.net.emit(CHANNEL, { t: 'gone', id: entry.id } satisfies Message);
    this.persist();
  }

  clear(): number {
    const mine = [...this.entries.values()].filter((entry) => entry.mine);
    for (const entry of mine) this.remove(entry.board);
    return mine.length;
  }

  edit(board?: SignBoard | null): boolean {
    const target = board ?? this.focus;
    if (!target) return false;
    this.focus = target;
    this.world.askText({
      title: 'Schild beschriften',
      sub: target.settings.markdown ? 'Markdown: # Titel, - Punkt, **fett**' : 'Reiner Text',
      value: target.text,
      hint: 'Fertig übernimmt · Abbrechen lässt alles, wie es war',
      commit: (text) => {
        target.setText(text);
        this.touch(target);
        const summary = signSummary(text);
        this.world.notify(summary ? `Schild: ${summary}` : 'Schild geleert');
      },
    });
    return true;
  }

  compose(value: string, commit: (text: string) => void): void {
    this.world.askText({
      title: 'Schild beschriften',
      sub: 'Der Entwurf in der Hand · Trigger stellt ihn hin',
      value,
      hint: 'Markdown: # Titel, - Punkt, **fett**, ![Bild](Adresse)',
      commit,
    });
  }

  aimAt(origin: THREE.Vector3, direction: THREE.Vector3): SignBoard | null {
    const faces = this.boards().map((board) => board.face);
    if (faces.length === 0) return null;
    _ray.set(origin, _direction.copy(direction).normalize());
    _ray.far = AIM_RANGE;
    const hit = _ray.intersectObjects(faces, false)[0];
    if (!hit) return null;
    const board = hit.object.parent;
    return board instanceof SignBoard ? board : null;
  }

  handleAt(point: THREE.Vector3): SignBoard | null {
    for (const entry of this.entries.values()) {
      if (entry.board.handleNear(point)) return entry.board;
    }
    return null;
  }

  /** Merkt sich, welches Schild gerade gemeint ist — das Menü folgt ihm. */
  setFocus(board: SignBoard | null): void {
    if (board && !this.entryOf(board)) return;
    this.focus = board;
  }

  // --- jedes Bild -----------------------------------------------------------

  update(dt: number): void {
    const context = this.world.context();
    if (!this.greeted && context) {
      // Erst hier und nicht im Aufbau: Welche Welt das ist, steht erst fest,
      // wenn sie fertig geladen ist — und der Speicher trennt danach.
      this.greeted = true;
      this.restore();
      context.net.emit(CHANNEL, { t: 'hello' } satisfies Message);
    }
    // Welcher Daumen auf welchem Schild liegt: Nur die Hand, die gerade auf
    // ein Schild zeigt, rollt es — sonst schöbe der Gehstick jedes Schild im
    // Raum gleichzeitig durch seinen Text.
    const sticks = new Map<SignBoard, number>();
    if (context) {
      for (const [hand, board] of this.hovered) {
        const controller = context.input.get(hand);
        if (!controller?.tracked) continue;
        const axis = -controller.thumbstick.y;
        if (Math.abs(axis) > Math.abs(sticks.get(board) ?? 0)) sticks.set(board, axis);
      }
    }
    for (const entry of this.entries.values()) {
      entry.board.update(dt, sticks.get(entry.board) ?? 0);
    }
  }

  dispose(): void {
    const context = this.world.context();
    context?.net.off(CHANNEL);
    for (const entry of [...this.entries.values()]) this.drop(entry, false);
    this.entries.clear();
    this.hovered.clear();
    this.focus = null;
  }

  // --- innen ----------------------------------------------------------------

  /** Hängt ein gebautes Schild in die Welt und meldet es beim Zeiger an. */
  private adopt(id: string, board: SignBoard, mine: boolean, rev = 1): void {
    board.userData.signId = id;
    this.world.root.add(board);
    this.entries.set(id, { id, board, rev, mine });
    const pointer = this.world.context()?.pointer;
    pointer?.add({
      object: board.face,
      pokeable: false,
      // Eine Hand mit einem Werkzeug zeigt hier nicht hin: Sie hat mit ihrem
      // Trigger etwas anderes vor.
      ignore: (hand) => hand !== null && this.world.handBusy(hand),
      onHover: (hit) => {
        if (hit.hand) this.hovered.set(hit.hand, board);
        this.setFocus(board);
      },
      onBlur: () => {
        for (const [hand, hovered] of [...this.hovered]) {
          if (hovered === board) this.hovered.delete(hand);
        }
      },
      onSelect: () => void this.edit(board),
    });
  }

  private drop(entry: SignEntry, forget = true): void {
    this.world.context()?.pointer.remove(entry.board.face);
    for (const [hand, hovered] of [...this.hovered]) {
      if (hovered === entry.board) this.hovered.delete(hand);
    }
    if (this.focus === entry.board) this.focus = null;
    entry.board.dispose();
    if (forget) this.entries.delete(entry.id);
  }

  private entryOf(board: SignBoard): SignEntry | null {
    const id = board.userData.signId as string | undefined;
    const entry = id ? this.entries.get(id) : undefined;
    return entry ?? null;
  }

  /** Etwas hat sich geändert: Fassung hochzählen, verschicken, aufheben. */
  private touch(board: SignBoard): void {
    const entry = this.entryOf(board);
    if (!entry) return;
    entry.rev++;
    this.broadcast(entry.id);
    this.persist();
  }

  private broadcast(id: string): void {
    const shared = this.toShared(id);
    if (!shared) return;
    this.world.context()?.net.emit(CHANNEL, { t: 'set', sign: shared } satisfies Message);
  }

  private toShared(id: string): SharedSign | null {
    const entry = this.entries.get(id);
    if (!entry) return null;
    const board = entry.board;
    board.getWorldPosition(_position);
    board.getWorldQuaternion(_quaternion);
    return {
      id,
      rev: entry.rev,
      pose: [
        _position.x,
        _position.y,
        _position.z,
        _quaternion.x,
        _quaternion.y,
        _quaternion.z,
        _quaternion.w,
      ],
      text: board.text,
      settings: board.settings,
      mount: board.mount,
    };
  }

  private persist(): void {
    const mine = [...this.entries.values()]
      .filter((entry) => entry.mine)
      .map((entry) => this.toShared(entry.id))
      .filter((sign): sign is SharedSign => sign !== null);
    saveSigns(this.world.worldId(), mine);
  }

  /** Was beim letzten Mal in dieser Welt stand, steht wieder da. */
  private restore(): void {
    for (const sign of storedSigns(this.world.worldId())) {
      this.applyShared(sign, true);
      // Die Zählung muss über den wiederhergestellten Kennungen liegen, sonst
      // vergibt die nächste Aufstellung eine, die es schon gibt.
      this.counter++;
    }
  }

  private receive(message: Message, _from: string): void {
    if (!message || typeof message !== 'object') return;
    switch (message.t) {
      case 'hello': {
        const signs = [...this.entries.keys()]
          .map((id) => this.toShared(id))
          .filter((sign): sign is SharedSign => sign !== null);
        if (signs.length > 0) {
          this.world.context()?.net.emit(CHANNEL, { t: 'state', signs } satisfies Message);
        }
        break;
      }
      case 'state':
        if (!Array.isArray(message.signs)) return;
        for (const raw of message.signs.slice(0, 64)) {
          const sign = sanitizeSign(raw);
          if (sign) this.applyShared(sign, false);
        }
        break;
      case 'set': {
        const sign = sanitizeSign(message.sign);
        if (sign) this.applyShared(sign, false);
        break;
      }
      case 'gone': {
        const entry = typeof message.id === 'string' ? this.entries.get(message.id) : undefined;
        if (entry) {
          this.drop(entry);
          if (entry.mine) this.persist();
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Ein Schild von außen (oder aus dem Speicher) übernehmen.
   *
   * Die höhere Fassung gewinnt; bei Gleichstand bleibt alles, wie es ist —
   * sonst spränge der Rollstand jedes Schildes bei jeder Begrüßung an den
   * Anfang zurück (`signShare.ts`).
   */
  private applyShared(sign: SharedSign, mine: boolean): void {
    const entry = this.entries.get(sign.id);
    if (!entry) {
      const board = new SignBoard({ text: sign.text, settings: sign.settings, mount: sign.mount });
      board.position.set(sign.pose[0], sign.pose[1], sign.pose[2]);
      board.quaternion.set(sign.pose[3], sign.pose[4], sign.pose[5], sign.pose[6]);
      this.adopt(sign.id, board, mine, sign.rev);
      return;
    }
    const known = this.toShared(sign.id);
    // `mergeSign` gibt die bekannte Fassung selbst zurück, wenn die neue nicht
    // neuer ist — dann ist hier nichts zu tun.
    if (known && mergeSign(known, sign) === known) return;
    entry.rev = sign.rev;
    entry.board.position.set(sign.pose[0], sign.pose[1], sign.pose[2]);
    entry.board.quaternion.set(sign.pose[3], sign.pose[4], sign.pose[5], sign.pose[6]);
    entry.board.setMount(sign.mount);
    entry.board.setSettings(sign.settings);
    entry.board.setText(sign.text);
  }
}
