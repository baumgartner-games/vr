import * as THREE from 'three';
import { NpcBody } from './NpcBody';
import { NPC_KINDS, npcSkin } from './npcKinds';
import { headOf, hitParts } from './npcHit';

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

  it.each([...NPC_KINDS])('%s trägt seinen Lebensbalken über dem Scheitel', (kind) => {
    const body = new NpcBody(kind);
    body.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(body.bar);
    expect(box.min.y).toBeGreaterThan(body.skin.height);
    body.dispose();
  });

  describe('Der Lebensbalken', () => {
    /** Die Füllung: das zweite Sprite in der Gruppe. */
    const fillOf = (body: NpcBody): THREE.Sprite => body.bar.children[1] as THREE.Sprite;

    it('bleibt bei voller Gesundheit unsichtbar und kommt beim ersten Treffer', () => {
      const body = new NpcBody('zombie');
      expect(fillOf(body).visible).toBe(false);
      body.setHealth(0.75);
      expect(fillOf(body).visible).toBe(true);
      body.dispose();
    });

    /**
     * Ein Sprite wird um seinen Bezugspunkt skaliert, und der liegt
     * voreingestellt in der Mitte — eine halbierte Füllung schrumpfte dann von
     * **beiden** Seiten und stünde als schmaler Strich mittig im Rahmen. Mit
     * `center.x = 0` ist der Bezugspunkt der linke Rand, und `position.x` *ist*
     * damit dieser Rand: Er bleibt liegen, nur das rechte Ende wandert.
     */
    it('schrumpft nach links statt aus der Mitte', () => {
      const body = new NpcBody('zombie');
      const fill = fillOf(body);
      const full = fill.scale.x;
      const left = fill.position.x;
      expect(fill.center.x).toBe(0);
      body.setHealth(0.5);
      expect(fill.scale.x).toBeCloseTo(full / 2, 6);
      expect(fill.position.x).toBeCloseTo(left, 6);
      body.dispose();
    });

    /**
     * **Und er füllt sich nach links, auch wenn der NPC einen ansieht.**
     *
     * Die Füllung wächst vom linken Rand; wo links ist, entschied bis hierher
     * die Drehung des Modells mit — ein Zombie, der auf einen zukommt, steht um
     * 180° gedreht, und sein grüner Balken stand deshalb **neben** dem Rahmen
     * statt darin.
     */
    it('bleibt in seinem Rahmen, egal wohin der NPC schaut', () => {
      const body = new NpcBody('zombie');
      const fill = fillOf(body);
      const back = body.bar.children[0] as THREE.Sprite;
      for (const yaw of [0, Math.PI, 2.3]) {
        body.rotation.y = yaw;
        body.update(1 / 60, 0, false);
        body.updateWorldMatrix(true, true);
        const left = fill.getWorldPosition(new THREE.Vector3());
        const middle = back.getWorldPosition(new THREE.Vector3());
        // Der linke Rand der Füllung liegt links von der Mitte des Rahmens —
        // in **Weltmaßen**, denn dort steht auch die Kamera.
        expect(left.x).toBeLessThan(middle.x);
        expect(middle.x - left.x).toBeCloseTo(fill.scale.x / 2, 2);
      }
      body.dispose();
    });

    it('bleibt sichtbar, solange noch etwas übrig ist', () => {
      const body = new NpcBody('zombie');
      body.setHealth(0.001);
      expect(fillOf(body).visible).toBe(true);
      expect(fillOf(body).scale.x).toBeGreaterThan(0);
      body.dispose();
    });

    it('geht mit dem Umfallen weg', () => {
      const body = new NpcBody('zombie');
      body.setHealth(0.4);
      body.setFallen(0.2);
      expect(fillOf(body).visible).toBe(false);
      body.dispose();
    });

    it('kennt drei Stellungen: immer, bei Schaden, aus', () => {
      const body = new NpcBody('zombie');
      body.setBars('always');
      expect(fillOf(body).visible).toBe(true);
      body.setBars('off');
      body.setHealth(0.5);
      expect(fillOf(body).visible).toBe(false);
      body.setBars('hurt');
      expect(fillOf(body).visible).toBe(true);
      body.dispose();
    });

    it('färbt sich von Grün über Gelb nach Rot', () => {
      const body = new NpcBody('zombie');
      const fill = fillOf(body);
      body.setHealth(1);
      const green = fill.material.color.getHex();
      body.setHealth(0.5);
      const yellow = fill.material.color.getHex();
      body.setHealth(0.1);
      const red = fill.material.color.getHex();
      expect(new Set([green, yellow, red]).size).toBe(3);
      // Rot ist rot: der rote Kanal überwiegt, der grüne nicht mehr.
      expect(new THREE.Color(red).r).toBeGreaterThan(new THREE.Color(red).g);
      expect(new THREE.Color(green).g).toBeGreaterThan(new THREE.Color(green).r);
      body.dispose();
    });
  });

  /**
   * **Die Arme eines Zombies zeigen nach vorn.**
   *
   * Vorne ist −Z — dort sitzen auch die Augen. Hier stand ein Vorzeichen
   * falsch herum, und das Ergebnis war eine Silhouette, die von hinten aussah
   * wie ein Zombie und von vorn wie jemand, der sich ergibt.
   */
  describe('Die Arme', () => {
    it('streckt der Zombie nach vorn', () => {
      const body = new NpcBody('zombie');
      body.updateWorldMatrix(true, true);
      const hand = body.hands.left.getWorldPosition(new THREE.Vector3());
      expect(hand.z).toBeLessThan(-npcSkin('zombie').height * 0.2);
      body.dispose();
    });

    it('lässt die Übungspuppe hängen', () => {
      const body = new NpcBody('dummy');
      body.updateWorldMatrix(true, true);
      const hand = body.hands.left.getWorldPosition(new THREE.Vector3());
      expect(Math.abs(hand.z)).toBeLessThan(0.01);
      expect(hand.y).toBeLessThan(npcSkin('dummy').height * 0.5);
      body.dispose();
    });

    it('bleibt auch beim Ausholen vorn', () => {
      const body = new NpcBody('zombie');
      // Ein paar Bilder Schlagen: Der Arm schwingt, aber er dreht sich nicht
      // hinter den Rücken.
      for (let i = 0; i < 60; i++) body.update(1 / 60, 1.5, true);
      body.updateWorldMatrix(true, true);
      expect(body.hands.left.getWorldPosition(new THREE.Vector3()).z).toBeLessThan(0);
      body.dispose();
    });
  });

  /**
   * **Was man sieht, ist das, worauf man zielt.**
   *
   * Das Modell und die Trefferzonen lesen dieselbe Rechnung
   * (`npcHit.bodyShape`); dieser Test misst nach, dass dabei wirklich
   * dieselben Kästen herauskommen. Er ist der Grund, warum die Zone kein
   * Zylinder mehr ist: Der hatte den Halbmesser des Colliders und stand eine
   * Handbreit neben dem Körper in der Luft.
   */
  describe('Trefferzone und Modell', () => {
    it.each([...NPC_KINDS])('%s trägt den Rumpf genau in seinem Kasten', (kind) => {
      const body = new NpcBody(kind);
      body.updateWorldMatrix(true, true);
      const drawn = new THREE.Box3().setFromObject(body.getObjectByName('npc-torso')!);
      const zone = hitParts({
        feet: { x: 0, y: 0, z: 0 },
        height: body.skin.height,
        radius: body.skin.radius,
      }).torso;
      expect(drawn.getCenter(new THREE.Vector3()).y).toBeCloseTo(zone.center.y, 6);
      expect(drawn.getSize(new THREE.Vector3()).x / 2).toBeCloseTo(zone.half.x, 6);
      expect(drawn.getSize(new THREE.Vector3()).y / 2).toBeCloseTo(zone.half.y, 6);
      expect(drawn.getSize(new THREE.Vector3()).z / 2).toBeCloseTo(zone.half.z, 6);
      body.dispose();
    });

    it.each([...NPC_KINDS])('%s hat beide Beine in seinem Beinkasten', (kind) => {
      const body = new NpcBody(kind);
      body.updateWorldMatrix(true, true);
      const legs = new THREE.Box3();
      body.traverse((object) => {
        if (object.name === 'npc-leg') legs.expandByObject(object);
      });
      const zone = hitParts({
        feet: { x: 0, y: 0, z: 0 },
        height: body.skin.height,
        radius: body.skin.radius,
      }).legs;
      // Die Breite ist die beider Beine samt der Lücke dazwischen …
      expect(legs.getSize(new THREE.Vector3()).x / 2).toBeCloseTo(zone.half.x, 6);
      expect(legs.getSize(new THREE.Vector3()).z / 2).toBeCloseTo(zone.half.z, 6);
      // … und oben hören beide dort auf, wo der Rumpf anfängt.
      expect(legs.max.y).toBeCloseTo(zone.center.y + zone.half.y, 6);
      body.dispose();
    });

    it('baut das Drahtgitter erst, wenn es jemand sehen will', () => {
      const body = new NpcBody('zombie');
      expect(body.getObjectByName('npc-hitbox')).toBeUndefined();
      body.setHitView(true);
      expect(body.getObjectByName('npc-hitbox')?.visible).toBe(true);
      body.setHitView(false);
      expect(body.getObjectByName('npc-hitbox')?.visible).toBe(false);
      body.dispose();
    });

    it('zeichnet das Drahtgitter dorthin, wo gerechnet wird', () => {
      const body = new NpcBody('zombie');
      body.setHitView(true);
      body.updateWorldMatrix(true, true);
      const zone = hitParts({
        feet: { x: 0, y: 0, z: 0 },
        height: body.skin.height,
        radius: body.skin.radius,
      });
      const drawn = new THREE.Box3().setFromObject(body.getObjectByName('npc-hitbox-torso')!);
      expect(drawn.min.y).toBeCloseTo(zone.torso.center.y - zone.torso.half.y, 5);
      expect(drawn.max.y).toBeCloseTo(zone.torso.center.y + zone.torso.half.y, 5);
      expect(drawn.max.x).toBeCloseTo(zone.torso.half.x, 5);
      body.dispose();
    });

    it('nimmt das Drahtgitter mit dem Umfallen weg', () => {
      const body = new NpcBody('zombie');
      body.setHitView(true);
      body.setFallen(0.3);
      expect(body.getObjectByName('npc-hitbox')?.visible).toBe(false);
      body.dispose();
    });
  });

  describe('Der Sichtbereich', () => {
    it('wird erst gebaut, wenn ihn jemand sehen will', () => {
      const body = new NpcBody('zombie');
      expect(body.getObjectByName('npc-sight')).toBeUndefined();
      body.setSight({ range: 12, fov: 110, color: 0xffd166 });
      expect(body.getObjectByName('npc-sight')?.visible).toBe(true);
      // Danach wird er nur noch versteckt und nicht weggeworfen: Ein Fächer je
      // NPC ist nichts, dreißig neu zu bauen ist ein Ruckler.
      body.setSight(null);
      expect(body.getObjectByName('npc-sight')?.visible).toBe(false);
      body.dispose();
    });

    it('liegt flach auf dem Boden und schaut nach vorn', () => {
      const body = new NpcBody('zombie');
      body.setSight({ range: 10, fov: 60, color: 0xffd166 });
      body.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(body.getObjectByName('npc-sight')!);
      // Flach: Er reicht nicht in die Höhe, sondern über den Boden.
      expect(box.max.y - box.min.y).toBeLessThan(0.2);
      // Der **Ring** ist rundherum — er ist die Entfernung, auf die ein Zombie
      // einen bemerkt, und die kennt keine Richtung (`npcBrains.ts`).
      expect(box.min.z).toBeCloseTo(-10, 1);
      expect(box.max.z).toBeCloseTo(10, 1);
      // Der **Kegel** dagegen schaut nach vorn, also nach −Z. Das ist das
      // Vorzeichen, das man in der Brille nur bemerkt und nicht nachvollzieht.
      const cone = new THREE.Box3().setFromObject(body.getObjectByName('npc-sight-cone')!);
      expect(cone.min.z).toBeCloseTo(-10, 1);
      expect(cone.max.z).toBeLessThan(0.01);
      body.dispose();
    });
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
