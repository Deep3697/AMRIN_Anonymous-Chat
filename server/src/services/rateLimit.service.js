const messageLog = new Map(); // userId -> array of timestamps

export function isSpamming(userId, maxMessages = 5, windowMs = 10000) {
  const now = Date.now();
  const timestamps = (messageLog.get(userId) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxMessages) return true;

  timestamps.push(now);
  messageLog.set(userId, timestamps);
  return false;
}