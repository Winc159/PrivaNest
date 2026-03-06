<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const videoUrl = ref('')

// 模拟视频 URL（后续替换为真实 API）
onMounted(() => {
  // TODO: 从 API 获取视频流地址
  videoUrl.value = '/sample-video.mp4'
})

const handleProgressUpdate = (event: Event) => {
  const target = event.target as HTMLVideoElement
  console.log('播放进度:', target.currentTime)
}
</script>

<template>
  <div class="player-container">
    <video 
      :src="videoUrl"
      controls
      class="video-player"
      @timeupdate="handleProgressUpdate"
    />
    <div class="player-info">
      <h2>播放器页面（开发中）</h2>
      <p>这里将实现自定义播放器控件、字幕切换、倍速播放等功能</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.player-container {
  width: 100%;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.video-player {
  width: 100%;
  max-height: 80vh;
}

.player-info {
  padding: 40px;
  color: white;
  text-align: center;
  
  h2 {
    margin-bottom: 16px;
  }
  
  p {
    color: #ccc;
  }
}
</style>
