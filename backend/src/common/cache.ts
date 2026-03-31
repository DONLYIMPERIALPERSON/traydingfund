import { getRedisClient } from '../config/redis'

export const buildCacheKey = (parts: Array<string | number>) =>
  ['mf-cache', ...parts].join(':')

export const getCached = async <T>(key: string): Promise<T | null> => {
  const client = await getRedisClient()
  if (!client) return null
  const value = await client.get(key)
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const setCached = async (key: string, payload: unknown, ttlSeconds: number) => {
  const client = await getRedisClient()
  if (!client) return
  await client.set(key, JSON.stringify(payload), 'EX', ttlSeconds)
}

export const clearCacheByPrefix = async (prefix: string) => {
  const client = await getRedisClient()
  if (!client) return
  const stream = client.scanStream({ match: `${prefix}*`, count: 100 })
  const keys: string[] = []
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys)
    })
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  if (keys.length) {
    await client.del(...keys)
  }
}