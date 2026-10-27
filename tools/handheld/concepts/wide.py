# Concept E, "Toaster Wide": the handheld on its side, as consoles have their horizontal models. The game's two
# screens side by side under one black glass (the lanes left, the pads right: each 80 x 60, as game.js draws them), the
# wordmark engraved under them, the cross on the left grip, A and B on the right, SELECT and START under the name, the power
# light, the song as a cartridge standing up out of the top (its label read left to right). FORM=slab: the metal one's
# family (worn titanium-grey, Torx screws, stickers); FORM=wing: sculpted, its ends flaring past its middle, light strips
# round the glass that flash with the drums.
#   blender -b --factory-startup --python tools/handheld/concepts/wide.py -- <out.png> [samples] [view: hero | front] [res WxH]
#   (SCREENS=<name>: the screens' pictures in concepts/tex, top-<name>.png and bottom-<name>.png; tex_wide.py makes the labels)
# The app's pictures (VIEW=stance, as metal.py's): <renders dir> 256 stance 2688x1512 [variants], then
#   python -I tools/handheld/assets_stance.py <renders dir> renderer/handheld/wide
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import cc
from cc import P, rrect, circle, rotated, prism, quad, cut, joined, bevel, mat, worn, image_mat, text, srgb, mixc, M

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(cc.HERE, 'renders', 'wide.png')
SAMPLES = int(argv[1]) if len(argv) > 1 else 128
VIEW = argv[2] if len(argv) > 2 else 'hero'
RES = tuple(int(v) for v in argv[3].split('x')) if len(argv) > 3 and 'x' in argv[3] else (1920, 1080)
FORM = os.environ.get('FORM', 'slab')
APP = VIEW == 'stance'   # (the app's pictures: the screens clear, the label blank, from the hero's angle)
TEX = os.path.join(cc.HERE, 'tex')

# (where everything is: the slab even all round its glass, 100 tall, SELECT and START on its grips as the wing's)
if FORM == 'wing':
    W, H = 252.0, 112.0
    LANES, PADS, LENS = (44.0, 14.0, 80.0, 60.0), (128.0, 14.0, 80.0, 60.0), (39.0, 9.0, 174.0, 70.0, 5.0)
    DPAD, A_AT, B_AT, LED_AT = (20.0, 50.0), (238.0, 43.0), (222.0, 57.0), (20.0, 21.0)
    NAME_AT, PILLS, SPK = (126.0, 87.5), [(24.0, 76.0), (225.0, 73.0)], (232.0, 88.0)
    ST_TOASTER, ST_HOLO, SCREWS = (22.0, 92.0, 13.0), (232.0, 20.0), []
else:
    SLAB = os.environ.get('SLAB', 'even')   # even | big (screens 10% bigger) | edge (the glass the face's full height)
    if SLAB == 'big':
        W, H = 264.0, 106.0
        LANES, PADS, LENS = (42.0, 14.0, 88.0, 66.0), (134.0, 14.0, 88.0, 66.0), (37.0, 9.0, 190.0, 76.0, 5.0)
        DPAD, A_AT, B_AT, LED_AT = (18.5, 47.0), (251.0, 41.0), (235.5, 55.0), (18.5, 17.0)
        NAME_AT, PILLS, SPK = (132.0, 95.0), [(18.5, 74.0), (240.0, 73.0)], (250.5, 88.5)
        ST_TOASTER, ST_HOLO = (18.5, 90.0, 12.0), (251.0, 16.5)
    elif SLAB == 'edge':
        W, H = 258.0, 100.0
        LANES, PADS, LENS = (43.0, 11.0, 84.0, 63.0), (131.0, 11.0, 84.0, 63.0), (37.0, 6.0, 184.0, 88.0, 6.0)
        DPAD, A_AT, B_AT, LED_AT = (18.5, 44.0), (245.0, 39.0), (230.0, 53.0), (18.5, 14.0)
        NAME_AT, PILLS, SPK = (129.0, 84.5), [(18.5, 70.0), (236.0, 68.0)], (244.5, 83.0)
        ST_TOASTER, ST_HOLO = (18.5, 85.5, 12.0), (245.0, 15.0)
    else:
        W, H = 252.0, 100.0
        LANES, PADS, LENS = (44.0, 15.0, 80.0, 60.0), (128.0, 15.0, 80.0, 60.0), (39.0, 10.0, 174.0, 70.0, 5.0)
        DPAD, A_AT, B_AT, LED_AT = (20.0, 44.0), (238.0, 38.0), (222.0, 52.0), (20.0, 16.0)
        NAME_AT, PILLS, SPK = (126.0, 90.0), [(20.0, 70.0), (229.0, 67.0)], (233.0, 82.5)
        ST_TOASTER, ST_HOLO = (19.0, 85.0, 13.0), (233.0, 16.0)
    SCREWS = [(6.4, 6.4), (W - 6.4, 6.4), (6.4, H - 6.4), (W - 6.4, H - 6.4)]
