"""Render the portfolio's original, deterministic instrumental loop.

Requires NumPy and ffmpeg at authoring time, never on the deployed website.
No recordings, third-party samples, or external services are used.
"""

import argparse
import pathlib
import subprocess
import tempfile
import wave

import numpy as np


RATE = 22050
BPM = 76
BEAT = 60 / BPM
BARS = 16
LENGTH = round(BARS * 4 * BEAT * RATE)
RNG = np.random.default_rng(3101)
KEYS = np.zeros((LENGTH, 2), dtype=np.float64)
RHYTHM = np.zeros_like(KEYS)


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def mix(target, signal, start, level, pan=0.5):
    position = round(start * RATE) % LENGTH
    stereo = signal[:, None] * level * np.array([np.sqrt(1 - pan), np.sqrt(pan)])
    first = min(len(signal), LENGTH - position)
    target[position:position + first] += stereo[:first]
    if first < len(signal):
        target[:len(signal) - first] += stereo[first:]


def piano(note, duration, detune=0):
    t = np.arange(round(duration * RATE)) / RATE
    pitch = frequency(note) * 2 ** (detune / 1200)
    phase = 2 * np.pi * pitch * (t + 0.000045 * np.sin(2 * np.pi * 0.7 * t))
    bell = np.sin(phase + 1.5 * np.exp(-t * 2.8) * np.sin(phase * 2.003))
    tone = 0.65 * np.sin(phase) + 0.3 * bell + 0.05 * np.sin(phase * 3)
    envelope = (1 - np.exp(-t / 0.012)) * (0.65 * np.exp(-t / 0.8) + 0.35 * np.exp(-t / 2.3))
    envelope *= np.clip((duration - t) / 0.2, 0, 1)
    return tone * envelope


def bass(note, duration):
    t = np.arange(round(duration * RATE)) / RATE
    phase = 2 * np.pi * frequency(note) * t
    tone = np.sin(phase) + 0.13 * np.sin(phase * 2) + 0.035 * np.sin(phase * 3)
    return tone * (1 - np.exp(-t / 0.018)) * np.exp(-t / 0.8) * np.clip((duration - t) / 0.15, 0, 1)


def kick():
    t = np.arange(round(0.38 * RATE)) / RATE
    phase = 2 * np.pi * (47 * t + 49 * 0.025 * (1 - np.exp(-t / 0.025)))
    return np.sin(phase) * np.exp(-t / 0.105) * (1 - np.exp(-t / 0.002))


def snare():
    t = np.arange(round(0.25 * RATE)) / RATE
    noise = RNG.normal(0, 1, len(t))
    noise = (noise + np.roll(noise, 1) + np.roll(noise, 2)) / 3
    tone = 0.35 * np.sin(2 * np.pi * 180 * t) + 0.13 * np.sin(2 * np.pi * 330 * t)
    return (noise * 0.62 + tone) * np.exp(-t / 0.045) * (1 - np.exp(-t / 0.0015))


def hat():
    t = np.arange(round(0.09 * RATE)) / RATE
    noise = RNG.normal(0, 1, len(t))
    noise -= np.roll(noise, 1)
    return noise * np.exp(-t / 0.017) * (1 - np.exp(-t / 0.001))


def render(output):
    chords = [
        ([60, 64, 67, 71, 74], 36),
        ([57, 60, 64, 67, 71], 33),
        ([57, 60, 62, 65, 69], 38),
        ([55, 59, 62, 65, 69], 31),
    ]
    melody = [
        [(0.75, 76), (2.5, 74)], [(1.5, 71)],
        [(0.75, 72), (2.75, 71)], [(1.5, 67)],
        [(0.75, 69), (2.5, 72)], [(1.5, 74)],
        [(0.75, 71), (2.5, 69)], [(2.75, 67)],
    ]
    for bar in range(BARS):
        start = bar * 4 * BEAT
        notes, root = chords[(bar // 2) % len(chords)]
        for pulse, strength, duration in [(0.05 if bar % 2 == 0 else 0.5, 1, 3.2), (2.65, 0.48, 2.1)]:
            for voice, note in enumerate(notes):
                mix(KEYS, piano(note, duration, RNG.uniform(-2, 2)),
                    start + pulse * BEAT + voice * 0.013,
                    0.082 * strength * RNG.uniform(0.9, 1.05), 0.23 + voice * 0.13)
        for pulse, note, level in [(0, root, 0.23), (1.75, root + 12, 0.12), (2.5, root + 7, 0.17)]:
            mix(RHYTHM, bass(note, 1.05), start + pulse * BEAT, level)
        for pulse in [0, 2.5] + ([3.5] if bar % 4 == 3 else []):
            mix(RHYTHM, kick(), start + pulse * BEAT, 0.22 * RNG.uniform(0.85, 1.0))
        for pulse in [1.06, 3.06]:
            mix(RHYTHM, snare(), start + pulse * BEAT, 0.13 * RNG.uniform(0.8, 1.0), 0.55)
        for pulse in range(8):
            if pulse == 7 and bar % 4 == 3:
                continue
            offset = pulse / 2 + (0.075 if pulse % 2 else 0)
            mix(RHYTHM, hat(), start + offset * BEAT + RNG.uniform(-0.005, 0.005),
                0.023 if pulse % 2 == 0 else 0.015, 0.35 if pulse % 2 == 0 else 0.7)
        for pulse, note in melody[bar % len(melody)]:
            if bar < 8 and bar % 2 == 1:
                continue
            mix(KEYS, piano(note, 1.8, -1.5), start + pulse * BEAT,
                0.048 if bar < 8 else 0.063, 0.65)

    space = KEYS.copy()
    for delay, amount in [(0.11, 0.12), (0.23, 0.09), (0.37, 0.065), (0.61, 0.035)]:
        space += np.roll(KEYS[:, ::-1], round(delay * RATE), axis=0) * amount
    track = np.tanh((space + RHYTHM) * 1.15)
    spectrum = np.fft.rfft(track, axis=0)
    frequencies = np.fft.rfftfreq(LENGTH, 1 / RATE)
    spectrum *= (1 / (1 + (frequencies / 5100) ** 6))[:, None]
    track = np.fft.irfft(spectrum, n=LENGTH, axis=0)
    track *= 0.28 / np.max(np.abs(track))
    edge = round(0.004 * RATE)
    track[:edge] *= np.linspace(0, 1, edge)[:, None]
    track[-edge:] *= np.linspace(1, 0, edge)[:, None]
    pcm = (track * 32767).astype("<i2")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="jamie-lofi-") as temporary:
        wav = pathlib.Path(temporary) / "a-few-things.wav"
        with wave.open(str(wav), "wb") as audio:
            audio.setnchannels(2)
            audio.setsampwidth(2)
            audio.setframerate(RATE)
            audio.writeframes(pcm.tobytes())
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
            "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "96k",
            "-metadata", "title=A few things", "-metadata", "comment=Original instrumental for Jamie's portfolio",
            str(output),
        ], check=True)
    print(f"Rendered {BARS} bars at {BPM} BPM: {LENGTH / RATE:.2f}s, {output.stat().st_size:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=pathlib.Path,
                        default=pathlib.Path(__file__).resolve().parents[1] / "assets/audio/a-few-things-lofi.mp3")
    render(parser.parse_args().output)
