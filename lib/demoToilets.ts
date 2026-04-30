import { Review, ToiletMarkerData } from '../types/toilet';
import { CITYHALL_DEMO_TOILETS } from './cityhallDemoToilets';

const SEED_DEMO_TOILETS: ToiletMarkerData[] = [
  {
    toilet_id: 'demo-seoul-city-hall',
    place_id: 'demo-place-seoul-city-hall',
    name: '서울시청 공중화장실',
    address: '서울특별시 중구 세종대로 110',
    lat: 37.5665,
    lng: 126.978,
    type: '공공',
    access_type: '누구나',
    avg_rating: 4.2,
    review_count: 3,
  },
  {
    toilet_id: 'demo-gwanghwamun-square',
    place_id: 'demo-place-gwanghwamun-square',
    name: '광화문광장 화장실',
    address: '서울특별시 종로구 세종로 172',
    lat: 37.5758,
    lng: 126.9769,
    type: '공공',
    access_type: '누구나',
    avg_rating: 4.5,
    review_count: 5,
  },
  {
    toilet_id: 'demo-cheonggyecheon',
    place_id: 'demo-place-cheonggyecheon',
    name: '청계천 공중화장실',
    address: '서울특별시 중구 청계천로 40',
    lat: 37.5695,
    lng: 126.9822,
    type: '공공',
    access_type: '누구나',
    avg_rating: 3.8,
    review_count: 2,
  },
];

export const DEMO_TOILETS: ToiletMarkerData[] =
  CITYHALL_DEMO_TOILETS.length > 0 ? CITYHALL_DEMO_TOILETS : SEED_DEMO_TOILETS;

const DEMO_REVIEWS: Pick<
  Review,
  'rating' | 'cleanliness' | 'paper' | 'soap' | 'security' | 'is_verified'
>[] = [
  { rating: 4.5, cleanliness: true, paper: true, soap: true, security: true, is_verified: true },
  { rating: 4, cleanliness: true, paper: true, soap: false, security: true, is_verified: true },
  { rating: 3.5, cleanliness: false, paper: true, soap: true, security: true, is_verified: false },
];

export function getDemoToiletDetail(toiletId: string) {
  const marker = DEMO_TOILETS.find((toilet) => toilet.toilet_id === toiletId);
  if (!marker) return null;
  const cityHallDetail = CITYHALL_DEMO_TOILETS.find((toilet) => toilet.toilet_id === toiletId);

  const reviews = DEMO_REVIEWS;
  const avg_rating =
    marker.avg_rating ?? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return {
    id: marker.toilet_id,
    place_id: marker.place_id,
    type: marker.type,
    access_type: marker.access_type,
    floor: cityHallDetail?.floor ?? '1층',
    gender_type: cityHallDetail?.gender_type ?? '남녀분리',
    avg_rating,
    review_count: marker.review_count ?? reviews.length,
    reviews,
    places: {
      id: marker.place_id,
      name: marker.name,
      address: marker.address,
      lat: marker.lat,
      lng: marker.lng,
      source: 'public' as const,
    },
  };
}
