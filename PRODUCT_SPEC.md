# 📁 화슐랭 상세 기획서 v2.0

> 최종 업데이트: 2026-05-07  
> 단계: **Advanced MVP** — 핵심 기능 구현 완료, 스토어 출시 준비 중  
> 문서 용도: PM / Developer / QA / AI (Claude, Codex) 공통 참조

---

## 1. Product Context

### 서비스 정의

| 항목 | 내용 |
|------|------|
| 앱 이름 | 화슐랭 (화장실 + 미슐랭) |
| 슬로건 | 어디서나 깨끗한 화장실을 빠르게 |
| 플랫폼 | iOS / Android (Expo React Native) |
| 번들 ID | `com.hwachelin.app` |
| 현재 버전 | 1.0.0 (buildNumber 1) |

### 문제 정의

- 외출 중 화장실이 급할 때 **근처 화장실 위치를 모른다**
- 지도 앱에 화장실이 나와도 **청결도를 알 수 없다**
- **공공 vs 매장, 비밀번호 유무, 운영시간** 등 실용 정보가 없다
- 네이버/카카오 지도의 화장실 검색은 **정확도가 낮다**

### 핵심 가치

1. **신뢰할 수 있는 청결 리뷰** — GPS 50m 인증 기반 검증 리뷰
2. **빠른 위치 탐색** — 카카오맵 + 실시간 클러스터링
3. **실용 정보 통합** — 운영시간, 접근 방식, 비데 여부, 성별 구분

### 타겟 사용자

- 20~40대 외출이 잦은 현대인
- 위생에 민감한 사용자 (영유아 동반 부모 포함)
- 여행자 / 낯선 지역 방문객

### 현재 단계

- **Advanced MVP**: 핵심 기능 전부 구현 완료
- 서울 공공화장실 276개 + 사용자 제보 데이터 포함
- EAS 빌드 설정 완료, App Store 제출 직전 단계
- 앱 아이콘 / 스플래시 브랜드 이미지 적용 완료
- 온보딩 첫 실행 시에만 표시 (AsyncStorage `ONBOARDING_DONE_KEY`) 완료
- 내 제보 내역 화면 (MyReportsScreen) 완료
- 미완: App Store 스크린샷, EAS 프로덕션 빌드, 스토어 제출

---

## 2. PRD (Realistic)

### 문제

공공장소에서 깨끗한 화장실을 빠르게 찾기 어렵다.  
지도 앱에는 청결 정보가 없고, 공공/매장 구분, 비밀번호 유무, 운영시간 등 실용 정보도 부재하다.

### 솔루션

| 해결 방식 | 구현 |
|-----------|------|
| 지도 기반 탐색 | 카카오맵 WebView + PostGIS 반경 쿼리 |
| GPS 인증 리뷰 | 50m 이내 방문 시 `is_verified = true` |
| 청결 체크리스트 | 청결도/휴지/비누/비데/안전 (boolean) |
| 황금칸 | 지역 최고 화장실 베이즈 랭킹 |
| 사용자 제보 | 신규 등록 + 정보 수정 (어드민 승인) |

### 구현된 핵심 기능 (v1.0)

1. 카카오맵 기반 지도 탐색 + 마커 + 클러스터링
2. 화장실 검색 (카카오 로컬 API + DB 병합, 인텐트 감지)
3. 화장실 상세 정보 (운영시간, 접근 방식, 성별 구분)
4. 리뷰 작성/수정/삭제 (별점 + 체크리스트 + 사진 + 텍스트)
5. GPS 50m 방문 인증 (`is_verified`)
6. 제보 시스템 (신규 등록 + 정보 수정 + 어드민 승인)
7. 황금칸 탭 (베이즈 가중 점수 랭킹)
8. 카카오 로그인 (PKCE + expo-web-browser)
9. 북마크, 마이페이지, 내 리뷰/북마크 목록
10. 회원 탈퇴 (Edge Function), 개인정보처리방침 (GitHub Pages)

### Out of Scope (v1.0)

| 기능 | 이유 |
|------|------|
| 황금칸 푸시 알림 | Expo Push Notifications 미연동 |
| 인기 검색어 서버 집계 | mock frequency로 대체 중 |
| 비밀번호 필터 AI 강화 | 정규식 필터만 있음 |
| 오프라인 캐시 | 복잡도 대비 효과 낮음 |

---

## 3. User Flow

### 메인 플로우: 지도 탐색

```
앱 실행
  └─ 온보딩 4슬라이드 (최초 실행 시에만 — AsyncStorage 플래그)
      └─ 지도 메인 (index.tsx)
          ├─ 위치 권한 허용 → GPS 현재 위치 → 지도 이동
          │   └─ 위치 조회 8초 초과 → 시청역 fallback (3km 반경)
          ├─ 주변 화장실 마커 로드 (PostGIS RPC)
          ├─ 마커 탭 → ToiletBottomSheet
          │   └─ "상세보기" → ToiletDetailScreen
          │       ├─ 북마크 토글
          │       ├─ 길찾기 (카카오맵 딥링크)
          │       ├─ 리뷰 목록 (체크리스트 칩)
          │       └─ "리뷰 작성" → ReviewWriteScreen
          │           ├─ GPS 50m 인증 → is_verified = true
          │           └─ 별점 + 체크리스트 + 사진 + 텍스트
          └─ 클러스터 탭 → ClusterBottomSheet (목록)
              └─ 항목 탭 → 단일 마커 + ToiletBottomSheet
```

### 검색 플로우

