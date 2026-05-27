# 화슐랭 프로젝트 인수인계 문서

> 최종 업데이트: 2026-05-07 (3차)  
> 프로젝트 위치: `~/IdeaProjects/hwachelin`  
> Supabase 프로젝트: `jdcymglzmcnewgsimatc`  
> EAS 프로젝트: `69783862-edb0-41fb-aa5b-9cdc11bb498a`

---

## 1. 프로젝트 개요

**앱 이름:** 화슐랭 (화장실 + 미슐랭)  
**목적:** 위치 기반 깨끗한 화장실 찾기 + 사용자 리뷰/평점 앱  
**플랫폼:** iOS / Android (React Native + Expo)  
**기획서:** Notion `화슐랭 상세 기획서` — https://www.notion.so/3527e16a6a3581ed8adbfb7cfa9cf63b  
**번들 ID:** `com.hwachelin.app`  
**버전:** 1.0.0 (buildNumber: 1, versionCode: 1)

---

## 2. 기술 스택

| 역할 | 기술 |
|------|------|
| 앱 프레임워크 | Expo 54 + React Native 0.81 + TypeScript |
| 내비게이션 | React Navigation Bottom Tabs + Native Stack |
| 지도 | 카카오맵 JavaScript SDK WebView, Apple Maps fallback |
| 위치 | `expo-location` |
| DB/백엔드 | Supabase PostgreSQL + PostGIS |
| 로그인 | 카카오 OAuth 2.0 (PKCE) + `expo-web-browser` |
| 스토리지 | Supabase Storage (`reviews/` 버킷) |
| 빌드/배포 | EAS Build (프로덕션 프로파일 설정 완료) |
| 공공데이터 | data.go.kr API + CSV fallback |

---

## 3. 실행 방법

```bash
cd ~/IdeaProjects/hwachelin

# Metro 개발 서버
npx expo start --localhost --clear --port 8081

# iOS 시뮬레이터 위치 고정 (서울시청)
xcrun simctl location booted set 37.5665,126.9780

# 이미 빌드된 개발 클라이언트로 다시 열기
xcrun simctl openurl booted 'com.hwachelin.app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
```

Pod install이 필요하면:

```bash
cd ios
LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 pod install
cd ..
```

EAS 프로덕션 빌드:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## 4. 환경 변수

`.env.local`에 아래 값이 있음.

```bash
EXPO_PUBLIC_SUPABASE_URL=https://jdcymglzmcnewgsimatc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_KAKAO_APP_KEY=...        # 카카오맵 JavaScript 키
EXPO_PUBLIC_KAKAO_REST_API_KEY=...   # Kakao Local keyword search REST API 키
```

카카오 설정:
- Kakao Developers 앱: `화슐랭`
- Web 플랫폼 도메인: `http://localhost:8081`, `http://127.0.0.1:8081`
- Redirect URI: `https://jdcymglzmcnewgsimatc.supabase.co/auth/v1/callback`
- 동의항목: `profile_nickname`, `profile_image`
- 비즈앱 미등록 → `account_email` scope 제외

---

## 5. 프로젝트 구조

