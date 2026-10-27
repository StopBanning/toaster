# The app's pictures of a handheld seen from the hero picture's angle (a stance: concepts/metal.py's 'stance' view), as
# assets_spec.py makes them for one seen square on: the body (all up, its screens clear) as body.webp; its shadow alone (on
# the wall behind it, for the app to lay on the code in the theme's ink) as shadow.webp, at half size; each part that
# changes cut from its variant round where it is in the picture (its edge feathered in the handheld's own units, so the cut
# is the part's own circle seen at the angle) into parts.webp; each light's glow (lit less unlit) into lights.webp. All of
# them cropped to the body and its shadow. Prints game.js's STANCE: where things are, in the cropped picture's pixels, and
# the mappings (homographies) from the handheld's units on its face and on its label to them.
#   python -I tools/handheld/assets_stance.py <renders dir: stance.json, body_*.png> <out dir>
import json, math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
info = json.load(open(os.path.join(SRC, 'stance.json')))
os.makedirs(OUT, exist_ok=True)
W_, H_ = info.get('size', [100.0, 190.0])   # (the handheld's size, units: the metal one's unless its stance.json says)
load = lambda v: Image.open(os.path.join(SRC, f'body_{v}.png')).convert('RGBA')

def homography(src, dst):
    """The 3 x 3 H with H (x, y, 1) ~ (X, Y, 1) for four point pairs."""
    A, b = [], []
    for (x, y), (X, Y) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.append(X)
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.append(Y)
    h = np.linalg.solve(np.array(A, float), np.array(b, float))
    return np.append(h, 1.0).reshape(3, 3)

CORNERS = [(0, 0), (W_, 0), (W_, H_), (0, H_)]
planes = {float(z): homography(CORNERS, pts) for z, pts in info['planes'].items()}
plane = lambda z: planes[min(planes, key=lambda k: abs(k - z))]

# the crop: the body and the shadow (its faint noise left out), a little room round them
up = load('up')
shadow = np.asarray(load('shadow'))[..., 3].astype(np.float32)
shadow[shadow < 6] = 0
shadow = ndimage.gaussian_filter(shadow, 1.2)   # (the denoiser's grain out of it: it's soft anyway)
ua = np.asarray(up)[..., 3]
ys, xs = np.nonzero((ua > 3) | (shadow > 4))
x0, y0, x1, y1 = int(max(0, xs.min() - 2)), int(max(0, ys.min() - 2)), int(min(up.width, xs.max() + 3)), int(min(up.height, ys.max() + 3))
crop = lambda im: im.crop((x0, y0, x1, y1))
body = crop(up)
body.save(os.path.join(OUT, 'body.webp'), 'WEBP', quality=92, method=6, alpha_quality=100)
sh = Image.fromarray(np.clip(shadow[y0:y1, x0:x1], 0, 255).astype(np.uint8), 'L')
sh = sh.resize((math.ceil(sh.width / 2), math.ceil(sh.height / 2)), Image.LANCZOS)
black = Image.new('RGBA', sh.size, (0, 0, 0, 0)); black.putalpha(sh)
black.save(os.path.join(OUT, 'shadow.webp'), 'WEBP', quality=90, method=6, alpha_quality=90)

def to_units(Hm, px, py):
    """Pixels (arrays, the uncropped picture's) back to the handheld's units on the plane Hm maps."""
    Hi = np.linalg.inv(Hm)
    X = Hi[0, 0] * px + Hi[0, 1] * py + Hi[0, 2]; Y = Hi[1, 0] * px + Hi[1, 1] * py + Hi[1, 2]; Z = Hi[2, 0] * px + Hi[2, 1] * py + Hi[2, 2]
    return X / Z, Y / Z

def project(Hm, x, y):
    v = Hm @ np.array([x, y, 1.0]); return v[0] / v[2], v[1] / v[2]

def cut(img, centre, half, r_in, r_out, z, darken=None):
    """A part from its variant: the pixels within r_out units of its centre on the plane at height z, the edge feathered
    from r_in, its face (within darken's r) a little darker."""
    Hm = plane(z); cu, cv = centre
    pts = [project(Hm, cu + dx * half, cv + dy * half) for dx in (-1, 1) for dy in (-1, 1)]
    bx0, by0 = int(math.floor(min(p[0] for p in pts))), int(math.floor(min(p[1] for p in pts)))
    bx1, by1 = int(math.ceil(max(p[0] for p in pts))), int(math.ceil(max(p[1] for p in pts)))
    c = np.asarray(img.crop((bx0, by0, bx1, by1))).astype(np.float32)
    gy, gx = np.mgrid[by0:by1, bx0:bx1]
    ux, uy = to_units(Hm, gx + 0.5, gy + 0.5)
    d = np.hypot(ux - cu, uy - cv)
    t = np.clip((r_out - d) / (r_out - r_in), 0, 1)
    if darken:
        r, k = darken
        c[..., :3] *= (1 - k * np.clip((r - d) / 0.6, 0, 1))[..., None]
    c[..., 3] *= t * t * (3 - 2 * t)
    return Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA'), bx0 - x0, by0 - y0

