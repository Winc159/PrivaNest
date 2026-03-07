# 后端请求日志功能

## 📝 功能说明

在开发环境下，后端会自动记录所有前端 API 请求的详细信息，方便调试。

## 🎯 日志格式

```log
[ISO 时间戳] METHOD   PATH -> STATUS (响应时间 ms)
```

## 📊 示例输出

```log
Server running at http://localhost:3000
[2024-01-15T10:30:45.123Z] GET    /api/media/folders?path=/photos&library=0 -> 200 (45ms)
[2024-01-15T10:30:46.234Z] POST   /api/auth/login -> 200 (120ms)
[2024-01-15T10:30:47.345Z] GET    /api/media/folders?path=/videos -> 200 (38ms)
[2024-01-15T10:30:48.456Z] DELETE /api/media/file -> 204 (15ms)
```

## 🔧 日志包含的信息

1. **时间戳** - ISO 格式的精确时间
2. **HTTP 方法** - GET, POST, PUT, DELETE 等
3. **请求路径** - 完整的 API 路径（包含查询参数）
4. **响应状态码** - HTTP 状态码
5. **响应时间** - 后端处理请求耗时（毫秒）

## 💡 使用场景

### 1. 调试前端请求

```bash
# 前端发起请求
await api.get('/media/folders', {
  params: { path: '/photos', library: 0 }
})

# 后端控制台立即显示
[2024-01-15T10:30:45.123Z] GET    /api/media/folders?path=/photos&library=0 -> 200 (45ms)
```

### 2. 排查性能问题

通过响应时间快速定位慢接口：

```log
[2024-01-15T10:30:45.123Z] GET    /api/media/folders?path=/large/dir -> 200 (2500ms)  # ⚠️ 慢
[2024-01-15T10:30:46.234Z] GET    /api/media/folders?path=/cached/dir -> 200 (5ms)    # ✅ 快
```

### 3. 监控错误请求

```log
[2024-01-15T10:30:45.123Z] GET    /api/media/folders?path=/invalid -> 403 (2ms)
[2024-01-15T10:30:46.234Z] POST   /api/auth/login -> 401 (50ms)
```

## ⚙️ 配置说明

### 启用/禁用

日志功能默认在**开发环境**启用，生产环境自动禁用：

```typescript
// 开发环境（NODE_ENV !== 'production'）
✅ 自动打印请求日志

// 生产环境（NODE_ENV === 'production'）
❌ 不打印日志（节省 I/O）
```

### 过滤规则

以下请求**不会**被打印：
- ❌ `/api/health` - 健康检查请求
- ❌ 非 `/api` 前缀的请求 - 静态资源等

## 🎨 日志颜色增强（可选）

如果需要彩色输出，可以安装 `chalk` 库并修改代码：

```bash
cd backend
pnpm add chalk
```

然后修改日志中间件：

```typescript
import chalk from 'chalk'

app.use(async (ctx: Koa.Context, next: () => Promise<any>) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  
  if (ctx.path.startsWith('/api') && ctx.path !== '/api/health') {
    const method = ctx.method.padEnd(6)
    const status = ctx.status.toString().padEnd(3)
    const path = ctx.path
    
    // 彩色输出
    console.log(
      `[${new Date().toISOString()}]`,
      chalk.blue(method),
      chalk.green(path),
      chalk.yellow('->'),
      status === '200' ? chalk.green(status) : chalk.red(status),
      chalk.gray(`(${ms}ms)`)
    )
  }
})
```

## 📈 与其他日志的配合

后端的完整日志包括：

1. **启动日志** - `Server running at http://localhost:3000`
2. **请求日志** - 本文档添加的功能
3. **错误日志** - 错误处理中间件捕获的异常
4. **数据库日志** - SQLite 操作相关日志（如果启用）

## 🔍 调试技巧

### 1. 查看完整请求参数

```log
GET /api/media/folders?path=/photos&page=2&pageSize=50 -> 200 (45ms)
# 可以看到所有查询参数
```

### 2. 识别失败原因

```log
POST /api/auth/login -> 401 (50ms)
# 认证失败，检查用户名密码

GET /api/media/folders?path=/forbidden -> 403 (2ms)
# 权限不足，检查路径权限
```

### 3. 性能优化参考

```log
# 第一次访问（未缓存）
GET /api/media/folders?path=/large -> 200 (1500ms)

# 第二次访问（命中缓存）
GET /api/media/folders?path=/large -> 200 (5ms)
# ✅ 缓存生效，性能提升 300 倍
```

## 🚀 实际效果

启动后端后，当前端访问时，后端控制台会实时显示：

```bash
$ cd backend
$ npm run dev

Server running at http://localhost:3000
[2024-01-15T10:30:45.123Z] GET    /api/media/folders?path=/&library=0 -> 200 (45ms)
[2024-01-15T10:30:46.234Z] GET    /api/media/libraries -> 200 (5ms)
[2024-01-15T10:30:47.345Z] GET    /api/media/folders?path=/movies&library=0 -> 200 (38ms)
[2024-01-15T10:30:48.456Z] POST   /api/media/upload -> 201 (250ms)
```

这样你就可以清楚地看到前端都在调用哪些接口，以及每个接口的性能表现！🎉
