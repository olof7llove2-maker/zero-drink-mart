#!/usr/bin/env python3
"""r67 — 띠니 OG 미리보기(1200×630) 렌더.

브랜드: 검은 둥근 사각 T 로고 + 띠니 + 파란 '최저가 비교' 배지,
토스식 화이트/연회색 카드, #3182F6 블루 포인트.
한글은 Pretendard, 이모지는 NotoColorEmoji(109px 렌더 후 축소).
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
FONT_DIR = "/workspace/.fonts"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

INK = (25, 31, 40)          # #191F28
INK2 = (78, 89, 104)        # #4E5968
INK3 = (139, 149, 161)      # #8B95A1
BLUE = (49, 130, 246)       # #3182F6
BLUE_SOFT = (232, 241, 254)
BG = (255, 255, 255)
GRAY_BG = (242, 244, 246)   # #F2F4F6
LINE = (229, 232, 235)
RED = (217, 43, 43)
GREEN = (3, 158, 70)

REG = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Regular.ttf", 30)
MED = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Bold.ttf", 30)
BOLD = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Bold.ttf", 38)
XB = f"{FONT_DIR}/Pretendard-ExtraBold.ttf"


def xb(size):
    return ImageFont.truetype(XB, size)


def rounded(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def emoji_img(ch, px):
    f = ImageFont.truetype(EMOJI, 109)
    canvas = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.text((10, 10), ch, font=f, embedded_color=True)
    bbox = canvas.getbbox() or (0, 0, 140, 140)
    canvas = canvas.crop(bbox)
    return canvas.resize((px, px), Image.LANCZOS)


def text_w(draw, txt, font):
    b = draw.textbbox((0, 0), txt, font=font)
    return b[2] - b[0], b[3] - b[1]


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# 배경: 연회색 큰 원(토스 톤)
d.ellipse((-180, 380, 420, 980), fill=GRAY_BG)
d.ellipse((860, -260, 1400, 280), fill=(247, 249, 251))

# ── 로고 줄 ──────────────────────────────────────────────
mark_size = 62
mx, my = 72, 58
rounded(d, (mx, my, mx + mark_size, my + mark_size), 17, fill=INK)
tfont = xb(38)
tw, th = text_w(d, "T", tfont)
d.text((mx + (mark_size - tw) / 2 - 1, my + (mark_size - th) / 2 - 6), "T", font=tfont, fill="white")

brand_font = xb(36)
d.text((mx + mark_size + 16, my + 2), "띠니", font=brand_font, fill=INK)
bw, _ = text_w(d, "띠니", brand_font)

bx = mx + mark_size + 16 + bw + 14
badge_font = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Bold.ttf", 23)
bt = "최저가 비교"
btw, bth = text_w(d, bt, badge_font)
rounded(d, (bx, my + 9, bx + btw + 30, my + 9 + 42), 21, fill=BLUE)
d.text((bx + 15, my + 9 + 8), bt, font=badge_font, fill="white")

# ── 메인 카피 ────────────────────────────────────────────
h1 = xb(82)
d.text((70, 176), "식단이 필요할 때!", font=h1, fill=INK)
line2_y = 278
d.text((70, line2_y), "최저가 비교", font=h1, fill=BLUE)
w2, _ = text_w(d, "최저가 비교", h1)
num = xb(52)
d.text((70 + w2 + 18, line2_y + 26), "72종", font=num, fill=INK)

# ── 서브 카피 ────────────────────────────────────────────
sub = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Regular.ttf", 32)
d.text((74, 404), "쿠팡 · 네이버 · 카톡 톡딜 · 토스 72종", font=sub, fill=INK2)
d.text((74, 452), "100g · 1병 · 단백질 20g당 진짜 최저가", font=sub, fill=INK2)

# ── 우측 미니 비교 카드 ──────────────────────────────────
cards = [
    ("🔥", "역대 최저", RED, "미트리 자이언트 볶음밥", "1팩 단백질 30g · 100g당 1,125원"),
    ("🟢", "지금 사기 좋아요", GREEN, "잇메이트 닭가슴살 소시지", "100g당 1,690원 · 단백질 20g"),
]
cx0, cw = 706, 424
cy = 112
ch = 196
for icon, label, color, name, price in cards:
    shadow = Image.new("RGBA", (cw + 24, ch + 24), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((12, 14, cw + 12, ch + 14), radius=26, fill=(17, 24, 39, 26))
    shadow = shadow.filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).GaussianBlur(9))
    img.paste(shadow, (cx0 - 12, cy - 12), shadow)
    rounded(d, (cx0, cy, cx0 + cw, cy + ch), 24, fill="white", outline=LINE, width=2)

    # 배지
    badge_font2 = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Bold.ttf", 24)
    lw, lh = text_w(d, label, badge_font2)
    em = emoji_img(icon, 30)
    pill_w = lw + 30 + 22 + 26
    soft = (255, 241, 242) if color == RED else (232, 249, 238)
    rounded(d, (cx0 + 26, cy + 26, cx0 + 26 + pill_w, cy + 26 + 44), 22, fill=soft)
    img.paste(em, (int(cx0 + 26 + 12), int(cy + 26 + 7)), em)
    d.text((cx0 + 26 + 12 + 30 + 8, cy + 26 + 8), label, font=badge_font2, fill=color)

    name_font = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Bold.ttf", 30)
    nm = name
    while text_w(d, nm, name_font)[0] > cw - 52 and len(nm) > 6:
        nm = nm[:-1]
    d.text((cx0 + 26, cy + 92), nm + ("…" if nm != name else ""), font=name_font, fill=INK)

    sub_font = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Regular.ttf", 26)
    ps = price
    while text_w(d, ps, sub_font)[0] > cw - 52 and len(ps) > 6:
        ps = ps[:-1]
    d.text((cx0 + 26, cy + 136), ps + ("…" if ps != price else ""), font=sub_font, fill=INK2)
    cy += ch + 26

# ── 하단: 도메인 + 판매처 칩 ─────────────────────────────
chip_font = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Bold.ttf", 22)
chips = ["쿠팡", "네이버", "톡딜", "토스"]
x = 74
for c in chips:
    cwid, _ = text_w(d, c, chip_font)
    rounded(d, (x, 528, x + cwid + 34, 528 + 42), 21, fill=GRAY_BG)
    d.text((x + 17, 528 + 8), c, font=chip_font, fill=INK2)
    x += cwid + 34 + 10

dom_font = ImageFont.truetype(f"{FONT_DIR}/Pretendard-Bold.ttf", 26)
dw, _ = text_w(d, "ttini.kr", dom_font)
d.text((W - 74 - dw, 536), "ttini.kr", font=dom_font, fill=BLUE)

img.save("/workspace/work/zero-mart/images/og-image-r67.png", optimize=True)
print("saved", img.size)
