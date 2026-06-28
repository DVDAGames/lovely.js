import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface RuntimeFile {
  path: string;
  sha256: string;
}

interface RuntimeManifest {
  schema: 1;
  target: 'web';
  variant: RuntimeVariant;
  channel: string;
  loveVersion: string;
  emscriptenVersion: string;
  html: 'index.html';
  loader: 'lovely-game-loader.js';
  shims: 'lovely-web-shims.js';
  entrypoint: 'love.js';
  wasm: 'love.wasm';
  worker: 'love.worker.js' | null;
  files: RuntimeFile[];
}

interface RuntimeBundle {
  variant: RuntimeVariant;
  source: string;
  files: string[];
  worker: 'love.worker.js' | null;
}

type RuntimeVariant = 'web-compat' | 'web-threaded';

const repoRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(repoRoot, 'dist');
const channel = 'love-11-plus';
const loveVersion = '11.5';
const emscriptenVersion = '2.0.0';
const schema = 1;
const jsonIndent = '  ';
const runtimeSupport = ['index.html', 'lovely-game-loader.js', 'lovely-web-shims.js'];
const runtimeSupportSource = path.join(repoRoot, 'src', 'runtime');

const variants: RuntimeBundle[] = [
  {
    variant: 'web-compat',
    source: path.join(repoRoot, 'src', 'compat'),
    files: ['love.js', 'love.wasm'],
    worker: null,
  },
  {
    variant: 'web-threaded',
    source: path.join(repoRoot, 'src', 'release'),
    files: ['love.js', 'love.wasm', 'love.worker.js'],
    worker: 'love.worker.js',
  },
];

await rm(distRoot, { force: true, recursive: true });
await mkdir(distRoot, { recursive: true });

await Promise.all(variants.map(async bundle => {
  await packageVariant(bundle);
}));

async function packageVariant(bundle: RuntimeBundle): Promise<void> {
  const output = path.join(distRoot, bundle.variant);
  await mkdir(output, { recursive: true });

  await Promise.all(
    bundle.files.map(async file => {
      await copyRequired(path.join(bundle.source, file), path.join(output, file));
    }),
  );
  await Promise.all(
    runtimeSupport.map(async file => {
      await copyRequired(path.join(runtimeSupportSource, file), path.join(output, file));
    }),
  );

  const themePath = path.join(bundle.source, 'theme');
  if (await exists(themePath)) {
    await cp(themePath, path.join(output, 'theme'), { recursive: true });
  }

  const files = await collectFiles(output);
  const manifestFiles = await Promise.all(
    files
      .filter(file => normalize(path.relative(output, file)) !== 'lovely-runtime.json')
      .map(async file => ({
        path: normalize(path.relative(output, file)),
        sha256: await sha256(file),
      })),
  );
  manifestFiles.sort((a, b) => a.path.localeCompare(b.path));

  const manifest: RuntimeManifest = {
    schema,
    target: 'web',
    variant: bundle.variant,
    channel,
    loveVersion,
    emscriptenVersion,
    html: 'index.html',
    loader: 'lovely-game-loader.js',
    shims: 'lovely-web-shims.js',
    entrypoint: 'love.js',
    wasm: 'love.wasm',
    worker: bundle.worker,
    files: manifestFiles,
  };

  await writeFile(
    path.join(output, 'lovely-runtime.json'),
    `${JSON.stringify(manifest, null, jsonIndent)}\n`,
  );
  process.stdout.write(`Wrote ${normalize(path.relative(repoRoot, output))}\n`);
}

async function copyRequired(from: string, to: string): Promise<void> {
  if (!(await exists(from))) {
    throw new Error(`Missing runtime artifact: ${normalize(path.relative(repoRoot, from))}`);
  }
  await cp(from, to, { recursive: true });
}

async function collectFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  await visit(root, out);
  out.sort((a, b) => normalize(path.relative(root, a)).localeCompare(normalize(path.relative(root, b))));
  return out;
}

async function visit(dir: string, out: string[]): Promise<void> {
  await Promise.all((await readdir(dir, { withFileTypes: true })).map(async entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await visit(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }));
}

async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(await readFile(file));
  return hash.digest('hex');
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch (error) {
    void error;
    return false;
  }
}

function normalize(value: string): string {
  return value.split(path.sep).join('/');
}
