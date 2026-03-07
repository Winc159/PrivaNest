import Router from '@koa/router'
import { mediaController } from '../controllers/media.js'
import { upload } from '../middlewares/upload.js'

const router = new Router()

router.get('/folders', mediaController.getFolders)
router.get('/libraries', mediaController.getLibraryPaths)
router.get('/file', mediaController.getFile) // 新增：获取原始文件
router.get('/thumbnail', mediaController.getThumbnail) // 新增：缩略图接口
router.post('/library', mediaController.addLibraryPath)
router.post('/upload', upload.single('file'), mediaController.uploadCover)
router.delete('/file', mediaController.deleteFile)
router.put('/:id/meta', mediaController.updateMeta)
router.get('/search', mediaController.search)
router.get('/clear-cache', mediaController.clearCache) // 新增：清除缓存接口

export default router