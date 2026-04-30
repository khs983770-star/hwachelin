# 화슐랭 프로젝트 인수인계 문서

> 최종 업데이트: 2026-04-29  
> 현재 작업 도구: Codex + Xcode iOS Simulator  
> 프로젝트 위치: `~/IdeaProjects/hwachelin`

---

## 1. 프로젝트 개요

**앱 이름:** 화슐랭 (화장실 + 미슐랭)  
**목적:** 위치 기반 깨끗한 화장실 찾기 + 사용자 리뷰/평점 앱  
**플랫폼:** iOS / Android (React Native + Expo)  
**기획서:** Notion `화슐랭 기획안`, page ID `3517e16a-6a35-8045-811b-c8b3ff3d7ddf`  
**UI 참고 시안:** `file:///Users/hyunsookim/Downloads/hwachelin_v2.html`

---

## 2. 기술 스택

| 역할 | 기술 |
|------|------|
| 앱 프레임워크 | Expo 54 + React Native 0.81 + TypeScript |
| 내비게이션 | React Navigation Bottom Tabs + Native Stack |
| 지도 | 카카오맵 JavaScript SDK WebView 우선, Apple Maps fallback |
| 위치 | `expo-location` |
| DB/백엔드 | Supabase PostgreSQL |
| 로그인 | 카카오 OAuth 예정, 아직 미구현 |
| 장소 검색 | 카카오 Local API 예정, 아직 미구현 |

---

## 3. 실행 방법

```bash
cd ~/IdeaProjects/hwachelin

# Metro 개발 서버
npx expo start --localhost --clear --port 8081

# iOS Development Build
LANG=en_US.UTF-8 npx expo run:ios --device "iPhone 16 Pro"

# 이미 빌드된 개발 클라이언트로 다시 열기
xcrun simctl openurl booted 'com.hwachelin.app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
```

시뮬레이터 위치를 서울시청으로 고정:

```bash
xcrun simctl location booted set 37.5665,126.9780
```

Pod install이 필요하면 UTF-8 환경으로 실행:

```bash
cd ios
LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 pod install
cd ..
```

---

## 4. 환경 변수

`.env.local`에 아래 값이 있음. 실제 값은 로컬 파일을 기준으로 확인.

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_KAKAO_APP_KEY=...
```

카카오맵 설정 현재 상태:
- Kakao Developers 앱: `화슐랭`
- Web 플랫폼 도메인 등록 완료:
  - `http://localhost:8081`
  - `http://127.0.0.1:8081`
- 카카오맵 API 사용 설정 ON 완료
- SDK 요청 `200 OK` 확인 완료

---

## 5. 현재 프로젝트 구조

```text
hwachelin/
├── App.tsx
├── app/
│   ├── ReviewWriteScreen.tsx
│   ├── ToiletDetailScreen.tsx
│   └── (tabs)/
│       ├── gold.tsx
│       ├── index.tsx
│       └── mypage.tsx
├── components/
│   ├── KakaoMapView.tsx
│   └── ToiletBottomSheet.tsx
├── constants/
│   └── theme.ts
├── lib/
│   ├── cityhallDemoToilets.ts
│   ├── demoToilets.ts
│   ├── supabase.ts
│   └── toiletService.ts
├── scripts/
│   ├── generateCityHallDemoToilets.mjs
│   └── importPublicToilets.mjs
├── types/
│   ├── navigation.ts
│   └── toilet.ts
└── ios/
```

`app/_layout.tsx`와 `app/(tabs)/_layout.tsx`는 expo-router용 파일이지만 현재 앱 실행 경로에서는 미사용. 실제 네비게이션은 `App.tsx`의 React Navigation이 담당.

---

## 6. 현재 구현 상태

### 완료

- Expo + TypeScript 프로젝트 세팅
- iOS Development Build 및 iPhone 16 Pro 시뮬레이터 실행 확인
- New Architecture 활성화
- Supabase 클라이언트 연결
- DB 조회 서비스:
  - `getToiletsInRegion()`
  - `getToiletDetail()`
