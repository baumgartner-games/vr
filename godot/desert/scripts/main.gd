extends Node3D
## **Wüstenfahrt** — alles wird hier zusammengesetzt: Licht und Himmel, die
## Dünen (`terrain.gd`), der Pickup (`car.gd`), die Kamera schräg von oben
## hinterher, und die Dinge auf dem Sand — Felsen, Kisten, Zäune, Wände,
## Strommasten, trockenes Gestrüpp — alle aus dem Modellregal.
##
## Starten mit `-- --shot=pfad.png` fährt der Wagen selbst und nach ein paar
## Sekunden wird ein Bild gespeichert (so entstehen die Vorschaubilder).

const Terrain := preload("res://scripts/terrain.gd")
const Car := preload("res://scripts/car.gd")
const SAND_SHADER := preload("res://scripts/sand.gdshader")

const ROCKS := [
	"res://models/hex/decoration/nature/rock_single_A.glb",
	"res://models/hex/decoration/nature/rock_single_B.glb",
	"res://models/hex/decoration/nature/rock_single_C.glb",
	"res://models/hex/decoration/nature/rock_single_D.glb",
	"res://models/hex/decoration/nature/rock_single_E.glb",
]
const CRATES := ["res://models/city/box_A.glb", "res://models/city/box_B.glb"]
const FENCE := "res://models/hex/buildings/neutral/fence_wood_straight.glb"
const WALL := "res://models/hex/buildings/neutral/fence_stone_straight.glb"
const POLE := "res://models/city/streetlight_old_single.glb"
const BUSH := "res://models/city/bush.glb"

const SAND := Color(0.86, 0.7, 0.48)
const ROCK := Color(0.72, 0.55, 0.38)
const WOOD := Color(0.42, 0.3, 0.2)
const CRATE := Color(0.88, 0.85, 0.8)

var terrain: Node3D
var car: VehicleBody3D
var camera: Camera3D
var hud: Label
var _cam_yaw := 0.0
## 0: hoch von schräg oben wie im Video, 1: näher dran (Taste C).
var _cam_mode := 0
const CAM_OFFSETS := [Vector2(24.0, 30.0), Vector2(10.0, 5.5)]
var _shot_path := ""
var _shot_at := 7.0
var _time := 0.0
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = 1234
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--shot="):
			_shot_path = arg.substr(7)
		elif arg.begins_with("--at="):
			_shot_at = float(arg.substr(5))
		elif arg == "--near":
			_cam_mode = 1
	_setup_input()
	_setup_world()

	var mat := ShaderMaterial.new()
	mat.shader = SAND_SHADER
	var ripple := NoiseTexture2D.new()
	ripple.width = 512
	ripple.height = 512
	ripple.seamless = true
	ripple.as_normal_map = false
	var noise := FastNoiseLite.new()
	noise.frequency = 0.03
	noise.fractal_octaves = 2
	ripple.noise = noise
	ripple.generate_mipmaps = true
	mat.set_shader_parameter("ripple_tex", ripple)
	terrain = Terrain.new()
	terrain.name = "Terrain"
	add_child(terrain)
	terrain.build(mat)

	_scatter()

	car = Car.new()
	car.name = "Pickup"
	car.terrain = terrain
	car.autopilot = _shot_path != ""
	add_child(car)
	car.global_position = Vector3(0, terrain.height_at(0, 0) + 1.2, 0)

	camera = Camera3D.new()
	camera.fov = 50.0
	camera.far = 900.0
	add_child(camera)
	camera.current = true
	_place_camera(1.0)

	hud = Label.new()
	hud.position = Vector2(16, 12)
	hud.add_theme_color_override("font_color", Color(0.25, 0.17, 0.1))
	hud.add_theme_font_size_override("font_size", 18)
	var layer := CanvasLayer.new()
	layer.add_child(hud)
	add_child(layer)


func _setup_input() -> void:
	var keys := {
		"accelerate": [KEY_W, KEY_UP],
		"brake": [KEY_S, KEY_DOWN],
		"left": [KEY_A, KEY_LEFT],
		"right": [KEY_D, KEY_RIGHT],
		"handbrake": [KEY_SPACE],
		"reset": [KEY_R],
		"camera": [KEY_C],
	}
	for action in keys:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.1)
		for key in keys[action]:
			var e := InputEventKey.new()
			e.physical_keycode = key
			InputMap.action_add_event(action, e)
	# Gamepad: Abzug rechts Gas, links Bremse, linker Stick lenkt, A Handbremse, Y zurücksetzen.
	var pads := {
		"accelerate": [JOY_AXIS_TRIGGER_RIGHT, 1.0],
		"brake": [JOY_AXIS_TRIGGER_LEFT, 1.0],
		"left": [JOY_AXIS_LEFT_X, -1.0],
		"right": [JOY_AXIS_LEFT_X, 1.0],
	}
	for action in pads:
		var m := InputEventJoypadMotion.new()
		m.axis = pads[action][0]
		m.axis_value = pads[action][1]
		InputMap.action_add_event(action, m)
	for pair in [["handbrake", JOY_BUTTON_A], ["reset", JOY_BUTTON_Y], ["camera", JOY_BUTTON_X]]:
		var b := InputEventJoypadButton.new()
		b.button_index = pair[1]
		InputMap.action_add_event(pair[0], b)


