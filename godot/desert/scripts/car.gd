extends VehicleBody3D
## **Der Pickup** — ein `VehicleBody3D` mit vier Rädern, Heckantrieb und
## Hinterrädern, die auf Sand gern ausbrechen: Gas plus Einlenken bringt ihn
## ins Driften, die Handbremse (Leertaste) erst recht. Aus jedem Rad am Boden
## drückt sich eine Spur in den Sand (`terrain.press`), und hinter den
## Hinterrädern staubt es — umso mehr, je mehr sie rutschen.
##
## Das Bild ist `car_stationwagon` aus dem Modellregal (KayKit City Builder),
## auf Pickup-Größe gebracht.

const MODEL := "res://models/city/car_stationwagon.glb"
const LENGTH := 4.6 ## Meter, so lang wird das Modell

@export var engine_power := 5200.0
@export var brake_power := 60.0
@export var max_steer := 0.55

var terrain: Node3D
## `true`: fährt von selbst Schlangenlinien und Drifts (für die Bilder aus `--shot`).
var autopilot := false

var _wheels: Array[VehicleWheel3D] = []
var _dust: Array[GPUParticles3D] = []
var _steer := 0.0
var _clock := 0.0
var _last_press: Array[Vector3] = []
## Autopilot: wie lange er schon feststeckt, und wie lange er noch zurücksetzt.
var _stuck := 0.0
var _backing := 0.0


func _ready() -> void:
	mass = 1300.0
	center_of_mass_mode = RigidBody3D.CENTER_OF_MASS_MODE_CUSTOM
	center_of_mass = Vector3(0, -0.35, 0.1)
	linear_damp = 0.05
	angular_damp = 0.6

	var shape := BoxShape3D.new()
	shape.size = Vector3(1.9, 0.9, LENGTH - 0.2)
	var col := CollisionShape3D.new()
	col.shape = shape
	col.position = Vector3(0, 0.55, 0)
	add_child(col)

	_add_body()
	# Ein `VehicleBody3D` fährt nach +z: vorne lenken, hinten antreiben.
	for spec in [
		[Vector3(-0.85, 0.35, 1.45), true, false],
		[Vector3(0.85, 0.35, 1.45), true, false],
		[Vector3(-0.85, 0.35, -1.4), false, true],
		[Vector3(0.85, 0.35, -1.4), false, true],
	]:
		var wheel := VehicleWheel3D.new()
		wheel.position = spec[0]
		wheel.use_as_steering = spec[1]
		wheel.use_as_traction = spec[2]
		wheel.wheel_radius = 0.42
		wheel.wheel_rest_length = 0.32
		wheel.suspension_travel = 0.35
		wheel.suspension_stiffness = 38.0
		wheel.suspension_max_force = 9000.0
		wheel.damping_compression = 2.4
		wheel.damping_relaxation = 3.2
		wheel.wheel_roll_influence = 0.25
		wheel.wheel_friction_slip = 2.6 if spec[1] else 1.75
		add_child(wheel)
		_wheels.append(wheel)
		_last_press.append(Vector3.INF)
		if spec[2]:
			_dust.append(_make_dust(wheel))


func _add_body() -> void:
	var scene: PackedScene = load(MODEL)
	var model := scene.instantiate() as Node3D
	var holder := Node3D.new()
	holder.name = "Look"
	holder.add_child(model)
	add_child(holder)
	var box := Props.bounds(model)
	# Das Modell schaut entlang seiner längsten Seite — die soll auf z liegen.
	if box.size.x > box.size.z:
		model.rotation.y = PI * 0.5
		box = Props.bounds(model)
	var s := LENGTH / box.size.z
	holder.scale = Vector3.ONE * s
	model.position = -Vector3(box.get_center().x, box.position.y, box.get_center().z)
	holder.position = Vector3(0, 0.05, 0)
	# Weiß wie im Video, das Regalmodell trägt sonst Farbe.
	Props.tint(model, Color(0.92, 0.92, 0.9), 0.55)


