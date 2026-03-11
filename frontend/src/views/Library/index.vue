<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, watch, ref, computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import { useRouter, useRoute } from 'vue-router'
import { VideoPlayer } from '@videojs-player/vue'
import 'video.js/dist/video-js.css'
import { NModal, NButton, NIcon, NImageGroup } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
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
  type?: 'video' | 'image' | 'folder'
}

const mediaStore = useMediaStore()
const router = useRouter()
const route = useRoute()

// 全屏播放器相关状态
const showFullscreenPlayer = ref(false)
const currentVideoFile = ref<FileData | null>(null)
const playerRef = ref<any>(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)

// 图片预览相关状态
const showImagePreview = ref(false)
const currentImageFile = ref<FileData | null>(null)
const imageList = ref<FileData[]>([]) // 当前目录所有图片
const currentImageIndex = ref(0) // 当前图片索引

// 动态注入全局遮罩样式
let styleElement: HTMLStyleElement | null = null

// 获取播放器实例
const getPlayer = () => {
  return playerRef.value?.player || playerRef.value
}

// 当前播放的视频 URL
const currentVideoUrl = computed(() => {
  if (!currentVideoFile.value) return ''
  
  // 确保路径以 / 开头
  let filePath = currentVideoFile.value.path
  if (!filePath.startsWith('/')) {
    filePath = '/' + filePath
  }
  
  const url = `/api/media/file?library=${currentLibrary.value}&path=${encodeURIComponent(filePath)}`
  
  console.log('📺 构建视频 URL:', {
    fileName: currentVideoFile.value.name,
    originalPath: currentVideoFile.value.path,
    normalizedPath: filePath,
    library: currentLibrary.value,
    finalUrl: url
  })
  
  return url
})

// 所有图片的 URL 列表（用于 NImageGroup）
const imageSrcList = computed(() => {
  return imageList.value.map(file => {
    let filePath = file.path
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }
    return `/api/media/file?library=${currentLibrary.value}&path=${encodeURIComponent(filePath)}`
  })
})



// 获取视频文件的扩展名
const getVideoExtension = () => {
  if (!currentVideoFile.value) return 'mp4'
  const ext = currentVideoFile.value.ext?.toLowerCase()
  // 移除前导点号
  return ext?.replace('.', '') || 'mp4'
}

// 根据扩展名获取 MIME 类型
const getMimeType = (ext: string): string => {
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    flv: 'video/x-flv'
  }
  return mimeTypes[ext] || 'video/mp4'
}

// 播放器选项
const playerOptions = computed(() => ({
  controls: true,
  autoplay: true,
  preload: 'auto',
  fluid: true,
  aspectRatio: '16:9',
  responsive: true,
  sources: [{
    src: currentVideoUrl.value,
    type: getMimeType(getVideoExtension())
  }],
  controlBar: {
    children: [
      'playToggle',
      'volumePanel',
      'currentTimeDisplay',
      'timeDivider',
      'durationDisplay',
      'progressControl',
      'playbackRateMenuButton',
      'fullscreenToggle'
    ]
  }
}))

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
  
  // 从路由参数中获取路径，如果没有则默认为 '/'
  const initialPath = route.query.path as string || '/'
  await loadFolders(initialPath, mediaStore)
  
  // 初始加载完成后立即观察 Canvas
  nextTick(() => {
    observeCanvases()
  })
  
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeydown)
  
  // 添加全局滚轮事件监听（用于图片预览切换）
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
})

