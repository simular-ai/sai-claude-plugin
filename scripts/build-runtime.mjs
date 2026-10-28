// Build-time only. End users run runtime/server.mjs without installing packages.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const revision = 'd24e862c06ef36d99ae9b6657096df18ff06dd40';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2] ? resolve(process.argv[2]) : mkdtempSync(join(tmpdir(), 'sai-plugin-source-'));
if (!process.argv[2]) {
  const archive = execFileSync('gh', ['api', `repos/simular-ai/sai-sdk/tarball/${revision}`], { maxBuffer: 32 * 1024 * 1024 });
  const archivePath = join(source, 'source.tar.gz');
  writeFileSync(archivePath, archive);
  execFileSync('tar', ['-xzf', archivePath, '-C', source, '--strip-components=1']);
  execFileSync('npm', ['ci', '--ignore-scripts'], { cwd: source, stdio: 'inherit' });
}
const { build } = await import(pathToFileURL(join(source, 'node_modules/esbuild/lib/main.js')));
const cwd = join(source, 'mcp');
const version = JSON.parse(readFileSync(join(cwd, 'package.json'))).version;
if (version !== '0.3.0') throw new Error(`Expected sai-mcp 0.3.0, got ${version}`);
const ui = await build({ absWorkingDir: cwd, entryPoints: ['src/ui/task-view.ts'], bundle: true,
  platform: 'browser', target: 'es2022', format: 'iife', minify: false, write: false,
  define: { __SAI_VERSION__: JSON.stringify(version) } });
const html = readFileSync(join(cwd, 'src/ui/task-view.html'), 'utf8').replace(
  '/*__SAI_TASK_VIEW_JS__*/', () => ui.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
const staging = mkdtempSync(join(tmpdir(), 'sai-plugin-runtime-'));
// Shared entry points give esbuild module boundaries for its static ESM chunks.
// Do not minify: every shipped script must remain readable by directory review.
const result = await build({ absWorkingDir: cwd, entryPoints: {
  server: 'src/server.ts', 'task-view': 'src/app-view.ts',
  'sdk-mcp': '../node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js',
  'sdk-types': '../node_modules/@modelcontextprotocol/sdk/dist/esm/types.js',
  'zod-v3': '../node_modules/zod/v3/index.js', 'zod-v4': '../node_modules/zod/v4/core/index.js',
  'zod-locales': '../node_modules/zod/v4/locales/index.js', ajv: '../node_modules/ajv/dist/ajv.js',
}, bundle: true, splitting: true, platform: 'node', target: 'node22', format: 'esm',
  outdir: staging, outExtension: { '.js': '.mjs' }, minify: false, metafile: true,
  define: { __SAI_TASK_VIEW_HTML__: JSON.stringify(html) },
  banner: { js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);" },
});
const output = join(root, 'runtime');
mkdirSync(output, { recursive: true });
for (const name of readdirSync(output)) if (name.endsWith('.mjs')) rmSync(join(output, name));
const files = {};
for (const name of readdirSync(staging).sort()) {
  const data = readFileSync(join(staging, name));
  if (data.length >= 256 * 1024) throw new Error(`${name} exceeds the review size limit`);
  copyFileSync(join(staging, name), join(output, name));
  files[name] = { bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
}
// Include licenses only for packages actually present in either bundle.
const uiMeta = await build({ absWorkingDir: cwd, entryPoints: ['src/ui/task-view.ts'], bundle: true,
  platform: 'browser', write: false, metafile: true, define: { __SAI_VERSION__: JSON.stringify(version) } });
const packages = new Set();
for (const input of [...Object.keys(result.metafile.inputs), ...Object.keys(uiMeta.metafile.inputs)]) {
  let dir = dirname(resolve(cwd, input));
  while (dir.startsWith(source)) {
    try { const pkg = JSON.parse(readFileSync(join(dir, 'package.json'))); if (pkg.name) { packages.add(dir); break; } } catch {}
    dir = dirname(dir);
  }
}
let licenses = 'Bundled third-party notices\n\n';
const dependencies = {};
for (const dir of [...packages].sort()) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json')));
  dependencies[pkg.name] = pkg.version;
  const license = readdirSync(dir).find(name => /^licen[cs]e(?:\.|$)/i.test(name));
  if (!license) throw new Error(`Missing license: ${pkg.name}`);
  licenses += `=== ${pkg.name}@${pkg.version} (${pkg.license}) ===\n\n${readFileSync(join(dir, license), 'utf8')}\n\n`;
}
writeFileSync(join(output, 'THIRD-PARTY-NOTICES.txt'), licenses);
writeFileSync(join(output, 'provenance.json'), JSON.stringify({ source: 'https://github.com/simular-ai/sai-sdk', revision,
  version, esbuild: '0.28.1', dependencies, files }, null, 2) + '\n');
console.log(`Built ${Object.keys(files).length} readable modules; largest ${Math.max(...Object.values(files).map(f => f.bytes))} bytes.`);