```text
hwachelin/
├── App.tsx                          # React Navigation 루트 + 온보딩 첫 실행 감지
├── app.json                         # Expo 설정 (iOS Privacy Manifest 포함)
├── eas.json                         # EAS Build 프로파일 (development/preview/production)
├── app/
│   ├── OnboardingScreen.tsx         # 4슬라이드 온보딩 (AsyncStorage ONBOARDING_DONE_KEY로 첫 실행 시에만 표시)
│   ├── AdminScreen.tsx              # 제보 승인/반려 어드민 (is_admin 유저 전용)
│   ├── PolicyScreen.tsx             # 개인정보처리방침 / 이용약관 WebView
│   ├── ReviewWriteScreen.tsx        # 리뷰 작성/수정
│   ├── ToiletDetailScreen.tsx       # 화장실 상세
│   ├── ReportScreen.tsx             # 화장실 제보
│   ├── MyReviewsScreen.tsx          # 내가 평가한 화장실 전체 목록
│   ├── MyBookmarksScreen.tsx        # 저장한 장소 목록
│   ├── MyReportsScreen.tsx          # 내 제보 내역 목록 (status 확인 가능)
│   └── (tabs)/
│       ├── index.tsx                # 지도 탭 (메인)
│       ├── gold.tsx                 # 황금칸 탭
│       └── mypage.tsx               # 마이페이지 탭
├── components/
│   ├── KakaoMapView.tsx             # 카카오맵 WebView 래퍼
│   ├── SearchBar.tsx                # 네이버맵형 장소 검색 자동완성 UI
│   ├── CustomMarker.tsx             # react-native-maps fallback용 커스텀 화장실 핀
│   ├── ClusterBottomSheet.tsx       # 클러스터 마커 탭 시 화장실 목록 바텀시트
│   ├── ToiletBottomSheet.tsx        # 마커 탭 바텀시트
│   ├── ScreenHeader.tsx             # 공통 백버튼 헤더 (useSafeAreaInsets 대응)
│   ├── ToiletIcon.tsx               # View 기반 변기 아이콘 (마커/바텀시트/클러스터 통일)
│   ├── MarkerPinIcon.tsx            # 지도 마커핀과 동일한 모양의 View 컴포넌트 (온보딩/UI용)
│   ├── HwachelinStars.tsx           # 꽃(✿) 마크 평점 UI — 부분 채움 지원 (0.5단위)
│   └── NoToiletSheet.tsx            # 검색 장소 화장실 미등록 시 안내 + 제보 유도 바텀시트
├── constants/
│   └── theme.ts                     # 공통 색상/radius 상수
├── lib/
│   ├── supabase.ts                  # Supabase 클라이언트 (PKCE flowType)
│   ├── toiletService.ts             # 화장실 조회 (toilets_near RPC + fallback)
│   ├── reviewService.ts             # 리뷰 CRUD
│   ├── reportService.ts             # 제보 insert
│   ├── bookmarkService.ts           # 북마크 CRUD
│   ├── authService.ts               # 카카오 로그인/로그아웃
│   ├── searchService.ts             # Kakao Local keyword search API + isAreaSearch() 인텐트 감지
│   ├── operatingHours.ts            # 운영시간 파싱 / 영업 상태 계산
│   ├── mapViewport.ts               # 지도 bounds/radius/viewport 유틸
│   ├── mapToiletFilters.ts          # 지도 필터/운영상태/데모 데이터 유틸
│   ├── goldContext.ts               # 황금칸 컨텍스트 snapshot (지도↔황금칸 탭 bounds 공유)
│   ├── demoToilets.ts               # 개발용 데모 화장실 데이터
│   ├── cityhallDemoToilets.ts       # 시청역 데모 화장실 데이터 (CITYHALL_DEMO_TOILETS)
│   └── accountService.ts            # 회원 탈퇴 (Edge Function 호출)
├── hooks/
│   └── useSearch.ts                 # 검색 debounce/abort/recent/trending/filter/ranking
├── types/
│   ├── navigation.ts                # RootStackParamList
│   └── toilet.ts                    # ToiletMarkerData 등
├── docs/                            # GitHub Pages (개인정보처리방침/이용약관)
│   ├── index.html
│   ├── privacy-policy/index.html
│   └── terms-of-service/index.html
└── supabase/
    └── functions/
        ├── delete-account/          # 회원 탈퇴 Edge Function
        └── sync-public-toilets/     # 공공데이터 싱크 Edge Function
```

---

## 6. Supabase DB 스키마

### places

```sql
id              UUID  PK
name            TEXT
address         TEXT
lat             FLOAT
lng             FLOAT
location        GEOMETRY(Point, 4326)  -- PostGIS (lat/lng 트리거로 자동 동기화)
source          TEXT  'public' | 'user'
kakao_place_id  TEXT  UNIQUE
created_at      TIMESTAMP
```

### toilets

```sql
id                    UUID  PK
place_id              UUID  FK → places
type                  TEXT  '공공' | '매장'
access_type           TEXT  '누구나' | '손님만' | '비밀번호'
floor                 INT
gender_type           TEXT  '남녀분리' | '공용' | '남자' | '여자'
is_24hours            BOOL  DEFAULT false
has_diaper_table      BOOL  DEFAULT false
disabled_available    BOOL  DEFAULT false  -- 장애인 화장실 여부
emergency_bell        BOOL  DEFAULT false  -- 비상벨 설치 여부
operating_hours       TEXT  (예: "09:00~22:00")
avg_rating            FLOAT DEFAULT 0     -- 트리거로 자동 업데이트
review_count          INT   DEFAULT 0     -- 트리거로 자동 업데이트
bidet_count           INT   DEFAULT 0     -- 트리거로 자동 업데이트
male_stalls           INT   NULL
male_urinals          INT   NULL
female_stalls         INT   NULL
disabled_male_stalls  INT   NULL
disabled_male_urinals INT   NULL
disabled_female_stalls INT  NULL
registered_by         UUID  FK → auth.users (nullable)
created_at            TIMESTAMP
```

