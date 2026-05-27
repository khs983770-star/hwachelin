import * as Location from 'expo-location';
import { readAsStringAsync } from 'expo-file-system';
import { supabase } from './supabase';

// ─── 비밀번호 의심 텍스트 필터 ───────────────────────────────────────────
const SENSITIVE_PATTERNS = [
  /\d{4,}/,                          // 숫자 4자리 이상 연속
  /비번|비밀\s*번호|번호\s*는|패스워드|password/i,
];

export function containsSensitiveText(text: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
}

// 입력 중 실시간 차단용 — 사용자가 타이핑하는 동안 차단할 패턴
// (한마디 입력창에서 onChangeText 시 이전 값으로 롤백)
const REALTIME_BLOCK_PATTERNS = [
  /\d{4,}/,
  /비\s*번/,
  /비\s*밀\s*번\s*호/,
  /패\s*스\s*워\s*드/i,
  /password/i,
];

export function containsRealtimeBlocked(text: string): boolean {
  return REALTIME_BLOCK_PATTERNS.some((re) => re.test(text));
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

// ─── 리뷰 이미지 업로드 (picker quality:0.8 압축 — 리사이즈는 dev client 재빌드 후 expo-image-manipulator로 추가 예정) ─────
async function uploadReviewImages(
  userId: string,
  uris: string[]
): Promise<{ urls: string[]; failedCount: number; lastError?: string }> {
  const urls: string[] = [];
  let failedCount = 0;
  let lastError: string | undefined;

  for (const uri of uris) {
    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;

      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }

      const { data, error } = await supabase.storage
        .from('review-images')
        .upload(filename, byteArray, {
          contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
          upsert: false,
        });

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('review-images')
          .getPublicUrl(data.path);
        urls.push(urlData.publicUrl);
      } else if (error) {
        failedCount += 1;
        lastError = error.message;
        console.warn('[reviewService] 이미지 업로드 실패:', error.message);
      }
    } catch (e) {
      failedCount += 1;
      lastError = e instanceof Error ? e.message : String(e);
      console.warn('[reviewService] 이미지 처리 오류:', e);
    }
  }

  return { urls, failedCount, lastError };
}

// ─── 리뷰 insert ─────────────────────────────────────────────────────────
export interface ReviewInput {
  toiletId: string;
  rating: number;
  /** 청결 수준: clean(깨끗해요) | normal(보통이에요) | dirty(지저분해요) */
  cleanlinessLevel: 'clean' | 'normal' | 'dirty' | null;
  /** 휴지 유무 */
  paper: boolean | null;
  /** 비누(핸드워시) 유무 */
  soap: boolean | null;
  /** 핸드드라이어 유무 */
  handDryer: boolean | null;
  /** 핸드 티슈 유무 */
  handTissue: boolean | null;
  /** 비데 유무 */
  bidet: boolean | null;
  /** 비밀번호 유무 */
  hasPassword: boolean | null;
  /** 분위기 태그 키 배열 (noSmell, brightLight, goodVentilation, sturdyPartition, crowded, waitingLine) */
  moodTags?: string[];
  comment?: string;
  /** 새로 첨부할 사진 로컬 URI 배열 (업로드 후 image_urls에 합쳐짐) */
  photoUris?: string[];
  /** 기존 image_urls (수정 시 유지할 사진) */
  existingImageUrls?: string[];
  toiletLat?: number;
  toiletLng?: number;
}

export type SubmitResult =
  | { ok: true; isVerified: boolean; photoFailedCount?: number }
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

  // 4. 사진 업로드 (있을 때만)
  const uploadResult = input.photoUris?.length
    ? await uploadReviewImages(user.id, input.photoUris)
    : { urls: [], failedCount: 0 };
  const imageUrls = [...(input.existingImageUrls ?? []), ...uploadResult.urls];

  // 5. Supabase insert
  const { error } = await supabase.from('reviews').insert({
    toilet_id: input.toiletId,
    user_id: user.id,
    rating: input.rating,
    cleanliness_level: input.cleanlinessLevel ?? null,
    cleanliness: input.cleanlinessLevel === 'clean',
    paper: input.paper ?? null,
    soap: input.soap ?? null,
    hand_dryer: input.handDryer ?? null,
    hand_tissue: input.handTissue ?? null,
    has_password: input.hasPassword ?? null,
    bidet: input.bidet ?? false,
    security: null,
    mood_tags: input.moodTags?.length ? input.moodTags : null,
    image_urls: imageUrls,
    comment: input.comment?.trim() || null,
    is_verified: isVerified,
  });

  if (error) {
    return { ok: false, reason: 'DB_ERROR', message: error.message };
  }

  return { ok: true, isVerified, photoFailedCount: uploadResult.failedCount };
}

export async function updateReview(
  reviewId: string,
  input: Omit<ReviewInput, 'toiletId' | 'toiletLat' | 'toiletLng'>
): Promise<SubmitResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'NOT_LOGGED_IN', message: '로그인이 필요해요' };
  }

  if (input.comment && containsSensitiveText(input.comment)) {
    return {
      ok: false,
      reason: 'SENSITIVE_TEXT',
      message: '비밀번호나 민감한 번호는 작성할 수 없어요.\n비밀번호 정보는 선택지 방식으로만 안내해 주세요.',
    };
  }

  // 새 사진 업로드
  const uploadResult = input.photoUris?.length
    ? await uploadReviewImages(user.id, input.photoUris)
    : { urls: [], failedCount: 0 };
  const imageUrls = [...(input.existingImageUrls ?? []), ...uploadResult.urls];

  const { error } = await supabase
    .from('reviews')
    .update({
      rating: input.rating,
      cleanliness_level: input.cleanlinessLevel ?? null,
      cleanliness: input.cleanlinessLevel === 'clean',
      paper: input.paper ?? null,
      soap: input.soap ?? null,
      hand_dryer: input.handDryer ?? null,
      hand_tissue: input.handTissue ?? null,
      has_password: input.hasPassword ?? null,
      bidet: input.bidet ?? false,
      mood_tags: input.moodTags?.length ? input.moodTags : null,
      image_urls: imageUrls,
      comment: input.comment?.trim() || null,
    })
    .eq('id', reviewId)
    .eq('user_id', user.id);

  if (error) {
    return { ok: false, reason: 'DB_ERROR', message: error.message };
  }

  return { ok: true, isVerified: false, photoFailedCount: uploadResult.failedCount };
}

export type DeleteReviewResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_LOGGED_IN' | 'DB_ERROR'; message: string };

export async function deleteReview(reviewId: string): Promise<DeleteReviewResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: 'NOT_LOGGED_IN', message: '로그인이 필요해요' };
  }

  const { error } = await supabase.from('reviews').delete().eq('id', reviewId).eq('user_id', user.id);
  if (error) {
    return { ok: false, reason: 'DB_ERROR', message: error.message };
  }

  return { ok: true };
}