- Supabase 데이터가 비어 있을 때 개발용 시청역 데모 화장실 1000개 fallback
- 카카오맵 WebView 지도 표시
- 카카오맵 실패 시 Apple Maps fallback
- 지도 화면 UI v2 반영:
  - 브랜드 상단바
  - 검색창
  - 필터 칩
  - 평점형 지도 핀
  - 마커 클러스터링
  - 지도 줌 `+ / -` 버튼
  - 현재 위치 버튼
- 마커 선택 바텀시트
- 화장실 상세 화면
- 리뷰 작성 화면 UI
  - 별점 선택
  - 체크리스트
  - 사진 첨부 자리
  - 메모 입력
  - 제출 안내
- 황금칸 탭
  - 현재는 데모 화장실을 평점순으로 표시
- 마이페이지 기본 UI
- `npx tsc --noEmit` 통과 확인

### 아직 데모/임시 상태

- 실제 Supabase `places`, `toilets`, `reviews` 데이터는 아직 비어 있을 수 있음
- DB 조회 결과가 없으면 앱은 `lib/cityhallDemoToilets.ts`의 시청역 근처 로컬 데모 1000개를 표시함
- 리뷰 작성 화면은 저장 API 연결 전
- 황금칸은 실제 랭킹 데이터가 아니라 데모 데이터
- 검색창과 필터 칩은 UI만 있고 실제 필터링/검색 미연결
- 사진 첨부 버튼은 UI만 있음
- 공공데이터 import 스크립트는 준비됐지만 `DATA_GO_KR_API_KEY`가 아직 없음
- 시청역 근처 임시 데모 1000개 SQL 생성됨:
  - import: `tmp/cityhall-demo-import.sql`
  - cleanup: `tmp/cityhall-demo-cleanup.sql`

---

## 7. 주요 파일 설명

### `App.tsx`

React Navigation 루트.
- Bottom Tabs: `지도`, `황금칸`, `마이페이지`
- Stack Screens: `ToiletDetail`, `ReviewWrite`

### `app/(tabs)/index.tsx`

메인 지도 화면.
- 현재 위치 권한 요청
- 위치 기준 화장실 조회
- 카카오맵 WebView 표시
- 카카오맵 실패 시 Apple Maps fallback
- 검색/필터 UI
- 마커 선택 시 `ToiletBottomSheet` 표시

### `components/KakaoMapView.tsx`

카카오맵 JS SDK를 WebView로 로드.
- RN → WebView 메시지:
  - `SET_MARKERS`
  - `SET_CURRENT_LOCATION`
  - `MOVE_TO`
- WebView → RN 메시지:
  - `MAP_READY`
  - `MARKER_PRESS`
  - `MAP_PRESS`
  - `MAP_IDLE`
  - `ERROR`
- 핀 CSS는 이 파일 내부 HTML 문자열에서 관리.

### `components/ToiletBottomSheet.tsx`

지도 마커 선택 시 뜨는 바텀시트.
- 평점 카드
- 주소
- 타입/접근 방식 태그
- 길찾기 버튼 자리
- 상세보기 버튼

### `app/ToiletDetailScreen.tsx`

상세 화면.
- 기본 정보
- 평점/리뷰 요약
- 리뷰 작성 화면으로 이동

### `app/ReviewWriteScreen.tsx`

리뷰 작성 화면 UI.
- 아직 Supabase insert 미연결
- 제출 시 임시 Alert 후 뒤로 이동

### `app/(tabs)/gold.tsx`

황금칸 탭.
- 현재는 `DEMO_TOILETS`를 평점순으로 정렬해서 표시
- 카드 선택 시 상세 화면 이동

### `constants/theme.ts`

시안 기반 공통 색상과 radius 상수.

### `lib/demoToilets.ts`

