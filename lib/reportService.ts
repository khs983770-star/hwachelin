import { supabase } from './supabase';

export interface ReportInput {
  reportType: 'new_toilet' | 'correction';
  toiletId?: string;
  placeName: string;
  address?: string;
  lat?: number;
  lng?: number;
  kakaoPlaceId?: string;
  type?: '공공' | '매장';
  accessType?: '누구나' | '손님만' | '비밀번호';
  floor?: string;
  genderType?: string;
  hasPassword?: boolean;
  operatingHours?: string;
  comment?: string;
}

export type ReportResult =
  | { ok: true; toiletId: string }
  | { ok: false; reason: 'NOT_LOGGED_IN' | 'VALIDATION_ERROR' | 'DB_ERROR'; message: string };

/**
 * 층수 문자열 → 정수 변환
 * "1층" → 1, "B1" / "지하1" → -1, null이면 null
 */
function parseFloor(input?: string): number | null {
  const text = (input ?? '').trim();
  if (!text) return null;

  const basement = text.match(/(?:지하|b)\s*(\d+)/i);
  if (basement) return -Number(basement[1]);

  const ground = text.match(/^(\d+)/);
  if (ground) return Number(ground[1]);

  return null;
}

export async function submitReport(input: ReportInput): Promise<ReportResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: 'NOT_LOGGED_IN', message: '로그인이 필요해요' };
  }

  const placeName = input.placeName.trim();
  if (input.reportType === 'new_toilet' && !placeName) {
    return { ok: false, reason: 'VALIDATION_ERROR', message: '장소명을 입력해 주세요.' };
  }

  // 신규 제보 시 동일 장소명 + 근접 좌표 기준 중복 체크
  if (input.reportType === 'new_toilet' && input.lat && input.lng && placeName) {
    const latDelta = 0.0005; // ~55m
    const lngDelta = 0.0006; // ~55m
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('report_type', 'new_toilet')
      .eq('place_name', placeName)
      .in('status', ['pending', 'reviewing', 'approved'])
      .gte('lat', input.lat - latDelta)
      .lte('lat', input.lat + latDelta)
      .gte('lng', input.lng - lngDelta)
      .lte('lng', input.lng + lngDelta)
      .maybeSingle();
    if (existingReport) {
      return {
        ok: false,
        reason: 'VALIDATION_ERROR',
        message: '이미 제보가 접수된 장소예요. 검토 후 등록될 예정이에요.',
      };
    }
  }

  const { data, error } = await supabase.rpc('submit_toilet_report', {
    p_report_type:     input.reportType,
    p_toilet_id:       input.toiletId ?? null,
    p_place_name:      placeName || null,
    p_address:         input.address?.trim() || null,
    p_lat:             input.lat ?? null,
    p_lng:             input.lng ?? null,
    p_kakao_place_id:  input.kakaoPlaceId ?? null,
    p_type:            input.type ?? '매장',
    p_access_type:     input.accessType ?? '누구나',
    p_floor:           parseFloor(input.floor),
    p_gender_type:     input.genderType?.trim() || null,
    p_is_24hours:      input.operatingHours?.includes('24') ?? false,
    p_operating_hours: input.operatingHours?.trim() || null,
    p_comment:         input.comment?.trim() || null,
  });

  if (error) {
    return { ok: false, reason: 'DB_ERROR', message: error.message };
  }

  const result = data as { ok: boolean; reason?: string; message?: string; toilet_id?: string };

  if (!result.ok) {
    return {
      ok: false,
      reason: (result.reason as 'NOT_LOGGED_IN' | 'VALIDATION_ERROR' | 'DB_ERROR') ?? 'DB_ERROR',
      message: result.message ?? '오류가 발생했어요.',
    };
  }

  return { ok: true, toiletId: result.toilet_id! };
}
