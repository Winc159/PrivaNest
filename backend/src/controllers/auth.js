import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

// 模拟用户数据库（后续替换为真实数据库）
const users = new Map()

export const authController = {
  // 注册
  async register(ctx) {
    const { username, password } = ctx.request.body
    
    if (!username || !password) {
      ctx.status = 400
      ctx.body = { message: '用户名和密码不能为空' }
      return
    }
    
    // 检查用户是否已存在
    if (users.has(username)) {
      ctx.status = 400
      ctx.body = { message: '用户名已存在' }
      return
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // 保存用户
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      createdAt: new Date()
    }
    
    users.set(username, user)
    
    ctx.body = {
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username
      }
    }
  },
  
  // 登录
  async login(ctx) {
    const { username, password } = ctx.request.body
    
    // 查找用户
    const user = users.get(username)
    if (!user) {
      ctx.status = 401
      ctx.body = { message: '用户名或密码错误' }
      return
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      ctx.status = 401
      ctx.body = { message: '用户名或密码错误' }
      return
    }
    
    // 生成 Token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: '7d' }
    )
    
    ctx.body = {
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    }
  },
  
  // 获取个人信息
  async getProfile(ctx) {
    const user = users.get(ctx.state.user.username)
    if (!user) {
      ctx.status = 404
      ctx.body = { message: '用户不存在' }
      return
    }
    
    ctx.body = {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    }
  },
  
  // 更新个人信息
  async updateProfile(ctx) {
    const { username } = ctx.state.user
    const updates = ctx.request.body
    
    const user = users.get(username)
    if (!user) {
      ctx.status = 404
      ctx.body = { message: '用户不存在' }
      return
    }
    
    Object.assign(user, updates)
    users.set(username, user)
    
    ctx.body = {
      message: '更新成功',
      user: {
        id: user.id,
        username: user.username
      }
    }
  }
}
