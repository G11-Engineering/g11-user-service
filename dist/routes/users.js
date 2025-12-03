"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const userSchemas_1 = require("../schemas/userSchemas");
const router = (0, express_1.Router)();
exports.userRoutes = router;
// Public route for service-to-service communication (GET user by ID)
// This allows other services to fetch user details for authentication/authorization
router.get('/:id', userController_1.getUserById);
// All other routes require authentication
router.use(auth_1.authenticateToken);
// User management routes
router.get('/', auth_1.requireAdmin, userController_1.getUsers);
router.get('/profile', userController_1.getUserProfile);
router.put('/profile', (0, validation_1.validateRequest)(userSchemas_1.updateProfileSchema), userController_1.updateUserProfile);
router.put('/:id', auth_1.requireEditor, (0, validation_1.validateRequest)(userSchemas_1.updateUserSchema), userController_1.updateUser);
router.delete('/:id', auth_1.requireAdmin, userController_1.deleteUser);
router.post('/change-password', (0, validation_1.validateRequest)(userSchemas_1.changePasswordSchema), userController_1.changePassword);
//# sourceMappingURL=users.js.map