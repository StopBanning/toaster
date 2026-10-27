# Concept A, "Toaster Cart": a bead-blasted aluminium handheld. One 4:3 screen; under it four arcade buttons
# lined up with the screen's four lanes (the notes fall onto real buttons); the song is a cartridge in its right
# side, its label the song's; a big toast-gold DROP button; corner screws, a speaker grille, a few worn stickers.
# The app's pictures: as metal.py's, with view app and spec-cart.json, into renderer/handheld/cart.
#   blender -b --factory-startup --python cart.py -- <out.png | out dir> [samples] [view: hero | front | app] [res WxH] [variants]
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Euler
import cc
from cc import P, rrect, circle, rotated, prism, quad, cut, joined, bevel, mat, worn, image_mat, text, area, srgb, mixc, M

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(cc.HERE, 'renders', 'cart.png')
SAMPLES = int(argv[1]) if len(argv) > 1 else 192
VIEW = argv[2] if len(argv) > 2 else 'hero'   # hero | front | app (the app's pictures: straight on, the screen clear, variants)
RES = tuple(int(v) for v in argv[3].split('x')) if len(argv) > 3 and 'x' in argv[3] else (1080, 1350)
VARIANTS = argv[4].split(',') if len(argv) > 4 else ['up', 'down', 'lit-lanes', 'lit-drop']
APP = VIEW == 'app'
PAD, PX_PER_U = 24.0, 10.24   # (app: the room round it for its shadow and the cartridge; the pixels a unit)
TEX = os.path.join(cc.HERE, 'tex')

W, H, D = 100.0, 150.0, 13.0
scene = cc.setup(W, H)
BLUE, NAVY, LIGHT = srgb((5, 29, 181)), srgb((2, 11, 69)), srgb((96, 160, 255))
LANES = [srgb((255, 52, 128)), srgb((255, 160, 20)), srgb((30, 220, 255)), srgb((130, 250, 60))]

# ---- materials -----------------------------------------------------------------------------------------------------
alu = cc.edged(worn(mat('alu', (0.5, 0.505, 0.51), rough=0.5, metal=1.0), scale=40, amount=0.1, grain=0.08), edge=0.6, grime=0.3)
black_glass = mat('black_glass', (0.006, 0.006, 0.008), rough=0.05, coat=1.0, spec=0.6)
anodized = mat('anodized', (0.018, 0.018, 0.022), rough=0.32, metal=0.7)
steel = mat('steel', (0.3, 0.3, 0.32), rough=0.3, metal=1.0)
etch = mat('etch', (0.05, 0.05, 0.06), rough=0.65)
hole_dark = mat('hole_dark', (0.004, 0.004, 0.005), rough=0.9)
cart_blue = mat('cart_blue', mixc(BLUE, (0.1, 0.2, 0.6), 0.3), rough=0.35, coat=0.3, sss=0.05)
glass = bpy.data.materials.new('glass'); glass.use_nodes = True
_nt = glass.node_tree; _nt.nodes.remove(_nt.nodes['Principled BSDF'])
_tr = _nt.nodes.new('ShaderNodeBsdfTransparent'); _gl = _nt.nodes.new('ShaderNodeBsdfGlossy'); _gl.inputs['Roughness'].default_value = 0.03
_fr = _nt.nodes.new('ShaderNodeFresnel'); _fr.inputs['IOR'].default_value = 1.5; _mx = _nt.nodes.new('ShaderNodeMixShader')
_nt.links.new(_fr.outputs['Fac'], _mx.inputs['Fac']); _nt.links.new(_tr.outputs['BSDF'], _mx.inputs[1]); _nt.links.new(_gl.outputs['BSDF'], _mx.inputs[2])
_nt.links.new(_mx.outputs['Shader'], _nt.nodes['Material Output'].inputs['Surface'])

# ---- the body: a plate with a chamfer, the screen's pocket, the button seats, the grille, the cartridge slot -------------
body = prism('body', rrect(0, 0, W, H, 9.0, seg=10), -D, 0, mat=alu)
bevel(body, 1.1, segments=2, angle=50)
PANEL = (7.0, 9.5, 86.0, 66.0)
cut(body, prism('panel_pocket', rrect(PANEL[0] - 0.2, PANEL[1] - 0.2, PANEL[2] + 0.4, PANEL[3] + 0.4, 3.8), -0.8, 1))
DISP = (10.0, 12.5, 80.0, 60.0)
pad_x, lane_w = DISP[2] * 0.06, (DISP[2] - 2 * DISP[2] * 0.06) / 4
LANE_X = [DISP[0] + pad_x + (i + 0.5) * lane_w for i in range(4)]
BTN_Y = 88.0
for i, x in enumerate(LANE_X):
    cut(body, prism(f'seat{i}', circle(x, BTN_Y, 7.6, 64), -0.6, 1))