D = 15.0
scene = cc.setup(W, H)
BLUE, NAVY, LIGHT = srgb((5, 29, 181)), srgb((2, 11, 69)), srgb((96, 160, 255))
CART = (150.0, -24.0, 50.0, 33.0)   # (x, y, w, h: out of the top, y < 0 above it)

# ---- materials --------------------------------------------------------------------------------------------------------
alu = cc.edged(worn(mat('alu', (0.5, 0.505, 0.51), rough=0.5, metal=1.0), scale=40, amount=0.1, grain=0.08), edge=0.6, grime=0.3)
black_glass = mat('black_glass', (0.006, 0.006, 0.008), rough=0.05, coat=1.0, spec=0.6)
anodized = mat('anodized', (0.018, 0.018, 0.022), rough=0.32, metal=0.7)
steel = mat('steel', (0.3, 0.3, 0.32), rough=0.3, metal=1.0)
etch = mat('etch', (0.05, 0.05, 0.06), rough=0.65)
hole_dark = mat('hole_dark', (0.004, 0.004, 0.005), rough=0.9)
grey_print = mat('grey_print', (0.36, 0.38, 0.44), rough=0.5)
rubber = mat('rubber', (0.05, 0.052, 0.06), rough=0.75)
cart_blue = mat('cart_blue', mixc(BLUE, (0.1, 0.2, 0.6), 0.3), rough=0.35, coat=0.3, sss=0.05)
led_off = mat('led_off', srgb((150, 6, 14)), rough=0.2, coat=0.5, emit=(srgb((255, 18, 28)), 0.9))
led_on = mat('led_on', srgb((255, 40, 50)), rough=0.2, coat=0.5, emit=(srgb((255, 24, 34)), 12.0))
hold = bpy.data.materials.new('holdout'); hold.use_nodes = True
hold.node_tree.nodes.remove(hold.node_tree.nodes['Principled BSDF'])
_h = hold.node_tree.nodes.new('ShaderNodeHoldout'); hold.node_tree.links.new(_h.outputs['Holdout'], hold.node_tree.nodes['Material Output'].inputs['Surface'])
glass = bpy.data.materials.new('glass'); glass.use_nodes = True
_nt = glass.node_tree; _nt.nodes.remove(_nt.nodes['Principled BSDF'])
_tr = _nt.nodes.new('ShaderNodeBsdfTransparent'); _gl = _nt.nodes.new('ShaderNodeBsdfGlossy'); _gl.inputs['Roughness'].default_value = 0.03
_fr = _nt.nodes.new('ShaderNodeFresnel'); _fr.inputs['IOR'].default_value = 1.5; _mx = _nt.nodes.new('ShaderNodeMixShader')
_nt.links.new(_fr.outputs['Fac'], _mx.inputs['Fac']); _nt.links.new(_tr.outputs['BSDF'], _mx.inputs[1]); _nt.links.new(_gl.outputs['BSDF'], _mx.inputs[2])
_nt.links.new(_mx.outputs['Shader'], _nt.nodes['Material Output'].inputs['Surface'])
SHELL = os.environ.get('SHELL_MAT', 'ceramic' if FORM == 'wing' else 'alu')   # (alu: the worn brushed metal; ceramic: pearl white)
shell = cc.edged(mat('ceramic', (0.78, 0.8, 0.84), rough=0.28, coat=0.6, spec=0.5), edge=0.35, grime=0.15) if SHELL == 'ceramic' else alu
if FORM == 'wing':   # (a satin graphite face plate round the glass, a blue ring of light in it)
    plate = mat('graphite', (0.05, 0.055, 0.065), rough=0.38, metal=0.6)
    strip = mat('strip', LIGHT, rough=0.3, emit=(LIGHT, 2.2))

