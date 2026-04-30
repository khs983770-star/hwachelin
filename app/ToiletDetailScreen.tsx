import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getToiletDetail } from '../lib/toiletService';
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

  const loadDetail = useCallback(async () => {
    const data = await getToiletDetail(toiletId);
    setDetail(data);
  }, [toiletId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadDetail();
      setLoading(false);
    })();
  }, [loadDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDetail();
    setRefreshing(false);
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
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>리뷰 요약</Text>
        {reviewCount > 0 ? (
          <>
            <InfoRow label="청결" value={countPositive(detail.reviews, 'cleanliness')} />
            <InfoRow label="휴지" value={countPositive(detail.reviews, 'paper')} />
            <InfoRow label="비누" value={countPositive(detail.reviews, 'soap')} />
            <InfoRow label="안심" value={countPositive(detail.reviews, 'security')} />
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
});
