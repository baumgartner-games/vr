import * as THREE from 'three';

/**
 * **Ein Gehirn**, gebaut statt gezeichnet.
 *
 * Zwei Halbkugeln mit einer Furche dazwischen, jede mit Wülsten überzogen, und
 * darunter ein Stamm. Die Wülste sind kein Rauschen aus einer Bibliothek,
 * sondern drei Sinus in den Koordinaten des Punktes — damit sieht dasselbe
 * Hirn in jedem Bild und auf jedem Gerät gleich aus, und niemand muss eine
 * Textur mitliefern. Dieselbe Schule wie beim Companion-Würfel, der sich seine
 * Farbe auf eine Leinwand malt: was man rechnen kann, lädt man nicht.
 *
 * Gebraucht wird es zweimal — am **Hirn-Werkzeug** und im Regal der
 * **Werkzeugseite** —, und darum steht es hier und nicht im Werkzeug: zwei
 * Hirne, die sich ähneln, sind eines zu viel.
 */
export function createBrainShape(options: { radius?: number; color?: number } = {}): THREE.Group {
  const radius = options.radius ?? 0.055;
  const color = options.color ?? 0xe58aa8;
  const group = new THREE.Group();
  group.name = 'brain';

  const flesh = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.05,
    // Ein wenig Eigenleuchten: ein Hirn im Dunkeln soll man finden.
    emissive: new THREE.Color(color).multiplyScalar(0.12),
  });

  for (const side of [-1, 1] as const) {
    const geometry = new THREE.SphereGeometry(radius, 26, 20);
    wrinkle(geometry, radius);
    const half = new THREE.Mesh(geometry, flesh);
    // Ein Hirn ist keine Kugel: länger als breit und flacher als hoch.
    half.scale.set(0.7, 0.88, 1.2);
    // Weit genug auseinander, dass die **Furche** dazwischen zu sehen ist: zwei
    // Kugeln, die sich berühren, sind eine Knolle.
    half.position.x = side * radius * 0.42;
    group.add(half);
  }

  // Der Stamm hängt unten heraus — er ist auch das Stück, das im Werkzeug auf
  // dem Halter sitzt.
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.3, radius * 0.36, radius * 0.7, 12),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.75),
      roughness: 0.7,
    }),
  );
  stem.position.set(0, -radius * 0.85, radius * 0.1);
  group.add(stem);

  return group;
}

/**
 * Die Wülste: jeder Punkt der Kugel wandert um ein paar Millimeter nach außen
 * oder innen, je nachdem, wo er liegt. Drei Sinus mit verschiedenen Wellenlängen
 * reichen dafür — einer allein wäre ein Ball mit Dellen.
 */
function wrinkle(geometry: THREE.SphereGeometry, radius: number): void {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    const scale = 1 / radius;
    const x = point.x * scale;
    const y = point.y * scale;
    const z = point.z * scale;
    // Die Windungen laufen überwiegend von vorn nach hinten, wie an einem
    // echten Hirn — also stark in y und z, schwach in x.
    const fold =
      Math.sin(y * 10 + z * 3.5) * 0.1 +
      Math.sin(z * 8.5 - y * 2) * 0.075 +
      Math.sin(x * 12) * 0.03;
    point.multiplyScalar(1 + fold);
    position.setXYZ(i, point.x, point.y, point.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}
