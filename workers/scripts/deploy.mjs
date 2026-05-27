// Deploy Workers and Frontend via Cloudflare API
import { readFileSync, existsSync } from 'fs';

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!TOKEN) { console.error('Set CLOUDFLARE_API_TOKEN environment variable'); process.exit(1); }
const ACCOUNT_ID = '93e35d7819929da5d9a3ccfac38ed6e9';
const D1_ID = '7b5b8ccf-3d03-4e46-9db9-2e93b393679e';
const KV_ID = '66e06a18b77941c3a404285d670123c6';

async function api(method, path, body, contentType) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${path}`;
  const headers = { 'Authorization': `Bearer ${TOKEN}` };
  if (contentType) headers['Content-Type'] = contentType;

  const opts = { method, headers };
  if (body) opts.body = body;

  const res = await fetch(url, opts);
  const data = await res.json();
  if (!data.success) {
    console.error(`API Error: ${JSON.stringify(data.errors)}`);
  }
  return data;
}

async function deployWorker(name, scriptPath, isModule = true) {
  console.log(`\n=== Deploying ${name} ===`);

  if (!existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    return false;
  }

  const script = readFileSync(scriptPath, 'utf-8');
  console.log(`Script size: ${Buffer.byteLength(script)} bytes`);

  // Build multipart body
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
  const metadata = JSON.stringify({
    main_module: 'worker.js',
    bindings: [
      { type: 'd1', name: 'DB', database_id: D1_ID },
      { type: 'kv_namespace', name: 'KV', namespace_id: KV_ID },
      { type: 'plain_text', name: 'PROXY_HOST', text: '2edge-proxy.jet-s.workers.dev' },
      { type: 'plain_text', name: 'PROXY_PATH', text: '/' },
    ],
    compatibility_date: '2026-05-26',
  });

  const parts = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="worker.js"; filename="worker.js"`,
    `Content-Type: application/javascript+module`,
    '',
    script,
    `--${boundary}`,
    `Content-Disposition: form-data; name="metadata"`,
    `Content-Type: application/json`,
    '',
    metadata,
    `--${boundary}--`,
  ];
  const body = parts.join('\r\n');

  const result = await api('PUT', `/workers/scripts/${name}`, body, `multipart/form-data; boundary=${boundary}`);
  console.log(`Deploy: ${result.success ? 'OK' : 'FAILED'}`);
  return result.success;
}

async function createWorkerSubdomain(name) {
  console.log(`\n=== Creating workers.dev subdomain for ${name} ===`);
  const result = await api('POST', `/workers/scripts/${name}/subdomain`, JSON.stringify({ enabled: true }), 'application/json');
  console.log(`Subdomain: ${result.success ? 'OK' : 'FAILED'}`);
  if (result.success) {
    console.log(`URL: https://${name}.workers.dev`);
  }
  return result.success;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const workerName = args[0] || '2edge-api';
  const scriptPath = args[1] || './dist/2edge-api.js';

  await deployWorker(workerName, scriptPath);
  await createWorkerSubdomain(workerName);
}

main().catch(console.error);