```
검색창 탭
  └─ 최근 검색어 + 인기 검색어 표시
      └─ 텍스트 입력 (300ms debounce)
          └─ Kakao Local API + DB 병합 자동완성
              ├─ 지역명 / 지하철역 선택 (categoryGroupCode: '' | 'SW8')
              │   └─ 지도 중심 이동만 (바텀시트 없음)
              └─ 가게 / 건물 선택 (그 외 코드)
                  ├─ DB findToiletNear(50m) → 있음
                  │   └─ 지도 이동 + ToiletBottomSheet
                  └─ DB findToiletNear(50m) → 없음
                      └─ NoToiletSheet
                          ├─ "근처 화장실 보기" → 시트 닫힘
                          └─ "화장실 등록하기" → ReportScreen (장소 자동 입력)
```

### 황금칸 플로우

```
황금칸 탭 탭
  ├─ 지도 탭 방문 후 → 현재 visibleBounds 기준
  └─ 지도 탭 방문 전 → 현재 위치 fallback
      └─ 베이즈 가중 점수 랭킹 표시
          └─ 항목 탭 → ToiletDetailScreen
```

### 제보 플로우

```
ReportScreen
  ├─ 카카오 장소 검색 → 위치/이름 자동 입력
  └─ 직접 핀 꽂기
      └─ 접근방식 / 층 / 성별 / 운영시간 입력
          └─ 제출 → status: pending
              └─ AdminScreen (어드민)
                  ├─ 승인 → approved → toilets 테이블 등록
                  └─ 반려 → rejected + 이유 저장
```

---

## 4. Feature Spec

### 4.1 지도 (KakaoMapView)

#### ✅ 구현된 것

- 카카오맵 JavaScript SDK → WebView HTML 문자열로 래핑
- `idle` 이벤트마다 `center`, `radiusKm`, `bounds` → postMessage → RN
- viewport 반경에 15% 여유 추가 후 PostGIS RPC 호출
- 로직 분리: `mapViewport.ts` (bounds 계산), `mapToiletFilters.ts` (필터/운영상태)
- 위치 확정 후에만 지도 렌더링 (초기화 경쟁 방지)
- 최근 위치 우선 → 8초 초과 시 시청역 fallback
- 뷰포트 bounds가 마지막 fetch bounds(`lastFetchedBoundsRef`)를 이탈하면 즉시 "이 지역에서 재탐색" 버튼 표시
- 기존 마커 유지하며 새 조회 완료 후 교체 (빈 화면 방지)
- `visibleBounds` 밖 화장실 → 마커/카운트/황금칸 컨텍스트에서 제외
- 마커: `kakao.maps.Marker` + `kakao.maps.MarkerImage` (변기마커핀.png RGBA, BFS 배경 제거)
- 비활성 마커(평점 없음/휴무) → `MARKER_IMAGE_SRC_INACTIVE` 그레이스케일 이미지 (opacity 미사용)
- 평점 배지는 별도 `CustomOverlay` (yAnchor: 3.3, pointer-events: none)
- 클러스터 탭 → 줌인 대신 `ClusterBottomSheet` (목록)
- Apple Maps fallback (iOS 카카오맵 API 실패 시)

#### ⚠️ 제한 / 이슈

- WebView 기반 → 네이티브 지도 대비 렌더링 속도 열세
- 카카오 JS SDK 도메인 미등록 시 화이트스크린 (Kakao Developers 설정 확인)
- 클러스터 알고리즘은 카카오 기본 — 커스터마이징 불가
- `idle` 이벤트 연속 발화 시 bounds 계산 큐 밀림 가능
- `GoldScreen` 지도 탭 방문 전 직접 진입 → bounds fallback 사용

#### 🚀 개선 방향

- `idle` 이벤트에 WebView 내부 debounce 50~100ms 추가
- 카카오맵 로딩 중 skeleton / spinner 표시
- GoldScreen fallback도 지도 탭과 동일한 viewport 정책 통일
- 핀 밀도 기반 자동 줌 레벨 가이드

---

### 4.2 검색 (SearchBar + useSearch + searchService)

#### ✅ 구현된 것

- 300ms debounce + `AbortController` 중복 요청 방지
- Kakao Local keyword API + 로컬 DB 결과 병합 자동완성
- 자동완성 랭킹: 화장실 데이터 보유 > 평점 > 리뷰 수 > 거리
- 빈 입력 → 최근 검색어 10개 + 인기 검색어 표시
- 최근 검색어: 개별 삭제 + 전체 삭제
- 자동완성 드롭다운: absolute overlay (필터 칩 위치 밀지 않음)
- 스크롤 시 키보드 자동 닫힘
- 검색 입력 중 지도 필터 적용 안 함 (자동완성 빈 결과 방지)
- **인텐트 감지** (`isAreaSearch`, `AREA_SEARCH_CODES`):
  - `categoryGroupCode: ''` (지역명·행정구역) → 지도 이동만
  - `'SW8'` (지하철역) → 지도 이동만
  - `'AD5'` (행정구역 시/구/동) → 지도 이동만
  - 그 외 (카페·음식점·편의점 등) → 바텀시트 or NoToiletSheet
- 가게 선택 시 `findToiletNear(lat, lng, radius)` → 없으면 NoToiletSheet
  - 대형 시설 (백화점/쇼핑/공항/대학/대형마트) → radius 150m, 일반 → 50m

#### ⚠️ 제한 / 이슈

- 인기 검색어는 mock frequency (서버 집계 미구현)
- Kakao Local API 분당 쿼리 제한 존재 (고트래픽 시 주의)
- 검색 후 지도 이동 시 "재탐색" 버튼이 표시될 수 있음 (UX 어색)
- AD5 코드는 API 응답에 따라 빈 문자열로 오는 경우도 있어 이중 처리 중

