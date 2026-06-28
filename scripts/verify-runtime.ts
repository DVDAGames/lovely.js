import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

interface RuntimeCheck {
  variant: 'web-compat' | 'web-threaded';
  source: string;
  required: string[];
}

const repoRoot = path.resolve(import.meta.dirname, '..');

const checks: RuntimeCheck[] = [
  {
    variant: 'web-compat',
    source: path.join(repoRoot, 'src', 'compat'),
    required: ['love.js', 'love.wasm'],
  },
  {
    variant: 'web-threaded',
    source: path.join(repoRoot, 'src', 'release'),
    required: ['love.js', 'love.wasm', 'love.worker.js'],
  },
];

await Promise.all(
  checks.flatMap(check =>
    check.required.map(async file => {
      await requireFile(path.join(check.source, file));
    }),
  ),
);
await requireFile(path.join(repoRoot, 'src', 'runtime', 'index.html'));
await requireFile(path.join(repoRoot, 'src', 'runtime', 'lovely-game-loader.js'));
await requireFile(path.join(repoRoot, 'src', 'runtime', 'lovely-web-shims.js'));

const releaseRuntime = await readText(path.join(repoRoot, 'src', 'release', 'love.js'));
const compatRuntime = await readText(path.join(repoRoot, 'src', 'compat', 'love.js'));
const defaultHtml = await readText(path.join(repoRoot, 'src', 'runtime', 'index.html'));
const gameLoader = await readText(path.join(repoRoot, 'src', 'runtime', 'lovely-game-loader.js'));
const webShims = await readText(path.join(repoRoot, 'src', 'runtime', 'lovely-web-shims.js'));

if (!releaseRuntime.includes('var Love')) {
  throw new Error('src/release/love.js does not expose the expected Love entrypoint');
}
if (!compatRuntime.includes('var Love')) {
  throw new Error('src/compat/love.js does not expose the expected Love entrypoint');
}
if (!releaseRuntime.includes('Module["getMemory"]')) {
  throw new Error('Expected legacy getMemory export in release runtime baseline');
}
if (!compatRuntime.includes('Module["getMemory"]')) {
  throw new Error('Expected legacy getMemory export in compat runtime baseline');
}
if (!defaultHtml.includes('lovely-game-loader.js')) {
  throw new Error('Expected default HTML to load Lovely game loader');
}
if (!defaultHtml.includes('__WEB_ARGUMENTS__')) {
  throw new Error('Expected default HTML to expose web arguments placeholder');
}
if (!gameLoader.includes('LovelyGameLoader')) {
  throw new Error('Expected LovelyGameLoader browser support module');
}
if (!webShims.includes('LovelyWeb')) {
  throw new Error('Expected LovelyWeb browser support module');
}

process.stdout.write('Runtime baseline verified.\n');

async function requireFile(file: string): Promise<void> {
  try {
    await access(file);
  } catch (error) {
    throw new Error(`Missing required runtime file: ${normalize(path.relative(repoRoot, file))}`, {
      cause: error,
    });
  }
}

async function readText(file: string): Promise<string> {
  return await readFile(file, 'utf8');
}

function normalize(value: string): string {
  return value.split(path.sep).join('/');
}
