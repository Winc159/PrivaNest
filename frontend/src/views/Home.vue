<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const recentMedia = ref([])
const continueWatching = ref([])

// 模拟数据（后续替换为 API 调用）
onMounted(() => {
  recentMedia.value = [
    { id: 1, title: '示例影片 1', cover: '', type: 'movie' },
    { id: 2, title: '示例影片 2', cover: '', type: 'movie' }
  ]
  
  continueWatching.value = []
})

const goToLibrary = () => {
  router.push('/library')
}
</script>

<template>
  <div class="home-container">
    <header class="header">
      <h1>欢迎回来，{{ userStore.username || '访客' }}</h1>
      <div class="header-actions">
        <n-button @click="goToLibrary">浏览媒体库</n-button>
        <n-button @click="router.push('/settings')">设置</n-button>
        <n-button @click="userStore.logout()">退出登录</n-button>
      </div>
    </header>
    
    <main class="content">
      <!-- 最近添加 -->
      <section class="section">
        <h2 class="section-title">最近添加</h2>
        <n-empty v-if="recentMedia.length === 0" description="暂无内容" />
        <div v-else class="media-grid">
          <div 
            v-for="item in recentMedia" 
            :key="item.id" 
            class="media-card"
          >
            <div class="cover-placeholder">{{ item.title[0] }}</div>
            <div class="media-info">
              <span class="title">{{ item.title }}</span>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 继续观看 -->
      <section class="section">
        <h2 class="section-title">继续观看</h2>
        <n-empty v-if="continueWatching.length === 0" description="暂无观看记录" />
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
  margin-bottom: 40px;
  
  .section-title {
    font-size: 20px;
    color: #333;
    margin-bottom: 20px;
  }
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.media-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
  
  .cover-placeholder {
    width: 100%;
    aspect-ratio: 2/3;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    color: white;
  }
  
  .media-info {
    padding: 12px;
    
    .title {
      font-size: 14px;
      color: #333;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
