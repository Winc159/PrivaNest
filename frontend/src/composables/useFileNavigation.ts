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

  // 上一个访问的路径（用于判断是否返回）
  const previousPath = ref<string | null>(null)

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

  // 导航到指定路径（进入新文件夹）
  const navigateTo = (path: string, mediaStore: any) => {
    // 记录上一个路径
    previousPath.value = pathStack.value[pathStack.value.length - 1]

    loadFolders(path, mediaStore)
    if (!pathStack.value.includes(path)) {
      pathStack.value.push(path)
    }

    // 注意：不暂停当前目录的缩略图生成
    // 视口内的文件（P0）和预加载（P1）应该正常进行
    // 只有当切换媒体库或长时间离开时才考虑暂停
    console.log(`[导航] 进入新目录：${path}，缩略图继续加载`)
  }

  // 返回上一级
  const goBack = (mediaStore: any, thumbnailControl?: any) => {
    if (pathStack.value.length > 1) {
      pathStack.value.pop()
      const prevPath = pathStack.value[pathStack.value.length - 1]

      // 判断是否是返回刚才访问过的目录
      const isReturning = prevPath === previousPath.value

      loadFolders(prevPath, mediaStore)

      // 如果是返回原目录，恢复缩略图生成；否则保持正常加载
      if (thumbnailControl && !isReturning) {
        console.log(`[导航] 返回新目录：${prevPath}，缩略图继续加载`)
      } else if (thumbnailControl && isReturning) {
        console.log(`[导航] 返回原目录：${prevPath}`)
      }
    }
  }

  // 返回首页
  const goHome = (router: Router) => {
    router.push('/')
  }

  // 切换媒体库（需要暂停并清空队列）
  const handleLibraryChange = (value: number, mediaStore: any, thumbnailControl?: any) => {
    currentLibrary.value = value
    pathStack.value = ['/']

    // 切换媒体库时，暂停旧的缩略图生成并清空队列
    if (thumbnailControl) {
      thumbnailControl.clearPausedQueue()
      console.log(`[媒体库切换] 清空缩略图队列`)
    }

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
    previousPath,
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
