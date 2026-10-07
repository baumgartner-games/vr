import type { MenuFact } from '../../ui/menu';
import { ITEM_LABELS, type KitchenItem } from '../test/zones/kitchenRecipes';
import {
  elementById,
  type ElementKind,
  type ElementPart,
  type GameElement,
} from './elementCatalog';
import { onCells, spotCells, spotFootprintCells, type ElementSpot } from './elementPlace';

/**
 * **Der Steckbrief eines Spielelements** — was hinter dem ⓘ einer Kachel im
 * Möbelkatalog steht (`PortalWorld.elementMenu`, `ui/menu.MenuDetail`).
 *
 * Gewünscht: _„Bei den Möbeln übrigens will ich wie im Model Regal noch die
 * Details sehen, aus welchen Modellen das besteht und auch wie das Grid bzw
 * die Position ist von dem ganzen (Grid Flächen Belegung)"_. Also dreierlei:
 * die **Grundfläche** auf dem Zellgitter (Kacheln, Zellen, als kleines Bild
 * aus Zeichen), der **Körper** und der **Zweck**, und dann **jedes Teil** mit
 * seiner Adresse im Regal (zum Kopieren, wie im Regal) und wo es sitzt.
 *
 * Rein: kein three.js, kein Laden. Das Bild dazu — dieselben Zellen rot unter
 * dem Modell — baut `elementView.elementCellsOverlay`.
 */

/** Eine gesperrte Zelle im Bild der Belegung. */
export const CELL_BLOCKED = '■';

/** Was man mit einem Element tut, in Worten — was fehlt, heißt wie seine Art. */
const KIND_WORDS: Partial<Record<ElementKind, string>> = {
  top: 'Ablage — hinlegen und wieder nehmen',
  bin: 'Mülleimer — Essen hinein, Teller und Topf abräumen',
  crate: 'Vorratskiste — gibt aus, so oft man will',
  board: 'Brett',
  stove: 'Herd — brät in der Pfanne, kocht im Topf mit Wasser',
  sink: 'Waschbecken — füllt den Topf, den man davorhält',
  drain: 'Stapel — gibt aus und wird nie leer',
};

