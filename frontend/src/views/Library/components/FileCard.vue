<script setup lang="ts">
import { NIcon, NImage } from 'naive-ui'
import { FolderOutline, VideocamOutline } from '@vicons/ionicons5'
import { ref, computed } from 'vue'

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

const imageFit = ref<'cover' | 'contain'>('contain')
const imageOrientation = ref<'landscape' | 'portrait' | 'square'>('landscape')
const imageLoaded = ref(false)

const handleClick = () => {
  emit('click', props.file)
}

// 检测图片方向并设置合适的显示比例
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
  return cleanExt && [
    'mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv',
    'm4v', 'mpeg', 'mpg', '3gp', '3g2',
    'rmvb', 'rm', 'asf', 'ts', 'mts'
  ].includes(cleanExt)
})

</script>

<template>
  <div :class="['media-item', isFolder ? 'folder' : 'file', viewMode, isFolder ? 'square' : imageOrientation]"
    @click="handleClick">
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
        <!-- 统一使用 NImage 组件加载缩略图 -->
        <n-image v-if="thumbnailUrl" :src="thumbnailUrl" :alt="file.name" class="media-thumbnail" :object-fit="imageFit"
          @load="handleImageLoad" preview-disabled />

        <!-- 降级：显示视频图标（当没有缩略图时） -->
        <n-icon v-else-if="isVideoFile" class="video-icon" size="64" color="#18a058">
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

      // // 横拍图容器：4:3 比例
      // &.landscape {
      //   padding-top: 25%; // 高/宽 = 3/4 = 0.75
      // }

      // // 竖拍图容器：3:4 比例
      // &.portrait {
      //   padding-top: 25%; // 高/宽 = 4/3 ≈ 1.33
      // }

      // // 正方形图容器：1:1 比例
      // &.square {
      //   padding-top: 25%; // 高/宽 = 1
      // }

      // // 未加载时默认 4:3
      // &:not(.landscape):not(.portrait):not(.square) {
      //   padding-top: 25%;
      // }

      // // 视频文件也支持横屏竖屏方向
      // &.video-wrapper.landscape {
      //   padding-top: 25%;
      // }

      // &.video-wrapper.portrait {
      //   padding-top: 133.33%;
      // }

      // &.video-wrapper.square {
      //   padding-top: 100%;
      // }

      // // 视频文件基础样式（简约图标）
      // &.video-wrapper {
      //   background: transparent; // 透明背景

      //   .video-icon {
      //     font-size: 48px;
      //     transition: transform 0.3s ease;
      //   }

      //   &:hover {
      //     .video-icon {
      //       transform: scale(1.1);
      //     }
      //   }
      // }

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
        position: relative;
        top: 0;
        left: 0;
        width: 100%;
        object-fit: cover;
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
