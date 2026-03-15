<template>
  <n-modal v-model:show="showFullscreenPlayer" :close-on-esc="false" :mask-closable="false" preset="card"
    style="width: 100vw; height: 100vh; max-width: none; max-height: none;"
    content-style="padding: 0; display: flex; flex-direction: column;" header-style="display: none;"
    :closable="false" :ignore-aria-hidden="true">
    <div @mouseenter="showControlBar = true" @mouseleave="showControlBar = false"
      style="flex: 1; background: #0a0a0a; display: flex; position: relative; overflow: hidden;">

      <div v-show="showControlBar"
        style="position: absolute; top: 0; left: 0; right: 0; z-index: 10; padding: 25px 24px 20px; display: flex; align-items: center; justify-content: space-between; opacity: 0; transition: opacity 0.3s ease;"
        :style="{ opacity: showControlBar ? 1 : 0 }">
        <div
          style="color: #fff; font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 20px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
          {{ file?.name }}
        </div>
        <n-button quaternary circle @click="handleClose"
          style="color: #fff;  backdrop-filter: blur(10px); width: 40px; height: 40px; min-width: 40px; transition: all 0.2s ease;">
          <template #icon>
            <n-icon :component="CloseOutline" size="20" />
          </template>
        </n-button>
      </div>
      <VideoPlayer v-if="file" :file="file" :library="library"
        @close="handleClose" />

    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NModal, NButton, NIcon } from 'naive-ui'
import { CloseOutline } from '@vicons/ionicons5'
import VideoPlayer from '@/components/VideoPlayer.vue'

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
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: true
})

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

const showControlBar = ref(false)

// v-model 支持
const showFullscreenPlayer = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleClose = () => {
  emit('close')
  emit('update:modelValue', false)
}
</script>
