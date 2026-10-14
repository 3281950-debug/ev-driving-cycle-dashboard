import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const APP_ID = 'ev-dashboard-portable-1';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

// The server has no npm dependencies and performs no simulation calculations.
export async function startServer({ webRoot, stateFile, instance, port = 0 }) {
  webRoot = resolve(webRoot);
  if (!existsSync(resolve(webRoot, 'index.html'))) throw new Error('生产页面缺失：web/index.html');
  const token = randomUUID();
  const server = http.createServer((request, response) => {
    const host = request.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) { response.writeHead(403).end('Invalid host'); return; }
    response.setHeader('X-Content-Type-Options', 'nosniff');
    let path;
    try { path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400).end('Invalid path'); return; }
    if (path === '/__ev_health' && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ app: APP_ID, pid: process.pid, instance, token })); return;
    }
    if (path === '/__ev_shutdown') {
      if (request.method !== 'POST' || request.headers['x-ev-token'] !== token) { response.writeHead(403).end('Forbidden'); return; }
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('仪表盘服务已关闭');
      response.once('finish', () => { server.close(); server.closeAllConnections(); }); return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end('Method not allowed'); return; }
    const file = resolve(webRoot, path === '/' ? 'index.html' : '.' + path);
    const within = relative(webRoot, file);
    if (within === '..' || within.startsWith('..' + sep) || within.includes('\0')) { response.writeHead(403).end('Forbidden'); return; }
    try {
      if (!statSync(file).isFile()) throw new Error('not a file');
      response.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(file).on('error', () => response.destroy()).pipe(response);
    } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('资源不存在'); }
  });
  await new Promise((done, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', done); });
  const url = `http://127.0.0.1:${server.address().port}/`;
  mkdirSync(dirname(stateFile), { recursive: true });
  try {
    writeFileSync(stateFile + '.tmp', JSON.stringify({ app: APP_ID, pid: process.pid, instance, token, url, startedAt: new Date().toISOString() }));
    renameSync(stateFile + '.tmp', stateFile);
  } catch (error) { server.close(); throw error; }
  server.once('close', () => {
    try { if (JSON.parse(readFileSync(stateFile, 'utf8')).token === token) rmSync(stateFile); } catch { /* Never remove another instance's state. */ }
  });
  return { server, url, token };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [webRoot, stateFile, instance] = process.argv.slice(2);
  if (!webRoot || !stateFile || !instance) throw new Error('Missing launcher arguments');
  const { server, url } = await startServer({ webRoot, stateFile, instance });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); server.closeAllConnections(); });
  console.log(`EV Dashboard ready: ${url}`);
}
