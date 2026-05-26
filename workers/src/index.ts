import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { subscriptionRouter } from './routes/subscription';
import { adminUsersRouter } from './routes/admin/users';
import { adminDashboardRouter } from './routes/admin/dashboard';
import { adminConfigRouter } from './routes/admin/config';
import { adminAuditRouter } from './routes/admin/audit';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Subscription-Userinfo', 'Profile-Update-Interval'],
  maxAge: 86400,
}));

// Health check
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Public routes
app.route('/api/v1/auth', authRouter);
app.route('/api/v1/sub', subscriptionRouter);

// Authenticated user routes
app.route('/api/v1/user', userRouter);

// Admin routes
app.route('/api/v1/admin/users', adminUsersRouter);
app.route('/api/v1/admin/dashboard', adminDashboardRouter);
app.route('/api/v1/admin/config', adminConfigRouter);
app.route('/api/v1/admin/audit-log', adminAuditRouter);

// 404 handler
app.all('*', (c) => {
  return c.json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404);
});

export default app;
