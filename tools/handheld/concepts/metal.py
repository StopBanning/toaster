# Concept D, "Toaster Metal": the first handheld's design (two screens, each under its own black glass, the
# wordmark engraved in the metal between them, the cross, A and B, SELECT and START, the power light; game.js's
# layout to the unit) on the cartridge handheld's body: bead-blasted titanium-grey metal, worn edges and scuffs,
# Torx screws, stickers (LIVE by the name, the toaster between the cross and A and B, a holo smiley), the song as
# a cartridge out of its right side. LOGO=chrome: the old look, one glass over both screens, the name in chrome.
# To make the app's pictures again (Blender 5.2), from the repo's root:
#   python -I tools/handheld/fonts.py; python -I tools/handheld/concepts/textures.py
#   blender -b --factory-startup --python tools/handheld/concepts/metal.py -- <renders dir> 256 app
#   (copy spec-metal.json there as spec.json) python -I tools/handheld/assets_spec.py <renders dir> renderer/handheld/metal
# A hero or front picture needs the screens' pictures in concepts/tex (top-os.png, bottom-os.png: frames of the game).
# Seen from the hero picture's angle for the app (game.js's stance): its shadow alone on a wall behind it, the rest as
# for app (the screens clear, the label blank), then the pictures and where things are in them, from the repo's root:
#   WALL=40 blender -b --factory-startup --python tools/handheld/concepts/metal.py -- <renders dir> 256 stance 2160x2700 \
#     up,down,dl,dr,du,dd,lit-a,lit-b,shadow
#   python -I tools/handheld/assets_stance.py <renders dir> renderer/handheld/stance   (it prints game.js's STANCE)
# The pink edition (the pink theme's handheld: pink buttons and cartridge, the room's light plum, TOASTER filled rose, the
# stickers of stickers2.py: the toaster in pink, </>, a pixel heart, LIVE on pink label tape): the same with COLORWAY=pink,
# after python -I tools/handheld/concepts/stickers2.py, into renderer/handheld/stance-pink.
# The Japan edition (after the Famicom: cream plastic, maroon A and B, a red cartridge, トースター engraved and filled red,
# セレクト and スタート, the label and stickers in Japanese: ライブ, a 限定 seal, 新発売 and the toaster in red): the same with
# COLORWAY=jp, after python -I tools/handheld/concepts/stickers_jp.py and labels_jp.py, into renderer/handheld/stance-jp.
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import cc
from cc import P, rrect, circle, rotated, prism, quad, cut, joined, bevel, mat, worn, image_mat, text, srgb, mixc, M

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(cc.HERE, 'renders', 'metal.png')
SAMPLES = int(argv[1]) if len(argv) > 1 else 192
VIEW = argv[2] if len(argv) > 2 else 'hero'
RES = tuple(int(v) for v in argv[3].split('x')) if len(argv) > 3 and 'x' in argv[3] else (1080, 1350)
VARIANTS = argv[4].split(',') if len(argv) > 4 else ['up', 'down', 'dl', 'dr', 'du', 'dd', 'lit-a', 'lit-b']
APP = VIEW in ('app', 'stance')   # (the app's pictures: the screens clear and the label blank; 'stance' from the hero's angle)
LOGO = os.environ.get('LOGO', 'engrave')   # engrave (into the titanium between the screens, filled with FILL) | chrome (on one lens over both)
SPLIT = LOGO != 'chrome'                     # (a glass for each screen, the metal between them)
COLORWAY = os.environ.get('COLORWAY', 'blue')   # (its buttons, cartridge and the light off the wall: blue, the app's own; pink, for the pink theme)
FILL = os.environ.get('FILL', {'blue': 'navy', 'jp': 'red'}.get(COLORWAY, 'rose'))
JP = COLORWAY == 'jp'   # (the Japan edition: its name in katakana, Dela Gothic One; its print in M PLUS 1p)
WORD, WORD_FONT, WORD_SIZE, WORD_SP = ('トースター', 'delagothic.ttf', 6.8, 1.0) if JP else ('TOASTER', 'orbitron-900.ttf', 6.2, 1.08)
PAD, PX_PER_U = 24.0, 10.24
TEX = os.path.join(cc.HERE, 'tex')

