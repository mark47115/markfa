"""Render the original Tavern Heros menu scores. Requires NumPy and FFmpeg."""

import argparse
import hashlib
import json
import re
import subprocess
import wave
from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np


RATE = 48_000
TAU = 2 * np.pi
ROOT = Path(__file__).resolve().parents[1]
PITCHES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def pitch(note):
    letter, accidental, octave = re.fullmatch(r"([A-G])([#b]?)(\d)", note).groups()
    return 12 * (int(octave) + 1) + PITCHES[letter] + {"": 0, "#": 1, "b": -1}[accidental]


@dataclass(frozen=True)
class Note:
    voice: str
    midi: int
    beat: float
    length: float
    level: float
    pan: float


@dataclass
class Score:
    key: str
    name: str
    bpm: int
    beats: int
    loop: bool
    seed: int
    notes: list[Note] = field(default_factory=list)

    def note(self, voice, key, beat, length, level, pan=0):
        midi = pitch(key) if isinstance(key, str) else key
        self.notes.append(Note(voice, midi, beat, length, level, pan))

    def line(self, voice, beat, notation, level, pan=0):
        count = 0
        for token in notation.split():
            key, duration = token.split(":")
            length = float(duration)
            if key != "-":
                variation = (1, .88, .96, .9, .92)[count % 5]
                self.note(voice, key, beat, length * .95, level * variation, pan)
                count += 1
            beat += length
        return beat

    def chord(self, voice, beat, keys, length, level, width=.34):
        for index, key in enumerate(keys.split()):
            self.note(voice, key, beat, length, level * (1 - .08 * index), (index % 3 - 1) * width)


