<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessage } from 'naive-ui'
import request from '@/api/request'
import { FolderOutline } from '@vicons/ionicons5'

interface MediaItem {
  id: number
  title: string
  cover: string
  type: string
}

interface LibraryPath {
  id: string
  name: string
  fullPath: string
}

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const recentMedia = ref<MediaItem[]>([])
const continueWatching = ref<MediaItem[]>([])
const libraryPaths = ref<LibraryPath[]>([])
const loadingLibraries = ref(false)

// 获取媒体库路径
async function fetchLibraryPaths() {
  loadingLibraries.value = true
  try {
   const response = await request.get<any, { paths: LibraryPath[] }>('/media/libraries')
   libraryPaths.value = response.paths || []
  } catch (error) {
   console.error('获取媒体库路径失败:', error)
    message.error('获取媒体库列表失败')
  } finally {
    loadingLibraries.value = false
  }
}

// 模拟数据（后续替换为 API 调用）
onMounted(() => {
  recentMedia.value = [
    { id: 1, title: '示例影片 1', cover: '', type: 'movie' },
    { id: 2, title: '示例影片 2', cover: '', type: 'movie' }
  ]
  
  continueWatching.value = []
  fetchLibraryPaths()
})

const goToLibrary = (libraryIndex?: number) => {
  if (libraryIndex !== undefined) {
    router.push(`/library?library=${libraryIndex}`)
  } else {
    router.push('/library')
  }
}
</script>

<template>
  <div class="home-container">
    <header class="header">
      <h1>欢迎回来，{{ userStore.username || '访客' }}</h1>
      <div class="header-actions">
        <n-button @click="router.push('/settings')">设置</n-button>
        <n-button @click="userStore.logout()">退出登录</n-button>
      </div>
    </header>
    
    <main class="content">
      <!-- 媒体库浏览 -->
      <section class="section">
        <h2 class="section-title">媒体库</h2>
        <template v-if="libraryPaths.length > 0">
          <n-grid x-gap="24" y-gap="24" :cols="libraryPaths.length <= 2 ? '1 s:2 m:3 l:4 xl:5' : '1 s:3 m:4 l:5 xl:6'" responsive="screen">
            <n-grid-item 
              v-for="(lib, index) in libraryPaths" 
              :key="lib.id"
            >
              <n-card
                :title="lib.name"
                hoverable
                @click="goToLibrary(index)"
                class="library-card"
              >
                <template #header-extra>
                  <n-tag type="info">库 {{ index }}</n-tag>
                </template>
                <div class="library-card-content">
                  <div class="library-icon-wrapper">
                    <n-icon :component="FolderOutline" :size="64" color="#667eea" />
                  </div>
                  <span class="library-path">{{ lib.fullPath }}</span>
                </div>
                <template #action>
                  <n-button text type="primary" @click.stop="goToLibrary(index)">
                    浏览
                  </n-button>
                </template>
              </n-card>
            </n-grid-item>
          </n-grid>
        </template>
        <n-empty 
          v-else-if="!loadingLibraries"
         description="暂无媒体库，请在设置中添加"
        />
        
        <n-spin v-if="loadingLibraries" />
      </section>
      
      <!-- 最近添加 -->
      <section class="section">
        <h2 class="section-title">最近添加</h2>
        <n-grid v-if="recentMedia.length > 0" x-gap="24" y-gap="24" cols="1 s:3 m:4 l:5 xl:6" responsive="screen">
          <n-grid-item v-for="item in recentMedia" :key="item.id">
            <n-card hoverable class="media-card">
              <div class="cover-placeholder">{{ item.title[0] }}</div>
              <template #footer>
                <div class="media-info">
                  <span class="title">{{ item.title }}</span>
                  <n-tag size="small" :type="item.type === 'movie' ? 'success' : 'info'">
                    {{ item.type }}
                  </n-tag>
                </div>
              </template>
            </n-card>
          </n-grid-item>
        </n-grid>
        <n-empty v-else description="暂无内容" />
      </section>
      
      <!-- 继续观看 -->
      <section class="section">
        <h2 class="section-title">继续观看</h2>
        <n-grid v-if="continueWatching.length > 0" x-gap="24" y-gap="24" cols="1 s:3 m:4 l:5 xl:6" responsive="screen">
          <n-grid-item v-for="item in continueWatching" :key="item.id">
            <n-card hoverable class="media-card">
              <div class="cover-placeholder">{{ item.title[0] }}</div>
              <template #footer>
                <div class="media-info">
                  <span class="title">{{ item.title }}</span>
                  <n-progress
                   type="line"
                    :percentage="50"
                    :show-indicator="false"
                    :height="4"
                  />
                </div>
              </template>
            </n-card>
          </n-grid-item>
        </n-grid>
        <n-empty v-else description="暂无观看记录" />
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.home-container {
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
  
  h1 {
    font-size: 24px;
   color: #333;
  }
  
  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.content {
  padding: 40px;
}

.section {
  margin-bottom: 48px;
  
  .section-title {
    font-size: 22px;
  color: #333;
    margin-bottom: 24px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }
}

.library-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 16px 32px rgba(102, 126, 234, 0.2);
  }
  
  .library-card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    gap: 20px;
    
    .library-icon-wrapper {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
      
      .library-card:hover & {
        transform: scale(1.1);
        box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
      }
    }
    
    .library-path {
      font-size: 13px;
     color: #666;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
     line-clamp: 2;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      max-width: 100%;
     line-height: 1.6;
      padding: 0 8px;
    }
  }
}

.media-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
  
  .cover-placeholder {
    width: 100%;
   aspect-ratio: 2/3;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 56px;
  color: white;
    border-radius: 8px;
    font-weight: 600;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .media-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .title {
      font-size: 14px;
   color: #333;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
     font-weight: 500;
    }
  }
}
</style>