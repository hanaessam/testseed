import type { PendingRegistration } from "@testseed/types";
import { Redis } from "@upstash/redis";

export type RedisClient = Redis;

export interface RedisClientConfig {
  url: string;
  token: string;
}

export function createRedisClient(config: RedisClientConfig): RedisClient {
  return new Redis({
    url: config.url,
    token: config.token
  });
}

export function createRegistrationOtpCache(redis: RedisClient) {
  return {
    async savePendingRegistration(input: PendingRegistration): Promise<void> {
      const ttlSeconds = Math.max(
        1,
        Math.ceil((input.expiresAt.getTime() - Date.now()) / 1000)
      );

      await redis.set(
        keyForEmail(input.email),
        {
          ...input,
          expiresAt: input.expiresAt.toISOString()
        },
        {
          ex: ttlSeconds
        }
      );
    },

    async findPendingRegistration(email: string): Promise<PendingRegistration | null> {
      const value = await redis.get<SerializedPendingRegistration>(keyForEmail(email));
      return value ? parsePendingRegistration(value) : null;
    },

    async consumePendingRegistrationAttempt(email: string): Promise<PendingRegistration | null> {
      const key = keyForEmail(email);
      const value = await redis.get<SerializedPendingRegistration>(key);
      if (!value) {
        return null;
      }

      const pending = parsePendingRegistration(value);
      const updated = {
        ...pending,
        attemptsRemaining: Math.max(0, pending.attemptsRemaining - 1)
      };
      const ttlSeconds = await redis.ttl(key);

      if (ttlSeconds <= 0) {
        await redis.del(key);
        return null;
      }

      await redis.set(
        key,
        {
          ...updated,
          expiresAt: updated.expiresAt.toISOString()
        },
        {
          ex: ttlSeconds
        }
      );

      return updated;
    },

    async deletePendingRegistration(email: string): Promise<void> {
      await redis.del(keyForEmail(email));
    }
  };
}

function keyForEmail(email: string): string {
  return `testseed:registration-otp:${email}`;
}

type SerializedPendingRegistration = Omit<PendingRegistration, "expiresAt"> & {
  expiresAt: string;
};

function parsePendingRegistration(value: SerializedPendingRegistration): PendingRegistration {
  return {
    ...value,
    expiresAt: new Date(value.expiresAt)
  };
}
