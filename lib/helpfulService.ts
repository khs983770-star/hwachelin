import { supabase } from './supabase';

export type HelpfulToggleResult =
  | { ok: true; isHelpful: boolean }
  | { ok: false; reason: 'NOT_LOGGED_IN' | 'SELF_REVIEW' | 'DB_ERROR'; message: string };

/**
 * 리뷰에 '도움됐어요' 토글.
 * - 이미 누른 상태면 해제, 안 누른 상태면 추가
 * - 본인 리뷰엔 사용 불가 (RLS + 클라이언트 양쪽에서 차단)
 */
export async function toggleHelpful(reviewId: string): Promise<HelpfulToggleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'NOT_LOGGED_IN', message: '로그인이 필요해요' };
  }

  // 이미 눌렀는지 확인
  const { data: existing } = await supabase
    .from('review_helpfuls')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('review_helpfuls').delete().eq('id', existing.id);
    if (error) return { ok: false, reason: 'DB_ERROR', message: error.message };
    return { ok: true, isHelpful: false };
  }

  const { error } = await supabase
    .from('review_helpfuls')
    .insert({ review_id: reviewId, user_id: user.id });
  if (error) {
    // RLS WITH CHECK 위반(본인 리뷰) → 코드 42501 or message 검사
    if (/row-level security|policy/i.test(error.message)) {
      return { ok: false, reason: 'SELF_REVIEW', message: '본인 리뷰에는 누를 수 없어요' };
    }
    return { ok: false, reason: 'DB_ERROR', message: error.message };
  }
  return { ok: true, isHelpful: true };
}

/**
 * 내가 '도움됐어요' 누른 리뷰 id Set 반환.
 * 화장실 상세 화면 진입 시 한 번 호출해서 UI에 반영.
 */
export async function getMyHelpfulReviewIds(reviewIds: string[]): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('review_helpfuls')
    .select('review_id')
    .eq('user_id', user.id)
    .in('review_id', reviewIds);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.review_id as string));
}
