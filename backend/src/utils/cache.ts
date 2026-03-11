/**
 * LRU 缓存配置接口
 */
interface LRUCacheOptions {
  max: number // 最大缓存条目数
  ttl?: number // 过期时间 (毫秒)
}

/**
 * LRU 缓存实现
 * 支持 TTL 过期和最近最少使用淘汰策略
 */
export class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }>
  private max: number
  private ttl: number

  constructor(options: LRUCacheOptions) {
    this.cache = new Map()
    this.max = options.max
    this.ttl = options.ttl || 5 * 60 * 1000 // 默认 5 分钟
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // 更新访问时间 (LRU: 最近使用的移到末尾)
    this.cache.delete(key)
    this.cache.set(key, item)
    return item.value
  }

  set(key: string, value: T): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      // 超出容量，删除最旧的 (第一个)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

// 创建目录缓存：最多 100 个目录，缓存 5 分钟
export const dirCache = new LRUCache<{
  folders: any[]
  files: any[]
  timestamp: number
}>({
  max: 100,
  ttl: 5 * 60 * 1000
})
