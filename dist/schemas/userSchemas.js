"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.updateProfileSchema = exports.updateUserSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.updateUserSchema = joi_1.default.object({
    firstName: joi_1.default.string().max(100).required(),
    lastName: joi_1.default.string().max(100).required(),
    role: joi_1.default.string().valid('reader', 'author', 'editor', 'admin').required(),
    isActive: joi_1.default.boolean().required()
});
exports.updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().max(100).required(),
    lastName: joi_1.default.string().max(100).required(),
    bio: joi_1.default.string().max(1000).allow(''),
    avatarUrl: joi_1.default.string().uri().allow(''),
    website: joi_1.default.string().uri().allow(''),
    socialLinks: joi_1.default.object().allow(null),
    preferences: joi_1.default.object().allow(null)
});
exports.changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(6).required()
});
//# sourceMappingURL=userSchemas.js.map