import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors } from '../constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');

export interface BottomSheetOption {
  key: string;
  label: string;
}

interface Props {
  visible: boolean;
  title?: string;
  options: BottomSheetOption[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

const SHEET_HIDE_OFFSET = SCREEN_H;
const CLOSE_THRESHOLD_PX = 80;
const CLOSE_THRESHOLD_VY = 0.5;

export default function BottomSheetMenu({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose,
}: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HIDE_OFFSET)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(false);

  // visible 변화에 따라 mount/animation 제어
  useEffect(() => {
    if (visible) {
      setIsMounted(true);
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
    } else if (isMounted) {
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
        if (finished) setIsMounted(false);
      });
    }
  }, [visible]);

  // 핸들 영역을 아래로 드래그하면 닫힘
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_THRESHOLD_PX || g.vy > CLOSE_THRESHOLD_VY) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  if (!isMounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* 백드롭 — 탭하면 닫힘 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        {/* 시트 */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* 드래그 핸들 영역 — 아래로 드래그하면 닫힘 */}
          <View {...panResponder.panHandlers} style={styles.handleZone}>
            <View style={styles.handle} />
            {title ? <Text style={styles.title}>{title}</Text> : null}
          </View>

          {/* 옵션 목록 */}
          {options.map((opt) => {
            const active = opt.key === selectedKey;
            return (
              <TouchableOpacity
                key={opt.key}
                style={styles.option}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {opt.label}
                </Text>
                {active && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF', // 진한 흰색 — 불투명
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 30,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
  },
  handleZone: {
    paddingBottom: 8,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6D2CE',
    marginVertical: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTertiary,
    marginTop: 4,
    marginBottom: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  optionText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.orange,
    fontWeight: '800',
  },
  checkmark: {
    fontSize: 18,
    color: colors.orange,
    fontWeight: '700',
  },
});
