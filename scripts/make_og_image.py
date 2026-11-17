#!/usr/bin/env python3
"""띠니마트 공유 미리보기(OG) 이미지 1200x630 생성.

Pretendard 대신 시스템에 있는 Noto Sans CJK KR로 그립니다.
색·문구는 사이트 CSS 토큰(:root)과 맞췄습니다.
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG = (245, 243, 238)
INK = (22, 19, 15)
MUTED = (108, 102, 89)
MUTED2 = (148, 141, 128)
SAGE = (47, 107, 79)
MINT = (47, 190, 140)
LINE = (231, 226, 216)
WHITE = (255, 255, 255)
AMBER = (240, 180, 41)
RED = (226, 87, 76)

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

# 오른쪽 위 은은한 민트 원 (가장자리가 보이지 않게 여러 겹으로)
for rad, mix in ((520, 0.97), (420, 0.95), (320, 0.93), (220, 0.91), (120, 0.89)):
    col = tuple(int(BG[c] + (MINT[c] - BG[c]) * (1 - mix)) for c in range(3))
    d.ellipse((W - 60 - rad, -300 - rad, W - 60 + rad, -300 + rad), fill=col)

# 하단 브랜드 띠
d.rectangle((0, H - 14, W, H), fill=SAGE)

# 아이콘 + 이름
icon_path = os.path.join(os.path.dirname(__file__), "..", "images", "icon-192.png")
x0, y0 = 72, 60
if os.path.exists(icon_path):
    icon = Image.open(icon_path).convert("RGBA").resize((76, 76), Image.LANCZOS)
    img.paste(icon, (x0, y0), icon)
text(d, (x0 + 94, y0 + 6), "띠니마트", 40, INK, bold=1)
text(d, (x0 + 96, y0 + 56), "제로음료 · 단백질 · 고기 · 간편식", 21, MUTED2)

# 헤드라인
text(d, (72, 196), "1병·100g당 가격 비교", 64, INK, bold=1)
text(d, (72, 282), "지금 사도 될까?", 64, SAGE, bold=1)
text(d, (74, 382), "목적만 누르면 1분 안에 결론", 30, MUTED)

# 신호등 3종
pills = [(MINT, "지금 사세요"), (AMBER, "무난한 가격"), (RED, "잠깐 대기")]
px, py = 74, 462
for col, lab in pills:
    d.ellipse((px, py + 6, px + 22, py + 28), fill=col)
    tw = d.textlength(lab, font=f(26))
    text(d, (px + 32, py), lab, 26, INK)
    px += 32 + tw + 34

# 오른쪽 아래 주소
text(d, (W - 72, H - 62), "zero-drink-mart.vercel.app", 22, MUTED2, anchor="ra")

out = os.path.join(os.path.dirname(__file__), "..", "images", "og-image.png")
img.save(out, "PNG", optimize=True)
print("saved", os.path.abspath(out), img.size)
