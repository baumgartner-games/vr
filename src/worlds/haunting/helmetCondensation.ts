/**
 * **Der Atem auf dem Visier** — ein weißes Aufhellen, sonst nichts.
 *
 * Es war einmal Kondenswasser: Tröpfchen an den Glasrändern, ein Rauschen,
 * das mit dem Ausatmen pulste, Glanzpunkte auf jeder Perle. Auf dem Telefon
 * und in der Brille war das kein Beschlagen, sondern ein Flackern — Punkte,
 * die je Bild kamen und gingen. Der Besitzer hat es in einem Satz gesagt:
 * „einfach nur ein weißer Fade von einer weißen Fläche — alles wird heller,
 * keine Punkte, kein Sonstiges." Genau das steht hier: eine Fläche, deren
 * Deckkraft mit der Anstrengung (`fogAmount`) steigt und sacht mit dem Atem
 * schwingt, plus der rote Rand einer Verletzung (`damage`).
 */
export const CONDENSATION_FRAGMENT = `
varying vec2 vUv;
uniform float fogAmount;
uniform float damage;
uniform float time;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float load = smoothstep(0.05, 0.9, fogAmount);
  // Der Atem als sanfte Welle auf der ganzen Fläche — kein Rand, kein Muster.
  float breath = 0.85 + 0.15 * sin(time * (2.4 + fogAmount * 1.2));
  float white = load * 0.42 * breath;
  float edge = smoothstep(0.5, 1.0, length(p * vec2(0.82, 1.0)));
  float hurt = edge * damage * 0.2;
  vec3 color = mix(vec3(1.0), vec3(0.61, 0.1, 0.12), hurt / max(0.001, white + hurt));
  gl_FragColor = vec4(color, min(0.6, white + hurt));
}
`;
