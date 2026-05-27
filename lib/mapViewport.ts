import { ToiletMarkerData } from '../types/toilet';

export type LatLng = {
  lat: number;
  lng: number;
};

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type MapViewport = LatLng & {
  radiusKm?: number;
  bounds?: MapBounds;
};

type RegionLike = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
export const REFRESH_DISTANCE_METERS = 400;
export const FALLBACK_FETCH_RADIUS_KM = 3;

const DEFAULT_FETCH_RADIUS_KM = 1.2;
const MIN_FETCH_RADIUS_KM = 0.45;
const MAX_FETCH_RADIUS_KM = 3;
const FETCH_RADIUS_PADDING = 1.15;

export function normalizeFetchRadius(radiusKm?: number) {
  if (typeof radiusKm !== 'number' || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return DEFAULT_FETCH_RADIUS_KM;
  }

  return clampFetchRadius(radiusKm * FETCH_RADIUS_PADDING);
}

export function clampFetchRadius(radiusKm: number) {
  return Math.min(MAX_FETCH_RADIUS_KM, Math.max(MIN_FETCH_RADIUS_KM, radiusKm));
}

export function getAppleRegionRadiusKm(region: RegionLike) {
  const latRadiusKm = (region.latitudeDelta * 111.32) / 2;
  const lngRadiusKm =
    (region.longitudeDelta * 111.32 * Math.cos((region.latitude * Math.PI) / 180)) / 2;
  return Math.sqrt(latRadiusKm * latRadiusKm + lngRadiusKm * lngRadiusKm);
}

export function getAppleRegionBounds(region: RegionLike): MapBounds {
  const latDelta = region.latitudeDelta / 2;
  const lngDelta = region.longitudeDelta / 2;
  return {
    north: region.latitude + latDelta,
    south: region.latitude - latDelta,
    east: region.longitude + lngDelta,
    west: region.longitude - lngDelta,
  };
}

export function isToiletInBounds(toilet: ToiletMarkerData, bounds: MapBounds) {
  const isInLat = toilet.lat <= bounds.north && toilet.lat >= bounds.south;
  const isInLng =
    bounds.west <= bounds.east
      ? toilet.lng >= bounds.west && toilet.lng <= bounds.east
      : toilet.lng >= bounds.west || toilet.lng <= bounds.east;
  return isInLat && isInLng;
}
