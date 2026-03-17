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
 */
export function useThumbnail() {

  const canvasRefs = ref<HTMLCanvasElement[]>([])
  
  // LRU 缓存：存储已生成的缩略图
  const thumbnailCache = new LRUCache<string, string>(100)
  
  // 并发控制
  const processingCount = ref(0)
  const maxConcurrent = 5
  const processQueue: Array<() => void> = []

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

    // 1. 小图片（<500KB）：直接返回原图路径，用 CSS 缩放
    if (isImageFile(file) && sizeBytes < 500 * 1024) {
      return `/api/media/file?path=${encodeURIComponent(file.fullPath || file.path)}`
    }

    // 2. 大图片（>=500KB）：使用 Canvas 前端压缩
    if (isImageFile(file) && sizeBytes >= 500 * 1024) {
      return `canvas:${encodeURIComponent(file.fullPath || file.path)}`
    }

    // 3. 视频文件：统一使用 Canvas 前端生成封面
    if (isVideoFile(file)) {
      return `canvas:${encodeURIComponent(file.fullPath || file.path)}`
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
      const cacheKey = src
      const cached = getCachedThumbnail(cacheKey)
      if (cached) {
        console.log(`[缓存命中] ${src}`)
        // 从缓存加载
        const img = new Image()
        img.onload = () => {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          }
        }
        img.src = cached
        return
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
      
      // 加入缓存
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      cacheThumbnail(cacheKey, dataUrl)
    } catch (error) {
      console.error(`[缩略图生成失败] ${src}:`, error)
      throw error
    }
  }

  // 带并发控制的缩略图生成
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

      // 检查并发数
      if (processingCount.value >= maxConcurrent) {
        // 加入队列
        processQueue.push(execute)
        console.log(`[排队等待] ${src} - 当前队列长度：${processQueue.length}`)
      } else {
        // 立即执行
        processingCount.value++
        execute()
      }
    })
  }

  // 图片缩略图生成
  const generateImageThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => {
          reject(new Error(`图片加载失败：${src}`))
        }
        img.src = src
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
        video.src = src
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

  // 监听 Canvas 元素渲染（带并发控制）
  const observeCanvases = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const canvas = entry.target as HTMLCanvasElement

          if (canvas.dataset.src && !canvas.dataset.processed) {
            canvas.dataset.processed = 'true'
            generateThumbnailWithControl(canvas, canvas.dataset.src)
              .catch(err => console.error(`[缩略图失败] ${canvas.dataset.src}:`, err))
          }
        }
      })
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
    generateCacheKey
  }
}
