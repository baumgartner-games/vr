import { BrushTool } from './BrushTool';
import { PistolTool } from './PistolTool';
import { StopwatchTool } from './StopwatchTool';
import { TransformTool } from './TransformTool';
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
    default:
      return createPortalGunTool(id);
  }
}

export { BrushTool, PistolTool, StopwatchTool, TransformTool };
export { PortalGunTool, createPortalGunTool, COLOR_BLUE, COLOR_RED } from './PortalGunTool';
export { Tool, disposeToolTree, type ToolHost, type SurfaceHit } from './Tool';
