# The handheld game's handheld (renderer/game.js), clear: the same handheld as model.py (game.js's units, the
# screens, the buttons and the power light where they are on the white one, so the app's layout and parts fit it)
# in a smoked ice-blue see-through shell, its works showing through: a navy board with gold traces and its chips,
# the buttons' switches under see-through buttons, screws, the speaker, an orange ribbon between the screens. The
# works stop 5 short of the shell's sides, so its rim is clear plastic only and what's behind shows through it.
# Its lights stand under frosted guides: bars along both sides (the kick), a ring round the cross (the bass), one
# round the speaker (the hats) and a row of dots between the screens (the clap), each labelled on the board; the
# app adds each one's glow (rendered lit on its own, less unlit: assets.py's lights) in its lane's colour as its
# part plays. Each screen sits in a black glass frame of its own; TOASTER printed on the clear plastic between them.
# Variants, one render each: up, down (A and B down, the power light on), dl / dr / du / dd (the cross tilted), and
# lit-edge / lit-ring / lit-spk / lit-core (one light on, white; rendered only round it, but the bars).
# (Clear plastic: the shadow rays see a tinted see-through surface instead of the glass, so light reaches the works;
# smooth normals across a big flat face bend what shows through it, so flat faces stay exactly flat.)
# To make the app's pictures again (Blender 5.2):
#   python -I tools/handheld/fonts.py
#   blender -b --factory-startup --python tools/handheld/clear.py -- <renders dir> [samples] [percent] [variants]
#   python -I tools/handheld/assets.py <renders dir> renderer/handheld/clear      (prints game.js's PARTS and LIGHTS)
# env: TINT, ROUGH (the shell), BOARD (navy | white), KEY, KEYW (the key light), SHEEN, CROP (tests: a part, x0,y0,x1,y1)
import math, os, random, sys, time
T0 = time.time()
def lap(msg): print(f'[{time.time() - T0:7.1f}s] {msg}', flush=True)
import bpy, bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'renders', 'clear')
SAMPLES = int(argv[1]) if len(argv) > 1 else 256
PCT = int(argv[2]) if len(argv) > 2 else 100
VARIANTS = argv[3].split(',') if len(argv) > 3 else ['up', 'down', 'dl', 'dr', 'du', 'dd', 'lit-edge', 'lit-ring', 'lit-spk', 'lit-core']
os.makedirs(OUT, exist_ok=True)
PX_PER_U = 10.24
PAD = 12.0
SHEEN = float(os.environ.get('SHEEN', 11))
M = 0.001
rnd = random.Random(26)

def P(x, y, z=0.0):
    return Vector(((x - 50) * M, (95 - y) * M, z * M))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---- the layout (as the white one's: keep in step with game.js) --------------------------------------------------------
TOP = (10.0, 10.0, 80.0, 60.0)
BOT = (10.0, 84.0, 80.0, 60.0)
BEZEL = 3.0                                  # the black glass round each screen
CY = 164.5
DPAD = (22.0, CY)
A_AT, B_AT = (86.0, CY - 6.5), (69.0, CY + 1.0)
LED_AT = (12.0, 76.4)
WALL, FACE = 2.0, 2.0                        # the shell's walls and face, thick
Z_PCB = -7.0                                 # the board's top

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

def box(name, x, y, w, h, z0, z1, mat, r=0.0):
    return prism(name, rrect(x, y, w, h, r, seg=3) if r else [(x, y), (x + w, y), (x + w, y + h), (x, y + h)], z0, z1, mat)

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
NAVY, BLUE, LIGHT = srgb((2, 11, 69)), srgb((5, 29, 181)), srgb((96, 160, 255))

def mat(name, color, rough=0.5, metal=0.0, coat=0.0, spec=0.5, sss=0.0, emit=None, trans=0.0, ior=1.49, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = 0.05
    b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Transmission Weight'].default_value = trans
    b.inputs['IOR'].default_value = ior
    b.inputs['Alpha'].default_value = alpha
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.0025, 0.0018, 0.0012)
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1); b.inputs['Emission Strength'].default_value = emit[1]
    return m

