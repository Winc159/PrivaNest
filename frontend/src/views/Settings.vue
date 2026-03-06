<script setup lang="ts">
import { ref } from 'vue'

const theme = ref('light')
const autoPlay = ref(true)
const defaultVolume = ref(80)

const handleSave = () => {
  localStorage.setItem('settings', JSON.stringify({
    theme: theme.value,
    autoPlay: autoPlay.value,
    defaultVolume: defaultVolume.value
  }))
}
</script>

<template>
  <div class="settings-container">
    <h2>设置</h2>
    
    <n-card title="📁 媒体库管理" class="settings-card">
      <div class="library-list">
        <n-alert type="info" title="提示">
          请在 backend/.env 文件中配置 MEDIA_PATHS 环境变量来添加媒体库路径
        </n-alert>
      </div>
    </n-card>
    
    <n-card title="播放设置" class="settings-card">
      <n-form label-placement="left" label-width="100">
        <n-form-item label="主题模式">
          <n-radio-group v-model:value="theme">
            <n-radio value="light">浅色</n-radio>
            <n-radio value="dark">深色</n-radio>
          </n-radio-group>
        </n-form-item>
        
        <n-form-item label="自动播放">
          <n-switch v-model:value="autoPlay" />
        </n-form-item>
        
        <n-form-item label="默认音量">
          <n-slider v-model:value="defaultVolume" :min="0" :max="100" />
        </n-form-item>
        
        <n-form-item>
          <n-button type="primary" @click="handleSave">保存设置</n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<style lang="scss" scoped>
.settings-container {
  padding: 40px;
  max-width: 1000px;
  margin: 0 auto;
  
  h2 {
    margin-bottom: 24px;
    color: #333;
  }
}

.settings-card {
  margin-bottom: 20px;
}

.library-list {
  margin-bottom: 20px;
}
</style>
