#!/usr/bin/env python3
"""톡딜(store.kakao.com) 상품 검색 API 스캔 → JSON 저장.
사용: python3 talkdeal_scan.py [쿼리,...]
"""
import json, sys, time, urllib.parse, urllib.request, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'talkdeal-scan-20261119.json')
BASE = 'https://store.kakao.com/a/talkdeal/search/products'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

QUERIES = [
    '제로콜라', '제로사이다', '탄산수', '애사비', '이온음료', '에너지드링크', '아이스티', '보리차',
    '두유', '단백질 드링크', '단백질 쉐이크', '프로틴 파우더', '웨이프로틴', '단백질바',
    '닭가슴살', '닭안심', '닭다리살', '부채살', '참치캔', '햇반', '즉석밥', '간편식', '곤약', '오트밀',
]

def fetch(q, page, size=100):
    url = f"{BASE}?q={urllib.parse.quote(q)}&sort=POPULAR&timestamp={int(time.time()*1000)}&page={page}&size={size}"
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json',
                                               'Referer': f"https://store.kakao.com/search/result/product?q={urllib.parse.quote(q)}"})
    with urllib.request.urlopen(req, timeout=25) as r:
        j = json.load(r)
    return j.get('data', {}).get('contents', [])

def main():
    queries = sys.argv[1:] or QUERIES
    store = {}
    if os.path.exists(OUT):
        try:
            store = json.load(open(OUT))
        except Exception:
            store = {}
    for q in queries:
        got = []
        for page in range(3):
            try:
                items = fetch(q, page)
            except Exception as e:
                print(f'ERR {q} p{page}: {e}', file=sys.stderr)
                break
            if not items:
                break
            got.extend(items)
            if len(items) < 100:
                break
            time.sleep(0.4)
        print(f'{q}: {len(got)}')
        for it in got:
            pid = str(it['productId'])
            it['_query'] = q
            store.setdefault(pid, it)
        time.sleep(0.3)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(store, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print('saved', len(store), '->', OUT)

if __name__ == '__main__':
    main()
