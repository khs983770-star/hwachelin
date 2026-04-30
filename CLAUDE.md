# 화슐랭 프로젝트 가이드

## 기획서 참조 규칙

- 기획 관련 결정이 필요할 때는 **항상 Notion MCP를 통해 기획서를 먼저 참조**한다
- Notion 페이지 ID: `3517e16a-6a35-8045-811b-c8b3ff3d7ddf` (화슐랭 기획안)
- 기획서와 다르게 구현되거나 기획이 업데이트될 경우 **반드시 Notion 기획서에도 반영**한다

## 기술 스택

- **앱**: Expo (React Native) + TypeScript
- **지도**: 카카오맵 (WebView)
- **로그인**: 카카오 OAuth
- **DB/백엔드**: Supabase
- **장소 검색**: 카카오 Local API

## MVP 범위

### 포함
- 카카오 로그인
- 지도 화면 (주변 화장실 마커)
- 화장실 상세 보기
- 리뷰 작성 (별점 + 체크리스트 + 텍스트)
- 화장실 등록/제보 (카카오 장소 검색 우선, 없으면 직접 핀)
- 마이페이지 (간단)

### 제외 (2차)
- 황금 칸
- 뱃지/등급 시스템
- 사진 업로드

## DB 구조

- `users`: id, nickname, created_at
- `places`: id, name, address, lat, lng, source, kakao_place_id
- `toilets`: id, place_id, type, access_type, floor, gender_type, registered_by
- `reviews`: id, toilet_id, user_id, rating, cleanliness, paper, soap, security, comment, is_verified, created_at

## 주요 규칙

- 화장실 타입: `공공` | `매장`
- 접근 타입: `누구나` | `손님만` | `비밀번호`
- 리뷰 별점: 0.5 ~ 5.0
- GPS 50m 이내 방문 시 `is_verified = true` (인증된 방문 마크)
- 비인증 리뷰도 허용하되 시각적으로 구분
- 가게 화장실 비밀번호는 텍스트로 노출 금지
