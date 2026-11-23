"""Replace only the two enemy action rows in the v9 sheets."""

import hashlib
import json
import shutil
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from void_motion_profiles import PROFILES

ROOT = Path(__file__).resolve().parents[1] / "media/unit-sprites"
PREVIOUS = ROOT / "unit-motion-v9"
OUTPUT = ROOT / "unit-motion-v10"
SIZE = 88
Y, X = np.indices((SIZE, SIZE), dtype=float)

# Anticipation, loading, impact and recovery can use different amounts in x/y.
DRIVE = (0, -.18, -.37, -.49, -.26, 1, .6, .27, .08, 0)
LIFT = (0, .14, .36, .71, 1, .38, .16, .2, .11, 0)
CLAMP = (0, .17, .4, .63, .83, .92, .71, .38, .12, 0)
PHASES = {
    "pounce": ("뒷다리 접기", "앞다리 들기", "뒷발 밀기", "접촉", "앞발 착지", "뒷발 회수"),
    "bite": ("턱 끌어당기기", "윗턱 들기", "아래턱 벌리기", "턱 닫기", "고개 회수", "입 다물기"),
    "pinch": ("집게 당기기", "집게 벌리기", "집게 뻗기", "집게 닫기", "팔 회수", "집게 내리기"),
    "ram": ("하체 받치기", "갑각 당기기", "갑각 기울이기", "갑각 밀기", "반동 받기", "갑각 내리기"),
    "curl": ("하체 누르기", "껍질 벌리기", "껍질 말기", "방어면 닫기", "껍질 풀기", "하체 펴기"),
    "raise": ("관절 접기", "갑각 들기", "정면 세우기", "갑각 펼치기", "갑각 내리기", "관절 펴기"),
    "slam": ("무게 옮기기", "돌판 들어 올리기", "정점 멈춤", "바닥 접촉", "돌판 반동", "다리 펴기"),
    "scythe": ("칼날 당기기", "반대쪽에 무게 싣기", "날을 돌리기", "날 접촉", "호 회수", "다시 세우기"),
    "thrust": ("공격 기관 당기기", "하체 고정", "조준하기", "앞쪽으로 찌르기", "날 거두기", "다리 풀기"),
    "grow": ("마디 접기", "기관 수축", "결을 모으기", "끝 마디 펴기", "늘어난 자세", "끝 고정"),
    "tendril": ("막 모으기", "막 뒤로 감기", "앞쪽으로 풀기", "막 끝 접촉", "끝 회수", "막 내리기"),
    "hook": ("갈고리 되감기", "끝 세우기", "낮게 던지기", "끝 접촉", "몸 당기기", "끝 회수"),
    "puff": ("흡입", "공격부 수축", "발사구 팽창", "내용물 방출", "개구부 반동", "몸 가라앉기"),
    "chorus": ("아래 기관 열기", "가운데 기관 열기", "윗끝 열기", "세 작용점 연쇄", "차례로 닫기", "다시 모이기"),
    "gather": ("외곽 낮추기", "조각 뒤로 흩기", "중앙 모으기", "핵 중심 결합", "외곽 펴기", "안정"),
    "split": ("외곽 움츠리기", "가운데 결 열기", "두 판 떠올리기", "두 갈래 열기", "외곽 수습", "안정"),
    "pivot": ("반사면 내리기", "각도 바꾸기", "반사면 세우기", "앞쪽 반사", "각도 거두기", "안정"),
    "recoil": ("다리 벌리기", "포구 뒤로 당기기", "조준", "포탄 방출", "포구 반동", "관절 풀기"),
    "burrow": ("모래톱 낮추기", "바닥 아래 웅크리기", "아래에서 전진", "정면으로 솟기", "착지", "등판 내리기"),
}


