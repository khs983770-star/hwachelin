import { supabase } from './supabase';
import { ToiletMarkerData } from '../types/toilet';
import { DEMO_TOILETS, getDemoToiletDetail } from './demoToilets';

const ENABLE_DEMO_TOILETS = process.env.EXPO_PUBLIC_ENABLE_DEMO_TOILETS === 'true';

/**
 * 현재 위치 기준 반경 내 화장실 목록 조회
 * - PostGIS ST_DWithin 기반 toilets_near RPC 사용
 * - 캐시된 avg_rating / review_count / bidet_count 활용 (reviews 별도 조회 불필요)
 * - RPC 실패 시 bounding box 폴백
 */
export async function getToiletsInRegion(
  lat: number,
  lng: number,
  radiusKm: number = 3
): Promise<ToiletMarkerData[]> {
  const radiusM = radiusKm * 1000;

  // PostGIS RPC 시도
  const { data: rpcData, error: rpcError } = await supabase.rpc('toilets_near', {
    center_lat: lat,
    center_lng: lng,
    radius_m: radiusM,
  });

  if (!rpcError && rpcData && rpcData.length > 0) {
    const toilets: ToiletMarkerData[] = (rpcData as any[]).map((row) => ({
      toilet_id: row.toilet_id,
      place_id: row.place_id,
      name: row.name ?? '화장실',
      address: row.address ?? '',
      lat: row.lat ?? lat,
      lng: row.lng ?? lng,
      type: row.type,
      access_type: row.access_type,
      floor: row.floor != null ? String(row.floor) : undefined,
      gender_type: row.gender_type ?? undefined,
      is_24hours: row.is_24hours ?? false,
      has_diaper_table: row.has_diaper_table ?? false,
      disabled_available: row.disabled_available ?? false,
      emergency_bell: row.emergency_bell ?? false,
      operating_hours: row.operating_hours ?? null,
      male_stalls: row.male_stalls ?? null,
      male_urinals: row.male_urinals ?? null,
      female_stalls: row.female_stalls ?? null,
      disabled_male_stalls: row.disabled_male_stalls ?? null,
      disabled_male_urinals: row.disabled_male_urinals ?? null,
      disabled_female_stalls: row.disabled_female_stalls ?? null,
      avg_rating: row.avg_rating ?? undefined,
      review_count: row.review_count ?? 0,
      bidet_rate:
        row.review_count > 0 ? (row.bidet_count ?? 0) / row.review_count : undefined,
    }));

    return filterDemoToilets(toilets);
  }

  // RPC 실패 시 bounding box 폴백
  if (rpcError) {
    console.warn('toilets_near RPC 실패, bounding box 폴백:', rpcError.message);
  }

  return _getToiletsInRegionFallback(lat, lng, radiusKm);
}

/**
 * 뷰포트 bounds 내 화장실 조회 (정확한 화면 범위)
 * - toilets_in_bounds RPC 사용 (Supabase JS foreign table filter 우회)
 */
export async function getToiletsInBounds(
  south: number,
  west: number,
  north: number,
  east: number
): Promise<ToiletMarkerData[]> {
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;

  const { data, error } = await supabase.rpc('toilets_in_bounds', {
    south,
    west,
    north,
    east,
  });

  if (error) {
    console.error('화장실 조회 오류:', error.message);
    return ENABLE_DEMO_TOILETS ? DEMO_TOILETS : [];
  }

  if (!data || data.length === 0) {
    return ENABLE_DEMO_TOILETS ? DEMO_TOILETS : [];
  }

  return filterDemoToilets(
    (data as any[]).map((row) => ({
      toilet_id: row.toilet_id,
      place_id: row.place_id,
      name: row.name ?? '화장실',
      address: row.address ?? '',
      lat: row.lat ?? centerLat,
      lng: row.lng ?? centerLng,
      type: row.type,
      access_type: row.access_type,
      floor: row.floor != null ? String(row.floor) : undefined,
      gender_type: row.gender_type ?? undefined,
      is_24hours: row.is_24hours ?? false,
      has_diaper_table: row.has_diaper_table ?? false,
      disabled_available: row.disabled_available ?? false,
      emergency_bell: row.emergency_bell ?? false,
      operating_hours: row.operating_hours ?? null,
      male_stalls: row.male_stalls ?? null,
      male_urinals: row.male_urinals ?? null,
      female_stalls: row.female_stalls ?? null,
      disabled_male_stalls: row.disabled_male_stalls ?? null,
      disabled_male_urinals: row.disabled_male_urinals ?? null,
      disabled_female_stalls: row.disabled_female_stalls ?? null,
      avg_rating: row.avg_rating ?? undefined,
      review_count: row.review_count ?? 0,
      bidet_rate:
        (row.review_count ?? 0) > 0
          ? (row.bidet_count ?? 0) / row.review_count
          : undefined,
    }))
  );
}

