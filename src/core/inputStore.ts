/**
 * **Wo die Belegung liegt** — `localStorage`, und sonst nirgends.
 *
 * Getrennt von `inputMap.ts` aus demselben Grund, aus dem `handPoseStore.ts`
 * von `handPose.ts` getrennt ist: Die Rechnung soll ein Test nachrechnen
 * können, ohne dass ein Browser darum herum steht. Hier steht deshalb nur das
 * Lesen, das Schreiben und die Nachricht an die, die es angeht.
 *
 * **Das Gerät entscheidet, nicht der Raum.** Die Belegung wandert ausdrücklich
 * **nicht** in den Konfig-Code (`configCode.ts`), der zwischen Geräten
 * verschickt wird — genauso wenig wie die Grafikstufe. Eine Gerätekarte, die
 * einen Treiberfehler eines Backbones am iPhone ausgleicht, wäre an einem
 * DualSense am PC schlicht falsch, und ein Code, der sie mitbringt, machte aus
 * einer Hilfe einen Fehler.
 */

import {
  defaultInputConfig,
  parseInputConfig,
  serializeInputConfig,
  type InputConfig,
} from './inputMap';

const KEY = 'bgvr.inputs';

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Einmal gelesen und dann gehalten: Die Belegung wird **je Bild** gebraucht
 * (`FlatControls`), und `localStorage` ist eine synchrone Datei — sechzigmal je
 * Sekunde darin nachzusehen ist genau die Art Kleinigkeit, die auf einem
 * Telefon eine Bildrate kostet, die niemand mehr einem Speicherzugriff
 * zuordnet.
 */
let cached: InputConfig | null = null;

/** Die geltende Belegung — Standard, solange niemand etwas verstellt hat. */
export function inputConfig(): InputConfig {
  if (cached) return cached;
  try {
    cached = parseInputConfig(globalThis.localStorage?.getItem(KEY));
  } catch {
    // Ein privates Fenster ohne Speicher ist kein Fehler, sondern ein Gerät
    // ohne Gedächtnis: Es spielt mit der Standardbelegung.
    cached = defaultInputConfig();
  }
  return cached;
}

/**
 * **Verstellen, speichern, weitersagen.** Der neue Stand kommt zurück, damit
 * der Aufrufer ihn nicht noch einmal holen muss — und er gilt auch dann, wenn
 * das Speichern scheitert: Wer im privaten Fenster etwas einstellt, soll es
 * für diese Sitzung haben und nicht eine Fehlermeldung.
 */
export function saveInputConfig(config: InputConfig): InputConfig {
  cached = config;
  try {
    globalThis.localStorage?.setItem(KEY, serializeInputConfig(config));
  } catch {
    // Siehe oben.
  }
  for (const listener of listeners) listener();
  return config;
}

/** Alles zurück auf Standard — Belegungen **und** Gerätekarten. */
export function clearInputConfig(): InputConfig {
  cached = defaultInputConfig();
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Siehe oben.
  }
  for (const listener of listeners) listener();
  return cached;
}

/**
 * Wer auf eine Änderung hört. `FlatControls` tut es, damit eine Belegung
 * sofort gilt und nicht erst beim nächsten Weltwechsel — wer einen Knopf neu
 * legt, will ihn danach drücken und nicht neu laden.
 */
export function onInputConfigChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Nur für Tests: das Gedächtnis dieses Moduls vergessen. */
export function forgetInputConfig(): void {
  cached = null;
}
