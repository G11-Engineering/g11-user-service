import axios from 'axios';
import { getDatabase } from '../config/database';

/**
 * Asgardeo Management API Client
 *
 * This utility provides functions to manage Asgardeo users via the Management API.
 * Used to sync user status (lock/unlock) between local database and Asgardeo.
 *
 * Documentation: https://wso2.com/asgardeo/docs/apis/users/
 */

interface AsgardeoConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  organizationName: string;
}

interface AsgardeoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Cache for access token
let tokenCache: {
  token: string | null;
  expiresAt: number;
} = {
  token: null,
  expiresAt: 0,
};

/**
 * Get Asgardeo configuration from environment variables
 * Uses M2M (Machine-to-Machine) credentials for backend operations
 */
function getAsgardeoConfig(): AsgardeoConfig {
  const baseUrl = process.env.ASGARDEO_BASE_URL;
  const clientId = process.env.ASGARDEO_M2M_CLIENT_ID;
  const clientSecret = process.env.ASGARDEO_M2M_CLIENT_SECRET;
  const organizationName = process.env.ASGARDEO_ORG_NAME;

  if (!baseUrl || !clientId || !clientSecret || !organizationName) {
    throw new Error(
      'Asgardeo Management API configuration missing. Required: ASGARDEO_BASE_URL, ASGARDEO_M2M_CLIENT_ID, ASGARDEO_M2M_CLIENT_SECRET, ASGARDEO_ORG_NAME'
    );
  }

  return { baseUrl, clientId, clientSecret, organizationName };
}

/**
 * Get an access token for Asgardeo Management API
 * Uses client credentials grant type
 * Caches token until expiration
 */
async function getManagementAccessToken(): Promise<string> {
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

    const response = await axios.post<AsgardeoTokenResponse>(tokenUrl, params, {
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
  } catch (error: any) {
    console.error('❌ Failed to get M2M token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Asgardeo Management API');
  }
}


/**
 * Lock an Asgardeo user account
 * This prevents the user from logging in via Asgardeo SSO
 *
 * @param email - User's email address (used as username in Asgardeo)
 * @returns true if successful, false otherwise
 */
export async function lockAsgardeoUser(email: string): Promise<boolean> {
  try {
    // Get Asgardeo user ID from local database
    const db = getDatabase();
    const userResult = await db.query(
      'SELECT asgardeo_user_id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].asgardeo_user_id) {
      console.warn(`⚠️ Cannot lock user - No Asgardeo ID found for: ${email}`);
      return false;
    }

    const asgardeoUserId = userResult.rows[0].asgardeo_user_id;
    const config = getAsgardeoConfig();
    const token = await getManagementAccessToken();
    const userUrl = `${config.baseUrl}/scim2/Users/${asgardeoUserId}`;

    console.log(`🔒 Locking Asgardeo user: ${email} (ID: ${asgardeoUserId})`);
    console.log(`📡 PATCH ${userUrl}`);

    await axios.patch(
      userUrl,
      {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          {
            op: 'replace',
            value: {
              'urn:scim:wso2:schema': {
                accountLocked: true,
              },
            },
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/scim+json',
        },
      }
    );

    console.log(`✅ Locked Asgardeo account: ${email}`);
    return true;
  } catch (error: any) {
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
export async function unlockAsgardeoUser(email: string): Promise<boolean> {
  try {
    // Get Asgardeo user ID from local database
    const db = getDatabase();
    const userResult = await db.query(
      'SELECT asgardeo_user_id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].asgardeo_user_id) {
      console.warn(`⚠️ Cannot unlock user - No Asgardeo ID found for: ${email}`);
      return false;
    }

    const asgardeoUserId = userResult.rows[0].asgardeo_user_id;
    const config = getAsgardeoConfig();
    const token = await getManagementAccessToken();
    const userUrl = `${config.baseUrl}/scim2/Users/${asgardeoUserId}`;

    console.log(`🔓 Unlocking Asgardeo user: ${email} (ID: ${asgardeoUserId})`);
    console.log(`📡 PATCH ${userUrl}`);

    await axios.patch(
      userUrl,
      {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          {
            op: 'replace',
            value: {
              'urn:scim:wso2:schema': {
                accountLocked: false,
              },
            },
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/scim+json',
        },
      }
    );

    console.log(`✅ Unlocked Asgardeo account: ${email}`);
    return true;
  } catch (error: any) {
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
export async function syncUserStatusWithAsgardeo(email: string, isActive: boolean): Promise<boolean> {
  try {
    console.log(`🔄 Syncing user status with Asgardeo: ${email} (active: ${isActive})`);

    if (isActive) {
      return await unlockAsgardeoUser(email);
    } else {
      return await lockAsgardeoUser(email);
    }
  } catch (error: any) {
    console.error('❌ Failed to sync user status with Asgardeo:', error.message);
    return false;
  }
}

/**
 * Check if Asgardeo Management API is configured
 * Returns true if all required environment variables are set
 */
export function isAsgardeoManagementConfigured(): boolean {
  return !!(
    process.env.ASGARDEO_BASE_URL &&
    process.env.ASGARDEO_M2M_CLIENT_ID &&
    process.env.ASGARDEO_M2M_CLIENT_SECRET &&
    process.env.ASGARDEO_ORG_NAME
  );
}
