import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { config } from '../config/index.js'
import { getMimeType } from '../utils/mime.js'

/**
 * 媒体文件控制器
 * 处理媒体文件的流式传输、缩略图生成等功能
 */
export const mediaController = {
  /**
   * 获取文件（用于播放或下载）
   * 支持 Range 请求，实现视频拖动和分片加载
   */
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
        // 尝试解码路径（处理 URL编码的特殊字符）
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
          // EPIPE 和 ERR_STREAM_PREMATURE_CLOSE 错误表示客户端提前断开（如拖动进度条），这是正常现象，静默处理
          if (error.code !== 'EPIPE' && error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
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
        const stream = createReadStream(targetPath)

        // 设置响应头
        ctx.set('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(targetPath))}"`)
        ctx.set('Content-Type', getMimeType(targetPath))
        ctx.set('Content-Length', String(stat.size))
        ctx.set('Accept-Ranges', 'bytes')
        ctx.status = 200

        // 处理流的错误事件 - 区分真实错误和正常断开
        stream.on('error', (error: any) => {
          // EPIPE 和 ERR_STREAM_PREMATURE_CLOSE 错误表示客户端提前断开，这是正常现象，静默处理
          if (error.code !== 'EPIPE' && error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
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

  /**
   * 获取视频/图片缩略图
   * 支持缓存验证（ETag）
   * 视频使用 FFmpeg 生成，图片使用 Sharp 处理
   */
  async getThumbnail(ctx: any) {
    const filePath = Array.isArray(ctx.query.path) ? ctx.query.path[0] : (ctx.query.path as string)
    const libraryIndex = parseInt(ctx.query.library || '0')

    try {
      // 验证文件路径
      if (!filePath) {
        ctx.status = 400
        ctx.body = { error: '缺少文件路径参数' }
        return
      }

      // 解码 URL 编码的路径
      let decodedPath = decodeURIComponent(filePath)

      // 移除前导斜杠
      if (decodedPath.startsWith('/')) {
        decodedPath = decodedPath.substring(1)
      }

      // 优先从指定的媒体库查找
      let resolvedPath: string | null = null

      // 先尝试从指定的媒体库查找
      if (config.mediaPaths[libraryIndex]) {
        const fullPath = path.join(config.mediaPaths[libraryIndex], decodedPath)
        try {
          await fs.access(fullPath)
          resolvedPath = fullPath
        } catch (error: any) {
          // 指定库未找到，继续遍历所有库
        }
      }

      // 如果指定库没找到，遍历所有媒体库
      if (!resolvedPath) {
        for (const root of config.mediaPaths) {
          const fullPath = path.join(root, decodedPath)

          try {
            await fs.access(fullPath)
            resolvedPath = fullPath
            break
          } catch (error: any) {
            continue
          }
        }
      }

      if (!resolvedPath) {
        ctx.status = 404
        ctx.body = {
          error: '文件不存在',
          requestedPath: decodedPath,
          searchedLibraries: config.mediaPaths.length
        }
        return
      }

      // 生成 ETag 用于缓存验证
      const stats = await fs.stat(resolvedPath)
      const etag = crypto
        .createHash('md5')
        .update(`${resolvedPath}-${stats.mtimeMs}-${stats.size}`)
        .digest('hex')

      // 设置 HTTP缓存头
      ctx.set('ETag', etag)
      ctx.set('Cache-Control', 'public, max-age=31536000') // 1 年

      // 如果客户端有缓存，返回 304
      if (ctx.fresh) {
        ctx.status = 304
        return
      }

      // 检查是否为图片文件
      const ext = path.extname(resolvedPath).toLowerCase()
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif']

      if (imageExts.includes(ext)) {
        // 图片文件：使用 Sharp 直接返回缩放后的版本
        const thumbnail = await sharp(resolvedPath)
          .rotate()
          .resize(200, 200, {
            fit: 'contain',           // ✅ 等比例缩放 + 留白
            position: 'center',       // ✅ 居中
            background: {             // ✅ 关键：补背景
              r: 0,
              g: 0,
              b: 0,
              alpha: 0 // 或 1 = 黑底
            }
          })
          .png({
            compressionLevel: 8       // ✅ PNG 正确参数
          })
          .toBuffer()

        ctx.type = 'image/png'
        ctx.body = thumbnail
      } else {
        // 视频文件或其他：使用 FFmpeg 生成缩略图
        const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv', '.flv', '.m4v', '.mpeg', '.mpg', '.3gp', '.3g2', '.rmvb', '.rm', '.asf', '.ts', '.mts']

        if (videoExts.includes(ext)) {
          try {
            const thumbnailBuffer = await generateVideoThumbnailWithFFmpeg(resolvedPath)
            ctx.type = 'image/png'
            ctx.body = thumbnailBuffer
          } catch (ffmpegError: any) {
            ctx.status = 500
            ctx.body = {
              error: '视频缩略图生成失败',
              details: ffmpegError.message
            }
          }
        } else {
          // 不支持的文件类型
          ctx.status = 400
          ctx.body = { error: '暂不支持该文件类型的缩略图生成' }
        }
      }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = {
        error: '缩略图生成失败',
        details: error.message
      }
    }
  }
}

/**
 * 使用 FFmpeg 生成视频缩略图
 * @param videoPath 视频文件路径
 * @returns PNG 格式的缩略图 Buffer
 */
async function generateVideoThumbnailWithFFmpeg(videoPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let ffmpegProcess: any = null

    // 创建 FFmpeg 进程，添加超时控制（10 秒）
    const timeoutId = setTimeout(() => {
      if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL')
      }
      reject(new Error('缩略图生成超时'))
    }, 10000)

    ffmpegProcess = ffmpeg(videoPath)
      // 只处理 1 帧
      .frames(1)
      // 输出格式为 PNG
      .outputOptions('-f image2pipe')
      .outputOptions('-c:v png')
      .on('end', async () => {
        clearTimeout(timeoutId)
        try {
          const rawBuffer = Buffer.concat(chunks)

          const thumbnail = await sharp(rawBuffer)
            .rotate()
            .resize(200, 200, {
              fit: 'contain',
              position: 'center',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ compressionLevel: 8 })
            .toBuffer()

          resolve(thumbnail)
        } catch (err) {
          reject(err)
        }
      })
      .on('error', (error) => {
        clearTimeout(timeoutId)
        // FFmpeg 失败时自动降级到提取第一帧
        console.log('FFmpeg 缩略图生成失败，尝试降级方案:', error.message)
        generateFirstFrameThumbnail(videoPath).then(resolve).catch(reject)
      })
      // 通过 pipe 输出到 stdout
      .pipe()
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
  })
}

/**
 * 降级方案：提取视频第一帧作为缩略图
 * @param videoPath 视频文件路径
 * @returns PNG 格式的缩略图 Buffer
 */
async function generateFirstFrameThumbnail(videoPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let ffmpegProcess: any = null

    // 添加超时控制（10 秒）
    const timeoutId = setTimeout(() => {
      if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL')
      }
      reject(new Error('降级缩略图生成超时'))
    }, 10000)

    ffmpegProcess = ffmpeg(videoPath)
      // 不 seek，直接取第一帧
      .frames(1)
      .outputOptions('-f image2pipe')
      .outputOptions('-c:v mjpeg')
      .outputOptions('-q:v 2')
      .on('end', async () => {
        clearTimeout(timeoutId)
        try {
          const rawBuffer = Buffer.concat(chunks)

          const thumbnail = await sharp(rawBuffer)
            .rotate()
            .resize(200, 200, {
              fit: 'contain',
              position: 'center',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ compressionLevel: 8 })
            .toBuffer()

          resolve(thumbnail)
        } catch (err) {
          reject(err)
        }
      })
      .on('error', (error) => {
        clearTimeout(timeoutId)
        console.error('降级缩略图生成失败:', error.message)
        reject(error)
      })
      .pipe()
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
  })
}
