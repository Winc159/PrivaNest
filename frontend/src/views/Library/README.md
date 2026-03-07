# Library 页面重构说明

## 📁 目录结构

```
frontend/src/
├── composables/
│   ├── useThumbnail.ts          # 缩略图生成逻辑
│   └── useFileNavigation.ts     # 文件导航逻辑
└── views/Library/
    ├── index.vue                # 主页面（2.7KB）
    └── components/
        ├── FileCard.vue         # 文件卡片组件
        ├── FileListView.vue     # 文件列表视图组件
        ├── LibraryHeader.vue    # 页面头部组件
        └── LibraryBreadcrumb.vue # 面包屑导航组件
```

## 🎯 重构目标

将原来 560+ 行、15KB 的单文件组件拆分为职责清晰的小型组件，提升可维护性和可读性。

## 📊 重构对比

### Before（旧 Library.vue）
- **代码量**: 564 行，15KB
- **职责**: 混合了业务逻辑、UI 渲染、事件处理
- **问题**: 难以定位问题、复用性差、测试困难

### After（新结构）
- **主页面**: 120 行，2.7KB（仅负责组合）
- **Composables**: 2 个，共 7.4KB（纯业务逻辑）
- **子组件**: 4 个，共 10.8KB（纯 UI 展示）
- **优势**: 职责清晰、易于测试、可复用性强

## 🔧 核心模块说明

### 1. Composables（业务逻辑层）

#### useThumbnail.ts
封装缩略图生成相关的所有逻辑：
- 图片/视频文件判断
- 文件大小解析
- 智能缩略图策略（小图直出、大图压缩）
- Canvas 缩略图生成
- IntersectionObserver 懒加载观察

**使用示例**:
```typescript
const { 
  getThumbnailUrl, 
  shouldGenerateThumbnail,
  generateThumbnail,
  observeCanvases 
} = useThumbnail({ maxWidth: 300, maxHeight: 200, quality: 0.8 })
```

#### useFileNavigation.ts
封装文件导航相关的所有逻辑：
- 媒体库管理
- 路径栈导航
- 目录切换
- 滚动加载更多
- 刷新缓存

**使用示例**:
```typescript
const {
  viewMode,
  pathStack,
  currentLibrary,
  navigateTo,
  goBack,
  handleLibraryChange
} = useFileNavigation()
```

### 2. UI Components（展示层）

#### FileCard.vue
通用的文件和文件夹卡片组件：
- 支持网格/列表两种模式
- 自动处理缩略图显示（Canvas/NImage/图标）
- 响应式点击事件

**Props**:
- `file`: 文件数据对象
- `isFolder`: 是否为文件夹
- `viewMode`: 'grid' | 'list'
- `thumbnailUrl`: 缩略图 URL
- `shouldGenerateThumbnail`: 是否需要生成缩略图

#### FileListView.vue
文件列表容器组件：
- 条件渲染网格/列表模式
- 空状态展示
- 加载状态管理
- 无限滚动提示

**职责**: 接收数据，分发事件，组合 FileCard 组件

#### LibraryHeader.vue
页面头部操作区：
- 媒体库选择器
- 导航按钮（首页、返回）
- 视图切换（网格/列表）
- 刷新和上传功能

**特点**: 纯展示组件，所有交互通过 emits 触发

#### LibraryBreadcrumb.vue
面包屑导航组件：
- 路径栈展示
- 可点击跳转
- 智能标签显示（根目录/文件夹名）

#### index.vue（主页面）
职责单一的组合层：
- 引入 composables
- 组装子组件
- 传递 props 和 events
- 协调全局状态

## 🎨 设计模式

### 1. Composition API + Composables
- 业务逻辑抽离为独立的 hooks
- 每个 hook 只关注单一职责
- 便于单元测试和复用

### 2. Smart/Dumb Components
- **Smart Components** (Composables): 包含业务逻辑
- **Dumb Components** (UI Components): 只负责展示
- 通过 props 和 emits 通信

### 3. 单一职责原则
每个组件/函数只做一件事：
- `FileCard`: 只负责单个卡片的展示
- `FileListView`: 只负责列表的渲染和状态
- `useThumbnail`: 只处理缩略图相关逻辑

## 🚀 使用方式

### 开发环境启动
```bash
npm run dev
```

### 访问 Library 页面
路由：`/library`

## 📝 后续优化建议

1. **添加虚拟滚动**: 在 `FileListView` 中实现虚拟滚动，优化大目录性能
2. **错误边界处理**: 为每个组件添加错误捕获机制
3. **骨架屏加载**: 替换简单的 loading 提示
4. **键盘导航**: 支持方向键浏览文件
5. **右键菜单**: 为文件卡片添加上下文菜单

## 🎓 学习要点

通过这个重构案例，可以学习到：
1. Vue 3 Composition API 的最佳实践
2. 如何将大型组件拆分为可维护的小组件
3. Composables 的设计和使用方法
4. Props down, Events up 的数据流模式
5. 单一职责原则在实际项目中的应用
