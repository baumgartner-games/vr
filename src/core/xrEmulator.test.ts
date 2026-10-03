import { emulationRequested } from './xrEmulator';

describe('emulationRequested', () => {
  it('asks for the simulated headset only with ?xr=sim', () => {
    expect(emulationRequested('?xr=sim')).toBe(true);
    expect(emulationRequested('?at=1,2&xr=sim')).toBe(true);
    expect(emulationRequested('')).toBe(false);
    expect(emulationRequested('?xr=1')).toBe(false);
  });
});
