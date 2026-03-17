import { ref } from 'vue'
import type { Router } from 'vue-router'
import { mediaApi } from '@/api'

interface Library {
  id: string
  name: string
  fullPath: string
}

/**
 * 文件导航 Hook
 * 处理媒体库切换、目录导航、滚动加载等功能
 */
export function useFileNavigation(router?: Router) {
  const viewMode = ref<'grid' | 'list'>('grid')
  const pathStack = ref<string[]>(['/'])
  const currentLibrary = ref(0)
  const libraries = ref<Library[]>([])
  const loadingMore = ref(false)

  // 初始化媒体库列表
  const initLibraries = async () => {
    try {
      const response = await mediaApi.getLibraries()
      const paths = (response as any).paths || []
      
      // 过滤掉不存在的路径，只保留有效路径
      libraries.value = paths
        .map((p: any, index: number) => ({
          id: p.id || `lib-${index}`,
          name: p.name || p.fullPath.split('/').pop() || `Library ${index}`,
          fullPath: p.fullPath
        }))
        .filter((lib: Library) => lib.fullPath && lib.fullPath.trim() !== '')
      
      // 如果当前选择的库超出范围，重置为第一个
      if (currentLibrary.value >= libraries.value.length && libraries.value.length > 0) {
        currentLibrary.value = 0
      }
    } catch (error) {
      console.error('获取媒体库列表失败:', error)
      // 降级处理：使用环境变量配置的路径
      libraries.value = []
    }
  }

  // 加载文件夹
  const loadFolders = async (path: string, mediaStore: any) => {
    pathStack.value = ['/']
    await mediaStore.fetchFolders(path, currentLibrary.value, 1)
  }

  // 导航到指定路径
  const navigateTo = (path: string, mediaStore: any) => {
    loadFolders(path, mediaStore)
    if (!pathStack.value.includes(path)) {
      pathStack.value.push(path)
    }
  }

  // 返回上一级
  const goBack = (mediaStore: any) => {
    if (pathStack.value.length > 1) {
      pathStack.value.pop()
      const prevPath = pathStack.value[pathStack.value.length - 1]
      loadFolders(prevPath, mediaStore)
    }
  }

  // 返回首页
  const goHome = (router: Router) => {
    router.push('/')
  }

  // 切换媒体库
  const handleLibraryChange = (value: number, mediaStore: any) => {
    currentLibrary.value = value
    pathStack.value = ['/']
    
    // 同步更新 URL 参数
    if (router) {
      router.push({
        query: {
          path: '/',
          library: value
        }
      })
    }
    
    loadFolders('/', mediaStore)
  }

  // 滚动加载更多
  const handleScroll = async (e: Event, mediaStore: any) => {
    const target = e.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    
    // 距离底部还有 100px 时加载更多
    if (scrollHeight - scrollTop - clientHeight < 100 && !loadingMore.value) {
      if (mediaStore.pagination?.hasMore) {
        loadingMore.value = true
        try {
          await mediaStore.loadMore()
        } finally {
          loadingMore.value = false
        }
      }
    }
  }

  // 刷新缓存
  const handleRefresh = async (mediaStore: any) => {
    await mediaStore.refreshCache(mediaStore.currentPath)
  }

  return {
    viewMode,
    pathStack,
    currentLibrary,
    libraries,
    loadingMore,
    initLibraries,
    loadFolders,
    navigateTo,
    goBack,
    goHome,
    handleLibraryChange,
    handleScroll,
    handleRefresh
  }
}