// 监听路由参数变化，当 URL 中的 path 改变时重新加载文件夹
watch(() => route.query.path, (newPath) => {
  if (newPath && newPath !== mediaStore.currentPath) {
    navigateTo(newPath as string, mediaStore)
  }
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

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  // 如果播放器打开且按下 ESC 键
  if (showFullscreenPlayer.value && e.code === 'Escape') {
    closePlayer()
  }
  
  // 如果图片预览打开，使用 NImageGroup 内置的快捷键
  // NImageGroup 已经支持：ESC 关闭、左右箭头切换、Ctrl+ 滚轮缩放
  // 我们只需要确保焦点在图片组上即可
}

// 事件处理函数
const handleFolderClick = (path: string) => {
  // 导航到子文件夹时，同步更新 URL 参数
  router.push({ 
    query: { ...route.query, path } 
  })
  navigateTo(path, mediaStore)
}

const handleFileClick = (file: FileData) => {
  // 如果是视频文件，打开全屏播放器
  if (file.type === 'video') {
    currentVideoFile.value = file
    showFullscreenPlayer.value = true
  } else if (file.type === 'image') {
    // 如果是图片文件，设置当前预览图片并收集所有图片用于切换
    currentImageFile.value = file
    
    // 获取当前目录下的所有图片
    imageList.value = mediaStore.files.filter(f => f.type === 'image')
    const foundIndex = imageList.value.findIndex(f => f.id === file.id)
    
    if (foundIndex === -1) {
      // 如果找不到当前图片，将其添加到列表
      currentImageIndex.value = 0
      imageList.value = [file]
    } else {
      currentImageIndex.value = foundIndex
    }
    
    showImagePreview.value = true
  } else {
    // 文件夹等其他类型
  }
}

// 关闭播放器
const closePlayer = () => {
  // 保存播放进度
  saveProgress()
  
  // 暂停并清理播放器
  const player = getPlayer()
  if (player && typeof player.pause === 'function') {
    player.pause()
  }
  
  // 重置状态
  showFullscreenPlayer.value = false
  currentVideoFile.value = null
  playerRef.value = null
}

// 关闭图片预览
const closeImagePreview = () => {
  showImagePreview.value = false
  currentImageFile.value = null
  imageList.value = []
  currentImageIndex.value = 0
}

// 处理显示状态变化
const handleUpdateShow = (show: boolean) => {
  if (!show) {
    closeImagePreview()
  }
}

// 处理当前索引变化
const handleUpdateCurrent = (index: number) => {
  currentImageIndex.value = index
  if (imageList.value[index]) {
    currentImageFile.value = imageList.value[index]
  }
}

// 上一张图片
const prevImage = () => {
  if (imageList.value.length === 0) return
  currentImageIndex.value = (currentImageIndex.value - 1 + imageList.value.length) % imageList.value.length
  currentImageFile.value = imageList.value[currentImageIndex.value]
}

// 下一张图片
const nextImage = () => {
  if (imageList.value.length === 0) return
  currentImageIndex.value = (currentImageIndex.value + 1) % imageList.value.length
  currentImageFile.value = imageList.value[currentImageIndex.value]
}

// 滚轮切换图片（使用全局监听）
let scrollTimeout: ReturnType<typeof setTimeout> | null = null
const handleGlobalWheel = (e: WheelEvent) => {
  // 只有在图片预览打开时才响应
  if (!showImagePreview.value) return
  
  // 防止过于频繁的触发
  if (scrollTimeout) return
  
  const delta = Math.abs(e.deltaY || e.deltaX)
  
  // 设置阈值，避免误触
  if (delta < 3) return
  
  // 根据滚动方向切换图片
  if (e.deltaY > 3 || e.deltaX > 0) {
    nextImage()
  }
  if (e.deltaY < -3 || e.deltaX < 0) {
    prevImage()
  } else {
    return
  }
  
  // 设置防抖间隔（150ms）
  scrollTimeout = setTimeout(() => {
    scrollTimeout = null
  }, 150)
}

// 播放器就绪事件
const onPlayerReady = (player: any) => {
  playerRef.value = player
  
  // 恢复上次播放进度
  restoreProgress()
}

// 播放事件
const onPlay = () => {
  isPlaying.value = true
  saveProgress()
}

// 暂停事件
const onPause = () => {
  isPlaying.value = false
  saveProgress()
}

// 播放结束事件
const onEnded = () => {
  clearProgress()
  closePlayer()
}

// 时间更新事件
const onTimeUpdate = () => {
  const player = getPlayer()
  if (player && typeof player.currentTime === 'function') {
    currentTime.value = player.currentTime()
    duration.value = player.duration() || 0
    
    // 定期保存进度（每 5 秒）
    if (Math.floor(currentTime.value) % 5 === 0) {
      saveProgress()
    }
  }
}

// 本地存储进度
const saveProgress = () => {
  if (!currentVideoFile.value) return
  
  const player = getPlayer()
  if (!player || typeof player.currentTime !== 'function') return
  
  const progress = {
    path: currentVideoFile.value.path,
    library: currentLibrary.value,
    currentTime: player.currentTime(),
    duration: player.duration(),
    timestamp: Date.now()
  }
  
  localStorage.setItem(`video-progress:${currentVideoFile.value.path}`, JSON.stringify(progress))
}

const restoreProgress = () => {
  if (!currentVideoFile.value) return
  
  const player = getPlayer()
  if (!player || typeof player.currentTime !== 'function') return
  
  const saved = localStorage.getItem(`video-progress:${currentVideoFile.value.path}`)
  if (saved) {
    try {
      const progress = JSON.parse(saved)
      // 如果距离上次观看不超过 24 小时，恢复进度
      if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
        player.currentTime(progress.currentTime)
      }
    } catch (e) {
      // 恢复进度失败，使用默认行为
    }
  }
}

