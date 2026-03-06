import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

interface JwtPayload {
  id: string
  username: string
}

// JWT 认证中间件
export const authMiddleware = async (ctx: any, next: any) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    ctx.status = 401
    ctx.body = { message: '未授权，请先登录' }
    return
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload
    ctx.state.user = decoded
    await next()
  } catch (error: any) {
    ctx.status = 401
    ctx.body = { message: 'Token 无效或已过期' }
  }
}
