import { supabase } from './supabase';
import { ToiletMarkerData } from '../types/toilet';
import { DEMO_TOILETS, getDemoToiletDetail } from './demoToilets';

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
      operating_hours: row.operating_hours ?? null,
      avg_rating: row.avg_rating ?? undefined,
      review_count: row.review_count ?? 0,
      bidet_rate:
        row.review_count > 0 ? (row.bidet_count ?? 0) / row.review_count : undefined,
    }));

    return toilets;
  }

  // RPC 실패 시 bounding box 폴백
  if (rpcError) {
    console.warn('toilets_near RPC 실패, bounding box 폴백:', rpcError.message);
  }

  return _getToiletsInRegionFallback(lat, lng, radiusKm);
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
    return __DEV__ ? DEMO_TOILETS : [];
  }

  if (!data || data.length === 0) {
    return __DEV__ ? DEMO_TOILETS : [];
  }

  return (data as any[]).map((row) => ({
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
  }));
}

/**
 * 화장실 상세 + 리뷰 요약 조회
 * - 캐시된 avg_rating 사용 (toilets 컬럼)
 * - 개별 리뷰는 그대로 조회 (상세 페이지에서 필요)
 */
export async function getToiletDetail(toiletId: string) {
  const demoDetail = getDemoToiletDetail(toiletId);
  if (demoDetail) return demoDetail;

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
        'id, toilet_id, user_id, rating, cleanliness, paper, soap, security, bidet, comment, image_urls, is_verified, created_at'
      )
      .eq('toilet_id', toiletId),
  ]);

  if (toiletRes.error) return null;

  const reviews = reviewRes.data ?? [];
  // 캐시 컬럼 우선, 없으면 실시간 계산
  const avg_rating =
    toiletRes.data?.avg_rating != null
      ? toiletRes.data.avg_rating
      : reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

  return {
    ...toiletRes.data,
    avg_rating,
    review_count: toiletRes.data?.review_count ?? reviews.length,
    reviews,
  };
}
