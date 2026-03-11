<script setup lang="ts">
import { NImageGroup } from 'naive-ui'

interface FileData {
  id: string
  name: string
  path: string
}

interface Props {
  show: boolean
  imageList: FileData[]
  currentIndex: number
  imageSrcList: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [show: boolean]
  'update:current': [index: number]
  'close': []
}>()
</script>

<template>
  <n-image-group
    v-model:show="show"
    v-model:current="currentIndex"
    :src-list="imageSrcList"
    :default-zoom="1"
    :min-zoom="0.5"
    :max-zoom="5"
    :infinite="true"
    :mask-closable="true"
    @update:show="(val) => {
      emit('update:show', val)
      if (!val) emit('close')
    }"
    @update:current="(val) => emit('update:current', val)"
  />
</template>

<style scoped>
/* 图片预览组样式 */
</style>