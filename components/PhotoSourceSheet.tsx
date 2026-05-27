import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HIDE_OFFSET = SCREEN_H;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectLibrary: () => void;
}

export default function PhotoSourceSheet({
  visible,
  onClose,
  onSelectCamera,
  onSelectLibrary,
}: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HIDE_OFFSET)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HIDE_OFFSET,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  if (!mounted) return null;

  const fire = (handler: () => void) => () => {
    onClose();
    setTimeout(handler, 80);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm,
            },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>사진 추가</Text>
          <Text style={styles.subtitle}>리뷰에 사진을 함께 올려보세요</Text>

          <View style={styles.actions}>
            <ActionCard
              icon="📷"
              iconBg={colors.brand[50]}
              title="카메라로 촬영"
              description="지금 바로 사진을 찍어요"
              onPress={fire(onSelectCamera)}
            />
            <ActionCard
              icon="🖼"
              iconBg={colors.bg.subtle}
              title="갤러리에서 선택"
              description="저장된 사진 중에서 골라요"
              onPress={fire(onSelectLibrary)}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ActionCardProps {
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  onPress: () => void;
}

function ActionCard({ icon, iconBg, title, description, onPress }: ActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Text style={styles.iconText} allowFontScaling={false}>
          {icon}
        </Text>
      </View>
      <View style={styles.cardTexts}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      <Text style={styles.chevron} allowFontScaling={false}>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.backdrop,
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: spacing.xl,
    ...shadow.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.strong,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: typography.weight.heavy as TextStyle['fontWeight'],
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  cardPressed: {
    backgroundColor: colors.bg.subtle,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 24,
    lineHeight: 28,
    includeFontPadding: false,
  } as TextStyle,
  cardTexts: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold as TextStyle['fontWeight'],
    color: colors.text.primary,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.secondary,
  },
  chevron: {
    fontSize: 26,
    lineHeight: 28,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
    fontWeight: '300',
    includeFontPadding: false,
  } as TextStyle,
  cancel: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.base,
    backgroundColor: colors.bg.subtle,
  },
  cancelPressed: {
    backgroundColor: colors.bg.muted,
  },
  cancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold as TextStyle['fontWeight'],
    color: colors.text.secondary,
  },
});
