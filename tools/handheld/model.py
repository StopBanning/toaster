# The handheld game's handheld (renderer/game.js), as a real object: built in game.js's units (100 wide, 190
# tall; a unit = 1 mm) and rendered straight on (orthographic), so the app can draw its live screens under it
# and its pressed buttons over it. White shell; one black glass lens over both screens with TOASTER printed on
# it between them and the power light under it; the cross in navy, A the theme's blue, B light blue (the
# bluescreen theme's --ink and --bg). The screens are holdouts (clear, under the lens's reflections); a floor
# catches the drop shadow. Variants, one render each: up (all up, the light softly on), down (A and B down,
# the light bright), dl / dr / du / dd (the cross tilted left / right / up / down, rendered round the cross).
# To make the app's pictures again (Blender 5.2):
#   python -I tools/handheld/fonts.py
#   blender -b --factory-startup --python tools/handheld/model.py -- <renders dir> [samples] [percent] [variants]
#   python -I tools/handheld/assets.py <renders dir> renderer/handheld      (prints game.js's PARTS)
import math, os, sys
import bpy, bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'renders')
SAMPLES = int(argv[1]) if len(argv) > 1 else 256
PCT = int(argv[2]) if len(argv) > 2 else 100
VARIANTS = argv[3].split(',') if len(argv) > 3 else ['up', 'down', 'dl', 'dr', 'du', 'dd']
os.makedirs(OUT, exist_ok=True)
PX_PER_U = 10.24  # 1024 px across the device
PAD = 12.0        # room round the device for its shadow (game.js's pad)
SHEEN = float(os.environ.get('SHEEN', 13))  # the softbox's strength, seen in the lens
M = 0.001

def P(x, y, z=0.0):
    """game.js units (x right, y down from the device's top-left) to Blender metres (y up, centred)."""
    return Vector(((x - 50) * M, (95 - y) * M, z * M))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---- the layout (keep in step with game.js layout()) ---------------------------------------------------------------
LENS = (6.0, 6.0, 88.0, 142.0, 5.0)          # the glass: x, y, w, h, corner
TOP = (10.0, 10.0, 80.0, 60.0)               # the screens' windows
BOT = (10.0, 84.0, 80.0, 60.0)
CY = 164.5                                   # the controls' line
DPAD = (22.0, CY)
A_AT, B_AT = (86.0, CY - 6.5), (69.0, CY + 1.0)
LED_AT = (12.0, 76.4)

