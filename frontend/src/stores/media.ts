import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MediaFile {
  id: string
  name: string
  path: string
  size?: string
  type: 'video' | 'image' | 'folder'
  ext?: string
  library?: number
}

export const useMediaStore = defineStore('media', () => {
  // State
  const currentPath = ref('/')
  const currentLibrary = ref(0)
  const folders = ref<MediaFile[]>([])
  const files = ref<MediaFile[]>([])
  const loading = ref(false)

  // Actions
  async function fetchFolders(path = '/', libraryIndex = 0) {
    loading.value = true
    try {
      // TODO: 调用后端 API
      // const response = await api.get(`/media/folders?path=${path}&library=${libraryIndex}`)
      currentPath.value = path
      currentLibrary.value = libraryIndex
      // folders.value = response.data.folders
      // files.value = response.data.files
      
      console.log(`加载媒体库 ${libraryIndex}, 路径：${path}`)
    } catch (error) {
      console.error('获取文件夹失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function uploadFile(file: File, path: string) {
    // TODO: 实现文件上传
    console.log('上传文件:', file, '到路径:', path)
  }

  return {
    currentPath,
    currentLibrary,
    folders,
    files,
    loading,
    fetchFolders,
    uploadFile
  }
})
