import { ref } from 'vue'

interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
  type?: 'video' | 'image' | 'folder'
}

/**
 * 图片预览 Hook
 * 管理图片预览的状态和操作
 */
export function useImagePreview(mediaStore: any) {
  const showImagePreview = ref(false)
  const currentImageFile = ref<FileData | null>(null)
  const imageList = ref<FileData[]>([])
  const currentImageIndex = ref(0)

  // 打开图片预览
  const openImagePreview = (file: FileData) => {
    currentImageFile.value = file

    // 获取当前目录下的所有图片
    imageList.value = mediaStore.files.filter((f: { type: string }) => f.type === 'image')
    const foundIndex = imageList.value.findIndex(f => f.id === file.id)

    if (foundIndex === -1) {
      currentImageIndex.value = 0
      imageList.value = [file]
    } else {
      currentImageIndex.value = foundIndex
    }

    showImagePreview.value = true
  }

  // 关闭图片预览
  const closeImagePreview = () => {
    showImagePreview.value = false
    currentImageFile.value = null
    imageList.value = []
    currentImageIndex.value = 0
  }

  // 上一张图片
  const prevImage = () => {
    if (imageList.value.length === 0) return
    currentImageIndex.value = (currentImageIndex.value - 1 + imageList.value.length) % imageList.value.length
    currentImageFile.value = imageList.value[currentImageIndex.value]
  }

  // 下一张图片
  const nextImage = () => {
    if (imageList.value.length === 0) return
    currentImageIndex.value = (currentImageIndex.value + 1) % imageList.value.length
    currentImageFile.value = imageList.value[currentImageIndex.value]
  }

  // 处理显示状态变化
  const handleUpdateShow = (show: boolean) => {
    if (!show) {
      closeImagePreview()
    }
  }

  // 处理当前索引变化
  const handleUpdateCurrent = (index: number) => {
    currentImageIndex.value = index
    if (imageList.value[index]) {
      currentImageFile.value = imageList.value[index]
    }
  }

  return {
    showImagePreview,
    currentImageFile,
    imageList,
    currentImageIndex,
    openImagePreview,
    closeImagePreview,
    prevImage,
    nextImage,
    handleUpdateShow,
    handleUpdateCurrent
  }
}