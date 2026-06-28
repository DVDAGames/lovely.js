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

const releaseRuntime = await readText(path.join(repoRoot, 'src', 'release', 'love.js'));
const compatRuntime = await readText(path.join(repoRoot, 'src', 'compat', 'love.js'));

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
