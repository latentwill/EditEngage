export async function checkHealth(
  redisConnection: { ping(): Promise<string> }
): Promise<{ status: string; redis: boolean }> {
  try {
    await redisConnection.ping();
    return { status: 'ok', redis: true };
  } catch {
    return { status: 'degraded', redis: false };
  }
}
