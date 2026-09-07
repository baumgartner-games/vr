import {
  readWorld,
  writeWorld,
  type WorldContents,
  type WorldFile,
  type WorldMeta,
} from './worldFile';
import { worldFileName } from './worldFile';
import type { GridPlan } from './gridPlan';

/**
 * **Wo eine gebaute Welt liegt** — im Browser, und auf der Festplatte, wenn
 * jemand sie mitnehmen will.
 *
 * Zwei Wege, und sie sind nicht dasselbe:
 *
 * - **Der Speicher** (`localStorage`) ist kein Archiv, sondern die Antwort auf
 *   eine einzige Frage: *Wer zwanzig Minuten baut und die Brille absetzt, soll
 *   seine Welt wiederfinden.* Er hält je Welt genau einen Stand, überlebt den
 *   Neustart und ist an dieses Gerät und diesen Browser gebunden. Er darf
 *   jederzeit weg sein (privates Fenster, abgeschaltete Cookies, aufgeräumter
 *   Browser), und nichts hier darf daran abstürzen.
 * - **Die Datei** ist das Archiv. Sie geht per Download vom Gerät herunter und
 *   per Dateiauswahl wieder hinein, sie hat eine Versionsnummer
 *   (`worldFile.ts`) und ist damit das Einzige, was ein Umbau vom nächsten
 *   Browser, vom nächsten Rechner und von der nächsten Programmfassung
 *   trennt.
 *
 * Beide schreiben **dasselbe Format**. Ein Speicher mit einem eigenen,
 * kürzeren Format wäre das zweite Format neben dem ersten, und das zweite
 * Format ist immer das, das eine Kleinigkeit vergisst.
 */

/** Der Schlüssel, unter dem eine Welt im Browser liegt. */
export function worldKey(id: string): string {
  return `vr-welt:${id}`;
}

/**
 * **Eine Welt in den Browser schreiben.**
 *
 * Gibt zurück, ob es geklappt hat — und das ist keine Formsache: Ein privates
 * Fenster hat keinen Speicher, und ein Editor, der daran abstürzt, ist
 * schlimmer als einer, der vergisst. Wer `false` bekommt, sagt es dem
 * Menschen, statt so zu tun, als sei etwas gesichert.
 */
export function keepWorld(id: string, plan: GridPlan, meta: WorldMeta = {}): boolean {
  try {
    const file = writeWorld(plan, { world: id, ...meta });
    window.localStorage.setItem(worldKey(id), JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

/**
 * **Was im Browser liegt** — oder `null`, wenn dort nichts (Brauchbares)
 * steht.
 *
 * Eine kaputte Zeile im Speicher wird **weggeworfen und nicht gemeldet**: Sie
 * kommt aus einer Fassung, die es nicht mehr gibt, niemand kann etwas daran
 * tun, und die Welt soll trotzdem aufmachen. Bei einer Datei, die jemand
 * bewusst auswählt, ist es genau andersherum (`readWorld` wirft dort) — dort
 * *will* man wissen, warum sie nicht geht.
 */
export function storedWorld(id: string): WorldContents | null {
  let raw: unknown;
  try {
    const text = window.localStorage.getItem(worldKey(id));
    if (!text) return null;
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  try {
    return readWorld(raw);
  } catch {
    return null;
  }
}

/** Ob für diese Welt etwas im Browser liegt. */
export function hasStoredWorld(id: string): boolean {
  try {
    return window.localStorage.getItem(worldKey(id)) !== null;
  } catch {
    return false;
  }
}

/** Den gespeicherten Stand wegwerfen — die Welt macht danach wieder im Original auf. */
export function forgetWorld(id: string): void {
  try {
    window.localStorage.removeItem(worldKey(id));
  } catch {
    // Kein Speicher, also auch nichts zu vergessen.
  }
}

// --- die Datei --------------------------------------------------------------

/**
 * **Eine Welt herunterladen.**
 *
 * Ein `Blob`, ein Link, ein Klick, und der Link wieder weg. Das ist der ganze
 * Weg, den ein Browser für „speichere das als Datei" anbietet — es gibt keinen
 * kürzeren, und der `URL.revokeObjectURL` am Ende ist der Teil, den man
 * vergisst: Ohne ihn behält die Seite jede exportierte Welt im Speicher, bis
 * sie neu geladen wird.
 *
 * Gibt den Dateinamen zurück, damit die Meldung sagen kann, wonach zu suchen
 * ist. In der Brille sieht man von einem Download nichts — deshalb ist die
 * Meldung dort das Einzige, was passiert, und sie muss stimmen.
 */
export function downloadWorld(plan: GridPlan, meta: WorldMeta = {}): string {
  const saved = meta.saved ?? new Date().toISOString();
  const file = writeWorld(plan, { ...meta, saved });
  const name = worldFileName({ ...meta, saved });
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return name;
}

/**
 * **Eine Welt von der Festplatte holen.**
 *
 * Ein Dateidialog geht nur aus einer echten Benutzeraktion heraus auf — das
 * ist eine Regel des Browsers und keine dieses Programms. Aufgerufen wird das
 * hier deshalb aus dem Menü und nicht aus einem Zeitgeber.
 *
 * Der Fehlerfall geht an denselben Rückruf wie der Erfolg, nur mit einer
 * Meldung statt einer Welt: Wer eine Datei auswählt, hat eine Erwartung, und
 * ein stilles Nichts wäre die schlechteste aller Antworten.
 */
export function pickWorld(done: (result: WorldContents | Error) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    void file
      .text()
      .then((text) => done(readWorld(JSON.parse(text) as unknown)))
      .catch((error: unknown) => done(error instanceof Error ? error : new Error(String(error))));
  });
  // Ein abgebrochener Dialog meldet in manchen Browsern gar nichts. Das Feld
  // bliebe dann für immer im Dokument hängen — unsichtbar, aber es bleibt.
  input.addEventListener('cancel', () => input.remove());
  input.click();
}

export type { WorldFile, WorldContents };
