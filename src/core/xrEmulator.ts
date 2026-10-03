/**
 * **Die Brille im Browser nachstellen** — eine Quest 3, ohne dass eine da ist.
 *
 * Gewünscht: _„bitte im browser die möglichkeit […] den ‚vr modus'
 * auszuprobieren auch wenn kein webxr unterstützt wird aber dann eben mit der
 * quest ansicht simuliert."_ Dafür gibt es Metas eigenen Emulator, **IWER**
 * (Immersive Web Emulation Runtime): Er setzt ein `navigator.xr` ein, das sich
 * wie eine Quest 3 meldet — Kopf, zwei Controller mit allen Knöpfen, dieselben
 * Profile —, und die **DevUI** daneben steuert Kopf und Hände mit Maus und
 * Tastatur. Mit `polyfillLayers` kann er auch WebXR Layers, also die
 * Quad-Ebene des Menüs (`ui/XRMenuLayer.ts`).
 *
 * Geladen wird beides **erst beim ersten Gebrauch** (dynamischer Import): Wer
 * nie simuliert, lädt kein Byte davon. Angeboten wird es nur, wenn keine
 * Brille gemeldet ist (`App.viewMenu`) oder die Adresse `?xr=sim` trägt.
 */

let installing: Promise<void> | null = null;

/** Ob der Emulator läuft — dann ist jede „Brille" eine nachgestellte. */
export function questEmulated(): boolean {
  return installing !== null;
}

/** Den Emulator einsetzen, einmal je Seite. Danach meldet `navigator.xr` eine Quest 3. */
export function emulateQuest(): Promise<void> {
  installing ??= (async () => {
    const [{ XRDevice, metaQuest3 }, { DevUI }, { default: LayersPolyfill }] = await Promise.all([
      import('iwer'),
      import('@iwer/devui'),
      import('webxr-layers-polyfill'),
    ]);
    const device = new XRDevice(metaQuest3);
    // `forceInstall`: Chrome am Schreibtisch hat ein `navigator.xr`, nur
    // ohne Brille daran — ohne den Schalter ließe IWER es stehen.
    device.installRuntime({ forceInstall: true });
    // **Die Layers selbst danach einsetzen.** IWERs eigenes `polyfillLayers`
    // setzt den Polyfill ein und überschreibt gleich darauf dessen
    // `XRWebGLBinding` mit dem eigenen (iwer 2.5.0) — dann gibt es keine
    // Projektionsebene, und das Menü käme nie als Ebene.
    new LayersPolyfill();
    new DevUI(device);
  })();
  return installing;
}

/** Ob die Adresse um die Simulation bittet: `?xr=sim`. */
export function emulationRequested(search: string): boolean {
  return new URLSearchParams(search).get('xr') === 'sim';
}
