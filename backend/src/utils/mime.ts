import path from 'path'

/**
 * MIME 类型映射表
 */
const MIME_TYPES: Record<string, string> = {
  // 视频格式
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.mkv': 'video/x-matroska',
  '.flv': 'video/x-flv',
  
  // 图片格式
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}

/**
 * 根据文件扩展名获取 MIME 类型
 * @param filePath - 文件路径
 * @returns MIME 类型字符串
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}
