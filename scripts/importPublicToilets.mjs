import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const DATASET_URL = 'https://apis.data.go.kr/1741000/public_restroom_info';
const LOCALDATA_CSV_URL = 'https://file.localdata.go.kr/file/download/public_restroom_info/info';
const DEFAULT_REGION = '';
const DEFAULT_LIMIT = 30000;
const PAGE_SIZE = 100;

const env = loadDotEnv('.env.local');
const args = parseArgs(process.argv.slice(2));

const serviceKey = args.serviceKey ?? env.DATA_GO_KR_API_KEY ?? env.PUBLIC_DATA_API_KEY;
const region = args.region ?? env.PUBLIC_TOILET_REGION ?? DEFAULT_REGION;
const limit = Number(args.limit ?? env.PUBLIC_TOILET_LIMIT ?? DEFAULT_LIMIT);
const mode = args.mode ?? env.PUBLIC_TOILET_IMPORT_MODE ?? 'sql';
const pruneStale = parseBoolean(args.pruneStale ?? env.PUBLIC_TOILET_PRUNE_STALE ?? false);

if (!serviceKey) {
  console.error('DATA_GO_KR_API_KEY가 필요합니다. .env.local에 추가하거나 --serviceKey=...로 넘겨주세요.');
  process.exit(1);
}

const rawRows = await fetchPublicToilets({ serviceKey, region, limit });
const toilets = normalizeRows(rawRows, limit);

if (toilets.length === 0) {
  console.error('가져올 수 있는 공중화장실 데이터가 없습니다. region 값을 바꿔보세요.');
  process.exit(1);
}

const places = toilets.map((item) => item.place);
const toiletRows = toilets.map((item) => item.toilet);

await mkdir('tmp', { recursive: true });
await writeFile(
  'tmp/public-toilets-preview.json',
  JSON.stringify({ region, count: toilets.length, places, toilets: toiletRows }, null, 2)
);

if (mode === 'supabase') {
  await importToSupabase({ places, toilets: toiletRows, pruneStale });
} else {
  const sql = buildSql({ places, toilets: toiletRows });
  await writeFile('tmp/public-toilets-import.sql', sql);
  console.log(`SQL 생성 완료: tmp/public-toilets-import.sql`);
  console.log(`미리보기 생성 완료: tmp/public-toilets-preview.json`);
  console.log(`총 ${toilets.length}개 공중화장실 데이터를 준비했습니다. Supabase SQL Editor에서 SQL을 실행하세요.`);
}

async function fetchPublicToilets({ serviceKey, region, limit }) {
  const rows = [];
  const maxPages = Math.ceil(limit / PAGE_SIZE) + 5;

  try {
    for (let page = 1; page <= maxPages && rows.length < limit; page += 1) {
      const url = new URL(DATASET_URL);
      url.searchParams.set('pageNo', String(page));
      url.searchParams.set('numOfRows', String(PAGE_SIZE));
      url.searchParams.set('type', 'json');
      url.searchParams.set('serviceKey', serviceKey);

      const response = await fetch(url);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`공공데이터 API 오류: HTTP ${response.status} ${text.slice(0, 300)}`);
      }

      const json = JSON.parse(text);
      const data = extractRows(json);
      if (data.length === 0) break;

      for (const row of data) {
        const address = value(row, ['소재지도로명주소', '소재지지번주소', '도로명주소', '지번주소']);
        if (region && !String(address).includes(region)) continue;
        rows.push(row);
        if (rows.length >= limit) break;
      }

      const totalCount = Number(json.totalCount ?? json.response?.body?.totalCount ?? 0);
      if (totalCount && page * PAGE_SIZE >= totalCount) break;
    }
  } catch (error) {
    console.warn(`${error.message}\nCSV 파일 다운로드 방식으로 전환합니다.`);
    return fetchPublicToiletCsv({ region });
  }

  return rows;
}

async function fetchPublicToiletCsv({ region }) {
  const response = await fetch(LOCALDATA_CSV_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.data.go.kr/',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`공공데이터 CSV 다운로드 오류: HTTP ${response.status} ${text.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const text = new TextDecoder('euc-kr').decode(buffer);
  const rows = parseCsv(text);

  if (!region) return rows;

  return rows.filter((row) => {
    const address = value(row, ['소재지도로명주소', '소재지지번주소', '도로명주소', '지번주소']);
    return String(address).includes(region);
  });
}

function extractRows(json) {
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.response?.body?.items)) return json.response.body.items;
  if (Array.isArray(json.response?.body?.items?.item)) return json.response.body.items.item;
  if (Array.isArray(json.body?.items)) return json.body.items;
  if (Array.isArray(json.body?.items?.item)) return json.body.items.item;
  return [];
}

