// ─────────────────────────────────────────────────────────────────────────
// 화슐랭 디자인 시스템 / Design Tokens
//
// 새 코드는 의미 기반 토큰을 사용해주세요.
//   - colors.brand.*       브랜드 컬러 (빨강 계열)
//   - colors.text.*        텍스트 계층
//   - colors.bg.*          배경 계층
//   - colors.border.*      테두리 계층
//   - colors.semantic.*    success / warning / error / info
//   - typography.*         사이즈/굵기 프리셋
//   - spacing.*            4의 배수 기반 간격
//   - radius.*             기존 radii는 deprecated, radius 사용
//   - shadow.*             elevation 프리셋
//
// 기존 colors의 평탄한 키(backgroundPrimary, orange 등)는 기존 화면들의
// 호환을 위해 그대로 유지합니다. 새 화면/컴포넌트에서는 의미 기반 토큰을
// 우선 사용해주세요.
// ─────────────────────────────────────────────────────────────────────────

// ── 1. 컬러 ───────────────────────────────────────────────────────────────
//
// 화슐랭 브랜드는 빨강 단일 계열. 톤은 50~900으로 정리.
// 기존 코드에서 #E51B3E / #E50914 / #FF6B35 세 가지가 혼재했는데,
// brand[500]을 표준으로 통일 권장 (#E51B3E).

const brand = {
  50:  '#FFF0F2',
  100: '#FFE0E5',
  200: '#FFC2CB',
  300: '#FF94A4',
  400: '#FF5872',
  500: '#E51B3E', // ← 표준 (현 colors.orange)
  600: '#C8112F',
  700: '#A60B25',
  800: '#7E0719',
  900: '#52040F',
} as const;

const neutral = {
  0:    '#FFFFFF',
  50:   '#FFFDFB',
  100:  '#F8F3EF',
  200:  '#F1E8E3',
  300:  '#E8DCD7',
  400:  '#D9CCC8',
  500:  '#A59696',
  600:  '#746464',
  700:  '#4A3D3D',
  800:  '#2E2526',
  900:  '#22191A',
  1000: '#000000',
} as const;

const semantic = {
  success: { 50: '#E8F5ED', 500: '#059669', 700: '#1E7E34' },
  warning: { 50: '#FEF3C7', 500: '#F59E0B', 700: '#92400E' },
  error:   { 50: '#FEF0F0', 500: '#E51B3E', 700: '#C0392B' },
  info:    { 50: '#EBF2FF', 500: '#3B82F6', 700: '#1E40AF' },
} as const;

export const colors = {
  // ── legacy: 기존 화면 호환용 (수정 금지) ──
  backgroundPrimary: '#FFFDFB',
  backgroundSecondary: '#F8F3EF',
  backgroundTertiary: '#FFE8EC',
  borderSecondary: '#E8DCD7',
  borderTertiary: '#F1E8E3',
  textPrimary: '#22191A',
  textSecondary: '#746464',
  textTertiary: '#A59696',
  orange: '#E51B3E',
  orangeDark: '#B91432',
  amber: '#F59E0B',
  blue: '#3B82F6',
  grayPin: '#6B7280',
  green: '#059669',

  // ── semantic: 신규 권장 ──
  brand,
  neutral,
  semantic,

  text: {
    primary:   neutral[900],
    secondary: neutral[600],
    tertiary:  neutral[500],
    disabled:  neutral[400],
    inverse:   neutral[0],
    brand:     brand[500],
  },
  bg: {
    base:      neutral[50],
    surface:   neutral[0],
    subtle:    neutral[100],
    muted:     neutral[200],
    brandSoft: brand[50],
    overlay:   'rgba(33,27,23,0.06)',
    backdrop:  'rgba(33,27,23,0.40)',
  },
  border: {
    subtle:    neutral[200],
    default:   neutral[300],
    strong:    neutral[400],
    brand:     brand[500],
    brandSoft: '#F8CDD5',
  },
} as const;

// ── 2. 타이포그래피 ────────────────────────────────────────────────────────
//
// weight는 4단계로 압축 (기존엔 500/600/700/800/900 다 등장).
// size/lineHeight는 모듈러 스케일 (1.2배).

export const typography = {
  weight: {
    regular: '400',
    medium:  '600',
    bold:    '700',
    heavy:   '800',
  },
  size: {
    xs:   11,
    sm:   12,
    base: 14,
    md:   15,
    lg:   17,
    xl:   20,
    '2xl': 24,
    '3xl': 28,
  },
  lineHeight: {
    xs:   14,
    sm:   16,
    base: 20,
    md:   22,
    lg:   24,
    xl:   28,
    '2xl': 32,
    '3xl': 36,
  },
  // 자주 쓰는 프리셋 (component에서 import해서 spread)
  preset: {
    h1:        { fontSize: 28, lineHeight: 36, fontWeight: '800' as const },
    h2:        { fontSize: 24, lineHeight: 32, fontWeight: '800' as const },
    h3:        { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
    title:     { fontSize: 17, lineHeight: 24, fontWeight: '700' as const },
    body:      { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    bodyBold:  { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
    label:     { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
    caption:   { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
    button:    { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  },
} as const;

// ── 3. 스페이싱 ───────────────────────────────────────────────────────────
//
// 4의 배수 기준. 페이지 padding, gap, margin 모두 이걸로 통일.

export const spacing = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// ── 4. Radius ─────────────────────────────────────────────────────────────
//
// 기존 radii는 deprecated. radius로 통합.
// 실측 패턴: 8(태그), 12(칩), 14(버튼), 18(인풋), 22(시트), pill(아바타).

export const radius = {
  none:    0,
  xs:      4,
  sm:      8,
  md:      12,
  base:    14,  // 기본 버튼/카드
  lg:      18,
  xl:      22,  // 바텀시트
  '2xl':   28,
  pill:    999,
} as const;

/** @deprecated use `radius` instead */
export const radii = {
  chip: 12,
  control: 18,
  panel: 18,
  button: 10,
};

// ── 5. Shadow ─────────────────────────────────────────────────────────────
//
// 화슐랭 그림자는 차가운 회색이 아니라 따뜻한 붉은 갈색 (#4A1A1F).
// elevation은 5단계로 정리.

const SHADOW_COLOR = '#4A1A1F';

export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  xl: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 10,
  },
} as const;

// ── 6. Motion ─────────────────────────────────────────────────────────────

export const motion = {
  duration: {
    fast:    150,
    base:    200,
    slow:    300,
    slowest: 450,
  },
  spring: {
    soft:     { bounciness: 4,  speed: 14 },
    standard: { bounciness: 8,  speed: 18 },
    bouncy:   { bounciness: 12, speed: 18 },
  },
} as const;

// ── 7. Hit Targets ────────────────────────────────────────────────────────
//
// 접근성 최소 터치 영역 = 44pt (Apple HIG) / 48dp (Material).

export const hitTarget = {
  min: 44,
  comfortable: 48,
} as const;

// ── 8. Z-Index Layers ─────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  1,
  sticky:  8,
  overlay: 10,
  sheet:   11,
  modal:   20,
  toast:   30,
} as const;

// ── 9. Theme bundle ───────────────────────────────────────────────────────

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  motion,
  hitTarget,
  zIndex,
} as const;

export type Theme = typeof theme;
