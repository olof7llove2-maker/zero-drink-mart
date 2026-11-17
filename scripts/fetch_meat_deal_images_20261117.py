#!/usr/bin/env python3
"""2026-11-17 신규 초특가 고기 14종 썸네일 내려받기 (이미지 파일명 = 상품 id)."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "images"
SIZES = ["657x657q90trim", "492x492ex", "320x320ex"]
CDN = "https://thumbnail.coupangcdn.com/thumbnails/remote/{size}/image/{path}"

IMAGES = {
    "meat-beef-gomgom-daepae-woosamgyup-1kg": "retail/images/221605937416791-77f4bb69-0af5-44ba-9ac8-4fca6aaf3f5f.jpg",
    "meat-beef-ouratown-woosamgyup-1kg": "vendor_inventory/181a/13531a5fb4d261b485cb7b67e811cc20f23d0eb20858bbb8686fbb5ffc30.png",
    "meat-beef-dongwon-5cho-woosamgyup-2kg": "retail/images/713915010901940-18624fb2-54e2-4167-84b3-0e1d7b995efb.jpg",
    "meat-beef-deoyeppeunhanwoo-buchaesal-1kg": "vendor_inventory/8c42/114262415b425012e51baf9c23966dc7db713b8a40e87add268d43061232.png",
    "meat-beef-au-buchaesal-cube-1kg": "vendor_inventory/563e/8060835d1957fcd941033c65012a4986456800d0701f7d26dc3af8323764.jpg",
    "meat-beef-luckymeat-bolsal-1kg": "vendor_inventory/image_audit/stage/manual/ec8d7d0382f9179ab3f8f49bdb1eaa124d4edd40f9268913451692184e3e_1793870559907.jpeg",
    "meat-pork-spain-daepae-samgyeop-2kg": "retail/images/41648693797940-f04b32f8-4d97-4012-8204-f5a90d3381dc.jpg",
    "meat-pork-gomgom-muyeongol-daepae-1-5kg": "retail/images/1271144344775-ec7e74e6-4375-49f9-b9e3-eada3c6e3be6.jpg",
    "meat-pork-gomgom-daepae-samgyeop-1kg-2": "1025_amir_coupang_oct_80k/1583/042b8f488aef231e7df73ff513d0748bfe3afce1e426bf2a0a94d27d8e8f.jpg",
    "meat-pork-daepaeking-jeongsamgyeop-2kg": "retail/images/68250614187930-3f3d97fb-93cc-4c7d-831c-87201aa2f595.jpg",
    "meat-chicken-pultorae-fresh-breast-2kg": "vendor_inventory/956f/2c4a8cbda1d018082f23aa1933384db0c83e8736619c406088a0f1345674.jpg",
    "meat-chicken-deobareundak-breast-2kg": "vendor_inventory/image_audit/stage/manual/d3b2dbb19a78dba17637bab6450714e47cae714a0fa087cc14b9b9fb6515_1792656435033.jpg",
    "meat-chicken-sajowon-tenderloin-1kg-2": "retail/images/06a42278-56ef-4798-afe2-a2b7c4b6c4cb14215458482268455312.png",
    "meat-chicken-pultorae-tenderloin-2kg": "vendor_inventory/4cfa/f63b2dc876cf2f414e63d9d417c5752711caf70b2095564d613a651bd739.jpg",
}


def is_image(p: Path) -> bool:
    try:
        with p.open("rb") as f:
            head = f.read(4)
        return (head[:3] == b"\xff\xd8\xff" or head[:4] == b"\x89PNG") and p.stat().st_size > 3000
    except OSError:
        return False


def main() -> int:
    IMG.mkdir(parents=True, exist_ok=True)
    out_path = IMG / "meat_deals_20261117.jpg"
    failures = []
    for name, path in IMAGES.items():
        out = IMG / f"{name}.jpg"
        if out.exists() and is_image(out):
            print(f"skip {out.name}")
            continue
        ok = False
        for size in SIZES:
            url = CDN.format(size=size, path=path)
            subprocess.run(["curl", "-s", "-L", "-o", str(out), url], check=False)
            if is_image(out):
                print(f"ok   {out.name} ({size})")
                ok = True
                break
        if not ok:
            failures.append(name)
            print(f"FAIL {name}")

    if failures:
        print("실패:", failures)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
