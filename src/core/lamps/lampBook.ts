/**
 * **Was in dieser Welt an den Lampen eingestellt ist** — der Standard je Typ
 * und die Abweichungen einzelner Lampen. Reine Rechnung, ohne three.js.
 *
 * Es gibt genau ein Buch, das der gerade geladenen Welt (`lampBook`): Die
 * Welt füllt es beim Laden aus ihrer Weltdatei (`GridWorld`, `WorldFile.lamps`)
 * und schreibt es zurück, sobald sich etwas ändert; die Lampen in der Szene
 * (`core/Lamps.ts`) lesen es in jedem Bild. Ein Buch an der Welt statt an der
 * Szene, weil die Einstellungen zur Welt gehören — wer die Stadt verlässt und
 * wiederkommt, findet seine Laternen so, wie er sie verlassen hat.
 *
 * **Eine Lampe wird über ihren Schlüssel gefunden** (`Lamps.keyOf`): Steht sie
 * in einem Spielelement, ist es dessen Kennung und ihre Nummer darin; steht sie
 * frei, ihr Modell und ihr Ort auf zehn Zentimeter. Wer ein Element umstellt,
 * nimmt seine Lampen mit; wer eine frei stehende Lampe verschiebt, lässt ihre
 * Abweichung zurück — sie ist dann eine neue Lampe.
 */

import {
  cleanSettings,
  resolveSettings,
  type LampSettings,
  type ResolvedLamp,
} from './lampBehaviour';
import type { LampType } from './lampTypes';

/** So steht es in der Weltdatei — beide Felder fehlen, wenn nichts eingestellt ist. */
export interface WorldLamps {
  /** Standard je Typ in dieser Welt, nach Typ-Id (`pack/datei`). */
  types?: Record<string, LampSettings>;
  /** Abweichungen einzelner Lampen, nach ihrem Schlüssel. */
  lamps?: Record<string, LampSettings>;
}

/** **Was hervorgehoben wird** — alle Lampen, oder die eines Typs (mit oder ohne Abweichung). */
export type LampHighlight =
  { kind: 'all' } | { kind: 'type'; type: string } | { kind: 'overridden'; type: string | null };

/** Liest den Abschnitt aus einer Datei — Kaputtes fällt weg, statt die Welt mitzunehmen. */
export function cleanWorldLamps(raw: unknown): WorldLamps | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const table = (field: unknown): Record<string, LampSettings> | undefined => {
    if (!field || typeof field !== 'object') return undefined;
    const out: Record<string, LampSettings> = {};
    for (const [key, entry] of Object.entries(field as Record<string, unknown>)) {
      const clean = cleanSettings(entry);
      if (clean && key.length > 0 && key.length < 200) out[key] = clean;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  };
  const types = table(value['types']);
  const lamps = table(value['lamps']);
  if (!types && !lamps) return undefined;
  return { ...(types ? { types } : {}), ...(lamps ? { lamps } : {}) };
}

type Listener = () => void;

export class LampBook {
  private readonly types = new Map<string, LampSettings>();
  private readonly lamps = new Map<string, LampSettings>();
  private readonly listeners = new Set<Listener>();
  /** Was gerade hervorgehoben ist — `null`: nichts. Gehört nicht in die Datei. */
  highlight: LampHighlight | null = null;
  /**
   * **Wer die Lampen im Betrieb _Gesteuert_ schaltet** — eine Frage nach dem
   * Ort: Brennt hier Licht? In der Station ist das das Board (`HauntingWorld`,
   * ob der Raum an der Stelle in `state.lit` steht). `null`: Nichts steuert,
   * und Lampen, die _Bei Nacht_ ab Werk haben, bleiben bei Nacht.
   *
   * Steuert etwas, folgt jede Lampe ihm, an der niemand den Betrieb eingestellt
   * hat (`core/Lamps.ts`, `state`) — eine Lampe in der Station brennt, wenn
   * ihr Raum Licht hat, ohne dass sie jemand eigens auf _Gesteuert_ stellt.
   * Gehört nicht in die Datei; die Welt setzt es nach dem Laden.
   */
  controller: ((x: number, z: number) => boolean) | null = null;
  /** **Alarm** — Lampen mit _Notlicht_ brennen dann rot als Drehlicht. Nicht in der Datei. */
  alarm = false;
  /** Zählt jede Änderung — wer etwas zwischenspeichert, merkt daran, dass es alt ist. */
  version = 0;

