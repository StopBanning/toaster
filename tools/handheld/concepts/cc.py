# Shared helpers for the handheld concept models (Blender 5.2). Units: mm, x right, y down from the
# device's top-left corner (as game.js's), the face at z = 0, the back at -depth. Everything made here is parented
# to ROOT, so a whole device can be posed for a hero shot by moving ROOT.
import math, os
import bpy, bmesh
from mathutils import Vector, Euler

M = 0.001
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
scene = None
ROOT = None
SIZE = (100.0, 190.0)  # the device's width and height (sets where its centre is)

def setup(width, height):
    global scene, ROOT, SIZE
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    SIZE = (width, height)
    ROOT = bpy.data.objects.new('root', None); scene.collection.objects.link(ROOT)
    return scene

def P(x, y, z=0.0):
    return Vector(((x - SIZE[0] / 2) * M, (SIZE[1] / 2 - y) * M, z * M))

def own(ob):
    ob.parent = ROOT
    return ob

def rrect(x, y, w, h, r, seg=12):
    rr = [r] * 4 if isinstance(r, (int, float)) else r
    pts = []
    for cx, cy, rad, a0, a1 in [(x + rr[0], y + rr[0], rr[0], 180, 270), (x + w - rr[1], y + rr[1], rr[1], 270, 360),
                                (x + w - rr[2], y + h - rr[2], rr[2], 0, 90), (x + rr[3], y + h - rr[3], rr[3], 90, 180)]:
        n = max(2, int(seg * max(1, rad / 6)))
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return pts

def circle(cx, cy, r, n=64):
    return [(cx + r * math.cos(i * math.tau / n), cy + r * math.sin(i * math.tau / n)) for i in range(n)]

def rotated(pts, cx, cy, ang):
    ca, sa = math.cos(ang), math.sin(ang)
    return [(cx + (px - cx) * ca - (py - cy) * sa, cy + (px - cx) * sa + (py - cy) * ca) for px, py in pts]

def prism(name, outline, z0, z1, mat=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new(P(px, py, z0)) for px, py in reversed(outline)]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)], vec=Vector((0, 0, (z1 - z0) * M)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); own(ob)
    if mat: ob.data.materials.append(mat)
    return ob

