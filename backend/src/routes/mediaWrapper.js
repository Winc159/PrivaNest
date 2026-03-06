import { upload } from './middlewares/upload.js'

export const mediaRoutes = async (ctx, next) => {
  // 处理文件上传
  if (ctx.path === '/media/upload' || ctx.path === '/api/media/upload') {
    return upload.single('file')(ctx, next)
  }
  await next()
}
