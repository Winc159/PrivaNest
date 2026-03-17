import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 懒加载 Hook - 用于文件列表的懒加载和性能优化
 */
export function useLazyLoad() {
  // 已加载的文件索引
  const loadedFiles = ref<Map<string, boolean>>(new Map())
  
  // 可见区域的文件 ID
  const visibleFiles = ref<Set<string>>(new Set())
  
  // IntersectionObserver 引用
  let observer: IntersectionObserver | null = null
  
  // 加载队列
  const loadQueue = ref<string[]>([])
  const isProcessing = ref(false)
  const maxConcurrent = 3 // 最大并发数
  
  // 检查是否在可见区域内
  const isInViewport = (element: HTMLElement, threshold = 200) => {
    const rect = element.getBoundingClientRect()
    return (
      rect.bottom >= -threshold &&
      rect.top <= window.innerHeight + threshold
    )
  }
  
  // 添加到加载队列
  const addToLoadQueue = (fileId: string) => {
    if (!loadQueue.value.includes(fileId) && !loadedFiles.value.get(fileId)) {
      loadQueue.value.push(fileId)
    }
  }
  
  // 处理加载队列
  const processQueue = async () => {
    if (isProcessing.value || loadQueue.value.length === 0) return
    
    isProcessing.value = true
    
    while (loadQueue.value.length > 0 && visibleFiles.value.size < maxConcurrent) {
      const fileId = loadQueue.value.shift()
      if (fileId) {
        visibleFiles.value.add(fileId)
        // 这里可以触发实际的加载逻辑
      }
    }
    
    isProcessing.value = false
  }
  
  // 创建 IntersectionObserver
  const createObserver = (callback: (entries: IntersectionObserverEntry[]) => void) => {
    observer = new IntersectionObserver(
      callback,
      {
        root: null,
        rootMargin: '200px', // 提前 200px 加载
        threshold: [0, 0.1, 0.5, 1]
      }
    )
  }
  
  // 观察元素
  const observe = (element: HTMLElement | null, fileId: string) => {
    if (!element || !observer) return
    
    observer.observe(element)
    
    // 标记为已观察
    loadedFiles.value.set(fileId, true)
  }
  
  // 取消观察
  const unobserve = (element: HTMLElement | null) => {
    if (!element || !observer) return
    observer.unobserve(element)
  }
  
  // 清理所有观察
  const disconnectObserver = () => {
    observer?.disconnect()
    observer = null
  }
  
  // 重置加载状态
  const reset = () => {
    loadedFiles.value.clear()
    visibleFiles.value.clear()
    loadQueue.value = []
    isProcessing.value = false
  }
  
  onMounted(() => {
    createObserver((entries) => {
      entries.forEach(entry => {
        const fileId = entry.target.getAttribute('data-file-id')
        if (!fileId) return
        
        if (entry.isIntersecting) {
          // 进入视口，加入加载队列
          addToLoadQueue(fileId)
          processQueue()
        } else {
          // 离开视口，从可见集合移除
          visibleFiles.value.delete(fileId)
        }
      })
    })
  })
  
  onUnmounted(() => {
    disconnectObserver()
  })
  
  return {
    loadedFiles,
    visibleFiles,
    observe,
    unobserve,
    disconnectObserver,
    reset,
    addToLoadQueue,
    processQueue
  }
}
