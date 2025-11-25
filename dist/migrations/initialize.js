"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = void 0;
const database_1 = require("../config/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const initializeDatabase = async () => {
    try {
        const db = (0, database_1.getDatabase)();
        // Read and execute the schema
        const schemaPath = path_1.default.join(__dirname, '../../../../database/schemas/user-service.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        await db.query(schema);
        console.log('User service database schema initialized');
        // Create default admin user if it doesn't exist
        await createDefaultAdminUser();
    }
    catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
const createDefaultAdminUser = async () => {
    try {
        const db = (0, database_1.getDatabase)();
        // Check if admin user exists
        const result = await db.query('SELECT id FROM users WHERE email = $1', ['admin@cms.com']);
        if (result.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            await db.query(`
        INSERT INTO users (email, username, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                'admin@cms.com',
                'admin',
                hashedPassword,
                'Admin',
                'User',
                'admin',
                true,
                true
            ]);
            console.log('Default admin user created: admin@cms.com / admin123');
        }
    }
    catch (error) {
        console.error('Failed to create default admin user:', error);
    }
};
//# sourceMappingURL=initialize.js.map