개발용 데모 fallback 진입점.
- 현재는 `lib/cityhallDemoToilets.ts`의 1000개 데이터를 우선 사용
- 기존 3개 seed 데이터는 fallback의 fallback으로 남아 있음

### `lib/cityhallDemoToilets.ts`

시청역 근처 로컬 데모 화장실 1000개.
- `tmp/cityhall-demo-preview.json`에서 생성됨
- Supabase SQL 실행 전에도 앱에서 1000개 마커를 확인하기 위한 임시 데이터
- 나중에 실제 공공데이터/DB 데이터가 들어오면 제거 가능

### `lib/toiletService.ts`

Supabase 조회 로직.
- 실제 DB 데이터가 없으면 dev 환경에서 `DEMO_TOILETS` 반환
- 상세도 로컬 데모 id면 Supabase 조회 전에 fallback 반환
- 목록 조회 limit은 1000개로 설정되어 있음

### `scripts/importPublicToilets.mjs`

공공데이터포털 `전국공중화장실표준데이터`를 가져와 Supabase insert용 SQL을 생성하거나 service role key로 직접 upsert.

기본 실행은 SQL 생성:

```bash
npm run import:toilets -- --region=서울특별시 --limit=500
```

필요 환경 변수:

```bash
DATA_GO_KR_API_KEY=공공데이터포털_서비스키
```

생성 파일:
- `tmp/public-toilets-preview.json`
- `tmp/public-toilets-import.sql`

service role key가 있으면 직접 import 가능:

```bash
SUPABASE_SERVICE_ROLE_KEY=... npm run import:toilets -- --mode=supabase --region=서울특별시 --limit=500
```

자동 동기화:

```bash
npm run public-toilets:sync:mcp
```

- 현재 로컬 Mac에는 `launchd`로 매일 03:00 자동 실행 등록 완료
- LaunchAgent: `/Users/hyunsookim/Library/LaunchAgents/com.hwachelin.public-toilets-sync.plist`
- 실행 로그: `/tmp/hwachelin-public-toilets-sync.log`
- 오류 로그: `/tmp/hwachelin-public-toilets-sync.err.log`
- 이 로컬 자동화는 Claude Desktop의 Supabase MCP 설정을 읽어서 SQL을 실행함

GitHub Actions 운영 자동화:
- `.github/workflows/sync-public-toilets.yml`
- 매일 03:00 KST 실행
- GitHub repository secrets 필요:
  - `DATA_GO_KR_API_KEY`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- GitHub repository secrets 3개 등록 완료
- 수동 실행 검증 완료
  - Run: `https://github.com/khs983770-star/hwachelin/actions/runs/25145083255`
  - 결과: `Supabase import 완료: places 276개, toilets 276개, stale public toilets 정리 완료`

### `scripts/generateCityHallDemoToilets.mjs`

공공데이터 키 승인 대기 중 지도/성능 검증용으로 시청역 근처 임시 데이터 생성.

```bash
npm run demo:cityhall -- --count=1000
```

생성 파일:
- `tmp/cityhall-demo-import.sql`: Supabase SQL Editor에서 실행하면 `places` 1000개, `toilets` 1000개, 데모 리뷰 약 3000개 생성
- `tmp/cityhall-demo-cleanup.sql`: 나중에 데모 데이터를 삭제할 때 실행

데모 데이터는 `places.kakao_place_id like 'demo_cityhall:%'`로 식별 가능.

---

## 8. Supabase 현재 전제

테이블:

```sql
users
places
toilets
reviews
```

현재 앱이 기대하는 주요 컬럼:
- `places`: `id`, `name`, `address`, `lat`, `lng`, `source`, `kakao_place_id`
- `toilets`: `id`, `place_id`, `type`, `access_type`, `floor`, `gender_type`, `registered_by`
- `reviews`: `id`, `toilet_id`, `user_id`, `rating`, `cleanliness`, `paper`, `soap`, `security`, `comment`, `is_verified`

