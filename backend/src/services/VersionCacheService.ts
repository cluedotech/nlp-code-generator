import redisService from './RedisService';
import { FileRepository } from '../repositories/FileRepository';
import minioService from './MinioService';
import { FileMetadata } from '../models/types';

interface VersionContext {
  versionId: string;
  versionName: string;
  ddlFiles: Array<{
    id: string;
    filename: string;
    content: string;
  }>;
  supportingDocs: Array<{
    id: string;
    filename: string;
    content: string;
  }>;
  cachedAt: string;
}

class VersionCacheService {
  private fileRepository: FileRepository;
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly CACHE_PREFIX = 'version_context:';

  constructor() {
    this.fileRepository = new FileRepository();
  }

  /**
   * Generate cache key for a version
   */
  private getCacheKey(versionId: string): string {
    return `${this.CACHE_PREFIX}${versionId}`;
  }

  /**
   * Get version context from cache
   */
  async getVersionContext(versionId: string): Promise<VersionContext | null> {
    try {
      const cacheKey = this.getCacheKey(versionId);
      const cached = await redisService.get(cacheKey);
      
      if (cached) {
        console.log(`Cache hit for version ${versionId}`);
        return JSON.parse(cached) as VersionContext;
      }
      
      console.log(`Cache miss for version ${versionId}`);
      return null;
    } catch (error) {
      console.error('Error getting version context from cache:', error);
      return null;
    }
  }

  /**
   * Load version context from database and MinIO, then cache it
   */
  async loadAndCacheVersionContext(versionId: string, versionName: string): Promise<VersionContext> {
    try {
      // Get all files for this version
      const files = await this.fileRepository.findByVersionId(versionId);
      
      // Separate DDL files and supporting docs
      const ddlFiles: FileMetadata[] = files.filter(f => f.fileType === 'ddl');
      const supportingDocs: FileMetadata[] = files.filter(f => f.fileType === 'supporting_doc');
      
      // Load content from MinIO for all files
      const ddlContents = await Promise.all(
        ddlFiles.map(async (file) => {
          const bucket = minioService.getDDLBucket();
          const buffer = await minioService.downloadFile(bucket, file.storagePath);
          const content = buffer.toString('utf-8');
          return {
            id: file.id,
            filename: file.filename,
            content,
          };
        })
      );
      
      const docContents = await Promise.all(
        supportingDocs.map(async (file) => {
          const bucket = minioService.getDocsBucket();
          const buffer = await minioService.downloadFile(bucket, file.storagePath);
          const content = buffer.toString('utf-8');
          return {
            id: file.id,
            filename: file.filename,
            content,
          };
        })
      );
      
      const context: VersionContext = {
        versionId,
        versionName,
        ddlFiles: ddlContents,
        supportingDocs: docContents,
        cachedAt: new Date().toISOString(),
      };
      
      // Cache the context
      const cacheKey = this.getCacheKey(versionId);
      await redisService.set(cacheKey, JSON.stringify(context), this.CACHE_TTL);
      
      console.log(`Cached version context for ${versionId}`);
      return context;
    } catch (error) {
      console.error('Error loading and caching version context:', error);
      throw error;
    }
  }

  /**
   * Get or load version context (cache-first strategy)
   */
  async getOrLoadVersionContext(versionId: string, versionName: string): Promise<VersionContext> {
    // Try to get from cache first
    const cached = await this.getVersionContext(versionId);
    if (cached) {
      return cached;
    }
    
    // If not in cache, load from database and cache it
    return await this.loadAndCacheVersionContext(versionId, versionName);
  }

  /**
   * Invalidate cache for a specific version
   */
  async invalidateVersionCache(versionId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(versionId);
      await redisService.delete(cacheKey);
      console.log(`Invalidated cache for version ${versionId}`);
    } catch (error) {
      console.error('Error invalidating version cache:', error);
    }
  }

  /**
   * Invalidate all version caches
   */
  async invalidateAllVersionCaches(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const deletedCount = await redisService.deletePattern(pattern);
      console.log(`Invalidated ${deletedCount} version caches`);
    } catch (error) {
      console.error('Error invalidating all version caches:', error);
    }
  }

  /**
   * Warm cache for a specific version
   */
  async warmCache(versionId: string, versionName: string): Promise<void> {
    try {
      console.log(`Warming cache for version ${versionId}`);
      await this.loadAndCacheVersionContext(versionId, versionName);
    } catch (error) {
      console.error('Error warming cache:', error);
    }
  }

  /**
   * Warm cache for multiple versions (active versions)
   */
  async warmCacheForVersions(versions: Array<{ id: string; name: string }>): Promise<void> {
    console.log(`Warming cache for ${versions.length} versions`);
    await Promise.all(
      versions.map(v => this.warmCache(v.id, v.name))
    );
  }
}

// Export singleton instance
const versionCacheService = new VersionCacheService();
export default versionCacheService;
