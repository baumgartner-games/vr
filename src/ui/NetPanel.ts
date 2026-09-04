import {
  normalizeRoomCode,
  randomRoomCode,
  rememberName,
  rememberRoom,
  rememberedName,
  rememberedRoom,
} from '../net/room';
import type { App } from '../core/App';
import type { SpectatorMode } from '../net/SpectatorCamera';
import type { SignalingStrategy } from '../net/TrysteroTransport';
import { chatTranscript, formatChatTime, type ChatEntry } from '../net/chat';
import type { NetStatus } from '../net/types';

const STORAGE_STRATEGY = 'bgvr:strategy';

const STATUS_TEXT: Record<NetStatus, string> = {
  offline: 'Nicht verbunden',
  connecting: 'Verbinde …',
  waiting: 'Im Raum — warte auf Mitspieler',
  online: 'Verbunden',
  error: 'Fehler',
};

const ROLE_LABELS: Record<string, string> = {
  vr: 'VR',
  desktop: 'Desktop',
  handheld: 'Handy',
};

const ROLE_COLORS: Record<string, string> = {
  vr: '#4aa8ff',
  desktop: '#9d7bff',
  handheld: '#ff9d3d',
};

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`[ui] Element #${id} fehlt im HTML`);
  return found as T;
}

/**
 * The flat-screen side of multiplayer: room code in, and once a VR player is in
 * the room, the controls for watching them.
 *
 * The same fields exist twice — once on the landing page, so the code can be
 * typed before the headset goes on, and once in the in-game panel. Both write
 * into the same state.
 */
/** What should happen once a connection is up. */
export type StartMode = 'vr' | 'flat';

export interface NetPanelOptions {
  /**
   * Use `BroadcastChannel` instead of WebRTC (`?net=local`). Two tabs on one
   * machine, no relays involved — the quickest way to try the spectator views.
   */
  local?: boolean;
  /**
   * Called after connecting from the landing page. Joining a room is the same
   * step as starting the game, so the two buttons there say what happens next
   * — headset on, or straight into the flat view.
   */
  onStart?(mode: StartMode): void;
}

export class NetPanel {
  private readonly panel = el('net-panel');
  private readonly statusLine = el('net-status');
  private readonly landingStatus = el('net-status-landing');
  private readonly connectButtons = [
    el<HTMLButtonElement>('net-connect'),
    el<HTMLButtonElement>('net-connect-landing'),
    el<HTMLButtonElement>('net-connect-flat-landing'),
  ];
  /** The landing buttons carry a start mode; the in-game one only connects. */
  private readonly startModes: Array<StartMode | null> = [null, 'vr', 'flat'];
  private readonly roomInputs = [
    el<HTMLInputElement>('net-room'),
    el<HTMLInputElement>('net-room-landing'),
  ];
  private readonly nameInputs = [
    el<HTMLInputElement>('net-name'),
    el<HTMLInputElement>('net-name-landing'),
  ];
  private readonly peerList = el('net-peers');
  private readonly modeButtons = [...el('net-modes').querySelectorAll('button')];
  private readonly smooth = el<HTMLInputElement>('net-smooth');
  private readonly smoothOut = el<HTMLOutputElement>('net-smooth-out');
  private readonly smoothField = el('net-smooth-field');
  private readonly distance = el<HTMLInputElement>('net-distance');
  private readonly distanceOut = el<HTMLOutputElement>('net-distance-out');
  private readonly distanceField = el('net-distance-field');
  private readonly level = el<HTMLInputElement>('net-level');
  private readonly linkButton = el<HTMLButtonElement>('net-link');
  private readonly strategy = el<HTMLSelectElement>('net-strategy');
  private readonly chatLog = el('net-chat');
  private readonly chatInput = el<HTMLInputElement>('net-chat-text');
  private readonly chatSend = el<HTMLButtonElement>('net-chat-send');
  private readonly chatCopy = el<HTMLButtonElement>('net-chat-copy');
  private readonly chatClear = el<HTMLButtonElement>('net-chat-clear');

  private busy = false;
  private message = '';
  private messageIsError = false;

