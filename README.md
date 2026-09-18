# EFB — 파일럿용 Electronic Flight Bag (v0.1)

> ⚠️ **시뮬레이터·학습용. 실제 비행에 사용 금지.**
> 모든 계산은 영국 CAA Safety Sense Leaflet 7 계열의 **rule of thumb 근사식**이며 POH 성능표를 대체하지 않습니다.

완전 무료 · 백엔드 없음 · 정적 파일만으로 동작 (Vite + React + TypeScript, TanStack Router 프리렌더).

## 기능

| 탭 | 상태 |
| --- | --- |
| 이착륙 성능 | ✅ 구현 (PA/DA/ISA 편차, 바람 성분, 이착륙 필요거리, GO/MARGINAL/NO-GO, DA 곡선 슬라이더, 검증 프리셋, 항공기 추가 폼) |
| E6B | 🚧 Coming soon |
| 플래닝 | 🚧 Coming soon |
| 비행 물리 | 🚧 Coming soon |

- 단위 토글: hPa/inHg · ft/m · kt/km/h · °C/°F (브라우저에 저장)
- 사용자 항공기: localStorage(`efb.customAircraft`)에 저장. STOL기는 여기에 추가.

## 명령어

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:8080)
npm run test     # Vitest 단위 테스트 (계산 로직 + 검증 시나리오 1~3, ±5ft)
npm run build    # 정적 빌드 → dist/client/
npm run preview  # 빌드 결과 미리보기
```

## 구조

```
src/
  lib/
    performance.ts        # 계산 로직 (순수 함수) — PA, ISA, DA, 바람, 이착륙거리, 판정
    performance.test.ts   # 단위 테스트
    units.ts              # 단위 변환 (순수 함수)
    tabs.ts               # 상단 탭 목록 (배열 하나로 관리)
    aircraft-store.ts     # 내장 + 사용자 항공기 (localStorage)
    units-context.tsx     # 단위 설정 컨텍스트
  data/aircraft.json      # 내장 항공기 데이터 (Cessna 172S 근사값)
  components/efb/         # UI 컴포넌트
  routes/                 # 탭별 페이지 (/, /e6b, /planning, /physics)
```

### 탭 추가 방법

1. `src/lib/tabs.ts` 배열에 항목 추가 (`path`, `label`, `short`)
2. `src/routes/<path>.tsx` 파일 생성 (`createFileRoute("/<path>")`)

## 계산식 (근사식)

1. 기압고도 `PA = 표고 + (1013.25 − QNH_hPa) × 27`
2. `ISA온도 = 15 − 1.98 × (PA / 1000)`
3. 밀도고도 `DA = PA + 118.8 × (OAT − ISA온도)`
4. 정풍 `= 풍속 × cos(풍향 − 활주로방향)`, 측풍 `= 풍속 × sin(같은 각)`
5. 이륙거리 = 기준거리 × [DA 1000ft당 ×1.10 (복리)] × [(실제중량/기준중량)²] × [마른 잔디 1.20 / 젖은 잔디 1.30] × [오르막 2%당 1.10] × [정풍 Vr의 10%당 0.90 (정풍은 절반만 반영) / 배풍 10%당 1.20] × **1.33**
6. 착륙거리 = 기준거리 × [DA 1000ft당 ×1.05] × [(실제중량/기준중량)²] × [마른 잔디 1.15 / 젖은 잔디 1.35] × [내리막 2%당 1.10] × [배풍 10%당 1.20] × **1.43**

판정: 50ft 통과 거리 기준, 여유(가용−필요)/가용 ≥ 15% → **GO**, 0~15% → **MARGINAL**, 음수 → **NO-GO**.

### 검증 시나리오 (테스트 포함)

| # | 조건 | 기대값 |
| --- | --- | --- |
| 1 | 표고 0, QNH 1013.25, 15°C | DA = 0 ft |
| 2 | 표고 5000, QNH 1013.25, 30°C | ISA 5.1°C, DA ≈ 7958 ft |
| 3 | 표고 1000, QNH 1003 | PA ≈ 1277 ft |

---

## 배포: Oracle Cloud + nginx

빌드 결과물은 순수 정적 파일입니다. **`dist/client/` 폴더만** 서버에 올리면 됩니다 (`dist/server/`는 필요 없음).

### 1. 빌드 (로컬 또는 서버)

```bash
npm ci
npm run build
# → dist/client/ 에 index.html, e6b/index.html, planning/index.html, physics/index.html, assets/ 생성
```

### 2. 서버에 업로드

```bash
# 로컬에서 (Oracle Cloud 인스턴스 IP / 키 경로는 본인 것으로)
rsync -avz --delete -e "ssh -i ~/.ssh/oci_key" dist/client/ ubuntu@<SERVER_IP>:/var/www/efb/
```

서버에서 디렉터리를 먼저 만들어 두세요:

```bash
sudo mkdir -p /var/www/efb && sudo chown -R $USER:$USER /var/www/efb
```

### 3. nginx 설정

`/etc/nginx/sites-available/efb`:

```nginx
server {
    listen 80;
    server_name efb.example.com;   # 또는 서버 IP

    root /var/www/efb;
    index index.html;

    # 프리렌더된 HTML: /e6b → /e6b/index.html, 없으면 SPA 폴백
    location / {
        try_files $uri $uri/ $uri/index.html /index.html;
    }

    # 해시가 붙은 정적 자산은 길게 캐시
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/efb /etc/nginx/sites-enabled/efb
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Oracle Cloud 방화벽 열기 (두 곳 모두)

1. **OCI 콘솔** → VCN → Security List(또는 NSG) → Ingress Rule 추가: `0.0.0.0/0`, TCP, 포트 80 (HTTPS 쓰면 443도)
2. **인스턴스 OS 방화벽** (Ubuntu 기준):
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo netfilter-persistent save
   ```
   (Oracle Linux는 `sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload`)

### 5. (선택) 무료 HTTPS — Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d efb.example.com
```

### 재배포

코드를 수정한 뒤 `npm run build` → 2번 `rsync` 만 다시 실행하면 됩니다.

## 라이선스 / 데이터 출처

- 계산식: UK CAA Safety Sense Leaflet 7 "Aeroplane Performance" 계열 rule of thumb (근사식)
- Cessna 172S 기준거리: 공개 자료 기반 근사값 — **POH 대조 필요**