W, H, D = 100.0, 190.0, 14.0
scene = cc.setup(W, H)
BLUE, NAVY, LIGHT = srgb((5, 29, 181)), srgb((2, 11, 69)), srgb((96, 160, 255))
if COLORWAY == 'pink':   # (A hot pink, B light pink, a pink cartridge; the room's light a dark plum, the code being pink on near black)
    CAP_A, CAP_B, CART, CART_MIX, WALL_C = srgb((255, 46, 140)), srgb((255, 150, 205)), srgb((226, 38, 128)), (0.6, 0.08, 0.3), srgb((70, 8, 44))
elif JP:   # (the Famicom's maroon on both buttons, a red cartridge; the room a deep red)
    CAP_A, CAP_B, CART, CART_MIX, WALL_C = srgb((150, 20, 40)), srgb((150, 20, 40)), srgb((182, 30, 46)), (0.55, 0.06, 0.1), srgb((64, 6, 14))
else:
    CAP_A, CAP_B, CART, CART_MIX, WALL_C = BLUE, LIGHT, BLUE, (0.1, 0.2, 0.6), BLUE
TOP, BOT = (10.0, 10.0, 80.0, 60.0), (10.0, 84.0, 80.0, 60.0)
LENS = (7.0, 7.0, 86.0, 141.0, 5.0)
CY = 164.5
DPAD, A_AT, B_AT, LED_AT = (22.0, CY), (86.0, CY - 6.5), (69.0, CY + 1.0), (12.0, 76.4)
PILLS = [(42.0, CY + 15.0), (58.0, CY + 15.0)]

# ---- materials -----------------------------------------------------------------------------------------------------
if JP:   # (the Famicom's cream plastic, a little yellowed, polished where hands go)
    alu = cc.edged(worn(mat('alu', srgb((228, 219, 196)), rough=0.4, coat=0.1), scale=40, amount=0.08, grain=0.05), edge=0.2, grime=0.3)
else:
    alu = cc.edged(worn(mat('alu', (0.5, 0.505, 0.51), rough=0.5, metal=1.0), scale=40, amount=0.1, grain=0.08), edge=0.6, grime=0.3)
black_glass = mat('black_glass', (0.006, 0.006, 0.008), rough=0.05, coat=1.0, spec=0.6)
anodized = mat('anodized', (0.018, 0.018, 0.022), rough=0.32, metal=0.7)
steel = mat('steel', (0.3, 0.3, 0.32), rough=0.3, metal=1.0)
etch = mat('etch', (0.05, 0.05, 0.06), rough=0.65)
hole_dark = mat('hole_dark', (0.004, 0.004, 0.005), rough=0.9)
grey_print = mat('grey_print', (0.36, 0.38, 0.44), rough=0.5)
light_print = mat('light_print', LIGHT, rough=0.5)
rubber = mat('rubber', (0.05, 0.052, 0.06), rough=0.75)
cart_blue = mat('cart_blue', mixc(CART, CART_MIX, 0.3), rough=0.35, coat=0.3, sss=0.05)
led_off = mat('led_off', srgb((150, 6, 14)), rough=0.2, coat=0.5, emit=(srgb((255, 18, 28)), 0.9))
led_on = mat('led_on', srgb((255, 40, 50)), rough=0.2, coat=0.5, emit=(srgb((255, 24, 34)), 12.0))
glass = bpy.data.materials.new('glass'); glass.use_nodes = True
_nt = glass.node_tree; _nt.nodes.remove(_nt.nodes['Principled BSDF'])
_tr = _nt.nodes.new('ShaderNodeBsdfTransparent'); _gl = _nt.nodes.new('ShaderNodeBsdfGlossy'); _gl.inputs['Roughness'].default_value = 0.03
_fr = _nt.nodes.new('ShaderNodeFresnel'); _fr.inputs['IOR'].default_value = 1.5; _mx = _nt.nodes.new('ShaderNodeMixShader')
_nt.links.new(_fr.outputs['Fac'], _mx.inputs['Fac']); _nt.links.new(_tr.outputs['BSDF'], _mx.inputs[1]); _nt.links.new(_gl.outputs['BSDF'], _mx.inputs[2])
_nt.links.new(_mx.outputs['Shader'], _nt.nodes['Material Output'].inputs['Surface'])
hold = bpy.data.materials.new('holdout'); hold.use_nodes = True
hold.node_tree.nodes.remove(hold.node_tree.nodes['Principled BSDF'])
_h = hold.node_tree.nodes.new('ShaderNodeHoldout'); hold.node_tree.links.new(_h.outputs['Holdout'], hold.node_tree.nodes['Material Output'].inputs['Surface'])

