import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; message: string };

export function getAuthRedirectUrl() {
  return 'hwachelin://auth/callback';
}

export async function signInWithKakao(): Promise<AuthResult> {
  const redirectTo = getAuthRedirectUrl();
  const kakaoScopes = 'profile_nickname profile_image';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo,
      scopes: kakaoScopes,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { ok: false, message: error.message };
  if (!data.url) return { ok: false, message: '카카오 로그인 URL을 만들지 못했어요.' };

  const authUrl = new URL(data.url);
  // Supabase's Kakao provider maps `scopes` to Kakao's default email scope on
  // some flows. Keep only Kakao's native `scope` query to avoid asking for email.
  authUrl.searchParams.delete('scopes');
  authUrl.searchParams.set('scope', kakaoScopes);

  const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectTo);
  if (result.type !== 'success') {
    return { ok: false, message: '로그인이 취소됐어요.' };
  }

  const queryParams = parseQueryParams(result.url);
  console.log('[auth] callback url:', sanitizeAuthUrl(result.url));
  console.log('[auth] callback params:', Object.keys(queryParams));
  const errorDescription = stringParam(queryParams.error_description ?? queryParams.error);
  if (errorDescription) return { ok: false, message: decodeURIComponent(errorDescription) };

  const code = stringParam(queryParams.code);
  if (code) {
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    );
    if (exchangeError) return { ok: false, message: exchangeError.message };
    if (!sessionData.session) return { ok: false, message: '로그인 세션을 만들지 못했어요.' };

    await ensureUserProfile(sessionData.session.user);
    return { ok: true, session: sessionData.session };
  }

  const accessToken = stringParam(queryParams.access_token);
  const refreshToken = stringParam(queryParams.refresh_token);
  if (accessToken && refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) return { ok: false, message: sessionError.message };
    if (!sessionData.session) return { ok: false, message: '로그인 세션을 만들지 못했어요.' };

    await ensureUserProfile(sessionData.session.user);
    return { ok: true, session: sessionData.session };
  }

  const { data: existingSessionData } = await supabase.auth.getSession();
  if (existingSessionData.session) {
    await ensureUserProfile(existingSessionData.session.user);
    return { ok: true, session: existingSessionData.session };
  }

  return {
    ok: false,
    message: `로그인 인증값을 받지 못했어요. 받은 값: ${
      Object.keys(queryParams).join(', ') || '없음'
    }`,
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) Alert.alert('로그아웃 실패', error.message);
}

/**
 * 로그인 게이트.
 * - 이미 로그인되어 있으면 즉시 onAuthed() 실행
 * - 아니면 "3초 로그인" 팝업 → 카카오 로그인 → 성공 시 onAuthed()
 *
 * 사용처: '리뷰 작성하기', '즐겨찾기 저장' 같은 진입 시점.
 * (실제 제출 단계에서 한 번 더 체크하는 방어 로직은 그대로 유지)
 */
export async function requireLogin(opts: {
  message?: string;
  onAuthed: () => void;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    opts.onAuthed();
    return;
  }
  Alert.alert(
    '로그인이 필요해요',
    opts.message ?? '리뷰를 남기려면 3초 로그인이 필요해요!',
    [
      { text: '다음에', style: 'cancel' },
      {
        text: '카카오로 로그인하기',
        onPress: async () => {
          const result = await signInWithKakao();
          if (!result.ok) {
            Alert.alert('로그인 실패', result.message);
            return;
          }
          opts.onAuthed();
        },
      },
    ]
  );
}

export async function ensureUserProfile(user: User) {
  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!selectError && existingUser) return;

  const nickname =
    stringParam(user.user_metadata?.nickname) ??
    stringParam(user.user_metadata?.name) ??
    stringParam(user.user_metadata?.full_name) ??
    '화슐랭러';

  const { error } = await supabase.from('users').insert({
    id: user.id,
    nickname,
  });

  if (error) {
    console.warn('[auth] user profile sync failed:', error.message);
  }
}

function stringParam(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? '') || undefined;
  if (value == null || value === '') return undefined;
  return String(value);
}

function parseQueryParams(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.searchParams);

  if (parsed.hash.startsWith('#')) {
    const hashParams = new URLSearchParams(parsed.hash.slice(1));
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  return Object.fromEntries(params.entries());
}

function sanitizeAuthUrl(url: string) {
  return url
    .replace(/([?&#](?:access_token|refresh_token|provider_token|code)=)[^&#]+/g, '$1[redacted]')
    .replace(/([?&#](?:error_description)=)[^&#]+/g, '$1[redacted]');
}
