#!/usr/bin/env python3
"""2026-11-16 밤: 에어프라이어 식단 고기 추가 13종(소 3·돼지 5·닭 5) 썸네일 다운로드.

쿠팡 썸네일 CDN 경로는 검색 목록에서 확인한 값을 그대로 옮겨 적었다.
저장 위치: work/zero-mart/images/meat-*.jpg  (기존 앱 파일은 건드리지 않는다)
사용법: python3 scripts/fetch_meat_airfryer_images_20261116.py
"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "images"
SIZES = ["657x657q90trim", "492x492ex", "320x320ex"]
CDN = "https://thumbnail.coupangcdn.com/thumbnails/remote/{size}/image/{path}"

IMAGES = {
    "meat-beef-us-prime-chuckeye-steak-1kg": "retail/images/416765458260523-c440c21a-622d-4048-8b4a-e7e5a4724b50.jpg",
    "meat-beef-muscleggo-udunsal-steak-10x150g": "retail/images/1144509902345488-95470246-c606-4cf3-848b-000ffdb2713d.jpg",
    "meat-beef-gomgom-au-chimasal-gui-600g": "retail/images/659322611323783-235aab94-7cfa-458b-8e10-6cdf1a6b2816.jpg",
    "meat-pork-dongwon-hangjeongsal-800g": "retail/images/559767568433656-be6f2be8-3e3e-422f-b681-4f82b2cc81e5.jpg",
    "meat-pork-tongsamgyeop-camping-2kg": "vendor_inventory/7996/4f8046a863977294deee5b5e51a2a2b96de9a9329a04b9795219f4b2ab2c.jpg",
    "meat-pork-mokuchon-profork-apdari-500g": "retail/images/269901997091943-d9877066-f771-425c-a06d-aac52c430aa5.jpg",
    "meat-pork-deungsim-slice-diet-10x200g": "vendor_inventory/54be/ff37d9d1780486f64a9a5172b2289593d193fa809266e2c7cc2026f8e961.jpg",
    "meat-pork-ansim-gui-diet-10x200g": "vendor_inventory/9165/ff87fea78723a2782ab57d4cd1c1781f523dd1a07a9f4bff1dcbfc53907e.jpg",
    "meat-chicken-k1-sai-jeongyuk-1kg": "vendor_inventory/8e27/da380bf0985dbd31486d5054f6ce466a772755d2ccdbb9ff3137c25875f9.png",
    "meat-chicken-k1-bukchae-drumstick-1kg": "vendor_inventory/image_audit/stage/manual/5d45a3833307a60e8b15bbee1bf322de312490a3eee6d23174197db4ae9c_1757641762615.jpg",
    "meat-chicken-maniker-wing-bong-1kg": "retail/images/1678007590451441-33509265-d68d-4c99-a059-be25cc04c5a5.jpg",
    "meat-chicken-deohadak-steak-original-30x90g": "vendor_inventory/image_audit/prod/4fec163d-eea2-4c45-a78a-4d55f809bc8f_fixing_v2.png",
    "meat-chicken-hangang-iqf-cube-1kg": "1025_amir_coupang_oct_80k/e911/ef8a06dfe782813f5eee78b2d2677ef0d35168ea6610906ff06790a4a926.jpg",
}


def to_jpeg(raw: bytes) -> bytes:
    """CDN이 PNG로 주는 썸네일도 앱이 쓰는 .jpg 파일로 통일한다."""
    im = Image.open(io.BytesIO(raw))
    im = im.convert("RGB")
    if max(im.size) > 800:
        im.thumbnail((800, 800))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88)
    return buf.getvalue()


def is_jpeg(p: Path) -> bool:
    try:
        with p.open("rb") as f:
            return f.read(3) == b"\xff\xd8\xff" and p.stat().st_size > 3000
    except OSError:
        return False


def main() -> int:
    IMG.mkdir(parents=True, exist_ok=True)
    failures = []
    for name, path in IMAGES.items():
        out = IMG / f"{name}.jpg"
        if out.exists() and is_jpeg(out):
            print(f"skip {out.name}")
            continue
        ok = False
        for size in SIZES:
            tmp = out.with_suffix(".part")
            subprocess.run(
                ["curl", "-sS", "-m", "40", "-A", "Mozilla/5.0", "-o", str(tmp),
                 CDN.format(size=size, path=path)],
                capture_output=True,
            )
            if tmp.exists() and tmp.stat().st_size > 3000:
                raw = tmp.read_bytes()
                try:
                    if raw[:3] != b"\xff\xd8\xff":
                        raw = to_jpeg(raw)
                    out.write_bytes(raw)
                    ok = is_jpeg(out)
                except Exception as exc:  # noqa: BLE001
                    print(f"  convert error {name}: {exc}")
            tmp.unlink(missing_ok=True)
            if ok:
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