def emitter(name, color, strength):
    """A light: a pale package when off, plus its glow"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.72, 0.75, 0.8, 1); b.inputs['Roughness'].default_value = 0.45
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(b.outputs['BSDF'], add.inputs[0]); nt.links.new(e.outputs['Emission'], add.inputs[1])
    nt.links.new(add.outputs['Shader'], nt.nodes['Material Output'].inputs['Surface'])
    return m, e

def glass_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); gl = nt.nodes.new('ShaderNodeBsdfGlossy')
    gl.inputs['Roughness'].default_value = 0.02
    fr = nt.nodes.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.49
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(fr.outputs['Fac'], mx.inputs['Fac']); nt.links.new(tr.outputs['BSDF'], mx.inputs[1]); nt.links.new(gl.outputs['BSDF'], mx.inputs[2])
    nt.links.new(mx.outputs['Shader'], nt.nodes['Material Output'].inputs['Surface'])
    return m

def shadow_tint(m, tint):
    """Light through it: shadow rays see a tinted see-through surface, not the glass (which would block them)"""
    nt = m.node_tree; out = nt.nodes['Material Output']
    surf = out.inputs['Surface'].links[0].from_socket
    lp = nt.nodes.new('ShaderNodeLightPath'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    tr.inputs['Color'].default_value = (*tint, 1)
    nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs['Fac'])
    nt.links.new(surf, mx.inputs[1]); nt.links.new(tr.outputs['BSDF'], mx.inputs[2])
    nt.links.new(mx.outputs['Shader'], out.inputs['Surface'])
    return m

def holdout_mat():
    m = bpy.data.materials.new('holdout'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    h = nt.nodes.new('ShaderNodeHoldout'); nt.links.new(h.outputs['Holdout'], nt.nodes['Material Output'].inputs['Surface'])
    return m

# ---- materials --------------------------------------------------------------------------------------------------------
TINT = tuple(float(v) for v in os.environ.get('TINT', '0.86,0.91,0.98').split(','))
ROUGH = float(os.environ.get('ROUGH', 0.03))
clear = shadow_tint(mat('clear', TINT, rough=ROUGH, trans=1.0, coat=0.6, spec=0.5, ior=1.49), mixc(TINT, (1, 1, 1), 0.5))  # the shell: smoked ice blue
clear_btn_a = shadow_tint(mat('clear_a', mixc(BLUE, (0.5, 0.6, 1.0), 0.35), rough=0.08, trans=0.92, coat=0.8, ior=1.5), mixc(BLUE, (1, 1, 1), 0.6))
clear_btn_b = shadow_tint(mat('clear_b', mixc(LIGHT, (1, 1, 1), 0.15), rough=0.08, trans=0.92, coat=0.8, ior=1.5), mixc(LIGHT, (1, 1, 1), 0.6))
clear_cross = shadow_tint(mat('clear_cross', (0.35, 0.42, 0.62), rough=0.1, trans=0.85, coat=0.6, ior=1.5), (0.7, 0.75, 0.85))
clear_pill = shadow_tint(mat('clear_pill', (0.6, 0.66, 0.78), rough=0.15, trans=0.8, ior=1.5), (0.85, 0.88, 0.92))
chassis = mat('chassis', (0.012, 0.016, 0.03), rough=0.55)
BOARD = os.environ.get('BOARD', 'navy')   # (the board: navy, or white with navy print)
pcb = mat('pcb', srgb((10, 18, 44)), rough=0.32, coat=0.35, spec=0.6) if BOARD == 'navy' else mat('pcb', (0.78, 0.8, 0.84), rough=0.42, coat=0.25)
gold = mat('gold', srgb((222, 170, 92)), rough=0.22, metal=1.0)
copper = mat('copper', srgb((150, 110, 60)), rough=0.35, metal=0.9)
silk = mat('silk', (0.85, 0.87, 0.9), rough=0.6) if BOARD == 'navy' else mat('silk', srgb((2, 11, 69)), rough=0.6)
chip = mat('chip', (0.012, 0.012, 0.014), rough=0.45, spec=0.4)
steel = mat('steel', (0.62, 0.64, 0.68), rough=0.25, metal=1.0)
cap_tan = mat('cap', srgb((176, 132, 74)), rough=0.5)
res_black = mat('res', (0.02, 0.02, 0.025), rough=0.4)
flex = mat('flex', srgb((214, 120, 28)), rough=0.35, coat=0.5, trans=0.25)
speaker_cone = mat('cone', (0.02, 0.02, 0.025), rough=0.8)
white_print = mat('white_print', (0.9, 0.92, 0.96), rough=0.45)
light_print = mat('light_print', LIGHT, rough=0.45)
bezel_mat = mat('bezel', (0.004, 0.004, 0.005), rough=0.3, spec=0.3)
lens = glass_mat('lens')
holdout = holdout_mat()
switch_mat = mat('switch', (0.05, 0.05, 0.06), rough=0.5)
# the lights: each group's emission set per variant
CYAN = srgb((120, 220, 255))
# (white: the app tints each to its lane's colour)
WHITE = (1.0, 1.0, 1.0)
edge_m, edge_e = emitter('led_edge', WHITE, 0.0)
ring_m, ring_e = emitter('led_ring', WHITE, 0.0)
spk_m, spk_e = emitter('led_spk', WHITE, 0.0)
core_m, core_e = emitter('led_core', WHITE, 0.0)
power_m, power_e = emitter('led_power', srgb((255, 30, 40)), 1.2)
diffuser = mat('diffuser', (0.6, 0.66, 0.76), rough=0.6, trans=0.6, sss=0.3)  # (frosted light guides over the bars)

# ---- the shell: hollow, its face 2 mm, walls 2 mm --------------------------------------------------------------------------
D = 22.0
OUTLINE = rrect(0, 0, 100, 190, [8, 8, 26, 8], seg=10)
body = prism('shell', OUTLINE, -D, 0, mat=clear)
bevel(body, 1.8, segments=7, angle=50)
cut(body, prism('hollow', rrect(WALL, WALL, 100 - 2 * WALL, 190 - 2 * WALL, [6, 6, 24, 6], seg=10), -D + WALL, -FACE))
# the screens' frames sit in pockets; the screens show through windows in them
for i, (x, y, w, h) in enumerate((TOP, BOT)):
    cut(body, prism(f'bezel_pocket{i}', rrect(x - BEZEL - 0.25, y - BEZEL - 0.25, w + 2 * BEZEL + 0.5, h + 2 * BEZEL + 0.5, 3.4), -1.0, 1))
    cut(body, prism(f'window{i}', rrect(x - 0.3, y - 0.3, w + 0.6, h + 0.6, 1.4), -3.0, 1))
# the controls' holes and the speaker's slots, through the face
cut(body, prism('dhole', circle(*DPAD, 11.4), -3, 1))
cut(body, prism('dwell', circle(*DPAD, 13.5), -0.8, 1))
for at in (A_AT, B_AT):
    cut(body, prism(f'bhole{at[0]}', circle(*at, 6.1), -3, 1))
abc = ((A_AT[0] + B_AT[0]) / 2, (A_AT[1] + B_AT[1]) / 2); abang = math.atan2(A_AT[1] - B_AT[1], A_AT[0] - B_AT[0])
ablen = math.hypot(A_AT[0] - B_AT[0], A_AT[1] - B_AT[1]) + 14.0
cut(body, prism('abwell', rotated(rrect(abc[0] - ablen / 2, abc[1] - 7, ablen, 14, 6.95), abc[0], abc[1], abang), -0.8, 1))
PILLS = [(42.0, CY + 15.0), (58.0, CY + 15.0)]
for i, (px, py) in enumerate(PILLS):
    cut(body, prism(f'pwell{i}', rotated(rrect(px - 5, py - 1.6, 10, 3.2, 1.55), px, py, -0.42), -3, 1))
SLOTS = []
for i in range(6):
    x0, y0 = 70 + 4 * i, 181.0
    ang = math.atan2(-10, 6); L_ = math.hypot(6, 10)
    SLOTS.append((x0, y0, ang, L_))
    cut(body, prism(f'slot{i}', rotated(rrect(x0 - 0.55, y0 - 0.55, L_ + 1.1, 1.1, 0.54, seg=4), x0, y0, ang), -3, 1))
cut(body, prism('ledhole', circle(*LED_AT, 1.1, 40), -3, 1))
bevel(body, 0.15, segments=2, angle=50)

# the screens' frames: black glass, the windows open; the screens (holdouts) under them; a clear sheet over each
for i, (x, y, w, h) in enumerate((TOP, BOT)):
    fr = prism(f'bezel{i}', rrect(x - BEZEL, y - BEZEL, w + 2 * BEZEL, h + 2 * BEZEL, 3.2), -1.0, -0.05, mat=bezel_mat)
    cut(fr, prism(f'bwin{i}', rrect(x, y, w, h, 1.2), -2, 1))
    bevel(fr, 0.3, segments=3, angle=50)
    prism(f'screen{i}', rrect(x - 0.5, y - 0.5, w + 1, h + 1, 1.4), -1.6, -1.2, mat=holdout)
    me = bpy.data.meshes.new(f'lens{i}'); bm = bmesh.new()
    bm.faces.new([bm.verts.new(P(px, py, 0.02)) for px, py in reversed(rrect(x - BEZEL, y - BEZEL, w + 2 * BEZEL, h + 2 * BEZEL, 3.2, seg=10))])
    bm.to_mesh(me); bm.free()
    gl_ = bpy.data.objects.new(f'lens{i}', me); scene.collection.objects.link(gl_); gl_.data.materials.append(lens); gl_.visible_shadow = False

# ---- the works ----------------------------------------------------------------------------------------------------------------
# (the works stop 5 short of the shell's sides: its rim is clear plastic only, what's behind showing through it)
INNER = rrect(5.0, 4.0, 90.0, 181.0, [4.0, 4.0, 21.0, 4.0], seg=10)
prism('chassis', INNER, -D + WALL, Z_PCB - 1.6, mat=chassis)
board = prism('pcb', INNER, Z_PCB - 1.6, Z_PCB, mat=pcb)
zt = Z_PCB + 0.035  # the copper, on the board

def trace(points, w=0.32, m_=gold):
    """A trace through points (game units), w wide, its corners mitred"""
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        if L < 1e-6: continue
        a = math.atan2(y1 - y0, x1 - x0)
        seg_ = rotated([(x0 - w / 2, y0 - w / 2), (x0 + L + w / 2, y0 - w / 2), (x0 + L + w / 2, y0 + w / 2), (x0 - w / 2, y0 + w / 2)], x0, y0, a)
        prism('trace', seg_, Z_PCB, zt, m_)

def route(ax, ay, bx, by):
    """Out along x, a 45-degree turn, then along y"""
    dx, dy = bx - ax, by - ay
    k = min(abs(dx), abs(dy)) * 0.6
    mx = bx - math.copysign(k, dx) if dx else ax
    return [(ax, ay), (mx, ay), (mx + math.copysign(k, dx) if dx else mx, ay + math.copysign(k, dy) if dy else ay), (bx, by)]

def via(x, y):
    prism('via', circle(x, y, 0.45, 16), Z_PCB, zt + 0.005, gold)
    prism('via_h', circle(x, y, 0.2, 12), Z_PCB, zt + 0.01, chassis)

def smd(x, y, w, h, m_, hz=0.5, pads=True, ang=0.0):
    pts = rotated([(x - w / 2, y - h / 2), (x + w / 2, y - h / 2), (x + w / 2, y + h / 2), (x - w / 2, y + h / 2)], x, y, ang)
    prism('smd', pts, Z_PCB, Z_PCB + hz, m_)
    if pads:
        for s in (-1, 1):
            px = x + s * (w / 2 - 0.15)
            prism('pad', rotated([(px - 0.25, y - h / 2 - 0.05), (px + 0.25, y - h / 2 - 0.05), (px + 0.25, y + h / 2 + 0.05), (px - 0.25, y + h / 2 + 0.05)], x, y, ang), Z_PCB, Z_PCB + hz * 0.6, steel)

def qfn(x, y, s, label=None, size=1.4):
    prism('qfn', rrect(x - s / 2, y - s / 2, s, s, 0.25, seg=2), Z_PCB, Z_PCB + 0.9, chip)
    n = max(3, int(s / 0.65))
    for side in range(4):
        for k in range(n):
            t_ = (k + 0.5) / n * (s - 0.8) - (s - 0.8) / 2
            px, py = {0: (x + t_, y - s / 2 - 0.25), 1: (x + s / 2 + 0.25, y + t_), 2: (x + t_, y + s / 2 + 0.25), 3: (x - s / 2 - 0.25, y + t_)}[side]
            prism('pin', rrect(px - 0.14, py - 0.14, 0.28, 0.28, 0.05, seg=2), Z_PCB, Z_PCB + 0.12, steel)
    prism('dot', circle(x - s / 2 + 0.7, y - s / 2 + 0.7, 0.22, 12), Z_PCB + 0.9, Z_PCB + 0.905, silk)
    if label: text(label, x, y + 0.2, size, silk, z=Z_PCB + 0.905, font='jbm-700.ttf')

def screw(x, y):
    prism('boss', circle(x, y, 2.0, 32), Z_PCB, Z_PCB + 1.0, clear)
    h = prism('screw', circle(x, y, 1.55, 40), Z_PCB + 1.0, Z_PCB + 1.8, steel)
    bevel(h, 0.35, segments=3, angle=40)
    for a in (0, math.pi / 2):
        prism('slot', rotated(rrect(x - 1.0, y - 0.18, 2.0, 0.36, 0.1, seg=2), x, y, a), Z_PCB + 1.6, Z_PCB + 1.85, chassis)

FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
def text(s, x, y, size, mat_, z=0.0, spacing=1.0, font='jbm-700.ttf', align='CENTER', shear=0.0, rot=0.0):
    bpy.ops.object.text_add(location=P(x, y, z))
    t = bpy.context.active_object
    t.data.body = s; t.data.align_x = align; t.data.align_y = 'CENTER'
    t.data.size = size * M; t.data.extrude = 0.004 * M; t.data.space_character = spacing; t.data.shear = shear
    t.data.font = bpy.data.fonts.load(os.path.join(FONTS, font))
    t.data.materials.append(mat_)
    t.rotation_euler[2] = rot
    return t

# the board's lower part: switches under the buttons, chips, the speaker, traces between them
for ang in (0, 90, 180, 270):   # the cross's four switches
    a = math.radians(ang); sx, sy = DPAD[0] + 6.8 * math.cos(a), DPAD[1] - 6.8 * math.sin(a)
    prism('domesw', circle(sx, sy, 1.6, 24), Z_PCB, Z_PCB + 0.4, steel)
for at in (A_AT, B_AT):          # the buttons' switches: a square body, a round stem
    box('sw', at[0] - 3.1, at[1] - 3.1, 6.2, 6.2, Z_PCB, Z_PCB + 1.6, switch_mat, r=0.5)
    prism('swring', circle(*at, 2.9, 32), Z_PCB + 1.6, Z_PCB + 1.65, steel)
for (px, py) in PILLS:
    box('swp', px - 2.4, py - 1.4, 4.8, 2.8, Z_PCB, Z_PCB + 1.0, switch_mat, r=0.3)
# the speaker under its slots
SPK = (79.0, 175.5)   # (clear of B, inside the board's corner)
prism('spk_frame', circle(*SPK, 7.0, 64), Z_PCB, Z_PCB + 1.4, steel)
cone = prism('spk_cone', circle(*SPK, 6.2, 64), Z_PCB + 1.4, Z_PCB + 1.6, speaker_cone)
prism('spk_cap', circle(*SPK, 2.2, 48), Z_PCB + 1.6, Z_PCB + 1.9, chip)
text('8Ω 1W', SPK[0], SPK[1] + 4.2, 0.9, silk, z=Z_PCB + 1.61)
# chips: the sound chip and the power one between the controls; their small parts round them
qfn(46.0, 160.5, 6.0, 'TSTR', 1.15)
qfn(57.0, 151.5, 3.6)
qfn(36.5, 151.0, 3.2)
smd(56.0, 166.0, 3.2, 1.6, cap_tan, 1.1)   # (a bigger capacitor)
# a crystal
box('xtal', 40.0, 164.5, 4.6, 2.0, Z_PCB, Z_PCB + 0.9, steel, r=0.9)
for k in range(10):
    smd(37.0 + 2.2 * (k % 5), 171.5 + 2.6 * (k // 5), 1.0, 0.5, cap_tan if k % 3 else res_black, 0.45)
for k in range(6):
    smd(61.5 + 1.8 * k, 158.5, 0.5, 1.0, res_black if k % 2 else cap_tan, 0.4)
# the USB port and the battery's plug along the bottom
box('usb', 43.0, 183.5, 9.0, 3.5, Z_PCB, Z_PCB + 3.2, steel, r=1.2)
box('jst', 31.0, 181.5, 5.6, 3.6, Z_PCB, Z_PCB + 2.4, mat('jst', (0.92, 0.9, 0.84), rough=0.5), r=0.3)
# traces: from the switches and chips to the main chip, mitred; vias at their ends
starts = [(DPAD[0] + 6.8, DPAD[1]), (DPAD[0], DPAD[1] - 6.8), (DPAD[0], DPAD[1] + 6.8), (A_AT[0] - 3.4, A_AT[1]), (B_AT[0] - 3.4, B_AT[1] + 1.5),
          (PILLS[0][0], PILLS[0][1] - 1.6), (PILLS[1][0], PILLS[1][1] - 1.6), (57.0, 153.5), (36.5, 152.8), (SPK[0] - 7.4, SPK[1] - 2.0)]
ends = [(43.0, 160.0), (43.4, 158.2), (43.0, 162.6), (49.0, 160.0), (49.0, 162.0), (44.6, 163.4), (47.4, 163.4), (47.4, 157.6), (44.6, 157.6), (49.0, 163.0)]
for (ax, ay), (bx, by) in zip(starts, ends):
    trace(route(ax, ay, bx, by))
    via(ax, ay)
for k in range(14):  # a bus of fine traces running up the left, between the screens
    x = 5.6 + 0.62 * k
    trace([(x, 150.0 - k * 0.6), (x, 82.0)], w=0.22)
for k in range(14):
    x = 94.4 - 0.62 * k
    trace([(x, 150.0 - k * 0.6), (x, 80.0)], w=0.22)
# silkscreen: the board's name, a revision, outlines
text('TOASTER LCP-01  REV 2.6', 21.0, 183.4, 1.2, silk, z=zt + 0.002, spacing=1.1)
text('U1', 50.5, 155.5, 1.0, silk, z=zt + 0.002)
# what each light shows, printed by it
text('BASS', 22.0, 181.2, 1.15, silk, z=zt + 0.002, spacing=1.2)
text('HATS', 90.6, 172.4, 1.15, silk, z=zt + 0.002, spacing=1.2)
text('CLAP', 23.5, 79.6, 1.0, silk, z=zt + 0.002, spacing=1.2)
for x in (5.7, 94.3):
    text('KICK', x, 40.0, 1.15, silk, z=zt + 0.002, spacing=1.2, rot=math.pi / 2)
# screws: four at the corners of the works, two by the middle
for (x, y) in ((8.2, 150.5), (91.8, 150.5), (7.8, 77.0), (92.2, 77.0)):
    screw(x, y)
# between the screens: the ribbon joining them, a row of status lights, a few parts
rib = prism('ribbon', rrect(67.0, 66.0, 10.0, 22.0, 0.6, seg=3), Z_PCB + 0.4, Z_PCB + 0.55, flex)
for k in range(9):
    prism('rib_line', rrect(67.6 + k * 1.0, 66.5, 0.3, 21.0, 0.1, seg=2), Z_PCB + 0.55, Z_PCB + 0.56, copper)
box('conn1', 65.5, 70.6, 13.0, 2.2, Z_PCB, Z_PCB + 1.2, chip, r=0.3)   # (under the top screen's frame)
box('conn2', 65.5, 82.0, 13.0, 2.2, Z_PCB, Z_PCB + 1.2, chip, r=0.3)
CORE = [(17.0 + 2.6 * k, 77.0) for k in range(6)]
for (x, y) in CORE:
    box('core_led', x - 0.9, y - 0.5, 1.8, 1.0, Z_PCB, Z_PCB + 0.5, core_m, r=0.15)
qfn(85.0, 77.0, 3.0)
for x in (80.6, 89.4):
    smd(x, 77.0, 1.0, 0.5, cap_tan, 0.4, ang=math.pi / 2)
# the power light: an LED on the board under its hole
box('power_led', LED_AT[0] - 0.9, LED_AT[1] - 0.6, 1.8, 1.2, Z_PCB, Z_PCB + 0.6, power_m, r=0.2)
pipe = prism('pipe', circle(*LED_AT, 1.05, 32), Z_PCB + 0.6, -0.05, diffuser)

# the lights: bars along the sides (under frosted guides), a ring round the cross, a glow under the speaker
EDGE = []
for x in (3.3, 96.7):
    for y0, y1 in ((12.0, 68.0), (86.0, 142.0)):   # one bar along each screen
        prism('edge_led', rrect(x - 0.45, y0, 0.9, y1 - y0, 0.4, seg=3), -D + WALL, Z_PCB + 0.6, edge_m)   # (standing on the shell's floor, in its clear rim)
        prism('edge_guide', rrect(x - 0.7, y0 - 0.5, 1.4, y1 - y0 + 1.0, 0.6, seg=3), Z_PCB + 0.6, Z_PCB + 2.4, diffuser)
ring_pts = circle(*DPAD, 14.6, 96); ring_in = circle(*DPAD, 13.8, 96)
ringo = prism('ring_led', ring_pts, Z_PCB, Z_PCB + 0.5, ring_m); cut(ringo, prism('ring_cut', ring_in, Z_PCB - 1, Z_PCB + 1))
ringd = prism('ring_guide', circle(*DPAD, 14.9, 96), Z_PCB + 0.5, Z_PCB + 2.2, diffuser); cut(ringd, prism('ringd_cut', circle(*DPAD, 13.6, 96), Z_PCB, Z_PCB + 3))
spko = prism('spk_led', circle(*SPK, 7.95, 64), Z_PCB, Z_PCB + 0.5, spk_m); cut(spko, prism('spk_cut', circle(*SPK, 7.2, 64), Z_PCB - 1, Z_PCB + 1))
spkd = prism('spk_guide', circle(*SPK, 8.2, 64), Z_PCB + 0.5, Z_PCB + 1.8, diffuser); cut(spkd, prism('spkd_cut', circle(*SPK, 7.15, 64), Z_PCB, Z_PCB + 3))

# ---- the controls: see-through -------------------------------------------------------------------------------------------------
pivot = bpy.data.objects.new('dpad_pivot', None); scene.collection.objects.link(pivot)
pivot.location = P(*DPAD, -2.0)
bpy.context.view_layer.update()
def child(ob):
    mw = ob.matrix_world.copy(); ob.parent = pivot; ob.matrix_world = mw
    return ob
def fillet(poly, radii, seg=6):
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
cross = prism('cross', fillet(cross_poly, [1.3, 1.3, 0.6] * 4), -2.0, 2.0, mat=clear_cross)
cut(cross, prism('cross_dish', circle(*DPAD, 2.6, 64), 1.78, 3))
bevel(cross, 0.75, segments=5, angle=40); child(cross)
for ang in (0, 90, 180, 270):
    a = math.radians(ang); cx_, cy_ = DPAD[0] + 7.0 * math.cos(a), DPAD[1] - 7.0 * math.sin(a)
    tri = [(cx_ + 1.35 * math.cos(a), cy_ - 1.35 * math.sin(a)), (cx_ + 1.15 * math.cos(a + 2.2), cy_ - 1.15 * math.sin(a + 2.2)),
           (cx_ + 1.15 * math.cos(a - 2.2), cy_ - 1.15 * math.sin(a - 2.2))]
    child(prism('arrow', tri, 2.0, 2.025, mat=white_print))
BUTTONS = {}
for name, at, m2 in (('A', A_AT, clear_btn_a), ('B', B_AT, clear_btn_b)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=5.6 * M, depth=5.0 * M, location=P(*at, -0.9))
    cyl = bpy.context.active_object; cyl.name = name; cyl.data.materials.append(m2)
    bv = cyl.modifiers.new('round', 'BEVEL'); bv.width = 1.9 * M; bv.segments = 10; bv.limit_method = 'ANGLE'
    BUTTONS[name] = cyl
for i, (px, py) in enumerate(PILLS):
    pill = prism(f'pill{i}', rotated(rrect(px - 4, py - 1.05, 8, 2.1, 1.04, seg=6), px, py, -0.42), -2.5, 0.7, mat=clear_pill)
    bevel(pill, 0.55, segments=4, angle=40)

# ---- the print on the clear face ---------------------------------------------------------------------------------------------------
text('TOASTER', 50, 76.2, 4.6, white_print, z=0.003, spacing=1.5, font='jbm-800.ttf', shear=0.2)
text('LIVE CODE POCKET  ·  CLEAR', 50, 80.3, 1.45, light_print, z=0.003, spacing=1.3)
for s_, x_, y_ in (('SELECT', 42, 184.6), ('START', 58, 184.6), ('B', B_AT[0], B_AT[1] + 8.4), ('A', A_AT[0], A_AT[1] + 8.4)):
    text(s_, x_, y_, 1.75, white_print, z=0.003, spacing=1.08)

# ---- floor, lights, world, camera -------------------------------------------------------------------------------------------------
bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, -D * M - 0.0001))
floor = bpy.context.active_object; floor.is_shadow_catcher = True; floor.data.materials.append(mat('floor', (0.5, 0.5, 0.5)))

def area(name, loc, size, power, aim=(0, 0, 0)):
    l = bpy.data.lights.new(name, 'AREA'); l.size = size; l.energy = power
    o = bpy.data.objects.new(name, l); o.location = loc; scene.collection.objects.link(o)
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    o.visible_camera = False
    return o
KEY = tuple(float(v) for v in os.environ.get('KEY', '-0.30,0.40,0.55').split(','))
area('key', KEY, 0.5, float(os.environ.get('KEYW', 6.0)))
area('fill', (0.45, -0.15, 0.40), 0.7, 2.2)
area('rim', (0.0, 0.62, 0.10), 0.3, 1.8)
if os.environ.get('FRONT') == '1': area('front', (0.05, -0.05, 0.6), 0.6, 2.0)  # (straight in: light down into the works)
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
bg_lit.inputs['Strength'].default_value = 0.3; bg_dim.inputs['Strength'].default_value = 0.025
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
scene.cycles.max_bounces = 16
scene.cycles.transmission_bounces = 16
scene.cycles.transparent_max_bounces = 16
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

lap(f'built: {len(scene.objects)} objects; device {scene.cycles.device}, ' + ', '.join(d.name for d in prefs.devices if d.use))
# smooth only what is rounded (the bevelled parts, the buttons), in one go; the shell's flat face stays exactly flat
# (smooth normals across a big flat face bend whatever shows through it: flat faces stay exactly flat)
smooth = [ob for ob in scene.objects if ob.type == 'MESH' and not ob.hide_render and (any(m.type == 'BEVEL' for m in ob.modifiers) or ob.name in BUTTONS)]
dg = bpy.context.evaluated_depsgraph_get()
for ob in smooth:
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear(); ob.data = me
    me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(35))
    for p in me.polygons:
        if abs(p.normal.z) > 0.999: p.use_smooth = False
lap(f'smoothed {len(smooth)}')
scene.cycles.caustics_refractive = scene.cycles.caustics_reflective = os.environ.get('CAUSTICS', '1') == '1'

# ---- the variants ---------------------------------------------------------------------------------------------------------------
def px_box(cx, cy, half):
    x0 = (cx - half + PAD) / W_u; x1 = (cx + half + PAD) / W_u
    y0 = 1 - (cy + half + PAD) / H_u; y1 = 1 - (cy - half + PAD) / H_u
    return max(0, x0), min(1, x1), max(0, y0), min(1, y1)
TILT = math.radians(6)
IDLE = {'edge': 0.0, 'ring': 0.0, 'spk': 0.0, 'core': 0.15}
LIT = {'edge': 9.0, 'ring': 7.0, 'spk': 5.0, 'core': 14.0}
emits = {'edge': edge_e, 'ring': ring_e, 'spk': spk_e, 'core': core_e}
for v in VARIANTS:
    for name, b in BUTTONS.items(): b.location.z = (-0.9 - (2.0 if v == 'down' else 0)) * M
    power_e.inputs['Strength'].default_value = 14.0 if v == 'down' else 1.2
    group = v[4:] if v.startswith('lit-') else None
    for k, e in emits.items(): e.inputs['Strength'].default_value = LIT[k] if group == k else IDLE[k]
    pivot.rotation_euler = {'dl': (0, -TILT, 0), 'dr': (0, TILT, 0), 'du': (-TILT, 0, 0), 'dd': (TILT, 0, 0)}.get(v, (0, 0, 0))
    # (the cross's tilts and the lights: only round what changes; the rest of the image left clear)
    near = {'dl': (*DPAD, 17), 'dr': (*DPAD, 17), 'du': (*DPAD, 17), 'dd': (*DPAD, 17), 'lit-ring': (*DPAD, 22), 'lit-spk': (*SPK, 15), 'lit-core': (24.0, 77.0, 14)}
    if v in near:
        r.use_border = True; r.use_crop_to_border = False
        r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = px_box(*near[v])
    elif os.environ.get('CROP'):   # (tests: a part, in game units x0,y0,x1,y1)
        x0, y0, x1, y1 = (float(c) for c in os.environ['CROP'].split(','))
        r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = (x0 + PAD) / W_u, (x1 + PAD) / W_u
        r.border_min_y, r.border_max_y = 1 - (y1 + PAD) / H_u, 1 - (y0 + PAD) / H_u
    else:
        r.use_border = False
    r.filepath = os.path.join(OUT, f'body_{v}.png')
    bpy.ops.render.render(write_still=True)
    lap(f'RENDERED {v} {r.filepath}')
