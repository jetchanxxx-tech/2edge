// 2Edge Proxy Worker - ES Module Entry Point
// Wraps the edgetunnel core with multi-user support

import { refreshUserCache, flushTraffic } from './multiUser.js';
import proxyCore from './core.js';

export default {
  async fetch(request, env, ctx) {
    // Background: refresh user UUID cache from D1
    ctx.waitUntil(refreshUserCache(env));

    // Set up periodic traffic flush with env access
    // The multiUser module needs env to flush to D1
    // We store env ref for the flush callback
    if (!globalThis._2edgeEnv) {
      globalThis._2edgeEnv = env;
      globalThis._2edgeCtx = ctx;
    }

    // Delegate to the original edgetunnel fetch handler
    // It will use the multiUser module for UUID validation
    const response = await proxyCore.fetch(request, env, ctx);

    // After request completes, schedule traffic flush with env
    ctx.waitUntil(
      (async () => {
        try {
          await flushTraffic(env);
        } catch (e) {
          // Silent fail - traffic will be retried next flush
        }
      })()
    );

    return response;
  }
};
