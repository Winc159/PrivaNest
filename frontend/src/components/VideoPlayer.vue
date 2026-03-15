<template>
  <div class="video-player-container">
    <video ref="videoElement" class="video-js vjs-default-skin"></video>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import videojs from 'video.js'
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
const videoElement = ref<HTMLVideoElement | null>(null)
const playerRef = ref<any>(null)

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
      forward: 30,
      backward: 10,
    },
    children: [
      'playToggle',
      'volumePanel',
      'currentTimeDisplay',
      'timeDivider',
      'durationDisplay',
      'progressControl',
      'remainingTimeDisplay',
      'playbackRateMenuButton',
      'fullscreenToggle',
    ]
  },
  userActions: {
    hotkeys: false, // 禁用内置快捷键，使用自定义实现
  }
}))

// 初始化播放器
const initPlayer = () => {
  if (!videoElement.value) return

  // 使用 video.js 初始化
  playerRef.value = videojs(videoElement.value, playerOptions.value, function () {
    const player = this

    // 手动绑定快捷键以确保快进功能可用
    document.addEventListener('keydown', handleKeyDown)

    // 恢复进度
    restoreProgress(player)

    // 触发 ready 事件
    emit('ready', player)
  })
}

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  const player = playerRef.value
  if (!player) return

  // 如果焦点在输入框中，不处理快捷键
  if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
    return
  }

  const currentTime = player.currentTime()
  const duration = player.duration()

  // 智能快进/后退逻辑：根据视频时长动态调整
  const getSeekTime = (): number => {
    // 5 分钟以上的视频，每次快进 30 秒
    if (duration >= 300) {
      return 30
    }
    // 2-5 分钟的视频，每次快进 10 秒
    if (duration >= 120) {
      return 10
    }
    // 2 分钟以下的视频，每次快进 5 秒
    return 5
  }

  const seekTime = getSeekTime()
  const durationStr = formatDuration(duration)

  // 方向键左 - 后退（智能时间）
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    player.currentTime(Math.max(0, currentTime - seekTime))
    logAction('⏪ 后退', `-${seekTime}s`, durationStr)
  }

  // 方向键右 - 前进（智能时间）
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    player.currentTime(Math.min(duration, currentTime + seekTime))
    logAction('⏩ 前进', `+${seekTime}s`, durationStr)
  }
}

/**
 * 格式化时长为易读格式
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 统一的控制台日志输出
 */
const logAction = (action: string, detail: string, duration?: string) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const prefix = `[${timestamp}]`
  const durationInfo = duration ? `| ${duration}` : ''

  console.log(`${prefix} 🎬 ${action.padEnd(6, ' ')} ${detail.padEnd(8, ' ')} ${durationInfo}`)
}

// 更新视频源
const updateSource = () => {
  const player = playerRef.value
  if (!player || !props.file) return

  const newSrc = currentVideoUrl.value
  const currentSrc = player.currentSrc()

  // 只有当源变化时才更新
  if (newSrc !== currentSrc) {
    player.src({
      src: newSrc,
      type: getMimeType(getVideoExtension())
    })
    player.load()
    logAction('📹 加载', props.file.name)
  }
}

// 获取播放器实例
const getPlayer = () => {
  return playerRef.value
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

onMounted(() => {
  // 直接初始化播放器，不使用 hotkeys 插件
  initPlayer()
})

onUnmounted(() => {
  // 清理播放器
  const player = getPlayer()
  if (player && typeof player.dispose === 'function') {
    player.dispose()
    playerRef.value = null
  }

  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown)
})

// 监听文件变化
watch(() => props.file, (newFile, oldFile) => {
  if (newFile && oldFile && newFile.path !== oldFile.path) {
    // 文件切换，更新源
    updateSource()
  } else if (!newFile && oldFile) {
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

    // 时间显示样式优化
    .vjs-current-time,
    .vjs-duration,
    .vjs-remaining-time {
      font-weight: 500;
      color: #fff;

      span {
        color: #fff;
      }
    }

    // 当前时间和总时长
    .vjs-current-time,
    .vjs-duration {
      min-width: 80px;
    }

    // 剩余时间显示
    .vjs-remaining-time {
      margin-left: 8px;
      opacity: 0.8;

      &:before {
        content: '•';
        margin-right: 8px;
        color: #3498db;
      }
    }

    // 时间分隔符
    .vjs-time-divider {
      color: #fff;
      margin: 0 4px;
    }

    // 进度条悬停时显示预览时间
    .vjs-progress-control:hover .vjs-progress-holder {
      font-size: 13px;
    }
  }
}
</style>