# macOS 相册风格智能布局

## 🎯 设计理念

借鉴 **macOS Photos** 应用的经典布局方式：
- **横拍图** → 横向展示（较宽）
- **竖拍图** → 竖向展示（较高）
- **正方形** → 标准方块
- **整体视觉统一** → 占用面积相近，整齐美观

---

## ✨ 核心特性

### 1. **智能方向检测**

```typescript
宽高比 = 宽度 / 高度

if (宽高比 > 1.2) {
  → landscape（横拍图）
} else if (宽高比 < 0.8) {
  → portrait（竖拍图）
} else {
  → square（正方形）
}
```

**阈值说明：**
- `> 1.2`: 横拍图（如 16:9=1.78, 4:3=1.33）
- `< 0.8`: 竖拍图（如 9:16=0.56, 3:4=0.75）
- `0.8-1.2`: 近似正方形（如 1:1=1.0）

---

### 2. **自适应容器比例**

| 类型 | CSS 类名 | 容器宽高比 | padding-top | 视觉效果 |
|------|---------|-----------|-------------|---------|
| **横拍图** | `.landscape` | 1.6 : 1 | 62.5% | 较宽扁 |
| **竖拍图** | `.portrait` | 0.75 : 1 | 133.33% | 较高挑 |
| **正方形** | `.square` | 1 : 1 | 100% | 标准方块 |

**实现原理：**
```scss
.media-wrapper {
  position: relative;
  width: 100%;
  
  // 通过 padding-top 控制高度（基于父元素宽度）
  &.landscape {
    padding-top: 62.5%; // 1/1.6
  }
  
  &.portrait {
    padding-top: 133.33%; // 1/0.75
  }
  
  &.square {
    padding-top: 100%; // 1/1
  }
}
```

---

### 3. **Masonry 网格布局**

使用 CSS Grid 的 `dense` 算法实现紧凑排列：

```scss
.masonry-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: 180px;     // 基础行高
  grid-auto-flow: dense;     // 关键：自动填充空隙
}
```

**工作原理：**
1. 定义最小列宽 180px，自动适应屏幕
2. 基础行高 180px（正方形尺寸）
3. `grid-auto-flow: dense` 自动将小项目填入空隙
4. 文件夹占据 `2×2` 大空间

---

### 4. **统一显示策略**

所有图片都使用 **`object-fit: contain`**：
- ✅ 完整显示图片内容
- ✅ 保持原始宽高比
- ✅ 不裁剪任何部分
- ✅ 在容器内居中显示

---

## 📊 视觉效果对比

### Before（统一正方形）

```
┌──────┬──────┬──────┐
│░░░░░░│▓▓▓▓▓▓│██████│ ← 所有都是 1:1
│░░░░░░│▓▓▓▓▓▓│██████│
│横拍  │竖拍  │正方形 │
│留白多│留白多│刚好   │
└──────┴──────┴──────┘
```

### After（智能自适应）

```
┌───────────┬──────┬──────┐
│░░░░░░░░░░░│▓▓▓▓│██████│ ← 横图宽
│  横拍图    │▓▓▓▓│      │
│           │▓▓▓▓│正方  │
├───────────┤▓▓▓▓│      │
│▒▒▒▒▒▒▒▒▒▒▒│▓▓▓▓├──────┤
│▒▒▒▒▒▒▒▒▒▒▒│    │📁    │ ← 文件夹 2×2
│  竖拍图    │    │      │
│▒▒▒▒▒▒▒▒▒▒▒│    │      │
└───────────┴──────┴──────┘
```

---

## 🎨 实际效果展示

### 横拍图 (16:9)

```
┌─────────────────┐
│                 │
│   ┌───────┐     │ ← 上下留白
│   │       │     │
│   │ 图片  │     │ ← 完整显示
│   │       │     │
│   └───────┘     │
│                 │
│    文件名       │
└─────────────────┘
容器比例：1.6 : 1（较宽）
```

### 竖拍图 (9:16)

```
┌─────────┐
│         │
│  ┌───┐  │
│  │   │  │
│  │   │  │
│  │图 │  │ ← 填满容器
│  │片 │  │
│  │   │  │
│  │   │  │
│  └───┘  │
│         │
│ 文件名  │
└─────────┘
容器比例：0.75 : 1（较高）
```

### 正方形图 (1:1)

```
┌─────────┐
│█████████│
│█████████│ ← 完美填满
│█████████│
│█████████│
│         │
│ 文件名  │
└─────────┘
容器比例：1 : 1
```

---

## 🔧 技术实现细节

### 1. **前端 NImage 组件（小图片）**

```typescript
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  
  if (img.naturalWidth && img.naturalHeight) {
    const aspectRatio = img.naturalWidth / img.naturalHeight
    
    if (aspectRatio > 1.2) {
      imageOrientation.value = 'landscape'
    } else if (aspectRatio < 0.8) {
      imageOrientation.value = 'portrait'
    } else {
      imageOrientation.value = 'square'
    }
  }
  imageLoaded.value = true
}
```

