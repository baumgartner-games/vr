import { el } from '../ui/dom';
import { head as uiHead, optionKey, pillKey } from '../ui/widgets';
import { SIMULATION_SPEEDS, clampSimulationSpeed, simulationSpeedLabel } from '../simulationSpeed';

/**
 * **Das Optionsmenü des Schiffs im Browser** (`ShipExperience.shipOptions`).
 *
 * Es war einmal das Zahnrad der gemalten 2D-Welt und wurde dann das eine Menü
 * für beide Welten — der Besitzer wollte kein zweites mit anderen Namen. Die
 * 2D-Welt ist weg (`docs/plan-haunting-1m.md`); geblieben ist die Form:
 * Überschriften, Hinweise und Knöpfe mit einem `data-*`-Schlüssel, an dem der
 * Wirt erkennt, was gedrückt wurde, gezeichnet aus den Bausteinen von
 * `ui/widgets.ts` (`ui-head`, `ui-option`) und der Hinweiszeile (`flat__note`,
 * `haunting.css`). Welche Einträge darin stehen, sagt der Wirt; die Namen der
 * festen Einträge stehen hier (`SHARED`).
 *
 * Kein three.js, kein Rundenstand: eine Liste hinein, DOM heraus.
 */

/** Ein Knopf in einer Reihe (`OptionItem` `row`): eine Wahl aus wenigen Werten. */
export interface OptionChoice {
  data: Record<string, string>;
  label: string;
  /** Leuchtet, wenn das der gewählte Wert ist. */
  active?: boolean;
}

/** Ein Eintrag des Menüs: Überschrift, Hinweiszeile, Knopf — oder eine Reihe kleiner Knöpfe. */
export type OptionItem =
  | { kind: 'head'; text: string }
  | { kind: 'note'; text: string }
  | {
      /**
       * Eine Reihe Pillen nebeneinander, eine je Wert — für Wahlen wie das
       * Tempo, bei denen sechs Listenknöpfe untereinander das halbe Menü
       * wären und ein Knopf, der reihum zählt, fünf Drücke für einen Wechsel.
       */
      kind: 'row';
      choices: OptionChoice[];
    }
  | {
      kind: 'key';
      /** Der Schlüssel, an dem der Wirt den Druck erkennt — als `dataset`, also `watch: ''` → `data-watch`. */
      data: Record<string, string>;
      label: string;
      sub?: string;
      /** Leuchtet, wenn das die gewählte Einstellung ist. */
      active?: boolean;
      /** Als `aria-pressed` — für Schalter mit an/aus. */
      pressed?: boolean;
      /** Der rote Rand: Damit verlässt man die Runde. */
      leave?: boolean;
    };

export const head = (text: string): OptionItem => ({ kind: 'head', text });
export const note = (text: string): OptionItem => ({ kind: 'note', text });
export const row = (choices: OptionChoice[]): OptionItem => ({ kind: 'row', choices });
export const key = (
  data: Record<string, string>,
  label: string,
  sub = '',
  more: { active?: boolean; pressed?: boolean; leave?: boolean } = {},
): OptionItem => ({ kind: 'key', data, label, ...(sub ? { sub } : {}), ...more });

/**
 * **Was in beiden Welten gleich heißt.** Ein Menü, das dieselbe Sache
 * zweimal verschieden nennt, ist zwei Menüs.
 */
export const SHARED = {
  view: 'Ansicht',
  open: 'Aufmachen',
  menu: 'Menü',
  net: 'Verbindung',
  netHint: 'Raum-Code, Mitspieler, Sprache und Chat',
  sound: 'Ton',
  effects: 'Effekte',
  effectsHint: 'Schritte, Monster, Herzschlag',
  ambient: 'Ambiente',
  ambientHint: 'Brummen der Station, Dunkelheit, Knarren',
  leave: 'Rollen & Aufbau',
  leaveHint: 'Zurück zur Tafel: Plätze verteilen, dann Übungsrunde oder echte Runde',
  close: 'Weiterspielen',
  playerView: 'wer mitspielt, sieht so viel wie sein Anzug hergibt',
  watchOn: 'Zuschauen: an',
  watchOff: 'Zuschauen: aus',
  watchOnHint: 'Der Techniker aus Zahlen spielt weiter — antippen holt dich zurück an den Stock',
  watchOffHint: 'Der Techniker aus Zahlen übernimmt, du siehst der Runde zu',
  speed: 'Simulationsgeschwindigkeit',
  speedHint: 'Die Bot-Runde im Zeitraffer — mehr Bilder je Bild, nie längere Schritte',
} as const;

/**
 * **Das Tempo der Bot-Runde** (`simulationSpeed.ts`): eine Überschrift, ein
 * Satz und die sechs Stufen als Reihe, die gewählte leuchtet. Der Wirt liest
 * `data-speed` und stellt die Stufe ein. Nur in der Bot-Runde: Eine Runde,
 * in der ein Mensch spielt, hat kein Tempo zum Einstellen.
 */
export function speedKeys(current: number): OptionItem[] {
  const chosen = clampSimulationSpeed(current);
  return [
    head(SHARED.speed),
    note(SHARED.speedHint),
    row(
      SIMULATION_SPEEDS.map((speed) => ({
        data: { speed: String(speed) },
        label: simulationSpeedLabel(speed),
        active: speed === chosen,
      })),
    ),
  ];
}

/** Der Zuschauer-Schalter, in beiden Welten mit denselben Worten. */
export function watchKey(watching: boolean): OptionItem {
  return key(
    { watch: '' },
    watching ? SHARED.watchOn : SHARED.watchOff,
    watching ? SHARED.watchOnHint : SHARED.watchOffHint,
    { active: watching, pressed: watching },
  );
}

/** Die zwei Tonregler mit drei Stufen (Paket Audio, `audio/settings.ts`). */
export function soundKeys(levels: { effects: string; ambient: string }): OptionItem[] {
  return [
    head(SHARED.sound),
    key({ audio: 'effects' }, `${SHARED.effects}: ${levels.effects}`, SHARED.effectsHint),
    key({ audio: 'ambient' }, `${SHARED.ambient}: ${levels.ambient}`, SHARED.ambientHint),
  ];
}

/** Die zwei letzten Zeilen: hinaus, oder weiter. */
export function leaveKeys(): OptionItem[] {
  return [
    key({ leave: '' }, SHARED.leave, SHARED.leaveHint, { leave: true }),
    key({ closeOptions: '' }, SHARED.close),
  ];
}

/** Das Menü in ein Element zeichnen — alles Alte darin wird ersetzt. */
export function renderOptions(root: HTMLElement, items: readonly OptionItem[]): void {
  root.replaceChildren(...items.map(build));
}

function build(item: OptionItem): HTMLElement {
  if (item.kind === 'head') return uiHead(item.text);
  if (item.kind === 'note') return el('small', 'flat__note', item.text);
  if (item.kind === 'row') {
    const line = el('div', 'ui-row');
    line.setAttribute('role', 'group');
    line.append(
      ...item.choices.map((choice) =>
        pillKey({
          text: choice.label,
          data: choice.data,
          active: !!choice.active,
          pressed: !!choice.active,
        }),
      ),
    );
    return line;
  }
  const spec = {
    data: item.data,
    ...(item.active !== undefined ? { active: item.active } : {}),
    ...(item.pressed !== undefined ? { pressed: item.pressed } : {}),
    ...(item.leave ? { tone: 'leave' as const } : {}),
  };
  return item.sub
    ? optionKey({ ...spec, label: item.label, sub: item.sub })
    : optionKey({ ...spec, text: item.label });
}
