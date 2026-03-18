import Router from '@koa/router'
import { mediaController } from '../controllers/media.js'
import { upload } from '../middlewares/upload.js'

const router = new Router()

// 媒体库管理
router.get('/folders', mediaController.getFolders)
router.get('/libraries', mediaController.getLibraryPaths)

// 文件访问
router.get('/file', mediaController.getFile) // 获取原始文件
router.get('/thumbnail', mediaController.getThumbnail) // 缩略图接口

// 文件操作
router.post('/upload', upload.single('file'), mediaController.uploadCover)
router.delete('/file', mediaController.deleteFile)
router.put('/:id/meta', mediaController.updateMeta)

// 搜索
router.get('/search', mediaController.search)

// 缓存管理
router.get('/clear-cache', mediaController.clearCache as any) // 清除缓存接口

export default router