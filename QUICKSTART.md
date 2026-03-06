# PrivaNest - 快速开始指南

## 🎯 项目定位

PrivaNest 是一个**轻量级私人影院 Web 应用**，专为学习 Vue 3 + TypeScript 而设计，采用简洁的文件式管理理念，避免复杂的元数据刮削。

## ✨ 核心特色

1. **Vue 3 + TypeScript** - 完整的类型安全，更好的开发体验
2. **Naive UI** - 完全使用 TypeScript 编写，现代简洁的组件库
3. **学习友好** - 涵盖 Composition API、Pinia、Router 等核心技术
4. **简洁直观** - 像文件系统一样浏览媒体，无复杂操作
5. **自定义路径** - 支持配置任意文件夹作为媒体库
6. **前后端分离** - 现代化的技术栈和架构设计

## 🚀 5 分钟快速启动

### 方式一：一键启动（推荐！）

```bash
cd PrivaNest
./start.sh
```

脚本会自动：
- ✅ 检查 Node.js 环境
- ✅ 安装前后端依赖
- ✅ 创建 .env 配置文件
- ✅ **同时启动前后端开发服务器** ← 一个终端搞定！

### 方式二：手动安装

```bash
# 1. 安装根目录依赖（用于并发启动）
npm install

# 2. 安装后端依赖
cd backend
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，修改 MEDIA_PATHS 为你的媒体文件夹路径

# 4. 安装前端依赖
cd ../frontend
npm install
```

## 📝 配置说明

### 必须配置：媒体库路径

编辑 `backend/.env`：

```bash
# 将路径改为你实际的媒体文件夹
MEDIA_PATHS=/Volumes/MyMovies,/Volumes/MySeries

# 或者单个目录
MEDIA_PATHS=/data/media
```

**支持的格式**：
- macOS: `/Volumes/ExternalDrive/Movies`
- Linux: `/mnt/data/movies`, `/media/user/Media`
- Windows (WSL): `/mnt/d/Media`

### 可选配置

```bash
# JWT 密钥（生产环境务必修改）
JWT_SECRET=your-random-secret-key

# 服务端口
PORT=4000
```

## ▶️ 启动方式

### 🎉 推荐：一键启动开发模式

在**主目录**运行：

```bash
./start.sh
```

或安装依赖后：

```bash
npm run dev
```

这会自动同时启动：
- 后端：http://localhost:4000
- 前端：http://localhost:3000

### 分开启动（可选）

```bash
# 只启动后端
cd backend
npm run dev

# 只启动前端
cd frontend
npm run dev
```

## 🌐 访问应用

打开浏览器访问：**http://localhost:3000**

### 默认账号
- 首次使用需要注册
- 注册后自动登录

## 📁 项目结构一览

```
PrivaNest/
├── frontend/           # Vue 3 + TypeScript + Naive UI
│   ├── src/
│   │   ├── views/     # 页面组件（.vue）
│   │   ├── stores/    # Pinia 状态管理（.ts）
│   │   ├── router/    # 路由配置（.ts）
│   │   └── api/       # API 接口（.ts）
│   └── package.json
│
├── backend/            # Koa + TypeScript 后端项目
│   ├── src/
│   │   ├── controllers/  # 业务逻辑（.ts）
│   │   ├── routes/       # 路由定义（.ts）
│   │   └── middlewares/  # 中间件（.ts）
│   ├── .env             # ⚠️ 重要：配置文件
│   └── package.json
│
├── start.sh            # 🚀 一键启动脚本
├── package.json        # 根目录配置（包含 dev 命令）
├── README.md            # 详细说明文档
├── DEPLOYMENT.md        # 部署指南
├── ARCHITECTURE.md      # 架构文档
└── QUICKSTART.md        # 本文件
```

## 🎓 学习路线

### 第一阶段：基础功能（1-2 周）
- [x] 项目搭建（TypeScript 版本）
- [ ] 用户登录/注册
- [ ] 媒体库浏览
- [ ] 文件上传

### 第二阶段：核心功能（2-3 周）
- [ ] 自定义播放器
- [ ] 封面墙展示
- [ ] 搜索功能
- [ ] 播放进度记忆

### 第三阶段：进阶优化（1-2 周）
- [ ] 主题切换
- [ ] 性能优化（虚拟列表、懒加载）
- [ ] 响应式设计
- [ ] PWA 支持

## 🔧 常用命令

```bash
# 安装所有依赖
npm run install:all

# 🚀 一键启动开发模式（同时启动前后端）
npm run dev
# 或
./start.sh

# 单独启动
npm run dev:backend   # 只启动后端
npm run dev:frontend  # 只启动前端

# 构建
npm run build:frontend  # 构建前端
npm run build:backend   # 构建后端到 dist 目录
```

## 🆘 常见问题

### Q: 找不到媒体文件？
A: 检查 `.env` 中的 `MEDIA_PATHS` 路径是否正确，确保有读取权限

### Q: 跨域错误？
A: 确保前端代理配置正确，或使用 Nginx 反向代理

### Q: 上传失败？
A: 检查 `storage/` 目录权限，或文件大小是否超限

### Q: 如何停止服务？
A: 在终端按 `Ctrl+C`

### Q: TypeScript 报错？
A: 运行 `npm run typecheck` 检查类型错误

## 📚 文档导航

- [README.md](./README.md) - 项目介绍和详细说明
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 服务器部署指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 技术架构文档
- [QUICKSTART.md](./QUICKSTART.md) - 本文件

## 🎉 下一步

1. ✅ 完成项目搭建 ← **你在这里**
2. 📝 配置媒体库路径
3. ▶️ 一键启动开发服务器 (`./start.sh`)
4. 🎨 开始学习和开发！

---

**祝你学习愉快！** 🚀

如有问题，请查看文档或提 Issue。
