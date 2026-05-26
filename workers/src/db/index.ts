// D1 database wrapper
export interface DBClient {
  prepare(query: string): DBStatement;
  batch(statements: DBStatement[]): Promise<DBResult[]>;
  exec(query: string): Promise<DBResult>;
}

export interface DBStatement {
  bind(...params: unknown[]): DBStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<DBResult>;
  raw<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface DBResult {
  success: boolean;
  meta?: {
    rows_read: number;
    rows_written: number;
  };
}