## Grelle Sonne von schräg hinten, harte lange Schatten, warmer Dunst in der Ferne.
func _setup_world() -> void:
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, -40, 0)
	sun.light_color = Color(1.0, 0.94, 0.84)
	sun.light_energy = 0.34
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 140.0
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	add_child(sun)

	var sky := ProceduralSkyMaterial.new()
	sky.sky_top_color = Color(0.55, 0.68, 0.85)
	sky.sky_horizon_color = Color(0.93, 0.85, 0.72)
	sky.ground_horizon_color = Color(0.9, 0.78, 0.6)
	sky.ground_bottom_color = Color(0.75, 0.6, 0.42)
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = Sky.new()
	env.sky.sky_material = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.8, 0.66, 0.5)
	env.ambient_light_energy = 0.36
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.fog_enabled = true
	env.fog_light_color = Color(0.92, 0.82, 0.66)
	env.fog_density = 0.0045
	env.fog_sky_affect = 0.4
	var world := WorldEnvironment.new()
	world.environment = env
	add_child(world)


## Die Dinge auf dem Sand, immer gleich verteilt (fester Zufall).
func _scatter() -> void:
	var props := Node3D.new()
	props.name = "Props"
	add_child(props)
	var half: float = Terrain.SIZE * 0.5 - 20.0

	# Felsbrocken, oft zu zweit oder dritt.
	for i in 70:
		var c := _free_spot(half, 30.0)
		for k in _rng.randi_range(1, 3):
			var p := c + Vector2(_rng.randf_range(-6, 6), _rng.randf_range(-6, 6))
			Props.place(props, ROCKS[_rng.randi() % ROCKS.size()], _ground(p), _rng.randf_range(1.6, 5.0),
				_rng.randf() * TAU, ROCK.darkened(_rng.randf() * 0.15), true, 0.42)

	# Kistenlager: ein paar große helle Kisten in losen Reihen, wie im Video.
	for camp in 6:
		var c := _free_spot(half, 40.0)
		var yaw := _rng.randf() * TAU
		var basis := Basis(Vector3.UP, yaw)
		for k in _rng.randi_range(5, 9):
			var local := Vector3(_rng.randf_range(-16, 16), 0, _rng.randf_range(-12, 12))
			var p3 := basis * local
			var p := c + Vector2(p3.x, p3.z)
			Props.place(props, CRATES[_rng.randi() % 2], _ground(p), _rng.randf_range(2.4, 3.6),
				yaw + _rng.randf_range(-0.3, 0.3), CRATE.darkened(_rng.randf() * 0.1))
		# Eine hohe Bretterwand daneben.
		var wall := c + Vector2(basis.x.x, basis.x.z) * 22.0
		for k in 3:
			var p := wall + Vector2(basis.z.x, basis.z.z) * (k - 1) * 3.6
			Props.place(props, WALL, _ground(p), 3.8, yaw + PI * 0.5, WOOD.lightened(0.1), true, 0.0, true)

	# Zäune und Strommasten entlang der Wege.
	for road in terrain.roads:
		var pts: Array = road["points"]
		var side: float = road["width"] * 0.5 + 3.0
		_fence_along(props, pts, side, 0.35)
		_poles_along(props, pts, -side - 4.0)

	# Trockenes Gestrüpp: viele, also als ein MultiMesh.
	_bushes(props, half)


## Ein freier Platz: nicht in der Startmulde, nicht auf einem Weg.
func _free_spot(half: float, keep: float) -> Vector2:
	for attempt in 40:
		var p := Vector2(_rng.randf_range(-half, half), _rng.randf_range(-half, half))
		if p.length() < keep:
			continue
		if _road_distance(p) < 10.0:
			continue
		return p
	return Vector2(half, half)


func _road_distance(p: Vector2) -> float:
	var best := INF
	for road in terrain.roads:
		var pts: Array = road["points"]
		for i in range(0, pts.size() - 1, 2):
			best = minf(best, Geometry2D.get_closest_point_to_segment(p, pts[i], pts[i + 1]).distance_to(p) - road["width"] * 0.5)
	return best


func _ground(p: Vector2) -> Vector3:
	return Vector3(p.x, terrain.surface_at(p.x, p.y), p.y)


## Ein Weidezaun an der Seite des Weges, in Stücken, mit Lücken.
func _fence_along(parent: Node3D, pts: Array, side: float, chance: float) -> void:
	var i := 0
	while i < pts.size() - 3:
		if _rng.randf() > chance:
			i += 6
			continue
		var run := _rng.randi_range(4, 10)
		for k in run:
			if i + 1 >= pts.size():
				break
			var a: Vector2 = pts[i]
			var b: Vector2 = pts[i + 1]
			var dir := (b - a).normalized()
			var n := Vector2(-dir.y, dir.x)
			var mid := (a + b) * 0.5 + n * side
			if absf(mid.x) < Terrain.SIZE * 0.5 - 4 and absf(mid.y) < Terrain.SIZE * 0.5 - 4:
				Props.place(parent, FENCE, _ground(mid), 4.1, -atan2(dir.y, dir.x), WOOD, true, 0.05, true)
			i += 1
		i += 4