def quad(name, x, y, w, h, z, mat=None, ang=0.0):
    """A flat rectangle facing up (+z), UVs 0..1 left to right and bottom to top."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    cx, cy = x + w / 2, y + h / 2
    corners = rotated([(x, y + h), (x + w, y + h), (x + w, y), (x, y)], cx, cy, ang)
    vs = [bm.verts.new(P(px, py, z)) for px, py in corners]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.new()
    for loop, (u, v) in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): loop[uv].uv = (u, v)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); own(ob)
    if mat: ob.data.materials.append(mat)
    return ob

def cut(target, cutter):
    mod = target.modifiers.new('cut_' + cutter.name, 'BOOLEAN')
    mod.operation = 'DIFFERENCE'; mod.solver = 'EXACT'; mod.object = cutter
    cutter.hide_render = True; cutter.hide_viewport = True

def joined(name, obs):
    """Several cutters as one (one boolean instead of many)."""
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    obs[0].name = name
    return obs[0]

def bevel(ob, width, segments=4, angle=40):
    mod = ob.modifiers.new('bevel', 'BEVEL')
    mod.width = width * M; mod.segments = segments
    mod.limit_method = 'ANGLE'; mod.angle_limit = math.radians(angle)
    return mod

srgb = lambda c: tuple(((v / 255) ** 2.2) for v in c)
mixc = lambda a, b, t: tuple(x + (y - x) * t for x, y in zip(a, b))

def mat(name, color, rough=0.5, metal=0.0, coat=0.0, spec=0.5, sss=0.0, emit=None, trans=0.0, aniso=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = 0.06
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Transmission Weight'].default_value = trans
    if aniso: b.inputs['Anisotropic'].default_value = aniso
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.004, 0.003, 0.002)
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1); b.inputs['Emission Strength'].default_value = emit[1]
    return m

def edged(m, bare=None, edge=0.5, grime=0.35):
    """Handling: its convex edges rubbed (brighter and smoother; bare: the colour under a coating, as anodising
    wears to bare aluminium), and dirt in its crevices (darker)."""
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    col_in = b.inputs['Base Color'].links[0].from_socket if b.inputs['Base Color'].links else None
    base = b.inputs['Base Color'].default_value[:]
    ain = nt.nodes.new('ShaderNodeAmbientOcclusion'); ain.inside = True; ain.samples = 8; ain.inputs['Distance'].default_value = 0.003
    aout = nt.nodes.new('ShaderNodeAmbientOcclusion'); aout.samples = 8; aout.inputs['Distance'].default_value = 0.0025
    e = nt.nodes.new('ShaderNodeMapRange'); e.inputs['From Min'].default_value = 0.9; e.inputs['From Max'].default_value = 0.55
    nt.links.new(ain.outputs['AO'], e.inputs['Value'])
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 180.0; n.inputs['Detail'].default_value = 6
    tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    em = nt.nodes.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; nt.links.new(e.outputs['Result'], em.inputs[0]); nt.links.new(n.outputs['Fac'], em.inputs[1])
    em2 = nt.nodes.new('ShaderNodeMath'); em2.operation = 'MULTIPLY'; em2.inputs[1].default_value = 2.0 * edge; em2.use_clamp = True
    nt.links.new(em.outputs['Value'], em2.inputs[0])
    g = nt.nodes.new('ShaderNodeMapRange'); g.inputs['From Min'].default_value = 0.85; g.inputs['From Max'].default_value = 0.3
    g.inputs['To Max'].default_value = grime; nt.links.new(aout.outputs['AO'], g.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
    if col_in: nt.links.new(col_in, mx.inputs['A'])
    else: mx.inputs['A'].default_value = base
    bc = bare or tuple(min(1, c * 1.35 + 0.05) for c in base[:3])
    mx.inputs['B'].default_value = (*bc, 1); nt.links.new(em2.outputs['Value'], mx.inputs['Factor'])
    dk = nt.nodes.new('ShaderNodeMix'); dk.data_type = 'RGBA'; dk.blend_type = 'MULTIPLY'
    dk.inputs['B'].default_value = (0.35, 0.33, 0.3, 1)
    nt.links.new(mx.outputs['Result'], dk.inputs['A']); nt.links.new(g.outputs['Result'], dk.inputs['Factor'])
    nt.links.new(dk.outputs['Result'], b.inputs['Base Color'])
    r_in = b.inputs['Roughness'].links[0].from_socket if b.inputs['Roughness'].links else None
    rm = nt.nodes.new('ShaderNodeMix'); rm.data_type = 'FLOAT'
    if r_in: nt.links.new(r_in, rm.inputs['A'])
    else: rm.inputs['A'].default_value = b.inputs['Roughness'].default_value
    rm.inputs['B'].default_value = 0.18; nt.links.new(em2.outputs['Value'], rm.inputs['Factor'])
    nt.links.new(rm.outputs['Result'], b.inputs['Roughness'])
    return m

def worn(m, scale=60.0, amount=0.12, grain=0.04, scuff=0.72):
    """Wear on a surface: its roughness mottled (handled, polished in places), a fine grain, and scuffs (thin
    darker marks) here and there."""
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = scale; n1.inputs['Detail'].default_value = 8
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector'])
    r0 = b.inputs['Roughness'].default_value
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = r0 - amount; mr.inputs['To Max'].default_value = r0 + amount
    nt.links.new(n1.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
    # (scuffs: stretched noise, only its peaks)
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (900.0, 60.0, 60.0); mp.inputs['Rotation'].default_value = (0, 0, 0.6)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 1.0; n2.inputs['Detail'].default_value = 2
    nt.links.new(mp.outputs['Vector'], n2.inputs['Vector'])
    sc = nt.nodes.new('ShaderNodeMapRange'); sc.inputs['From Min'].default_value = 0.66; sc.inputs['From Max'].default_value = 0.72
    nt.links.new(n2.outputs['Fac'], sc.inputs['Value'])
    base = b.inputs['Base Color'].default_value[:]
    mc = nt.nodes.new('ShaderNodeMix'); mc.data_type = 'RGBA'
    mc.inputs['A'].default_value = base; mc.inputs['B'].default_value = (base[0] * scuff, base[1] * scuff, base[2] * scuff, 1)
    nt.links.new(sc.outputs['Result'], mc.inputs['Factor']); nt.links.new(mc.outputs['Result'], b.inputs['Base Color'])
    if grain:
        n3 = nt.nodes.new('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = 3000.0; n3.inputs['Detail'].default_value = 4
        nt.links.new(tc.outputs['Object'], n3.inputs['Vector'])
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = grain; bp.inputs['Distance'].default_value = 0.00002
        nt.links.new(n3.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m

def image_mat(name, path, emit=0.0, rough=0.4, alpha=False, coat=0.0):
    """A picture on a surface (its UVs): printed (emit 0), or a lit screen (emit > 0)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(path); tx.interpolation = 'Cubic'
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough; b.inputs['Coat Weight'].default_value = coat
    if emit:
        nt.links.new(tx.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
        b.inputs['Base Color'].default_value = (0, 0, 0, 1); nt.links.remove(b.inputs['Base Color'].links[0])
    if alpha:
        nt.links.new(tx.outputs['Alpha'], b.inputs['Alpha'])
    return m

def text(s, x, y, size, mat_, z=0.0, spacing=1.0, font='michroma.ttf', align='CENTER', rot=0.0, extrude=0.004, bevel_=0.0, valign='CENTER'):
    bpy.ops.object.text_add(location=P(x, y, z))
    t = bpy.context.active_object
    t.data.body = s; t.data.align_x = align; t.data.align_y = valign
    t.data.size = size * M; t.data.extrude = extrude * M; t.data.space_character = spacing
    t.data.bevel_depth = bevel_ * M; t.data.bevel_resolution = 3
    t.data.font = bpy.data.fonts.load(os.path.join(FONTS, font))
    t.data.materials.append(mat_)
    t.rotation_euler[2] = rot
    mw = t.matrix_world.copy(); t.parent = ROOT; t.matrix_world = mw
    return t

def area(name, loc, size, power, aim=(0, 0, 0), color=(1, 1, 1), shape='SQUARE', size_y=None):
    l = bpy.data.lights.new(name, 'AREA'); l.size = size; l.energy = power; l.color = color
    if size_y: l.shape = 'RECTANGLE'; l.size_y = size_y
    o = bpy.data.objects.new(name, l); o.location = loc; scene.collection.objects.link(o)
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False
    return o

def smooth_all(skip=()):
    """Smooth what's rounded and keep flat faces exactly flat (modifiers applied first)."""
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in list(scene.objects):
        if ob.type != 'MESH' or ob.hide_render or ob.name in skip or not any(m.type == 'BEVEL' for m in ob.modifiers): continue
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        ob.modifiers.clear(); ob.data = me
        me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(35))
        for f in me.polygons:   # (a big flat face smoothed bends its light round its holes: flat faces stay flat)
            if max(abs(f.normal.x), abs(f.normal.y), abs(f.normal.z)) > 0.999: f.use_smooth = False

