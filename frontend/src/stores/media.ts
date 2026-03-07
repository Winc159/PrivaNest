import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/request'

export interface MediaFile {
  id: string
  name: string
  path: string
  fullPath?: string // 完整路径，用于 API 请求
  size?: string
  type: 'video' | 'image' | 'folder'
  ext?: string
  library?: number
  thumbnail?: boolean // 是否有缩略图
}

export interface PaginationInfo {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasMore: boolean
}

export const useMediaStore = defineStore('media', () => {
  // State
  const currentPath = ref('/')
  const currentLibrary = ref(0)
  const folders = ref<MediaFile[]>([])
  const files = ref<MediaFile[]>([])
  const loading = ref(false)
  const pagination = ref<PaginationInfo | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(100)

  // Actions
  async function fetchFolders(path = '/', libraryIndex = 0, page = 1, useCache = true) {
    loading.value = true
    try {
      const data = await api.get<any, any>('/media/folders', {
        params: {
          path,
          library: libraryIndex,
          page,
          pageSize: pageSize.value,
          useCache
        }
      }) as any

      currentPath.value = path
      currentLibrary.value = libraryIndex
      currentPage.value = page

      // 第一页或切换目录时重置文件夹
      if (page === 1) {
        folders.value = data.folders || []
        files.value = data.files || []
      } else {
        // 加载更多时追加文件
        files.value = [...files.value, ...data.files]
      }

      pagination.value = data.pagination
    } catch (error) {
      console.error('获取文件夹失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 加载更多（下一页）
  async function loadMore() {
    if (!pagination.value || !pagination.value.hasMore) return

    const nextPage = currentPage.value + 1
    await fetchFolders(currentPath.value, currentLibrary.value, nextPage, true)
  }

  // 刷新缓存
  async function refreshCache(path?: string) {
    try {
      await api.get('/media/clear-cache', {
        params: path ? { path, library: currentLibrary.value } : {}
      })
      // 重新加载当前目录
      await fetchFolders(currentPath.value, currentLibrary.value, 1, false)
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  async function uploadFile(file: File, path: string) {
    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      // 上传成功后刷新缓存
      await refreshCache(path)
    } catch (error) {
      console.error('上传文件失败:', error)
      throw error
    }
  }

  return {
    currentPath,
    currentLibrary,
    folders,
    files,
    loading,
    pagination,
    currentPage,
    pageSize,
    fetchFolders,
    loadMore,
    refreshCache,
    uploadFile
  }
})