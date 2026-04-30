import { supabase } from './supabase';

export interface ReportInput {
  reportType: 'new_toilet' | 'correction';
  toiletId?: string;
  placeName: string;
  address?: string;
  lat?: number;
  lng?: number;
  accessType?: '누구나' | '손님만' | '비밀번호';
  floor?: string;
  genderType?: string;
  hasPassword: boolean;
  operatingHours?: string;
  comment?: string;
}

export type ReportResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'NOT_LOGGED_IN' | 'VALIDATION_ERROR' | 'DB_ERROR'; message: string };

export async function submitReport(input: ReportInput): Promise<ReportResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: 'NOT_LOGGED_IN', message: '로그인이 필요해요' };
  }

  const placeName = input.placeName.trim();
  if (!placeName) {
    return { ok: false, reason: 'VALIDATION_ERROR', message: '장소명을 입력해 주세요.' };
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      toilet_id: input.toiletId ?? null,
      report_type: input.reportType,
      place_name: placeName,
      address: input.address?.trim() || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      access_type: input.accessType ?? null,
      floor: input.floor?.trim() || null,
      gender_type: input.genderType?.trim() || null,
      has_password: input.hasPassword,
      operating_hours: input.operatingHours?.trim() || null,
      comment: input.comment?.trim() || null,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, reason: 'DB_ERROR', message: error.message };
  }

  return { ok: true, id: data.id };
}
