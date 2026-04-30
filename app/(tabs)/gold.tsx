import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DEMO_TOILETS } from '../../lib/demoToilets';
import { colors } from '../../constants/theme';

export default function GoldScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const rankedToilets = [...DEMO_TOILETS].sort(
    (a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.title}>황금 칸</Text>
          <View style={styles.regionBadge}>
            <Text style={styles.regionText}>서울 중구</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>오늘의 추천 · 별점 높은 화장실 우선</Text>
      </View>

      {rankedToilets.map((toilet, index) => (
        <TouchableOpacity
          key={toilet.toilet_id}
          style={styles.card}
          activeOpacity={0.84}
          onPress={() => navigation.navigate('ToiletDetail', { toiletId: toilet.toilet_id })}
        >
          <Text style={styles.rank}># {index + 1} · 이번 주 추천</Text>
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
      ))}
    </ScrollView>
  );
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
  },
  regionText: { fontSize: 12, color: '#B45309', fontWeight: '700' },
  subtitle: { fontSize: 12, color: colors.textSecondary },
  card: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    borderRadius: 13,
    padding: 14,
    marginBottom: 9,
    overflow: 'hidden',
  },
  rank: { fontSize: 11, fontWeight: '700', color: '#B45309', marginBottom: 5 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  score: { fontSize: 22, color: colors.orange, fontWeight: '700', marginRight: 8 },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { borderRadius: 7, backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { fontSize: 10, color: '#92400E', fontWeight: '600' },
});
