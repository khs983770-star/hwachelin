# 별점 표기 정책

> 화슐랭은 별점 마크를 **매화(✿)**로 통일합니다.
> 미슐랭의 ★를 패러디하면서 한국 정서에 맞춘 화슐랭만의 시그니처.

## 한눈에 보기

| 상황 | 사용할 컴포넌트 | 예시 |
|---|---|---|
| **시각적 별 5개 표시** (리뷰 카드, 상세) | `<HwachelinStars />` | ✿✿✿✿◐ |
| **숫자와 함께 짧게 표기** (메타, 검색결과) | `<RatingBadge />` | ✿ 4.5 |
| **필터/카테고리 라벨** | 인라인 `✿ 별점` | 필터칩 |
| **마커 위 평점 뱃지** | `CustomMarker` (그대로 유지) | (숫자만, 별 없음) |

**금지사항:**
- ❌ `★` 일반 별 문자 → 화슐랭에선 절대 사용 X
- ❌ `⭐` 노란 별 이모지 → 화슐랭에선 절대 사용 X
- ✅ `✿` (매화) — 표준
- ✅ 사용자 후기에 사용자가 직접 입력한 ★는 그대로 둠 (UGC)

## 현재 ★ 사용처 (마이그레이션 대상)

`grep -rn "★" app components` 기준 **11곳** 발견:

| 위치 | 라인 | 패턴 | 교체 방법 |
|---|---|---|---|
| `app/(tabs)/index.tsx` | 701 | `'★ 별점'` 필터 칩 | `'✿ 별점'`으로 단순 치환 |
| `app/(tabs)/index.web.tsx` | 18, 49, 135-146, 172 | `★ 별점` 필터 + `★★★★★` | 모두 `✿`로 치환 |
| `app/(tabs)/mypage.tsx` | 203 | `icon="★"` | `icon="✿"` |
| `app/MyBookmarksScreen.tsx` | 132 | `★ ${avg_rating}` 인라인 | `<RatingBadge value={avg_rating} count={review_count} />` |
| `app/MyReviewsScreen.tsx` | 163 | `★` 표시 | `<RatingBadge value={rating} />` |
| `app/ReviewWriteScreen.tsx` | 330, 333 | 별 선택기 (5개 ★) | 기존 UI 유지하되 ★ → ✿ 치환 |
| `app/ToiletDetailScreen.tsx` | 542 | `★ ${review.rating}` | `<RatingBadge value={review.rating} size="sm" />` |
| `components/ClusterBottomSheet.tsx` | 164 | `★ ${ratingText}` | `<RatingBadge ... />` |
| `components/PhotoReviewModal.tsx` | 112 | `★ ${review.rating}` | `<RatingBadge ... />` |
| `components/SearchBar.tsx` | 266 | `· ★ ${avgRating}` | 텍스트 내부라 `· ✿ ${avgRating}` |

## `⭐` 이모지 사용처 (2곳)

| 위치 | 교체 |
|---|---|
| `components/ToiletBottomSheet.tsx:165` | `⭐ ${avg_rating}` → `<RatingBadge value={...} />` |
| `app/AdminScreen.tsx` (있다면) | 같은 방식 |

## 컴포넌트 사용 예시

### 변경 전 (인라인 별)
```tsx
<Text style={styles.meta}>★ {avg_rating.toFixed(1)} ({review_count}개)</Text>
```

### 변경 후 (RatingBadge)
```tsx
import RatingBadge from '@/components/ui/RatingBadge';

<RatingBadge value={avg_rating} count={review_count} size="sm" />
```

### 시각적 별 5개 (그대로)
```tsx
import HwachelinStars from '@/components/HwachelinStars';

<HwachelinStars rating={4.5} size={16} />
```

## 단계별 작업 권장 순서

1. ✅ `RatingBadge` 컴포넌트 추가 (이번 작업)
2. ⏭️ ToiletBottomSheet의 `⭐` → `RatingBadge` 교체 (단일 화면, 위험 낮음)
3. ⏭️ ToiletDetailScreen, ClusterBottomSheet 등 인라인 `★` 교체
4. ⏭️ ReviewWriteScreen의 별 선택기 ★ → ✿ 글자 치환 (CSS 그대로)
5. ⏭️ 필터 칩 라벨 `'★ 별점'` → `'✿ 별점'` (단순 string 치환, 매우 안전)

각 단계는 PR 단위로 쪼개 시각 검수 후 진행 권장.

## ReviewWriteScreen 별 선택기 가이드

현재 코드 (`app/ReviewWriteScreen.tsx:330,333`):
```tsx
<Text style={[styles.star, styles.starBase]}>★</Text>
<Text style={[styles.star, styles.starFill]}>★</Text>
```

→ 단순히 `★` 글자를 `✿`로 치환하면 끝. 스타일은 그대로 유지.
색상은 `colors.brand[500]` 적용 권장.
