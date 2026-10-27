# Scratch: a second round of stickers for the metal handheld (the user, Oct 27: "other y2k style, coder ... stickers",
# and other versions of LIVE). Die-cut where a sticker is, a little worn, about 25 px a mm. Into tex/ as sticker-<name>.png.
#   python -I stickers2.py
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
F = lambda name, px: ImageFont.truetype(os.path.join(FONTS, name), px)
WHITE, INK, PINK, HOT, NAVY = (246, 246, 242), (18, 16, 20), (255, 92, 191), (255, 46, 140), (2, 11, 69)

def wear(im, edge=0.3, scuffs=6, seed=1):
    """Rubbed: the alpha eaten a little at the edges, some faint scuffs across the print (as textures.py's)."""
    r = random.Random(seed)
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    noise = np.asarray(Image.effect_noise((w, h), 60).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    alpha = a[..., 3] / 255
    inner = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    alpha = np.where((inner < 0.72) & (noise > 1 - edge), alpha * 0.15, alpha)
    a[..., 3] = alpha * 255
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    for _ in range(scuffs):
        x, y = r.uniform(0, w), r.uniform(0, h); L = r.uniform(8, 40); t = r.uniform(-0.5, 0.5)
        d.line((x, y, x + L * math.cos(t), y + L * math.sin(t)), fill=(255, 255, 255, r.randint(10, 26)), width=1)
    return out

def diecut(im, pad=18):
    """A white border round whatever's drawn (its alpha grown by pad px, rounded), under it."""
    a = im.split()[3]
    big = Image.new('L', (im.width + 2 * pad, im.height + 2 * pad), 0); big.paste(a, (pad, pad))
    border = big.filter(ImageFilter.MaxFilter(2 * (pad // 2) + 1)).filter(ImageFilter.MaxFilter(2 * (pad - pad // 2) + 1)).filter(ImageFilter.GaussianBlur(2.5)).point(lambda v: 255 if v > 110 else 0)
    out = Image.new('RGBA', big.size, (0, 0, 0, 0))
    out.paste(Image.new('RGBA', big.size, WHITE + (255,)), (0, 0), border)
    out.alpha_composite(im, (pad, pad))
    return out

def foil(w, h, seed=3, angle=(0.8, 0.5)):
    """Holographic foil: a rainbow across it at an angle, a fine shimmer."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = ((xx / w) * angle[0] + (yy / h) * angle[1]) % 1.0
    stops = [(0.0, (255, 120, 200)), (0.2, (190, 140, 255)), (0.4, (110, 200, 255)), (0.6, (130, 255, 200)), (0.8, (255, 240, 140)), (1.0, (255, 120, 200))]
    rgb = np.zeros((h, w, 3), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1); f = ((t - p0) / (p1 - p0))[..., None]
        rgb[m] = (np.array(c0) * (1 - f) + np.array(c1) * f)[m]
    sh = np.asarray(Image.effect_noise((w, h), 40).filter(ImageFilter.GaussianBlur(2))).astype(np.float32)[..., None] / 255
    return Image.fromarray(np.clip(rgb * (0.85 + 0.3 * sh), 0, 255).astype(np.uint8), 'RGB').convert('RGBA')

def sparkle(d, cx, cy, r, fill=(255, 255, 255, 255)):
    k = 0.22
    d.polygon([(cx, cy - r), (cx + r * k, cy - r * k), (cx + r, cy), (cx + r * k, cy + r * k), (cx, cy + r), (cx - r * k, cy + r * k), (cx - r, cy), (cx - r * k, cy - r * k)], fill=fill)

def save(im, name):
    im.save(os.path.join(OUT, f'sticker-{name}.png')); return name, im.size

made = []

# ---------------------------------------------------------------- LIVE, five ways (each about 13 x 4.6 mm)
def live_dymo(tape=(24, 24, 28), seed=21, name='live-dymo'):
    """Label-maker tape: the letters pressed up out of it, gone pale where the plastic stretched; cut ends."""
    W, H = 340, 118
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.polygon([(6, 4), (W - 2, 0), (W - 8, H - 1), (0, H - 4)], fill=tape + (255,))
    a = np.asarray(im).astype(np.float32)
    yy = np.arange(H, dtype=np.float32)[:, None] / H
    gloss = 1 + 0.18 * np.exp(-((yy - 0.22) / 0.08) ** 2) - 0.1 * yy   # (a shine along it, darker to the bottom)
    grain = np.asarray(Image.effect_noise((W, H), 18)).astype(np.float32) / 255 - 0.5
    a[..., :3] = np.clip(a[..., :3] * gloss[..., None] + grain[..., None] * 10, 0, 255)
    im = Image.fromarray(a.astype(np.uint8))
    text = Image.new('RGBA', (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(text)
    fnt = F('jbm-800.ttf', 72)
    td.text((W / 2 + 4, H / 2 + 2), 'L I V E', font=fnt, fill=(236, 236, 232, 255), anchor='mm')
    t = text.split()[3]
    hi = Image.new('RGBA', (W, H), (255, 255, 255, 0)); hi.putalpha(t.point(lambda v: v * 0.5))
    lo = Image.new('RGBA', (W, H), (0, 0, 0, 0)); lo.putalpha(t.point(lambda v: v * 0.7))
    im.alpha_composite(lo, (2, 3)); im.alpha_composite(hi, (-1, -1))
    im.alpha_composite(text.filter(ImageFilter.GaussianBlur(0.7)))
    return save(wear(im, edge=0.15, scuffs=6, seed=seed), name)
made.append(live_dymo())
made.append(live_dymo(tape=(214, 30, 120), seed=22, name='live-dymo-pink'))

def live_onair():
    """An ON AIR lamp: a red glass sign in a black frame, lit, its letters white."""
    W, H = 330, 128
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=18, fill=(14, 14, 16, 255))
    glass = Image.new('RGBA', (W - 24, H - 24), (0, 0, 0, 0))
    g = np.zeros((H - 24, W - 24, 4), np.float32)
    yy = np.linspace(0, 1, H - 24)[:, None]
    g[..., 0] = 235 - 60 * yy; g[..., 1] = 30 - 10 * yy; g[..., 2] = 45 - 15 * yy; g[..., 3] = 255
    glass = Image.fromarray(g.astype(np.uint8))
    m = Image.new('L', glass.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, glass.width - 1, glass.height - 1), radius=10, fill=255)
    im.paste(glass, (12, 12), m)
    d = ImageDraw.Draw(im)
    d.text((W / 2, H / 2 + 2), 'ON AIR', font=F('michroma.ttf', 46), fill=(255, 244, 240, 255), anchor='mm')
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((16, 14, W - 17, H // 2 - 6), radius=8, fill=(255, 255, 255, 40))
    im.alpha_composite(sh)
    return save(wear(im, edge=0.12, scuffs=4, seed=23), 'live-onair')
made.append(live_onair())

def live_holo():
    """Holographic foil, die-cut: LIVE in Zen Dots, a sparkle."""
    W, H = 300, 112
    fo = foil(W, H, seed=5, angle=(1.0, 0.3))
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=30, fill=255)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); im.paste(fo, (0, 0), m)
    d = ImageDraw.Draw(im)
    d.text((W / 2 - 10, H / 2 + 3), 'LIVE', font=F('zendots.ttf', 64), fill=NAVY + (255,), anchor='mm')
    sparkle(d, W - 34, 30, 18); sparkle(d, W - 54, 74, 8)
    return save(wear(diecut(im, pad=12), edge=0.25, scuffs=4, seed=24), 'live-holo')
made.append(live_holo())

def live_print(ink=(240, 240, 236)):
    """Printed straight onto the metal, no sticker: a red dot and LIVE, spaced out, as the name is engraved beside it."""
    W, H = 300, 90
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((10, 30, 40, 60), fill=(255, 36, 54, 255))
    d.text((60, H / 2 + 2), 'L I V E', font=F('michroma.ttf', 44), fill=ink + (255,), anchor='lm')
    return save(wear(im, edge=0.35, scuffs=10, seed=25), 'live-print')
made.append(live_print())

def live_led():
    """A little LED panel: smoked black glass, LIVE in red dots, the unlit ones faint."""
    W, H = 330, 120
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=12, fill=(10, 9, 12, 255), outline=(60, 60, 66, 255), width=3)
    GL = {'L': '10000 10000 10000 10000 10000 10000 11111', 'I': '11111 00100 00100 00100 00100 00100 11111',
          'V': '10001 10001 10001 10001 10001 01010 00100', 'E': '11111 10000 10000 11110 10000 10000 11111'}
    p, r = 11, 4
    x0, y0 = (W - (4 * 6 - 1) * p) / 2 + p / 2, (H - 7 * p) / 2 + p / 2
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for i, ch in enumerate('LIVE'):
        rows = GL[ch].split()
        for y in range(7):
            for x in range(6):
                on = x < 5 and rows[y][x] == '1'
                cx, cy = x0 + (i * 6 + x) * p, y0 + y * p
                if x == 5 and i == 3: continue
                d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 44, 50, 255) if on else (30, 9, 11, 255))
                if on: gd.ellipse((cx - r * 2.2, cy - r * 2.2, cx + r * 2.2, cy + r * 2.2), fill=(255, 40, 40, 70))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(3)))
    return save(wear(im, edge=0.1, scuffs=3, seed=26), 'live-led')
made.append(live_led())

# ---------------------------------------------------------------- Y2K and coder stickers
def sudo_rave():
    """A terminal window: three lights, '$ sudo rave' and a block cursor."""
    W, H = 470, 250
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=22, fill=(20, 18, 26, 255))
    d.rounded_rectangle((0, 0, W - 1, 58), radius=22, fill=(52, 50, 62, 255)); d.rectangle((0, 36, W - 1, 58), fill=(52, 50, 62, 255))
    for k, c in enumerate(((255, 95, 86), (255, 189, 46), (39, 201, 63))):
        d.ellipse((22 + k * 38, 17, 46 + k * 38, 41), fill=c + (255,))
    fnt = F('jbm-800.ttf', 54)
    d.text((28, 150), '$ sudo rave', font=fnt, fill=(255, 92, 191, 255), anchor='lm')
    x1 = 28 + d.textlength('$ sudo rave', font=fnt) + 10   # (the cursor after the last letter)
    d.rectangle((x1, 124, x1 + 26, 176), fill=(255, 92, 191, 255))
    return save(wear(diecut(im, pad=16), edge=0.25, scuffs=6, seed=31), 'sudo-rave')
made.append(sudo_rave())

def code_tag():
    """</> in white on a hot pink square, a black outline, die-cut."""
    S = 300
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 6, S - 7, S - 7), radius=54, fill=HOT + (255,), outline=INK + (255,), width=12)
    d.text((S / 2, S / 2 + 6), '</>', font=F('jbm-800.ttf', 128), fill=(255, 255, 255, 255), anchor='mm', stroke_width=8, stroke_fill=INK + (255,))
    return save(wear(diecut(im, pad=16), edge=0.25, scuffs=5, seed=32), 'code-tag')
made.append(code_tag())

def cursor():
    """The arrow pointer, in pixels: white, a black edge."""
    A = ['X..........', 'XX.........', 'XWX........', 'XWWX.......', 'XWWWX......', 'XWWWWX.....', 'XWWWWWX....', 'XWWWWWWX...',
         'XWWWWWWWX..', 'XWWWWWWWWX.', 'XWWWWWXXXXX', 'XWWXWWX....', 'XWX.XWWX...', 'XX..XWWX...', 'X....XWWX..', '.....XWWX..', '......XX...']
    s = 18
    im = Image.new('RGBA', (11 * s, 17 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for y, row in enumerate(A):
        for x, ch in enumerate(row):
            if ch != '.': d.rectangle((x * s, y * s, x * s + s - 1, y * s + s - 1), fill=(INK if ch == 'X' else (255, 255, 255)) + (255,))
    return save(wear(diecut(im, pad=14), edge=0.25, scuffs=4, seed=33), 'cursor')
made.append(cursor())

def pixel_heart():
    """An 8-bit heart: hot pink, a darker edge, a white glint."""
    A = ['.XX...XX.', 'XPPX.XPPX', 'XPWPXPPPX', 'XPWPPPPPX', 'XPPPPPPPX', '.XPPPPPX.', '..XPPPX..', '...XPX...', '....X....']
    s = 30
    im = Image.new('RGBA', (9 * s, 9 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    col = {'X': (150, 10, 70), 'P': HOT, 'W': (255, 255, 255)}
    for y, row in enumerate(A):
        for x, ch in enumerate(row):
            if ch != '.': d.rectangle((x * s, y * s, x * s + s - 1, y * s + s - 1), fill=col[ch] + (255,))
    return save(wear(diecut(im, pad=16), edge=0.25, scuffs=4, seed=34), 'pixel-heart')
made.append(pixel_heart())

def holo_star():
    """A four-point sparkle cut out of holographic foil."""
    S = 300
    fo = foil(S, S, seed=7, angle=(0.6, 0.9))
    m = Image.new('L', (S, S), 0); md = ImageDraw.Draw(m)
    c, r, k = S / 2, S / 2 - 6, 0.3
    md.polygon([(c, c - r), (c + r * k, c - r * k), (c + r, c), (c + r * k, c + r * k), (c, c + r), (c - r * k, c + r * k), (c - r, c), (c - r * k, c - r * k)], fill=255)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); im.paste(fo, (0, 0), m)
    return save(wear(diecut(im, pad=14), edge=0.25, scuffs=3, seed=35), 'holo-star')
made.append(holo_star())

def hello():
    """HELLO my name is: toaster, in marker."""
    W, H = 420, 300
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=26, fill=(226, 28, 44, 255))
    d.rectangle((0, 108, W - 1, H - 40), fill=WHITE + (255,))
    d.text((W / 2, 46), 'HELLO', font=F('nunito-900.ttf', 66), fill=(255, 255, 255, 255), anchor='mm')
    d.text((W / 2, 92), 'my name is', font=F('nunito-800.ttf', 28), fill=(255, 255, 255, 255), anchor='mm')
    t = Image.new('RGBA', (W, 160), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((W / 2, 80), 'toaster', font=F('exo2-900i.ttf', 92), fill=(18, 18, 26, 255), anchor='mm')
    im.alpha_composite(t.rotate(-4, resample=Image.BICUBIC), (0, 104))
    return save(wear(im, edge=0.2, scuffs=6, seed=36), 'hello')
made.append(hello())

def beta_burst():
    """A price-tag starburst: BETA, a little turned."""
    S, n = 320, 18
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    pts = [(S / 2 + (S / 2 - 6 if k % 2 == 0 else S / 2 - 44) * math.cos(math.pi * k / n), S / 2 + (S / 2 - 6 if k % 2 == 0 else S / 2 - 44) * math.sin(math.pi * k / n)) for k in range(2 * n)]
    d.polygon(pts, fill=(255, 226, 40, 255), outline=INK + (255,))
    t = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(t).text((S / 2, S / 2 + 4), 'BETA', font=F('orbitron-900.ttf', 76), fill=INK + (255,), anchor='mm')
    im.alpha_composite(t.rotate(12, resample=Image.BICUBIC))
    return save(wear(im, edge=0.25, scuffs=4, seed=37), 'beta-burst')
made.append(beta_burst())

def cd_holo():
    """A CD: rainbow rings on silver, the hole cut out."""
    S = 300
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) - S / 2
    rr = np.hypot(xx, yy) / (S / 2); ang = np.arctan2(yy, xx)
    base = 205 + 30 * np.cos(ang * 2 + 0.6)
    hue = (ang / (2 * math.pi) * 2 + rr * 0.6) % 1
    rgb = np.stack([np.clip(base + 50 * np.cos(2 * math.pi * (hue - k / 3)), 0, 255) for k in range(3)], -1)
    a = ((rr <= 0.98) & (rr >= 0.16)).astype(np.float32) * 255
    ring = (rr > 0.16) & (rr < 0.34)
    rgb[ring] = rgb[ring] * 0.55 + 100
    im = Image.fromarray(np.dstack([rgb, a]).astype(np.uint8), 'RGBA')
    d = ImageDraw.Draw(im); sparkle(d, S * 0.72, S * 0.28, 26)
    return save(wear(im, edge=0.2, scuffs=8, seed=38), 'cd-holo')
made.append(cd_holo())

print('\n'.join(f'{n}: {w}x{h}' for n, (w, h) in made))
# (a sheet of them all, flat, to look at)
ims = [Image.open(os.path.join(OUT, f'sticker-{n}.png')) for n, _ in made]
cell = 460
sheet = Image.new('RGB', (cell * 5, cell * ((len(ims) + 4) // 5)), (120, 122, 128))
for i, (im, (n, _)) in enumerate(zip(ims, made)):
    k = min((cell - 60) / im.width, (cell - 60) / im.height); im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    x, y = (i % 5) * cell + (cell - im.width) // 2, (i // 5) * cell + (cell - 40 - im.height) // 2
    sheet.paste(im, (x, y), im)
    ImageDraw.Draw(sheet).text(((i % 5) * cell + cell // 2, (i // 5) * cell + cell - 24), n, font=F('jbm-700.ttf', 22), fill=(255, 255, 255), anchor='mm')
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'renders'), exist_ok=True)
sheet.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'renders', 'stickers2-flat.png'))

# ---------------------------------------------------------------- the pink edition's toaster (the pink theme's handheld)
def toaster_pink():
    """The app's toaster, girly pop: a hot pink toaster with a light pink top, the >_ white, the toast golden; white sparkles
    round it and a little heart, die-cut."""
    icon = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'build', 'icon.png')).convert('RGBA')
    a = np.asarray(icon).astype(np.int32).copy()
    swap = {(2, 11, 69): (150, 12, 84), (52, 72, 214): (255, 158, 208), (5, 29, 181): (255, 46, 140)}
    for old, new in swap.items():
        m = (a[..., 0] == old[0]) & (a[..., 1] == old[1]) & (a[..., 2] == old[2])
        a[m, :3] = new
    icon = Image.fromarray(a.astype(np.uint8)).resize((360, 360), Image.NEAREST)
    S = 480
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); im.alpha_composite(icon, (60, 70))
    d = ImageDraw.Draw(im)
    for cx, cy, r in ((405, 92, 34), (440, 168, 15), (62, 104, 18)): sparkle(d, cx, cy, r, fill=(255, 92, 191, 255))   # (pink: white on the white border vanished)
    # (a little heart, low right, pixel style)
    H = ['.XX.XX.', 'XPPXPPX', 'XPPPPPX', '.XPPPX.', '..XPX..', '...X...']
    s = 11
    for y, row in enumerate(H):
        for x, ch in enumerate(row):
            if ch != '.': d.rectangle((388 + x * s, 352 + y * s, 388 + x * s + s - 1, 352 + y * s + s - 1), fill=((150, 12, 84) if ch == 'X' else (255, 92, 191)) + (255,))
    return save(wear(diecut(im, pad=18), edge=0.28, scuffs=6, seed=41), 'toaster-pink')
print(toaster_pink())

def label_blank_pink():
    """The cartridge's blank label for the app (textures.py's label_blank) with a pink band, for the pink edition."""
    W, H = 380, 180
    im = Image.new('RGBA', (W, H), WHITE + (255,)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 34), fill=(226, 38, 128, 255))
    d.text((12, 6), 'TOASTER CART', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255))
    d.text((W - 14, 6), 'A', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255), anchor='ra')
    r2 = random.Random(5)
    for i in range(26):
        wbar = r2.choice((1, 2, 3))
        d.rectangle((W - 120 + i * 4, 140, W - 120 + i * 4 + wbar, 168), fill=(30, 30, 40, 255))
    im = wear(im, edge=0.25, scuffs=8, seed=3).rotate(90, expand=True)
    im.save(os.path.join(OUT, 'label-blank-pink.png')); return 'label-blank-pink', im.size
print(label_blank_pink())