  /** Wem das Buch gerade gehört — der Welt, die es zuletzt geladen hat. */
  private owner: unknown = null;

  /**
   * **Den Stand einer Welt übernehmen** (oder leeren). Meldet nichts — es ist
   * Laden, kein Ändern. `owner` ist die Welt: Nur sie darf es wieder freigeben
   * (`release`), auch wenn die alte Welt erst aufräumt, nachdem die neue
   * schon geladen hat.
   */
  load(file: WorldLamps | undefined, owner: unknown = null): void {
    this.owner = owner;
    this.controller = null;
    this.alarm = false;
    this.types.clear();
    this.lamps.clear();
    this.highlight = null;
    for (const [id, settings] of Object.entries(file?.types ?? {})) this.types.set(id, settings);
    for (const [key, settings] of Object.entries(file?.lamps ?? {})) this.lamps.set(key, settings);
    this.version++;
  }

  /** Ob nichts eingestellt ist — dann gilt überall der Standard des Typs. */
  get empty(): boolean {
    return this.types.size === 0 && this.lamps.size === 0;
  }

  /** Ob das Buch gerade dieser Welt gehört. */
  ownedBy(owner: unknown): boolean {
    return this.owner === owner;
  }

  /** Die Welt geht: Gehört ihr das Buch noch, wird es leer. */
  release(owner: unknown): void {
    if (this.owner === owner) this.load(undefined);
  }

  /** Was in die Datei kommt — `undefined`, wenn nichts eingestellt ist. */
  save(): WorldLamps | undefined {
    const types = Object.fromEntries(this.types);
    const lamps = Object.fromEntries(this.lamps);
    const out: WorldLamps = {};
    if (this.types.size > 0) out.types = types;
    if (this.lamps.size > 0) out.lamps = lamps;
    return this.types.size + this.lamps.size > 0 ? out : undefined;
  }

  typeSettings(id: string): LampSettings | undefined {
    return this.types.get(id);
  }

  lampSettings(key: string): LampSettings | undefined {
    return this.lamps.get(key);
  }

  /** Ob diese Lampe etwas Eigenes eingestellt hat. */
  overridden(key: string): boolean {
    return this.lamps.has(key);
  }

  /** Was für diese Lampe gilt, nach allen drei Ebenen. */
  resolve(type: LampType, key: string): ResolvedLamp {
    return resolveSettings(type.defaults, this.types.get(type.id), this.lamps.get(key));
  }

  /**
   * **Den Standard eines Typs in dieser Welt ändern** — `patch` setzt Felder,
   * ein Feld mit `undefined` nimmt es weg, `null` nimmt alles weg.
   */
  setType(id: string, patch: LampSettings | null): void {
    this.apply(this.types, id, patch);
  }

  /** **Eine Lampe abweichen lassen** — dieselben Regeln wie `setType`. */
  setLamp(key: string, patch: LampSettings | null): void {
    this.apply(this.lamps, key, patch);
  }

  /** Die Schlüssel aller Lampen mit Abweichung. */
  overrides(): string[] {
    return [...this.lamps.keys()];
  }

  /** Was hervorgehoben wird — nur fürs Auge, kein Grund zu speichern (meldet nichts). */
  setHighlight(highlight: LampHighlight | null): void {
    this.highlight = highlight;
  }

  /** Wer wissen will, wann sich etwas geändert hat — die Welt, um zu speichern. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private apply(table: Map<string, LampSettings>, key: string, patch: LampSettings | null): void {
    if (patch === null) {
      table.delete(key);
    } else {
      const next: LampSettings = { ...table.get(key) };
      for (const [field, value] of Object.entries(patch) as Array<
        [keyof LampSettings, LampSettings[keyof LampSettings]]
      >) {
        if (value === undefined) delete next[field];
        else (next as Record<string, unknown>)[field] = value;
      }
      if (Object.keys(next).length > 0) table.set(key, next);
      else table.delete(key);
    }
    this.version++;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** **Das Buch der geladenen Welt** — eines für alle, wie die Grafikeinstellung. */
export const lampBook = new LampBook();
