/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 检查文件扩展名是否为视频格式
 * @param ext - 文件扩展名（带点号）
 * @returns 是否为视频文件
 */
export function isVideoFile(ext: string): boolean {
  const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv', '.flv']
  return videoExts.includes(ext.toLowerCase())
}

/**
 * 检查文件扩展名是否为图片格式
 * @param ext - 文件扩展名（带点号）
 * @returns 是否为图片文件
 */
export function isImageFile(ext: string): boolean {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif']
  return imageExts.includes(ext.toLowerCase())
}
