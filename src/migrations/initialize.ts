import { getDatabase } from '../config/database';
import { config } from '../config/app';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export const initializeDatabase = async (): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Read and execute the schema
    // Schema path can be configured via environment variable, otherwise use default
    const schemaPath = process.env.DATABASE_SCHEMA_PATH 
      ? process.env.DATABASE_SCHEMA_PATH
      : path.join(__dirname, '../../../../database/schemas/user-service.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    console.log('User service database schema initialized');
    
    // Create default admin user if it doesn't exist
    await createDefaultAdminUser();
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

const createDefaultAdminUser = async (): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Get admin user credentials from environment or use defaults
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cms.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const adminFirstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'Admin';
    const adminLastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'User';
    
    // Check if admin user exists
    const result = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (result.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, config.security.bcryptRounds);
      
      await db.query(`
        INSERT INTO users (email, username, password_hash, first_name, last_name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        adminEmail,
        adminUsername,
        hashedPassword,
        adminFirstName,
        adminLastName,
        'admin',
        true,
        true
      ]);
      
      console.log(`Default admin user created: ${adminEmail} / ${adminPassword}`);
    }
  } catch (error) {
    console.error('Failed to create default admin user:', error);
  }
};
