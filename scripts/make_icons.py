#!/usr/bin/env python3
"""띠니 홈 화면 아이콘을 만든다 (r51).

프레시 그린 그라데이션 배경 + 흰 'T' 심볼 — 사이트 헤더의 .mark 와 같은 모양·색입니다.
- images/icon-192.png, icon-512.png          (any)
- images/icon-maskable-512.png               (maskable, 안전 영역 안쪽에 축소 배치)
- images/apple-touch-icon.png, apple-touch.png (180, 불투명)
- images/favicon.png (32)
- images/favicon.svg

사용
    python3 scripts/make_icons.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images"

GREEN = (33, 163, 79)       # #21A34F
GREEN_DEEP = (21, 128, 61)  # #15803D
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(size: int) -> Image.Image:
    """대각선 프레시 그린 그라데이션."""
    img = Image.new("RGB", (size, size), GREEN)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x / size * 0.5) + (y / size * 0.5)
            px[x, y] = lerp(GREEN, GREEN_DEEP, min(1.0, t))
    return img


def draw_logo(size: int, scale: float = 1.0, radius_ratio: float = 0.22) -> Image.Image:
    """그린 배경 위에 흰 T 심볼. 4배로 그린 뒤 축소해 계단을 없앤다."""
    ss = 4
    big = size * ss
    base = background(big).convert("RGBA")

    if radius_ratio:
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, big - 1, big - 1], radius=int(big * radius_ratio), fill=255
        )
        base.putalpha(mask)

    overlay = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    box = big * 0.52 * scale          # 글자 전체 폭
    left = (big - box) / 2
    right = left + box
    bar = box * 0.215                 # 획 두께
    top = big / 2 - box * 0.5
    bottom = top + box
    r = bar / 2
    stem_w = bar * 1.05
    stem_l = (big - stem_w) / 2
    stem_r = stem_l + stem_w

    # 가로획 (위) + 세로획 (가운데)
    d.rounded_rectangle([left, top, right, top + bar], radius=r, fill=WHITE)
    d.rounded_rectangle([stem_l, top, stem_r, bottom], radius=r, fill=WHITE)

    return Image.alpha_composite(base, overlay).resize((size, size), Image.LANCZOS)


def save(img: Image.Image, name: str, opaque: bool = False) -> None:
    if opaque:
        bg = Image.new("RGB", img.size, GREEN)
        bg.paste(img, mask=img.split()[3])
        img = bg
    img.save(OUT / name, optimize=True)
    print(f"{name}: {img.size[0]}x{img.size[1]}")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    save(draw_logo(512), "icon-512.png")
    save(draw_logo(192), "icon-192.png")
    # maskable: 안전 영역(가운데 80%) 안에 들어오도록 축소
    save(draw_logo(512, scale=0.78), "icon-maskable-512.png")
    save(draw_logo(180, radius_ratio=0.0), "apple-touch-icon.png", opaque=True)
    save(draw_logo(180), "apple-touch.png", opaque=True)
    save(draw_logo(32), "favicon.png")
    (OUT / "favicon.svg").write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="green" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#21A34F"/>
      <stop offset="100%" stop-color="#15803D"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#green)"/>
  <g fill="#FFFFFF">
    <rect x="16" y="16" width="32" height="7" rx="3.5"/>
    <rect x="28.6" y="16" width="7.4" height="33" rx="3.7"/>
  </g>
</svg>
""",
        encoding="utf-8",
    )
    print("favicon.svg")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
