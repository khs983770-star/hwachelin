import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenHeader from '../components/ScreenHeader';
import PhotoReviewModal from '../components/PhotoReviewModal';
import { getToiletDetail } from '../lib/toiletService';
import { deleteReview } from '../lib/reviewService';
import { requireLogin } from '../lib/authService';
import { showToast } from '../components/Toast';
import { toggleHelpful, getMyHelpfulReviewIds } from '../lib/helpfulService';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types/navigation';
import { Review } from '../types/toilet';
import { colors } from '../constants/theme';
import HwachelinStars from '../components/HwachelinStars';

type Props = NativeStackScreenProps<RootStackParamList, 'AllReviews'>;
type ToiletDetail = NonNullable<Awaited<ReturnType<typeof getToiletDetail>>>;

const CLEANLINESS_LABEL: Record<string, string> = {
  clean: '✨ 깨끗해요',
  normal: '😐 보통이에요',
  dirty: '🗑 지저분해요',
};
const MOOD_TAG_LABELS: Record<string, string> = {
  noSmell:         '냄새 없어요',
  brightLight:     '조명 밝아요',
  goodVentilation: '환기 잘 돼요',
  sturdyPartition: '칸막이 튼튼해요',
  crowded:         '사람 많아요',
  waitingLine:     '대기줄 있어요',
};
const SUPPLY_CHIPS: { key: string; trueLabel: string; falseLabel: string }[] = [
  { key: 'paper',        trueLabel: '🧻 휴지 있음',         falseLabel: '🧻 휴지 없음' },
  { key: 'soap',         trueLabel: '🧴 비누 있음',         falseLabel: '🧴 비누 없음' },
  { key: 'hand_dryer',   trueLabel: '💨 핸드드라이어 있음', falseLabel: '💨 핸드드라이어 없음' },
  { key: 'bidet',        trueLabel: '🚽 비데 있음',         falseLabel: '🚽 비데 없음' },
  { key: 'hand_tissue',  trueLabel: '🤲 핸드티슈 있음',     falseLabel: '🤲 핸드티슈 없음' },
  { key: 'has_password', trueLabel: '🔒 비밀번호 있음',     falseLabel: '🔓 비밀번호 없음' },
];

