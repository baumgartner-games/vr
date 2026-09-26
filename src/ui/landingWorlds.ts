import { WORLD_BADGES, folderWorlds, worldKind, type WorldKind } from './menuGroups';

/**
 * **Die Weltauswahl der Startseite** — Karten mit Bild, Name und einer Zeile.
 *
 * Bis hierher gab es auf der Startseite genau eine Welt: die, die in der
 * Adresse stand, sonst die Testwelt. Wer woandershin wollte, musste erst
 * hinein und dann im Menü wechseln — oder wissen, dass `#hub` in die Adresse
 * gehört. Gewünscht war „ein aufgeräumter, einladender Startbildschirm mit
 * klarer Hauptaktion und Weltauswahl mit Bildern". Die Hauptaktion bleibt der
 * eine Knopf (`#enter`); die Karten darüber sagen, **wohin** er führt.
 *
 * Kein three.js: Die Startseite lädt ohne (`docs/agents/seite.md`, _Und
 * three.js kommt erst nach der Startseite_), und dieses Modul hängt nur an
 * `menuGroups.ts` — reine Rechnung — und am DOM.
 */

/** Was eine Karte zeigt — aus der Definition der Welt gerechnet. */
export interface WorldCard {
  readonly id: string;
  readonly title: string;
  readonly tagline: string;
  readonly kind: WorldKind;
  readonly badge: string | undefined;
  /** Die Akzentfarbe als CSS — der Rand der gewählten Karte, die Fläche ohne Bild. */
  readonly accent: string;
  /** Adresse des Bildes, oder `null` — dann steht die Fläche in der Akzentfarbe. */
  readonly image: string | null;
  /**
   * **Diese Welt hat ihre eigene Startseite** — Haunting mit Lobby und
   * Raum-Code. Die Karte schlägt sie auf, statt die Welt zu wählen.
   */
  readonly lobby: boolean;
  /**
   * **Ein Ordner** (`WorldDefinition.folder`): die Karten darin. Ein Tipp
   * schlägt ihn auf, statt eine Welt zu wählen (`renderWorldCards`).
   */
  readonly children?: readonly WorldCard[];
}

/** Ein Ordner, wie die Karte ihn braucht (`worlds/index.WORLD_FOLDERS`). */
export interface FolderSource {
  readonly id: string;
  readonly title: string;
  readonly tagline: string;
  readonly accent: number;
}

/** Die Kennung einer Ordnerkarte — getrennt von denen der Welten. */
export function folderCardId(id: string): string {
  return `folder:${id}`;
}

export interface WorldSource {
  readonly id: string;
  readonly title: string;
  readonly tagline: string;
  readonly accent: number;
  readonly preview?: string;
  readonly test?: boolean;
  readonly experimental?: boolean;
  readonly folder?: string;
}

/** Welten mit einer eigenen Startseite (`main.ts`, `hauntLanding`). */
export const LOBBY_WORLDS: ReadonlySet<string> = new Set(['haunting']);

/**
 * Die Karten, in der Reihenfolge des Menüs — Spiele, Baustellen, Prüfstände
 * (`menuGroups.sortWorlds`). `base` ist die Wurzel der Seite
 * (`import.meta.env.BASE_URL`), damit die Bilder auch unter `/<repo>/` auf
 * GitHub Pages stimmen.
 */
export function worldCards(
  worlds: readonly WorldSource[],
  base = './',
  folders: readonly FolderSource[] = [],
): WorldCard[] {
  const root = base.endsWith('/') ? base : `${base}/`;
  const colour = (accent: number): string => `#${accent.toString(16).padStart(6, '0')}`;
  const card = (world: WorldSource): WorldCard => {
    const kind = worldKind(world);
    return {
      id: world.id,
      title: world.title,
      tagline: world.tagline,
      kind,
      // Eine Lobby sagt es mit einem Schildchen — das Wort in der Zeile
      // darunter hätte der Karte eine dritte Zeile gekostet.
      badge: WORLD_BADGES[kind] ?? (LOBBY_WORLDS.has(world.id) ? 'LOBBY' : undefined),
      accent: colour(world.accent),
      image: world.preview ? `${root}${world.preview}` : null,
      lobby: LOBBY_WORLDS.has(world.id),
    };
  };
  return folderWorlds(worlds, folders).map((item) => {
    if (item.kind === 'world') return card(item.world);
    const children = item.worlds.map(card);
    const first = children[0]!;
    return {
      id: folderCardId(item.folder.id),
      title: item.folder.title,
      tagline: item.folder.tagline,
      kind: first.kind,
      // Das Schildchen sagt, dass hier mehr drin ist — und wie viel.
      badge: `ORDNER · ${children.length}`,
      accent: colour(item.folder.accent),
      image: first.image,
      lobby: false,
      children,
    };
  });
}

