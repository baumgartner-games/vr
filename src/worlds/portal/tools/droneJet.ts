import * as THREE from 'three';

/**
 * Der Jet, in dem man sitzt.
 *
 * Im Kopter-Modus ist die Drohne ein Spielzeug von zwanzig Zentimetern, das
 * knapp unter der Blickachse hängt — mehr braucht ein Hubschrauber nicht. Im
 * Jet-Modus ist genau das falsch: Wer rollt und zieht, will einen Horizont,
 * der an einem Rahmen kippt, und einen Punkt, an dem er sitzt. Also ist die
 * Maschine dort eine **richtige kleine Maschine** — dreieinhalb Meter lang,
 * mit Nase, Flächen und Leitwerk — und das Auge des Piloten sitzt in ihrem
 * Cockpit: Instrumentenbrett vor den Knien, Kanzelbügel über dem Kopf,
 * Bordwand am Ellenbogen.
 *
 * Das ist nicht nur Deko. Ein Stück Welt, das sich relativ zum Kopf **nie**
 * bewegt, ist das wirksamste Mittel gegen Motion Sickness, das es gibt — und
 * in einer Maschine, die sich auf den Rücken legen darf, ist es Pflicht.
 *
 * Reine Geometrie: gebaut wird hier, geflogen in `droneFlight.ts`, verdrahtet
 * in `DroneTool`. Aufgeräumt wird sie mit dem Rest der Drohne über
 * `disposeToolTree` — deshalb hat sie kein eigenes `dispose`.
 *
 * Koordinaten wie überall bei der Drohne: **die Nase zeigt nach −Z**, oben ist
 * +Y, rechts +X.
 */

/**
 * Wo das Auge des Piloten sitzt, im eigenen Koordinatensystem.
 *
 * Der Punkt ist der Anfang von allem: Das Cockpit ist um einen **Menschen**
 * herum gebaut — Bordwand eine Handbreit unter dem Kinn, Brett gut einen halben
 * Meter vor der Nase, Kanzel eine Handbreit über dem Scheitel. Die Maschine
 * drumherum richtet sich danach, nicht umgekehrt.
 */
export const JET_EYE = new THREE.Vector3(0, 0.62, -0.8);

/** Wie tief die Maschine unter ihren Mittelpunkt reicht — das Parken hält Abstand. */
export const JET_BELLY = 0.7;

const TAU = Math.PI * 2;

export class JetBody extends THREE.Group {
  private readonly lights: Array<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>> = [];
  private readonly flame: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  private readonly glow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  /** Der Steuerknüppel, der mit dem rechten Stick mitgeht. */
  private readonly stick = new THREE.Group();

