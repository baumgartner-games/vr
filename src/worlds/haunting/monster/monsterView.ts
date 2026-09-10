import type { RoleHost, RoleView } from '../registry/roles';
import { Joystick } from '../map/joystick';
import { MapView } from '../map/mapView';
import { MONSTER_ID } from '../map/flatRound';
import type { MapSnapshot } from '../map/mapSnapshot';
import {
  computeVisibility,
  LitCache,
  NOISE_SPRINT,
  NOISE_WALK,
  type VisibilityField,
} from '../map/visibility';
import { clockText } from '../rules/roundRules';
import { monsterPortOf, type MonsterPort } from './monsterDriver';

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
 * Gesteuert wird wie in der 2D-Welt: Stock links, rechts zwei Knöpfe —
 * **Angreifen** und **Interagieren** (Klappe, Tür). Steht das Monster vor
 * einer Klappe mit zwei Zielen, erscheint eine Reihe Knöpfe mit den
 * Raumnamen. Der Port dazu kommt aus `host.extra` (`monsterDriver.ts`); ohne
 * Port ist die Ansicht ein Zuschauerfenster in die Wahrnehmung des Monsters.
 */
export interface MonsterRoleView extends RoleView {
  /** Was die Karte gerade zeigt — für Tests. */
  readonly current: MapView['current'];
}

export function mountMonsterView(host: RoleHost): MonsterRoleView {
  return new MonsterView(host);
}

/** Wie viel leiser Gehen ist als Rennen — wie in `map/flatRound.ts`. */
const WALK_NOISE = 0.45;

class MonsterView implements MonsterRoleView {
  readonly element = el('div', 'monster');
  private readonly map: MapView;
  private readonly stick = new Joystick();
  private readonly hud = el('div', 'monster__hud');
  private readonly buttons = el('div', 'monster__buttons');
  private readonly attackKey = el('button', 'monster__key monster__key--attack');
  private readonly actKey = el('button', 'monster__key monster__key--act');
  private readonly ventKeys = el('div', 'monster__vents');
  private readonly toast = el('div', 'monster__toast');
  private readonly port: MonsterPort | null;
  private readonly cache = new LitCache();
  private toastLeft = 0;
  private hudText = '';
  private ventText = '';

  constructor(private readonly host: RoleHost) {
    this.port = monsterPortOf(host);
    this.port?.claim();
    this.map = new MapView({
      mode: 'realistic',
      markers: 'live',
      minScale: 6,
      maxScale: 60,
      onRoomClick: (id) =>
        this.say(host.snapshot().rooms.find((room) => room.id === id)?.name ?? id),
    });
    this.map.element.classList.add('monster__map');
    this.map.setView({ scale: 22 });
    this.map.follow(MONSTER_ID);
    this.attackKey.dataset['action'] = 'attack';
    this.actKey.dataset['action'] = 'interact';
    this.buttons.append(this.attackKey, this.actKey);
    this.buttons.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement | null)?.closest('button');
      const action = key?.dataset['action'];
      if (action !== 'attack' && action !== 'interact') return;
      const answer = this.port?.act(action) ?? '';
      if (answer) this.say(answer);
      this.refreshKeys();
    });
    this.ventKeys.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement | null)?.closest('button');
      if (!key || key.dataset['vent'] === undefined) return;
      this.port?.chooseVent(Number(key.dataset['vent']));
      this.refreshVents(true);
    });
    this.ventKeys.hidden = true;
    this.stick.element.classList.add('monster__stick');
    this.element.append(
      this.map.element,
      this.hud,
      this.toast,
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
    this.toastLeft = Math.max(0, this.toastLeft - dt);
    if (this.toastLeft <= 0 && this.toast.textContent) this.toast.textContent = '';
    this.renderHud(snapshot, field);
    this.refreshKeys();
    this.refreshVents(false);
  }

  /**
   * Das Sichtbarkeitsfeld aus der Sicht des Monsters, plus das Hören: Wer
   * sich in Hörweite bewegt und nicht schon zu sehen ist, bekommt einen
   * Geräuschring an seiner Stelle.
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
      const gap = Math.hypot(entity.at.x - me.at.x, entity.at.z - me.at.z);
      const reach = me.sense.hearing * (entity.sprinting ? 1 : WALK_NOISE);
      if (gap > reach) continue;
      field.noise.push({
        entityId: entity.id,
        at: { ...entity.at },
        radius: entity.sprinting ? NOISE_SPRINT : NOISE_WALK,
        cause: entity.sprinting ? 'sprint' : 'walk',
      });
    }
    return field;
  }

  private say(text: string): void {
    this.toast.textContent = text;
    this.toastLeft = 3;
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
                    : 'Nichts zu hören.'
                : 'Zuschauer: die Runde rechnet das Monster selbst.';
    const text = `${parts.join(' · ')}\n${line}`;
    if (text === this.hudText) return;
    this.hudText = text;
    this.hud.replaceChildren(el('strong', '', parts.join(' · ')), el('span', '', line));
  }

  private refreshKeys(): void {
    const status = this.port?.status();
    const prompt = status?.prompt ?? '';
    this.attackKey.textContent = '';
    this.attackKey.append(el('small', '', 'Angreifen'), el('strong', '', 'Zuschlagen'));
    this.attackKey.disabled = !this.port || status?.ride !== 'out';
    this.actKey.textContent = '';
    this.actKey.append(el('small', '', 'Interagieren'), el('strong', '', prompt || '—'));
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
      ...targets.map((target) => {
        const key = el('button', 'monster__vent', target.label);
        key.dataset['vent'] = String(target.index);
        return key;
      }),
    );
  }

  dispose(): void {
    this.port?.release();
    this.stick.dispose();
    this.map.dispose();
    this.element.remove();
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
