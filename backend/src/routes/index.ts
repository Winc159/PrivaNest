import Router from '@koa/router'
import authRoutes from './auth.js'
import mediaRoutes from './media.js'

// 使用 base 选项统一添加 /api 前缀
const router = new Router({
  prefix: '/api'
})

// 注册路由（会自动加上 /api 前缀）
router.use('/auth', authRoutes.routes())
router.use('/media', mediaRoutes.routes())
router.use('/stream', mediaRoutes.routes())
router.use('/progress', mediaRoutes.routes())
router.use('/subtitles', mediaRoutes.routes())

// 健康检查（实际路径为 /api/health）
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', message: 'PrivaNest API is running' }
})

export default router