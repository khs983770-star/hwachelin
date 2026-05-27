# 화슐랭 디자인 시스템

> 작성: 2026-05-27
> 이 디렉토리는 화슐랭 앱의 디자인 시스템 가이드를 담고 있습니다.

## 구조

```
docs/design/
├── README.md                ← 이 파일 (인덱스)
├── APP_ICON_CONCEPTS.md     앱 아이콘 3안 제안 + SVG 시안 + Export 가이드
├── ICON_MAPPING.md          이모지 → 통일 아이콘 매핑 표 (lucide/phosphor)
└── STARS_POLICY.md          별점 표기 정책 (✿ 통일)
```

관련 코드:
```
constants/theme.ts                   디자인 토큰 (colors / typography / spacing / radius / shadow)
components/ui/Button.tsx             공통 버튼 (5 variant × 3 size)
components/ui/Icon.tsx               아이콘 추상화 (1단계: 이모지 폴백)
components/ui/RatingBadge.tsx        별점 인라인 표기 헬퍼 (✿ 4.5)
components/HwachelinStars.tsx        시각적 별 5개 (이미 ✿ 매화)
```

## 디자인 토큰 (constants/theme.ts)

### 컬러
- `colors.brand[50~900]` — 빨강 단일 계열, 500이 표준 (`#E51B3E`)
- `colors.text.{primary, secondary, tertiary, disabled, inverse, brand}`
- `colors.bg.{base, surface, subtle, muted, brandSoft, overlay, backdrop}`
- `colors.border.{subtle, default, strong, brand, brandSoft}`
- `colors.semantic.{success, warning, error, info}[50/500/700]`

### 타이포그래피
- `typography.weight.{regular, medium, bold, heavy}` — 400/600/700/800 (5단계 → 4단계로 축소)
- `typography.size` — xs(11) ~ 3xl(28)
- `typography.preset.{h1, h2, h3, title, body, bodyBold, label, caption, button}`

### 스페이싱
- `spacing.{xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl}` — 4의 배수 기반

### Radius
- `radius.{xs, sm, md, base, lg, xl, 2xl, pill}` — 기존 `radii`는 deprecated

### Shadow
- `shadow.{none, sm, md, lg, xl}` — 모두 `#4A1A1F` (붉은 갈색) 그림자

### Motion
- `motion.duration.{fast(150), base(200), slow(300), slowest(450)}`
- `motion.spring.{soft, standard, bouncy}`

### 기타
- `hitTarget.{min: 44, comfortable: 48}` — 접근성 최소 터치 영역
- `zIndex.{base, raised, sticky, overlay, sheet, modal, toast}`

## 마이그레이션 전략

전반적으로 **기존 화면은 건드리지 않고, 새 시스템을 추가**하는 점진적 방식을 권장합니다.

| 단계 | 작업 | 상태 |
|---|---|---|
| 1 | 디자인 토큰 정리 | ✅ 완료 |
| 2 | Button 컴포넌트 | ✅ 완료 |
| 3 | 앱 아이콘 컨셉 3안 | ✅ 완료 (SVG 시안 작성, 사용자가 export) |
| 4 | 아이콘 시스템 (1단계) | ✅ 완료 (Icon 컴포넌트 + 매핑 표) |
| 5 | 별점 정책 + 헬퍼 | ✅ 완료 (RatingBadge) |
| ─ | ─── 사용자 결정 후 ─── | |
| 6 | 앱 아이콘 PNG 생성 → assets/ 교체 | ⏳ 대기 |
| 7 | react-native-svg + lucide 설치 | ⏳ 대기 |
| 8 | Icon.tsx 폴백 → SVG로 교체 | ⏳ 대기 |
| 9 | 화면별 ★ → ✿ 마이그레이션 | ⏳ 대기 |
| 10 | 화면별 인라인 버튼 → `<Button />` 교체 | ⏳ 대기 |

## 새 화면 만들 때 권장 패턴

```tsx
import { colors, spacing, radius, typography, shadow } from '../constants/theme';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import RatingBadge from '../components/ui/RatingBadge';

export default function MyScreen() {
  return (
    <View style={{ padding: spacing.lg, backgroundColor: colors.bg.base }}>
      <Text style={typography.preset.h2}>제목</Text>
      <RatingBadge value={4.5} count={12} />

      <Button
        variant="primary"
        size="md"
        leadingIcon={<Icon name="edit" size={16} color={colors.text.inverse} />}
        onPress={() => {}}
      >
        리뷰 작성
      </Button>
    </View>
  );
}
```

## 기존 화면을 건드리지 않은 이유

- 화면별로 시각 검수가 필요 (UI 깨질 위험)
- 단계별 PR로 쪼개 머지하는 것이 안전
- 디자인 시스템은 "쓰면 좋아짐"이지 "강제 적용"이 아님
- 사용자(개발자)가 화면별 작업 순서를 결정할 수 있도록 옵션 제공
