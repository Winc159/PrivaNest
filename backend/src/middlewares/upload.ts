import multer from '@koa/multer'
import { config } from '../config/index.js'
import path from 'path'

// 配置 multer
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, config.uploadPath)
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const fileFilter = (_req: any, file: any, cb: any) => {
  // 允许的文件类型
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'image/jpeg', 'image/png']
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024 // 5GB 限制
  }
})
