# Concept B, "Toaster Groove": a pocket groovebox. A chunky matte off-white body that flows into two grips;
# one 4:3 screen (the falling lanes) framed by a blue line; a little status display (the song, the tempo) between two
# small buttons; the bottom screen's sixteen pads as real backlit silicone pads (the drums across the top, the key's
# notes under them), lit as the game lights them; a knurled brass tempo wheel in the right edge; the speaker in the
# right grip, the name on the left one.
#   blender -b --factory-startup --python groove.py -- <out.png> [samples] [view: hero | front] [res WxH]
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import cc
from cc import P, rrect, circle, rotated, prism, quad, cut, joined, bevel, mat, worn, image_mat, text, srgb, mixc, M

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(cc.HERE, 'renders', 'groove.png')
SAMPLES = int(argv[1]) if len(argv) > 1 else 192
VIEW = argv[2] if len(argv) > 2 else 'hero'
RES = tuple(int(v) for v in argv[3].split('x')) if len(argv) > 3 else (1080, 1350)
TEX = os.path.join(cc.HERE, 'tex')

W, H, D = 104.0, 189.0, 17.0
scene = cc.setup(W, H)
BLUE, NAVY, LIGHT = srgb((5, 29, 181)), srgb((2, 11, 69)), srgb((96, 160, 255))
KICK, CLAP, HATS, BASS, CHORD = (srgb(c) for c in ((255, 52, 128), (255, 160, 20), (30, 220, 255), (130, 250, 60), (175, 110, 255)))

# ---- materials -----------------------------------------------------------------------------------------------------
shell = cc.edged(worn(mat('shell', (0.8, 0.8, 0.775), rough=0.55, sss=0.04, spec=0.4), scale=30, amount=0.05, grain=0.07, scuff=0.94), bare=(0.86, 0.86, 0.84), edge=0.25, grime=0.3)
black_glass = mat('black_glass', (0.006, 0.006, 0.008), rough=0.05, coat=1.0, spec=0.6)
blue_print = mat('blue_print', BLUE, rough=0.5)
navy_print = mat('navy_print', NAVY, rough=0.5)
grey_btn = mat('grey_btn', (0.55, 0.56, 0.58), rough=0.45, coat=0.2)
brass = mat('brass', srgb((205, 160, 85)), rough=0.28, metal=1.0)
hole_dark = mat('hole_dark', (0.004, 0.004, 0.005), rough=0.9)
glass = bpy.data.materials.new('glass'); glass.use_nodes = True
_nt = glass.node_tree; _nt.nodes.remove(_nt.nodes['Principled BSDF'])
_tr = _nt.nodes.new('ShaderNodeBsdfTransparent'); _gl = _nt.nodes.new('ShaderNodeBsdfGlossy'); _gl.inputs['Roughness'].default_value = 0.03
_fr = _nt.nodes.new('ShaderNodeFresnel'); _fr.inputs['IOR'].default_value = 1.5; _mx = _nt.nodes.new('ShaderNodeMixShader')
_nt.links.new(_fr.outputs['Fac'], _mx.inputs['Fac']); _nt.links.new(_tr.outputs['BSDF'], _mx.inputs[1]); _nt.links.new(_gl.outputs['BSDF'], _mx.inputs[2])
_nt.links.new(_mx.outputs['Shader'], _nt.nodes['Material Output'].inputs['Surface'])

def pad_mat(name, color=None, lit=0.0):
    """Translucent silicone: milky when dark, its LED's colour glowing through it when lit."""
    if color and lit: return mat(name, mixc(color, (1, 1, 1), 0.15), rough=0.55, sss=0.2, spec=0.3, emit=(color, lit))
    base = mixc((0.6, 0.62, 0.66), color, 0.35) if color else (0.6, 0.62, 0.66)
    return mat(name, base, rough=0.62, sss=0.2, spec=0.3)

# ---- the body: a block flowing into two grips (one smooth outline), its edges well rounded ------------------------------------
def f(x, y):
    box = cc.sd_box(x, y, 52.0, 86.0, 52.0, 86.0, 14.0)
    grips = cc.smin(cc.sd_circle(x, y, 24.0, 168.0, 22.0), cc.sd_circle(x, y, 80.0, 168.0, 22.0), 12.0)
    return cc.smin(box, grips, 22.0)
OUTLINE = cc.trace(f, (52.0, -5.0), ds=0.5)
body = prism('body', OUTLINE, -D, 0, mat=shell)
bevel(body, 4.2, segments=8, angle=40)
BEZ = (8.0, 7.0, 88.0, 70.0)
cut(body, prism('bezel_pocket', rrect(BEZ[0] - 0.2, BEZ[1] - 0.2, BEZ[2] + 0.4, BEZ[3] + 0.4, 6.2), -1.0, 1))
OLED = [(30.0, 79.6), (74.0, 79.6), (76.5, 82.6), (74.0, 85.6), (30.0, 85.6), (27.5, 82.6)]
cut(body, prism('oled_pocket', OLED, -0.6, 1))
PAD, GAP, PX0, PY0 = 14.0, 2.6, 52.0 - (4 * 14.0 + 3 * 2.6) / 2, 89.0
for r_ in range(4):
    for c_ in range(4):
        x, y = PX0 + c_ * (PAD + GAP), PY0 + r_ * (PAD + GAP)
        cut(body, prism(f'padwell{r_}{c_}', rrect(x - 0.5, y - 0.5, PAD + 1.0, PAD + 1.0, 3.4, seg=4), -1.2, 1))
