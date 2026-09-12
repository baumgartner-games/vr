import type { RoleHost, RoleView } from '../registry/roles';
import { Joystick } from '../map/joystick';
import { MapView } from '../map/mapView';
import { MONSTER_ID } from '../map/flatRound';
import { roomAtPoint, type MapSnapshot } from '../map/mapSnapshot';
import { ghostAgeText, ghostsToDraw } from '../rules/ghosts';
import {
  computeVisibility,
  LitCache,
  NOISE_SPRINT,
  NOISE_WALK,
  type VisibilityField,
} from '../map/visibility';
import { clockText } from '../rules/roundRules';
import { Hearing } from '../audio/hearing';
import { stepLoudness } from '../audio/cues';
import { hearNoises } from '../threat';
import { PLAYER_SPRINT_SPEED, PLAYER_WALK_SPEED } from '../mission';
import { monsterPortOf, type MonsterPort } from './monsterDriver';
import { clickedKey, el } from '../ui/dom';
import { Toast, captioned, pillKey } from '../ui/widgets';

/**
 * **Die Monster-Rolle** — die Station von oben, aber nur, was das Monster
 * wahrnimmt.
 *
 * Die Karte ist eine `MapView` im Modus `realistic` aus der Sicht des
 * Monsters (`viewerId: 'monster'`): sein eigener Sichtkegel, die Räume nur,
 * wo Licht ist, der Techniker nur, wenn er im Licht und im Kegel steht und
 * keine Wand dazwischen ist — dasselbe Modell, mit dem die Runde entscheidet,
 * ob es ihn sieht (`map/visibility.ts`). **Dazu das Hören**, das das Modell
 * nicht kennt: Wer sich in Hörweite bewegt, wird als Geräuschring
 * gezeichnet, nicht als Marker — man weiß, *dass* dort jemand geht, nicht
 * genau, wo.
 *
 * Gesteuert wird wie in der 2D-Welt: Stock links, rechts **ein** Knopf —
 * „Interagieren". Zuschlagen ist keiner: Wer in Reichweite steht, wird
 * getroffen (`monsterHelm.ts`). Der Knopf gilt immer dem **nächsten** Ding —
 * Klappe, Kabine oder gesperrte Tür —, und genau dieses hebt die Karte als
 * pulsierenden Ring hervor, damit man weiß, was er tut, bevor man ihn
 * drückt. Steht das Monster vor einer Klappe mit zwei Zielen, erscheint eine
 * Reihe Knöpfe mit den Raumnamen. Der Port dazu kommt aus `host.extra`
 * (`monsterDriver.ts`); ohne Port ist die Ansicht ein Zuschauerfenster in die
 * Wahrnehmung des Monsters.
 */
export interface MonsterRoleView extends RoleView {
  /** Was die Karte gerade zeigt — für Tests. */
  readonly current: MapView['current'];
}

export function mountMonsterView(host: RoleHost): MonsterRoleView {
  return new MonsterView(host);
}

class MonsterView implements MonsterRoleView {
  readonly element = el('div', 'monster');
  private readonly map: MapView;
  /** Dasselbe Hörmodell, mit dem die Runde das Monster hören lässt (`audio/hearing.ts`). */
  private readonly hearing = new Hearing();
  private readonly stick = new Joystick();
  private readonly hud = el('div', 'monster__hud');
  private readonly buttons = el('div', 'monster__buttons');
  private readonly actKey = el('button', 'monster__key monster__key--act');
  private readonly ventKeys = el('div', 'monster__vents');
  private readonly toast = new Toast('monster__toast');
  private readonly port: MonsterPort | null;
  private readonly cache = new LitCache();
  private hudText = '';
  private ventText = '';

  constructor(private readonly host: RoleHost) {
    this.port = monsterPortOf(host);
    this.port?.claim();
    this.map = new MapView({
      mode: 'realistic',
      markers: 'live',
      // Das Monster kennt sein Netz: Bögen von Klappe zu Klappe mit dem Ziel daran.
      layers: { vents: true },
      viewerId: MONSTER_ID,
      minScale: 6,
      maxScale: 60,
      // Das nächste Ding in Reichweite als pulsierender Ring — Klappe,
      // Kabine oder Tür, immer nur eines (`monsterHelm.nearestTarget`).
      highlight: () => {
        const target = this.port?.target?.() ?? null;
        return target && target.kind !== 'ride' ? { at: target.at, label: target.label } : null;
      },
      onRoomClick: (id) =>
        this.say(host.snapshot().rooms.find((room) => room.id === id)?.name ?? id),
    });
    this.map.element.classList.add('monster__map');
    this.map.setView({ scale: 22 });
    this.map.follow(MONSTER_ID);
    this.actKey.dataset['action'] = 'interact';
    this.buttons.append(this.actKey);
    this.buttons.addEventListener('click', (event) => {
      if (clickedKey(event)?.dataset['action'] !== 'interact') return;
      const answer = this.port?.act('interact') ?? '';
      if (answer) this.say(answer);
      this.refreshKeys();
    });
    this.ventKeys.addEventListener('click', (event) => {
      const key = clickedKey(event);
      if (!key || key.dataset['vent'] === undefined) return;
      this.port?.chooseVent(Number(key.dataset['vent']));
      this.refreshVents(true);
    });
    this.ventKeys.hidden = true;
    this.stick.element.classList.add('monster__stick');
    this.element.append(
      this.map.element,
      this.hud,
      this.toast.element,
      this.stick.element,
      this.ventKeys,
      this.buttons,
    );
    this.element.dataset['control'] = this.port ? 'player' : 'watch';
    this.refreshKeys();
  }