# ---- the body ----------------------------------------------------------------------------------------------------------
def outline():
    if FORM == 'wing':   # (a middle as tall as the glass needs, the ends flaring up and down past it: a smooth union)
        f = lambda x, y: cc.smin(cc.sd_box(x, y, W / 2, H / 2 + 2, 92, 46, 16), min(cc.sd_circle(x, y, 40, H / 2 + 2, 52), cc.sd_circle(x, y, W - 40, H / 2 + 2, 52)), 18)
        return cc.trace(f, (W / 2, -20), ds=0.5)
    return rrect(0, 0, W, H, 24, seg=10)   # (even corners: the uneven ones read as lopsided)
body = prism('body', outline(), -D, 0, mat=shell)
bevel(body, 1.2 if FORM == 'slab' else 2.4, segments=3, angle=50)
lx, ly, lw, lh, lr = LENS
if FORM == 'wing':   # (the face plate: a shallow step round the glass, the light strips sunk in its edge)
    plate_ol = rrect(lx - 6, ly - 5, lw + 12, lh + 22, 12, seg=10)
    cut(body, prism('plate_pocket', plate_ol, -1.2, 1))
    fp = prism('plate', plate_ol, -1.2, -0.25, mat=plate); bevel(fp, 0.5, segments=2)
    cut(fp, prism('lens_pocket', rrect(lx - 0.2, ly - 0.2, lw + 0.4, lh + 0.4, lr + 0.2), -0.9, 1))
    # (a ring of light inlaid round the glass, 0.8 mm wide)
    ring_l = prism('light_ring', rrect(lx - 3.4, ly - 3.4, lw + 6.8, lh + 6.8, lr + 3.4, seg=12), -0.55, -0.22, mat=strip)
    cut(ring_l, prism('light_ring_in', rrect(lx - 2.6, ly - 2.6, lw + 5.2, lh + 5.2, lr + 2.6, seg=12), -1, 1))
    cut(fp, prism('ring_groove', rrect(lx - 3.5, ly - 3.5, lw + 7.0, lh + 7.0, lr + 3.5, seg=12), -0.6, 1))
    fp.modifiers['cut_ring_groove'].operation = 'DIFFERENCE'
    inner_keep = prism('plate_inner', rrect(lx - 2.5, ly - 2.5, lw + 5.0, lh + 5.0, lr + 2.5, seg=12), -1.2, -0.25, mat=plate)
    cut(inner_keep, prism('lens_pocket2', rrect(lx - 0.2, ly - 0.2, lw + 0.4, lh + 0.4, lr + 0.2), -0.9, 1))
else:
    cut(body, prism('lens_pocket', rrect(lx - 0.2, ly - 0.2, lw + 0.4, lh + 0.4, lr + 0.2), -0.8, 1))
cut(body, prism('led_hole', circle(*LED_AT, 0.85, 40), -3, 1))
EDGE = FORM == 'slab' and os.environ.get('SLAB') == 'edge'
eng = text('TOASTER', *NAME_AT, 6.4, mat('eng', (0.1, 0.1, 0.1)), z=0.3 if FORM == 'slab' else -0.25 + 0.3, spacing=1.08, font='orbitron-900.ttf', extrude=0.6)
for o in bpy.context.selected_objects: o.select_set(False)
eng.select_set(True); bpy.context.view_layer.objects.active = eng
bpy.ops.object.convert(target='MESH')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.000002)
bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
target = fp if FORM == 'wing' else body
if EDGE: eng.hide_render = True; eng.hide_viewport = True
else:
    cut(target, eng)
    target.modifiers['cut_' + eng.name].use_self = True; target.modifiers['cut_' + eng.name].use_hole_tolerant = True
cut(body, prism('dwell', circle(*DPAD, 13.2, 96), -0.9, 1))
for at in (A_AT, B_AT):
    cut(body, prism(f'seat{at[0]}', circle(*at, 7.6, 96), -0.6, 1))
