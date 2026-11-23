"""Build the browser font from the same glyph pixels and advances as the BMFont."""
from pathlib import Path
import re

from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampSinceEpoch
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import newTable
from fontTools.ttLib.tables.BitmapGlyphMetrics import SmallGlyphMetrics
from fontTools.ttLib.tables.E_B_D_T_ import ebdt_bitmap_format_1
from fontTools.ttLib.tables.E_B_L_C_ import SbitLineMetrics, Strike, eblc_index_sub_table_1
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "media" / "fonts" / "v1" / "text"
UNITS_PER_PIXEL = 100


def fields(line):
    return dict(re.findall(r'(\w+)=("[^"]*"|[^\s]+)', line))


def glyph_outline(mask, left, top):
    pen = TTGlyphPen(None)
    width, height = mask.size
    pixels = mask.tobytes()
    for row in range(height):
        # Draw one rectangle per contiguous run of atlas pixels.
        scanline = pixels[row * width:(row + 1) * width]
        for run in re.finditer(b'\xff+', scanline):
            x0 = (left + run.start()) * UNITS_PER_PIXEL
            x1 = (left + run.end()) * UNITS_PER_PIXEL
            y1 = (top - row) * UNITS_PER_PIXEL
            y0 = y1 - UNITS_PER_PIXEL
            pen.moveTo((x0, y0))
            pen.lineTo((x0, y1))
            pen.lineTo((x1, y1))
            pen.lineTo((x1, y0))
            pen.closePath()
    return pen.glyph()


def add_bitmap_strike(font, bitmaps, ppem, baseline, line_height):
    # The 12px strike gives compatible engines a 1-bit bitmap in the current text color.
    strike = Strike()
    strike.bitmapSizeTable.__dict__.update(
        colorRef=0, ppemX=ppem, ppemY=ppem, bitDepth=1, flags=1,
    )
    horizontal = SbitLineMetrics()
    horizontal.__dict__.update(
        ascender=baseline, descender=baseline - line_height,
        widthMax=max(item.metrics.Advance for item in bitmaps.values()),
        caretSlopeNumerator=1, caretSlopeDenominator=0, caretOffset=0,
        minOriginSB=min(item.metrics.BearingX for item in bitmaps.values()),
        minAdvanceSB=0, maxBeforeBL=baseline, minAfterBL=baseline - line_height,
        pad1=0, pad2=0,
    )
    vertical = SbitLineMetrics()
    vertical.__dict__.update(dict.fromkeys(horizontal.__dict__, 0))
    strike.bitmapSizeTable.hori = horizontal
    strike.bitmapSizeTable.vert = vertical

    index = eblc_index_sub_table_1(None, font)
    index.indexFormat = 1
    index.imageFormat = 1
    index.names = list(bitmaps)
    strike.indexSubTables = [index]

    locator = font["EBLC"] = newTable("EBLC")
    locator.version = 2.0
    locator.strikes = [strike]
    data = font["EBDT"] = newTable("EBDT")
    data.version = 2.0
    data.strikeData = [bitmaps]


def main():
    lines = (ROOT / "text.fnt").read_text(encoding="utf-8").splitlines()
    info, common = (fields(line) for line in lines[:2])
    ppem, baseline, line_height = map(int, (info["size"], common["base"], common["lineHeight"]))
    ascent = baseline * UNITS_PER_PIXEL
    descent = (baseline - line_height) * UNITS_PER_PIXEL
    pages = {}
    for line in lines:
        if line.startswith("page "):
            fields_for_page = fields(line)
            with Image.open(ROOT / fields_for_page["file"].strip('"')) as image:
                pages[int(fields_for_page["id"])] = image.getchannel("A")

    chars = [fields(line) for line in lines if line.startswith("char ")]
    outline, bitmaps, charmap, metrics = {}, {}, {}, {}
    for row in sorted(chars, key=lambda entry: int(entry["id"])):
        cp, x, y, width, height, left, offset, advance, page = (
            int(row[field]) for field in ("id", "x", "y", "width", "height", "xoffset", "yoffset", "xadvance", "page")
        )
        name = f"uni{cp:04X}"
        top = baseline - offset
        mask = pages[page].crop((x, y, x + width, y + height))
        outline[name] = glyph_outline(mask, left, top)
        charmap[cp] = name
        metrics[name] = advance * UNITS_PER_PIXEL, left * UNITS_PER_PIXEL

        bitmap = ebdt_bitmap_format_1(None, None)
        bitmap.metrics = SmallGlyphMetrics()
        bitmap.metrics.__dict__.update(height=height, width=width, BearingX=left, BearingY=top, Advance=advance)
        bitmap.imageData = mask.convert("1", dither=Image.Dither.NONE).tobytes() if width and height else b""
        bitmaps[name] = bitmap

    fallback = charmap[0xfffd]
    outline[".notdef"], metrics[".notdef"] = outline[fallback], metrics[fallback]
    font = FontBuilder(ppem * UNITS_PER_PIXEL, isTTF=True)
    font.setupGlyphOrder([".notdef", *charmap.values()])
    font.setupCharacterMap(charmap)
    font.setupGlyf(outline)
    font.setupHorizontalMetrics(metrics)
    font.setupHorizontalHeader(ascent=ascent, descent=descent)
    font.setupOS2(version=4, sTypoAscender=ascent, sTypoDescender=descent, usWinAscent=ascent, usWinDescent=-descent, fsSelection=0x80)
    font.setupNameTable({
        "familyName": "Cavern Text", "styleName": "Regular", "uniqueFontIdentifier": "TavernHeros.CavernText.1",
        "fullName": "Cavern Text", "psName": "CavernText-Regular", "version": "Version 1.0",
        "copyright": "Based on Mulmaru by Mushsooni. Tavern Heros adaptation.",
        "licenseDescription": "SIL Open Font License 1.1", "licenseInfoURL": "https://openfontlicense.org/",
    })
    font.setupPost(keepGlyphNames=False)
    add_bitmap_strike(font.font, bitmaps, ppem, baseline, line_height)
    font.font["head"].created = font.font["head"].modified = timestampSinceEpoch(0)
    font.font.recalcTimestamp = False
    font.font.flavor = "woff2"
    font.save(ROOT / "cavern-text.woff2")
    print(f"Cavern Text: {len(charmap)} glyphs, {ppem}px bitmap strike")


if __name__ == "__main__":
    main()