func _make_dust(wheel: VehicleWheel3D) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.amount = 260
	p.lifetime = 4.0
	p.local_coords = false
	p.emitting = false
	p.position = wheel.position + Vector3(0, -0.25, -0.5)
	p.visibility_aabb = AABB(Vector3(-40, -10, -40), Vector3(80, 30, 80))
	var m := ParticleProcessMaterial.new()
	m.direction = Vector3(0, 0.6, -1)
	m.spread = 35.0
	m.initial_velocity_min = 0.8
	m.initial_velocity_max = 3.0
	m.gravity = Vector3(0, 0.12, 0)
	m.damping_min = 0.6
	m.damping_max = 1.4
	m.angle_min = -180.0
	m.angle_max = 180.0
	m.angular_velocity_min = -25.0
	m.angular_velocity_max = 25.0
	m.scale_min = 1.2
	m.scale_max = 2.2
	var grow := Curve.new()
	grow.max_value = 3.0
	grow.add_point(Vector2(0, 0.35))
	grow.add_point(Vector2(0.25, 1.0))
	grow.add_point(Vector2(1, 2.6))
	var grow_tex := CurveTexture.new()
	grow_tex.curve = grow
	m.scale_curve = grow_tex
	var fade := Gradient.new()
	fade.set_color(0, Color(0.93, 0.8, 0.6, 0.0))
	fade.add_point(0.06, Color(0.93, 0.8, 0.6, 0.55))
	fade.add_point(0.4, Color(0.92, 0.8, 0.62, 0.32))
	fade.set_color(fade.get_point_count() - 1, Color(0.92, 0.82, 0.66, 0.0))
	var fade_tex := GradientTexture1D.new()
	fade_tex.gradient = fade
	m.color_ramp = fade_tex
	p.process_material = m
	var quad := QuadMesh.new()
	quad.size = Vector2(1.6, 1.6)
	quad.material = Props.dust_material()
	p.draw_pass_1 = quad
	add_child(p)
	return p


func _physics_process(delta: float) -> void:
	_clock += delta
	var throttle := 0.0
	var steer_in := 0.0
	var hand := false
	if autopilot:
		throttle = 0.85
		steer_in = sin(_clock * 0.55) * 0.9 + sin(_clock * 1.7) * 0.25
		hand = fmod(_clock, 7.0) > 5.6
		# An einem Mast hängen geblieben: kurz zurück, eingeschlagen, dann weiter.
		_stuck = _stuck + delta if linear_velocity.length() < 1.5 and _clock > 2.0 else 0.0
		if _stuck > 1.0:
			_backing = 1.6
			_stuck = 0.0
		if _backing > 0.0:
			_backing -= delta
			throttle = -1.0
			steer_in = 1.0
			hand = false
	else:
		throttle = Input.get_axis("brake", "accelerate")
		steer_in = Input.get_axis("right", "left")
		hand = Input.is_action_pressed("handbrake")
		if Input.is_action_just_pressed("reset"):
			_reset()

	var speed := linear_velocity.length()
	var forward_speed := global_basis.z.dot(linear_velocity)
	# Schnell lenkt man weniger weit ein, sonst überschlägt er sich.
	var limit := max_steer * lerpf(1.0, 0.45, clampf(speed / 30.0, 0.0, 1.0))
	_steer = move_toward(_steer, steer_in * limit, delta * 2.2)
	steering = _steer

	if throttle < 0.0 and forward_speed > 1.0:
		engine_force = 0.0
		brake = -throttle * brake_power
	else:
		# Rückwärts nur halb so kräftig.
		engine_force = throttle * engine_power * (1.0 if throttle > 0.0 else 0.5)
		brake = 0.0
	for w in _wheels:
		if w.use_as_traction:
			w.wheel_friction_slip = 0.9 if hand else 1.75
			if hand:
				w.brake = 25.0
			else:
				w.brake = 0.0

	# Sand bremst: ein wenig Widerstand quer und längs.
	apply_central_force(-linear_velocity * 18.0)

	_press_tracks(speed)
	_kick_dust(speed)


func _press_tracks(speed: float) -> void:
	if terrain == null or speed < 0.5:
		return
	for i in _wheels.size():
		var w := _wheels[i]
		if not w.is_in_contact():
			_last_press[i] = Vector3.INF
			continue
		var at := w.global_position - global_basis.y * w.wheel_radius
		var last := _last_press[i]
		# In Abständen von 15 cm, dazwischen aufgefüllt, damit die Spur nicht abreißt.
		if last == Vector3.INF:
			terrain.press(at, 0.42)
			_last_press[i] = at
			continue
		var gap := at.distance_to(last)
		if gap < 0.15:
			continue
		var steps := mini(int(gap / 0.15), 20)
		for k in range(1, steps + 1):
			terrain.press(last.lerp(at, float(k) / steps), 0.42)
		_last_press[i] = at


func _kick_dust(speed: float) -> void:
	var slip := 0.0
	var grounded := false
	for w in _wheels:
		if w.use_as_traction and w.is_in_contact():
			grounded = true
			slip = maxf(slip, 1.0 - w.get_skidinfo())
	# Seitwärts rutschen zählt auch: Drift.
	var side := absf(global_basis.x.dot(linear_velocity))
	var amount := clampf(speed / 14.0 * 0.45 + slip * 0.8 + side / 6.0, 0.0, 1.0)
	for p in _dust:
		p.emitting = grounded and speed > 2.0
		p.amount_ratio = amount


func _reset() -> void:
	var p := global_position
	global_position = Vector3(p.x, terrain.height_at(p.x, p.z) + 2.0, p.z)
	var yaw := global_rotation.y
	global_rotation = Vector3(0, yaw, 0)
	linear_velocity = Vector3.ZERO
	angular_velocity = Vector3.ZERO
