# PrivaNest 项目架构文档

## 🏗️ 技术架构

### 前端架构 (Vue 3 + TypeScript)
```
frontend/
├── src/
│   ├── api/                    # API 接口层 (.ts)
│   │   ├── request.ts         # Axios 封装 + JWT 拦截器
│   │   └── index.ts           # 统一导出所有 API
│   │
│   ├── components/            # 公共组件（可复用）
│   │   └── .gitkeep
│   │
│   ├── layouts/               # 布局组件
│   │   └── .gitkeep
│   │
│   ├── router/                # 路由配置 (.ts)
│   │   └── index.ts          # Vue Router + 路由守卫
│   │
│   ├── stores/                # Pinia 状态管理 (.ts)
│   │   ├── user.ts           # 用户状态（登录、信息）
│   │   └── media.ts          # 媒体库状态（路径、文件列表）
│   │
│   ├── styles/                # 全局样式
│   │   └── global.scss       # 样式重置 + 通用样式
│   │
│   ├── utils/                 # 工具函数
│   │   └── .gitkeep
│   │
│   ├── views/                 # 页面级组件 (.vue)
│   │   ├── Login.vue         # 登录页
│   │   ├── Home.vue          # 首页仪表板
│   │   ├── Library.vue       # 媒体库浏览
│   │   ├── Player.vue        # 播放器
│   │   └── Settings.vue      # 设置页
│   │
│   ├── App.vue               # 根组件
│   └── main.ts               # 入口文件（插件注册）
│
├── vite.config.ts            # Vite 配置（自动导入、代理）
├── tsconfig.json             # TypeScript 配置
├── package.json              # 前端依赖
└── index.html                # HTML 模板
```

### 后端架构 (Koa + TypeScript)
```
backend/
├── src/
│   ├── config/               # 配置管理 (.ts)
│   │   └── index.ts         # 环境变量读取 + 默认值
│   │
│   ├── controllers/          # 控制器层（业务逻辑 .ts)
│   │   ├── auth.ts          # 认证控制器（注册、登录）
│   │   └── media.ts         # 媒体控制器（CRUD、搜索）
│   │
│   ├── middlewares/          # 中间件 (.ts)
│   │   ├── auth.ts          # JWT 认证中间件
│   │   └── upload.ts        # Multer 文件上传
│   │
│   ├── models/               # 数据模型（待实现）
│   │   └── .gitkeep
│   │
│   ├── routes/               # 路由定义 (.ts)
│   │   ├── index.ts         # 路由总入口
│   │   ├── auth.ts          # 认证路由
│   │   ├── media.ts         # 媒体路由
│   │   └── mediaWrapper.ts  # 文件上传包装器
│   │
│   ├── services/             # 服务层（复杂业务）
│   │   └── .gitkeep
│   │
│   ├── utils/                # 工具函数
│   │   └── .gitkeep
│   │
│   └── app.ts               # Koa 应用入口
│
├── storage/                  # 存储目录
│   ├── uploads/             # 临时上传目录
│   ├── videos/              # 视频文件
│   └── covers/              # 封面图片
│
├── .env                      # 环境变量配置
├── .env.example             # 环境变量示例
├── tsconfig.json            # TypeScript 配置
└── package.json             # 后端依赖
```

## 🔄 数据流

### 1. 用户认证流程
```
用户登录 → POST /api/auth/login 
       → 验证用户名密码 
       → 生成 JWT Token 
       → 返回 Token 和用户信息
       
前端存储 Token → 后续请求携带 Token 
             → 后端验证 Token 
             → 返回受保护资源
```

### 2. 媒体库浏览流程
```
用户访问 Library 页面 
→ GET /api/media/folders?path=/&library=0 
→ 后端读取配置的媒体路径 
→ 扫描目录内容（过滤视频和图片） 
→ 返回文件夹和文件列表 
→ 前端渲染网格/列表视图
```

### 3. 文件上传流程
```
用户选择文件 
→ POST /api/media/upload (multipart/form-data) 
→ Multer 中间件处理 
→ 保存到指定目录 
→ 返回文件信息
```

## 📊 TypeScript 类型定义

### 前端核心类型

