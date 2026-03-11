<script setup lang="ts">
import { NIcon, NImage } from 'naive-ui'
import { FolderOutline, VideocamOutline } from '@vicons/ionicons5'
import { ref, computed, watch } from 'vue'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
}

interface Props {
  file: FileData
  isFolder?: boolean
  viewMode?: 'grid' | 'list'
  thumbnailUrl?: string | null
  shouldGenerateThumbnail?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFolder: false,
  viewMode: 'grid',
  thumbnailUrl: null,
  shouldGenerateThumbnail: false
})

const emit = defineEmits<{
  click: [file: FileData]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const videoCanvasRef = ref<HTMLCanvasElement | null>(null)
const videoThumbnailGenerated = ref(false)

// 监听 Canvas 数据属性变化
watch(() => canvasRef.value?.dataset.orientation, (newOrientation) => {
  if (newOrientation) {
    imageOrientation.value = newOrientation as 'landscape' | 'portrait' | 'square'
    imageLoaded.value = true
  }
}, { immediate: true })

const handleClick = () => {
  emit('click', props.file)
}

// 检测图片方向并设置合适的显示比例
const imageFit = ref<'cover' | 'contain'>('contain')
const imageOrientation = ref<'landscape' | 'portrait' | 'square'>('landscape')
const imageLoaded = ref(false)

const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    updateImageOrientation(img.naturalWidth, img.naturalHeight)
  }
  imageLoaded.value = true
}

// 更新图片方向
const updateImageOrientation = (width: number, height: number) => {
  const aspectRatio = width / height
  
  // 放宽阈值，让更多竖排图能被正确识别
  if (aspectRatio > 1.1) {
    // 横拍图：宽/高 > 1.1（如 4:3=1.33, 16:9=1.78）
    imageOrientation.value = 'landscape'
    imageFit.value = 'cover'
  } else if (aspectRatio < 0.9) {
    // 竖拍图：宽/高 < 0.9（如 3:4=0.75, 9:16=0.56）
    imageOrientation.value = 'portrait'
    imageFit.value = 'cover'
  } else {
    // 正方形：0.9 <= 宽/高 <= 1.1（如 1:1=1）
    imageOrientation.value = 'square'
    imageFit.value = 'cover'
  }
}

// 判断是否为视频文件
const isVideoFile = computed(() => {
  const ext = props.file.ext?.toLowerCase()
  // 移除前导点号，兼容 .mp4 和 mp4 两种格式
  const cleanExt = ext?.replace('.', '')
  return cleanExt && ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'].includes(cleanExt)
})

// 获取视频文件 URL
const getVideoFileUrl = computed(() => {
  if (!isVideoFile.value) return null
  const filePath = props.file.fullPath || props.file.path
  return `/api/media/file?path=${encodeURIComponent(filePath)}`
})

// 前端 Canvas 抽取视频封面（无需 FFmpeg）
const generateVideoThumbnail = async () => {
  if (!videoCanvasRef.value || !isVideoFile.value || videoThumbnailGenerated.value) return
  
  try {
    // 创建隐藏的 video 元素
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.muted = true
    
    // 获取视频文件 URL
    const videoUrl = getVideoFileUrl.value
    if (!videoUrl) return
    
    // 创建 Canvas
    const canvas = videoCanvasRef.value
    const ctx = canvas.getContext('2d', { alpha: false })
    
    if (!ctx) {
      console.error('Canvas context not available')
      return
    }
    
    return new Promise<void>((resolve) => {
      let hasResolved = false
      
      // 视频加载成功
      video.addEventListener('loadeddata', () => {
        // 计算截图时间点：第 1 秒或视频时长的 1/3，取较小值
        const targetTime = Math.min(1, Math.max(0.1, (video.duration || 1) / 3))
        video.currentTime = targetTime
        
        // 统一设置为 4:3 比例的 Canvas
        canvas.width = 400
        canvas.height = 300
        
        // 填充黑色背景
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // 绘制加载提示
        ctx.fillStyle = '#666'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2)
      })
      
      // 跳转到指定时间点
      video.addEventListener('seeked', () => {
        if (hasResolved) return
        hasResolved = true
        
        try {
          // 绘制视频帧到 Canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // 标记为已生成
          videoThumbnailGenerated.value = true
          
          resolve()
        } catch (drawError) {
          console.error('Failed to draw video frame:', drawError)
          showVideoPlaceholder(ctx)
          resolve()
        }
      })
      
      // 错误处理
      video.addEventListener('error', () => {
        if (hasResolved) return
        hasResolved = true
        
        console.warn('Failed to load video:', props.file.name)
        
        if (ctx) {
          showVideoPlaceholder(ctx)
        }
        
        videoThumbnailGenerated.value = true
        resolve()
      })
      
      // 超时保护（10 秒）
      setTimeout(() => {
        if (!hasResolved) {
          console.warn('Video loading timeout:', props.file.name)
          hasResolved = true
          
          if (ctx) {
            showVideoPlaceholder(ctx)
          }
          
          videoThumbnailGenerated.value = true
          resolve()
        }
      }, 10000)
      
      // 开始加载视频
      video.src = videoUrl
    })
  } catch (error) {
    console.error('Error generating video thumbnail:', props.file.name, error)
  }
}

