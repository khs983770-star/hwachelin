import { ToiletMarkerData } from '../types/toilet';

export interface GoldContextSnapshot {
  center: { lat: number; lng: number };
  toilets: ToiletMarkerData[];
  searchQuery: string;
  selectedFilter: string;
  updatedAt: number;
}

const DEFAULT_SNAPSHOT: GoldContextSnapshot = {
  center: { lat: 37.5665, lng: 126.978 },
  toilets: [],
  searchQuery: '',
  selectedFilter: '전체',
  updatedAt: 0,
};

let snapshot = DEFAULT_SNAPSHOT;
const listeners = new Set<(nextSnapshot: GoldContextSnapshot) => void>();

export function getGoldContextSnapshot() {
  return snapshot;
}

export function setGoldContextSnapshot(nextSnapshot: Omit<GoldContextSnapshot, 'updatedAt'>) {
  snapshot = { ...nextSnapshot, updatedAt: Date.now() };
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeGoldContext(listener: (nextSnapshot: GoldContextSnapshot) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWeightedGoldScore(avgRating: number, reviewCount: number) {
  const priorRating = 3.7;
  const minimumReviewWeight = 3;
  return (
    (reviewCount / (reviewCount + minimumReviewWeight)) * avgRating +
    (minimumReviewWeight / (reviewCount + minimumReviewWeight)) * priorRating
  );
}
