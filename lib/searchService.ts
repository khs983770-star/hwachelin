export interface PlaceSearchResult {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  source: 'kakao' | 'local';
  hasToiletData: boolean;
  toiletId?: string;
  toiletType?: '공공' | '매장';
  avgRating?: number;
  reviewCount?: number;
  distanceMeters?: number;
  /** 카카오 place id (카카오 결과에만 존재) */
  kakaoPlaceId?: string;
  /** 카카오 category_group_code: SW8=지하철역, CE7=카페, FD6=음식점 등. 빈 문자열=지역/행정구역 */
  categoryGroupCode?: string;
}

/**
 * 지역 이동형 검색인지 판별 (지도 중심만 이동, 바텀시트 없음)
 *
 * 아래 코드는 지역 이동형으로 처리한다:
 *  - ''    = 지역명·행정구역 검색 (Kakao가 category_group_code를 내려주지 않는 경우)
 *  - 'SW8' = 지하철역
 *  - 'AD5' = 행정구역 (시/구/동 등)
 */
export const AREA_SEARCH_CODES: readonly string[] = ['SW8', 'AD5'];

export function isAreaSearch(categoryGroupCode: string | undefined): boolean {
  if (!categoryGroupCode) return true; // 빈 코드 = 지역명·행정구역
  return AREA_SEARCH_CODES.includes(categoryGroupCode);
}

export type SearchPlacesParams = {
  query: string;
  center?: { lat: number; lng: number };
  signal?: AbortSignal;
  size?: number;
};

const KAKAO_LOCAL_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

const KAKAO_REST_API_KEY =
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ??
  process.env.EXPO_PUBLIC_KAKAO_REST_KEY ??
  '';

export async function searchPlaces({
  query,
  center,
  signal,
  size = 8,
}: SearchPlacesParams): Promise<PlaceSearchResult[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  if (!KAKAO_REST_API_KEY) {
    throw new Error('카카오 REST API 키가 설정되지 않았어요.');
  }

  const params = new URLSearchParams({
    query: keyword,
    size: String(Math.min(Math.max(size, 1), 15)),
    sort: 'accuracy',
  });

  if (center) {
    // x/y는 정확도 정렬 시 거리 가중치로 활용되지만 radius는 제거해
    // 반경 밖 장소(예: 특정 가게명 검색)도 누락 없이 반환되도록 함
    params.set('x', String(center.lng));
    params.set('y', String(center.lat));
  }

  const response = await fetch(`${KAKAO_LOCAL_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`장소 검색에 실패했어요. (${response.status})`);
  }

  const json = await response.json();
  return (json.documents ?? []).map((item: any): PlaceSearchResult => ({
    id: item.id,
    name: item.place_name,
    category: getShortCategory(item.category_group_name || item.category_name),
    address: item.address_name ?? '',
    roadAddress: item.road_address_name ?? '',
    lat: Number(item.y),
    lng: Number(item.x),
    source: 'kakao',
    hasToiletData: false,
    kakaoPlaceId: item.id,
    categoryGroupCode: item.category_group_code ?? '',
  }));
}

export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getShortCategory(category: string) {
  if (!category) return '장소';
  const parts = category.split('>').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || category;
}