# ---- the body: the first handheld's outline (the big round corner bottom right), in metal ----------------------------------
body = prism('body', rrect(0, 0, W, H, [9, 9, 26, 9], seg=10), -D, 0, mat=alu)
bevel(body, 1.1, segments=2, angle=50)
lx, ly, lw, lh, lr = LENS
LENSES = [(7.0, 7.0, 86.0, 66.0), (7.0, 81.0, 86.0, 66.0)] if SPLIT else [(lx, ly, lw, lh)]
for i, (x_, y_, w_, h_) in enumerate(LENSES):
    cut(body, prism(f'lens_pocket{i}', rrect(x_ - 0.2, y_ - 0.2, w_ + 0.4, h_ + 0.4, lr + 0.2), -0.8, 1))
if SPLIT:
    cut(body, prism('led_hole', circle(*LED_AT, 0.85, 40), -3, 1))
    # the wordmark cut into the metal, 0.3 deep (its edges catch the light), and filled
    eng = text(WORD, 52.0, 77.0, WORD_SIZE, mat('eng', (0.1, 0.1, 0.1)), z=0.3, spacing=WORD_SP, font=WORD_FONT, extrude=0.6)
    for o in bpy.context.selected_objects: o.select_set(False)
    eng.select_set(True); bpy.context.view_layer.objects.active = eng
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.000002)
    bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    cut(body, eng)
    body.modifiers['cut_' + eng.name].use_self = True; body.modifiers['cut_' + eng.name].use_hole_tolerant = True   # (a glyph's overlapping outline)
cut(body, prism('dwell', circle(*DPAD, 13.2, 96), -0.9, 1))
for at in (A_AT, B_AT):
    cut(body, prism(f'seat{at[0]}', circle(*at, 7.6, 96), -0.6, 1))
for i, (px, py) in enumerate(PILLS):
    cut(body, prism(f'pwell{i}', rotated(rrect(px - 5, py - 1.7, 10, 3.4, 1.65), px, py, -0.42), -0.8, 1))
holes = []
SPK = (84.0, 177.0)
for i in range(-3, 4):
    for j in range(-3, 4):
        x, y = SPK[0] + i * 2.6 + (1.3 if j % 2 else 0), SPK[1] + j * 2.25
        if (x - SPK[0]) ** 2 + (y - SPK[1]) ** 2 > 6.2 ** 2: continue
        holes.append(prism(f'h{i}{j}', circle(x, y, 0.72, 20), -1.6, 1))
        prism(f'hf{i}{j}', circle(x, y, 0.74, 20), -1.62, -1.5, mat=hole_dark)
cut(body, joined('grille', holes))
cut(body, prism('slot', [(84.0, 19.4), (101.0, 19.4), (101.0, 60.6), (84.0, 60.6)], -9.2, -5.6))
bevel(body, 0.12, segments=2, angle=50)

# ---- the lens: black glass with the two screens, the wordmark between them, the power light under it ------------------------------
for i, (x_, y_, w_, h_) in enumerate(LENSES):
    prism(f'lens{i}', rrect(x_, y_, w_, h_, lr, seg=10), -0.8, -0.12, mat=black_glass)
    quad(f'cover{i}', x_, y_, w_, h_, -0.05, mat=glass).visible_shadow = False
