export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Admin: undefined;
  Policy: { type: 'privacy' | 'terms' };
  ToiletDetail: {
    toiletId: string;
  };
  MyBookmarks: undefined;
  MyReviews: undefined;
  ReviewWrite: {
    toiletId: string;
    toiletName?: string;
    reviewId?: string;
    initialRating?: number;
    initialCleanliness?: boolean;
    initialPaper?: boolean;
    initialSoap?: boolean;
    initialSecurity?: boolean;
    initialBidet?: boolean;
    initialComment?: string | null;
    initialImageUrls?: string[];
    /** GPS 50m 인증용 화장실 좌표 */
    toiletLat?: number;
    toiletLng?: number;
  };
  Report: {
    toiletId?: string;
    placeName?: string;
    address?: string;
    lat?: number;
    lng?: number;
    reportType?: 'new_toilet' | 'correction';
  };
};
