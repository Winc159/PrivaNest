bu s
<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, watch, computed, ref } from 'vue'
import 'video.js/dist/video-js.css'
import { NImageGroup } from 'naive-ui'
import { useMediaStore } from '@/stores/media'
import { useRouter, useRoute } from 'vue-router'
import { useThumbnail } from '@/composables/useThumbnail'
import { useFileNavigation } from '@/composables/useFileNavigation'
import { useImagePreview } from '@/composables/useImagePreview'
import FullscreenVideoPlayer from '@/components/FullscreenVideoPlayer.vue'
import LibraryHeader from './components/LibraryHeader.vue'
import LibraryBreadcrumb from './components/LibraryBreadcrumb.vue'
import FileListView from './components/FileListView.vue'
import type { FileData } from '@/types/file'

const mediaStore = useMediaStore()
const router = useRouter()
const route = useRoute()

// 使用 composables
const {
  getThumbnailUrl,
  shouldGenerateThumbnail,
  observeCanvases,
  pauseGeneration,
  resumeGeneration,
  clearPausedQueue
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
} = useFileNavigation(router)

// 图片预览逻辑（传入 currentLibrary 函数以支持预加载）
const {
  showImagePreview,
  imageList,
  currentImageIndex,
  openImagePreview,
  prevImage,
  nextImage,
  handleUpdateShow,
  handleUpdateCurrent,
  preloadCache, // 新增：访问预加载缓存
  preloadAdjacentImages // 新增：手动触发预加载
} = useImagePreview(mediaStore, () => currentLibrary.value, {
  baseCount: 2,    // 基础预加载前后各 2 张
  maxCount: 5,     // 最大预加载前后各 5 张
  adaptive: true,  // 启用动态调整
  speedThreshold: 500 // 快速切换阈值 500ms
})

// 视频播放器状态
const showFullscreenPlayer = ref(false)
const currentVideoFile = ref<FileData | null>(null)

// 当前播放列表（用于导航）
const currentVideoList = computed<FileData[]>(() => {
  return mediaStore.files.filter(f => f.type === 'video')
})

// 当前视频在列表中的索引
const currentVideoIndex = computed<number>(() => {
  if (!currentVideoFile.value) return -1
  return currentVideoList.value.findIndex(f => f.path === currentVideoFile.value?.path)
})

// 动态注入全局遮罩样式
let styleElement: HTMLStyleElement | null = null

// 所有图片的 URL 列表（用于 NImageGroup）
const imageSrcList = computed(() => {
  return imageList.value.map((file: FileData) => {
    // 始终返回原图 URL
    const library = currentLibrary.value
    let filePath = file.path
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }
    const originalUrl = `/api/media/file?library=${library}&path=${encodeURIComponent(filePath)}`

    return originalUrl
  })
})

// 监听 currentImageIndex 变化，动态更新 src-list
watch(currentImageIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && newIndex >= 0 && newIndex < imageList.value.length) {
    // 新的当前图片需要立即加载
    const newCurrentFile = imageList.value[newIndex]
    if (newCurrentFile && !preloadCache.value.has(newCurrentFile.id)) {
      nextTick(() => {
        preloadAdjacentImages()
      })
    }
  }
}, { immediate: false })

// 滚轮切换图片
let scrollTimeout: ReturnType<typeof setTimeout> | null = null
const handleGlobalWheel = (e: WheelEvent) => {
  if (!showImagePreview.value || scrollTimeout) return

  const delta = Math.abs(e.deltaY || e.deltaX)
  if (delta < 3) return

  if (e.deltaY > 3 || e.deltaX > 0) {
    nextImage()
  } else if (e.deltaY < -3 || e.deltaX < 0) {
    prevImage()
  } else {
    return
  }

  scrollTimeout = setTimeout(() => {
    scrollTimeout = null
  }, 150)
}

// 键盘事件处理 - 只处理图片预览相关，视频播放器由 FullscreenVideoPlayer 自己处理
const handleKeydown = (e: KeyboardEvent) => {
  // 图片预览 ESC 关闭（如果有需要）
  if (showImagePreview.value && e.code === 'Escape') {
    // NImageGroup 内部已处理
  }
}

// 打开播放器 - 简化版本
const openPlayer = (file: FileData) => {
  currentVideoFile.value = file
  showFullscreenPlayer.value = true
}

// 关闭播放器
const closePlayer = () => {
  showFullscreenPlayer.value = false
  currentVideoFile.value = null
}

// 导航到上一个/下一个视频
const navigateVideo = (direction: 'prev' | 'next') => {
  const list = currentVideoList.value
  const currentIndex = currentVideoIndex.value

  if (currentIndex === -1 || list.length === 0) return

  let newIndex: number
  if (direction === 'prev') {
    newIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1
  } else {
    newIndex = currentIndex < list.length - 1 ? currentIndex + 1 : 0
  }

  currentVideoFile.value = list[newIndex]
}

// 事件处理函数
const handleFolderClick = (path: string) => {
  router.push({ query: { ...route.query, path } })
  navigateTo(path, mediaStore)
}

const handleFileClick = (file: FileData) => {
  if (file.type === 'video') {
    openPlayer(file)
  } else if (file.type === 'image') {
    openImagePreview(file)
  }
}

// 包装 goBack 函数
const handleGoBack = () => {
  goBack(mediaStore)
}

// 包装 goHome 函数
const handleGoHome = () => {
  goHome(router)
}

// 包装 navigateTo 函数（用于面包屑导航）
const handleNavigate = (path: string) => {
  router.push({ query: { ...route.query, path } })
  navigateTo(path, mediaStore)
}