/** Ein Maß, wie man es liest: zwei Nachkommastellen und ein Komma. */
function metres(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} m`;
}

/** Eine Zahl ohne überflüssige Nullen, mit Komma. */
function number(value: number): string {
  return String(Math.round(value * 1000) / 1000).replace('.', ',');
}

/** Ein Ding der Küche beim Namen — oder, wenn es keines ist, so, wie es dasteht. */
function itemLabel(item: string): string {
  return (ITEM_LABELS as Partial<Record<string, string>>)[item as KitchenItem] ?? item;
}

/** Was das Element tut, in einem Satz. */
export function elementPurpose(element: GameElement): string {
  // **Was `A` daran aufmacht** (`GameElement.opens`) — sonst stand beim Sofa
  // „steht nur im Weg", obwohl man darauf sitzt.
  if (element.kind === null && element.opens) return OPENS_WORDS[element.opens];
  if (element.kind === null) return 'keiner — steht nur im Weg';
  if (element.kind === 'board') {
    return element.work === 'roll'
      ? 'Brett — rollt Teig aus'
      : 'Brett — schneidet, was man auflegt';
  }
  return KIND_WORDS[element.kind] ?? element.kind;
}

/** Was ein Element ohne Stationsart mit `A` tut (`GameElement.opens`). */
const OPENS_WORDS: Readonly<Record<NonNullable<GameElement['opens']>, string>> = {
  outfit: 'Garderobe — öffnet Aussehen',
  hide: 'Versteck — hineinsteigen',
  swap: 'Fassung tauschen — im Einrichten',
  sit: 'Sitzen — hinsetzen mit A',
  hologram: 'Hologramm — Modell wählen mit A',
  light: 'Lampe — an und aus mit A',
  lid: 'Truhe — aufklappen und herausnehmen mit A',
  tap: 'Fass — etwas herausnehmen mit A',
  unwrap: 'Geschenk — auspacken mit A',
  roll: 'Würfel — werfen mit A',
};

/**
 * **Die Grundfläche in Worten** — `2 × 2 Kacheln`, `1 × 1 Kachel`, und für
 * ein Element auf Zellen (`elementPlace.onCells`) in Zellen: `1 Zelle`.
 */
export function footprintLabel(element: GameElement): string {
  const [w, d] = element.tiles;
  if (onCells(element)) {
    const [cw, cd] = [w * 2, d * 2];
    return cw * cd === 1 ? '1 Zelle' : `${cw} × ${cd} Zellen`;
  }
  return `${w} × ${d} ${w * d === 1 ? 'Kachel' : 'Kacheln'}`;
}

/**
 * **Die Belegung als Bild aus Zeichen** — eine Zeile je Zellreihe, von Norden
 * nach Süden, eine Zelle je `■`. Gerechnet über `spotCells`, also genau die
 * Zellen, die `GridWorld.blockFootprint` sperrt, für das Element nach Süden.
 */
export function footprintRows(element: GameElement): string[] {
  const probe: ElementSpot = { id: element.id, element: element.id, x: 0, z: 0 };
  // Gezeichnet wird die ganze Grundfläche, gesperrt nur, was sperrt: unter
  // einem Baum der Stamm mitten in freien Zellen (`GameElement.solid`).
  const all = spotFootprintCells(probe).map(
    (key) => key.split(',').map(Number) as [number, number],
  );
  if (all.length === 0) return [];
  const xs = all.map(([x]) => x);
  const zs = all.map(([, z]) => z);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [z0, z1] = [Math.min(...zs), Math.max(...zs)];
  const taken = new Set(spotCells(probe).map((key) => key.split(',').slice(0, 2).join(',')));
  const rows: string[] = [];
  for (let z = z0; z <= z1; z++) {
    const row: string[] = [];
    for (let x = x0; x <= x1; x++) row.push(taken.has(`${x},${z}`) ? CELL_BLOCKED : '□');
    rows.push(row.join(' '));
  }
  return rows;
}

/** **Wie viele Zellen das Element sperrt** — alle der Grundfläche, beim Baum die unter dem Stamm. */
export function elementBlockedCells(element: GameElement): number {
  return spotCells({ id: element.id, element: element.id, x: 0, z: 0 }).length;
}

/**
 * **Wo ein Teil sitzt**, in Worten — worauf es steht, wo auf der Grundfläche,
 * und was an ihm gedreht oder gestreckt ist.
 */
export function partPlace(part: ElementPart, index: number): string {
  const words: string[] = [];
  if (part.node) words.push(`nur ${part.node}`);
  // Frei gestellt (`ElementPart.pose`): nicht auf dem Boden, nicht auf einem Teil.
  if (part.pose) {
    words.push(`frei, ${metres(part.pose.at[1])} über dem Boden`);
    if (part.stretch) words.push('gestreckt');
    return words.join(' · ');
  }
  if (part.inside) words.push(`in Teil ${index}`);
  else if (part.on !== undefined) words.push(`auf Teil ${part.on + 1}`);
  else if (part.stack) words.push(`obenauf auf Teil ${index}`);
  else words.push('auf dem Boden');
  if (part.at && (part.at[0] !== 0 || part.at[1] !== 0)) {
    const [x, z] = part.at;
    const east = x === 0 ? '' : `${metres(Math.abs(x))} nach ${x > 0 ? 'Osten' : 'Westen'}`;
    const south = z === 0 ? '' : `${metres(Math.abs(z))} nach ${z > 0 ? 'vorn' : 'hinten'}`;
    words.push([east, south].filter(Boolean).join(', '));
  } else if (!part.inside) words.push('mittig');
  if (part.height !== undefined) words.push(`auf ${metres(part.height)} gebracht`);
  else if (part.scale !== undefined) words.push(`× ${number(part.scale)}`);
  if (part.tilt) words.push('umgelegt');
  if (part.yaw) words.push(`um ${number((part.yaw * 180) / Math.PI)}° gedreht`);
  if (part.surface) words.push('hier wird abgelegt');
  return words.join(' · ');
}

/**
 * **Der ganze Steckbrief** — Id, Grundfläche, Belegung, Körper, Zweck, was es
 * hergibt oder trägt, und dann Teil für Teil Adresse und Lage.
 */
export function elementFacts(id: string): MenuFact[] {
  const element = elementById(id);
  const [w, d] = element.tiles;
  const cells = 4 * w * d;
  const blocked = elementBlockedCells(element);
  const facts: MenuFact[] = [
    { label: 'Id', value: element.id, copy: true },
    { label: 'Grundfläche', value: `${footprintLabel(element)} · ${metres(w)} × ${metres(d)}` },
    {
      label: 'Zellen',
      value:
        blocked === cells
          ? `${2 * w} × ${2 * d} = ${cells}, alle gesperrt`
          : blocked === 0
            ? `${2 * w} × ${2 * d} = ${cells}, keine gesperrt — man läuft hindurch`
            : `${2 * w} × ${2 * d} = ${cells}, davon ${blocked} gesperrt (der Stamm)`,
    },
    {
      label: 'Belegung',
      value: [...footprintRows(element), '↓ vorn — davor steht, wer es benutzt'].join('\n'),
    },
    { label: 'Körper', value: `${metres(element.height)} hoch` },
    { label: 'Zweck', value: elementPurpose(element) },
  ];
  if (element.gives) facts.push({ label: 'Gibt', value: itemLabel(element.gives) });
  if (element.holds) facts.push({ label: 'Steht darauf', value: itemLabel(element.holds) });
  facts.push({ label: 'Teile', value: String(element.parts.length) });
  element.parts.forEach((part, index) => {
    facts.push(
      { label: `Teil ${index + 1}`, value: part.model, copy: true },
      { label: `Teil ${index + 1} · Lage`, value: partPlace(part, index) },
    );
  });
  return facts;
}
