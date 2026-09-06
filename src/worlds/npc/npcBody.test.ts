import * as THREE from 'three';
import { NpcBody } from './NpcBody';
import { NPC_KINDS } from './npcKinds';
import { headOf } from './npcHit';

/**
 * Dass der Kopf, den man **sieht**, der Kopf ist, auf den man **zielt**.
 *
 * Das Modell (`NpcBody.ts`) und die Trefferzone (`npcHit.ts`) rechnen beide
 * aus, wo oben der Schädel sitzt — die eine für Dreiecke, die andere für
 * Kugeln. Zwei Rechnungen, die dasselbe meinen, laufen irgendwann
 * auseinander, und dieser Fehler fällt niemandem auf: man zielt auf die Stirn,
 * trifft die Luft darüber, und hält den Zombie für zäh.
 *
 * three.js, aber kein WebGL: hier werden Zahlen aus einem Szenengraphen
 * gelesen.
 */
describe('Kopf und Trefferzone', () => {
  it.each([...NPC_KINDS])('%s trägt seinen Kopf dort, wo die Kugel ihn sucht', (kind) => {
    const body = new NpcBody(kind);
    body.updateWorldMatrix(true, true);
    const zone = headOf({
      feet: { x: 0, y: 0, z: 0 },
      height: body.skin.height,
      radius: body.skin.radius,
    });
    const drawn = body.skull.getWorldPosition(body.skull.position.clone());
    expect(drawn.y).toBeCloseTo(zone.center.y, 6);
    expect(body.skull.geometry.parameters.radius).toBeCloseTo(zone.radius, 6);
    // Und der Scheitel liegt auf der Körperhöhe: ein NPC ist so groß, wie
    // seine Haut sagt, und nicht einen halben Kopf größer.
    expect(drawn.y + zone.radius).toBeCloseTo(body.skin.height, 6);
    body.dispose();
  });

  it.each([...NPC_KINDS])('%s steht mit den Füßen im Ursprung', (kind) => {
    const body = new NpcBody(kind);
    // **Ohne den Lebensbalken**: Der schwebt mit Absicht über dem Scheitel und
    // ist eine Anzeige, kein Körperteil. Ein `Box3` fragt nicht danach, ob
    // etwas sichtbar ist — also kommt er hier weg, bevor gemessen wird.
    body.bar.removeFromParent();
    body.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(body);
    // Der Ursprung ist die Standfläche: nichts hängt darunter, und oben hört
    // der Körper bei seiner Körperhöhe auf. Alles, was mit einem NPC rechnet —
    // der Collider, die Trefferzone, der Punkt, an den er gesetzt wird —,
    // rechnet von hier aus.
    expect(box.min.y).toBeGreaterThanOrEqual(-0.01);
    expect(box.max.y).toBeCloseTo(body.skin.height, 2);
    body.dispose();
  });
});