### reviews

```sql
id                UUID  PK
toilet_id         UUID  FK → toilets
user_id           UUID  FK → auth.users
rating            FLOAT
cleanliness_level TEXT  'clean' | 'normal' | 'dirty' | NULL  -- 청결 수준 enum
cleanliness       BOOL  -- cleanliness_level === 'clean' 파생 (하위호환)
paper             BOOL
soap              BOOL
hand_dryer        BOOL  NULL
hand_tissue       BOOL  NULL
has_password      BOOL  NULL  -- 비밀번호 화장실 여부 (텍스트 노출 금지)
bidet             BOOL  DEFAULT false
security          BOOL  NULL  (비상벨/안전 — UI에서 현재 미사용)
comment           TEXT
image_urls        TEXT[]
is_verified       BOOL  (GPS 50m 이내)
created_at        TIMESTAMP
```

### reports

```sql
id              UUID  PK
user_id         UUID  FK → auth.users
toilet_id       UUID  FK → toilets (수정 제보 시)
report_type     TEXT  'new_toilet' | 'correction'
place_name      TEXT
address         TEXT
lat, lng        FLOAT
access_type     TEXT
floor           TEXT
gender_type     TEXT
has_password    BOOL
operating_hours TEXT
comment         TEXT
status          TEXT  'pending' | 'reviewing' | 'approved' | 'rejected'
rejection_reason TEXT
created_at      TIMESTAMP
```

### users

```sql
id          UUID  PK (= auth.users.id)
nickname    TEXT
is_admin    BOOL  DEFAULT false
created_at  TIMESTAMP
```

### bookmarks

```sql
id          UUID  PK
user_id     UUID  FK → auth.users
toilet_id   UUID  FK → toilets
created_at  TIMESTAMP
UNIQUE(user_id, toilet_id)
```

---

## 7. RPC / DB 함수

### `toilets_near(lat, lng, radius_m, limit_n)`

PostGIS 기반 반경 조회. `getToiletsInRegion()`에서 우선 호출하고 실패 시 bounding box fallback.

```sql
SELECT t.*, p.name, p.address, p.lat, p.lng
FROM toilets t JOIN places p ON t.place_id = p.id
WHERE ST_DWithin(p.location::geography, ST_MakePoint(lng, lat)::geography, radius_m)
ORDER BY p.location <-> ST_MakePoint(lng, lat)::geography
LIMIT limit_n;
```

### `update_toilet_review_stats()` 트리거

`reviews` INSERT/UPDATE/DELETE 시 `toilets.avg_rating`, `review_count`, `bidet_count` 자동 업데이트.

---

## 8. Edge Functions

### `delete-account` (verify_jwt: true)

회원 탈퇴. 서비스 롤로 아래 순서로 삭제:
1. `bookmarks` → 2. `reviews` (Storage 파일 포함) → 3. `reports` → 4. `users` → 5. `auth.users`

호출: `POST {SUPABASE_URL}/functions/v1/delete-account`  
Authorization: `Bearer {access_token}`

### `sync-public-toilets` (verify_jwt: false)

data.go.kr 공공화장실 데이터 Supabase 동기화.
- API 키는 body `{ "region": "서울특별시", "apiKey": "..." }` 또는 환경변수로 전달
- API 실패 시 CSV 자동 fallback (EUC-KR 디코딩)
- pg_cron 스케줄: 매주 일요일 18:00 UTC (월요일 03:00 KST)

수동 트리거:
```bash
curl -X POST https://jdcymglzmcnewgsimatc.supabase.co/functions/v1/sync-public-toilets \
  -H "Content-Type: application/json" \
  -d '{"region":"서울특별시"}'
```

---

## 9. RLS 정책 요약

