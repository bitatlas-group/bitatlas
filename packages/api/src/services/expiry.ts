import { prisma } from '../db/client';
import { deleteObject } from './storage';
import { logger } from './logger';

/**
 * Clean up expired x402 anonymous files.
 * 
 * 1. Find files where expiresAt < now and deletedAt is null
 * 2. Soft-delete them in the DB
 * 3. Delete the S3 blobs async
 * 
 * Called by: cron job, or manually via POST /status/cleanup (admin)
 */
export async function cleanupExpiredFiles(): Promise<{ deleted: number; errors: number }> {
  const now = new Date();

  // Find expired, non-deleted files
  const expiredFiles = await prisma.file.findMany({
    where: {
      expiresAt: { lt: now },
      deletedAt: null,
    },
    select: { id: true, storageKey: true, sizeBytes: true, userId: true },
    take: 500, // Process in batches to avoid memory pressure
  });

  if (expiredFiles.length === 0) {
    return { deleted: 0, errors: 0 };
  }

  logger.info({ count: expiredFiles.length }, '[Expiry] Processing expired files');

  let deleted = 0;
  let errors = 0;

  for (const file of expiredFiles) {
    try {
      // Soft delete in DB
      await prisma.file.update({
        where: { id: file.id },
        data: { deletedAt: now },
      });

      // Decrement storage usage if file belongs to a user
      if (file.userId) {
        await prisma.user.update({
          where: { id: file.userId },
          data: { storageUsedBytes: { decrement: Number(file.sizeBytes) } },
        }).catch(() => {}); // Don't fail if user doesn't exist
      }

      // Delete S3 blob (fire and forget, log errors)
      deleteObject(file.storageKey).catch((err) => {
        logger.error({ fileId: file.id, storageKey: file.storageKey, err: (err as Error).message }, '[Expiry] Failed to delete S3 object');
      });

      deleted++;
    } catch (err) {
      logger.error({ fileId: file.id, err: (err as Error).message }, '[Expiry] Failed to process expired file');
      errors++;
    }
  }

  logger.info({ deleted, errors, total: expiredFiles.length }, '[Expiry] Cleanup complete');
  return { deleted, errors };
}

/**
 * Start a periodic cleanup interval.
 * Runs every 6 hours by default.
 */
export function startExpiryScheduler(intervalMs = 6 * 60 * 60 * 1000): NodeJS.Timeout {
  logger.info({ intervalMs }, '[Expiry] Starting cleanup scheduler');

  // Run once on startup (delayed 60s to let services stabilize)
  setTimeout(() => {
    cleanupExpiredFiles().catch((err) => {
      logger.error({ err: (err as Error).message }, '[Expiry] Scheduled cleanup failed');
    });
  }, 60_000);

  // Then run periodically
  return setInterval(() => {
    cleanupExpiredFiles().catch((err) => {
      logger.error({ err: (err as Error).message }, '[Expiry] Scheduled cleanup failed');
    });
  }, intervalMs);
}
