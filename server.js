import { startProdServer } from 'vinext/server/prod-server';

await startProdServer({
  port: Number(process.env.PORT ?? 3000),
  host: '0.0.0.0',
});
