import fs from 'fs/promises'
import path from 'path'
import { config } from '../config/index.js'
import { dirCache } from '../utils/cache.js'
import { formatFileSize, isVideoFile, isImageFile } from '../utils/file.js'
import crypto from 'crypto'

/**
 * 媒体库控制器
 * 处理媒体库管理和文件夹浏览相关功能
 */
export const libraryController = {
  /**
   * 获取所有已配置的媒体库路径
   * 只返回实际存在且可访问的路径
   */
  async getLibraryPaths(ctx: any) {
    const validPaths = []
    
    for (const [index, p] of config.mediaPaths.entries()) {
      try {
        // 验证路径是否存在且可访问
        await fs.access(p)
        const stat = await fs.stat(p)
        
        // 确保是目录
        if (stat.isDirectory()) {
          validPaths.push({
            id: `lib-${index}`,
            name: path.basename(p) || p,
            fullPath: p
          })
        } else {
          console.warn(`跳过非目录路径：${p}`)
        }
      } catch (error: any) {
        // 路径不存在或无法访问，不添加到返回列表
        console.warn(`媒体库路径无法访问：${p} - ${error.message}`)
      }
    }
    
    ctx.body = {
      paths: validPaths
    }
  },

  /**
   * 获取文件夹列表（支持缓存和分页）
   */
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
        cachedData = await dirCache.get(cacheKey)
      }

      let folders: any[] = []
      let files: any[] = []
      let fromCache = false

      if (cachedData) {
        // 使用缓存数据（增加数据有效性验证）
        folders = Array.isArray(cachedData.folders) ? cachedData.folders : []
        files = Array.isArray(cachedData.files) ? cachedData.files : []
        fromCache = true
        
        // 如果缓存数据无效，重新读取目录
        if (folders.length === 0 && files.length === 0) {
          fromCache = false
          cachedData = null
        } else {
          console.log(`[使用缓存数据] 文件夹：${folders.length}个，文件：${files.length}个`)
        }
      }

      if (!cachedData) {
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

            if (isVideoFile(ext) || isImageFile(ext)) {
              const stat = await fs.stat(path.join(dirPath, item.name))
              const fullPath = requestedPath === '/' ? `/${item.name}` : `${requestedPath}/${item.name}`
              files.push({
                id: `file-${Date.now()}-${item.name}`,
                name: item.name,
                path: fullPath,
                fullPath: fullPath,
                size: formatFileSize(stat.size),
                type: isVideoFile(ext) ? 'video' : 'image',
                ext: ext.replace('.', ''), // 移除前导点号
                library: libraryIndex,
                mtime: stat.mtimeMs // 修改时间，用于缓存验证
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
          totalFiles,
          totalPages,
          hasMore: page < totalPages
        },
        fromCache
      }
    } catch (error: any) {
      console.error(`[错误] 获取文件夹列表失败：${error.message}`)
      ctx.status = 500
      ctx.body = {
        message: '读取目录失败',
        error: error.message
      }
    }
  },

  /**
   * 获取单个文件的缩略图（带缓存）
   */
  async getThumbnail(ctx: any) {
    const requestedPath = Array.isArray(ctx.query.path) ? ctx.query.path[0] : (ctx.query.path || '')
    const libraryIndex = parseInt(Array.isArray(ctx.query.library) ? ctx.query.library[0] : (ctx.query.library || '0'))
    const width = parseInt(ctx.query.width || '600')
    const height = parseInt(ctx.query.height || '400')

    const baseRoot = config.mediaPaths[libraryIndex] || config.mediaPaths[0]
    const filePath = path.join(baseRoot, requestedPath)

    try {
      // 验证文件是否存在
      await fs.access(filePath)
      const stat = await fs.stat(filePath)

      // 生成缓存键（基于路径、修改时间和大小）
      const cacheKey = crypto
        .createHash('md5')
        .update(`${filePath}:${stat.mtimeMs}:${stat.size}`)
        .digest('hex')

      const thumbnailPath = path.join(config.thumbnailPath, String(libraryIndex), `${cacheKey}.jpg`)

      // 检查缩略图缓存是否存在
      try {
        await fs.access(thumbnailPath)
        // 缓存命中，直接返回
        ctx.set('Content-Type', 'image/jpeg')
        ctx.set('Cache-Control', 'public, max-age=86400') // 缓存 24 小时
        ctx.body = await fs.readFile(thumbnailPath)
        console.log(`[缩略图缓存命中] ${requestedPath}`)
        return
      } catch (err) {
        // 缓存未命中，需要生成
      }

      // 如果是图片，直接返回原图（前端会自己处理）
      const ext = path.extname(filePath).toLowerCase()
      if (isImageFile(ext)) {
        ctx.set('Content-Type', `image/${ext.replace('.', '')}`)
        ctx.body = await fs.readFile(filePath)
        console.log(`[返回原图] ${requestedPath}`)
        return
      }

      // 如果是视频，返回占位图（前端会用 Canvas 生成封面）
      if (isVideoFile(ext)) {
        // 创建一个简单的 SVG 占位图
        const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <rect width="100%" height="100%" fill="#1a1a1a"/>
          <text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="24">🎬</text>
        </svg>`
        
        ctx.set('Content-Type', 'image/svg+xml')
        ctx.body = placeholder
        console.log(`[视频占位图] ${requestedPath}`)
        return
      }

      // 不支持的文件类型
      ctx.status = 400
      ctx.body = { message: '不支持的文件类型' }
    } catch (error: any) {
      console.error(`[错误] 获取缩略图失败：${error.message}`)
      ctx.status = 404
      ctx.body = {
        message: '文件不存在或无法读取',
        error: error.message
      }
    }
  },

  /**
   * 清除目录缓存（用于文件变更后手动刷新）
   */
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
  }
}