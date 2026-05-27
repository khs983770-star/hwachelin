// ─────────────────────────────────────────────────────────────────────────
// 화슐랭 공통 Button 컴포넌트
//
// variant:
//   primary   브랜드 빨강 솔리드 (CTA 1순위)
//   secondary 흰 배경 + 옅은 테두리 (CTA 2순위)
//   outline   투명 + 브랜드 테두리
//   ghost     테두리 없는 텍스트 버튼
//   danger    경고/삭제 (intent.error)
//
// size: sm | md | lg
//
// 사용 예:
//   <Button variant="primary" size="md" onPress={...}>리뷰 작성하기</Button>
//   <Button variant="outline" leadingIcon={<Icon name="walk" />}>길찾기</Button>
// ─────────────────────────────────────────────────────────────────────────

import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leadingIcon,
  trailingIcon,
  style,
  textStyle,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        s.container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && v.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      hitSlop={size === 'sm' ? { top: 4, bottom: 4 } : undefined}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.spinner} />
      ) : (
        <View style={styles.row}>
          {leadingIcon ? <View style={{ marginRight: spacing.sm }}>{leadingIcon}</View> : null}
          <Text style={[s.label, v.label, textStyle]}>{children}</Text>
          {trailingIcon ? <View style={{ marginLeft: spacing.sm }}>{trailingIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

// ── 공통 ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.42,
  },
});

// ── 사이즈별 ──────────────────────────────────────────────────────────────
const SIZE_STYLES: Record<ButtonSize, { container: ViewStyle; label: TextStyle }> = {
  sm: {
    container: {
      minHeight: 36,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    label: {
      fontSize: typography.size.sm,
      lineHeight: typography.lineHeight.sm,
      fontWeight: typography.weight.bold as TextStyle['fontWeight'],
    },
  },
  md: {
    container: {
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    label: {
      fontSize: typography.size.base,
      lineHeight: typography.lineHeight.base,
      fontWeight: typography.weight.bold as TextStyle['fontWeight'],
    },
  },
  lg: {
    container: {
      minHeight: 52,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
    },
    label: {
      fontSize: typography.size.md,
      lineHeight: typography.lineHeight.md,
      fontWeight: typography.weight.heavy as TextStyle['fontWeight'],
    },
  },
};

// ── variant별 ─────────────────────────────────────────────────────────────
const VARIANT_STYLES: Record<
  ButtonVariant,
  { container: ViewStyle; label: TextStyle; pressed: ViewStyle; spinner: string }
> = {
  primary: {
    container: {
      backgroundColor: colors.brand[500],
      ...shadow.sm,
    },
    label: { color: colors.text.inverse },
    pressed: { backgroundColor: colors.brand[600] },
    spinner: colors.text.inverse,
  },
  secondary: {
    container: {
      backgroundColor: colors.bg.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.default,
      ...shadow.sm,
    },
    label: { color: colors.text.primary },
    pressed: { backgroundColor: colors.bg.subtle },
    spinner: colors.text.primary,
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.brand[500],
    },
    label: { color: colors.brand[500] },
    pressed: { backgroundColor: colors.brand[50] },
    spinner: colors.brand[500],
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    label: { color: colors.text.primary },
    pressed: { backgroundColor: colors.bg.subtle },
    spinner: colors.text.primary,
  },
  danger: {
    container: {
      backgroundColor: colors.semantic.error[500],
      ...shadow.sm,
    },
    label: { color: colors.text.inverse },
    pressed: { backgroundColor: colors.semantic.error[700] },
    spinner: colors.text.inverse,
  },
};