#### 🚀 개선 방향

- 인기 검색어 → Supabase Edge Function + 집계 테이블
- 검색으로 지도 이동한 경우 재탐색 버튼 자동 숨김
- 자동완성 결과에 화장실 있는 장소 🚽 배지 강조

---

### 4.3 화장실 상세 (ToiletDetailScreen)

#### ✅ 구현된 것

- `avg_rating` 실시간 계산 (reviews 배열 기준, 캐시 컬럼 아님)
- `operating_hours` 파싱 + 영업중/마감 배지 표시
- 접근 방식: 누구나 / 손님만 / 비밀번호
- 성별 구분: 남녀분리 / 공용 / 남자 / 여자
- 기저귀 교환대 여부
- 리뷰 목록 + 체크리스트 칩 (청결도/휴지/비누/비데/안전)
- GPS 인증 리뷰 마크 (📍 인증됨)
- 사진 풀스크린 뷰어 (탭 시 전체화면 모달)
- 북마크 토글 (즉시 UI 반영)
- 길찾기: 카카오맵 앱 딥링크 → iOS/Android 기본지도 → 웹 fallback
- 내 리뷰 수정/삭제 (본인만)

#### ⚠️ 제한 / 이슈

- 사진 최대 업로드 수 UI 미표시
- 비밀번호 있는 화장실의 비밀번호 자체는 정책상 미표시

#### 🚀 개선 방향

- 사진 업로드 제한 수 UI 명시 ("최대 5장")
- 비밀번호 힌트 기능 ("카운터에 문의" 등 텍스트 안내)
- 리뷰 정렬 토글: 최신순 / 높은 평점순 / GPS 인증만
- 청결 트렌드 미니차트 (최근 10개 리뷰 추이)

---

### 4.4 리뷰 (ReviewWriteScreen)

#### ✅ 구현된 것

- 별점: 0.5 ~ 5.0 (반별 선택)
- 체크리스트:
  - `cleanliness_level`: 'clean' | 'normal' | 'dirty' (3단계 enum, 기존 boolean `cleanliness` 파생)
  - `paper` (휴지)
  - `soap` (비누)
  - `hand_dryer` (핸드드라이어)
  - `hand_tissue` (핸드타올)
  - `has_password` (비밀번호 화장실 여부 — 번호 자체는 저장/노출 금지)
- 텍스트 코멘트 (선택)
- 사진 업로드 (Supabase Storage `reviews/` 버킷)
- GPS 50m 인증 (방문 중 자동 체크)
- 리뷰 수정: 기존 값 `initialValue`로 채워서 진입
- 비밀번호 포함 텍스트 필터 (정규식)

#### ⚠️ 제한 / 이슈

- GPS 인증 실패 시 비인증으로 저장되나 사용자에게 명확한 안내 부족
- 사진 업로드 실패 시 리뷰 전체가 실패할 수 있음 (부분 성공 미지원)

#### 🚀 개선 방향

- GPS 인증 불가 시 토스트 메시지 명확화 ("이 리뷰는 비인증 리뷰로 저장됩니다")
- 사진 업로드 실패를 리뷰 본문과 분리 처리 (사진만 재시도)
- 동일 화장실 중복 리뷰 → 수정 화면으로 자동 유도

---

### 4.5 황금칸 (GoldScreen)

#### ✅ 구현된 것

- 현재 지도 `visibleBounds` 기준 화장실 랭킹
- 베이즈 가중 점수: `(reviewCount × avgRating + globalAvg × minReviews) / (reviewCount + minReviews)`
- 최신성 휴리스틱 보너스: avgRating ≥ 4.5 & count ≥ 3 → +0.2 / avgRating ≥ 4.0 & count ≥ 10 → +0.1 (cap 5.0)
- 리뷰 0개 화장실 자동 하위 랭킹
- 운영중 화장실 우선 정렬 옵션
- 지도 탭 방문 전 → 현재 위치 fallback

#### ⚠️ 제한 / 이슈

- 리뷰 수 부족 시 점수 편향 가능
- 지도 이동 후 황금칸 탭 전환 시 bounds 동기화 지연

#### 🚀 개선 방향

- 카테고리 필터 (공공 / 매장)
- GoldScreen도 지도 탭과 동일한 viewport 정책 통일
- 즐겨찾기 지역 저장 기능

---

### 4.6 제보 (ReportScreen + AdminScreen)

#### ✅ 구현된 것

- 신규 등록 / 정보 수정 두 타입
- 카카오 장소 검색 → 위치/이름 자동 입력
- 직접 핀 꽂기 (지도 탭 기반)
- 접근방식 / 층 / 성별 / 운영시간 입력
- `pending → reviewing → approved / rejected` 상태 관리
- 어드민 승인/반려 + 반려 이유 작성 (AdminScreen)
- is_admin 유저만 AdminScreen 접근 가능

#### ⚠️ 제한 / 이슈

- 수동 어드민 승인 구조 → 초기 운영 부담
- 중복 제보 감지 미구현

#### 🚀 개선 방향

- 신뢰 점수 높은 유저 (리뷰 10개+, GPS 인증 70%+) 제보 자동 승인
- 동일 장소 중복 제보 경고
- 제보 상태 변경 시 푸시 알림

---

## 5. API & DB

### 테이블 구조

| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `places` | 장소 원본 (카카오/공공) | `lat`, `lng`, `location`(PostGIS), `kakao_place_id` |
| `toilets` | 화장실 정보 + 캐시 통계 | `place_id`, `type`, `access_type`, `disabled_available`, `emergency_bell`, `avg_rating`, `review_count`, `bidet_count`, `male_stalls`, `female_stalls` |
| `reviews` | 사용자 리뷰 | `toilet_id`, `user_id`, `rating`, `cleanliness_level`, `cleanliness`, `paper`, `soap`, `hand_dryer`, `hand_tissue`, `has_password`, `bidet`, `is_verified`, `image_urls` |
| `reports` | 제보 (미승인 포함) | `toilet_id`, `report_type`, `status`, `rejection_reason` |
| `users` | 사용자 프로필 | `nickname`, `is_admin` |
| `bookmarks` | 북마크 | `UNIQUE(user_id, toilet_id)` |

### 관계도

```
auth.users ──── users (1:1)
             ├── reviews (1:N)
             ├── bookmarks (1:N)
             └── reports (1:N)

places ──── toilets (1:1)
               ├── reviews (1:N)
               ├── bookmarks (1:N)
               └── reports (1:N, correction type)
```

### 데이터 흐름

| 단계 | 쿼리 | 파일 |
|------|------|------|
| 지도 마커 조회 | `toilets_near(lat, lng, radius_m)` RPC → PostGIS | `toiletService.ts` |
| RPC 실패 시 | bounding box SELECT fallback | `toiletService.ts` |
| 화장실 상세 | `toilets + places JOIN` + `reviews` 별도 조회 | `toiletService.ts` |
| 검색 장소 화장실 확인 | `findToiletNear(lat, lng, 50m)` | `toiletService.ts` |
| 리뷰 통계 캐시 | `avg_rating` / `review_count` / `bidet_count` 트리거 자동 갱신 | DB 트리거 |

### 캐싱 전략

- 마커 표시용 `avg_rating` / `review_count` → **트리거 캐시** (reviews 변경 시 자동)
- 상세 화면 `avg_rating` → **실시간 계산** (reviews 목록 기준, 캐시 아님)
- 이유: 상세 화면은 어차피 reviews를 전부 fetch해야 하므로 별도 재계산이 효율적

### 누락 / 개선 필요 필드

| 테이블 | 필드 | 용도 |
|--------|------|------|
| `users` | `push_token TEXT` | 황금칸 알림 |
| `users` | `profile_image_url TEXT` | 카카오 프로필 이미지 캐싱 |
| `toilets` | `reported_count INT` | 허위 제보 감지 |

### RPC 함수

```sql
-- toilets_near: PostGIS 반경 조회
SELECT t.*, t.avg_rating, t.review_count, t.bidet_count,
       p.name, p.address, p.lat, p.lng
FROM toilets t JOIN places p ON t.place_id = p.id
WHERE ST_DWithin(p.location::geography, ST_MakePoint(lng, lat)::geography, radius_m)
ORDER BY p.location <-> ST_MakePoint(lng, lat)::geography
LIMIT limit_n;
```

### RLS 요약

| 테이블 | 정책 | 조건 |
|--------|------|------|
| reviews | select (공개) | — |
| reviews | insert / update / delete | `auth.uid() = user_id` |
| reports | select / insert | `auth.uid() = user_id` |
| reports | update (admin) | `users.is_admin = true` |
| places / toilets | insert (admin) | `users.is_admin = true` |
| bookmarks | all | `auth.uid() = user_id` |
| users | select / insert / update | `auth.uid() = id` |

### Edge Functions

| 함수 | 용도 | 비고 |
|------|------|------|
| `delete-account` | 회원 탈퇴 (순서: bookmarks → reviews → reports → users → auth.users) | verify_jwt: true |
| `sync-public-toilets` | data.go.kr 공공화장실 싱크 | pg_cron 매주 일요일 18:00 UTC / API 실패 시 CSV fallback |

---

## 6. Prompt Hub

> 아래 프롬프트는 현재 아키텍처 기준으로 Claude / Codex에 바로 붙여넣기 가능합니다.

---

### 6.1 카카오맵 WebView idle 이벤트 debounce

```
You are working on a React Native app called 화슐랭.
The map is rendered via KakaoMapView.tsx which wraps the Kakao Maps JavaScript SDK in a WebView.

Current behavior:
- The WebView fires an 'idle' event on every map move
- Each idle event sends { type: 'idle', center: {lat, lng}, bounds: {...}, radiusKm: number } via postMessage to React Native
- React Native shows a "재탐색" button when center moves > 400m

Problem:
Rapid consecutive map gestures spam postMessage calls unnecessarily.

Task:
Add a 50ms debounce to the idle event handler inside the WebView HTML string in KakaoMapView.tsx.

Constraints:
- HTML is a JavaScript template string — use vanilla JS setTimeout/clearTimeout only
- Do NOT change the postMessage schema
- Do NOT add any npm packages
- Keep the existing idle handler logic intact, just wrap it with debounce
```

---

### 6.2 온보딩 첫 실행 시에만 표시

```
You are working on 화슐랭 (Expo React Native + TypeScript).

Problem:
App.tsx currently always routes to Onboarding screen on every app launch.

Task:
1. In App.tsx:
   - Before rendering the Navigator, check AsyncStorage.getItem('hasSeenOnboarding')
   - If 'true' → set initialRouteName = 'MainTabs'
   - If null/undefined → set initialRouteName = 'Onboarding'
   - Show a brief ActivityIndicator while the async check runs

2. In OnboardingScreen.tsx:
   - On the last slide's "시작하기" button:
     await AsyncStorage.setItem('hasSeenOnboarding', 'true')
     navigation.replace('MainTabs')

Package: @react-native-async-storage/async-storage (already installed)
Do not change any other navigation logic.
```

---

### 6.3 NoToiletSheet 반경 동적 조정