def sheet(pieces, name):
    sw = sum(p[1].width for p in pieces) + 2 * (len(pieces) - 1)
    shh = max(p[1].height for p in pieces)
    im = Image.new('RGBA', (sw, shh), (0, 0, 0, 0))
    table, x = {}, 0
    for key, piece, px0, py0 in pieces:
        im.paste(piece, (x, 0))
        table.setdefault(key, []).append([x, 0, piece.width, piece.height, int(px0), int(py0)])
        x += piece.width + 2
    im.save(os.path.join(OUT, name), 'WEBP', quality=92, method=6, alpha_quality=100)
    return table, im.size

# the parts: the buttons cut on a plane between their tops up and down (so a pressed one's whole cap is in its cut), wider
# than square on (seen at an angle, a cap's top stands off its base)
CY = 164.5
PARTS = {   # (name: variant, centre, half, r_in, r_out, plane z, darken) -- a handheld's own stance.json may list its own
    'a': ('down', (86.0, CY - 6.5), 9.6, 7.3, 8.6, 1.0, (6.1, 0.18)),
    'b': ('down', (69.0, CY + 1.0), 9.6, 7.3, 8.6, 1.0, (6.1, 0.18)),
    'led': ('down', (12.0, 76.4), 2.8, 1.2, 2.5, 0.0, None),
    'dl': ('dl', (22.0, CY), 14.4, 12.0, 13.6, 1.0, None),
    'dr': ('dr', (22.0, CY), 14.4, 12.0, 13.6, 1.0, None),
    'du': ('du', (22.0, CY), 14.4, 12.0, 13.6, 1.0, None),
    'dd': ('dd', (22.0, CY), 14.4, 12.0, 13.6, 1.0, None),
}
if 'parts' in info: PARTS = {k: (v[0], tuple(v[1]), *v[2:6], tuple(v[6]) if v[6] else None) for k, v in info['parts'].items()}
variants = {}
parts = []
for name, (v, at, half, r_in, r_out, z, darken) in PARTS.items():
    if v not in variants: variants[v] = load(v)
    parts.append((name, *cut(variants[v], at, half, r_in, r_out, z, darken)))
table, size = sheet(parts, 'parts.webp')
print('parts', size, os.path.getsize(os.path.join(OUT, 'parts.webp')), 'bytes')
PARTS_T = {k: v[0] for k, v in table.items()}

pre = lambda im: (lambda a: a[..., :3] * (a[..., 3:] / 255))(np.asarray(im).astype(np.float32))
pieces = []
for variant, name in (('lit-a', 'kick'), ('lit-b', 'clap')):
    d = np.clip(pre(crop(load(variant))) - pre(body) - 4, 0, 255) * (255 / 251)
    peak = d.max(axis=2); d *= 255 / max(peak.max(), 1); peak = d.max(axis=2)
    lab, n = ndimage.label(ndimage.binary_dilation(peak > 2, iterations=8))
    found = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        part = (lab[sl] == k) & (peak[sl] > 2)
        if peak[sl][part].max() < 48 or part.sum() < 200: continue
        a = (d[sl] * (lab[sl] == k)[..., None]).max(axis=2, keepdims=True)
        found.append((sl[1].start, sl[0].start, Image.fromarray(np.concatenate([np.full(a.shape[:2] + (3,), 255.0), a], axis=2).astype(np.uint8), 'RGBA')))
    print(f'  {variant}: {len(found)} pieces')
    for (px0, py0, im) in sorted(found, key=lambda f: (f[0], f[1])): pieces.append((name, im, px0, py0))
table, size = sheet(pieces, 'lights.webp')
print('lights', size, os.path.getsize(os.path.join(OUT, 'lights.webp')), 'bytes')

# the mappings, into the cropped picture
T = np.array([[1, 0, -x0], [0, 1, -y0], [0, 0, 1]], float)
flat = lambda Hm: [round(float(v), 7) for v in ((T @ Hm) / (T @ Hm)[2, 2]).ravel()]
front = plane(info.get('face', -0.11))
cx_m, cy_m = W_ / 2, (info['screens']['top'][1] + info['screens']['top'][3] / 2) if 'screens' in info else 77
mmx = np.hypot(*np.subtract(project(front, cx_m + 1, cy_m), project(front, cx_m - 1, cy_m))) / 2
mmy = np.hypot(*np.subtract(project(front, cx_m, cy_m + 1), project(front, cx_m, cy_m - 1))) / 2
led = project(plane(0.0), *info.get('led', [12.0, 76.4]))
dev = info['dev']
spec = {'img': [body.width, body.height], 'dev': [dev[0] - x0, dev[1] - y0, dev[2] - x0, dev[3] - y0],
        'front': flat(front), 'label': flat(plane(min(planes))), 'mm': round(float((mmx + mmy) / 2), 4),
        'led': [round(led[0] - x0, 2), round(led[1] - y0, 2)], 'parts': PARTS_T, 'lights': table}
print('STANCE = ' + json.dumps(spec, separators=(', ', ': ')))
print('body', body.size, os.path.getsize(os.path.join(OUT, 'body.webp')), 'bytes; shadow', sh.size, os.path.getsize(os.path.join(OUT, 'shadow.webp')), 'bytes')
