import type * as THREE from 'three';

/**
 * **Lichter im Maßstab des Gestells** — für den Weltbau in der Brille.
 *
 * Dort wächst das Gestell um das Zehnfache (`PlayerRig.startFlight`), und
 * three.js rechnet Licht in den Metern der **Kamera**: Jede Entfernung zu einer
 * Lampe ist dort ein Zehntel, und ein Punktlicht, das mit dem Quadrat der
 * Entfernung abfällt, wird hundertfach so hell; seine Reichweite (`distance`)
 * gilt zehnfach weiter. Gemeldet: _„im weltbaumodus ist das lichter überkrass
 * hell"_.
 *
 * Also werden alle Punkt- und Spotlichter für dieses eine Bild umgerechnet —
 * Stärke durch das Quadrat des Maßstabs, Reichweite durch den Maßstab — und
 * danach zurückgestellt (`restore`). So muss keine Welt davon wissen, und eine
 * Welt, die ihre Lampen in jedem Bild neu stellt (die Station), stellt sie auf
 * ihre eigenen Werte und nicht auf umgerechnete.
 */
export class ViewLights {
  private readonly saved: Array<{
    light: THREE.PointLight | THREE.SpotLight;
    intensity: number;
    distance: number;
  }> = [];

  /** Vor dem Bild — nichts zu tun, wenn das Gestell seine eigene Größe hat. */
  scale(scene: THREE.Scene, scale: number): void {
    this.saved.length = 0;
    if (Math.abs(scale - 1) < 1e-3) return;
    const s = Math.max(1e-3, scale);
    scene.traverse((object) => {
      const light = object as THREE.PointLight & THREE.SpotLight;
      if (!light.isPointLight && !light.isSpotLight) return;
      this.saved.push({ light, intensity: light.intensity, distance: light.distance });
      light.intensity /= s * s;
      if (light.distance > 0) light.distance /= s;
    });
  }

  /** Nach dem Bild — auch nach einem Fehler darin. */
  restore(): void {
    for (const { light, intensity, distance } of this.saved) {
      light.intensity = intensity;
      light.distance = distance;
    }
    this.saved.length = 0;
  }
}
