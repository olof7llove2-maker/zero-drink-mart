#!/usr/bin/env python3
"""2026-11-16 고기 파트(소·돼지·닭·양·오리·연어·조리기구) 상품 이미지 다운로드.

쿠팡 썸네일 CDN 경로는 브라우저에서 확인한 값을 그대로 옮겨 적었다.
저장 위치: work/zero-mart/images/meat-*.jpg  (앱 파일은 건드리지 않는다)
사용법: python3 scripts/fetch_meat_images_20261116.py
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "images"
SIZES = ["657x657q90trim", "492x492ex", "320x320ex"]
CDN = "https://thumbnail.coupangcdn.com/thumbnails/remote/{size}/image/{path}"

IMAGES = {
    "meat-beef-nonghyup-anximhanwoo-sukseongdeungsim-200g": "retail/images/52410728553875-d58962b1-1b8a-45a4-a77f-aaa59b0f9534.jpg",
    "meat-beef-gomgom-chimasal-300g": "retail/images/55021959682572-a677436b-f820-40b4-acb8-e30b74929ef7.jpg",
    "meat-beef-au-salchisal-steak-400g": "retail/images/61373906588335-4c97a83b-6ddd-485f-8d65-c5989ad5994c.jpg",
    "meat-beef-mokuchon-chaekkeut-300g": "retail/images/1908013749704922-74b602ba-1af7-4782-8547-c3e54490f5bc.jpg",
    "meat-beef-mokuchon-udun-300g": "retail/images/1210382443336678-145c6b9a-1e2e-4fe4-8c07-c6a2fcc35fc4.jpg",
    "meat-pork-dodram-handon-samgyeopsal-1kg": "retail/images/241421083965515-3543ae71-0b1a-41c5-ac65-767c33d33fba.jpg",
    "meat-pork-moamit-canada-samgyeopsal-1kg": "retail/images/1126903252840447-a24e7ca9-5733-4bfd-ac90-674fb879eac9.jpg",
    "meat-pork-moamit-canada-moksal-1kg": "retail/images/4276237587867833-2bfc1096-9ec9-4ae0-8a02-55c58b13798d.jpg",
    "meat-pork-handon-hindleg-2kg": "vendor_inventory/aa9f/36bb50286322d67c3d41f7d5b48c0f40c79b68b6adb8d0098e067312341e.jpg",
    "meat-pork-hyphork-bbul-hangjeong-500g": "retail/images/1373765647494522-76ce48ba-02a1-4a06-8c11-251963a7d220.jpg",
    "meat-chicken-harim-jayeonsilrok-breast-400g": "retail/images/2259214699550928-ad1106ba-f046-4e37-813b-71b3e9ce2f71.jpg",
    "meat-chicken-harim-iff-breast-2kg": "retail/images/2882595627829337-dda8fe4b-040f-4d3a-9fc2-fa00a275ecf3.jpg",
    "meat-chicken-harim-tenderloin-350g": "retail/images/2262448547856349-e44370ab-141f-4360-ab25-3450bce59ccb.jpg",
    "meat-chicken-hangang-iqf-tenderloin-2kg": "rs_quotation_api/4czidqw3/52b53cb99d0e4eda8aafee1c06c7274f.jpg",
    "meat-chicken-pultorae-drumstick-2kg": "vendor_inventory/17dc/80e6c1c90c0b5d25720013cb1d7b26034eafff290feeeeadd1fb263b1cdf.jpg",
    "meat-duck-dahyang-hunje-600g": "retail/images/5458851699897-3ce4e405-5f06-408a-952b-e424a0a534a1.jpg",
    "meat-duck-gomgom-hunje-600g": "retail/images/183489503072584-06d954a0-527e-4c94-8c13-e8bcb32c71c5.jpg",
    "meat-duck-mokuchon-herbgarlic-6pack": "vendor_inventory/a749/f23bae461da2decd01788f978fadb05e7c9e2c7c36bb5605aa14b3efd182.jpg",
    "meat-salmon-mowi-saeng-500g": "rs_quotation_api/ubr89syq/b7eaa8fb293d44399e8e0c5c5cb92f55.jpg",
    "meat-salmon-gomgom-hunje-500g": "retail/images/36418519501175-44e202c2-3974-4bd7-8248-4dc86e99609a.jpg",
    "meat-salmon-eunhasusan-steak-400g": "retail/images/2021/12/02/16/2/8d895265-950a-40f3-90af-879f1b3a5356.jpg",
    "meat-gadget-homeplanet-airfryer-3-5l": "retail/images/217998999266375-b4f8a4b3-ffe4-40aa-9c8f-57c413740966.jpg",
    "meat-gadget-jaewon-budicook-airfryer-3-9l": "vendor_inventory/c716/6795d601e8761ea213b9cba7a3db6414984d552e4b65043ca8271db5b2f2.jpg",
    "meat-gadget-homeplanet-electric-grill": "1025_amir_coupang_oct_80k/c332/7d8838f696200d8dba3a4db312e2435502b64daca2df5a32404bd73adb48.jpg",
    "meat-gadget-billiebin-griddle-pan-39cm": "1025_amir_coupang_oct_80k/4325/2a47794ba8f38b5ddcac1fa00f64b093d68a98e921e1083bc13b67a420b9.jpg",
}


def main() -> int:
    IMG.mkdir(parents=True, exist_ok=True)
    failures = []
    for name, path in IMAGES.items():
        out = IMG / f"{name}.jpg"
        def is_jpeg(p: Path) -> bool:
            try:
                with p.open("rb") as f:
                    return f.read(3) == b"\xff\xd8\xff" and p.stat().st_size > 3000
            except OSError:
                return False

        if out.exists() and is_jpeg(out):
            print(f"skip {out.name}")
            continue
        ok = False
        for size in SIZES:
            subprocess.run(
                ["curl", "-sS", "-m", "40", "-A", "Mozilla/5.0", "-o", str(out),
                 CDN.format(size=size, path=path)],
                capture_output=True,
            )
            if out.exists() and is_jpeg(out):
                ok = True
                break
        print(("ok   " if ok else "FAIL ") + f"{out.name} {out.stat().st_size if out.exists() else 0}B")
        if not ok:
            failures.append(name)
    print(f"\n{len(IMAGES) - len(failures)}/{len(IMAGES)} downloaded")
    if failures:
        print("failed:", failures)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
