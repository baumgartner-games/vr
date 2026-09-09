/** @jest-environment jsdom */
import * as THREE from 'three';
import { ToolBelt } from '../ToolBelt';
import { PlayerRig } from '../../../core/PlayerRig';
import { RadarTool } from './RadarTool';
import { XrayTool } from './XrayTool';

beforeAll(() => {
  const context = new Proxy({}, { get: () => () => {} });
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => context as CanvasRenderingContext2D);
});

test('radar and xray use the identical physical housing and standard grip, and either fits a hip', () => {
  const radar = new RadarTool(),
    xray = new XrayTool();
  const dimensions = (tool: RadarTool | XrayTool): number[] => {
    tool.updateWorldMatrix(true, true);
    return new THREE.Box3().setFromObject(tool).getSize(new THREE.Vector3()).toArray();
  };
  expect(dimensions(radar)).toEqual(dimensions(xray));
  expect(radar.gripPart).not.toBeNull();
  expect(xray.gripPart).not.toBeNull();
  const rig = new PlayerRig(
    { xr: { isPresenting: false } } as unknown as THREE.WebGLRenderer,
    new THREE.PerspectiveCamera(),
  );
  const belt = new ToolBelt(rig);
  belt.stow(radar, 'left');
  belt.stow(xray, 'right');
  expect(belt.slot('left').tool).toBe(radar);
  expect(belt.slot('right').tool).toBe(xray);
  expect(radar.heldBy).toBeNull();
  expect(xray.heldBy).toBeNull();
  belt.dispose();
  radar.disposeTool();
  xray.disposeTool();
});

test('the xray sees world-positioned cargo only through its frame, reuses ghosts and hides them when put away', () => {
  const scanner = new XrayTool();
  const world = new THREE.Group();
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), new THREE.MeshBasicMaterial());
  const room = new THREE.Group();
  room.position.set(0, 1, -3);
  room.add(cargo);
  world.add(room, scanner);
  scanner.position.set(0, 1, -0.5);
  const subject = { object: cargo };
  scanner.setSubjects(() => [subject]);
  world.updateMatrixWorld(true);
  const eye = new THREE.Vector3(0, 1.6, 0);
  scanner.updateView(world, eye);
  const overlays = world.getObjectByName('xray-overlays')!;
  const ghost = overlays.children[0]! as THREE.Mesh;
  expect(overlays.visible).toBe(true);
  expect(ghost.matrix.elements[14]).toBe(-3);
  expect((ghost.material as THREE.MeshBasicMaterial).clippingPlanes).toHaveLength(4);
  scanner.updateView(world, eye);
  expect(overlays.children).toEqual([ghost]);
  room.position.z = -80;
  scanner.updateView(world, eye);
  expect(overlays.children).toHaveLength(0);
  scanner.updateView(world, eye, false);
  expect(overlays.visible).toBe(false);
  scanner.disposeTool();
  expect(world.getObjectByName('xray-overlays')).toBeUndefined();
  cargo.geometry.dispose();
  (cargo.material as THREE.Material).dispose();
});