## Holzmasten mit durchhängenden Leitungen dazwischen.
func _poles_along(parent: Node3D, pts: Array, side: float) -> void:
	var tops: Array[Vector3] = []
	for i in range(0, pts.size() - 1, 7):
		var a: Vector2 = pts[i]
		var b: Vector2 = pts[mini(i + 1, pts.size() - 1)]
		var dir := (b - a).normalized()
		var p: Vector2 = a + Vector2(-dir.y, dir.x) * side
		if absf(p.x) > Terrain.SIZE * 0.5 - 6 or absf(p.y) > Terrain.SIZE * 0.5 - 6:
			tops.clear()
			continue
		# Ohne Körper: Die Hülle des Mastes samt Lampenarm wäre eine breite Kiste, an der man hängen bliebe.
		var pole := Props.place(parent, POLE, _ground(p), 9.0, -atan2(dir.y, dir.x), WOOD.darkened(0.2), false)
		var top := pole.global_position + Vector3(0, 8.6, 0)
		if not tops.is_empty():
			_wire(parent, tops[-1], top)
		tops.append(top)


func _wire(parent: Node3D, a: Vector3, b: Vector3) -> void:
	var im := ImmediateMesh.new()
	im.surface_begin(Mesh.PRIMITIVE_LINE_STRIP)
	for k in 17:
		var t := k / 16.0
		var p := a.lerp(b, t)
		p.y -= sin(t * PI) * a.distance_to(b) * 0.06
		im.surface_add_vertex(p)
	im.surface_end()
	var m := MeshInstance3D.new()
	m.mesh = im
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.15, 0.12, 0.1)
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.material_override = mat
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(m)


func _bushes(parent: Node3D, half: float) -> void:
	var scene: PackedScene = load(BUSH)
	var model := scene.instantiate() as Node3D
	var meshes := []
	_collect_meshes(model, meshes)
	if meshes.is_empty():
		return
	var src: MeshInstance3D = meshes[0]
	var box := src.get_aabb()
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.45, 0.38, 0.22)
	mat.roughness = 1.0
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = src.mesh
	mm.instance_count = 900
	for i in mm.instance_count:
		var p := Vector2(_rng.randf_range(-half, half), _rng.randf_range(-half, half))
		var s := _rng.randf_range(0.5, 1.4) / maxf(box.size.x, box.size.z)
		var xf := Transform3D(Basis(Vector3.UP, _rng.randf() * TAU).scaled(Vector3(s, s * _rng.randf_range(0.7, 1.3), s)), _ground(p) - Vector3(0, box.position.y * s, 0))
		mm.set_instance_transform(i, xf)
	var inst := MultiMeshInstance3D.new()
	inst.multimesh = mm
	inst.material_override = mat
	parent.add_child(inst)
	model.free()


func _collect_meshes(n: Node, out: Array) -> void:
	if n is MeshInstance3D:
		out.append(n)
	for c in n.get_children():
		_collect_meshes(c, out)


func _physics_process(delta: float) -> void:
	if Input.is_action_just_pressed("camera"):
		_cam_mode = (_cam_mode + 1) % CAM_OFFSETS.size()
	_place_camera(delta)


## **Die Kamera** — hoch schräg hinter dem Wagen wie im Video, sie dreht sich
## träge mit seiner Fahrtrichtung und blickt etwas voraus.
func _place_camera(delta: float) -> void:
	if car == null:
		return
	var vel := car.linear_velocity
	var heading := atan2(vel.x, vel.z) if Vector2(vel.x, vel.z).length() > 3.0 else car.global_rotation.y
	# Langsam nachdrehen, sonst wird einem beim Driften schwindelig.
	_cam_yaw = lerp_angle(_cam_yaw, heading, clampf(delta * 0.8, 0.0, 1.0))
	var back := Vector3(sin(_cam_yaw), 0, cos(_cam_yaw))
	var target := car.global_position + Vector3(vel.x, 0, vel.z) * 0.35
	var off: Vector2 = CAM_OFFSETS[_cam_mode]
	var want := target - back * off.x + Vector3(0, off.y, 0)
	camera.global_position = camera.global_position.lerp(want, clampf(delta * 3.0, 0.0, 1.0)) if delta < 1.0 else want
	camera.look_at(target, Vector3.UP)


func _process(delta: float) -> void:
	_time += delta
	if hud and car:
		hud.text = "%d km/h   ·   W/S Gas/Bremse · A/D lenken · Leertaste Handbremse · R aufrichten · C Kamera" % int(car.linear_velocity.length() * 3.6)
	if _shot_path != "" and _time >= _shot_at:
		var img := get_viewport().get_texture().get_image()
		img.save_png(_shot_path)
		print("Bild gespeichert: ", _shot_path)
		_shot_path = ""
		get_tree().quit()
