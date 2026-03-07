import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import router from './routes/index.js'
import { config } from './config/index.js'
import { initDatabase } from './database/index.js'

const app: Koa = new Koa()
app.proxy = true;

// 初始化数据库
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})

// 错误处理
app.use(async (ctx: Koa.Context, next: () => Promise<any>) => {
  try {
    await next()
  } catch (error: any) {
    console.error('Error:', error)
    ctx.status = error.status || 500
    ctx.body = {
      message: error.message || '服务器内部错误',
      status: ctx.status
    }
  }
})

// 请求日志中间件（开发环境启用）
if (process.env.NODE_ENV !== 'production') {
  app.use(async (ctx: Koa.Context, next: () => Promise<any>) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    
    // 只打印 API 请求，过滤静态资源和健康检查
    if (ctx.path.startsWith('/api') && ctx.path !== '/api/health') {
      const method = ctx.method.padEnd(6)
      const status = ctx.status.toString().padEnd(3)
      const path = ctx.path
      console.log(`[${new Date().toISOString()}] ${method} ${path} -> ${status} (${ms}ms)`)
    }
  })
}

// 中间件
app.use(cors()) // 跨域支持
app.use(bodyParser()) // 请求体解析

// 路由处理
app.use(router.routes())

// 允许的 HTTP 方法
if (router.allowedMethods) {
  app.use(router.allowedMethods())
}



// 启动服务器
app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`)
})
