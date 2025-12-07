import { Router } from 'express';
import { logout, refreshToken, asgardeoLogin } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Asgardeo SSO route (only authentication method)
router.post('/asgardeo/login', asgardeoLogin);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.post('/refresh', refreshToken);

export { router as authRoutes };
