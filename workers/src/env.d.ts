// Cloudflare Workers environment type declarations (ambient)

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1Result>;
}

interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<D1Result>;
  raw<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1Result {
  success: boolean;
  meta?: {
    rows_read: number;
    rows_written: number;
  };
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[]; list_complete: boolean }>;
}

// Bindings available in c.env
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
  SITE_URL: string;
  ENVIRONMENT: string;
  PROXY_HOST?: string;
  PROXY_PATH?: string;
}
