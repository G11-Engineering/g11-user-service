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
export declare function validateAsgardeoToken(idToken: string): Promise<AsgardeoTokenPayload>;
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
export declare function mapAsgardeoGroupsToRole(groups?: string[]): string;
/**
 * Extract user info from Asgardeo token
 */
export declare function extractUserInfo(payload: AsgardeoTokenPayload): {
    email: string;
    firstName: string;
    lastName: string;
    groups: string[];
    role: string;
};
export {};
//# sourceMappingURL=asgardeoValidator.d.ts.map