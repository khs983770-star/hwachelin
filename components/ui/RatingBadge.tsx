// ─────────────────────────────────────────────────────────────────────────
// RatingBadge — 화슐랭의 ★/⭐ 인라인 표기를 ✿로 통일하는 헬퍼
//
// 화면 곳곳에 흩어져 있는 `★ 4.5`, `⭐ ${rating}` 같은 인라인 패턴을
// 한 컴포넌트로 통일.
//
// 사용 예:
//   <RatingBadge value={4.5} />              → ✿ 4.5
//   <RatingBadge value={4.5} count={12} />   → ✿ 4.5 (12)
//   <RatingBadge value={null} />             → 리뷰 없음
// ─────────────────────────────────────────────────────────────────────────

import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { colors, typography } from '../../constants/theme';

interface RatingBadgeProps {
  value: number | null | undefined;
  count?: number | null;
  size?: 'sm' | 'md' | 'lg';
  emptyLabel?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const SIZE_PRESETS = {
  sm: { fontSize: 11, gap: 2 },
  md: { fontSize: 13, gap: 3 },
  lg: { fontSize: 15, gap: 4 },
} as const;

export default function RatingBadge({
  value,
  count,
  size = 'md',
  emptyLabel = '리뷰 없음',
  style,
  textStyle,
}: RatingBadgeProps) {
  const preset = SIZE_PRESETS[size];

  if (value == null) {
    return (
      <Text
        style={[
          styles.empty,
          { fontSize: preset.fontSize },
          textStyle,
        ]}
      >
        {emptyLabel}
      </Text>
    );
  }

  return (
    <View style={[styles.row, { gap: preset.gap }, style]}>
      <Text style={[styles.flower, { fontSize: preset.fontSize }]}>✿</Text>
      <Text
        style={[
          styles.value,
          { fontSize: preset.fontSize },
          textStyle,
        ]}
      >
        {value.toFixed(1)}
      </Text>
      {count != null && count > 0 ? (
        <Text
          style={[
            styles.count,
            { fontSize: preset.fontSize - 1 },
          ]}
        >
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flower: {
    color: colors.brand[500],
    fontWeight: typography.weight.bold as TextStyle['fontWeight'],
    includeFontPadding: false,
  } as TextStyle,
  value: {
    color: colors.text.primary,
    fontWeight: typography.weight.bold as TextStyle['fontWeight'],
  },
  count: {
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium as TextStyle['fontWeight'],
  },
  empty: {
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium as TextStyle['fontWeight'],
  },
});