# ---- helpers ---------------------------------------------------------------------------------------------------------
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
    """A solid from an outline in game.js units, between depths z0 < z1 (mm; the face is z = 0, up is +)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(P(px, py, z0)) for px, py in reversed(outline)]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)], vec=Vector((0, 0, (z1 - z0) * M)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    if mat: ob.data.materials.append(mat)
    return ob

def cut(target, cutter):
    mod = target.modifiers.new('cut_' + cutter.name, 'BOOLEAN')
    mod.operation = 'DIFFERENCE'; mod.solver = 'EXACT'; mod.object = cutter
    cutter.hide_render = True; cutter.hide_viewport = True

def bevel(ob, width, segments=5, angle=40):
    mod = ob.modifiers.new('bevel', 'BEVEL')
    mod.width = width * M; mod.segments = segments
    mod.limit_method = 'ANGLE'; mod.angle_limit = math.radians(angle)
    return mod

srgb = lambda c: tuple(((v / 255) ** 2.2) for v in c)
mixc = lambda a, b, t: tuple(x + (y - x) * t for x, y in zip(a, b))
NAVY, BLUE, LIGHT = srgb((2, 11, 69)), srgb((5, 29, 181)), srgb((96, 160, 255))  # bluescreen: --ink, --bg, a light blue

def mat(name, color, rough=0.5, metal=0.0, coat=0.0, spec=0.5, sss=0.0, grain=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = 0.08
    b.inputs['Specular IOR Level'].default_value = spec
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.0025, 0.0018, 0.0012)
        b.inputs['Subsurface Scale'].default_value = 1.0
    if grain:
        # a moulded/printed surface's fine grain, and a faint roughness variation
        tc = nt.nodes.new('ShaderNodeTexCoord')
        noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 2600.0; noise.inputs['Detail'].default_value = 6
        nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
        bmp = nt.nodes.new('ShaderNodeBump'); bmp.inputs['Strength'].default_value = grain; bmp.inputs['Distance'].default_value = 0.00002
        nt.links.new(noise.outputs['Fac'], bmp.inputs['Height']); nt.links.new(bmp.outputs['Normal'], b.inputs['Normal'])
        n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 90.0
        nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = rough - 0.06; mr.inputs['To Max'].default_value = rough + 0.06
        nt.links.new(n2.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1); b.inputs['Emission Strength'].default_value = emit[1]
    return m

def glass_mat(name):
    """A thin clear sheet: see-through, with a glass's reflection (Fresnel, IOR 1.49) and nothing trapped inside it."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); gl = nt.nodes.new('ShaderNodeBsdfGlossy')
    gl.inputs['Roughness'].default_value = 0.02
    fr = nt.nodes.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.49
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(fr.outputs['Fac'], mx.inputs['Fac']); nt.links.new(tr.outputs['BSDF'], mx.inputs[1]); nt.links.new(gl.outputs['BSDF'], mx.inputs[2])
    nt.links.new(mx.outputs['Shader'], nt.nodes['Material Output'].inputs['Surface'])
    return m

