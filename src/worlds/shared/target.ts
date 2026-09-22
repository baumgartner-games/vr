import * as THREE from 'three';

/**
 * Die bemalte Scheibe einer Zielscheibe — fünf Ringe, der innerste rot.
 *
 * Sie hängt heute an **einer** Stelle: draußen auf dem **Schießstand**
 * (`worlds/test/zones/range.ts`, `RangeZone.face`), wo sie auf zwanzig Meter
 * noch lesbar sein muss. Hier stand einmal, dass es zwei seien — die zweite
 * war der **Schießgang des Eingaberaums**, und den gibt es nicht mehr: Die
 * sechs Zahlen einer Werkzeug-Pose zieht man inzwischen auf der Werkzeugseite
 * (siehe `docs/agents/waffe-und-kart.md`). Ein eigener Bauteil bleibt sie
 * trotzdem, und zwar aus dem Grund, aus dem sie einer wurde: Eine zweite,
 * „ähnliche" Scheibe wäre in dem Moment falsch, in dem jemand an einer von
 * beiden etwas ändert.
 *
 * **Und sie bleibt gemalt.** Im Regal liegt eine gekaufte Scheibe
 * (`prototype-bits/target.glb`), aber ihre Ringe sind nicht die, nach denen
 * hier gezählt wird — vier Felder statt fünf, und an anderen Halbmessern. Die
 * lange Fassung steht in `docs/agents/modelle.md`, „Was aus dem Regal die
 * gebaute Geometrie ersetzt — und was nicht".
 *
 * Jeder Aufruf baut ein **eigenes** Material samt Textur — wer es baut, gibt
 * es auch wieder frei, und ein weltweit geteiltes Material überlebt sonst die
 * Welt, die es gebaut hat.
 */
export function bullseyeFace(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f6fa';
  ctx.fillRect(0, 0, 256, 256);

  // Fünf Ringe, der mittlere rot — auf hundert Meter noch zu erkennen.
  const rings = [
    { r: 122, fill: '#f4f6fa' },
    { r: 98, fill: '#dbe2ee' },
    { r: 74, fill: '#f4f6fa' },
    { r: 50, fill: '#2a3550' },
    { r: 26, fill: '#ff3b2f' },
  ];
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(128, 128, ring.r, 0, Math.PI * 2);
    ctx.fillStyle = ring.fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20, 28, 44, 0.55)';
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
}
