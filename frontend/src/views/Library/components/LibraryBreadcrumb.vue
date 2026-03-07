<script setup lang="ts">
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui'

interface Props {
  pathStack: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  navigate: [path: string]
}>()

const handleNavigate = (path: string) => {
  emit('navigate', path)
}

const getBreadcrumbLabel = (segment: string) => {
  return segment === '/' ? '根目录' : segment.split('/').pop()
}
</script>

<template>
  <div class="breadcrumb-bar">
    <n-breadcrumb separator="/">
      <n-breadcrumb-item 
        v-for="(segment) in pathStack" 
        :key="segment"
        @click.stop="handleNavigate(segment)"
      >
        {{ getBreadcrumbLabel(segment) }}
      </n-breadcrumb-item>
    </n-breadcrumb>
  </div>
</template>

<style lang="scss" scoped>
.breadcrumb-bar {
  padding: 12px 40px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  
  :deep(.n-breadcrumb) {
    .n-breadcrumb-item {
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 13px;
      
      &:hover {
        color: #667eea;
      }
    }
    
    .n-breadcrumb__separator {
      margin: 0 6px;
      color: #d0d0d0;
    }
  }
}
</style>
