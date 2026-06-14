import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { redis } from '../services/redis';
import { generateDownloadUrl } from '../services/storage';
import { shareResolveRateLimit } from '../middleware/rateLimit';
import { getShareLimits } from '../config/shareLimits';

/**
 * Per-owner daily egress guard. Counts share downloads per owner per UTC day in
 * Redis (self-expiring) and returns true if this download stays within the
 * owner's plan cap. Fails OPEN on Redis errors — availability over strictness.
 */
async function withinDailyEgress(ownerId: string, plan: string | null | undefined): Promise<boolean> {
  const cap = getShareLimits(plan).dailyEgressCap;
  if (cap === null) return true;
  try {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const key = `share:egress:${ownerId}:${day}`;
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, 86400);
    return used <= cap;
  } catch {
    return true;
  }
}

/**
 * Public, unauthenticated share-resolve router.
 *
 * Mounted OUTSIDE the /vault auth-or-pay stack: anyone with the link can resolve
 * it. We return only ciphertext coordinates (name, mime, IVs, auth tag) plus a
 * short-lived presigned download URL. We NEVER see or store the file key — it
 * lives in the URL fragment, which the browser never sends to us. The viewer
 * page reads it client-side and decrypts in the browser.
 */
const router = Router();

// Resolve presigned URLs to a tight window — long enough to start the download,
// short enough that a leaked metadata response isn't a durable grant.
const PRESIGN_EXPIRY_SECONDS = 60;

// GET /share/:shareId — resolve a share (public, no auth)
router.get('/:shareId', shareResolveRateLimit, async (req: Request, res: Response): Promise<void> => {
  const now = new Date();

  const share = await prisma.share.findUnique({
    where: { id: req.params.shareId },
    select: {
      id: true,
      createdBy: true,
      maxDownloads: true,
      downloadCount: true,
      revokedAt: true,
      expiresAt: true,
      file: {
        select: {
          name: true,
          mimeType: true,
          sizeBytes: true,
          originalSizeBytes: true,
          storageKey: true,
          fileIv: true,
          authTag: true,
          deletedAt: true,
        },
      },
    },
  });

  // Unknown id, or the underlying file was deleted → 404 (don't leak existence).
  if (!share || share.file.deletedAt) {
    res.status(404).json({ error: 'This share link does not exist' });
    return;
  }

  // Expired / revoked / exhausted → 410 Gone.
  const exhausted = share.maxDownloads !== null && share.downloadCount >= share.maxDownloads;
  if (share.revokedAt || share.expiresAt <= now || exhausted) {
    res.status(410).json({ error: 'This share link is no longer available' });
    return;
  }

  // Per-owner daily egress cap (bounds free bandwidth from public links).
  const owner = await prisma.user.findUnique({ where: { id: share.createdBy }, select: { plan: true } });
  if (!(await withinDailyEgress(share.createdBy, owner?.plan))) {
    res.status(429).json({ error: "This share link's owner has reached their daily download limit. Try again tomorrow." });
    return;
  }

  // Atomically claim a download slot. The WHERE clause re-checks liveness so two
  // concurrent requests can't both consume the last download.
  const claim = await prisma.share.updateMany({
    where: {
      id: share.id,
      revokedAt: null,
      expiresAt: { gt: now },
      ...(share.maxDownloads !== null ? { downloadCount: { lt: share.maxDownloads } } : {}),
    },
    data: { downloadCount: { increment: 1 } },
  });
  if (claim.count === 0) {
    res.status(410).json({ error: 'This share link is no longer available' });
    return;
  }

  const downloadUrl = await generateDownloadUrl(share.file.storageKey, PRESIGN_EXPIRY_SECONDS);

  const downloadsRemaining =
    share.maxDownloads === null ? null : Math.max(0, share.maxDownloads - (share.downloadCount + 1));

  // name/mimeType are plaintext metadata by design (see vault model). No keys here.
  res.json({
    name: share.file.name,
    mimeType: share.file.mimeType,
    sizeBytes: (share.file.originalSizeBytes ?? share.file.sizeBytes).toString(),
    fileIv: share.file.fileIv,
    authTag: share.file.authTag,
    downloadUrl,
    expiresAt: share.expiresAt,
    downloadsRemaining,
  });
});

export default router;
