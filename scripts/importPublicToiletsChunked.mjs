import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CLAUDE_CONFIG_PATH =
  '/Users/hyunsookim/Library/Application Support/Claude/claude_desktop_config.json';
const CHUNK_SIZE = 400;

const data = JSON.parse(readFileSync('tmp/public-toilets-preview.json', 'utf8'));
const { places, toilets } = data;

console.log(`총 ${places.length}개 장소, ${toilets.length}개 화장실 임포트 시작`);
console.log(`청크 크기: ${CHUNK_SIZE}개 → 총 ${Math.ceil(places.length / CHUNK_SIZE)}회 실행`);

const placeCols = ['id', 'name', 'address', 'lat', 'lng', 'source', 'kakao_place_id'];
const toiletCols = [
  'id', 'place_id', 'type', 'access_type', 'floor', 'gender_type',
  'operating_hours', 'is_24hours', 'has_diaper_table', 'disabled_available', 'emergency_bell',
  'male_stalls', 'male_urinals', 'female_stalls',
  'disabled_male_stalls', 'disabled_male_urinals', 'disabled_female_stalls',
];

let success = 0;
let fail = 0;

for (let i = 0; i < places.length; i += CHUNK_SIZE) {
  const chunkPlaces = places.slice(i, i + CHUNK_SIZE);
  const chunkToilets = toilets.slice(i, i + CHUNK_SIZE);
  const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
  const total = Math.ceil(places.length / CHUNK_SIZE);

  const sql = buildChunkSql(chunkPlaces, chunkToilets);

  try {
    await executeSupabaseSql(sql);
    success += chunkPlaces.length;
    process.stdout.write(`\r[${chunkNum}/${total}] ${success}개 완료...`);
  } catch (err) {
    fail += chunkPlaces.length;
    console.error(`\n청크 ${chunkNum} 실패: ${err.message}`);
  }
}

console.log(`\n임포트 완료: 성공 ${success}개, 실패 ${fail}개`);

// 결과 확인
const countSql = `
  select
    (select count(*)::int from places where kakao_place_id like 'public_toilet:%') as public_places,
    (select count(*)::int from toilets where place_id in (
      select id from places where kakao_place_id like 'public_toilet:%'
    )) as public_toilets;
`;
const countResult = await executeSupabaseSql(countSql);
console.log('DB 현황:', stringifyMcpText(countResult));

function buildChunkSql(chunkPlaces, chunkToilets) {
  const placeUpdates = placeCols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
  const toiletUpdates = toiletCols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');

  const placeVals = chunkPlaces
    .map((r) => `(${placeCols.map((c) => sqlValue(r[c])).join(',')})`)
    .join(',\n');
  const toiletVals = chunkToilets
    .map((r) => `(${toiletCols.map((c) => sqlValue(r[c])).join(',')})`)
    .join(',\n');

  return [
    `insert into places (${placeCols.join(',')}) values\n${placeVals}`,
    `on conflict (id) do update set ${placeUpdates};`,
    '',
    `insert into toilets (${toiletCols.join(',')}) values\n${toiletVals}`,
    `on conflict (id) do update set ${toiletUpdates};`,
  ].join('\n');
}

function sqlValue(v) {
  if (v == null || v === '') return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function executeSupabaseSql(query) {
  const config = JSON.parse(readFileSync(CLAUDE_CONFIG_PATH, 'utf8'));
  const server = config.mcpServers?.supabase;
  if (!server) throw new Error('Supabase MCP config not found in Claude desktop config.');

  const child = spawn(server.command, server.args, {
    env: { ...process.env, ...server.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let nextId = 1;
  let buffer = '';
  const pending = new Map();

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.id && pending.has(message.id)) {
        const req = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) req.reject(new Error(JSON.stringify(message.error)));
        else req.resolve(message.result);
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (/error|failed|unauthor/i.test(text)) process.stderr.write(text);
  });

  try {
    await request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'hwachelin-import-chunked', version: '1.0.0' },
    });
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n'
    );
    return await request('tools/call', { name: 'execute_sql', arguments: { query } });
  } finally {
    child.kill('SIGTERM');
  }

  function request(method, params = {}) {
    const id = nextId++;
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }, 60000);
      pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
    });
  }
}

function stringifyMcpText(result) {
  return result.content?.map((item) => item.text).join('\n') ?? JSON.stringify(result);
}
