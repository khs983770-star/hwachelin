import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDistanceMeters,
  PlaceSearchResult,
  searchPlaces,
} from '../lib/searchService';
import { ToiletMarkerData } from '../types/toilet';

const RECENT_KEYWORDS_KEY = '@hwachelin/recent_search_keywords';
const DEBOUNCE_MS = 300;
const MAX_RECENT_KEYWORDS = 5;

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type SearchFilters = {
  toiletOnly: boolean;
  publicOnly: boolean;
  highRating: boolean;
};

export type RecentKeyword = {
  keyword: string;
  searchedAt: string;
};

export type TrendingKeyword = {
  keyword: string;
  count: number;
};

const INITIAL_TRENDING: TrendingKeyword[] = [
  { keyword: '강남 화장실', count: 34 },
  { keyword: '스타벅스', count: 29 },
  { keyword: '서울역 화장실', count: 24 },
  { keyword: '카페', count: 21 },
  { keyword: '광화문', count: 18 },
  { keyword: '홍대입구', count: 15 },
];

export function useSearch(
  center?: { lat: number; lng: number },
  localToilets: ToiletMarkerData[] = []
) {
  const [query, setQuery] = useState('');
  const [kakaoResults, setKakaoResults] = useState<PlaceSearchResult[]>([]);
  const [recentKeywords, setRecentKeywords] = useState<RecentKeyword[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>(INITIAL_TRENDING);
  const [filters, setFilters] = useState<SearchFilters>({
    toiletOnly: false,
    publicOnly: false,
    highRating: false,
  });
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  useEffect(() => {
    loadRecentKeywords();
    return () => abortRef.current?.abort();
  }, []);

  const loadRecentKeywords = async () => {
    const raw = await AsyncStorage.getItem(RECENT_KEYWORDS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setRecentKeywords(parsed);
    } catch {
      setRecentKeywords([]);
    }
  };

  const localResults = useMemo(
    () => buildLocalResults(query, localToilets, center),
    [center?.lat, center?.lng, localToilets, query]
  );

  const results = useMemo(() => {
    const merged = mergeResults(localResults, kakaoResults);
    return merged.sort((a, b) => rankSearchResults(a, b, query)).slice(0, 10);
  }, [kakaoResults, localResults, query]);

  const runSearch = useCallback(
    async (nextQuery = query) => {
      const keyword = nextQuery.trim();
      lastQueryRef.current = keyword;
      abortRef.current?.abort();

      if (!keyword) {
        setKakaoResults([]);
        setErrorMessage(null);
        setStatus('idle');
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setStatus('loading');
      setErrorMessage(null);

      try {
        const nextKakaoResults = await searchPlaces({
          query: keyword,
          center,
          signal: controller.signal,
          size: 15,
        });

        if (controller.signal.aborted || lastQueryRef.current !== keyword) return;

        setKakaoResults(nextKakaoResults);
        setStatus(
          mergeResults(buildLocalResults(keyword, localToilets, center), nextKakaoResults).length > 0
            ? 'success'
            : 'empty'
        );
      } catch (error: any) {
        if (controller.signal.aborted) return;
        setKakaoResults([]);
        setStatus(localResults.length > 0 ? 'success' : 'error');
        setErrorMessage(error?.message ?? '장소 검색 중 오류가 발생했어요.');
      }
    },
    [center?.lat, center?.lng, localResults.length, localToilets, query]
  );

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const saveRecentKeyword = useCallback((keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setRecentKeywords((current) => {
      const next = [
        { keyword: trimmed, searchedAt: new Date().toISOString() },
        ...current.filter((item) => item.keyword !== trimmed),
      ].slice(0, MAX_RECENT_KEYWORDS);
      AsyncStorage.setItem(RECENT_KEYWORDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteRecentKeyword = useCallback((keyword: string) => {
    setRecentKeywords((current) => {
      const next = current.filter((item) => item.keyword !== keyword);
      AsyncStorage.setItem(RECENT_KEYWORDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecentKeywords = useCallback(() => {
    setRecentKeywords([]);
    AsyncStorage.removeItem(RECENT_KEYWORDS_KEY);
  }, []);

  const bumpTrendingKeyword = useCallback((keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setTrendingKeywords((current) => {
      const existing = current.find((item) => item.keyword === trimmed);
      const next = existing
        ? current.map((item) =>
            item.keyword === trimmed ? { ...item, count: item.count + 1 } : item
          )
        : [{ keyword: trimmed, count: 1 }, ...current];
      return next.sort((a, b) => b.count - a.count).slice(0, 8);
    });
  }, []);

  const saveSelectedPlace = useCallback(
    (place: PlaceSearchResult) => {
      saveRecentKeyword(place.name);
      bumpTrendingKeyword(place.name);
    },
    [bumpTrendingKeyword, saveRecentKeyword]
  );

  const toggleFilter = useCallback((key: keyof SearchFilters) => {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const clearQuery = useCallback(() => {
    abortRef.current?.abort();
    setQuery('');
    setKakaoResults([]);
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  const retry = useCallback(() => {
    runSearch(query);
  }, [query, runSearch]);

  return {
    query,
    setQuery,
    results,
    recentKeywords,
    trendingKeywords,
    filters,
    status: results.length > 0 && status === 'empty' ? 'success' : status,
    errorMessage,
    isLoading: status === 'loading',
    saveSelectedPlace,
    deleteRecentKeyword,
    clearRecentKeywords,
    toggleFilter,
    clearQuery,
    retry,
  };
}

function buildLocalResults(
  query: string,
  toilets: ToiletMarkerData[],
  center?: { lat: number; lng: number }
): PlaceSearchResult[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];

  return toilets
    .filter((toilet) => {
      const target = [toilet.name, toilet.type, toilet.address, toilet.access_type, toilet.gender_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return target.includes(keyword);
    })
    .map((toilet) => ({
      id: `local:${toilet.toilet_id}`,
      name: toilet.name,
      category: toilet.type === '공공' ? '공공화장실' : '매장 화장실',
      address: toilet.address,
      roadAddress: toilet.address,
      lat: toilet.lat,
      lng: toilet.lng,
      source: 'local' as const,
      hasToiletData: true,
      toiletId: toilet.toilet_id,
      toiletType: toilet.type,
      avgRating: toilet.avg_rating,
      reviewCount: toilet.review_count ?? 0,
      distanceMeters: center
        ? getDistanceMeters(center.lat, center.lng, toilet.lat, toilet.lng)
        : undefined,
    }));
}

function mergeResults(localResults: PlaceSearchResult[], kakaoResults: PlaceSearchResult[]) {
  const seen = new Set<string>();
  const merged: PlaceSearchResult[] = [];

  [...localResults, ...kakaoResults].forEach((item) => {
    const key = `${item.name}:${Math.round(item.lat * 10000)}:${Math.round(item.lng * 10000)}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
}

function rankSearchResults(a: PlaceSearchResult, b: PlaceSearchResult, query: string) {
  const relevanceDiff = getTextRelevance(b, query) - getTextRelevance(a, query);
  if (relevanceDiff !== 0) return relevanceDiff;

  if (Number(b.hasToiletData) !== Number(a.hasToiletData)) {
    return Number(b.hasToiletData) - Number(a.hasToiletData);
  }
  if ((b.avgRating ?? 0) !== (a.avgRating ?? 0)) return (b.avgRating ?? 0) - (a.avgRating ?? 0);
  if ((b.reviewCount ?? 0) !== (a.reviewCount ?? 0)) return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  return (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER);
}

function getTextRelevance(item: PlaceSearchResult, query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return 0;

  const name = item.name.toLowerCase();
  const category = item.category.toLowerCase();
  const roadAddress = item.roadAddress.toLowerCase();
  const address = item.address.toLowerCase();

  if (name === keyword) return 100;
  if (name.startsWith(keyword)) return 90;
  if (name.includes(keyword)) return 80;
  if (category.includes(keyword)) return 65;
  if (roadAddress.includes(keyword) || address.includes(keyword)) return 35;
  return 0;
}
