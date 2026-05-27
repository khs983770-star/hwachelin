import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PROJECT_DIR = new URL('..', import.meta.url).pathname;
const CLAUDE_CONFIG_PATH =
  '/Users/hyunsookim/Library/Application Support/Claude/claude_desktop_config.json';

const region = process.env.PUBLIC_TOILET_REGION ?? '';
const limit = process.env.PUBLIC_TOILET_LIMIT ?? '30000';

console.log(`[sync] public toilets sync start: region=${region}, limit=${limit}`);

execFileSync(
  process.execPath,
  ['scripts/importPublicToilets.mjs', `--region=${region}`, `--limit=${limit}`],
  {
    cwd: PROJECT_DIR,
    stdio: 'inherit',
    env: process.env,
  }
);

const sql = readFileSync(new URL('../tmp/public-toilets-import.sql', import.meta.url), 'utf8');
const countSql = `
  select
    (select count(*)::int from places where kakao_place_id like 'public_toilet:%') as public_places,
    (select count(*)::int from toilets where place_id in (
      select id from places where kakao_place_id like 'public_toilet:%'
    )) as public_toilets;
`;

const importResult = await executeSupabaseSql(sql);
console.log(`[sync] import result: ${stringifyMcpText(importResult).slice(0, 500)}`);

const countResult = await executeSupabaseSql(countSql);
console.log(`[sync] counts: ${stringifyMcpText(countResult)}`);
console.log('[sync] public toilets sync done');

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
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }

      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) request.reject(new Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
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
      clientInfo: { name: 'hwachelin-public-toilet-sync', version: '1.0.0' },
    });
    child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n'
    );

    return await request('tools/call', {
      name: 'execute_sql',
      arguments: { query },
    });
  } finally {
    child.kill('SIGTERM');
  }

  function request(method, params = {}) {
    const id = nextId;
    nextId += 1;
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout waiting for MCP method: ${method}`));
      }, 180000);

      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }
}

function stringifyMcpText(result) {
  return result.content?.map((item) => item.text).join('\n') ?? JSON.stringify(result);
}
