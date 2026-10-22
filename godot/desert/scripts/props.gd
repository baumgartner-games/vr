class_name Props
extends RefCounted
## **Die Dinge in der Wüste** — Modelle aus dem Regal (KayKit), auf Maß
## gebracht, eingefärbt, auf den Sand gestellt und mit einer Kiste als
## Körper, damit das Auto daran hängen bleibt.

static var _dust_mat: StandardMaterial3D


## Die Hülle aller Netze unter `root`, im Raum seines Elternknotens (mit seiner eigenen Drehung).
static func bounds(root: Node3D) -> AABB:
	var box := AABB()
	var first := true
	var parent := root.get_parent() as Node3D
	var inside := root.is_inside_tree() and parent != null
	var inv := parent.global_transform.affine_inverse() if inside else Transform3D.IDENTITY
	for node in _meshes(root):
		var xf := inv * node.global_transform if inside else _relative(node, root)
		var b := xf * node.get_aabb()
		box = b if first else box.merge(b)
		first = false
	return box


static func _meshes(root: Node) -> Array[MeshInstance3D]:
	var out: Array[MeshInstance3D] = []
	if root is MeshInstance3D:
		out.append(root)
	for c in root.get_children():
		out.append_array(_meshes(c))
	return out


static func _relative(node: Node3D, root: Node3D) -> Transform3D:
	var xf := Transform3D.IDENTITY
	var n: Node = node
	while n != null and n != root:
		if n is Node3D:
			xf = (n as Node3D).transform * xf
		n = n.get_parent()
	return root.transform * xf


## Alle Netze in einer Farbe — die Regalmodelle tragen bunte Atlas-Farben, die Wüste nicht.
## `keep` zwischen 0 und 1: wie viel von der Textur durchscheint.
static func tint(root: Node, colour: Color, keep := 0.0) -> void:
	for m in _meshes(root):
		for s in m.mesh.get_surface_count():
			var src := m.mesh.surface_get_material(s) as BaseMaterial3D
			var mat := StandardMaterial3D.new()
			mat.albedo_color = colour
			mat.roughness = 0.9
			if keep > 0.0 and src and src.albedo_texture:
				mat.albedo_texture = src.albedo_texture
				mat.albedo_color = colour.lerp(Color.WHITE, keep)
			m.set_surface_override_material(s, mat)


static func dust_material() -> StandardMaterial3D:
	if _dust_mat:
		return _dust_mat
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(0.45, Color(1, 1, 1, 0.55))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = 64
	tex.height = 64
	var m := StandardMaterial3D.new()
	m.albedo_texture = tex
	m.vertex_color_use_as_albedo = true
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.disable_receive_shadows = true
	_dust_mat = m
	return m


## Ein Modell aus dem Regal hinstellen: `size` ist die längste Seite in Metern,
## `solid` gibt ihm einen Körper aus seiner Hülle.
static func place(
	parent: Node3D,
	path: String,
	at: Vector3,
	size: float,
	yaw: float,
	colour: Color,
	solid := true,
	sink := 0.0,
	along_x := false,
) -> Node3D:
	var scene: PackedScene = load(path)
	var model := scene.instantiate() as Node3D
	var box := bounds(model)
	# Zäune und Wände: die lange Seite auf x, damit `yaw` die Laufrichtung ist.
	if along_x and box.size.z > box.size.x:
		model.rotation.y = PI * 0.5
		box = bounds(model)
	var s := size / maxf(box.size.x, maxf(box.size.y, box.size.z))
	var holder: Node3D
	if solid:
		holder = StaticBody3D.new()
		var col := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = box.size * s
		col.shape = shape
		col.position = Vector3(0, box.size.y * s * 0.5, 0)
		holder.add_child(col)
	else:
		holder = Node3D.new()
	var look := Node3D.new()
	look.scale = Vector3.ONE * s
	model.position = -Vector3(box.get_center().x, box.position.y, box.get_center().z)
	look.add_child(model)
	holder.add_child(look)
	holder.position = at - Vector3(0, sink * box.size.y * s, 0)
	holder.rotation.y = yaw
	tint(model, colour)
	parent.add_child(holder)
	return holder
