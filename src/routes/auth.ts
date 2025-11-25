import { Router } from 'express';
import { register, login, logout, refreshToken, forgotPassword, resetPassword, asgardeoLogin } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/authSchemas';

const router = Router();

// Public routes
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

// Asgardeo SSO route
router.post('/asgardeo/login', asgardeoLogin);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.post('/refresh', refreshToken);

export { router as authRoutes };
