import Router from 'koa-router'
import authController from '../controllers/auth.js'

const router = new Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/profile', authController.getProfile)
router.put('/profile', authController.updateProfile)

export default router
