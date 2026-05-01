import { supabase } from './supabase';

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * 회원 탈퇴
 * - Edge Function 'delete-account'를 통해 서비스 롤로 데이터 전체 삭제
 * - bookmarks → reviews(+Storage) → reports → users → auth.users 순서로 삭제
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, message: '로그인 상태가 아닙니다.' };
  }

  const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const functionUrl = `${projectUrl}/functions/v1/delete-account`;

  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, message: body?.error ?? '탈퇴 처리에 실패했습니다.' };
    }

    // 로컬 세션 정리
    await supabase.auth.signOut();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? '네트워크 오류가 발생했습니다.' };
  }
}