주의:
- RLS가 켜져 있어 anon insert는 막혀 있음
- 읽기는 가능해야 함
- 실제 데이터 import 전까지는 개발용 데모 마커만 보임

---

## 9. 알려진 이슈 / 주의사항

### 카카오맵 WebView

카카오맵이 안 뜨면 먼저 확인:
1. Kakao Developers Web 플랫폼 도메인
2. 카카오맵 API 사용 설정 ON
3. 앱 키가 JavaScript 키인지

현재는 설정 완료되어 시뮬레이터에서 카카오맵 렌더링 확인됨.

### 지도 오버레이 순서

WebView는 네이티브 레이어처럼 동작해서 JSX 순서에 따라 오버레이가 가려질 수 있음. 지도 위에 떠야 하는 UI는 `KakaoMapView` 뒤쪽 JSX에 배치해야 함.

### UI 기준

참고 시안의 방향:
- 오프화이트 배경
- 오렌지 포인트
- 얇은 테두리
- 검색/필터 상단바
- 평점형 지도 핀
- 카드보다는 가볍고 조밀한 정보 구조

### 시청역 로컬 데모 1000개

- 앱 fallback에 반영 완료
- 시뮬레이터에서 `화장실 1000개` 표시 확인 완료
- 카카오맵 WebView 내부 클러스터링 반영 완료
- 클러스터는 원형 숫자 배지로 표시됨
- 오른쪽 하단에 지도 줌 `+ / -` 버튼 추가 완료
- 클러스터를 탭하면 해당 위치 기준으로 한 단계 확대됨
- 검색/필터 결과에 맞춰 지도 마커와 카운트 배지가 즉시 동기화되도록 연결 완료
- `24시간`, `비데`, `기저귀` 필터는 현재 DB 컬럼이 없어 비활성 처리

---

## 10. 지금부터 해야 할 일

### 1순위: 검색/필터 실제 동작 연결 - 완료

시청역 로컬 데모 1000개 기준으로 탐색 UX 검증이 가능하도록 지도 화면에 실제 검색/필터를 연결했다.

완료 내용:
1. 검색창 실제 연결
   - 이름, 주소, 화장실 유형, 접근 유형, 층, 남녀구분을 대상으로 현재 목록을 필터링
   - 검색어 입력 시 카카오맵 마커 배열과 카운트 배지가 함께 갱신됨
2. 필터 칩 실제 연결
   - `전체`: 모든 결과
   - `개방형`: `access_type === '누구나'`
   - `남녀분리`: `gender_type === '남녀분리'`
   - `별점`: `avg_rating >= 4.3`
   - `24시간`, `비데`, `기저귀`: 현재 DB 컬럼 부족으로 비활성 처리
3. 카운트 배지 개선
   - 전체 상태: `데모 화장실 1000개`
   - 검색/필터 상태: `검색 결과 N개`
   - 결과 없음: `조건에 맞는 화장실 없음`
4. 클러스터링 밀도 미세조정
   - 검색/필터 후 마커 수가 줄었을 때 가까운 줌에서 너무 빨리 뭉치지 않도록 줌 레벨별 그리드 간격을 소폭 축소

검증:
- `npx tsc --noEmit` 통과
- iOS 시뮬레이터에서 기본 지도, 카운트 배지, 필터 칩 비활성 상태 표시 확인
- 스크린샷: `/tmp/hwachelin-search-filter-base.png`

### 2순위: 리뷰 저장 연결 - 구현 완료, 실제 저장은 로그인 필요

`ReviewWriteScreen.tsx`의 제출을 Supabase `reviews` insert로 연결했다.

완료 내용:
1. 리뷰 저장 서비스 추가
   - `lib/reviewService.ts`
   - Supabase Auth 사용자 확인 후 `reviews` insert
   - 로그인하지 않은 상태는 `NOT_LOGGED_IN`으로 처리
2. 별점/체크리스트/메모를 `reviews` 컬럼에 매핑
   - `rating`
   - `cleanliness`
   - `paper`
   - `soap`
   - `security`
   - `comment`
