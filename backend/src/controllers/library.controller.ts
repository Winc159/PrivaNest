import fs from 'fs/promises'
import path from 'path'
import { config } from '../config/index.js'
import { dirCache } from '../utils/cache.js'
import { formatFileSize, isVideoFile, isImageFile } from '../utils/file.js'

/**
 * 媒体库控制器
 * 处理媒体库管理和文件夹浏览相关功能
 */
export const libraryController = {
  /**
   * 获取所有已配置的媒体库路径
   */
  async getLibraryPaths(ctx: any) {
    ctx.body = {
      paths: config.mediaPaths.map((p, index) => ({
        id: `lib-${index}`,
        name: path.basename(p) || p,
        fullPath: p
      }))
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

  /**
   * 添加新的媒体库路径
   */
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
