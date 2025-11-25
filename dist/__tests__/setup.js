"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
// Setup test database
beforeAll(async () => {
    await (0, database_1.connectDatabase)();
});
// Clean up after tests
afterAll(async () => {
    // Close database connection
    process.exit(0);
});
//# sourceMappingURL=setup.js.map