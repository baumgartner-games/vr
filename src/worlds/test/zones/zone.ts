import type * as THREE from 'three';
import type { WorldContext } from '../../../core/types';
import type { Usable } from '../../../core/usable';
import type { ConstructOptions } from '../../shared/construct';
import type { PhysicsBody, PhysicsWorld } from '../../../physics/PhysicsWorld';
import type { RoutineHost } from '../../npc/NpcRoutine';
import type { Npc } from '../../npc/Npc';

/**
 * **Was eine Zone von der Welt bekommt — und mehr nicht.**
 *
 * Neun Zonen liegen in dieser Welt nebeneinander, und jede davon will Körper
 * bauen, Gegenstände anmelden und dem Spieler etwas sagen. Der naheliegende
 * Weg wäre gewesen, ihnen die `TestWorld` selbst in die Hand zu geben — und
 * damit hätte jede Zone Zugriff auf den Editor, die Portale, das Menü und die
 * Physik-Einstellungen. Nach dem dritten Umbau hätte eine davon etwas daran
 * verstellt, und niemand wüsste welche.
 *
 * Dieselbe Entscheidung wie bei den Einbauten (`grid/fixtures/index.ts`,
 * `FixtureBuild`) und aus demselben Grund: Ein Ding, das nur bauen und melden
 * darf, kann man lesen, ohne die halbe Welt danebenzulegen.
 *
 * `TestWorld` erfüllt diesen Vertrag und reicht dabei genau die Handgriffe
 * ihrer Basis durch, die eine Zone wirklich braucht.
 */
export interface ZoneHost {
  /** Woran eine Zone ihre Objekte hängt — die Gruppe der Welt. */
  readonly root: THREE.Object3D;
  readonly physics: PhysicsWorld;

  /**
   * **Einen Gegenstand anmelden** (`PortalWorld.registerProp`): Er ist damit
   * greifbar, teilbar und wird von `B`/`Y` an seinen Platz zurückgestellt.
   */
  addProp(entry: PhysicsBody, id: string): PhysicsBody;

  /**
   * **Und einen Gegenstand wieder heraus** (`PortalWorld.removeProp`) — Körper,
   * Netz und die ganze Buchhaltung der Welt dazu.
   *
   * Dasselbe Zugeständnis wie `removeSolid` weiter unten und aus demselben
   * Grund: Fast alles in dieser Welt meldet einmal an und lässt stehen. Der
   * Schießstand tut es nicht — eine zersprungene Scheibe hinterlässt sechs
   * Stücke, und `B`/`Y` räumt sie wieder weg (`zones/range.ts`).
   *
   * Warum nicht `physics.remove` und daneben selbst aufräumen: An einem
   * angemeldeten Gegenstand hängt ein halbes Dutzend Zettel der Welt — die
   * Liste, gegen die Hände und Kugeln prüfen, seine Kennung im Netz, sein
   * Rückstellpunkt für genau dieses `B`/`Y`. Wer nur den Körper nähme, ließe
   * alle liegen; und ein Körper, den Rapier nicht mehr kennt und die Welt
   * noch, reißt beim nächsten Bild die ganze wasm mit
   * (`PhysicsBody.removed`).
   *
   * Die **Materialien** einer Regalkopie gehören dabei weiter dem Aufrufer:
   * Das Aufräumen der Welt endet an `userData.sharedAssets`
   * (`worlds/shared/environment.ts`, `disposeTree`), weil die Geometrie
   * darunter der Vorlage gehört und allen anderen Kopien.
   */
  removeProp(entry: PhysicsBody): void;

  /**
   * **Etwas Festes hinstellen**: Körper in der Physik und Eintrag in der Liste,
   * gegen die Strahlen geprüft werden (Kletterwand, Reifenstapel, Pfosten).
   *
   * Gibt den Körper zurück, weil manches daran noch ein Gelenk braucht — die
   * Scheibe hängt an ihrem Pfosten.
   */
  addSolid(object: THREE.Object3D): PhysicsBody;

  /**
   * **Und wieder heraus** — der Körper aus der Physik, das Objekt aus der
   * Liste, gegen die Strahlen prüfen.
   *
   * Es gibt genau einen Grund für diesen Handgriff, und der ist der Baumodus
   * der Küche (`zones/kitchenBuild.ts`): Wer ein Möbel aufhebt und anderswo
   * hinstellt, lässt sonst seine alte Wand stehen — eine unsichtbare Sperre
   * auf einer Kachel, auf der nichts mehr steht, und die findet niemand
   * wieder. Alles andere in dieser Welt stellt einmal hin und lässt stehen.
   */
  removeSolid(object: THREE.Object3D, body: PhysicsBody): void;

