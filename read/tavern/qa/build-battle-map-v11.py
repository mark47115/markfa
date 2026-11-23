"""Rebuild the battle maps on the start-screen key art's pixel grid.

The v10 maps used a 240x135 grid (7 px per dot). The key art and the generated
v10 sources both draw one dot at about 5 px, so the 7 px grid merged outlines,
window frames and flower centers into the surrounding colors. v11 samples the
same v10 sources on a 336x189 grid and enlarges each dot 5x to 1680x945, the
same canvas as v10.

Usage:
  .venv-video/Scripts/python qa/build-battle-map-v11.py           # write grids, PNGs and the review sheets
  .venv-video/Scripts/python qa/build-battle-map-v11.py --check   # verify the saved PNGs only
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

PROJECT = Path(__file__).resolve().parents[1]
MAPS = PROJECT / "media/battle-maps"
SOURCE = MAPS / "v10/sources"
OUT = MAPS / "v11"
KEY_ART = PROJECT / "media/start-screen/v11/art-sprite-grid-matched-pixels-pc.png"
WIDTH, HEIGHT, SCALE = 336, 189, 5
MAX_COLORS = 64
IDS = [f"r{n:02d}" for n in range(1, 16)]


def to_lab(rgb):
    """sRGB 0-255 -> CIE Lab, so the palette is chosen by perceived distance."""
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    xyz /= np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def assign(points, centers):
    labels = np.empty(len(points), dtype=np.int32)
    for start in range(0, len(points), 20_000):
        chunk = points[start:start + 20_000]
        labels[start:start + 20_000] = ((chunk[:, None, :] - centers[None]) ** 2).sum(axis=2).argmin(axis=1)
    return labels


def kmeans(points, k, rng, iterations=30):
    """k-means++ seeding, then Lloyd iterations."""
    centers = [points[rng.integers(len(points))]]
    distance = ((points - centers[0]) ** 2).sum(axis=1)
    for _ in range(1, k):
        centers.append(points[rng.choice(len(points), p=distance / distance.sum())])
        distance = np.minimum(distance, ((points - centers[-1]) ** 2).sum(axis=1))
    centers = np.array(centers)
    for _ in range(iterations):
        labels = assign(points, centers)
        for j in range(k):
            members = points[labels == j]
            if len(members):
                centers[j] = members.mean(axis=0)
    return centers, assign(points, centers)


def palette_for(rgb):
    """Per-map palette of at most MAX_COLORS source colors, chosen in Lab.

    Every palette entry is an actual source color (the member nearest each
    cluster center), so small saturated accents keep their real hue.
    """
    pixels = rgb.reshape(-1, 3)
    rng = np.random.default_rng(7)
    sample = pixels[rng.choice(len(pixels), 120_000, replace=False)].astype(np.float64)
    lab = to_lab(sample)
    centers, labels = kmeans(lab, MAX_COLORS, rng)
    palette = []
    for k in range(len(centers)):
        members = np.flatnonzero(labels == k)
        if members.size == 0:
            continue
        pick = members[((lab[members] - centers[k]) ** 2).sum(axis=1).argmin()]
        palette.append(sample[pick])
    return np.unique(np.array(palette).astype(np.uint8), axis=0)


def nearest(rgb, palette):
    lab = to_lab(rgb.astype(np.float64))
    pal = to_lab(palette.astype(np.float64))
    flat = lab.reshape(-1, 3)
    index = np.empty(len(flat), dtype=np.int32)
    for start in range(0, len(flat), 200_000):
        chunk = flat[start:start + 200_000]
        index[start:start + 200_000] = ((chunk[:, None, :] - pal[None]) ** 2).sum(axis=2).argmin(axis=1)
    return index.reshape(rgb.shape[:2])


def sample_grid(index, palette_size):
    """Each dot takes the most common palette color in its source cell."""
    height, width = index.shape
    edges_x = np.rint(np.linspace(0, width, WIDTH + 1)).astype(int)
    edges_y = np.rint(np.linspace(0, height, HEIGHT + 1)).astype(int)
    grid = np.empty((HEIGHT, WIDTH), dtype=np.int32)
    for y in range(HEIGHT):
        band = index[edges_y[y]:edges_y[y + 1]]
        for x in range(WIDTH):
            cell = band[:, edges_x[x]:edges_x[x + 1]].ravel()
            grid[y, x] = np.bincount(cell, minlength=palette_size).argmax()
    return grid


def clean_isolated(grid, palette):
    """Replace a lone dot only when all 8 neighbours share one color close to it.

    Distinct one-dot details (flower centers, glints) differ strongly from their
    surroundings and are kept.
    """
    lab = to_lab(palette.astype(np.float64))
    out = grid.copy()
    for y in range(1, HEIGHT - 1):
        for x in range(1, WIDTH - 1):
            ring = np.delete(grid[y - 1:y + 2, x - 1:x + 2].ravel(), 4)
            if (ring == ring[0]).all() and ring[0] != grid[y, x]:
                if np.sqrt(((lab[ring[0]] - lab[grid[y, x]]) ** 2).sum()) < 12:
                    out[y, x] = ring[0]
    return out


def enlarge(rgb_grid):
    return Image.fromarray(rgb_grid).resize((WIDTH * SCALE, HEIGHT * SCALE), Image.NEAREST)


def match_seams(grids):
    """Neighbouring maps share their boundary: the next map's first column copies
    the previous map's last column, so the stitched strip has no jump."""
    for left, right in zip(grids, grids[1:]):
        right[:, 0] = left[:, -1]
    return grids


