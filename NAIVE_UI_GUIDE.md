# Naive UI 使用指南

## 📦 为什么选择 Naive UI？

Naive UI 是一个完全使用 TypeScript 编写的 Vue 3 组件库，相比其他 UI 库有以下优势：

### ✨ 核心优势

| 特性 | 说明 |
|------|------|
| 📘 **TypeScript** | 100% TypeScript 编写，类型推导完善 |
| 🎨 **现代化设计** | 简洁优雅，符合现代审美 |
| 🚀 **高性能** | 按需加载，Tree Shaking 友好 |
| 🔧 **易定制** | 完整的主题系统，支持深度定制 |
| 📦 **组件丰富** | 80+ 高质量组件，覆盖各种场景 |
| 🌙 **暗黑模式** | 内置暗黑主题支持 |

## 🎯 快速上手

### 安装

已在项目中预装：

```bash
cd frontend
npm install naive-ui @vicons/ionicons5
```

### 基础使用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NInput, NCard } from 'naive-ui'

const text = ref('')
</script>

<template>
  <n-card title="示例">
    <n-input v-model:value="text" placeholder="输入内容" />
    <n-button type="primary" style="margin-top: 12px">
      提交
    </n-button>
  </n-card>
</template>
```

## 📚 常用组件

### 按钮 (NButton)

```vue
<template>
  <n-button>默认按钮</n-button>
  <n-button type="primary">主要按钮</n-button>
  <n-button type="info">信息按钮</n-button>
  <n-button type="success">成功按钮</n-button>
  <n-button type="warning">警告按钮</n-button>
  <n-button type="error">错误按钮</n-button>
  
  <!-- 带图标 -->
  <n-button>
    <template #icon>
      <n-icon><SearchOutline /></n-icon>
    </template>
    搜索
  </n-button>
  
  <!-- 加载中 -->
  <n-button :loading="true">加载中...</n-button>
  
  <!-- 禁用 -->
  <n-button disabled>禁用</n-button>
</template>
```

### 输入框 (NInput)

```vue
<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
const password = ref('')
</script>

<template>
  <!-- 普通输入 -->
  <n-input v-model:value="value" placeholder="请输入" />
  
  <!-- 密码框 -->
  <n-input 
    v-model:value="password" 
    type="password" 
    show-password-on="click"
    placeholder="请输入密码"
  />
  
  <!-- 文本域 -->
  <n-input 
    v-model:value="value" 
    type="textarea" 
    placeholder="多行输入"
  />
  
  <!-- 带验证 -->
  <n-input 
    v-model:value="value" 
    placeholder="必填项"
    status="error"
  />
</template>
```

### 卡片 (NCard)

```vue
<template>
  <n-card title="卡片标题">
    卡片内容...
    
    <template #footer>
      底部内容
    </template>
  </n-card>
</template>
```

### 表单 (NForm)

```vue
<script setup lang="ts">
import { ref } from 'vue'

const formValue = ref({
  username: '',
  password: ''
})

const handleSubmit = () => {
  console.log(formValue.value)
}
</script>

<template>
  <n-form :model="formValue" label-placement="left" label-width="100">
    <n-form-item label="用户名">
      <n-input v-model:value="formValue.username" />
    </n-form-item>
    
    <n-form-item label="密码">
      <n-input v-model:value="formValue.password" type="password" />
    </n-form-item>
    
    <n-form-item>
      <n-button type="primary" @click="handleSubmit">提交</n-button>
    </n-form-item>
  </n-form>
</template>
```

### 消息提示 (useMessage)

```vue
<script setup lang="ts">
import { useMessage } from 'naive-ui'

const message = useMessage()

const showMessage = () => {
  message.success('操作成功')
  message.error('操作失败')
  message.warning('警告信息')
  message.info('提示信息')
  message.loading('加载中...')
}
</script>
```

### 对话框 (useDialog)

```vue
<script setup lang="ts">
import { useDialog } from 'naive-ui'

const dialog = useDialog()

const showDialog = () => {
  dialog.info({
    title: '提示',
    content: '这是一个对话框',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      console.log('确定了')
    }
  })
}
</script>
```

### 通知 (useNotification)

```vue
<script setup lang="ts">
import { useNotification } from 'naive-ui'

const notification = useNotification()

const showNotification = () => {
  notification.success({
    title: '成功',
    content: '操作已完成',
    duration: 3000
  })
}
</script>
```

### 加载条 (useLoadingBar)

```vue
<script setup lang="ts">
import { useLoadingBar } from 'naive-ui'

const loadingBar = useLoadingBar()

const startLoading = async () => {
  loadingBar.start()
  // 模拟异步操作
  await new Promise(resolve => setTimeout(resolve, 2000))
  loadingBar.finish()
}
</script>
```

## 🎨 主题定制

### 全局主题配置

在 `components/NaiveProvider.vue` 中配置：

```vue
<script setup lang="ts">
import { NConfigProvider, dateZhCN, zhCN } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'

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
    <slot />
  </n-config-provider>
</template>
```

### 暗黑模式

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { darkTheme } from 'naive-ui'

const isDark = ref(false)
const theme = ref(isDark.value ? darkTheme : undefined)
</script>

<template>
  <n-config-provider :theme="theme">
    <slot />
  </n-config-provider>
</template>
```

## 📦 图标使用

### 安装图标库

```bash
npm install @vicons/ionicons5
```

### 使用图标

```vue
<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { HomeOutline, SearchOutline } from '@vicons/ionicons5'
</script>

<template>
  <n-icon size="24"><HomeOutline /></n-icon>
  <n-icon :component="SearchOutline" />
</template>
```

## ⚡ 自动导入

项目已配置自动导入，无需手动引入组件：

```vue
<script setup lang="ts">
// ✅ 可以直接使用，无需 import
// <n-button>, <n-input>, <n-card> 等
</script>
```

Hook 也会自动导入：

```typescript
// ✅ 可以直接使用
const message = useMessage()
const dialog = useDialog()
const notification = useNotification()
const loadingBar = useLoadingBar()
```

## 🎯 实战示例

### 登录表单

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'

const router = useRouter()
const message = useMessage()

const form = ref({
  username: '',
  password: ''
})

const loading = ref(false)

const handleLogin = async () => {
  if (!form.value.username || !form.value.password) {
    message.error('请输入用户名和密码')
    return
  }
  
  loading.value = true
  try {
    // TODO: 调用 API
    message.success('登录成功')
    router.push('/')
  } catch (error) {
    message.error('登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <n-form :model="form">
    <n-form-item label="用户名">
      <n-input v-model:value="form.username" />
    </n-form-item>
    <n-form-item label="密码">
      <n-input v-model:value="form.password" type="password" />
    </n-form-item>
    <n-button type="primary" :loading="loading" @click="handleLogin">
      登录
    </n-button>
  </n-form>
</template>
```

## 📚 更多资源

- [Naive UI 官方文档](https://www.naiveui.com/)
- [Naive UI GitHub](https://github.com/tusen-ai/naive-ui)
- [Vicons 图标库](https://www.xicons.org/)

---

**祝你使用愉快！** 🎉
