# 🤝 새 Claude 계정 인수인계 가이드

> **목적**: 다른 Claude 계정/세션에서 화슐랭 프로젝트를 이어서 작업하기 위한 종합 셋업 문서
> **최종 업데이트**: 2026-05-27
> **프로젝트 경로**: `~/IdeaProjects/hwachelin`

---

## 0. 새 세션 시작 시 첫 명령

새 Claude 세션을 시작하면 **아래 문서들을 먼저 읽혀주세요**:

```
다음 문서들을 순서대로 읽고 프로젝트를 파악해줘:
1. /Users/hyunsookim/IdeaProjects/hwachelin/CLAUDE.md (프로젝트 가이드)
2. /Users/hyunsookim/IdeaProjects/hwachelin/HANDOVER.md (이전 인수인계 기록)
3. /Users/hyunsookim/IdeaProjects/hwachelin/CLAUDE_HANDOVER.md (이 문서)
4. /Users/hyunsookim/IdeaProjects/hwachelin/PRODUCT_SPEC.md (제품 명세)

기획서 두 가지:
- 상세 기획서 (개발용): https://www.notion.so/3527e16a6a3581ed8adbfb7cfa9cf63b
- 화면별 기획서 (기획자용): https://www.notion.so/3597e16a6a35818193aafa4e1c999ac3
```

---

## 1. MCP 설정 (필수)

Claude Desktop 설정 파일 위치:
`/Users/hyunsookim/Library/Application Support/Claude/claude_desktop_config.json`

**현재 연결된 MCP:**
- `supabase` — DB 조회/수정 (`mcp__supabase__*` 도구)
- `notion` — 기획서 조회/수정 (`mcp__notion__*` 도구)

**확인 명령:**
```bash
cat "/Users/hyunsookim/Library/Application Support/Claude/claude_desktop_config.json" | python3 -c "import json,sys; d=json.load(sys.stdin); print('MCPs:', list(d.get('mcpServers',{}).keys()))"
```

새 계정에서도 동일한 Claude Desktop을 쓴다면 MCP는 그대로 작동합니다. **별도 설정 불필요**.

---

## 2. 환경변수 (`.env.local`)

다음 키들이 `~/IdeaProjects/hwachelin/.env.local`에 있어야 합니다:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_KAKAO_APP_KEY=...           # 카카오맵 JS SDK
EXPO_PUBLIC_KAKAO_REST_API_KEY=...      # 카카오 장소 검색
DATA_GO_KR_API_KEY=...                  # 공공데이터포털 (화장실 임포트)
```

**누락 시 동작:**
- Supabase 없으면 → 앱 데이터 조회 불가
- 카카오 키 없으면 → 지도/검색 안 됨
- 공공데이터 키 없으면 → 화장실 임포트 스크립트 실패

---

## 3. 프로젝트 핵심 정보

| 항목 | 값 |
|---|---|
| 앱 이름 | 화슐랭 (HWA-CHELIN) |
| 번들 ID | `com.hwachelin.app` |
| Supabase Project | `jdcymglzmcnewgsimatc` |
| EAS Project | `69783862-edb0-41fb-aa5b-9cdc11bb498a` |
| 기술 스택 | Expo (React Native) + TypeScript + Supabase + 카카오맵 |
| 카카오 로그인 | OAuth |

---

## 4. ✅ 완료된 기능 (현재 동작 중)

### 인증 & 사용자
- 카카오 OAuth 로그인
- 익명 사용자 지도 탐색 가능, 리뷰/북마크 시 로그인 유도

### 지도 탭 (메인)
- 카카오맵 WebView 기반
- 위치 권한 + 현재 위치 기준 화장실 조회 (반경 기반 + 뷰포트 bounds 기반)
- 마커: 평점 뱃지 + 운영상태별 색상 (영업중/마감 회색)
- 클러스터: 화장실 여러 개 겹칠 때 묶음 표시
- "이 지역에서 재탐색" 버튼 (뷰포트 벗어남 감지)
- 줌 +/-, 내 위치 버튼

### 검색
- 카카오 장소 API + 내 화장실 DB 자동완성 통합
- 최근/인기 검색어
- 지역 검색 vs 특정 장소 검색 분기

### 필터 (2026-05-25 업데이트)
- **다중 선택 가능** (`selectedFilters: string[]`, AND 조건)
- 전체 / 24시간 / 비데 / 개방형 / 기저귀 / 남녀분리 / ★ 별점
- **🚨 급해요**: 내 위치 기준 가장 가까운 Top 3 + 1,2,3 넘버링 + 자동 줌

### 화장실 상세 / 리뷰 / 제보
- 화장실 상세 화면 (사진/평점/시설/운영시간/리뷰 목록)
- 리뷰 작성: 별점 + 청결/휴지/비누/안전 체크리스트 + 텍스트
- GPS 50m 인증 (자동 인증 뱃지)
- 화장실 제보 (신규 등록 / 정보 수정)

### 마이페이지
- 내 리뷰, 내 북마크, 내 제보 내역
- **우측 상단 프로필 아이콘으로 진입** (하단탭에도 임시로 있음)

### 황금칸 탭 (gold.tsx)
- 현재 지도 컨텍스트 기반 추천
- ⚠️ **하단탭에 등록 안 됨** (코드만 있음)

### 데이터
- **공공화장실 28,256개** (2026-05-25 임포트 완료)
  - 출처: 공공데이터포털 `apis.data.go.kr/1741000/public_restroom_info`
  - 스크립트: `scripts/importPublicToilets.mjs`, `scripts/syncPublicToiletsViaMcp.mjs`
  - DB 테이블: `places` + `toilets`
- 매장 화장실 3개 (사용자 제보)

---

## 5. 🔨 진행 중 / 남은 작업

### 우선순위 1: 하단탭 재구성 (5분)
**현재**: `지도` / `마이페이지`
**목표**: `지도` / `황금칸` / `화통`
- `app/(tabs)/_layout.tsx`에 황금칸 탭 등록 (`gold.tsx` 이미 존재)
- 마이페이지를 탭에서 제거 (우측 상단 프로필 아이콘만 사용)
- 새 `app/(tabs)/hwatong.tsx` 탭 추가

### 우선순위 2: 화통 탭 신규 개발
인스타그램 피드 스타일 전국 최신 리뷰 화면.
- 상단: 큐레이션 섹션 (관리자 추천 명품 화장실)
- 피드: 전국 최신 리뷰 카드 (사진/별점/장소/코멘트)
- 시스템 자동 리포트 ("강남역 화장실이 즐겨찾기에 추가됨" 등)
- 더미 데이터 10~20개 미리 작성

### 우선순위 3: 리뷰 작성 화면 윤서판 (전면 리디자인)
2단계 스텝 구조:
- **1단계 (필수)**: 별점(0.5단위, 점수별 라벨) / 청결 상태(3카드: clean/normal/dirty) / 시설 상태
- **2단계 (추가)**: 분위기 태그 / 텍스트 / 사진
- 1단계 미완료 시 2단계 진입 차단, 스텝 인디케이터로 단계 이동 불가 (하단 버튼만)
- 기획서 참고: https://www.notion.so/3597e16a6a35818193aafa4e1c999ac3

### 기타 (HANDOVER.md 14번 항목 참고)
- App Store 제출 준비
- 검색 후 재탐색 버튼 자동 숨김
- GPS 인증 실패 안내 토스트
- 운영시간 파서 고도화

---

## 6. 자주 쓰는 명령어

```bash
# Metro 시작 (캐시 클리어)
cd ~/IdeaProjects/hwachelin && npx expo start --clear

