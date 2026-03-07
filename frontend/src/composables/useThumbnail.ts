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
    const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024*1024, GB: 1024*1024*1024 }
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
    
    // 3. 视频文件：暂时返回 null 显示图标
    if (isVideoFile(file)) {
      return null
    }
    
    return null
  }

  // 判断是否需要生成缩略图（大图片需要）
  const shouldGenerateThumbnail = (file: any) => {
    const url = getThumbnailUrl(file)
    return url?.startsWith('canvas:')
  }

  // Canvas 生成缩略图
  const generateThumbnail = async (canvas: HTMLCanvasElement, src: string) => {
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
      console.error('缩略图生成失败:', error)
      // 如果是视频文件，设置默认的 landscape 标识
      if (src.includes('/api/media/file')) {
        const urlParams = new URLSearchParams(src.split('?')[1])
        const path = urlParams.get('path') || ''
        const extMatch = path.match(/\.(\w+)$/i)
        const ext = extMatch ? extMatch[1].toLowerCase() : ''
        
        if (['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'].includes(ext)) {
          // 视频文件默认为横拍比例
          canvas.dataset.orientation = 'landscape'
        }
      }
      
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
