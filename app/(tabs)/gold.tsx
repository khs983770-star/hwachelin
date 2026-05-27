import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { getToiletsInRegion } from '../../lib/toiletService';
import {
  getGoldContextSnapshot,
  getWeightedGoldScore,
  GoldContextSnapshot,
  setGoldContextSnapshot,
  subscribeGoldContext,
} from '../../lib/goldContext';
import { RootStackParamList } from '../../types/navigation';
import { ToiletMarkerData } from '../../types/toilet';
import { getOperatingStatus } from '../../lib/operatingHours';

interface RankedToilet extends ToiletMarkerData {
  goldScore: number;
}

export default function GoldScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [snapshot, setSnapshot] = useState<GoldContextSnapshot>(getGoldContextSnapshot());
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeGoldContext(setSnapshot), []);

  useFocusEffect(
    useCallback(() => {
      const current = getGoldContextSnapshot();
      setSnapshot(current);

      if (current.toilets.length > 0) return;

      let active = true;
      setLoading(true);
      getToiletsInRegion(current.center.lat, current.center.lng, 3)
        .then((toilets) => {
          if (!active) return;
          const nextSnapshot = {
            center: current.center,
            toilets,
            searchQuery: current.searchQuery,
            selectedFilter: current.selectedFilter,
          };
          setGoldContextSnapshot(nextSnapshot);
          setSnapshot(getGoldContextSnapshot());
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  const rankedToilets = useMemo<RankedToilet[]>(() => {
    return snapshot.toilets
      .filter((toilet) => (toilet.review_count ?? 0) > 0 && toilet.avg_rating != null)
      .map((toilet) => ({
        ...toilet,
        goldScore: getWeightedGoldScore(toilet.avg_rating ?? 0, toilet.review_count ?? 0),
      }))
      .sort((a, b) => {
        if (b.goldScore !== a.goldScore) return b.goldScore - a.goldScore;
        return (b.review_count ?? 0) - (a.review_count ?? 0);
      });
  }, [snapshot.toilets]);

  const contextLabel = buildContextLabel(snapshot);
  const totalReviewed = rankedToilets.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.title}>황금칸</Text>
          <View style={styles.regionBadge}>
            <Text style={styles.regionText}>{contextLabel}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>현재 지도와 검색 조건 안에서 리뷰가 좋은 곳</Text>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{totalReviewed}</Text>
        <Text style={styles.summaryLabel}>리뷰가 있는 후보</Text>
        <Text style={styles.summaryMeta}>
          {snapshot.searchQuery.trim() ? `검색어 ${snapshot.searchQuery.trim()} · ` : ''}
          필터 {snapshot.selectedFilter}
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color={colors.orange} />
          <Text style={styles.emptyText}>황금칸 후보를 불러오는 중...</Text>
        </View>
      ) : rankedToilets.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>아직 황금칸 후보가 없어요</Text>
          <Text style={styles.emptyText}>
            현재 지도나 검색 조건 안에 리뷰가 있는 화장실이 생기면 여기에 표시됩니다.
          </Text>
        </View>
      ) : (
        rankedToilets.map((toilet, index) => (
          <TouchableOpacity
            key={toilet.toilet_id}
            style={[styles.card, index === 0 && styles.topCard]}
            activeOpacity={0.84}
            onPress={() => navigation.navigate('ToiletDetail', { toiletId: toilet.toilet_id })}
          >
            {(() => {
              const operatingStatus = getOperatingStatus({
                operatingHours: toilet.operating_hours,
                is24Hours: toilet.is_24hours,
              });
              return (
                <View
                  style={[
                    styles.statusBadge,
                    operatingStatus.state === 'open' && styles.statusBadgeOpen,
                    operatingStatus.state === 'closed' && styles.statusBadgeClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      operatingStatus.state === 'open' && styles.statusBadgeTextOpen,
                      operatingStatus.state === 'closed' && styles.statusBadgeTextClosed,
                    ]}
                  >
                    {operatingStatus.label}
                  </Text>
                </View>
              );
            })()}
            <View style={styles.rankRow}>
              <Text style={styles.rank}># {index + 1}</Text>
              <Text style={styles.goldScore}>황금점수 {toilet.goldScore.toFixed(2)}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {toilet.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {toilet.address}
            </Text>
            <View style={styles.cardBottom}>
              <Text style={styles.score}>{toilet.avg_rating?.toFixed(1) ?? '-'}</Text>
              <View style={styles.tags}>
                <Tag label={toilet.type} />
                <Tag label={toilet.access_type} />
                <Tag label={`${toilet.review_count ?? 0} 리뷰`} />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

function buildContextLabel(snapshot: GoldContextSnapshot) {
  const search = snapshot.searchQuery.trim();
  if (search) return search.length > 10 ? `${search.slice(0, 10)}...` : search;
  if (snapshot.selectedFilter !== '전체') return snapshot.selectedFilter;
  return '현재 지도';
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  header: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  trophy: { fontSize: 22 },
  title: { fontSize: 19, fontWeight: '700', color: colors.textPrimary },
  regionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    marginLeft: 4,
    maxWidth: 132,
  },
  regionText: { fontSize: 12, color: '#B45309', fontWeight: '700' },
  subtitle: { fontSize: 12, color: colors.textSecondary },
  summary: {
    minHeight: 70,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    marginBottom: 12,
  },
  summaryValue: { fontSize: 22, fontWeight: '700', color: colors.orange },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  summaryMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 5 },
  emptyBox: {
    minHeight: 150,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  emptyTitle: { fontSize: 15, color: colors.textPrimary, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, textAlign: 'center' },
  card: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 9,
    overflow: 'hidden',
  },
  topCard: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 6,
  },
  statusBadgeOpen: { backgroundColor: '#E9F8EF' },
  statusBadgeClosed: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 10, color: colors.textTertiary, fontWeight: '800' },
  statusBadgeTextOpen: { color: '#15803D' },
  statusBadgeTextClosed: { color: '#4B5563' },
  rankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rank: { fontSize: 11, fontWeight: '700', color: '#B45309', marginBottom: 5 },
  goldScore: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  score: { fontSize: 22, color: colors.orange, fontWeight: '700', marginRight: 8 },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { borderRadius: 7, backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { fontSize: 10, color: '#92400E', fontWeight: '600' },
});