def render_setup(res, samples, out_path, exposure=0.0, transparent=False):
    r = scene.render
    r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = res; r.resolution_percentage = 100
    r.film_transparent = transparent
    scene.cycles.samples = samples; scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 12; scene.cycles.seed = 3
    vt = os.environ.get('VIEW_TRANSFORM', 'Khronos PBR Neutral')
    scene.view_settings.view_transform = vt
    scene.view_settings.look = os.environ.get('LOOK', 'AgX - Medium High Contrast' if vt == 'AgX' else 'None')
    scene.view_settings.exposure = exposure
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    r.filepath = out_path
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'HIP'; prefs.get_devices()
        for d in prefs.devices: d.use = (d.type == 'HIP')
        scene.cycles.device = 'GPU'
    except Exception as e:
        print('GPU off:', e)

# ---- smooth outlines from distance fields (mm, y down) ------------------------------------------------------------------
def sd_box(px, py, cx, cy, hx, hy, r):
    qx, qy = abs(px - cx) - (hx - r), abs(py - cy) - (hy - r)
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r

def sd_circle(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r

def smin(a, b, k):
    h = max(k - abs(a - b), 0) / k
    return min(a, b) - h * h * k * 0.25

def smax(a, b, k):
    return -smin(-a, -b, k)

def trace(f, start, ds=0.4):
    """The closed outline where f = 0, followed from near start (a point outside, above it: the walk goes down to it
    first), clockwise on screen, a point every ds mm."""
    x, y = start
    while f(x, y) > 0: y += 0.05
    def grad(x, y, e=1e-3):
        return (f(x + e, y) - f(x - e, y)) / (2 * e), (f(x, y + e) - f(x, y - e)) / (2 * e)
    def project(x, y):
        for _ in range(4):
            gx, gy = grad(x, y); g2 = gx * gx + gy * gy or 1e-9; v = f(x, y)
            x, y = x - v * gx / g2, y - v * gy / g2
        return x, y
    x, y = project(x, y); pts = [(x, y)]; walked = 0.0
    while True:
        gx, gy = grad(x, y); n = math.hypot(gx, gy) or 1e-9
        tx, ty = -gy / n, gx / n           # (along the outline: outside on the left, clockwise on screen)
        x, y = project(x + tx * ds, y + ty * ds); walked += ds
        if walked > 4 * ds and math.hypot(x - pts[0][0], y - pts[0][1]) < ds * 0.75: break
        pts.append((x, y))
        if len(pts) > 100000: raise RuntimeError('outline did not close')
    return pts

# ---- the studio --------------------------------------------------------------------------------------------------------------
def hero_shot(height_mm, yaw=-24.0, cam=(0.11, -0.44, 0.13), lens=75, fstop=5.6, backdrop=None, key=22.0, fill=5.0, rim=14.0, world=0.12):
    """The device standing on a seamless backdrop (the theme's blue), turned yaw degrees, a camera in front of it."""
    import bmesh
    ROOT.rotation_euler = (math.radians(90), 0, math.radians(yaw))
    ROOT.location = (0, 0, height_mm / 2 * M)
    me = bpy.data.meshes.new('sweep'); bm = bmesh.new()
    R, N = 0.35, 24
    prof = [(-2.0, 0.0)] + [(0.6 + R * math.sin(a * math.pi / 2 / N), R - R * math.cos(a * math.pi / 2 / N)) for a in range(N + 1)] + [(0.6 + R, 3.0)]
    verts = [[bm.verts.new((xx, yy, zz)) for (yy, zz) in prof] for xx in (-3.0, 3.0)]
    for i in range(len(prof) - 1): bm.faces.new((verts[0][i], verts[1][i], verts[1][i + 1], verts[0][i + 1]))
    bm.to_mesh(me); bm.free()
    sw = bpy.data.objects.new('sweep', me); scene.collection.objects.link(sw)
    sw.data.materials.append(backdrop or mat('backdrop', srgb((5, 29, 181)), rough=0.8, spec=0.2))
    for p_ in sw.data.polygons: p_.use_smooth = True
    cd = bpy.data.cameras.new('cam'); cd.lens = lens; cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop
    c = bpy.data.objects.new('cam', cd); scene.collection.objects.link(c)
    s = height_mm / 150.0  # (the camera backs off for a taller device)
    c.location = (cam[0] * s, cam[1] * s, cam[2] * s)
    target = Vector((0.0, 0.0, height_mm / 2 * M * 0.96))
    c.rotation_euler = (target - c.location).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.focus_distance = (target - c.location).length
    scene.camera = c
    area('key', (-0.45, -0.55, 0.62), 0.9, key, aim=(0, 0, 0.07))
    area('fill', (0.55, -0.45, 0.25), 0.8, fill, aim=(0, 0, 0.07))
    area('rim', (0.25, 0.45, 0.45), 0.25, rim, aim=(0, 0, 0.09), size_y=0.9, shape='RECTANGLE')
    w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.04, 0.12, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = world
    # (a soft window where the camera's view of the screen reflects to, a little above it: the glass catches it)
    from mathutils import Matrix
    n = (Euler(ROOT.rotation_euler, 'XYZ').to_matrix() @ Vector((0, 0, 1))).normalized()
    d = (target - c.location).normalized(); r_ = d - 2 * d.dot(n) * n
    at = target + r_ * 0.38 * s + Vector((0, 0, 0.09 * s))
    sheen_card(at, target, size=(0.34 * s, 0.24 * s), strength=float(os.environ.get('SHEEN', 2.5)))
    return c

def front_shot(height_mm, pad=20.0):
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = (height_mm + 2 * pad) * M
    c = bpy.data.objects.new('cam', cd); scene.collection.objects.link(c)
    c.location = (0.0, 0.0, 0.5); scene.camera = c
    area('key', (-0.3, 0.4, 0.55), 0.5, 7.0); area('fill', (0.45, -0.15, 0.4), 0.7, 2.5)
    w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.05, 0.16, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
    return c

def knurl(name, cx, cy, cz, r, length, mat_, n=72, depth=0.3):
    """A knurled wheel, its axis across the device (x), centred at (cx, cy, cz) in the device's units."""
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    ring = []
    for i in range(n * 2):
        a = i * math.pi / n; rr = r if i % 2 == 0 else r - depth
        ring.append((rr * math.cos(a), rr * math.sin(a)))
    v0 = [bm.verts.new(P(cx - length / 2, cy + yy, cz + zz)) for (yy, zz) in ring]
    v1 = [bm.verts.new(P(cx + length / 2, cy + yy, cz + zz)) for (yy, zz) in ring]
    for i in range(len(ring)):
        j = (i + 1) % len(ring)
        bm.faces.new((v0[i], v0[j], v1[j], v1[i]))
    bm.faces.new(list(reversed(v0))); bm.faces.new(v1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); own(ob)
    ob.data.materials.append(mat_)
    return ob

def sheen_card(loc, aim, size=(0.5, 0.3), strength=6.0):
    """A soft window seen only in reflections: the screens' glass catches it (a gradient, bright at one end)."""
    import bmesh
    me = bpy.data.meshes.new('sheen'); bm = bmesh.new()
    w, h = size
    vs = [bm.verts.new(v) for v in ((-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0))]
    f = bm.faces.new(vs); uv = bm.loops.layers.uv.new()
    for loop, (u, v) in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): loop[uv].uv = (u, v)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('sheen', me); scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('Z', 'Y').to_euler()
    m = bpy.data.materials.new('sheen'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].color = (0, 0, 0, 1); ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    ramp.color_ramp.elements[0].position = 0.15
    nt.links.new(sep.outputs['Y'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    ob.data.materials.append(m)
    ob.visible_camera = False; ob.visible_diffuse = False; ob.visible_shadow = False; ob.visible_transmission = False; ob.visible_volume_scatter = False
    return ob
