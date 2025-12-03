"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Centralized Application Configuration
 * All configurable values are loaded from environment variables with sensible defaults
 */
exports.config = {
    // Server Configuration
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        host: process.env.SERVER_HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development',
        baseUrl: process.env.BASE_URL || `http://${process.env.SERVER_HOST || 'localhost'}:${process.env.PORT || '3001'}`,
    },
    // Frontend/CORS Configuration
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        allowedOrigins: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
            : [process.env.FRONTEND_URL || 'http://localhost:3000'],
    },
    // Database Configuration
    database: {
        url: process.env.DATABASE_URL || 'postgresql://user_service:user_password@localhost:5433/user_service',
        pool: {
            max: parseInt(process.env.DB_POOL_MAX || '20', 10),
            idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
            connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10),
        },
        // SSL will be set based on nodeEnv in database.ts
    },
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    // Security Configuration
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
        sessionExpirationDays: parseInt(process.env.SESSION_EXPIRATION_DAYS || '7', 10),
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        },
    },
    // Asgardeo Configuration
    asgardeo: {
        baseUrl: process.env.ASGARDEO_BASE_URL || 'https://api.asgardeo.io/t/g11engineering',
        clientId: process.env.ASGARDEO_CLIENT_ID || 'Y4Yrhdn2PcIxQRLfWYDdEycYTfUa',
        m2mClientId: process.env.ASGARDEO_M2M_CLIENT_ID,
        m2mClientSecret: process.env.ASGARDEO_M2M_CLIENT_SECRET,
        organizationName: process.env.ASGARDEO_ORG_NAME,
    },
    // API Paths Configuration
    paths: {
        health: process.env.HEALTH_CHECK_PATH || '/health',
        apiPrefix: process.env.API_PREFIX || '/api',
        authPrefix: process.env.AUTH_PREFIX || '/api/auth',
        usersPrefix: process.env.USERS_PREFIX || '/api/users',
    },
    // Pagination Defaults
    pagination: {
        defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '10', 10),
        maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT || '100', 10),
    },
};
/**
 * Validate required configuration values
 */
function validateConfig() {
    const errors = [];
    if (!exports.config.jwt.secret || exports.config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
        if (exports.config.server.nodeEnv === 'production') {
            errors.push('JWT_SECRET must be set in production');
        }
    }
    if (!exports.config.database.url) {
        errors.push('DATABASE_URL must be set');
    }
    if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
}
// Validate configuration on module load (only in production)
if (exports.config.server.nodeEnv === 'production') {
    validateConfig();
}
//# sourceMappingURL=app.js.map