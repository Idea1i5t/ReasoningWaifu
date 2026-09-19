import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const allowedAssets = new Set(manifest.web_accessible_resources.flatMap(rule => rule.resources));
const fixture = await build({
  entryPoints: [resolve(root, 'dev/smoke.ts')], bundle: true,
  platform: 'browser', format: 'iife', target: 'es2022', write: false,
});
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (pathname === '/smoke.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : fixture.outputFiles[0].contents);
    return;
  }
  const asset = pathname.slice(1);
  const file = pathname === '/' ? 'dev/preview.html'
    : pathname === '/app/fixture' ? 'dev/smoke.html' : allowedAssets.has(asset) ? asset : null;
  if (!file) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(resolve(root, file));
    response.writeHead(200, {
      'Content-Type': file.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500).end('Could not read preview file');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(4173, '127.0.0.1', () => console.info('Placeholder preview: http://127.0.0.1:4173'));
