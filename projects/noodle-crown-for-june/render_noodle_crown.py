#!/usr/bin/env python3
"""Render Noodle Crown: June's 24.5-second birthday motion poem."""

from __future__ import annotations

import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
FPS = 24
DURATION = 24.5
FRAMES = round(FPS * DURATION)
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
VOICE = ROOT / "noodle-crown-june-narration-v1.wav"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def ease(v: float) -> float:
    v = clamp(v)
    return v * v * (3.0 - 2.0 * v)


def ramp(t: float, start: float, end: float) -> float:
    return ease((t - start) / (end - start))


def window(t: float, start: float, hold: float, end: float) -> float:
    return min(ramp(t, start, hold), 1.0 - ramp(t, hold, end))


def mix(a, b, x: float):
    return tuple(round(a[i] * (1 - x) + b[i] * x) for i in range(len(a)))


def bezier(p0, p1, p2, p3, count=72):
    pts = []
    for u in np.linspace(0.0, 1.0, count):
        q = 1.0 - u
        x = q**3*p0[0] + 3*q*q*u*p1[0] + 3*q*u*u*p2[0] + u**3*p3[0]
        y = q**3*p0[1] + 3*q*q*u*p1[1] + 3*q*u*u*p2[1] + u**3*p3[1]
        pts.append((round(x), round(y)))
    return pts


def centered_text(draw, xy, text, font, fill, anchor="mm", stroke=0, stroke_fill=None):
    draw.text(xy, text, font=font, fill=fill, anchor=anchor,
              stroke_width=stroke, stroke_fill=stroke_fill)


def draw_dragon(layer: Image.Image, t: float, alpha: float):
    if alpha <= 0:
        return
    d = ImageDraw.Draw(layer)
    cx, cy = 640, 310
    breathe = math.sin(t * 2.2) * 5
    ice = (112, 221, 255, round(205 * alpha))
    dark = (14, 55, 92, round(235 * alpha))
    # A heraldic ice-dragon profile: readable, symbolic, never a character portrait.
    head = [(cx-170, cy+25), (cx-102, cy-42), (cx-12, cy-55),
            (cx+52, cy-20), (cx+16, cy+8), (cx+95, cy+30),
            (cx+18, cy+52), (cx-68, cy+44)]
    d.polygon(head, fill=dark, outline=ice)
    d.polygon([(cx-95, cy-36), (cx-125, cy-118+breathe), (cx-42, cy-57)], fill=dark, outline=ice)
    d.polygon([(cx-15, cy-50), (cx+18, cy-114-breathe), (cx+35, cy-28)], fill=dark, outline=ice)
    d.ellipse((cx-38, cy-30, cx-24, cy-16), fill=(231, 255, 255, round(255*alpha)))
    # Breath establishes the cold artifact, then evaporates before the warm turn.
    for i in range(11):
        u = i / 10
        x = cx + 85 + u * 315
        y = cy + 32 + math.sin(i * 2.7 + t * 3.0) * (8 + 16*u)
        r = 4 + 17*u
        a = round((1-u) * 115 * alpha)
        d.ellipse((x-r, y-r, x+r, y+r), fill=(165, 239, 255, a))


def draw_filaments(base: Image.Image, t: float, heat: float, reveal: float):
    cold = (89, 202, 255, 255)
    hot = (255, 139, 39, 255)
    core = mix(cold, hot, heat)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    solid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd, sd = ImageDraw.Draw(glow), ImageDraw.Draw(solid)
    roots = np.linspace(420, 860, 13)
    crown = ramp(t, 12.9, 19.3)
    for i, x in enumerate(roots):
        phase = i * 0.73
        sway = math.sin(t * (0.65 + (i % 3)*0.08) + phase) * (9 + 11*crown)
        y0 = 605
        end_x = 640 + (i-6) * (24 + 9*crown) + sway
        end_y = 515 - crown * (170 + 75 * abs(i-6)/6) + math.sin(phase) * 12
        p0 = (x, y0)
        p1 = (x + math.sin(phase)*85, 525 - crown*35)
        p2 = (end_x + math.cos(phase)*70, 430 - crown*95)
        p3 = (end_x, end_y)
        pts = bezier(p0, p1, p2, p3)
        n = max(2, round(len(pts) * reveal))
        pts = pts[:n]
        if len(pts) > 1:
            gd.line(pts, fill=(*core[:3], 160), width=20)
            sd.line(pts, fill=(*core[:3], 245), width=5)
            # Hot cores appear only after agency turns the inherited cold.
            if heat > .35:
                sd.line(pts, fill=(255, 228, 122, round(205*heat)), width=2)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=16 + 10*heat))
    base.alpha_composite(glow)
    base.alpha_composite(solid)