  /** Wo die Karte hinschaut — für Tests. */
  get current(): MapView['current'] {
    return this.map.current;
  }

  update(dt: number): void {
    if (this.port) {
      const stick = this.stick.value;
      this.port.input({ x: stick.x, z: stick.z, sprint: stick.sprint });
    }
    const snapshot = this.host.snapshot();
    const field = this.perceive(snapshot);
    this.map.setSnapshot(snapshot);
    this.map.setVisibility(field);
    this.map.draw();
    this.toast.step(dt);
    this.renderHud(snapshot, field);
    this.refreshKeys();
    this.refreshVents(false);
  }

  /**
   * Das Sichtbarkeitsfeld aus der Sicht des Monsters, plus das Hören: Wer
   * sich in Hörweite bewegt und nicht schon zu sehen ist, bekommt einen
   * Geräuschring — dort, woher es zu kommen scheint (die Tür, die Klappe),
   * gerechnet mit demselben Hörmodell wie die Runde (`audio/hearing.ts`).
   */
  perceive(snapshot: MapSnapshot): VisibilityField {
    const field = computeVisibility(
      { snapshot, mode: 'realistic', viewerId: MONSTER_ID },
      this.cache,
    );
    const me = snapshot.entities.find((entity) => entity.id === MONSTER_ID);
    if (!me?.sense || me.concealed) return field;
    for (const entity of snapshot.entities) {
      if (entity.id === me.id || entity.concealed || !entity.moving) continue;
      if (field.visibleEntities.includes(entity.id)) continue;
      const loudness = stepLoudness(entity.sprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED);
      const [noise] = hearNoises(this.hearing, snapshot, me.at, [{ at: entity.at, loudness }]);
      if (!noise) continue;
      field.noise.push({
        entityId: entity.id,
        at: { ...noise.from },
        radius: entity.sprinting ? NOISE_SPRINT : NOISE_WALK,
        cause: entity.sprinting ? 'sprint' : 'walk',
      });
    }
    return field;
  }

  private say(text: string): void {
    this.toast.say(text);
    this.host.notify(text);
  }

  private renderHud(snapshot: MapSnapshot, field: VisibilityField): void {
    const status = this.port?.status();
    const me = snapshot.entities.find((entity) => entity.id === MONSTER_ID);
    const label = status?.label ?? me?.label ?? 'Monster';
    const round = snapshot.round;
    const parts = [label];
    if (round) parts.push(`O₂ ${clockText(round.oxygen)}`);
    if (round) parts.push(`Anzug ${round.suit}/${round.suitMax}`);
    const ride = status?.ride ?? 'out';
    const line =
      ride === 'entering'
        ? 'Einsteigen …'
        : ride === 'riding'
          ? `Im Schacht · ${Math.round((status?.progress ?? 0) * 100)} %`
          : ride === 'arrived'
            ? 'Angekommen. Aussteigen?'
            : ride === 'exiting'
              ? 'Aussteigen …'
              : this.port
                ? field.noise.length
                  ? 'Schritte in Hörweite.'
                  : field.visibleEntities.length > 1
                    ? 'Beute in Sicht.'
                    : (this.lastSeen(snapshot, field) ?? 'Nichts zu hören.')
                : 'Zuschauer: die Runde rechnet das Monster selbst.';
    const text = `${parts.join(' · ')}\n${line}`;
    if (text === this.hudText) return;
    this.hudText = text;
    this.hud.replaceChildren(el('strong', '', parts.join(' · ')), el('span', '', line));
  }

  /**
   * **„Zuletzt gesehen: Werkstatt · vor 6 s"** (`rules/ghosts.ts`, Paket M3b).
   *
   * Der Marker steht ohnehin auf der Karte; die Zeile daneben sagt das, was
   * ein Ring nicht sagen kann: **wie alt** die Erinnerung ist. Genau daran
   * hängt die Entscheidung — sechs Sekunden heißt „er ist noch da drüben",
   * zwanzig heißt „er ist längst zwei Räume weiter".
   *
   * Welchen Marker das Monster sehen darf, entscheidet nicht diese Ansicht,
   * sondern die Regel für alle vier (`ghostsToDraw`): Hier ist der Blick
   * realitätsnah, also nur der Marker des Technikers, und nur solange es ihn
   * nicht wirklich sieht.
   */
  private lastSeen(snapshot: MapSnapshot, field: VisibilityField): string | null {
    const [mark] = ghostsToDraw(snapshot.ghosts, snapshot.time, {
      omniscient: false,
      viewer: 'monster',
      visible: () => field.visibleEntities.length > 1,
    });
    if (!mark) return null;
    const room = roomAtPoint(snapshot, mark.ghost);
    return `Zuletzt gesehen: ${room?.name ?? 'irgendwo'} · ${ghostAgeText(mark.ghost, snapshot.time)}`;
  }

  private refreshKeys(): void {
    const status = this.port?.status();
    const prompt = status?.prompt ?? '';
    this.actKey.replaceChildren(...captioned('Interagieren', prompt || '—'));
    this.actKey.disabled = !this.port || !prompt;
    this.actKey.classList.toggle('is-ready', !!prompt);
  }

  private refreshVents(force: boolean): void {
    const targets = this.port?.ventTargets() ?? [];
    const text = targets.map((target) => target.label).join('|');
    if (!force && text === this.ventText) return;
    this.ventText = text;
    this.ventKeys.hidden = targets.length === 0;
    this.ventKeys.replaceChildren(
      el('small', '', 'Schacht nach'),
      ...targets.map((target) =>
        pillKey({ text: target.label, data: { vent: String(target.index) } }, 'monster__vent'),
      ),
    );
  }

  dispose(): void {
    this.port?.release();
    this.stick.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
