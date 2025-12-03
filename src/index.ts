import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/database';
import { initializeDatabase } from './migrations/initialize';
import { config } from './config/app';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.frontend.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get(config.paths.health, (req, res) => {
  res.json({ status: 'OK', service: 'user-service', timestamp: new Date().toISOString() });
});

// Routes
app.use(config.paths.authPrefix, authRoutes);
app.use(config.paths.usersPrefix, userRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await connectDatabase();
    await initializeDatabase();
    
    app.listen(config.server.port, config.server.host, () => {
      console.log(`User Service running on ${config.server.baseUrl}`);
      console.log(`Health check: ${config.server.baseUrl}${config.paths.health}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
