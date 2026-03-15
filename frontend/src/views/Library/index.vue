bu s
<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, watch, computed, ref } from 'vue'
import 'video.js/dist/video-js.css'
import { NModal, NButton, NIcon, NImageGroup } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
import { useMediaStore } from '@/stores/media'
import { useRouter, useRoute } from 'vue-router'
import { useThumbnail } from '@/composables/useThumbnail'
import { useFileNavigation } from '@/composables/useFileNavigation'
import { useImagePreview } from '@/composables/useImagePreview'
import VideoPlayer from '@/components/VideoPlayer.vue'
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
  type?: 'video' | 'image' | 'folder'
}

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
const showControlBar = ref(false)

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

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  if (showFullscreenPlayer.value && e.code === 'Escape') {
    closePlayer()
  }
}

// 打开播放器
const openPlayer = (file: FileData) => {
  currentVideoFile.value = file
  showFullscreenPlayer.value = true
  
  // 在 Modal 打开后移除 aria-hidden
  nextTick(() => {
    const modalElements = document.querySelectorAll('[aria-hidden="true"]')
    modalElements.forEach(el => {
      el.removeAttribute('aria-hidden')
    })
  })
}

// 关闭播放器
const closePlayer = () => {
  showFullscreenPlayer.value = false
  currentVideoFile.value = null
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
  ;(window as any).__ariaHiddenObserver = observer
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

watch(() => showFullscreenPlayer.value, (newVal) => {
  if (newVal) {
    // Modal 打开时，移除所有 aria-hidden
    nextTick(() => {
      const modalElements = document.querySelectorAll('[aria-hidden="true"]')
      modalElements.forEach(el => {
        el.removeAttribute('aria-hidden')
      })
    })
  }
})

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

    <!-- 全屏播放器 Modal -->
    <n-modal v-model:show="showFullscreenPlayer" :close-on-esc="false" :mask-closable="false" preset="card"
      style="width: 100vw; height: 100vh; max-width: none; max-height: none;"
      content-style="padding: 0; display: flex; flex-direction: column;" header-style="display: none;"
      :closable="false" :ignore-aria-hidden="true">
      <div @mouseenter="showControlBar = true" @mouseleave="showControlBar = false"
        style="flex: 1; background: #0a0a0a; display: flex; position: relative; overflow: hidden;">

        <div v-show="showControlBar"
          style="position: absolute; top: 0; left: 0; right: 0; z-index: 10; padding: 25px 24px 20px; display: flex; align-items: center; justify-content: space-between; opacity: 0; transition: opacity 0.3s ease;"
          :style="{ opacity: showControlBar ? 1 : 0 }">
          <div
            style="color: #fff; font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 20px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
            {{ currentVideoFile?.name }}
          </div>
          <n-button quaternary circle @click="closePlayer"
            style="color: #fff;  backdrop-filter: blur(10px); width: 40px; height: 40px; min-width: 40px; transition: all 0.2s ease;">
            <template #icon>
              <n-icon :component="CloseOutline" size="20" />
            </template>
          </n-button>
        </div>
        <VideoPlayer v-if="showFullscreenPlayer" :file="currentVideoFile" :library="currentLibrary"
          @close="closePlayer" />

      </div>
    </n-modal>

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
