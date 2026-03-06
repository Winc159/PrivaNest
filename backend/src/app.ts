import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import router from './routes/index.js'
import { config } from './config/index.js'

const app: Koa = new Koa()

// 中间件
app.use(cors()) // 跨域支持
app.use(bodyParser()) // 请求体解析

// 路由
app.use(router.routes())
app.use(router.allowedMethods())

// 错误处理
app.use(async (ctx, next) => {
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

// 启动服务器
app.listen(config.port, () => {
  console.log(`🎬 PrivaNest Server running at http://localhost:${config.port}`)
  console.log(`📁 开发模式：http://localhost:3000 (前端代理)`)
})
