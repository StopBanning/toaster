# The concepts' printed parts as textures (PIL): the song cartridge's label, stickers (die-cut toaster,
# LIVE, star), each a little worn (rubbed edges, faint scuffs). 10 px a mm.
import math, random, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
ICON = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'build', 'icon.png')
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(7)
F = lambda name, px: ImageFont.truetype(os.path.join(FONTS, name), px)
BLUE, NAVY, LIGHT, WHITE = (5, 29, 181), (2, 11, 69), (96, 160, 255), (246, 246, 242)

def wear(im, edge=0.35, scuffs=40, seed=1):
    """Rubbed: the alpha eaten a little at the edges, some faint scuffs across the print."""
    r = random.Random(seed)
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    noise = np.asarray(Image.effect_noise((w, h), 60).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    alpha = a[..., 3] / 255
    # (how far in from the edge each pixel is, roughly: the alpha blurred)
    inner = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    eaten = (inner < 0.72) & (noise > 1 - edge)
    alpha = np.where(eaten, alpha * 0.15, alpha)
    a[..., 3] = alpha * 255
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    for _ in range(scuffs):
        x, y = r.uniform(0, w), r.uniform(0, h); L = r.uniform(8, 40); t = r.uniform(-0.5, 0.5)
        d.line((x, y, x + L * math.cos(t), y + L * math.sin(t)), fill=(255, 255, 255, r.randint(10, 26)), width=1)
    return out

def label():
    """The cartridge's label (its part out of the side: 18 x 38 mm), read bottom to top."""
    W, H = 380, 180  # (drawn lying down, then turned)
    im = Image.new('RGBA', (W, H), WHITE + (255,))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 34), fill=BLUE + (255,))
    d.text((12, 6), 'TOASTER CART', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255))
    d.text((W - 14, 6), 'A', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255), anchor='ra')
    d.text((12, 50), 'TECHNOLOGIC', font=F('nunito-900.ttf', 41), fill=NAVY + (255,))
    d.text((14, 104), 'DAFT PUNK', font=F('michroma.ttf', 20), fill=BLUE + (255,))
    d.text((14, 140), '127 BPM  ·  4 LANES', font=F('michroma.ttf', 13), fill=(110, 116, 140, 255))
    for i in range(26):  # a little barcode
        wbar = rnd.choice((1, 2, 3))
        d.rectangle((W - 120 + i * 4, 112, W - 120 + i * 4 + wbar, 160), fill=(30, 30, 40, 255))
    im = wear(im, edge=0.25, scuffs=8, seed=3).rotate(90, expand=True)
    im.save(os.path.join(OUT, 'label.png')); return im.size

def toaster_sticker():
    """The app's toaster, die-cut with a white border."""
    icon = Image.open(ICON).convert('RGBA').resize((360, 360), Image.NEAREST)
    pad = 40
    a = np.asarray(icon)[..., 3]
    big = Image.new('L', (360 + 2 * pad, 360 + 2 * pad), 0); big.paste(Image.fromarray(a), (pad, pad))
    border = big.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 110 else 0)
    im = Image.new('RGBA', big.size, (0, 0, 0, 0))
    im.paste(Image.new('RGBA', big.size, WHITE + (255,)), (0, 0), border)
    im.alpha_composite(icon, (pad, pad))
    im = wear(im, edge=0.3, scuffs=6, seed=5)
    im.save(os.path.join(OUT, 'sticker-toaster.png')); return im.size

def live_sticker():
    W, H = 300, 120
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, W - 3, H - 3), radius=58, fill=WHITE + (255,), outline=(220, 220, 214, 255), width=2)
    d.ellipse((34, 42, 70, 78), fill=(255, 40, 60, 255))
    d.text((86, 60), 'LIVE', font=F('nunito-900.ttf', 74), fill=BLUE + (255,), anchor='lm')
    im = wear(im, edge=0.3, scuffs=4, seed=9)
    im.save(os.path.join(OUT, 'sticker-live.png')); return im.size

