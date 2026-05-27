import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors } from '../constants/theme';
import { PlaceSearchResult } from '../lib/searchService';
import ToiletIcon from './ToiletIcon';

interface Props {
  place: PlaceSearchResult | null;
  onClose: () => void;
  onRegister: () => void;
  onShowNearby: () => void;
}

export default function NoToiletSheet({ place, onClose, onRegister, onShowNearby }: Props) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (place) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.88, duration: 160, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
  }, [place, scale, opacity]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      <View style={styles.centeredWrap} pointerEvents="box-none">
        <Animated.View style={[styles.popup, { opacity, transform: [{ scale }] }]}>
          {/* 아이콘 */}
          <View style={styles.iconWrap}>
            <ToiletIcon size={36} color={colors.orange} />
          </View>

          {/* 텍스트 */}
          <Text style={styles.placeName} numberOfLines={2}>{place?.name}</Text>
          <Text style={styles.title}>화장실 정보가 없어요</Text>
          <Text style={styles.message}>
            다른 분들을 위해{'\n'}화장실 정보를 등록해주시겠어요?
          </Text>

          {/* 버튼 */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onShowNearby} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>근처 화장실 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={onRegister} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>🚽 화장실 등록하기</Text>
            </TouchableOpacity>
          </View>

          {/* 닫기 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33,27,23,0.45)',
  },
  centeredWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popup: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8DCD7',
    backgroundColor: '#FAFAFA',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.orange,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F0EE',
  },
  closeBtnText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '700',
  },
});
