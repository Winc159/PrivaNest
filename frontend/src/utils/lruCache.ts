/**
 * LRU（Least Recently Used）缓存实现
 * 使用 Map 数据结构，自动维护访问顺序
 * 
 * @template K - 键类型
 * @template V - 值类型
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * 获取缓存值
   * 如果存在，会将该键移到末尾（标记为最近使用）
   * @param key 缓存键
   * @returns 缓存值，不存在则返回 undefined
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }

    // 将键移到末尾（标记为最近使用）
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  /**
   * 设置缓存值
   * 如果超出容量，会自动删除最久未使用的项
   * @param key 缓存键
   * @param value 缓存值
   */
  set(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 超出容量，删除最旧的（第一个）
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   * @returns 是否删除成功
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存大小
   * @returns 当前缓存中的项数
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取所有键
   * @returns 键的迭代器
   */
  keys(): IterableIterator<K> {
    return this.cache.keys()
  }

  /**
   * 获取所有值
   * @returns 值的迭代器
   */
  values(): IterableIterator<V> {
    return this.cache.values()
  }

  /**
   * 检查键是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }
}