```typescript
// 用户信息
export interface UserInfo {
  id: string
  username: string
  createdAt?: string
}

// 媒体文件
export interface MediaFile {
  id: string
  name: string
  path: string
  size?: string
  type: 'video' | 'image' | 'folder'
  ext?: string
  library?: number
}

// API 响应
export interface AuthResponse {
  message: string
  token: string
  user: UserInfo
}
```

### 后端核心类型

```typescript
// JWT Payload
interface JwtPayload {
  id: string
  username: string
}

// Koa Context 扩展
interface Context {
  state: {
    user: JwtPayload
  }
}
```

## 🔐 安全机制

### JWT 认证
- Token 有效期：7 天
- 存储方式：localStorage
- 请求头格式：`Authorization: Bearer <token>`

### 路径安全
- 验证请求路径是否在允许的媒体库范围内
- 防止目录穿越攻击（`../../../`）

### CORS 跨域
- 开发环境：允许前端代理
- 生产环境：通过 Nginx 反向代理

## 🎯 核心功能模块

### 已实现 ✅
1. **用户系统**
   - 登录/注册（基于内存 Map）
   - JWT Token 认证
   - 路由守卫

2. **媒体库**
   - 多库切换支持
   - 文件夹层级浏览
   - 文件列表展示
   - 面包屑导航

3. **基础 UI**
   - Element Plus 组件集成
   - 响应式布局
   - 网格/列表视图切换

4. **TypeScript 支持**
   - 完整类型定义
   - 严格模式检查
   - 自动类型推断

5. **一键启动**
   - 并发启动前后端
   - 自动安装依赖
   - 配置文件生成

### 开发中 🚧
1. **播放器**
   - 自定义控件 UI
   - 播放进度记忆
   - 字幕加载

2. **搜索功能**
   - 实时搜索建议
   - 高级筛选

3. **封面管理**
   - 手动上传封面
   - 自动生成缩略图

## 📈 性能优化点

### 前端
- Vite 快速构建 + HMR
- 路由懒加载
- 组件按需引入（Auto Import）
- 虚拟列表（待实现）
- 图片懒加载（待实现）

### 后端
- Koa 轻量级框架
- 异步文件 I/O
- 目录内容缓存（待实现）

## 🚀 部署方案

### 开发环境
```bash
# 一键启动（主目录）
./start.sh
# 或
npm run dev

# 后端：http://localhost:4000
# 前端：http://localhost:3000 (代理到后端)
```

### 生产环境
1. **单体部署**：Nginx 静态文件 + API 反向代理
2. **分离部署**：前端 CDN + 后端 API 服务器
3. **容器化**：Docker Compose 一键部署

详见：[DEPLOYMENT.md](./DEPLOYMENT.md)

## 📝 API 接口清单

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/users/profile` - 获取个人信息
- `PUT /api/users/profile` - 更新个人信息

### 媒体库相关
- `GET /api/media/libraries` - 获取已配置的媒体库
- `POST /api/media/library` - 添加新媒体库路径
- `GET /api/media/folders?path=&library=` - 获取文件夹列表
- `DELETE /api/media/file` - 删除文件
- `PUT /api/media/:id/meta` - 更新元数据
- `GET /api/media/search?q=` - 搜索

### 文件上传
- `POST /api/media/upload` - 上传封面

### 系统健康
- `GET /api/health` - 健康检查

## 🎓 Vue 3 + TypeScript 学习路线

通过本项目，你将掌握：

1. **Composition API** - 现代 Vue 开发方式
2. **TypeScript 类型系统** - 接口、泛型、类型推断
3. **Pinia 状态管理** - 比 Vuex 更简洁的解决方案
4. **Vue Router 4** - 单页应用路由
5. **组件化思维** - 可复用组件设计
6. **响应式原理** - ref、reactive、computed、watch
7. **生命周期** - onMounted、onUpdated 等
8. **自定义指令** - 实践应用
9. **工程化** - Vite、ESLint、TypeScript 配置

---

## 💡 快速启动命令

```bash
# 一键启动开发模式（同时启动前后端）
cd PrivaNest
./start.sh

# 或者
npm install
npm run dev
```
