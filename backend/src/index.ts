import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { initDatabase } from './db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import planRoutes from './routes/plan';
import historyRoutes from './routes/history';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later.' },
}));

// Stricter rate limit for auth endpoints - apply directly without storing in variable
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many authentication attempts.' },
}));
app.use('/api/auth/register', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many authentication attempts.' },
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(staticPath) as any);
  
  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Galaxia Obedy 3.0 Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