function normalizeRows(rows, limit) {
  const seen = new Set();
  const normalized = [];

  for (const row of rows) {
    const name = value(row, ['화장실명', '공중화장실명', '시설명', '명칭']) || '공중화장실';
    const roadAddress = value(row, ['소재지도로명주소', '도로명주소']);
    const jibunAddress = value(row, ['소재지지번주소', '지번주소']);
    const address = roadAddress || jibunAddress;
    const lat = toNumber(value(row, ['위도', 'WGS84위도', 'latitude', 'lat']));
    const lng = toNumber(value(row, ['경도', 'WGS84경도', 'longitude', 'lng']));

    if (!address || lat == null || lng == null) continue;
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) continue;

    const signature = `${name}|${address}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
    if (seen.has(signature)) continue;
    seen.add(signature);

    const placeId = stableUuid(`place:${signature}`);
    const toiletId = stableUuid(`toilet:${signature}`);
    const openTime = value(row, ['개방시간', '이용가능시간', '운영시간']);
    const openDetail = value(row, ['개방시간상세', '운영시간상세', '이용시간상세']);
    const floor = inferFloor(value(row, ['위치', '설치장소', '소재지시설명', '구분']));

    // 시설 정보 (CSV: '남성용-대변기수', JSON: '남성용대변기수' 등 두 형태 모두 지원)
    const maleStalls   = toNumber(value(row, ['남성용-대변기수', '남성용대변기수', '남자대변기수']));
    const maleUrinals  = toNumber(value(row, ['남성용-소변기수', '남성용소변기수', '남자소변기수']));
    const femaleStalls = toNumber(value(row, ['여성용-대변기수', '여성용대변기수', '여자대변기수']));
    const disMaleStalls   = toNumber(value(row, ['남성용-장애인용대변기수', '장애인용남성대변기수', '장애인남성대변기수']));
    const disMaleUrinals  = toNumber(value(row, ['남성용-장애인용소변기수', '장애인용남성소변기수', '장애인남성소변기수']));
    const disFemaleStalls = toNumber(value(row, ['여성용-장애인용대변기수', '장애인용여성대변기수', '장애인여성대변기수']));

    const disabledAvailable =
      (disMaleStalls ?? 0) > 0 || (disMaleUrinals ?? 0) > 0 || (disFemaleStalls ?? 0) > 0;

    const diaperRaw = value(row, ['기저귀교환대유무', '기저귀교환대남성화장실', '기저귀교환대남자화장실',
                                   '기저귀교환대여성화장실', '기저귀교환대여자화장실']);
    const hasDiaperTable = inferBool(diaperRaw);

    const emergencyBellRaw = value(row, ['비상벨설치여부', '비상벨여부']);
    const emergencyBell = inferBool(emergencyBellRaw);

    // 운영시간 텍스트 (상세 우선, 없으면 기본)
    const operatingHours = openDetail || openTime || null;
    const is24Hours = operatingHours != null && /24/.test(operatingHours);

    normalized.push({
      place: {
        id: placeId,
        name,
        address,
        lat,
        lng,
        source: 'public',
        kakao_place_id: `public_toilet:${stableKey(signature)}`,
      },
      toilet: {
        id: toiletId,
        place_id: placeId,
        type: '공공',
        access_type: inferAccessType(openTime),
        floor,
        gender_type: inferGenderType(row),
        operating_hours: operatingHours,
        is_24hours: is24Hours,
        has_diaper_table: hasDiaperTable,
        disabled_available: disabledAvailable,
        emergency_bell: emergencyBell,
        male_stalls: maleStalls,
        male_urinals: maleUrinals,
        female_stalls: femaleStalls,
        disabled_male_stalls: disMaleStalls,
        disabled_male_urinals: disMaleUrinals,
        disabled_female_stalls: disFemaleStalls,
      },
    });

    if (normalized.length >= limit) break;
  }

  return normalized;
}

async function importToSupabase({ places, toilets, pruneStale }) {
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('mode=supabase에는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다. anon key는 RLS 때문에 insert가 막힐 수 있습니다.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  for (const chunk of chunks(places, 100)) {
    const { error } = await supabase.from('places').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`places upsert 실패: ${error.message}`);
  }

  for (const chunk of chunks(toilets, 100)) {
    const { error } = await supabase.from('toilets').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`toilets upsert 실패: ${error.message}`);
  }

  if (pruneStale) {
    await pruneStalePublicToilets({ supabase, currentPlaceIds: places.map((place) => place.id) });
  }

  console.log(
    `Supabase import 완료: places ${places.length}개, toilets ${toilets.length}개` +
      (pruneStale ? ', stale public toilets 정리 완료' : '')
  );
}

async function pruneStalePublicToilets({ supabase, currentPlaceIds }) {
  if (currentPlaceIds.length > 1000) {
    console.warn('동기화 대상이 1000개를 초과해 stale 삭제를 건너뜁니다. SQL 방식으로 정리하세요.');
    return;
  }

  const idList = `(${currentPlaceIds.join(',')})`;
  const { data: stalePlaces, error: staleError } = await supabase
    .from('places')
    .select('id')
    .like('kakao_place_id', 'public_toilet:%')
    .not('id', 'in', idList);

  if (staleError) throw new Error(`stale public places 조회 실패: ${staleError.message}`);
  const stalePlaceIds = (stalePlaces ?? []).map((place) => place.id);
  if (stalePlaceIds.length === 0) return;

  for (const chunk of chunks(stalePlaceIds, 100)) {
    const chunkList = `(${chunk.join(',')})`;
    const { error: toiletError } = await supabase.from('toilets').delete().in('place_id', chunk);
    if (toiletError) throw new Error(`stale public toilets 삭제 실패: ${toiletError.message}`);

    const { error: placeError } = await supabase.from('places').delete().filter('id', 'in', chunkList);
    if (placeError) throw new Error(`stale public places 삭제 실패: ${placeError.message}`);
  }

  console.log(`stale public toilets 정리: places ${stalePlaceIds.length}개`);
}

function buildSql({ places, toilets }) {
  return [
    '-- Generated by scripts/importPublicToilets.mjs',
    '-- Run this in Supabase SQL Editor.',
    'begin;',
    buildInsertSql('places', ['id', 'name', 'address', 'lat', 'lng', 'source', 'kakao_place_id'], places),
    buildInsertSql('toilets', ['id', 'place_id', 'type', 'access_type', 'floor', 'gender_type'], toilets),
    'commit;',
    '',
  ].join('\n\n');
}

function buildInsertSql(table, columns, rows) {
  const values = rows
    .map((row) => `  (${columns.map((column) => sqlValue(row[column])).join(', ')})`)
    .join(',\n');

  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');

  return [
    `insert into ${table} (${columns.join(', ')}) values`,
    values,
    `on conflict (id) do update set ${updates};`,
  ].join('\n');
}

function inferBool(raw) {
  if (raw == null || raw === '') return false;
  const text = String(raw).trim();
  // Y / 설치 / 있음 / 유 → true
  return /^(y|yes|설치|있음|유|o|1)$/i.test(text) || Number(text) > 0;
}

function inferAccessType(openTime) {
  const text = String(openTime ?? '');
  if (text.includes('24')) return '누구나';
  return '누구나';
}

function inferGenderType(row) {
  const text = Object.entries(row)
    .filter(([key]) => key.includes('남성') || key.includes('여성') || key.includes('남녀'))
    .map(([, val]) => String(val ?? ''))
    .join(' ');

  if (text.includes('공용')) return '공용';
  return '남녀분리';
}

function inferFloor(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;

  const basement = text.match(/(?:지하|B)\s*(\d+)/i);
  if (basement) return -Number(basement[1]);

  const ground = text.match(/(\d+)\s*층/);
  if (ground) return Number(ground[1]);

  return null;
}

function value(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
  }

  const normalized = Object.entries(row).find(([key, val]) => {
    const compactKey = key.replace(/\s/g, '');
    return keys.some((candidate) => compactKey === candidate.replace(/\s/g, '')) && val != null;
  });

  return normalized ? String(normalized[1]).trim() : '';
}

function toNumber(input) {
  if (input == null || input === '') return null;
  const number = Number(String(input).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
}

function stableKey(input) {
  return createHash('sha1').update(input).digest('hex');
}

function stableUuid(input) {
  const hex = stableKey(input).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function sqlValue(value) {
  if (value == null || value === '') return 'null';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function parseArgs(argv) {
  return argv.reduce((acc, item) => {
    if (!item.startsWith('--')) return acc;
    const argument = item.slice(2);
    const equalIndex = argument.indexOf('=');
    if (equalIndex < 0) {
      acc[argument] = 'true';
      return acc;
    }
    const key = argument.slice(0, equalIndex);
    acc[key] = argument.slice(equalIndex + 1);
    return acc;
  }, {});
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function loadDotEnv(path) {
  try {
    const content = readFileSync(path, 'utf8');
    const result = { ...process.env };
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) continue;
      result[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
    return result;
  } catch {
    return { ...process.env };
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header = [], ...body] = rows.filter((item) => item.some((cell) => cell.trim() !== ''));
  return body.map((item) =>
    Object.fromEntries(header.map((key, index) => [key.trim(), (item[index] ?? '').trim()]))
  );
}
