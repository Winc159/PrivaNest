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

    // 1. 小图片（<500KB）：直接返回原图路径，用 CSS 缩放
    if (isImageFile(file) && sizeBytes < 500 * 1024) {
      return `/api/media/file?library=${library}&path=${encodeURIComponent(file.fullPath || file.path)}`
    }

    // 2. 大图片（>=500KB）：使用 Canvas 前端压缩
    if (isImageFile(file) && sizeBytes >= 500 * 1024) {
      return `canvas:${library}:${encodeURIComponent(file.fullPath || file.path)}`
    }

    // 3. 视频文件：统一使用 Canvas 前端生成封面
    if (isVideoFile(file)) {
      return `canvas:${library}:${encodeURIComponent(file.fullPath || file.path)}`
    }

    return null
  }

  // 判断是否需要生成缩略图（大图片需要）
  const shouldGenerateThumbnail = (file: any) => {
    const url = getThumbnailUrl(file)
    return url?.startsWith('canvas:')
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

  // Canvas 生成缩略图（支持图片和视频）
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

          // 保持与原始生成一致的绘制逻辑
          const ctx = canvas.getContext('2d')
          if (ctx) {
            // 固定 Canvas 尺寸
            canvas.width = 300
            canvas.height = 300

            // 清空画布（透明背景）
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 使用 contain 模式，保持宽高比居中绘制
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
      const isVideo = src.includes('/api/media/file') &&
        /\.(mp4|avi|mov|mkv|wmv|flv|webm)$/i.test(src)

      if (isVideo) {
        // 视频封面生成
        await generateVideoThumbnail(canvas, src)
      } else {
        // 图片缩略图生成
        await generateImageThumbnail(canvas, src)
      }

      // ✅ 加入缓存 - 使用 PNG 格式以支持透明背景（JPEG 不支持透明）
      const dataUrl = canvas.toDataURL('image/png')
      cacheThumbnail(src, dataUrl)
    } catch (error) {
      console.error(`[缩略图生成失败] ${src}:`, error)
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
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      // 处理 canvas: 前缀的 URL（格式：canvas:${library}:${encodedPath}）
      let imageUrl = src
      if (src.startsWith('canvas:')) {
        // 移除 canvas: 前缀
        const withoutPrefix = src.substring(7)
        // 分割 library 和 path
        const firstColonIndex = withoutPrefix.indexOf(':')
        if (firstColonIndex !== -1) {
          const library = withoutPrefix.substring(0, firstColonIndex)
          const encodedPath = withoutPrefix.substring(firstColonIndex + 1)
          // 构建实际的 API URL
          imageUrl = `/api/media/file?library=${library}&path=${encodedPath}`
        } else {
          // 兼容旧格式（没有 library）
          imageUrl = `/api/media/file?path=${withoutPrefix}`
        }
      }

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => {
          reject(new Error(`图片加载失败：${imageUrl}`))
        }
        img.src = imageUrl
      })

      // 计算宽高比，智能选择显示策略
      const aspectRatio = img.width / img.height

      // 根据图片方向设置 Canvas 容器的纵横比（通过 CSS 类名）
      let orientationClass = ''
      if (aspectRatio > 1.2) {
        orientationClass = 'landscape'
      } else if (aspectRatio < 0.8) {
        orientationClass = 'portrait'
      } else {
        orientationClass = 'square'
      }

      // 将方向信息存储到 dataset，供 CSS 使用
      canvas.dataset.orientation = orientationClass

      // 固定 Canvas 尺寸（实际渲染由 CSS 控制）
      canvas.width = 300
      canvas.height = 300

      const ctx = canvas.getContext('2d')
      if (ctx) {
        // 背景填充（透明）
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 统一使用 contain 模式，完整显示图片
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
        const drawWidth = img.width * scale
        const drawHeight = img.height * scale
        const drawX = (canvas.width - drawWidth) / 2
        const drawY = (canvas.height - drawHeight) / 2

        // 绘制缩放后的图片
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      }
    } catch (error) {
      throw error
    }
  }

  // 视频封面生成（前端 Canvas 抽取帧）
  const generateVideoThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    try {
      // 创建隐藏的 video 元素
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.preload = 'metadata'
      video.muted = true

      // 处理 canvas: 前缀的 URL（格式：canvas:${library}:${encodedPath}）
      let videoUrl = src
      if (src.startsWith('canvas:')) {
        // 移除 canvas: 前缀
        const withoutPrefix = src.substring(7)
        // 分割 library 和 path
        const firstColonIndex = withoutPrefix.indexOf(':')
        if (firstColonIndex !== -1) {
          const library = withoutPrefix.substring(0, firstColonIndex)
          const encodedPath = withoutPrefix.substring(firstColonIndex + 1)
          // 构建实际的 API URL
          videoUrl = `/api/media/file?library=${library}&path=${encodedPath}`
        } else {
          // 兼容旧格式（没有 library）
          videoUrl = `/api/media/file?path=${withoutPrefix}`
        }
      }

      return new Promise<void>((resolve) => {
        let hasResolved = false

        // 视频加载成功
        video.addEventListener('loadeddata', () => {
          // 计算截图时间点：第 1 秒或视频时长的 1/3，取较小值
          const targetTime = Math.min(1, Math.max(0.1, (video.duration || 1) / 3))
          video.currentTime = targetTime

          // 计算视频方向
          const videoWidth = video.videoWidth || 400
          const videoHeight = video.videoHeight || 300
          const aspectRatio = videoWidth / videoHeight

          let orientationClass = ''
          if (aspectRatio > 1.2) {
            orientationClass = 'landscape'
          } else if (aspectRatio < 0.8) {
            orientationClass = 'portrait'
          } else {
            orientationClass = 'square'
          }

          // 将方向信息存储到 dataset
          canvas.dataset.orientation = orientationClass

          // 固定 Canvas 尺寸
          canvas.width = 300
          canvas.height = 300

          // 填充黑色背景
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#000000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // 绘制加载提示
            ctx.fillStyle = '#666'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2)
          }
        })

        // 跳转到指定时间点
        video.addEventListener('seeked', () => {
          if (hasResolved) return
          hasResolved = true

          try {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              // 清空画布（透明背景）
              ctx.clearRect(0, 0, canvas.width, canvas.height)

              // 绘制视频帧（保持比例，居中显示）
              const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
              const drawWidth = video.videoWidth * scale
              const drawHeight = video.videoHeight * scale
              const drawX = (canvas.width - drawWidth) / 2
              const drawY = (canvas.height - drawHeight) / 2

              ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)
            }

            resolve()
          } catch (drawError) {
            showVideoPlaceholder(canvas)
            resolve()
          }
        })

        // 错误处理
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

        // 开始加载视频
        video.src = videoUrl
      })
    } catch (error) {
      showVideoPlaceholder(canvas)
    }
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