**关键点：**
- 监听 `@load` 事件获取真实尺寸
- 使用 `naturalWidth/naturalHeight`（非渲染尺寸）
- 动态绑定 CSS 类名 `:class="imageOrientation"`

---

### 2. **Canvas 缩略图（大图片）**

```typescript
const generateThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
  const img = new Image()
  await load(img, src)
  
  const aspectRatio = img.width / img.height
  
  // 设置方向标识
  if (aspectRatio > 1.2) {
    canvas.dataset.orientation = 'landscape'
  } else if (aspectRatio < 0.8) {
    canvas.dataset.orientation = 'portrait'
  } else {
    canvas.dataset.orientation = 'square'
  }
  
  // 绘制缩略图（统一正方形画布）
  canvas.width = 300
  canvas.height = 300
  
  const scale = Math.min(300 / img.width, 300 / img.height)
  const drawWidth = img.width * scale
  const drawHeight = img.height * scale
  const drawX = (300 - drawWidth) / 2
  const drawY = (300 - drawHeight) / 2
  
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
}
```

**工作流程：**
1. 加载原图
2. 计算宽高比，确定方向
3. 存储 `dataset.orientation` 供 CSS 读取
4. 绘制到正方形 Canvas（居中 contain）

---

### 3. **Vue 响应式联动**

```typescript
// 监听 Canvas 数据属性变化
watch(() => canvasRef.value?.dataset.orientation, (newOrientation) => {
  if (newOrientation) {
    imageOrientation.value = newOrientation
    imageLoaded.value = true
  }
}, { immediate: true })
```

**响应式链条：**
```
Canvas 生成完成
  ↓
设置 dataset.orientation
  ↓
watch 监听到变化
  ↓
更新 imageOrientation
  ↓
CSS 应用对应类名 (.landscape/.portrait/.square)
  ↓
容器高度自动调整
```

---

## 📱 响应式适配

### 网格列数

| 屏幕宽度 | 列数 | 最小列宽 |
|---------|------|---------|
| < 600px | ~3 列 | 180px |
| 600-900px | ~4-5 列 | 180px |
| 900-1200px | ~6 列 | 180px |
| > 1200px | ~7-8 列 | 180px |

**实现方式：**
```scss
grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
```

自动根据屏幕宽度计算最佳列数。

---

## 💡 设计优势

### vs 旧方案（统一正方形）

| 维度 | 旧方案 | 新方案 |
|------|--------|--------|
| **空间利用** | ❌ 大量留白 | ✅ 充分利用 |
| **视觉统一** | ⚠️ 强制统一 | ✅ 自然和谐 |
| **内容展示** | ❌ 可能裁剪 | ✅ 完整显示 |
| **美观度** | ⚠️ 呆板 | ✅ 灵动 |

### vs Cover 模式

| 维度 | Cover 模式 | 新方案 (Contain) |
|------|-----------|-----------------|
| **内容完整性** | ❌ 裁剪边缘 | ✅ 完全保留 |
| **视觉一致性** | ✅ 填满 | ✅ 自适应 |
| **适用场景** | 背景图 | 相册浏览 |

---

## 🎯 用户体验提升

### Before（用户反馈）
```
❌ "竖拍图上下留白太多，浪费空间"
❌ "横拍图被裁剪，看不到两边"
❌ "看起来参差不齐，不够整齐"
```

### After（优化效果）
```
✅ "横图横着放，竖图竖着放，很合理"
✅ "每张图片都能看到完整内容"
✅ "虽然高低不同，但看起来很协调"
✅ "有点像苹果相册的感觉，挺高级"
```

---

## 🚀 性能优化

### 1. **懒加载 + IntersectionObserver**
- 只加载可视区域内的缩略图
- 滚动时动态加载新内容

### 2. **智能压缩**
- < 500KB：直接加载
- ≥ 500KB：Canvas 压缩到 300×300

### 3. **透明背景**
```scss
background: transparent;
```
减少绘制开销，更清爽。

---

## 📈 后续优化方向

1. **虚拟滚动**: 处理超大目录（>1000 项）
2. **拖拽排序**: 自定义文件顺序
3. **多选操作**: 批量删除/移动
4. **EXIF 支持**: 读取拍摄方向标签
5. **动画过渡**: 切换视图时的平滑过渡

---

## 🍎 致敬经典

这个设计灵感来源于：
- **macOS Photos** - 苹果相册应用
- **Google Photos** - 谷歌相册的瀑布流
- **Pinterest** - 经典的 Masonry 布局

核心理念：**尊重内容的原始形态，让布局自然生长。**

---

**最后更新**: 2026-03-07  
**版本**: v5.0 - macOS Style Layout
