import * as THREE from 'three';
import type { LampInstance, LampState } from '../../core/Lamps';
import {
  LAMP_COLORS,
  LAMP_COLOR_LABELS,
  LAMP_EFFECTS,
  LAMP_EFFECT_LABELS,
  LAMP_EFFECT_SUBS,
  LAMP_MODES,
  LAMP_MODE_LABELS,
  LAMP_MODE_SUBS,
  nextOf,
  type LampSettings,
} from '../../core/lamps/lampBehaviour';
import { lampBook, type LampHighlight } from '../../core/lamps/lampBook';
import type { MenuEntry } from '../../ui/menu';
import { elementById, hasElement } from '../elements/elementCatalog';
import { elementFacts, elementPurpose, footprintLabel } from '../elements/elementFacts';

/**
 * **Was man im Einrichten angeklickt hat** — Rechtsklick am Schirm, Trigger in
 * der Brille, langes Drücken am Handy (`GridWorld.inspectAt`).
 *
 * Gewünscht: _„Im Bau und Einrichtungs Modus will ich mit rechtsklick auf
 * Elemente ein Menü öffnen wo ich weiteres darüber erfahren kann oder
 * einstellen kann. In vr mit trigger bei mobile Touch länger gedrückt
 * halten."_ Ein Element ist dabei ein Spielelement (seine Hülle heißt
 * `element:<kennung>`, `elementView.ts`) oder ein Modell, das eine Lampe ist.
 */
export interface InspectTarget {
  /** Die Hülle des Spielelements, falls es eines ist. */
  readonly element: THREE.Object3D | null;
  /** Die Lampe, falls eine getroffen wurde (`core/Lamps.ts`). */
  readonly lamp: LampInstance | null;
  /** Ein Tor mit Flügeln aus dem Regal, falls eines getroffen wurde (`props.isLockableGate`). */
  readonly gate?: InspectGate;
}

/** **Ein Tor im Element-Menü** — abschließen oder aufschließen (`PortalWorld.setGateLocked`). */
export interface InspectGate {
  readonly object: THREE.Object3D;
  readonly label: string;
  locked(): boolean;
  setLocked(locked: boolean): void;
}

export interface InspectHost {
  /** Alle Lampen der Szene — für die Zahlen beim Finden. */
  lamps(): readonly LampInstance[];
  /** Was die Lampe gerade tut (`Lamps.state`) — sagt die Zeile ganz oben. */
  state(lamp: LampInstance): LampState | null;
  /** Eine Zeile unten im Bild. */
  notify(message: string): void;
  /** Das Menü zu, damit man sieht, was markiert ist. */
  closeMenu(): void;
  /**
   * **Die nächste Fassung** eines Elements, das sich tauschen lässt (Straße
   * mit Laternen, `GameElement.swap`) — `null`: keine. `swap` tauscht.
   */
  swapOf(spot: string): string | null;
  swap(spot: string): void;
}

/** Die Id der Seite — sie hängt versteckt im Menü und wird aufgeschlagen (`openSubmenu`). */
export const INSPECT_PAGE = 'grid:inspect';

const ACCENT = 0xe0b04a;

/** Der Titel der Seite: die Lampe, das Element, oder ein Modell. */
export function inspectTitle(target: InspectTarget): string {
  if (target.lamp) return target.lamp.type.label;
  if (target.gate) return target.gate.label;
  const id = elementIdOf(target.element);
  return id && hasElement(id) ? elementById(id).label : 'Element';
}

/** Die Element-Id an einer Hülle (`elementView.ts`). */
export function elementIdOf(object: THREE.Object3D | null): string | null {
  const id = object?.userData.elementId;
  return typeof id === 'string' ? id : null;
}

