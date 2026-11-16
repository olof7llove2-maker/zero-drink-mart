# 제로 음료 비교 마트 (띠니)

제로음료·단백질음료·단백질쉐이크·식단고기를 단가와 단백질·성분으로 비교하는 정적 사이트입니다.
`index.html` 하나와 `css/`, `js/`, `images/`, `data/` 자산으로 이루어져 있고, 빌드 없이 그대로 열립니다.

- 배포: https://zero-drink-mart.vercel.app (Vercel, main 브랜치 push 시 자동 배포)
- 상품 데이터: `js/products.js` (112개 상품). `data/products.json`은 같은 데이터의 JSON 사본이고,
  `js/products.js`가 로드되지 않을 때 사이트가 이 파일로 넘어갑니다. 두 파일 내용은 항상 같게 유지합니다.
- 첫 화면의 **마지막 업데이트** 날짜는 상품 카드의 `priceCheckedAt` 중 가장 늦은 날짜에서 계산합니다
  (`js/app.js`의 `latestChecked()`). 그래서 가격을 갱신하기만 하면 날짜도 같이 바뀝니다.
  업데이트 주기 문구는 `SITE.updateCycle`·`SITE.updateCycleNote`에 있습니다(예: 매일 오전 9시 가격 자동 업데이트).
- 세부 분류는 `CATEGORIES`(이름·이모지)와 `PARTS[].filters`(칩 이름·이모지·한 줄 설명)로 그립니다.
  2026-11-16에 `python3 scripts/update_labels_20261116.py`로 이름을 풀네임으로 다듬었습니다
  (이온 → 이온음료, 에너지 → 에너지음료, 애사비 → 애사비(사과식초), 분말 → 분말·티백 등).
- 대분류 4단: `PARTS`(전체 112 · 🥤 제로 음료 53 · 💪 단백질 음료·쉐이크 30 · 🥩 식단 고기·조리 29) → `CATEGORIES`(세부 분류).
  탭에 상품 개수가 함께 표시되고, 세부 분류는 뭉치지 않고 하나씩 나뉩니다.
  (제로: 콜라·사이다·탄산수·생수·차·아이스티·이온음료·에너지음료·애사비(사과식초)·분말·티백 /
   고기: 소고기·돼지고기·닭고기·양고기·오리고기·연어·에어프라이어·조리기구)
- 단백질 음료 세부 필터는 상품별 `proteinType` 값으로 고릅니다
  (`soy` 두유·식물성 · `choco` 초코·커피맛 · `fruit` 과일맛(딸기·바나나) · `plain` 플레인·고소한맛).
  `고단백(20g+)` 는 병당 단백질 20g 이상. 분류를 바꾸거나 추가할 때는
  `python3 scripts/restructure_categories_20261116.py` 로 두 파일(PARTS·proteinType)을 함께 갱신합니다.
  (이 스크립트는 `const PARTS` 중 **첫 번째** 블록만 바꿉니다. 2026-11-16에 뒤에 남아 있던
  예전 `const PARTS` 사본을 `scripts/update_labels_20261116.py`로 지워, 이제 선언은 하나뿐입니다.)
  `전체`에서는 단백질·제로 음료가 먼저, 고기·조리기구가 맨 뒤에 옵니다.
- 고기·조리기구 27종은 `data/meat-candidates.json` 원본을 `scripts/merge_meat_products.py`로 합칩니다.
- 구매 링크: 각 상품의 `affiliateUrl`만 사용합니다. 공유 버튼은 제휴 링크가 아니라 마트 주소를 공유합니다.
- 홈 화면 아이콘: `python3 scripts/make_icons.py` (민트 배경 + 흰 'ㅌ' 캐릭터).

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