/**
 * toilet_id로 단일 화장실 마커 데이터 조회
 * 로컬 캐시에 없을 때 DB에서 직접 가져오는 용도
 */
export async function getToiletMarkerById(toiletId: string): Promise<ToiletMarkerData | null> {
  const { data: row, error: err } = await supabase
    .from('toilets')
    .select(`
      id, type, access_type, floor, gender_type, is_24hours, has_diaper_table,
      disabled_available, emergency_bell, operating_hours,
      avg_rating, review_count, bidet_count,
      male_stalls, male_urinals, female_stalls,
      disabled_male_stalls, disabled_male_urinals, disabled_female_stalls,
      places!inner(id, name, address, lat, lng)
    `)
    .eq('id', toiletId)
    .maybeSingle();

  if (err || !row) return null;
  const p = (row as any).places;
  return {
    toilet_id: row.id,
    place_id: p.id,
    name: p.name ?? '화장실',
    address: p.address ?? '',
    lat: p.lat,
    lng: p.lng,
    type: row.type,
    access_type: row.access_type,
    floor: row.floor != null ? String(row.floor) : undefined,
    gender_type: row.gender_type ?? undefined,
    is_24hours: row.is_24hours ?? false,
    has_diaper_table: row.has_diaper_table ?? false,
    disabled_available: row.disabled_available ?? false,
    emergency_bell: row.emergency_bell ?? false,
    operating_hours: row.operating_hours ?? null,
    male_stalls: row.male_stalls ?? null,
    male_urinals: row.male_urinals ?? null,
    female_stalls: row.female_stalls ?? null,
    disabled_male_stalls: row.disabled_male_stalls ?? null,
    disabled_male_urinals: row.disabled_male_urinals ?? null,
    disabled_female_stalls: row.disabled_female_stalls ?? null,
    avg_rating: row.avg_rating ?? undefined,
    review_count: row.review_count ?? 0,
    bidet_rate:
      (row.review_count ?? 0) > 0
        ? (row.bidet_count ?? 0) / row.review_count
        : undefined,
  };
}

/**
 * 특정 좌표 근처(기본 50m 이내) 가장 가까운 화장실 반환
 * 검색 장소 선택 시 해당 장소의 화장실 여부 확인에 사용
 */
export async function findToiletNear(
  lat: number,
  lng: number,
  radiusMeters = 50
): Promise<ToiletMarkerData | null> {
  const latDelta = radiusMeters / 111_000;
  const lngDelta = radiusMeters / (111_000 * Math.cos((lat * Math.PI) / 180));

  const results = await getToiletsInBounds(
    lat - latDelta,
    lng - lngDelta,
    lat + latDelta,
    lng + lngDelta
  );
  if (results.length === 0) return null;

  // 가장 가까운 화장실 계산
  let closest: ToiletMarkerData | null = null;
  let minDist = Infinity;
  for (const t of results) {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(t.lat - lat);
    const dLng = toRad(t.lng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(t.lat)) * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist < minDist) {
      minDist = dist;
      closest = t;
    }
  }
  return minDist <= radiusMeters ? closest : null;
}