DROP = (76.0, 124.0)
cut(body, prism('drop_seat', circle(*DROP, 11.2, 96), -0.6, 1))
holes = []
for r_ in range(3):
    for c_ in range(6):
        x = 11.5 + c_ * 3.1 + (1.55 if r_ % 2 else 0); y = 127.0 + r_ * 2.7
        holes.append(prism(f'h{r_}{c_}', circle(x, y, 0.78, 24), -1.6, 1))
        prism(f'hf{r_}{c_}', circle(x, y, 0.8, 24), -1.62, -1.5, mat=hole_dark)
cut(body, joined('grille', holes))
SLOT = (84.0, 21.4, 17.0, 41.2)  # (the cartridge slot, x y w h; at depth z -8.7 .. -5.1)
cut(body, prism('slot', [(SLOT[0], SLOT[1]), (SLOT[0] + SLOT[2], SLOT[1]), (SLOT[0] + SLOT[2], SLOT[1] + SLOT[3]), (SLOT[0], SLOT[1] + SLOT[3])], -8.7, -5.1))
cut(body, prism('usb', rotated(rrect(45.5, -1, 9.0, 4.0, 1.5, seg=4), 50, 1, 0), -8.2, -4.8))
bevel(body, 0.12, segments=2, angle=50)

# ---- the screen: black glass, the display under a clear sheet -------------------------------------------------------------
prism('panel', rrect(*PANEL, 3.6), -0.8, -0.12, mat=black_glass)
if APP:   # (the app draws the screen: clear here, under the glass's reflections)
    hold = bpy.data.materials.new('holdout'); hold.use_nodes = True
    hold.node_tree.nodes.remove(hold.node_tree.nodes['Principled BSDF'])
    _h = hold.node_tree.nodes.new('ShaderNodeHoldout'); hold.node_tree.links.new(_h.outputs['Holdout'], hold.node_tree.nodes['Material Output'].inputs['Surface'])
    quad('display', DISP[0] - 0.6, DISP[1] - 0.6, DISP[2] + 1.2, DISP[3] + 1.2, -0.11, mat=hold)
else:
    quad('display', *DISP, -0.11, mat=image_mat('display', os.path.join(TEX, 'top-4.06.png'), emit=1.5))
quad('cover', PANEL[0], PANEL[1], PANEL[2], PANEL[3], -0.05, mat=glass).visible_shadow = False

# ---- the lane buttons and their names -------------------------------------------------------------------------------------
CAPS, GLOWS = [], []   # (the caps, to press; their lights, for the lit renders)
for i, (x, c) in enumerate(zip(LANE_X, LANES)):
    ring = prism(f'ring{i}', circle(x, BTN_Y, 7.4, 96), -0.6, 1.1, mat=anodized)
    cut(ring, prism(f'ring_in{i}', circle(x, BTN_Y, 6.35, 96), -2, 3)); bevel(ring, 0.45, segments=3)
    m_ = mat(f'cap{i}', c, rough=0.22, coat=0.7, sss=0.12, emit=((1, 1, 1), 0.0))
    cap = prism(f'cap{i}', circle(x, BTN_Y, 6.15, 96), -0.4, 2.9, mat=m_)
    bevel(cap, 2.0, segments=8); CAPS.append(cap); GLOWS.append(m_)
for name, x in zip(('KICK', 'CLAP', 'HATS', 'BASS'), LANE_X):
    text(name, x, 98.8, 2.1, etch, z=0.004, spacing=1.2)

# ---- the wordmark, the grille's name, the DROP button --------------------------------------------------------------------
text('TOASTER', 10.0, 110.0, 6.6, etch, z=0.004, spacing=1.04, font='orbitron-900.ttf', align='LEFT')
text('CART SYSTEM  ·  LIVE CODE', 10.2, 116.4, 1.45, etch, z=0.004, spacing=1.3, align='LEFT')
ring = prism('drop_ring', circle(*DROP, 11.0, 128), -0.6, 1.3, mat=anodized)
cut(ring, prism('drop_ring_in', circle(*DROP, 9.7, 128), -2, 3)); bevel(ring, 0.5, segments=3)
drop_m = mat('drop_cap', srgb((236, 168, 62)), rough=0.24, coat=0.6, sss=0.1, emit=((1, 1, 1), 0.0))
cap = prism('drop_cap', circle(*DROP, 9.45, 128), -0.4, 3.4, mat=drop_m)
bevel(cap, 2.6, segments=10); CAPS.append(cap)
drop_ink = text('DROP', DROP[0], DROP[1], 3.0, mat('drop_ink', NAVY, rough=0.5), z=3.42, spacing=1.12, font='orbitron-900.ttf')

