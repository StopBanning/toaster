# The wide handheld's printed parts (PIL, 10 px a mm): its cartridge's label read left to right (the cartridge
# stands up out of the top, so its label faces the front lying down), blank for the app, and one for a hero picture.
#   python -I tex_wide.py ["TITLE|ARTIST|BPM"]
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
F = lambda name, px: ImageFont.truetype(os.path.join(FONTS, name), px)
BLUE, NAVY, WHITE = (5, 29, 181), (2, 11, 69), (246, 246, 242)

def wear(im, edge=0.35, scuffs=40, seed=1):   # (as textures.py's)
    r = random.Random(seed)
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    noise = np.asarray(Image.effect_noise((w, h), 60).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    alpha = a[..., 3] / 255
    inner = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    a[..., 3] = np.where((inner < 0.72) & (noise > 1 - edge), alpha * 0.15, alpha) * 255
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    for _ in range(scuffs):
        x, y = r.uniform(0, w), r.uniform(0, h); L = r.uniform(8, 40); t = r.uniform(-0.5, 0.5)
        d.line((x, y, x + L * math.cos(t), y + L * math.sin(t)), fill=(255, 255, 255, r.randint(10, 26)), width=1)
    return out

def label(title=None, artist='', bpm=''):
    """44 x 20 mm: the band across its top, the song under it (none: blank, for the app to print)."""
    W, H = 440, 200
    im = Image.new('RGBA', (W, H), WHITE + (255,))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 36), fill=BLUE + (255,))
    d.text((14, 7), 'TOASTER CART', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255))
    d.text((W - 14, 7), 'W', font=F('michroma.ttf', 19), fill=(255, 255, 255, 255), anchor='ra')
    if title:
        size = 46
        while F('nunito-900.ttf', size).getlength(title) > W - 150 and size > 20: size -= 2
        d.text((14, 52), title, font=F('nunito-900.ttf', size), fill=NAVY + (255,))
        d.text((16, 114), artist, font=F('michroma.ttf', 20), fill=BLUE + (255,))
        d.text((16, 152), f'{bpm} BPM  ·  4 LANES' if bpm else '4 LANES', font=F('michroma.ttf', 13), fill=(110, 116, 140, 255))
    rnd = random.Random(11)
    for i in range(24):   # (a little barcode)
        wbar = rnd.choice((1, 2, 3))
        d.rectangle((W - 116 + i * 4, 120, W - 116 + i * 4 + wbar, 176), fill=(30, 30, 40, 255))
    return wear(im, edge=0.25, scuffs=8, seed=3)

song = (sys.argv[1] if len(sys.argv) > 1 else 'SELF AWARE|LUM!X REMIX|155').split('|')
label(*song).save(os.path.join(OUT, 'label-wide.png'))
label().save(os.path.join(OUT, 'label-wide-blank.png'))
print('label-wide.png', 'label-wide-blank.png')
