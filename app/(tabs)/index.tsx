import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getToiletsInRegion, getToiletsInBounds, findToiletNear, getToiletMarkerById } from '../../lib/toiletService';
import { ToiletMarkerData } from '../../types/toilet';
import ToiletBottomSheet from '../../components/ToiletBottomSheet';
import { RootStackParamList } from '../../types/navigation';
import KakaoMapView, { KakaoMapViewRef } from '../../components/KakaoMapView';
import SearchBar, { SearchSuggestionList } from '../../components/SearchBar';
import ClusterBottomSheet from '../../components/ClusterBottomSheet';
import NoToiletSheet from '../../components/NoToiletSheet';
import CustomMarker from '../../components/CustomMarker';
import { colors } from '../../constants/theme';
import { setGoldContextSnapshot } from '../../lib/goldContext';
import { PlaceSearchResult, isAreaSearch } from '../../lib/searchService';
import { requireLogin } from '../../lib/authService';
import { useSearch } from '../../hooks/useSearch';
import {
  addOperatingState,
  filterToilets,
  FILTER_OPTIONS,
  hasDemoToilets,
  STAR_FILTER,
  URGENT_FILTER,
  getUrgentToilets,
} from '../../lib/mapToiletFilters';
import {
  clampFetchRadius,
  DEFAULT_CENTER,
  getAppleRegionBounds,
  getAppleRegionRadiusKm,
  MapBounds,
  MapViewport,
  normalizeFetchRadius,
} from '../../lib/mapViewport';

const INITIAL_LOCATION_TIMEOUT_MS = 8000;

