<script setup lang="ts">
import 'video.js/dist/video-js.css'
import { NModal, NButton, NIcon } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'

interface FileData {
  name: string
  path: string
  ext?: string
}

interface Props {
  show: boolean
  videoFile: FileData | null
  library: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// 视频播放器相关逻辑将在这里实现
// 为了简化，暂时使用内联方式
</script>

<template>
  <n-modal
    v-model:show="show"
    :close-on-esc="false"
    :mask-closable="false"
    preset="card"
    style="width: 100vw; height: 100vh; max-width: none; max-height: none;"
    content-style="padding: 0; display: flex; flex-direction: column;"
    header-style="padding: 16px 24px; background: #0a0a0a; border-bottom: 1px solid #333;"
    :closable="false"
  >
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="color: #fff; font-size: 16px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
          {{ videoFile?.name }}
        </div>
        <n-button quaternary circle @click="emit('close')" style="color: #fff; margin-left: 16px;">
          <template #icon>
            <n-icon :component="CloseOutline" size="24" />
          </template>
        </n-button>
      </div>
    </template>
    
    <div style="flex: 1; background: #0a0a0a; display: flex; align-items: center; justify-content: center; position: relative;">
      <slot name="player"></slot>
    </div>
  </n-modal>
</template>

<style scoped>
/* 播放器模态框样式 */
</style>