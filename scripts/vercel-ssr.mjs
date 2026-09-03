import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV ??= 'production';
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://costanswer.com';
process.env.VINEXT_TRUST_PROXY ??= '1';

const { startProdServer } = await import('vinext/server/prod-server');

// Vercel Node functions cannot bind a TCP port. Node still delivers
// `request` events on an unlistening Server, which is what Vinext needs.
http.Server.prototype.listen = function listen(port, host, cb) {
  const callback = typeof port === 'function' ? port : typeof host === 'function' ? host : cb;
  queueMicrotask(() => {
    this.emit('listening');
    callback?.();
  });
  return this;
};

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const boot = startProdServer({
  port: 0,
  host: '127.0.0.1',
  outDir,
  silent: true,
});

export default async function handler(req, res) {
  try {
    const { server } = await boot;
    server.emit('request', req, res);
  } catch (error) {
    console.error('[costanswer] Vercel SSR failed:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
}