/**
 * 폴백: bounding box + 별도 reviews 조회 (구 방식)
 */
async function _getToiletsInRegionFallback(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<ToiletMarkerData[]> {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const { data, error } = await supabase
    .from('toilets')
    .select(`
      id,
      place_id,
      type,
      access_type,
      floor,
      gender_type,
      is_24hours,
      has_diaper_table,
      operating_hours,
      avg_rating,
      review_count,
      bidet_count,
      places!inner (
        id,
        name,
        address,
        lat,
        lng
      )
    `)
    .gte('places.lat', lat - latDelta)
    .lte('places.lat', lat + latDelta)
    .gte('places.lng', lng - lngDelta)
    .lte('places.lng', lng + lngDelta)
    .limit(1000);

  if (error) {
    console.error('화장실 조회 오류:', error.message);
    return ENABLE_DEMO_TOILETS ? DEMO_TOILETS : [];
  }

  if (!data || data.length === 0) {
    return ENABLE_DEMO_TOILETS ? DEMO_TOILETS : [];
  }

  return filterDemoToilets((data as any[]).map((row) => ({
    toilet_id: row.id,
    place_id: row.place_id,
    name: row.places?.name ?? '화장실',
    address: row.places?.address ?? '',
    lat: row.places?.lat ?? lat,
    lng: row.places?.lng ?? lng,
    type: row.type,
    access_type: row.access_type,
    floor: row.floor != null ? String(row.floor) : undefined,
    gender_type: row.gender_type ?? undefined,
    is_24hours: row.is_24hours ?? false,
    has_diaper_table: row.has_diaper_table ?? false,
    operating_hours: row.operating_hours ?? null,
    avg_rating: row.avg_rating ?? undefined,
    review_count: row.review_count ?? 0,
    bidet_rate:
      (row.review_count ?? 0) > 0
        ? (row.bidet_count ?? 0) / row.review_count
        : undefined,
  })));
}

/**
 * 화장실 상세 + 리뷰 요약 조회
 * - 캐시된 avg_rating 사용 (toilets 컬럼)
 * - 개별 리뷰는 그대로 조회 (상세 페이지에서 필요)
 */
export async function getToiletDetail(toiletId: string) {
  if (ENABLE_DEMO_TOILETS) {
    const demoDetail = getDemoToiletDetail(toiletId);
    if (demoDetail) return demoDetail;
  }

  const [toiletRes, reviewRes] = await Promise.all([
    supabase
      .from('toilets')
      .select(`
        *,
        places (*)
      `)
      .eq('id', toiletId)
      .single(),
    supabase
      .from('reviews')
      .select(
        'id, toilet_id, user_id, rating, cleanliness_level, paper, soap, hand_dryer, hand_tissue, has_password, bidet, mood_tags, comment, image_urls, is_verified, helpful_count, created_at'
      )
      .eq('toilet_id', toiletId),
  ]);

  if (toiletRes.error) return null;

  const reviews = reviewRes.data ?? [];
  // 상세 화면에서는 reviews를 직접 전체 조회하므로 캐시 컬럼 대신 실시간 계산
  const avg_rating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return {
    ...toiletRes.data,
    avg_rating,
    review_count: reviews.length,
    reviews,
  };
}

function filterDemoToilets(toilets: ToiletMarkerData[]) {
  if (ENABLE_DEMO_TOILETS) return toilets;
  return toilets.filter((toilet) => !isDemoToilet(toilet));
}

function isDemoToilet(toilet: ToiletMarkerData) {
  return (
    toilet.toilet_id.startsWith('demo-') ||
    toilet.toilet_id.startsWith('demo_') ||
    toilet.place_id.startsWith('demo-') ||
    toilet.place_id.startsWith('demo_') ||
    toilet.name.includes('시청역 데모') ||
    toilet.address.includes('데모로')
  );
}
