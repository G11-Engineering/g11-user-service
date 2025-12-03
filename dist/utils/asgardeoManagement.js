"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockAsgardeoUser = lockAsgardeoUser;
exports.unlockAsgardeoUser = unlockAsgardeoUser;
exports.syncUserStatusWithAsgardeo = syncUserStatusWithAsgardeo;
exports.isAsgardeoManagementConfigured = isAsgardeoManagementConfigured;
const axios_1 = __importDefault(require("axios"));
const app_1 = require("../config/app");
// Cache for access token
let tokenCache = {
    token: null,
    expiresAt: 0,
};
/**
 * Get Asgardeo configuration from centralized config
 * Uses M2M (Machine-to-Machine) credentials for backend operations
 */
function getAsgardeoConfig() {
    const baseUrl = app_1.config.asgardeo.baseUrl;
    const clientId = app_1.config.asgardeo.m2mClientId;
    const clientSecret = app_1.config.asgardeo.m2mClientSecret;
    const organizationName = app_1.config.asgardeo.organizationName;
    if (!baseUrl || !clientId || !clientSecret || !organizationName) {
        throw new Error('Asgardeo Management API configuration missing. Required: ASGARDEO_BASE_URL, ASGARDEO_M2M_CLIENT_ID, ASGARDEO_M2M_CLIENT_SECRET, ASGARDEO_ORG_NAME');
    }
    return { baseUrl, clientId, clientSecret, organizationName };
}
/**
 * Get an access token for Asgardeo Management API
 * Uses client credentials grant type
 * Caches token until expiration
 */
async function getManagementAccessToken() {
    // Return cached token if still valid (with 60s buffer)
    const now = Date.now();
    if (tokenCache.token && tokenCache.expiresAt > now + 60000) {
        console.log('🔄 Using cached M2M token');
        return tokenCache.token;
    }
    const config = getAsgardeoConfig();
    try {
        const tokenUrl = `${config.baseUrl}/oauth2/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('scope', 'internal_user_mgt_update internal_user_mgt_view');
        const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
        const response = await axios_1.default.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`,
            },
        });
        const { access_token, expires_in } = response.data;
        // Cache token with expiration time
        tokenCache.token = access_token;
        tokenCache.expiresAt = now + expires_in * 1000;
        console.log(`✅ Obtained M2M access token (expires in ${expires_in}s)`);
        return access_token;
    }
    catch (error) {
        console.error('❌ Failed to get M2M token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Asgardeo Management API');
    }
}
/**
 * Get Asgardeo user ID by email
 * Required to perform user management operations
 */
async function getAsgardeoUserId(email) {
    const config = getAsgardeoConfig();
    const token = await getManagementAccessToken();
    try {
        const usersUrl = `${config.baseUrl}/scim2/Users`;
        const response = await axios_1.default.get(usersUrl, {
            params: {
                filter: `userName eq ${email}`,
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/scim+json',
            },
        });
        const users = response.data.Resources;
        if (!users || users.length === 0) {
            console.log(`⚠️ Asgardeo user not found: ${email}`);
            return null;
        }
        return users[0].id;
    }
    catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.detail || error.message;
        console.error(`❌ Failed to get Asgardeo user ID (${status}):`, message);
        return null;
    }
}
/**
 * Lock an Asgardeo user account
 * This prevents the user from logging in via Asgardeo SSO
 *
 * @param email - User's email address (used as username in Asgardeo)
 * @returns true if successful, false otherwise
 */
async function lockAsgardeoUser(email) {
    try {
        const userId = await getAsgardeoUserId(email);
        if (!userId) {
            console.warn(`⚠️ Cannot lock user - not found in Asgardeo: ${email}`);
            return false;
        }
        const config = getAsgardeoConfig();
        const token = await getManagementAccessToken();
        const userUrl = `${config.baseUrl}/scim2/Users/${userId}`;
        await axios_1.default.patch(userUrl, {
            Operations: [
                {
                    op: 'replace',
                    value: {
                        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
                            accountLocked: true,
                        },
                    },
                },
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/scim+json',
            },
        });
        console.log(`🔒 Locked Asgardeo account: ${email}`);
        return true;
    }
    catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.detail || error.message;
        console.error(`❌ Failed to lock user (${status}):`, message);
        return false;
    }
}
/**
 * Unlock an Asgardeo user account
 * This allows the user to log in via Asgardeo SSO again
 *
 * @param email - User's email address (used as username in Asgardeo)
 * @returns true if successful, false otherwise
 */
async function unlockAsgardeoUser(email) {
    try {
        const userId = await getAsgardeoUserId(email);
        if (!userId) {
            console.warn(`⚠️ Cannot unlock user - not found in Asgardeo: ${email}`);
            return false;
        }
        const config = getAsgardeoConfig();
        const token = await getManagementAccessToken();
        const userUrl = `${config.baseUrl}/scim2/Users/${userId}`;
        await axios_1.default.patch(userUrl, {
            Operations: [
                {
                    op: 'replace',
                    value: {
                        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
                            accountLocked: false,
                        },
                    },
                },
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/scim+json',
            },
        });
        console.log(`🔓 Unlocked Asgardeo account: ${email}`);
        return true;
    }
    catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.detail || error.message;
        console.error(`❌ Failed to unlock user (${status}):`, message);
        return false;
    }
}
/**
 * Sync user active status with Asgardeo
 * Locks or unlocks the Asgardeo account based on local is_active status
 *
 * @param email - User's email address
 * @param isActive - Local user active status
 * @returns true if sync was successful, false otherwise
 */
async function syncUserStatusWithAsgardeo(email, isActive) {
    try {
        console.log(`🔄 Syncing user status with Asgardeo: ${email} (active: ${isActive})`);
        if (isActive) {
            return await unlockAsgardeoUser(email);
        }
        else {
            return await lockAsgardeoUser(email);
        }
    }
    catch (error) {
        console.error('❌ Failed to sync user status with Asgardeo:', error.message);
        return false;
    }
}
/**
 * Check if Asgardeo Management API is configured
 * Returns true if all required configuration values are set
 */
function isAsgardeoManagementConfigured() {
    return !!(app_1.config.asgardeo.baseUrl &&
        app_1.config.asgardeo.m2mClientId &&
        app_1.config.asgardeo.m2mClientSecret &&
        app_1.config.asgardeo.organizationName);
}
//# sourceMappingURL=asgardeoManagement.js.map