// 显示视频占位图标
const showVideoPlaceholder = (ctx: CanvasRenderingContext2D) => {
  const canvas = ctx.canvas
  
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

// 组件挂载后生成视频封面
onMounted(() => {
  if (isVideoFile.value && videoCanvasRef.value && !videoThumbnailGenerated.value) {
    // 使用 IntersectionObserver 实现懒加载
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          generateVideoThumbnail()
          observer.disconnect()
        }
      })
    }, { rootMargin: '100px' })
    
    observer.observe(videoCanvasRef.value)
  }
})
</script>

<template>
  <div 
    :class="['media-item', isFolder ? 'folder' : 'file', viewMode, isFolder ? 'square' : imageOrientation]"
    @click="handleClick"
  >
    <!-- 文件夹 -->
    <template v-if="isFolder">
      <div class="media-wrapper square folder-wrapper">
        <n-icon size="64" color="#667eea" class="folder-icon">
          <FolderOutline />
        </n-icon>
      </div>
      <div class="media-name">{{ file.name }}</div>
    </template>
    
    <!-- 文件 -->
    <template v-else>
      <div class="media-wrapper" :class="[imageOrientation, { 'video-wrapper': isVideoFile }]">
        <!-- Canvas 前端压缩（大图片和视频） -->
        <canvas 
          v-if="shouldGenerateThumbnail || isVideoFile" 
          class="media-thumbnail"
          :data-src="`/api/media/file?path=${encodeURIComponent(props.file.fullPath || props.file.path)}`"
          ref="canvasRef"
        />
        
        <!-- NImage 组件加载小图片 -->
        <n-image
          v-else-if="thumbnailUrl && !thumbnailUrl.startsWith('canvas:')"
          :src="thumbnailUrl"
          :alt="file.name"
          class="media-thumbnail"
          :object-fit="imageFit"
          @load="handleImageLoad"
          preview-disabled
        />
        
        <!-- 降级：显示图标（仅在 Canvas 生成失败时） -->
        <n-icon v-else-if="isVideoFile && !shouldGenerateThumbnail" class="video-icon" size="64" color="#18a058">
          <VideocamOutline />
        </n-icon>
      </div>
      <div class="media-name">{{ file.name }}</div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.media-item {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  
  // 网格模式 - macOS Finder 风格
  &.grid {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: space-between;
    
    .media-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent; // 透明背景，无颜色
      transition: all 0.3s ease;
      
      // 横拍图容器：4:3 比例
      &.landscape {
        padding-top: 2cqh; // 宽/高 = 4/3 ≈ 1.33
      }
      
      // 竖拍图容器：4:3 比例
      &.portrait {
        padding-top: 25%; // 统一为 4:3
      }
      
      // 正方形图容器：4:3 比例
      &.square {
        padding-top: 25%; // 统一为 4:3
      }
      
      // 未加载时默认 4:3
      &:not(.landscape):not(.portrait):not(.square) {
        padding-top: 25%;
      }
      
      // 视频文件样式（简约图标）
      &.video-wrapper {
        background: transparent; // 透明背景
        
        .video-icon {
          font-size: 48px;
          transition: transform 0.3s ease;
        }
        
        &:hover {
          .video-icon {
            transform: scale(1.1);
          }
        }
      }
      // 文件夹样式（简约图标）
      &.folder-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent; // 透明背景
        
        .folder-icon {
          font-size: 48px;
          transition: transform 0.3s ease;
        }
        
        &:hover {
          .folder-icon {
            transform: scale(1.1);
          }
        }
      }
      
      .media-thumbnail {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transition: transform 0.3s ease;
      }
      
      // 图片 hover 效果：只有图片本身浮起
      &:hover {
        .media-thumbnail {
          transform: scale(1.05);
        }
      }
    }
    
    .media-name {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.4;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
      color: #666;
      width: 100%;
    }
  }
  
  // 列表模式
  &.list {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    background: white;
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #f8f9fa;
      transform: translateX(4px);
    }
    
    .media-wrapper {
      position: relative;
      width: 100px;
      height: 80px;
      flex-shrink: 0;
      overflow: hidden;
      background: transparent; // 列表模式也使用透明背景
      border-radius: 8px;
      
      .media-thumbnail {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
    
    .media-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  // 文件夹名称特殊样式
  &.folder.grid {
    .media-name {
      color: #667eea;
      font-weight: 500;
    }
  }
}
</style>