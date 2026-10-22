extends Node3D
## **Die Dünen** — ein Höhenfeld aus Rauschen, als Netz zum Ansehen und als
## `HeightMapShape3D` zum Draufherumfahren. Dazu eine Spurkarte über das ganze
## Feld (`tracks`): Rot sind Reifenspuren, die das Auto hineinfährt und die
## liegen bleiben, Grün sind die alten Fahrwege, die schon da sind. Der Shader
## `sand.gdshader` liest beides.

const SIZE := 480.0 ## Kantenlänge in Metern
const CELLS := 240 ## Netz und Kollision: 2 m je Zelle
const TRACK_RES := 2048 ## Spurkarte: gut 23 cm je Pixel

var heights := PackedFloat32Array()
var tracks: Image
var track_tex: ImageTexture
var _dirty := false
var _since_upload := 0.0

var _swell := FastNoiseLite.new()
var _dunes := FastNoiseLite.new()
var _detail := FastNoiseLite.new()
## Die Fahrwege: Linienzüge in x/z, Breite in Metern. `main.gd` legt Zäune und Masten daran.
var roads: Array = []


func _init() -> void:
	_swell.seed = 7
	_swell.frequency = 0.0035
	_dunes.seed = 11
	_dunes.frequency = 0.011
	_dunes.fractal_octaves = 3
	_detail.seed = 23
	_detail.frequency = 0.05


## Die Höhe am Punkt — dieselbe Formel für Netz, Kollision und das Aufstellen der Dinge.
func height_at(x: float, z: float) -> float:
	# Dünen sind Grate, und Grate laufen quer zum Wind: das Rauschen gestreckt.
	var ridge := 1.0 - absf(_dunes.get_noise_2d(x * 0.55, z * 1.3))
	ridge = ridge * ridge * ridge
	var h := ridge * 13.0 + _swell.get_noise_2d(x, z) * 12.0 + _detail.get_noise_2d(x, z) * 0.6
	# In der Mitte, wo man losfährt, eine weite flache Mulde.
	var d := Vector2(x, z).length()
	var flat := clampf((d - 25.0) / 60.0, 0.0, 1.0)
	return lerpf(1.0, h, flat * flat * (3.0 - 2.0 * flat))


## Die Höhe, wie sie das Netz zeigt (zwischen den Ecken linear) — fürs Aufstellen genauer als `height_at`.
func surface_at(x: float, z: float) -> float:
	var step := SIZE / CELLS
	var fx := clampf((x + SIZE * 0.5) / step, 0.0, CELLS - 0.001)
	var fz := clampf((z + SIZE * 0.5) / step, 0.0, CELLS - 0.001)
	var ix := int(fx)
	var iz := int(fz)
	var tx := fx - ix
	var tz := fz - iz
	var w := CELLS + 1
	var a := heights[iz * w + ix]
	var b := heights[iz * w + ix + 1]
	var c := heights[(iz + 1) * w + ix]
	var e := heights[(iz + 1) * w + ix + 1]
	return lerpf(lerpf(a, b, tx), lerpf(c, e, tx), tz)


func build(material: ShaderMaterial) -> void:
	var w := CELLS + 1
	var step := SIZE / CELLS
	heights.resize(w * w)
	for iz in w:
		for ix in w:
			heights[iz * w + ix] = height_at(ix * step - SIZE * 0.5, iz * step - SIZE * 0.5)

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for iz in w:
		for ix in w:
			var x := ix * step - SIZE * 0.5
			var z := iz * step - SIZE * 0.5
			st.set_uv(Vector2(float(ix) / CELLS, float(iz) / CELLS))
			st.add_vertex(Vector3(x, heights[iz * w + ix], z))
	for iz in CELLS:
		for ix in CELLS:
			var i := iz * w + ix
			st.add_index(i)
			st.add_index(i + 1)
			st.add_index(i + w)
			st.add_index(i + 1)
			st.add_index(i + w + 1)
			st.add_index(i + w)
	st.generate_normals()
	var mesh := MeshInstance3D.new()
	mesh.name = "Sand"
	mesh.mesh = st.commit()
	mesh.material_override = material
	add_child(mesh)

	var body := StaticBody3D.new()
	body.name = "SandBody"
	var shape := HeightMapShape3D.new()
	shape.map_width = w
	shape.map_depth = w
	shape.map_data = heights
	var col := CollisionShape3D.new()
	col.shape = shape
	col.scale = Vector3(step, 1.0, step)
	body.add_child(col)
	add_child(body)

	tracks = Image.create(TRACK_RES, TRACK_RES, false, Image.FORMAT_RG8)
	tracks.fill(Color(0, 0, 0))
	_paint_roads()
	track_tex = ImageTexture.create_from_image(tracks)
	material.set_shader_parameter("track_tex", track_tex)
	material.set_shader_parameter("terrain_size", SIZE)


## Alte Fahrwege — breite, glattgefahrene helle Bänder, wie im Video quer über die Dünen.
func _paint_roads() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 5
	for k in 4:
		var angle := k * PI / 4.0 + rng.randf_range(-0.2, 0.2)
		var dir := Vector2(cos(angle), sin(angle))
		var side := Vector2(-dir.y, dir.x)
		var offset := rng.randf_range(-30.0, 30.0)
		var points: Array[Vector2] = []
		var t := -SIZE * 0.6
		while t <= SIZE * 0.6:
			var wobble := sin(t * 0.015 + k) * 18.0 + sin(t * 0.041 + k * 2.0) * 6.0
			points.append(dir * t + side * (offset + wobble))
			t += 4.0
		roads.append({"points": points, "width": rng.randf_range(7.0, 11.0)})
		for p in points:
			_stamp(p, 0.5 * roads[-1]["width"], 1, 0.9)


## Die Spurkarte an einem Punkt in Metern: ein weicher Fleck, `channel` 0 Reifen, 1 Weg.
func _stamp(p: Vector2, radius: float, channel: int, strength: float) -> void:
	var px := (p.x / SIZE + 0.5) * TRACK_RES
	var pz := (p.y / SIZE + 0.5) * TRACK_RES
	# Mindestens anderthalb Pixel breit, sonst zerfällt eine schmale Spur in Perlen.
	var r := maxf(radius / SIZE * TRACK_RES, 1.6)
	var x0 := maxi(0, int(px - r - 1))
	var x1 := mini(TRACK_RES - 1, int(px + r + 1))
	var z0 := maxi(0, int(pz - r - 1))
	var z1 := mini(TRACK_RES - 1, int(pz + r + 1))
	for z in range(z0, z1 + 1):
		for x in range(x0, x1 + 1):
			var d := Vector2(x + 0.5 - px, z + 0.5 - pz).length() / maxf(r, 0.5)
			if d >= 1.0:
				continue
			var a := strength * (1.0 - d * d)
			var c := tracks.get_pixel(x, z)
			if channel == 0:
				c.r = maxf(c.r, a)
			else:
				c.g = maxf(c.g, a)
			tracks.set_pixel(x, z, c)
	_dirty = true


## Ein Reifen drückt sich in den Sand (`car.gd` ruft das je Rad am Boden).
func press(world: Vector3, width: float) -> void:
	_stamp(Vector2(world.x, world.z), width * 0.5, 0, 1.0)


func _process(delta: float) -> void:
	# Die ganze Karte neu hochladen kostet — also höchstens 20-mal je Sekunde.
	_since_upload += delta
	if _dirty and _since_upload > 0.05:
		track_tex.update(tracks)
		_dirty = false
		_since_upload = 0.0