def compose():
    rally = Score("title-gather", "불빛 아래 집결", 106, 11, False, 172)
    rally.line("horn", 0, "-:0.5 D4:0.5 A4:0.75 D5:1.25 C5:0.5 A4:0.5 G4:0.5 F4:0.5 A4:0.75 D5:2.5", .39, -.08)
    rally.line("strings", 1, "D4:1.75 F4:0.75 E4:0.5 D4:0.5 C4:0.5 E4:0.75 F4:2.5", .17, .28)
    for beat, chord in ((0, "D3 A3 F4"), (2.5, "Bb2 F3 D4"), (4, "G2 D3 Bb3"),
                        (5.5, "A2 E3 C#4"), (6.25, "D3 A3 F4")):
        rally.chord("strings", beat, chord, 2.9 if beat == 6.25 else 1.3, .095)
    for beat, key, level in ((0, "D2", .25), (2.5, "Bb2", .14), (5.5, "A2", .13), (6.25, "D2", .25)):
        rally.note("bass", key, beat, 1.5, level, -.06)
        rally.note("drum", "D2", beat, .55, level * .8)
    rally.line("bell", 6.25, "A4:0.25 D5:0.25 F5:1.75", .095, .38)

    rift = Score("title-rift", "균열 너머", 82, 11, False, 281)
    rift.chord("choir", 0, "E3 B3 F4", 3.2, .16)
    rift.chord("choir", 3.15, "C3 G3 E4", 2.35, .17)
    rift.chord("choir", 5.4, "E3 B3 G4", 3.55, .19)
    rift.line("bell", .34, "E5:0.9 B4:0.6 F5:1.15 -:0.55 G5:0.95 D5:0.65 E5:2.7", .29, .2)
    rift.line("strings", 1.55, "B3:1.1 C4:1.35 G3:1.4 F3:0.65 E3:2.6", .19, -.25)
    for beat, key, strength in ((0, "E2", .19), (3.15, "C2", .18), (5.4, "E2", .29)):
        rift.note("bass", key, beat, 2.25, strength)
        rift.note("drum", key, beat, .8, strength * .64)
    rift.note("bell", "B5", 6.45, 1.7, .075, -.48)

    march = Score("title-expedition", "첫 출정", 116, 13, False, 344)
    march.line("flute", .5, "G4:0.5 B4:0.5 D5:0.5 G5:1.0 F#5:0.5 E5:0.5 D5:1.0 "
                           "B4:0.5 C5:0.5 E5:0.5 D5:1.0 A4:0.5 B4:0.5 G4:2.75", .32, .18)
    march.line("horn", 5, "-:0.5 E4:1.5 D4:1.0 F#4:1.0 G4:2.7", .18, -.21)
    for start, keys in zip((0, 2, 4, 6, 8, 9),
                           ("G3 B3 D4 G4", "C3 G3 E4 G4", "E3 B3 G4 B4", "C3 G3 E4 G4", "D3 A3 F#4 A4", "G3 D4 B4 G5")):
        for index, key in enumerate(keys.split()):
            march.note("lute", key, start + index * .22, 1.25, .22 + (index % 2) * .035, -.4)
        march.note("bass", keys.split()[0], start, 1.4, .19)
        if start != 8:
            march.note("frame", "G2", start, .4, .19)
    march.chord("strings", 9, "G3 D4 G4 B4", 2.35, .10)

    hearth = Score("home-hearth", "변경의 벽난로", 72, 48, True, 591)
    hearth_chords = [
        "D2 A2 D4 F#4", "G2 D3 B3 G4", "E2 B2 G3 E4", "A2 E3 C#4 G4",
        "D2 A2 D4 F#4", "B2 F#3 D4 A4", "G2 D3 B3 G4", "A2 E3 C#4 F#4",
        "B2 F#3 D4 A4", "F#2 C#3 A3 E4", "G2 D3 B3 E4", "D2 A2 F#3 D4",
        "E2 B2 G3 D4", "G2 D3 B3 G4", "A2 E3 D4 E4", "A2 E3 C#4 G4",
    ]
    hearth_melody = [
        "A4:.5 D5:1 E5:.5 F#5:1", "E5:.5 D5:1 B4:1.5", "G4:.5 B4:.5 E5:1.5 D5:.5", "C#5:1 B4:.5 A4:1.5",
        "A4:.5 D5:1 E5:.5 F#5:.5 A5:.5", "F#5:1 E5:.5 D5:1 B4:.5", "D5:.5 E5:.5 G5:1 F#5:.5 E5:.5", "C#5:1 E5:.5 A4:1 -:.5",
        "B4:.5 D5:.5 F#5:.5 B5:1 A5:.5", "G5:.5 F#5:1 E5:.5 C#5:1", "B4:.5 D5:.5 E5:1 G5:1", "F#5:1.5 E5:.5 D5:1",
        "B4:.5 E5:1 D5:.5 B4:1", "G4:.5 B4:.5 D5:1 E5:1", "F#5:.5 E5:.5 D5:1 E5:1", "C#5:1 B4:.5 A4:1 -:.5",
    ]
    for bar, (chord, melody) in enumerate(zip(hearth_chords, hearth_melody)):
        beat = bar * 3
        root, fifth, third, top = chord.split()
        hearth.line("flute", beat, melody, .26 if bar != 7 else .21, .23)
        hearth.note("bass", root, beat, 1.45, .14, -.07)
        hearth.note("bass", fifth, beat + 1.5, 1.15, .09, -.07)
        for offset, key, strength in zip((0, .49, 1.02, 1.49, 2.02, 2.49),
                                         (fifth, third, top, third, fifth, top),
                                         (.23, .14, .18, .20, .13, .12)):
            hearth.note("lute", key, beat + offset, 1.0, strength, -.5)
        if bar >= 4:
            hearth.note("frame", "D2", beat, .32, .085, .12)
            hearth.note("frame", "A2", beat + 1.5, .22, .046, .32)
        if bar in (3, 6, 10, 11, 14, 15):
            hearth.chord("strings", beat + .07, f"{fifth} {third} {top}", 2.7, .055, .52)

    ledger = Score("home-ledger", "저녁 장부", 80, 64, True, 826)
    ledger_chords = [
        "A2 E3 C4 E4", "F2 C3 A3 E4", "C3 G3 C4 D4", "G2 D3 B3 D4",
        "A2 E3 C4 G4", "F2 C3 A3 D4", "D2 A2 C4 F4", "E2 B2 G#3 D4",
        "F2 C3 A3 F4", "C3 G3 B3 E4", "G2 D3 B3 A4", "A2 E3 C4 E4",
        "D2 A2 C4 F4", "F2 C3 A3 G4", "A2 E3 C4 E4", "E2 B2 G#3 D4",
    ]
    ledger_melody = [
        "-:.5 E4:.75 A4:.75 C5:1 B4:.5 A4:.5", "G4:1 E4:1.5 -:.5 A4:1",
        "G4:.75 C5:.75 D5:1 E5:1.5", "D5:1 B4:1 A4:1 -:1",
        "-:.5 A4:.75 B4:.75 C5:1.5 E5:.5", "D5:1 C5:1 A4:1.5 -:.5",
        "F4:.75 A4:.75 C5:1 D5:1.5", "B4:1 G#4:1 E4:1.25 -:.75",
        "A4:.5 C5:.75 E5:.75 F5:2", "E5:1 D5:1 C5:1.5 -:.5",
        "B4:.75 D5:.75 G5:1.5 E5:1", "C5:1 B4:.5 A4:1.75 -:.75",
        "F5:.75 E5:.75 D5:1 A4:1.5", "C5:1 A4:1 G4:.5 A4:1.5",
        "E4:.5 A4:.75 C5:.75 B4:1 A4:1", "G#4:1 B4:1 E5:1.25 -:.75",
    ]
    for bar, (chord, melody) in enumerate(zip(ledger_chords, ledger_melody)):
        beat = bar * 4
        root, fifth, third, top = chord.split()
        ledger.line("dulcimer", beat, melody, .30, .25)
        ledger.note("bass", root, beat, 2.5, .18, -.05)
        ledger.note("bass", fifth, beat + 2.54, 1.15, .075, -.05)
        for offset, key, level in ((.02, third, .15), (.8, fifth, .12), (1.53, top, .12), (2.36, third, .13), (3.23, fifth, .11)):
            ledger.note("lute", key, beat + offset, .8, level, -.45)
        if bar in (1, 3, 6, 7, 8, 9, 10, 11, 13, 15):
            ledger.chord("strings", beat + .22, f"{fifth} {third} {top}", 3.56, .067, .44)
        if bar in (3, 7, 11, 15):
            ledger.note("bell", pitch(top) + 12, beat + 2.68, 1.55, .055, .6)

    dance = Score("home-lantern", "등불 아래 작은 춤", 90, 60, True, 992)
    dance_chords = [
        "G2 D3 B3 D4", "D2 A2 C4 F#4", "E2 B2 B3 G4", "B2 F#3 D4 A4",
        "C3 G3 E4 G4", "G2 D3 B3 D4", "A2 E3 C4 E4", "D2 A2 C4 F#4",
        "G2 D3 B3 G4", "D2 A2 C4 F#4", "E2 B2 B3 G4", "B2 F#3 D4 A4",
        "C3 G3 C4 G4", "G2 D3 B3 D4", "A2 E3 C4 E4", "D2 A2 C4 F#4",
        "C3 G3 E4 G4", "G2 D3 B3 D4", "A2 E3 C4 E4", "D2 A2 C4 F#4",
    ]
    dance_melody = [
        "B4:.5 D5:.5 G5:1 D5:1", "A4:.5 D5:.5 F#5:1 E5:.5 D5:.5", "B4:.5 E5:.5 G5:1 B5:.5 A5:.5",
        "F#5:1 D5:1 B4:1", "C5:.5 E5:.5 G5:1 E5:.5 D5:.5", "B4:.5 D5:.5 G5:1 D5:1",
        "E5:.5 C5:.5 A4:1 C5:1", "D5:.5 F#5:.5 E5:.5 D5:.5 A4:1",
        "G5:1 D5:.5 B4:.5 D5:1", "F#5:.75 E5:.25 D5:.5 A4:.5 C5:1", "B4:.5 G5:.5 A5:.5 B5:1 G5:.5",
        "F#5:1 A5:.5 F#5:.5 D5:1", "E5:.5 G5:.5 C6:1 B5:.5 A5:.5", "G5:1 E5:.5 D5:.5 B4:1",
        "C5:.5 E5:.5 A5:1 G5:.5 E5:.5", "F#5:1 D5:1 A4:1",
        "C5:.5 E5:.5 G5:1 E5:1", "D5:.5 B4:.5 G4:1 B4:1", "A4:.5 C5:.5 E5:1 C5:1", "D5:1 A4:.75 F#4:.5 -:.75",
    ]
    for bar, (chord, melody) in enumerate(zip(dance_chords, dance_melody)):
        beat = bar * 3
        root, fifth, third, top = chord.split()
        dance.line("fiddle" if bar < 8 or bar >= 16 else "flute", beat, melody, .26, .25)
        dance.note("bass", root, beat, .82, .20, -.05)
        dance.note("bass", fifth, beat + 2.04, .58, .075, -.05)
        dance.note("frame", "G2", beat, .26, .12, .15)
        for offset, key, strength, pan in ((.03, fifth, .12, -.37), (1.04, third, .22, -.39), (1.08, top, .13, -.21),
                                           (2.05, fifth, .13, -.43), (2.09, top, .15, -.20)):
            dance.note("lute", key, beat + offset, .61, strength, pan)
        if bar in (1, 4, 6, 8, 10, 12, 14, 16):
            dance.note("dulcimer", pitch(top) + 12, beat + 2.52, .64, .07, .58)
        if 8 <= bar <= 15:
            dance.note("fiddle", pitch(third) + (12 if pitch(third) < 60 else 0), beat + .11, 2.68, .09, -.26)

    return [rally, rift, march, hearth, ledger, dance, *revisions(hearth, hearth_chords)]


