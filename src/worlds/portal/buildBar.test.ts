import { BUILD_TOOLS, nextBuildTool, type BuildTool } from './buildBar';

/**
 * **Die Werkzeugleiste am Pad** (`buildBar.nextBuildTool`): Das Steuerkreuz
 * ↑/↓ schaltet durch die Werkzeuge, in der Reihenfolge, in der sie auf der
 * Leiste stehen — und meldet dabei, was ein Klick auf den Knopf gemeldet
 * hätte.
 */
describe('Werkzeug wechseln mit dem Steuerkreuz', () => {
  it('geht nach rechts durch die Leiste und vorn wieder weiter', () => {
    expect(nextBuildTool('place', 1)).toEqual({ kind: 'tool', tool: 'move' });
    expect(nextBuildTool('move', 1)).toEqual({ kind: 'tool', tool: 'erase' });
    expect(nextBuildTool('erase', 1)).toEqual({ kind: 'copy' });
    expect(nextBuildTool('copy', 1)).toEqual({ kind: 'tool', tool: 'floor' });
    expect(nextBuildTool('floor', 1)).toEqual({ kind: 'tool', tool: 'wall' });
    expect(nextBuildTool('wall', 1)).toEqual({ kind: 'tool', tool: 'place' });
  });

  it('geht nach links genauso zurück', () => {
    expect(nextBuildTool('place', -1)).toEqual({ kind: 'tool', tool: 'wall' });
    expect(nextBuildTool('floor', -1)).toEqual({ kind: 'copy' });
    expect(nextBuildTool('copy', -1)).toEqual({ kind: 'tool', tool: 'erase' });
    expect(nextBuildTool('move', -1)).toEqual({ kind: 'tool', tool: 'place' });
  });

  it('kommt nach einer Runde dort an, wo es losging', () => {
    for (const start of BUILD_TOOLS) {
      let tool: BuildTool = start;
      for (let i = 0; i < BUILD_TOOLS.length; i++) {
        const event = nextBuildTool(tool, 1);
        if (event.kind === 'copy') tool = 'copy';
        else if (event.kind === 'tool') tool = event.tool;
      }
      expect(tool).toBe(start);
    }
  });
});