def star_sticker():
    S = 160
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((2, 2, S - 3, S - 3), fill=(255, 196, 30, 255))
    pts = []
    for k in range(10):
        r = 58 if k % 2 == 0 else 24; a = -math.pi / 2 + k * math.pi / 5
        pts.append((S / 2 + r * math.cos(a), S / 2 + r * math.sin(a)))
    d.polygon(pts, fill=(255, 255, 255, 255))
    im = wear(im, edge=0.35, scuffs=3, seed=11)
    im.save(os.path.join(OUT, 'sticker-star.png')); return im.size

print('label', label(), 'toaster', toaster_sticker(), 'live', live_sticker(), 'star', star_sticker())

def oled():
    """The status strip's little display: the song and its tempo, in pixels, light blue on black (40 x 6 mm)."""
    small = Image.new('RGB', (200, 30), (0, 0, 0)); d = ImageDraw.Draw(small)
    f = ImageFont.load_default()
    d.text((4, 9), '> TECHNOLOGIC', font=f, fill=(96, 160, 255))
    d.text((196, 9), '127 BPM', font=f, fill=(150, 200, 255), anchor='ra')
    d.rectangle((4, 24, 4 + int(192 * 0.62), 25), fill=(60, 110, 220))  # (where it is in the song)
    big = small.resize((800, 120), Image.NEAREST)
    big.save(os.path.join(OUT, 'oled.png')); return big.size

print('oled', oled())

def label_blank():
    """The label as printed, for the app: its band and barcode; the song's name is the app's to write."""
    W, H = 380, 180
    im = Image.new('RGBA', (W, H), WHITE + (255,))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 34), fill=BLUE + (255,))
    d.text((12, 6), 'TOASTER CART', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255))
    d.text((W - 14, 6), 'A', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255), anchor='ra')
    r2 = random.Random(5)
    for i in range(26):
        wbar = r2.choice((1, 2, 3))
        d.rectangle((W - 120 + i * 4, 140, W - 120 + i * 4 + wbar, 168), fill=(30, 30, 40, 255))
    im = wear(im, edge=0.25, scuffs=8, seed=3).rotate(90, expand=True)
    im.save(os.path.join(OUT, 'label-blank.png')); return im.size

print('label-blank', label_blank())

def toast_sticker():
    """A slice of toast with a face, in the app icon's pixels and colours, die-cut."""
    N = 16
    def inside(x, y):
        lobe = (x - 4.6) ** 2 + (y - 5.0) ** 2 <= 4.2 ** 2 or (x - 11.4) ** 2 + (y - 5.0) ** 2 <= 4.2 ** 2
        return lobe or (2.0 <= x <= 14.0 and 4.5 <= y <= 14.6) or (4.6 <= x <= 11.4 and 1.0 <= y <= 9.0)
    m = [[inside(i + 0.5, j + 0.5) for i in range(N)] for j in range(N)]
    crust_d, crust, bread, shade, hi = (110, 61, 23), (154, 91, 39), (238, 184, 102), (207, 148, 69), (251, 224, 166)
    px = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for j in range(N):
        for i in range(N):
            if not m[j][i]: continue
            edge = any(not (0 <= i + di < N and 0 <= j + dj < N and m[j + dj][i + di]) for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            edge2 = not edge and any(not (0 <= i + di < N and 0 <= j + dj < N and m[j + dj][i + di]) for di, dj in ((2, 0), (-2, 0), (0, 2), (0, -2)))
            px.putpixel((i, j), (crust_d if edge else crust if edge2 else bread) + (255,))
    for (i, j) in ((4, 4), (5, 4), (4, 5)): px.putpixel((i, j), hi + (255,))                       # (a shine)
    for (i, j) in ((12, 12), (12, 11), (11, 12)): px.putpixel((i, j), shade + (255,))
    for (i, j) in ((6, 8), (6, 9), (9, 8), (9, 9)): px.putpixel((i, j), (2, 11, 69, 255))         # (eyes)
    for (i, j) in ((6, 11), (7, 12), (8, 12), (9, 11)): px.putpixel((i, j), (2, 11, 69, 255))     # (a smile)
    for (i, j) in ((4, 11), (11, 11)): px.putpixel((i, j), (255, 140, 170, 255))                 # (cheeks)
    icon = px.resize((360, 360), Image.NEAREST)
    pad = 40
    a = np.asarray(icon)[..., 3]
    big = Image.new('L', (360 + 2 * pad, 360 + 2 * pad), 0); big.paste(Image.fromarray(a), (pad, pad))
    border = big.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 110 else 0)
    im = Image.new('RGBA', big.size, (0, 0, 0, 0))
    im.paste(Image.new('RGBA', big.size, WHITE + (255,)), (0, 0), border)
    im.alpha_composite(icon, (pad, pad))
    im = wear(im, edge=0.3, scuffs=5, seed=13)
    im.save(os.path.join(OUT, 'sticker-toast.png')); return im.size

