/**
 * 混合缓存系统
 * 
 * 优先使用 Redis 缓存，当 Redis 不可用时自动降级到内存 LRU 缓存
 * 支持 TTL 过期和最近最少使用淘汰策略
 */

import redis from './redis'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl?: number // 过期时间戳
}

/**
 * 内存 LRU 缓存（降级方案）
 */
class MemoryLRUCache<T> {
  private cache: Map<string, CacheEntry<T>>
  private max: number

  constructor(maxSize: number = 100) {
    this.cache = new Map()
    this.max = maxSize
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    // 检查是否过期
    if (item.ttl && Date.now() > item.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // 更新访问时间（LRU：最近使用的移到末尾）
    this.cache.delete(key)
    this.cache.set(key, item)
    return item.data
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      // 超出容量，删除最旧的（第一个）
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined
    }
    this.cache.set(key, entry)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// 创建内存缓存实例（作为降级方案）
const memoryCache = new MemoryLRUCache<any>(100)

/**
 * 混合缓存接口
 * 自动在 Redis 和内存缓存之间切换
 */
export const dirCache = {
  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，不存在则返回 null
   */
  async get(key: string): Promise<any | null> {
    try {
      // 尝试从 Redis 读取
      const data = await redis.get(`dircache:${key}`)

      if (data) {
        console.log(`[缓存命中] Redis: ${key}`)
        const parsed = JSON.parse(data)

        // 检查是否过期
        if (parsed.ttl && Date.now() > parsed.ttl) {
          await this.delete(key)
          console.log(`[缓存过期] Redis: ${key}`)
          return null
        }

        // 验证数据结构有效性
        if (parsed.data && (Array.isArray(parsed.data.folders) || Array.isArray(parsed.data.files))) {
          return parsed.data
        } else {
          console.warn(`[缓存数据格式错误] ${key}:`, parsed)
          // 删除无效缓存
          await this.delete(key)
          return null
        }
      }

      // Redis 未命中，尝试内存缓存
      const memoryData = memoryCache.get(key)
      if (memoryData) {
        // 验证内存缓存数据有效性
        if (memoryData && (Array.isArray(memoryData.folders) || Array.isArray(memoryData.files))) {
          console.log(`[缓存命中] Memory: ${key}`)
          return memoryData
        } else {
          console.warn(`[内存缓存数据无效] ${key}:`, memoryData)
          // 删除无效缓存
          memoryCache.delete(key)
        }
      }

      console.log(`[缓存未命中]: ${key}`)
      return null
    } catch (error: any) {
      // Redis 错误，降级到内存缓存
      if (error.code !== 'ECONNREFUSED' && error.message !== 'Connection is closed.') {
        console.error('Redis 读取缓存失败:', error.message)
      }

      const memoryData = memoryCache.get(key)
      if (memoryData) {
        console.log(`[降级到内存缓存]: ${key}`)
        return memoryData
      }

      return null
    }
  },

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值（必须包含 folders 或 files 数组）
   * @param ttlSeconds 过期时间（秒），默认 300 秒
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    // 验证数据结构有效性
    if (!value || (!Array.isArray(value.folders) && !Array.isArray(value.files))) {
      console.warn(`[拒绝写入无效缓存] ${key}:`, value)
      return
    }

    const cacheEntry = {
      data: value,
      timestamp: Date.now(),
      ttl: Date.now() + (ttlSeconds * 1000)
    }

    try {
      // 同时写入 Redis（设置过期时间）
      await redis.setex(
        `dircache:${key}`,
        ttlSeconds,
        JSON.stringify(cacheEntry)
      )
      console.log(`[缓存写入] Redis: ${key} (TTL: ${ttlSeconds}s)`);

      // 同时写入内存缓存（双重保险）
      memoryCache.set(key, value, ttlSeconds)
    } catch (error: any) {
      // Redis 写入失败，只写入内存缓存
      console.warn('Redis 写入缓存失败，降级到内存:', error.message)
      memoryCache.set(key, value, ttlSeconds)
      console.log(`[缓存写入] Memory: ${key} (TTL: ${ttlSeconds}s)`);
    }
  },

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    try {
      // 删除 Redis 缓存
      await redis.del(`dircache:${key}`)
      console.log(`[缓存删除] Redis: ${key}`);
    } catch (error: any) {
      console.warn('Redis 删除缓存失败:', error.message)
    }

    // 删除内存缓存
    memoryCache.delete(key)
    console.log(`[缓存删除] Memory: ${key}`);
  },

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      // 清空 Redis 中所有 dircache:* 键
      const keys = await redis.keys('dircache:*')
      if (keys.length > 0) {
        await redis.del(...keys)
        console.log(`[缓存清空] Redis: ${keys.length} keys`);
      }
    } catch (error: any) {
      console.warn('Redis 清空缓存失败:', error.message)
    }

    // 清空内存缓存
    memoryCache.clear()
    console.log('[缓存清空] Memory');
  },

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      memoryCacheSize: memoryCache.size(),
      redisConnected: redis.status === 'ready'
    }
  }
}

// 重新导出 LRU 缓存类型（如果需要直接使用内存缓存）
export { MemoryLRUCache as LRUCache }
