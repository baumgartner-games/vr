import {
  MY_ROLES,
  MY_ROLE_HINTS,
  MY_ROLE_LABELS,
  SEAT_LABELS,
  isColour,
  isWatcher,
  roleName,
  seatAbilities,
  type MyRole,
  type RoundSetup,
} from '../rules/roundSetup';
import { el } from './roleShell';

/**
 * **Die sieben Reiter, die „wer bin ich" beantworten** — einmal gebaut, an
 * zwei Stellen gezeigt: über der Karte des Telefons (`stationUi.ts`) und im
 * Kopf der 2D-Welt (`roleStrip.ts`).
 *
 * Bis hierher hatten die beiden verschiedene Reiter. Das Telefon zeigte die
 * Plätze — Techniker, Rot, Gelb, Blau, Monster, die zwei Zuschauer —, die
 * 2D-Welt dagegen die Karten der Registry: Archiv, Schalttafel, Späher. Wer
 * im Test auf dem Telefon Rot war und in der Mission am Stock stand, sah oben
 * zwei verschiedene Zeilen für dieselbe Frage. Der Besitzer wollte **eine**:
 * die Optik der 2D-Welt (Knöpfe in einem Panel), mit den Plätzen darin, so
 * wie sie in einer Test-Runde heißen.
 *
 * **Zwei Zeilen je Pille**, damit sieben davon in ein Panel passen: oben der
 * Platz („Rot"), darunter klein, was er hält („Archiv") — und beim Zuschauer
 * oben „Zuschauer", darunter „Techniker" oder „Alles". „Rot · Archiv" in
 * einer Zeile war das, was auf dem Telefon nicht in den Kopf passte.
 */
export interface RoleTab {
  id: MyRole;
  /** Die erste Zeile: der Platz. */
  name: string;
  /** Die zweite Zeile: was der Platz hält, oder wem der Zuschauer folgt. `''` ohne. */
  sub: string;
  /** Der Titel des Knopfs. */
  hint: string;
}

/** Die sieben Reiter, gelesen aus der Tafel — ohne Tafel ohne Fähigkeiten. */
export function roleTabs(setup: RoundSetup | null): RoleTab[] {
  return MY_ROLES.map((id) => {
    if (isColour(id)) {
      const abilities = setup ? seatAbilities(setup, id) : [];
      const off = setup?.seats[id].who === 'off';
      return {
        id,
        name: SEAT_LABELS[id],
        sub: roleName(abilities) || '—',
        hint: off
          ? 'In dieser Runde aus — antippen setzt dich trotzdem hin'
          : abilities.length === 0
            ? 'Ohne Fähigkeit: im Aufbau eine zuweisen'
            : MY_ROLE_HINTS[id],
      };
    }
    if (isWatcher(id))
      return {
        id,
        name: 'Zuschauer',
        sub: id === 'watch:technician' ? 'Techniker' : 'Alles',
        hint: MY_ROLE_HINTS[id],
      };
    return { id, name: MY_ROLE_LABELS[id], sub: '', hint: MY_ROLE_HINTS[id] };
  });
}

export interface RoleTabState {
  /** Ob das der eigene Platz ist — gelb umrandet. */
  mine: boolean;
  /** Ob dieser Reiter gerade aufgeschlagen ist — hell hinterlegt. */
  open: boolean;
  /** Warum er gerade nicht geht — dann steht er abgeschaltet da, mit dem Grund als Titel. */
  blocked?: string;
}

/**
 * **Ein Reiter als Knopf** (`role-strip__key`): `data-role` trägt die Kennung;
 * wer ihn einhängt, gibt ihm seinen eigenen Schlüssel dazu (`data-me` auf dem
 * Telefon, `data-role-strip` in der 2D-Welt).
 */
export function roleTabKey(tab: RoleTab, state: RoleTabState): HTMLButtonElement {
  const key = el('button', 'role-strip__key');
  key.dataset['role'] = tab.id;
  key.append(el('strong', '', tab.name));
  if (tab.sub) key.append(el('small', '', tab.sub));
  key.classList.toggle('is-mine', state.mine);
  key.classList.toggle('is-active', state.open);
  key.setAttribute('aria-pressed', String(state.open));
  key.setAttribute('aria-label', tab.sub ? `${tab.name} · ${tab.sub}` : tab.name);
  key.title = state.blocked ?? tab.hint;
  if (state.blocked) key.disabled = true;
  return key;
}
