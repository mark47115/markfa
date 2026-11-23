"""Draw the 10 original pixel icons used in the tavern HUD."""
from hashlib import sha256
from pathlib import Path
import json
from PIL import Image, ImageDraw


OUTPUT = Path(__file__).resolve().parents[1] / "media/preparation/captain-abilities"
INK = "#261c22"
LIGHT = "#fff1b5"
GOLD = "#e6a957"
BRASS = "#a86138"
TEAL = "#65c9b4"
DARK_TEAL = "#32777a"
STEEL = "#b6bbc5"
STEEL_SHADOW = "#667183"
RED = "#d66a62"
PAPER = "#f3d494"
WOOD = "#96553a"


def polygon(draw, points, color):
    draw.polygon(points, fill=color, outline=INK, width=1)


def rowan(draw):
    polygon(draw, [(3, 6), (15, 4), (18, 7), (17, 20), (5, 22), (2, 19)], BRASS)
    polygon(draw, [(8, 2), (20, 2), (22, 5), (20, 9), (20, 21), (8, 21), (6, 18), (8, 14)], PAPER)
    draw.line([(10, 4), (19, 4)], LIGHT)
    draw.rectangle((11, 7, 17, 7), fill=WOOD)
    draw.rectangle((11, 10, 16, 10), fill=WOOD)
    polygon(draw, [(14, 12), (17, 13), (18, 16), (16, 18), (13, 17), (12, 14)], RED)
    draw.point((14, 14), LIGHT)


def mire(draw):
    polygon(draw, [(2, 5), (9, 5), (12, 7), (16, 5), (21, 5), (22, 19), (17, 18), (12, 21), (7, 18), (2, 19)], DARK_TEAL)
    polygon(draw, [(4, 4), (9, 4), (12, 6), (15, 4), (20, 4), (20, 16), (15, 16), (12, 18), (9, 16), (4, 16)], TEAL)
    polygon(draw, [(4, 10), (8, 7), (15, 7), (19, 10), (17, 13), (14, 15), (9, 15), (6, 13)], LIGHT)
    draw.rectangle((10, 9, 13, 13), fill=DARK_TEAL)
    draw.point((11, 9), LIGHT)


def thorin(draw):
    polygon(draw, [(5, 20), (15, 9), (18, 12), (8, 22)], WOOD)
    draw.line([(8, 19), (15, 12)], GOLD, width=1)
    polygon(draw, [(9, 5), (13, 2), (15, 4), (17, 3), (22, 8), (22, 11), (18, 15), (15, 14), (10, 9)], STEEL)
    draw.line([(13, 4), (19, 10), (18, 12)], LIGHT)
    draw.line([(13, 9), (17, 13), (20, 11)], STEEL_SHADOW, width=2)
    draw.line([(5, 5), (5, 9)], GOLD)
    draw.line([(3, 7), (7, 7)], GOLD)


def sera(draw):
    polygon(draw, [(10, 2), (14, 2), (14, 21), (17, 22), (7, 22), (10, 20)], WOOD)
    polygon(draw, [(3, 5), (17, 5), (21, 8), (17, 11), (3, 11)], GOLD)
    polygon(draw, [(2, 15), (6, 12), (20, 12), (20, 18), (6, 18)], TEAL)
    draw.line([(5, 6), (16, 6)], LIGHT)
    draw.line([(7, 14), (18, 14)], "#a4e8c8")
    draw.point((11, 8), BRASS)
    draw.point((12, 16), DARK_TEAL)


def bryn(draw):
    polygon(draw, [(5, 7), (8, 7), (8, 9), (10, 9), (10, 7), (14, 7), (14, 9), (16, 9), (16, 7), (19, 7), (19, 12),
                   (17, 14), (17, 20), (20, 22), (4, 22), (7, 20), (7, 14), (5, 12)], STEEL_SHADOW)
    draw.line([(7, 11), (17, 11)], STEEL, width=2)
    draw.rectangle((9, 14, 11, 17), fill=STEEL)
    polygon(draw, [(13, 1), (17, 5), (15, 5), (15, 10), (11, 10), (11, 5), (9, 5)], GOLD)
    draw.point((13, 3), LIGHT)
    draw.line([(7, 20), (16, 20)], STEEL)


