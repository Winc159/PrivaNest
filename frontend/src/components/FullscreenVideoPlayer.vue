<template>
  <n-modal v-model:show="showModal" :close-on-esc="false" :mask-closable="false" preset="card"
    class="fullscreen-video-player" content-style="padding: 0; display: flex;" header-style="display: none;"
    :closable="false">
    <div @mousemove="handleMouseMove" class="player-wrapper">

      <!-- 控制栏 - 鼠标移动时显示，3 秒后自动隐藏 -->
      <div v-show="showControlBar" class="control-bar">
        <div class="video-title">
          {{ file?.name }}
        </div>
        <div class="actions">
          <n-button quaternary circle @click="handlePrevious" class="action-btn" v-if="showNavigation">
            <template #icon>
              <n-icon :component="ChevronBackOutline" size="24" />
            </template>
          </n-button>
          <n-button quaternary circle @click="handleNext" class="action-btn" v-if="showNavigation">
            <template #icon>
              <n-icon :component="ChevronForwardOutline" size="24" />
            </template>
          </n-button>
          <n-button quaternary circle @click="handleClose" class="action-btn close-btn">
            <template #icon>
              <n-icon :component="CloseOutline" size="20" />
            </template>
          </n-button>
        </div>
      </div>

      <!-- 视频播放器 -->
      <VideoPlayer v-if="file" ref="videoPlayerRef" :file="file" :library="library" @close="handleClose"
        @ready="handleReady" />
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { NModal, NButton, NIcon } from 'naive-ui'
import { CloseOutline, ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import VideoPlayer from '@/components/VideoPlayer.vue'
import type { FileData } from '@/types/file'

interface Props {
  file: FileData | null
  library: number | string
  modelValue?: boolean
  showNavigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: true,
  showNavigation: false
})

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'ready', player: any): void
  (e: 'navigate', direction: 'prev' | 'next'): void
}

const emit = defineEmits<Emits>()

// 内部状态管理
const showControlBar = ref(false)
const playerInstance = ref<any>(null)

// 控制栏自动隐藏定时器
let controlBarTimer: ReturnType<typeof setTimeout> | null = null

// 处理鼠标移动，显示控制栏并重置定时器
const handleMouseMove = () => {
  // 显示控制栏
  showControlBar.value = true

  // 清除之前的定时器
  if (controlBarTimer) {
    clearTimeout(controlBarTimer)
  }

  // 3 秒后自动隐藏
  controlBarTimer = setTimeout(() => {
    showControlBar.value = false
    controlBarTimer = null
  }, 3000)
}

// v-model 支持
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 关闭处理函数
const handleClose = () => {
  emit('close')
  emit('update:modelValue', false)
}

// 导航处理
const handlePrevious = () => {
  emit('navigate', 'prev')
}

const handleNext = () => {
  emit('navigate', 'next')
}

// 播放器就绪处理
const handleReady = (player: any) => {
  playerInstance.value = player
  emit('ready', player)
}

// 监听 Modal 打开，移除 aria-hidden
const handleOpenModal = () => {
  nextTick(() => {
    // 移除所有 modal 相关的 aria-hidden
    const modalElements = document.querySelectorAll('[aria-hidden="true"]')
    modalElements.forEach(el => {
      el.removeAttribute('aria-hidden')
    })

    // 同时处理可能被标记为 inert 的元素
    const inertElements = document.querySelectorAll('[inert]')
    inertElements.forEach(el => {
      el.removeAttribute('inert')
    })
  })
}

// 使用 MutationObserver 持续监控并移除 aria-hidden
let observer: MutationObserver | null = null

const initAriaHiddenObserver = () => {
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target as HTMLElement
        if (target.getAttribute('aria-hidden') === 'true') {
          // 检查是否是 modal 背景元素
          if (target.closest('.n-modal-mask') || target.closest('.fullscreen-video-player')) {
            requestAnimationFrame(() => {
              target.removeAttribute('aria-hidden')
            })
          }
        }
      }

      // 同时处理 inert 属性的变化
      if (mutation.type === 'attributes' && mutation.attributeName === 'inert') {
        const target = mutation.target as HTMLElement
        if (target.hasAttribute('inert')) {
          // 检查是否是 modal 背景元素
          if (target.closest('.n-modal-mask') || target.closest('.fullscreen-video-player')) {
            requestAnimationFrame(() => {
              target.removeAttribute('inert')
            })
          }
        }
      }
    })
  })

  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['aria-hidden', 'inert']
  })
}

// 使用 watch 监听 showModal 变化
import { watch } from 'vue'
watch(showModal, (newVal) => {
  if (newVal) {
    handleOpenModal()
  }
}, { immediate: false })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  // 初始化观察者以处理动态 aria-hidden
  if (showModal.value) {
    handleOpenModal()
  }
  initAriaHiddenObserver()

  // 初始显示控制栏（可选，如果需要一开始就显示）
  // handleMouseMove()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)

  // 清理定时器
  if (controlBarTimer) {
    clearTimeout(controlBarTimer)
    controlBarTimer = null
  }

  // 清理观察者
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

// 键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  if (!showModal.value) return

  // ESC 键关闭
  if (e.code === 'Escape') {
    e.preventDefault()
    handleClose()
    return
  }

  // Alt + 方向键切换视频（如果启用了导航）
  if (props.showNavigation && e.altKey) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      handlePrevious()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      handleNext()
    }
  }
}

</script>

<style lang="scss" scoped>
.fullscreen-video-player {
  width: 100vw;
  height: 100vh;
  max-width: none !important;
  max-height: none !important;

  :deep(.n-card__content) {
    padding: 0 !important;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .player-wrapper {
    flex: 1;
    background: #0a0a0a;
    display: flex;
    position: relative;
    overflow: hidden;
  }

  .control-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    padding: 25px 24px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4));
    transition: all 0.3s ease;

    // 鼠标悬停时加深背景
    .player-wrapper:hover & {
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6));
    }
  }

  .control-bar.always-visible {
    opacity: 1;
  }

  .video-title {
    color: #fff;
    font-size: 15px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 20px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .action-btn {
    color: #fff;
    backdrop-filter: blur(10px);
    width: 40px;
    height: 40px;
    min-width: 40px;
    transition: all 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .close-btn {
    margin-left: 8px;
  }
}
</style>