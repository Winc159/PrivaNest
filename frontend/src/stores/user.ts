import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserInfo {
  id: string
  username: string
  createdAt?: string
}

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo>(JSON.parse(localStorage.getItem('userInfo') || '{}'))

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value.username || '')

  // Actions
  function login(userData: UserInfo, userToken: string) {
    token.value = userToken
    userInfo.value = userData
    
    localStorage.setItem('token', userToken)
    localStorage.setItem('userInfo', JSON.stringify(userData))
  }

  function logout() {
    token.value = ''
    userInfo.value = {} as UserInfo
    
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  function updateUserInfo(data: Partial<UserInfo>) {
    userInfo.value = { ...userInfo.value, ...data }
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    username,
    login,
    logout,
    updateUserInfo
  }
})