def edda(draw):
    polygon(draw, [(6, 3), (19, 3), (20, 6), (19, 15), (16, 19), (11, 22), (7, 19), (4, 15), (3, 6)], GOLD)
    polygon(draw, [(7, 6), (17, 6), (17, 13), (14, 17), (11, 19), (8, 16), (6, 13)], DARK_TEAL)
    draw.line([(7, 7), (7, 12), (10, 16)], TEAL)
    draw.polygon([(17, 2), (18, 6), (22, 7), (18, 8), (17, 12), (16, 8), (12, 7), (16, 6)], LIGHT)


def lark(draw):
    polygon(draw, [(2, 5), (6, 4), (16, 15), (19, 13), (21, 21), (13, 20), (15, 18), (4, 8)], TEAL)
    polygon(draw, [(2, 19), (5, 21), (16, 11), (18, 13), (22, 4), (13, 5), (15, 7), (5, 17)], GOLD)
    draw.line([(6, 18), (19, 6)], LIGHT, width=1)
    draw.point((5, 5), LIGHT)
    draw.point((18, 18), LIGHT)


def narin(draw):
    polygon(draw, [(5, 9), (9, 9), (9, 6), (16, 6), (16, 9), (19, 9), (21, 12), (21, 20), (18, 22), (6, 22), (3, 19), (3, 12)], DARK_TEAL)
    polygon(draw, [(8, 3), (17, 3), (17, 7), (8, 7)], GOLD)
    draw.rectangle((6, 13, 18, 18), fill=TEAL)
    draw.line([(6, 11), (5, 13), (5, 18)], "#b5f1d3")
    draw.rectangle((11, 11, 13, 20), fill=LIGHT)
    draw.rectangle((8, 14, 16, 17), fill=LIGHT)


def orr(draw):
    polygon(draw, [(10, 2), (13, 2), (15, 5), (18, 6), (19, 14), (22, 17), (21, 20), (3, 20), (2, 17),
                   (5, 14), (6, 7), (8, 5)], GOLD)
    draw.line([(9, 7), (8, 9), (7, 14), (5, 16)], LIGHT, width=2)
    draw.line([(16, 7), (17, 15), (19, 17)], BRASS, width=2)
    draw.line([(5, 18), (19, 18)], BRASS)
    draw.rectangle((10, 20, 13, 22), fill=BRASS, outline=INK)
    draw.point((11, 20), LIGHT)


def lume(draw):
    draw.line([(3, 21), (8, 18), (13, 18), (16, 14), (21, 14)], INK, width=4)
    draw.line([(3, 20), (8, 17), (13, 17), (16, 13), (21, 13)], TEAL, width=2)
    polygon(draw, [(8, 8), (14, 11), (10, 21), (7, 22), (5, 20)], WOOD)
    polygon(draw, [(11, 1), (16, 5), (15, 8), (18, 7), (18, 11), (15, 14), (9, 13), (7, 10), (8, 6)], RED)
    draw.polygon([(11, 5), (14, 8), (15, 8), (15, 11), (12, 12), (9, 10)], GOLD)
    draw.line([(11, 8), (11, 10), (13, 11)], LIGHT)


OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = {}
for draw_icon in (rowan, mire, thorin, sera, bryn, edda, lark, narin, orr, lume):
    image = Image.new("RGBA", (24, 24))
    draw_icon(ImageDraw.Draw(image))
    file = OUTPUT / f"{draw_icon.__name__}.png"
    image.save(file)
    manifest[draw_icon.__name__] = {"file": file.name, "sha256": sha256(file.read_bytes()).hexdigest()}
(OUTPUT / "manifest.json").write_text(
    json.dumps({"size": [24, 24], "source": "../../../qa/render-captain-ability-icons.py", "icons": manifest}, indent=2) + "\n",
    encoding="utf8",
)
