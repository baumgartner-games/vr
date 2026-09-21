/**
 * **Die Version der Spielwiese** — die Zahl, die auf der Startseite steht.
 *
 * `0.<Build>.<Patch>`, und sie kommt aus `package.json`: eine Zahl, die an
 * zwei Stellen steht, ist an einer davon falsch. Vite setzt sie beim Bauen
 * ein (`vite.config.ts`, `define`), wie die Build-Nummer nebenan
 * (`core/assetVersion.ts`) — und wie die ist sie in einem Jest-Lauf leer,
 * weshalb hier `typeof` steht und keine Abfrage auf den Wert.
 *
 * **Erhöht wird sie bei jedem Pull Request** (der Patch), und die CI sieht
 * nach: Ein Deploy, dessen Version dieselbe ist wie die davor, ist für den,
 * der davorsitzt, nicht von ihm zu unterscheiden. Genau dafür ist die Zahl
 * da — „Ich möchte auf der Startseite eine Versionsnummer sehen."
 */

declare const __APP_VERSION__: string | undefined;

/** Was in `package.json` steht, oder `''` (Jest, `vite dev` ohne `define`). */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

/**
 * **Was auf der Startseite steht.**
 *
 * `v0.1.1 · Build 96ba100782ea` — die Version für den Menschen, die
 * Build-Nummer für den Fehlerbericht: Zwei Geräte mit derselben Version
 * können aus verschiedenen Builds laufen (ein Deploy, der nichts an der
 * Version geändert hat, oder ein Telefon, das noch aus seinem Speicher
 * startet), und dann ist der Commit das Einzige, was die beiden
 * unterscheidet.
 *
 * Fehlt eines von beidem, fällt es weg statt als leere Stelle dazustehen;
 * fehlt beides, bleibt die Zeile leer und verschwindet damit ganz
 * (`.landing__version:empty`).
 */
export function versionLine(version: string, build: string): string {
  const parts: string[] = [];
  if (version) parts.push(`v${version}`);
  if (build) parts.push(`Build ${build}`);
  return parts.join(' · ');
}
