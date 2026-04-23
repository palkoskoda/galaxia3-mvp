import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { initDatabase } from './db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
// Rate limiting temporarily disabled due to TypeScript compatibility issues

// Routes
import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import planRoutes from './routes/plan';
import historyRoutes from './routes/history';
import adminRoutes from './routes/admin';
import adminCustomerServiceRoutes from './routes/admin-customer-service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'https://galaxia3-mvp.onrender.com',
  'http://localhost:5173',
].filter(Boolean);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// TODO: Add rate limiting after fixing TypeScript compatibility
// For now, basic security is handled by helmet and CORS

// General middleware
app.use(compression() as unknown as express.RequestHandler);
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
app.use('/api/admin', adminCustomerServiceRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(staticPath) as express.RequestHandler);
  
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

// Auto-seed and sync functions
const autoSeed = async () => {
  try {
    console.log('🌱 Running auto-seed...');
    const seedScript = require('./scripts/seed');
    await seedScript.seed();
    console.log('✅ Auto-seed complete');
  } catch (error) {
    console.log('ℹ️ Seed script not available or already seeded');
  }
};

const autoSyncMenu = async () => {
  try {
    console.log('📊 Running auto-sync menu...');
    const syncScript = require('./scripts/sync-menu-data');
    await syncScript.syncMenuData();
    console.log('✅ Auto-sync complete');
  } catch (error) {
    console.log('ℹ️ Menu sync not available or already synced');
  }
};

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    
    // Auto-seed and sync in production
    if (process.env.NODE_ENV === 'production') {
      await autoSeed();
      await autoSyncMenu();
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Galaxia Obedy 3.0 Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 CORS enabled for: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
