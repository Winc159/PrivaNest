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
  '.m4v': 'video/x-m4v',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
  '.rmvb': 'application/vnd.rn-realmedia-vbr',
  '.rm': 'application/vnd.rn-realmedia',
  '.asf': 'video/x-ms-asf',
  '.ts': 'video/mp2t',
  '.mts': 'video/mp2t',

  // 图片格式
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.svg': 'image/svg+xml',
  '.svgz': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.raw': 'image/x-raw',
  '.cr2': 'image/x-canon-cr2',
  '.nef': 'image/x-nikon-nef',
  '.arw': 'image/x-sony-arw',
  '.dng': 'image/x-adobe-dng'
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
