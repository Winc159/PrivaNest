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

// 图片预览逻辑
const {
  showImagePreview,
  imageList,
  currentImageIndex,
  openImagePreview,
  prevImage,
  nextImage,
  handleUpdateShow,
  handleUpdateCurrent
} = useImagePreview(mediaStore)

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
    let filePath = file.path
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }
    return `/api/media/file?library=${currentLibrary.value}&path=${encodeURIComponent(filePath)}`
  })
})

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

// 包装 goHome 函数
const handleGoHome = () => {
  goHome(router)
}

// 包装 shouldGenerateThumbnail
const handleShouldGenerateThumbnail = (file: FileData): boolean => {
  return shouldGenerateThumbnail(file) || false
}

// 处理上传成功事件
const handleUploadSuccess = () => {
  handleRefresh(mediaStore)
}

onMounted(async () => {
  await initLibraries()

  const initialPath = route.query.path as string || '/'
  await loadFolders(initialPath, mediaStore)

  nextTick(() => {
    observeCanvases()
  })

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('wheel', handleGlobalWheel, { passive: false })

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

  // 监听并移除 aria-hidden 属性，防止可访问性警告
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target as HTMLElement
        // 只要发现 aria-hidden="true" 就立即移除
        if (target.getAttribute('aria-hidden') === 'true') {
          // 使用 requestAnimationFrame 在下一帧移除，避免干扰当前渲染
          requestAnimationFrame(() => {
            target.removeAttribute('aria-hidden')
          })
        }
      }
    })
  })

  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['aria-hidden']
  })

    // 存储 observer 引用以便清理
    ; (window as any).__ariaHiddenObserver = observer
})

watch(() => route.query.path, (newPath) => {
  if (newPath && newPath !== mediaStore.currentPath) {
    navigateTo(newPath as string, mediaStore)
  }
})

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
      :view-mode="viewMode" :loading="mediaStore.loading"
      @library-change="(value) => handleLibraryChange(value, mediaStore)" @go-home="handleGoHome"
      @go-back="() => goBack(mediaStore)" @view-mode-change="(value) => viewMode = value"
      @refresh="() => handleRefresh(mediaStore)" @upload-success="handleUploadSuccess" />

    <!-- 面包屑导航 -->
    <library-breadcrumb :path-stack="pathStack" @navigate="(path) => navigateTo(path, mediaStore)" />

    <!-- 文件列表视图 -->
    <file-list-view :folders="mediaStore.folders" :files="mediaStore.files" :view-mode="viewMode"
      :loading="mediaStore.loading" :loading-more="loadingMore" :has-more="mediaStore.pagination?.hasMore ?? null"
      :get-thumbnail-url="getThumbnailUrl" :should-generate-thumbnail="handleShouldGenerateThumbnail"
      @folder-click="handleFolderClick" @file-click="handleFileClick"
      @scroll="(e: Event) => handleScroll(e, mediaStore)" />

    <!-- 全屏播放器 -->
    <FullscreenVideoPlayer 
      v-model:show="showFullscreenPlayer"
      :file="currentVideoFile" 
      :library="currentLibrary"
      :show-navigation="true"
      @close="closePlayer"
      @navigate="navigateVideo"
    />

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
