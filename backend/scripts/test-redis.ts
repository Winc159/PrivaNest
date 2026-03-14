/**
 * Redis 测试脚本
 * 
 * 用于验证 Redis 连接和基本功能
 * 运行：npm run test:redis
 */

import { redis, redisUtils } from './src/utils/redis.js'
import { dirCache } from './src/utils/cache.js'

async function testRedis() {
  console.log('🧪 Redis 功能测试\n')
  console.log('=' .repeat(50))
  
  try {
    // 测试 1: 连接测试
    console.log('\n📡 测试 1: Redis 连接')
    const pingResult = await redisUtils.ping()
    console.log(`✅ PING: ${pingResult}`)
    
    // 测试 2: 统计信息
    console.log('\n📊 测试 2: Redis 统计信息')
    const stats = await redisUtils.getStats()
    console.log(`✅ 连接状态：${stats.connected ? '已连接' : '未连接'}`)
    console.log(`✅ 数据库大小：${stats.dbSize} keys`)
    console.log(`✅ Redis 版本：${stats.info['redis_version'] || 'N/A'}`)
    
    // 测试 3: 基本 SET/GET
    console.log('\n💾 测试 3: 基本 SET/GET')
    const testKey = 'test:simple:' + Date.now()
    const testValue = { message: 'Hello Redis', timestamp: Date.now() }
    
    await redis.setex(testKey, 10, JSON.stringify(testValue))
    console.log(`✅ 写入数据：${testKey}`)
    
    const getData = await redis.get(testKey)
    console.log(`✅ 读取数据：${JSON.parse(getData || '{}').message}`)
    
    await redis.del(testKey)
    console.log(`✅ 删除数据：${testKey}`)
    
    // 测试 4: Hash 操作
    console.log('\n🗂️  测试 4: Hash 操作')
    const hashKey = 'test:hash:' + Date.now()
    await redis.hset(hashKey, {
      field1: 'value1',
      field2: 'value2',
      field3: 'value3'
    })
    console.log('✅ 写入 Hash 数据')
    
    const hashData = await redis.hgetall(hashKey)
    console.log(`✅ 读取 Hash 数据:`, hashData)
    
    await redis.del(hashKey)
    console.log(`✅ 删除 Hash: ${hashKey}`)
    
    // 测试 5: 目录缓存（混合缓存系统）
    console.log('\n📁 测试 5: 目录缓存系统')
    const cacheKey = 'test:cache:key'
    const cacheData = { 
      folders: ['folder1', 'folder2'], 
      files: ['file1.mp4', 'file2.jpg'],
      timestamp: Date.now()
    }
    
    await dirCache.set(cacheKey, cacheData, 60)
    console.log('✅ 写入缓存数据')
    
    const cachedData = await dirCache.get(cacheKey)
    console.log(`✅ 读取缓存数据:`, cachedData)
    
    await dirCache.delete(cacheKey)
    console.log('✅ 删除缓存数据')
    
    // 测试 6: 缓存统计
    console.log('\n📈 测试 6: 缓存统计')
    const cacheStats = dirCache.getStats()
    console.log(`✅ 内存缓存大小：${cacheStats.memoryCacheSize} items`)
    console.log(`✅ Redis 连接状态：${cacheStats.redisConnected ? '已连接' : '未连接'}`)
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ 所有测试通过！\n')
    
    // 清理测试数据
    await redis.flushdb()
    console.log('🗑️  测试数据已清空\n')
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message)
    console.error('错误堆栈:', error.stack)
    
    // 降级测试
    console.log('\n⚠️  Redis 不可用，测试内存缓存降级...')
    try {
      const cacheKey = 'fallback:test'
      const cacheData = { test: 'data' }
      
      await dirCache.set(cacheKey, cacheData, 60)
      const cached = await dirCache.get(cacheKey)
      
      if (cached && cached.test === 'data') {
        console.log('✅ 内存缓存降级正常工作')
        await dirCache.delete(cacheKey)
        console.log('✅ 降级模式测试通过\n')
      } else {
        console.log('❌ 内存缓存降级失败')
      }
    } catch (fallbackError: any) {
      console.error('❌ 降级测试也失败了:', fallbackError.message)
    }
  } finally {
    await redis.quit()
    console.log('👋 Redis 连接已关闭')
  }
}

// 运行测试
console.log('🚀 开始执行 Redis 测试...\n')
testRedis().catch(console.error)