def draw_particles(layer: Image.Image, t: float, heat: float):
    d = ImageDraw.Draw(layer)
    rng = np.random.default_rng(6705)
    for i in range(86):
        seed_x, seed_y, rate, size, phase = rng.random(5)
        life = (t * (.045 + .05*rate) + phase) % 1.0
        x = 260 + seed_x*760 + math.sin(life*8 + i)*20
        y = 650 - life*(250 + seed_y*260)
        a = round((1-life)**1.7 * (45 + 150*heat))
        r = 1 + size*3
        color = mix((121, 220, 255), (255, 165, 54), heat)
        d.ellipse((x-r, y-r, x+r, y+r), fill=(*color, a))


def make_frame(frame: int) -> Image.Image:
    t = frame / FPS
    turn = ramp(t, 8.45, 13.0)
    heat = ramp(t, 11.4, 19.6)
    bg_top = mix((3, 16, 34), (50, 8, 8), heat)
    bg_bottom = mix((5, 38, 62), (112, 31, 6), heat)
    yy = np.linspace(0, 1, H)[:, None, None]
    top = np.array(bg_top, dtype=np.float32)[None, None, :]
    bot = np.array(bg_bottom, dtype=np.float32)[None, None, :]
    arr = np.repeat((top*(1-yy)+bot*yy), W, axis=1).astype(np.uint8)
    img = Image.fromarray(arr, "RGB").convert("RGBA")
    # Vignette turns the center into a stage instead of a screensaver.
    vignette = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse((-180, -260, W+180, H+330), fill=210)
    vignette = vignette.filter(ImageFilter.GaussianBlur(110))
    black = Image.new("RGBA", (W, H), (0, 0, 0, 115))
    img = Image.composite(img, black, vignette)

    dragon = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dragon_alpha = window(t, 3.65, 6.4, 10.0)
    draw_dragon(dragon, t, dragon_alpha)
    img.alpha_composite(dragon.filter(ImageFilter.GaussianBlur(0.35)))

    reveal = ramp(t, 0.2, 3.0)
    draw_filaments(img, t, heat, reveal)
    particles = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_particles(particles, t, heat)
    img.alpha_composite(particles)

    d = ImageDraw.Draw(img)
    small = ImageFont.truetype(FONT_SANS, 31)
    middle = ImageFont.truetype(FONT_BOLD, 66)
    large = ImageFont.truetype(FONT_BOLD, 112)
    # Text is graphic punctuation; the separate SRT carries literal dialogue.
    a0 = window(t, .45, 1.0, 3.55)
    if a0 > 0:
        centered_text(d, (640, 112), "NOODLES", middle,
                      (180, 231, 255, round(235*a0)), stroke=1,
                      stroke_fill=(5, 23, 45, round(255*a0)))
        if t > 2.65:
            crack = ramp(t, 2.65, 3.45)
            d.line([(615, 80), (646, 108), (625, 142)],
                   fill=(255, 255, 255, round(230*crack)), width=4)
    a1 = window(t, 4.3, 5.1, 8.2)
    if a1 > 0:
        centered_text(d, (640, 596), "STAY FROSTY", middle,
                      (205, 250, 255, round(245*a1)), stroke=2,
                      stroke_fill=(7, 39, 74, round(255*a1)))
    a2 = ramp(t, 19.45, 20.3)
    if a2 > 0:
        centered_text(d, (640, 126), "JUNE", small,
                      (255, 222, 167, round(235*a2)))
        centered_text(d, (640, 240), "STAY LIT", large,
                      (255, 228, 137, round(255*a2)), stroke=3,
                      stroke_fill=(102, 24, 4, round(255*a2)))
        # A crown line lands after the words, so the visual keeps the last move.
        crown_a = ramp(t, 20.35, 22.15)
        y = 330
        pts = [(505, y+30), (548, y-20), (596, y+12), (640, y-56),
               (684, y+12), (732, y-20), (775, y+30)]
        d.line(pts, fill=(255, 188, 55, round(255*crown_a)), width=9, joint="curve")
    # Almost-invisible attribution stays out of the emotional frame.
    centered_text(d, (1246, 692), "for June · 2026", ImageFont.truetype(FONT_SANS, 18),
                  (255, 239, 214, 95), anchor="rs")
    return img.convert("RGB")


