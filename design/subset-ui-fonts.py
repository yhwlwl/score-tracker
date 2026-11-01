"""Build the two self-hosted UI fonts from Google's OFL Noto sources.

Usage: python design/subset-ui-fonts.py /path/to/NotoSansSC.ttf /path/to/NotoSerifSC.ttf
Requires fonttools and brotli. Inputs are not shipped; see assets/fonts/README.md.
"""
from pathlib import Path
import sys
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
characters = set(chr(n) for n in range(0x20, 0x250))
characters.update(chr(n) for n in range(0x2000, 0x2070))
characters.update(chr(n) for n in range(0x3000, 0x3040))
characters.update(chr(n) for n in range(0xFF00, 0xFFEF))
for first in range(0xA1, 0xF8):
    for second in range(0xA1, 0xFF):
        try:
            characters.update(bytes([first, second]).decode("gb2312"))
        except UnicodeDecodeError:
            pass
for pattern in ("*.js", "*.css"):
    for file in root.glob(pattern):
        characters.update(c for c in file.read_text() if 0x2E80 <= ord(c) <= 0x9FFF)

for source, kind in zip(sys.argv[1:], ("sans", "serif")):
    font = TTFont(source)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    job = subset.Subsetter(options=options)
    job.populate(text="".join(sorted(characters)))
    job.subset(font)
    instantiateVariableFont(font, {"wght": (400, 700)}, inplace=True)
    family = "Score Sans" if kind == "sans" else "Score Serif"
    for record in font["name"].names:
        if record.nameID in (1, 4, 16):
            record.string = family.encode(record.getEncoding())
        elif record.nameID in (3, 6):
            record.string = family.replace(" ", "").encode(record.getEncoding())
    font.flavor = "woff2"
    target = root / "assets" / "fonts" / f"score-{kind}-sc-v1.woff2"
    font.save(target)
    print(f"{target.name}: {target.stat().st_size:,} bytes, {len(font.getBestCmap()):,} glyphs")
    # The font cards only need three glyphs. Avoid loading full fonts until selected.
    sample = TTFont(target)
    sample_job = subset.Subsetter(options=options)
    sample_job.populate(text="字 Aa")
    sample_job.subset(sample)
    instantiateVariableFont(sample, {"wght": 500}, inplace=True)
    for record in sample["name"].names:
        if record.nameID in (1, 4, 16):
            record.string = (family + " Sample").encode(record.getEncoding())
        elif record.nameID in (3, 6):
            record.string = (family.replace(" ", "") + "Sample").encode(record.getEncoding())
    sample.save(root / "assets" / "fonts" / f"score-{kind}-sample-v1.woff2")
