<script setup lang="ts">
import { NEmpty, NSpin, NDivider } from 'naive-ui'
import FileCard from './FileCard.vue'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
}

interface Props {
  folders: FileData[]
  files: FileData[]
  viewMode: 'grid' | 'list'
  loading: boolean
  loadingMore: boolean
  hasMore: boolean | null
  getThumbnailUrl: (file: FileData) => string | null
  shouldGenerateThumbnail: (file: FileData) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'folder-click': [path: string]
  'file-click': [path: string]
  'scroll': [event: Event]
}>()

const handleFolderClick = (path: string) => {
  emit('folder-click', path)
}

const handleFileClick = (path: string) => {
  emit('file-click', path)
}
</script>

<template>
  <div class="content" @scroll="(e) => emit('scroll', e)">
    <n-empty 
      v-if="!loading && folders.length === 0 && files.length === 0" 
      description="暂无文件"
      style="padding: 60px 0"
    />
    
    <template v-else>
      <!-- 网格模式 -->
      <div v-if="viewMode === 'grid'" class="masonry-grid">
        <!-- 文件夹列表 -->
        <div v-for="folder in folders" :key="folder.id" class="grid-item folder-item">
          <file-card 
            :file="folder"
            :is-folder="true"
            :view-mode="viewMode"
            @click="handleFolderClick"
          />
        </div>
        
        <!-- 文件列表 -->
        <div v-for="file in files" :key="file.id" class="grid-item">
          <file-card 
            :file="file"
            :is-folder="false"
            :view-mode="viewMode"
            :thumbnail-url="getThumbnailUrl(file)"
            :should-generate-thumbnail="shouldGenerateThumbnail(file)"
            @click="handleFileClick"
          />
        </div>
      </div>
      
      <!-- 列表模式 -->
      <div v-else :class="['file-list', viewMode]">
        <!-- 文件夹列表 -->
        <file-card 
          v-for="folder in folders" 
          :key="folder.id"
          :file="folder"
          :is-folder="true"
          :view-mode="viewMode"
          @click="handleFolderClick"
        />
        
        <!-- 文件列表 -->
        <file-card 
          v-for="file in files" 
          :key="file.id"
          :file="file"
          :is-folder="false"
          :view-mode="viewMode"
          :thumbnail-url="getThumbnailUrl(file)"
          :should-generate-thumbnail="shouldGenerateThumbnail(file)"
          @click="handleFileClick"
        />
      </div>
      
      <!-- 加载更多提示 -->
      <div v-if="loadingMore" class="loading-more">
        <n-spin size="medium" description="加载中..." />
      </div>
      
      <!-- 没有更多数据提示 -->
      <div v-if="hasMore === false && files.length > 0" class="no-more">
        <n-divider dashed>
          <span style="color: #999; font-size: 13px;">没有更多了</span>
        </n-divider>
      </div>
    </template>
    
    <n-spin :show="loading" overlay-class-name="content-overlay">
      <div></div>
    </n-spin>
  </div>
</template>

<style lang="scss" scoped>
.content {
  padding: 20px;
  height: calc(100vh - 160px);
  overflow-y: auto;
  background: #f8f9fa;
  
  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 3px;
    
    &:hover {
      background: #b0b0b0;
    }
  }
}

// Finder 风格网格布局 - 类似 macOS 文件系统
.masonry-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-flow: dense;
  align-items: start; // 顶部对齐，允许不同高度的项目
  
  .grid-item {
    min-width: 0;
    width: 100%;
    // 每个项目根据自己的内容（横/竖/方）自动调整高度
  }
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  &.list {
    .media-item {
      width: 100%;
    }
  }
}

.loading-more, .no-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0;
  margin-top: 20px;
}

.no-more {
  .n-divider {
    margin: 0;
  }
}

// 加载覆盖层
.content-overlay {
  :deep(.n-spin-content) {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
  }
}
</style>