  constructor() {
    super();
    this.name = 'drone-jet';

    const shell = new THREE.MeshStandardMaterial({
      color: 0x3a4358,
      roughness: 0.55,
      metalness: 0.3,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.6,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x11151f, roughness: 0.85 });

    // --- Rumpf, Nase, Düse ---------------------------------------------------
    // Die Achse liegt unter dem Sitz, damit die Wanne oben herausschaut und der
    // Rumpf da ist, wo bei einem Jet der Rumpf ist: unter dem Piloten.
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 4, 16), shell);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(0, -0.28, 0.1);
    this.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 16), shell);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, -0.28, -2.35);
    this.add(nose);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.3, 16, 1, true), trim);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, -0.28, 2.2);
    this.add(nozzle);

    // Der Nachbrenner: eine Fahne nach hinten, die mit dem Schub heller wird.
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.9, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x6fd0ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    this.flame.rotation.x = Math.PI / 2;
    this.flame.position.set(0, -0.28, 2.8);
    this.add(this.flame);

    this.glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 18),
      new THREE.MeshBasicMaterial({
        color: 0xff9a4a,
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.glow.position.set(0, -0.28, 2.36);
    this.add(this.glow);

    // --- Flächen und Leitwerk ------------------------------------------------
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 1.25), shell);
      wing.position.set(side * 1.2, -0.34, 0.55);
      // Nach hinten gepfeilt, mit einem Hauch V-Stellung.
      wing.rotation.y = -side * 0.36;
      wing.rotation.z = side * 0.07;
      this.add(wing);

      const canard = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.38), trim);
      canard.position.set(side * 0.62, -0.12, -1.6);
      canard.rotation.y = -side * 0.42;
      this.add(canard);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 0.5), shell);
      tail.position.set(side * 0.7, -0.28, 1.82);
      tail.rotation.y = -side * 0.44;
      this.add(tail);

      // Positionslicht an der Flächenspitze: dieselbe Farbe wie die Lampe des
      // Kopters, damit „geparkt“ und „im Flug“ auch hier zu sehen sind.
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false }),
      );
      light.position.set(side * 2.02, -0.32, 0.98);
      this.add(light);
      this.lights.push(light);
    }

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.8), shell);
    fin.position.set(0, 0.2, 1.6);
    fin.rotation.x = -0.3;
    this.add(fin);

    // --- Das Cockpit ----------------------------------------------------------
    // Alles hier ist um `JET_EYE` herum gebaut, nicht um den Rumpf: was ein
    // Cockpit ausmacht, ist nicht, dass es *da* ist, sondern dass man es
    // **sieht**. Das alte saß gute dreißig Zentimeter zu tief und zu weit
    // vorn — technisch vorhanden, im Headset aber komplett unter dem
    // Blickfeld, weshalb die Rückmeldung „im Jet ist kein Cockpit" völlig
    // richtig war. Jetzt liegt die Bordwand eine Handbreit unter dem Auge,
    // das Brett schließt oben fast an den Horizont an, und der Knüppel steht
    // da, wo eine Hand ihn hält.
    const eye = JET_EYE;

    // Die Wanne: Boden unter den Füßen, Bordwand knapp unter dem Auge. Genau
    // diese Kante ist es, über die man im Flug hinwegschaut.
    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.62, 1.8), shell);
    tub.position.set(0, eye.y - 0.42, eye.z + 0.08);
    this.add(tub);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 1.5), dark);
    floor.position.set(0, eye.y - 0.7, eye.z);
    this.add(floor);

    for (const side of [-1, 1] as const) {
      // Bordwand auf Ellenbogenhöhe: das Stück Welt, an dem der Horizont
      // kippt, wenn die Maschine rollt.
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 1.8), trim);
      rail.position.set(side * 0.38, eye.y - 0.15, eye.z + 0.08);
      this.add(rail);
      // Seitenkonsole, im Augenwinkel — sie macht den Sitz erst zum Sitz.
      const console3d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.7), dark);
      console3d.position.set(side * 0.3, eye.y - 0.22, eye.z - 0.35);
      console3d.rotation.z = -side * 0.18;
      this.add(console3d);
    }

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.1), dark);
    seat.position.set(0, eye.y - 0.18, eye.z + 0.5);
    seat.rotation.x = 0.12;
    this.add(seat);

    const pan = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.5), dark);
    pan.position.set(0, eye.y - 0.5, eye.z + 0.24);
    this.add(pan);

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.14), trim);
    headrest.position.set(0, eye.y + 0.12, eye.z + 0.48);
    this.add(headrest);

    // --- Der Steuerknüppel ----------------------------------------------------
    // Er hängt an einem eigenen Gelenk, damit `setStick` ihn kippen kann: was
    // der rechte Stick sagt, macht der Knüppel vor. Ein Cockpit, in dem sich
    // nichts bewegt, ist eine Kulisse; einer, der mitgeht, ist die Bestätigung,
    // dass die Maschine gehört hat.
    this.stick.position.set(0, eye.y - 0.48, eye.z - 0.26);
    this.add(this.stick);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.26, 10), dark);
    column.position.set(0, 0.13, 0);
    this.stick.add(column);
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.07, 4, 10), dark);
    grip.position.set(0, 0.3, 0.01);
    grip.rotation.x = 0.18;
    this.stick.add(grip);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.018), trim);
    trigger.position.set(0, 0.3, -0.035);
    this.stick.add(trigger);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 12), trim);
    collar.position.set(0, 0.015, 0);
    this.stick.add(collar);

    // --- Das Instrumentenbrett ------------------------------------------------
    // Schräg unter der Sicht, oben fast am Horizont: eine Leinwand ist hier
    // zehn Zeilen billiger als zwanzig kleine Kästchen und sieht besser aus.
    // Nach hinten oben gekippt, damit die Fläche aufs Auge zeigt und man sie
    // liest, statt sie von der Kante zu sehen.
    const panelTilt = -0.55;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.05), dark);
    panel.position.set(0, eye.y - 0.19, eye.z - 0.42);
    panel.rotation.x = panelTilt;
    this.add(panel);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.3),
      new THREE.MeshBasicMaterial({ map: makeTexture(512, 232, drawPanel), toneMapped: false }),
    );
    face.position.set(0, eye.y - 0.175, eye.z - 0.395);
    face.rotation.x = panelTilt;
    this.add(face);

    // Die Blende über dem Brett: der Rand, den man beim Blick nach vorn sieht.
    const glare = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 0.16), dark);
    glare.position.set(0, eye.y - 0.06, eye.z - 0.52);
    glare.rotation.x = 0.25;
    this.add(glare);

    // Das HUD: eine Scheibe auf Augenhöhe, additiv, damit sie die Welt nicht
    // zudeckt, sondern sich darüberlegt.
    const hud = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.32),
      new THREE.MeshBasicMaterial({
        map: makeTexture(440, 320, drawHud),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    hud.position.set(0, eye.y + 0.04, eye.z - 0.55);
    hud.rotation.x = 0.12;
    this.add(hud);

    // --- Die Kanzel -----------------------------------------------------------
    // Richtige Scheiben statt einer Blase: eine Frontscheibe schräg nach vorn
    // und zwei Seitenscheiben, jede mit einem sichtbaren Rahmen. Der Rahmen ist
    // der eigentliche Trick — Glas allein sieht man nicht, und was man nicht
    // sieht, kann den Horizont auch nicht halten. Kein Steg quer durchs
    // Blickfeld: ein Rohr vor der Nase ist im Headset kein Rahmen, sondern ein
    // Balken.
    const glass = new THREE.MeshBasicMaterial({
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const pane = (
      width: number,
      height: number,
      at: readonly [number, number, number],
      rotation: readonly [number, number, number],
    ): void => {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glass);
      sheet.position.set(at[0], at[1], at[2]);
      sheet.rotation.set(rotation[0], rotation[1], rotation[2]);
      sheet.renderOrder = 4;
      this.add(sheet);
      // Vier dünne Leisten am Rand. Das Glas allein sieht man nicht — der
      // Rahmen ist es, an dem der Horizont beim Rollen kippt.
      const bar = 0.022;
      for (const [w, h, x, y] of [
        [width, bar, 0, height / 2],
        [width, bar, 0, -height / 2],
        [bar, height, width / 2, 0],
        [bar, height, -width / 2, 0],
      ] as const) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w, h, bar), trim);
        strip.position.set(x, y, 0);
        sheet.add(strip);
      }
    };

    // Frontscheibe: nach vorn geneigt, vom Brett bis über den Scheitel.
    pane(0.78, 0.62, [0, eye.y + 0.11, eye.z - 0.62], [0.42, 0, 0]);
    for (const side of [-1, 1] as const) {
      // Seitenscheiben, leicht eingezogen — sie sind das, was beim Rollen
      // mitkippt und dem Auge sagt, wo oben ist.
      pane(1.5, 0.5, [side * 0.4, eye.y + 0.06, eye.z + 0.05], [0, side * (Math.PI / 2 - 0.16), 0]);
    }
    // Dach hinter dem Kopf, damit die Kanzel geschlossen wirkt.
    pane(0.76, 0.9, [0, eye.y + 0.34, eye.z + 0.34], [Math.PI / 2 - 0.2, 0, 0]);

    // Ein Bügel, und der steht *hinter* dem Kopf.
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.026, 6, 20, Math.PI), trim);
    bow.position.set(0, eye.y + 0.05, eye.z + 0.62);
    this.add(bow);
  }

  /**
   * Wohin der Steuerknüppel zeigt: `x` rollt, `y` nickt, beide −1 … 1 wie der
   * Stick, der sie liefert. Rein optisch — geflogen wird in `droneFlight.ts`.
   */
  setStick(x: number, y: number): void {
    const roll = THREE.MathUtils.clamp(x, -1, 1) * 0.42;
    const pitch = THREE.MathUtils.clamp(y, -1, 1) * 0.42;
    this.stick.rotation.set(pitch, 0, -roll);
  }

  /** Dieselbe Farbe, die am Kopter die Lampe zeigt. */
  setLights(color: number): void {
    for (const light of this.lights) light.material.color.setHex(color);
  }

  /** Wie viel Schub gerade anliegt (0…1) — nur der Nachbrenner hört zu. */
  setThrottle(amount: number): void {
    const level = Math.min(1, Math.max(0, amount));
    this.flame.material.opacity = 0.45 * level;
    this.flame.scale.setScalar(0.55 + level * 0.6);
    this.glow.material.opacity = 0.25 + level * 0.5;
  }
}

