import { Registry } from './registry';
import { registerRole, roles, listRoles } from './roles';
import { registerViewMode, viewModes, viewModesFor } from './viewModes';
import { registerAsset, assets, assetsOf } from './assets';

afterEach(() => {
  roles.clear();
  viewModes.clear();
  assets.clear();
});

describe('Registry', () => {
  it('hält die Eintragsreihenfolge und lässt `order` gewinnen', () => {
    const reg = new Registry<{ id: string; order?: number }>('t');
    reg.register({ id: 'b' });
    reg.register({ id: 'a' });
    reg.register({ id: 'first', order: -1 });
    expect(reg.list().map((e) => e.id)).toEqual(['first', 'b', 'a']);
  });

  it('ersetzt eine doppelte Kennung, statt sie zweimal zu führen', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const reg = new Registry<{ id: string; v: number }>('t');
    reg.register({ id: 'x', v: 1 });
    reg.register({ id: 'x', v: 2 });
    expect(reg.list()).toEqual([{ id: 'x', v: 2 }]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('Rollen, Ansichtsmodi, Assets', () => {
  it('trägt aus getrennten Aufrufen ein und filtert Verborgene', () => {
    const mount = () => ({ element: {} as HTMLElement, update: () => {}, dispose: () => {} });
    registerRole({ id: 'a', label: 'A', tagline: '', sees: '', surface: 'dom', mount });
    registerRole({
      id: 'h',
      label: 'H',
      tagline: '',
      sees: '',
      surface: 'dom',
      hidden: true,
      mount,
    });
    expect(listRoles().map((r) => r.id)).toEqual(['a']);
    expect(roles.get('h')?.hidden).toBe(true);
  });

  it('bietet Modi nur ihrem Publikum an', () => {
    registerViewMode({
      id: 'm1',
      label: '',
      description: '',
      layers: {},
      markers: 'live',
      visibility: 'omniscient',
      audience: ['flat'],
    });
    registerViewMode({
      id: 'm2',
      label: '',
      description: '',
      layers: {},
      markers: 'none',
      visibility: 'realistic',
    });
    expect(viewModesFor('flat').map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(viewModesFor('scout').map((m) => m.id)).toEqual(['m2']);
  });

  it('sortiert Assets nach Sorte', () => {
    registerAsset({ id: 'beep', kind: 'audio', owner: 'audio', load: () => null });
    registerAsset({ id: 'crate', kind: 'model', owner: '3d', load: () => null });
    expect(assetsOf('audio').map((a) => a.id)).toEqual(['beep']);
  });
});