```
You are working on 화슐랭.

Current behavior in app/(tabs)/index.tsx → selectPlaceResult():
  const toilet = await findToiletNear(place.lat, place.lng, 50);

Problem:
Large venues (백화점, 공항, 대형마트, 대학교) have toilets registered further than 50m from the place centroid.

Task:
Before calling findToiletNear(), determine the search radius based on the place category:
- If place.category includes any of: '백화점', '쇼핑', '공항', '대학', '대형마트' → radius = 150
- Otherwise → radius = 50

Update only the radius argument. All other logic stays the same.
```

---

### 6.4 isAreaSearch 카테고리 코드 확장

```
You are working on 화슐랭.

File: lib/searchService.ts

Current isAreaSearch function:
export function isAreaSearch(categoryGroupCode: string | undefined): boolean {
  if (!categoryGroupCode) return true;       // 빈 코드 = 지역명·행정구역
  if (categoryGroupCode === 'SW8') return true; // 지하철역
  return false;
}

Task:
1. Add 'AD5' (행정구역) to the area search codes
2. Update the JSDoc comment to list ALL treated-as-area codes with their meaning:
   - '' = 지역명·행정구역 검색
   - 'SW8' = 지하철역
   - 'AD5' = 행정구역 (시/구/동 등)
3. Export a constant AREA_SEARCH_CODES: readonly string[] listing the non-empty codes

Do not change any other part of the file.
```

---

### 6.5 운영시간 파서 고도화

```
You are working on 화슐랭.

File: lib/operatingHours.ts

Current behavior:
- Parses simple strings: "09:00~22:00", "24시간", "주말 휴무"
- Returns isOpen(operatingHours: string): boolean

Task:
Extend the parser to handle these new patterns:
1. "월~금 09:00~18:00" — weekday hours only
2. "월~토 10:00~21:00, 일 휴무" — with specific day off
3. "09:00~18:00 (점심 12:00~13:00 제외)" — with lunch break excluded
4. "공휴일 휴무" — holiday closed flag (treat as open on non-holidays)

New function to add:
  getDaySchedule(operatingHours: string, now: Date): { open: string; close: string } | null
  - Returns null if pattern is unknown (treat as always open, backward compatible)
  - Returns { open: "09:00", close: "22:00" } for known patterns

Keep isOpen() backward compatible — unknown patterns return true (always open assumption).
```

---

### 6.6 Supabase toilets_near RPC 최적화

```
You are a Supabase/PostgreSQL expert.

Current RPC for 화슐랭:
CREATE OR REPLACE FUNCTION toilets_near(center_lat float, center_lng float, radius_m float)
RETURNS TABLE (...) AS $$
  SELECT t.*, p.name, p.address, p.lat, p.lng
  FROM toilets t JOIN places p ON t.place_id = p.id
  WHERE ST_DWithin(p.location::geography, ST_MakePoint(center_lng, center_lat)::geography, radius_m)
  ORDER BY p.location <-> ST_MakePoint(center_lng, center_lat)::geography
  LIMIT 500;
$$ LANGUAGE sql STABLE;

Tasks:
1. Add limit_n parameter with DEFAULT 500
2. Ensure SELECT includes: t.avg_rating, t.review_count, t.bidet_count, t.is_24hours, t.has_diaper_table, t.operating_hours, t.type, t.access_type, t.floor, t.gender_type
3. Add a comment showing the required GIST index: CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST(location);
4. Return the complete updated CREATE OR REPLACE FUNCTION statement
```

---

### 6.7 황금칸 최신 리뷰 가중치

```
You are working on 화슐랭's GoldScreen (app/(tabs)/gold.tsx).

Current ranking formula (in the scoring function):
  score = (reviewCount × avgRating + globalAvg × minReviews) / (reviewCount + minReviews)

Problem:
Old reviews drag down scores for places that recently improved.
ToiletMarkerData does NOT include per-review timestamps.

Task:
Add a recency heuristic bonus without DB changes:
- If avg_rating >= 4.5 AND review_count >= 3 → add 0.2 bonus
- If avg_rating >= 4.0 AND review_count >= 10 → add 0.1 bonus
- Otherwise → no bonus

Apply this AFTER the base Bayesian score, capped at 5.0.
Only change the scoring function, not the rendering or data fetching.
```

---

### 6.8 검색 후 재탐색 버튼 자동 숨김

```
You are working on 화슐랭.

File: app/(tabs)/index.tsx

Current behavior:
- When map moves 400m+ from lastFetchedCenter → showRefetchButton = true
- User must manually tap "이 지역에서 재탐색"

Problem:
When user picks a search result, the map pans to that location but immediately shows the refetch button — confusing UX because the refetch already happened during selectPlaceResult().

Task:
In selectPlaceResult(), after calling fetchToilets() for the new location:
  setLastFetchedCenter({ lat: place.lat, lng: place.lng });
  setShowRefetchButton(false);

This ensures the refetch button is hidden right after a search-triggered map move.
Do not change any other refetch button logic.
```

---

## 7. Tasks (Kanban)

### ✅ DONE

