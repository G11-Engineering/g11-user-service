import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { validateAsgardeoToken, extractUserInfo } from '../utils/asgardeoValidator';
import { config } from '../config/app';

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Remove all sessions for the user
    await db.query('DELETE FROM user_sessions WHERE user_id = $1', [req.user!.id]);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, email, role } = req.user!;
    
    // Generate new token
    const token = jwt.sign(
      { userId: id, email, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
};

/**
 * Asgardeo Login - Token Exchange Endpoint
 * Receives Asgardeo ID token, validates it, creates/updates user, and issues local JWT
 */
export const asgardeoLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw createError('Asgardeo ID token is required', 400);
    }

    // 1. Validate Asgardeo token
    const asgardeoPayload = await validateAsgardeoToken(idToken);

    // 2. Extract user info and determine role from Asgardeo groups
    const userInfo = extractUserInfo(asgardeoPayload);

    const db = getDatabase();

    // 3. Check if user exists in local database
    let userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [userInfo.email]
    );

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
          email_verified,
          asgardeo_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, email, username, first_name, last_name, role, is_active, created_at
      `, [
        userInfo.email,
        username,
        'ASGARDEO_SSO', // Password not needed for SSO users
        userInfo.firstName,
        userInfo.lastName,
        userInfo.role, // Default 'reader' role - admins can upgrade via admin panel
        true, // is_active
        true,  // email_verified (Asgardeo handles verification)
        userInfo.asgardeoUserId // Store Asgardeo user ID for user management
      ]);

      user = userResult.rows[0];
      console.log(`✅ User created with ID: ${user.id}, role: ${user.role}`);
    } else {
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
          asgardeo_user_id = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [userInfo.firstName, userInfo.lastName, user.id, userInfo.asgardeoUserId]);

      user.first_name = userInfo.firstName;
      user.last_name = userInfo.lastName;
    }

    // 6. Check if user is active
    if (!user.is_active) {
      throw createError('User account is inactive. Please contact an administrator.', 403);
    }

    // 7. Generate OUR JWT token (not Asgardeo's)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    // 8. Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + config.security.sessionExpirationDays * 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, jwt.sign({ sessionId }, config.jwt.secret), expiresAt]
    );

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
  } catch (error) {
    console.error('Asgardeo login error:', error);
    next(error);
  }
};
