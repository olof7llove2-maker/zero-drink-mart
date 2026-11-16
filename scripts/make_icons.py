#!/usr/bin/env python3
"""띠니마트 홈 화면 아이콘을 만든다.

민트색 배경 + 흰색 'ㅌ' 캐릭터(눈 두 개) 로고.
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

MINT = (47, 190, 140)      # #2FBE8C
MINT_DARK = (24, 150, 111)  # #18966F
MINT_DEEP = (10, 116, 88)   # #0A7458
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(size: int, inset: float = 0.0) -> Image.Image:
    """대각선 민트 그라데이션. inset 은 maskable 여백 비율."""
    img = Image.new("RGB", (size, size), MINT)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x / size * 0.55) + (y / size * 0.45)
            px[x, y] = lerp(MINT, MINT_DARK, min(1.0, t))
    return img


def draw_logo(size: int, scale: float = 1.0, radius_ratio: float = 0.0) -> Image.Image:
    """민트 배경 위에 흰 'ㅌ' 캐릭터를 그린다. 4배로 그린 뒤 축소해 계단을 없앤다."""
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

    # 로고 박스(중앙, scale 만큼 축소)
    box = big * 0.78 * scale
    left = (big - box) / 2
    bar = box * 0.164          # 가로획 두께
    gap = box * 0.134          # 획 사이 간격
    right = left + box
    vright = left + bar        # 세로획 오른쪽
    mid_right = left + box * 0.815
    height = bar * 3 + gap * 2
    top = (big - height) / 2
    r = bar / 2

    # 세로획
    d.rounded_rectangle([left, top, vright, top + height], radius=r, fill=WHITE)
    # 위·아래 가로획
    d.rounded_rectangle([left, top, right, top + bar], radius=r, fill=WHITE)
    d.rounded_rectangle(
        [left, top + height - bar, right, top + height], radius=r, fill=WHITE
    )
    # 가운데 가로획(살짝 짧게)
    my = top + bar + gap
    d.rounded_rectangle([left, my, mid_right, my + bar], radius=r, fill=WHITE)

    # 눈 두 개: 위획과 가운데획 사이 빈칸
    eye_y = top + bar + gap / 2
    eye_r = gap * 0.30
    for cx in (left + box * 0.47, left + box * 0.76):
        d.ellipse([cx - eye_r, eye_y - eye_r, cx + eye_r, eye_y + eye_r], fill=MINT_DEEP)
        d.ellipse(
            [cx - eye_r * 0.34, eye_y - eye_r * 0.42, cx + eye_r * 0.06, eye_y - eye_r * 0.02],
            fill=WHITE,
        )

    out = Image.alpha_composite(base, overlay)
    return out.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, name: str, opaque: bool = False) -> None:
    if opaque:
        bg = Image.new("RGB", img.size, MINT)
        bg.paste(img, mask=img.split()[3])
        img = bg
    img.save(OUT / name, optimize=True)
    print(f"{name}: {img.size[0]}x{img.size[1]}")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    save(draw_logo(512), "icon-512.png")
    save(draw_logo(192), "icon-192.png")
    # maskable: 안전 영역(가운데 80%) 안에 들어오도록 축소
    save(draw_logo(512, scale=0.82), "icon-maskable-512.png")
    save(draw_logo(180, radius_ratio=0.0), "apple-touch-icon.png", opaque=True)
    save(draw_logo(180), "apple-touch.png", opaque=True)
    save(draw_logo(32), "favicon.png")
    (OUT / "favicon.svg").write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="mint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2FBE8C"/>
      <stop offset="100%" stop-color="#18966F"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#mint)"/>
  <g fill="#FFFFFF">
    <rect x="16" y="18" width="7" height="28" rx="3.5"/>
    <rect x="16" y="18" width="32" height="7" rx="3.5"/>
    <rect x="16" y="39" width="32" height="7" rx="3.5"/>
    <rect x="16" y="28.5" width="25" height="7" rx="3.5"/>
  </g>
  <circle cx="33" cy="26" r="2.6" fill="#0A7458"/>
  <circle cx="41.5" cy="26" r="2.6" fill="#0A7458"/>
</svg>
""",
        encoding="utf-8",
    )
    print("favicon.svg")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
