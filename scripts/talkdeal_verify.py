#!/usr/bin/env python3
"""톡딜 후보 상품의 옵션별 실가격 검증.
scan JSON → 후보 추림 → detail/options API → 옵션별 단가 계산 → JSON 저장
"""
import json, re, os, time, urllib.request, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN = os.path.join(BASE, 'data', 'talkdeal-scan-20261119.json')
OUT = os.path.join(BASE, 'data', 'talkdeal-verified-20261119.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

# 마트 최저 단가 (100ml 또는 100g) — data/products.json 에서 카테고리별 최저 perValue
MART_MIN = {'cola':110,'cider':88,'sparkling':65,'water':23,'acv':220,'ion':95,'energy':228,'icetea':141,'tea':86,
            'protein':293,'lowsoy':353,'shake':1414,'chicken':633,'beef':1460,'pork':890,'can':1266,'rice':410,
            'meal':216,'ready':705,'snack':1897,'egg':366}

size_re = re.compile(r'(\d+(?:\.\d+)?)\s*(ml|mL|ML|Ml|l|L|리터|kg|KG|Kg|g|G)\b')
count_re = re.compile(r'(?:[x*×]\s*(\d{1,3})|(\d{1,3})\s*(개입|개|캔|입|팩|pet|PET|Pet|병|봉|구|매|정))')

def to_mlg(v,u):
    u=u.lower()
    return float(v)*1000 if u in ('kg','l','리터') else float(v)

def parse_vol(name):
    """returns (volume, unit) best-effort; None if ambiguous"""
    s=name.replace(',','')
    # explicit total like 총 2kg / (2kg)
    m=re.search(r'(?:총|계)\s*(\d+(?:\.\d+)?)\s*(kg|g|L|l|ml)', s, re.I)
    if m:
        u=m.group(2).lower(); return to_mlg(m.group(1),u), ('ml' if u in ('l','ml') else 'g')
    m=re.search(r'\((\d+(?:\.\d+)?)\s*(kg|g|L|l|ml)\)', s, re.I)
    if m:
        u=m.group(2).lower(); return to_mlg(m.group(1),u), ('ml' if u in ('l','ml') else 'g')
    sizes=[(to_mlg(mm.group(1),mm.group(2)), 'ml' if mm.group(2).lower() in ('ml','l','리터') else 'g') for mm in size_re.finditer(s)]
    if not sizes: return None, None
    vol,unit=sizes[0]
    if re.search(r'\d\s*/\s*\d', s): return None, unit  # 12/24개 같은 모호 표기
    counts=[int(mm.group(1) or mm.group(2)) for mm in count_re.finditer(s) if (mm.group(1) or mm.group(2))]
    counts=[c for c in counts if 2<=c<=400]
    if counts: vol*=counts[0]
    return vol, unit

def get(url):
    req=urllib.request.Request(url, headers={'User-Agent':UA,'Referer':'https://store.kakao.com/'})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)

def end(ms):
    return datetime.datetime.fromtimestamp(ms/1000).strftime('%Y-%m-%d %H:%M') if ms else ''

def category_bucket(name, cat):
    n=name
    if '참치' in n: return 'can'
    if any(k in n for k in ['닭가슴살','닭안심','닭 안심']): return 'chicken'
    if any(k in n for k in ['부채살','삼겹','목살','우삼겹']): return 'beef' if '부채' in n or '우삼겹' in n else 'pork'
    if any(k in n for k in ['햇반','즉석밥','오뚜기밥','쌀밥']): return 'rice'
    if any(k in n for k in ['콜라']) and '제로' in n: return 'cola'
    if '사이다' in n: return 'cider'
    if '탄산수' in n: return 'sparkling'
    if '생수' in n: return 'water'
    if '애사비' in n: return 'acv'
    if '이온' in n: return 'ion'
    if any(k in n for k in ['에너지','핫식스','몬스터','레드불','박카스']): return 'energy'
    if '아이스티' in n or '복숭아' in n and '티' in n: return 'icetea'
    if '보리' in n: return 'tea'
    if any(k in n for k in ['단백질','프로틴','고단백']) and any(u in n for u in ['ml','mL','ml ']): return 'protein'
    return None

def main():
    scan=json.load(open(SCAN))
    cands=[]
    for pid,it in scan.items():
        price=it.get('groupDiscountedPrice') or it.get('discountedPrice')
        if not price: continue
        ship=0 if it.get('freeDelivery') else (it.get('deliveryFee') or 0)
        vol,unit=parse_vol(it['productName'])
        b=category_bucket(it['productName'], it.get('categoryName'))
        if not vol or not b: continue
        per=(price+ship)/vol*100
        if per <= MART_MIN[b]*1.35:
            cands.append((pid,it,price,ship,vol,unit,per,b))
    import sys
    a0=int(sys.argv[1]) if len(sys.argv)>1 else 0
    a1=int(sys.argv[2]) if len(sys.argv)>2 else len(cands)
    cands=cands[a0:a1]
    print('candidates', len(cands), 'range', a0, a1)
    out={}
    if os.path.exists(OUT):
        try: out=json.load(open(OUT))
        except Exception: out={}
    for i,(pid,it,price,ship,vol,unit,per,b) in enumerate(cands):
        dom=it['linkPath'].strip('/').split('/')[0]
        try:
            opts=get(f'https://store.kakao.com/a/f-m/{dom}/products/{pid}/options')
            det=get(f'https://store.kakao.com/a/f-m/{dom}/products/{pid}/detail')
        except Exception as e:
            print('ERR', pid, e); continue
        o=opts.get('data',{})
        base=det.get('data',{}).get('price',{}).get('totalDiscountedPrice') or price
        rows=[]
        if o.get('options'):
            for op in o['options']:
                val=op.get('value','')
                p=base+ (op.get('addPrice') or 0)
                v,u=parse_vol(val)
                rows.append(dict(option=val, price=p, vol=v, unit=u, per=(p+ship)/v*100 if v else None))
        else:
            v,u=parse_vol(it['productName'])
            rows.append(dict(option='단일', price=base, vol=v, unit=u, per=(base+ship)/v*100 if v else None))
        out[pid]=dict(name=it['productName'], store=it['storeName'], link='https://store.kakao.com'+it['linkPath'],
                      ship=ship, free=bool(it.get('freeDelivery')), end=end(it.get('groupDiscountEndAt')),
                      deal=bool(it.get('groupDiscountedPrice')), bucket=b, mart_min=MART_MIN[b],
                      reviews=it.get('reviewCount'), sold=it.get('totalSaleCount'), options=rows)
        time.sleep(0.1)
        if i%20==0:
            print(i, pid, b, round(per,1), flush=True)
            json.dump(out, open(OUT,'w'), ensure_ascii=False, indent=1)
    json.dump(out, open(OUT,'w'), ensure_ascii=False, indent=1)
    print('saved', len(out))

if __name__=='__main__':
    main()
