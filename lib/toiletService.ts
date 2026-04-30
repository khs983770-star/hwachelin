import { supabase } from './supabase';
import { ToiletMarkerData } from '../types/toilet';
import { DEMO_TOILETS, getDemoToiletDetail } from './demoToilets';

/**
 * 현재 위치 기준 반경 내 화장실 목록 조회
 * - places + toilets JOIN
 * - 위경도 bounding box 방식 (PostGIS 없이도 동작)
 */
export async function getToiletsInRegion(
  lat: number,
  lng: number,
  radiusKm: number = 3
): Promise<ToiletMarkerData[]> {
  // 1도 ≈ 111km
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
    return [];
  }

  if (!data) return [];

  // 타입 캐스팅 및 평탄화
  const toilets: ToiletMarkerData[] = (data as any[]).map((row) => ({
    toilet_id: row.id,
    place_id: row.place_id,
    name: row.places?.name ?? '화장실',
    address: row.places?.address ?? '',
    lat: row.places?.lat ?? lat,
    lng: row.places?.lng ?? lng,
    type: row.type,
    access_type: row.access_type,
    floor: row.floor ?? undefined,
    gender_type: row.gender_type ?? undefined,
  }));

  if (toilets.length > 0) {
    const toiletIds = toilets.map((toilet) => toilet.toilet_id);
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('toilet_id, rating')
      .in('toilet_id', toiletIds);

    if (!reviewError && reviews) {
      const reviewStats = reviews.reduce<Record<string, { sum: number; count: number }>>(
        (acc, review) => {
          const current = acc[review.toilet_id] ?? { sum: 0, count: 0 };
          current.sum += Number(review.rating);
          current.count += 1;
          acc[review.toilet_id] = current;
          return acc;
        },
        {}
      );

      toilets.forEach((toilet) => {
        const stats = reviewStats[toilet.toilet_id];
        if (!stats) return;
        toilet.avg_rating = stats.sum / stats.count;
        toilet.review_count = stats.count;
      });
    }
  }

  if (toilets.length === 0 && __DEV__) {
    return DEMO_TOILETS;
  }

  return toilets;
}

/**
 * 화장실 상세 + 리뷰 요약 조회
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
      .select('id, toilet_id, user_id, rating, cleanliness, paper, soap, security, comment, is_verified, created_at')
      .eq('toilet_id', toiletId),
  ]);

  if (toiletRes.error) return null;

  const reviews = reviewRes.data ?? [];
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
