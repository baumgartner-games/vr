/**
 * **Sammelt alle `*.register.ts` unter `haunting/` ein** — einmal, beim
 * ersten Import.
 *
 * Das ist die eine Datei, die Vite-spezifisch ist (`import.meta.glob`), und
 * deshalb importiert sie **niemand aus einem Test**: Jest kennt kein
 * `import.meta`. Tests rufen ihre `register`-Funktionen selbst auf. Die Welt
 * (`HauntingWorld`) importiert diese Datei einmal, und damit stehen alle
 * Rollen, Modi und Assets aller Pakete in ihren Registries — ohne dass ein
 * Paket eine Zeile in einer fremden Datei braucht.
 *
 * Ein neues Paket legt also `src/worlds/haunting/<paket>/<name>.register.ts`
 * an, importiert dort `registerRole`/`registerViewMode`/`registerAsset` und
 * ruft sie auf Modulebene auf. Fertig.
 */
const found = import.meta.glob('../**/*.register.ts', { eager: true });

/** Wie viele Dateien angemeldet wurden — für die Konsole, nicht fürs Spiel. */
export const REGISTERED_FILES: readonly string[] = Object.keys(found).sort();
