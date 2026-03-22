<script setup lang="ts">
import { NEmpty, NSpin, NDivider } from 'naive-ui'
import FileCard from './FileCard.vue'
import { ref, onMounted, onUnmounted } from 'vue'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
}

interface Props {
  folders: FileData[]
  files: FileData[]
  viewMode: 'grid' | 'list'
  loading: boolean
  loadingMore: boolean
  hasMore: boolean | null
  getThumbnailUrl: (file: FileData) => string | null
  shouldGenerateThumbnail: (file: FileData) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'folder-click': [path: string]
  'file-click': [file: FileData]
  'scroll': [event: Event]
}>()

const contentRef = ref<HTMLDivElement | null>(null)
const containerHeight = ref('calc(100vh - 160px)')

// 动态计算内容区域高度
const updateContainerHeight = () => {
  if (!contentRef.value) return
  
  // 获取父容器（library-container）
  const parent = contentRef.value.parentElement
  if (!parent) return
  
  // 获取头部和面包屑的高度
  const header = parent.querySelector('.library-header') as HTMLElement
  const breadcrumb = parent.querySelector('.library-breadcrumb') as HTMLElement
  
  let offsetHeight = 0
  if (header) offsetHeight += header.offsetHeight
  if (breadcrumb) offsetHeight += breadcrumb.offsetHeight
  
  // 加上 padding 和其他边距
  const extraSpacing = 40 // 上下 padding + gap
  
  // 计算可用高度
  const availableHeight = window.innerHeight - offsetHeight - extraSpacing
  containerHeight.value = `${availableHeight}px`
}

const handleFolderClick = (folder: FileData) => {
  emit('folder-click', folder.path)
}

const handleFileClick = (file: FileData) => {
  emit('file-click', file)
}

onMounted(() => {
  // 初始计算高度
  updateContainerHeight()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerHeight)
  
  // 延迟计算确保 DOM 完全渲染
  setTimeout(updateContainerHeight, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})
</script>

<template>
  <div ref="contentRef" class="content" :style="{ height: containerHeight }" @scroll="(e) => emit('scroll', e)">
    <n-empty 
      v-if="!loading && folders.length === 0 && files.length === 0" 
      description="暂无文件"
      style="padding: 60px 0"
    />
    
    <template v-else>
      <!-- 网格模式 -->
      <div v-if="viewMode === 'grid'" class="masonry-grid">
        <!-- 文件夹列表 -->
        <div v-for="folder in folders" :key="folder.id" class="grid-item folder-item">
          <file-card 
            :file="folder"
            :is-folder="true"
            :view-mode="viewMode"
            @click="handleFolderClick"
          />
        </div>
        
        <!-- 文件列表 -->
        <file-card 
          v-for="file in files" 
          :key="file.id"
          :file="file"
          :is-folder="false"
          :view-mode="viewMode"
          @click="handleFileClick"
        />
      </div>
      
      <!-- 列表模式 -->
      <div v-else :class="['file-list', viewMode]">
        <!-- 文件夹列表 -->
        <file-card 
          v-for="folder in folders" 
          :key="folder.id"
          :file="folder"
          :is-folder="true"
          :view-mode="viewMode"
          @click="handleFolderClick"
        />
        
        <!-- 文件列表 -->
        <file-card 
          v-for="file in files" 
          :key="file.id"
          :file="file"
          :is-folder="false"
          :view-mode="viewMode"
          @click="handleFileClick"
        />
      </div>
      
      <!-- 加载更多提示 -->
      <div v-if="loadingMore" class="loading-more">
        <n-spin size="medium" description="加载中..." />
      </div>
      
      <!-- 没有更多数据提示 -->
      <div v-if="hasMore === false && files.length > 0" class="no-more">
        <n-divider dashed>
          <span style="color: #999; font-size: 13px;">没有更多了</span>
        </n-divider>
      </div>
    </template>
    
    <n-spin :show="loading" overlay-class-name="content-overlay">
      <div></div>
    </n-spin>
  </div>
</template>

<style lang="scss" scoped>
.content {
  padding: 20px;
  overflow-y: auto;
  background: #f8f9fa;
  transition: height 0.2s ease; // 平滑过渡
  
  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 3px;
    
    &:hover {
      background: #b0b0b0;
    }
  }
  
  // 移动端减少 padding
  @media (max-width: 768px) {
    padding: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 8px;
  }
}

// Finder 风格网格布局 - 类似 macOS 文件系统
.masonry-grid {
  display: grid;
  gap: 20px;
  // 响应式列数：根据屏幕宽度自动调整
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  grid-auto-flow: dense;
  align-items: start; // 顶部对齐，允许不同高度的项目
  
  // 超大屏幕（桌面显示器）
  @media (min-width: 1920px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 24px;
  }
  
  // 大屏幕（笔记本/小桌面）
  @media (min-width: 1440px) and (max-width: 1919px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }
  
  // 中等屏幕（平板横屏/小笔记本）
  @media (min-width: 1024px) and (max-width: 1439px) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
  }
  
  // 小屏幕（平板竖屏）
  @media (min-width: 768px) and (max-width: 1023px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 14px;
  }
  
  // 手机横屏/大手机竖屏（自适应，至少 2 列）
  @media (min-width: 568px) and (max-width: 767px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }
  
  // 手机竖屏（自适应，可能 1-2 列）
  @media (max-width: 567px) {
    // 使用 auto-fit 配合最小宽度，让浏览器自动计算最优列数
    // 320px 屏幕 - 140px 卡片 = 1 列
    // 414px 屏幕 - 140px 卡片 = 2 列
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }
  
  // 超小屏幕（如 iPhone SE）强制 1 列
  @media (max-width: 375px) {
    grid-template-columns: 1fr; // 强制单列
    gap: 8px;
  }
  
  .grid-item {
    min-width: 0;
    width: 100%;
    height: 100%;
    // 每个项目根据自己的内容（横/竖/方）自动调整高度
  }
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  &.list {
    .media-item {
      width: 100%;
    }
  }
  
  // 列表模式的响应式适配
  @media (max-width: 768px) {
    gap: 8px;
  }
}

.loading-more, .no-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0;
  margin-top: 20px;
}

.no-more {
  .n-divider {
    margin: 0;
  }
}

// 加载覆盖层
.content-overlay {
  :deep(.n-spin-content) {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
  }
}
</style>