BTNS = [(19.0, 82.6), (85.0, 82.6)]
for i, (x, y) in enumerate(BTNS):
    cut(body, prism(f'btnwell{i}', circle(x, y, 3.9, 48), -0.8, 1))
holes = []
for i in range(5):
    for j in range(4):
        x, y = 68.0 + i * 3.0 + (1.5 if j % 2 else 0), 166.0 + j * 2.7
        if (x - 79.0) ** 2 + (y - 170.0) ** 2 > 9.5 ** 2: continue
        holes.append(prism(f'h{i}{j}', circle(x, y, 0.8, 24), -1.6, 1))
        prism(f'hf{i}{j}', circle(x, y, 0.82, 24), -1.62, -1.5, mat=hole_dark)
cut(body, joined('grille', holes))
cut(body, prism('wheel_slot', rrect(96.0, 15.0, 12.0, 18.0, 1.5, seg=4), -13.5, -3.5))   # (the tempo wheel's slot, in the right edge)
bevel(body, 0.15, segments=2, angle=50)

# ---- the screen and its blue line ---------------------------------------------------------------------------------------------
prism('bezel', rrect(*BEZ, 6.0), -1.0, -0.12, mat=black_glass)
DISP = (12.0, 10.5, 80.0, 60.0)
quad('display', *DISP, -0.11, mat=image_mat('display', os.path.join(TEX, 'top-4.06.png'), emit=1.5))
quad('cover', BEZ[0], BEZ[1], BEZ[2], BEZ[3], -0.05, mat=glass).visible_shadow = False
line = prism('accent', rrect(BEZ[0] - 2.6, BEZ[1] - 2.6, BEZ[2] + 5.2, BEZ[3] + 5.2, 8.4, seg=10), -0.02, 0.004, mat=blue_print)
cut(line, prism('accent_in', rrect(BEZ[0] - 2.15, BEZ[1] - 2.15, BEZ[2] + 4.3, BEZ[3] + 4.3, 7.95, seg=10), -1, 1))

# ---- the status display, its two buttons ----------------------------------------------------------------------------------------
prism('oled_glass', OLED, -0.6, -0.08, mat=black_glass)
quad('oled', 31.0, 80.4, 42.0, 4.4, -0.07, mat=image_mat('oled', os.path.join(TEX, 'oled.png'), emit=2.2))
for i, ((x, y), glyph) in enumerate(zip(BTNS, ('▶', '■'))):
    b = prism(f'btn{i}', circle(x, y, 3.5, 48), -0.8, 1.0, mat=grey_btn); bevel(b, 0.9, segments=5)
    ring = prism(f'btnring{i}', circle(x, y, 4.35, 48), -0.02, 0.004, mat=blue_print)
    cut(ring, prism(f'btnring_in{i}', circle(x, y, 3.95, 48), -1, 1))

# ---- the pads: the drums, then the notes of A minor from A; lit as the game's frame shows them -------------------------------------
labels = ['KICK', 'CLAP', 'HAT', 'OPEN', 'A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab']
cols = [KICK, CLAP, HATS, HATS] + [None] * 12
lit = {0: 2.4, 7: 2.0, 11: 1.4, 14: 1.4}             # (KICK hit; C the bass; E, G the chord)
litcol = {0: KICK, 7: BASS, 11: CHORD, 14: CHORD}
in_key = {'A', 'B', 'C', 'D', 'E', 'F', 'G'}
for k, name in enumerate(labels):
    r_, c_ = divmod(k, 4)
    x, y = PX0 + c_ * (PAD + GAP), PY0 + r_ * (PAD + GAP)
    m = pad_mat(f'pad{k}', litcol.get(k, cols[k]), lit.get(k, 0.0))
    p = prism(f'pad{k}', rrect(x, y, PAD, PAD, 3.0, seg=4), -1.2, 1.6, mat=m); bevel(p, 1.1, segments=5)
    ink = mat(f'ink{k}', (0.02, 0.025, 0.05) if k in lit else (mixc(cols[k], (0.02, 0.02, 0.04), 0.55) if cols[k] else ((0.06, 0.065, 0.1) if name in in_key else (0.22, 0.23, 0.28))), rough=0.6)
    text(name, x + PAD / 2, y + PAD / 2, 2.4 if len(name) > 2 else 4.6, ink, z=1.605, spacing=1.05, font='michroma.ttf' if len(name) > 2 else 'nunito-900.ttf')

# ---- the tempo wheel, the name, the speaker's mark ------------------------------------------------------------------------------
cc.knurl('wheel', 101.5, 24.0, -8.5, 7.6, 7.0, brass, n=60, depth=0.32)
for x0 in (10.0, 66.0):   # (the shoulder buttons, along the top edge)
    sh = prism('shoulder', rrect(x0, -2.6, 28.0, 6.0, 2.6, seg=6), -13.0, -4.0, mat=grey_btn); bevel(sh, 1.2, segments=5)
text('toaster', 25.0, 170.0, 7.4, navy_print, z=0.004, spacing=1.0, font='nunito-900.ttf')
text('GROOVE', 25.0, 177.4, 1.9, blue_print, z=0.004, spacing=1.45)

cc.smooth_all()
if VIEW == 'hero':
    cc.hero_shot(H, yaw=-22.0)
else:
    cc.front_shot(H)
cc.render_setup(RES, SAMPLES, OUT)
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