export default function MapScreen() {
  const kakaoMapRef = useRef<KakaoMapViewRef>(null);
  const appleMapRef = useRef<MapView>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLocationResolved, setInitialLocationResolved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapErrorMsg, setMapErrorMsg] = useState<string | null>(null);
  const [toilets, setToilets] = useState<ToiletMarkerData[]>([]);
  const [selectedToilet, setSelectedToilet] = useState<ToiletMarkerData | null>(null);
  const [clusterToilets, setClusterToilets] = useState<ToiletMarkerData[]>([]);
  const [clusterCenter, setClusterCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [toiletLoading, setToiletLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | null>(null);
  const [showResearchButton, setShowResearchButton] = useState(false);
  const mapCenterRef = useRef(DEFAULT_CENTER);
  const lastFetchedCenterRef = useRef(DEFAULT_CENTER);
  const lastFetchedBoundsRef = useRef<MapBounds | null>(null);
  const mapFetchRadiusRef = useRef(normalizeFetchRadius());
  const visibleBoundsRef = useRef<MapBounds | null>(null);
  const toiletLoadingRef = useRef(false);
  // 선택된 필터 목록 (빈 배열 = '전체' 상태)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<'local' | 'place'>('local');
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [noToiletPlace, setNoToiletPlace] = useState<PlaceSearchResult | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isSearchFocusedRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const isAutoMovingRef = useRef(false);
  const search = useSearch(mapCenter, toilets);
  const isShowingDemoData = hasDemoToilets(toilets);
  const insets = useSafeAreaInsets();
  const normalizedSearchQuery =
    searchMode === 'local' ? search.query.trim().toLowerCase() : '';
  // 급해요 모드 여부
  const urgentMode = selectedFilters.includes(URGENT_FILTER);

  const filteredToilets = useMemo(
    () => filterToilets(toilets, normalizedSearchQuery, selectedFilters),
    [normalizedSearchQuery, selectedFilters, toilets]
  );

  // 급해요 모드: 내 위치 기준 가장 가까운 Top 3
  const urgentToilets = useMemo(() => {
    if (!urgentMode || !location) return null;
    return getUrgentToilets(filteredToilets, location, 3);
  }, [urgentMode, location, filteredToilets]);

  // 지도에 표시할 화장실 (급해요 모드면 Top 3만)
  const mapToilets = useMemo(
    () => addOperatingState(urgentToilets ?? filteredToilets),
    [filteredToilets, urgentToilets]
  );

  // 급해요 순위 맵 (toilet_id → rank)
  const urgentRanks = useMemo<Record<string, number>>(() => {
    if (!urgentToilets) return {};
    return Object.fromEntries(urgentToilets.map((t) => [t.toilet_id, t.rank]));
  }, [urgentToilets]);

  const hasActiveSearchOrFilter = normalizedSearchQuery.length > 0 || selectedFilters.length > 0;
  const searchContextLabel = selectedPlace?.name ?? search.query;
  const searchDropdownOpen =
    isSearchFocused &&
    ((search.query.trim().length === 0 &&
      (search.recentKeywords.length > 0 || search.trendingKeywords.length > 0)) ||
      (search.query.trim().length > 0 &&
        (search.results.length > 0 || search.status === 'empty' || search.status === 'error')));
  const searchVisibleItems = search.results.slice(0, 8);
  const showRecentSearches = isSearchFocused && search.query.trim().length === 0;
  const isShowingStaleResults = showResearchButton;
  const visibleResultCount = mapToilets.length;
  const countLabel = urgentMode
    ? visibleResultCount > 0
      ? `🚨 가까운 화장실 Top ${visibleResultCount}`
      : '🚨 근처 화장실이 없어요'
    : visibleResultCount > 0
      ? hasActiveSearchOrFilter || selectedPlace
        ? `검색 결과 ${visibleResultCount}개`
        : `${isShowingDemoData ? '데모 ' : ''}화장실 ${visibleResultCount}개`
      : hasActiveSearchOrFilter || selectedPlace
        ? '조건에 맞는 화장실 없음'
        : '주변 화장실 없음';
  const countBadgeTop =
    insets.top +
    (searchDropdownOpen ? 242 : 190);

  useEffect(() => {
    setGoldContextSnapshot({
      center: mapCenter,
      toilets: filteredToilets,
      searchQuery: searchContextLabel,
      selectedFilter: selectedFilters.length === 0 ? '전체' : selectedFilters.join(', '),
    });
  }, [mapCenter, searchContextLabel, selectedFilters, filteredToilets]);

  const shouldShowResearchButton = useCallback((currentBounds: MapBounds | null) => {
    const fetchedBounds = lastFetchedBoundsRef.current;
    if (!fetchedBounds || !currentBounds) return false;

    // 1. 현재 뷰포트가 마지막 fetch 범위를 벗어났을 때
    const outOfBounds =
      currentBounds.north > fetchedBounds.north ||
      currentBounds.south < fetchedBounds.south ||
      currentBounds.east > fetchedBounds.east ||
      currentBounds.west < fetchedBounds.west;

    if (outOfBounds) return true;

    // 2. 현재 뷰포트 면적이 마지막 fetch 범위의 25% 이하일 때
    // (줌아웃 후 재탐색 → 다시 줌인하면 fetch 범위 안에 있어도 버튼 표시)
    const fetchedArea =
      (fetchedBounds.north - fetchedBounds.south) *
      (fetchedBounds.east - fetchedBounds.west);
    const currentArea =
      (currentBounds.north - currentBounds.south) *
      (currentBounds.east - currentBounds.west);

    return currentArea / fetchedArea < 0.25;
  }, []);

  // 현재 지도 중심 기준으로 화장실 조회 (bounds 있으면 뷰포트 범위 사용)
  const fetchToilets = useCallback(async (lat: number, lng: number, radiusKm?: number, bounds?: MapBounds) => {
    toiletLoadingRef.current = true;
    setToiletLoading(true);
    try {
      let data;
      if (bounds) {
        data = await getToiletsInBounds(bounds.south, bounds.west, bounds.north, bounds.east);
      } else {
        const fetchRadiusKm =
          typeof radiusKm === 'number'
            ? clampFetchRadius(radiusKm)
            : clampFetchRadius(mapFetchRadiusRef.current);
        mapFetchRadiusRef.current = fetchRadiusKm;
        data = await getToiletsInRegion(lat, lng, fetchRadiusKm);
      }
      setToilets(data);
      mapCenterRef.current = { lat, lng };
      lastFetchedCenterRef.current = { lat, lng };
      lastFetchedBoundsRef.current = bounds ?? visibleBoundsRef.current;
      setMapCenter({ lat, lng });
      setShowResearchButton(false);
      setSelectedToilet((current) =>
        current ? data.find((toilet) => toilet.toilet_id === current.toilet_id) ?? current : null
      );
    } catch (error) {
      console.warn('화장실 조회 실패:', error);
    } finally {
      toiletLoadingRef.current = false;
      setToiletLoading(false);
    }
  }, []);

  const fetchInitialDeviceLocation = useCallback(async () => {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 1000 * 60 * 10,
      requiredAccuracy: 3000,
    });
    if (lastKnown) return lastKnown;

    return Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('위치 조회 시간 초과')), INITIAL_LOCATION_TIMEOUT_MS);
      }),
    ]);
  }, []);

  // 위치 권한 + 초기 위치 가져오기 (fetchToilets는 visibleBounds 준비 후 별도 useEffect에서 실행)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          mapCenterRef.current = DEFAULT_CENTER;
          lastFetchedCenterRef.current = DEFAULT_CENTER;
          setMapCenter(DEFAULT_CENTER);
          return;
        }
        const loc = await fetchInitialDeviceLocation();
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setLocation({ lat, lng });
        mapCenterRef.current = { lat, lng };
        setMapCenter({ lat, lng });
      } catch (e) {
        console.log('위치 가져오기 실패, 기본 위치 사용');
        mapCenterRef.current = DEFAULT_CENTER;
        lastFetchedCenterRef.current = DEFAULT_CENTER;
        setMapCenter(DEFAULT_CENTER);
      } finally {
        setInitialLocationResolved(true);
        setLoading(false);
      }
    })();
  }, [fetchInitialDeviceLocation]);

  // 지도 렌더 후 visibleBounds가 준비되면 첫 조회를 bounds 기반으로 실행
  useEffect(() => {
    if (!initialLocationResolved) return;
    if (!visibleBounds) return;
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;
    const center = mapCenterRef.current;
    fetchToilets(center.lat, center.lng, undefined, visibleBounds);
  }, [initialLocationResolved, visibleBounds, fetchToilets]);

  // 다른 화면(제보 등)에서 돌아올 때 지도 데이터 갱신
  useFocusEffect(
    useCallback(() => {
      if (!initialFetchDoneRef.current) return;
      const bounds = lastFetchedBoundsRef.current;
      const center = lastFetchedCenterRef.current;
      if (bounds) {
        fetchToilets(center.lat, center.lng, undefined, bounds);
      } else {
        fetchToilets(center.lat, center.lng);
      }
    }, [fetchToilets])
  );

  // 지도 이동 완료 시에는 조회하지 않고 재탐색 필요 여부만 표시
  const regionChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRegionChangeComplete = useCallback(
    (region: MapViewport) => {
      const nextCenter = { lat: region.lat, lng: region.lng };
      mapCenterRef.current = nextCenter;
      mapFetchRadiusRef.current = normalizeFetchRadius(region.radiusKm ?? mapFetchRadiusRef.current);
      if (region.bounds) {
        setVisibleBounds(region.bounds);
        visibleBoundsRef.current = region.bounds;
      }
      if (isSearchFocusedRef.current) {
        Keyboard.dismiss();
        isSearchFocusedRef.current = false;
        setIsSearchFocused(false);
      }
      if (regionChangeTimer.current) clearTimeout(regionChangeTimer.current);
      regionChangeTimer.current = setTimeout(() => {
        mapCenterRef.current = nextCenter;
        setMapCenter(nextCenter);
        if (!toiletLoadingRef.current) {
          if (isAutoMovingRef.current) {
            isAutoMovingRef.current = false;
          } else {
            setShowResearchButton(shouldShowResearchButton(visibleBoundsRef.current));
          }
        }
      }, 600);
    },
    [shouldShowResearchButton]
  );

  const onAppleRegionChangeComplete = useCallback(
    (region: Region) => {
      onRegionChangeComplete({
        lat: region.latitude,
        lng: region.longitude,
        radiusKm: getAppleRegionRadiusKm(region),
        bounds: getAppleRegionBounds(region),
      });
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

  // 급해요 모드 활성화 시 → 내 위치 기준 2km 반경 재조회 (Top 3 확보)
  useEffect(() => {
    if (!urgentMode || !location) return;
    fetchToilets(location.lat, location.lng, 2);
    // urgentMode 토글 시에만 실행 (location 변경 시 재조회 불필요)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urgentMode]);

  // 급해요 모드 활성화 시 → Top 3 + 내 위치가 모두 보이도록 자동 줌
  // 단, 모드 진입 직후 1회만. 같은 모드 내 필터 변경 등으로 Top 3가 갱신돼도 지도는 유지.
  const hasFittedUrgentRef = useRef(false);
  useEffect(() => {
    if (!urgentMode) {
      hasFittedUrgentRef.current = false;
      return;
    }
    if (hasFittedUrgentRef.current) return;
    if (!urgentToilets || urgentToilets.length === 0) return;
    const points = urgentToilets.map((t) => ({ lat: t.lat, lng: t.lng }));
    if (location) points.push(location);
    isAutoMovingRef.current = true;
    // Apple Maps 폴백
    if (mapErrorMsg && appleMapRef.current) {
      appleMapRef.current.fitToCoordinates(
        points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 80, right: 40, bottom: 120, left: 40 }, animated: true }
      );
    } else {
      kakaoMapRef.current?.fitPoints(points, 0.15);
    }
    hasFittedUrgentRef.current = true;
  }, [urgentMode, urgentToilets, location, mapErrorMsg]);

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

    mapCenterRef.current = location;
    setMapCenter(location);
    fetchToilets(location.lat, location.lng);
  };

  const researchCurrentRegion = () => {
    const nextCenter = mapCenterRef.current;
    const bounds = visibleBoundsRef.current;
    closeClusterSheet();
    setSelectedToilet(null);
    setSelectedPlace(null);
    fetchToilets(nextCenter.lat, nextCenter.lng, undefined, bounds ?? undefined);
  };

  const closeClusterSheet = () => {
    setClusterToilets([]);
    setClusterCenter(null);
    setNoToiletPlace(null);
  };

  const selectToiletFromCluster = (toilet: ToiletMarkerData) => {
    closeClusterSheet();
    setSelectedToilet(toilet);
    setSelectedPlace(null);
    mapCenterRef.current = { lat: toilet.lat, lng: toilet.lng };
    setMapCenter({ lat: toilet.lat, lng: toilet.lng });
    kakaoMapRef.current?.moveTo(toilet.lat, toilet.lng);
    appleMapRef.current?.animateToRegion({
      latitude: toilet.lat,
      longitude: toilet.lng,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    });
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

  const selectPlaceResult = async (place: PlaceSearchResult) => {
    Keyboard.dismiss();
    closeClusterSheet();
    setNoToiletPlace(null);
    setSearchMode('place');
    search.setQuery(place.name);
    search.saveSelectedPlace(place);
    setSelectedPlace(place);

    // 지도 이동 (공통)
    mapCenterRef.current = { lat: place.lat, lng: place.lng };
    setMapCenter({ lat: place.lat, lng: place.lng });
    kakaoMapRef.current?.moveTo(place.lat, place.lng);
    appleMapRef.current?.animateToRegion({
      latitude: place.lat,
      longitude: place.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    // ── 지역 탐색 (지하철역·행정구역 등) ──────────────────────────────
    // kakaoPlaceId 또는 toiletId가 있으면 특정 장소 → 지역 탐색 제외
    const isSpecificVenue = !!place.kakaoPlaceId || !!place.toiletId;
    if (!isSpecificVenue && isAreaSearch(place.categoryGroupCode)) {
      setSelectedToilet(null);
      fetchToilets(place.lat, place.lng);
      return;
    }

    // ── 특정 장소 탐색 ─────────────────────────────────────────────────
    // 1) toiletId가 있으면 로컬 캐시 → DB 순서로 직접 조회
    if (place.toiletId) {
      const localMatch = toilets.find((t) => t.toilet_id === place.toiletId) ?? null;
      const toilet = localMatch ?? await getToiletMarkerById(place.toiletId);
      if (toilet) {
        setSelectedToilet(toilet);
        fetchToilets(toilet.lat, toilet.lng);
        return;
      }
    }

    // 2) DB에서 근접 화장실 조회 (대형 시설은 반경 확대)
    const LARGE_VENUE_KEYWORDS = ['백화점', '쇼핑', '공항', '대학', '대형마트'];
    const searchRadius = LARGE_VENUE_KEYWORDS.some((kw) => place.category.includes(kw)) ? 150 : 80;
    const nearby = await findToiletNear(place.lat, place.lng, searchRadius);
    if (nearby) {
      setSelectedToilet(nearby);
      // 마커도 지도에 보이도록 재조회
      fetchToilets(place.lat, place.lng);
      return;
    }

    // 3) 화장실 정보 없음 → 안내 시트
    setSelectedToilet(null);
    fetchToilets(place.lat, place.lng);
    setNoToiletPlace(place);
  };

  const selectKeyword = (keyword: string) => {
    closeClusterSheet();
    search.setQuery(keyword);
    setSearchMode('local');
    setSelectedPlace(null);
    setSelectedToilet(null);
  };

  const clearSearch = () => {
    closeClusterSheet();
    search.clearQuery();
    setSearchMode('local');
    setSelectedPlace(null);
    setNoToiletPlace(null);
  };

  const lat = mapCenter.lat;
  const lng = mapCenter.lng;

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

      {!initialLocationResolved ? null : mapErrorMsg ? (
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
          onPress={() => {
            setSelectedToilet(null);
            closeClusterSheet();
          }}
        >
          {mapToilets.map((toilet) => (
            <Marker
              key={toilet.toilet_id}
              coordinate={{ latitude: toilet.lat, longitude: toilet.lng }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={selectedToilet?.toilet_id === toilet.toilet_id}
              onPress={(event) => {
                event.stopPropagation();
                closeClusterSheet();
                setSelectedToilet(toilet);
              }}
            >
              <CustomMarker
                rating={toilet.avg_rating}
                hasToiletInfo={(toilet.review_count ?? 0) > 0 || toilet.avg_rating != null}
                isSelected={selectedToilet?.toilet_id === toilet.toilet_id}
                rank={urgentRanks[toilet.toilet_id] ?? null}
              />
            </Marker>
          ))}
        </MapView>
      ) : (
        <KakaoMapView
          ref={kakaoMapRef}
          center={{ lat, lng }}
          currentLocation={location}
          toilets={mapToilets}
          selectedToiletId={selectedToilet?.toilet_id ?? null}
          urgentRanks={urgentRanks}
          onMapPress={() => {
            setSelectedToilet(null);
            closeClusterSheet();
          }}
          onMarkerPress={(toilet) => {
            closeClusterSheet();
            setSelectedToilet(toilet);
          }}
          onClusterPress={(items, center) => {
            setSelectedToilet(null);
            setSelectedPlace(null);
            setClusterToilets(items);
            setClusterCenter(center);
          }}
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.logoIcon}>✿</Text>
            <View>
              <Text style={styles.logo}>화슐랭</Text>
              <Text style={styles.logoSub}>HWA-CHELIN</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyPage')}
            activeOpacity={0.8}
          >
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>
        <SearchBar
          query={search.query}
          onChangeQuery={(query) => {
            closeClusterSheet();
            search.setQuery(query);
            setSearchMode('local');
            setSelectedPlace(null);
          }}
          results={search.results}
          recentKeywords={search.recentKeywords}
          trendingKeywords={search.trendingKeywords}
          status={search.status}
          errorMessage={search.errorMessage}
          isLoading={search.isLoading}
          onSelectPlace={selectPlaceResult}
          onSelectKeyword={selectKeyword}
          onDeleteRecentKeyword={search.deleteRecentKeyword}
          onClearRecentKeywords={search.clearRecentKeywords}
          onClear={clearSearch}
          onRetry={search.retry}
          renderDropdown={false}
          dropdownOpen={searchDropdownOpen}
          onFocusChange={(focused) => {
            isSearchFocusedRef.current = focused;
            setIsSearchFocused(focused);
          }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.filter((f) => f.label !== URGENT_FILTER).map((filter) => {
            const isAll = filter.label === '전체';
            const isStar = filter.label === STAR_FILTER;
            const isActive = isAll
              ? selectedFilters.length === 0
              : selectedFilters.includes(filter.label);

            const chipStyle = isStar ? styles.starChip : styles.filterChip;
            const chipOnStyle = isStar ? styles.starChipOn : styles.filterChipOn;
            const textStyle = isStar ? styles.starChipText : styles.filterChipText;
            const textOnStyle = isStar ? styles.starChipTextOn : styles.filterChipTextOn;

            return (
              <TouchableOpacity
                key={filter.label}
                style={[
                  chipStyle,
                  isActive && chipOnStyle,
                  !filter.enabled && styles.filterChipDisabled,
                ]}
                onPress={() => {
                  if (!filter.enabled) return;
                  setSelectedFilters((prev) => {
                    if (isAll) return [];
                    if (prev.includes(filter.label)) {
                      return prev.filter((f) => f !== filter.label);
                    }
                    return [...prev, filter.label];
                  });
                }}
                activeOpacity={filter.enabled ? 0.8 : 1}
                disabled={!filter.enabled}
              >
                <Text
                  style={[
                    textStyle,
                    isActive && textOnStyle,
                    !filter.enabled && styles.filterChipTextDisabled,
                  ]}
                >
                  {isStar ? '✿ 별점' : filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {searchDropdownOpen && (
        <>
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            isSearchFocusedRef.current = false;
            setIsSearchFocused(false);
          }}>
            <View style={styles.searchBackdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.searchDropdownOverlay, { top: insets.top + 108 }]}>
            <SearchSuggestionList
              keyword={search.query.trim()}
              showRecent={showRecentSearches}
              visibleItems={searchVisibleItems}
              recentKeywords={search.recentKeywords}
              trendingKeywords={search.trendingKeywords}
              status={search.status}
              errorMessage={search.errorMessage}
              onRetry={search.retry}
              onSelectPlace={(place) => {
                isSearchFocusedRef.current = false;
                setIsSearchFocused(false);
                selectPlaceResult(place);
              }}
              onSelectKeyword={selectKeyword}
              onDeleteRecentKeyword={search.deleteRecentKeyword}
              onClearRecentKeywords={search.clearRecentKeywords}
              attached
              onClose={() => {
                Keyboard.dismiss();
                isSearchFocusedRef.current = false;
                setIsSearchFocused(false);
              }}
            />
          </View>
        </>

      )}

      {/* 급해요 플로팅 버튼 (지도 좌측 상단) */}
      {!loading && (
        <TouchableOpacity
          style={[
            styles.urgentFloatBtn,
            { top: countBadgeTop - 2 },
            urgentMode && styles.urgentFloatBtnOn,
          ]}
          onPress={() =>
            setSelectedFilters((prev) =>
              prev.includes(URGENT_FILTER)
                ? prev.filter((f) => f !== URGENT_FILTER)
                : [...prev, URGENT_FILTER]
            )
          }
          activeOpacity={0.82}
        >
          <Text style={styles.urgentFloatBtnEmoji}>🚨</Text>
          <Text style={[styles.urgentFloatBtnLabel, urgentMode && styles.urgentFloatBtnLabelOn]}>
            급해요
          </Text>
        </TouchableOpacity>
      )}

      {/* 화장실 수 표시 배지 */}
      {!loading && (
        <View
          style={[
            styles.countBadge,
            { top: countBadgeTop },
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

      {!loading && showResearchButton && !urgentMode && !searchDropdownOpen && (
        <TouchableOpacity
          style={[styles.researchButton, { top: countBadgeTop + 54 }]}
          onPress={researchCurrentRegion}
          activeOpacity={0.86}
          disabled={toiletLoading}
        >
          {toiletLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.researchButtonText}>이 지역에서 재탐색</Text>
          )}
        </TouchableOpacity>
      )}

      {/* 내 위치 버튼 */}
      <TouchableOpacity
        style={[
          styles.locationButton,
          { bottom: selectedToilet || clusterToilets.length > 0 ? 260 : insets.bottom + 96 },
        ]}
        onPress={goToMyLocation}
        activeOpacity={0.85}
      >
        <Text style={styles.locationButtonIcon}>⦿</Text>
        <Text style={styles.locationButtonLabel}>내 위치</Text>
      </TouchableOpacity>

      <View
        style={[
          styles.zoomControl,
          { bottom: selectedToilet || clusterToilets.length > 0 ? 318 : insets.bottom + 150 },
        ]}
      >
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
        onReviewPress={(t) => {
          setSelectedToilet(null);
          requireLogin({
            onAuthed: () => {
              navigation.navigate('ReviewWrite', {
                toiletId: t.toilet_id,
                toiletName: t.name,
                toiletLat: t.lat,
                toiletLng: t.lng,
              });
            },
          });
        }}
        userLocation={location}
      />
      <ClusterBottomSheet
        toilets={clusterToilets}
        center={clusterCenter ?? mapCenter}
        userLocation={location}
        onClose={closeClusterSheet}
        onSelectToilet={selectToiletFromCluster}
        onDetailPress={(toilet) => {
          closeClusterSheet();
          navigation.navigate('ToiletDetail', { toiletId: toilet.toilet_id });
        }}
      />
      <NoToiletSheet
        place={noToiletPlace}
        onClose={() => setNoToiletPlace(null)}
        onShowNearby={() => setNoToiletPlace(null)}
        onRegister={() => {
          if (!noToiletPlace) return;
          setNoToiletPlace(null);
          navigation.navigate('Report', {
            placeName: noToiletPlace.name,
            address: noToiletPlace.roadAddress || noToiletPlace.address,
            lat: noToiletPlace.lat,
            lng: noToiletPlace.lng,
            reportType: 'new_toilet',
            kakaoPlaceId: noToiletPlace.kakaoPlaceId,
          });
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
    backgroundColor: 'rgba(255,253,251,0.98)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(232,220,215,0.64)',
    paddingHorizontal: 20,
    paddingBottom: 14,
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 8,
  },
  searchBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 11,
  },
  searchDropdownOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 12,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 25,
    color: colors.orange,
    marginRight: 6,
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.orange,
    letterSpacing: 0,
    lineHeight: 24,
  },
  logoSub: {
    fontSize: 10,
    color: colors.orange,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 12,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F8CDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: { fontSize: 19 },
  filterRow: {
    gap: 10,
    paddingRight: 20,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8DCD7',
    backgroundColor: '#fff',
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
  filterChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  filterChipTextOn: { color: '#fff' },
  filterChipTextDisabled: { color: colors.textTertiary },
  starChip: {
    height: 36,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.amber,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starChipText: { fontSize: 13, color: colors.orange, fontWeight: '800' },
  starChipOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  starChipTextOn: { color: '#fff' },
  urgentFloatBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E50914',
    backgroundColor: '#fff',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  urgentFloatBtnOn: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  urgentFloatBtnEmoji: { fontSize: 14, lineHeight: 18 },
  urgentFloatBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E50914',
  },
  urgentFloatBtnLabelOn: { color: '#fff' },
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
    minWidth: 124,
    alignItems: 'center',
  },
  countText: { fontSize: 14, color: colors.textPrimary, fontWeight: '900' },
  demoCountBadge: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFB08A' },
  researchButton: {
    position: 'absolute',
    alignSelf: 'center',
    minWidth: 164,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 7,
  },
  researchButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  locationButton: {
    position: 'absolute',
    right: 22,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  locationButtonIcon: { fontSize: 18, color: '#6C554F', fontWeight: '900', lineHeight: 20 },
  locationButtonLabel: { fontSize: 9, fontWeight: '700', color: '#6C554F', letterSpacing: -0.2 },
  zoomControl: {
    position: 'absolute',
    right: 22,
    width: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundPrimary,
    overflow: 'hidden',
    shadowColor: '#4A1A1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSecondary,
  },
  zoomButton: {
    width: 52,
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    fontSize: 30,
    lineHeight: 32,
    color: '#7A5B52',
    fontWeight: '500',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderTertiary,
  },
});