def holdout_mat():
    m = bpy.data.materials.new('holdout'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    h = nt.nodes.new('ShaderNodeHoldout'); nt.links.new(h.outputs['Holdout'], nt.nodes['Material Output'].inputs['Surface'])
    return m

# ---- materials --------------------------------------------------------------------------------------------------------
shell = mat('shell', (0.74, 0.735, 0.71), rough=0.5, sss=0.06, grain=0.05, spec=0.45)
mask = mat('mask', (0.004, 0.004, 0.005), rough=0.32, spec=0.25)
white_print = mat('white_print', (0.82, 0.84, 0.88), rough=0.45)
light_print = mat('light_print', LIGHT, rough=0.45)
grey_print = mat('grey_print', (0.33, 0.35, 0.40), rough=0.5)
navy_print = mat('navy_print', NAVY, rough=0.45)
blue_print = mat('blue_print', BLUE, rough=0.45)
well_floor = mat('well_floor', (0.03, 0.03, 0.035), rough=0.7)
cross_mat = mat('cross', NAVY, rough=0.42, coat=0.08)
cross_print = mat('cross_print', mixc(LIGHT, (1, 1, 1), 0.3), rough=0.45)
a_mat = mat('A', BLUE, rough=0.18, coat=0.7, sss=0.08)
b_mat = mat('B', LIGHT, rough=0.18, coat=0.7, sss=0.08)
pill_mat = mat('pill', mixc(NAVY, (0.25, 0.26, 0.3), 0.45), rough=0.8)
led_off = mat('led_off', srgb((150, 6, 14)), rough=0.2, coat=0.5, emit=(srgb((255, 18, 28)), 0.9))
led_on = mat('led_on', srgb((255, 40, 50)), rough=0.2, coat=0.5, emit=(srgb((255, 24, 34)), 12.0))
lens = glass_mat('lens')
holdout = holdout_mat()

# ---- the shell ---------------------------------------------------------------------------------------------------------
D = 22.0
body = prism('shell', rrect(0, 0, 100, 190, [8, 8, 26, 8], seg=10), -D, 0, mat=shell)
bevel(body, 1.8, segments=7, angle=50)  # (the outline, before the cuts)
seam_o = prism('seam_o', rrect(2.5, 2.5, 95, 185, [6, 6, 23, 6], seg=10), -0.35, 1)
seam_i = prism('seam_i', rrect(2.85, 2.85, 94.3, 184.3, [5.65, 5.65, 22.65, 5.65], seg=10), -0.5, 1.2)
m_ = seam_o.modifiers.new('ring', 'BOOLEAN'); m_.operation = 'DIFFERENCE'; m_.solver = 'EXACT'; m_.object = seam_i
seam_i.hide_render = True; seam_i.hide_viewport = True
cut(body, seam_o)
lx, ly, lw, lh, lr = LENS
cut(body, prism('lens_pocket', rrect(lx - 0.3, ly - 0.3, lw + 0.6, lh + 0.6, lr + 0.3), -1.4, 1))
for i, (x, y, w, h) in enumerate((TOP, BOT)):
    cut(body, prism(f'screen_pocket{i}', rrect(x - 1.5, y - 1.5, w + 3, h + 3, 1.5), -3.2, 1))
cut(body, prism('dwell', circle(*DPAD, 13.5), -0.9, 1))
abc = ((A_AT[0] + B_AT[0]) / 2, (A_AT[1] + B_AT[1]) / 2); abang = math.atan2(A_AT[1] - B_AT[1], A_AT[0] - B_AT[0])
ablen = math.hypot(A_AT[0] - B_AT[0], A_AT[1] - B_AT[1]) + 14.0
cut(body, prism('abwell', rotated(rrect(abc[0] - ablen / 2, abc[1] - 7, ablen, 14, 6.95), abc[0], abc[1], abang), -0.9, 1))
PILLS = [(42.0, CY + 15.0), (58.0, CY + 15.0)]
for i, (px, py) in enumerate(PILLS):
    cut(body, prism(f'pwell{i}', rotated(rrect(px - 5, py - 1.6, 10, 3.2, 1.55), px, py, -0.42), -0.7, 1))
SLOTS = []
for i in range(6):
    x0, y0 = 70 + 4 * i, 181.0
    ang = math.atan2(-10, 6); L_ = math.hypot(6, 10)
    SLOTS.append((x0, y0, ang, L_))
    cut(body, prism(f'slot{i}', rotated(rrect(x0 - 0.55, y0 - 0.55, L_ + 1.1, 1.1, 0.54, seg=4), x0, y0, ang), -2.5, 1))
bevel(body, 0.15, segments=2, angle=50)  # (a hairline on the cut edges, as a moulding has)
for i, (x0, y0, ang, L_) in enumerate(SLOTS):
    prism(f'slotfloor{i}', rotated(rrect(x0 - 0.65, y0 - 0.65, L_ + 1.3, 1.3, 0.6, seg=4), x0, y0, ang), -2.7, -2.2, mat=well_floor)

# ---- the lens: glass over a black mask with the windows, the print, the power light ----------------------------------------
# (a single sheet, its face only: the top of a 0.85 mm lens)
me = bpy.data.meshes.new('lens'); bm = bmesh.new()
bm.faces.new([bm.verts.new(P(px, py, -0.15)) for px, py in reversed(rrect(lx, ly, lw, lh, lr, seg=10))])
bm.to_mesh(me); bm.free()
glass = bpy.data.objects.new('lens', me); scene.collection.objects.link(glass); glass.data.materials.append(lens)
glass.visible_shadow = False
mask_ob = prism('mask', rrect(lx, ly, lw, lh, lr, seg=10), -1.4, -1.02, mat=mask)
for i, (x, y, w, h) in enumerate((TOP, BOT)):
    cut(mask_ob, prism(f'window{i}', rrect(x, y, w, h, 1.2), -2, 0))
    prism(f'screen{i}', rrect(x - 1.5, y - 1.5, w + 3, h + 3, 1.5), -2.6, -2.2, mat=holdout)
cut(mask_ob, prism('ledwindow', circle(*LED_AT, 0.95, 40), -2, 0))
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.9 * M, location=P(*LED_AT, -1.7))
led = bpy.context.active_object; led.name = 'led'; led.scale[2] = 0.55; led.data.materials.append(led_off)

FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')  # JetBrains Mono (the app's font, OFL) at weights 700 and 800
def text(s, x, y, size, mat_, z=-1.01, spacing=1.0, font='jbm-700.ttf', align='CENTER', shear=0.0, extrude=0.004, bevel=0.0):
    bpy.ops.object.text_add(location=P(x, y, z))
    t = bpy.context.active_object
    t.data.body = s; t.data.align_x = align; t.data.align_y = 'CENTER'
    t.data.size = size * M; t.data.extrude = extrude * M; t.data.space_character = spacing; t.data.shear = shear
    t.data.bevel_depth = bevel * M; t.data.bevel_resolution = 3
    t.data.font = bpy.data.fonts.load(os.path.join(FONTS, font))
    t.data.materials.append(mat_)
    return t

def width(t):
    bpy.context.view_layer.update()
    return t.dimensions.x / M

def bounds(t):
    """The letters' bounds in the text's own space (metres): x0, y0, x1, y1."""
    bpy.context.view_layer.update()
    xs = [c[0] for c in t.bound_box]; ys = [c[1] for c in t.bound_box]
    return min(xs), min(ys), max(xs), max(ys)

def ramp_mat(name, stops, box, along=(0.0, 1.0), emit=0.6, rough=0.3, metal=0.0):
    """A print whose colour runs through stops (position, rgb) across its letters: box = their bounds in the text's
    own space (x0, y0, x1, y1, from bounds()); along = how much of their width and of their height make the position;
    lit a little from within (emit), so it reads on the black glass."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    fx = nt.nodes.new('ShaderNodeMapRange'); fx.inputs['From Min'].default_value = box[0]; fx.inputs['From Max'].default_value = box[2]
    fy = nt.nodes.new('ShaderNodeMapRange'); fy.inputs['From Min'].default_value = box[1]; fy.inputs['From Max'].default_value = box[3]
    nt.links.new(sep.outputs['X'], fx.inputs['Value']); nt.links.new(sep.outputs['Y'], fy.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MULTIPLY'; mx.inputs[1].default_value = along[0]
    my = nt.nodes.new('ShaderNodeMath'); my.operation = 'MULTIPLY_ADD'; my.inputs[1].default_value = along[1]
    nt.links.new(fx.outputs['Result'], mx.inputs[0]); nt.links.new(fy.outputs['Result'], my.inputs[0]); nt.links.new(mx.outputs['Value'], my.inputs[2])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); els = ramp.color_ramp.elements
    els[0].position, els[0].color = stops[0][0], (*stops[0][1], 1)
    els[1].position, els[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]: els.new(pos).color = (*col, 1)
    nt.links.new(my.outputs['Value'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color']); nt.links.new(ramp.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = emit; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m

# On the mask, between the screens (y 70 to 84; the power light at the left): the wordmark. LOGO picks its design:
#   mono: TOASTER in the app's monospace, LIVE CODE POCKET under it between Game Boy-style rules, POWER under the light
#   chrome: TOASTER in Orbitron Black, raised, in Y2K chrome (sky, a bright horizon, the dark ground under it)
#   color: TOASTER in a heavy italic, white, then POCKET with each letter in a lane's colour (as GAME BOY COLOR)
#   minimal: toaster in a rounded lowercase, silver, and a pill that glows LIVE
#   holo: TOASTER in Zen Dots, in holographic foil
LOGO = os.environ.get('LOGO', 'mono')
CX, CY_S = 52.0, 77.0  # (the strip's middle, a little right of centre: the light sits at the left)
if LOGO == 'mono':
    text('TOASTER', 50, 75.3, 5.4, white_print, spacing=1.5, font='jbm-800.ttf', shear=0.2)
    text('LIVE CODE  POCKET', 50, 80.7, 1.75, light_print, spacing=1.3)
    for (x0, x1) in ((24.0, 36.0), (64.0, 76.0)):
        prism('rule_b', rrect(x0, 80.1, x1 - x0, 0.42, 0.2, seg=2), -1.012, -1.006, mat=blue_print)
        prism('rule_l', rrect(x0, 80.95, x1 - x0, 0.42, 0.2, seg=2), -1.012, -1.006, mat=light_print)
    text('POWER', LED_AT[0], 80.7, 1.2, grey_print, spacing=1.1)
elif LOGO == 'chrome':
    t = text('TOASTER', CX, CY_S, 7.8, white_print, spacing=1.06, font='orbitron-900.ttf', extrude=0.12, bevel=0.06)
    # (chrome, bottom to top: pale steel, the dark ground under the horizon, a white horizon, pale sky, deep blue sky)
    t.data.materials[0] = ramp_mat('chrome', [(0.0, (0.8, 0.86, 1.0)), (0.2, (0.18, 0.27, 0.75)), (0.44, (0.004, 0.006, 0.03)),
                                              (0.47, (1.0, 1.0, 1.0)), (0.53, (0.6, 0.82, 1.0)), (1.0, (0.004, 0.02, 0.3))],
                                   bounds(t), emit=0.75, rough=0.22, metal=0.35)
    # a thin light-blue edge round it, so its dark band doesn't sink into the black glass
    o = text('TOASTER', CX, CY_S, 7.8, mat('edge', LIGHT, rough=0.4, emit=(LIGHT, 0.9)), z=-1.016, spacing=1.06, font='orbitron-900.ttf')
    o.data.offset = 0.24 * M
elif LOGO == 'color':
    white_hi = mat('white_hi', (0.92, 0.94, 0.97), rough=0.4, emit=((0.92, 0.94, 0.97), 0.55))
    t1 = text('TOASTER', 0, CY_S, 7.0, white_hi, font='exo2-900i.ttf', align='LEFT', extrude=0.04)
    lanes = [(255, 52, 128), (255, 160, 20), (30, 220, 255), (130, 250, 60), (80, 140, 255), (175, 110, 255)]  # (the lanes', a touch deeper for print)
    t2 = text('POCKET', 0, CY_S, 6.3, white_hi, font='nunito-900.ttf', align='LEFT', extrude=0.04, spacing=1.04)
    t2.data.materials.clear()
    for i, c in enumerate(lanes):
        t2.data.materials.append(mat(f'lane{i}', srgb(c), rough=0.4, emit=(srgb(c), 0.1)))
    for i in range(len('POCKET')): t2.data.body_format[i].material_index = i
    w1, w2, gap = width(t1), width(t2), 1.9
    x0 = CX - (w1 + gap + w2) / 2
    t1.location.x = (x0 - 50) * M; t2.location.x = (x0 + w1 + gap - 50) * M
elif LOGO == 'minimal':
    silver = mat('silver', (0.72, 0.74, 0.78), rough=0.28, metal=0.75, emit=((0.72, 0.74, 0.78), 0.14))
    glow = mat('live', LIGHT, rough=0.4, emit=(LIGHT, 2.6))
    t = text('toaster', 0, CY_S - 0.4, 7.6, silver, font='nunito-900.ttf', align='LEFT', extrude=0.06, bevel=0.03)
    w = width(t); pw, ph, gap = 11.0, 4.0, 2.8
    x0 = CX - (w + gap + pw) / 2
    t.location.x = (x0 - 50) * M
    px = x0 + w + gap
    ring = prism('pill', rrect(px, CY_S - ph / 2, pw, ph, ph / 2, seg=8), -1.012, -1.004, mat=glow)
    cut(ring, prism('pill_in', rrect(px + 0.32, CY_S - ph / 2 + 0.32, pw - 0.64, ph - 0.64, ph / 2 - 0.32, seg=8), -2, 0))
    text('LIVE', px + pw / 2, CY_S, 2.05, glow, font='michroma.ttf', spacing=1.25)
elif LOGO == 'holo':
    t = text('TOASTER', CX, CY_S, 7.3, white_print, spacing=1.04, font='zendots.ttf', extrude=0.05, bevel=0.025)
    t.data.materials[0] = ramp_mat('holo', [(0.0, (1.0, 0.25, 0.62)), (0.22, (0.58, 0.36, 1.0)), (0.45, (0.2, 0.78, 1.0)), (0.66, (0.3, 1.0, 0.5)),
                                            (0.84, (1.0, 0.88, 0.3)), (1.0, (1.0, 0.4, 0.45))], bounds(t), along=(0.8, 0.3), emit=0.8, rough=0.18, metal=0.45)

# ---- the controls ---------------------------------------------------------------------------------------------------------
pivot = bpy.data.objects.new('dpad_pivot', None); scene.collection.objects.link(pivot)
pivot.location = P(*DPAD, -0.9)
bpy.context.view_layer.update()
def child(ob):
    mw = ob.matrix_world.copy(); ob.parent = pivot; ob.matrix_world = mw
    return ob
def fillet(poly, radii, seg=6):
    """A polygon's corners rounded (90-degree corners, convex or concave), one radius each."""
    out = []
    for i, (vx, vy) in enumerate(poly):
        (px, py), (nx, ny) = poly[i - 1], poly[(i + 1) % len(poly)]
        r = radii[i]
        d1 = ((px - vx) / math.hypot(px - vx, py - vy), (py - vy) / math.hypot(px - vx, py - vy))
        d2 = ((nx - vx) / math.hypot(nx - vx, ny - vy), (ny - vy) / math.hypot(nx - vx, ny - vy))
        c = (vx + (d1[0] + d2[0]) * r, vy + (d1[1] + d2[1]) * r)
        a0 = math.atan2(vy + d1[1] * r - c[1], vx + d1[0] * r - c[0]); a1 = math.atan2(vy + d2[1] * r - c[1], vx + d2[0] * r - c[0])
        da = (a1 - a0 + math.pi) % math.tau - math.pi
        for k in range(seg + 1): out.append((c[0] + r * math.cos(a0 + da * k / seg), c[1] + r * math.sin(a0 + da * k / seg)))
    return out