# 외부 기획자에게 공유 (터널)
npx expo start --tunnel

# TypeScript 체크
npx tsc --noEmit

# 공공화장실 데이터 동기화 (Claude MCP 경유)
node scripts/syncPublicToiletsViaMcp.mjs

# 공공화장실 SQL 파일만 생성
node scripts/importPublicToilets.mjs --mode=sql
```

---

## 7. 핵심 파일 위치

| 영역 | 경로 |
|---|---|
| 지도 메인 | `app/(tabs)/index.tsx` |
| 황금칸 | `app/(tabs)/gold.tsx` |
| 마이페이지 | `app/(tabs)/mypage.tsx` |
| 탭 레이아웃 | `app/(tabs)/_layout.tsx` |
| 리뷰 작성 | `app/ReviewWriteScreen.tsx` |
| 화장실 상세 | `app/ToiletDetailScreen.tsx` |
| 제보 | `app/ReportScreen.tsx` |
| 카카오맵 컴포넌트 | `components/KakaoMapView.tsx` |
| 마커 컴포넌트 | `components/CustomMarker.tsx` |
| 화장실 서비스 | `lib/toiletService.ts` |
| 필터 로직 | `lib/mapToiletFilters.ts` |
| 검색 | `lib/searchService.ts` + `hooks/useSearch.ts` |
| 임포트 스크립트 | `scripts/importPublicToilets.mjs` |
| 환경변수 | `.env.local` |
| DB 타입 | `types/toilet.ts` |

---

## 8. 알려진 이슈 / 주의사항

### Fast Refresh 캐시 문제
파일 여러 개 동시 수정 시 마커가 안 보이는 경우 → `npx expo start --clear` 후 강제 리로드.

### 공공데이터 임포트
- API가 종종 500 에러 반환 → CSV fallback 자동 작동
- `--mode=supabase` 사용하려면 `SUPABASE_SERVICE_ROLE_KEY` 필요 (현재 없음)
- 대신 `--mode=sql`로 SQL 파일 생성 후 Supabase MCP `execute_sql`로 청크 임포트
- **자동 동기화 안 됨** — 필요할 때 수동 실행 (월 1회 정도 충분)

### Supabase RPC
- `toilets_near(lat, lng, radius_m)` — PostGIS 기반 반경 조회
- `toilets_in_bounds(south, west, north, east)` — 뷰포트 bounds 조회
- 둘 다 정상 작동 확인됨 (2026-05-25)

### iOS Bundle ID
`com.hwachelin.app`, EAS는 buildNumber 자동 증가 사용

---

## 9. 인수인계 시 컨텍스트 요약

**2026-05-25~27에 했던 마지막 작업:**
1. 필터 다중 선택 + 🚨 급해요 구현 완료
2. 공공화장실 28,256개 DB 임포트 (이전엔 8,575개만 있었음)
3. 임시 디버그 로그 추가 후 제거 완료
4. 기획자용 Notion 페이지 신규 작성 (sub-page)

**현재 사용자 다음 작업으로 원하는 것:**
- 하단탭 재구성 → 화통 탭 → 리뷰 작성 윤서판 (이 순서)

---

## 10. 그 외 참고 문서

- `CLAUDE.md` — 프로젝트 가이드 (기획서 참조 규칙)
- `HANDOVER.md` — 2026-05-07 시점 상세 인수인계 (DB 스키마/Edge Functions/EAS 등)
- `PRODUCT_SPEC.md` — 제품 명세서
- `tmp/` — 공공화장실 임포트용 SQL/JSON 파일 (커밋하지 말 것)
