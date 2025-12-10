import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { createError } from '../middleware/errorHandler';
import { config } from '../config/app';


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

// Initialize JWKS client with caching for performance
// JWKS endpoint: https://api.asgardeo.io/t/{organization_name}/oauth2/jwks
const client = jwksClient({
  jwksUri: `${config.asgardeo.baseUrl}/oauth2/jwks`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours - public keys rarely change
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

/**
 * Get signing key from JWKS endpoint
 */
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('❌ Failed to get signing key from JWKS:', err.message);
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Validates Asgardeo ID token with proper signature verification
 *
 * Per Asgardeo documentation:
 * - Verifies signature using JWKS endpoint
 * - Validates issuer, audience, and expiration claims
 *
 * @see https://wso2.com/asgardeo/docs/guides/authentication/oidc/validate-id-tokens/
 */
export async function validateAsgardeoToken(idToken: string): Promise<AsgardeoTokenPayload> {
  try {
    console.log('🔐 Validating Asgardeo ID token with JWKS signature verification...');

    // Verify token signature using Asgardeo's public key from JWKS endpoint
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(
        idToken,
        getKey,
        {
          audience: config.asgardeo.clientId,
          issuer: `${config.asgardeo.baseUrl}/oauth2/token`,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(decoded);
        }
      );
    });

    console.log('✅ Token signature verified successfully');

    // Asgardeo may use 'username' or 'email' claim depending on configuration
    const email = decoded.email || decoded.username;

    // Validate required fields
    if (!email) {
      throw createError('Token missing email/username claim', 401);
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

    console.error('❌ Token validation error:', error.message || error);

    // Provide specific error messages based on error type
    if (error.name === 'TokenExpiredError') {
      throw createError('Asgardeo token has expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw createError('Invalid Asgardeo token signature', 401);
    }
    if (error.name === 'NotBeforeError') {
      throw createError('Asgardeo token not yet valid', 401);
    }
    if (error.message?.includes('JWKS') || error.message?.includes('signing key')) {
      throw createError('Failed to fetch Asgardeo public keys. Check network connectivity to *.asgardeo.io', 503);
    }

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