cx0, cy0, hw, he = DPAD[0], DPAD[1], 3.3, 9.8
cross_poly = [(cx0 - hw, cy0 - he), (cx0 + hw, cy0 - he), (cx0 + hw, cy0 - hw), (cx0 + he, cy0 - hw), (cx0 + he, cy0 + hw), (cx0 + hw, cy0 + hw),
              (cx0 + hw, cy0 + he), (cx0 - hw, cy0 + he), (cx0 - hw, cy0 + hw), (cx0 - he, cy0 + hw), (cx0 - he, cy0 - hw), (cx0 - hw, cy0 - hw)]
cross = prism('cross', fillet(cross_poly, [1.3, 1.3, 0.6] * 4), -0.9, 2.0, mat=cross_mat)
cut(cross, prism('cross_dish', circle(*DPAD, 2.6, 64), 1.78, 3))
bevel(cross, 0.75, segments=5, angle=40); child(cross)
for ang in (0, 90, 180, 270):
    a = math.radians(ang); cx_, cy_ = DPAD[0] + 7.0 * math.cos(a), DPAD[1] - 7.0 * math.sin(a)
    tri = [(cx_ + 1.35 * math.cos(a), cy_ - 1.35 * math.sin(a)), (cx_ + 1.15 * math.cos(a + 2.2), cy_ - 1.15 * math.sin(a + 2.2)),
           (cx_ + 1.15 * math.cos(a - 2.2), cy_ - 1.15 * math.sin(a - 2.2))]
    child(prism('arrow', tri, 2.0, 2.025, mat=cross_print))
