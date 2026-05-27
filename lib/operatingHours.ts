export type OperatingState = 'open' | 'closed' | 'unknown';

export interface OperatingStatus {
  state: OperatingState;
  label: string;
  detail: string;
}

const MINUTES_PER_DAY = 24 * 60;

export function getOperatingStatus({
  operatingHours,
  is24Hours,
  now = new Date(),
}: {
  operatingHours?: string | null;
  is24Hours?: boolean | null;
  now?: Date;
}): OperatingStatus {
  if (is24Hours || isAlwaysOpenText(operatingHours)) {
    return { state: 'open', label: '영업중', detail: '24시간 운영' };
  }

  const text = operatingHours?.trim();
  if (!text) {
    return { state: 'unknown', label: '시간 정보 없음', detail: '운영시간 미등록' };
  }

  const normalized = normalizeHoursText(text);
  if (isClosedTodayText(normalized, now)) {
    return { state: 'closed', label: '마감', detail: text };
  }

  const ranges = parseTimeRanges(normalized);
  if (ranges.length === 0) {
    return { state: 'unknown', label: '시간 확인 필요', detail: text };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = ranges.some((range) => isWithinRange(currentMinutes, range.start, range.end));

  return {
    state: isOpen ? 'open' : 'closed',
    label: isOpen ? '영업중' : '마감',
    detail: text,
  };
}

function normalizeHoursText(text?: string | null) {
  return (text ?? '')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/[－–—]/g, '-')
    .replace(/[∼～]/g, '~');
}

function isAlwaysOpenText(text?: string | null) {
  return /24시간|24시|상시|연중무휴|종일/.test(text ?? '');
}

function isClosedTodayText(text: string, now: Date) {
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  const isSaturday = day === 6;
  const isSunday = day === 0;

  if (/휴무|미운영|운영안함|사용불가/.test(text) && parseTimeRanges(text).length === 0) {
    return true;
  }

  if (isWeekend && /(주말|토.?일).{0,8}휴무/.test(text)) return true;
  if (isSaturday && /토요일?.{0,8}휴무/.test(text)) return true;
  if (isSunday && /일요일?.{0,8}휴무/.test(text)) return true;
  if (isWeekend && /(평일|월.?금)/.test(text) && !/(주말|토|일)/.test(text.replace(/일반/g, ''))) {
    return true;
  }

  return false;
}

function parseTimeRanges(text: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  const rangePattern =
    /(\d{1,2})(?::|시)?(\d{2})?(?:분)?(?:~|-|부터|to)(\d{1,2})(?::|시)?(\d{2})?(?:분)?/gi;

  let match: RegExpExecArray | null;
  while ((match = rangePattern.exec(text)) !== null) {
    const start = toMinutes(match[1], match[2]);
    const end = toMinutes(match[3], match[4]);
    if (start == null || end == null || start === end) continue;
    ranges.push({ start, end });
  }

  return ranges;
}

function toMinutes(hourText?: string, minuteText?: string) {
  const hour = Number(hourText);
  const minute = minuteText == null ? 0 : Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 24 || minute < 0 || minute > 59) return null;
  if (hour === 24 && minute !== 0) return null;
  return hour * 60 + minute;
}

function isWithinRange(currentMinutes: number, start: number, end: number) {
  const normalizedEnd = end === MINUTES_PER_DAY ? 0 : end;
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < normalizedEnd;
}
