# The handheld's Japan edition's face for its screens: M PLUS 1 Code (SIL OFL, github.com/google/fonts), cut down to
# printable ASCII, all of katakana and the few marks its words use, as renderer/fonts/mplus1code-jp.woff2 (about 25 KB;
# its weights 100-700 kept), with its licence beside it.
#   python -I tools/jpfont.py      (needs fontTools and brotli)
import os, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
here = os.path.dirname(os.path.abspath(__file__))
fonts = os.path.join(here, '..', 'renderer', 'fonts')
RAW = 'https://github.com/google/fonts/raw/main/ofl/mplus1code/'
cache = os.path.join(here, 'handheld', 'fonts', 'src'); os.makedirs(cache, exist_ok=True)
src = os.path.join(cache, 'MPLUS1Code[wght].ttf')
if not os.path.exists(src): urllib.request.urlretrieve(RAW + 'MPLUS1Code%5Bwght%5D.ttf', src)
urllib.request.urlretrieve(RAW + 'OFL.txt', os.path.join(fonts, 'OFL-mplus1code.txt'))
text = ''.join(chr(c) for c in range(0x20, 0x7f)) + ''.join(chr(c) for c in range(0x30a0, 0x3100)) + '×·…♪・ー「」！？、。'
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
f = TTFont(src); s = subset.Subsetter(opts); s.populate(text=text); s.subset(f)
out = os.path.join(fonts, 'mplus1code-jp.woff2')
subset.save_font(f, out, opts)
print(out, os.path.getsize(out), 'bytes')
