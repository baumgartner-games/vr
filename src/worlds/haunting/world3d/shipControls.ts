import { IDLE, Joystick, type StickValue } from '../map/joystick';

/**
 * **Die Steuerung der 2D-Welt, im Schiff.**
 *
 * Wer die Station im Browser läuft, hatte bisher Tastatur und Maus — und auf
 * dem Telefon einen kleinen Stock aus dem Bordbestand der Seite, sonst
 * nichts: kein „Benutzen", kein Handwechsel, für jede Fracht ein Zielen mit
 * dem Finger. In der 2D-Welt ist genau das längst gelöst (Stock links unten,
 * drei Knöpfe rechts unten), und es gibt keinen Grund, es zweimal zu
 * erfinden. Also steht hier **dasselbe Bauteil und dasselbe CSS**
 * (`map/joystick.ts`, `map/controls.css` — dieselbe Datei, die auch die
 * 2D-Welt einbindet) über der 3D-Szene.
 *
 * Was anders ist als in 2D, ist der Inhalt der beiden kleinen Knöpfe: Im
 * Schiff hat man **zwei Hände**. Links liegen Radar und Röntgengerät, rechts
 * Lampe und Medkit — dieselben zwei Reihen, die am Desktop auf `1` und `2`
 * liegen. Der große Knopf ist derselbe wie dort das `E`: **das, was gerade
 * vor einem liegt**, mit seinem Namen darauf, damit man weiß, was er tut,
 * bevor man ihn drückt.
 *
 * Kein three.js hier drin: Das Bauteil nimmt Texte entgegen und gibt Absichten
 * zurück. Wer es einhängt (`ShipExperience`), verbindet sie mit dem Rig und
 * den Werkzeugen.
 */
export interface ShipControlsHost {
  /** Der große Knopf: benutzen, was vor einem liegt — derselbe Weg wie `E`. */
  interact(): void;
  /** Die linke Hand durchschalten (Radar, Röntgengerät, frei) — wie `1`. */
  cycleLeft(): void;
  /** Und die rechte (Lampe, Medkit, frei) — wie `2`. */
  cycleRight(): void;
}

/** Was auf den Knöpfen steht — je Bild abgefragt, aber nur bei Änderung gemalt. */
export interface ShipControlsLabels {
  /** Was in der linken Hand liegt. */
  left: string;
  /** Und in der rechten. */
  right: string;
  /** Das Ding vor einem — leer, wenn nichts in Reichweite ist. */
  target: string;
  /**
   * Was der große Knopf tut, wenn **nichts** vor einem liegt: das Licht
   * schalten (`ShipExperience.toggleTorch`). Er steht dann klein unter
   * „Benutzen" — und bleibt matt, denn gelb leuchtet der Knopf nur, wenn
   * wirklich etwas in Reichweite ist.
   */
  idle?: string;
}

export class ShipControls {
  readonly element = document.createElement('div');
  private readonly stick = new Joystick();
  private readonly buttons = document.createElement('div');
  private readonly leftKey = document.createElement('button');
  private readonly rightKey = document.createElement('button');
  private readonly actKey = document.createElement('button');
  private stamp = ' ';

  constructor(private readonly host: ShipControlsHost) {
    // Dieselben Klassen wie in der 2D-Welt: `flat` setzt die Variablen,
    // `flat__stick` und `flat__buttons` die Plätze für Daumen und Finger.
    this.element.className = 'flat ship3d';
    this.buttons.className = 'flat__buttons';
    this.leftKey.className = 'flat__key flat__key--cycle';
    this.rightKey.className = 'flat__key flat__key--use';
    this.actKey.className = 'flat__key flat__key--act';
    this.leftKey.dataset['action'] = 'left';
    this.rightKey.dataset['action'] = 'right';
    this.actKey.dataset['action'] = 'interact';
    this.buttons.append(this.leftKey, this.rightKey, this.actKey);
    this.buttons.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement | null)?.closest('button');
      const action = key?.dataset['action'];
      if (action === 'left') this.host.cycleLeft();
      else if (action === 'right') this.host.cycleRight();
      else if (action === 'interact') this.host.interact();
    });
    this.element.append(this.stick.element, this.buttons);
    document.body.append(this.element);
  }

  /** Der Stock als Bewegungswunsch — die Welt schiebt ihn in das Rig. */
  get move(): StickValue {
    return this.element.hidden ? IDLE : this.stick.value;
  }

  get hidden(): boolean {
    return this.element.hidden;
  }

  set hidden(value: boolean) {
    this.element.hidden = value;
  }

  /** Die Beschriftungen nachziehen — gebaut wird nur, wenn sich der Text ändert. */
  setLabels(labels: ShipControlsLabels): void {
    const stamp = `${labels.left}|${labels.right}|${labels.target}|${labels.idle ?? ''}`;
    if (stamp === this.stamp) return;
    this.stamp = stamp;
    fill(this.leftKey, 'Linke Hand', labels.left);
    fill(this.rightKey, 'Rechte Hand', labels.right);
    this.actKey.replaceChildren(strong('Benutzen'), small(labels.target || (labels.idle ?? '')));
    this.actKey.classList.toggle('is-ready', !!labels.target);
  }

  dispose(): void {
    this.stick.dispose();
    this.element.remove();
  }
}

function fill(key: HTMLButtonElement, caption: string, value: string): void {
  key.replaceChildren(small(caption), strong(value));
}

function small(text: string): HTMLElement {
  const node = document.createElement('small');
  node.textContent = text;
  return node;
}

function strong(text: string): HTMLElement {
  const node = document.createElement('strong');
  node.textContent = text;
  return node;
}