def revisions(hearth, chords):
    expedition = Score("title-expedition-3s", "첫 출정 · 3초", 120, 6, False, 345)
    expedition.line("flute", .14, "G4:.5 B4:.5 D5:.5 G5:.9 F#5:.5 D5:.35 G5:1.45", .34, .18)
    expedition.line("horn", 1.56, "G4:.95 F#4:.5 D4:.37 G4:1.45", .17, -.22)
    for beat, chord in ((0, "G3 B3 D4"), (1.65, "C3 G3 E4"), (2.63, "D3 A3 F#4"), (3.39, "G3 D4 B4")):
        for index, key in enumerate(chord.split()):
            expedition.note("lute", key, beat + index * .13, .69, .22 - .023 * index, -.43)
    expedition.note("bass", "G2", 0, 1.05, .19)
    expedition.note("bass", "D3", 2.63, .6, .12)
    expedition.note("bass", "G2", 3.39, 1.45, .20)
    expedition.note("frame", "G2", 0, .32, .20)
    expedition.note("frame", "G2", 3.39, .37, .18)
    expedition.chord("strings", 3.39, "G3 D4 G4 B4", 1.68, .095)

    dulcimer_take = Score("home-hearth-dulcimer", "변경의 벽난로 · 덜시머와 첼로", hearth.bpm,
                          hearth.beats, True, hearth.seed)
    reed_take = Score("home-hearth-concertina", "변경의 벽난로 · 콘서티나와 만돌린", hearth.bpm,
                      hearth.beats, True, hearth.seed)
    flute_dulcimer_gain = 10 ** (-9 / 20)
    flute_reed_gain = 10 ** (-12 / 20)
    for note in hearth.notes:
        if note.voice != "flute":
            dulcimer_take.notes.append(note)
            reed_level = note.level * .77 if note.voice == "lute" else note.level
            reed_take.notes.append(replace(note, level=reed_level))
            continue
        dulcimer_take.notes.append(replace(note, level=note.level * flute_dulcimer_gain, pan=.43))
        reed_take.notes.append(replace(note, level=note.level * flute_reed_gain, pan=.50))
        dulcimer_take.notes.append(replace(note, voice="dulcimer", level=note.level * .93, pan=.06))
        reed_take.notes.append(replace(note, voice="concertina", midi=note.midi - 12,
                                       level=note.level * 1.08, pan=.12))

    for bar, chord in enumerate(chords):
        beat = bar * 3
        root, fifth, third, top = chord.split()
        dulcimer_take.note("cello", pitch(root) + 12, beat + .18, 1.43, .074, -.18)
        cello_answer = pitch(fifth) + (12 if pitch(fifth) < 52 else 0)
        dulcimer_take.note("cello", cello_answer, beat + 1.72, 1.02, .062, -.18)
        if bar in (3, 7, 11, 15):
            dulcimer_take.note("dulcimer", top, beat + 2.51, .38, .062, .35)

        for offset, key, strength in ((.46, third, .084), (1.46, top, .099), (2.46, third, .073)):
            reed_take.note("mandolin", key, beat + offset, .46, strength, -.30)
        if bar in (1, 3, 5, 8, 11, 13, 15):
            reed_take.note("concertina", third, beat + 1.54, 1.09, .058, -.12)

    return [expedition, dulcimer_take, reed_take]


