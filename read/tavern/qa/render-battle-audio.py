"""Build the original battle score, attack bank and motion-to-sound mapping."""

import argparse
import hashlib
import json
import runpy
from pathlib import Path
from shutil import copyfile

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "media/unit-sprites/unit-motion-v10/manifest.json"
OUTPUT = ROOT / "media/battle-audio/v2"
MENU = runpy.run_path(str(Path(__file__).with_name("render-menu-music.py")))
RATE = MENU["RATE"]
TAU = 2 * np.pi
HOME = next(score for score in MENU["compose"]() if score.key == "home-hearth-dulcimer")
HOME_INSTRUMENTS = {note.voice for note in HOME.notes}
GROUP_SECONDS = .060

# The action keys are the same keys used by Unity's saved attack animations.
MOTIONS = {
    "bow": "bow", "crossbow": "crossbow", "gun": "gun", "sling": "sling", "throw": "javelin",
    "throwing": "sling", "cutDown": "blade", "cutUp": "blade", "stab": "point",
    "spear": "point", "hook": "point", "axeDown": "axe", "axeSweep": "blade",
    "hammer": "hammer", "club": "wood", "mace": "hammer", "flail": "chain",
    "bash": "shield", "guard": "shield", "ram": "shield", "punch": "fist",
    "wrench": "mechanical", "rake": "claw", "paw": "claw", "rise": "claw",
    "wing": "wing", "bite": "bite", "bluff": "stomp", "ride": "stomp",
    "bell": "bell", "drumHit": "drum", "drumRally": "drum", "gong": "gong", "gongRally": "gong",
    "horn": "horn", "instrument": "horn", "orders": "horn", "flag": "cloth",
    "cast": "magic", "wand": "magic", "lantern": "magic", "scope": "mechanical",
    "seed": "seed", "seedShot": "seed", "brush": "seed", "coil": "electric", "ground": "electric",
    "smoke": "smoke", "furnace": "fire", "torch": "fire", "repair": "mechanical", "supply": "vial",
    "voidBash": "shell", "voidBite": "void-bite", "voidClaw": "void-claw", "voidSweep": "void-claw",
    "voidThrust": "void-spine", "voidShot": "void-shot", "voidChant": "void-chant", "voidSlam": "stomp",
}
ENEMY_EFFECTS = {
    "maw": "void-maw", "pounce": "void-pounce", "tick": "void-pounce",
    "veil": "void-veil", "cannon": "void-cannon", "glass": "void-glass", "mirror": "void-glass",
    "breath": "void-veil", "spore": "smoke",
}
SKILLS = {
    "Rally": "gong", "MarkedThrow": "javelin", "Mend": "heal",
    "GreenShade": "grove", "SpareLoad": "crossbow", "PursuitSignal": "horn",
    "ShieldRelay": "ward", "PowerShare": "mechanical", "EmergencyVial": "vial",
    "RakeSweep": "chain", "EmberScatter": "fire", "OathCounter": "point",
    "CapacitorBurst": "electric", "ShieldFeint": "shield", "RageStomp": "stomp",
}

# Low body resonances, the lengths of their tails, and the band of the leading edge.
MATERIALS = {
    "blade": (960, .032, 1900, 7100, .45), "point": (720, .027, 2400, 6300, .40),
    "axe": (225, .060, 890, 5500, .55), "hammer": (140, .058, 640, 3350, .45),
    "wood": (242, .040, 480, 2850, .30), "chain": (558, .062, 1250, 7800, .46),
    "shield": (315, .044, 650, 4600, .42), "fist": (120, .038, 420, 1900, .18),
    "mechanical": (818, .037, 1550, 7600, .35), "claw": (295, .042, 1250, 6700, .66),
    "wing": (138, .035, 650, 3900, .80), "bite": (185, .038, 980, 4400, .52),
    "stomp": (89, .081, 310, 2200, .49), "shell": (278, .058, 770, 3900, .45),
    "void-bite": (195, .060, 610, 3950, .60), "void-maw": (82, .106, 490, 3700, .76),
    "void-claw": (343, .063, 950, 6500, .63), "void-spine": (455, .051, 1080, 4200, .56),
    "void-pounce": (259, .042, 1150, 4700, .46),
    "hit-armor": (530, .038, 1300, 6300, .36), "hit-shell": (294, .042, 620, 4600, .47),
    "hit-body": (156, .035, 660, 3130, .38), "hit-wood": (328, .045, 420, 3000, .41),
    "block": (640, .057, 1730, 6400, .40), "break": (360, .084, 860, 7500, .73),
    "cock": (850, .016, 2200, 7500, .53),
}