/** **Die Zeilen der Seite** — oben, was es ist; darunter, bei einer Lampe, ihr Licht. */
export function inspectRows(target: InspectTarget, host: InspectHost): MenuEntry[] {
  const rows: MenuEntry[] = [...infoRows(target)];
  // **Fassung tauschen** — früher ein Druck auf die Laterne im Vorbeigehen,
  // jetzt nur hier: im Einrichten, gewollt (`stationLayer.add`).
  const spot = target.element?.userData.elementSpot;
  const next = typeof spot === 'string' ? host.swapOf(spot) : null;
  if (typeof spot === 'string' && next && hasElement(next)) {
    rows.push({
      id: `${INSPECT_PAGE}:swap`,
      label: `Fassung tauschen → ${elementById(next).label}`,
      sub: 'Dieselbe Stelle, die nächste Fassung — reihum',
      icon: 'lamp',
      accent: ACCENT,
      run: () => {
        host.closeMenu();
        host.swap(spot);
      },
    });
  }
  if (target.lamp) rows.push(...lampRows(target.lamp, host));
  if (target.gate) rows.push(gateRow(target.gate, host));
  return rows;
}

/**
 * **Abschließen oder aufschließen** — gewünscht: _„dass Türen an sich ein
 * Schloss Element (das gibt es in modelregal) hängen haben, wenn die Tür
 * verschlossen ist"_. Ein Druck schaltet um und macht das Menü zu, damit man
 * Schloss und Flügel sieht.
 */
function gateRow(gate: InspectGate, host: InspectHost): MenuEntry {
  const locked = gate.locked();
  return {
    id: `${INSPECT_PAGE}:lock`,
    label: locked ? 'Aufschließen' : 'Abschließen',
    sub: locked
      ? 'Abgeschlossen: Flügel zu, Schloss daran, niemand kommt durch'
      : 'Offen: angelehnt, schwingt vor dem Spieler auf',
    icon: 'sign',
    accent: ACCENT,
    run: () => {
      gate.setLocked(!locked);
      host.notify(locked ? `${gate.label} aufgeschlossen` : `${gate.label} abgeschlossen`);
      host.closeMenu();
    },
  };
}

function infoRows(target: InspectTarget): MenuEntry[] {
  const rows: MenuEntry[] = [];
  const id = elementIdOf(target.element);
  if (id && hasElement(id)) {
    const element = elementById(id);
    rows.push({
      id: `${INSPECT_PAGE}:element`,
      label: element.label,
      sub: `${elementPurpose(element)} · ${footprintLabel(element)}`,
      icon: 'sign',
      accent: ACCENT,
      // Der Steckbrief aus dem Katalog hinter dem ⓘ — dasselbe Bild mit den
      // gesperrten Zellen (`PortalWorld.ELEMENT_CELLS`) und dieselben Zeilen.
      full: true,
      detail: { preview: `element-cells:${id}`, facts: elementFacts(id) },
    });
  }
  const where = target.lamp?.object ?? target.element ?? target.gate?.object ?? null;
  if (where) {
    const p = where.getWorldPosition(_where);
    const model = target.lamp ? `${target.lamp.type.id}.glb · ` : '';
    rows.push({
      id: `${INSPECT_PAGE}:where`,
      label: target.lamp ? 'Modell und Ort' : 'Ort',
      sub: `${model}x ${p.x.toFixed(1)} · z ${p.z.toFixed(1)} · Höhe ${p.y.toFixed(1)} m`,
      icon: 'sign',
      accent: ACCENT,
    });
  }
  return rows;
}

const _where = new THREE.Vector3();

/**
 * **Das Licht einer Lampe** — diese Lampe, alle ihres Typs in der Welt, und
 * Finden. Jede Zeile schaltet bei jedem Druck eine Stufe weiter, wie die
 * übrigen Einstellungen im Menü.
 */
