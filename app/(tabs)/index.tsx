import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getToiletsInRegion } from '../../lib/toiletService';
import { ToiletMarkerData } from '../../types/toilet';
import ToiletBottomSheet from '../../components/ToiletBottomSheet';
import { RootStackParamList } from '../../types/navigation';
import KakaoMapView, { KakaoMapViewRef } from '../../components/KakaoMapView';
import { colors } from '../../constants/theme';

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;
const STAR_FILTER = '별점';
const FILTER_OPTIONS = [
  { label: '전체', enabled: true },
  { label: '24시간', enabled: false },
  { label: '비데', enabled: false },
  { label: '개방형', enabled: true },
  { label: '기저귀', enabled: false },
  { label: '남녀분리', enabled: true },
  { label: STAR_FILTER, enabled: true },
] as const;

export default function MapScreen() {
  const kakaoMapRef = useRef<KakaoMapViewRef>(null);
  const appleMapRef = useRef<MapView>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapErrorMsg, setMapErrorMsg] = useState<string | null>(null);
  const [toilets, setToilets] = useState<ToiletMarkerData[]>([]);
  const [selectedToilet, setSelectedToilet] = useState<ToiletMarkerData | null>(null);
  const [toiletLoading, setToiletLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [selectedFilter, setSelectedFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const isShowingDemoData = toilets.some(
    (toilet) =>
      toilet.toilet_id.startsWith('demo-') ||
      toilet.name.includes('시청역 데모') ||
      toilet.address.includes('데모로')
  );
  const insets = useSafeAreaInsets();
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredToilets = useMemo(() => {
    return toilets.filter((toilet) => {
      const searchableText = [
        toilet.name,
        toilet.address,
        toilet.type,
        toilet.access_type,
        toilet.floor,
        toilet.gender_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch =
        normalizedSearchQuery.length === 0 || searchableText.includes(normalizedSearchQuery);

      let matchesFilter = true;
      if (selectedFilter === '개방형') {
        matchesFilter = toilet.access_type === '누구나';
      } else if (selectedFilter === '남녀분리') {
        matchesFilter = toilet.gender_type === '남녀분리';
      } else if (selectedFilter === STAR_FILTER) {
        matchesFilter = (toilet.avg_rating ?? 0) >= 4.3;
      }

      return matchesSearch && matchesFilter;
    });
  }, [normalizedSearchQuery, selectedFilter, toilets]);
  const hasActiveSearchOrFilter = normalizedSearchQuery.length > 0 || selectedFilter !== '전체';
  const countLabel =
    filteredToilets.length > 0
      ? hasActiveSearchOrFilter
        ? `검색 결과 ${filteredToilets.length}개`
        : `${isShowingDemoData ? '데모 ' : ''}화장실 ${filteredToilets.length}개`
      : hasActiveSearchOrFilter
        ? '조건에 맞는 화장실 없음'
        : '주변 화장실 없음';

  // 현재 지도 중심 기준으로 화장실 조회
  const fetchToilets = useCallback(async (lat: number, lng: number) => {
    setToiletLoading(true);
    const data = await getToiletsInRegion(lat, lng, 3);
    setToilets(data);
    setSelectedToilet((current) =>
      current ? data.find((toilet) => toilet.toilet_id === current.toilet_id) ?? current : null
    );
    setToiletLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchToilets(mapCenter.lat, mapCenter.lng);
    }, [fetchToilets, mapCenter.lat, mapCenter.lng])
  );

  // 위치 권한 + 초기 위치 가져오기
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000);
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('위치 권한이 필요해요');
          setLoading(false);
          clearTimeout(timer);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setLocation({ lat, lng });
        setMapCenter({ lat, lng });
        fetchToilets(lat, lng);
      } catch (e) {
        console.log('위치 가져오기 실패, 기본 위치 사용');
        fetchToilets(DEFAULT_LAT, DEFAULT_LNG);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    })();
  }, []);

  // 지도 이동 완료 시 새 영역 화장실 로드 (디바운스)
  const regionChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRegionChangeComplete = useCallback(
    (region: { lat: number; lng: number }) => {
      if (regionChangeTimer.current) clearTimeout(regionChangeTimer.current);
      regionChangeTimer.current = setTimeout(() => {
        setMapCenter(region);
        fetchToilets(region.lat, region.lng);
      }, 600);
    },
    [fetchToilets]
  );

  const onAppleRegionChangeComplete = useCallback(
    (region: Region) => {
      onRegionChangeComplete({ lat: region.latitude, lng: region.longitude });
    },
    [onRegionChangeComplete]
  );

  useEffect(() => {
    if (!selectedToilet) return;
    const selectedStillVisible = filteredToilets.some(
      (toilet) => toilet.toilet_id === selectedToilet.toilet_id
    );
    if (!selectedStillVisible) setSelectedToilet(null);
  }, [filteredToilets, selectedToilet]);

  const goToMyLocation = () => {
    if (!location) return;

    if (mapErrorMsg && appleMapRef.current) {
      appleMapRef.current.animateToRegion({
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      kakaoMapRef.current?.moveTo(location.lat, location.lng);
    }

    fetchToilets(location.lat, location.lng);
  };

  const zoomIn = () => {
    if (mapErrorMsg && appleMapRef.current) {
      appleMapRef.current.getMapBoundaries?.();
      return;
    }
    kakaoMapRef.current?.zoomIn();
  };

  const zoomOut = () => {
    if (mapErrorMsg && appleMapRef.current) {
      appleMapRef.current.getMapBoundaries?.();
      return;
    }
    kakaoMapRef.current?.zoomOut();
  };

  const lat = location?.lat ?? DEFAULT_LAT;
  const lng = location?.lng ?? DEFAULT_LNG;

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.orange} />
          <Text style={styles.loadingText}>위치를 찾는 중...</Text>
        </View>
      )}

      {mapErrorMsg ? (
        <MapView
          ref={appleMapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          onRegionChangeComplete={onAppleRegionChangeComplete}
          onPress={() => setSelectedToilet(null)}
        >
          {filteredToilets.map((toilet) => (
            <Marker
              key={toilet.toilet_id}
              coordinate={{ latitude: toilet.lat, longitude: toilet.lng }}
              onPress={(event) => {
                event.stopPropagation();
                setSelectedToilet(toilet);
              }}
            >
              <View style={styles.markerContainer}>
                <Text style={styles.markerEmoji}>🚻</Text>
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <KakaoMapView
          ref={kakaoMapRef}
          center={{ lat, lng }}
          currentLocation={location}
          toilets={filteredToilets}
          onMapPress={() => setSelectedToilet(null)}
          onMarkerPress={setSelectedToilet}
          onRegionIdle={onRegionChangeComplete}
          onMapError={(message) => {
            console.warn('[KakaoMapView]', message);
            setMapErrorMsg(message);
          }}
        />
      )}

      {mapErrorMsg && (
        <View style={[styles.mapErrorBanner, { top: insets.top + 136 }]}>
          <Text style={styles.mapErrorText}>
            카카오맵 오류: {mapErrorMsg}. 임시로 Apple Map을 표시 중입니다.
          </Text>
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
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
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[
                filter.label === STAR_FILTER ? styles.starChip : styles.filterChip,
                selectedFilter === filter.label &&
                  (filter.label === STAR_FILTER ? styles.starChipOn : styles.filterChipOn),
                !filter.enabled && styles.filterChipDisabled,
              ]}
              onPress={() => {
                if (filter.enabled) setSelectedFilter(filter.label);
              }}
              activeOpacity={filter.enabled ? 0.8 : 1}
              disabled={!filter.enabled}
            >
              <Text
                style={[
                  filter.label === STAR_FILTER ? styles.starChipText : styles.filterChipText,
                  selectedFilter === filter.label &&
                    (filter.label === STAR_FILTER ? styles.starChipTextOn : styles.filterChipTextOn),
                  !filter.enabled && styles.filterChipTextDisabled,
                ]}
              >
                {filter.label === STAR_FILTER ? '★ 별점' : filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 화장실 수 표시 배지 */}
      {!loading && (
        <View
          style={[
            styles.countBadge,
            { top: insets.top + 140 },
            isShowingDemoData && styles.demoCountBadge,
          ]}
        >
          {toiletLoading ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : (
            <Text style={styles.countText}>
              {countLabel}
            </Text>
          )}
        </View>
      )}

      {/* 내 위치 버튼 */}
      <TouchableOpacity
        style={[styles.locationButton, { bottom: selectedToilet ? 260 : insets.bottom + 96 }]}
        onPress={goToMyLocation}
        activeOpacity={0.85}
      >
        <Text style={styles.locationButtonText}>⦿</Text>
      </TouchableOpacity>

      <View style={[styles.zoomControl, { bottom: selectedToilet ? 318 : insets.bottom + 150 }]}>
        <TouchableOpacity style={styles.zoomButton} onPress={zoomIn} activeOpacity={0.85}>
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity style={styles.zoomButton} onPress={zoomOut} activeOpacity={0.85}>
          <Text style={styles.zoomButtonText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* 바텀시트 */}
      <ToiletBottomSheet
        toilet={selectedToilet}
        onClose={() => setSelectedToilet(null)}
        onDetailPress={(t) => {
          setSelectedToilet(null);
          navigation.navigate('ToiletDetail', { toiletId: t.toilet_id });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    fontWeight: '600',
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
  filterRow: {
    gap: 6,
    paddingRight: 14,
  },
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
  filterChipOn: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  filterChipDisabled: {
    opacity: 0.42,
  },
  filterChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextOn: { color: '#fff' },
  filterChipTextDisabled: { color: colors.textTertiary },
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
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textSecondary },
  errorText: { fontSize: 16, color: colors.orangeDark },
  mapErrorBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFD1C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  mapErrorText: { fontSize: 12, color: '#a9441f', textAlign: 'center', fontWeight: '600' },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: colors.orange,
  },
  markerEmoji: { fontSize: 18 },
  countBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,253,251,0.94)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 100,
    alignItems: 'center',
  },
  countText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  demoCountBadge: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFB08A' },
  locationButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  locationButtonText: { fontSize: 18, color: colors.textSecondary, fontWeight: '700' },
  zoomControl: {
    position: 'absolute',
    right: 20,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundPrimary,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  zoomButton: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    fontSize: 24,
    lineHeight: 26,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderTertiary,
  },
});
