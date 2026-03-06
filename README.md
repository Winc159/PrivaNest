# PrivaNest - 私人影院 Web 应用

一个基于 **Vue 3 + TypeScript** + **Koa** 构建的轻量级私人影院系统，主打简洁直观的文件式管理体验。

## 🎯 项目特色

- **简洁至上**：避免复杂的元数据刮削，像文件系统一样直观
- **Vue 3 + TS 学习友好**：涵盖 Composition API、Pinia、Router、TypeScript 类型系统
- **Naive UI**：完全使用 TypeScript 编写，现代简洁的 UI 组件库
- **双模式浏览**：文件树 + 封面墙两种查看方式
- **轻量快速**：Koa 框架 + Vite 构建，开发体验流畅
- **一键启动**：支持在主目录直接运行 `npm run dev` 同时启动前后端

## 📦 技术栈

### 前端
- **Vue 3** (Composition API + `<script setup>`)
- **TypeScript** (完整类型支持)
- **Vite** 构建工具
- **Vue Router** 路由管理
- **Pinia** 状态管理
- **Naive UI** UI 组件库（完全 TypeScript 编写）
- **Axios** HTTP 客户端

### 后端
- **Node.js** + **Koa** 框架
- **TypeScript** 类型安全
- **JWT** 身份认证
- **Multer** 文件上传
- **SQLite**（可选）数据存储

## 🚀 快速开始

### 一键启动开发模式（推荐！）

```bash
cd PrivaNest
./start.sh
```

或安装依赖后：

```bash
npm install
npm run dev
```

这会自动同时启动前后端服务器！

访问 http://localhost:3000

### 手动配置

详见：[QUICKSTART.md](./QUICKSTART.md)

## 📁 项目结构

```
PrivaNest/
├── frontend/              # 前端项目 (Vue 3 + TS + Naive UI)
│   ├── src/
│   │   ├── api/          # API 接口 (.ts)
│   │   ├── components/   # 公共组件 (.vue)
│   │   ├── layouts/      # 布局组件
│   │   ├── router/       # 路由配置 (.ts)
│   │   ├── stores/       # Pinia 状态管理 (.ts)
│   │   ├── styles/       # 全局样式
│   │   ├── utils/        # 工具函数
│   │   ├── views/        # 页面组件 (.vue)
│   │   ├── App.vue       # 根组件
│   │   └── main.ts       # 入口文件
│   └── package.json
│
├── backend/               # 后端项目 (Koa + TS)
│   ├── src/
│   │   ├── config/       # 配置文件 (.ts)
│   │   ├── controllers/  # 控制器 (.ts)
│   │   ├── middlewares/  # 中间件 (.ts)
│   │   ├── models/       # 数据模型
│   │   ├── routes/       # 路由 (.ts)
│   │   ├── services/     # 服务层
│   │   ├── utils/        # 工具函数
│   │   └── app.ts        # 应用入口
│   ├── storage/          # 文件存储
│   └── package.json
│
├── start.sh              # 🚀 一键启动脚本
├── package.json          # 根目录配置
└── README.md
```

## 🔧 核心功能

### 已实现
- ✅ 用户登录/注册（JWT 认证）
- ✅ 首页仪表板
- ✅ 媒体库文件浏览
- ✅ 文件上传功能
- ✅ 基础播放器
- ✅ 设置页面
- ✅ TypeScript 完整支持
- ✅ 一键启动开发模式
- ✅ Naive UI 集成

### 开发中
- 🔄 自定义播放器控件
- 🔄 封面墙展示
- 🔄 搜索功能
- 🔄 播放进度记忆

## 📝 API 接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/users/profile` - 获取个人信息
- `PUT /api/users/profile` - 更新个人信息

### 媒体库
- `GET /api/media/folders?path=/` - 获取文件夹列表
- `GET /api/media/libraries` - 获取已配置的媒体库
- `POST /api/media/library` - 添加新媒体库路径
- `POST /api/media/upload` - 上传文件
- `DELETE /api/media/file` - 删除文件
- `PUT /api/media/:id/meta` - 更新元数据
- `GET /api/media/search?q=` - 搜索

## 🎨 Naive UI 特性

### 为什么选择 Naive UI？

| 特性 | 说明 |
|------|------|
| 📘 **TypeScript** | 完全使用 TypeScript 编写，类型支持完善 |
| 🎨 **现代化设计** | 简洁优雅的视觉风格 |
| 🚀 **高性能** | 按需加载，体积小巧 |
| 🔧 **易定制** | 提供完整主题配置系统 |
| 📦 **丰富组件** | 80+ 高质量组件 |

### 常用组件示例

```vue
<script setup>
import { ref } from 'vue'
import { NButton, NInput, NCard } from 'naive-ui'

const count = ref(0)
</script>

<template>
  <n-card title="计数器">
    <n-input v-model:value="count" />
    <n-button type="primary" @click="count++">
      点击
    </n-button>
  </n-card>
</template>
```

### 主题定制

```typescript
// 自定义主题配置
const themeOverrides = {
  common: {
    primaryColor: '#667eea',
    primaryColorHover: '#5a6fd6',
  },
}
```

## 🎓 学习计划

通过本项目，你可以学习到：

1. **Vue 3 Composition API** 的实际应用
2. **TypeScript** 在 Vue 项目中的最佳实践
3. **Naive UI** 组件库的使用
4. **Pinia 状态管理** 的设计模式
5. **Vue Router** 的路由守卫和懒加载
6. **Koa 中间件** 机制
7. **JWT 认证** 完整流程
8. **文件上传** 处理
9. **前后端分离** 架构设计
10. **一键启动** 的开发工作流

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License