def pose(source, profile, frame):
    _, family, ax, ay, reach, rise, _ = profile
    left, top, right, bottom = source.getbbox()
    width, height = right - left, bottom - top
    px, py = left + width * ax / 100, top + height * ay / 100
    data = np.asarray(source)
    part = np.exp(-((X - px) / (width * .38)) ** 2 - ((Y - py) / (height * .44)) ** 2)
    grounded = np.clip((bottom - 2 - Y) / (height * .40), 0, 1)
    body = np.clip((bottom + 1 - Y) / (height * .19), 0, 1)
    forward, prep, clamp = DRIVE[frame], LIFT[frame], CLAMP[frame]
    dx = body * forward * 1.5
    dy = -grounded * prep
    if family in {"bite", "pinch", "chorus"}:
        opening = (0, .13, .39, .78, 1, .07, .12, .25, .1, 0)[frame]
        side = np.clip((Y - py) / (height * .20), -1, 1)
        if family == "pinch":
            side = np.clip((X - px) / (width * .25), -1, 1)
        if family == "chorus":
            side = np.sin((Y - py) / (height * .10) - frame * .7) * .66
            opening = .48 * opening + .5 * clamp
        dy += part * opening * rise * side
        dx += part * reach * forward * .68
    elif family in {"thrust", "pounce", "burrow", "recoil", "hook"}:
        dx += part * reach * forward * .75
        if family == "pounce":
            dy -= prep * rise * (.46 * grounded + .39 * part)
            dx -= (1 - grounded) * np.clip((px - X) / width, 0, 1) * reach * prep
        elif family == "burrow":
            dy += grounded * rise * (prep - max(0, forward) * 1.05)
        elif family == "hook":
            tail = part * np.clip((top + height * .74 - Y) / (height * .35), 0, 1)
            dx += tail * reach * (.37 * forward - .25 * prep)
            dy += tail * rise * (.79 * forward - .87 * prep)
        elif family == "recoil":
            dx -= part * reach * (0, .15, .29, .36, .37, 0, .81, .58, .18, 0)[frame]
    elif family in {"scythe", "pivot", "tendril", "slam"}:
        dy += part * rise * (forward * (.64 if family == "slam" else -.46) - prep * .79)
        dx += part * reach * (forward * .66 + prep * (Y - py) / height)
        if family == "pivot":
            dx += part * prep * (py - Y) * .26
    elif family in {"curl", "gather", "split", "puff"}:
        x_axis = np.clip((X - px) / (width * .38), -1, 1)
        y_axis = np.clip((Y - py) / (height * .4), -1, 1)
        spread = clamp if family == "split" else -.64 * clamp
        if family == "puff":
            spread = .62 * max(0, forward) - .5 * prep
        dx += part * x_axis * spread * reach
        dy += grounded * (part * y_axis * spread * rise + prep * rise * (.70 if family == "curl" else -.42))
    else:  # An anchored shell raise, a shield ram, or a growing attack organ.
        dx += part * reach * (clamp if family == "grow" else forward * .72)
        dy -= part * grounded * rise * (clamp if family == "raise" else prep) * .85

    # Back-map the nearest original pixel. Repeated estimates keep adjoining
    # planes together at the hinge while retaining the exact source palette.
    sx, sy = X.copy(), Y.copy()
    for _ in range(3):
        sx, sy = (
            X - ndimage.map_coordinates(dx, (sy, sx), order=1, mode="nearest"),
            Y - ndimage.map_coordinates(dy, (sy, sx), order=1, mode="nearest"),
        )
    ix = sx.round().astype(int).clip(0, SIZE - 1)
    iy = sy.round().astype(int).clip(0, SIZE - 1)
    image = data[iy, ix].copy()
    opaque = image[:, :, 3] > 0
    if frame not in {0, 9}:
        groups, _ = ndimage.label(opaque, structure=np.ones((3, 3)))
        sizes = np.bincount(groups[opaque])
        keep = np.flatnonzero(sizes >= 3)
        image[opaque & ~np.isin(groups, keep)] = 0
    rows, cols = np.nonzero(image[:, :, 3])
    hx, hy = min(SIZE - 1, round(px)), min(SIZE - 1, round(py))
    contact = ((cols - px - dx[hy, hx]) ** 2 + (rows - py - dy[hy, hx]) ** 2).argmin()
    return Image.fromarray(image), [int(cols[contact]), int(rows[contact])]


def bake(unit, source_path):
    with Image.open(source_path) as src:
        sheet = src.convert("RGBA")
    original = sheet.crop((0, 0, SIZE, SIZE))
    def palette(image):
        pixels = np.asarray(image)
        return set(map(tuple, pixels[pixels[:, :, 3] != 0]))

    base_palette = palette(original)
    for clip, profile in zip(unit["attacks"], PROFILES[unit["id"]], strict=True):
        label, family, *_, shape = profile
        clip.update(label=label, effect=shape)
        phase = PHASES[family]
        clip["phases"] = ["대기", phase[0], phase[1], phase[1], phase[2], phase[3], phase[4], phase[4], phase[5], "대기"]
        frames, points = zip(*(pose(original, profile, i) for i in range(10)))
        for i, frame in enumerate(frames):
            if not palette(frame) <= base_palette:
                raise ValueError(f"{unit['id']} {label} changed its palette")
            if min(frame.getbbox()[:2]) < 1 or max(frame.getbbox()[2:]) >= SIZE:
                raise ValueError(f"{unit['id']} {label} was cropped")
            sheet.paste(frame, (i * SIZE, clip["row"] * SIZE))
        if len({frame.tobytes() for frame in frames}) < 7:
            raise ValueError(f"{unit['id']} {label} has too few poses")
        clip["tip"] = list(points)
        clip["markerPixel"] = points[clip["eventFrame"]]
    file = OUTPUT / unit["sheet"]
    sheet.save(file, optimize=True)
    unit["sha256"] = hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    manifest = json.loads((PREVIOUS / "manifest.json").read_text(encoding="utf-8"))
    manifest["version"] = 10
    enemies = {u["id"] for u in manifest["units"] if u["side"] == "enemy"}
    assert enemies == PROFILES.keys()
    (OUTPUT / "png").mkdir(parents=True, exist_ok=True)
    for unit in manifest["units"]:
        source = PREVIOUS / unit["sheet"]
        if unit["side"] == "enemy":
            bake(unit, source)
        else:
            shutil.copyfile(source, OUTPUT / unit["sheet"])
    report = {"alliesReused": 276, "enemies": len(enemies), "newClips": 64, "newFrames": 640}
    for name, data in (("manifest", manifest), ("qa", report)):
        (OUTPUT / (name + ".json")).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    preview = {**manifest, "effectLabels": {"contact": "타격", "release": "발사", "cast": "시전"}}
    (OUTPUT / "preview-data.js").write_text(
        "window.tavernUnitMotionV10 = " + json.dumps(preview, ensure_ascii=False) + ";\n", encoding="utf-8"
    )
    with zipfile.ZipFile(OUTPUT / "tavern-heros-unit-motion-v10.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for path in ["manifest.json", "qa.json", *(unit["sheet"] for unit in manifest["units"])]:
            archive.write(OUTPUT / path, path)
    print(report)


if __name__ == "__main__":
    main()