# Harmonic amplitudes and envelopes for the sustained instruments.
SUSTAIN = {
    "horn": ((1., .64, .33, .21, .12, .05, .025), .075, .23, 5.4, .0016),
    "strings": ((1., .55, .41, .27, .22, .12, .10, .07, .045, .03), .16, .34, 5.2, .0029),
    "flute": ((1., .24, .085, .038, .052, .012), .044, .14, 5.6, .0027),
    "fiddle": ((1., .71, .39, .31, .22, .125, .11, .07, .035), .045, .16, 5.8, .0028),
    "choir": ((1., .49, .37, .25, .14, .22, .15, .09, .07, .05), .27, .55, 4.2, .0025),
    "cello": ((1., .72, .41, .40, .20, .13, .10, .11, .09, .05, .025), .115, .22, 4.9, .0034),
    "concertina": ((1., .43, .29, .145, .24, .11, .06, .038), .048, .115, 4.8, .0014),
}
STRUCK = {
    "lute": ((1., .68, .39, .21, .31, .15, .16, .095, .065, .042), .0038, .40, .085, .00009),
    "dulcimer": ((1., .43, .55, .32, .19, .13, .08, .075, .05), .003, .75, .042, .00023),
    "bell": ((1., .49, .46, .24, .2, .1, .085, .05), .016, 1.06, .010, .0007),
    "bass": ((1., .46, .26, .15, .075, .035), .014, .64, .04, .00005),
    "mandolin": ((1., .53, .47, .44, .25, .17, .086, .070, .050), .0042, .32, .044, .00017),
}


