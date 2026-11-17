#!/usr/bin/env python3
"""2026-11-17 애사비·오트몬드·햇반·스프라이트 신규 카드 썸네일 (≤700px JPEG)."""
import io
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "images"
SIZES = ["657x657q90trim", "492x492ex", "320x320ex"]
CDN = "https://thumbnail.coupangcdn.com/thumbnails/remote/{size}/image/{path}"

IMAGES = {
    "acv-duomo-organic-1l": "vendor_inventory/30b4/43f480775011c0b348d5016011f219eddfdbd99efa6633c26d2185c60ec7.png",
    "acv-denigris-organic-1l": "retail/images/45561989066597-47a4d20d-4337-4e2d-a3cb-e6dcd1e12206.jpg",
    "acv-maya-organic-1l-4": "retail/images/ab0cac01-629b-4cbc-9d9d-92e76f90ae442670775154444272009.png",
    "acv-bragg-organic-946ml-2": "vendor_inventory/8174/1c0df16d73e790431db52468868b5257360035544c4d4a6696390e16eea5.jpg",
    "acv-teazen-stick-150g-2": "retail/images/353740717164150-4c83f3ee-0ab5-4d89-816a-f671cdbf0f44.jpg",
    "acv-jeongjikhan-stick-15g-100": "vendor_inventory/1cdb/72b60250f53d2de741ff43cb7f2ec4059637a5df5c0b30d9c6ed794d21cc.jpg",
    "protein-otmond-choco-250ml-36": "retail/images/5cb55635-9b56-408b-9ca2-b13b63da1f8716982474986081878741.png",
    "retort-rice-haetban-baeahyeonmi-130g-36": "retail/images/2024/08/08/11/2/3861503c-90f8-4d92-8174-3ef318c1f5c9.png",
    "seupeuraiteu-jero-saida-500ml-24gae": "retail/images/679915131692343-d177175e-5239-4707-9303-9063c70ad349.jpg",
}


def save_jpeg(raw: bytes, out: Path) -> bool:
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:
        return False
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    w, h = im.size
    if max(w, h) > 700:
        ratio = 700 / max(w, h)
        im = im.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)
    out.write_bytes(b"")
    im.save(out, "JPEG", quality=88, optimize=True)
    return True


def main():
    IMG.mkdir(parents=True, exist_ok=True)
    failures = []
    for name, path in IMAGES.items():
        out = IMG / f"{name}.jpg"
        ok = False
        for size in SIZES:
            url = CDN.format(size=size, path=path)
            res = subprocess.run(["curl", "-s", "-L", "--max-time", "25", url], capture_output=True)
            if res.returncode != 0 or len(res.stdout) < 3000:
                continue
            if save_jpeg(res.stdout, out):
                print(f"ok   {out.name} ({size}, {out.stat().st_size // 1024}KB)")
                ok = True
                break
        if not ok:
            failures.append(name)
            print(f"FAIL {name}")
    if failures:
        print("실패:", failures)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
