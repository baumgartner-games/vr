import * as THREE from 'three';
import { NetSession } from '../net/NetSession';
import { TrysteroTransport } from '../net/TrysteroTransport';
import { normalizeRoomCode, rememberName, rememberRoom } from '../net/room';
import { GhostHand, handColor } from '../core/HandVisuals';
import { createTool } from '../worlds/portal/tools';
import { HAND_SHARE_CHANNEL, parseHandShare, type HandShare } from '../worlds/tune/handShare';
import { poseFromReadout } from '../worlds/portal/tools/toolPose';
import type { NetStatus } from '../net/types';
import type { Tool } from '../worlds/portal/tools/Tool';

/**
 * **Zuschauen, während drüben jemand eine Hand einstellt.**
 *
 * Die Werkzeugseite kann bisher genau eine Sache nicht: sagen, wie eine Hand
 * *gerade jetzt* an einem Werkzeug liegt. Sie zeigt die eingestellte Haltung
 * aus dem eigenen Speicher, und das ist die Haltung von zuletzt — wer in der
 * Brille daran arbeitet, sieht hier nichts davon.
 *
 * Der Knopf **Verbinden** schließt genau diese Lücke, und zwar mit derselben
 * Sitzung, mit der auch zwei Spieler zusammenspielen (`net/`): derselbe
 * Raum-Code, dasselbe Trystero, dieselben Nachrichten. Was hier hereinkommt,
 * ist ein Kanal daraus (`handShare.ts`) — die Haltung der Hand, die drüben
 * gerade gemessen wird, zwanzigmal je Sekunde, samt Konfig-Code zum Kopieren.
 *
 * Zwei Dinge macht diese Datei und sonst nichts:
 *
 * - **Die Leitung**: verbinden, trennen, zuhören. Eine `NetSession` ohne Rig
 *   und ohne Welt — es gibt hier keinen Spieler, nur einen Zuschauer.
 * - **Die Bühne**: aus einer Nachricht ein Werkzeug mit einer Hand daran. Neu
 *   gebaut wird nur, wenn sich Werkzeug oder Seite ändern; die Bewegung
 *   dazwischen ist ein Verschieben und kein Neubau, sonst stünde zwanzigmal je
 *   Sekunde ein frisches Modell auf der Bühne.
 */

/** Was ein Zuschauer im Raum ist — kein Spieler, aber auch keine Brille. */
const ROLE = 'desktop';

/**
 * Wie oft sich der Zuschauer meldet.
 *
 * Die Sitzung wirft einen Mitspieler nach acht Sekunden Stille hinaus
 * (`NetSession.PEER_TIMEOUT`), und ein Zuschauer schickt keine Pose — also
 * würde er drüben aus der Liste fallen und der Poseraum meldete „niemand
 * verbunden", während jemand zusieht. Ein `hello` alle drei Sekunden ist die
 * Nachricht, die es dafür schon gibt.
 */
const HELLO_INTERVAL = 3000;

export class LiveLink {
  readonly session = new NetSession();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(
    private readonly onShare: (share: HandShare) => void,
    private readonly onStatus: (status: NetStatus, detail: string) => void,
  ) {
    this.session.role = ROLE;
    this.session.world = 'tune';
    this.session.onStatus((status, detail) => this.onStatus(status, detail));
    // Der Kanal wird **einmal** abonniert und überlebt jedes Verbinden: die
    // Sitzung merkt sich ihre Zuhörer, der Transport wechselt darunter.
    this.session.on(HAND_SHARE_CHANNEL, (data) => {
      const share = parseHandShare(data);
      if (share) this.onShare(share);
    });
  }

  get connected(): boolean {
    return this.session.connected;
  }

  /** Ob gerade ein Verbindungsversuch läuft — der Knopf soll dann nicht doppeln. */
  get connecting(): boolean {
    return this.busy;
  }