BUTTONS = {}
for name, at, m2 in (('A', A_AT, a_mat), ('B', B_AT, b_mat)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=5.6 * M, depth=3.0 * M, location=P(*at, -0.9 + 1.5))
    cyl = bpy.context.active_object; cyl.name = name; cyl.data.materials.append(m2)
    bv = cyl.modifiers.new('round', 'BEVEL'); bv.width = 1.9 * M; bv.segments = 10; bv.limit_method = 'ANGLE'
    BUTTONS[name] = cyl
for i, (px, py) in enumerate(PILLS):
    pill = prism(f'pill{i}', rotated(rrect(px - 4, py - 1.05, 8, 2.1, 1.04, seg=6), px, py, -0.42), -0.7, 0.7, mat=pill_mat)
    bevel(pill, 0.55, segments=4, angle=40)

# the print on the shell: the buttons' letters and start/select (navy ink)
for s_, x_, y_ in (('SELECT', 42, 184.6), ('START', 58, 184.6), ('B', B_AT[0], B_AT[1] + 8.4), ('A', A_AT[0], A_AT[1] + 8.4)):
    text(s_, x_, y_, 1.75, navy_print, z=0.003, spacing=1.08)

# ---- floor, lights, world, camera ------------------------------------------------------------------------------------------------
bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, -D * M - 0.0001))
floor = bpy.context.active_object; floor.is_shadow_catcher = True; floor.data.materials.append(mat('floor', (0.5, 0.5, 0.5)))

