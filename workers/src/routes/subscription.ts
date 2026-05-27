import { Hono } from 'hono';

const router = new Hono<{ Bindings: Env }>();

// GET /api/v1/sub/:token - Multi-format subscription
router.get('/:token', async (c) => {
  const token = c.req.param('token');
  if (!token) return c.text('', 400);

  // Rate limit check (manual, to return proper subscription format on error)
  try {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const key = `ratelimit:sub:${token}:${Math.floor(Date.now() / 1000 / 30)}`;
    const current = await c.env.KV.get(key);
    const count = current ? parseInt(current) + 1 : 1;
    if (count > 2) {
      // Return empty but valid subscription so client doesn't show error
      return c.text(btoa(''), 200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Subscription-Userinfo': 'upload=0; download=0; total=0; expire=0',
        'Profile-Update-Interval': '24',
      });
    }
    await c.env.KV.put(key, count.toString(), { expirationTtl: 30 });
  } catch { /* fail open */ }

  try {
    const user = await c.env.DB.prepare(
      `SELECT id, uuid, transfer_enable, u, d, expired_at, banned, speed_limit
       FROM users WHERE token = ?`
    ).bind(token).first<{
      id: number; uuid: string; transfer_enable: number; u: number; d: number;
      expired_at: number | null; banned: number; speed_limit: number | null;
    }>();

    if (!user) return c.text('', 404);
    if (user.banned === 1) return c.text('', 403);
    if (user.expired_at && user.expired_at < Math.floor(Date.now() / 1000)) {
      return c.text('', 403);
    }

    const proxyHost = c.env.PROXY_HOST || '2edge-proxy.jet-s.workers.dev';
    const proxyPath = c.env.PROXY_PATH || '/';
    const proxyName = c.env.SITE_NAME || '2Edge';

    // VLESS link (edgetunnel-compatible format)
    const vlessLink = 'vless://' + user.uuid + '@' + proxyHost +
      ':443?encryption=none&security=tls&sni=' + proxyHost +
      '&type=ws&host=' + proxyHost + '&path=' + encodeURIComponent(proxyPath) +
      '#' + encodeURIComponent(proxyName);

    // Trojan link
    const trojanLink = 'trojan://' + user.uuid + '@' + proxyHost +
      ':443?security=tls&sni=' + proxyHost +
      '&type=ws&host=' + proxyHost + '&path=' + encodeURIComponent(proxyPath) +
      '#' + encodeURIComponent(proxyName);

    // Shadowsocks link
    const ssLink = 'ss://' + btoa('aes-128-gcm:' + user.uuid) + '@' + proxyHost +
      ':443#' + encodeURIComponent(proxyName);

    const content = [vlessLink, trojanLink, ssLink].join('\n');

    // Traffic display (KB, not bytes — v2rayN displays as-is)
    const upload   = Math.floor(user.u / 1024);
    const download = Math.floor(user.d / 1024);
    const total    = Math.floor(user.transfer_enable / 1024);
    const expire   = user.expired_at || 0;

    // Detect Clash
    const ua = (c.req.header('User-Agent') || '').toLowerCase();
    if (ua.includes('clash') || ua.includes('mihomo') || ua.includes('stash')) {
      return new Response(generateClash(user.uuid, user.speed_limit, proxyHost, proxyPath, proxyName), {
        status: 200,
        headers: {
          'Content-Type': 'text/yaml; charset=utf-8',
          'Subscription-Userinfo': `upload=${upload}; download=${download}; total=${total}; expire=${expire}`,
          'Profile-Update-Interval': '12',
        },
      });
    }

    // Standard base64 (v2rayN, Shadowrocket, Sing-box, Quantumult X)
    // NOTE: btoa uses standard base64, NOT base64url
    const base64Content = btoa(content);

    return new Response(base64Content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Subscription-Userinfo': `upload=${upload}; download=${download}; total=${total}; expire=${expire}`,
        'Profile-Update-Interval': '12',
      },
    });
  } catch (e) {
    console.error('Subscription error:', e);
    return c.text('', 500);
  }
});

function generateClash(
  uuid: string, speedLimit: number | null,
  host: string, path: string, name: string
): string {
  return [
    'proxies:',
    `  - name: "${name} (VLESS)"`,
    '    type: vless',
    `    server: ${host}`,
    '    port: 443',
    `    uuid: ${uuid}`,
    '    network: ws',
    '    tls: true',
    `    servername: ${host}`,
    '    ws-opts:',
    `      path: "${path}"`,
    '      headers:',
    `        Host: ${host}`,
    '    udp: true',
    `  - name: "${name} (Trojan)"`,
    '    type: trojan',
    `    server: ${host}`,
    '    port: 443',
    `    password: "${uuid}"`,
    '    network: ws',
    '    tls: true',
    `    sni: ${host}`,
    '    ws-opts:',
    `      path: "${path}"`,
    '      headers:',
    `        Host: ${host}`,
    '    udp: true',
    speedLimit ? '' : '',
    'proxy-groups:',
    `  - name: "2Edge"`,
    '    type: select',
    '    proxies:',
    `      - "${name} (VLESS)"`,
    `      - "${name} (Trojan)"`,
  ].join('\n');
}

export { router as subscriptionRouter };
