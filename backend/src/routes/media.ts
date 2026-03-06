import Router from 'koa-router'
import {mediaController} from '../controllers/media.ts'
import { upload } from '../middlewares/upload.ts'

const router = new Router()

router.get('/folders', mediaController.getFolders)
router.get('/libraries', mediaController.getLibraryPaths)
router.post('/library', mediaController.addLibraryPath)
router.post('/upload', upload.single('file'), mediaController.uploadCover)
router.delete('/file', mediaController.deleteFile)
router.put('/:id/meta', mediaController.updateMeta)
router.get('/search', mediaController.search)

export default router
