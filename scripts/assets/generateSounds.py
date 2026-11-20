"""Synthesises the short sound effects of the app (no dependencies, no downloads, no licences).

Output: src/assets/sounds/*.wav  (mono, 16 bit, 44.1 kHz, well under 200 KB each)
Usage : python3 scripts/assets/generateSounds.py   (or: yarn assetsSounds)

Written for a PHONE SPEAKER: a phone speaker plays almost nothing below about 300 Hz, so the effects live between 300 Hz and 8 kHz
(bell partials, filtered noise, rising sweeps with harmonics). An earlier version used rumbles and thumps below 200 Hz, which are
loud on a laptop and completely silent on an iPhone. `python3 scripts/assets/checkSounds.py` prints the spectrum of every effect.
"""
import math
import pathlib
import random
import struct
import wave

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "src" / "assets" / "sounds"
RATE = 44100
# Every effect is brought to this loudness (RMS, as a fraction of full scale) and then softly limited, so that the quiet and the loud
# effects feel equally present on a small speaker.
TARGET_RMS = 0.2
random.seed(7)

# The partials of a struck bell (ratios to the fundamental, relative loudness, relative decay speed).
BELL_PARTIALS = [(1.0, 1.0, 1.0), (2.0, 0.55, 1.4), (2.76, 0.4, 1.9), (4.07, 0.22, 2.6), (5.4, 0.14, 3.4)]


def attack_envelope(index, attack_seconds=0.003):
    return min(1.0, index / (RATE * attack_seconds))


def bell(frequency, seconds, volume=0.6, decay=5.0, vibrato=0.0):
    """A struck bell: several partials, each fading at its own speed. Bright, and audible on any speaker."""
    samples = []
    total = int(RATE * seconds)
    for index in range(total):
        t = index / RATE
        value = 0.0
        for ratio, loudness, speed in BELL_PARTIALS:
            partial_frequency = frequency * ratio
            if partial_frequency > 9000:
                continue
            phase = 2 * math.pi * partial_frequency * t + vibrato * math.sin(2 * math.pi * 5.5 * t)
            value += loudness * math.exp(-decay * speed * t / seconds) * math.sin(phase)
        samples.append(volume * attack_envelope(index) * value / 2.2)
    return samples


def saw_sweep(start, end, seconds, volume=0.5, harmonics=7, shape=1.0, tremolo_hz=0.0, tremolo_depth=0.0, fade_in=0.0, fade_out=0.05):
    """A band-limited sawtooth gliding from `start` to `end` Hz: a buzzy, penetrating tone."""
    samples, phase = [], 0.0
    total = int(RATE * seconds)
    for index in range(total):
        t = index / total
        frequency = start + (end - start) * (t**shape)
        phase += 2 * math.pi * frequency / RATE
        value = sum(math.sin(phase * n) / n for n in range(1, harmonics + 1) if frequency * n < 9000)
        envelope = attack_envelope(index, 0.01)
        if fade_in:
            envelope *= min(1.0, t / fade_in)
        if fade_out:
            envelope *= min(1.0, (1 - t) / fade_out)
        if tremolo_hz:
            envelope *= 1 - tremolo_depth + tremolo_depth * (0.5 + 0.5 * math.sin(2 * math.pi * tremolo_hz * index / RATE))
        samples.append(volume * envelope * value * 0.6)
    return samples


def sweep(start, end, seconds, volume=0.5, decay=3.0, shape=1.0):
    """A sine gliding from `start` to `end` Hz with an exponential decay."""
    samples, phase = [], 0.0
    total = int(RATE * seconds)
    for index in range(total):
        t = index / total
        frequency = start + (end - start) * (t**shape)
        phase += 2 * math.pi * frequency / RATE
        samples.append(volume * attack_envelope(index) * math.exp(-decay * t) * math.sin(phase))
    return samples


