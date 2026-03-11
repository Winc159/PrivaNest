<script setup lang="ts">
import { NIcon, NButton, NRadioGroup, NRadioButton, NUpload } from 'naive-ui'
import { ArrowBackOutline, HomeOutline } from '@vicons/ionicons5'

interface Library {
  id: string
  name: string
}

interface Props {
  currentLibrary: number
  libraries: Library[]
  pathStack: string[]
  viewMode: 'grid' | 'list'
  loading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'library-change': [value: number]
  'go-home': []
  'go-back': []
  'view-mode-change': [value: 'grid' | 'list']
  'refresh': []
  'upload-success': []
}>()

const handleGoHome = () => {
  emit('go-home')
}

const handleGoBack = () => {
  emit('go-back')
}

const handleViewModeChange = (value: 'grid' | 'list') => {
  emit('view-mode-change', value)
}

const handleRefresh = () => {
  emit('refresh')
}

const handleUploadSuccess = () => {
  emit('upload-success')
}
</script>

<template>
  <header class="header">
    <h2>媒体库</h2>
    <div class="header-actions">
      
      <n-button @click="handleGoHome" size="small">
        <template #icon>
          <n-icon><HomeOutline /></n-icon>
        </template>
        首页
      </n-button>
      
      <n-button @click="handleGoBack" :disabled="pathStack.length <= 1">
        <template #icon>
          <n-icon><ArrowBackOutline /></n-icon>
        </template>
        返回
      </n-button>
      
      <n-radio-group :value="viewMode" size="small" @update:value="handleViewModeChange">
        <n-radio-button value="grid">网格</n-radio-button>
        <n-radio-button value="list">列表</n-radio-button>
      </n-radio-group>
      
      <n-button @click="handleRefresh" :loading="loading">
        刷新
      </n-button>
      
      <n-upload action="/api/media/upload" :show-file-list="false" :on-success="handleUploadSuccess">
        <n-button type="primary">上传封面</n-button>
      </n-upload>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    
    :deep(.n-select) {
      min-width: 160px;
    }
  }
}
</style>