/**
 * Die Karten in `host` legen — als Knöpfe in einer Auswahlgruppe, damit Tab,
 * Leertaste und ein Bildschirmleser sie verstehen. Gewählt ist die Karte mit
 * `selected`; ein Tipp ruft `onPick` und markiert selbst nichts: Was gewählt
 * ist, sagt danach `markWorldCard` — die Startseite entscheidet, ob ein Tipp
 * wirklich wählt (die Lobby-Karte tut es nicht, sie schlägt eine Seite auf).
 */
export function renderWorldCards(
  host: HTMLElement,
  cards: readonly WorldCard[],
  selected: string,
  onPick: (card: WorldCard) => void,
): void {
  // **Ein Ordner schlägt sich auf**: seine Karten an der Stelle der Liste,
  // davor eine Karte zurück. Gewählt wird darin wie draußen.
  const open = (folder: WorldCard | null): void => {
    const shown = folder ? folder.children! : cards;
    host.replaceChildren(
      ...(folder ? [backCard(folder, () => open(null))] : []),
      ...shown.map((card) => cardNode(card, () => (card.children ? open(card) : onPick(card)))),
    );
    markWorldCard(host, host.dataset['selected'] ?? selected);
    host.dataset['folder'] = folder?.id ?? '';
  };
  host.dataset['selected'] = selected;
  open(null);
}

/** Die Karte zurück aus einem Ordner. */
function backCard(folder: WorldCard, back: () => void): HTMLElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = 'wcard wcard--back';
  node.dataset['back'] = folder.id;
  node.style.setProperty('--wcard-accent', folder.accent);
  const art = document.createElement('span');
  art.className = 'wcard__art';
  const title = document.createElement('strong');
  title.className = 'wcard__title';
  title.textContent = `← ${folder.title}`;
  const line = document.createElement('span');
  line.className = 'wcard__line';
  line.textContent = 'Zurück zu allen Welten';
  node.append(art, title, line);
  node.addEventListener('click', back);
  return node;
}

/** Eine Karte als Knopf — Welt oder Ordner. */
function cardNode(card: WorldCard, onClick: () => void): HTMLElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = `wcard wcard--${card.kind}${card.lobby ? ' wcard--lobby' : ''}`;
  node.dataset['world'] = card.id;
  node.setAttribute('role', 'radio');
  node.style.setProperty('--wcard-accent', card.accent);

  const art = document.createElement('span');
  art.className = 'wcard__art';
  if (card.image) {
    const img = document.createElement('img');
    img.src = card.image;
    img.alt = '';
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.width = 480;
    img.height = 270;
    art.append(img);
  }
  if (card.badge) {
    const badge = document.createElement('span');
    badge.className = 'wcard__badge';
    badge.textContent = card.badge;
    art.append(badge);
  }

  const title = document.createElement('strong');
  title.className = 'wcard__title';
  title.textContent = card.title;
  const line = document.createElement('span');
  line.className = 'wcard__line';
  line.textContent = card.tagline;
  if (card.lobby) node.title = 'Eigene Startseite mit Lobby und Raum-Code';
  if (card.children) {
    node.dataset['contains'] = card.children.map((child) => child.id).join(' ');
    node.setAttribute('aria-haspopup', 'true');
  }

  node.append(art, title, line);
  node.addEventListener('click', onClick);
  return node;
}

/**
 * Die gewählte Karte markieren — und nur sie. Ein Ordner gilt als gewählt,
 * wenn die gewählte Welt in ihm steht.
 */
export function markWorldCard(host: HTMLElement, selected: string): void {
  host.dataset['selected'] = selected;
  for (const node of host.querySelectorAll<HTMLElement>('.wcard[data-world]')) {
    const inside = (node.dataset['contains'] ?? '').split(' ').includes(selected);
    const on = node.dataset['world'] === selected || inside;
    node.classList.toggle('is-selected', on);
    node.setAttribute('aria-checked', on ? 'true' : 'false');
  }
}