for i, (px, py) in enumerate(PILLS):
    cut(body, prism(f'pwell{i}', rotated(rrect(px - 5, py - 1.7, 10, 3.4, 1.65), px, py, -0.42), -0.8, 1))
holes = []
for i in range(-3, 4):
    for j in range(-3, 4):
        x, y = SPK[0] + i * 2.6 + (1.3 if j % 2 else 0), SPK[1] + j * 2.25
        if (x - SPK[0]) ** 2 + (y - SPK[1]) ** 2 > 6.2 ** 2: continue
        holes.append(prism(f'h{i}{j}', circle(x, y, 0.72, 20), -1.6, 1))
        prism(f'hf{i}{j}', circle(x, y, 0.74, 20), -1.62, -1.5, mat=hole_dark)
cut(body, joined('grille', holes))
cx_, cy_, cw_, ch_ = CART
cut(body, prism('slot', [(cx_ - 1, -1), (cx_ + cw_ + 1, -1), (cx_ + cw_ + 1, min(10.6, LENS[1] + 2)), (cx_ - 1, min(10.6, LENS[1] + 2))], -10.2, -3.6))
bevel(body, 0.12, segments=2, angle=50)

# ---- the glass, its screens, the wordmark's fill, the light ---------------------------------------------------------------------
gz = -0.25 if FORM == 'wing' else 0.0   # (the glass's face: on the plate, a little under the body's face)
prism('lens', rrect(lx, ly, lw, lh, lr, seg=10), gz - 0.8, gz - 0.12, mat=black_glass)
quad('cover', lx, ly, lw, lh, gz - 0.05, mat=glass).visible_shadow = False
fill_m = mat('fill', LIGHT, rough=0.3, emit=(LIGHT, 0.5)) if FORM == 'wing' else mat('fill', NAVY, rough=0.35, coat=0.6)
if EDGE: text('TOASTER', *NAME_AT, 5.6, mat('print', (0.62, 0.66, 0.74), rough=0.4), z=gz - 0.1, spacing=1.1, font='orbitron-900.ttf', extrude=0.01)
else: text('TOASTER', *NAME_AT, 6.4, fill_m, z=gz - 0.24, spacing=1.08, font='orbitron-900.ttf', extrude=0.02)
SCREENS = os.environ.get('SCREENS', 'teaser')
for name, r, tex in (('top', LANES, f'top-{SCREENS}.png'), ('bottom', PADS, f'bottom-{SCREENS}.png')):
    if APP: quad(f'screen_{name}', r[0] - 0.6, r[1] - 0.6, r[2] + 1.2, r[3] + 1.2, gz - 0.11, mat=hold)
    else: quad(f'screen_{name}', *r, gz - 0.11, mat=image_mat(name, os.path.join(TEX, tex), emit=1.5))
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.9 * M, location=P(*LED_AT, -1.0))
led = bpy.context.active_object; led.name = 'led'; led.scale[2] = 0.45; led.data.materials.append(led_off); cc.own(led)

# ---- the controls (as the metal one's) ----------------------------------------------------------------------------------------
hw, he = 3.2, 9.6
cross = [(DPAD[0] - hw, DPAD[1] - he), (DPAD[0] + hw, DPAD[1] - he), (DPAD[0] + hw, DPAD[1] - hw), (DPAD[0] + he, DPAD[1] - hw), (DPAD[0] + he, DPAD[1] + hw),
         (DPAD[0] + hw, DPAD[1] + hw), (DPAD[0] + hw, DPAD[1] + he), (DPAD[0] - hw, DPAD[1] + he), (DPAD[0] - hw, DPAD[1] + hw), (DPAD[0] - he, DPAD[1] + hw),
         (DPAD[0] - he, DPAD[1] - hw), (DPAD[0] - hw, DPAD[1] - hw)]
