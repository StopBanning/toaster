# Concept C, "Toaster Flip": the game's own two screens in a clamshell. Two halves of blue anodised aluminium
# with black glass faces, joined by a barrel hinge with a light strip along it (for the beat); the lid holds the top
# screen (the falling lanes), the base the bottom screen (the pads), the cross, A and B, SELECT and START and the
# speaker. Shown open on a table, the lid up at about 110 degrees.
#   blender -b --factory-startup --python flip.py -- <out.png> [samples] [view: hero | front] [res WxH]
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Euler
import cc
from cc import P, rrect, circle, rotated, prism, quad, cut, joined, bevel, mat, worn, image_mat, text, area, srgb, mixc, M

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(cc.HERE, 'renders', 'flip.png')
SAMPLES = int(argv[1]) if len(argv) > 1 else 192
VIEW = argv[2] if len(argv) > 2 else 'hero'
RES = tuple(int(v) for v in argv[3].split('x')) if len(argv) > 3 else (1080, 1350)
OPEN = float(os.environ.get('OPEN', 112.0))   # (degrees between the lid and the base)
TEX = os.path.join(cc.HERE, 'tex')

W = 100.0
LID_H, HINGE, BASE_H = 92.0, 10.0, 116.0
H = LID_H + HINGE + BASE_H
TL, TB = 7.0, 10.0                     # (the lid's and the base's thickness)
scene = cc.setup(W, H)
BLUE, NAVY, LIGHT = srgb((5, 29, 181)), srgb((2, 11, 69)), srgb((96, 160, 255))

# ---- materials -----------------------------------------------------------------------------------------------------
anod = cc.edged(worn(mat('anodised', mixc(BLUE, (0.02, 0.04, 0.2), 0.15), rough=0.36, metal=1.0), scale=40, amount=0.06, grain=0.06), bare=(0.75, 0.76, 0.78), edge=0.7, grime=0.25)
black_glass = mat('black_glass', (0.006, 0.006, 0.008), rough=0.04, coat=1.0, spec=0.6)
graphite = worn(mat('graphite', (0.035, 0.037, 0.045), rough=0.55, spec=0.35), scale=30, amount=0.06, grain=0.05)
cross_mat = mat('cross', (0.82, 0.84, 0.88), rough=0.4, coat=0.2)
a_mat = mat('A', BLUE, rough=0.2, coat=0.7, sss=0.08)
b_mat = mat('B', LIGHT, rough=0.2, coat=0.7, sss=0.08)
pill = mat('pill', (0.3, 0.32, 0.38), rough=0.6)
grey_print = mat('grey_print', (0.42, 0.45, 0.52), rough=0.5)
light_print = mat('light_print', LIGHT, rough=0.5)
steel = mat('steel', (0.55, 0.57, 0.62), rough=0.28, metal=1.0)
strip = mat('strip', LIGHT, rough=0.4, emit=(LIGHT, 3.5))
hole_dark = mat('hole_dark', (0.004, 0.004, 0.005), rough=0.9)
glass = bpy.data.materials.new('glass'); glass.use_nodes = True
_nt = glass.node_tree; _nt.nodes.remove(_nt.nodes['Principled BSDF'])
_tr = _nt.nodes.new('ShaderNodeBsdfTransparent'); _gl = _nt.nodes.new('ShaderNodeBsdfGlossy'); _gl.inputs['Roughness'].default_value = 0.03
_fr = _nt.nodes.new('ShaderNodeFresnel'); _fr.inputs['IOR'].default_value = 1.5; _mx = _nt.nodes.new('ShaderNodeMixShader')
_nt.links.new(_fr.outputs['Fac'], _mx.inputs['Fac']); _nt.links.new(_tr.outputs['BSDF'], _mx.inputs[1]); _nt.links.new(_gl.outputs['BSDF'], _mx.inputs[2])
_nt.links.new(_mx.outputs['Shader'], _nt.nodes['Material Output'].inputs['Surface'])

