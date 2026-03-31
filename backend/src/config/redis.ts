import Redis from 'ioredis'

import { env } from './env'

export const redis = env.redisUrl
  ? new Redis(env.redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    })
  : null

export const getRedisClient = async () => {
  if (!redis) return null
  if (redis.status === 'end') return null
  if (redis.status !== 'ready') {
    try {
      await redis.connect()
    } catch (error) {
      console.warn('Redis connection failed:', error)
      return null
    }
  }
  return redis
}