"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getDatabase = exports.connectDatabase = void 0;
const pg_1 = require("pg");
const app_1 = require("./app");
let pool;
const connectDatabase = async () => {
    try {
        pool = new pg_1.Pool({
            connectionString: app_1.config.database.url,
            ssl: app_1.config.server.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
            max: app_1.config.database.pool.max,
            idleTimeoutMillis: app_1.config.database.pool.idleTimeoutMillis,
            connectionTimeoutMillis: app_1.config.database.pool.connectionTimeoutMillis,
        });
        // Test the connection
        const client = await pool.connect();
        console.log('Connected to PostgreSQL database');
        client.release();
    }
    catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const getDatabase = () => {
    if (!pool) {
        throw new Error('Database not initialized. Call connectDatabase() first.');
    }
    return pool;
};
exports.getDatabase = getDatabase;
const closeDatabase = async () => {
    if (pool) {
        await pool.end();
        console.log('Database connection closed');
    }
};
exports.closeDatabase = closeDatabase;
//# sourceMappingURL=database.js.map