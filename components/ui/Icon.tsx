// ─────────────────────────────────────────────────────────────────────────
// 화슐랭 Icon 컴포넌트 (단계적 마이그레이션)
//
// 목적:
//   - 화면 곳곳의 이모지(🚶 ⭐ ♥ 🔓 ...)를 통일된 이름 기반으로 추상화
//   - 1단계: 이모지를 그대로 렌더링 (현재 상태 유지 + 타입 안전성)
//   - 2단계: react-native-svg + lucide-react-native 설치 후 SVG로 교체
//             → 이 파일만 수정하면 전 화면 적용됨
//
// 사용 예:
//   <Icon name="walk" size={16} />
//   <Icon name="star-filled" size={20} color={colors.brand[500]} />
//
// 마이그레이션 가이드:
//   docs/design/ICON_MAPPING.md 참조
// ─────────────────────────────────────────────────────────────────────────

import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors } from '../../constants/theme';

export type IconName =
  // ── 평점/즐겨찾기 ──
  | 'star-filled'        // ★
  | 'star-outline'       // ☆
  | 'flower-filled'      // ✿ (화슐랭 별점)
  | 'heart-filled'       // ♥
  | 'heart-outline'      // ♡
  | 'bookmark'           // 🔖
  // ── 화장실 속성 ──
  | 'toilet'             // 🚽
  | 'toilet-public'      // 🚻
  | 'toilet-male'        // 🚹
  | 'toilet-female'      // 🚺
  | 'lock-open'          // 🔓 (누구나)
  | 'lock-closed'        // 🔒 (비밀번호)
  | 'shopping'           // 🛒 (손님만)
  | 'paper'              // 🧻
  | 'soap'               // 🧴
  | 'hand-dryer'         // 💨
  | 'tissue'             // 🤲
  | 'sparkles'           // ✨
  | 'face-neutral'       // 😐
  | 'face-disgust'       // 🤢
  | 'baby'               // 🍼
  | 'wheelchair'         // ♿
  | 'bell'               // 🔔
  | 'alert'              // 🚨
  | 'gender-unisex'      // ⚥
  | 'gender-separated'   // ⚤
  // ── 액션/네비 ──
  | 'walk'               // 🚶
  | 'pin'                // 📍
  | 'clock'              // 🕐
  | 'map'                // 🗺
  | 'search'             // 🔍
  | 'camera'             // 📷
  | 'edit'               // ✏️
  | 'trash'              // 🗑
  | 'check'              // ✓ ✅
  | 'close'              // ✕
  | 'thumbs-up'          // 👍
  | 'user'               // 👤
  | 'tools'              // 🛠
  | 'doc'                // 📋 📄
  | 'trophy';            // 🏆

// 1단계 폴백: 이모지 매핑
const EMOJI_FALLBACK: Record<IconName, string> = {
  'star-filled':       '★',
  'star-outline':      '☆',
  'flower-filled':     '✿',
  'heart-filled':      '♥',
  'heart-outline':     '♡',
  'bookmark':          '🔖',

  'toilet':            '🚽',
  'toilet-public':     '🚻',
  'toilet-male':       '🚹',
  'toilet-female':     '🚺',
  'lock-open':         '🔓',
  'lock-closed':       '🔒',
  'shopping':          '🛒',
  'paper':             '🧻',
  'soap':              '🧴',
  'hand-dryer':        '💨',
  'tissue':            '🤲',
  'sparkles':          '✨',
  'face-neutral':      '😐',
  'face-disgust':      '🤢',
  'baby':              '🍼',
  'wheelchair':        '♿',
  'bell':              '🔔',
  'alert':             '🚨',
  'gender-unisex':     '⚥',
  'gender-separated':  '⚤',

  'walk':              '🚶',
  'pin':               '📍',
  'clock':             '🕐',
  'map':               '🗺',
  'search':            '🔍',
  'camera':            '📷',
  'edit':              '✏️',
  'trash':             '🗑',
  'check':             '✓',
  'close':             '✕',
  'thumbs-up':         '👍',
  'user':              '👤',
  'tools':             '🛠',
  'doc':               '📋',
  'trophy':            '🏆',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export default function Icon({
  name,
  size = 16,
  color = colors.text.primary,
  style,
}: IconProps) {
  // 2단계 구현 시 이 부분만 SVG로 교체:
  //   import { Heart, Star, ... } from 'lucide-react-native';
  //   const Component = ICON_MAP[name];
  //   return <Component size={size} color={color} />;

  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.base,
        { fontSize: size, lineHeight: size * 1.1, color },
        style,
      ]}
    >
      {EMOJI_FALLBACK[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '400',
    includeFontPadding: false,
    textAlignVertical: 'center',
  } as TextStyle,
});
