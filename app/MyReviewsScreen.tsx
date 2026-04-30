import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { deleteReview } from '../lib/reviewService';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types/navigation';

type SortKey = 'latest' | 'rating_high' | 'rating_low';

interface MyReview {
  id: string;
  toilet_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  placeName: string;
  address: string;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'latest', label: '최신순' },
  { key: 'rating_high', label: '별점 높은순' },
  { key: 'rating_low', label: '별점 낮은순' },
];

export default function MyReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('latest');

  const loadReviews = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        toilet_id,
        rating,
        comment,
        is_verified,
        created_at,
        toilets (
          places (
            name,
            address
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(
        (data as any[]).map((row) => {
          const toilet = Array.isArray(row.toilets) ? row.toilets[0] : row.toilets;
          const place = Array.isArray(toilet?.places) ? toilet.places[0] : toilet?.places;
          return {
            id: row.id,
            toilet_id: row.toilet_id,
            rating: Number(row.rating),
            comment: row.comment,
            is_verified: row.is_verified,
            created_at: row.created_at,
            placeName: place?.name ?? '화장실',
            address: place?.address ?? '',
          };
        })
      );
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReviews();
    }, [loadReviews])
  );

  const sorted = useMemo(() => {
    const copy = [...reviews];
    if (sort === 'rating_high') return copy.sort((a, b) => b.rating - a.rating);
    if (sort === 'rating_low') return copy.sort((a, b) => a.rating - b.rating);
    return copy; // latest — already sorted from DB
  }, [reviews, sort]);

  const handleDelete = (review: MyReview) => {
    Alert.alert('리뷰 삭제', `'${review.placeName}'의 리뷰를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteReview(review.id);
          if (result.ok) {
            setReviews((prev) => prev.filter((r) => r.id !== review.id));
          } else {
            Alert.alert('삭제 실패', result.message);
          }
        },
      },
    ]);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={[styles.star, i < Math.round(rating) && styles.starOn]}>
        ★
      </Text>
    ));
  };

  return (
    <View style={styles.container}>
      {/* 정렬 탭 */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortChip, sort === opt.key && styles.sortChipOn]}
            onPress={() => setSort(opt.key)}
          >
            <Text style={[styles.sortText, sort === opt.key && styles.sortTextOn]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={styles.totalCount}>{reviews.length}개</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.orange} />
            <Text style={styles.centerText}>리뷰를 불러오는 중...</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✏️</Text>
            <Text style={styles.emptyTitle}>아직 작성한 리뷰가 없어요</Text>
            <Text style={styles.emptyText}>
              화장실을 이용하고 솔직한 리뷰를 남겨보세요!
            </Text>
          </View>
        ) : (
          sorted.map((review) => (
            <TouchableOpacity
              key={review.id}
              style={styles.card}
              activeOpacity={0.84}
              onPress={() =>
                navigation.navigate('ToiletDetail', { toiletId: review.toilet_id })
              }
            >
              {/* 헤더: 장소명 + 별점 */}
              <View style={styles.cardHeader}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {review.placeName}
                </Text>
                <View style={styles.starRow}>{renderStars(review.rating)}</View>
              </View>

              {/* 주소 */}
              <Text style={styles.address} numberOfLines={1}>
                {review.address}
              </Text>

              {/* 코멘트 */}
              {!!review.comment && (
                <Text style={styles.comment} numberOfLines={2}>
                  "{review.comment}"
                </Text>
              )}

              {/* 메타 + 액션 */}
              <View style={styles.cardFooter}>
                <Text style={styles.meta}>
                  {review.is_verified ? '✅ 현장 인증 · ' : ''}
                  {new Date(review.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(review)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
    backgroundColor: colors.backgroundPrimary,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  sortChipOn: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  sortText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  sortTextOn: { color: '#fff' },
  totalCount: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },
  content: { padding: 16 },
  center: { alignItems: 'center', paddingTop: 60, gap: 10 },
  centerText: { fontSize: 13, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  placeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  starRow: { flexDirection: 'row', gap: 1 },
  star: { fontSize: 13, color: '#D1D5DB' },
  starOn: { color: colors.amber },
  address: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  comment: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: { fontSize: 11, color: colors.textTertiary },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(210,65,52,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,65,52,0.3)',
  },
  deleteBtnText: { fontSize: 11, color: '#D24134', fontWeight: '700' },
});
