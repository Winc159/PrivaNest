<template>
  <div class="video-player-container">
    <VideoPlayer 
      :options="playerOptions" 
      @ready="onPlayerReady"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      style="width: 100%; height: 100%;"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VideoPlayer } from '@videojs-player/vue'
import 'video.js/dist/video-js.css'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
  type?: 'video' | 'image' | 'folder'
}

interface Props {
  file: FileData | null
  library: number | string
}

const props = defineProps<Props>()

interface Emits {
  (e: 'close'): void
  (e: 'ready', player: any): void
}

const emit = defineEmits<Emits>()

// 播放器引用
const playerRef = ref<any>(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)

// 当前播放的视频 URL
const currentVideoUrl = computed(() => {
  if (!props.file) return ''

  let filePath = props.file.path
  if (!filePath.startsWith('/')) {
    filePath = '/' + filePath
  }

  return `/api/media/file?library=${props.library}&path=${encodeURIComponent(filePath)}`
})

// 获取视频文件的扩展名
const getVideoExtension = () => {
  if (!props.file) return 'mp4'
  const ext = props.file.ext?.toLowerCase()
  return ext?.replace('.', '') || 'mp4'
}

// 根据扩展名获取 MIME 类型
const getMimeType = (ext: string): string => {
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    flv: 'video/x-flv',
    m4v: 'video/x-m4v',
    mpeg: 'video/mpeg',
    mpg: 'video/mpeg',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    rmvb: 'application/vnd.rn-realmedia-vbr',
    rm: 'application/vnd.rn-realmedia',
    asf: 'video/x-ms-asf',
    ts: 'video/mp2t',
    mts: 'video/mp2t'
  }
  return mimeTypes[ext] || 'video/mp4'
}

// 播放器选项
const playerOptions = computed(() => ({
  controls: true,
  autoplay: true,
  preload: 'auto',
  fluid: true,
  aspectRatio: '16:9',
  responsive: true,
  playbackRates: [0.5, 1, 1.5, 2],
  sources: [{
    src: currentVideoUrl.value,
    type: getMimeType(getVideoExtension())
  }],
  controlBar: {
    skipButtons: {
      visible: true,
      forward: 30,
      backward: 30,
    },
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
  },
  userActions: {
    hotkeys: true,
  }
}))

// 获取播放器实例
const getPlayer = () => {
  return playerRef.value?.player || playerRef.value
}

// 本地存储进度
const saveProgress = () => {
  if (!props.file) return

  const player = getPlayer()
  if (!player || typeof player.currentTime !== 'function') return

  const progress = {
    path: props.file.path,
    library: props.library,
    currentTime: player.currentTime(),
    duration: player.duration(),
    timestamp: Date.now()
  }

  localStorage.setItem(`video-progress:${props.file.path}`, JSON.stringify(progress))
}

// 恢复进度
const restoreProgress = (player: any) => {
  if (!props.file) return

  const saved = localStorage.getItem(`video-progress:${props.file.path}`)
  if (saved) {
    try {
      const progress = JSON.parse(saved)
      if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
        player.currentTime(progress.currentTime)
      }
    } catch (e) {
      // 恢复失败，使用默认行为
    }
  }
}

// 清除进度
const clearProgress = () => {
  if (props.file) {
    localStorage.removeItem(`video-progress:${props.file.path}`)
  }
}

// 事件处理
const onPlayerReady = (player: any) => {
  playerRef.value = player
  restoreProgress(player)
  emit('ready', player)
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
  clearProgress()
  emit('close')
}

const onTimeUpdate = () => {
  const player = getPlayer()
  if (player && typeof player.currentTime === 'function') {
    currentTime.value = player.currentTime()
    duration.value = player.duration() || 0

    if (Math.floor(currentTime.value) % 5 === 0) {
      saveProgress()
    }
  }
}

// 监听文件变化，关闭播放器时清理
watch(() => props.file, (newFile, oldFile) => {
  if (!newFile && oldFile) {
    // 文件被清空，关闭播放器
    const player = getPlayer()
    if (player && typeof player.pause === 'function') {
      player.pause()
    }
  }
}, { immediate: false })
</script>

<style lang="scss" scoped>
.video-player-container {
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  
  :deep(.video-js) {
    width: 100%;
    height: 100%;
    
    .vjs-big-play-button {
      background-color: rgba(0, 0, 0, 0.7);
      border-color: transparent;
    }
    
    .vjs-control-bar {
      background-color: rgba(0, 0, 0, 0.8);
    }
    
    .vjs-play-progress {
      background-color: #3498db;
    }
    
    .vjs-slider {
      background-color: rgba(255, 255, 255, 0.3);
    }
  }
}
</style>