  constructor(
    private readonly app: App,
    private readonly options: NetPanelOptions = {},
  ) {
    const settings = this.app.spectator.settings;
    this.smooth.value = String(Math.round(settings.smoothing * 100));
    this.distance.value = String(Math.round(settings.distance * 100));
    this.level.checked = settings.levelHorizon;

    this.strategy.value = localStorage.getItem(STORAGE_STRATEGY) ?? 'nostr';
    this.strategy.addEventListener('change', () =>
      localStorage.setItem(STORAGE_STRATEGY, this.strategy.value),
    );

    for (const input of this.nameInputs) {
      input.value = rememberedName();
      input.addEventListener('input', () => this.mirror(this.nameInputs, input));
    }
    for (const input of this.roomInputs) {
      input.addEventListener('input', () => this.mirror(this.roomInputs, input));
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') void this.toggleConnection();
      });
    }

    for (const button of [el('net-dice'), el('net-dice-landing')]) {
      button.addEventListener('click', () => this.setRoom(randomRoomCode()));
    }
    for (const [index, button] of this.connectButtons.entries()) {
      const mode = this.startModes[index] ?? null;
      button.addEventListener('click', () => void this.toggleConnection(mode));
    }

    el('net-close').addEventListener('click', () => this.toggle(false));
    el('hud-net').addEventListener('click', () => this.toggle());
    el('net-center').addEventListener('click', () => this.app.spectator.recenter());
    this.linkButton.addEventListener('click', () => void this.copyLink());

    for (const button of this.modeButtons) {
      button.addEventListener('click', () => {
        this.app.spectate(this.app.spectator.settings.targetId, button.dataset['mode'] as SpectatorMode);
        this.refresh();
      });
    }

    this.smooth.addEventListener('input', () => {
      settings.smoothing = Number(this.smooth.value) / 100;
      this.refresh();
    });
    this.distance.addEventListener('input', () => {
      settings.distance = Number(this.distance.value) / 100;
      this.refresh();
    });
    this.level.addEventListener('change', () => {
      settings.levelHorizon = this.level.checked;
    });

    this.chatSend.addEventListener('click', () => this.sendChat());
    this.chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.sendChat();
    });
    this.chatCopy.addEventListener('click', () => void this.copyChat());
    this.chatClear.addEventListener('click', () => {
      this.app.chat.clear();
      this.setMessage('Verlauf geleert.');
    });
    // Eine Zeile kann jederzeit hereinkommen — auch während das Panel zu ist.
    // Dann wird die Liste eben umsonst neu gezeichnet; sie hat zweihundert
    // Einträge, nicht zweihunderttausend.
    this.app.chat.onChange(() => this.renderChat());

    this.refresh();
  }

  /** Prefills the code from `?room=` (or the last session) without connecting. */
  setRoom(room: string): void {
    for (const input of this.roomInputs) input.value = room;
  }

  get room(): string {
    return this.roomInputs[0]!.value;
  }

  restoreLastRoom(): void {
    this.setRoom(rememberedRoom());
  }

  toggle(force?: boolean): void {
    this.panel.hidden = force === undefined ? !this.panel.hidden : !force;
    if (!this.panel.hidden) this.refresh();
  }

  /** Repaints everything that depends on the session — cheap enough to spam. */
  refresh(): void {
    const net = this.app.net;
    const settings = this.app.spectator.settings;

    const detail = net.statusDetail ? ` · ${net.statusDetail}` : '';
    const text =
      this.message ||
      (net.status === 'error' && net.statusDetail
        ? net.statusDetail
        : `${STATUS_TEXT[net.status]}${net.connected ? ` in "${net.room}"` : ''}${detail}`);
    this.statusLine.textContent = text;
    this.landingStatus.textContent = text;
    const error = this.messageIsError || net.status === 'error';
    this.statusLine.classList.toggle('is-error', error);
    this.statusLine.classList.toggle('is-online', !error && net.status === 'online');
    this.landingStatus.classList.toggle('is-error', error);

    for (const [index, button] of this.connectButtons.entries()) {
      button.textContent = this.busy ? '…' : net.connected ? 'Trennen' : CONNECT_LABELS[index]!;
      button.disabled = this.busy;
    }
    for (const input of this.roomInputs) input.disabled = net.connected || this.busy;
    this.strategy.disabled = net.connected || this.busy;
    this.linkButton.disabled = !normalizeRoomCode(this.room);

    for (const button of this.modeButtons) {
      button.classList.toggle('is-active', button.dataset['mode'] === settings.mode);
    }

    this.smoothOut.textContent = describeSmoothing(settings.smoothing);
    this.distanceOut.textContent = `${settings.distance.toFixed(1)} m`;
    this.distance.value = String(Math.round(settings.distance * 100));
    this.smoothField.classList.toggle('is-off', settings.mode === 'free');
    this.distanceField.classList.toggle('is-off', settings.mode !== 'third');

    this.renderPeers();
    this.renderChat();
  }

  private renderPeers(): void {
    const peers = [...this.app.net.peers.values()];
    this.peerList.replaceChildren();

    if (!peers.length) {
      const empty = document.createElement('p');
      empty.className = 'peers__empty';
      empty.textContent = this.app.net.connected
        ? 'Noch niemand sonst im Raum.'
        : 'Erst verbinden, dann erscheinen hier die Mitspieler.';
      this.peerList.append(empty);
      return;
    }

    const active = this.app.spectatorTarget?.id ?? null;
    for (const peer of peers) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'peers__item';
      item.classList.toggle('is-active', peer.id === active);

      const dot = document.createElement('span');
      dot.className = 'peers__dot';
      dot.style.color = ROLE_COLORS[peer.role] ?? '#ffffff';

      const name = document.createElement('span');
      name.textContent = peer.name;

      const role = document.createElement('span');
      role.className = 'peers__role';
      role.textContent = ROLE_LABELS[peer.role] ?? peer.role;

      const watch = document.createElement('span');
      watch.className = 'peers__watch';
      watch.textContent = peer.id === active ? 'wird gezeigt' : 'Zuschauen';

      item.append(dot, name, role, watch);
      item.addEventListener('click', () => {
        const settings = this.app.spectator.settings;
        this.app.spectate(settings.targetId === peer.id ? null : peer.id);
        this.refresh();
      });
      this.peerList.append(item);
    }
  }

  /**
   * Der Verlauf, Zeile für Zeile — **zum Lesen und zum Mitnehmen**.
   *
   * Deshalb ist ein Eintrag kein Knopf: der Text muss sich mit der Maus
   * markieren lassen. Der Knopf steht daneben und legt genau diese eine Zeile
   * in die Zwischenablage, mitsamt Uhrzeit, Absender und — bei einem
   * Konfig-Code — der Angabe, wofür er gilt. Ein nackter Code aus 24 Zeichen
   * ist eine Stunde später niemandem mehr zuzuordnen.
   */
  private renderChat(): void {
    const entries = this.app.chat.entries;
    const atBottom =
      this.chatLog.scrollTop + this.chatLog.clientHeight >= this.chatLog.scrollHeight - 24;
    this.chatLog.replaceChildren();
    this.chatCopy.disabled = entries.length === 0;
    this.chatClear.disabled = entries.length === 0;

    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'chat__empty';
      empty.textContent = this.app.net.connected
        ? 'Noch nichts geschrieben. Die Brille schickt Konfig-Codes hierher.'
        : 'Erst verbinden — Geschriebenes bleibt bis dahin nur bei dir stehen.';
      this.chatLog.append(empty);
      return;
    }

    for (const entry of entries) this.chatLog.append(this.chatItem(entry));
    // Beim Nachlesen weiter oben nicht dazwischenfunken; wer unten steht, will
    // die neue Zeile sehen.
    if (atBottom) this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  private chatItem(entry: ChatEntry): HTMLElement {
    const item = document.createElement('div');
    item.className = 'chat__item';
    item.classList.toggle('is-mine', entry.mine);
    item.classList.toggle('is-code', entry.kind === 'code');

    const who = document.createElement('span');
    who.className = 'chat__who';
    who.textContent = `${formatChatTime(entry.at)} · ${entry.name}${entry.note ? ` · ${entry.note}` : ''}`;

    const text = document.createElement('span');
    text.className = 'chat__text';
    // `textContent`, nie `innerHTML`: das hier ist fremder Text.
    text.textContent = entry.text;

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'chat__copy';
    copy.textContent = 'Kopieren';
    copy.addEventListener('click', () => {
      // Der blanke Text, nicht die Zeile mit Uhrzeit davor: was hier kopiert
      // wird, wandert meistens in ein Eingabefeld und nicht in eine E-Mail.
      void this.toClipboard(entry.text, entry.kind === 'code' ? 'Code kopiert.' : 'Zeile kopiert.');
    });

    item.append(who, text, copy);
    return item;
  }

  private sendChat(): void {
    const text = this.chatInput.value;
    if (!text.trim()) return;
    this.app.say(text);
    this.chatInput.value = '';
    this.refresh();
  }

  private async copyChat(): Promise<void> {
    const text = chatTranscript(this.app.chat.entries);
    if (!text) return;
    await this.toClipboard(text, `Verlauf kopiert (${this.app.chat.size} Zeilen).`);
  }

  /**
   * In die Zwischenablage — und wenn der Browser das verbietet, wenigstens
   * markiert. Ohne Fokus oder ohne `https` gibt es `navigator.clipboard`
   * nämlich schlicht nicht, und dann ist „ging nicht" die schlechteste aller
   * Antworten auf einen Knopf namens *Kopieren*.
   */
  private async toClipboard(text: string, done: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.setMessage(done);
    } catch {
      this.setMessage('Kopieren ging nicht — Text ist markiert, Strg+C.', true);
      selectText(text);
    }
  }

  private mirror(inputs: HTMLInputElement[], source: HTMLInputElement): void {
    for (const input of inputs) if (input !== source) input.value = source.value;
    this.refresh();
  }

  private async toggleConnection(start: StartMode | null = null): Promise<void> {
    if (this.app.net.connected) {
      this.app.disconnect();
      this.setMessage('');
      return;
    }

    const room = normalizeRoomCode(this.room);
    if (!room) {
      this.setMessage('Bitte einen Raum-Code eintragen (oder würfeln).', true);
      return;
    }

    this.busy = true;
    this.setMessage('');
    try {
      await this.app.connect({
        room,
        name: this.nameInputs[0]!.value,
        strategy: this.strategy.value as SignalingStrategy,
        local: this.options.local ?? false,
      });
      rememberRoom(room);
      rememberName(this.nameInputs[0]!.value);
      this.setRoom(room);
      if (start) this.options.onStart?.(start);
    } catch (error) {
      this.setMessage(`Verbindung fehlgeschlagen: ${(error as Error).message}`, true);
    } finally {
      this.busy = false;
      this.refresh();
    }
  }

  private async copyLink(): Promise<void> {
    const url = new URL(window.location.href);
    url.searchParams.set('room', normalizeRoomCode(this.room));
    try {
      await navigator.clipboard.writeText(url.toString());
      this.setMessage('Link kopiert — auf dem anderen Gerät öffnen.');
    } catch {
      this.setMessage(url.toString());
    }
  }

  private setMessage(message: string, isError = false): void {
    this.message = message;
    this.messageIsError = isError;
    this.refresh();
    if (message && !isError) {
      window.setTimeout(() => {
        if (this.message !== message) return;
        this.message = '';
        this.refresh();
      }, 4000);
    }
  }
}

/** Same order as `connectButtons`: in-game panel, then the two landing ones. */
const CONNECT_LABELS = ['Verbinden', 'Verbinden & Enter VR', 'Verbinden & ohne VR starten'];

/**
 * Der letzte Ausweg: den Text in ein unsichtbares Feld legen und markieren.
 *
 * Damit funktioniert `Strg+C` auch dort, wo die Zwischenablage-API nicht zur
 * Verfügung steht — und das ist keine Ausnahme, sondern jede Seite, die nicht
 * über `https` läuft.
 */
function selectText(text: string): void {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  window.setTimeout(() => field.remove(), 30_000);
}

function describeSmoothing(value: number): string {
  if (value < 0.08) return 'exakt';
  if (value < 0.35) return 'leicht';
  if (value < 0.7) return 'weich';
  return 'sehr träge';
}
