import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { ToiletMarkerData } from '../types/toilet';
import { colors } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 238;

interface Props {
  toilet: ToiletMarkerData | null;
  onClose: () => void;
  onDetailPress: (toilet: ToiletMarkerData) => void;
}

async function openNavigation(toilet: ToiletMarkerData) {
  const { lat, lng, name } = toilet;
  const encodedName = encodeURIComponent(name);

  // 1순위: 카카오맵 앱 딥링크
  const kakaoAppUrl = `kakaomap://route?ep=${lat},${lng}&by=FOOT`;
  const canOpenKakao = await Linking.canOpenURL(kakaoAppUrl).catch(() => false);
  if (canOpenKakao) {
    Linking.openURL(kakaoAppUrl);
    return;
  }

  // 2순위: iOS Apple 지도 / Android 구글 지도
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?daddr=${lat},${lng}&dirflg=w`);
    return;
  }
  const googleUrl = `google.navigation:q=${lat},${lng}`;
  const canOpenGoogle = await Linking.canOpenURL(googleUrl).catch(() => false);
  if (canOpenGoogle) {
    Linking.openURL(googleUrl);
    return;
  }

  // 3순위: 카카오맵 웹
  Linking.openURL(`https://map.kakao.com/link/to/${encodedName},${lat},${lng}`);
}

export default function ToiletBottomSheet({ toilet, onClose, onDetailPress }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (toilet) {
      setIsMounted(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setIsMounted(false);
      });
    }
  }, [toilet]);

  if (!isMounted) return null;

  const accessIcon =
    toilet?.access_type === '누구나' ? '🔓' : toilet?.access_type === '손님만' ? '🛒' : '🔒';

  const typeColor = toilet?.type === '공공' ? colors.blue : colors.orange;

  const ratingText =
    toilet?.avg_rating != null ? `⭐ ${toilet.avg_rating.toFixed(1)}` : '리뷰 없음';

  const reviewText =
    toilet?.review_count != null && toilet.review_count > 0
      ? `(${toilet.review_count}개)`
      : '';

  return (
    <>
      {/* 딤 배경 */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* 바텀 시트 */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
      >
        {/* 핸들 */}
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>
              {toilet?.avg_rating != null ? toilet.avg_rating.toFixed(1) : 'WC'}
            </Text>
          </View>
          <View style={styles.headerLeft}>
            <Text style={styles.name} numberOfLines={1}>
              {toilet?.name ?? '화장실'}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.stars}>
                {toilet?.avg_rating != null ? '★★★★★' : '리뷰 없음'}
              </Text>
              <Text style={styles.metaText}>
                {reviewText || '첫 리뷰 대기'} · {toilet?.type}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.address} numberOfLines={2}>
          {toilet?.address ?? '주소 정보 없음'}
        </Text>

        <View style={styles.tags}>
          <View style={[styles.tagFill, { backgroundColor: typeColor }]}>
            <Text style={styles.tagFillText}>{toilet?.type}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {accessIcon} {toilet?.access_type}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{ratingText}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => toilet && openNavigation(toilet)}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>🗺️ 길찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => toilet && onDetailPress(toilet)}
          >
            <Text style={styles.detailBtnText}>상세보기 ›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33,27,23,0.18)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: 'rgba(255,253,251,0.98)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 24,
    zIndex: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSecondary,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scorePill: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scoreText: { fontSize: 18, color: colors.orange, fontWeight: '700' },
  headerLeft: { flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { fontSize: 12, color: colors.amber },
  metaText: { fontSize: 12, color: colors.textSecondary },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  closeText: { fontSize: 16, color: colors.textTertiary },
  address: { fontSize: 12, color: colors.textSecondary, marginBottom: 9, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  tagFill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagFillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    backgroundColor: colors.backgroundPrimary,
  },
  tagText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 6 },
  outlineBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
  },
  outlineBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  detailBtn: {
    flex: 2,
    backgroundColor: colors.orange,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
