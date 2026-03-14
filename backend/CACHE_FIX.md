# Redis 缓存数据验证修复

## 🐛 问题描述

### 错误信息
```
TypeError: Cannot read properties of undefined (reading 'length')
    at getFolders (/Users/winc/project/PrivaNest/backend/src/controllers/library.controller.ts:159:32)
```

### 根本原因
当 Redis 或内存缓存返回的数据格式不正确时（如 `undefined`、`null` 或结构不完整），后续代码尝试访问 `files.length` 或 `folders.length` 时会抛出异常。

**具体场景：**
1. Redis 中存储了损坏的 JSON 数据
2. 缓存数据过期但未被正确清理
3. 写入缓存时数据格式验证不严格
4. 从缓存读取后未进行有效性检查就直接使用

---

## ✅ 解决方案

### 1. 增强缓存读取验证 (`src/utils/cache.ts`)

#### Redis 数据验证
```typescript
if (data) {
  const parsed = JSON.parse(data)
  
  // 检查是否过期
  if (parsed.ttl && Date.now() > parsed.ttl) {
    await this.delete(key)
    return null
  }
  
  // ✅ 新增：验证数据结构有效性
  if (parsed.data && (Array.isArray(parsed.data.folders) || Array.isArray(parsed.data.files))) {
    return parsed.data
  } else {
    console.warn(`[缓存数据格式错误] ${key}:`, parsed)
    // 删除无效缓存
    await this.delete(key)
    return null
  }
}
```

#### 内存缓存验证
```typescript
const memoryData = memoryCache.get(key)
if (memoryData) {
  // ✅ 新增：验证内存缓存数据有效性
  if (memoryData && (Array.isArray(memoryData.folders) || Array.isArray(memoryData.files))) {
    console.log(`[缓存命中] Memory: ${key}`)
    return memoryData
  } else {
    console.warn(`[内存缓存数据无效] ${key}:`, memoryData)
    // 删除无效缓存
    memoryCache.delete(key)
  }
}
```

### 2. 增强缓存写入验证 (`src/utils/cache.ts`)

```typescript
async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  // ✅ 新增：验证数据结构有效性
  if (!value || (!Array.isArray(value.folders) && !Array.isArray(value.files))) {
    console.warn(`[拒绝写入无效缓存] ${key}:`, value)
    return
  }
  
  const cacheEntry = {
    data: value,
    timestamp: Date.now(),
    ttl: Date.now() + (ttlSeconds * 1000)
  }
  
  // 写入 Redis 和内存缓存...
}
```

### 3. 增强控制器缓存使用 (`src/controllers/library.controller.ts`)

```typescript
let cachedData = null
if (useCache) {
  cachedData = await dirCache.get(cacheKey)
}

let folders: any[] = []
let files: any[] = []
let fromCache = false

if (cachedData) {
  // ✅ 新增：增加数据有效性验证
  folders = Array.isArray(cachedData.folders) ? cachedData.folders : []
  files = Array.isArray(cachedData.files) ? cachedData.files : []
  fromCache = true
  
  // 如果缓存数据无效，重新读取目录
  if (folders.length === 0 && files.length === 0) {
    fromCache = false
    cachedData = null
  } else {
    console.log(`[使用缓存数据] 文件夹：${folders.length}个，文件：${files.length}个`)
  }
}
```

---

## 🔍 防御性编程策略

### 三层防护机制

1. **写入层防护**
   - ✅ 验证数据结构必须包含 `folders` 或 `files` 数组
   - ✅ 拒绝写入无效数据到缓存
   - ✅ 记录警告日志便于调试

2. **读取层防护**
   - ✅ 验证 Redis 数据的 JSON 结构和字段完整性
   - ✅ 验证内存缓存数据的有效性
   - ✅ 自动删除格式错误的缓存数据

