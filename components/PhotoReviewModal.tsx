import { useEffect, useRef } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useState } from 'react';
import { Review } from '../types/toilet';
import { colors } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  review: Review | null;
  initialIndex: number;
  onClose: () => void;
}

const CLEANLINESS_LABEL: Record<string, string> = {
  clean: '✨ 깨끗해요',
  normal: '😐 보통이에요',
  dirty: '🗑 지저분해요',
};

const SUPPLY_CHIPS: { key: string; trueLabel: string; falseLabel: string }[] = [
  { key: 'paper',        trueLabel: '🧻 휴지 있음',          falseLabel: '🧻 휴지 없음' },
  { key: 'soap',         trueLabel: '🧴 비누 있음',          falseLabel: '🧴 비누 없음' },
  { key: 'hand_dryer',   trueLabel: '💨 핸드드라이어 있음',  falseLabel: '💨 핸드드라이어 없음' },
  { key: 'bidet',        trueLabel: '🚽 비데 있음',          falseLabel: '🚽 비데 없음' },
  { key: 'hand_tissue',  trueLabel: '🤲 핸드티슈 있음',      falseLabel: '🤲 핸드티슈 없음' },
  { key: 'has_password', trueLabel: '🔒 비밀번호 있음',      falseLabel: '🔓 비밀번호 없음' },
];

export default function PhotoReviewModal({ review, initialIndex, onClose }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(initialIndex);
  const images = review?.image_urls ?? [];

  // review 또는 initialIndex 바뀔 때 초기 위치로 스크롤
  useEffect(() => {
    if (!review) return;
    setPage(initialIndex);
    // 마운트 직후 layout 끝나기를 기다림
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_W, animated: false });
    });
  }, [review?.id, initialIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_W);
    if (idx !== page) setPage(idx);
  };

  if (!review) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* 닫기 영역 — 사진/리뷰 외 빈 공간 탭 시 닫힘 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* 상단 헤더: 닫기 + 페이지 인디케이터 */}
        <View style={styles.topBar}>
          <Text style={styles.pageText}>
            {images.length > 0 ? `${page + 1} / ${images.length}` : ''}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 사진 가로 스와이프 */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          style={styles.scroll}
        >
          {images.map((url) => (
            <View key={url} style={styles.imageWrap}>
              <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>

        {/* 페이지 도트 (3장 이상일 때만) */}
        {images.length > 1 && (
          <View style={styles.dots} pointerEvents="none">
            {images.map((u, i) => (
              <View key={u} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
        )}

        {/* 하단 리뷰 정보 */}
        <View style={styles.reviewPanel}>
          <View style={styles.reviewHeaderRow}>
            <Text style={styles.reviewRating}>✿ {Number(review.rating).toFixed(1)}</Text>
            {review.is_verified && <Text style={styles.verifiedBadge}>✅ 현장 인증</Text>}
            <Text style={styles.reviewDate}>
              {new Date(review.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>

          {/* 청결 + 시설 칩 */}
          {((review as any).cleanliness_level ||
            SUPPLY_CHIPS.some(
              (c) =>
                (review as any)[c.key] === true || (review as any)[c.key] === false
            )) && (
            <View style={styles.chips}>
              {(review as any).cleanliness_level != null && (
                <View style={[styles.chip, styles.chipCleanliness]}>
                  <Text style={[styles.chipText, styles.chipTextCleanliness]}>
                    {CLEANLINESS_LABEL[(review as any).cleanliness_level] ??
                      (review as any).cleanliness_level}
                  </Text>
                </View>
              )}
              {SUPPLY_CHIPS.filter(
                (c) => (review as any)[c.key] === true || (review as any)[c.key] === false
              ).map((c) => {
                const val = (review as any)[c.key] as boolean;
                return (
                  <View key={c.key} style={[styles.chip, !val && styles.chipAbsent]}>
                    <Text style={[styles.chipText, !val && styles.chipTextAbsent]}>
                      {val ? c.trueLabel : c.falseLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {!!review.comment && (
            <Text style={styles.reviewComment} numberOfLines={4}>
              {review.comment}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  imageWrap: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: SCREEN_W, height: '100%' },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotOn: { backgroundColor: '#fff', width: 18 },

  // 하단 리뷰 패널
  reviewPanel: {
    backgroundColor: '#1A1517',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reviewRating: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand[500],
  },
  verifiedBadge: {
    fontSize: 11,
    color: '#86EFAC',
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 'auto',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(96,165,250,0.18)',
  },
  chipCleanliness: {
    backgroundColor: 'rgba(245,158,11,0.18)',
  },
  chipText: {
    fontSize: 11,
    color: '#BFDBFE',
    fontWeight: '700',
  },
  chipTextCleanliness: {
    color: '#FCD34D',
  },
  chipAbsent: {
    backgroundColor: 'rgba(248,113,113,0.15)',
  },
  chipTextAbsent: {
    color: '#FCA5A5',
  },
  reviewComment: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
});
