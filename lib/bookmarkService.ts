import { supabase } from './supabase';

export interface BookmarkedToilet {
  bookmark_id: string;
  toilet_id: string;
  name: string;
  address: string;
  type: '공공' | '매장';
  access_type: '누구나' | '손님만' | '비밀번호';
  avg_rating?: number;
  review_count?: number;
  bookmarked_at: string;
}

// ─── 북마크 토글 ─────────────────────────────────────────────────────────
export type ToggleResult =
  | { ok: true; isBookmarked: boolean }
  | { ok: false; reason: 'NOT_LOGGED_IN' | 'DB_ERROR'; message: string };

export async function toggleBookmark(toiletId: string): Promise<ToggleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'NOT_LOGGED_IN', message: '로그인이 필요해요' };
  }

  // 이미 북마크 있는지 확인
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('toilet_id', toiletId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id);
    if (error) return { ok: false, reason: 'DB_ERROR', message: error.message };
    return { ok: true, isBookmarked: false };
  } else {
    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: user.id, toilet_id: toiletId });
    if (error) return { ok: false, reason: 'DB_ERROR', message: error.message };
    return { ok: true, isBookmarked: true };
  }
}

// ─── 북마크 여부 조회 ─────────────────────────────────────────────────────
export async function checkIsBookmarked(toiletId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('toilet_id', toiletId)
    .maybeSingle();

  return !!data;
}

// ─── 북마크 목록 조회 (places + review 통계 포함) ─────────────────────────
export async function getBookmarks(): Promise<BookmarkedToilet[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      id,
      created_at,
      toilets (
        id,
        type,
        access_type,
        places (
          name,
          address
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const items: BookmarkedToilet[] = (data as any[])
    .map((row) => {
      const toilet = Array.isArray(row.toilets) ? row.toilets[0] : row.toilets;
      const place = Array.isArray(toilet?.places) ? toilet.places[0] : toilet?.places;
      if (!toilet?.id) return null;
      return {
        bookmark_id: row.id,
        toilet_id: toilet.id,
        name: place?.name ?? '화장실',
        address: place?.address ?? '',
        type: toilet.type,
        access_type: toilet.access_type,
        bookmarked_at: row.created_at,
      };
    })
    .filter(Boolean) as BookmarkedToilet[];

  // 리뷰 통계 집계
  if (items.length > 0) {
    const ids = items.map((t) => t.toilet_id);
    const { data: reviews } = await supabase
      .from('reviews')
      .select('toilet_id, rating')
      .in('toilet_id', ids);

    if (reviews) {
      const stats = reviews.reduce<Record<string, { sum: number; count: number }>>(
        (acc, r) => {
          const cur = acc[r.toilet_id] ?? { sum: 0, count: 0 };
          cur.sum += r.rating;
          cur.count += 1;
          acc[r.toilet_id] = cur;
          return acc;
        },
        {}
      );
      items.forEach((t) => {
        const s = stats[t.toilet_id];
        if (s) {
          t.avg_rating = s.sum / s.count;
          t.review_count = s.count;
        }
      });
    }
  }

  return items;
}

// ─── 북마크 단건 삭제 ─────────────────────────────────────────────────────
export async function removeBookmark(bookmarkId: string): Promise<boolean> {
  const { error } = await supabase.from('bookmarks').delete().eq('id', bookmarkId);
  return !error;
}

// ─── 북마크 수 조회 ───────────────────────────────────────────────────────
export async function getBookmarkCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('bookmarks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}
