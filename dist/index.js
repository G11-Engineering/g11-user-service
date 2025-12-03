"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("./routes/auth");
const users_1 = require("./routes/users");
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("./config/database");
const initialize_1 = require("./migrations/initialize");
const app_1 = require("./config/app");
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: app_1.config.frontend.allowedOrigins,
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: app_1.config.security.rateLimit.windowMs,
    max: app_1.config.security.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get(app_1.config.paths.health, (req, res) => {
    res.json({ status: 'OK', service: 'user-service', timestamp: new Date().toISOString() });
});
// Routes
app.use(app_1.config.paths.authPrefix, auth_1.authRoutes);
app.use(app_1.config.paths.usersPrefix, users_1.userRoutes);
// Error handling
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Initialize database and start server
async function startServer() {
    try {
        await (0, database_1.connectDatabase)();
        await (0, initialize_1.initializeDatabase)();
        app.listen(app_1.config.server.port, app_1.config.server.host, () => {
            console.log(`User Service running on ${app_1.config.server.baseUrl}`);
            console.log(`Health check: ${app_1.config.server.baseUrl}${app_1.config.paths.health}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map