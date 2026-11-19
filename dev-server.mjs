import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const envFile = resolve(projectRoot, '.env');
try {
  const raw = await readFile(envFile, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await import('./build.mjs');
const { default: assistant } = await import('./netlify/functions/portfolio-assistant.mjs');
const distRoot = resolve(projectRoot, 'dist');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

async function readRequestBody(request, limit = 16_000) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/portfolio-assistant' || url.pathname === '/.netlify/functions/portfolio-assistant') {
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Use POST to ask the portfolio assistant.' }));
      return;
    }
    try {
      const body = await readRequestBody(request);
      const functionRequest = new Request(url, { method: 'POST', headers: request.headers, body });
      const functionResponse = await assistant(functionRequest, {});
      const headers = Object.fromEntries(functionResponse.headers.entries());
      response.writeHead(functionResponse.status, headers);
      response.end(Buffer.from(await functionResponse.arrayBuffer()));
    } catch {
      response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ error: 'The assistant request could not be processed.' }));
    }
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch {
    response.writeHead(400); response.end(); return;
  }
  let filePath = resolve(distRoot, `.${pathname}`);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(403); response.end(); return;
  }
  if (!extname(filePath)) filePath = resolve(filePath, 'index.html');
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

const port = Number(process.env.PORT || 8131);
server.listen(port, '127.0.0.1', () => console.log(`Portfolio dev server running at http://127.0.0.1:${port}`));
