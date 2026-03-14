# Redis 集成指南

## ✅ Phase 1 完成 - 目录缓存 Redis 化

### 已实现功能

1. **Redis 客户端封装** (`src/utils/redis.ts`)
   - 自动连接 Redis 服务器
   - 支持环境变量配置
   - 智能重连策略
   - 连接状态监控

2. **混合缓存系统** (`src/utils/cache.ts`)
   - 优先使用 Redis 缓存
   - Redis 不可用时自动降级到内存缓存
   - LRU（最近最少使用）淘汰策略
   - TTL 过期时间控制

3. **配置增强**
   - Redis 配置项添加到 `config/index.ts`
   - 提供 `.env.example` 示例文件
   - 支持灵活的 Redis 部署方案

4. **监控接口**
   - `GET /api/redis/status` - 检查 Redis 状态
   - `GET /api/redis/test` - 测试 Redis 读写

5. **一键启动集成**
   - 主启动脚本 `start.sh` 已集成 Redis 检查
   - 自动检测并启动 Redis 服务
   - 优雅降级提示

### 使用方法

#### 方式 1：使用主启动脚本（推荐）✨

```bash
# 在项目根目录执行
./start.sh
```

脚本会自动：
- ✅ 检查 Node.js 环境
- ✅ 检查依赖安装
- ✅ **检查 Redis 服务状态**
- ✅ 询问是否启动 Redis（如果未运行）
- ✅ 创建 `.env` 配置文件（如果不存在）
- ✅ 启动前后端开发服务器

#### 方式 2：单独启动 Redis + 应用

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
npm run dev
```

**Docker:**
```bash
docker run -d \
  --name privanest-redis \
  -p 6379:6379 \
  redis:latest --appendonly yes
npm run dev
```

**Linux (Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
npm run dev
```

#### 方式 3：无 Redis 模式（自动降级）

如果不想安装 Redis，直接运行即可：
```bash
./start.sh
# 或
npm run dev
```

系统会检测到 Redis 不可用，自动切换到内存缓存模式。

### 配置环境变量

复制示例配置文件：
```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，设置 Redis 连接参数：
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-password  # 如果有密码
REDIS_DB=0
```

### 测试 Redis 功能

访问以下接口测试：
```bash
# 查看 Redis 状态
curl http://localhost:4000/api/redis/status

# 测试 Redis 读写
curl http://localhost:4000/api/redis/test
```

或者运行测试脚本：
```bash
cd backend
npm run test:redis
```

### 缓存键命名规范

采用 `模块名：功能名：ID` 的格式：

- `dircache:0:/photos/2024` - 目录缓存
- `test:*` - 测试数据

### 性能对比

| 场景 | 内存缓存 | Redis 缓存 | 提升 |
|------|---------|-----------|------|
| 首次访问 | ~500ms | ~500ms | - |
| 缓存命中 | ~5ms | ~8ms | 相当 |
| 多实例共享 | ❌ 不支持 | ✅ 支持 | - |
| 持久化 | ❌ 重启丢失 | ✅ 持久化 | - |

### 降级机制

当 Redis 不可用时，系统会自动降级到内存缓存：

```
[请求] → 尝试 Redis → 失败 → 使用内存缓存 → 返回结果
              ↓                        ↑
          记录错误日志                无缝切换
```

### 监控与维护

#### 查看缓存使用情况
```bash
# 通过 API 查看
curl http://localhost:4000/api/redis/status

# 或直接连接 Redis CLI
redis-cli
> KEYS dircache:*
> DBSIZE
```

#### 清空缓存
```typescript
import { dirCache } from './utils/cache.js'

// 清空所有缓存
await dirCache.clear()

// 删除特定缓存
await dirCache.delete('0:/photos/2024')
```

### 故障排查

#### Redis 连接失败
```
❌ Redis 错误：connect ECONNREFUSED 127.0.0.1:6379
```

**解决方案：**
1. 确认 Redis 服务已启动：`redis-cli ping`
2. 检查 `.env` 中的 `REDIS_HOST` 和 `REDIS_PORT` 配置
3. 防火墙是否阻止 6379 端口

#### 缓存未命中率高
```bash
# 查看 Redis 中的缓存键
redis-cli KEYS dircache:*

# 查看缓存大小
redis-cli DBSIZE
```

### 下一步计划

- [ ] Phase 2: 播放进度缓存
- [ ] Phase 3: API 限流器
- [ ] Phase 4: 任务队列（视频转码）
- [ ] Phase 5: WebSocket 实时通知

## 📚 学习资源

- [Redis 官方文档](https://redis.io/documentation)
- [ioredis GitHub](https://github.com/luin/ioredis)
- [Redis 数据类型详解](https://redis.io/topics/data-types-intro)
