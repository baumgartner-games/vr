/** Moisture blooms from the lower visor with each exhalation; the central view stays clear. */
export const CONDENSATION_FRAGMENT = `
varying vec2 vUv;
uniform float fogAmount;
uniform float damage;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float load = smoothstep(0.07, 0.86, fogAmount);
  float exhale = pow(max(0.0, sin(time * (2.7 + fogAmount * 1.5))), 2.0);
  vec2 breath = vec2(p.x * 1.05, (p.y + 0.94) * 1.25);
  float bloom = exp(-dot(breath, breath) * (2.5 - exhale * 0.75));
  float edge = smoothstep(0.5, 1.0, length(p * vec2(0.82, 1.0)));
  float cloud = noise(vUv * 10.0 + vec2(0.0, -time * 0.045));
  cloud = mix(cloud, noise(vUv * 23.0), 0.25);
  float mist = load * (bloom * (0.24 + exhale * 0.46) + edge * 0.15);
  mist *= 0.65 + cloud * 0.65;

  // Small irregular beads cling to the glass, with a glint on their upper edge.
  vec2 cells = vUv * vec2(67.0, 46.0);
  vec2 cell = floor(cells);
  float seed = hash(cell);
  vec2 local = fract(cells) - vec2(0.2 + seed * 0.6, 0.2 + hash(cell + 3.0) * 0.6);
  local.y *= 0.75;
  float bead = 1.0 - smoothstep(0.06, 0.1, length(local));
  float glint = 1.0 - smoothstep(0.008, 0.035, length(local - vec2(-0.025, 0.02)));
  float moisture = load * smoothstep(0.28, 0.85, bloom + edge * 0.7) * step(0.68, seed);
  float alpha = mist + moisture * (bead * 0.11 + glint * 0.22);
  float hurt = edge * damage * 0.2;
  vec3 color = mix(vec3(0.79, 0.91, 0.95), vec3(0.61, 0.1, 0.12), hurt / max(0.001, alpha + hurt));
  gl_FragColor = vec4(color, min(0.56, alpha + hurt));
}
`;
