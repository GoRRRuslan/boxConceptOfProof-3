"""Prints the length, the loudness and where the energy of every sound effect sits in the spectrum.

A phone speaker plays almost nothing below 300 Hz: an effect with most of its energy there is silent on a phone.
Needs numpy (pip install numpy). Usage: python3 scripts/assets/checkSounds.py
"""
import glob
import pathlib
import wave

import numpy

ROOT = pathlib.Path(__file__).resolve().parents[2]
BANDS = [(0, 300), (300, 1000), (1000, 4000), (4000, 12000)]
MINIMUM_ENERGY_ABOVE_300_HZ = 0.9

failed = False

for path in sorted(glob.glob(str(ROOT / "src" / "assets" / "sounds" / "*.wav"))):
    with wave.open(path) as handle:
        rate = handle.getframerate()
        samples = numpy.frombuffer(handle.readframes(handle.getnframes()), dtype=numpy.int16).astype(float) / 32768
    power = numpy.abs(numpy.fft.rfft(samples * numpy.hanning(len(samples)))) ** 2
    frequencies = numpy.fft.rfftfreq(len(samples), 1 / rate)
    total = power.sum()
    shares = [power[(frequencies >= low) & (frequencies < high)].sum() / total for low, high in BANDS]
    rms = float(numpy.sqrt((samples**2).mean()))
    above_300 = 1 - shares[0]
    verdict = "ok" if above_300 >= MINIMUM_ENERGY_ABOVE_300_HZ else "TOO MUCH BASS"
    failed = failed or verdict != "ok"
    print(
        f"{pathlib.Path(path).name:22s} {len(samples) / rate:4.2f}s  rms {20 * numpy.log10(rms):6.1f} dBFS  "
        + "  ".join(f"{low}-{high}Hz {share * 100:3.0f}%" for (low, high), share in zip(BANDS, shares))
        + f"  {verdict}"
    )

raise SystemExit(1 if failed else 0)
