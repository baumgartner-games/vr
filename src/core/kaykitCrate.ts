/**
 * **Die Kisten des Regals stehen auf einem Deckel** — dieselbe Änderung, die
 * die Küche an ihren Vorratskisten vorgenommen hat, nur an der Quelle.
 *
 * Reine Zeichenkettenarbeit, ohne three.js und ohne Datei: Der Lader
 * (`core/kaykitModel.ts`) fragt hier nach, ob zu einer Adresse noch ein
 * zweites Netz gehört, und baut beide zusammen. Dieselbe Teilung wie bei
 * `core/kaykitFit.ts` daneben — eine Regel, die nirgends nachgerechnet wird,
 * driftet.
 *
 * ## Warum überhaupt
 *
 * Eine Kiste aus `restaurant-bits` ist 0,40 m hoch, eine Arbeitsplatte 0,50 m
 * (`core/kitchenFit.ts`, `CRATE_PLINTH`). In der Küche stand deshalb jede
 * Kiste eine Handbreit unter der Zeile daneben — eine Stufe, die niemand
 * erklären kann, und zu tief zum Hineingreifen. Die Antwort dort war ein
 * **Kistendeckel als Sockel**: derselbe Baukasten, dasselbe Holz, dieselbe
 * Kante, und oben schließt alles bündig ab.
 *
 * Im Regal stand dieselbe Kiste weiterhin ohne Sockel, und das ist genau der
 * Bruch, den man beim Einrichten sieht: Wer aus dem Regal eine Kiste neben
 * eine Küchenzeile stellt, bekommt die Stufe zurück, die in der Küche gerade
 * weggerechnet wurde. Also gilt die Änderung jetzt für **jede** Kiste aus
 * diesem Paket — in der Kachel des Menüs, in der Hand und auf dem Boden.
 *
 * **Der Deckel selbst bekommt keinen**: Er *ist* der Sockel, und ein Deckel
 * auf einem Deckel wäre ein Brett von 0,20 m, das niemand bestellt hat.
 */

/** Das Paket, aus dem die Kisten kommen — dasselbe wie `core/dinerFit.ts`. */
export const CRATE_PACK = 'restaurant-bits';

/** Der Deckel, der unter jede Kiste kommt — ein Brett mit umlaufendem Band. */
export const CRATE_LID_PATH = `${CRATE_PACK}/crate_lid.glb`;

/**
 * **Was unter diese Adresse gehört**, oder `null` — und `null` ist die
 * Antwort für 4469 der 4470 Dateien.
 *
 * Erkannt wird an Paket und Dateinamen und nicht an einer Liste: `crate.glb`,
 * `crate_buns.glb`, `crate_steak.glb` — was in diesem Paket mit `crate`
 * anfängt, ist eine Kiste. Eine Liste mit vierzehn Namen wäre die, die beim
 * fünfzehnten Paket-Update auseinanderläuft.
 */
export function kaykitPlinth(path: string): string | null {
  if (path === CRATE_LID_PATH) return null;
  const cut = path.lastIndexOf('/');
  if (cut < 0) return null;
  if (path.slice(0, cut) !== CRATE_PACK) return null;
  const file = path.slice(cut + 1).toLowerCase();
  if (!file.startsWith('crate')) return null;
  if (!file.endsWith('.glb') && !file.endsWith('.gltf')) return null;
  return CRATE_LID_PATH;
}
