import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { validateAsgardeoToken, extractUserInfo } from '../utils/asgardeoValidator';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, username, password, firstName, lastName } = req.body;
    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw createError('User with this email or username already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with 'reader' role (default for all new registrations)
    // Admins can upgrade to author/editor/admin via admin panel
    const result = await db.query(`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, username, first_name, last_name, role, created_at
    `, [email, username, hashedPassword, firstName, lastName, 'reader']);

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

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
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const db = getDatabase();

    // Find user
    const result = await db.query(
      'SELECT id, email, username, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw createError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw createError('Account is inactive', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Store session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.query(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, jwt.sign({ sessionId }, process.env.JWT_SECRET as string), expiresAt]
    );

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
  } catch (error) {
    next(error);
  }
};

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
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const db = getDatabase();

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
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    const db = getDatabase();

    // In a real application, you would verify the reset token
    // For this stub, we'll just return a success message
    res.json({ message: 'Password reset successful' });
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
        true  // email_verified (Asgardeo handles verification)
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
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [userInfo.firstName, userInfo.lastName, user.id]);

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
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // 8. Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, jwt.sign({ sessionId }, process.env.JWT_SECRET as string), expiresAt]
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
