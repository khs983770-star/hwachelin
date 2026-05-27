# 아이콘 시스템 매핑 표

> 화슐랭 앱의 이모지 → 통일된 아이콘 시스템 마이그레이션 가이드

## 현재 상태

전 화면에서 이모지가 인라인으로 사용되어 OS·버전마다 모양이 다르게 보임.
예: `🚶` 길찾기, `⭐` 별점, `♿` 장애인, `🍼` 기저귀, `🔔` 비상벨, ...

총 **30+종**의 이모지가 사용 중.

## 마이그레이션 전략 (2단계)

### 1단계: 추상화 (✅ 완료)
- `components/ui/Icon.tsx` 추가
- 이모지를 이름 기반(`name="walk"`)으로 호출하도록 추상화
- 내부 구현은 *아직 이모지* — 시각적 변화 없음
- 이점: 화면 코드에서 `<Icon name="walk" />` 형태로 통일

### 2단계: SVG로 교체 (사용자 결정 후)
- 설치: 아래 가이드 참고
- `components/ui/Icon.tsx` 내부만 SVG 컴포넌트로 교체
- 화면 코드는 수정 불필요 → 모든 아이콘이 동시에 통일된 모양으로 변경

## 추천 라이브러리 (둘 다 무료 / MIT)

### Option A: Lucide (👍 추천)
- 가볍고 단순. 라인 아이콘 1500개+
- 화슐랭의 베이지/빨강 톤과 잘 어울리는 깔끔한 디자인
- 설치: `npx expo install react-native-svg lucide-react-native`

### Option B: Phosphor
- 같은 아이콘 6가지 굵기 (thin/light/regular/bold/fill/duotone)
- 5000개+ 아이콘
- 설치: `npx expo install react-native-svg phosphor-react-native`

## 매핑 표

| 우리 이름 | 이모지 (현재) | Lucide | Phosphor | 사용처 |
|---|---|---|---|---|
| **평점/즐겨찾기** | | | | |
| `star-filled` | ★ ⭐ | `Star` (fill) | `Star` (fill) | 별점 (HwachelinStars 외 21곳) |
| `star-outline` | ☆ | `Star` | `Star` (regular) | 빈 별 |
| `flower-filled` | ✿ | (커스텀 SVG 권장) | `Flower` (fill) | 화슐랭 별점 |
| `heart-filled` | ♥ | `Heart` (fill) | `Heart` (fill) | 즐겨찾기 ON |
| `heart-outline` | ♡ | `Heart` | `Heart` | 즐겨찾기 OFF |
| `bookmark` | 🔖 | `Bookmark` | `BookmarkSimple` | 마이페이지 |
| **화장실 속성** | | | | |
| `toilet` | 🚽 | `Toilet`* | `Toilet` | 화장실 일반 |
| `toilet-public` | 🚻 | — | `RestroomBoth` | 공용 |
| `toilet-male` | 🚹 | — | `RestroomMale` | 남자 |
| `toilet-female` | 🚺 | — | `RestroomFemale` | 여자 |
| `lock-open` | 🔓 | `LockOpen` | `LockOpen` | 누구나 |
| `lock-closed` | 🔒 | `Lock` | `Lock` | 비밀번호 |
| `shopping` | 🛒 | `ShoppingCart` | `ShoppingCart` | 손님만 |
| `paper` | 🧻 | (커스텀) | (커스텀) | 휴지 |
| `soap` | 🧴 | `Droplets` | `Drop` | 비누 |
| `hand-dryer` | 💨 | `Wind` | `Wind` | 핸드드라이어 |
| `tissue` | 🤲 | `Sparkles` | `Hand` | 핸드티슈 |
| `sparkles` | ✨ | `Sparkles` | `Sparkle` | 깨끗 |
| `face-neutral` | 😐 | `Meh` | `SmileyMeh` | 보통 |
| `face-disgust` | 🤢 | `Frown` | `SmileyXEyes` | 더러움 |
| `baby` | 🍼 | `Baby` | `Baby` | 기저귀 교환대 |
| `wheelchair` | ♿ | `Accessibility` | `Wheelchair` | 장애인용 |
| `bell` | 🔔 | `Bell` | `Bell` | 비상벨 |
| `alert` | 🚨 | `AlertCircle` | `Warning` | 급해요 |
| `gender-unisex` | ⚥ | — | `GenderIntersex` | 공용 |
| `gender-separated` | ⚤ | — | `GenderNeuter` | 남녀분리 |
| **액션/네비** | | | | |
| `walk` | 🚶 | `PersonStanding` | `PersonSimpleWalk` | 길찾기 |
| `pin` | 📍 | `MapPin` | `MapPin` | 위치 |
| `clock` | 🕐 | `Clock` | `Clock` | 영업시간 |
| `map` | 🗺 | `Map` | `Map` | 지도 |
| `search` | 🔍 | `Search` | `MagnifyingGlass` | 검색 |
| `camera` | 📷 | `Camera` | `Camera` | 사진 |
| `edit` | ✏️ | `Pencil` | `PencilSimple` | 리뷰 작성 |
| `trash` | 🗑 | `Trash2` | `Trash` | 삭제 |
| `check` | ✓ ✅ | `Check` | `Check` | 확인 |
| `close` | ✕ | `X` | `X` | 닫기 |
| `thumbs-up` | 👍 | `ThumbsUp` | `ThumbsUp` | 도움됐어요 |
| `user` | 👤 | `User` | `User` | 마이페이지 |
| `tools` | 🛠 | `Wrench` | `Wrench` | 관리자 |
| `doc` | 📋 📄 | `FileText` | `FileText` | 정책 |
| `trophy` | 🏆 | `Trophy` | `Trophy` | 뱃지 |

\* Lucide에는 `Toilet` 아이콘이 있지만 디테일이 단순함.

## 단계별 마이그레이션 체크리스트

### 1단계 → 2단계 전환 작업
- [ ] 사용자 OK 받고 `npx expo install react-native-svg lucide-react-native`
- [ ] `components/ui/Icon.tsx` 내부 폴백을 SVG import 매핑으로 교체
- [ ] 시각적 회귀 테스트 (각 화면 비교)
- [ ] 기존 화면의 인라인 이모지를 `<Icon name="..." />`로 점진 교체

### 화면별 교체 우선순위
1. **ToiletBottomSheet** — 태그 7개에 이모지가 가장 많음
2. **ReviewWriteScreen** — 청결 카드(✨/😐/🤢) + 시설 체크
3. **(tabs)/index.tsx** — 급해요(🚨), 내 위치(⦿), 프로필(👤)
4. **ToiletDetailScreen** — 도움됐어요(👍), 별점(★)
5. 나머지 화면

## 별점 별도 정책

별점은 매화(`✿`) 디자인이 화슐랭 브랜드의 핵심.
- ⭐ → 일반 별점이 아니라 매화로 통일
- `HwachelinStars` 컴포넌트가 이미 매화로 그림 → 그대로 사용
- 자세한 내용: [STARS_POLICY.md](./STARS_POLICY.md)
