/**
 * Centralized Application Configuration
 * All configurable values are loaded from environment variables with sensible defaults
 */
export declare const config: {
    server: {
        port: number;
        host: string;
        nodeEnv: string;
        baseUrl: string;
    };
    frontend: {
        url: string;
        allowedOrigins: string[];
    };
    database: {
        url: string;
        pool: {
            max: number;
            idleTimeoutMillis: number;
            connectionTimeoutMillis: number;
        };
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    security: {
        bcryptRounds: number;
        sessionExpirationDays: number;
        rateLimit: {
            windowMs: number;
            max: number;
        };
    };
    asgardeo: {
        baseUrl: string;
        clientId: string;
        m2mClientId: string | undefined;
        m2mClientSecret: string | undefined;
        organizationName: string | undefined;
    };
    paths: {
        health: string;
        apiPrefix: string;
        authPrefix: string;
        usersPrefix: string;
    };
    pagination: {
        defaultLimit: number;
        maxLimit: number;
    };
};
/**
 * Validate required configuration values
 */
export declare function validateConfig(): void;
//# sourceMappingURL=app.d.ts.map