import { View, Text, StyleSheet } from 'react-native';

interface Props {
  rating: number;   // 0.5 ~ 5.0
  size?: number;    // 폰트 크기
  color?: string;
  emptyColor?: string;
  gap?: number;
}

/**
 * 화슐랭 꽃(✿) 마크 — 평점 비율만큼 채움
 * 예) 4.3점 → ✿✿✿✿ + 30% 채워진 ✿
 * 부분 채움: 같은 위치에 회색 ✿ 위에 색 ✿를 fill% 너비로 클리핑
 */
export default function HwachelinStars({
  rating,
  size = 24,
  color = '#E50914',
  emptyColor = '#D9CCC8',
  gap = 2,
}: Props) {
  const total = 5;
  const clipped = Math.max(0, Math.min(5, rating));

  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => {
        const fill = Math.min(1, Math.max(0, clipped - i));

        if (fill >= 1) {
          return (
            <Text key={i} style={[styles.mark, { fontSize: size, color }]}>
              ✿
            </Text>
          );
        }

        if (fill <= 0) {
          return (
            <Text key={i} style={[styles.mark, { fontSize: size, color: emptyColor }]}>
              ✿
            </Text>
          );
        }

        // 부분 채움: 회색 위에 컬러를 fill 비율만큼 클리핑
        return (
          <View key={i} style={{ width: size * 0.85, height: size }}>
            {/* 배경 (회색) */}
            <Text style={[styles.mark, styles.absolute, { fontSize: size, color: emptyColor }]}>
              ✿
            </Text>
            {/* 앞 (컬러), fill 비율만큼 너비 클리핑 */}
            <View style={[styles.absolute, { width: size * 0.85 * fill, overflow: 'hidden' }]}>
              <Text style={[styles.mark, { fontSize: size, color }]}>✿</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { fontWeight: '400', lineHeight: undefined },
  absolute: { position: 'absolute', top: 0, left: 0 },
});
