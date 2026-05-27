import { ToiletMarkerData } from '../types/toilet';
import { getOperatingStatus } from './operatingHours';

export const STAR_FILTER = '별점';
export const URGENT_FILTER = '🚨 급해요';

export const FILTER_OPTIONS = [
  { label: '전체', enabled: true },
  { label: '24시간', enabled: true },
  { label: '비데', enabled: true },
  { label: '개방형', enabled: true },
  { label: '기저귀', enabled: true },
  { label: '남녀분리', enabled: true },
  { label: STAR_FILTER, enabled: true },
  { label: URGENT_FILTER, enabled: true },
] as const;

/**
 * 선택된 필터 배열(AND 조건)로 화장실 목록 필터링
 * - 빈 배열 또는 '전체'만 있으면 모든 화장실 반환
 * - URGENT_FILTER는 이 함수에서 처리하지 않음 (UI 레벨에서 별도 처리)
 */
export function filterToilets(
  toilets: ToiletMarkerData[],
  normalizedSearchQuery: string,
  selectedFilters: string[]
) {
  const activeFilters = selectedFilters.filter(
    (f) => f !== '전체' && f !== URGENT_FILTER
  );

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

    if (!matchesSearch) return false;

    // 모든 활성 필터를 AND 조건으로 적용
    return activeFilters.every((filter) => matchesOneFilter(toilet, filter));
  });
}

export function addOperatingState(toilets: ToiletMarkerData[]) {
  return toilets.map((toilet) => ({
    ...toilet,
    operating_state: getOperatingStatus({
      operatingHours: toilet.operating_hours,
      is24Hours: toilet.is_24hours,
    }).state,
  }));
}

export function hasDemoToilets(toilets: ToiletMarkerData[]) {
  return toilets.some(
    (toilet) =>
      toilet.toilet_id.startsWith('demo-') ||
      toilet.name.includes('시청역 데모') ||
      toilet.address.includes('데모로')
  );
}

function matchesOneFilter(toilet: ToiletMarkerData, filter: string) {
  if (filter === '개방형') return toilet.access_type === '누구나';
  if (filter === '남녀분리') return toilet.gender_type === '남녀분리';
  if (filter === STAR_FILTER) return (toilet.avg_rating ?? 0) >= 4.3;
  if (filter === '24시간') return toilet.is_24hours === true;
  if (filter === '비데') return (toilet.bidet_rate ?? 0) >= 0.5;
  if (filter === '기저귀') return toilet.has_diaper_table === true;
  return true;
}

/** 두 좌표 사이 거리(미터) 계산 */
export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 급해요 모드: 가장 가까운 Top N 화장실 반환 (rank 포함) */
export function getUrgentToilets(
  toilets: ToiletMarkerData[],
  userLocation: { lat: number; lng: number },
  topN = 3
): (ToiletMarkerData & { rank: number })[] {
  return toilets
    .map((t) => ({
      ...t,
      _dist: getDistanceMeters(userLocation.lat, userLocation.lng, t.lat, t.lng),
    }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, topN)
    .map((t, i) => ({ ...t, rank: i + 1 }));
}
