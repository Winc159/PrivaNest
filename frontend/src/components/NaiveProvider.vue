<script setup lang="ts">
import { NConfigProvider, NMessageProvider, dateZhCN, zhCN } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'

// 自定义主题配置
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#667eea',
    primaryColorHover: '#5a6fd6',
    primaryColorPressed: '#4d5fbf',
  },
}
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <n-message-provider>
      <slot />
    </n-message-provider>
  </n-config-provider>
</template>
