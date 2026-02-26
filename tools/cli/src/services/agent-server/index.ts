import http from 'node:http';

const port = process.env.PORT ? Number(process.env.PORT) : 4567;

function respondJson(
  res: http.ServerResponse,
  status: number,
  body: Record<string, string | number | boolean>,
) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': String(Buffer.byteLength(payload)),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    respondJson(res, 200, { status: 'ok', service: 'hominem-agent-server' });
    return;
  }

  if (req.method === 'GET' && req.url === '/v1/ping') {
    respondJson(res, 200, { ok: true, timestamp: Date.now() });
    return;
  }

  respondJson(res, 404, { error: 'Not found' });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`hominem agent server listening on http://127.0.0.1:${port}\n`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
