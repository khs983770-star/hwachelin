import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

const MARKER_PIN = require('../assets/marker-pin.png');

const ACTIVE_RED = '#E50914';

type CustomMarkerProps = {
  rating?: number | null;
  isSelected?: boolean;
  hasToiletInfo?: boolean;
  rank?: number | null; // 급해요 모드: 1, 2, 3 넘버링
};

export default function CustomMarker({
  rating,
  isSelected = false,
  hasToiletInfo = true,
  rank,
}: CustomMarkerProps) {
  const scale = useRef(new Animated.Value(isSelected ? 1.2 : 1)).current;
  const isInactive = !hasToiletInfo || rating == null;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1.2 : 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 8,
    }).start();
  }, [isSelected, scale]);

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      {rank != null ? (
        // 급해요 모드: 숫자 뱃지
        <View style={[styles.rankBadge, isSelected && styles.rankBadgeSelected]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      ) : !isInactive ? (
        // 일반 모드: 평점 뱃지
        <View style={[styles.ratingBadge, isSelected && styles.ratingBadgeSelected]}>
          <Text style={styles.ratingText}>{rating!.toFixed(1)}</Text>
        </View>
      ) : null}
      <Image
        source={MARKER_PIN}
        style={[
          styles.pinImg,
          isInactive && rank == null && styles.pinImgInactive,
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export function CustomClusterMarker({ count }: { count: number }) {
  return (
    <View style={styles.cluster}>
      <Text style={styles.clusterText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: {
    width: 58,
    height: 72,
    alignItems: 'center',
  },
  pinImg: {
    width: 54,
    height: 54,
  },

  pinImgInactive: {
    opacity: 0.45,
  },
  ratingBadge: {
    minWidth: 39,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    marginBottom: -3,
    zIndex: 3,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  ratingBadgeSelected: {
    shadowOpacity: 0.24,
    shadowRadius: 9,
  },
  ratingText: {
    color: ACTIVE_RED,
    fontSize: 13,
    fontWeight: '900',
  },
  rankBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginBottom: -3,
    zIndex: 3,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  rankBadgeSelected: {
    shadowOpacity: 0.32,
    shadowRadius: 9,
    backgroundColor: '#B00010',
  },
  rankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  cluster: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: ACTIVE_RED,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 7,
  },
  clusterText: {
    color: ACTIVE_RED,
    fontSize: 15,
    fontWeight: '900',
  },
});