3. GPS 50m 이내면 `is_verified=true`
   - 리뷰 작성 화면 진입 시 상세 화면에서 `toiletLat`, `toiletLng` 전달
   - 현재 위치와 화장실 좌표를 Haversine 거리로 비교
4. 비밀번호/민감정보 텍스트 필터링
   - 숫자 4자리 이상 차단
   - `비번`, `비밀번호`, `번호는` 등 표현 감지
5. 저장 성공 후 상세 화면으로 복귀

검증:
- `npx tsc --noEmit` 통과
- 현재는 Kakao/Supabase 로그인 미구현 상태라 실제 `reviews` row 생성은 로그인 구현 후 최종 검증 필요
- 비밀번호 의심 텍스트 차단 로직은 코드 연결 완료

### 3순위: 시청역 데모 1000개를 Supabase에 넣고 지도 검증 - 완료

공공데이터포털 요청은 접수 대기 중. 로컬 fallback이 아닌 DB 기반 조회도 확인하려면 시청역 근처 임시 데모 데이터 1000개를 Supabase에 넣어 검증한다.

사용한 파일:
- `tmp/cityhall-demo-import.sql`
- `tmp/cityhall-demo-cleanup.sql`
- `tmp/cityhall-demo-preview.json`
- `/tmp/places-batch-1.sql` ~ `/tmp/places-batch-10.sql`
- `/tmp/toilets-batch-1.sql` ~ `/tmp/toilets-batch-10.sql`

완료 내용:
1. Supabase MCP를 통해 데모 `places` 1000개 insert/upsert 확인
2. Supabase MCP를 통해 데모 `toilets` 1000개 insert/upsert 확인
3. DB 검증 쿼리 결과
   - `places where kakao_place_id like 'demo_cityhall:%'` = 1000
   - `toilets join places where kakao_place_id like 'demo_cityhall:%'` = 1000
4. 앱 재실행 후 시뮬레이터 위치를 시청역 근처로 설정
   ```bash
   xcrun simctl location booted set 37.5657,126.9770
   ```
5. 지도에서 `데모 화장실 1000개` 표시 확인
   - 스크린샷: `/tmp/hwachelin-db-demo-1000.png`

실제 공공데이터 import 후 정리:
- `tmp/cityhall-demo-cleanup.sql` 실행 완료
- `places.kakao_place_id like 'demo_cityhall:%'` = 0
- 데모 데이터는 현재 Supabase에서 삭제된 상태

데모 데이터를 다시 생성하려면:

```bash
npm run demo:cityhall -- --count=1000
```

### 4순위: 실제 공공데이터 import - 완료

사용한 흐름:
1. data.go.kr 공공데이터 활용 권한 승인
2. `.env.local`에 서버 전용 키 추가
   ```bash
   DATA_GO_KR_API_KEY=...
   ```
3. SQL 생성
   ```bash
   npm run import:toilets -- --region=서울특별시 --limit=500
   ```
4. OpenAPI 엔드포인트가 `HTTP 500 Unexpected errors`를 반환해 CSV 다운로드 방식으로 자동 전환
   - CSV URL: `https://file.localdata.go.kr/file/download/public_restroom_info/info`
   - 인코딩: `euc-kr`
5. `tmp/public-toilets-import.sql`을 Supabase MCP로 실행
6. 앱 재실행 후 지도에서 실제 마커 확인

완료 내용:
- 서울특별시 실제 공공화장실 `places` 276개 import
- 서울특별시 실제 공공화장실 `toilets` 276개 import
- 시청역 3km 기준 앱 지도에서 `화장실 219개` 표시 확인
- 스크린샷: `/tmp/hwachelin-public-toilets.png`
- `scripts/importPublicToilets.mjs`는 공공데이터의 문자열 층 정보가 DB integer 컬럼에 그대로 들어가지 않도록 `inferFloor()`로 숫자/NULL 변환 처리 완료
- `scripts/importPublicToilets.mjs`는 OpenAPI 실패 시 생활편의정보 CSV 다운로드 방식으로 fallback
- `scripts/syncPublicToiletsViaMcp.mjs` 추가
  - 공공데이터 수집
  - `tmp/public-toilets-import.sql` 생성
  - Supabase MCP `execute_sql`로 자동 반영
  - 반영 후 count 확인
