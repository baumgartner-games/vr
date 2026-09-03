import { BrushTool } from './BrushTool';
import { DroneTool } from './DroneTool';
import { EraserTool } from './EraserTool';
import { GrappleTool } from './GrappleTool';
import { GravityGloveTool } from './GravityGloveTool';
import { PistolTool } from './PistolTool';
import { StopwatchTool } from './StopwatchTool';
import { TapeTool } from './TapeTool';
import { TransformTool } from './TransformTool';
import { WelderTool } from './WelderTool';
import { XrayTool } from './XrayTool';
import { createPortalGunTool } from './PortalGunTool';
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
  'welder',
  'xray',
  'drone',
  'tape',
  'eraser',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

/**
 * Builds a tool from its id. The same call serves the local shelf and the
 * other players' hands, so everybody sees the same thing being carried around.
 */
export function createTool(id: string): Tool | null {
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
    case 'welder':
      return new WelderTool();
    case 'xray':
      return new XrayTool();
    case 'drone':
      return new DroneTool();
    case 'tape':
      return new TapeTool();
    case 'eraser':
      return new EraserTool();
    default:
      return createPortalGunTool(id);
  }
}

export {
  BrushTool,
  DroneTool,
  EraserTool,
  GrappleTool,
  GravityGloveTool,
  PistolTool,
  StopwatchTool,
  TapeTool,
  TransformTool,
  WelderTool,
  XrayTool,
};
export { PortalGunTool, createPortalGunTool, COLOR_BLUE, COLOR_RED } from './PortalGunTool';
export { Tool, disposeToolTree, type ToolHost, type SurfaceHit, type WeldRequest } from './Tool';
export { aimRotation, aimError, type Quat as AimQuat } from './aim';