def smooth(value):
    clipped = np.clip(value, 0, 1)
    return clipped * clipped * (3 - 2 * clipped)


def voice(note, seconds, rng):
    frequency = 440 * 2 ** ((note.midi - 69) / 12)
    if note.voice in ("drum", "frame"):
        tail = .46 if note.voice == "drum" else .15
        time = np.arange(round(RATE * (seconds + tail))) / RATE
        noise = rng.standard_normal(len(time))
        frequency *= .72 if note.voice == "drum" else 1.07
        bend = TAU * (frequency * time + 47 * .024 * (1 - np.exp(-time / .024)))
        body = np.sin(bend) + .22 * np.sin(1.73 * bend + .3) + .14 * np.sin(2.61 * bend)
        return smooth(time / .008) * (body * np.exp(-time / (tail * .28)) +
                                       .15 * noise * np.exp(-time / .023)) * .72

    sustained = note.voice in SUSTAIN
    if sustained:
        weights, attack, tail, vibrato, depth = SUSTAIN[note.voice]
    else:
        weights, attack, decay, strike, stretch = STRUCK[note.voice]
        tail = min(2.9, decay * 3.9)
    time = np.arange(round(RATE * (seconds + tail))) / RATE
    phase = TAU * frequency * time
    if sustained:
        phase += frequency / vibrato * depth * np.sin(TAU * vibrato * time) * smooth(time / .22)

    result = np.zeros_like(time)
    for index, amplitude in enumerate(weights):
        harmonic = index + 1
        multiplier = harmonic
        if note.voice == "bell":
            multiplier = (1., 1.50, 2., 2.66, 3.02, 4.16, 5.45, 6.63)[index]
        if not sustained:
            multiplier *= 1 + stretch * index * index
        if frequency * multiplier >= RATE * .44:
            break
        partial = np.sin(phase * multiplier + rng.uniform(-np.pi, np.pi))
        if sustained:
            partial *= (1 + .055 * np.sin(TAU * (2.1 + harmonic * .24) * time))
        else:
            partial *= np.exp(-time * (1 + .36 * index) / decay)
        result += amplitude * partial
    result /= np.linalg.norm(weights) * 1.45
    if sustained:
        release = 1 - smooth((time - seconds) / tail)
        envelope = smooth(time / attack) * release * (.94 + .06 * np.sin(TAU * 1.37 * time))
        return result * envelope

    damp = 1 - smooth((time - seconds) / max(.075, tail * .38))
    noise = rng.random(len(time)) * 2 - 1
    transients = strike * (noise - np.roll(noise, 2)) * np.exp(-time / .017)
    ring = .44 + .56 * damp if note.voice in ("bell", "dulcimer") else damp
    ending = 1 - smooth((time - (seconds + tail - .12)) / .12)
    return (result * ring + transients) * smooth(time / attack) * ending


def delay(signal, offset, loop):
    if loop:
        return np.roll(signal, offset)
    shifted = np.zeros_like(signal)
    shifted[offset:] = signal[:-offset]
    return shifted


