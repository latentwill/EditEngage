import { createClient } from '@supabase/supabase-js';
import IORedis from 'ioredis';
import { createWorker } from './worker';
import { checkHealth } from './health';
import { writeFileSync } from 'fs';

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`[worker] Starting EditEngage worker...`);
console.log(`[worker] Redis: ${REDIS_HOST}:${REDIS_PORT}`);
console.log(`[worker] Supabase: ${SUPABASE_URL ? 'configured' : 'NOT SET'}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[worker] Missing SUPABASE env vars. Exiting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const redis = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log(`[worker] Redis connected`);
});

redis.on('error', (err) => {
  console.error(`[worker] Redis error:`, err.message);
});

createWorker(supabase);
console.log(`[worker] BullMQ worker started, listening for jobs`);

// Health check heartbeat
setInterval(async () => {
  const health = await checkHealth(redis);
  if (health.redis) {
    writeFileSync('/tmp/worker-healthy', new Date().toISOString());
  }
}, 30_000);

// Initial health write
writeFileSync('/tmp/worker-healthy', new Date().toISOString());

console.log(`[worker] Ready`);
