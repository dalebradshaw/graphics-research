/**
 * Transcript Caching - File-based caching utilities with TTL support
 */
import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface CacheEntry<T = unknown> {
  data: T;
  createdAt: string;
  expiresAt?: string;
}

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export interface CacheOptions {
  defaultTtlMs?: number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class TranscriptCache {
  private cacheDir: string;
  private defaultTtlMs: number;
  private initialized: boolean = false;

  constructor(cacheDir: string = ".transcript-cache", options: CacheOptions = {}) {
    this.cacheDir = path.resolve(process.cwd(), cacheDir);
    this.defaultTtlMs = options.defaultTtlMs || DEFAULT_TTL_MS;
  }

  /**
   * Initialize the cache directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to create cache directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate cache key for a video ID
   */
  private getCacheKey(videoId: string): string {
    return crypto.createHash("sha256").update(videoId).digest("hex").slice(0, 16);
  }

  /**
   * Get cache file path for a key
   */
  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Get cached data if it exists and is not expired
   */
  async get<T>(videoId: string): Promise<T | null> {
    await this.initialize();

    const key = this.getCacheKey(videoId);
    const filePath = this.getCacheFilePath(key);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const entry: CacheEntry<T> = JSON.parse(content);

      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        await this.delete(videoId);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Store data in cache
   */
  async set<T>(videoId: string, data: T, ttlMs?: number): Promise<void> {
    await this.initialize();

    const key = this.getCacheKey(videoId);
    const filePath = this.getCacheFilePath(key);

    const entry: CacheEntry<T> = {
      data,
      createdAt: new Date().toISOString()
    };

    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    if (effectiveTtl > 0) {
      entry.expiresAt = new Date(Date.now() + effectiveTtl).toISOString();
    }

    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), "utf-8");
  }

  /**
   * Delete cached entry
   */
  async delete(videoId: string): Promise<void> {
    await this.initialize();

    const key = this.getCacheKey(videoId);
    const filePath = this.getCacheFilePath(key);

    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Check if cache entry exists
   */
  async has(videoId: string): Promise<boolean> {
    const data = await this.get(videoId);
    return data !== null;
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files
          .filter((f) => f.endsWith(".json"))
          .map((f) => fs.unlink(path.join(this.cacheDir, f)))
      );
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      let totalSize = 0;
      let oldestEntry: Date | null = null;
      let newestEntry: Date | null = null;

      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const entry: CacheEntry<unknown> = JSON.parse(content);
          const createdAt = new Date(entry.createdAt);

          if (!oldestEntry || createdAt < oldestEntry) {
            oldestEntry = createdAt;
          }
          if (!newestEntry || createdAt > newestEntry) {
            newestEntry = createdAt;
          }
        } catch {
          // Skip invalid entries
        }
      }

      return {
        totalEntries: jsonFiles.length,
        totalSizeBytes: totalSize,
        oldestEntry,
        newestEntry
      };
    } catch {
      return {
        totalEntries: 0,
        totalSizeBytes: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      let removedCount = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file);

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const entry: CacheEntry<unknown> = JSON.parse(content);

          if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
            await fs.unlink(filePath);
            removedCount++;
          }
        } catch {
          // Skip invalid entries
        }
      }

      return removedCount;
    } catch {
      return 0;
    }
  }

  /**
   * List all cached video IDs (for debugging)
   */
  async listEntries(): Promise<Array<{ videoId: string; createdAt: string; expiresAt?: string }>> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.cacheDir);
      const entries: Array<{ videoId: string; createdAt: string; expiresAt?: string }> = [];

      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const filePath = path.join(this.cacheDir, file);

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const entry: CacheEntry<unknown> = JSON.parse(content);

          entries.push({
            videoId: file.replace(".json", ""),
            createdAt: entry.createdAt,
            expiresAt: entry.expiresAt
          });
        } catch {
          // Skip invalid entries
        }
      }

      return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }
}

export default TranscriptCache;
