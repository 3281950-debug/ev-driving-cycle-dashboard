import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { startServer, APP_ID } from './server.mjs';

test('portable server serves assets, rejects invalid paths/methods, and shuts down only with its token', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ev-portable-test-'));
  mkdirSync(join(root, 'web', 'assets'), { recursive: true });
  writeFileSync(join(root, 'web', 'index.html'), '<title>BYD ATTO 3</title>');
  writeFileSync(join(root, 'web', 'assets', 'app.js'), 'console.log("local")');
  writeFileSync(join(root, 'secret.txt'), 'not public');
  const stateFile = join(root, 'state.json');
  const { server, url, token } = await startServer({ webRoot: join(root, 'web'), stateFile, instance: 'test' });
  try {
    assert.ok(existsSync(stateFile));
    assert.match(await (await fetch(url)).text(), /BYD ATTO 3/);
    const asset = await fetch(url + 'assets/app.js');
    assert.match(asset.headers.get('content-type'), /javascript/);
    assert.match(await asset.text(), /local/);
    assert.equal((await fetch(url + 'missing')).status, 404);
    assert.equal((await fetch(url + '%2e%2e%2fsecret.txt')).status, 403);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
    const health = await (await fetch(url + '__ev_health')).json();
    assert.equal(health.app, APP_ID); assert.equal(health.instance, 'test');
    assert.equal((await fetch(url + '__ev_shutdown', { method: 'POST', headers: { 'X-EV-Token': 'wrong' } })).status, 403);
    const closed = once(server, 'close');
    assert.equal((await fetch(url + '__ev_shutdown', { method: 'POST', headers: { 'X-EV-Token': token } })).status, 200);
    await closed;
    assert.equal(existsSync(stateFile), false);
  } finally {
    if (server.listening) { const closed = once(server, 'close'); server.close(); server.closeAllConnections(); await closed; }
    rmSync(root, { recursive: true });
  }
});

test('missing production page fails before creating server state', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ev-portable-missing-'));
  try { await assert.rejects(startServer({ webRoot: root, stateFile: join(root, 'state.json'), instance: 'test' }), /index.html/); }
  finally { rmSync(root, { recursive: true }); }
});
