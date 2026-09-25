const rateLimit = new Map();

export function checkRateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let requestStamps = rateLimit.get(ip) || [];
  requestStamps = requestStamps.filter((stamp: number) => stamp > windowStart);

  if (requestStamps.length >= limit) {
    return false;
  }

  requestStamps.push(now);
  rateLimit.set(ip, requestStamps);
  
  return true;
}
