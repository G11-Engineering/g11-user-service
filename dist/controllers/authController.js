"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asgardeoLogin = exports.resetPassword = exports.forgotPassword = exports.refreshToken = exports.logout = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const asgardeoValidator_1 = require("../utils/asgardeoValidator");
const app_1 = require("../config/app");
const register = async (req, res, next) => {
    try {
        const { email, username, password, firstName, lastName } = req.body;
        const db = (0, database_1.getDatabase)();
        // Check if user already exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existingUser.rows.length > 0) {
            throw (0, errorHandler_1.createError)('User with this email or username already exists', 409);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, app_1.config.security.bcryptRounds);
        // Create user with 'reader' role (default for all new registrations)
        // Admins can upgrade to author/editor/admin via admin panel
        const result = await db.query(`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, username, first_name, last_name, role, created_at
    `, [email, username, hashedPassword, firstName, lastName, 'reader']);
        const user = result.rows[0];
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, app_1.config.jwt.secret, { expiresIn: app_1.config.jwt.expiresIn });
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            token
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const db = (0, database_1.getDatabase)();
        // Find user
        const result = await db.query('SELECT id, email, username, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            throw (0, errorHandler_1.createError)('Invalid credentials', 401);
        }
        const user = result.rows[0];
        if (!user.is_active) {
            throw (0, errorHandler_1.createError)('Account is inactive', 401);
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw (0, errorHandler_1.createError)('Invalid credentials', 401);
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, app_1.config.jwt.secret, { expiresIn: app_1.config.jwt.expiresIn });
        // Store session
        const sessionId = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + app_1.config.security.sessionExpirationDays * 24 * 60 * 60 * 1000);
        await db.query('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, jsonwebtoken_1.default.sign({ sessionId }, app_1.config.jwt.secret), expiresAt]);
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            token
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const logout = async (req, res, next) => {
    try {
        const db = (0, database_1.getDatabase)();
        // Remove all sessions for the user
        await db.query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.id]);
        res.json({ message: 'Logout successful' });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const refreshToken = async (req, res, next) => {
    try {
        const { id, email, role } = req.user;
        // Generate new token
        const token = jsonwebtoken_1.default.sign({ userId: id, email, role }, app_1.config.jwt.secret, { expiresIn: app_1.config.jwt.expiresIn });
        res.json({ token });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const db = (0, database_1.getDatabase)();
        // Check if user exists
        const result = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            // Don't reveal if user exists or not
            res.json({ message: 'If the email exists, a password reset link has been sent' });
            return;
        }
        // In a real application, you would send an email with a reset token
        // For this stub, we'll just return a success message
        res.json({ message: 'If the email exists, a password reset link has been sent' });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const db = (0, database_1.getDatabase)();
        // In a real application, you would verify the reset token
        // For this stub, we'll just return a success message
        res.json({ message: 'Password reset successful' });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
/**
 * Asgardeo Login - Token Exchange Endpoint
 * Receives Asgardeo ID token, validates it, creates/updates user, and issues local JWT
 */
const asgardeoLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            throw (0, errorHandler_1.createError)('Asgardeo ID token is required', 400);
        }
        // 1. Validate Asgardeo token
        const asgardeoPayload = await (0, asgardeoValidator_1.validateAsgardeoToken)(idToken);
        // 2. Extract user info and determine role from Asgardeo groups
        const userInfo = (0, asgardeoValidator_1.extractUserInfo)(asgardeoPayload);
        const db = (0, database_1.getDatabase)();
        // 3. Check if user exists in local database
        let userResult = await db.query('SELECT * FROM users WHERE email = $1', [userInfo.email]);
        let user;
        if (userResult.rows.length === 0) {
            // 4. NEW USER - Just-In-Time (JIT) Provisioning
            const username = userInfo.email.split('@')[0];
            console.log(`🆕 New user registration via Asgardeo: ${userInfo.email}`);
            userResult = await db.query(`
        INSERT INTO users (
          email,
          username,
          password_hash,
          first_name,
          last_name,
          role,
          is_active,
          email_verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, username, first_name, last_name, role, is_active, created_at
      `, [
                userInfo.email,
                username,
                'ASGARDEO_SSO', // Password not needed for SSO users
                userInfo.firstName,
                userInfo.lastName,
                userInfo.role, // Default 'reader' role - admins can upgrade via admin panel
                true, // is_active
                true // email_verified (Asgardeo handles verification)
            ]);
            user = userResult.rows[0];
            console.log(`✅ User created with ID: ${user.id}, role: ${user.role}`);
        }
        else {
            // 5. EXISTING USER - Update profile info only (NOT role)
            user = userResult.rows[0];
            console.log(`✅ Existing user login: ${user.email}, role: ${user.role}`);
            // Only update name and email verification - NEVER update role from Asgardeo
            await db.query(`
        UPDATE users
        SET
          first_name = $1,
          last_name = $2,
          email_verified = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [userInfo.firstName, userInfo.lastName, user.id]);
            user.first_name = userInfo.firstName;
            user.last_name = userInfo.lastName;
        }
        // 6. Check if user is active
        if (!user.is_active) {
            throw (0, errorHandler_1.createError)('User account is inactive. Please contact an administrator.', 403);
        }
        // 7. Generate OUR JWT token (not Asgardeo's)
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role
        }, app_1.config.jwt.secret, { expiresIn: app_1.config.jwt.expiresIn });
        // 8. Create session
        const sessionId = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + app_1.config.security.sessionExpirationDays * 24 * 60 * 60 * 1000);
        await db.query('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, jsonwebtoken_1.default.sign({ sessionId }, app_1.config.jwt.secret), expiresAt]);
        // 9. Return success response with OUR token
        res.json({
            message: 'Login successful via Asgardeo',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                isActive: user.is_active
            },
            token,
            asgardeoGroups: userInfo.groups // Include for debugging
        });
    }
    catch (error) {
        console.error('Asgardeo login error:', error);
        next(error);
    }
};
exports.asgardeoLogin = asgardeoLogin;
//# sourceMappingURL=authController.js.map