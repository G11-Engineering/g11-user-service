/**
 * Lock an Asgardeo user account
 * This prevents the user from logging in via Asgardeo SSO
 *
 * @param email - User's email address (used as username in Asgardeo)
 * @returns true if successful, false otherwise
 */
export declare function lockAsgardeoUser(email: string): Promise<boolean>;
/**
 * Unlock an Asgardeo user account
 * This allows the user to log in via Asgardeo SSO again
 *
 * @param email - User's email address (used as username in Asgardeo)
 * @returns true if successful, false otherwise
 */
export declare function unlockAsgardeoUser(email: string): Promise<boolean>;
/**
 * Sync user active status with Asgardeo
 * Locks or unlocks the Asgardeo account based on local is_active status
 *
 * @param email - User's email address
 * @param isActive - Local user active status
 * @returns true if sync was successful, false otherwise
 */
export declare function syncUserStatusWithAsgardeo(email: string, isActive: boolean): Promise<boolean>;
/**
 * Check if Asgardeo Management API is configured
 * Returns true if all required configuration values are set
 */
export declare function isAsgardeoManagementConfigured(): boolean;
//# sourceMappingURL=asgardeoManagement.d.ts.map