pivot = bpy.data.objects.new('dpad_pivot', None); scene.collection.objects.link(pivot); cc.own(pivot)
pivot.location = P(*DPAD, -0.9)
bpy.context.view_layer.update()
cr = prism('cross', cross, -0.9, 1.8, mat=anodized); bevel(cr, 0.7, segments=4)
cut(cr, prism('cross_dish', circle(*DPAD, 2.6, 64), 1.6, 3))
mw = cr.matrix_world.copy(); cr.parent = pivot; cr.matrix_world = mw
for ang in (0, 90, 180, 270):
    a = math.radians(ang); ax, ay = DPAD[0] + 6.9 * math.cos(a), DPAD[1] - 6.9 * math.sin(a)
    tri = [(ax + 1.3 * math.cos(a), ay - 1.3 * math.sin(a)), (ax + 1.1 * math.cos(a + 2.2), ay - 1.1 * math.sin(a + 2.2)), (ax + 1.1 * math.cos(a - 2.2), ay - 1.1 * math.sin(a - 2.2))]
    ar = prism('arrow', tri, 1.8, 1.825, mat=grey_print); mw = ar.matrix_world.copy(); ar.parent = pivot; ar.matrix_world = mw
CAPS, GLOWS = [], []
for name, at, col in (('A', A_AT, BLUE), ('B', B_AT, LIGHT)):
    ring = prism(f'ring{name}', circle(*at, 7.4, 96), -0.6, 1.1, mat=anodized)
    cut(ring, prism(f'ring_in{name}', circle(*at, 6.35, 96), -2, 3)); bevel(ring, 0.45, segments=3)
    m_ = mat(f'cap{name}', col, rough=0.22, coat=0.7, sss=0.12, emit=((1, 1, 1), 0.0))
    cap = prism(f'cap{name}', circle(*at, 6.15, 96), -0.4, 2.9, mat=m_); bevel(cap, 2.0, segments=8)
    CAPS.append(cap); GLOWS.append(m_)
    text(name, at[0] + 9.0, at[1] + 4.4, 1.9, etch, z=0.004, spacing=1.0)
for i, (px, py) in enumerate(PILLS):
    p_ = prism(f'pill{i}', rotated(rrect(px - 4.3, py - 1.15, 8.6, 2.3, 1.15, seg=6), px, py, -0.42), -0.8, 0.9, mat=rubber); bevel(p_, 0.55, segments=4)
    text(('SELECT', 'START')[i], px, py + 4.2, 1.45, etch, z=0.004, spacing=1.15)

# ---- screws, the cartridge, stickers --------------------------------------------------------------------------------------------
if FORM == 'slab':
    for (x, y) in SCREWS:
        s = prism('screw', circle(x, y, 1.65, 40), -0.3, 0.32, mat=steel); bevel(s, 0.22, segments=2)
        cut(s, prism('torx', [(x + 0.7 * math.cos(a * math.pi / 3 + 0.3), y + 0.7 * math.sin(a * math.pi / 3 + 0.3)) for a in range(6)], -0.2, 1))
card = prism('cart', rrect(cx_, cy_, cw_, ch_, 1.2, seg=3), -9.8, -4.0, mat=cart_blue); bevel(card, 0.35, segments=2)
for k in range(4):
    prism(f'ridge{k}', rrect(cx_ + 2.0, cy_ + 1.0 + k * 1.3, cw_ - 4.0, 0.6, 0.3, seg=2), -4.0, -3.75, mat=cart_blue)
LABEL = (cx_ + 3.0, cy_ + 7.0, 44.0, 20.0)
quad('label', *LABEL, -3.98, mat=image_mat('label', os.path.join(TEX, 'label-wide-blank.png' if APP else 'label-wide.png'), rough=0.5, alpha=True))
def sticker(name, path, cx, cy, w, h, ang, z=0.03):
    q = quad(name, cx - w / 2, cy - h / 2, w, h, z, mat=image_mat(name, path, rough=0.35, alpha=True, coat=0.3), ang=math.radians(ang))
    q.visible_shadow = False
    return q
