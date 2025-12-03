"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAsgardeoToken = validateAsgardeoToken;
exports.mapAsgardeoGroupsToRole = mapAsgardeoGroupsToRole;
exports.extractUserInfo = extractUserInfo;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
const app_1 = require("../config/app");
/**
 * Validates Asgardeo ID token
 * Note: In production, this should verify the signature using Asgardeo's public keys (JWKS)
 * For now, we decode and validate the structure
 */
async function validateAsgardeoToken(idToken) {
    try {
        // Decode token (without verification for now - add jwks-rsa for production)
        const decoded = jsonwebtoken_1.default.decode(idToken);
        if (!decoded) {
            throw (0, errorHandler_1.createError)('Invalid token format', 401);
        }
        // Asgardeo may use 'username' or 'email' claim depending on configuration
        const email = decoded.email || decoded.username;
        // Validate required fields
        if (!email) {
            throw (0, errorHandler_1.createError)('Token missing email/username claim', 401);
        }
        // Validate audience (should be your client ID)
        if (decoded.aud && decoded.aud !== app_1.config.asgardeo.clientId) {
            console.warn('⚠️ Token audience mismatch. Expected:', app_1.config.asgardeo.clientId, 'Got:', decoded.aud);
        }
        // Validate issuer
        if (decoded.iss && !decoded.iss.includes('asgardeo.io')) {
            throw (0, errorHandler_1.createError)('Invalid token issuer', 401);
        }
        // Check expiration
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            throw (0, errorHandler_1.createError)('Token has expired', 401);
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
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console.error('❌ Token validation error:', error);
        throw (0, errorHandler_1.createError)('Failed to validate Asgardeo token', 401);
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
function mapAsgardeoGroupsToRole(groups = []) {
    // Always return 'reader' for new users
    // Admins can upgrade roles via admin panel
    return 'reader';
}
/**
 * Extract user info from Asgardeo token
 */
function extractUserInfo(payload) {
    return {
        email: payload.email,
        firstName: payload.given_name || payload.email.split('@')[0],
        lastName: payload.family_name || '',
        groups: payload.groups || [],
        role: mapAsgardeoGroupsToRole(payload.groups)
    };
}
//# sourceMappingURL=asgardeoValidator.js.map