def check(paths):
    report, previous = [], None
    for path in paths:
        image = np.asarray(Image.open(path).convert("RGB"))
        errors = []
        if image.shape[:2] != (HEIGHT * SCALE, WIDTH * SCALE):
            errors.append(f"size {image.shape[1]}x{image.shape[0]}")
        else:
            blocks = image.reshape(HEIGHT, SCALE, WIDTH, SCALE, 3)
            broken = int((blocks != blocks[:, :1, :, :1]).any(axis=(1, 3, 4)).sum())
            if broken:
                errors.append(f"{broken} dots are not one color")
        # The first column is borrowed from the previous map (see match_seams),
        # so the map's own palette is counted without it.
        colors = len(np.unique(image[:, SCALE:].reshape(-1, 3), axis=0))
        if colors > MAX_COLORS:
            errors.append(f"{colors} colors")
        seam = None
        if previous is not None:
            seam = int(np.abs(previous[:, -1].astype(int) - image[:, 0].astype(int)).sum())
            if seam:
                errors.append("boundary column differs from the previous map")
        previous = image
        report.append({"id": path.stem, "colors": colors, "seamDifference": seam, "errors": errors})
    return report


def sheet(images, path, columns=3, width=556):
    height = round(width * HEIGHT / WIDTH)
    rows = -(-len(images) // columns)
    canvas = Image.new("RGB", (columns * width, rows * height), "black")
    draw = ImageDraw.Draw(canvas)
    for i, (label, image) in enumerate(images):
        x, y = (i % columns) * width, (i // columns) * height
        canvas.paste(image.resize((width, height), Image.LANCZOS), (x, y))
        draw.rectangle([x, y, x + 46, y + 20], fill="black")
        draw.text((x + 5, y + 4), label, fill="white")
    canvas.save(path)


def detail_sheet(path):
    """Same 250x166 area at 3x: key art, v10 and v11, to judge dot size and edges."""
    crops = [
        ("key art", Image.open(KEY_ART).convert("RGB").crop((600, 700, 850, 866))),
        ("v10 r01", Image.open(MAPS / "v10/r01.png").convert("RGB").crop((600, 20, 850, 186))),
        ("v11 r01", Image.open(OUT / "r01.png").convert("RGB").crop((600, 20, 850, 186))),
        ("v10 r15", Image.open(MAPS / "v10/r15.png").convert("RGB").crop((1300, 200, 1550, 366))),
        ("v11 r15", Image.open(OUT / "r15.png").convert("RGB").crop((1300, 200, 1550, 366))),
        ("v11 r08", Image.open(OUT / "r08.png").convert("RGB").crop((700, 0, 950, 166))),
    ]
    canvas = Image.new("RGB", (3 * 750, 2 * 498), "black")
    draw = ImageDraw.Draw(canvas)
    for i, (label, crop) in enumerate(crops):
        x, y = (i % 3) * 750, (i // 3) * 498
        canvas.paste(crop.resize((750, 498), Image.NEAREST), (x, y))
        draw.rectangle([x, y, x + 70, y + 20], fill="black")
        draw.text((x + 5, y + 4), label, fill="white")
    canvas.save(path)


def build():
    (OUT / "grid").mkdir(parents=True, exist_ok=True)
    (OUT / "qa").mkdir(exist_ok=True)
    grids, palettes = [], []
    for map_id in IDS:
        rgb = np.asarray(Image.open(SOURCE / f"{map_id}.png").convert("RGB"))
        palette = palette_for(rgb)
        grid = clean_isolated(sample_grid(nearest(rgb, palette), len(palette)), palette)
        grids.append(palette[grid])
        palettes.append(palette)
        print(map_id, f"{len(palette)} colors")
    grids = match_seams(grids)
    for map_id, rgb_grid in zip(IDS, grids):
        Image.fromarray(rgb_grid).save(OUT / "grid" / f"{map_id}.png")
        enlarge(rgb_grid).save(OUT / f"{map_id}.png", optimize=True)
    (OUT / "build.json").write_text(json.dumps({
        "schemaVersion": 1,
        "source": "../v10/sources/rNN.png (기본 내장 OpenAI ImageGen, 프롬프트는 ../v10/prompts.json)",
        "grid": {"width": WIDTH, "height": HEIGHT, "scale": SCALE, "png": [WIDTH * SCALE, HEIGHT * SCALE]},
        "reference": "../../start-screen/v11/art-sprite-grid-matched-pixels-pc.png — 도트 한 칸 약 5px",
        "method": [
            "맵마다 원본 색에서 Lab k-means로 최대 64색을 고른다. 각 색은 실제 원본 픽셀이다.",
            "원본 픽셀을 디더 없이 가장 가까운 색으로 바꾼 뒤, 336×189 칸마다 가장 많은 색을 고른다.",
            "주변 8칸이 같은 색이고 색 차이가 작은 외딴 칸만 정리한다.",
            "다음 맵의 첫 열은 이전 맵의 마지막 열을 그대로 쓴다.",
            "각 칸을 5배 최근접 확대해 1680×945 PNG로 저장한다.",
        ],
        "colors": {map_id: int(len(p)) for map_id, p in zip(IDS, palettes)},
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    sheet([(m, Image.open(OUT / f"{m}.png")) for m in IDS], OUT / "qa/comparison.png")
    detail_sheet(OUT / "qa/detail-3x.png")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if not args.check:
        build()
    report = check([OUT / f"{m}.png" for m in IDS])
    (OUT / "qa").mkdir(parents=True, exist_ok=True)
    (OUT / "qa/check.json").write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    failed = [r for r in report if r["errors"]]
    for r in report:
        print(r["id"], r["colors"], "colors", "OK" if not r["errors"] else "; ".join(r["errors"]))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
