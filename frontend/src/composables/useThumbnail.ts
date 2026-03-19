import { ref } from 'vue'
import { LRUCache } from '@/utils/lruCache'

/**
 * 缩略图生成 Hook
 * 用于处理大图片的前端 Canvas 压缩
 * 
 * 优化特性：
 * - LRU 缓存：最多存储 100 个缩略图
 * - 并发控制：最多同时生成 5 个缩略图
 * - 超时保护：8 秒自动降级
 * - 懒加载：IntersectionObserver 触发
 * - 智能暂停/恢复：根据用户浏览行为动态调整
 */
export function useThumbnail() {

  const canvasRefs = ref<HTMLCanvasElement[]>([])

  // LRU 缓存：存储已生成的缩略图
  const thumbnailCache = new LRUCache<string, string>(100)

  // 并发控制
  const processingCount = ref(0)
  const maxConcurrent = 5
  const processQueue: Array<() => void> = []

  // 暂停状态管理
  const isPaused = ref(false)
  const pausedQueue: Array<{ canvas: HTMLCanvasElement; src: string; resolve: () => void; reject: (err: any) => void }> = []

  // 判断是否为图片文件
  const isImageFile = (file: any) => {
    const imageExts = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif',
      'svg', 'svgz', 'ico', 'tiff', 'tif',
      'raw', 'cr2', 'nef', 'arw', 'dng'
    ]
    const ext = file.ext?.toLowerCase().replace('.', '')
    return imageExts.includes(ext)
  }

  // 判断是否为视频文件
  const isVideoFile = (file: any) => {
    const videoExts = [
      'mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv',
      'm4v', 'mpeg', 'mpg', '3gp', '3g2',
      'rmvb', 'rm', 'asf', 'ts', 'mts'
    ]
    const ext = file.ext?.toLowerCase().replace('.', '')
    return videoExts.includes(ext)
  }

  // 解析文件大小字符串
  const parseFileSize = (sizeStr: string): number => {
    const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
    const match = sizeStr.match(/^([\d.]+)\s*(\w+)$/)
    if (!match) return 0
    return parseFloat(match[1]) * (units[match[2]] || 1)
  }

  // 智能获取缩略图 URL
  const getThumbnailUrl = (file: any): string | null => {
    const sizeBytes = parseFileSize(file.size || '0 B')
    const library = file.library || 0

    // 1. 小图片（<500KB）：直接返回原图路径
    if (isImageFile(file) && sizeBytes < 500 * 1024) {
      return `/api/media/file?library=${library}&path=${encodeURIComponent(file.fullPath || file.path)}`
    }

    // 2. 大图片（>=500KB）：使用 Canvas 前端压缩
    if (isImageFile(file) && sizeBytes >= 500 * 1024) {
      // return `canvas:${library}:${encodeURIComponent(file.fullPath || file.path)}`
      return `/api/media/thumbnail?library=${library}&path=${encodeURIComponent(file.fullPath || file.path)}`
    }

    // 3. 视频文件：优先使用后端 FFmpeg 生成缩略图
    if (isVideoFile(file)) {
      return `/api/media/thumbnail?library=${library}&path=${encodeURIComponent(file.fullPath || file.path)}`
    }

    return null
  }

  // 判断是否需要生成缩略图
  const shouldGenerateThumbnail = (file: any) => {
    const url = getThumbnailUrl(file)
    if (!url) return false

    // 大图片需要前端 Canvas 压缩
    if (url.startsWith('canvas:')) return true

    // 视频文件需要 Canvas 元素显示后端缩略图
    if (url.includes('/api/media/thumbnail') && isVideoFile(file)) return true

    return false
  }

  // 从缓存获取缩略图
  const getCachedThumbnail = (cacheKey: string): string | undefined => {
    return thumbnailCache.get(cacheKey)
  }

  // 缓存缩略图
  const cacheThumbnail = (cacheKey: string, dataUrl: string) => {
    thumbnailCache.set(cacheKey, dataUrl)
  }

  // 生成缓存键
  const generateCacheKey = (file: any): string => {
    return `${file.path}:${file.mtime || ''}:${file.size || ''}`
  }

  // // Canvas 生成缩略图（支持图片和视频）
  const generateThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    try {
      // 检查缓存
      if (thumbnailCache.has(src)) {
        const cached = thumbnailCache.get(src)
        if (cached) {
          const img = new Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = cached
          })

          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = 300
            canvas.height = 300
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 保持比例居中绘制
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
            const drawWidth = img.width * scale
            const drawHeight = img.height * scale
            const drawX = (canvas.width - drawWidth) / 2
            const drawY = (canvas.height - drawHeight) / 2
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
          }

          canvas.dataset.loaded = 'true'
          return
        }
      }

      // 判断是否为视频文件
      const isVideo = (src.includes('/api/media/file') || src.includes('/api/media/thumbnail')) &&
        /\.(mp4|avi|mov|mkv|wmv|flv|webm)$/i.test(decodeURIComponent(src))

      if (isVideo) {
        await generateVideoThumbnail(canvas, src)
      } else {
        await generateImageThumbnail(canvas, src)
      }

      // 加入缓存
      const dataUrl = canvas.toDataURL('image/png')
      cacheThumbnail(src, dataUrl)
    } catch (error) {
      console.error('[Thumbnail] Generation failed:', error)
      throw error
    }
  }

  // 带并发控制的缩略图生成（增强版：支持暂停）
  const generateThumbnailWithControl = async (canvas: HTMLCanvasElement, src: string) => {
    return new Promise<void>((resolve, reject) => {
      // 超时保护
      const timeoutId = setTimeout(() => {
        console.warn(`[超时] ${src} - 8 秒未生成成功`)
        showPlaceholder(canvas)
        resolve()
      }, 8000)

      // 执行实际生成
      const execute = async () => {
        try {
          await generateThumbnail(canvas, src)
          clearTimeout(timeoutId)
          resolve()
        } catch (error) {
          clearTimeout(timeoutId)
          reject(error)
        } finally {
          processingCount.value--
          // 处理队列中的下一个
          if (processQueue.length > 0) {
            const next = processQueue.shift()
            if (next) next()
          }
        }
      }

      // 如果暂停，加入等待队列
      if (isPaused.value) {
        pausedQueue.push({ canvas, src, resolve, reject })
        return
      }

      // 检查并发数
      if (processingCount.value >= maxConcurrent) {
        // 加入队列
        processQueue.push(execute)
      } else {
        // 立即执行
        processingCount.value++
        execute()
      }
    })
  }

  // 暂停缩略图生成
  const pauseGeneration = () => {
    isPaused.value = true
  }

  // 恢复缩略图生成
  const resumeGeneration = () => {
    isPaused.value = false

    // 处理所有等待的任务
    while (pausedQueue.length > 0 && processingCount.value < maxConcurrent) {
      const task = pausedQueue.shift()
      if (task) {
        processingCount.value++
        generateThumbnailWithControl(task.canvas, task.src)
          .then(task.resolve)
          .catch(task.reject)
      }
    }
  }

  // 清空等待队列（用于切换媒体库时）
  const clearPausedQueue = () => {
    pausedQueue.length = 0
    processQueue.length = 0
    processingCount.value = 0
  }

  // 图片缩略图生成
  const generateImageThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    try {
      // 处理 canvas:前缀的 URL
      let imageUrl = src
      if (src.startsWith('canvas:')) {
        const withoutPrefix = src.substring(7)
        const firstColonIndex = withoutPrefix.indexOf(':')
        if (firstColonIndex !== -1) {
          const library = withoutPrefix.substring(0, firstColonIndex)
          const encodedPath = withoutPrefix.substring(firstColonIndex + 1)
          imageUrl = `/api/media/file?library=${library}&path=${encodedPath}`
        } else {
          imageUrl = `/api/media/file?path=${withoutPrefix}`
        }
      }

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error(`图片加载失败：${imageUrl}`))
        img.src = imageUrl
      })

      // 计算方向
      const aspectRatio = img.width / img.height
      let orientationClass = ''
      if (aspectRatio > 1.2) {
        orientationClass = 'landscape'
      } else if (aspectRatio < 0.8) {
        orientationClass = 'portrait'
      } else {
        orientationClass = 'square'
      }
      canvas.dataset.orientation = orientationClass

      // 绘制缩略图
      canvas.width = 300
      canvas.height = 300

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 保持比例居中绘制
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
        const drawWidth = img.width * scale
        const drawHeight = img.height * scale
        const drawX = (canvas.width - drawWidth) / 2
        const drawY = (canvas.height - drawHeight) / 2

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      }
    } catch (error) {
      throw error
    }
  }

  // 视频封面生成（优先后端 FFmpeg，降级到前端 Canvas）
  const generateVideoThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    try {
      // 判断是否是后端 thumbnail 接口 URL
      const isBackendThumbnail = src.includes('/api/media/thumbnail')

      if (isBackendThumbnail) {
        // 方案 1：使用后端 FFmpeg 生成的缩略图
        return await generateFromBackendThumbnail(canvas, src)
      } else {
        // 方案 2：降级到前端 Canvas 抽取视频帧
        return await generateFromVideoFrame(canvas, src)
      }
    } catch (error) {
      console.error('[视频缩略图生成失败]:', error)
      throw error
    }
  }

  // 从后端 thumbnail 接口加载缩略图
  const generateFromBackendThumbnail = async (canvas: HTMLCanvasElement, thumbnailUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      // 超时保护（15 秒）
      const timeoutId = setTimeout(() => {
        generateFromVideoFrame(canvas, thumbnailUrl).then(resolve).catch(reject)
      }, 15000)

      img.onload = () => {
        clearTimeout(timeoutId)

        if (img.width > 0 && img.height > 0) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = 300
            canvas.height = 300
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 保持比例居中绘制
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
            const drawWidth = img.width * scale
            const drawHeight = img.height * scale
            const drawX = (canvas.width - drawWidth) / 2
            const drawY = (canvas.height - drawHeight) / 2

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

            // 设置方向信息
            const aspectRatio = img.width / img.height
            let orientationClass = ''
            if (aspectRatio > 1.2) {
              orientationClass = 'landscape'
            } else if (aspectRatio < 0.8) {
              orientationClass = 'portrait'
            } else {
              orientationClass = 'square'
            }
            canvas.dataset.orientation = orientationClass
            canvas.dataset.loaded = 'true'
          }
          resolve()
        } else {
          generateFromVideoFrame(canvas, thumbnailUrl).then(resolve).catch(reject)
        }
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        generateFromVideoFrame(canvas, thumbnailUrl).then(resolve).catch(reject)
      }

      img.src = thumbnailUrl
    })
  }

  // 从视频文件抽取帧生成缩略图（降级方案）
  const generateFromVideoFrame = async (canvas: HTMLCanvasElement, src: string) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.muted = true

    // 解析 URL
    let videoUrl = src
    if (src.startsWith('canvas:')) {
      const withoutPrefix = src.substring(7)
      const firstColonIndex = withoutPrefix.indexOf(':')
      if (firstColonIndex !== -1) {
        const library = withoutPrefix.substring(0, firstColonIndex)
        const encodedPath = withoutPrefix.substring(firstColonIndex + 1)
        videoUrl = `/api/media/file?library=${library}&path=${encodedPath}`
      } else {
        videoUrl = `/api/media/file?path=${withoutPrefix}`
      }
    }

    return new Promise<void>((resolve) => {
      let hasResolved = false

      video.addEventListener('loadeddata', () => {
        const targetTime = Math.min(1, Math.max(0.1, (video.duration || 1) / 3))
        video.currentTime = targetTime

        // 计算方向
        const aspectRatio = (video.videoWidth || 400) / (video.videoHeight || 300)
        let orientationClass = ''
        if (aspectRatio > 1.2) {
          orientationClass = 'landscape'
        } else if (aspectRatio < 0.8) {
          orientationClass = 'portrait'
        } else {
          orientationClass = 'square'
        }
        canvas.dataset.orientation = orientationClass

        // 初始化 Canvas
        canvas.width = 300
        canvas.height = 300
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      })

      video.addEventListener('seeked', () => {
        if (hasResolved) return
        hasResolved = true

        try {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 保持比例居中绘制
            const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
            const drawWidth = video.videoWidth * scale
            const drawHeight = video.videoHeight * scale
            const drawX = (canvas.width - drawWidth) / 2
            const drawY = (canvas.height - drawHeight) / 2

            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)
            canvas.dataset.loaded = 'true'
          }
          resolve()
        } catch (drawError) {
          showVideoPlaceholder(canvas)
          resolve()
        }
      })

      video.addEventListener('error', () => {
        if (hasResolved) return
        hasResolved = true
        showVideoPlaceholder(canvas)
        resolve()
      })

      // 超时保护（10 秒）
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true
          showVideoPlaceholder(canvas)
          resolve()
        }
      }, 10000)

      video.src = videoUrl
    })
  }

  // 显示占位符（通用）
  const showPlaceholder = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ccc'
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('📁', canvas.width / 2, canvas.height / 2)
  }

  // 显示视频占位图标
  const showVideoPlaceholder = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制播放按钮（三角形）
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const size = 30

    ctx.fillStyle = '#18a058'
    ctx.beginPath()
    ctx.moveTo(centerX - size / 2, centerY - size / 2)
    ctx.lineTo(centerX + size / 2, centerY)
    ctx.lineTo(centerX - size / 2, centerY + size / 2)
    ctx.closePath()
    ctx.fill()

    // 绘制外圈
    ctx.strokeStyle = '#18a058'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(centerX, centerY, size * 0.8, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 监听 Canvas 元素渲染（带并发控制和预加载）
  const observeCanvases = () => {
    // 重要：清除所有 Canvas 的 processed 标记，允许重新观察
    // 这样可以确保刷新或导航后，所有 Canvas 都能被重新处理
    const allCanvases = document.querySelectorAll('.media-thumbnail')
    allCanvases.forEach(canvas => {
      delete (canvas as HTMLElement).dataset.processed
    })

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const canvas = entry.target as HTMLCanvasElement

          if (canvas.dataset.src && !canvas.dataset.processed) {
            canvas.dataset.processed = 'true'
            generateThumbnailWithControl(canvas, canvas.dataset.src)
              .catch(err => console.error(`[缩略图失败] ${canvas.dataset.src}:`, err))
          }
        } else if (entry.intersectionRatio === 0 && entry.isIntersecting === false) {
          // 元素完全离开视口，标记为未处理以便重新进入时可以再次加载
          const canvas = entry.target as HTMLCanvasElement
          if (canvas.dataset.processed) {
            delete canvas.dataset.processed
          }
        }
      })

      // 预加载策略：检测视口附近的元素
      // 获取所有可见的 canvas
      const visibleCanvases = entries
        .filter(e => e.isIntersecting && e.target instanceof HTMLCanvasElement)
        .map(e => e.target as HTMLCanvasElement)

      if (visibleCanvases.length > 0) {
        // 找到视口中的最后一个可见元素
        const lastVisible = visibleCanvases[visibleCanvases.length - 1]

        // 预加载下一个元素（如果存在）
        const canvasesArray = Array.from(allCanvases)
        const lastIndex = canvasesArray.indexOf(lastVisible)

        if (lastIndex !== -1 && lastIndex + 1 < canvasesArray.length) {
          const nextCanvas = canvasesArray[lastIndex + 1] as HTMLCanvasElement
          const nextSrc = nextCanvas.dataset.src

          if (nextSrc && !nextCanvas.dataset.processed && processingCount.value < maxConcurrent) {
            nextCanvas.dataset.processed = 'true'
            generateThumbnailWithControl(nextCanvas, nextSrc)
              .catch(err => console.warn(`[预加载失败] ${nextSrc}:`, err))
          }
        }
      }
    }, { rootMargin: '100px' })

    // 等待下一个 tick 确保 DOM 已更新
    setTimeout(() => {
      // 获取所有需要生成缩略图的 canvas 元素（支持两种类名）
      const canvases = document.querySelectorAll('.media-thumbnail[data-src]:not([data-processed="true"])')

      canvases.forEach(canvas => {
        observer.observe(canvas)
      })
    }, 100)

    return observer
  }

  return {
    canvasRefs,
    isImageFile,
    isVideoFile,
    parseFileSize,
    getThumbnailUrl,
    shouldGenerateThumbnail,
    generateThumbnail,
    generateThumbnailWithControl,
    observeCanvases,
    getCachedThumbnail,
    cacheThumbnail,
    generateCacheKey,
    // 新增：暂停/恢复控制
    pauseGeneration,
    resumeGeneration,
    clearPausedQueue
  }
}