# ---- the lid (built lying flat above the hinge; then turned up about it) ----------------------------------------------------
lid_root = bpy.data.objects.new('lid', None); scene.collection.objects.link(lid_root)
lid_root.parent = cc.ROOT; lid_root.location = P(W / 2, LID_H + HINGE / 2, -TB / 2)
bpy.context.view_layer.update()
first = len(scene.objects)
lid = prism('lid_shell', rrect(0, 0, W, LID_H, [10, 10, 2, 2], seg=10), -TL, 0, mat=anod); bevel(lid, 1.6, segments=4, angle=50)
cut(lid, prism('lid_glass_pocket', rrect(3.0, 3.0, W - 6, LID_H - 5.0, [7.5, 7.5, 1.5, 1.5], seg=10), -0.9, 1))
prism('lid_glass', rrect(3.0, 3.0, W - 6, LID_H - 5.0, [7.5, 7.5, 1.5, 1.5], seg=10), -0.9, -0.08, mat=black_glass)
quad('top_screen', 10.0, 10.0, 80.0, 60.0, -0.07, mat=image_mat('top', os.path.join(TEX, 'top-4.06.png'), emit=1.5))
quad('lid_cover', 3.0, 3.0, W - 6, LID_H - 5.0, -0.03, mat=glass).visible_shadow = False
text('TOASTER', 50.0, 79.6, 3.2, grey_print, z=-0.06, spacing=1.6, font='orbitron-900.ttf')
for ob in list(scene.objects)[first:]:
    if ob.parent == cc.ROOT and ob != lid_root:
        mw = ob.matrix_world.copy(); ob.parent = lid_root; ob.matrix_world = mw

# ---- the hinge: a barrel, its light strip ------------------------------------------------------------------------------------------
import bmesh
def barrel(name, x0, x1, yc, zc, r, mat_, n=48):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    ring = [(r * math.cos(i * math.tau / n), r * math.sin(i * math.tau / n)) for i in range(n)]
    v0 = [bm.verts.new(P(x0, yc + a, zc + b)) for a, b in ring]; v1 = [bm.verts.new(P(x1, yc + a, zc + b)) for a, b in ring]
    for i in range(n): bm.faces.new((v0[i], v0[(i + 1) % n], v1[(i + 1) % n], v1[i]))
    bm.faces.new(list(reversed(v0))); bm.faces.new(v1); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); cc.own(ob); ob.data.materials.append(mat_)
    for p_ in me.polygons: p_.use_smooth = True
    return ob
HY, HZ = LID_H + HINGE / 2, -TB / 2
barrel('hinge', 14.0, 86.0, HY, HZ, 4.6, anod)
barrel('hinge_strip', 30.0, 70.0, HY, HZ, 4.75, strip, n=48)   # (a band of light round the barrel's middle)
for x0, x1 in ((14.0, 15.2), (84.8, 86.0)):
    barrel('hinge_cap', x0, x1, HY, HZ, 4.85, steel)

# ---- the base -------------------------------------------------------------------------------------------------------------------------
Y0 = LID_H + HINGE
base = prism('base_shell', rrect(0, Y0, W, BASE_H, [2, 2, 12, 12], seg=10), -TB, 0, mat=anod); bevel(base, 1.6, segments=4, angle=50)
FACE = rrect(3.0, Y0 + 2.0, W - 6, BASE_H - 5.0, [1.5, 1.5, 9.5, 9.5], seg=10)
cut(base, prism('face_pocket', FACE, -0.9, 1))
face = prism('base_face', FACE, -0.9, -0.08, mat=graphite)
SCR = (10.0, Y0 + 7.0, 80.0, 60.0)
cut(face, prism('screen_win', rrect(SCR[0] - 1.6, SCR[1] - 1.6, SCR[2] + 3.2, SCR[3] + 3.2, 3.0), -0.5, 1))
prism('screen_glass', rrect(SCR[0] - 1.6, SCR[1] - 1.6, SCR[2] + 3.2, SCR[3] + 3.2, 3.0), -0.9, -0.3, mat=black_glass)
quad('bottom_screen', *SCR, -0.29, mat=image_mat('bottom', os.path.join(TEX, 'bottom-4.06.png'), emit=1.5))
CY = Y0 + 90.0
DP = (21.0, CY)
cut(face, prism('dwell', circle(*DP, 10.6, 64), -0.5, 1))
hw, he = 2.8, 8.4
cross = [(DP[0] - hw, DP[1] - he), (DP[0] + hw, DP[1] - he), (DP[0] + hw, DP[1] - hw), (DP[0] + he, DP[1] - hw), (DP[0] + he, DP[1] + hw),
         (DP[0] + hw, DP[1] + hw), (DP[0] + hw, DP[1] + he), (DP[0] - hw, DP[1] + he), (DP[0] - hw, DP[1] + hw), (DP[0] - he, DP[1] + hw),
         (DP[0] - he, DP[1] - hw), (DP[0] - hw, DP[1] - hw)]
