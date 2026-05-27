export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  MyPage: undefined;
  Admin: undefined;
  Policy: { type: 'privacy' | 'terms' };
  ToiletDetail: {
    toiletId: string;
  };
  PhotoGallery: {
    toiletId: string;
  };
  MyBookmarks: undefined;
  MyReviews: undefined;
  MyReports: undefined;
  ReviewWrite: {
    toiletId: string;
    toiletName?: string;
    reviewId?: string;
    initialRating?: number;
    initialCleanlinessLevel?: 'clean' | 'normal' | 'dirty' | null;
    initialPaper?: boolean | null;
    initialSoap?: boolean | null;
    initialHandDryer?: boolean | null;
    initialHandTissue?: boolean | null;
    initialBidet?: boolean | null;
    initialHasPassword?: boolean | null;
    initialMoodTags?: string[] | null;
    initialImageUrls?: string[] | null;
    initialComment?: string | null;
    /** GPS 50m 인증용 화장실 좌표 */
    toiletLat?: number;
    toiletLng?: number;
  };
  AllReviews: {
    toiletId: string;
    toiletName?: string;
  };
  Report: {
    toiletId?: string;
    placeName?: string;
    address?: string;
    lat?: number;
    lng?: number;
    reportType?: 'new_toilet' | 'correction';
    kakaoPlaceId?: string;
  };
};
