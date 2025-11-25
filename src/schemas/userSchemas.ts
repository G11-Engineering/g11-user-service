import Joi from 'joi';

export const updateUserSchema = Joi.object({
  firstName: Joi.string().max(100).required(),
  lastName: Joi.string().max(100).allow('').required(),
  role: Joi.string().valid('reader', 'author', 'editor', 'admin').required(),
  isActive: Joi.boolean().required()
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().max(100).required(),
  lastName: Joi.string().max(100).required(),
  bio: Joi.string().max(1000).allow(''),
  avatarUrl: Joi.string().uri().allow(''),
  website: Joi.string().uri().allow(''),
  socialLinks: Joi.object().allow(null),
  preferences: Joi.object().allow(null)
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});
