import { View } from 'react-native';

interface Props {
  size: number;
  color: string;
}

/**
 * 변기 아이콘 (앞면 뷰, 아웃라인 스타일)
 *
 *  ┌──────┐       ← 물탱크 (아웃라인 사각형)
 *  ├──────────┤   ← 시트 (얇은 가로 바)
 *  │          │
 *  └──────────┘   ← 볼 (아래가 둥근 U자형)
 *      ┃┃┃┃      ← 받침대 (좁은 바)
 *   ──────────    ← 바닥 (넓은 얇은 바)
 */
export default function ToiletIcon({ size, color }: Props) {
  const sw = Math.max(1.5, size * 0.055); // 선 굵기

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* 물탱크 — 아웃라인 사각형 */}
      <View
        style={{
          width: size * 0.42,
          height: size * 0.28,
          borderWidth: sw,
          borderColor: color,
          borderRadius: sw * 1.2,
          backgroundColor: 'transparent',
        }}
      />
      {/* 시트 — 탱크보다 넓은 얇은 바 */}
      <View
        style={{
          width: size * 0.76,
          height: sw * 1.6,
          backgroundColor: color,
          borderRadius: sw,
          marginTop: sw * 0.9,
        }}
      />
      {/* 볼 — 아래가 둥근 U자형 (3면 border) */}
      <View
        style={{
          width: size * 0.76,
          height: size * 0.38,
          borderLeftWidth: sw,
          borderRightWidth: sw,
          borderBottomWidth: sw,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.4,
          borderBottomRightRadius: size * 0.4,
          backgroundColor: 'transparent',
        }}
      />
      {/* 받침대 */}
      <View
        style={{
          width: size * 0.26,
          height: size * 0.10,
          backgroundColor: color,
          borderRadius: sw,
        }}
      />
      {/* 바닥 */}
      <View
        style={{
          width: size * 0.68,
          height: sw * 1.5,
          backgroundColor: color,
          borderRadius: sw,
        }}
      />
    </View>
  );
}