export default function AllReviewsScreen({ route, navigation }: Props) {
  const { toiletId, toiletName } = route.params;
  const [detail, setDetail] = useState<ToiletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [galleryView, setGalleryView] = useState<{ reviewId: string; imageIndex: number } | null>(null);
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [myHelpfulIds, setMyHelpfulIds] = useState<Set<string>>(new Set());
  const [helpfulBusy, setHelpfulBusy] = useState<Set<string>>(new Set());
  const [reviewSort, setReviewSort] = useState<'latest' | 'oldest' | 'popular'>('latest');

  const loadData = useCallback(async () => {
    const [{ data: sessionData }, data] = await Promise.all([
      supabase.auth.getSession(),
      getToiletDetail(toiletId),
    ]);
    setCurrentUserId(sessionData.session?.user.id ?? null);
    setDetail(data);
    if (data?.reviews?.length) {
      const counts: Record<string, number> = {};
      const ids: string[] = [];
      for (const r of data.reviews as Review[]) {
        counts[r.id] = (r as any).helpful_count ?? 0;
        ids.push(r.id);
      }
      setHelpfulCounts(counts);
      const mine = await getMyHelpfulReviewIds(ids);
      setMyHelpfulIds(mine);
    }
  }, [toiletId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadData().then(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleHelpful = (reviewId: string) => {
    if (helpfulBusy.has(reviewId)) return;
    requireLogin({
      message: '리뷰에 도움됐어요를 누르려면 3초 로그인이 필요해요!',
      onAuthed: async () => {
        const wasHelpful = myHelpfulIds.has(reviewId);
        setHelpfulBusy((s) => new Set(s).add(reviewId));
        setMyHelpfulIds((s) => {
          const next = new Set(s);
          if (wasHelpful) next.delete(reviewId); else next.add(reviewId);
          return next;
        });
        setHelpfulCounts((c) => ({
          ...c,
          [reviewId]: Math.max(0, (c[reviewId] ?? 0) + (wasHelpful ? -1 : 1)),
        }));
        const result = await toggleHelpful(reviewId);
        setHelpfulBusy((s) => { const next = new Set(s); next.delete(reviewId); return next; });
        if (!result.ok) {
          setMyHelpfulIds((s) => {
            const next = new Set(s);
            if (wasHelpful) next.add(reviewId); else next.delete(reviewId);
            return next;
          });
          setHelpfulCounts((c) => ({
            ...c,
            [reviewId]: Math.max(0, (c[reviewId] ?? 0) + (wasHelpful ? 1 : -1)),
          }));
          showToast(result.reason === 'SELF_REVIEW' ? '본인 리뷰에는 누를 수 없어요' : '잠시 후 다시 시도해 주세요');
          return;
        }
        showToast(result.isHelpful ? '도움됐어요를 남겼어요 👍' : '도움됐어요를 취소했어요');
      },
    });
  };

  const confirmDeleteReview = (reviewId: string) => {
    Alert.alert('리뷰를 삭제할까요?', '삭제한 리뷰는 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const result = await deleteReview(reviewId);
          if (!result.ok) { Alert.alert('삭제 실패', result.message); return; }
          await loadData();
        },
      },
    ]);
  };

  const reviews = useMemo(() => {
    if (!detail) return [];
    const base = [...(detail.reviews as Review[])];
    if (reviewSort === 'oldest') {
      return base.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    if (reviewSort === 'popular') {
      return base.sort((a, b) => {
        const diff = (helpfulCounts[b.id] ?? 0) - (helpfulCounts[a.id] ?? 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return base.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [detail, reviewSort, helpfulCounts]);
  const place = detail
    ? (Array.isArray(detail.places) ? detail.places[0] : detail.places)
    : null;

  const galleryReview = galleryView ? (reviews.find((r) => r.id === galleryView.reviewId) ?? null) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={`리뷰 전체 (${reviews.length}개)`}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.sortBar}>
        {(['latest', 'oldest', 'popular'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setReviewSort(s)}
            style={[styles.sortChip, reviewSort === s && styles.sortChipOn]}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortChipText, reviewSort === s && styles.sortChipTextOn]}>
              {s === 'latest' ? '최신순' : s === 'oldest' ? '오래된순' : '인기순'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.orange} />
          }
        >
          {reviews.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>아직 리뷰가 없어요</Text>
            </View>
          ) : (
            reviews.map((review) => {
              const isMine = currentUserId === review.user_id;
              return (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <HwachelinStars rating={review.rating} size={14} />
                    <Text style={styles.reviewRating}>{Number(review.rating).toFixed(1)}</Text>
                    {isMine && <Text style={styles.myReviewBadge}>내 리뷰</Text>}
                  </View>
                  {(review as any).cleanliness_level != null && (
                    <View style={styles.reviewChips}>
                      <View style={[styles.reviewChip, styles.reviewChipCleanliness]}>
                        <Text style={[styles.reviewChipText, styles.reviewChipTextCleanliness]}>
                          {CLEANLINESS_LABEL[(review as any).cleanliness_level] ?? (review as any).cleanliness_level}
                        </Text>
                      </View>
                    </View>
                  )}
                  {(() => {
                    const chips = SUPPLY_CHIPS.filter(
                      (c) => (review as any)[c.key] === true || (review as any)[c.key] === false
                    );
                    return chips.length > 0 ? (
                      <View style={styles.reviewChips}>
                        {chips.map((c) => {
                          const val = (review as any)[c.key] as boolean;
                          return (
                            <View key={c.key} style={[styles.reviewChip, !val && styles.reviewChipAbsent]}>
                              <Text style={[styles.reviewChipText, !val && styles.reviewChipTextAbsent]}>
                                {val ? c.trueLabel : c.falseLabel}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : null;
                  })()}
                  {(review as any).mood_tags?.length > 0 && (
                    <View style={styles.reviewChips}>
                      {((review as any).mood_tags as string[]).map((tag) => (
                        <View key={tag} style={[styles.reviewChip, styles.reviewChipMood]}>
                          <Text style={[styles.reviewChipText, styles.reviewChipTextMood]}>
                            {MOOD_TAG_LABELS[tag] ?? tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                  {review.image_urls?.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={() => setGalleryView({ reviewId: review.id, imageIndex: 0 })}
                      style={styles.reviewPhotoWrap}
                    >
                      <Image source={{ uri: review.image_urls[0] }} style={styles.reviewPhoto} />
                      {review.image_urls.length > 1 && (
                        <View style={styles.reviewPhotoBadge}>
                          <Text style={styles.reviewPhotoBadgeText}>📷 +{review.image_urls.length - 1}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  <View style={styles.reviewFooter}>
                    <Text style={styles.reviewMeta}>
                      {review.is_verified ? '✅ 현장 인증 · ' : ''}
                      {new Date(review.created_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </Text>
                    {!isMine && (
                      <TouchableOpacity
                        style={[styles.helpfulBtn, myHelpfulIds.has(review.id) && styles.helpfulBtnOn]}
                        onPress={() => handleToggleHelpful(review.id)}
                        activeOpacity={0.7}
                        disabled={helpfulBusy.has(review.id)}
                      >
                        <Text style={[styles.helpfulBtnText, myHelpfulIds.has(review.id) && styles.helpfulBtnTextOn]}>
                          👍 도움됐어요 {helpfulCounts[review.id] ?? 0}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {isMine && (helpfulCounts[review.id] ?? 0) > 0 && (
                      <View style={[styles.helpfulBtn, styles.helpfulBtnMine]}>
                        <Text style={styles.helpfulBtnTextMine}>👍 {helpfulCounts[review.id]}</Text>
                      </View>
                    )}
                  </View>
                  {isMine && (
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        style={styles.reviewActionButton}
                        onPress={() =>
                          navigation.navigate('ReviewWrite', {
                            toiletId,
                            toiletName: toiletName ?? place?.name ?? '화장실',
                            reviewId: review.id,
                            initialRating: review.rating,
                            initialCleanlinessLevel: (review as any).cleanliness_level ?? null,
                            initialPaper: review.paper,
                            initialSoap: review.soap,
                            initialHandDryer: (review as any).hand_dryer ?? null,
                            initialHandTissue: (review as any).hand_tissue ?? null,
                            initialHasPassword: (review as any).has_password ?? null,
                            initialMoodTags: (review as any).mood_tags ?? [],
                            initialComment: review.comment ?? '',
                            toiletLat: place?.lat,
                            toiletLng: place?.lng,
                          })
                        }
                      >
                        <Text style={styles.reviewActionText}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewActionButton, styles.reviewDeleteButton]}
                        onPress={() => confirmDeleteReview(review.id)}
                      >
                        <Text style={[styles.reviewActionText, styles.reviewDeleteText]}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
      <PhotoReviewModal
        review={galleryReview}
        initialIndex={galleryView?.imageIndex ?? 0}
        onClose={() => setGalleryView(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: colors.textTertiary },
  reviewCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reviewRating: { fontSize: 14, color: colors.amber, fontWeight: '700', marginRight: 'auto' },
  myReviewBadge: {
    fontSize: 11, color: colors.orange, fontWeight: '700',
    backgroundColor: '#FFF0E9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  reviewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  reviewChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1',
  },
  reviewChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  reviewChipAbsent: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  reviewChipTextAbsent: { color: '#BE123C', fontWeight: '700' },
  reviewChipCleanliness: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', borderWidth: 1 },
  reviewChipTextCleanliness: { color: '#6D28D9' },
  reviewChipMood: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1 },
  reviewChipTextMood: { color: '#C2410C' },
  reviewComment: { fontSize: 13, lineHeight: 19, color: colors.textPrimary, marginBottom: 7 },
  reviewPhotoWrap: { marginBottom: 8, position: 'relative', alignSelf: 'flex-start' },
  reviewPhoto: { width: 110, height: 110, borderRadius: 8 },
  reviewPhotoBadge: {
    position: 'absolute', bottom: 5, right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  reviewPhotoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  reviewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  reviewMeta: { fontSize: 11, color: colors.textTertiary },
  helpfulBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: colors.borderSecondary,
    backgroundColor: '#fff',
  },
  helpfulBtnOn: { borderColor: colors.orange, backgroundColor: '#FFF0E9' },
  helpfulBtnMine: { borderColor: colors.borderSecondary, backgroundColor: '#F8F8F8' },
  helpfulBtnText: { fontSize: 12, color: colors.textSecondary },
  helpfulBtnTextOn: { color: colors.orange, fontWeight: '700' },
  helpfulBtnTextMine: { fontSize: 12, color: colors.textSecondary },
  reviewActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reviewActionButton: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, borderColor: colors.borderSecondary,
    backgroundColor: '#fff',
  },
  reviewDeleteButton: { borderColor: '#FECDD3', backgroundColor: '#FFF1F2' },
  reviewActionText: { fontSize: 12, color: colors.textSecondary },
  reviewDeleteText: { color: '#BE123C' },
  sortBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
    backgroundColor: '#fff',
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    backgroundColor: '#fff',
  },
  sortChipOn: { borderColor: colors.orange, backgroundColor: '#FFF0E9' },
  sortChipText: { fontSize: 13, color: colors.textSecondary },
  sortChipTextOn: { color: colors.orange, fontWeight: '700' },
});
