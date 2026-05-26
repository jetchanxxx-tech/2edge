// JWT implementation using Web Crypto API (HMAC-SHA256)
// Adapted for Cloudflare Workers runtime

const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function getKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    ALGORITHM,
    false,
    ['sign', 'verify']
  );
}

export interface JwtPayload {
  sub: number;       // user id
  email: string;
  is_admin: number;
  iat: number;
  exp: number;
}

export async function createToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds: number = 86400): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = base64urlEncode(JSON.stringify(full));

  const key = await getKey(secret);
  const signature = await crypto.subtle.sign(
    ALGORITHM.name,
    key,
    new TextEncoder().encode(`${header}.${payloadStr}`)
  );

  const sigStr = base64urlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${payloadStr}.${sigStr}`;
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      ALGORITHM.name,
      key,
      Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );

    if (!valid) return null;

    const payload: JwtPayload = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
