import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors } from '../constants/theme';
import { PlaceSearchResult } from '../lib/searchService';
import ToiletIcon from './ToiletIcon';

const SHEET_HEIGHT = 200;

interface Props {
  place: PlaceSearchResult | null;
  onClose: () => void;
  onRegister: () => void;
  onShowNearby: () => void;
}

export default function NoToiletSheet({ place, onClose, onRegister, onShowNearby }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(false);
  const visible = !!place;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setIsMounted(false);
      });
    }
  }, [visible, opacity, translateY]);

  if (!isMounted) return null;

  return (
    <>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        <View style={styles.body}>
          {/* 아이콘 + 텍스트 */}
          <View style={styles.iconWrap}>
            <ToiletIcon size={32} color={colors.orange} />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.placeName} numberOfLines={1}>{place?.name}</Text>
            <Text style={styles.message}>화장실 정보가 아직 등록되지 않았어요</Text>
          </View>

          <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 버튼 */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onShowNearby} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>근처 화장실 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={onRegister} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>🚽 화장실 등록하기</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33,27,23,0.06)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 14,
    left: 18,
    right: 18,
    height: SHEET_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingBottom: 18,
    zIndex: 11,
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8DCD7',
    alignSelf: 'center',
    marginTop: 9,
    marginBottom: 16,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4F6',
    alignSelf: 'flex-start',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.orange,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8DCD7',
    backgroundColor: '#FAFAFA',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.orange,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