| 테이블 | 정책 | 조건 |
|--------|------|------|
| reviews | select | 공개 |
| reviews | insert | `auth.uid() = user_id` |
| reviews | update/delete | `auth.uid() = user_id` |
| reports | select | `auth.uid() = user_id` |
| reports | insert | `auth.uid() = user_id` |
| reports | update (admin) | `users.is_admin = true` |
| places | insert (admin) | `users.is_admin = true` |
| toilets | insert (admin) | `users.is_admin = true` |
| bookmarks | all | `auth.uid() = user_id` |
| users | select/insert/update | `auth.uid() = id` |

---

## 10. GitHub Pages (정책 문서)

URL: https://khs983770-star.github.io/hwachelin/

- `/` — 서비스 홈
- `/privacy-policy/` — 개인정보처리방침
- `/terms-of-service/` — 이용약관

시행일: 2026년 5월 1일  
앱 내 Policy 화면(`PolicyScreen.tsx`)이 해당 URL을 WebView로 표시.

---

## 11. 앱 네비게이션 구조

```
Stack.Navigator (initialRouteName: AsyncStorage ONBOARDING_DONE_KEY 확인 후 결정)
├── Onboarding          ← 최초 실행 시에만 (ONBOARDING_DONE_KEY 없을 때)
├── MainTabs (Bottom Tabs)
│   ├── 지도 (index)
│   ├── 황금칸 (gold)
│   └── 마이페이지 (mypage)
├── ToiletDetail
├── ReviewWrite
├── Report
├── MyReviews
├── MyBookmarks
├── MyReports           ← 내 제보 내역 (마이페이지에서 진입)
├── Admin               ← is_admin 유저만 접근
└── Policy              ← { type: 'privacy' | 'terms' }
```

---

## 12. 현재 구현 상태

### ✅ 완료

