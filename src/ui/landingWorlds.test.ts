/** @jest-environment jsdom */
import { markWorldCard, renderWorldCards, worldCards } from './landingWorlds';
import { WORLDS } from '../worlds';

const SOURCE = [
  { id: 'hub', title: 'Hub', tagline: 'Startpunkt', accent: 0x4aa8ff, preview: 'worlds/hub.webp' },
  { id: 'editor', title: 'Bauplatz', tagline: 'Bauen', accent: 0x39d0ff, experimental: true },
  { id: 'test', title: 'Testwelt', tagline: 'Zonen', accent: 0x5ee0a0, test: true },
  { id: 'haunting', title: 'Haunting', tagline: 'Quest', accent: 0x65dce5 },
];

describe('worldCards', () => {
  it('stellt die Spiele vor Baustelle und Prüfstand und sagt es mit einem Schildchen', () => {
    const cards = worldCards(SOURCE, '/vr/');
    expect(cards.map((card) => card.id)).toEqual(['hub', 'haunting', 'editor', 'test']);
    expect(cards.map((card) => card.badge)).toEqual([undefined, 'LOBBY', 'WIP', 'TEST']);
    expect(cards[0]!.image).toBe('/vr/worlds/hub.webp');
    expect(cards[0]!.accent).toBe('#4aa8ff');
    // Ohne Bild: die Fläche in der Farbe der Welt.
    expect(cards[2]!.image).toBeNull();
    expect(cards.find((card) => card.id === 'haunting')!.lobby).toBe(true);
  });

  it('hängt den Schrägstrich an eine Wurzel ohne', () => {
    expect(worldCards(SOURCE, '.')[0]!.image).toBe('./worlds/hub.webp');
  });

  it('hat für jede ausgelieferte Welt ein Bild', () => {
    for (const card of worldCards(WORLDS)) expect(card.image).not.toBeNull();
  });
});

describe('renderWorldCards', () => {
  it('legt Karten als Auswahlgruppe und markiert die gewählte', () => {
    const host = document.createElement('div');
    const picked: string[] = [];
    renderWorldCards(host, worldCards(SOURCE), 'test', (card) => picked.push(card.id));
    const nodes = [...host.querySelectorAll<HTMLButtonElement>('.wcard')];
    expect(nodes).toHaveLength(4);
    const checked = nodes.filter((node) => node.getAttribute('aria-checked') === 'true');
    expect(checked.map((node) => node.dataset['world'])).toEqual(['test']);
    expect(host.querySelector('[data-world="hub"] img')!.getAttribute('loading')).toBe('lazy');
    expect(host.querySelector('[data-world="test"] .wcard__badge')!.textContent).toBe('TEST');

    nodes[0]!.click();
    expect(picked).toEqual(['hub']);
    // Der Tipp allein markiert nichts — das entscheidet die Startseite.
    expect(nodes[0]!.classList.contains('is-selected')).toBe(false);
    markWorldCard(host, 'hub');
    expect(nodes[0]!.classList.contains('is-selected')).toBe(true);
    expect(host.querySelectorAll('.is-selected')).toHaveLength(1);
  });
});
