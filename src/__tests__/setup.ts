import { connectDatabase } from '../config/database';

// Setup test database
beforeAll(async () => {
  await connectDatabase();
});

// Clean up after tests
afterAll(async () => {
  // Close database connection
  process.exit(0);
});
