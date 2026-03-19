<script setup lang="ts">
import { NIcon, NImage } from 'naive-ui'
import { FolderOutline } from '@vicons/ionicons5'
import { ref } from 'vue'

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

const imageFit = ref<'cover' | 'contain'>('cover')

const handleClick = () => {
  emit('click', props.file)
}

</script>

<template>
  <div :class="['media-item', isFolder ? 'folder' : 'file', viewMode]" @click="handleClick">
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
      <div class="media-wrapper">
        <!-- 统一使用 NImage 组件加载缩略图 -->
        <n-image v-if="thumbnailUrl" :src="thumbnailUrl" :alt="file.name" class="media-thumbnail" :object-fit="imageFit"
          preview-disabled />
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
        object-fit: cover;
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
