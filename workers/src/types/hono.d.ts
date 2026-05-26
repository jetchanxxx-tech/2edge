// Hono context variable type augmentation (must be in a module file)
import type { JwtPayload } from '../utils/jwt';

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}
