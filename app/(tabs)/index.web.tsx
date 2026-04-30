import { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CITYHALL_DEMO_TOILETS } from '../../lib/cityhallDemoToilets';
import { ToiletMarkerData } from '../../types/toilet';
import { RootStackParamList } from '../../types/navigation';
import { colors } from '../../constants/theme';

const FILTERS = ['전체', '24시간', '비데', '개방형', '기저귀', '남녀분리', '★ 별점'];

const markerPositions: ViewStyle[] = [
  { left: '44%', top: '47%' },
  { left: '55%', top: '38%' },
  { left: '34%', top: '55%' },
  { left: '62%', top: '58%' },
  { left: '48%', top: '64%' },
  { left: '70%', top: '45%' },
  { left: '28%', top: '40%' },
  { left: '58%', top: '70%' },
];

export default function WebMapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedFilter, setSelectedFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToilet, setSelectedToilet] = useState<ToiletMarkerData | null>(null);

  const toilets = useMemo(() => {
    return CITYHALL_DEMO_TOILETS.slice(0, 8).map((toilet, index) => ({
      ...toilet,
      avg_rating: toilet.avg_rating ?? 4 + (index % 4) * 0.2,
      review_count: toilet.review_count ?? index + 3,
    }));
  }, []);

  const filteredToilets = useMemo(() => {
    const query = searchQuery.trim();
    return toilets.filter((toilet) => {
      if (query && !`${toilet.name} ${toilet.address}`.includes(query)) return false;
      if (selectedFilter === '★ 별점') return (toilet.avg_rating ?? 0) >= 4.2;
      if (selectedFilter === '개방형') return toilet.access_type === '누구나';
      if (selectedFilter === '남녀분리') return toilet.gender_type === '남녀분리';
      return true;
    });
  }, [searchQuery, selectedFilter, toilets]);

  const activeToilet = selectedToilet ?? filteredToilets[0] ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <View style={styles.mapGrid} />
        <View style={[styles.road, styles.roadHorizontalTop]} />
        <View style={[styles.road, styles.roadHorizontalBottom]} />
        <View style={[styles.road, styles.roadVerticalLeft]} />
        <View style={[styles.road, styles.roadVerticalRight]} />
        <View style={styles.park}>
          <Text style={styles.parkText}>서울광장</Text>
        </View>
        <View style={styles.stationLine} />
        <View style={styles.stationBadge}>
          <Text style={styles.stationBadgeText}>시청역</Text>
        </View>

        {filteredToilets.map((toilet, index) => {
          const pos = markerPositions[index % markerPositions.length];
          const rating = (toilet.avg_rating ?? 0).toFixed(1);
          const isSelected = activeToilet?.toilet_id === toilet.toilet_id;
          return (
            <TouchableOpacity
              key={toilet.toilet_id}
              style={[
                styles.marker,
                pos,
                isSelected && styles.markerSelected,
              ]}
              onPress={() => setSelectedToilet(toilet)}
              activeOpacity={0.85}
            >
              <Text style={styles.markerIcon}>🚻</Text>
              <View style={styles.markerScore}>
                <Text style={styles.markerScoreText}>{rating}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.currentLocation}>
          <View style={styles.currentDot} />
          <Text style={styles.currentText}>현재 위치</Text>
        </View>
      </View>

      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View>
            <Text style={styles.logo}>
              화슐랭 <Text style={styles.logoSub}>Hwa-chelin</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('마이페이지' as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍  지역명, 장소명으로 검색"
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                filter === '★ 별점' ? styles.starChip : styles.filterChip,
                selectedFilter === filter &&
                  (filter === '★ 별점' ? styles.starChipOn : styles.filterChipOn),
              ]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  filter === '★ 별점' ? styles.starChipText : styles.filterChipText,
                  selectedFilter === filter &&
                    (filter === '★ 별점' ? styles.starChipTextOn : styles.filterChipTextOn),
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>중간점검 웹 미리보기 · {filteredToilets.length}곳</Text>
      </View>

      {activeToilet && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreText}>{(activeToilet.avg_rating ?? 0).toFixed(1)}</Text>
            </View>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {activeToilet.name}
              </Text>
              <Text style={styles.sheetMeta}>
                ★★★★★ · 리뷰 {activeToilet.review_count ?? 0}개
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedToilet(null)}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.address} numberOfLines={2}>
            {activeToilet.address}
          </Text>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>{activeToilet.type}</Text>
            <Text style={styles.tag}>{activeToilet.access_type}</Text>
            {!!activeToilet.floor && <Text style={styles.tag}>{activeToilet.floor}</Text>}
            {!!activeToilet.gender_type && <Text style={styles.tag}>{activeToilet.gender_type}</Text>}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>길찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fillButton}
              onPress={() => navigation.navigate('ToiletDetail', { toiletId: activeToilet.toilet_id })}
            >
              <Text style={styles.fillButtonText}>상세보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  map: { flex: 1, overflow: 'hidden', backgroundColor: '#e7ecdf' },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e7ecdf',
  },
  road: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.82)' },
  roadHorizontalTop: { left: 0, right: 0, top: '38%', height: 14 },
  roadHorizontalBottom: { left: 0, right: 0, top: '62%', height: 10 },
  roadVerticalLeft: { top: 0, bottom: 0, left: '34%', width: 14 },
  roadVerticalRight: { top: 0, bottom: 0, left: '67%', width: 9 },
  park: {
    position: 'absolute',
    left: '9%',
    top: '24%',
    width: '34%',
    height: '23%',
    borderRadius: 22,
    backgroundColor: '#cbe6bd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkText: { fontSize: 13, color: '#2f6b3c', fontWeight: '700' },
  stationLine: {
    position: 'absolute',
    left: '-5%',
    right: '18%',
    top: '57%',
    height: 5,
    backgroundColor: '#1680d0',
    transform: [{ rotate: '-18deg' }],
    borderRadius: 999,
  },
  stationBadge: {
    position: 'absolute',
    left: '47%',
    top: '52%',
    backgroundColor: '#1869a8',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stationBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  marker: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 9px 18px rgba(45,32,23,0.22)' as never,
  },
  markerSelected: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    transform: [{ translateX: -5 }, { translateY: -5 }],
  },
  markerIcon: { fontSize: 18 },
  markerScore: {
    position: 'absolute',
    right: -16,
    top: -5,
    backgroundColor: '#211b17',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#fff',
  },
  markerScoreText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  currentLocation: {
    position: 'absolute',
    left: '53%',
    top: '69%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    borderWidth: 5,
    borderColor: 'rgba(59,130,246,0.22)',
  },
  currentText: { color: '#1e40af', fontSize: 11, fontWeight: '700' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 8,
    backgroundColor: 'rgba(255,253,251,0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderTertiary,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.orange,
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '400',
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: { fontSize: 16 },
  searchInput: {
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: 13,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  filterRow: { gap: 6, paddingRight: 14 },
  filterChip: {
    height: 25,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  filterChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextOn: { color: '#fff' },
  starChip: {
    height: 25,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.amber,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starChipText: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  starChipOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  starChipTextOn: { color: '#fff' },
  countBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: 142,
    backgroundColor: 'rgba(255,253,251,0.94)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    boxShadow: '0 6px 18px rgba(45,32,23,0.14)' as never,
  },
  countText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  bottomSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 18px 45px rgba(45,32,23,0.22)' as never,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSecondary,
    marginBottom: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBlock: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: colors.orange, fontSize: 20, fontWeight: '800' },
  sheetTitleWrap: { flex: 1 },
  sheetTitle: { fontSize: 16, color: colors.textPrimary, fontWeight: '800' },
  sheetMeta: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { fontSize: 22, color: colors.textTertiary },
  address: { marginTop: 10, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  tag: {
    fontSize: 11,
    color: colors.textSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderTertiary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  outlineButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
    alignItems: 'center',
  },
  outlineButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  fillButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: colors.orange,
    alignItems: 'center',
  },
  fillButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
