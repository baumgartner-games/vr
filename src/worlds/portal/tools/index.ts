import { BrushTool } from './BrushTool';
import { ControllerTool } from './ControllerTool';
import { DroneTool } from './DroneTool';
import { DuplicatorTool } from './DuplicatorTool';
import { EraserTool } from './EraserTool';
import { FlashlightTool } from './FlashlightTool';
import { GrappleTool } from './GrappleTool';
import { HammerTool } from './HammerTool';
import { HandTool } from './HandTool';
import { HolsterTool } from './HolsterTool';
import { InspectTool } from './InspectTool';
import { GravityGloveTool } from './GravityGloveTool';
import { PistolTool } from './PistolTool';
import { ShurikenTool } from './ShurikenTool';
import { SupermanGloveTool } from './SupermanGloveTool';
import { StopwatchTool } from './StopwatchTool';
import { TapeTool } from './TapeTool';
import { TeleportTool } from './TeleportTool';
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
  'holster',
  'brush',
  'duplicator',
  'inspect',
  'pistol',
  'shuriken',
  'hammer',
  'stopwatch',
  'flashlight',
  'grapple',
  'gravity-glove',
  'translate-glove',
  'superman-glove',
  'welder',
  'xray',
  'drone',
  'tape',
  'teleport',
  'eraser',
  // Die drei, die im Eingaberaum eingemessen werden: die Hand selbst und die
  // beiden Geräte, in denen sie steckt.
  'hand-box',
  'controller-left',
  'controller-right',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

/**
 * Builds a tool from its id. The same call serves the local shelf and the
 * other players' hands, so everybody sees the same thing being carried around.
 */
export function createTool(id: string): Tool | null {
  const tool = buildTool(id);
  if (!tool) return null;
  // Remember how it was built, then put a pose the player measured at the
  // adjustment bench back on top — that one outlives the reload.
  tool.factoryPosition.copy(tool.holdPosition);
  tool.factoryRotation.copy(tool.holdRotation);
  applyStoredPose(tool);
  return tool;
}

function buildTool(id: string): Tool | null {
  switch (id) {
    case 'gizmo':
      return new TransformTool();
    case 'holster':
      return new HolsterTool();
    case 'brush':
      return new BrushTool();
    case 'duplicator':
      return new DuplicatorTool();
    case 'inspect':
      return new InspectTool();
    case 'pistol':
      return new PistolTool();
    case 'shuriken':
      return new ShurikenTool();
    case 'hammer':
      return new HammerTool();
    case 'stopwatch':
      return new StopwatchTool();
    case 'flashlight':
      return new FlashlightTool();
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
    case 'teleport':
      return new TeleportTool();
    case 'eraser':
      return new EraserTool();
    case 'hand-box':
      return new HandTool();
    case 'controller-left':
      return new ControllerTool('left');
    case 'controller-right':
      return new ControllerTool('right');
    default:
      return createPortalGunTool(id);
  }
}

export {
  BrushTool,
  ControllerTool,
  DroneTool,
  DuplicatorTool,
  InspectTool,
  EraserTool,
  FlashlightTool,
  GrappleTool,
  GravityGloveTool,
  HammerTool,
  HandTool,
  HolsterTool,
  PistolTool,
  ShurikenTool,
  StopwatchTool,
  SupermanGloveTool,
  TapeTool,
  TeleportTool,
  TransformTool,
  TranslateGloveTool,
  WelderTool,
  XrayTool,
};
export { controllerToolId, CONTROLLER_TOOL_IDS } from './ControllerTool';
export {
  applyStoredPose,
  clearPose,
  clearPoses,
  holdPoseHands,
  holdPoseSnapshot,
  savePose,
  saveHoldPoses,
  storedPose,
  storedPoseCount,
  storedPoseHand,
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
export {
  HAMMER_HOME,
  HAMMER_SHAFT,
  MIN_SPAN,
  SWING_MAX,
  SWING_MIN,
  SWING_TRANSFER,
  clampShaftGrip,
  spanPole,
  swingPush,
  type Hold,
  type Shaft,
  type Span,
} from './poleGrip';
export {
  GRIP_DEPTH,
  GRIP_LENGTH,
  GRIP_NAME,
  GRIP_WIDTH,
  ROD_GRIP_ROTATION,
  createGrip,
  createGripShape,
  rodHoldRotation,
  type GripOptions,
} from './grip';
export {
  GRIP_HOLD_POSITIONS,
  STANDARD_GRIPS,
  gripDeviation,
  gripInTool,
  holdForGrip,
  type GripDeviation,
  type GripPose,
} from './gripFit';
export { createSight, Attachment, type AttachmentContext } from './attachments';
export {
  DEFAULT_MATERIAL,
  MATERIALS,
  findMaterial,
  isTransparent,
  type SurfaceMaterial,
} from './materials';
export {
  DEFAULT_STOPWATCH,
  FACTOR_STEPS,
  FRAME_STEPS,
  STOPWATCH_ACTIONS,
  STOPWATCH_ACTION_LABELS,
  clampStopwatch,
  factorLabel,
  framesLabel,
  nextFactor,
  nextFrames,
  nextStopwatchAction,
  type StopwatchAction,
  type StopwatchSettings,
} from './stopwatchSettings';
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
export { SPIN_RATE, THROW_SPEED } from './ShurikenTool';
export {
  DEFAULT_BEAM_ANGLE,
  MAX_BEAM_ANGLE,
  MIN_BEAM_ANGLE,
  beamAngleFromDrag,
  beamIntensity,
  beamLabel,
  beamRange,
  clampBeamAngle,
} from './flashlightBeam';
