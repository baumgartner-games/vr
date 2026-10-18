import { baseTile, edgeAt, type Terrain, type TileSpec } from './hexRules';

/**
 * **Eine Kachel als Bildchen** — für die Leiste am Schirm (die Kachel in der
 * Hand) und für den Katalog im Kreativ-Modus (`MenuEntry.image`).
 *
 * Gewünscht: _„Dann soll erkennbar sein was das neue Tile ist."_ Das Modell
 * schwebt zwar über dem Feld, aber von oben und klein ist ein Wald neben
 * einem Wald nicht zu unterscheiden. Hier ist jede Kante ein Dreieck in der
 * Farbe ihres Geländes, Fluss und Weg ein Band zur Mitte, ein Auftrag ein
 * Kreis mit seiner Zahl, eine Flagge ein Fähnchen — und gedreht, wie die
 * Kachel liegen wird, und wie das Bild gedreht ist (`heading`).
 */
export const TERRAIN_COLOUR: Readonly<Record<Terrain, string>> = {
  grass: '#9cc95a',
  forest: '#2f7d3a',
  house: '#c8553d',
  field: '#e3b23c',
  water: '#3a8fd6',
  road: '#d9c08f',
};

/**
 * Malt die Kachel in `canvas`. `rot` in Sechsteldrehungen wie auf dem Brett;
 * `heading` ist die Drehung des Bildes von oben (`TopDownCamera.heading`),
 * damit oben im Bildchen oben im Bild ist.
 */
export function drawHexIcon(
  canvas: HTMLCanvasElement,
  spec: TileSpec,
  rot = 0,
  heading = 0,
  highlight: number | null = null,
): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const w = canvas.width;
  const h = canvas.height;
  const r = Math.min(w, h) * 0.44;
  g.clearRect(0, 0, w, h);
  g.save();
  g.translate(w / 2, h / 2);
  // Von oben: x nach rechts, z nach unten — und das ganze Bild um die Drehung der Kamera.
  g.rotate(heading);
  const corner = (k: number): [number, number] => {
    const a = (k * 60 + 30) * (Math.PI / 180);
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const lake = baseTile(spec.base).id === 'lake';
  for (let e = 0; e < 6; e++) {
    const terrain = edgeAt(spec, rot, e);
    const [x1, y1] = corner(e - 1);
    const [x2, y2] = corner(e);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(x1, y1);
    g.lineTo(x2, y2);
    g.closePath();
    const hard = terrain === 'water' || terrain === 'road';
    g.fillStyle = TERRAIN_COLOUR[lake ? 'water' : hard ? 'grass' : terrain];
    // Im Baukasten steht ein Stück vorn, die übrigen treten zurück.
    g.globalAlpha = highlight === null || highlight === e ? 1 : 0.35;
    g.fill();
    g.globalAlpha = 1;
  }
  // Fluss und Weg als Bänder von der Mitte zur Kante.
  for (const kind of ['water', 'road'] as const) {
    g.strokeStyle = TERRAIN_COLOUR[kind];
    g.lineWidth = r * 0.3;
    g.lineCap = 'round';
    for (let e = 0; e < 6; e++) {
      if (lake || edgeAt(spec, rot, e) !== kind) continue;
      g.globalAlpha = highlight === null || highlight === e ? 1 : 0.35;
      const a = e * (Math.PI / 3);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * r * 0.87, Math.sin(a) * r * 0.87);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  if (highlight !== null) {
    const [x1, y1] = corner(highlight - 1);
    const [x2, y2] = corner(highlight);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(x1, y1);
    g.lineTo(x2, y2);
    g.closePath();
    g.lineWidth = Math.max(3, r * 0.09);
    g.strokeStyle = '#ffd84a';
    g.stroke();
  }
  // Der Rand.
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const [x, y] = corner(k);
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.lineWidth = Math.max(2, r * 0.07);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.stroke();
  g.restore();

  // Auftrag und Flagge stehen aufrecht, ungedreht.
  if (spec.quest) {
    g.beginPath();
    g.arc(w / 2, h / 2, r * 0.36, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = r * 0.1;
    g.strokeStyle = TERRAIN_COLOUR[spec.quest.terrain];
    g.stroke();
    g.fillStyle = '#1b2233';
    g.font = `700 ${Math.round(r * 0.42)}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(spec.quest.target === null ? '!' : `${spec.quest.target}`, w / 2, h / 2 + 1);
  } else if (spec.flag) {
    const x = w / 2 - r * 0.08;
    const y = h / 2 + r * 0.3;
    g.strokeStyle = '#2a2a2a';
    g.lineWidth = Math.max(2, r * 0.06);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - r * 0.6);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(x, y - r * 0.6);
    g.lineTo(x + r * 0.38, y - r * 0.47);
    g.lineTo(x, y - r * 0.34);
    g.closePath();
    g.fill();
  }
}

/** **Dasselbe als Adresse** — für Bilder im Menü (`MenuEntry.image`). */
export function hexIconUrl(spec: TileSpec, size = 128, highlight: number | null = null): string {
  // Das Menü baut sich bei jeder Wahl im Baukasten neu — gemalt wird jedes Bild nur einmal.
  const key = `${spec.base}|${spec.edges.join(',')}|${spec.quest?.terrain ?? ''}${spec.quest?.target ?? ''}|${spec.flag ?? ''}|${size}|${highlight ?? ''}`;
  const known = urls.get(key);
  if (known) return known;
  const url = paintUrl(spec, size, highlight);
  urls.set(key, url);
  return url;
}

const urls = new Map<string, string>();

function paintUrl(spec: TileSpec, size: number, highlight: number | null): string {
  // Quer, weil die Kacheln im Menü quer sind (sie füllen ihr Feld) — so passt
  // das ganze Sechseck hinein und wird nicht beschnitten.
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * 1.8);
  canvas.height = size;
  drawHexIcon(canvas, spec, 0, 0, highlight);
  return canvas.toDataURL('image/png');
}
