shader_type spatial;
// **Der Sand** — warm und matt, mit feinen Windrippeln, die quer zum Wind
// laufen; auf den Fahrwegen glatt und heller, in frischen Reifenspuren zwei
// Rillen mit etwas dunklerem, aufgewühltem Sand. Die Spurkarte kommt aus
// `terrain.gd` (Rot: Reifen, Grün: Wege), über das ganze Feld gelegt.

uniform sampler2D track_tex : filter_linear, repeat_disable;
uniform sampler2D ripple_tex : filter_linear_mipmap, repeat_enable;
uniform float terrain_size = 480.0;
uniform vec3 sand_light : source_color = vec3(0.89, 0.76, 0.57);
uniform vec3 sand_dark : source_color = vec3(0.76, 0.6, 0.41);
uniform vec3 road_tint : source_color = vec3(0.93, 0.84, 0.68);

varying vec3 world_pos;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

vec2 track_uv(vec2 xz) {
	return xz / terrain_size + 0.5;
}

void fragment() {
	vec2 uv = track_uv(world_pos.xz);
	vec2 tr = texture(track_tex, uv).rg;
	float texel = 1.0 / 2048.0;
	// Die Rille: Gefälle der Spurkarte als Neigung der Oberfläche.
	float tx = texture(track_tex, uv + vec2(texel, 0.0)).r - texture(track_tex, uv - vec2(texel, 0.0)).r;
	float tz = texture(track_tex, uv + vec2(0.0, texel)).r - texture(track_tex, uv - vec2(0.0, texel)).r;

	// Großflächig hell und dunkel, damit die Fläche nicht wie Plastik wirkt.
	float big = texture(ripple_tex, world_pos.xz * 0.004).r;
	vec3 col = mix(sand_dark, sand_light, smoothstep(0.25, 0.75, big));
	// Wege: heller, glatt.
	col = mix(col, road_tint, tr.g * 0.75);
	// Reifenspur: ein Hauch dunkler, aufgewühlt.
	col = mix(col, col * 0.86, tr.r * 0.8);
	ALBEDO = col;
	ROUGHNESS = 0.95;
	SPECULAR = 0.2;

	// Windrippel: ein gestreckter Rauschwert als Normalenkarte, auf Wegen und in Spuren weg.
	vec2 ripple_uv = vec2(world_pos.x * 0.35 + world_pos.z * 0.08, world_pos.z * 0.9);
	vec3 rn = texture(ripple_tex, ripple_uv).rgb;
	float ripple = (1.0 - tr.g) * (1.0 - tr.r) * 0.55;
	vec3 n = normalize(vec3((rn.r - 0.5) * ripple + tx * 3.0, 1.0, (rn.g - 0.5) * ripple + tz * 3.0));
	// Von Welt- in Sichtraum: Die Rillen und Rippel neigen die Normale des Netzes.
	vec3 base = NORMAL;
	vec3 bend = (VIEW_MATRIX * vec4(n.x, 0.0, n.z, 0.0)).xyz;
	NORMAL = normalize(base + bend);
}