# Bands in Hz. A slightly longer windup in a release cue is reserved for slow or heavy machinery.
RELEASE = {
    "bow": (195, .095, 500, 4550, .50), "crossbow": (394, .101, 1150, 5400, .64),
    "gun": (116, .180, 600, 6400, 1.00), "sling": (230, .115, 920, 5150, .67),
    "javelin": (130, .155, 650, 4550, .74), "seed": (477, .150, 1150, 3700, .32),
    "void-shot": (125, .208, 475, 3600, .75), "void-cannon": (87, .261, 480, 5770, .94),
    "void-veil": (101, .197, 680, 4400, .64), "void-glass": (586, .196, 1750, 6700, .38),
    "void-chant": (192, .370, 330, 2500, .38), "electric": (179, .250, 1250, 7300, .70),
    "smoke": (98, .289, 450, 4150, .80), "fire": (163, .240, 790, 6500, .63),
    "cloth": (143, .148, 510, 2900, .72), "magic": (391, .285, 500, 3650, .30),
    "vial": (810, .250, 540, 7200, .48), "grove": (392, .358, 430, 3000, .43),
    "heal": (392, .368, 460, 2700, .23), "ward": (294, .342, 600, 4300, .29),
    "return": (196, .465, 340, 3430, .55), "danger": (131, .485, 400, 3080, .63),
}
CROWD_ATTACKS = [
    "crossbow", "hit-shell", "shield", "block", "void-pounce", "hit-body", "sling",
    "hit-wood", "void-claw", "electric", "hammer", "hit-armor", "gun", "blade",
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def band(rng, size, low, high):
    freqs = np.fft.rfftfreq(size, 1 / RATE)
    shape = (1 - np.exp(-(freqs / low) ** 4)) * np.exp(-(freqs / high) ** 4)
    noise = np.fft.irfft(np.fft.rfft(rng.standard_normal(size)) * shape, n=size)
    return noise / max(.01, np.std(noise))


def decay(t, duration, attack):
    return MENU["smooth"](t / attack) * np.exp(-t / duration)


def ring(t, hz, tail, ratios=(1, 1.57, 2.31, 3.93), bend=0):
    phase = TAU * hz * (t + bend * .017 * (1 - np.exp(-t / .017)))
    return sum(np.sin(ratio * phase) * np.exp(-t * (1 + i * .45) / tail) / (1 + i * .91)
               for i, ratio in enumerate(ratios))


def echo(signal, lag):
    shift = round(lag * RATE)
    return np.pad(signal, (shift, 0))[:len(signal)]


def cue(kind):
    rng = np.random.default_rng(sum((i + 13) * ord(c) for i, c in enumerate(kind)))
    if kind in MATERIALS:
        hz, tail, low, high, grit = MATERIALS[kind]
        t = np.arange(round(RATE * (.12 + tail * 3.3))) / RATE
        sound = .81 * ring(t, hz, tail, bend=.11) * MENU["smooth"](t / .0015)
        scratch = band(rng, len(t), low, high)
        sound += scratch * grit * decay(t, tail * .6, .0025)
        sound += .23 * band(rng, len(t), low * 1.25, high) * decay(t, .011, .0012)
        if kind in ("chain", "mechanical", "void-claw", "void-maw", "break", "cock"):
            sound += .45 * echo(sound, .024) + .18 * echo(scratch * decay(t, .026, .003), .052)
        if kind in ("claw", "void-claw", "void-spine", "wing"):
            sound += .34 * echo(scratch * decay(t, .038, .016), .023)
    elif kind in RELEASE:
        hz, length, low, high, grit = RELEASE[kind]
        t = np.arange(round(RATE * length)) / RATE
        scratch = band(rng, len(t), low, high)
        sound = scratch * grit * decay(t, length * .24, .002 if kind in ("crossbow", "gun") else .009)
        sound += .64 * ring(t, hz, length * .21, bend=.58) * MENU["smooth"](t / .004)
        if kind == "crossbow":
            latch = band(rng, len(t), 2600, 7500) * decay(t, .009, .001)
            sound = .52 * sound + .44 * latch + .40 * echo(sound, .013)
        elif kind == "bow":
            sound = .88 * ring(t, hz, .023, (1, 2.02, 3.02, 4.015), .20) + .53 * sound
        elif kind == "electric":
            sound += .30 * scratch * decay(t, .11, .008) * (np.sin(TAU * 43 * t) > -.1)
        elif kind in ("void-chant", "grove", "heal", "ward", "return", "danger", "vial", "void-glass", "magic"):
            ratio = {"danger": 1.41, "void-chant": 1.45, "return": 1.49, "vial": 1.77}.get(kind, 1.50)
            second = ring(t, hz * ratio, length * .24, (1, 1.99, 2.46), bend=-.20)
            sound = .60 * sound + .56 * echo(second * decay(t, length * .6, .009), length * .23)
        if kind in ("gun", "void-cannon", "fire"):
            sound += .30 * echo(band(rng, len(t), 300, 2800) * decay(t, length * .25, .006), .025)
    else:
        instrument, midi, duration = {"horn": ("horn", 55, .16), "bell": ("bell", 67, .12),
                                       "drum": ("frame", 44, .07), "gong": ("bell", 49, .24)}[kind]
        note = MENU["Note"](instrument, midi, 0, 1, 1, 0)
        sound = MENU["voice"](note, duration, rng)[:round(RATE * (duration + .17))]
        t = np.arange(len(sound)) / RATE
        sound += .22 * band(rng, len(t), 740, 4200) * decay(t, .024, .002)
        if kind == "gong":
            sound += .43 * ring(t, 376, .095, (1, 1.51, 2.18, 3.37))
    sound *= MENU["smooth"](t / .0014) * MENU["smooth"]((t[-1] - t) / .019)
    peak = max(.001, np.max(np.abs(sound)))
    return sound * (.42 / peak)


def score(stage):
    titles = ("초소 너머", "바위 아래 맥", "균열 앞의 마지막 진형")
    tracks = ("frontier", "depths", "rift")
    music = MENU["Score"](tracks[stage], titles[stage], 96, 64, True, 649 + stage * 16)
    progressions = (
        ("D2 A2 F#3", "G2 D3 B3", "B2 F#3 D4", "A2 E3 D4"),
        ("B2 F#3 D4", "G2 D3 B3", "E2 B2 G3", "A2 E3 D4"),
        ("D2 A2 F3", "Bb2 F3 D4", "G2 D3 Bb3", "A2 E3 D4"),
    )
    refrains = ("A3:.8 D4:1.1 F#4:1.6", "A3:.8 D4:1.1 B3:1.6", "A3:.8 D4:1.1 F4:1.6")
    for bar in range(16):
        beat = bar * 4
        root, fifth, color = progressions[stage][bar % 4].split()
        music.note("bass", root, beat + .04, 2.9, .15, -.07)
        music.chord("strings", beat + .34, f"{fifth} {color}", 3.24, .063, .36)
        music.note("cello", MENU["pitch"](root) + 12, beat + .12, 2.70, .102, -.19)
        if bar % 2 == 0:
            music.note("frame", root, beat + .08, .16, .039, -.11)
        music.note("lute", fifth, beat + 1.68, .61, .070, -.42)
        if bar % 4 == 0:
            music.line("dulcimer", beat + .36, refrains[stage], .116 if stage < 2 else .095, .19)
            music.note("flute", "A4" if stage == 0 else "D4", beat + 1.24, 1.75, .043 if stage < 2 else .031, .40)
        elif bar % 4 == 2:
            music.note("dulcimer", color, beat + 2.12, .67, .054, .27)
    assert {note.voice for note in music.notes} == HOME_INSTRUMENTS
    return music


def music_audio(stage):
    signal = MENU["mix"](score(stage))
    freq = np.fft.rfftfreq(len(signal), 1 / RATE)
    # Reserve the attack/transient band and keep the pulse on small speakers.
    cut = 1 - .80 * np.exp(-.5 * (np.log2(np.maximum(freq, 5) / 2640) / .76) ** 2)
    shape = cut * (1 - np.exp(-(freq / 58) ** 4)) / (1 + (freq / 6200) ** 3)
    signal = np.fft.irfft(np.fft.rfft(signal, axis=0) * shape[:, None], n=len(signal), axis=0)
    return signal * ((.030, .028, .025)[stage] / np.sqrt(np.mean(signal ** 2)))


def map_units():
    units = json.loads(SOURCE.read_text(encoding="utf-8"))["units"]
    result = []
    for unit in units:
        enemy = unit["side"] not in ("ally", "player")
        motions = []
        for attack in unit["attacks"]:
            if attack["key"] == "skill":
                continue
            style = MOTIONS[attack["key"]]
            if enemy:
                style = ENEMY_EFFECTS.get(attack["effect"], style)
            else:
                style = {"sword": "blade", "axe": "axe"}.get(unit["family"], style)
            motions.append({"key": attack["key"], "cue": style,
                            "phase": attack["event"], "label": attack["label"]})
        if enemy:
            shell = {"shell", "void-maw", "stomp", "void-spine"}
            material = "hit-shell" if motions[0]["cue"] in shell or unit["profile"] == "guard" else "hit-body"
        else:
            material = "hit-armor" if unit["family"] in ("shield", "gear", "claw", "ram", "coil") else "hit-body"
            if unit["family"] in ("seedling", "thorn"):
                material = "hit-wood"
        result.append({"id": unit["id"], "name": unit["name"], "side": unit["side"], "family": unit["family"],
                       "impact": material, "motions": motions})
    assert len({unit["id"] for unit in result}) == len(result) == 308
    return result


def group_cues(sequence):
    pending = {}
    completed = []
    for time, kind, gain, pan, priority in sorted(sequence):
        group = pending.get(kind)
        if group is None or time >= group[0]:
            if group is not None:
                completed.append((kind, group))
            group = [time + GROUP_SECONDS, gain, pan, priority, 1]
            pending[kind] = group
        else:
            group[1] = max(group[1], gain)
            group[2] += pan
            group[3] |= priority
            group[4] += 1
    completed.extend(pending.items())
    return sorted((time, kind, gain * max(.40, count ** -.5), pan_sum / count, priority, count)
                  for kind, (time, gain, pan_sum, priority, count) in completed)


def preview(track, bank, dense):
    duration = 12 if dense else 10
    signal = np.zeros((duration * RATE, 2))
    duck_request = np.ones(len(signal))
    sequence = []
    if dense:
        for index, start in enumerate(np.arange(.55, duration - .65, .102)):
            kind = CROWD_ATTACKS[index % len(CROWD_ATTACKS)]
            pan = (-.32, .24, .08, -.10)[index % 4]
            sequence.append((start, kind, .40, pan))
            if index % 3 != 1:
                sequence.extend([(start + .012, kind, .40, -pan), (start + .042, kind, .40, .09)])
            if index % 8 == 3:
                sequence.append((start + .036, "hit-shell", .31, .11))
        sequence += [(2.95, "gong", .56, -.11), (6.44, "break", .53, .12), (9.25, "void-maw", .52, .2)]
    else:
        sequence = [(.65, "crossbow", .69, -.24), (.99, "hit-shell", .62, .20),
                    (1.75, "void-pounce", .61, .15), (2.51, "blade", .59, -.09),
                    (3.2, "shield", .65, -.19), (3.21, "block", .69, -.02),
                    (4.17, "bow", .61, -.28), (4.53, "hit-body", .55, .14),
                    (5.25, "gong", .76, -.15), (6.32, "void-shot", .65, .24),
                    (6.65, "hit-armor", .61, -.10), (7.4, "gun", .68, -.24),
                    (7.76, "hit-shell", .59, .22), (8.46, "heal", .75, -.08)]
    sequence = [(time, kind, gain * (1 if dense else .70), pan, gain >= .52 if dense else gain >= .72)
                for time, kind, gain, pan in sequence]
    grouped = group_cues(sequence)
    ungrouped = np.zeros_like(signal)
    for time, kind, gain, pan, _ in sequence:
        start = round(time * RATE)
        sample = bank[kind] * gain
        angle = (1 + pan) * np.pi / 4
        ungrouped[start:start + len(sample)] += sample[:, None] * np.array([np.cos(angle), np.sin(angle)])
    for time, kind, gain, pan, priority, _ in grouped:
        start = round(time * RATE)
        sample = bank[kind] * gain
        angle = (1 + pan) * np.pi / 4
        signal[start:start + len(sample)] += sample[:, None] * np.array([np.cos(angle), np.sin(angle)])
        if gain < .2:
            continue
        attack, hold, tail = (10, 135, 185) if priority else (8, 65, 140)
        steps = np.array([attack, hold, tail]) * (RATE // 1000)
        floor = .53 if priority else .77
        curve = 1 - (1 - floor) * np.concatenate((np.linspace(0, 1, steps[0]),
                    np.ones(steps[1]), np.linspace(1, 0, steps[2])))
        end = min(len(signal), start + len(curve))
        duck_request[start:end] = np.minimum(duck_request[start:end], curve[:end - start])
    music = track[:len(signal)] * .85
    mixed = signal + music * duck_request[:, None]
    for audio in (signal, mixed):
        audio[-RATE // 3:] *= np.linspace(1, 0, RATE // 3)[:, None]
    peak_before = dbfs(np.max(np.abs(ungrouped)))
    peak_after = dbfs(np.max(np.abs(signal)))
    return signal, mixed, duck_request, {"requestedCues": len(sequence), "playedCues": len(grouped),
                                        "ungroupedEffectsPeakDbfs": peak_before, "effectsPeakDbfs": peak_after,
                                        "largestGroup": max(item[-1] for item in grouped)}


def dbfs(value):
    return round(float(20 * np.log10(max(1e-9, value))), 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--unity", type=Path, action="append", default=[],
                        help="Stage the bank in the specified Unity project's Resources.")
    args = parser.parse_args()
    units = map_units()
    names = set(MATERIALS) | set(RELEASE) | {"horn", "gong", "bell", "drum"}
    used = {motion["cue"] for unit in units for motion in unit["motions"]} | set(SKILLS.values())
    assert used <= names
    for folder in ("sfx", "music", "preview"):
        (OUTPUT / folder).mkdir(parents=True, exist_ok=True)
    bank = {}
    for name in sorted(names):
        audio = cue(name)
        if name in {"break", "gong", "void-maw", "void-cannon", "gun"}:
            freqs = np.fft.rfftfreq(len(audio), 1 / RATE)
            audio = np.fft.irfft(np.fft.rfft(audio) / (1 + (freqs / 2800) ** 3), n=len(audio))
            time = np.arange(len(audio)) / RATE
            audio *= np.exp(-time / .15) * MENU["smooth"](time / .002) * MENU["smooth"]((time[-1] - time) / .015)
        bank[name] = audio
        assert np.max(np.abs(audio)) < .45 and np.std(audio) > .006 and audio[0] == audio[-1] == 0
        MENU["write_wav"](OUTPUT / "sfx" / f"{name}.wav", audio[:, None])

    runtime = {"units": units, "skills": [{"id": skill, "cue": name} for skill, name in SKILLS.items()]}
    (OUTPUT / "profiles.json").write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metrics = {"sampleRate": RATE, "unitCount": len(units), "categories": len(names), "variants": 1,
               "homeInstrumentSource": HOME.key, "instruments": sorted(HOME_INSTRUMENTS), "groupWindowMs": 60,
               "skillCount": len(SKILLS), "sourceMotion": digest(SOURCE), "music": [], "previews": []}
    for stage in range(3):
        song = score(stage)
        track = music_audio(stage)
        assert len(track) == 40 * RATE and np.max(np.abs(track)) < .32
        pcm_step = np.max(np.abs(track[0] - track[-1]))
        typical_step = np.quantile(np.abs(np.diff(track, axis=0)), .95)
        assert pcm_step < 1.5 * typical_step, song.key
        file = OUTPUT / "music" / (song.key + ".wav")
        MENU["write_wav"](file, track)
        metrics["music"].append({"id": song.key, "name": song.name, "seconds": 40,
                                 "rmsDbfs": dbfs(np.sqrt(np.mean(track ** 2))),
                                 "peakDbfs": dbfs(np.max(np.abs(track))), "loopStep": round(float(pcm_step), 7),
                                 "sha256": digest(file)})
        if stage in (0, 2):
            dry, mixed, duck, grouping = preview(track, bank, stage == 2)
            peak = np.max(np.abs(mixed))
            assert peak < .85
            MENU["write_wav"](OUTPUT / "preview" / f"{song.key}-effects.wav", dry)
            MENU["write_wav"](OUTPUT / "preview" / f"{song.key}-mix.wav", mixed)
            metrics["previews"].append({"id": song.key, "peakDbfs": dbfs(peak),
                                        "duckDb": dbfs(min(duck)), **grouping})
    metrics["files"] = {file.relative_to(OUTPUT).as_posix(): digest(file)
                        for file in sorted(OUTPUT.rglob("*.wav"))}
    (OUTPUT / "manifest.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for project in args.unity:
        target = project / "Assets/Resources/BattleAudio"
        for file in [OUTPUT / "profiles.json", *OUTPUT.glob("sfx/*.wav"), *OUTPUT.glob("music/*.wav")]:
            dest = target / file.relative_to(OUTPUT)
            dest.parent.mkdir(parents=True, exist_ok=True)
            copyfile(file, dest)
    print(json.dumps({key: val for key, val in metrics.items() if key != "files"}, ensure_ascii=True))


if __name__ == "__main__":
    main()
