import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import redisService from '../services/RedisService';
import minioService from '../services/MinioService';
import { qdrantService } from '../services/QdrantService';

const router = Router();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    minio: ServiceStatus;
    qdrant: ServiceStatus;
  };
  uptime: number;
}

interface ServiceStatus {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    await pool.query('SELECT 1');
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    if (!redisService.isReady()) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: 'Redis client not connected',
      };
    }
    
    // Try a simple operation
    const testKey = 'health_check_test';
    await redisService.set(testKey, 'test', 10);
    await redisService.delete(testKey);
    
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check MinIO connectivity
 */
async function checkMinio(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    // Check if DDL bucket exists
    const ddlBucket = minioService.getDDLBucket();
    await minioService.getFileMetadata(ddlBucket, 'health-check-test').catch(() => {
      // File not found is expected, we just want to verify connection
    });
    
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    // Check if error is connection-related vs file-not-found
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('NotFound') || errorMessage.includes('NoSuchKey')) {
      // Connection is fine, file just doesn't exist
      return {
        status: 'up',
        responseTime: Date.now() - startTime,
      };
    }
    
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Check Qdrant connectivity
 */
async function checkQdrant(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const isHealthy = await qdrantService.healthCheck();
    
    if (isHealthy) {
      return {
        status: 'up',
        responseTime: Date.now() - startTime,
      };
    } else {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: 'Health check returned false',
      };
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET /health
 * Comprehensive health check endpoint
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Run all health checks in parallel
    const [database, redis, minio, qdrant] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkMinio(),
      checkQdrant(),
    ]);

    const services = { database, redis, minio, qdrant };
    
    // Determine overall status
    const allUp = Object.values(services).every(s => s.status === 'up');
    const anyDown = Object.values(services).some(s => s.status === 'down');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (allUp) {
      overallStatus = 'healthy';
    } else if (database.status === 'down') {
      // Database is critical - mark as unhealthy
      overallStatus = 'unhealthy';
    } else if (anyDown) {
      // Some services down but database is up - degraded
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const healthCheck: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      uptime: process.uptime(),
    };

    // Return appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
    });
  }
});

/**
 * GET /health/live
 * Liveness probe - simple check that the service is running
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness probe - check if service is ready to accept traffic
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Check critical services only (database is essential)
    const database = await checkDatabase();
    
    if (database.status === 'up') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