def mix(score):
    seconds_per_beat = 60 / score.bpm
    samples = round(score.beats * seconds_per_beat * RATE)
    output = np.zeros((samples, 2))
    rng = np.random.default_rng(score.seed)
    for note in score.notes:
        start = round(note.beat * seconds_per_beat * RATE)
        sample = voice(note, note.length * seconds_per_beat, rng)
        angle = (note.pan + 1) * np.pi / 4
        signal = sample[:, None] * note.level * np.array([np.cos(angle), np.sin(angle)])
        length = min(samples - start, len(signal))
        output[start:start + length] += signal[:length]
        if score.loop and length < len(signal):
            output[:len(signal) - length] += signal[length:]

    room = np.zeros_like(output)
    for index, (ms, volume) in enumerate(((24, .11), (39, .08), (58, .09), (81, .072), (117, .051), (164, .046),
                                          (239, .031), (329, .020), (478, .014), (653, .009), (890, .005))):
        offset = round(ms * RATE / 1000)
        reflection = delay(output[:, ::-1] if index % 2 else output, offset, score.loop)
        room += reflection * volume
        room += delay(reflection, round(RATE * .0026), score.loop) * (volume * .24)
    output = output * .87 + room
    output -= output.mean(axis=0)
    if not score.loop:
        up, down = round(RATE * .024), round(RATE * .48)
        output[:up] *= smooth(np.linspace(0, 1, up))[:, None]
        output[-down:] *= (1 - smooth(np.linspace(0, 1, down)))[:, None]
    return output


def run_ffmpeg(executable, *arguments):
    return subprocess.run([executable, "-nostdin", "-hide_banner", *map(str, arguments)],
                          check=True, text=True, capture_output=True).stderr


def loudness(ffmpeg, path):
    report = run_ffmpeg(ffmpeg, "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-")
    measured = json.loads(report[report.rindex("{"):report.rindex("}") + 1])
    return float(measured["input_i"]), float(measured["input_tp"])


def write_wav(path, audio):
    pcm = np.rint(np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as writer:
        writer.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
        writer.writeframes(pcm.tobytes())
    return pcm


def render(score, ffmpeg, output):
    wave_path = output / f"{score.key}.wav"
    preview = output / f"{score.key}.mp3"
    audio = mix(score)
    write_wav(wave_path, audio)
    integrated, peak_db = loudness(ffmpeg, wave_path)
    target = -21 if score.loop else -18
    gain = min(target - integrated, -2.0 - peak_db)
    pcm = write_wav(wave_path, audio * 10 ** (gain / 20))
    integrated, peak_db = loudness(ffmpeg, wave_path)
    run_ffmpeg(ffmpeg, "-y", "-i", wave_path, "-codec:a", "libmp3lame", "-q:a", 3, preview)
    assert np.max(np.abs(pcm.astype(np.int32))) < 30_000 and peak_db <= -1.95
    assert np.sqrt(np.mean(pcm.astype(float) ** 2)) > 500
    step = None
    if score.loop:
        step = int(np.max(np.abs(pcm[0].astype(np.int32) - pcm[-1])))
        nearby = np.concatenate((pcm[-960:], pcm[:960])).astype(np.int32)
        assert step <= max(110, 1.1 * np.percentile(np.abs(np.diff(nearby, axis=0)), 99))
    else:
        assert np.all(pcm[0] == 0) and np.all(pcm[-1] == 0)
    report = {
        "id": score.key, "title": score.name, "usage": "home" if score.loop else "title", "loop": score.loop,
        "seconds": round(len(audio) / RATE, 6), "sampleRate": RATE, "sampleCount": len(audio), "channels": 2,
        "bits": 16, "bpm": score.bpm, "integratedLufs": integrated, "truePeakDbtp": peak_db,
        "loopBoundaryStepPcm16": step, "master": wave_path.name, "preview": preview.name,
        "sha256": hashlib.sha256(wave_path.read_bytes()).hexdigest(),
    }
    print(f"{score.key:20s} {report['seconds']:6.2f} s  {integrated:6.2f} LUFS  {peak_db:6.2f} dBTP  seam={step}", flush=True)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--output", type=Path, default=ROOT / "media/menu-music")
    parser.add_argument("--track", action="append", help="Render a specific take by ID. Repeat as needed.")
    args = parser.parse_args()
    scores = compose()
    available = {score.key for score in scores}
    if args.track and (missing := set(args.track) - available):
        parser.error(f"Unknown track IDs: {', '.join(sorted(missing))}")
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = args.output / "manifest.json"
    tracks = {}
    if args.track and manifest.exists():
        tracks = {track["id"]: track for track in json.loads(manifest.read_text(encoding="utf-8"))["tracks"]}
    for score in scores:
        if not args.track or score.key in args.track:
            tracks[score.key] = render(score, args.ffmpeg, args.output)
    manifest.write_text(
        json.dumps({"source": "../../qa/render-menu-music.py", "tracks": list(tracks.values())}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
