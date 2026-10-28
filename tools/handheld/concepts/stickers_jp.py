# The Japan edition's stickers (metal.py COLORWAY=jp), in the shapes of the others (tex/sticker-*.png, 10 px a mm):
# LIVE as ライブ on the same off-white pill with the red light, its ink the edition's maroon; a hanko, a red seal stamped
# 限定 ("limited"): ink on the plastic, not a sticker, so a ring and the two characters with a little of a stamp's wear;
# and the toaster sticker (textures.py's) in the edition's red. Fonts from tools/handheld/fonts.py.
#   python -I tools/handheld/concepts/stickers_jp.py
import colorsys, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS, TEX = os.path.join(HERE, '..', 'fonts'), os.path.join(HERE, 'tex')
MAROON, RED, INK = (140, 18, 36), (230, 40, 52), (196, 30, 44)
os.makedirs(TEX, exist_ok=True)

# ライブ: 300 x 120, the pill, the red light, the word (drawn at 4x, scaled down)
S = 4
im = Image.new('RGBA', (300 * S, 120 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rounded_rectangle((6 * S, 8 * S, 294 * S, 112 * S), radius=52 * S, fill=(244, 242, 236, 255), outline=(208, 204, 196, 255), width=3 * S)
d.ellipse((30 * S, 42 * S, 66 * S, 78 * S), fill=RED + (255,))
f = ImageFont.truetype(os.path.join(FONTS, 'mplus1p-bold.ttf'), 64 * S)
box = d.textbbox((0, 0), 'ライブ', font=f)
d.text((82 * S - box[0], 60 * S - (box[1] + box[3]) / 2), 'ライブ', font=f, fill=MAROON + (255,))
im.resize((300, 120), Image.LANCZOS).save(os.path.join(TEX, 'sticker-live-jp.png'))

# 限定: 400 x 400, a stamped seal: a ring and the two characters stacked, the ink mostly solid with fine gaps
S = 2
im = Image.new('L', (400 * S, 400 * S), 0); d = ImageDraw.Draw(im)
d.ellipse((24 * S, 24 * S, 376 * S, 376 * S), outline=255, width=22 * S)
f = ImageFont.truetype(os.path.join(FONTS, 'delagothic.ttf'), 132 * S)
for ch, cy in (('限', 140), ('定', 268)):
    b = d.textbbox((0, 0), ch, font=f)
    d.text((200 * S - (b[0] + b[2]) / 2, cy * S - (b[1] + b[3]) / 2), ch, font=f, fill=255)
rnd = random.Random(7)
noise = Image.new('L', im.size, 255); nd = ImageDraw.Draw(noise)
for _ in range(900):   # (where the rubber didn't take)
    x, y, r = rnd.uniform(0, im.size[0]), rnd.uniform(0, im.size[1]), rnd.uniform(0.6, 2.2) * S
    nd.ellipse((x - r, y - r, x + r, y + r), fill=rnd.randint(0, 120))
noise = noise.filter(ImageFilter.GaussianBlur(1.2 * S))
alpha = Image.composite(im, Image.new('L', im.size, 0), noise.point(lambda v: 255 if v > 90 else 0))
alpha = Image.eval(alpha, lambda v: int(v * 0.92)).filter(ImageFilter.GaussianBlur(0.6 * S))
seal = Image.new('RGBA', im.size, INK + (0,)); seal.putalpha(alpha)
seal.resize((400, 400), Image.LANCZOS).save(os.path.join(TEX, 'sticker-hanko.png'))

# the toaster in red: textures.py's toaster sticker with its blues turned to the edition's red
im = Image.open(os.path.join(TEX, 'sticker-toaster.png')).convert('RGBA'); px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if not a: continue
        h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s_ > 0.25 and 0.5 < h < 0.75:
            r2, g2, b2 = colorsys.hsv_to_rgb(0.985, min(1, s_ * 0.95), min(1, v * 1.02))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
im.save(os.path.join(TEX, 'sticker-toaster-jp.png'))
print('tex/sticker-live-jp.png, sticker-hanko.png, sticker-toaster-jp.png')
