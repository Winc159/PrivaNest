<script setup lang="ts">
import { onMounted, nextTick, watch } from 'vue'
import { useMediaStore } from '@/stores/media'
import { useRouter } from 'vue-router'
import { useThumbnail } from '@/composables/useThumbnail'
import { useFileNavigation } from '@/composables/useFileNavigation'
import LibraryHeader from './components/LibraryHeader.vue'
import LibraryBreadcrumb from './components/LibraryBreadcrumb.vue'
import FileListView from './components/FileListView.vue'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
}

const mediaStore = useMediaStore()
const router = useRouter()

// 使用 composables
const { 
  getThumbnailUrl, 
  shouldGenerateThumbnail,
  observeCanvases 
} = useThumbnail()

const {
  viewMode,
  pathStack,
  currentLibrary,
  libraries,
  loadingMore,
  initLibraries,
  loadFolders,
  navigateTo,
  goBack,
  goHome,
  handleLibraryChange,
  handleScroll,
  handleRefresh
} = useFileNavigation()

onMounted(async () => {
  await initLibraries()
  await loadFolders('/', mediaStore)
  
  // 初始加载完成后立即观察 Canvas
  nextTick(() => {
    observeCanvases()
  })
})

// 监听 Canvas 元素渲染
watch(() => mediaStore.files, (newFiles) => {
  // 文件列表变化时重新观察（包括首次加载和后续变化）
  if (newFiles && newFiles.length > 0) {
    nextTick(() => {
      observeCanvases()
    })
  }
}, { deep: true })

// 事件处理函数
const handleFolderClick = (path: string) => {
  navigateTo(path, mediaStore)
}

const handleUploadSuccess = () => {
  handleRefresh(mediaStore)
}

// 包装 goHome 函数，不传递参数
const handleGoHome = () => {
  goHome(router)
}

// 包装 shouldGenerateThumbnail，确保返回 boolean
const handleShouldGenerateThumbnail = (file: FileData): boolean => {
  return shouldGenerateThumbnail(file) || false
}
</script>

<template>
  <div class="library-container">
    <!-- 头部操作区 -->
    <library-header
      :current-library="currentLibrary"
      :libraries="libraries"
      :path-stack="pathStack"
      :view-mode="viewMode"
      :loading="mediaStore.loading"
      @library-change="(value) => handleLibraryChange(value, mediaStore)"
      @go-home="handleGoHome"
      @go-back="() => goBack(mediaStore)"
      @view-mode-change="(value) => viewMode = value"
      @refresh="() => handleRefresh(mediaStore)"
      @upload-success="handleUploadSuccess"
    />
    
    <!-- 面包屑导航 -->
    <library-breadcrumb
      :path-stack="pathStack"
      @navigate="(path) => navigateTo(path, mediaStore)"
    />
    
    <!-- 文件列表视图 -->
    <file-list-view
      :folders="mediaStore.folders"
      :files="mediaStore.files"
      :view-mode="viewMode"
      :loading="mediaStore.loading"
      :loading-more="loadingMore"
      :has-more="mediaStore.pagination?.hasMore ?? null"
      :get-thumbnail-url="getThumbnailUrl"
      :should-generate-thumbnail="handleShouldGenerateThumbnail"
      @folder-click="handleFolderClick"
      @file-click="handleFolderClick"
      @scroll="(e: Event) => handleScroll(e, mediaStore)"
    />
  </div>
</template>

<style lang="scss" scoped>
.library-container {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}
</style>
