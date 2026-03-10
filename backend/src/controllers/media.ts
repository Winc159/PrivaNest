import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import { config } from '../config/index.js'

// LRU 缓存配置
interface LRUCacheOptions {
  max: number // 最大缓存条目数
  ttl?: number // 过期时间 (毫秒)
}

// LRU 缓存实现
class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }>
  private max: number
  private ttl: number

  constructor(options: LRUCacheOptions) {
    this.cache = new Map()
    this.max = options.max
    this.ttl = options.ttl || 5 * 60 * 1000 // 默认 5 分钟
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // 更新访问时间 (LRU: 最近使用的移到末尾)
    this.cache.delete(key)
    this.cache.set(key, item)
    return item.value
  }

  set(key: string, value: T): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      // 超出容量，删除最旧的 (第一个)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

// 创建目录缓存：最多 100 个目录，缓存 5 分钟
const dirCache = new LRUCache<{
  folders: any[]
  files: any[]
  timestamp: number
}>({
  max: 100,
  ttl: 5 * 60 * 1000
})

// 模拟媒体数据库（后续替换为真实数据库）
const mediaFiles = new Map()

export const mediaController = {
  // 获取所有已配置的媒体库路径
  async getLibraryPaths(ctx: any) {
    ctx.body = {
      paths: config.mediaPaths.map((p, index) => ({
        id: `lib-${index}`,
        name: path.basename(p) || p,
        fullPath: p
      }))
    }
  },

  // 获取文件夹列表（支持缓存和分页）
  async getFolders(ctx: any) {
    const requestedPath = Array.isArray(ctx.query.path) ? ctx.query.path[0] : (ctx.query.path || '/')
    const libraryIndex = parseInt(Array.isArray(ctx.query.library) ? ctx.query.library[0] : (ctx.query.library || '0'))

    // 分页参数
    const page = parseInt(ctx.query.page || '1')
    const pageSize = parseInt(ctx.query.pageSize || '100')
    const useCache = ctx.query.useCache !== 'false' // 默认启用缓存

    // 获取目标媒体库根路径
    const baseRoot = config.mediaPaths[libraryIndex] || config.mediaPaths[0]

    try {
      // 验证媒体库路径是否配置
      if (!baseRoot) {
        ctx.status = 400
        ctx.body = {
          message: '未配置媒体库路径',
          error: '请在 .env 文件中配置 MEDIA_PATHS 或通过 API 添加媒体库路径'
        }
        return
      }

      // 构建完整路径
      const dirPath = requestedPath === '/'
        ? baseRoot
        : path.join(baseRoot, requestedPath)

      // 验证路径是否在允许的媒体库范围内（安全考虑）
      if (!dirPath.startsWith(baseRoot)) {
        ctx.status = 403
        ctx.body = { message: '禁止访问该路径' }
        return
      }

      // 检查目录是否存在
      try {
        await fs.access(dirPath)
      } catch (accessError: any) {
        ctx.status = 404
        ctx.body = {
          message: '目录不存在或无法访问',
          error: accessError.message,
          path: dirPath
        }
        return
      }

      // 验证路径是否为目录
      try {
        const stat = await fs.stat(dirPath)
        if (!stat.isDirectory()) {
          ctx.status = 400
          ctx.body = {
            message: '请求的路径必须是目录',
            path: dirPath
          }
          return
        }
      } catch (statError: any) {
        ctx.status = 500
        ctx.body = {
          message: '无法获取路径信息',
          error: statError.message,
          path: dirPath
        }
        return
      }

      // 生成缓存键
      const cacheKey = `${libraryIndex}:${requestedPath}`

      // 尝试从缓存读取
      let cachedData = null
      if (useCache) {
        cachedData = dirCache.get(cacheKey)
      }

      let folders: any[] = []
      let files: any[] = []
      let fromCache = false

      if (cachedData) {
        // 使用缓存数据
        folders = cachedData.folders
        files = cachedData.files
        fromCache = true
      } else {
        // 读取目录内容
        const items = await fs.readdir(dirPath, { withFileTypes: true })

        for (const item of items) {
          // 跳过隐藏文件
          if (item.name.startsWith('.')) continue

          if (item.isDirectory()) {
            folders.push({
              id: `folder-${Date.now()}-${item.name}`,
              name: item.name,
              path: requestedPath === '/' ? `/${item.name}` : `${requestedPath}/${item.name}`,
              type: 'folder',
              library: libraryIndex
            })
          } else {
            // 只返回视频文件和图片
            const ext = path.extname(item.name).toLowerCase()
            const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv'].includes(ext)
            const isImage = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext)

            if (isVideo || isImage) {
              const stat = await fs.stat(path.join(dirPath, item.name))
              const fullPath = requestedPath === '/' ? `/${item.name}` : `${requestedPath}/${item.name}`
              files.push({
                id: `file-${Date.now()}-${item.name}`,
                name: item.name,
                path: fullPath, // 相对路径用于显示
                fullPath: fullPath, // 添加完整路径字段用于 API 请求
                size: formatFileSize(stat.size),
                type: isVideo ? 'video' : 'image',
                ext: ext,
                library: libraryIndex
              })
            }
          }
        }

        // 存入缓存
        if (useCache) {
          dirCache.set(cacheKey, { folders, files, timestamp: Date.now() })
        }
      }

      // 应用分页
      const totalFiles = files.length
      const totalPages = Math.ceil(totalFiles / pageSize)
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize

      const paginatedFiles = files.slice(startIndex, endIndex)
      const paginatedFolders = page === 1 ? folders : [] // 只在第一页返回文件夹

      ctx.body = {
        currentPath: requestedPath,
        library: libraryIndex,
        libraryName: path.basename(baseRoot),
        folders: paginatedFolders,
        files: paginatedFiles,
        pagination: {
          page,
          pageSize,
          totalItems: totalFiles,
          totalPages,
          hasMore: endIndex < totalFiles
        },
        fromCache
      }
    } catch (error: any) {
      console.error('getFolders error:', error)
      ctx.status = 500
      ctx.body = {
        message: '读取目录失败',
        error: error.message
      }
    }
  },

  // 添加新的媒体库路径
  async addLibraryPath(ctx: any) {
    const body = ctx.request.body as any
    const { customPath } = body

    if (!customPath) {
      ctx.status = 400
      ctx.body = { message: '路径不能为空' }
      return
    }

    try {
      // 验证路径是否存在
      await fs.access(customPath)
      const stat = await fs.stat(customPath)

      if (!stat.isDirectory()) {
        ctx.status = 400
        ctx.body = { message: '路径必须是目录' }
        return
      }

      // 添加到配置（运行时临时添加，重启后消失）
      if (!config.mediaPaths.includes(customPath)) {
        config.mediaPaths.push(customPath)
      }

      ctx.body = {
        message: '添加成功',
        path: customPath
      }
    } catch (error: any) {
      ctx.status = 400
      ctx.body = { message: '路径无效或无法访问', error: error.message }
    }
  },

  // 上传封面（可选功能）
  async uploadCover(ctx: any) {
    const file = ctx.file

    if (!file) {
      ctx.status = 400
      ctx.body = { message: '未选择文件' }
      return
    }

    ctx.body = {
      message: '上传成功',
      url: `/storage/covers/${file.filename}`
    }
  },

  // 删除文件（需要权限控制）
  async deleteFile(ctx: any) {
    const body = ctx.request.body as any
    const { library, path: filePath } = body

    if (!filePath || library === undefined) {
      ctx.status = 400
      ctx.body = { message: '缺少必要参数' }
      return
    }

    try {
      const baseRoot = config.mediaPaths[library]
      const fullPath = path.join(baseRoot, filePath)

      // 安全验证
      if (!fullPath.startsWith(baseRoot)) {
        ctx.status = 403
        ctx.body = { message: '禁止删除该文件' }
        return
      }

      await fs.unlink(fullPath)
      ctx.body = { message: '删除成功' }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = { message: '删除失败', error: error.message }
    }
  },

  // 更新元数据
  async updateMeta(ctx: any) {
    const { id } = ctx.params
    const { title, description, cover } = ctx.request.body as any

    const file = mediaFiles.get(id)
    if (!file) {
      ctx.status = 404
      ctx.body = { message: '文件不存在' }
      return
    }

    file.meta = { title, description, cover }
    mediaFiles.set(id, file)

    ctx.body = {
      message: '更新成功',
      file
    }
  },

  // 搜索
  async search(ctx: any) {
    const queryParam = ctx.query.q
    const query = Array.isArray(queryParam) ? queryParam[0] : (queryParam?.toLowerCase() || '')

    const results = Array.from(mediaFiles.values()).filter(file =>
      file.originalName?.toLowerCase().includes(query) ||
      file.meta?.title?.toLowerCase().includes(query)
    )

    ctx.body = {
      query,
      results
    }
  },

  // 清除目录缓存（用于文件变更后手动刷新）
  async clearCache(ctx: any) {
    const { path: requestedPath, library } = ctx.query

    if (requestedPath) {
      // 清除特定路径的缓存
      const cacheKey = `${library || '0'}:${requestedPath}`
      dirCache.delete(cacheKey)
      ctx.body = { message: '已清除指定路径缓存', path: requestedPath }
    } else {
      // 清除所有缓存
      dirCache.clear()
      ctx.body = { message: '已清除所有缓存' }
    }
  },

  // 获取文件（用于播放或下载）
  async getFile(ctx: any) {
    const libraryIndex = parseInt(ctx.query.library || '0')
    const requestedPath = ctx.query.path as string

    if (!requestedPath) {
      ctx.status = 400
      ctx.body = { message: '缺少路径参数' }
      return
    }

    try {
      const baseRoot = config.mediaPaths[libraryIndex]
      if (!baseRoot) {
        ctx.status = 404
        ctx.body = { message: '媒体库不存在' }
        return
      }

      // 构建完整路径
      const fullPath = path.join(baseRoot, requestedPath)

      // 安全验证
      if (!fullPath.startsWith(baseRoot)) {
        ctx.status = 403
        ctx.body = { message: '禁止访问该文件' }
        return
      }

      // 检查文件是否存在 - 先尝试原始路径，再尝试解码后的路径
      let targetPath = fullPath
      let fileExists = false

      try {
        await fs.access(fullPath)
        fileExists = true
      } catch (accessError: any) {
        // 尝试解码路径（处理 URL 编码的特殊字符）
        const decodedPath = decodeURIComponent(requestedPath)
        const decodedFullPath = path.join(baseRoot, decodedPath)

        try {
          await fs.access(decodedFullPath)
          targetPath = decodedFullPath
          fileExists = true
        } catch (decodedError: any) {
          // 文件确实不存在，记录错误日志
          console.error('File not found:', {
            requestedPath,
            triedPaths: [fullPath, decodedFullPath]
          })
        }
      }

      if (!fileExists) {
        ctx.status = 404
        ctx.body = {
          message: '文件不存在或无法访问',
          requestedPath,
          triedPaths: [fullPath, path.join(baseRoot, decodeURIComponent(requestedPath))]
        }
        return
      }

      // 获取文件信息
      const stat = await fs.stat(targetPath)

      // 处理 Range 请求（用于视频拖动）
      const range = ctx.get('range')

      if (range) {
        // 解析 Range 头：bytes=start-end
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1

        // 确保范围有效
        const chunkStart = Math.max(0, Math.min(start, stat.size - 1))
        const chunkEnd = Math.min(stat.size - 1, end || stat.size - 1)
        const chunkSize = chunkEnd - chunkStart + 1

        console.log(`Range request: bytes=${chunkStart}-${chunkEnd} (${chunkSize} bytes)`)

        // 设置部分内容的响应头
        ctx.set('Content-Range', `bytes ${chunkStart}-${chunkEnd}/${stat.size}`)
        ctx.set('Accept-Ranges', 'bytes')
        ctx.set('Content-Type', getMimeType(targetPath))
        ctx.set('Content-Length', String(chunkSize))
        ctx.status = 206 // Partial Content

        // 创建指定范围的读取流
        const stream = createReadStream(targetPath, {
          start: chunkStart,
          end: chunkEnd
        })

        // 处理流的错误事件 - 区分真实错误和正常断开
        stream.on('error', (error: any) => {
          // EPIPE 错误表示客户端提前断开（如拖动进度条），这是正常现象，静默处理
          if (error.code !== 'EPIPE') {
            console.error('Range stream error:', error.message)
          }
          if (!stream.destroyed) {
            stream.destroy()
          }
        })

        // 处理提前关闭 - 用户拖动或暂停导致的正常关闭，静默处理
        stream.on('close', () => {
          if (!stream.destroyed) {
            stream.destroy()
          }
        })

        ctx.body = stream
      } else {
        // 普通请求：返回完整文件
        console.log('Full file request')

        // 流式传输文件并处理错误
        const stream = createReadStream(targetPath)

        // 设置响应头
        ctx.set('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(targetPath))}"`)
        ctx.set('Content-Type', getMimeType(targetPath))
        ctx.set('Content-Length', String(stat.size))
        ctx.set('Accept-Ranges', 'bytes')
        ctx.status = 200

        // 处理流的错误事件 - 区分真实错误和正常断开
        stream.on('error', (error: any) => {
          // EPIPE 错误表示客户端提前断开，这是正常现象，静默处理
          if (error.code !== 'EPIPE') {
            console.error('Stream error:', error.message)
          }
          if (!stream.destroyed) {
            stream.destroy()
          }
        })

        // 处理提前关闭 - 客户端可能已断开连接，静默处理
        stream.on('close', () => {
          if (!stream.destroyed) {
            stream.destroy()
          }
        })
        ctx.body = stream
      }
    } catch (error: any) {
      console.error('getFile error:', error)
      ctx.status = error.code === 'ENOENT' ? 404 : 500
      ctx.body = {
        message: '文件不存在或无法访问',
        error: error.message
      }
    }
  },

  // 获取视频/图片缩略图
  async getThumbnail(ctx: any) {
    const filePath = Array.isArray(ctx.query.path) ? ctx.query.path[0] : (ctx.query.path as string)

    try {
      // 验证文件路径
      if (!filePath) {
        ctx.status = 400
        ctx.body = { error: '缺少文件路径参数' }
        return
      }

      // 解码 URL 编码的路径
      const decodedPath = decodeURIComponent(filePath)

      // 安全检查：确保路径在媒体库范围内
      const resolvedPath = path.resolve(decodedPath)
      const isWithinLibrary = config.mediaPaths.some(root =>
        resolvedPath.startsWith(path.resolve(root))
      )

      if (!isWithinLibrary) {
        ctx.status = 403
        ctx.body = { error: '禁止访问该文件路径' }
        return
      }

      // 检查文件是否存在
      await fs.access(resolvedPath)

      // 生成 ETag 用于缓存验证
      const stats = await fs.stat(resolvedPath)
      const etag = crypto
        .createHash('md5')
        .update(`${resolvedPath}-${stats.mtimeMs}-${stats.size}`)
        .digest('hex')

      // 设置 HTTP 缓存头
      ctx.set('ETag', etag)
      ctx.set('Cache-Control', 'public, max-age=31536000') // 1 年

      // 如果客户端有缓存，返回 304
      if (ctx.fresh) {
        ctx.status = 304
        return
      }

      // 检查是否为图片文件
      const ext = path.extname(resolvedPath).toLowerCase()
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']

      if (imageExts.includes(ext)) {
        // 图片文件：直接返回缩放后的版本
        const thumbnail = await sharp(resolvedPath)
          .resize(300, 200, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 80 })
          .toBuffer()

        ctx.type = 'image/jpeg'
        ctx.body = thumbnail
      } else {
        // 视频文件或其他：返回默认图标（后续可扩展为生成视频截图）
        ctx.status = 400
        ctx.body = { error: '暂不支持该文件类型的缩略图生成' }
      }
    } catch (error) {
      console.error('生成缩略图失败:', error)
      ctx.status = 500
      ctx.body = {
        error: '生成缩略图失败',
        details: (error as Error).message
      }
    }
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 获取文件 MIME 类型
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.mkv': 'video/x-matroska',
    '.flv': 'video/x-flv',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