  /**
   * In einen Raum, unter einem Namen.
   *
   * @returns den geputzten Raum-Code, damit das Feld ihn übernehmen kann —
   *          „Mond Riff 47" und „mond-riff-47" sind derselbe Raum.
   */
  async connect(room: string, name: string): Promise<string> {
    const code = normalizeRoomCode(room);
    if (!code) throw new Error('Bitte einen Raum-Code eintragen');
    this.busy = true;
    this.session.name = name.trim() || 'Werkzeugseite';
    try {
      await this.session.connect(new TrysteroTransport(), code);
    } finally {
      this.busy = false;
    }
    rememberRoom(code);
    rememberName(this.session.name);
    this.heartbeat ??= setInterval(() => this.session.announce(), HELLO_INTERVAL);
    return code;
  }

  disconnect(): void {
    if (this.heartbeat !== null) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.session.disconnect();
  }
}

/** Eine Bühne mit einer geteilten Hand darauf, wie der Betrachter sie nimmt. */
export interface LiveStage {
  object: THREE.Group;
  dispose(): void;
}

/**
 * Die Bühne zu einer geteilten Haltung: das Werkzeug, und die Hand daran.
 *
 * Gebaut wird mit demselben `createTool` und derselben `GhostHand` wie überall
 * sonst — eine Seite mit eigenen Kopien zeigt irgendwann etwas anderes als das
 * Spiel. Die Hand hängt als **Kind des Werkzeugs**, weil genau das die
 * geteilte Zahl ist: ihre Lage in dessen eigenem Raum.
 */
export class LiveHand {
  private group: THREE.Group | null = null;
  private tool: Tool | null = null;
  private ghost: GhostHand | null = null;
  /** Woraus die stehende Bühne gebaut ist — ändert sie sich, wird neu gebaut. */
  private key = '';

  /**
   * Eine Nachricht auf die Bühne bringen.
   *
   * @returns eine **neue** Bühne, wenn eine gebaut werden musste — der
   *          Aufrufer stellt sie dann auf. Sonst `null`: dann wurde die
   *          stehende nur bewegt, und das Bild läuft ohnehin weiter.
   */
  update(share: HandShare): LiveStage | null {
    const key = `${share.hand}:${share.toolId ?? ''}`;
    const built = key === this.key ? null : this.build(share, key);
    const ghost = this.ghost;
    if (ghost) {
      const at = poseFromReadout({
        x: share.at[0] ?? 0,
        y: share.at[1] ?? 0,
        z: share.at[2] ?? 0,
        pitch: share.at[3] ?? 0,
        yaw: share.at[4] ?? 0,
        roll: share.at[5] ?? 0,
      });
      ghost.position.set(at.position.x, at.position.y, at.position.z);
      ghost.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
      // Die Finger sofort dorthin: eine Hand, die über eine Leitung kommt,
      // wächst nicht erst in ihre Krümmung hinein — sie ist schon dort.
      ghost.setCurls(share.curls);
    }
    return built;
  }

  /** Was gerade steht — `null`, solange nichts angekommen ist. */
  get stage(): THREE.Group | null {
    return this.group;
  }

  private build(share: HandShare, key: string): LiveStage {
    this.key = key;
    const group = new THREE.Group();
    group.name = 'live-hand';
    this.group = group;

    const tool = share.toolId ? createTool(share.toolId) : null;
    this.tool = tool;
    if (tool) {
      // In der Gestalt, die es **in dieser Hand** hat: die Drohne schiebt ihr
      // Deck zur Seite, der Hammer seinen Stiel — ohne das stünde hier ein
      // anderer Gegenstand als drüben.
      tool.showHeldBy(share.hand);
      group.add(tool);
    }

    // **Fest und nicht gläsern**: hier steht kein Geist neben einer echten
    // Hand, hier ist die Hand das, was man ansieht.
    const ghost = new GhostHand(
      share.hand,
      {
        x: 0,
        y: 0,
        z: 0,
        pitch: 0,
        yaw: 0,
        roll: 0,
        curls: [...share.curls],
        spread: share.spread,
      },
      { color: handColor(), opacity: 1 },
    );
    this.ghost = ghost;
    (tool ?? group).add(ghost);

    return {
      object: group,
      dispose: () => {
        // Der Betrachter räumt die Netze der Bühne selbst ab; was er nicht
        // kennt, sind die Leinwände und Zeiger eines Werkzeugs.
        this.tool?.disposeTool();
        this.tool = null;
        this.ghost = null;
        this.group = null;
        this.key = '';
      },
    };
  }
}
