import { ref, nextTick } from 'vue'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
  type?: 'video' | 'image' | 'folder'
  library?: number
}

interface PreloadConfig {
  baseCount: number      // 基础预加载数量（前后各几张）
  maxCount: number       // 最大预加载数量
  adaptive: boolean      // 是否启用自适应
  speedThreshold: number // 速度阈值（毫秒）
}

/**
 * 图片预览 Hook
 * 管理图片预览的状态和操作，支持动态预加载相邻图片
 */
export function useImagePreview(mediaStore: any, currentLibrary?: () => number, config?: Partial<PreloadConfig>) {
  const showImagePreview = ref(false)
  const currentImageFile = ref<FileData | null>(null)
  const imageList = ref<FileData[]>([])
  const currentImageIndex = ref(0)

  // 预加载配置
  const preloadConfig: PreloadConfig = {
    baseCount: 2,        // 默认前后各预加载 2 张
    maxCount: 5,         // 最多前后各 5 张
    adaptive: true,      // 启用自适应
    speedThreshold: 500, // 切换间隔小于 500ms 认为快速浏览
    ...config
  }

  // 预加载的图片元素缓存
  const preloadCache = ref<Map<string, HTMLImageElement>>(new Map())

  // 浏览速度追踪
  let lastSwitchTime = 0
  let fastSwitchCount = 0
  let dynamicPreloadCount = preloadConfig.baseCount

  // 获取原图 URL（用于预加载和显示）
  const getOriginalUrl = (file: FileData): string => {
    const library = file.library ?? (currentLibrary ? currentLibrary() : 0)
    let filePath = file.path
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }
    return `/api/media/file?library=${library}&path=${encodeURIComponent(filePath)}`
  }

  // 打开图片预览
  const openImagePreview = (file: FileData) => {
    currentImageFile.value = file

    // 获取当前目录下的所有图片
    imageList.value = mediaStore.files.filter((f: { type: string }) => f.type === 'image')
    const foundIndex = imageList.value.findIndex(f => f.id === file.id)

    if (foundIndex === -1) {
      currentImageIndex.value = 0
      imageList.value = [file]
    } else {
      currentImageIndex.value = foundIndex
    }

    showImagePreview.value = true

    // 重置浏览速度追踪
    lastSwitchTime = Date.now()
    fastSwitchCount = 0
    dynamicPreloadCount = preloadConfig.baseCount

    // 预加载相邻图片
    nextTick(() => {
      preloadAdjacentImages()
    })
  }

  // 关闭图片预览
  const closeImagePreview = () => {
    showImagePreview.value = false
    currentImageFile.value = null
    imageList.value = []
    currentImageIndex.value = 0

    // 清理预加载缓存
    preloadCache.value.clear()

    // 重置状态
    lastSwitchTime = 0
    fastSwitchCount = 0
    dynamicPreloadCount = preloadConfig.baseCount
  }

  // 动态调整预加载数量
  const adjustPreloadCount = () => {
    if (!preloadConfig.adaptive) {
      return preloadConfig.baseCount
    }

    const now = Date.now()
    const timeSinceLastSwitch = now - lastSwitchTime

    // 检测快速浏览
    if (timeSinceLastSwitch < preloadConfig.speedThreshold) {
      fastSwitchCount++

      // 连续快速切换，增加预加载数量
      if (fastSwitchCount >= 3 && dynamicPreloadCount < preloadConfig.maxCount) {
        dynamicPreloadCount = Math.min(dynamicPreloadCount + 1, preloadConfig.maxCount)
      }
    } else {
      // 慢速浏览，减少预加载数量
      if (fastSwitchCount > 0) {
        fastSwitchCount--
      }
      if (dynamicPreloadCount > preloadConfig.baseCount) {
        dynamicPreloadCount = Math.max(dynamicPreloadCount - 1, preloadConfig.baseCount)
      }
    }

    lastSwitchTime = now
    return dynamicPreloadCount
  }

  // 预加载相邻图片（动态数量）
  const preloadAdjacentImages = () => {
    if (imageList.value.length === 0) return

    const currentIndex = currentImageIndex.value
    const preloadCount = adjustPreloadCount()

    // 计算需要预加载的索引范围
    const indicesToPreload: number[] = []

    for (let i = 1; i <= preloadCount; i++) {
      // 前一张
      const prevIndex = (currentIndex - i + imageList.value.length) % imageList.value.length
      indicesToPreload.push(prevIndex)

      // 后一张
      const nextIndex = (currentIndex + i) % imageList.value.length
      indicesToPreload.push(nextIndex)
    }

    // 去重并过滤已缓存的
    const uniqueIndices = [...new Set(indicesToPreload)]

    uniqueIndices.forEach(index => {
      const file = imageList.value[index]
      if (!file) return

      // 检查是否已预加载
      if (preloadCache.value.has(file.id)) {
        return
      }

      // 获取原图 URL 进行预加载
      const url = getOriginalUrl(file)

      // 创建 Image 对象进行预加载
      const img = new Image()
      img.src = url
      img.loading = 'eager' // 立即加载

      // 添加到缓存
      preloadCache.value.set(file.id, img)
    })
  }

  // 获取图片 URL（始终返回原图）
  const getImageUrl = (file: FileData): string => {
    // 直接返回原图 URL
    return getOriginalUrl(file)
  }

  // 上一张图片
  const prevImage = () => {
    if (imageList.value.length === 0) return
    currentImageIndex.value = (currentImageIndex.value - 1 + imageList.value.length) % imageList.value.length
    currentImageFile.value = imageList.value[currentImageIndex.value]

    // 切换后重新预加载相邻图片
    nextTick(() => {
      preloadAdjacentImages()
    })
  }

  // 下一张图片
  const nextImage = () => {
    if (imageList.value.length === 0) return
    currentImageIndex.value = (currentImageIndex.value + 1) % imageList.value.length
    currentImageFile.value = imageList.value[currentImageIndex.value]

    // 切换后重新预加载相邻图片
    nextTick(() => {
      preloadAdjacentImages()
    })
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

      // 索引变化时预加载相邻图片
      nextTick(() => {
        preloadAdjacentImages()
      })
    }
  }

  return {
    showImagePreview,
    currentImageFile,
    imageList,
    currentImageIndex,
    openImagePreview,
    closeImagePreview,
    prevImage,
    nextImage,
    handleUpdateShow,
    handleUpdateCurrent,
    getImageUrl, // 导出给组件使用
    preloadCache, // 导出缓存供外部访问
    preloadAdjacentImages // 导出手动触发预加载的方法
  }
}