if SPLIT and FILL != 'none':   # (the enamel in the cut, a little under the face)
    fill_m = mat('fill', {'navy': NAVY, 'blue': BLUE, 'black': (0.01, 0.01, 0.012), 'plum': srgb((88, 8, 56)), 'rose': srgb((226, 84, 150)), 'red': srgb((214, 28, 36))}[FILL], rough=0.35, coat=0.6)
    text(WORD, 52.0, 77.0, WORD_SIZE, fill_m, z=-0.24, spacing=WORD_SP, font=WORD_FONT, extrude=0.02)
SCREENS = os.environ.get('SCREENS', 'os')   # (which frames of the game the screens show in a hero or front picture: os | 4.06, the neon)
for name, r, tex in (('top', TOP, f'top-{SCREENS}.png'), ('bottom', BOT, f'bottom-{SCREENS}.png')):
    if APP: quad(f'screen_{name}', r[0] - 0.6, r[1] - 0.6, r[2] + 1.2, r[3] + 1.2, -0.11, mat=hold)
    else: quad(f'screen_{name}', *r, -0.11, mat=image_mat(name, os.path.join(TEX, tex), emit=1.5))
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.9 * M, location=P(*LED_AT, -1.0 if SPLIT else -0.3))
led = bpy.context.active_object; led.name = 'led'; led.scale[2] = 0.45; led.data.materials.append(led_off); cc.own(led)

def bounds(t):
    bpy.context.view_layer.update()
    xs = [c[0] for c in t.bound_box]; ys = [c[1] for c in t.bound_box]
    return min(xs), min(ys), max(xs), max(ys)
