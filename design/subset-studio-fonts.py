"""Build common-Chinese web subsets, with renamed families and tiny card samples.
Usage: python design/subset-studio-fonts.py wenkai.ttf fangsong.ttf smiley.ttf happy.ttf
Font sources and license files are documented in assets/fonts/README.md.
"""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools import subset
root=Path(__file__).resolve().parent.parent
chars=set(chr(n) for n in range(32,256))
for a in range(0xa1,0xf8):
 for b in range(0xa1,0xff):
  try:chars.update(bytes([a,b]).decode('gb2312'))
  except UnicodeDecodeError:pass
for p in root.glob('*.js'):chars.update(p.read_text())
for name,source in zip(['wenkai','fangsong','smiley','happy'],sys.argv[1:]):
 for sample in [False,True]:
  f=TTFont(source);o=subset.Options();o.name_IDs=['*'];o.layout_features=['*'];sub=subset.Subsetter(options=o);sub.populate(text='字 Aa' if sample else ''.join(chars));sub.subset(f)
  family='ST '+name.capitalize()+(' Sample' if sample else '')
  for record in f['name'].names:
   if record.nameID in [1,4,16]:record.string=family.encode(record.getEncoding())
   if record.nameID in [3,6]:record.string=family.replace(' ','').encode(record.getEncoding())
  f.flavor='woff2';dest=root/'assets/fonts'/('st-'+name+('-sample' if sample else '')+'.woff2');f.save(dest);print(dest.name,dest.stat().st_size)
