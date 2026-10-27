# The pictures for the app of a handheld described by a spec (spec.json, next to its renders): the body (all up, the
# screen clear) as body.webp; each part that changes (a pressed button: cut from a variant round its centre, its
# edge feathered, its face a little darker) into parts.webp; and each light's glow (a lit render less the unlit one,
# past the denoiser's noise; white, its alpha its brightness; in pieces, ordered left to right, each given its name
# from the spec) into lights.webp. Prints game.js's PARTS and LIGHTS (x, y in the handheld's units from its top left).
#   python -I tools/handheld/assets_spec.py <renders dir> <out dir>
# spec.json: {"pad": 24, "parts": {"name": {"from": "down", "at": [x, y], "half": 8.5, "r": [6.4, 7.4], "darken": [5.8, 0.18]}},
#             "lights": {"lit-lanes": ["kick", "clap", "hats", "bass"]}}   (one name: all that light's pieces are it)
import json, math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
spec = json.load(open(os.path.join(SRC, 'spec.json')))
PAD = spec.get('pad', 12.0)
os.makedirs(OUT, exist_ok=True)
load = lambda v: Image.open(os.path.join(SRC, f'body_{v}.png')).convert('RGBA')
up = load('up')
PX = up.width / (spec['size'][0] + 2 * PAD)
up.save(os.path.join(OUT, 'body.webp'), 'WEBP', quality=92, method=6, alpha_quality=100)

def cut(img, centre, half, r_in, r_out, darken=None):
    cu, cv = centre
    x0, y0 = int(math.floor((cu - half + PAD) * PX)), int(math.floor((cv - half + PAD) * PX))
    x1, y1 = int(math.ceil((cu + half + PAD) * PX)), int(math.ceil((cv + half + PAD) * PX))
    c = np.asarray(img.crop((x0, y0, x1, y1))).astype(np.float32)
    ys, xs = np.mgrid[y0:y1, x0:x1]
    d = np.hypot((xs + 0.5) / PX - PAD - cu, (ys + 0.5) / PX - PAD - cv)
    t = np.clip((r_out - d) / (r_out - r_in), 0, 1)
    if darken:
        r, k = darken
        c[..., :3] *= (1 - k * np.clip((r - d) / 0.6, 0, 1))[..., None]
    c[..., 3] *= t * t * (3 - 2 * t)
    return Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA'), x0, y0

def sheet(pieces, name):
    sw = sum(p[1].width for p in pieces) + 2 * (len(pieces) - 1)
    sh = max(p[1].height for p in pieces)
    im = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
    table, x = {}, 0
    for key, piece, x0, y0 in pieces:
        im.paste(piece, (x, 0))
        table.setdefault(key, []).append([x, 0, piece.width, piece.height, round(x0 / PX - PAD, 4), round(y0 / PX - PAD, 4)])
        x += piece.width + 2
    im.save(os.path.join(OUT, name), 'WEBP', quality=92, method=6, alpha_quality=100)
    return table, im.size

parts = []
for name, p in spec.get('parts', {}).items():
    parts.append((name, *cut(load(p['from']), p['at'], p['half'], p['r'][0], p['r'][1], p.get('darken'))))
if parts:
    table, size = sheet(parts, 'parts.webp')
    print('parts', size, os.path.getsize(os.path.join(OUT, 'parts.webp')), 'bytes')
    print('PARTS = ' + json.dumps({k: v[0] for k, v in table.items()}))

pre = lambda im: (lambda a: a[..., :3] * (a[..., 3:] / 255))(np.asarray(im).astype(np.float32))
pieces = []
for variant, names in spec.get('lights', {}).items():
    d = np.clip(pre(load(variant)) - pre(up) - 4, 0, 255) * (255 / 251)
    peak = d.max(axis=2); d *= 255 / max(peak.max(), 1); peak = d.max(axis=2)
    lab, n = ndimage.label(ndimage.binary_dilation(peak > 2, iterations=8))
    found = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        part = (lab[sl] == k) & (peak[sl] > 2)
        if peak[sl][part].max() < 48 or part.sum() < 200: continue
        a = (d[sl] * (lab[sl] == k)[..., None]).max(axis=2, keepdims=True)
        found.append((sl[1].start, sl[0].start, Image.fromarray(np.concatenate([np.full(a.shape[:2] + (3,), 255.0), a], axis=2).astype(np.uint8), 'RGBA')))
    found.sort(key=lambda f: (f[0], f[1]))
    if len(names) == 1: names = names * len(found)   # (one light: all its pieces, its glow and where it shows round it)
    if len(found) != len(names): print(f'  {variant}: {len(found)} pieces for {len(names)} names')
    for (x0, y0, im), key in zip(found, names): pieces.append((key, im, x0, y0))
if pieces:
    table, size = sheet(pieces, 'lights.webp')
    print('lights', size, os.path.getsize(os.path.join(OUT, 'lights.webp')), 'bytes')
    print('LIGHTS = ' + json.dumps(table))
print('PX', round(PX, 4), 'body', up.size, os.path.getsize(os.path.join(OUT, 'body.webp')), 'bytes')
