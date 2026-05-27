import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors } from '../constants/theme';
import { getDistanceMeters } from '../lib/searchService';
import { ToiletMarkerData } from '../types/toilet';
import MarkerPinIcon from './MarkerPinIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SHEET_HEIGHT = Math.min(430, SCREEN_HEIGHT * 0.56);
const HEADER_HEIGHT = 79; // handle(28) + title+subtitle+marginBottom(51)
const ITEM_HEIGHT = 82;   // row minHeight(82) — paddingVertical은 minHeight 안에 포함
const BOTTOM_PAD = 20;

type Props = {
  toilets: ToiletMarkerData[];
  center: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number } | null;
  onClose: () => void;
  onSelectToilet: (toilet: ToiletMarkerData) => void;
  onDetailPress: (toilet: ToiletMarkerData) => void;
};

export default function ClusterBottomSheet({
  toilets,
  center,
  userLocation,
  onClose,
  onSelectToilet,
  onDetailPress,
}: Props) {
  const translateY = useRef(new Animated.Value(MAX_SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(false);
  const visible = toilets.length > 0;

  const refPoint = userLocation ?? center;

  const sortedToilets = useMemo(
    () =>
      [...toilets].sort((a, b) => {
        const distanceA = getDistanceMeters(refPoint.lat, refPoint.lng, a.lat, a.lng);
        const distanceB = getDistanceMeters(refPoint.lat, refPoint.lng, b.lat, b.lng);
        return distanceA - distanceB;
      }),
    [refPoint.lat, refPoint.lng, toilets]
  );

  const sheetHeight = Math.min(
    HEADER_HEIGHT + sortedToilets.length * ITEM_HEIGHT + BOTTOM_PAD,
    MAX_SHEET_HEIGHT
  );

  useEffect(() => {
    if (visible) {
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
          toValue: MAX_SHEET_HEIGHT,
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
  }, [opacity, translateY, visible]);

  if (!isMounted) return null;

  return (
    <>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { height: sheetHeight, transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>이 지역 화장실 {sortedToilets.length}개</Text>
            <Text style={styles.subtitle}>가까운 순으로 정렬했어요</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>x</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sortedToilets.map((toilet) => {
            const distance = userLocation
              ? getDistanceMeters(userLocation.lat, userLocation.lng, toilet.lat, toilet.lng)
              : null;
            const distanceText = distance == null
              ? null
              : distance >= 1000
                ? `${(distance / 1000).toFixed(1)}km`
                : `${Math.round(distance)}m`;
            const ratingText =
              toilet.avg_rating != null ? toilet.avg_rating.toFixed(1) : '리뷰 없음';
            const reviewText =
              toilet.review_count != null && toilet.review_count > 0
                ? `리뷰 ${toilet.review_count}`
                : '첫 리뷰 대기';

            return (
              <TouchableOpacity
                key={toilet.toilet_id}
                style={styles.row}
                onPress={() => onSelectToilet(toilet)}
                activeOpacity={0.84}
              >
                <View style={styles.scoreBox}>
                  <MarkerPinIcon size={28} />
                </View>
                <View style={styles.rowMain}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {toilet.name}
                    </Text>
                    {distanceText != null && (
                      <Text style={styles.distance}>{distanceText}</Text>
                    )}
                  </View>
                  <Text style={styles.address} numberOfLines={1}>
                    {toilet.address}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{toilet.type}</Text>
                    <Text style={styles.meta}>★ {ratingText}</Text>
                    <Text style={styles.meta}>{reviewText}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => onDetailPress(toilet)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.detailButtonText}>상세</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33,27,23,0.14)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,253,251,0.98)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: { fontSize: 17, color: colors.textPrimary, fontWeight: '800' },
  subtitle: { marginTop: 3, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  closeText: { fontSize: 17, color: colors.textTertiary, fontWeight: '800' },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  row: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderTertiary,
  },
  scoreBox: {
    width: 44,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowMain: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '800' },
  distance: { fontSize: 11, color: colors.textTertiary, fontWeight: '800' },
  address: { marginTop: 3, fontSize: 11, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  meta: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.backgroundSecondary,
  },
  detailButton: {
    width: 42,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
  },
  detailButtonText: { fontSize: 11, color: '#fff', fontWeight: '800' },
});
