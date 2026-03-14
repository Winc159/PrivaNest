/**
 * Redis 客户端实例
 * 
 * 使用 ioredis 库连接 Redis 服务器
 * 支持通过环境变量配置连接参数
 */

import Redis from 'ioredis'

// 创建 Redis 实例
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0, // 默认数据库
  retryStrategy: (times) => {
    // 重连策略：最多尝试 3 次，每次间隔递增
    if (times > 3) {
      console.warn('🔴 Redis 重连失败，已放弃尝试')
      return null
    }
    const delay = Math.min(times * 50, 2000)
    console.log(`🔴 Redis 重连中... 第 ${times} 次，延迟 ${delay}ms`)
    return delay
  },
  lazyConnect: true, // 懒连接：第一次操作时才连接
  maxRetriesPerRequest: 3 // 单个请求最大重试次数
})

// 连接事件监听
redis.on('connect', () => {
  console.log('✅ Redis 连接成功')
})

redis.on('ready', () => {
  console.log('✅ Redis 准备就绪')
})

redis.on('error', (err) => {
  console.error('❌ Redis 错误:', err.message)
})

redis.on('close', () => {
  console.warn('⚠️  Redis 连接已关闭')
})

redis.on('reconnecting', (delay: any) => {
  console.log(`🔴 Redis 正在重连... 延迟 ${delay}ms`)
})

// 导出工具方法
export const redisUtils = {
  /**
   * 测试 Redis 连接
   */
  async ping(): Promise<string> {
    return await redis.ping()
  },

  /**
   * 获取 Redis 统计信息
   */
  async getStats() {
    const info = await redis.info()
    const dbSize = await redis.dbsize()

    return {
      connected: redis.status === 'ready',
      dbSize,
      info: info.split('\n').reduce((acc: any, line) => {
        const [key, value] = line.split(':')
        if (key && value) {
          acc[key.trim()] = value.trim()
        }
        return acc
      }, {})
    }
  },

  /**
   * 清空当前数据库（开发环境使用）
   */
  async flushDb() {
    await redis.flushdb()
    console.log('🗑️  Redis 数据库已清空')
  }
}

export default redis