if not EDGE: sticker('st_live', os.path.join(TEX, 'sticker-live.png'), NAME_AT[0] + 40.0, NAME_AT[1] + 0.5, 12.0, 4.8, -4, z=gz + 0.03)
else: sticker('st_live', os.path.join(TEX, 'sticker-live.png'), 18.5, 26.5, 11.0, 4.4, -6)
sticker('st_toaster', os.path.join(TEX, 'sticker-toaster.png'), ST_TOASTER[0], ST_TOASTER[1], ST_TOASTER[2], ST_TOASTER[2], 3)
st = sticker('st_holo', os.path.join(TEX, 'sticker-smiley-holo.png'), ST_HOLO[0], ST_HOLO[1], 9.0, 9.0, -8)
_b = st.data.materials[0].node_tree.nodes['Principled BSDF']; _b.inputs['Metallic'].default_value = 0.55; _b.inputs['Roughness'].default_value = 0.2

cc.smooth_all()

# ---- the app's pictures from the hero's angle (as metal.py's stance): no floor, a wall square to the camera behind it for its
# bounce (unseen), its shadow alone in the 'shadow' variant, and where its face, label and parts land (stance.json) ---------------
if VIEW == 'stance':
    import json
    from bpy_extras.object_utils import world_to_camera_view
    hero_cam = cc.hero_shot(H, yaw=-24.0, span_mm=W * float(os.environ.get('SPAN', 1.0)))
    aim = Vector((0.0, 0.0, (H / 2 + 9) * M))
    hero_cam.rotation_euler = (aim - hero_cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.data.objects['sweep'].hide_render = True
    hero_cam.data.dof.use_dof = False
    bpy.context.view_layer.update()
    fwd = (hero_cam.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    mid = cc.ROOT.matrix_world @ P(W / 2, H / 2, -D / 2)
    bpy.ops.mesh.primitive_plane_add(size=5.0, location=mid + fwd * float(os.environ.get('WALL', 40.0)) * M)
    wall = bpy.context.active_object; wall.name = 'wall'
    wall.rotation_euler = (-fwd).to_track_quat('Z', 'Y').to_euler()
    wall.visible_shadow = False; wall.visible_camera = False
    wall.data.materials.append(mat('wall', BLUE, rough=0.8, spec=0.2))
    cc.render_setup(RES, SAMPLES, OUT, transparent=True)
    scene.cycles.film_transparent_glass = True
    os.makedirs(OUT, exist_ok=True)
    bpy.context.view_layer.update()
    rx, ry = RES
    def px(x, y, z):
        v = world_to_camera_view(scene, hero_cam, cc.ROOT.matrix_world @ P(x, y, z))
        return [round(v.x * rx, 3), round((1 - v.y) * ry, 3)]
    dg = bpy.context.evaluated_depsgraph_get(); xs, ys = [], []
    for ob in scene.objects:
        if ob.type not in ('MESH', 'FONT') or ob.hide_render or ob.name == 'wall' or ob.name.startswith('sheen'): continue
        if ob.parent not in (cc.ROOT, pivot) and ob.name != 'led': continue
        me = ob.evaluated_get(dg).to_mesh(); mw = ob.matrix_world
        for n_, vtx in enumerate(me.vertices):
            if n_ % 7: continue
            v = world_to_camera_view(scene, hero_cam, mw @ vtx.co); xs.append(v.x * rx); ys.append((1 - v.y) * ry)
        ob.evaluated_get(dg).to_mesh_clear()
    ZS = (-3.98, -1.0, gz - 0.11, 0.0, 1.0)
    info = {'img': [rx, ry], 'size': [W, H], 'dev': [math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))],
            'planes': {str(round(z, 2)): [px(0, 0, z), px(W, 0, z), px(W, H, z), px(0, H, z)] for z in ZS},
            'screens': {'top': list(LANES), 'bottom': list(PADS)}, 'label': list(LABEL), 'led': list(LED_AT), 'face': round(gz - 0.11, 2),
            'parts': {'a': ['down', list(A_AT), 9.6, 7.3, 8.6, 1.0, [6.1, 0.18]], 'b': ['down', list(B_AT), 9.6, 7.3, 8.6, 1.0, [6.1, 0.18]],
                      'led': ['down', list(LED_AT), 2.8, 1.2, 2.5, 0.0, None],
                      **{k: [k, list(DPAD), 14.4, 12.0, 13.6, 1.0, None] for k in ('dl', 'dr', 'du', 'dd')}}}
    json.dump(info, open(os.path.join(OUT, 'stance.json'), 'w'), indent=1)
    print('STANCE', json.dumps(info)[:300])
    def box(cx, cy, half, z=1.0, more=4):
        pts = [px(cx + dx * half, cy + dy * half, zz) for dx in (-1, 1) for dy in (-1, 1) for zz in (z - 3, z + 3)]
        x0, x1 = min(p_[0] for p_ in pts) - more, max(p_[0] for p_ in pts) + more
        y0, y1 = min(p_[1] for p_ in pts) - more, max(p_[1] for p_ in pts) + more
        return max(0, x0 / rx), min(1, x1 / rx), max(0, 1 - y1 / ry), min(1, 1 - y0 / ry)
    near = {'dl': (*DPAD, 17), 'dr': (*DPAD, 17), 'du': (*DPAD, 17), 'dd': (*DPAD, 17), 'lit-a': (*A_AT, 16), 'lit-b': (*B_AT, 16)}
    TILT = math.radians(6)
    VARIANTS = argv[4].split(',') if len(argv) > 4 else ['up', 'down', 'dl', 'dr', 'du', 'dd', 'lit-a', 'lit-b', 'shadow']
    for v in VARIANTS:
        for cp in CAPS: cp.location.z = (-1.4 if v == 'down' else 0.0) * M
        led.data.materials[0] = led_on if v == 'down' else led_off
        for g, which in zip(GLOWS, ('lit-a', 'lit-b')): g.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 6.0 if v == which else 0.0
        pivot.rotation_euler = {'dl': (0, -TILT, 0), 'dr': (0, TILT, 0), 'du': (-TILT, 0, 0), 'dd': (TILT, 0, 0)}.get(v, (0, 0, 0))
        r = scene.render
        if v in near or v == 'down':
            r.use_border = True; r.use_crop_to_border = False
            # (down: A, B and the light, which here is on the other grip: the whole face)
            r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = box(W / 2, H / 2, W / 2 + 4) if v == 'down' else box(*near[v])
        else:
            r.use_border = False
        if v == 'shadow':
            r.use_border = False
            wall.is_shadow_catcher = True; wall.visible_camera = True
            for ob in scene.objects:
                if ob.type == 'LIGHT' or ob.name.startswith('sheen'): ob.hide_render = True
                elif ob.type in ('MESH', 'FONT', 'CURVE') and ob != wall: ob.visible_camera = False
            scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
            cpos = hero_cam.matrix_world.translation; rgt = hero_cam.matrix_world.to_3x3() @ Vector((1, 0, 0)); upv = hero_cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
            k_ = math.tan(math.radians(float(os.environ.get('SHADOW_ANGLE', 22.0))))
            dirL = ((cpos - mid).normalized() + k_ * (-0.55 * rgt + 0.83 * upv)).normalized()
            cc.area('shadowlight', tuple(mid + dirL * 0.8), float(os.environ.get('SHADOW_SIZE', 0.12)), 60.0, aim=tuple(mid))
        r.filepath = os.path.join(OUT, f'body_{v}.png')
        bpy.ops.render.render(write_still=True)
        print('RENDERED', v)
    raise SystemExit

# ---- the picture ------------------------------------------------------------------------------------------------------------------
if VIEW == 'hero':
    cam = cc.hero_shot(H, yaw=-24.0, span_mm=W * float(os.environ.get('SPAN', 1.0)))
    aim = Vector((0.0, 0.0, (H / 2 + 9) * M))   # (a little above its middle: the cartridge stands up out of its top)
    cam.rotation_euler = (aim - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.dof.focus_distance = (aim - cam.location).length
else:   # (square on, orthographic, the whole width in the frame)
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = (W + 40) * M
    c = bpy.data.objects.new('cam', cd); scene.collection.objects.link(c); c.location = (0.0, 0.0, 0.5); scene.camera = c
    cc.area('key', (-0.3, 0.4, 0.55), 0.5, 7.0); cc.area('fill', (0.45, -0.15, 0.4), 0.7, 2.5)
    w_ = bpy.data.worlds.new('w'); scene.world = w_; w_.use_nodes = True
    w_.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.05, 0.16, 1)
    w_.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
cc.render_setup(RES, SAMPLES, OUT)
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