def band_noise(seconds, low_hz, high_hz, volume=0.5, decay=8.0, rise=0.0):
    """Noise limited to a band (two one-pole filters): a hiss, a whoosh, a click."""
    samples = []
    total = int(RATE * seconds)
    low_coefficient = 1 - math.exp(-2 * math.pi * high_hz / RATE)
    high_coefficient = 1 - math.exp(-2 * math.pi * low_hz / RATE)
    low_state = high_state = 0.0
    for index in range(total):
        t = index / total
        white = random.uniform(-1, 1)
        low_state += low_coefficient * (white - low_state)
        high_state += high_coefficient * (low_state - high_state)
        band = low_state - high_state
        envelope = (t / rise if rise and t < rise else 1.0) * math.exp(-decay * t)
        samples.append(volume * attack_envelope(index, 0.002) * envelope * band * 3.0)
    return samples


def mix(*tracks):
    length = max(len(track) for track in tracks)
    return [sum(track[i] if i < len(track) else 0.0 for track in tracks) for i in range(length)]


def delayed(track, seconds):
    return [0.0] * int(RATE * seconds) + track


def save(name, samples):
    """Loudness-normalises, softly limits (tanh) and writes the effect."""
    rms = math.sqrt(sum(value * value for value in samples) / len(samples))
    gain = TARGET_RMS / max(rms, 1e-9)
    shaped = [math.tanh(value * gain * 1.4) / math.tanh(1.4) for value in samples]
    peak = max(abs(value) for value in shaped)
    scale = min(1.0, 0.92 / max(peak, 1e-9))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / f"{name}.wav"
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, value * scale)) * 32767)) for value in shaped))
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")


# A box is selected: a short wooden tick with a bright ping.
save("select", mix(band_noise(0.04, 1500, 6000, 0.6, decay=14), bell(1480, 0.09, 0.5, decay=7)))

# Purchase: a coin dropped on glass, then a second brighter one.
save("purchase", mix(bell(1319, 0.32, 0.6, decay=4.5), delayed(bell(1976, 0.4, 0.55, decay=4.0), 0.1)))

# Anticipation: a charging whine that rises from 300 Hz to 1.6 kHz while it trembles, with a rising hiss on top.
save(
    "anticipation",
    mix(
        saw_sweep(300, 1600, 0.85, volume=0.55, harmonics=6, shape=1.6, tremolo_hz=18, tremolo_depth=0.5, fade_in=0.15, fade_out=0.04),
        band_noise(0.85, 2500, 7500, 0.35, decay=-1.6, rise=0.2),
    ),
)

# The lid pops open: a sharp pop, a rising whoosh of air and a short bright chime.
save(
    "lidOpen",
    mix(
        band_noise(0.03, 700, 7000, 0.9, decay=20),
        band_noise(0.3, 900, 6000, 0.5, decay=5, rise=0.25),
        sweep(420, 1700, 0.18, volume=0.5, decay=3.5, shape=0.6),
        delayed(bell(1760, 0.32, 0.35, decay=5), 0.07),
    ),
)

# Reveals, from modest to grand: every one a bell with real partials, so it is audible on a phone.
save("revealCommon", mix(bell(784, 0.7, 0.6, decay=4.5), delayed(bell(1175, 0.55, 0.35, decay=5), 0.08)))
save(
    "revealRare",
    mix(
        bell(659, 0.6, 0.55, decay=4.5),
        delayed(bell(880, 0.6, 0.55, decay=4.5), 0.11),
        delayed(bell(1319, 0.9, 0.6, decay=3.8), 0.22),
        delayed(band_noise(0.5, 4000, 8500, 0.25, decay=6), 0.3),
    ),
)
save(
    "revealLegendary",
    mix(
        bell(523, 0.7, 0.55, decay=4),
        delayed(bell(784, 0.7, 0.55, decay=4), 0.12),
        delayed(bell(1047, 0.8, 0.6, decay=3.6), 0.24),
        delayed(bell(1568, 1.0, 0.6, decay=3), 0.38),
        delayed(bell(2093, 1.5, 0.6, decay=2.4, vibrato=1.2), 0.52),
        delayed(band_noise(1.2, 4500, 9000, 0.3, decay=2.8, rise=0.1), 0.5),
        delayed(bell(3136, 1.0, 0.25, decay=3.2), 0.72),
    ),
)

# Something went wrong: a falling buzz with edge.
save("error", saw_sweep(620, 260, 0.32, volume=0.55, harmonics=8, fade_out=0.25))