| 기능 | 비고 |
|------|------|
| 카카오맵 + 클러스터링 | 줌별 클러스터, 커스텀 화장실 핀, 평점 배지, 클러스터 탭 목록 바텀시트 |
| 지도 재탐색 UX | 지도 이동마다 API 호출하지 않고, 400m 이상 이동 시 `이 지역에서 재탐색` 버튼 표시 |
| 화면 범위 기반 조회/카운트 | KakaoMap bounds/radius를 RN으로 전달해 현재 화면 안의 화장실만 마커/카운트/황금칸 컨텍스트에 반영 |
| 화장실 조회 | PostGIS `ST_DWithin` RPC, viewport 기반 동적 반경, 실패 시 bounding box fallback |
| 데모 데이터 제어 | `EXPO_PUBLIC_ENABLE_DEMO_TOILETS=true`일 때만 데모 화장실 노출, 기본은 숨김 |
| 검색 + 필터 | Kakao Local API + 로컬 DB 병합 자동완성, 최근 검색 10개 저장/개별 삭제/전체 삭제, 인기 검색 mock frequency, 자동완성 랭킹 |
| 황금칸 탭 | 현재 지도/검색/필터 bounds 컨텍스트 기반 베이즈 가중 점수 랭킹 |
| 화장실 상세 | avg_rating 캐시, 리뷰 목록, operating_hours, 영업 상태 |
| 리뷰 작성/수정/삭제 | GPS 인증, 비밀번호 필터 |
| 카카오 로그인 | PKCE, expo-web-browser |
| 마이페이지 | 리뷰/제보/북마크 통계, 서비스 정보 |
| 내 리뷰/북마크 전체 목록 | MyReviewsScreen, MyBookmarksScreen |
| 화장실 제보 | pending→reviewing→approved/rejected |
| 제보 승인 어드민 | AdminScreen (is_admin 유저 전용) |
| 북마크 | bookmarks 테이블, 상세 화면 토글 |
| 회원 탈퇴 | Edge Function + 마이페이지 UI |
| 온보딩 화면 | 4슬라이드, 현재는 앱 진입 때마다 표시 |
| 공공화장실 데이터 | 서울 276개 + 자동 싱크 (주 1회) |
| PostGIS 최적화 | `toilets_near()` RPC + GIST 인덱스 |
| avg_rating 캐시 | 트리거 자동 업데이트 |
| EAS 빌드 설정 | production 프로파일, autoIncrement |
| iOS Privacy Manifest | UserDefaults/FileTimestamp/SystemBootTime |
| 개인정보처리방침/이용약관 | GitHub Pages 호스팅 |
| 앱 내 Policy 화면 | PolicyScreen WebView |
| 영업중/마감 배지 | `operating_hours` 파싱, 지도 마커/바텀시트/상세/황금칸 표시 |
| 길찾기 연동 | 카카오맵 앱 딥링크, iOS/Android 지도 fallback, 카카오맵 웹 fallback |
| 사진 풀스크린 뷰어 | 리뷰 사진 탭 시 전체화면 모달 표시 |
| 장소 검색 흐름 | SearchBar/useSearch/searchService 분리, 지역/건물/가게 검색 결과 선택 → 지도 이동 → 주변 화장실 조회/리뷰 확인/신규 제보 |
| 검색 랭킹 | 화장실 데이터 보유 > 높은 평점 > 리뷰 수 > 가까운 거리 순으로 자동완성 정렬 |
| 검색 인텐트 감지 | `isAreaSearch(categoryGroupCode)` — 빈 코드(지역명·행정구역) 또는 SW8(지하철역)이면 지도만 이동, 그 외 가게/건물은 바텀시트 표시 |
| NoToiletSheet | 특정 장소 검색 후 DB에 화장실 없을 때 "근처 화장실 보기 / 화장실 등록하기" CTA 바텀시트 표시 |
| ToiletIcon 컴포넌트 | View 기반 변기 모양 아이콘 — 마커 핀, 클러스터 바텀시트, 단일 바텀시트 전체 통일 |
| 리뷰 카드 체크리스트 칩 | 상세 화면 리뷰 카드에 청결도/휴지/비누/비데/안전 체크 항목을 칩으로 표시 |
| ScreenHeader 안전 영역 대응 | `useSafeAreaInsets`로 paddingTop 분리 + row minHeight 독립 설정, 실기기 짜부 현상 수정 |
| 온보딩 첫 실행 시에만 표시 | `ONBOARDING_DONE_KEY` AsyncStorage 플래그 — App.tsx 초기화 시 확인, OnboardingScreen 마지막 슬라이드에서 저장 |
| 앱 아이콘 / 스플래시 교체 | 브랜드 이미지 적용 완료 (assets/icon.png, splash-icon.png, adaptive-icon.png, map-tab-icon.png) |
| isAreaSearch AD5 코드 추가 | `AREA_SEARCH_CODES: readonly string[]` 상수 export, AD5(행정구역) + SW8(지하철) 포함 |
| NoToiletSheet 반경 동적 조정 | 대형 시설(백화점/쇼핑/공항/대학/대형마트) 150m, 일반 50m |
| 황금칸 최신성 휴리스틱 보너스 | avgRating≥4.5 & count≥3 → +0.2 / avgRating≥4.0 & count≥10 → +0.1 (cap 5.0) |
| 카카오맵 마커 전환 | CustomOverlay → `kakao.maps.Marker` + `kakao.maps.MarkerImage` (RGBA PNG 변기마커핀.png) |
| 비활성 마커 이미지 분기 | `MARKER_IMAGE_SRC_INACTIVE` 그레이스케일 이미지 사용 (opacity 제거) |
| 재탐색 트리거 기준 전환 | 거리 기반(400m) → vp bounds 이탈 기준 (`lastFetchedBoundsRef`) |
| MyReportsScreen | 내 제보 내역 목록 — 상태(pending/reviewing/approved/rejected) 표시, 마이페이지 통계 카드 연결 |
| HwachelinStars 컴포넌트 | 꽃(✿) 마크 평점 — 부분 채움(clip) 지원, size/color/gap 파라미터화 |
| MarkerPinIcon 컴포넌트 | 지도 마커핀과 동일한 View 형태 — 온보딩/UI 설명용 |
| goldContext.ts | 황금칸 탭↔지도 탭 간 bounds/toilets/filter 공유 snapshot (이벤트 리스너 패턴) |
| reviews 체크리스트 필드 확장 | `cleanliness_level` TEXT enum + `hand_dryer`, `hand_tissue`, `has_password` 추가 |

### 지도 조회 / 마커 UX 상세 (2026-05-02 기준)

