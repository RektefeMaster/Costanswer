import { createServer } from 'node:http';
import { startProdServer } from 'vinext/server/prod-server';

const port = Number(process.env.PORT ?? 3000);
const host = '0.0.0.0';
const boot = startProdServer({
  port: 0,
  host: '127.0.0.1',
  silent: true,
});

const server = createServer((req, res) => {
  boot.then(({ server: vinextServer }) => {
    vinextServer.emit('request', req, res);
  }).catch((error) => {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
});

server.listen(port, host);
