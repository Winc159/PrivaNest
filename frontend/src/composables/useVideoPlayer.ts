import { ref, computed } from 'vue'
import type { Ref } from 'vue'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
  type?: 'video' | 'image' | 'folder'
}

/**
 * 视频播放器 Hook
 * 管理视频播放器的状态、进度和控制
 */
export function useVideoPlayer(currentLibrary: Ref<string>) {
  const showFullscreenPlayer = ref(false)
  const currentVideoFile = ref<FileData | null>(null)
  const playerRef = ref<any>(null)
  const currentTime = ref(0)
  const duration = ref(0)
  const isPlaying = ref(false)

  // 获取播放器实例
  const getPlayer = () => {
    return playerRef.value?.player || playerRef.value
  }

  // 当前播放的视频 URL
  const currentVideoUrl = computed(() => {
    if (!currentVideoFile.value) return ''

    let filePath = currentVideoFile.value.path
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }

    return `/api/media/file?library=${currentLibrary.value}&path=${encodeURIComponent(filePath)}`
  })

  // 获取视频文件的扩展名
  const getVideoExtension = () => {
    if (!currentVideoFile.value) return 'mp4'
    const ext = currentVideoFile.value.ext?.toLowerCase()
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
      flv: 'video/x-flv'
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
    sources: [{
      src: currentVideoUrl.value,
      type: getMimeType(getVideoExtension())
    }],
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
  }))

  // 打开播放器
  const openPlayer = (file: FileData) => {
    currentVideoFile.value = file
    showFullscreenPlayer.value = true
  }

  // 关闭播放器
  const closePlayer = () => {
    saveProgress()

    const player = getPlayer()
    if (player && typeof player.pause === 'function') {
      player.pause()
    }

    showFullscreenPlayer.value = false
    currentVideoFile.value = null
    playerRef.value = null
  }

  // 本地存储进度
  const saveProgress = () => {
    if (!currentVideoFile.value) return

    const player = getPlayer()
    if (!player || typeof player.currentTime !== 'function') return

    const progress = {
      path: currentVideoFile.value.path,
      library: currentLibrary.value,
      currentTime: player.currentTime(),
      duration: player.duration(),
      timestamp: Date.now()
    }

    localStorage.setItem(`video-progress:${currentVideoFile.value.path}`, JSON.stringify(progress))
  }

  // 恢复进度
  const restoreProgress = (player: any) => {
    if (!currentVideoFile.value) return

    const saved = localStorage.getItem(`video-progress:${currentVideoFile.value.path}`)
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
    if (currentVideoFile.value) {
      localStorage.removeItem(`video-progress:${currentVideoFile.value.path}`)
    }
  }

  // 事件处理
  const onPlayerReady = (player: any) => {
    playerRef.value = player
    restoreProgress(player)
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
    closePlayer()
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

  return {
    showFullscreenPlayer,
    currentVideoFile,
    playerRef,
    currentTime,
    duration,
    isPlaying,
    currentVideoUrl,
    playerOptions,
    getPlayer,
    openPlayer,
    closePlayer,
    onPlayerReady,
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate
  }
}