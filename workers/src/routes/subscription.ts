import { Hono } from 'hono';
import { subscriptionRateLimit } from '../middleware/rateLimit';

const router = new Hono<{ Bindings: Env }>();

// GET /api/v1/sub/:token - Multi-format subscription endpoint
router.get('/:token', subscriptionRateLimit, async (c) => {
  try {
    const token = c.req.param('token');
    if (!token) {
      return c.text('Invalid token', 400);
    }

    const user = await c.env.DB.prepare(
      `SELECT id, uuid, transfer_enable, u, d, expired_at, banned, speed_limit
       FROM users WHERE token = ?`
    ).bind(token).first<{
      id: number; uuid: string; transfer_enable: number; u: number; d: number;
      expired_at: number | null; banned: number; speed_limit: number | null;
    }>();

    if (!user) return c.text('Not Found', 404);
    if (user.banned === 1) return c.text('Forbidden', 403);
    if (user.expired_at && user.expired_at < Math.floor(Date.now() / 1000)) {
      return c.text('Expired', 403);
    }

    // Proxy server config — update these to your actual proxy domain
    const proxyHost = c.env.PROXY_HOST || '2edge-proxy.jet-s.workers.dev';
    const proxyPath = c.env.PROXY_PATH || '/';
    const proxyName = c.env.SITE_NAME || '2Edge';
    const sni = proxyHost;

    // Build VLESS link
    const vlessParams = [
      'encryption=none',
      'security=tls',
      `sni=${sni}`,
      'type=ws',
      `host=${proxyHost}`,
      `path=${encodeURIComponent(proxyPath)}`,
    ].join('&');
    const vlessLink = `vless://${user.uuid}@${proxyHost}:443?${vlessParams}#${encodeURIComponent(proxyName)}`;

    // Build Trojan link
    const trojanLink = `trojan://${user.uuid}@${proxyHost}:443?security=tls&sni=${sni}&type=ws&host=${proxyHost}&path=${encodeURIComponent(proxyPath)}#${encodeURIComponent(proxyName)}`;

    // Build Shadowsocks link (2022-blake3 or AES-128-GCM)
    const ssLink = `ss://${btoa(`aes-128-gcm:${user.uuid}@${proxyHost}:443`)}?plugin=obfs-local%3Bobfs%3Dwebsocket%3Bobfs-host%3D${proxyHost}%3Bobfs-uri%3D${encodeURIComponent(proxyPath)}#${encodeURIComponent(proxyName)}`;

    const links = [vlessLink, trojanLink, ssLink].join('\n');

    // Traffic headers
    c.header('Subscription-Userinfo', `upload=${user.u}; download=${user.d}; total=${user.transfer_enable}; expire=${user.expired_at || 0}`);
    c.header('Profile-Update-Interval', '12');
    c.header('Profile-Title', `2Edge-${user.id}`);
    c.header('Content-Disposition', 'attachment; filename=2edge.txt');

    // Detect format by User-Agent
    const ua = (c.req.header('User-Agent') || '').toLowerCase();

    if (ua.includes('clash') || ua.includes('mihomo') || ua.includes('stash')) {
      // Clash / Clash Meta YAML format
      return c.text(generateClashConfig(user, proxyHost, proxyPath, proxyName, sni), 200, {
        'Content-Type': 'text/yaml; charset=utf-8',
      });
    }

    // Default: standard base64 encoded subscription (v2rayN, Shadowrocket, Quantumult, Sing-box)
    return c.text(btoa(links), 200, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
  } catch (e) {
    console.error('Subscription generation error:', e);
    return c.text('Internal Server Error', 500);
  }
});

function generateClashConfig(
  user: { uuid: string; speed_limit: number | null },
  host: string, path: string, name: string, sni: string
): string {
  const speed = user.speed_limit || 0;
  return `proxies:
  - name: "${name} (VLESS)"
    type: vless
    server: ${host}
    port: 443
    uuid: ${user.uuid}
    network: ws
    tls: true
    servername: ${sni}
    ws-opts:
      path: "${path}"
      headers:
        Host: ${host}
    udp: true
${speed > 0 ? `    smux:\n      enabled: false\n` : ''}
  - name: "${name} (Trojan)"
    type: trojan
    server: ${host}
    port: 443
    password: "${user.uuid}"
    network: ws
    tls: true
    sni: ${sni}
    ws-opts:
      path: "${path}"
      headers:
        Host: ${host}
    udp: true

proxy-groups:
  - name: "2Edge"
    type: select
    proxies:
      - "${name} (VLESS)"
      - "${name} (Trojan)"
`;
}

export { router as subscriptionRouter };