| 기능 | 파일/위치 |
|------|-----------|
| 카카오맵 + 클러스터링 + 마커 핀 | KakaoMapView.tsx, CustomMarker.tsx |
| 지도 재탐색 UX (400m 임계값) | app/(tabs)/index.tsx |
| viewport bounds 기반 조회/카운트 | mapViewport.ts, mapToiletFilters.ts |
| PostGIS toilets_near RPC + GIST 인덱스 | toiletService.ts |
| bounding box fallback | toiletService.ts |
| 검색 자동완성 (debounce + abort) | useSearch.ts, searchService.ts |
| 검색 인텐트 감지 (지역 vs 가게) | searchService.ts → isAreaSearch() |
| NoToiletSheet (화장실 미등록 안내 + CTA) | NoToiletSheet.tsx |
| 황금칸 베이즈 랭킹 | gold.tsx |
| 화장실 상세 + 리뷰 목록 | ToiletDetailScreen.tsx |
| 리뷰 카드 체크리스트 칩 | ToiletDetailScreen.tsx |
| 리뷰 작성 / 수정 / 삭제 | ReviewWriteScreen.tsx, reviewService.ts |
| GPS 50m 인증 (is_verified) | ReviewWriteScreen.tsx |
| 사진 업로드 (Supabase Storage) | ReviewWriteScreen.tsx |
| 사진 풀스크린 뷰어 | ToiletDetailScreen.tsx |
| 카카오 로그인 (PKCE) | authService.ts |
| 마이페이지 | mypage.tsx |
| 내 리뷰 / 북마크 목록 | MyReviewsScreen.tsx, MyBookmarksScreen.tsx |
| 북마크 | bookmarkService.ts |
| 화장실 제보 (신규/수정) | ReportScreen.tsx, reportService.ts |
| 어드민 승인/반려 | AdminScreen.tsx |
| 회원탈퇴 Edge Function | supabase/functions/delete-account/ |
| 온보딩 4슬라이드 + 첫 실행 시에만 표시 (AsyncStorage) | OnboardingScreen.tsx, App.tsx |
| 앱 아이콘 + 스플래시 브랜드 이미지 교체 | assets/ |
| isAreaSearch AD5 코드 추가 + AREA_SEARCH_CODES 상수 | searchService.ts |
| NoToiletSheet 반경 동적 조정 (대형시설 150m / 일반 50m) | app/(tabs)/index.tsx |
| 황금칸 최신성 휴리스틱 보너스 (avgRating × reviewCount 기반) | goldContext.ts |
| 카카오맵 마커 CustomOverlay → kakao.maps.Marker + MarkerImage 전환 (RGBA PNG, 그레이스케일 비활성 이미지) | KakaoMapView.tsx |
| 마커 opacity 완전 제거 — 비활성 상태 이미지(MARKER_IMAGE_SRC_INACTIVE)로 분기 | KakaoMapView.tsx |
| "이 지역에서 재탐색" 트리거 — 거리 기반(400m) → 뷰포트 bounds 이탈 기준 | app/(tabs)/index.tsx |
| 공공화장실 276개 + 주 1회 자동 싱크 | supabase/functions/sync-public-toilets/ |
| avg_rating / review_count 트리거 캐시 | DB 트리거 |
| 영업중/마감 배지 | operatingHours.ts |
| 길찾기 딥링크 (카카오맵 → 기본 지도 → 웹) | ToiletDetailScreen.tsx |
| ToiletIcon 컴포넌트 통일 | ToiletIcon.tsx |
| ScreenHeader safe area 대응 | ScreenHeader.tsx |
| EAS 빌드 설정 (production, autoIncrement) | eas.json |
| iOS Privacy Manifest | app.json |
| 개인정보처리방침 / 이용약관 | docs/, PolicyScreen.tsx |
| MyReportsScreen | 내 제보 내역 목록 — 상태 뱃지(pending/reviewing/approved/rejected), 마이페이지 통계 카드 연결 |
| HwachelinStars 컴포넌트 | 꽃(✿) 마크 평점 UI — 부분 채움 클리핑, size/color/gap 파라미터화 |
| MarkerPinIcon 컴포넌트 | 지도 마커핀과 동일한 View 형태 (온보딩/UI 설명용) |
| goldContext.ts | 황금칸↔지도 탭 간 bounds/toilets/filter snapshot 공유 (이벤트 리스너 패턴) |
| reviews 체크리스트 필드 확장 | cleanliness_level TEXT enum + hand_dryer / hand_tissue / has_password 컬럼 추가 |
| toilets 테이블 신규 컬럼 | disabled_available, emergency_bell, male_stalls, male_urinals, female_stalls, disabled_* 추가 |

---

### 🔥 TODO (우선순위 순)

| 우선순위 | 기능 | 파일 | 예상 소요 |
|---------|------|------|-----------|
| **P0** | App Store Connect 앱 등록 + 스크린샷 제작 | 외부 작업 | 2~3시간 |
| **P0** | EAS 프로덕션 빌드 + TestFlight 배포 | eas.json | 1시간 |
| **P0** | App Store 심사 제출 | 외부 작업 | 30분 |
| **P1** | 검색 후 재탐색 버튼 자동 숨김 | index.tsx | 15분 |
| **P1** | GPS 인증 실패 안내 토스트 명확화 | ReviewWriteScreen.tsx | 30분 |
| **P2** | 인기 검색어 서버 집계 Edge Function | 신규 | 2~3시간 |
| **P2** | 운영시간 파서 고도화 (요일별/공휴일) | operatingHours.ts | 2~3시간 |
| **P3** | 황금칸 알림 (Expo Push Notifications) | 신규 | 3~4시간 |
| **P3** | 비밀번호 텍스트 필터 강화 | reviewService.ts | 1~2시간 |
| **P3** | GoldScreen bounds 동기화 개선 | goldContext.ts, gold.tsx | 1~2시간 |

---

### 💡 NEXT PRIORITY (중장기)

