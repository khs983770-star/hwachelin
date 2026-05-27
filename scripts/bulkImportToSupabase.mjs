/**
 * 전국 공공화장실 데이터를 Supabase Management API를 통해 청크별로 import하는 스크립트.
 * tmp/public-toilets-preview.json에서 데이터를 읽어 500개씩 upsert한다.
 *
 * 사용법: node scripts/bulkImportToSupabase.mjs
 * (Claude Desktop claude_desktop_config.json의 SUPABASE_ACCESS_TOKEN + project-ref 사용)
 */

import { readFileSync } from 'node:fs';

const CLAUDE_CONFIG_PATH =
  '/Users/hyunsookim/Library/Application Support/Claude/claude_desktop_config.json';
const PREVIEW_PATH = new URL('../tmp/public-toilets-preview.json', import.meta.url).pathname;

const CHUNK_SIZE = 500;

function sqlVal(v) {
  if (v == null || v === '') return 'null';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildPlacesInsert(rows) {
  const vals = rows
    .map(
      (p) =>
        `(${sqlVal(p.id)}, ${sqlVal(p.name)}, ${sqlVal(p.address)}, ${p.lat}, ${p.lng}, ${sqlVal(p.source)}, ${sqlVal(p.kakao_place_id)})`
    )
    .join(',\n');
  return `INSERT INTO places (id, name, address, lat, lng, source, kakao_place_id) VALUES\n${vals}\nON CONFLICT (id) DO UPDATE SET name=excluded.name, address=excluded.address, lat=excluded.lat, lng=excluded.lng, source=excluded.source, kakao_place_id=excluded.kakao_place_id;`;
}

function buildToiletsInsert(rows) {
  const vals = rows
    .map(
      (t) =>
        `(${sqlVal(t.id)}, ${sqlVal(t.place_id)}, ${sqlVal(t.type)}, ${sqlVal(t.access_type)}, ${sqlVal(t.floor)}, ${sqlVal(t.gender_type)}, ${sqlVal(t.operating_hours)}, ${t.is_24hours ? 'true' : 'false'}, ${t.has_diaper_table ? 'true' : 'false'}, ${t.disabled_available ? 'true' : 'false'}, ${t.emergency_bell ? 'true' : 'false'}, ${sqlVal(t.male_stalls)}, ${sqlVal(t.male_urinals)}, ${sqlVal(t.female_stalls)}, ${sqlVal(t.disabled_male_stalls)}, ${sqlVal(t.disabled_male_urinals)}, ${sqlVal(t.disabled_female_stalls)})`
    )
    .join(',\n');
  return `INSERT INTO toilets (id, place_id, type, access_type, floor, gender_type, operating_hours, is_24hours, has_diaper_table, disabled_available, emergency_bell, male_stalls, male_urinals, female_stalls, disabled_male_stalls, disabled_male_urinals, disabled_female_stalls) VALUES\n${vals}\nON CONFLICT (id) DO UPDATE SET place_id=excluded.place_id, type=excluded.type, access_type=excluded.access_type, floor=excluded.floor, gender_type=excluded.gender_type, operating_hours=excluded.operating_hours, is_24hours=excluded.is_24hours, has_diaper_table=excluded.has_diaper_table, disabled_available=excluded.disabled_available, emergency_bell=excluded.emergency_bell, male_stalls=excluded.male_stalls, male_urinals=excluded.male_urinals, female_stalls=excluded.female_stalls, disabled_male_stalls=excluded.disabled_male_stalls, disabled_male_urinals=excluded.disabled_male_urinals, disabled_female_stalls=excluded.disabled_female_stalls;`;
}

async function executeManagementApiSql(projectRef, accessToken, query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Management API 오류 ${response.status}: ${text.slice(0, 500)}`);
  }

  return response.json();
}

function chunks(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// --- main ---

const claudeConfig = JSON.parse(readFileSync(CLAUDE_CONFIG_PATH, 'utf8'));
const mcpServer = claudeConfig.mcpServers?.supabase;
if (!mcpServer) throw new Error('Supabase MCP 설정을 찾을 수 없습니다.');

const accessToken = mcpServer.env?.SUPABASE_ACCESS_TOKEN;
const projectRef = mcpServer.args?.find((a) => a.startsWith('--project-ref='))?.slice('--project-ref='.length);

if (!accessToken || !projectRef) {
  throw new Error(`accessToken 또는 projectRef를 찾을 수 없습니다. args: ${JSON.stringify(mcpServer.args)}`);
}

console.log(`[import] project: ${projectRef}`);

const data = JSON.parse(readFileSync(PREVIEW_PATH, 'utf8'));
console.log(`[import] places: ${data.places.length}, toilets: ${data.toilets.length}`);

const placeChunks = chunks(data.places, CHUNK_SIZE);
const toiletChunks = chunks(data.toilets, CHUNK_SIZE);

console.log(`[import] places 배치: ${placeChunks.length}, toilets 배치: ${toiletChunks.length}`);

let ok = 0;
let fail = 0;

for (let i = 0; i < placeChunks.length; i++) {
  const sql = buildPlacesInsert(placeChunks[i]);
  try {
    await executeManagementApiSql(projectRef, accessToken, sql);
    ok += placeChunks[i].length;
    process.stdout.write(`\r[places] ${ok}/${data.places.length} 완료`);
  } catch (error) {
    fail += placeChunks[i].length;
    console.error(`\n[places] 배치 ${i + 1} 실패: ${error.message.slice(0, 200)}`);
  }
}

console.log(`\n[places] 완료: ${ok}개, 실패: ${fail}개`);

ok = 0;
fail = 0;

for (let i = 0; i < toiletChunks.length; i++) {
  const sql = buildToiletsInsert(toiletChunks[i]);
  try {
    await executeManagementApiSql(projectRef, accessToken, sql);
    ok += toiletChunks[i].length;
    process.stdout.write(`\r[toilets] ${ok}/${data.toilets.length} 완료`);
  } catch (error) {
    fail += toiletChunks[i].length;
    console.error(`\n[toilets] 배치 ${i + 1} 실패: ${error.message.slice(0, 200)}`);
  }
}

console.log(`\n[toilets] 완료: ${ok}개, 실패: ${fail}개`);

// 최종 카운트 확인
const countResult = await executeManagementApiSql(
  projectRef,
  accessToken,
  `SELECT
    (SELECT count(*)::int FROM places WHERE kakao_place_id LIKE 'public_toilet:%') AS public_places,
    (SELECT count(*)::int FROM toilets WHERE place_id IN (
      SELECT id FROM places WHERE kakao_place_id LIKE 'public_toilet:%'
    )) AS public_toilets;`
);
console.log('[import] 최종 DB 카운트:', JSON.stringify(countResult));
