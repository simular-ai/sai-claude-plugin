import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'runtime/provenance.json')));
const files = readdirSync(join(root, 'runtime')).filter(f => f.endsWith('.mjs')).sort();
assert.deepEqual(files, Object.keys(manifest.files).sort());
for (const file of files) {
  const bytes = readFileSync(join(root, 'runtime', file));
  assert(bytes.length < 256 * 1024, `${file} must be under 256 KiB`);
  assert.equal(bytes.length, manifest.files[file].bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.files[file].sha256);
}
assert(!existsSync(join(root, 'package.json')));
assert(!existsSync(join(root, 'package-lock.json')));
const temp = mkdtempSync(join(tmpdir(), 'sai-plugin-check-'));
cpSync(join(root, 'runtime'), join(temp, 'runtime'), { recursive: true });
assert(!existsSync(join(temp, 'node_modules')));
async function probe(entry) {
  const child = spawn(process.execPath, [entry], { cwd: temp,
    env: { PATH: process.env.PATH, HOME: temp, SAI_API_KEY: 'sapi_test_only',
      SAI_API_URL: 'http://127.0.0.1:1', SAI_LOCAL_VIEW: '0' }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '', id = 0;
  child.stderr.on('data', b => { stderr += b; });
  const pending = new Map();
  const rejectAll = error => { for (const { reject } of pending.values()) reject(error); };
  child.on('error', rejectAll);
  child.on('exit', code => rejectAll(new Error(`Server exited ${code}: ${stderr}`)));
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    try {
      const msg = JSON.parse(line);
      const waiter = pending.get(msg.id);
      if (waiter) { pending.delete(msg.id); msg.error ? waiter.reject(new Error(JSON.stringify(msg.error))) : waiter.resolve(msg.result); }
    } catch (err) { rejectAll(err); }
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const current = ++id;
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}; ${stderr}`)), 10000);
    pending.set(current, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: current, method, params }) + '\n');
  });
  try {
    const init = await send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'plugin-smoke-test', version: '1.0' } });
    assert.equal(init.serverInfo.version, '0.3.0');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const tools = await send('tools/list', {});
    for (const name of ['sai_task_start', 'sai_task_wait', 'sai_task_approve', 'sai_task_abort', 'sai_upload', 'sai_models', 'sai_machines']) {
      assert(tools.tools.some(tool => tool.name === name), `Missing ${name}`);
    }
    const resources = await send('resources/list', {});
    assert(resources.resources.length > 0, 'Missing task-view resource');
    const view = await send('resources/read', { uri: resources.resources[0].uri });
    assert(view.contents.some(c => c.text?.includes('<html')), 'Task view must contain HTML');
    // Exercise SDK schema validation without making a paid API call.
    const invalid = await send('tools/call', { name: 'sai_task_start', arguments: { task: 42 } });
    assert.equal(invalid.isError, true);
    return { init, tools, resources };
  } finally { child.kill(); lines.close(); }
}
try {
  const actual = await probe(join(temp, 'runtime/server.mjs'));
  if (process.argv[2]) assert.deepEqual(actual, await probe(resolve(process.argv[2])), 'Published and bundled MCP contracts differ');
  console.log(`PASS: ${files.length} modules within size/hash limits; clean startup, ${actual.tools.tools.length} tools, task-view resource and input validation${process.argv[2] ? '; published-server contract parity' : ''}.`);
} finally { rmSync(temp, { recursive: true, force: true }); }