| 기능 | 이유 |
|------|------|
| GoldScreen bounds 동기화 개선 | 지도 탭과 황금칸 bounds 불일치 |
| 제보 자동 승인 (신뢰 점수 기반) | 어드민 운영 부담 감소 |
| 중복 제보 감지 | 데이터 품질 관리 |
| 리뷰 정렬 UX (최신/평점/GPS 인증만) | 상세 페이지 UX |
| 청결 트렌드 차트 | 리뷰 히스토리 기반 |
| 민간 개방 화장실 파트너십 (스타벅스 등) | 고품질 데이터 확보 |

---

## 8. QA & Test Cases

### 8.1 지도 / 마커 / 클러스터

| # | 시나리오 | 기대 결과 | 엣지케이스 |
|---|---------|-----------|-----------|
| M01 | 앱 실행 → 위치 권한 허용 | GPS 기반 지도 이동, 마커 로드 | 권한 거부 → 시청역 fallback |
| M02 | 위치 조회 8초 이상 지연 | 시청역 기본 좌표 자동 전환 | — |
| M03 | 지도 이동 → 뷰포트가 마지막 fetch bounds 이탈 | "이 지역에서 재탐색" 버튼 표시 | bounds 내 이동 → 버튼 미표시 |
| M04 | 재탐색 버튼 탭 | 새 범위 API 호출, 기존 마커 유지 후 교체 | API 실패 → 기존 마커 유지 + 오류 토스트 |
| M05 | 단일 마커 탭 | ToiletBottomSheet 표시 | — |
| M06 | 클러스터 탭 | ClusterBottomSheet 목록 표시 | 클러스터 1개 → 단일 바텀시트 동작 |
| M07 | 줌인 → 클러스터 해제 | 개별 마커 분리 표시 | — |
| M08 | toilets_near RPC 실패 | bounding box fallback 자동 실행 | bounding box도 실패 → 빈 화면 |
| M09 | 영업 마감 화장실 마커 | 회색 inactive 스타일 | — |
| M10 | 리뷰 없는 화장실 마커 | 평점 배지 없음, 회색 스타일 | — |
| M11 | GoldScreen 직접 진입 (지도 탭 방문 전) | 현재 위치 fallback 조회 | GPS 없음 → 시청역 |

---

### 8.2 검색

| # | 시나리오 | 기대 결과 | 엣지케이스 |
|---|---------|-----------|-----------|
| S01 | 검색창 탭 | 최근 검색어 + 인기 검색어 표시 | 최근 검색 없음 → 인기만 |
| S02 | 텍스트 입력 | 300ms 후 자동완성 표시 | 빠른 연속 입력 → 마지막 결과만 |
| S03 | "강남구" 선택 | 지도 이동만 (바텀시트 없음) | — |
| S04 | "이대역" 선택 (SW8) | 지도 이동만 | — |
| S05 | 가게 선택 → DB에 화장실 있음 | 지도 이동 + ToiletBottomSheet | — |
| S06 | 가게 선택 → DB에 화장실 없음 | NoToiletSheet 표시 | — |
| S07 | NoToiletSheet "근처 화장실 보기" | 시트 닫힘, 지도 유지 | — |
| S08 | NoToiletSheet "화장실 등록하기" | ReportScreen 이동, 장소 정보 자동 입력 | — |
| S09 | 검색 후 뒤로가기 | 검색 취소, 지도 복귀 | — |
| S10 | 네트워크 오류 | 로컬 DB 결과만 표시, 오류 안내 | — |
| S11 | 특수문자 / XSS 시도 | Kakao API 정상 처리 또는 빈 결과 | — |

---

### 8.3 화장실 상세

| # | 시나리오 | 기대 결과 | 엣지케이스 |
|---|---------|-----------|-----------|
| D01 | 상세 진입 | 이름/주소/운영상태/평점/리뷰 표시 | 리뷰 0개 → "첫 리뷰 작성하기" |
| D02 | 영업중 배지 | 현재 시각 기준 operating_hours 파싱 | 24시간 → 항상 영업중 |
| D03 | 북마크 토글 | 즉시 UI 반영 + DB 저장 | 미로그인 → 로그인 유도 |
| D04 | 길찾기 탭 | 카카오맵 앱 실행 | 앱 없음 → 기본 지도 → 웹 |
| D05 | 사진 탭 | 풀스크린 뷰어 모달 | 사진 로드 실패 → 에러 이미지 |
| D06 | 내 리뷰 수정 | ReviewWriteScreen (기존 값 채워짐) | — |
| D07 | 내 리뷰 삭제 | 확인 다이얼로그 → 삭제 → 목록 갱신 | 삭제 API 실패 → 오류 토스트 |
| D08 | avg_rating 표시 | reviews 배열 기준 실시간 계산 | 리뷰 0개 → "-" 또는 "평점 없음" |

---

### 8.4 리뷰 작성

| # | 시나리오 | 기대 결과 | 엣지케이스 |
|---|---------|-----------|-----------|
| R01 | GPS 50m 이내 작성 | is_verified = true, 인증 마크 표시 | GPS 정확도 낮음 → 인증 실패 가능 |
| R02 | GPS 50m 초과 작성 | is_verified = false, 비인증으로 저장 | 사용자 안내 필요 (TODO: 토스트 명확화) |
| R03 | 별점 없이 제출 | 오류 토스트 (별점 필수) | — |
| R04 | 비밀번호 포함 코멘트 | 필터에 의해 거부 | 우회 시도 → 정규식 추가 검증 필요 |
| R05 | cleanliness_level 선택 후 저장 | DB에 'clean'/'normal'/'dirty' 저장 + cleanliness 파생 컬럼 동기 | — |
| R06 | hand_dryer / hand_tissue / has_password 체크 | 각 필드 저장 확인 | — |
| R07 | 사진 업로드 성공 | Storage 저장 + image_urls 기록 | — |
| R08 | 사진 업로드 실패 | 현재: 전체 실패 / 개선: 본문만 저장 | — |
| R09 | 동일 화장실 중복 리뷰 | 수정 화면으로 유도 | — |
| R10 | 미로그인 상태에서 리뷰 작성 탭 | 로그인 화면 이동 | — |