def synth_bed(path: Path):
    sr = 48000
    n = round(DURATION * sr)
    t = np.arange(n, dtype=np.float64) / sr
    rng = np.random.default_rng(6705)
    # Cold architecture yields to warm fifths; neither exists as constant wallpaper.
    cold_env = np.clip(1 - (t-8.0)/5.0, 0, 1)
    warm_env = np.clip((t-9.0)/6.0, 0, 1) * np.clip((24.5-t)/1.3, 0, 1)
    cold = (np.sin(2*np.pi*55*t) + .42*np.sin(2*np.pi*82.5*t)) * .030 * cold_env
    warm = (np.sin(2*np.pi*73.42*t) + .55*np.sin(2*np.pi*110*t) + .24*np.sin(2*np.pi*146.84*t)) * .034 * warm_env
    noise = rng.normal(0, 1, n)
    fire = np.convolve(noise, np.ones(180)/180, mode="same") * .050 * warm_env
    bed = cold + warm + fire

    def impact(at, amp, decay, f0):
        i0 = round(at*sr)
        m = min(n-i0, round(decay*sr))
        x = np.arange(m)/sr
        click = rng.normal(0, 1, m) * np.exp(-x*24)
        body = np.sin(2*np.pi*(f0*x + 95*x*x))*np.exp(-x*7)
        bed[i0:i0+m] += amp*(.32*click + .68*body)

    impact(3.08, .19, .65, 720)   # the label cracks
    impact(7.72, .12, 1.05, 430)   # frost sigil releases
    impact(12.48, .16, 1.30, 190)  # first chosen heat
    impact(19.55, .22, 1.80, 120)  # crown ignition
    impact(22.15, .11, 1.60, 880)  # crown line locks
    bed = np.tanh(bed*1.35) * .72
    # Slight stereo counter-motion makes the material feel alive without stealing dialogue.
    shift = round(.007*sr)
    left = bed
    right = np.roll(bed, shift) * .96
    stereo = np.stack([left, right], axis=1)
    pcm = np.clip(stereo * 32767, -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


def write_accessibility_files():
    (OUT / "noodle-crown.en.srt").write_text("""1
00:00:00,800 --> 00:00:03,880
They called them noodles.

2
00:00:04,530 --> 00:00:07,850
Alon said, “Stay frosty.”

3
00:00:08,500 --> 00:00:12,260
But cold was never the whole story.

4
00:00:12,910 --> 00:00:19,350
These strands remember every winter…
and choose their own heat.

5
00:00:20,000 --> 00:00:22,920
June. Stay lit.
""", encoding="utf-8")
    (OUT / "noodle-crown.audio-description.txt").write_text(
        "A tangle of blue filaments gathers under the word NOODLES. An ice dragon "
        "breathes across them as STAY FROSTY appears. The frozen label cracks. Amber "
        "heat climbs each strand by its own path; the filaments rise into a living fire "
        "crown. JUNE appears above STAY LIT, and the crown locks into place.\n",
        encoding="utf-8")


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    if not VOICE.exists():
        raise SystemExit(f"Missing verified narration: {VOICE}")
    bed = OUT / "noodle-crown-bed.wav"
    synth_bed(bed)
    write_accessibility_files()
    video_only = OUT / "noodle-crown-picture-lock.mp4"
    enc = subprocess.Popen([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(video_only)
    ], stdin=subprocess.PIPE)
    assert enc.stdin is not None
    for frame in range(FRAMES):
        enc.stdin.write(make_frame(frame).tobytes())
    enc.stdin.close()
    if enc.wait() != 0:
        raise SystemExit("Picture render failed")
    mixed = OUT / "noodle-crown-mixed-no-captions.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(video_only), "-itsoffset", "0.8", "-i", str(VOICE), "-i", str(bed),
        "-filter_complex",
        "[1:a]aresample=48000,volume=1.18,pan=stereo|c0=c0|c1=c0[voice];"
        "[2:a]volume=0.62[bed];[voice][bed]amix=inputs=2:duration=longest:normalize=0,"
        "alimiter=limit=0.891:attack=5:release=80[a]",
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-metadata", "title=Noodle Crown — for June", "-metadata", "artist=Drew Clarke",
        "-t", str(DURATION), "-movflags", "+faststart", str(mixed)
    ], check=True)
    master = OUT / "Noodle_Crown_for_June_accessible_master.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(mixed), "-i", str(OUT / "noodle-crown.en.srt"),
        "-map", "0:v", "-map", "0:a", "-map", "1:0",
        "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
        "-metadata:s:s:0", "language=eng", "-disposition:s:0", "default",
        "-movflags", "+faststart", str(master)
    ], check=True)
    audio_only = OUT / "Noodle_Crown_for_June_audio_only.m4a"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master),
        "-vn", "-c:a", "copy", str(audio_only)
    ], check=True)
    print(master)


if __name__ == "__main__":
    run()