def ramp_mat(name, stops, box, emit=0.75, rough=0.22, metal=0.35):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    fy = nt.nodes.new('ShaderNodeMapRange'); fy.inputs['From Min'].default_value = box[1]; fy.inputs['From Max'].default_value = box[3]
    nt.links.new(sep.outputs['Y'], fy.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); els = ramp.color_ramp.elements
    els[0].position, els[0].color = stops[0][0], (*stops[0][1], 1); els[1].position, els[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]: els.new(pos).color = (*col, 1)
    nt.links.new(fy.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color']); nt.links.new(ramp.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = emit; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m
if LOGO == 'chrome':   # (Orbitron Black in Y2K chrome, a light-blue rim round it, on the one lens)
    t = text('TOASTER', 52.0, 77.0, 7.0, grey_print, z=-0.1, spacing=1.06, font='orbitron-900.ttf', extrude=0.1, bevel_=0.05)
    t.data.materials[0] = ramp_mat('chrome', [(0.0, (0.8, 0.86, 1.0)), (0.2, (0.18, 0.27, 0.75)), (0.44, (0.004, 0.006, 0.03)),
                                              (0.47, (1.0, 1.0, 1.0)), (0.53, (0.6, 0.82, 1.0)), (1.0, (0.004, 0.02, 0.3))], bounds(t))
    o = text('TOASTER', 52.0, 77.0, 7.0, mat('rim', LIGHT, rough=0.4, emit=(LIGHT, 0.9)), z=-0.112, spacing=1.06, font='orbitron-900.ttf')
    o.data.offset = 0.22 * M

# ---- the controls ------------------------------------------------------------------------------------------------------------
pivot = bpy.data.objects.new('dpad_pivot', None); scene.collection.objects.link(pivot); cc.own(pivot)
pivot.location = P(*DPAD, -0.9)
bpy.context.view_layer.update()
hw, he = 3.2, 9.6
cross = [(DPAD[0] - hw, DPAD[1] - he), (DPAD[0] + hw, DPAD[1] - he), (DPAD[0] + hw, DPAD[1] - hw), (DPAD[0] + he, DPAD[1] - hw), (DPAD[0] + he, DPAD[1] + hw),
         (DPAD[0] + hw, DPAD[1] + hw), (DPAD[0] + hw, DPAD[1] + he), (DPAD[0] - hw, DPAD[1] + he), (DPAD[0] - hw, DPAD[1] + hw), (DPAD[0] - he, DPAD[1] + hw),
         (DPAD[0] - he, DPAD[1] - hw), (DPAD[0] - hw, DPAD[1] - hw)]
cr = prism('cross', cross, -0.9, 1.8, mat=anodized); bevel(cr, 0.7, segments=4)
cut(cr, prism('cross_dish', circle(*DPAD, 2.6, 64), 1.6, 3))
mw = cr.matrix_world.copy(); cr.parent = pivot; cr.matrix_world = mw
for ang in (0, 90, 180, 270):
    a = math.radians(ang); cx_, cy_ = DPAD[0] + 6.9 * math.cos(a), DPAD[1] - 6.9 * math.sin(a)
    tri = [(cx_ + 1.3 * math.cos(a), cy_ - 1.3 * math.sin(a)), (cx_ + 1.1 * math.cos(a + 2.2), cy_ - 1.1 * math.sin(a + 2.2)), (cx_ + 1.1 * math.cos(a - 2.2), cy_ - 1.1 * math.sin(a - 2.2))]
    ar = prism('arrow', tri, 1.8, 1.825, mat=grey_print); mw = ar.matrix_world.copy(); ar.parent = pivot; ar.matrix_world = mw
CAPS, GLOWS = [], []
for name, at, col in (('A', A_AT, CAP_A), ('B', B_AT, CAP_B)):
    ring = prism(f'ring{name}', circle(*at, 7.4, 96), -0.6, 1.1, mat=anodized)
    cut(ring, prism(f'ring_in{name}', circle(*at, 6.35, 96), -2, 3)); bevel(ring, 0.45, segments=3)
    m_ = mat(f'cap{name}', col, rough=0.22, coat=0.7, sss=0.12, emit=((1, 1, 1), 0.0))
    cap = prism(f'cap{name}', circle(*at, 6.15, 96), -0.4, 2.9, mat=m_); bevel(cap, 2.0, segments=8)
    CAPS.append(cap); GLOWS.append(m_)
    text(name, at[0] + 9.2, at[1] + 4.6, 1.9, etch, z=0.004, spacing=1.0)
for i, (px, py) in enumerate(PILLS):
    p_ = prism(f'pill{i}', rotated(rrect(px - 4.3, py - 1.15, 8.6, 2.3, 1.15, seg=6), px, py, -0.42), -0.8, 0.9, mat=rubber); bevel(p_, 0.55, segments=4)
    if JP: text(('セレクト', 'スタート')[i], px, py + 4.4, 1.5, etch, z=0.004, spacing=1.0, font='mplus1p-bold.ttf')
    else: text(('SELECT', 'START')[i], px, py + 4.4, 1.45, etch, z=0.004, spacing=1.15)

# ---- screws, the cartridge, stickers ------------------------------------------------------------------------------------------------
for (x, y) in ((4.6, 4.6), (95.4, 4.6), (5.6, 184.4), (90.6, 176.0)):
    s = prism('screw', circle(x, y, 1.65, 40), -0.3, 0.32, mat=steel); bevel(s, 0.22, segments=2)
    cut(s, prism('torx', [(x + 0.7 * math.cos(a * math.pi / 3 + 0.3), y + 0.7 * math.sin(a * math.pi / 3 + 0.3)) for a in range(6)], -0.2, 1))
card = prism('cart', rrect(85.0, 20.0, 33.0, 40.0, 1.2, seg=3), -8.7, -6.1, mat=cart_blue); bevel(card, 0.35, segments=2)
for k in range(4):
    prism(f'ridge{k}', rrect(115.2 - k * 1.3, 22.0, 0.6, 36.0, 0.3, seg=2), -6.1, -5.85, mat=cart_blue)
LABEL = (('label-blank-pink.png' if COLORWAY == 'pink' else 'label-blank-jp.png' if JP else 'label-blank.png') if APP
         else 'label-jp.png' if JP else 'label.png')   # (jp: labels_jp.py's, in Japanese on a red band)
quad('label', 100.6, 21.2, 13.2, 37.6, -6.08, mat=image_mat('label', os.path.join(TEX, LABEL), rough=0.5, alpha=True))
def sticker(name, path, cx, cy, w, h, ang):
    q = quad(name, cx - w / 2, cy - h / 2, w, h, 0.03, mat=image_mat(name, path, rough=0.35, alpha=True, coat=0.3), ang=math.radians(ang))
    q.visible_shadow = False
    return q
# The stickers, each tex/sticker-<name>.png at its own shape (stickers2.py has the second round): STICKER_BIG between the
# cross and B (the toaster), STICKER low on the left under the cross, STICKER3 small between START and the speaker (none
# unless asked), LIVE by the name between the screens (live | live-dymo | live-dymo-pink | live-onair | live-holo |
# live-print, printed on the metal | live-led). Foil ones (holo in the name) catch the light.
# (the pink edition, for the pink theme: the toaster in pink, the </> low left, a pixel heart by START, LIVE on pink label tape)
PINK = COLORWAY == 'pink'
# (the Japan edition's: the toaster in red, a 限定 seal stamped low left, a 新発売 starburst by START, ライブ by the name)
STICKER = os.environ.get('STICKER', 'code-tag' if PINK else 'hanko' if JP else 'smiley-holo')
STICKER_BIG = os.environ.get('STICKER_BIG', 'toaster-pink' if PINK else 'toaster-jp' if JP else 'toaster')
STICKER3, LIVE = os.environ.get('STICKER3', 'pixel-heart' if PINK else 'shinhatsubai' if JP else ''), os.environ.get('LIVE', 'live-dymo-pink' if PINK else 'live-jp' if JP else 'live')
import struct
def png_wh(name):
    with open(os.path.join(TEX, f'sticker-{name}.png'), 'rb') as f: d = f.read(24)
    return struct.unpack('>II', d[16:24])
def placed(obj_name, name, cx, cy, size, ang, tall=None):   # (size: its longest side, mm; or tall: its height)
    w, h = png_wh(name)
    sw, sh = ((tall * w / h, tall) if tall else ((size, size * h / w) if w >= h else (size * w / h, size)))
    q = sticker(obj_name, os.path.join(TEX, f'sticker-{name}.png'), cx, cy, sw, sh, ang)
    b = q.data.materials[0].node_tree.nodes['Principled BSDF']
    if 'holo' in name: b.inputs['Metallic'].default_value = 0.55; b.inputs['Roughness'].default_value = 0.2
    if name in ('live-print', 'hanko'): b.inputs['Roughness'].default_value = 0.55; b.inputs['Coat Weight'].default_value = 0.0   # (ink, not a sticker)
    return q
if SPLIT:
    placed('st_live', LIVE, 83.0 + (0.6 if LIVE != 'live' else 0), 77.0, None, 0 if LIVE == 'live-print' else -4, tall=4.4 if LIVE == 'live-print' else 4.8)
    placed('st_big', STICKER_BIG, 48.4, 158.6, 17.0 if STICKER_BIG == 'toaster-pink' else 15.0, 2)   # (the pink one's sparkles take room round it)
    st = placed('st_' + STICKER, STICKER, 20.5, 183.8 if STICKER == 'smiley-holo' else 183.3, 9.0, -8)   # (clear of the edge's bevel)
    if STICKER3: placed('st3_' + STICKER3, STICKER3, 70.6, 183.8, 8.0, 7)
else:
    sticker('st_toaster', os.path.join(TEX, 'sticker-toaster.png'), 48.5, 160.0, 14.0, 14.0, 8)
    sticker('st_live', os.path.join(TEX, 'sticker-live.png'), 23.0, 184.6, 12.5, 5.0, -6)
    st = sticker('st_star', os.path.join(TEX, 'sticker-star.png'), 68.0, 185.0, 6.0, 6.0, 0)
if not SPLIT and 'holo' in STICKER:   # (foil: it catches the light)
    _b = st.data.materials[0].node_tree.nodes['Principled BSDF']; _b.inputs['Metallic'].default_value = 0.55; _b.inputs['Roughness'].default_value = 0.2

cc.smooth_all()

if VIEW in ('hero', 'stance'):
    BACK = {'pink': (26, 3, 16), 'jp': (70, 8, 18)}.get(COLORWAY)   # (its theme's ground; the Japan edition's a deep red)
    hero_cam = cc.hero_shot(H, yaw=-24.0, backdrop=mat('backdrop', srgb(BACK), rough=0.8, spec=0.2) if BACK else None)
elif VIEW == 'front':
    cc.front_shot(H)
if not APP:
    cc.render_setup(RES, SAMPLES, OUT)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', OUT)
    raise SystemExit

# ---- the app's pictures from the hero's angle (stance): no floor, but a wall square to the camera WALL mm behind the
# handheld's middle (where the code is in the app) that keeps only the shadow on it; no depth of field (the live screens
# are sharp); and where the planes of its face, its label and its parts land in the picture (stance.json) ---------------------
if VIEW == 'stance':
    import json
    from bpy_extras.object_utils import world_to_camera_view
    bpy.data.objects['sweep'].hide_render = True
    hero_cam.data.dof.use_dof = False
    bpy.context.view_layer.update()
    fwd = (hero_cam.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    mid = cc.ROOT.matrix_world @ P(W / 2, H / 2, -D / 2)
    bpy.ops.mesh.primitive_plane_add(size=4.0, location=mid + fwd * float(os.environ.get('WALL', 45.0)) * M)
    wall = bpy.context.active_object; wall.name = 'wall'
    wall.rotation_euler = (-fwd).to_track_quat('Z', 'Y').to_euler()
    wall.visible_shadow = False; wall.visible_camera = False   # (in the handheld's pictures: blue to bounce off and reflect, as the
    wall.data.materials.append(mat('wall', WALL_C, rough=0.8, spec=0.2))   # code would be; unseen, and not hiding the rim light behind it)
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
        if ob.parent != cc.ROOT and ob.name not in ('led',): continue
        me = ob.evaluated_get(dg).to_mesh()
        mw = ob.matrix_world
        for n_, vtx in enumerate(me.vertices):
            if n_ % 7: continue
            v = world_to_camera_view(scene, hero_cam, mw @ vtx.co); xs.append(v.x * rx); ys.append((1 - v.y) * ry)
        ob.evaluated_get(dg).to_mesh_clear()
    ZS = (-6.08, -1.0, -0.11, 0.0, 1.0, 1.6, 2.9)
    info = {'img': [rx, ry], 'dev': [math.floor(min(xs)), math.floor(min(ys)), math.ceil(max(xs)), math.ceil(max(ys))],
            'planes': {str(z): [px(0, 0, z), px(W, 0, z), px(W, H, z), px(0, H, z)] for z in ZS}}
    json.dump(info, open(os.path.join(OUT, 'stance.json'), 'w'), indent=1)
    print('STANCE', json.dumps(info))
    def box(cx, cy, half, z=1.0, more=4):   # (a border round a part: its square of half units each side, projected, in 0..1)
        pts = [px(cx + dx * half, cy + dy * half, zz) for dx in (-1, 1) for dy in (-1, 1) for zz in (z - 3, z + 3)]
        x0, x1 = min(p_[0] for p_ in pts) - more, max(p_[0] for p_ in pts) + more
        y0, y1 = min(p_[1] for p_ in pts) - more, max(p_[1] for p_ in pts) + more
        return max(0, x0 / rx), min(1, x1 / rx), max(0, 1 - y1 / ry), min(1, 1 - y0 / ry)
    near = {'dl': (*DPAD, 17), 'dr': (*DPAD, 17), 'du': (*DPAD, 17), 'dd': (*DPAD, 17), 'lit-a': (*A_AT, 16), 'lit-b': (*B_AT, 16)}
    TILT = math.radians(6)
    for v in VARIANTS:
        for cp in CAPS: cp.location.z = (-1.4 if v == 'down' else 0.0) * M
        led.data.materials[0] = led_on if v == 'down' else led_off
        for g, which in zip(GLOWS, ('lit-a', 'lit-b')): g.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 6.0 if v == which else 0.0
        pivot.rotation_euler = {'dl': (0, -TILT, 0), 'dr': (0, TILT, 0), 'du': (-TILT, 0, 0), 'dd': (TILT, 0, 0)}.get(v, (0, 0, 0))
        r = scene.render
        if v in near or v == 'down':
            r.use_border = True; r.use_crop_to_border = False
            if v == 'down':   # (A, B and the light: the face from the light down)
                x0_, x1_, y0_, y1_ = box(50, 120, 50)
            else:
                x0_, x1_, y0_, y1_ = box(*near[v])
            r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = x0_, x1_, y0_, y1_
        else:
            r.use_border = False
        if v == 'shadow':   # (last: the shadow alone, on the wall, from one light a little up and left of the camera's line)
            r.use_border = False
            wall.is_shadow_catcher = True; wall.visible_camera = True
            for ob in scene.objects:
                if ob.type == 'LIGHT' or ob.name.startswith('sheen'): ob.hide_render = True
                elif ob.type in ('MESH', 'FONT', 'CURVE') and ob != wall: ob.visible_camera = False
            scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
            cpos = hero_cam.matrix_world.translation; rgt = hero_cam.matrix_world.to_3x3() @ Vector((1, 0, 0)); upv = hero_cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
            k_ = math.tan(math.radians(float(os.environ.get('SHADOW_ANGLE', 22.0))))
            dirL = ((cpos - mid).normalized() + k_ * (-0.55 * rgt + 0.83 * upv)).normalized()
            cc.area('shadowlight', tuple(mid + dirL * 0.6), float(os.environ.get('SHADOW_SIZE', 0.12)), 60.0, aim=tuple(mid))
        r.filepath = os.path.join(OUT, f'body_{v}.png')
        bpy.ops.render.render(write_still=True)
        print('RENDERED', v)
    raise SystemExit

# ---- the app's pictures --------------------------------------------------------------------------------------------------------
W_u, H_u = W + 2 * PAD, H + 2 * PAD
bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, -D * M - 0.0001))
floor = bpy.context.active_object; floor.is_shadow_catcher = True; floor.data.materials.append(mat('floor', (0.5, 0.5, 0.5)))
cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = H_u * M
cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam); cam.location = (0, 0, 1.0); scene.camera = cam
cc.area('key', (-0.30, 0.40, 0.55), 0.5, 7.5); cc.area('fill', (0.45, -0.15, 0.40), 0.7, 2.6); cc.area('rim', (0.0, 0.62, 0.10), 0.3, 2.0)
cc.sheen_card((-0.12, 0.16, 0.24), (0, 0, 0), size=(0.36, 0.3), strength=float(os.environ.get('SHEEN', 7.0)))
w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
if os.environ.get('APPWORLD', 'studio') == 'studio':   # (a real studio for the titanium to reflect: metal reads as metal by what it reflects)
    env = w.node_tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(bpy.utils.system_resource('DATAFILES'), 'studiolights', 'world', 'studio.exr'))
    w.node_tree.links.new(env.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color'])
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = float(os.environ.get('APPWORLD_K', 0.55))
else:
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.52, 0.56, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25
cc.render_setup((round(W_u * PX_PER_U), round(H_u * PX_PER_U)), SAMPLES, OUT, transparent=True)
scene.cycles.film_transparent_glass = True
os.makedirs(OUT, exist_ok=True)
def px_box(cx, cy, half):
    return max(0, (cx - half + PAD) / W_u), min(1, (cx + half + PAD) / W_u), max(0, 1 - (cy + half + PAD) / H_u), min(1, 1 - (cy - half + PAD) / H_u)
TILT = math.radians(6)
for v in VARIANTS:
    for cp in CAPS: cp.location.z = (-1.4 if v == 'down' else 0.0) * M
    led.data.materials[0] = led_on if v == 'down' else led_off
    for g, which in zip(GLOWS, ('lit-a', 'lit-b')): g.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 6.0 if v == which else 0.0
    pivot.rotation_euler = {'dl': (0, -TILT, 0), 'dr': (0, TILT, 0), 'du': (-TILT, 0, 0), 'dd': (TILT, 0, 0)}.get(v, (0, 0, 0))
    r = scene.render
    near = {'dl': (*DPAD, 17), 'dr': (*DPAD, 17), 'du': (*DPAD, 17), 'dd': (*DPAD, 17), 'lit-a': (*A_AT, 12), 'lit-b': (*B_AT, 12)}
    if v in near:
        r.use_border = True; r.use_crop_to_border = False
        r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = px_box(*near[v])
    else:
        r.use_border = False
    r.filepath = os.path.join(OUT, f'body_{v}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', v)
