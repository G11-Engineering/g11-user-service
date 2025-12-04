import jwt from 'jsonwebtoken';
import { createError } from '../middleware/errorHandler';

// Asgardeo configuration
const ASGARDEO_BASE_URL = process.env.ASGARDEO_BASE_URL || 'https://api.asgardeo.io/t/g11engineering';
const ASGARDEO_CLIENT_ID = process.env.ASGARDEO_CLIENT_ID || 'Y4Yrhdn2PcIxQRLfWYDdEycYTfUa';

interface AsgardeoTokenPayload {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  aud: string;
  iss: string;
  exp: number;
}

/**
 * Validates Asgardeo ID token
 * Note: In production, this should verify the signature using Asgardeo's public keys (JWKS)
 * For now, we decode and validate the structure
 */
export async function validateAsgardeoToken(idToken: string): Promise<AsgardeoTokenPayload> {
  try {
    // Decode token (without verification for now - add jwks-rsa for production)
    const decoded = jwt.decode(idToken) as any;

    if (!decoded) {
      throw createError('Invalid token format', 401);
    }

    // Asgardeo may use 'username' or 'email' claim depending on configuration
    const email = decoded.email || decoded.username;

    // Validate required fields
    if (!email) {
      throw createError('Token missing email/username claim', 401);
    }

    // Validate audience (should be your client ID)
    if (decoded.aud && decoded.aud !== ASGARDEO_CLIENT_ID) {
      console.warn('⚠️ Token audience mismatch. Expected:', ASGARDEO_CLIENT_ID, 'Got:', decoded.aud);
    }

    // Validate issuer
    if (decoded.iss && !decoded.iss.includes('asgardeo.io')) {
      throw createError('Invalid token issuer', 401);
    }

    // Check expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw createError('Token has expired', 401);
    }

    return {
      sub: decoded.sub,
      email: email,
      given_name: decoded.given_name || '',
      family_name: decoded.family_name || '',
      groups: decoded.groups || [],
      aud: decoded.aud,
      iss: decoded.iss,
      exp: decoded.exp
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error('❌ Token validation error:', error);
    throw createError('Failed to validate Asgardeo token', 401);
  }
}

/**
 * Returns default role for new users
 *
 * IMPORTANT: Asgardeo is used ONLY for authentication (2FA), NOT for role management.
 * All roles are managed locally in the database.
 * Admins assign author/editor/admin roles via the admin panel.
 *
 * @param groups - Asgardeo groups (ignored for role assignment)
 * @returns Always returns 'reader' - the default role for new users
 */
export function mapAsgardeoGroupsToRole(groups: string[] = []): string {
  // Always return 'reader' for new users
  // Admins can upgrade roles via admin panel
  return 'reader';
}

/**
 * Extract user info from Asgardeo token
 */
export function extractUserInfo(payload: AsgardeoTokenPayload) {
  return {
    asgardeoUserId: payload.sub,
    email: payload.email,
    firstName: payload.given_name || payload.email.split('@')[0],
    lastName: payload.family_name || '',
    groups: payload.groups || [],
    role: mapAsgardeoGroupsToRole(payload.groups)
  };
}
