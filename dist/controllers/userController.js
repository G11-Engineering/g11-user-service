"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateUserProfile = exports.getUserProfile = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const getUsers = async (req, res, next) => {
    try {
        const db = (0, database_1.getDatabase)();
        const { page = 1, limit = 10, role, search } = req.query;
        let query = 'SELECT id, email, username, first_name, last_name, role, is_active, created_at FROM users';
        const conditions = [];
        const params = [];
        let paramCount = 0;
        if (role) {
            paramCount++;
            conditions.push(`role = $${paramCount}`);
            params.push(role);
        }
        if (search) {
            paramCount++;
            conditions.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';
        const offset = (Number(page) - 1) * Number(limit);
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(Number(limit));
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);
        const result = await db.query(query, params);
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM users';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await db.query(countQuery, params.slice(0, -2));
        res.json({
            users: result.rows,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.getDatabase)();
        const result = await db.query('SELECT id, email, username, first_name, last_name, role, avatar_url, bio, is_active, created_at FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserById = getUserById;
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, role, isActive } = req.body;
        const db = (0, database_1.getDatabase)();
        // Check if user exists
        const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        const result = await db.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, role = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, email, username, first_name, last_name, role, is_active, updated_at
    `, [firstName, lastName, role, isActive, id]);
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = (0, database_1.getDatabase)();
        // Check if user exists
        const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        // Don't allow deleting self
        if (id === req.user.id) {
            throw (0, errorHandler_1.createError)('Cannot delete your own account', 400);
        }
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
const getUserProfile = async (req, res, next) => {
    try {
        const db = (0, database_1.getDatabase)();
        const result = await db.query(`
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.role, u.avatar_url, u.bio, u.created_at,
             p.website, p.social_links, p.preferences
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [req.user.id]);
        if (result.rows.length === 0) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserProfile = getUserProfile;
const updateUserProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, bio, avatarUrl, website, socialLinks, preferences } = req.body;
        const db = (0, database_1.getDatabase)();
        // Update user table
        await db.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, bio = $3, avatar_url = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [firstName, lastName, bio, avatarUrl, req.user.id]);
        // Update or insert profile
        await db.query(`
      INSERT INTO user_profiles (user_id, website, social_links, preferences)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET website = $2, social_links = $3, preferences = $4, updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, website, socialLinks, preferences]);
        res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateUserProfile = updateUserProfile;
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const db = (0, database_1.getDatabase)();
        // Get current password hash
        const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, result.rows[0].password_hash);
        if (!isValidPassword) {
            throw (0, errorHandler_1.createError)('Current password is incorrect', 400);
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        // Update password
        await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, req.user.id]);
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=userController.js.map