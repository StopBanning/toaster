# The Japan edition's printed parts in Japanese (metal.py COLORWAY=jp; 10 px a mm, as textures.py's): the cartridge's
# label for a hero picture (a red band with トースターカート, the song in its own script, the artist, the tempo), the
# same label blank for the app (the app writes the song on it), and a 新発売 ("new release") starburst, a shop's sticker.
#   python -I tools/handheld/concepts/labels_jp.py ["title" "artist" bpm]
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS, OUT = os.path.join(HERE, '..', 'fonts'), os.path.join(HERE, 'tex')
F = lambda name, px: ImageFont.truetype(os.path.join(FONTS, name), px)
RED, MAROON, WHITE, INK = (200, 24, 40), (140, 18, 36), (246, 244, 238), (30, 30, 40)
title, artist, bpm = (sys.argv[1:4] + ['フライディ・チャイナタウン', '泰葉', '120'][len(sys.argv[1:4]):])[:3]
os.makedirs(OUT, exist_ok=True)

def wear(im, edge=0.25, scuffs=8, seed=3):   # (as textures.py's: the alpha eaten a little at the edges, faint scuffs)
    r = random.Random(seed)
    a = np.asarray(im).astype(np.float32); h, w = a.shape[:2]
    noise = np.asarray(Image.effect_noise((w, h), 60).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    alpha = a[..., 3] / 255
    inner = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    a[..., 3] = np.where((inner < 0.72) & (noise > 1 - edge), alpha * 0.15, alpha) * 255
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(out)
    for _ in range(scuffs):
        x, y, L, t = r.uniform(0, w), r.uniform(0, h), r.uniform(8, 40), r.uniform(-0.5, 0.5)
        d.line((x, y, x + L * math.cos(t), y + L * math.sin(t)), fill=(255, 255, 255, r.randint(10, 26)), width=1)
    return out

def band(d, W):
    d.rectangle((0, 0, W, 34), fill=RED + (255,))
    d.text((12, 17), 'トースターカート', font=F('mplus1p-bold.ttf', 20), fill=(255, 255, 255, 255), anchor='lm')
    d.text((W - 14, 17), 'A', font=F('mplus1p-bold.ttf', 20), fill=(255, 255, 255, 255), anchor='rm')

def barcode(d, W, y0, y1, seed):
    r2 = random.Random(seed)
    for i in range(26):
        wb = r2.choice((1, 2, 3)); d.rectangle((W - 120 + i * 4, y0, W - 120 + i * 4 + wb, y1), fill=INK + (255,))

W, H = 380, 180   # (18 x 38 mm out of the side, drawn lying down, then turned: read bottom to top)
im = Image.new('RGBA', (W, H), WHITE + (255,)); d = ImageDraw.Draw(im); band(d, W)
size = 34
while size > 18 and d.textlength(title, font=F('delagothic.ttf', size)) > W - 26: size -= 1   # (a long title smaller)
d.text((12, 72), title, font=F('delagothic.ttf', size), fill=MAROON + (255,), anchor='lm')
d.text((14, 116), artist, font=F('mplus1p-bold.ttf', 22), fill=RED + (255,), anchor='lm')
d.text((14, 150), f'{bpm} BPM ・ 4レーン', font=F('mplus1p-bold.ttf', 14), fill=(110, 112, 122, 255), anchor='lm')
barcode(d, W, 112, 160, 7)
wear(im).rotate(90, expand=True).save(os.path.join(OUT, 'label-jp.png'))

im = Image.new('RGBA', (W, H), WHITE + (255,)); d = ImageDraw.Draw(im); band(d, W); barcode(d, W, 140, 168, 5)
wear(im).rotate(90, expand=True).save(os.path.join(OUT, 'label-blank-jp.png'))

S, N = 400, 24   # (新発売: a 24-point starburst, yellow with a red edge, the words in red across it)
im = Image.new('RGBA', (S * 2, S * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
pts = lambda ro, ri: [(S + (ro if k % 2 == 0 else ri) * math.cos(math.pi * k / N - math.pi / 2),
                       S + (ro if k % 2 == 0 else ri) * math.sin(math.pi * k / N - math.pi / 2)) for k in range(2 * N)]
d.polygon(pts(388, 318), fill=RED + (255,)); d.polygon(pts(356, 292), fill=(255, 214, 10, 255))
d.text((S, S - 6), '新発売', font=F('delagothic.ttf', 168), fill=RED + (255,), anchor='mm', stroke_width=8, stroke_fill=(255, 255, 255, 255))
im = im.rotate(-10, resample=Image.BICUBIC).resize((S, S), Image.LANCZOS)
wear(im, edge=0.15, scuffs=6, seed=11).save(os.path.join(OUT, 'sticker-shinhatsubai.png'))
print('tex/label-jp.png, label-blank-jp.png, sticker-shinhatsubai.png')
