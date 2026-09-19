import { build, context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile, watch } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const isWatch = process.argv.includes('--watch');

async function copyStaticFiles() {
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  await rm(join(dist, 'assets'), { recursive: true, force: true });
  for (const resource of manifest.web_accessible_resources.flatMap(rule => rule.resources)) {
    await cp(join(root, resource), join(dist, resource), { recursive: false });
  }
  await writeFile(join(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'assets/gemini'), { recursive: true });
const options = {
  absWorkingDir: root,
  entryPoints: ['src/content.ts'],
  outfile: 'dist/content.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info',
  plugins: [{ name: 'static-files', setup(builder) {
    builder.onEnd(async result => {
      if (result.errors.length === 0) await copyStaticFiles();
    });
  } }],
};

if (!isWatch) {
  await build(options);
} else {
  const ctx = await context(options);
  await ctx.watch();
  const controller = new AbortController();
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    controller.abort();
    await ctx.dispose();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  // Assets and the manifest are not part of esbuild's module graph.
  // Serialize copies with esbuild rebuilds instead of copying concurrently.
  for (const path of ['assets', 'manifest.json']) {
    (async () => {
      try {
        for await (const _event of watch(join(root, path), { recursive: true, signal: controller.signal })) {
          await ctx.rebuild();
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error);
          process.exitCode = 1;
          await stop();
        }
      }
    })();
  }
  console.info('Watching source, assets and manifest. Reload the extension and refresh Gemini after changes.');
}
