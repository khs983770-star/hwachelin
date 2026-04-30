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
  cleanliness: boolean;
  paper: boolean;
  soap: boolean;
  security: boolean;
  comment?: string;
  is_verified: boolean;
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
}
