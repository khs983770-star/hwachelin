import * as Location from 'expo-location';
import { supabase } from './supabase';

// ─── 비밀번호 의심 텍스트 필터 ───────────────────────────────────────────
const SENSITIVE_PATTERNS = [
  /\d{4,}/,                          // 숫자 4자리 이상 연속
  /비번|비밀\s*번호|번호\s*는|패스워드|password/i,
];

export function containsSensitiveText(text: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
}

// ─── GPS 거리 계산 (Haversine) ────────────────────────────────────────────
export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── GPS 50m 인증 여부 확인 ───────────────────────────────────────────────
export async function checkIsVerified(
  toiletLat: number,
  toiletLng: number
): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const dist = getDistanceMeters(
      pos.coords.latitude, pos.coords.longitude,
      toiletLat, toiletLng
    );
    return dist <= 50;
  } catch {
    return false;
  }
}

// ─── 리뷰 insert ─────────────────────────────────────────────────────────
export interface ReviewInput {
  toiletId: string;
  rating: number;
  /** 청결 그룹(바닥·변기·냄새·세면대) 중 하나라도 체크 */
  cleanliness: boolean;
  /** 휴지 있음 */
  paper: boolean;
  /** 비누 있음 */
  soap: boolean;
  /** 시설/보안 그룹(도어락·조명·환기·안심) 중 하나라도 체크 */
  security: boolean;
  comment?: string;
  toiletLat?: number;
  toiletLng?: number;
}

export type SubmitResult =
  | { ok: true; isVerified: boolean }
  | { ok: false; reason: 'NOT_LOGGED_IN' | 'SENSITIVE_TEXT' | 'DB_ERROR'; message: string };

export async function submitReview(input: ReviewInput): Promise<SubmitResult> {
  // 1. 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'NOT_LOGGED_IN', message: '로그인이 필요해요' };
  }

  // 2. 비밀번호 의심 텍스트 차단
  if (input.comment && containsSensitiveText(input.comment)) {
    return {
      ok: false,
      reason: 'SENSITIVE_TEXT',
      message: '비밀번호나 민감한 번호는 작성할 수 없어요.\n비밀번호 정보는 선택지 방식으로만 안내해 주세요.',
    };
  }

  // 3. GPS 50m 인증
  const isVerified =
    input.toiletLat != null && input.toiletLng != null
      ? await checkIsVerified(input.toiletLat, input.toiletLng)
      : false;

  // 4. Supabase insert
  const { error } = await supabase.from('reviews').insert({
    toilet_id: input.toiletId,
    user_id: user.id,
    rating: input.rating,
    cleanliness: input.cleanliness,
    paper: input.paper,
    soap: input.soap,
    security: input.security,
    comment: input.comment?.trim() || null,
    is_verified: isVerified,
  });

  if (error) {
    return { ok: false, reason: 'DB_ERROR', message: error.message };
  }

  return { ok: true, isVerified };
}