- `KakaoMapView.tsx`가 Kakao Maps WebView의 `idle` 이벤트마다 `center`, `radiusKm`, `bounds`를 React Native로 전달한다.
- `app/(tabs)/index.tsx`는 전달받은 viewport 반경에 15% 여유를 더해 조회 반경을 계산한다.
- viewport 계산 로직은 `lib/mapViewport.ts`, 필터/운영 상태 로직은 `lib/mapToiletFilters.ts`로 분리해 지도 화면 수정 시 읽어야 하는 코드량을 줄였다.
- 실기기 최초 진입 시 위치 조회가 끝나기 전 시청역 기본 좌표로 KakaoMap WebView가 먼저 초기화되지 않도록, 초기 위치 또는 fallback 위치가 확정된 뒤 지도를 렌더링한다.
- 위치 조회는 최근 위치를 먼저 사용하고, 현재 위치 조회가 8초 이상 걸리면 시청역 fallback으로 전환한다. fallback 조회 반경은 3km로 넉넉하게 잡는다.
- 고정 3km 자동 조회를 제거하고, 지도 이동 후 400m 이상 차이가 날 때만 `이 지역에서 재탐색` 버튼을 표시한다.
- 기존 결과는 새 조회가 완료될 때까지 유지해 지도 이동 중 빈 화면이 나오지 않게 했다.
- `visibleBounds` 밖의 화장실은 `mapToilets`, 카운트 배지, `goldContext`에서 제외한다.
- 클러스터 마커를 누르면 즉시 줌인만 하지 않고 `ClusterBottomSheet`로 해당 클러스터 안의 화장실 목록을 보여준다.
- 마커는 빨간 pin + 흰색 화장실 아이콘 + 평점 pill 배지를 사용한다. 리뷰/평점이 없거나 마감 상태인 경우 회색 inactive 스타일을 사용한다.
- Apple Maps fallback에서는 `Region`의 `latitudeDelta/longitudeDelta`로 bounds와 radius를 계산한다.

### 검색 기능 상세 (2026-05-02 기준)

- 입력마다 300ms debounce 후 Kakao Local keyword API 호출.
- 이전 요청은 `AbortController`로 취소해 뒤늦은 응답이 UI를 덮어쓰지 않게 처리.
- 검색 대상은 장소명/키워드/카테고리를 우선하고 주소는 보조 정보로 노출.
- 지도에 로드된 Supabase 화장실 데이터와 Kakao 결과를 병합해서 노출.
- 자동완성 드롭다운은 검색창 아래 absolute overlay로 표시되어 상단 필터 칩 위치를 밀지 않음.
- 자동완성 목록은 스크롤 가능하고, 스크롤 시 키보드를 닫는다.
- 빈 입력 상태에서는 최근 검색어와 인기 검색어를 표시.
- 검색 입력 중에는 지도 필터 칩을 자동완성 결과에 적용하지 않는다. 필터는 지도 결과에만 적용해 자동완성이 비는 문제를 방지한다.
- 로컬 DB 결과는 상세보기로 연결하고, Kakao 일반 장소는 화장실 제보 화면으로 연결.
- 검색 인텐트 자동 감지: Kakao `category_group_code`가 빈 문자열(지역명·행정구역)이거나 `SW8`(지하철역)이면 지도 중심만 이동하고 바텀시트를 열지 않는다. 그 외(카페, 음식점, 편의점 등)는 가게 단위 검색으로 판단해 바텀시트를 표시하거나 NoToiletSheet를 보여준다.
- 장소 선택 시 DB에서 50m 반경 이내 화장실을 찾아보고 없으면 `NoToiletSheet`로 "화장실 등록하기" CTA 제공.

### ❌ 미구현 (우선순위 순)

| 기능 | 비고 |
|------|------|
| App Store Connect 앱 등록 + 스크린샷 | 6.7인치/6.5인치 iOS, Android |
| EAS 프로덕션 빌드 + TestFlight 배포 | eas build --platform ios --profile production |
| App Store 심사 제출 | 외부 작업 |
| 검색 후 재탐색 버튼 자동 숨김 | selectPlaceResult() 후 setLastFetchedCenter 업데이트 필요 |
| GPS 인증 실패 안내 토스트 | "비인증 리뷰로 저장됩니다" 메시지 명확화 |
| 황금칸 알림 | Expo Push Notifications |
| 인기 검색어 서버 기반 집계 | 현재 mock frequency |
| 운영시간 파서 고도화 | 요일별/점심시간/공휴일 패턴 확장 |
| 비밀번호 리뷰 필터 강화 | AI 텍스트 검증 또는 정규식 고도화 |

