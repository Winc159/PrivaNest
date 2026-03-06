import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'privanest-secret-key',
  
  // 媒体库路径（支持多个）
  mediaPaths: (process.env.MEDIA_PATHS || '/default/media')
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0),
  
  coverPath: process.env.COVER_PATH || './storage/covers',
  dbPath: process.env.DB_PATH || './storage/database.db',
  
  // 上传临时目录（用于封面等）
  uploadPath: './storage/uploads'
}
