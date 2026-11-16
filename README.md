# 제로 음료 비교 마트 (띠니)

제로음료·단백질음료를 100ml당 가격, 병당 단백질(g)로 비교하는 정적 사이트입니다.
`index.html` 하나와 `css/`, `js/`, `images/`, `data/` 자산으로 이루어져 있고, 빌드 없이 그대로 열립니다.

- 배포: GitHub Pages (main 브랜치 루트)
- 상품 데이터: `js/products.js` (77개 상품). `data/products.json`은 같은 데이터의 JSON 사본입니다.
- 구매 링크: 각 상품의 `affiliateUrl`만 사용합니다.

## 가격 추이·비교 분석

- 카드마다 `📊 가격 추이·비교` 버튼이 있고, 누르면 가격 그래프와 비교 분석이 열립니다.
- 비교 분석(카테고리 평균 100ml당 가격, 순위, 정가 대비 할인)은 `data/products.json`만으로 계산합니다.
- 가격 이력은 `data/price-history.json`입니다. **없는 값을 만들지 않습니다.**
  - 과거 이력은 공개 가격추적 사이트(쿠프라이스, couprice.co.kr)가 쿠팡 판매가를 다시 확인해 남긴
    관측 기록(최근 60일)만 씁니다. 기록의 itemId/vendorItemId가 우리 상품과 다르면 쓰지 않습니다.
  - 과거 기록이 확인되지 않은 상품은 `2026-11-16 추적 시작` 상태로 두고, 그날 확인한 가격 한 점만 남깁니다.
- 갱신: `python3 scripts/update_prices.py` (내부적으로 `scripts/fetch_price_history.py` 실행)
  - 쿠팡 상품의 관측 이력을 다시 받아 병합하고, `data/products.json`의 확인 가격을 오늘 관측점으로 추가합니다.
  - 갱신 뒤 `git add data/price-history.json && git commit && git push` 하면 배포됩니다.
