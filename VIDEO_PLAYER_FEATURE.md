# 视频播放功能实现文档

## 📦 已安装依赖

- `video.js` - 强大的 HTML5 视频播放器
- `@videojs-player/vue` - Video.js 的 Vue 3 封装组件

## 🎯 功能特性

### 1. 核心功能
- ✅ 支持 MP4、WebM、OGG、AVI、MOV、WMV、MKV、FLV 等格式
- ✅ 响应式播放器，适配各种屏幕尺寸
- ✅ 自定义 UI 主题，深色影院风格
- ✅ 完整的播放控制（播放/暂停、音量、进度条、倍速、全屏）

### 2. 进度记忆
- ✅ 自动保存播放进度到 localStorage
- ✅ 24 小时内再次观看自动恢复进度
- ✅ 播放结束后自动清除进度
- ✅ 每 5 秒定期保存进度

### 3. 快捷键支持
- `空格` - 播放/暂停
- `←` - 快退 5 秒
- `→` - 快进 5 秒
- `↑` - 音量 +10%
- `↓` - 音量 -10%

### 4. 安全访问
- ✅ 后端路径验证，防止越权访问
- ✅ 流式传输，支持大文件播放
- ✅ 正确的 MIME 类型设置

## 🚀 使用方式

### 从文件列表跳转播放
在 Library 页面点击视频文件卡片，自动跳转到播放页面：
```typescript
router.push(`/player/${libraryIndex}${filePath}`)
```

### 直接访问播放页面
```
/player/0/Movies/example.mp4
```
- `0` - 媒体库索引（对应 config.mediaPaths[0]）
- `/Movies/example.mp4` - 相对于媒体库根目录的路径

## 📁 相关文件

### 前端
- **播放器组件**: `frontend/src/views/Player/index.vue`
- **路由配置**: `frontend/src/router/index.ts`
- **文件浏览**: `frontend/src/views/Library/index.vue`

### 后端
- **文件接口**: `backend/src/controllers/media.ts` (getFile 方法)
- **路由注册**: `backend/src/routes/media.ts` (`GET /api/media/file`)

## 🔧 API 接口

### 获取视频文件流
```http
GET /api/media/file?library=0&path=/Movies/example.mp4
```

**响应头**:
- `Content-Disposition`: inline; filename="example.mp4"
- `Content-Type`: video/mp4
- `Content-Length`: {文件大小}

**响应体**: 文件流（ReadableStream）

## 💾 数据存储

### 本地存储键名
```javascript
localStorage.setItem(
  `video-progress:${filePath}`, 
  JSON.stringify({
    path: filePath,
    library: libraryIndex,
    currentTime: 120.5,  // 当前播放时间（秒）
    duration: 3600.0,    // 总时长（秒）
    timestamp: Date.now()
  })
)
```

## 🎨 样式定制

### 修改播放器主题色
编辑 `frontend/src/views/Player/index.vue`:
```scss
.vjs-play-progress,
.vjs-volume-level {
  background: #007bff; // 修改为你喜欢的颜色
}
```

### 调整播放器比例
```typescript
const playerOptions = {
  aspectRatio: '16:9', // 可改为 '4:3', '21:9' 等
}
```

## 🔄 后续优化方向

### 1. 数据库持久化
- [ ] 使用 SQLite 存储播放历史
- [ ] 支持跨设备同步进度
- [ ] 添加收藏、观看记录功能

### 2. 高级功能
- [ ] 字幕加载与切换
- [ ] 多音轨支持
- [ ] 画质选择（自动/高清/标清）
- [ ] 截图功能
- [ ] 画中画模式

### 3. 性能优化
- [ ] 视频预加载策略
- [ ] 分段加载（HLS/DASH）
- [ ] CDN 加速

### 4. 用户体验
- [ ] 弹幕功能
- [ ] 倍速记忆
- [ ] 跳过片头片尾
- [ ] 自动连播下一集

## 🐛 常见问题

### Q: 视频无法播放？
A: 检查以下几点：
1. 确认视频格式是否支持（MP4/WebM 等）
2. 检查后端文件路径是否正确
3. 查看浏览器控制台网络请求状态码
4. 确认 CORS 配置（如果有）

### Q: 进度无法保存？
A: 
1. 检查 localStorage 是否被禁用
2. 确认播放时长超过 5 秒（触发保存条件）
3. 查看浏览器开发者工具 Application 标签页

### Q: 快捷键不生效？
A: 
1. 确保焦点不在输入框内
2. 检查是否有其他快捷键冲突
3. 确认播放器已完全加载

## 📝 开发笔记

### 关键技术点
1. **流式传输**: 使用 Node.js 的 `createReadStream` 避免一次性加载大文件
2. **MIME 类型**: 根据文件扩展名动态设置 Content-Type
3. **路径安全**: 验证文件路径是否在允许的媒体库范围内
4. **进度恢复**: 利用 localStorage 实现轻量级进度记忆

### 参考资源
- [Video.js 官方文档](https://docs.videojs.com/)
- [Vue Video Player](https://github.com/videojs-player/vue-video-player)
- [MDN: HTML5 Video](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/video)
