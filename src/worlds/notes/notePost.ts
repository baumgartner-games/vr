import * as THREE from 'three';
import { fitNote } from './noteText';

/**
 * **Der Zettel** — ein Aufsteller aus dem Regal und darauf ein gelbes Blatt
 * mit Text.
 *
 * Gewünscht war: _„Ermögliche es mir, dass ich ein Post vor Felder
 * hinzustellen kann und einen Text drauf schreiben kann durch interagieren."_
 * Gemeint sind Post-its: Der Besitzer baut eine Welt aus dem Modellregal,
 * stellt Zettel dazu — _„Kartoffel-Vorrat hier"_ — und schickt die Liste der
 * Weltänderungen (`core/worldChanges.ts`) an jemanden, der daraus
 * Spielelemente macht.
 *
 * **Aus dem Regal, und dazu ein Blatt.** Das Gestell ist die Menükarte des
 * Restaurant-Pakets (`NOTE_MODEL`), wie jedes Stück aus dem Regal. Das Blatt
 * ist gerechnet: eine Fläche mit einer Leinwand, weil es kein Modell mit
 * beschreibbarer Fläche gibt — es ist eine Beschriftung und kein Möbel.
 *
 * **Schräg nach hinten gelegt** (`TILT`, 70° aus der Senkrechten): Gelesen
 * wird ein Zettel meist von oben, aus der Höhe des Krans, und dort ist ein
 * senkrechtes Schild ein Strich. So liegt er fast flach, die Oberkante des
 * Textes zeigt nach hinten (bei Drehung 0 nach Norden, oben im Bild), und wer
 * davorsteht, sieht ihn trotzdem.
 */

/** Das Gestell aus dem Regal. */
export const NOTE_MODEL = 'restaurant-bits/menu.glb';

/** Das Blatt in Metern — breiter als hoch, wie ein Etikett. */
const PAPER_W = 0.7;
const PAPER_H = 0.5;
/** Wie weit es aus der Senkrechten nach hinten liegt. */
const TILT = (70 * Math.PI) / 180;
/** Luft zwischen Gestell und Blatt. */
const GAP = 0.02;

const CANVAS_W = 512;
const CANVAS_H = Math.round((CANVAS_W * PAPER_H) / PAPER_W);
const PAD = 30;
/** Der Klebestreifen oben, etwas dunkler — daran erkennt man ein Post-it. */
const BAND = 0.12;

const PAPER = '#ffe066';
const PAPER_BAND = '#f4c93a';
const INK = '#2f2a12';
const MUTED = '#8a7a3a';
const FONT = 'system-ui, sans-serif';

/** Was auf einem Zettel steht, solange niemand etwas daraufgeschrieben hat. */
export const EMPTY_NOTE_HINT = 'Zettel\nA / E: beschriften';

/**
 * **Das Blatt** — eine Gruppe mit Vorder- und Rückseite, die ihre Leinwand
 * selbst neu zeichnet (`write`).
 */
export class NoteLabel extends THREE.Group {
  private readonly canvas: HTMLCanvasElement;
  private readonly draw2d: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;

  constructor(text: string) {
    super();
    this.name = 'note-paper';
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.draw2d = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;

    const geometry = new THREE.PlaneGeometry(PAPER_W, PAPER_H);
    const front = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false }),
    );
    front.name = 'note-front';
    // Die Rückseite ist nur gelb: Spiegelschrift von hinten wäre ein Rätsel.
    const back = new THREE.Mesh(
      geometry.clone(),
      new THREE.MeshBasicMaterial({ color: PAPER_BAND, toneMapped: false }),
    );
    back.name = 'note-back';
    back.rotation.y = Math.PI;
    back.position.z = -0.002;
    this.add(front, back);
    this.rotation.x = -TILT;
    this.write(text);
  }

  /** Den Text neu auf das Blatt schreiben. */
  write(text: string): void {
    const ctx = this.draw2d;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = PAPER_BAND;
    ctx.fillRect(0, 0, CANVAS_W, Math.round(CANVAS_H * BAND));

    const empty = !text.trim();
    const top = Math.round(CANVAS_H * BAND) + PAD / 2;
    const box = { width: CANVAS_W - 2 * PAD, height: CANVAS_H - top - PAD / 2 };
    const weight = empty ? '400' : '700';
    const fit = fitNote(
      empty ? EMPTY_NOTE_HINT : text,
      box,
      (part, size) => {
        ctx.font = `${weight} ${size}px ${FONT}`;
        return ctx.measureText(part).width;
      },
      { max: empty ? 44 : 120 },
    );
    ctx.font = `${weight} ${fit.size}px ${FONT}`;
    ctx.fillStyle = empty ? MUTED : INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const line = fit.size * 1.15;
    const first = top + box.height / 2 - ((fit.lines.length - 1) * line) / 2;
    fit.lines.forEach((one, index) => ctx.fillText(one, CANVAS_W / 2, first + index * line));
    this.texture.needsUpdate = true;
  }

  /** Die Leinwand freigeben — `disposeTree` kennt Texturen nicht. */
  dispose(): void {
    this.texture.dispose();
  }
}

/**
 * **Gestell und Blatt zusammensetzen** — das Ganze geht danach wie jedes
 * Modell aus dem Regal in die Hand (`PortalWorld.spawnModel`); die Hülle für
 * die Physik wird um beides gemessen, damit der Kran den Zettel auch über dem
 * Blatt noch zu fassen bekommt.
 */
export function buildNote(stand: THREE.Object3D, text: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'note';
  group.add(stand);
  stand.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(stand);
  const label = new NoteLabel(text);
  const centre = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  const top = box.isEmpty() ? 0 : box.max.y;
  label.position.set(centre.x, top + GAP + (PAPER_H / 2) * Math.cos(TILT), centre.z);
  group.add(label);
  return group;
}

/** Das Blatt eines Zettels — `null`, wenn dieses Objekt keiner ist. */
export function noteLabelOf(object: THREE.Object3D): NoteLabel | null {
  const found = object.getObjectByName('note-paper');
  return found instanceof NoteLabel ? found : null;
}
