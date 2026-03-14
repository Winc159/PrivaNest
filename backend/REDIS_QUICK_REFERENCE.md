# Redis Phase 1 - 快速参考卡

## 🚀 快速开始

### 方式 1：一键启动（推荐）✨
```bash
# 在项目根目录执行
./start.sh
```

脚本会自动：
- ✅ 检查并安装依赖
- ✅ 检测 Redis 服务状态
- ✅ 询问是否启动 Redis
- ✅ 创建配置文件
- ✅ 启动前后端服务

### 方式 2：手动启动 Redis
```bash
# macOS (Homebrew)
brew install redis
brew services start redis
npm run dev

# Docker
docker run -d --name privanest-redis -p 6379:6379 redis:latest
npm run dev

# Linux
sudo systemctl start redis-server
npm run dev
```

### 方式 3：无 Redis 模式
```bash
# 直接运行，系统自动降级到内存缓存
./start.sh
```

---

## 📝 API 接口

### 检查 Redis 状态
```bash
curl http://localhost:4000/api/redis/status
```

响应：
```json
{
  "success": true,
  "redis": {
    "connected": true,
    "dbSize": 5,
    "version": "7.0.0"
  }
}
```

### 测试 Redis 读写
```bash
curl http://localhost:4000/api/redis/test
```

### 运行测试脚本
```bash
cd backend
npm run test:redis
```

---

## 💻 代码示例

### 基本使用（缓存目录数据）
```typescript
import { dirCache } from './utils/cache.js'

// 写入缓存（TTL 5 分钟）
await dirCache.set('0:/photos/2024', {
  folders: ['folder1', 'folder2'],
  files: ['file1.mp4', 'file2.jpg']
}, 300)

// 读取缓存
const data = await dirCache.get('0:/photos/2024')
if (data) {
  console.log('命中缓存:', data)
} else {
  console.log('缓存未命中')
}

// 删除缓存
await dirCache.delete('0:/photos/2024')

// 清空所有缓存
await dirCache.clear()
```

### 直接使用 Redis
```typescript
import redis from './utils/redis.js'

// String 操作
await redis.set('key', 'value')
const value = await redis.get('key')
await redis.del('key')

// 带过期时间的设置
await redis.setex('key', 300, 'value') // 5 分钟过期

// Hash 操作
await redis.hset('user:1', { 
  name: 'John',
  age: '30',
  email: 'john@example.com'
})

const user = await redis.hgetall('user:1')
// { name: 'John', age: '30', email: 'john@example.com' }

// Pipeline（批量操作）
const pipeline = redis.pipeline()
pipeline.set('foo', 'bar')
pipeline.incr('hits')
pipeline.hset('user:1', 'name', 'Alice')
await pipeline.exec()
```

---

## 🔧 常用命令

### Redis CLI
```bash
# 连接 Redis
redis-cli

# 测试连接
PING

# 查看所有键
KEYS *

# 查看特定模式的键
KEYS dircache:*

# 查看数据库大小
DBSIZE

# 获取键的剩余时间（秒）
TTL key

# 删除键
DEL key

# 清空数据库
FLUSHDB

# 监控实时命令
MONITOR
```

---

## 🐛 故障排查

### Redis 连接失败
```
❌ Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解决方案：**
1. 检查 Redis 是否运行：`redis-cli ping`
2. 启动 Redis：
   - macOS: `brew services start redis`
   - Linux: `sudo systemctl start redis-server`
   - Docker: `docker start privanest-redis`
3. 检查端口：`lsof -i :6379`

### 缓存未生效
```bash
# 查看 Redis 中的缓存键
redis-cli KEYS dircache:*

# 查看缓存详情
redis-cli GET dircache:0:/photos/2024
```

### 内存缓存降级
如果 Redis 不可用，系统会自动降级到内存缓存，日志会显示：
```
⚠️  Redis 写入缓存失败，降级到内存
[缓存写入] Memory: key (TTL: 300s)
```

---

## 📊 性能指标

| 操作 | 内存缓存 | Redis | 说明 |
|------|---------|-------|------|
| GET | ~0.1ms | ~1-2ms | Redis 有网络开销 |
| SET | ~0.1ms | ~1-2ms | - |
| 持久化 | ❌ 重启丢失 | ✅ AOF/RDB | - |
| 多实例共享 | ❌ | ✅ | - |

---

## 🎯 最佳实践

### ✅ 推荐
```typescript
// 1. 总是设置 TTL
await dirCache.set(key, data, 300)

// 2. 使用有意义的键名
const cacheKey = `dircache:${libraryIndex}:${path}`

// 3. 捕获 Redis 错误并降级
try {
  await redis.get(key)
} catch (error) {
  // 降级到内存缓存
  memoryCache.get(key)
}

// 4. 批量操作使用 Pipeline
const pipeline = redis.pipeline()
for (const item of items) {
  pipeline.set(`key:${item.id}`, item.data)
}
await pipeline.exec()
```

### ❌ 避免
```typescript
// 1. 不要存储过大的值（> 1MB）
await redis.set('huge:data', hugeObject) // ❌

// 2. 不要忘记设置 TTL
await redis.set('key', 'value') // ❌ 永不过期

// 3. 不要频繁清空整个数据库
await redis.flushdb() // ❌ 除非必要

// 4. 不要在循环中单独执行命令
for (const item of items) {
  await redis.set(`key:${item.id}`, item.data) // ❌ 慢
}
```

---

## 📚 关键文件清单

| 文件 | 作用 |
|------|------|
| `src/utils/redis.ts` | Redis 客户端封装 |
| `src/utils/cache.ts` | 混合缓存系统 |
| `src/config/index.ts` | Redis 配置 |
| `.env.example` | 环境变量示例 |
| `scripts/test-redis.ts` | 测试脚本 |
| `start.sh` | **主启动脚本（包含 Redis 检查）** ✨ |

---

## 🎓 下一步

完成 Phase 1 后，你已经掌握了：
- ✅ Redis 基础连接和配置
- ✅ String 和 Hash 数据类型
- ✅ 缓存系统和降级机制
- ✅ 错误处理和监控

**准备继续学习 Phase 2**：播放进度缓存
- 更复杂的 Hash 操作
- Pipeline 批量处理
- 缓存与数据库协同

---

**加油！你正在成为 Redis 高手！** 🚀