3. **使用层防护**
   - ✅ 对缓存返回数据进行类型检查（`Array.isArray()`）
   - ✅ 提供默认值（空数组）防止 `undefined`
   - ✅ 数据无效时自动降级到文件系统读取

---

## 📊 影响范围

### 修改的文件
- ✅ `backend/src/utils/cache.ts` - 混合缓存系统
- ✅ `backend/src/controllers/library.controller.ts` - 媒体库控制器

### 保持兼容
- ✅ 导出名称保持不变（`LRUCache` 别名）
- ✅ API 接口签名未变更
- ✅ 现有功能逻辑不受影响

---

## 🧪 测试验证

### 正常场景
```bash
# 启动应用
./start.sh

# 访问媒体库
curl http://localhost:4000/api/media/folders?path=/&library=0&page=1&pageSize=100
```

**预期输出：**
```
[缓存未命中]: 0:/
[缓存写入] Redis: 0:/ (TTL: 300s)
[使用缓存数据] 文件夹：5 个，文件：10 个
```

### 异常场景测试

#### 1. Redis 数据损坏
```bash
# 手动写入错误数据
redis-cli SET "dircache:test" "invalid-json"

# 应用会自动检测到并删除
[缓存数据格式错误] test: ...
```

#### 2. 空数据缓存
```bash
# 应该被拒绝写入
[拒绝写入无效缓存] test-key: {}
```

#### 3. 部分字段缺失
```bash
# 只有 folders 没有 files（允许）
{ folders: [...] } ✅

# 只有 files 没有 folders（允许）
{ files: [...] } ✅

# 两个都没有（拒绝）
{} ❌
```

---

## 🎯 最佳实践总结

### ✅ 推荐做法
1. **始终验证外部数据**
   - 永远不要信任缓存、数据库或 API 返回的数据
   - 使用 `Array.isArray()`、类型检查等防御手段

2. **快速失败 + 优雅降级**
   - 检测到无效数据时立即删除
   - 提供降级方案（如重新读取文件系统）

3. **详细的日志记录**
   - 记录所有异常情况
   - 包含足够的上下文信息（键名、数据结构等）

4. **数据完整性保护**
   - 写入前验证
   - 读取后验证
   - 定期清理过期数据

### ❌ 避免做法
1. **直接使用缓存数据不加验证**
   ```typescript
   // ❌ 危险
   const folders = cachedData.folders
   
   // ✅ 安全
   const folders = Array.isArray(cachedData?.folders) ? cachedData.folders : []
   ```

2. **假设数据永远正确**
   ```typescript
   // ❌ 危险
   files.length // 可能抛出异常
   
   // ✅ 安全
   const safeFiles = Array.isArray(files) ? files : []
   safeFiles.length
   ```

3. **静默失败**
   ```typescript
   // ❌ 危险 - 不记录错误
   if (!isValid) return null
   
   // ✅ 安全 - 记录日志
   if (!isValid) {
     console.warn(`[缓存无效] key=${key}`, data)
     return null
   }
   ```

---

## 📝 后续优化建议

1. **添加缓存健康检查接口**
   ```typescript
   router.get('/cache/health', async (ctx) => {
     const stats = dirCache.getStats()
     ctx.body = {
       healthy: stats.redisConnected,
       size: stats.memoryCacheSize
     }
   })
   ```

2. **实现缓存预热**
   ```typescript
   // 应用启动时预加载常用目录
   await dirCache.set('0:/', { folders: [], files: [] }, 300)
   ```

3. **添加缓存监控**
   - 命中率统计
   - 平均响应时间
   - 无效数据频率

---

## ✅ 验证清单

- [x] TypeScript 编译通过
- [x] 无语法错误
- [x] 数据验证逻辑完整
- [x] 降级机制正常工作
- [x] 日志输出清晰
- [x] 向后兼容

---

**修复完成！** 🎉

现在缓存系统具有完整的防御机制，可以安全地处理各种异常情况。
