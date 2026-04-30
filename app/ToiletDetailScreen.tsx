import { useCallback, useLayoutEffect, useState } from 'react';
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
import { getToiletDetail } from '../lib/toiletService';
import { deleteReview } from '../lib/reviewService';
import { checkIsBookmarked, toggleBookmark } from '../lib/bookmarkService';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types/navigation';
import { Review } from '../types/toilet';
import { colors } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ToiletDetail'>;

type ToiletDetail = NonNullable<Awaited<ReturnType<typeof getToiletDetail>>>;

export default function ToiletDetailScreen({ route, navigation }: Props) {
  const { toiletId } = route.params;
  const [detail, setDetail] = useState<ToiletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 헤더 오른쪽에 북마크 버튼
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleToggleBookmark}
          style={{ marginRight: 4, padding: 6 }}
        >
          <Text style={{ fontSize: 22, opacity: isBookmarked ? 1 : 0.4 }}>🔖</Text>
        </TouchableOpacity>
      ),
    });
  }, [isBookmarked, navigation]);

  const handleToggleBookmark = async () => {
    const result = await toggleBookmark(toiletId);
    if (!result.ok) {
      if (result.reason === 'NOT_LOGGED_IN') {
        Alert.alert('로그인 필요', '저장하려면 카카오 로그인이 필요해요.');
      }
      return;
    }
    setIsBookmarked(result.isBookmarked);
  };

  const loadDetail = useCallback(async () => {
    const data = await getToiletDetail(toiletId);
    setDetail(data);
  }, [toiletId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        setLoading(true);
        const [{ data: sessionData }, data, bookmarked] = await Promise.all([
          supabase.auth.getSession(),
          getToiletDetail(toiletId),
          checkIsBookmarked(toiletId),
        ]);
        if (!active) return;
        setCurrentUserId(sessionData.session?.user.id ?? null);
        setDetail(data);
        setIsBookmarked(bookmarked);
        setLoading(false);
      })();

      return () => {
        active = false;
      };
    }, [toiletId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDetail();
    setRefreshing(false);
  };

  const confirmDeleteReview = (reviewId: string) => {
    Alert.alert('리뷰를 삭제할까요?', '삭제한 리뷰는 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteReview(reviewId);
          if (!result.ok) {
            Alert.alert('삭제 실패', result.message);
            return;
          }
          await loadDetail();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={styles.loadingText}>상세 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>화장실 정보를 찾을 수 없어요</Text>
        <Text style={styles.emptyText}>잠시 후 다시 시도해 주세요.</Text>
      </View>
    );
  }

  const place = Array.isArray(detail.places) ? detail.places[0] : detail.places;
  const ratingText = detail.avg_rating != null ? detail.avg_rating.toFixed(1) : '-';
  const reviewCount = detail.review_count ?? 0;
  const reviews = detail.reviews as Review[];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.orange} />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{detail.type} 화장실</Text>
        <Text style={styles.title}>{place?.name ?? '화장실'}</Text>
        <Text style={styles.address}>{place?.address ?? '주소 정보 없음'}</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{ratingText}</Text>
            <Text style={styles.summaryLabel}>평점</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{reviewCount}</Text>
            <Text style={styles.summaryLabel}>리뷰</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{detail.access_type}</Text>
            <Text style={styles.summaryLabel}>이용</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기본 정보</Text>
        <View style={styles.facGrid}>
          <InfoTile icon="↕" label="층수" value={detail.floor || '정보 없음'} />
          <InfoTile icon="⚥" label="성별 구분" value={detail.gender_type || '정보 없음'} />
          <InfoTile icon="🔓" label="이용 조건" value={detail.access_type || '정보 없음'} />
          <InfoTile
            icon="✓"
            label="데이터 출처"
            value={place?.source === 'public' ? '공공데이터' : '사용자 제보'}
          />
          {!!detail.operating_hours && (
            <InfoTile icon="🕐" label="운영시간" value={detail.operating_hours} />
          )}
          {detail.is_24hours && (
            <InfoTile icon="24" label="24시간" value="24시간 운영" />
          )}
          {detail.has_diaper_table && (
            <InfoTile icon="👶" label="기저귀교환대" value="있음" />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>리뷰 요약</Text>
        {reviewCount > 0 ? (
          <>
            <InfoRow label="청결" value={countPositive(reviews, 'cleanliness')} />
            <InfoRow label="휴지" value={countPositive(reviews, 'paper')} />
            <InfoRow label="비누" value={countPositive(reviews, 'soap')} />
            <InfoRow label="안심" value={countPositive(reviews, 'security')} />
          </>
        ) : (
          <Text style={styles.mutedText}>아직 리뷰가 없어요. 첫 리뷰를 남겨보세요.</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate('ReviewWrite', {
            toiletId,
            toiletName: place?.name ?? '화장실',
            toiletLat: place?.lat,
            toiletLng: place?.lng,
          })
        }
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>리뷰 작성하기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() =>
          navigation.navigate('Report', {
            toiletId,
            placeName: place?.name ?? '화장실',
            address: place?.address,
            lat: place?.lat,
            lng: place?.lng,
            reportType: 'correction',
          })
        }
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>정보 수정 제보</Text>
      </TouchableOpacity>

      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>리뷰</Text>
          {reviews.map((review) => {
            const isMine = currentUserId === review.user_id;
            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewRating}>★ {Number(review.rating).toFixed(1)}</Text>
                  {isMine && <Text style={styles.myReviewBadge}>내 리뷰</Text>}
                </View>
                {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                {review.image_urls?.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.reviewImageRow}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {review.image_urls.map((url, i) => (
                      <Image
                        key={url + i}
                        source={{ uri: url }}
                        style={styles.reviewImage}
                      />
                    ))}
                  </ScrollView>
                )}
                <Text style={styles.reviewMeta}>
                  {review.is_verified ? '✅ 현장 인증' : '일반 리뷰'} ·{' '}
                  {new Date(review.created_at).toLocaleDateString('ko-KR')}
                </Text>
                {isMine && (
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.reviewActionButton}
                      onPress={() =>
                        navigation.navigate('ReviewWrite', {
                          toiletId,
                          toiletName: place?.name ?? '화장실',
                          reviewId: review.id,
                          initialRating: review.rating,
                          initialCleanliness: review.cleanliness,
                          initialPaper: review.paper,
                          initialSoap: review.soap,
                          initialSecurity: review.security,
                          initialBidet: review.bidet,
                          initialComment: review.comment ?? '',
                          initialImageUrls: review.image_urls ?? [],
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
          })}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.facItem}>
      <Text style={styles.facIcon}>{icon}</Text>
      <View style={styles.facTextWrap}>
        <Text style={styles.facLabel}>{label}</Text>
        <Text style={styles.facValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function countPositive(
  reviews: Pick<Review, 'cleanliness' | 'paper' | 'soap' | 'security'>[],
  key: 'cleanliness' | 'paper' | 'soap' | 'security'
) {
  const count = reviews.filter((review) => review[key]).length;
  return `${count}/${reviews.length}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 16, paddingBottom: 36 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textSecondary },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  hero: {
    borderRadius: 18,
    backgroundColor: '#FFF3EC',
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(229,91,38,0.22)',
  },
  eyebrow: { fontSize: 12, color: colors.orange, fontWeight: '700', marginBottom: 7 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 7 },
  address: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 14 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 14,
    paddingVertical: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: colors.textTertiary },
  divider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: colors.borderTertiary },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  facGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  facItem: {
    width: '48.9%',
    minHeight: 58,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  facIcon: { fontSize: 15, color: colors.orange },
  facTextWrap: { flex: 1, minWidth: 0 },
  facLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  facValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', maxWidth: '62%', textAlign: 'right' },
  mutedText: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  primaryButton: {
    backgroundColor: colors.orange,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  reviewCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewRating: { fontSize: 14, color: colors.amber, fontWeight: '700' },
  myReviewBadge: {
    fontSize: 11,
    color: colors.orange,
    fontWeight: '700',
    backgroundColor: '#FFF0E9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  reviewComment: { fontSize: 13, lineHeight: 19, color: colors.textPrimary, marginBottom: 7 },
  reviewImageRow: { marginBottom: 7 },
  reviewImage: { width: 80, height: 80, borderRadius: 8 },
  reviewMeta: { fontSize: 11, color: colors.textTertiary },
  reviewActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reviewActionButton: {
    minWidth: 56,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  reviewDeleteButton: { borderColor: 'rgba(210,65,52,0.35)' },
  reviewActionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  reviewDeleteText: { color: '#D24134' },
});
