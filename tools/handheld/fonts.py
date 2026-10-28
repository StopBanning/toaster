# The handheld's print is in the app's own font: JetBrains Mono (renderer/fonts, OFL) at weights 700 and 800,
# as plain TTF files for Blender (which can't read woff2 or pick a variable font's weight), into fonts/ here; and the
# concept models' display faces (below).
#   python -I tools/handheld/fonts.py      (needs fontTools and brotli)
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', '..', 'renderer', 'fonts', 'jetbrains-mono-latin.woff2')
os.makedirs(os.path.join(here, 'fonts'), exist_ok=True)
for w in (700, 800):
    f = instantiateVariableFont(TTFont(src), {'wght': w})
    f.flavor = None
    f.save(os.path.join(here, 'fonts', f'jbm-{w}.ttf'))
    print('fonts/jbm-%d.ttf' % w)

# The concept models' display faces (OFL, from github.com/google/fonts, fetched once): Orbitron, Exo 2 Italic and
# Nunito at the weights the models use, Zen Dots and Michroma as they are.
import urllib.request
RAW = 'https://github.com/google/fonts/raw/main/ofl/'
cache = os.path.join(here, 'fonts', 'src'); os.makedirs(cache, exist_ok=True)
def fetch(path):
    out = os.path.join(cache, os.path.basename(path).replace('%5B', '[').replace('%5D', ']'))
    if not os.path.exists(out): urllib.request.urlretrieve(RAW + path, out)
    return out
for path, w, name in (('orbitron/Orbitron%5Bwght%5D.ttf', 900, 'orbitron-900.ttf'), ('orbitron/Orbitron%5Bwght%5D.ttf', 700, 'orbitron-700.ttf'),
                      ('exo2/Exo2-Italic%5Bwght%5D.ttf', 900, 'exo2-900i.ttf'), ('nunito/Nunito%5Bwght%5D.ttf', 900, 'nunito-900.ttf'),
                      ('nunito/Nunito%5Bwght%5D.ttf', 800, 'nunito-800.ttf')):
    f = instantiateVariableFont(TTFont(fetch(path)), {'wght': w}); f.save(os.path.join(here, 'fonts', name)); print('fonts/' + name)
for path, name in (('zendots/ZenDots-Regular.ttf', 'zendots.ttf'), ('michroma/Michroma-Regular.ttf', 'michroma.ttf'),
                   ('delagothicone/DelaGothicOne-Regular.ttf', 'delagothic.ttf'), ('mplus1p/MPLUS1p-Bold.ttf', 'mplus1p-bold.ttf')):   # (the last two: the Japan edition's)
    TTFont(fetch(path)).save(os.path.join(here, 'fonts', name)); print('fonts/' + name)
