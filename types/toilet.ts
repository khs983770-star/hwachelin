export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: 'public' | 'user';
  kakao_place_id?: string;
  created_at?: string;
}

export interface Toilet {
  id: string;
  place_id: string;
  type: '공공' | '매장';
  access_type: '누구나' | '손님만' | '비밀번호';
  floor?: string | number | null;
  gender_type?: string | null;
  registered_by?: string;
  created_at?: string;
  // joined from places
  places?: Place;
  // computed
  avg_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  toilet_id: string;
  user_id: string;
  rating: number;
  cleanliness: boolean | null;
  /** 청결 수준 enum (clean/normal/dirty) */
  cleanliness_level?: 'clean' | 'normal' | 'dirty' | null;
  paper: boolean | null;
  soap: boolean | null;
  hand_dryer?: boolean | null;
  hand_tissue?: boolean | null;
  bidet: boolean | null;
  has_password?: boolean | null;
  security?: boolean | null;
  /** 분위기 태그 키 배열 */
  mood_tags?: string[] | null;
  comment?: string | null;
  image_urls: string[];
  is_verified: boolean;
  /** 도움됐어요 누적 수 (캐시 컬럼) */
  helpful_count?: number;
  created_at: string;
}

export interface ToiletMarkerData {
  toilet_id: string;
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: '공공' | '매장';
  access_type: '누구나' | '손님만' | '비밀번호';
  floor?: string | null;
  gender_type?: string | null;
  avg_rating?: number;
  review_count?: number;
  /** 리뷰 중 비데 체크 비율 (0~1) */
  bidet_rate?: number;
  /** 24시간 운영 여부 */
  is_24hours?: boolean;
  /** 기저귀 교환대 여부 */
  has_diaper_table?: boolean;
  /** 장애인 화장실 여부 */
  disabled_available?: boolean;
  /** 비상벨 설치 여부 */
  emergency_bell?: boolean;
  /** 운영시간 텍스트 (예: "09:00~22:00 / 주말 휴무") */
  operating_hours?: string | null;
  /** 지도 마커 렌더링용 운영 상태 */
  operating_state?: 'open' | 'closed' | 'unknown';
  /** 칸 수 정보 */
  male_stalls?: number | null;
  male_urinals?: number | null;
  female_stalls?: number | null;
  disabled_male_stalls?: number | null;
  disabled_male_urinals?: number | null;
  disabled_female_stalls?: number | null;
}
