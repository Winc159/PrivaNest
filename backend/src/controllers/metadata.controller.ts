import fs from 'fs/promises'
import path from 'path'
import { config } from '../config/index.js'

// 模拟媒体数据库（后续替换为真实数据库）
const mediaFiles = new Map()

/**
 * 元数据控制器
 * 处理文件元数据管理、搜索等功能
 */
export const metadataController = {
  /**
   * 上传封面（可选功能）
   */
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

  /**
   * 删除文件（需要权限控制）
   */
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

  /**
   * 更新元数据
   */
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

  /**
   * 搜索媒体文件
   */
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
  }
}
