import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import type { ControllerState } from '../../../core/XRInput';
import type { PropReport } from '../PortalWorld';

/** So weit reicht der Blick des Geräts. */
const RANGE = 30;
/** Wie oft die Anzeige neu geschrieben wird — sie muss nicht mit 90 Hz zittern. */
const REFRESH = 0.12;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _point = new THREE.Vector3();

/**
 * Der Inspektor: das Werkzeug, das sagt, was da eigentlich liegt.
 *
 * Ein Sandkasten mit Physik hat lauter Zahlen, die man nicht sieht — Masse,
 * Reibung, Rückprall, Geschwindigkeit, Collider-Form. Wenn eine Kiste anders
 * fällt als erwartet, ist die Frage nie „warum sieht sie so aus", sondern
 * „was steht in ihr drin". Genau das liest dieses Gerät ab: anzielen, und auf
 * dem Display steht alles, laufend aktualisiert.
 *
 * Er verändert **nichts**. Das ist keine Einschränkung, sondern der Punkt: der
 * Justierer stellt Werkzeuge ein, der Pinsel Material, *Größe & Position* die
 * Maße — der Inspektor ist das eine Werkzeug, das man in einen wackeligen
 * Stapel halten kann, ohne ihn umzuwerfen.
 */
export class InspectTool extends Tool {
  override readonly toolId = 'inspect';
  override readonly label = 'Inspektor';

  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly display: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly marker: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  private readonly muzzle = new THREE.Object3D();
  private report: PropReport | null = null;
  private since = 0;

  constructor() {
    super();
    this.name = 'tool-inspect';
    this.icon = 'xray';
    this.accent = 0x9fe3ff;
    this.hint = 'Zielen · das Display sagt, was es ist';
    this.holdPosition.set(0, -0.015, 0.03);
    // **Wie eine Waffe** und ohne Zusatzneigung. Der Inspektor lag eine Weile
    // 23° nach vorn gekippt in der Hand, damit das Display zum Gesicht zeigt —
    // und rollte damit so weit über die Faust, dass er nicht mehr aussah wie
    // etwas, das man hält, sondern wie etwas, das aus der Hand fällt. Er zeigt
    // jetzt dorthin, wohin man zeigt; das Display ist am Gehäuse geneigt und
    // nicht das ganze Gerät in der Hand.

    const shell = new THREE.MeshStandardMaterial({
      color: 0x22304a,
      roughness: 0.55,
      metalness: 0.25,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.14), shell);
    body.position.set(0, 0, -0.04);
    this.add(body);

    // Derselbe Halterzylinder wie an der Pistole (`grip.ts`) — und ohne
    // Zusatzneigung darüber liegt er auch genau wie dort in der Faust.
    this.mountGrip({ length: 0.085 });

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.014, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: 0x9fe3ff, roughness: 0.2, metalness: 0.6 }),
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, -0.115);
    this.add(lens);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 320;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.1),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.display.position.set(0, 0.075, -0.02);
    this.display.rotation.x = -0.45;
    this.add(this.display);

    this.muzzle.position.set(0, 0, -0.13);
    this.add(this.muzzle);

    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0.4 }),
    );
    this.beam.frustumCulled = false;
    this.beam.position.copy(this.muzzle.position);
    this.add(this.beam);

    this.marker = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0.85 }),
    );
    this.marker.frustumCulled = false;
    this.marker.visible = false;

    this.draw();
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.marker.parent !== host.root) host.root.add(this.marker);
  }

  override onStow(_host: ToolHost): void {
    this.marker.visible = false;
    this.report = null;
    this.draw();
  }

  /** Der Trigger friert die Anzeige ein — zum Ablesen, ohne stillzuhalten. */
  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (!this.report) {
      host.notify('Nichts anvisiert');
      return;
    }
    host.notify(
      `${this.report.label}: ${this.report.mass.toFixed(2)} kg · ${this.report.material}`,
    );
    controller.pulse(0.3, 20);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!controller || !this.heldBy) {
      this.marker.visible = false;
      return;
    }

    this.muzzle.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const entry = host.aimAt(_tip, _direction, RANGE);

    if (!entry) {
      this.marker.visible = false;
      this.beam.scale.z = 2;
      if (this.report) {
        this.report = null;
        this.draw();
      }
      return;
    }

    entry.object.getWorldPosition(_point);
    this.beam.scale.z = Math.max(0.2, _tip.distanceTo(_point));
    this.marker.position.copy(_point);
    this.marker.quaternion.copy(entry.object.getWorldQuaternion(_quaternion));
    this.marker.scale.copy(entry.halfExtents).multiplyScalar(2.06);
    this.marker.visible = true;

    this.since += dt;
    if (this.since < REFRESH) return;
    this.since = 0;
    this.report = host.inspectProp(entry);
    this.draw();
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.texture.dispose();
    this.marker.geometry.dispose();
    this.marker.material.dispose();
    this.marker.removeFromParent();
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.roundRect(6, 6, width - 12, height - 12, 22);
    ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.report ? '#9fe3ff' : 'rgba(159,227,255,0.4)';
    ctx.stroke();

    ctx.textBaseline = 'middle';
    const report = this.report;
    if (!report) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 34px system-ui, sans-serif';
      ctx.fillText('Auf ein Objekt zielen', width / 2, height / 2);
      this.texture.needsUpdate = true;
      return;
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText(report.label, 28, 44);
    ctx.fillStyle = 'rgba(159,227,255,0.9)';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText(`${report.shape} · ${report.material} · ${report.id}`, 28, 78);

    const rows: Array<[string, string]> = [
      ['Masse', `${report.mass.toFixed(2)} kg`],
      ['Maße', `${cm(report.size.x)} × ${cm(report.size.y)} × ${cm(report.size.z)} cm`],
      ['Tempo', `${report.speed.toFixed(2)} m/s`],
      ['Drehung', `${report.spin.toFixed(2)} rad/s`],
      ['Höhe', `${report.height.toFixed(2)} m`],
      ['Reibung', `${report.friction.toFixed(2)} · Rückprall ${report.bounce.toFixed(2)}`],
    ];
    ctx.font = '500 24px system-ui, sans-serif';
    rows.forEach(([label, value], index) => {
      const y = 116 + index * 30;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(label, 28, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(value, 170, y);
    });

    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillStyle = report.held ? '#5ee0a0' : report.sleeping ? '#8e9db8' : '#ffc857';
    ctx.fillText(
      report.held ? 'in einer Hand' : report.sleeping ? 'schläft' : 'in Bewegung',
      28,
      height - 34,
    );
    this.texture.needsUpdate = true;
  }
}

function cm(metres: number): string {
  return (metres * 100).toFixed(1);
}
