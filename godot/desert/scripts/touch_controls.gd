extends Control
## **Steuerung am Handy** — links ein Joystick, der dort erscheint, wo der
## Daumen aufsetzt (hoch: Gas, runter: Bremse/rückwärts, seitlich: lenken),
## rechts ein großer Knopf für die Handbremse und zwei kleine für Kamera und
## Aufrichten. Gewünscht: _„Auch mit Handy joy Stick Steuerung?"_
##
## Mehrere Finger zugleich: Jeder Finger gehört zu der Hälfte, auf der er
## aufgesetzt hat. Der Stick schreibt in dieselben Aktionen wie Tastatur und
## Gamepad (`Input.action_press`), das Auto merkt keinen Unterschied.

const STICK_RADIUS := 90.0 ## Pixel bei 720 px Höhe, wächst mit dem Schirm
const DEAD := 0.12

var _stick_finger := -1
var _stick_origin := Vector2.ZERO
var _stick_value := Vector2.ZERO
## Finger auf einem Knopf: Index → Aktion.
var _button_fingers := {}
var _font: Font


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_font = ThemeDB.fallback_font


func _scale() -> float:
	return get_viewport_rect().size.y / 720.0


## Die Knöpfe rechts: Aktion, Mitte, Radius, Beschriftung.
func _buttons() -> Array:
	var size := get_viewport_rect().size
	var s := _scale()
	return [
		["handbrake", Vector2(size.x - 130 * s, size.y - 140 * s), 78 * s, "DRIFT"],
		["camera", Vector2(size.x - 70 * s, 70 * s), 40 * s, "CAM"],
		["reset", Vector2(size.x - 170 * s, 70 * s), 40 * s, "↻"],
	]


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			_touch_down(t.index, t.position)
		else:
			_touch_up(t.index)
	elif event is InputEventScreenDrag:
		var d := event as InputEventScreenDrag
		if d.index == _stick_finger:
			_move_stick(d.position)


func _touch_down(index: int, at: Vector2) -> void:
	for b in _buttons():
		if at.distance_to(b[1]) <= b[2] * 1.15:
			_button_fingers[index] = b[0]
			Input.action_press(b[0])
			queue_redraw()
			return
	# Linke Hälfte: der Stick, genau dort, wo der Daumen aufsetzt.
	if at.x < get_viewport_rect().size.x * 0.5 and _stick_finger < 0:
		_stick_finger = index
		_stick_origin = at
		_move_stick(at)


func _touch_up(index: int) -> void:
	if _button_fingers.has(index):
		Input.action_release(_button_fingers[index])
		_button_fingers.erase(index)
		queue_redraw()
	elif index == _stick_finger:
		_stick_finger = -1
		_stick_value = Vector2.ZERO
		_apply()


func _move_stick(at: Vector2) -> void:
	var r := STICK_RADIUS * _scale()
	_stick_value = ((at - _stick_origin) / r).limit_length(1.0)
	_apply()


func _apply() -> void:
	var v := _stick_value
	var x := 0.0 if absf(v.x) < DEAD else v.x
	var y := 0.0 if absf(v.y) < DEAD else -v.y
	_set_axis("right", "left", x)
	_set_axis("accelerate", "brake", y)
	queue_redraw()


func _set_axis(positive: String, negative: String, value: float) -> void:
	if value > 0.0:
		Input.action_press(positive, value)
		Input.action_release(negative)
	elif value < 0.0:
		Input.action_press(negative, -value)
		Input.action_release(positive)
	else:
		Input.action_release(positive)
		Input.action_release(negative)


func _draw() -> void:
	var s := _scale()
	var r := STICK_RADIUS * s
	var size := get_viewport_rect().size
	# Ohne Finger steht der Stick als Hinweis unten links.
	var origin := _stick_origin if _stick_finger >= 0 else Vector2(170 * s, size.y - 150 * s)
	draw_circle(origin, r, Color(0.15, 0.1, 0.05, 0.25))
	draw_arc(origin, r, 0, TAU, 48, Color(1, 0.95, 0.85, 0.6), 3.0 * s, true)
	draw_circle(origin + _stick_value * r, r * 0.42, Color(1, 0.95, 0.85, 0.75))
	for b in _buttons():
		var down: bool = _button_fingers.values().has(b[0])
		draw_circle(b[1], b[2], Color(0.15, 0.1, 0.05, 0.45 if down else 0.25))
		draw_arc(b[1], b[2], 0, TAU, 40, Color(1, 0.95, 0.85, 0.7), 3.0 * s, true)
		var fs := int((22 if b[2] > 50 * s else 18) * s)
		var w := _font.get_string_size(b[3], HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(_font, b[1] + Vector2(-w * 0.5, fs * 0.35), b[3], HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.97, 0.9))
