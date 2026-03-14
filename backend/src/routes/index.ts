import Router from '@koa/router'
import authRoutes from './auth.js'
import mediaRoutes from './media.js'
import { redisUtils } from '../utils/redis.js'

const router = new Router({
  prefix: '/api'
})

// 注册路由
router.use('/auth', authRoutes.routes())
router.use('/media', mediaRoutes.routes())
router.use('/stream', mediaRoutes.routes())
router.use('/progress', mediaRoutes.routes())
router.use('/subtitles', mediaRoutes.routes())

// 健康检查
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', message: 'PrivaNest API is running' }
})

// Redis 状态检查
router.get('/redis/status', async (ctx) => {
  try {
    const stats = await redisUtils.getStats()
    ctx.body = {
      success: true,
      redis: {
        connected: stats.connected,
        dbSize: stats.dbSize,
        version: stats.info['redis_version'] || 'unknown'
      }
    }
  } catch (error: any) {
    ctx.body = {
      success: false,
      redis: {
        connected: false,
        error: error.message
      }
    }
  }
})

// Redis 测试（写入和读取）
router.get('/redis/test', async (ctx) => {
  try {
    const testKey = 'test:' + Date.now()
    const testValue = { message: 'Hello Redis', timestamp: Date.now() }
    
    // 写入
    await require('ioredis').default.setex(testKey, 10, JSON.stringify(testValue))
    
    // 读取
    const data = await require('ioredis').default.get(testKey)
    
    // 删除
    await require('ioredis').default.del(testKey)
    
    ctx.body = {
      success: true,
      message: 'Redis 读写测试成功',
      data: JSON.parse(data)
    }
  } catch (error: any) {
    ctx.status = 500
    ctx.body = {
      success: false,
      message: 'Redis 测试失败',
      error: error.message
    }
  }
})

export default router
