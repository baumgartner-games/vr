import type { PlayerRole } from './types';

export interface XRSupport {
  /** `navigator.xr` exists at all. */
  available: boolean;
  /** An immersive-vr session can be requested. */
  immersiveVR: boolean;
  reason?: string;
}

export async function detectXRSupport(): Promise<XRSupport> {
  const xr = navigator.xr;
  if (!xr) {
    const secure = window.isSecureContext;
    return {
      available: false,
      immersiveVR: false,
      reason: secure
        ? 'Dieser Browser meldet keine WebXR-Unterstützung.'
        : 'WebXR braucht HTTPS (oder localhost).',
    };
  }
  try {
    const immersiveVR = await xr.isSessionSupported('immersive-vr');
    return {
      available: true,
      immersiveVR,
      reason: immersiveVR ? undefined : 'Kein VR-Gerät gefunden – der Flat-Modus geht trotzdem.',
    };
  } catch (err) {
    return { available: true, immersiveVR: false, reason: String(err) };
  }
}

/** Coarse pointer + touch => treat as a phone/tablet ("handheld" role). */
export function detectFlatRole(): PlayerRole {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touch = navigator.maxTouchPoints > 0;
  return coarse && touch ? 'handheld' : 'desktop';
}