- 로컬 Mac `launchd` 매일 03:00 자동 동기화 등록 완료
- GitHub Actions 매일 03:00 KST 자동 동기화 workflow 추가

검증:
- Supabase count
  - `places where kakao_place_id like 'public_toilet:%'` = 276
  - `toilets join places where kakao_place_id like 'public_toilet:%'` = 276
- `npm run public-toilets:sync:mcp` 수동 1회 실행 성공
- `npx tsc --noEmit` 통과

### 5순위: 카카오 로그인 - 앱 구현 완료, Supabase Provider 설정 필요

리뷰 저장과 제보 기능을 제대로 하려면 로그인 필요.

완료한 앱 작업:
- `lib/authService.ts` 추가
  - `supabase.auth.signInWithOAuth({ provider: 'kakao' })`
  - `expo-web-browser` 기반 OAuth 세션 열기
  - 앱 딥링크 redirect URL로 돌아온 `code`를 `exchangeCodeForSession()`으로 세션화
  - 로그인 성공 후 `public.users`에 `{ id, nickname }` insert
- 마이페이지 로그인 UI 추가
  - 카카오 로그인 버튼
  - 로그인 상태 표시
  - 로그아웃
  - 내가 작성한 리뷰 수 표시
- 리뷰 작성 화면에서 비로그인 상태일 때 `로그인하기` 액션 연결
- RLS 확인 완료
  - `reviews_insert`: `auth.uid() = user_id`
  - `users_insert`: `auth.uid() = id`

필요한 외부 설정:
1. Supabase Dashboard → Authentication → Providers → Kakao 활성화
   - Kakao REST API Key 입력
   - Kakao Client Secret은 Kakao Developers에서 사용 설정한 경우에만 입력
2. Supabase Dashboard → Authentication → URL Configuration
   - Redirect URL 추가: `hwachelin://auth/callback`
3. Kakao Developers → 제품 설정 → 카카오 로그인
   - 카카오 로그인 활성화
   - Redirect URI 추가: `https://jdcymglzmcnewgsimatc.supabase.co/auth/v1/callback`
4. Kakao Developers → 동의항목
   - 닉네임/profile nickname 동의항목 확인

현재 검증 상태:
- `npx tsc --noEmit` 통과
- Supabase authorize endpoint 확인 결과: `Unsupported provider: provider is not enabled`
- 즉, 앱 코드는 준비됐고 Supabase Kakao provider 설정 후 실제 로그인/리뷰 저장 테스트 가능

### 6순위: 화장실 제보 화면

MVP 핵심 확장 기능.

권장 플로우:
1. 카카오 Local API로 장소 검색
2. 장소 선택
3. 화장실 정보 입력
4. 비밀번호는 텍스트 저장 금지, 선택지 방식만 허용
5. Supabase insert

---

## 11. 다음 작업 추천

바로 이어서 한다면 **리뷰 저장 연결**이 최우선.

이유:
- 현재 지도/상세/리뷰/황금칸 UI 흐름은 잡힘
- 검색/필터가 연결되어 사용자가 장소를 찾고 상세 화면까지 들어가는 흐름이 자연스러워짐
- 이제 리뷰 작성 화면의 저장 버튼이 실제 데이터에 반영되어야 황금칸/상세 평점 흐름을 검증할 수 있음

다음 작업은 `ReviewWriteScreen.tsx`의 저장 버튼을 Supabase `reviews` insert에 연결하고, 상세 화면 요약과 황금칸 랭킹이 갱신되는지 확인한다.
