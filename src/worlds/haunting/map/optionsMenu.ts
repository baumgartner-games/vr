/**
 * **Das Optionsmenü — eines für beide Welten.**
 *
 * Die 2D-Welt hatte ihr Zahnrad (`flatMode.renderOptions`): Ansicht, Zuschauen,
 * Aufmachen, Ton, Ansichtswechsel, Runde verlassen. Das Schiff im Browser
 * hatte stattdessen ein Panel mit „Rolle wechseln", „2D von oben" und
 * „Missionsmenü" als lose Knöpfe — dieselben Dinge, anders benannt, anders
 * sortiert. Der Besitzer wollte **ein** Menü: „Das Menü der 3D-Ansicht soll
 * das der 2D-Welt sein, nur im Web, nicht in der Brille."
 *
 * Deshalb steht hier, was ein Optionsmenü *ist* — Überschriften, Hinweise und
 * Knöpfe mit einem `data-*`-Schlüssel, an dem der Wirt erkennt, was gedrückt
 * wurde —, und wie es gezeichnet wird, mit den Klassen der 2D-Welt
 * (`flat.css`: `.flat__panel`, `.flat__option`, `.flat__note`). Welche
 * Einträge darin stehen, sagt der Wirt: `FlatMode` seine, `ShipExperience`
 * die, die im Schiff einen Sinn haben. Die **Namen** der Einträge, die beide
 * haben, stehen hier (`SHARED`), damit sie in beiden Welten gleich heißen.
 *
 * Kein three.js, kein Rundenstand: eine Liste hinein, DOM heraus.
 */

/** Ein Eintrag des Menüs: Überschrift, Hinweiszeile oder Knopf. */
export type OptionItem =
  | { kind: 'head'; text: string }
  | { kind: 'note'; text: string }
  | {
      kind: 'key';
      /** Der Schlüssel, an dem der Wirt den Druck erkennt — als `dataset`, also `switchView: '2d'` → `data-switch-view="2d"`. */
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
  leave: 'Zurück zu den Rollen',
  leaveHint: 'Verlässt die Runde · zurück zum Aufbau und zur Rollenwahl',
  close: 'Weiterspielen',
  playerView: 'wer mitspielt, sieht so viel wie sein Anzug hergibt',
  watchOn: 'Zuschauen: an',
  watchOff: 'Zuschauen: aus',
  watchOnHint: 'Der Techniker aus Zahlen spielt weiter — antippen holt dich zurück an den Stock',
  watchOffHint: 'Der Techniker aus Zahlen übernimmt, du siehst der Runde zu',
} as const;

/** Der Zuschauer-Schalter, in beiden Welten mit denselben Worten. */
export function watchKey(watching: boolean): OptionItem {
  return key(
    { watch: '' },
    watching ? SHARED.watchOn : SHARED.watchOff,
    watching ? SHARED.watchOnHint : SHARED.watchOffHint,
    { active: watching, pressed: watching },
  );
}

/** „Ansicht: 2D ↔ 3D — zu …" — der Wechsel mitten in der Runde, ohne Neustart. */
export function switchViewKey(to: '2d' | '3d', label: string): OptionItem {
  return key(
    { switchView: to },
    `${SHARED.view}: 2D ↔ 3D — zu „${label}"`,
    'Mitten in der Runde · Stand, Uhr, Türen und Monster bleiben',
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
  if (item.kind === 'head') return el('strong', '', item.text);
  if (item.kind === 'note') return el('small', 'flat__note', item.text);
  const node = el('button', `flat__option${item.leave ? ' flat__option--leave' : ''}`);
  for (const [name, value] of Object.entries(item.data)) node.dataset[name] = value;
  if (item.active) node.classList.add('is-active');
  if (item.pressed !== undefined)
    node.setAttribute('aria-pressed', item.pressed ? 'true' : 'false');
  if (item.sub) node.append(el('strong', '', item.label), el('small', '', item.sub));
  else node.textContent = item.label;
  return node;
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
