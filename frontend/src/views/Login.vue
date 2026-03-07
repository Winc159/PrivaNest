<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { authApi, type AuthResponse } from '@/api'
import {  useMessage } from 'naive-ui'

const router = useRouter()
const userStore = useUserStore()
const message = useMessage()

const loginForm = ref({
  username: '',
  password: ''
})

const loading = ref(false)

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    message.error('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    debugger;
    const res = await authApi.login(loginForm.value) as any as AuthResponse
    debugger;
    userStore.login(res.user, res.token)
    message.success('登录成功')
    router.push('/')
  } catch (error: any) {
    console.error('登录错误详情:', error)
    console.error('错误响应:', error.response)
    console.error('错误状态码:', error.response?.status)
    console.error('错误数据:', error.response?.data)
    console.error('错误配置:', error.config)
    console.error('错误请求:', error.request)
    message.error(error.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  message.info('注册功能开发中...')
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="title">PrivaNest</h1>
      <p class="subtitle">私人影院</p>
      
      <n-form :model="loginForm" label-placement="top" size="large">
        <n-form-item label="用户名">
          <n-input 
            v-model:value="loginForm.username" 
            placeholder="请输入用户名"
            clearable
          />
        </n-form-item>
        
        <n-form-item label="密码">
          <n-input 
            v-model:value="loginForm.password" 
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
            @keyup.enter="handleLogin"
          />
        </n-form-item>
        
        <n-button 
          type="primary" 
          :loading="loading"
          block
          size="large"
          @click="handleLogin"
        >
          登录
        </n-button>
        
        <div class="register-link">
          还没有账号？
          <n-button text type="primary" @click="goToRegister">立即注册</n-button>
        </div>
      </n-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: 400px;
  
  .title {
    text-align: center;
    font-size: 32px;
    color: #333;
    margin-bottom: 8px;
  }
  
  .subtitle {
    text-align: center;
    color: #666;
    margin-bottom: 30px;
  }
  
  .register-link {
    text-align: center;
    margin-top: 16px;
    color: #666;
  }
}
</style>