/** Eine Leinwand als Textur — gezeichnet wird sie einmal, beim Bauen. */
function makeTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Das Instrumentenbrett: zwei Rundinstrumente, ein paar Balken, Beschriftung. */
function drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#0b1018';
  ctx.fillRect(0, 0, w, h);

  for (const [cx, label] of [
    [w * 0.2, 'HÖHE'],
    [w * 0.8, 'TEMPO'],
  ] as const) {
    const cy = h * 0.5;
    const r = h * 0.34;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fillStyle = '#111a26';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4aa8ff';
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * 0.78, cy + Math.sin(angle) * r * 0.78);
      ctx.lineTo(cx + Math.cos(angle) * r * 0.94, cy + Math.sin(angle) * r * 0.94);
      ctx.strokeStyle = 'rgba(154,166,189,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-2.2) * r * 0.72, cy + Math.sin(-2.2) * r * 0.72);
    ctx.strokeStyle = '#5ee0a0';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(154,166,189,0.9)';
    ctx.font = `600 ${Math.round(h * 0.11)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + r + h * 0.13);
  }

  // Der Streifen in der Mitte: Warnlampen, wie sie jedes Brett hat.
  const colors = ['#5ee0a0', '#ffc857', '#ff7a5e', '#4aa8ff'];
  for (let i = 0; i < colors.length; i++) {
    const x = w * 0.38 + i * (w * 0.06);
    ctx.fillStyle = colors[i]!;
    ctx.globalAlpha = i === 0 ? 1 : 0.35;
    ctx.beginPath();
    ctx.roundRect(x, h * 0.24, w * 0.045, h * 0.1, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Weiter unten sieht das Brett niemand: die Blende schneidet es ab.
  ctx.fillStyle = 'rgba(74,168,255,0.85)';
  ctx.beginPath();
  ctx.roundRect(w * 0.37, h * 0.4, w * 0.26, h * 0.22, 8);
  ctx.fill();
  ctx.fillStyle = '#04070c';
  ctx.font = `700 ${Math.round(h * 0.14)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('DROHNE', w * 0.5, h * 0.56);
}

/** Das HUD: Fadenkreuz und eine Horizontleiter, damit die Kurve etwas hat. */
function drawHud(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#7dffb0';
  ctx.lineWidth = 3;

  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, TAU);
  ctx.stroke();
  for (const dx of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * 22, cy);
    ctx.lineTo(cx + dx * 54, cy);
    ctx.stroke();
  }

  // Leiter: die Striche über und unter der Mitte.
  for (let i = 1; i <= 3; i++) {
    for (const dy of [-1, 1] as const) {
      const y = cy + dy * i * 26;
      ctx.beginPath();
      ctx.moveTo(cx - 46, y);
      ctx.lineTo(cx - 20, y);
      ctx.moveTo(cx + 20, y);
      ctx.lineTo(cx + 46, y);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(125,255,176,0.55)';
  ctx.strokeRect(10, 10, w - 20, h - 20);
}