function lampRows(lamp: LampInstance, host: InspectHost): MenuEntry[] {
  const { type, key } = lamp;
  const resolved = lampBook.resolve(type, key);
  const own = lampBook.lampSettings(key);
  const world = lampBook.typeSettings(type.id);
  const all = host.lamps();
  const sameType = all.filter((one) => one.type.id === type.id);
  const changed = sameType.filter((one) => lampBook.overridden(one.key));
  const source = (field: keyof LampSettings): string =>
    own?.[field] !== undefined
      ? 'eigene Einstellung'
      : world?.[field] !== undefined
        ? `Standard für ${type.label} in dieser Welt`
        : 'ab Werk';
  const id = (name: string): string => `${INSPECT_PAGE}:${name}`;
  const now = host.state(lamp);
  // Was gerade wirklich gilt — mit Board, Spuk und Alarm (`Lamps.state`).
  const live = now ?? { burns: false, ...resolved, alarm: false };
  const why = now?.alarm
    ? ' · Notlicht: Alarm'
    : live.mode !== resolved.mode
      ? ' · folgt dem Board'
      : live.effect !== resolved.effect
        ? ' · flackert im Spuk'
        : '';
  const rows: MenuEntry[] = [
    {
      id: id('state'),
      label: live.burns ? 'Brennt gerade' : 'Ist gerade dunkel',
      sub: `${LAMP_MODE_LABELS[live.mode]} · ${LAMP_EFFECT_LABELS[live.effect]} · Farbe ${LAMP_COLOR_LABELS[live.color]}${why}${own ? ' · weicht ab' : ''}`,
      icon: 'lamp',
      accent: ACCENT,
    },
    // --- diese Lampe ---------------------------------------------------------
    {
      id: id('mode'),
      label: `Diese Lampe · Betrieb: ${LAMP_MODE_LABELS[resolved.mode]}`,
      sub: `${LAMP_MODE_SUBS[resolved.mode]} · ${source('mode')}`,
      caption: 'Bei Nacht → Immer an → Aus → Schalter → Gesteuert',
      icon: 'lamp',
      accent: ACCENT,
      run: () => lampBook.setLamp(key, { mode: nextOf(LAMP_MODES, resolved.mode) }),
    },
  ];
  if (resolved.mode === 'switch') {
    rows.push({
      id: id('switch'),
      label: `Diese Lampe · Schalter: ${resolved.on ? 'An' : 'Aus'}`,
      sub: 'Umlegen wie einen Lichtschalter',
      icon: 'lamp',
      accent: ACCENT,
      run: () => lampBook.setLamp(key, { on: !resolved.on }),
    });
  }
  rows.push(
    {
      id: id('effect'),
      label: `Diese Lampe · Lichtart: ${LAMP_EFFECT_LABELS[resolved.effect]}`,
      sub: `${LAMP_EFFECT_SUBS[resolved.effect]} · ${source('effect')}`,
      caption: 'Ruhig → Flackern → Blinken → Drehlicht → Pulsieren → Ampel',
      icon: 'lamp',
      accent: ACCENT,
      run: () => lampBook.setLamp(key, { effect: nextOf(LAMP_EFFECTS, resolved.effect) }),
    },
    {
      id: id('color'),
      label: `Diese Lampe · Farbe: ${LAMP_COLOR_LABELS[resolved.color]}`,
      sub: `Ampelfarben bleiben, wie sie sind · ${source('color')}`,
      icon: 'lamp',
      accent: ACCENT,
      run: () => lampBook.setLamp(key, { color: nextOf(LAMP_COLORS, resolved.color) }),
    },
  );
  rows.push({
    id: id('emergency'),
    label: `Diese Lampe · Notlicht: ${resolved.emergency ? 'Ja' : 'Nein'}`,
    sub: `Bei Alarm in der Station rot als Drehlicht · ${source('emergency')}`,
    icon: 'lamp',
    accent: ACCENT,
    run: () => lampBook.setLamp(key, { emergency: !resolved.emergency }),
  });
  if (own) {
    rows.push({
      id: id('reset'),
      label: 'Diese Lampe zurück auf Standard',
      sub: `Gilt dann wieder, was für ${type.label} in dieser Welt eingestellt ist`,
      icon: 'lamp',
      accent: ACCENT,
      run: () => {
        lampBook.setLamp(key, null);
        host.notify(`${type.label}: wieder Standard`);
      },
    });
  }
  // --- alle dieses Typs in der Welt -----------------------------------------
  const typeMode = world?.mode ?? type.defaults.mode ?? 'night';
  const typeEffect = world?.effect ?? type.defaults.effect ?? 'steady';
  const typeColor = world?.color ?? type.defaults.color ?? 'auto';
  const typeEmergency = world?.emergency ?? type.defaults.emergency ?? false;
  const plural = `Alle vom Typ ${type.label} (${sameType.length})`;
  rows.push(
    {
      id: id('type-mode'),
      label: `${plural} · Betrieb: ${LAMP_MODE_LABELS[typeMode]}`,
      sub: `Standard in dieser Welt · ${world?.mode ? 'geändert' : 'ab Werk'} · eigene Einstellungen bleiben`,
      icon: 'lamp',
      accent: ACCENT,
      run: () => lampBook.setType(type.id, { mode: nextOf(LAMP_MODES, typeMode) }),
    },
    {
      id: id('type-effect'),
      label: `${plural} · Lichtart: ${LAMP_EFFECT_LABELS[typeEffect]}`,
      sub: `Standard in dieser Welt · ${world?.effect ? 'geändert' : 'ab Werk'}`,
      icon: 'lamp',
      accent: ACCENT,
      run: () => lampBook.setType(type.id, { effect: nextOf(LAMP_EFFECTS, typeEffect) }),
    },
    {
      id: id('type-color'),
      label: `${plural} · Farbe: ${LAMP_COLOR_LABELS[typeColor]}`,
      sub: `Standard in dieser Welt · ${world?.color ? 'geändert' : 'ab Werk'}`,
      icon: 'lamp',
      accent: ACCENT,
      run: () => lampBook.setType(type.id, { color: nextOf(LAMP_COLORS, typeColor) }),
    },
  );
  rows.push({
    id: id('type-emergency'),
    label: `${plural} · Notlicht: ${typeEmergency ? 'Ja' : 'Nein'}`,
    sub: `Standard in dieser Welt · ${world?.emergency !== undefined ? 'geändert' : 'ab Werk'}`,
    icon: 'lamp',
    accent: ACCENT,
    run: () => lampBook.setType(type.id, { emergency: !typeEmergency }),
  });
  if (world) {
    rows.push({
      id: id('type-reset'),
      label: `Standard für ${type.label} zurücksetzen`,
      sub: 'Alle dieses Typs wieder wie ab Werk — eigene Einstellungen bleiben',
      icon: 'lamp',
      accent: ACCENT,
      run: () => {
        lampBook.setType(type.id, null);
        host.notify(`${type.label}: Standard ab Werk`);
      },
    });
  }
  // --- finden ----------------------------------------------------------------
  const show = (highlight: LampHighlight, count: number, what: string): void => {
    lampBook.setHighlight(highlight);
    host.closeMenu();
    host.notify(
      count > 0 ? `${count} ${what} markiert · Gelb: weicht ab` : `Keine ${what} in dieser Welt`,
    );
  };
  rows.push(
    {
      id: id('find-changed'),
      label: `Finden: ${type.label} mit eigener Einstellung (${changed.length})`,
      sub: 'Markiert sie durch Wände hindurch — gelb',
      icon: 'xray',
      accent: ACCENT,
      run: () =>
        show({ kind: 'overridden', type: type.id }, changed.length, `${type.label} mit Abweichung`),
    },
    {
      id: id('find-type'),
      label: `Finden: alle vom Typ ${type.label} (${sameType.length})`,
      sub: 'Türkis wie der Standard, gelb mit eigener Einstellung',
      icon: 'xray',
      accent: ACCENT,
      run: () => show({ kind: 'type', type: type.id }, sameType.length, type.label),
    },
    {
      id: id('find-all'),
      label: `Finden: alle Lampen (${all.length})`,
      sub: 'Jede Lampe der Welt, durch Wände hindurch',
      icon: 'xray',
      accent: ACCENT,
      run: () => show({ kind: 'all' }, all.length, 'Lampen'),
    },
  );
  if (lampBook.highlight) {
    rows.push({
      id: id('find-off'),
      label: 'Markierung aus',
      icon: 'xray',
      accent: ACCENT,
      run: () => {
        lampBook.setHighlight(null);
        host.notify('Markierung aus');
      },
    });
  }
  return rows;
}
