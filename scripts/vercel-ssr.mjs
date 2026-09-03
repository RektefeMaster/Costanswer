import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startProdServer } from 'vinext/server/prod-server';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const boot = startProdServer({
  port: 0,
  host: '127.0.0.1',
  outDir,
  silent: true,
});

export default async function handler(req, res) {
  const { server } = await boot;
  server.emit('request', req, res);
}
