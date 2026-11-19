#!/usr/bin/env python3
"""띠니 공유 미리보기(OG) 이미지 1200x630 생성 (r51).

Pretendard 대신 시스템에 있는 Noto Sans CJK KR로 그립니다.
색은 사이트 CSS 토큰(:root r51)과 맞췄습니다 — 따뜻한 화이트 바탕 + 프레시 그린 + 코랄 포인트.
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG = (247, 247, 245)        # #F7F7F5
INK = (28, 25, 23)          # #1C1917
MUTED = (111, 106, 100)     # #6F6A64
MUTED2 = (140, 134, 127)    # #8C867F
GREEN = (21, 128, 61)       # #15803D
GREEN_LT = (33, 163, 79)    # #21A34F
GREEN_SOFT = (237, 248, 240)  # #EDF8F0
CORAL = (240, 68, 56)       # #F04438
AMBER = (240, 180, 41)
LINE = (231, 228, 223)      # #E7E4DF
WHITE = (255, 255, 255)

FONT = "/usr/share/fonts/pickle-hwp/NotoSansCJKkr-Regular.otf"


def f(size):
    return ImageFont.truetype(FONT, size)


def text(d, xy, s, size, fill, bold=0, anchor="la"):
    d.text(xy, s, font=f(size), fill=fill, anchor=anchor,
           stroke_width=bold, stroke_fill=fill)


def rounded(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# 오른쪽 위 은은한 그린 원 (가장자리가 보이지 않게 여러 겹으로)
for rad, strength in ((520, 0.42), (420, 0.36), (320, 0.30), (220, 0.24), (120, 0.18)):
    col = tuple(int(BG[c] + (GREEN_LT[c] - BG[c]) * strength) for c in range(3))
    d.ellipse((W - 60 - rad, -300 - rad, W - 60 + rad, -300 + rad), fill=col)

# 오른쪽 아래 코랄 점 — 입맛 도는 포인트
d.ellipse((W - 210, H - 238, W - 150, H - 178), fill=(253, 226, 221))

# 하단 브랜드 띠
d.rectangle((0, H - 14, W, H), fill=GREEN)

# 아이콘 + 이름
icon_path = os.path.join(os.path.dirname(__file__), "..", "images", "icon-192.png")
x0, y0 = 72, 60
if os.path.exists(icon_path):
    icon = Image.open(icon_path).convert("RGBA").resize((76, 76), Image.LANCZOS)
    img.paste(icon, (x0, y0), icon)
text(d, (x0 + 94, y0 + 6), "띠니", 40, INK, bold=1)
text(d, (x0 + 94, y0 + 56), "쿠팡·토스·네이버 최저가 비교", 21, MUTED2)

# 헤드라인
text(d, (72, 196), "1병·100g당 가격 비교", 64, INK, bold=1)
text(d, (72, 282), "지금 사도 될까?", 64, GREEN, bold=1)
text(d, (74, 382), "직접 팔지 않고, 가장 싼 곳으로 연결해요", 30, MUTED)

# 신호등 3종
pills = [(GREEN_LT, "지금 사세요"), (AMBER, "무난한 가격"), (CORAL, "잠깐 대기")]
px, py = 74, 462
for col, lab in pills:
    d.ellipse((px, py + 7, px + 24, py + 31), fill=col)
    tw = d.textlength(lab, font=f(27))
    text(d, (px + 34, py), lab, 27, INK)
    px += 34 + tw + 34

# 오른쪽 아래 주소
text(d, (W - 72, H - 62), "ttini.kr", 22, MUTED2, anchor="ra")

out = os.path.join(os.path.dirname(__file__), "..", "images", "og-image.png")
img.save(out, "PNG", optimize=True)
print("saved", os.path.abspath(out), img.size)
