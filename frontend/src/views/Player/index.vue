<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { VideoPlayer } from '@videojs-player/vue'
import 'video.js/dist/video-js.css'
import { useRouter, useRoute } from 'vue-router'
import { NButton, NIcon } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'

interface VideoSource {
  src: string
  type: string
}

const router = useRouter()
const route = useRoute()

// 从路由参数获取视频信息
const libraryIndex = computed(() => parseInt(route.params.libraryIndex as string) || 0)

// 处理 path 参数（可能是数组或字符串）
const videoPath = computed(() => {
  const pathParam = route.params.path
  if (Array.isArray(pathParam)) {
    return '/' + pathParam.join('/')
  }
  return pathParam as string || ''
})

// 播放器配置
const playerRef = ref<any>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

// 获取播放器实例的辅助函数
const getPlayer = () => {
  // Video.js player 可能存储在组件实例中
  return playerRef.value?.player || playerRef.value
}

// 播放器选项
const playerOptions = {
  controls: true,
  autoplay: true,
  preload: 'auto',
  fluid: true,
  aspectRatio: '16:9',
  responsive: true,
  sources: [{
    src: `/api/media/file?library=${libraryIndex.value}&path=${encodeURIComponent(videoPath.value)}`,
    type: 'video/mp4'
  }] as VideoSource[],
  controlBar: {
    children: [
      'playToggle',
      'volumePanel',
      'currentTimeDisplay',
      'timeDivider',
      'durationDisplay',
      'progressControl',
      'playbackRateMenuButton',
      'fullscreenToggle'
    ]
  }
}

// 事件处理
const onPlayerReady = (player: any) => {
  console.log('播放器就绪:', player)
  // 存储 player 对象本身，而不是响应式包装
  playerRef.value = player
  
  // 尝试恢复上次播放进度
  restoreProgress()
}

const onPlay = () => {
  isPlaying.value = true
  saveProgress()
}

const onPause = () => {
  isPlaying.value = false
  saveProgress()
}

const onEnded = () => {
  isPlaying.value = false
  // 播放结束后清除进度
  clearProgress()
}

const onTimeUpdate = () => {
  const player = getPlayer()
  if (player && typeof player.currentTime === 'function') {
    currentTime.value = player.currentTime()
    duration.value = player.duration() || 0
    
    // 定期保存进度（每 5 秒）
    if (Math.floor(currentTime.value) % 5 === 0) {
      saveProgress()
    }
  }
}

// 本地存储进度（后续替换为数据库）
const saveProgress = () => {
  if (!videoPath.value) return
  
  const player = getPlayer()
  if (!player || typeof player.currentTime !== 'function') return
  
  const progress = {
    path: videoPath.value,
    library: libraryIndex.value,
    currentTime: player.currentTime(),
    duration: player.duration(),
    timestamp: Date.now()
  }
  
  localStorage.setItem(`video-progress:${videoPath.value}`, JSON.stringify(progress))
}

const restoreProgress = () => {
  if (!videoPath.value) return
  
  const player = getPlayer()
  if (!player || typeof player.currentTime !== 'function') return
  
  const saved = localStorage.getItem(`video-progress:${videoPath.value}`)
  if (saved) {
    try {
      const progress = JSON.parse(saved)
      // 如果距离上次观看不超过 24 小时，恢复进度
      if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
        player.currentTime(progress.currentTime)
        console.log('恢复播放进度:', progress.currentTime)
      }
    } catch (e) {
      console.error('恢复进度失败:', e)
    }
  }
}

const clearProgress = () => {
  if (videoPath.value) {
    localStorage.removeItem(`video-progress:${videoPath.value}`)
  }
}

// 返回上一页（优先返回 Library，如果没有则使用 router.back()）
const goBack = () => {
  // 从路由参数中获取来源页面和路径信息
  const fromPath = route.query.from as string || '/library'
  const returnPath = route.query.path as string || '/'
  
  // 构建返回 URL，携带路径参数
  router.push({
    path: fromPath,
    query: { path: returnPath }
  })
}

// 快捷键控制
const handleKeydown = (e: KeyboardEvent) => {
  const player = getPlayer()
  if (!player || typeof player.paused !== 'function') return
  
  switch (e.code) {
    case 'Space':
      e.preventDefault()
      if (player.paused()) {
        player.play()
      } else {
        player.pause()
      }
      break
    case 'ArrowLeft':
      e.preventDefault()
      player.currentTime(Math.max(0, player.currentTime() - 5))
      break
    case 'ArrowRight':
      e.preventDefault()
      player.currentTime(Math.min(duration.value, player.currentTime() + 5))
      break
    case 'ArrowUp':
      e.preventDefault()
      player.volume(Math.min(1, player.volume() + 0.1))
      break
    case 'ArrowDown':
      e.preventDefault()
      player.volume(Math.max(0, player.volume() - 0.1))
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  // 清理播放器
  const player = getPlayer()
  if (player && typeof player.dispose === 'function') {
    player.dispose()
  }
})
</script>

<template>
  <div class="player-page">
    <!-- 顶部导航栏 -->
    <div class="player-header">
      <n-button quaternary circle @click="goBack">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
      </n-button>
      <div class="player-title">
        {{ videoPath.split('/').pop() }}
      </div>
    </div>
    
    <!-- 播放器容器 -->
    <div class="player-container">
      <VideoPlayer
        :src="playerOptions.sources[0].src"
        :options="playerOptions"
        @ready="onPlayerReady"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @timeupdate="onTimeUpdate"
      />
    </div>
    
    <!-- 播放信息 -->
    <div class="player-info">
      <div class="info-item">
        <span class="label">状态:</span>
        <span :class="['status', { playing: isPlaying }]">
          {{ isPlaying ? '播放中' : '已暂停' }}
        </span>
      </div>
      <div class="info-item">
        <span class="label">进度:</span>
        <span>{{ Math.floor(currentTime / 60) }}:{{ String(Math.floor(currentTime % 60)).padStart(2, '0') }} / 
              {{ Math.floor(duration / 60) }}:{{ String(Math.floor(duration % 60)).padStart(2, '0') }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.player-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
}

.player-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.8);
  position: sticky;
  top: 0;
  z-index: 100;
  
  .player-title {
    margin-left: 16px;
    font-size: 18px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.player-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  
  :deep(.video-js) {
    width: 100%;
    height: auto;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    
    .vjs-big-play-button {
      background-color: rgba(0, 123, 255, 0.8);
      border: none;
      border-radius: 50%;
      width: 80px;
      height: 80px;
      line-height: 80px;
      
      &:hover {
        background-color: rgba(0, 123, 255, 1);
      }
    }
    
    .vjs-control-bar {
      background: rgba(0, 0, 0, 0.8);
    }
    
    .vjs-play-progress {
      background: #007bff;
    }
    
    .vjs-volume-level {
      background: #007bff;
    }
  }
}

.player-info {
  max-width: 1400px;
  margin: 20px auto;
  padding: 0 20px;
  display: flex;
  gap: 32px;
  
  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .label {
      color: #888;
      font-size: 14px;
    }
    
    .status {
      color: #ff4444;
      font-weight: 500;
      
      &.playing {
        color: #44ff44;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .player-header {
    padding: 12px 16px;
    
    .player-title {
      font-size: 16px;
    }
  }
  
  .player-container {
    padding: 10px;
  }
  
  .player-info {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