// 包装 handleLibraryChange 函数
const handleLibraryChangeWrapper = (value: number) => {
  handleLibraryChange(value, mediaStore, { pauseGeneration, resumeGeneration, clearPausedQueue })
}

// 包装 shouldGenerateThumbnail
const handleShouldGenerateThumbnail = (file: FileData): boolean => {
  return shouldGenerateThumbnail(file) || false
}

// 处理上传成功事件
const handleUploadSuccess = () => {
  handleRefresh(mediaStore)
}

// 从 URL 参数初始化路径栈
const initPathFromURL = (path: string) => {
  if (path && path !== '/') {
    // 将路径拆分为层级数组，例如 /a/b/c -> ['/', '/a', '/a/b', '/a/b/c']
    const pathSegments = path.split('/').filter(segment => segment !== '')
    const stack: string[] = ['/']

    for (let i = 0; i < pathSegments.length; i++) {
      const path = '/' + pathSegments.slice(0, i + 1).join('/')
      stack.push(path)
    }

    pathStack.value = stack
  } else {
    pathStack.value = ['/']
  }
}

onMounted(async () => {
  await initLibraries()

  const initialPath = route.query.path as string || '/'
  // 从 URL 参数读取媒体库索引，默认为 0
  const initialLibrary = parseInt(route.query.library as string || '0')

  // 设置初始媒体库
  currentLibrary.value = initialLibrary

  // 注意：路径栈初始化由 watch 监听器负责（带 immediate 选项）
  // 这里只需要加载文件，不要重置路径栈
  await loadFolders(initialPath, mediaStore, false)

  nextTick(() => {
    observeCanvases()
  })

  window.addEventListener('keydown', handleKeydown)
  // 使用 passive: true 避免 Chrome 警告，因为我们不需要阻止默认滚动行为
  window.addEventListener('wheel', handleGlobalWheel, { passive: true })

  // 动态注入全局遮罩样式到 head
  styleElement = document.createElement('style')
  styleElement.id = 'image-preview-mask-style'
  styleElement.textContent = `
    .n-image-preview-container,
    .n-modal-mask,
    .n-image-group-modal {
      background-color: rgba(0, 0, 0, 0.95) !important;
    }
  `
  document.head.appendChild(styleElement)

  // 注意：Naive UI 会自动处理 modal 的 aria-hidden 属性
  // 不需要手动移除，否则可能导致焦点管理问题
})

// 监听路由参数变化（包括初次加载）
watch([() => route.query.path, () => route.query.library], ([newPath, newLibrary]) => {
  // 处理媒体库切换
  if (newLibrary !== undefined) {
    const libraryIndex = parseInt(newLibrary as string || '0')
    if (libraryIndex !== currentLibrary.value) {
      currentLibrary.value = libraryIndex
      pathStack.value = ['/']
      initPathFromURL('/')
      loadFolders('/', mediaStore, true)  // 切换媒体库时重置路径栈
      return
    }
  }

  // 处理路径变化（包括初次加载）
  // 移除 currentPath 检查，因为初次加载时 currentPath 可能还未设置
  if (newPath) {
    // 只在用户主动点击时才调用 navigateTo
    // 这里是 URL 参数变化（如浏览器前进后退、刷新页面），只需要加载对应目录文件并重建路径栈
    initPathFromURL(newPath as string)
    mediaStore.fetchFolders(newPath as string, currentLibrary.value, 1)  // 直接调用 fetchFolders，不调用 loadFolders
  }
}, { immediate: true })

watch(() => mediaStore.files, (newFiles) => {
  if (newFiles && newFiles.length > 0) {
    nextTick(() => {
      observeCanvases()
    })
  }
}, { deep: true })


onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('wheel', handleGlobalWheel)

  // 清理动态注入的遮罩样式
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
})
</script>

<template>
  <div class="library-container">
    <!-- 头部操作区 -->
    <library-header :current-library="currentLibrary" :libraries="libraries" :path-stack="pathStack"
      :view-mode="viewMode" :loading="mediaStore.loading" @library-change="handleLibraryChangeWrapper"
      @go-home="handleGoHome" @go-back="handleGoBack" @view-mode-change="(value) => viewMode = value"
      @refresh="() => handleRefresh(mediaStore)" @upload-success="handleUploadSuccess" />

    <!-- 面包屑导航 -->
    <library-breadcrumb :path-stack="pathStack" @navigate="handleNavigate" />

    <!-- 文件列表视图 -->
    <file-list-view :folders="mediaStore.folders" :files="mediaStore.files" :view-mode="viewMode"
      :loading="mediaStore.loading" :loading-more="loadingMore" :has-more="mediaStore.pagination?.hasMore ?? null"
      :get-thumbnail-url="getThumbnailUrl" :should-generate-thumbnail="handleShouldGenerateThumbnail"
      @folder-click="handleFolderClick" @file-click="handleFileClick"
      @scroll="(e: Event) => handleScroll(e, mediaStore)" />

    <!-- 全屏播放器 -->
    <FullscreenVideoPlayer v-model:show="showFullscreenPlayer" :file="currentVideoFile" :library="currentLibrary"
      :show-navigation="true" @close="closePlayer" @navigate="navigateVideo" />

    <!-- 图片预览组 -->
    <n-image-group ref="imageGroupRef" v-model:show="showImagePreview" v-model:current="currentImageIndex"
      :src-list="imageSrcList" @update:show="handleUpdateShow" @update:current="handleUpdateCurrent" />
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