const clearProgress = () => {
  if (currentVideoFile.value) {
    localStorage.removeItem(`video-progress:${currentVideoFile.value.path}`)
  }
}

// 包装 goHome 函数，不传递参数
const handleGoHome = () => {
  goHome(router)
}

// 包装 shouldGenerateThumbnail，确保返回 boolean
const handleShouldGenerateThumbnail = (file: FileData): boolean => {
  return shouldGenerateThumbnail(file) || false
}

// 处理上传成功事件
const handleUploadSuccess = () => {
  handleRefresh(mediaStore)
}

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('wheel', handleGlobalWheel)
  
  // 清理动态注入的遮罩样式
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
  
  // 清理播放器
  const player = getPlayer()
  if (player && typeof player.dispose === 'function') {
    player.dispose()
  }
})
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
      @file-click="handleFileClick"
      @scroll="(e: Event) => handleScroll(e, mediaStore)"
    />
    
    <!-- 全屏播放器 Modal -->
    <n-modal
      v-model:show="showFullscreenPlayer"
      :close-on-esc="false"
      :mask-closable="false"
      preset="card"
      style="width: 100vw; height: 100vh; max-width: none; max-height: none;"
      content-style="padding: 0; display: flex; flex-direction: column;"
      header-style="padding: 16px 24px; background: #0a0a0a; border-bottom: 1px solid #333;"
      :closable="false"
    >
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="color: #fff; font-size: 16px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
            {{ currentVideoFile?.name }}
          </div>
          <n-button quaternary circle @click="closePlayer" style="color: #fff; margin-left: 16px;">
            <template #icon>
              <n-icon :component="CloseOutline" size="24" />
            </template>
          </n-button>
        </div>
      </template>
      
      <div style="flex: 1; background: #0a0a0a; display: flex; align-items: center; justify-content: center; position: relative;">
        <VideoPlayer
          v-if="showFullscreenPlayer"
          :options="playerOptions"
          @ready="onPlayerReady"
          @play="onPlay"
          @pause="onPause"
          @ended="onEnded"
          @timeupdate="onTimeUpdate"
          style="width: 100%; height: 100%; max-height: calc(100vh - 73px);"
        />
      </div>
    </n-modal>

    <!-- 图片预览使用 NImageGroup -->
    <n-image-group
      ref="imageGroupRef"
      v-model:show="showImagePreview"
      v-model:current="currentImageIndex"
      :on-update:show="handleUpdateShow"
      :src-list="imageSrcList"
      :default-zoom="1"
      :min-zoom="0.5"
      :max-zoom="5"
      :infinite="true"
      :mask-closable="true"
      @update:current="handleUpdateCurrent"
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
