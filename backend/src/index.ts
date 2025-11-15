import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import filesRoutes from './routes/files';
import generateRoutes from './routes/generate';
import versionsRoutes from './routes/versions';
import historyRoutes from './routes/history';
import healthRoutes from './routes/health';
import minioService from './services/MinioService';
import { qdrantService } from './services/QdrantService';
import redisService from './services/RedisService';
import versionCacheService from './services/VersionCacheService';
import { VersionRepository } from './repositories/VersionRepository';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check routes (before other routes for quick access)
app.use('/', healthRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/versions', versionsRoutes);
app.use('/api', filesRoutes);
app.use('/api', generateRoutes);
app.use('/api', historyRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Centralized error handler - must be last
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize MinIO buckets
    await minioService.initializeBuckets();
    console.log('MinIO buckets initialized successfully');
    
    // Initialize Qdrant collection
    await qdrantService.initializeCollection();
    console.log('Qdrant collection initialized successfully');
    
    // Initialize Redis connection
    try {
      await redisService.connect();
      console.log('Redis connection initialized successfully');
      
      // Warm cache for active versions (optional, runs in background)
      const versionRepository = new VersionRepository();
      const versions = await versionRepository.findAll();
      if (versions.length > 0) {
        console.log(`Warming cache for ${versions.length} versions...`);
        versionCacheService.warmCacheForVersions(
          versions.map(v => ({ id: v.id, name: v.name }))
        ).catch(err => {
          console.error('Error warming cache:', err);
          // Don't fail startup if cache warming fails
        });
      }
    } catch (redisError) {
      console.warn('Redis connection failed, continuing without cache:', redisError);
      // Continue without Redis - the app will work without caching
    }
    
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();