---

### 8.5 황금칸

| # | 시나리오 | 기대 결과 | 엣지케이스 |
|---|---------|-----------|-----------|
| G01 | 황금칸 탭 (지도 방문 후) | 현재 visibleBounds 기준 랭킹 | — |
| G02 | 황금칸 탭 (지도 방문 전) | 현재 위치 기준 fallback | GPS 없음 → 시청역 |
| G03 | 리뷰 0개 화장실 | 최하위 랭킹 | — |
| G04 | 운영 마감 화장실 | 랭킹 포함, 마감 배지 표시 | — |
| G05 | 리스트 항목 탭 | ToiletDetailScreen 이동 | — |

---

### 8.6 제보

| # | 시나리오 | 기대 결과 | 엣지케이스 |
|---|---------|-----------|-----------|
| P01 | 신규 제보 제출 | status: pending으로 저장 | 동일 장소 중복 제보 → 현재 중복 허용 |
| P02 | 어드민 승인 | approved → toilets 등록 | — |
| P03 | 어드민 반려 | rejected + rejection_reason 저장 | — |
| P04 | 일반 유저 AdminScreen 접근 | 접근 거부 (is_admin 체크) | — |
| P05 | 제보 상태 확인 | 마이페이지 "내 제보" 목록 | — |

---

## 9. Future Improvements

### Short-term (1~2주) — 빠른 UX 개선

| 작업 | 상세 | 예상 소요 |
|------|------|-----------|
| App Store 출시 | Connect 등록 → EAS 프로덕션 빌드 → 스크린샷 → 심사 | 4~6시간 |
| 검색 후 재탐색 버튼 자동 숨김 | `setLastFetchedCenter` 업데이트 | 15분 |
| GPS 인증 실패 토스트 명확화 | "비인증 리뷰로 저장됩니다" 안내 | 30분 |
| 사진 업로드 부분 성공 처리 | 사진 실패 시 본문만 저장 | 1시간 |

---

### Mid-term (1~2개월) — 데이터/기능 확장

| 작업 | 상세 |
|------|------|
| App Store / Play Store 출시 | TestFlight → 심사 → 출시 |
| 인기 검색어 서버 집계 | Supabase Edge Function + search_logs 테이블 |
| 운영시간 파서 고도화 | 요일별/점심시간/공휴일 패턴 |
| 황금칸 알림 | Expo Push Notifications + users.push_token |
| 리뷰 정렬 UX | 최신순 / 높은 평점순 / GPS 인증만 |
| 제보 자동 승인 | 신뢰 유저 (리뷰 10+, GPS 인증 70%+) |
| 중복 제보 감지 | 동일 kakao_place_id 확인 |

---

### Long-term (3개월+) — 서비스 성숙

| 작업 | 상세 |
|------|------|
| 민간 개방 화장실 파트너십 | 스타벅스/백화점 공식 데이터 |
| 에디터 추천 배지 | 초기 데이터 부족 시 신뢰 보정 |
| 청결 트렌드 차트 | 월별 리뷰 추이 차트 |
| 사용자 등급 시스템 | 리뷰 수/인증 비율 기반 |
| 서울 외 지역 확장 | 공공데이터 지역 추가 |
| B2B 제휴 | 화장실 청결 관리 업체 연결 |

---

### ❌ 당분간 만들지 말아야 할 것

| 기능 | 이유 |
|------|------|
| 오프라인 캐시 | 지도 데이터 특성상 복잡도 대비 효과 낮음 |
| 실시간 화장실 대기 현황 | 하드웨어 필요 |
| SNS 공유 | 화장실 공유 UX가 어색하고 사용자 반응 불확실 |
| 다국어 지원 | 국내 초기 시장 집중 우선 |
| 웹 버전 | 앱 최적화 우선, 웹은 리소스 분산 위험 |
| 황금 칸 구독 모델 | 사용자 기반 충분히 확보 후 검토 |

---

## Appendix: 개발 환경

### 실행 방법

```bash
cd ~/IdeaProjects/hwachelin
npx expo start --localhost --clear --port 8081

# iOS 시뮬레이터 위치 고정 (서울시청)
xcrun simctl location booted set 37.5665,126.9780

# 개발 클라이언트로 열기
xcrun simctl openurl booted 'com.hwachelin.app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
```

### 환경 변수 (`.env.local`)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://jdcymglzmcnewgsimatc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_KAKAO_APP_KEY=...        # 카카오맵 JavaScript 키
EXPO_PUBLIC_KAKAO_REST_API_KEY=...   # Kakao Local keyword search
EXPO_PUBLIC_ENABLE_DEMO_TOILETS=false
```

### 카카오맵이 안 뜰 때

1. Kakao Developers → Web 플랫폼 도메인 등록 확인
2. 카카오맵 API 사용 설정 ON 확인
3. `EXPO_PUBLIC_KAKAO_APP_KEY`가 JavaScript 키인지 확인 (REST 키 아님)

### EAS 프로덕션 빌드

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

### 어드민 계정 설정

```sql
UPDATE users SET is_admin = true WHERE id = '<user_uuid>';
```

### 공공데이터 수동 싱크

```bash
curl -X POST https://jdcymglzmcnewgsimatc.supabase.co/functions/v1/sync-public-toilets \
  -H "Content-Type: application/json" \
  -d '{"region":"서울특별시"}'
```
