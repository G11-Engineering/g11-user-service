"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const authSchemas_1 = require("../schemas/authSchemas");
const router = (0, express_1.Router)();
exports.authRoutes = router;
// Public routes
router.post('/register', (0, validation_1.validateRequest)(authSchemas_1.registerSchema), authController_1.register);
router.post('/login', (0, validation_1.validateRequest)(authSchemas_1.loginSchema), authController_1.login);
router.post('/forgot-password', (0, validation_1.validateRequest)(authSchemas_1.forgotPasswordSchema), authController_1.forgotPassword);
router.post('/reset-password', (0, validation_1.validateRequest)(authSchemas_1.resetPasswordSchema), authController_1.resetPassword);
// Asgardeo SSO route
router.post('/asgardeo/login', authController_1.asgardeoLogin);
// Protected routes
router.post('/logout', auth_1.authenticateToken, authController_1.logout);
router.post('/refresh', authController_1.refreshToken);
//# sourceMappingURL=auth.js.map