c_ = prism('cross', cross, -0.6, 1.5, mat=cross_mat); bevel(c_, 0.6, segments=4)
for name, at, m_ in (('A', (84.0, CY - 5.5), a_mat), ('B', (71.0, CY + 3.0), b_mat)):
    cut(face, prism(f'bwell{name}', circle(*at, 5.6, 64), -0.5, 1))
    bt = prism(f'btn{name}', circle(*at, 4.9, 96), -0.6, 1.9, mat=m_); bevel(bt, 1.5, segments=6)
    text(name, at[0] + 6.2, at[1] + 4.6, 1.8, grey_print, z=-0.07, font='michroma.ttf')
for i, px in enumerate((42.0, 58.0)):
    py = Y0 + 106.0
    cut(face, prism(f'pwell{i}', rotated(rrect(px - 4.4, py - 1.5, 8.8, 3.0, 1.5), px, py, -0.4), -0.5, 1))
    p_ = prism(f'pill{i}', rotated(rrect(px - 3.8, py - 1.0, 7.6, 2.0, 1.0), px, py, -0.4), -0.6, 0.8, mat=pill); bevel(p_, 0.5, segments=3)
    text(('SELECT', 'START')[i], px, py + 3.6, 1.35, grey_print, z=-0.07, spacing=1.2)
holes = []
for i in range(4):
    for j in range(3):
        x, y = 80.0 + i * 2.6 + (1.3 if j % 2 else 0), Y0 + 101.0 + j * 2.4
        holes.append(prism(f'h{i}{j}', circle(x, y, 0.7, 20), -1.4, 1))
cut(face, joined('grille', holes))
text('LIVE CODE POCKET', 50.0, Y0 + 72.0, 1.5, light_print, z=-0.07, spacing=1.5)

cc.smooth_all()

if VIEW == 'hero':
    lid_root.rotation_euler = (math.radians(180.0 - OPEN), 0, 0)
    cc.ROOT.rotation_euler = (0, 0, math.radians(float(os.environ.get('YAW', -18.0))))
    cc.ROOT.location = (0, -0.02, TB * M)
    import bmesh as _bm
    me = bpy.data.meshes.new('sweep'); bm = _bm.new()
    R, N = 0.35, 24
    prof = [(-2.0, 0.0)] + [(0.6 + R * math.sin(a * math.pi / 2 / N), R - R * math.cos(a * math.pi / 2 / N)) for a in range(N + 1)] + [(0.6 + R, 3.0)]
    verts = [[bm.verts.new((xx, yy, zz)) for (yy, zz) in prof] for xx in (-3.0, 3.0)]
    for i in range(len(prof) - 1): bm.faces.new((verts[0][i], verts[1][i], verts[1][i + 1], verts[0][i + 1]))
    bm.to_mesh(me); bm.free()
    sw = bpy.data.objects.new('sweep', me); scene.collection.objects.link(sw)
    sw.data.materials.append(mat('backdrop', (0.55, 0.57, 0.6), rough=0.8, spec=0.2))
    for p_ in sw.data.polygons: p_.use_smooth = True
    cd = bpy.data.cameras.new('cam'); cd.lens = 70; cd.dof.use_dof = True; cd.dof.aperture_fstop = 9.0
    cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam)
    cam.location = (0.10, -0.50, 0.34)
    target = Vector((0.0, -0.035, 0.03))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.focus_distance = (target - cam.location).length
    scene.camera = cam
    area('key', (-0.45, -0.35, 0.65), 0.9, 22.0, aim=(0, 0, 0.03))
    area('fill', (0.55, -0.45, 0.30), 0.8, 6.0, aim=(0, 0, 0.03))
    area('rim', (0.2, 0.55, 0.40), 0.25, 14.0, aim=(0, 0, 0.05), size_y=0.9, shape='RECTANGLE')
    w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.04, 0.12, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.12
else:
    cc.front_shot(H)
cc.render_setup(RES, SAMPLES, OUT)
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
