export type RootStackParamList = {
  MainTabs: undefined;
  ToiletDetail: {
    toiletId: string;
  };
  ReviewWrite: {
    toiletId: string;
    toiletName?: string;
    /** GPS 50m 인증용 화장실 좌표 */
    toiletLat?: number;
    toiletLng?: number;
  };
};