def area(name, loc, size, power, aim=(0, 0, 0)):
    l = bpy.data.lights.new(name, 'AREA'); l.size = size; l.energy = power
    o = bpy.data.objects.new(name, l); o.location = loc; scene.collection.objects.link(o)
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False
    return o
area('key', (-0.30, 0.40, 0.55), 0.5, 5.2)
area('fill', (0.45, -0.15, 0.40), 0.7, 1.6)
area('rim', (0.0, 0.62, 0.10), 0.3, 1.8)
# a softbox above, seen only in reflections: the lens's sheen (brightest at the top left corner, easing away
# towards the middle, no hard edge) and the buttons' highlights
card = bpy.data.meshes.new('card')
bm = bmesh.new()
for v in [(-0.25, -0.25, 0.22), (0.25, -0.25, 0.22), (0.25, 0.25, 0.22), (-0.25, 0.25, 0.22)]: bm.verts.new(v)
bm.faces.new(bm.verts); bm.to_mesh(card); bm.free()
cardo = bpy.data.objects.new('card', card); scene.collection.objects.link(cardo)
cm = bpy.data.materials.new('card'); cm.use_nodes = True
cnt = cm.node_tree; cnt.nodes.remove(cnt.nodes['Principled BSDF'])
em = cnt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = SHEEN
tco = cnt.nodes.new('ShaderNodeTexCoord')
dot = cnt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = (0.7071, -0.7071, 0)
cnt.links.new(tco.outputs['Object'], dot.inputs[0])
mr = cnt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -0.112; mr.inputs['From Max'].default_value = -0.035
cnt.links.new(dot.outputs['Value'], mr.inputs['Value'])
ramp = cnt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'EASE'
ramp.color_ramp.elements[0].color = (1, 1, 1, 1); ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[1].position = 1.0
cnt.links.new(mr.outputs['Result'], ramp.inputs['Fac']); cnt.links.new(ramp.outputs['Color'], em.inputs['Color'])
cnt.links.new(em.outputs['Emission'], cnt.nodes['Material Output'].inputs['Surface'])
card.materials.append(cm)
cardo.visible_camera = False; cardo.visible_diffuse = False; cardo.visible_shadow = False; cardo.visible_transmission = False
cardo.visible_volume_scatter = False

