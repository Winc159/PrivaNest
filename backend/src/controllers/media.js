import fs from 'fs/promises'
import path from 'path'
import { config } from '../config/index.js'

// 模拟媒体数据库（后续替换为真实数据库）
const mediaFiles = new Map()

export const mediaController = {
  // 获取所有已配置的媒体库路径
  async getLibraryPaths(ctx) {
    ctx.body = {
      paths: config.mediaPaths.map((p, index) => ({
        id: `lib-${index}`,
        name: path.basename(p) || p,
        fullPath: p
      }))
    }
  },
  
  // 获取文件夹列表
  async getFolders(ctx) {
    const requestedPath = ctx.query.path || '/'
    const libraryIndex = parseInt(ctx.query.library || '0')
    
    // 获取目标媒体库根路径
    const baseRoot = config.mediaPaths[libraryIndex] || config.mediaPaths[0]
    
    try {
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
      
      // 读取目录内容
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      const folders = []
      const files = []
      
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
            files.push({
              id: `file-${Date.now()}-${item.name}`,
              name: item.name,
              path: `${requestedPath === '/' ? '' : requestedPath}/${item.name}`,
              size: formatFileSize(stat.size),
              type: isVideo ? 'video' : 'image',
              ext: ext,
              library: libraryIndex
            })
          }
        }
      }
      
      ctx.body = {
        currentPath: requestedPath,
        library: libraryIndex,
        libraryName: path.basename(baseRoot),
        folders,
        files
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = { 
        message: '读取目录失败', 
        error: error.message,
        path: dirPath
      }
    }
  },
  
  // 添加新的媒体库路径
  async addLibraryPath(ctx) {
    const { customPath } = ctx.request.body
    
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
    } catch (error) {
      ctx.status = 400
      ctx.body = { message: '路径无效或无法访问', error: error.message }
    }
  },
  
  // 上传封面（可选功能）
  async uploadCover(ctx) {
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
  async deleteFile(ctx) {
    const { id, library, path: filePath } = ctx.request.body
    
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
    } catch (error) {
      ctx.status = 500
      ctx.body = { message: '删除失败', error: error.message }
    }
  },
  
  // 更新元数据
  async updateMeta(ctx) {
    const { id } = ctx.params
    const { title, description, cover } = ctx.request.body
    
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
  async search(ctx) {
    const query = ctx.query.q?.toLowerCase() || ''
    
    const results = Array.from(mediaFiles.values()).filter(file => 
      file.originalName?.toLowerCase().includes(query) ||
      file.meta?.title?.toLowerCase().includes(query)
    )
    
    ctx.body = {
      query,
      results
    }
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
