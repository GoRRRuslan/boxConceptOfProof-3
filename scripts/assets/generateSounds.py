"""Synthesises the short sound effects of the app (no dependencies, no downloads, no licences).

Output: src/assets/sounds/*.wav  (mono, 16 bit, 22.05 kHz, well under 100 KB each)
Usage : python3 scripts/assets/generateSounds.py   (or: yarn assetsSounds)
"""
import math
import pathlib
import random
import struct
import wave

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "src" / "assets" / "sounds"
RATE = 22050
random.seed(7)


def tone(frequency, seconds, volume=0.6, decay=6.0, vibrato=0.0, attack=0.004):
    """A sine with an exponential decay and a short attack (no clicks)."""
    samples = []
    for index in range(int(RATE * seconds)):
        t = index / RATE
        envelope = min(1.0, t / attack) * math.exp(-decay * t / seconds)
        phase = 2 * math.pi * frequency * t + vibrato * math.sin(2 * math.pi * 6 * t)
        samples.append(volume * envelope * math.sin(phase))
    return samples


def sweep(start, end, seconds, volume=0.6, decay=3.0):
    """A sine whose pitch glides from `start` to `end` Hz."""
    samples, phase = [], 0.0
    total = int(RATE * seconds)
    for index in range(total):
        t = index / total
        frequency = start + (end - start) * t
        phase += 2 * math.pi * frequency / RATE
        envelope = min(1.0, index / (RATE * 0.004)) * math.exp(-decay * t)
        samples.append(volume * envelope * math.sin(phase))
    return samples


def noise(seconds, volume=0.4, decay=25.0):
    return [volume * random.uniform(-1, 1) * math.exp(-decay * index / (RATE * seconds)) for index in range(int(RATE * seconds))]


def mix(*tracks):
    length = max(len(track) for track in tracks)
    return [sum(track[i] if i < len(track) else 0.0 for track in tracks) for i in range(length)]


def delayed(track, seconds):
    return [0.0] * int(RATE * seconds) + track


def save(name, samples):
    peak = max(1e-9, max(abs(value) for value in samples))
    scale = min(1.0, 0.85 / peak)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / f"{name}.wav"
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, value * scale)) * 32767)) for value in samples))
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")


# A box is selected: a soft tick.
save("select", tone(880, 0.07, decay=7))

# Purchase: two rising blips, like a coin.
save("purchase", mix(tone(660, 0.12, decay=5), delayed(tone(990, 0.22, decay=5), 0.09)))

# Anticipation: a rumble that rises and trembles for 0.8 s.
rumble = sweep(60, 130, 0.8, volume=0.7, decay=-1.2)
tremble = [value * (0.55 + 0.45 * math.sin(2 * math.pi * 16 * index / RATE)) for index, value in enumerate(rumble)]
save("anticipation", tremble)

# The lid pops open: a click and a falling thump.
save("lidOpen", mix(noise(0.05, 0.5, 18), sweep(220, 55, 0.28, volume=0.8, decay=4)))

# Reveals, from modest to grand.
save("revealCommon", mix(tone(880, 0.6, decay=5), tone(1320, 0.6, volume=0.35, decay=6)))
save(
    "revealRare",
    mix(
        tone(523, 0.5, decay=5),
        delayed(tone(659, 0.5, decay=5), 0.1),
        delayed(tone(784, 0.7, decay=4), 0.2),
        delayed(tone(1568, 0.5, volume=0.25, decay=6), 0.3),
    ),
)
save(
    "revealLegendary",
    mix(
        tone(523, 0.45, decay=4),
        delayed(tone(659, 0.45, decay=4), 0.1),
        delayed(tone(784, 0.5, decay=4), 0.2),
        delayed(tone(1047, 0.6, decay=3.5), 0.3),
        delayed(tone(1319, 1.4, decay=2.6, vibrato=1.5), 0.42),
        delayed(tone(1568, 1.4, volume=0.4, decay=2.6), 0.42),
        delayed(tone(2093, 0.9, volume=0.2, decay=4), 0.55),
        delayed(tone(2637, 0.7, volume=0.15, decay=5), 0.75),
    ),
)

# Something went wrong: a falling buzz.
save("error", sweep(440, 200, 0.3, volume=0.55, decay=1.5))