def smiley_sticker():
    """The acid-house smiley, die-cut."""
    S = 400
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((8, 8, S - 9, S - 9), fill=WHITE + (255,))
    d.ellipse((30, 30, S - 31, S - 31), fill=(20, 18, 16, 255))
    d.ellipse((40, 40, S - 41, S - 41), fill=(255, 214, 0, 255))
    d.ellipse((128, 112, 160, 186), fill=(20, 18, 16, 255)); d.ellipse((240, 112, 272, 186), fill=(20, 18, 16, 255))
    d.arc((100, 120, 300, 310), start=20, end=160, fill=(20, 18, 16, 255), width=16)
    im = wear(im, edge=0.3, scuffs=5, seed=17)
    im.save(os.path.join(OUT, 'sticker-smiley.png')); return im.size

print('toast', toast_sticker(), 'smiley', smiley_sticker())

def holo_smiley():
    """A Y2K smiley on holographic foil: a rainbow sheen across it, the face in navy, a sparkle, die-cut."""
    S = 400
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
    t = (xx * 0.8 + yy * 0.5) % 1.0
    stops = [(0.0, (255, 120, 200)), (0.2, (190, 140, 255)), (0.4, (110, 200, 255)), (0.6, (130, 255, 200)), (0.8, (255, 240, 140)), (1.0, (255, 120, 200))]
    rgb = np.zeros((S, S, 3), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1); f = ((t - p0) / (p1 - p0))[..., None]
        rgb[m] = (np.array(c0) * (1 - f) + np.array(c1) * f)[m]
    shimmer = np.asarray(Image.effect_noise((S, S), 40).filter(ImageFilter.GaussianBlur(2))).astype(np.float32)[..., None] / 255
    rgb = np.clip(rgb * (0.85 + 0.3 * shimmer), 0, 255)
    foil = Image.fromarray(rgb.astype(np.uint8), 'RGB').convert('RGBA')
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).ellipse((40, 40, S - 41, S - 41), fill=255)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((8, 8, S - 9, S - 9), fill=WHITE + (255,))
    im.paste(foil, (0, 0), mask)
    d = ImageDraw.Draw(im)
    d.ellipse((40, 40, S - 41, S - 41), outline=NAVY + (255,), width=10)
    d.ellipse((130, 112, 162, 186), fill=NAVY + (255,)); d.ellipse((238, 112, 270, 186), fill=NAVY + (255,))
    d.arc((100, 120, 300, 310), start=20, end=160, fill=NAVY + (255,), width=16)
    for cx, cy, r in ((300, 92, 30), (322, 150, 14)):   # (a Y2K sparkle or two)
        d.polygon([(cx, cy - r), (cx + r * 0.22, cy - r * 0.22), (cx + r, cy), (cx + r * 0.22, cy + r * 0.22), (cx, cy + r), (cx - r * 0.22, cy + r * 0.22), (cx - r, cy), (cx - r * 0.22, cy - r * 0.22)], fill=(255, 255, 255, 255))
    im = wear(im, edge=0.3, scuffs=4, seed=19)
    im.save(os.path.join(OUT, 'sticker-smiley-holo.png')); return im.size

print('holo smiley', holo_smiley())