world = bpy.data.worlds.new('world'); scene.world = world; world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links
env = wn.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(bpy.utils.system_resource('DATAFILES'), 'studiolights', 'world', 'studio.exr'))
bg_lit, bg_dim = wn['Background'], wn.new('ShaderNodeBackground')
bg_lit.inputs['Strength'].default_value = 0.22; bg_dim.inputs['Strength'].default_value = 0.025
wl.new(env.outputs['Color'], bg_lit.inputs['Color']); wl.new(env.outputs['Color'], bg_dim.inputs['Color'])
lp = wn.new('ShaderNodeLightPath'); mixs = wn.new('ShaderNodeMixShader')
wl.new(lp.outputs['Is Glossy Ray'], mixs.inputs['Fac'])
wl.new(bg_lit.outputs['Background'], mixs.inputs[1]); wl.new(bg_dim.outputs['Background'], mixs.inputs[2])
wl.new(mixs.outputs['Shader'], wn['World Output'].inputs['Surface'])

cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'
W_u, H_u = 100 + 2 * PAD, 190 + 2 * PAD
cam_d.ortho_scale = H_u * M
cam = bpy.data.objects.new('cam', cam_d); scene.collection.objects.link(cam)
cam.location = (0, 0, 1.0); scene.camera = cam

r = scene.render
r.engine = 'CYCLES'
r.resolution_x = round(W_u * PX_PER_U); r.resolution_y = round(H_u * PX_PER_U); r.resolution_percentage = PCT
r.film_transparent = True
scene.cycles.film_transparent_glass = True
scene.cycles.film_transparent_roughness = 0.1
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.seed = 7
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0.35
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'; r.image_settings.color_depth = '8'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'HIP'; prefs.get_devices()
    for d in prefs.devices: d.use = (d.type == 'HIP')
    scene.cycles.device = 'GPU'
except Exception as e:
    print('GPU off:', e)

# smooth shading by angle on every mesh (after its modifiers)
# (all the meshes smoothed by angle at once: one call for each was slow)
smooth = [ob for ob in scene.objects if ob.type == 'MESH' and not ob.hide_render and ob.name not in ('card',)]
for o2 in scene.objects: o2.select_set(o2 in smooth)
bpy.context.view_layer.objects.active = smooth[0]
bpy.ops.object.shade_auto_smooth(angle=math.radians(35))

# ---- the variants ---------------------------------------------------------------------------------------------------------------
def px_box(cx, cy, half):
    """A render border round (cx, cy) +- half (game.js units), as shares of the frame (y up)."""
    x0 = (cx - half + PAD) / W_u; x1 = (cx + half + PAD) / W_u
    y0 = 1 - (cy + half + PAD) / H_u; y1 = 1 - (cy - half + PAD) / H_u
    return max(0, x0), min(1, x1), max(0, y0), min(1, y1)
TILT = math.radians(6)
for v in VARIANTS:
    for name, b in BUTTONS.items(): b.location.z = (-0.9 + 1.5 - (2.2 if v == 'down' else 0)) * M
    led.data.materials[0] = led_on if v == 'down' else led_off
    pivot.rotation_euler = {'dl': (0, -TILT, 0), 'dr': (0, TILT, 0), 'du': (-TILT, 0, 0), 'dd': (TILT, 0, 0)}.get(v, (0, 0, 0))
    if v.startswith('d') and v != 'down':
        r.use_border = True; r.use_crop_to_border = False
        r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = px_box(*DPAD, 17)
    elif os.environ.get('CROP'):   # (tests: a part only, in game.js units x0,y0,x1,y1)
        x0, y0, x1, y1 = (float(c) for c in os.environ['CROP'].split(','))
        r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = (x0 + PAD) / W_u, (x1 + PAD) / W_u
        r.border_min_y, r.border_max_y = 1 - (y1 + PAD) / H_u, 1 - (y0 + PAD) / H_u
    else:
        r.use_border = False
    r.filepath = os.path.join(OUT, f'body_{v}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', v, r.filepath)
