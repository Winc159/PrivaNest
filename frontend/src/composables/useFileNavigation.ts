import { ref } from 'vue'
import type { Router } from 'vue-router'

interface Library {
  id: string
  name: string
  fullPath: string
}

/**
 * 文件导航 Hook
 * 处理媒体库切换、目录导航、滚动加载等功能
 */
export function useFileNavigation() {
  const viewMode = ref<'grid' | 'list'>('grid')
  const pathStack = ref<string[]>(['/'])
  const currentLibrary = ref(0)
  const libraries = ref<Library[]>([])
  const loadingMore = ref(false)

  // 初始化媒体库列表
  const initLibraries = async () => {
    // TODO: 获取已配置的媒体库列表
    libraries.value = [
      { id: 'lib-0', name: 'Movies', fullPath: '/Volumes/Media/Movies' },
      { id: 'lib-1', name: 'Series', fullPath: '/Volumes/Data/Series' }
    ]
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
