import { getDatabase } from '../config/database';
import fs from 'fs';
import path from 'path';

export const initializeDatabase = async (): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Read and execute the schema
    const schemaPath = path.join(__dirname, '../../../../database/schemas/user-service.sql');
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
  } catch (error) {
    console.error('Failed to create default admin user:', error);
  }
};
