# The handheld's pictures for the app, from a model's renders (model.py, clear.py): the body (all up, the screens clear) as body.webp,
# and the parts that change (A and B pressed, the light lit, the cross tilted four ways) cut out with soft round
# edges into parts.webp. Prints the parts table for game.js: name: [sx, sy, sw, sh, x, y] (the sheet's pixels; x, y
# in the device's units from its top-left, 1 unit = PX px).
#   python -I tools/handheld/assets.py <renders dir> renderer/handheld
import json, math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
PAD = 12.0
CY = 164.5
A_AT, B_AT, LED_AT, DPAD = (86.0, CY - 6.5), (69.0, CY + 1.0), (12.0, 76.4), (22.0, CY)

def load(v):
    return Image.open(os.path.join(SRC, f'body_{v}.png')).convert('RGBA')

up = load('up')
W, H = up.size
PX = W / (100 + 2 * PAD)  # (10.24 at full size)
assert abs(H - (190 + 2 * PAD) * PX) < 1.5, (W, H)
up.save(os.path.join(OUT, 'body.webp'), 'WEBP', quality=92, method=6, alpha_quality=100)

def cut(img, centre, half, r_in, r_out, darken=None):
    """A square round centre (units) +- half, its alpha eased to 0 between r_in and r_out (units); darken: (r, k) the
    button's face darkened by k inside r (units), so a press reads at a glance."""
    cu, cv = centre
    x0, y0 = int(math.floor((cu - half + PAD) * PX)), int(math.floor((cv - half + PAD) * PX))
    x1, y1 = int(math.ceil((cu + half + PAD) * PX)), int(math.ceil((cv + half + PAD) * PX))
    c = np.asarray(img.crop((x0, y0, x1, y1))).astype(np.float32)
    ys, xs = np.mgrid[y0:y1, x0:x1]
    d = np.hypot((xs + 0.5) / PX - PAD - cu, (ys + 0.5) / PX - PAD - cv)
    t = np.clip((r_out - d) / (r_out - r_in), 0, 1)
    feather = t * t * (3 - 2 * t)
    if darken:
        r, k = darken
        s = np.clip((r - d) / 0.6, 0, 1)
        c[..., :3] *= (1 - k * s)[..., None]
    c[..., 3] *= feather
    return Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA'), x0, y0

down = load('down')
parts = [('a', *cut(down, A_AT, 8.0, 6.4, 7.8, darken=(5.8, 0.28))),
         ('b', *cut(down, B_AT, 8.0, 6.4, 7.8, darken=(5.8, 0.28))),
         ('led', *cut(down, LED_AT, 2.6, 1.2, 2.5))]
for v in ('dl', 'dr', 'du', 'dd'):
    if os.path.exists(os.path.join(SRC, f'body_{v}.png')): parts.append((v, *cut(load(v), DPAD, 13.0, 11.2, 12.8)))

# the sheet: the parts side by side
sw = sum(p[1].width for p in parts) + 2 * (len(parts) - 1)
sh = max(p[1].height for p in parts)
sheet = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
table, x = {}, 0
for name, im, x0, y0 in parts:
    sheet.paste(im, (x, 0))
    table[name] = [x, 0, im.width, im.height, round(x0 / PX - PAD, 4), round(y0 / PX - PAD, 4)]
    x += im.width + 2
sheet.save(os.path.join(OUT, 'parts.webp'), 'WEBP', quality=92, method=6, alpha_quality=100)

# a check: the body with each part laid on at its place (the 'down' parts, and the cross tilted left)
check = up.copy()
for name, im, x0, y0 in parts:
    if name in ('a', 'b', 'led', 'dl'): check.alpha_composite(im, (x0, y0))
check.save(os.path.join(SRC, 'check-parts.png'))
print('PX', PX, 'body', W, H, os.path.getsize(os.path.join(OUT, 'body.webp')), 'bytes; parts', sheet.size, os.path.getsize(os.path.join(OUT, 'parts.webp')), 'bytes')
print('PARTS = ' + json.dumps(table))

# The lights (a model with them: its lit-<light> renders): the light each adds over the body, alone (lit less unlit,
# their colours weighted by their alpha), to be added over the body, in pieces (each light's parts that
# stand apart, as the bars along the two sides), as lights.webp (its alpha the light's brightness); printed as
# LIGHTS: the lane each shows, and its pieces [sx, sy, sw, sh, x, y].
LANE_OF = {'edge': 'kick', 'core': 'clap', 'spk': 'hats', 'ring': 'bass'}
pre = lambda im: (lambda a: a[..., :3] * (a[..., 3:] / 255))(np.asarray(im).astype(np.float32))
pieces = []
for light, lane in LANE_OF.items():
    if not os.path.exists(os.path.join(SRC, f'body_lit-{light}.png')): continue
    # (less a floor of 4: the denoiser leaves the two renders a little apart everywhere; and only what's bright and
    # big enough to be the light's: its specks of that difference left out)
    d = np.clip(pre(load(f'lit-{light}')) - pre(up) - 4, 0, 255) * (255 / 251)
    peak = d.max(axis=2)
    d *= 255 / peak.max()  # (each light at its brightest fully on: the app sets how much)
    peak = d.max(axis=2)
    lab, n = ndimage.label(ndimage.binary_dilation(peak > 2, iterations=8))
    found = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        part = (lab[sl] == k) & (peak[sl] > 2)
        if peak[sl][part].max() < 48 or part.sum() < 200: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        # (white, its alpha its brightness: added over a clear canvas it adds only the light; the app tints it)
        a = (d[sl] * (lab[sl] == k)[..., None]).max(axis=2, keepdims=True)
        found.append((x0, y0, Image.fromarray(np.concatenate([np.full(a.shape[:2] + (3,), 255.0), a], axis=2).astype(np.uint8), 'RGBA')))
    for x0, y0, im in sorted(found, key=lambda f: (f[0], f[1])): pieces.append((lane, im, x0, y0))
if pieces:
    lw = sum(p[1].width for p in pieces) + 2 * (len(pieces) - 1)
    lh = max(p[1].height for p in pieces)
    sheet = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
    lights, x = {}, 0
    for lane, im, x0, y0 in pieces:
        sheet.paste(im, (x, 0))
        lights.setdefault(lane, []).append([x, 0, im.width, im.height, round(x0 / PX - PAD, 4), round(y0 / PX - PAD, 4)])
        x += im.width + 2
    sheet.save(os.path.join(OUT, 'lights.webp'), 'WEBP', quality=90, method=6, alpha_quality=100)
    print('lights', sheet.size, os.path.getsize(os.path.join(OUT, 'lights.webp')), 'bytes')
    print('LIGHTS = ' + json.dumps(lights))
