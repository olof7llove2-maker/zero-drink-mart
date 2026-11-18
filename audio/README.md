# BGM 음원 정보

띠니마트 푸터 1줄 컨트롤(`#foot-bgm`)로 켜고 끄는 **신나는 업비트 배경음악**.
페이지 어디든 첫 터치에 자동으로 시작하고(끈 기록이 있으면 시작 안 함), 볼륨은 0.28입니다.
r37(2026-11-18)부터 잔잔한 로파이 1곡 대신 아래 3곡을 **무작위 첫 곡 → 곡이 끝나면 다른 곡** 순으로 이어 틉니다.

| 파일 | 곡 | 길이 | 음질 | 크기 |
| --- | --- | --- | --- | --- |
| `electro-cabello.mp3` | **Electro Cabello** — Kevin MacLeod | 120초 | MP3 192 kbps, 44.1 kHz 스테레오 | 2.75 MB |
| `exit-the-premises.mp3` | **Exit the Premises** — Kevin MacLeod | 120초 | MP3 192 kbps, 44.1 kHz 스테레오 | 2.75 MB |
| `groove-grove.mp3` | **Groove Grove** — Kevin MacLeod | 120초 | MP3 192 kbps, 44.1 kHz 스테레오 | 2.75 MB |

| 항목 | 내용 |
| --- | --- |
| 출처 | https://incompetech.com (Kevin MacLeod) |
| 라이선스 | **CC BY 4.0** — 상업적 이용 가능, **저작자 표시 필수** |
| 표기 위치 | 푸터 `.bgm-credit` — `BGM: Kevin MacLeod (incompetech.com), CC BY 4.0` |
| 가공 | 2분으로 편집, 앞뒤 페이드인/아웃, 세 곡 라우드니스 통일 |

음원을 바꾸면 `js/bgm.js`의 `TRACKS` 목록과 이 표, 푸터 표기를 함께 갱신해 주세요.

`lofi-bgm.mp3`(A cup of tea — TAD, CC0, 105초)는 r28~r36에 쓰던 예전 음원입니다. r37부터 재생하지 않으며 참고용으로만 남겨 둡니다.