# ---- screws ----------------------------------------------------------------------------------------------------------------
for (x, y) in ((6.0, 6.0), (94.0, 6.0), (6.0, 144.0), (94.0, 144.0)):
    s = prism('screw', circle(x, y, 2.0, 48), -0.3, 0.35, mat=steel); bevel(s, 0.25, segments=2)
    cut(s, prism('torx', [(x + 0.85 * math.cos(a * math.pi / 3 + 0.3), y + 0.85 * math.sin(a * math.pi / 3 + 0.3)) for a in range(6)], -0.2, 1))

# ---- the cartridge: in the slot, half out of the side; its label the song's ----------------------------------------------
card = prism('cart', rrect(85.0, 22.0, 33.0, 40.0, 1.2, seg=3), -8.2, -5.6, mat=cart_blue); bevel(card, 0.35, segments=2)
for k in range(4):   # (ridges to pull it by)
    prism(f'ridge{k}', rrect(115.2 - k * 1.3, 24.0, 0.6, 36.0, 0.3, seg=2), -5.6, -5.35, mat=cart_blue)
quad('label', 100.6, 23.2, 13.2, 37.6, -5.58, mat=image_mat('label', os.path.join(TEX, 'label-blank.png' if APP else 'label.png'), rough=0.5, alpha=True))

# ---- stickers -----------------------------------------------------------------------------------------------------------------
def sticker(name, path, cx, cy, w, h, ang):
    q = quad(name, cx - w / 2, cy - h / 2, w, h, 0.03, mat=image_mat(name, path, rough=0.35, alpha=True, coat=0.3), ang=math.radians(ang))
    q.visible_shadow = False
    return q
sticker('st_toaster', os.path.join(TEX, 'sticker-toaster.png'), 45.5, 130.0, 17.0, 17.0, 9)
sticker('st_live', os.path.join(TEX, 'sticker-live.png'), 47.0, 144.2, 14.0, 5.6, -5)
sticker('st_star', os.path.join(TEX, 'sticker-star.png'), 90.0, 104.0, 7.0, 7.0, 0)

cc.smooth_all()

# ---- the shot ------------------------------------------------------------------------------------------------------------------
root = cc.ROOT
if VIEW == 'hero':
    cc.hero_shot(H, yaw=-24.0)
elif VIEW == 'front':
    cc.front_shot(H)
if not APP:
    cc.render_setup(RES, SAMPLES, OUT, exposure=0.0)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', OUT)
    raise SystemExit

# ---- the app's pictures: straight on, lying face up, its shadow caught on a floor; one render a variant ------------------------
W_u, H_u = W + 2 * PAD, H + 2 * PAD
bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, -D * M - 0.0001))
floor = bpy.context.active_object; floor.is_shadow_catcher = True; floor.data.materials.append(mat('floor', (0.5, 0.5, 0.5)))
cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = H_u * M
cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam); cam.location = (0, 0, 1.0); scene.camera = cam
cc.area('key', (-0.30, 0.40, 0.55), 0.5, 7.5); cc.area('fill', (0.45, -0.15, 0.40), 0.7, 2.6); cc.area('rim', (0.0, 0.62, 0.10), 0.3, 2.0)
cc.sheen_card((-0.12, 0.16, 0.24), (0, 0, 0), size=(0.36, 0.3), strength=float(os.environ.get('SHEEN', 7.0)))
w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.52, 0.56, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25
cc.render_setup((round(W_u * PX_PER_U), round(H_u * PX_PER_U)), SAMPLES, OUT, transparent=True)
scene.cycles.film_transparent_glass = True
os.makedirs(OUT, exist_ok=True)
for v in VARIANTS:
    for cp in CAPS: cp.location.z = (-1.4 if v == 'down' else 0.0) * M
    drop_ink.location.z = ((-1.4 if v == 'down' else 0.0) + 3.42) * M
    for g in GLOWS: g.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 6.0 if v == 'lit-lanes' else 0.0
    drop_m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 5.0 if v == 'lit-drop' else 0.0
    scene.render.filepath = os.path.join(OUT, f'body_{v}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', v)