  /** **Etwas benutzbar machen** — `A` in jeder Ansicht (`core/usable.ts`). */
  addUsable(
    object: THREE.Object3D,
    usable: Usable,
    options?: { radius?: number; shot?: number; half?: number },
  ): void;
  removeUsable(object: THREE.Object3D): void;

  /**
   * **Den Konstrukt-Raum aufmachen** (`worlds/shared/construct.ts`) — der
   * weiße Raum, in dem man aussucht, während die Figur draußen stehen bleibt.
   *
   * Er gehört der **Welt** und nicht der Zone, obwohl die Küche ihn aufmacht:
   * Er blendet alles aus, was nicht der Anker ist, und das ist mehr, als eine
   * Zone kennt — der Kleiderschrank steht in der Startzone, die Möbel stehen
   * in der Küche, der Boden gehört der Welt. Zwei Räume nebeneinander hießen
   * zwei Meinungen darüber, was gerade sichtbar ist, und die zweite gewönne
   * beim Verlassen.
   *
   * Die Zone reicht deshalb nur ihre Auswahl herein und bekommt zurück, ob
   * gerade einer offen steht — mehr braucht sie nicht, und mehr bekommt sie
   * nicht.
   */
  enterConstruct(options: ConstructOptions): void;
  leaveConstruct(): void;
  inConstruct(): boolean;

  /** Eine Zeile ans Handgelenk. */
  notify(message: string): void;
  /** Dieselbe Zeile, aber als Meldung der Welt (`PortalWorld.announce`). */
  announce(message: string): void;

  /** Alles, wogegen ein Strahl prüfen darf — Boden, Wände, was Zonen hinstellen. */
  readonly solids: readonly THREE.Object3D[];

  /**
   * **Eine Zahl eintippen lassen** (`PortalWorld.askNumber`) — der Zifferblock
   * vor dem Kopf.
   *
   * Er gehört der Welt und nicht der Zone: Es darf immer nur einer offen sein,
   * und er hängt am Zeiger.
   */
  askNumber(options: {
    title: string;
    sub?: string;
    hint?: string;
    value: string;
    commit(value: number): void;
  }): void;

  /** Den Spieler versetzen — zurück auf die Matte, aus dem Kart heraus. */
  placePlayer(at: THREE.Vector3, yaw?: number): void;

  /**
   * **Den Körper fliegen lassen** (`PhysicsLocomotion.setFlight`) — die eine
   * Tür, durch die Klettern und Sprungkissen den Spieler führen. `null` gibt
   * ihn der Schwerkraft zurück und übernimmt dabei den letzten Schwung.
   */
  setFlight(velocity: THREE.Vector3 | null): void;
  /** Wie schnell er gerade fällt, und ob er steht. */
  playerVelocity(target: THREE.Vector3): THREE.Vector3;
  onGround(): boolean;

  /**
   * **Einen NPC von A nach B schicken** (`worlds/npc/NpcDirector.ts`).
   *
   * Zwei Punkte und sonst nichts: Welches Hirn und welche Haut er dabei
   * bekommt, entscheidet die Welt — eine Zone, die sich ihren NPC selbst
   * zusammenstellte, hätte einen, der anders läuft als jeder andere im Spiel.
   *
   * @returns der, der losgelaufen ist — oder `null`
   */
  sendNpc(from: THREE.Vector3, to: THREE.Vector3): Npc | null;
  /** Und alle wieder wegräumen. Gibt zurück, wie viele das waren. */
  clearNpcs(): number;
  /**
   * **Die zwei Handgriffe für ein Verhalten mit eigenen NPCs**
   * (`npc/NpcRoutine.ts`): setzen und wegräumen — oder `null`, wenn die Welt
   * keinen Regisseur hat. Die Sitzecke lässt damit ihre Besucher herein
   * (`zones/seating.ts`).
   */
  npcRoutineHost(): RoutineHost | null;
}

/**
 * **Eine Zone mit Leben darin.**
 *
 * Die meisten Zonen sind nur ein Stempel auf dem Grundriss (`stamp<Name>`) und
 * brauchen nichts davon — eine Tür weiß selbst, wie sie aufgeht. Wo eine Zone
 * Requisiten hat oder eine Uhr laufen lässt (Kart, Schießstand, Klettern,
 * Navigation), steht daneben eine Klasse mit diesen vier Handgriffen, und
 * `TestWorld` ruft sie der Reihe nach auf.
 */
export interface TestZone {
  /** Einmal beim Bauen der Welt. */
  build(ctx: WorldContext, world: ZoneHost): void;
  /** Jedes Bild — wo es etwas zu rechnen gibt. */
  update?(dt: number, ctx: WorldContext): void;
  /** Was `B`/`Y` in dieser Zone zurücksetzt (`PortalWorld.worldReset`). */
  reset?(): void;
  /** Beim Verlassen der Welt: eigene Materialien, Formen und Anmeldungen. */
  dispose(): void;
}