---

## 13. 알려진 이슈 / 주의사항

### 카카오맵 WebView

카카오맵이 안 뜨면 확인:
1. Kakao Developers Web 플랫폼 도메인 등록 여부
2. 카카오맵 API 사용 설정 ON
3. 앱 키가 JavaScript 키인지 확인

지도 조회 관련 주의:
- 카운트 배지는 `visibleBounds` 기준이라 클러스터 안의 항목까지 포함한다. 보이는 핀 수보다 카운트가 큰 것은 정상이다.
- `GoldScreen`을 지도 탭 방문 전 바로 열면 fallback으로 현재 중심 기준 조회를 수행한다. 지도 탭을 거친 뒤에는 지도 bounds 컨텍스트가 우선이다.
- `getToiletsInRegion()` 기본값은 호환성 때문에 3km로 남아 있지만, 지도 탭에서는 viewport 기반 동적 반경을 명시해서 호출한다.

### EAS 빌드

- `eas.json`의 `submit.production.ios` 블록은 `ascAppId`/`appleTeamId` 없으면 검증 오류 → 현재 iOS submit 설정 제거됨 (Android만 있음)
- 프로덕션 빌드 전 `autoIncrement: true` 설정으로 buildNumber/versionCode 자동 증가

### 공공데이터 API 키

- `DATA_GO_KR_API_KEY`는 Edge Function secrets에 미등록 (PAT 필요)
- 현재 pg_cron은 body 없이 호출 → CSV fallback으로 자동 작동 (서울 데이터 약 276개, 원천/중복 제거에 따라 변동 가능)
- API 키 등록하려면: Supabase Dashboard → Edge Functions → Secrets

### 데모 화장실 데이터

- 기본값은 숨김이다.
- 필요할 때만 `.env.local`에 `EXPO_PUBLIC_ENABLE_DEMO_TOILETS=true`를 넣고 앱을 재시작한다.
- `demo-`, `demo_`, `시청역 데모`, `데모로` 패턴은 `lib/toiletService.ts`에서 필터링한다.

### 어드민 계정

- `users.is_admin = true` 인 유저만 AdminScreen 접근 가능
- Supabase Dashboard에서 직접 `UPDATE users SET is_admin = true WHERE id = '...'`로 설정

---

## 14. 다음 작업 추천

### 1순위: App Store 제출

1. App Store Connect 앱 등록 (번들 ID: `com.hwachelin.app`)
2. EAS 프로덕션 빌드 (`eas build --platform ios --profile production`)
3. 6.7인치/6.5인치 스크린샷 (TestFlight 설치 후 시뮬레이터에서 캡처)
4. 심사 제출

### 2순위: 검색 후 재탐색 버튼 자동 숨김

`app/(tabs)/index.tsx` `selectPlaceResult()` 내부, `fetchToilets()` 호출 직후에 아래를 추가:

```tsx
setLastFetchedCenter({ lat: place.lat, lng: place.lng });
setShowRefetchButton(false);
```

### 3순위: GPS 인증 실패 안내 토스트 명확화

`ReviewWriteScreen.tsx`에서 GPS 50m 초과 시 "이 리뷰는 비인증 리뷰로 저장됩니다" 토스트 추가.

### 4순위: 운영시간 파서 고도화

현재 `09:00~22:00`, `24시간`, `주말 휴무` 수준을 처리함. 공공데이터 원문 패턴이 쌓이면 요일별/점심시간/공휴일 문구까지 확장.

### 5순위: 지도 UX / 성능 고도화

- `GoldScreen` fallback 조회도 지도 탭과 동일한 viewport 정책으로 통일
- `idle` 이벤트에 WebView 내부 50~100ms debounce 추가 (연속 postMessage 최적화)
- 공공화장실 데이터가 많은 지역에서 클러스터 겹침 세부 보정

### 6순위: 검색 UX 고도화

최근/인기 검색어는 현재 로컬 저장 + mock frequency 기반. 운영 단계에서는 Supabase 집계 테이블 또는 Edge Function으로 인기 검색어를 서버 기준으로 계산.

### 7순위: 황금칸 알림

Expo Push Notifications 기반으로 관심 지역/현재 지도 조건에서 새 황금칸 후보가 생겼을 때 알림.
