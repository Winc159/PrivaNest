<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import { useUserStore } from '@/stores/user'
import NaiveProvider from '@/components/NaiveProvider.vue'

const router = useRouter()
const userStore = useUserStore()

onMounted(() => {
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    router.push('/login')
  }
})
</script>

<template>
  <NaiveProvider>
    <div class="app-container">
      <RouterView />
    </div>
  </NaiveProvider>
</template>

<style lang="scss">
.app-container {
  width: 100%;
  height: 100%;
}
</style>
