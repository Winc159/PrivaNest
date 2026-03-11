import { ref } from 'vue'

/**
 * 缩略图生成 Hook
 * 用于处理大图片的前端 Canvas 压缩
 */
export function useThumbnail() {

  const canvasRefs = ref<HTMLCanvasElement[]>([])

  // 判断是否为图片文件
  const isImageFile = (file: any) => {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    return imageExts.some(ext => file.ext?.toLowerCase() === ext)
  }

  // 判断是否为视频文件
  const isVideoFile = (file: any) => {
    const videoExts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv']
    return videoExts.some(ext => file.ext?.toLowerCase() === ext)
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

  // Canvas 生成缩略图（支持图片和视频）
  const generateThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    try {
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
    } catch (error) {
      console.error('缩略图生成失败:', error)

      // 加载失败时显示灰色背景
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(0, 0, canvas.width || 300, canvas.height || 300)
        ctx.fillStyle = '#999'
        ctx.font = '14px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('加载失败', (canvas.width || 300) / 2, (canvas.height || 300) / 2)
      }
    }
  }

  // 图片缩略图生成
  const generateImageThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => {
          console.error(`图片加载失败：${src}`)
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
      console.error('图片缩略图生成失败:', error)
      throw error
    }
  }

  // 视频封面生成（前端 Canvas 抽取帧）
  const generateVideoThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
    try {
      console.log('🎬 开始生成视频封面:', src)

      // 创建隐藏的 video 元素
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.preload = 'metadata'
      video.muted = true

      return new Promise<void>((resolve) => {
        let hasResolved = false

        // 视频加载成功
        video.addEventListener('loadeddata', () => {
          console.log('✅ 视频加载成功，时长:', video.duration)

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
            console.log('⏩ 已跳转到时间点:', video.currentTime)
            
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
            
            console.log('✅ 视频封面生成成功')
            resolve()
          } catch (drawError) {
            console.error('❌ 绘制失败:', drawError)
            showVideoPlaceholder(canvas)
            resolve()
          }
        })

        // 错误处理
        video.addEventListener('error', (e) => {
          if (hasResolved) return
          hasResolved = true

          console.warn('❌ 视频加载失败:', src, e)
          showVideoPlaceholder(canvas)
          resolve()
        })

        // 超时保护（10 秒）
        setTimeout(() => {
          if (!hasResolved) {
            console.warn('⏰ 视频加载超时:', src)
            hasResolved = true
            showVideoPlaceholder(canvas)
            resolve()
          }
        }, 10000)

        // 开始加载视频
        video.src = src
      })
    } catch (error) {
      console.error('❌ 视频封面生成异常:', error)
      showVideoPlaceholder(canvas)
    }
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

    console.log('📺 显示视频占位图标')
  }

  // 监听 Canvas 元素渲染
  const observeCanvases = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const canvas = entry.target as HTMLCanvasElement

          if (canvas.dataset.src && !canvas.dataset.processed) {
            canvas.dataset.processed = 'true'
            generateThumbnail(canvas, canvas.dataset.src)
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
    observeCanvases
  }
}
