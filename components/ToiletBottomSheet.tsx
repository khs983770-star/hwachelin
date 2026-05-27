import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { ToiletMarkerData } from '../types/toilet';
import { colors } from '../constants/theme';
import { getDistanceMeters } from '../lib/searchService';
import { checkIsBookmarked, toggleBookmark } from '../lib/bookmarkService';
import { requireLogin } from '../lib/authService';
import MarkerPinIcon from './MarkerPinIcon';
import HwachelinStars from './HwachelinStars';
import { showToast } from './Toast';

const SHEET_TRANSLATE_HIDE = 420; // 애니메이션용 오프스크린 값 (실제 높이보다 크면 됨)

interface Props {
  toilet: ToiletMarkerData | null;
  onClose: () => void;
  onDetailPress: (toilet: ToiletMarkerData) => void;
  onReviewPress: (toilet: ToiletMarkerData) => void;
  userLocation?: { lat: number; lng: number } | null;
}

async function openKakaoMap(lat: number, lng: number, name: string) {
  const encodedName = encodeURIComponent(name);
  const appUrl = `kakaomap://route?ep=${lat},${lng}&by=FOOT`;
  const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
  if (canOpen) {
    Linking.openURL(appUrl);
  } else {
    Linking.openURL(`https://map.kakao.com/link/to/${encodedName},${lat},${lng}`);
  }
}

async function openNaverMap(lat: number, lng: number, name: string) {
  const encodedName = encodeURIComponent(name);
  // appname 없이 시도 → 네이버지도 개발자 콘솔 미등록 시에도 동작
  const appUrl = `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodedName}&appname=com.hwachelin.app`;
  const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
  if (canOpen) {
    Linking.openURL(appUrl);
  } else {
    // 웹 폴백: /directions/{출발}/{목적지}/{예비}/-/walk
    Linking.openURL(`https://map.naver.com/v5/directions/-/${lng},${lat},${encodedName}/-/walk`);
  }
}

function openNavigation(toilet: ToiletMarkerData) {
  const { lat, lng, name } = toilet;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: '길찾기 앱 선택',
        message: '도보 기준으로 안내해 드려요 🚶',
        options: ['취소', '카카오맵', '네이버맵'],
        cancelButtonIndex: 0,
      },
      (index) => {
        if (index === 1) openKakaoMap(lat, lng, name);
        if (index === 2) openNaverMap(lat, lng, name);
      }
    );
  } else {
    // Android: Alert 폴백
    const { Alert } = require('react-native');
    Alert.alert('길찾기 앱 선택', '도보 기준으로 안내해 드려요 🚶', [
      { text: '카카오맵', onPress: () => openKakaoMap(lat, lng, name) },
      { text: '네이버맵', onPress: () => openNaverMap(lat, lng, name) },
      { text: '취소', style: 'cancel' },
    ]);
  }
}

export default function ToiletBottomSheet({ toilet, onClose, onDetailPress, onReviewPress, userLocation }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_TRANSLATE_HIDE)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  // 시트 열릴 때 북마크 상태 조회 (toilet 바뀔 때마다)
  useEffect(() => {
    if (!toilet) return;
    let active = true;
    (async () => {
      const v = await checkIsBookmarked(toilet.toilet_id);
      if (active) setIsBookmarked(v);
    })();
    return () => {
      active = false;
    };
  }, [toilet?.toilet_id]);

  const handleToggleBookmark = () => {
    if (!toilet || bookmarkBusy) return;
    requireLogin({
      message: '즐겨찾기를 저장하려면 3초 로그인이 필요해요!',
      onAuthed: async () => {
        setBookmarkBusy(true);
        const result = await toggleBookmark(toilet.toilet_id);
        setBookmarkBusy(false);
        if (!result.ok) {
          Alert.alert('저장 실패', result.message ?? '잠시 후 다시 시도해 주세요.');
          return;
        }
        setIsBookmarked(result.isBookmarked);
        showToast(
          result.isBookmarked ? '즐겨찾기에 저장되었어요.' : '즐겨찾기에서 해제되었어요.'
        );
      },
    });
  };

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
          toValue: SHEET_TRANSLATE_HIDE,
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
  const distanceText = (() => {
    if (!userLocation || !toilet) return null;
    const d = getDistanceMeters(userLocation.lat, userLocation.lng, toilet.lat, toilet.lng);
    return d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`;
  })();

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
            <MarkerPinIcon size={38} />
          </View>
          <View style={styles.headerLeft}>
            <Text style={styles.name} numberOfLines={1}>
              {toilet?.name ?? '화장실'}
            </Text>
            <View style={styles.metaRow}>
              {toilet?.avg_rating != null ? (
                <HwachelinStars rating={toilet.avg_rating} size={13} gap={1} />
              ) : (
                <Text style={styles.stars}>리뷰 없음</Text>
              )}
              <Text style={styles.metaText}>
                {reviewText || '첫 리뷰 대기'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleToggleBookmark}
              style={styles.bookmarkBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={bookmarkBusy}
            >
              <Text style={[styles.bookmarkIcon, isBookmarked && styles.bookmarkIconOn]}>
                {isBookmarked ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={2}>
          {toilet?.address ?? '주소 정보 없음'}
        </Text>

        <View style={styles.tags}>
          <View style={[styles.tagFill, { backgroundColor: typeColor }]}>
            <Text style={styles.tagFillText}>{toilet?.type}</Text>
          </View>
          {toilet?.gender_type != null && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {toilet.gender_type === '공용' ? '⚥ 공용' : '⚤ 남녀분리'}
              </Text>
            </View>
          )}
          {toilet?.access_type != null && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {accessIcon} {toilet.access_type}
              </Text>
            </View>
          )}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{ratingText}</Text>
          </View>
          {distanceText != null && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>📍 {distanceText}</Text>
            </View>
          )}
          {toilet?.disabled_available && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>♿ 장애인</Text>
            </View>
          )}
          {toilet?.has_diaper_table && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>🍼 기저귀교환대</Text>
            </View>
          )}
          {toilet?.emergency_bell && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>🔔 비상벨</Text>
            </View>
          )}
        </View>
        {toilet?.operating_hours != null && toilet.operating_hours !== '' && (
          <Text style={styles.hoursText} numberOfLines={1}>
            🕐 {toilet.operating_hours}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => { if (toilet) openNavigation(toilet); }}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>🚶 길찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => toilet && onDetailPress(toilet)}
          >
            <Text style={styles.detailBtnText}>상세보기 ›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => toilet && onReviewPress(toilet)}
          activeOpacity={0.85}
        >
          <Text style={styles.reviewBtnText}>✏️ 리뷰 작성하기</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.borderSecondary,
    alignSelf: 'center',
    marginTop: 9,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scorePill: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  headerLeft: { flex: 1, marginRight: 8 },
  name: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { fontSize: 12, color: colors.amber },
  metaText: { fontSize: 12, color: colors.textSecondary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookmarkBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4F6',
  },
  bookmarkIcon: {
    fontSize: 18,
    color: colors.orange,
    lineHeight: 20,
    includeFontPadding: false,
  } as any,
  bookmarkIconOn: { color: colors.orange },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4F6',
  },
  closeText: { fontSize: 16, color: colors.orange, fontWeight: '900' },
  address: { fontSize: 12, color: colors.textSecondary, marginBottom: 9, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 7 },
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
  hoursText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 10,
  },
  actions: { flexDirection: 'row', gap: 6 },
  outlineBtn: {
    flex: 1,
    borderRadius: 14,
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
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  reviewBtn: {
    marginTop: 6,
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  reviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
