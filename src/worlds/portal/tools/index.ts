import { AdjustTool } from './AdjustTool';
import { BrushTool } from './BrushTool';
import { DroneTool } from './DroneTool';
import { EraserTool } from './EraserTool';
import { GrappleTool } from './GrappleTool';
import { GravityGloveTool } from './GravityGloveTool';
import { PistolTool } from './PistolTool';
import { SupermanGloveTool } from './SupermanGloveTool';
import { StopwatchTool } from './StopwatchTool';
import { TapeTool } from './TapeTool';
import { TransformTool } from './TransformTool';
import { TranslateGloveTool } from './TranslateGloveTool';
import { WelderTool } from './WelderTool';
import { XrayTool } from './XrayTool';
import { createPortalGunTool } from './PortalGunTool';
import { applyStoredPose } from './poseStore';
import type { Tool } from './Tool';

/** Every tool the portal lab knows, in the order the shelf lists them. */
export const TOOL_IDS = [
  'gun-blue',
  'gun-red',
  'gun-dual',
  'gizmo',
  'brush',
  'pistol',
  'stopwatch',
  'grapple',
  'gravity-glove',
  'translate-glove',
  'superman-glove',
  'welder',
  'xray',
  'drone',
  'tape',
  'adjust',
  'eraser',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

/**
 * Builds a tool from its id. The same call serves the local shelf and the
 * other players' hands, so everybody sees the same thing being carried around.
 */
export function createTool(id: string): Tool | null {
  const tool = buildTool(id);
  if (!tool) return null;
  // Remember how it was built, then put a pose the player measured with the
  // adjustment tool back on top — that one outlives the reload.
  tool.factoryPosition.copy(tool.holdPosition);
  tool.factoryRotation.copy(tool.holdRotation);
  applyStoredPose(tool);
  return tool;
}

function buildTool(id: string): Tool | null {
  switch (id) {
    case 'gizmo':
      return new TransformTool();
    case 'brush':
      return new BrushTool();
    case 'pistol':
      return new PistolTool();
    case 'stopwatch':
      return new StopwatchTool();
    case 'grapple':
      return new GrappleTool();
    case 'gravity-glove':
      return new GravityGloveTool();
    case 'translate-glove':
      return new TranslateGloveTool();
    case 'superman-glove':
      return new SupermanGloveTool();
    case 'welder':
      return new WelderTool();
    case 'xray':
      return new XrayTool();
    case 'drone':
      return new DroneTool();
    case 'tape':
      return new TapeTool();
    case 'adjust':
      return new AdjustTool();
    case 'eraser':
      return new EraserTool();
    default:
      return createPortalGunTool(id);
  }
}

export {
  AdjustTool,
  BrushTool,
  DroneTool,
  EraserTool,
  GrappleTool,
  GravityGloveTool,
  PistolTool,
  StopwatchTool,
  SupermanGloveTool,
  TapeTool,
  TransformTool,
  TranslateGloveTool,
  WelderTool,
  XrayTool,
};
export {
  applyStoredPose,
  clearPoses,
  holdPoseSnapshot,
  savePose,
  saveHoldPoses,
  storedPose,
  storedPoseCount,
} from './poseStore';
export {
  eulerXYZ,
  formatPose,
  holdPoseFrom,
  mirrorReadout,
  poseFromReadout,
  quatFromEulerXYZ,
  readPose,
  readoutFromArray,
  readoutToArray,
  type HoldPose,
  type PoseReadout,
} from './toolPose';
export { matchAxes, type AxisMatch, type Basis } from './axisMatch';
export {
  AMMO_KINDS,
  AMMO_LABELS,
  BURST_STEPS,
  DEFAULT_WEAPON,
  FIRE_MODES,
  FIRE_MODE_LABELS,
  MAGAZINE_STEPS,
  POWER_STEPS,
  RATE_STEPS,
  RELOAD_STEPS,
  SIGHTS,
  SIGHT_KINDS,
  SPEED_STEPS,
  WEAPON_FIELDS,
  clampField,
  clampWeapon,
  nextIn,
  nextStep,
  normalizeSights,
  powerLabel,
  sightsLabel,
  toggleSight,
  type AmmoKind,
  type FireMode,
  type SightKind,
  type WeaponField,
  type WeaponSettings,
} from './weaponSettings';
export { createSight, Attachment, type AttachmentContext } from './attachments';
export {
  attachmentPose,
  attachmentPoseCount,
  clearAttachmentPoses,
  droneSettings,
  onGearChange,
  saveAttachmentPose,
  saveDroneSettings,
  weaponSettings,
} from './gearStore';
export {
  DEFAULT_DRONE,
  DRONE_FIELDS,
  DRONE_PROFILES,
  clampDrone,
  droneFieldLabel,
  droneProfileLabel,
  nextDroneStep,
  type DroneField,
  type DroneProfile,
  type DroneSettings,
} from './droneSettings';
export {
  DRONE_TUNING,
  droneTuning,
  flyJet,
  flyKopter,
  headingOf,
  levelOf,
  type DroneTuning,
} from './droneFlight';
export { JET_EYE, JetBody } from './droneJet';
export { readGear, writeGear, type GearData } from './gearCodec';
export {
  applyGearConfig,
  clearGearConfig,
  gearCode,
  gearCodeLines,
  gearConfig,
  parseGearCode,
  type GearConfig,
} from './gearConfig';
export { PortalGunTool, createPortalGunTool, COLOR_BLUE, COLOR_RED } from './PortalGunTool';
export {
  Tool,
  aimQuaternion,
  disposeToolTree,
  type BulletOptions,
  type ToolHost,
  type SurfaceHit,
  type WeldRequest,
} from './Tool';
export { aimRotation, aimError, type Quat as AimQuat } from './aim';
