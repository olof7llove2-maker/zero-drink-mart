#!/usr/bin/env python3
"""톡딜 스캔 결과 분석 v2 — 옵션/모호 표시 포함."""
import json, re, sys, datetime, os

D = os.path.join(os.path.dirname(__file__), '..', 'data', 'talkdeal-scan-20261119.json')
prods = json.load(open(D))

def end_date(ms):
    if not ms: return ''
    return datetime.datetime.fromtimestamp(ms/1000).strftime('%m-%d %H:%M')

size_re = re.compile(r'(\d+(?:\.\d+)?)\s*(ml|mL|ML|Ml|l|L|리터|kg|KG|Kg|g|G)\b')
total_re = re.compile(r'(?:총|계|합계)\s*(\d+(?:\.\d+)?)\s*(kg|g|L|l|ml)', re.I)
paren_total = re.compile(r'\((\d+(?:\.\d+)?)\s*(kg|g|L|l|ml)\)', re.I)
count_re = re.compile(r'(?:[x*×]\s*(\d{1,3})|(\d{1,3})\s*(개입|개|캔|입|팩|pet|PET|Pet|병|봉|구|매|정|세트))')

def to_g(v, u):
    u = u.lower()
    return float(v)*1000 if u in ('kg','l','리터') else float(v)

def parse(name):
    s = name.replace(',', '')
    amb = '/' in s.split('|')[0] and bool(re.search(r'\d\s*(개|캔|입|팩)?\s*/\s*\d', s))
    # explicit total
    tot = None
    for rx in (total_re, paren_total):
        m = rx.search(s)
        if m:
            tot = to_g(m.group(1), m.group(2)); unit = 'ml' if m.group(2).lower() in ('l','ml') else 'g'
            break
    unit = None
    if tot:
        unit = 'ml' if (tot and ('ml' in s.lower() or 'l ' in s.lower())) else unit
    # single size
    sizes = [(to_g(m.group(1), m.group(2)), ('ml' if m.group(2).lower() in ('ml','l','리터') else 'g')) for m in size_re.finditer(s)]
    counts = [int(m.group(1) or m.group(2)) for m in count_re.finditer(s) if (m.group(1) or m.group(2))]
    counts = [c for c in counts if 2 <= c <= 400]
    return tot, sizes, counts, amb

rows = []
for pid, it in prods.items():
    price = it.get('groupDiscountedPrice') or it.get('discountedPrice')
    if not price: continue
    ship = 0 if it.get('freeDelivery') else (it.get('deliveryFee') or 0)
    tot, sizes, counts, amb = parse(it['productName'])
    vol = None; unit = None
    if tot:
        vol = tot; unit = 'ml' if any(u=='ml' for _,u in sizes) else 'g'
    elif sizes and not amb:
        # pick first size, multiply by first count if a size unit matches
        vol0, unit = sizes[0]
        vol = vol0 * (counts[0] if counts else 1)
    per = (price+ship)/vol*100 if vol else None
    rows.append(dict(pid=pid, name=it['productName'], store=it['storeName'], price=price, ship=ship,
                     deal=bool(it.get('groupDiscountedPrice')), per=per, unit=unit, vol=vol,
                     amb=amb, multi=bool(it.get('hasAdditionalOptionPrice')), end=end_date(it.get('groupDiscountEndAt')),
                     link='https://store.kakao.com'+it['linkPath'], rev=it.get('reviewCount'),
                     sold=it.get('totalSaleCount'), cat=it.get('categoryName'), q=it.get('_query')))

def show(title, pred, n=18, clean=False):
    sel = [r for r in rows if pred(r) and r['per']]
    if clean: sel = [r for r in sel if not r['amb'] and not r['multi']]
    sel.sort(key=lambda r: r['per'])
    print(f'\n### {title} ({len(sel)}건)')
    for r in sel[:n]:
        flags = ('A' if r['amb'] else '-') + ('M' if r['multi'] else '-')
        print(f"{r['per']:8.0f} | {r['price']:>7,}+{r['ship']:<5} | {str(r['vol']):>7} | {r['end']:<12} | {flags} | {r['store'][:11]:<11} | {r['name'][:66]} | {r['link']}")

if __name__ == '__main__':
    q = sys.argv[1] if len(sys.argv) > 1 else ''
    if q == 'rice': show('즉석밥', lambda r: r['unit']=='g' and any(k in r['name'] for k in ['햇반','즉석밥','오뚜기밥','쌀밥']))
    elif q == 'tuna': show('참치', lambda r: r['unit']=='g' and '참치' in r['name'])
    elif q == 'chicken': show('닭가슴살/안심', lambda r: r['unit']=='g' and any(k in r['name'] for k in ['닭가슴살','닭안심','닭 안심']))
    elif q == 'protein': show('단백질음료', lambda r: r['unit']=='ml' and any(k in r['name'] for k in ['단백질','프로틴','고단백']))
    elif q == 'shake': show('프로틴파우더', lambda r: r['unit']=='g' and r['vol'] and r['vol']>=800 and any(k in r['name'] for k in ['프로틴','웨이','WPC','WPI']))
    elif q == 'zero': show('제로음료', lambda r: r['unit']=='ml' and any(k in r['name'] for k in ['제로','무설탕','제로칼로리']))
    elif q == 'water': show('생수', lambda r: r['unit']=='ml' and '생수' in r['name'])
    elif q == 'meal': show('간편식', lambda r: r['unit']=='g' and any(k in r['name'] for k in ['볶음밥','곤약','간편','도시락','스프','죽']))
