<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMediaStore } from '@/stores/media'
import { NIcon } from 'naive-ui'
import { FolderOutline, VideoOutline, ArrowBackOutline } from '@vicons/ionicons5'

const mediaStore = useMediaStore()

const viewMode = ref<'grid' | 'list'>('grid')
const pathStack = ref(['/'])
const currentLibrary = ref(0)
const libraries = ref([])

onMounted(async () => {
  // TODO: 获取已配置的媒体库列表
  libraries.value = [
    { id: 'lib-0', name: 'Movies', fullPath: '/Volumes/Media/Movies' },
    { id: 'lib-1', name: 'Series', fullPath: '/Volumes/Data/Series' }
  ]
  
  await loadFolders('/')
})

const loadFolders = async (path: string) => {
  await mediaStore.fetchFolders(path, currentLibrary.value)
}

const navigateTo = (path: string) => {
  loadFolders(path)
  if (!pathStack.value.includes(path)) {
    pathStack.value.push(path)
  }
}

const goBack = () => {
  if (pathStack.value.length > 1) {
    pathStack.value.pop()
    const prevPath = pathStack.value[pathStack.value.length - 1]
    loadFolders(prevPath)
  }
}

const handleLibraryChange = (value: number) => {
  pathStack.value = ['/']
  loadFolders('/')
}
</script>

<template>
  <div class="library-container">
    <header class="header">
      <h2>媒体库</h2>
      <div class="header-actions">
        <!-- 媒体库选择器 -->
        <n-select 
          v-model:value="currentLibrary" 
          :options="libraries.map(lib => ({ label: lib.name, value: parseInt(lib.id.split('-')[1]) }))"
          style="width: 200px"
          @update:value="handleLibraryChange"
        />
        
        <n-button @click="goBack" :disabled="pathStack.length <= 1">
          <template #icon>
            <n-icon><ArrowBackOutline /></n-icon>
          </template>
          返回
        </n-button>
        <n-radio-group v-model:value="viewMode" size="small">
          <n-radio-button value="grid">网格</n-radio-button>
          <n-radio-button value="list">列表</n-radio-button>
        </n-radio-group>
        <n-upload action="/api/media/upload" :show-file-list="false" :on-success="() => loadFolders(mediaStore.currentPath)">
          <n-button type="primary">上传封面</n-button>
        </n-upload>
      </div>
    </header>
    
    <!-- 面包屑导航 -->
    <div class="breadcrumb-bar">
      <n-breadcrumb separator="/">
        <n-breadcrumb-item 
          v-for="(segment, index) in pathStack" 
          :key="segment"
          @click="navigateTo(segment)"
        >
          {{ segment === '/' ? '根目录' : segment.split('/').pop() }}
        </n-breadcrumb-item>
      </n-breadcrumb>
    </div>
    
    <!-- 内容区域 -->
    <main class="content">
      <n-empty v-if="!mediaStore.loading && mediaStore.folders.length === 0 && mediaStore.files.length === 0" />
      
      <div v-else :class="['file-list', viewMode]">
        <!-- 文件夹列表 -->
        <div 
          v-for="folder in mediaStore.folders" 
          :key="folder.id"
          class="file-item folder"
          @click="navigateTo(folder.path)"
        >
          <n-icon size="32"><FolderOutline /></n-icon>
          <span class="name">{{ folder.name }}</span>
        </div>
        
        <!-- 文件列表 -->
        <div 
          v-for="file in mediaStore.files" 
          :key="file.id"
          class="file-item file"
        >
          <n-icon size="32"><VideoOutline /></n-icon>
          <span class="name">{{ file.name }}</span>
          <span class="size">{{ file.size }}</span>
        </div>
      </div>
      
      <n-spin :show="mediaStore.loading" description="加载中...">
        <div style="height: 100%"></div>
      </n-spin>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.library-container {
  min-height: 100vh;
  background: #f5f7f9;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  h2 {
    font-size: 24px;
    color: #333;
  }
  
  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.breadcrumb-bar {
  padding: 16px 40px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.content {
  padding: 40px;
}

.file-list {
  display: grid;
  gap: 16px;
  
  &.grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  
  &.list {
    grid-template-columns: 1fr;
  }
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f0f0f0;
    transform: translateX(4px);
  }
  
  &.folder {
    .name {
      color: #667eea;
      font-weight: 500;
    }
  }
  
  .name {
    flex: 1;
    color: #333;
  }
  
  .size {
    color: #999;
    font-size: 12px;
  }
}
</style>
