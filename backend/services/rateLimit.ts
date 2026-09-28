import IORedis from 'ioredis';

const hourReservationScript = `
  local senderCount = tonumber(redis.call('GET', KEYS[1]) or '0')
  local campaignCount = tonumber(redis.call('GET', KEYS[2]) or '0')
  if senderCount >= tonumber(ARGV[1]) then
    return 0
  end
  if campaignCount >= tonumber(ARGV[2]) then
    return 2
  end
  senderCount = redis.call('INCR', KEYS[1])
  campaignCount = redis.call('INCR', KEYS[2])
  if senderCount == 1 then redis.call('EXPIRE', KEYS[1], 7200) end
  if campaignCount == 1 then redis.call('EXPIRE', KEYS[2], 7200) end
  if senderCount == tonumber(ARGV[1]) then return 3 end
  return 1
`;

export async function reserveHourlyCapacity(
  redis: IORedis,
  senderId: string,
  campaignId: number,
  hour: number,
  senderLimit: number,
  campaignLimit: number,
) {
  return Number(await redis.eval(
    hourReservationScript,
    2,
    `email-rate:${senderId}:${hour}`,
    `campaign-email-rate:${campaignId}:${hour}`,
    senderLimit,
    campaignLimit,
  ));
}
