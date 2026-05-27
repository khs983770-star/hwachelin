import { View } from 'react-native';
import ToiletIcon from './ToiletIcon';

interface Props {
  size?: number;       // 핀 body 크기 (기본 40)
  color?: string;      // 핀 배경색
  iconColor?: string;  // 변기 아이콘 색
}

/**
 * 지도 마커핀과 동일한 모양의 View 컴포넌트
 *
 *   ┌──────┐
 *   │ 변기 │   ← 둥근 사각형 body
 *   └──┬───┘
 *      ▼        ← 아래 꼭짓점
 */
export default function MarkerPinIcon({
  size = 40,
  color = '#E50914',
  iconColor = '#fff',
}: Props) {
  const radius = size * 0.28;
  const tipSize = size * 0.22;

  return (
    <View style={{ alignItems: 'center' }}>
      {/* 핀 body */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ToiletIcon size={size * 0.54} color={iconColor} />
      </View>

      {/* 아래 꼭짓점 — 위쪽에 body 색 삼각형, 그 위에 흰 삼각형으로 오버랩해 둥근 느낌 */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: tipSize,
          borderRightWidth: tipSize,
          borderTopWidth: tipSize * 1.1,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
          marginTop: -1,
        }}
      />
    </View>
  );
}
