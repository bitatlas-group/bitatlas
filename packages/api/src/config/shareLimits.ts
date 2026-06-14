/**
 * Plan-aware limits for zero-knowledge share links.
 *
 * Goal: bound worst-case egress (the real cost vector) without hurting normal
 * use. Every value is env-overridable so limits can be tuned without a redeploy.
 *
 * Enforced in two places:
 *   - share creation (vault.ts): active-share cap, max downloads/share, max
 *     expiry, max shareable file size.
 *   - share resolution (share.ts): per-owner daily egress cap (Redis counter).
 */

export type ExpiryOption = '24h' | '7d' | '30d';

/** Ordering so we can compare "is requested expiry larger than allowed". */
export const EXPIRY_RANK: Record<ExpiryOption, number> = { '24h': 1, '7d': 2, '30d': 3 };

export interface ShareLimits {
  activeShareCap: number | null; // max live shares a user may hold; null = unlimited
  maxDownloadsPerShare: number | null; // hard cap on a share's download limit; null = uncapped
  defaultDownloads: number | null; // applied when the caller omits maxDownloads; null = no default cap
  maxExpiry: ExpiryOption; // largest expiry the plan may pick
  maxShareableBytes: number; // largest file (plaintext size) the plan may share
  dailyEgressCap: number | null; // per-owner share downloads per day; null = unlimited
}

const MB = 1024 * 1024;
const int = (v: string | undefined, d: number) => (v !== undefined ? parseInt(v, 10) : d);

const FREE: ShareLimits = {
  activeShareCap: int(process.env.SHARE_FREE_ACTIVE_CAP, 10),
  maxDownloadsPerShare: int(process.env.SHARE_FREE_MAX_DOWNLOADS, 100),
  defaultDownloads: int(process.env.SHARE_FREE_DEFAULT_DOWNLOADS, 100),
  maxExpiry: (process.env.SHARE_FREE_MAX_EXPIRY as ExpiryOption) || '7d',
  maxShareableBytes: int(process.env.SHARE_FREE_MAX_MB, 25) * MB,
  dailyEgressCap: int(process.env.SHARE_FREE_DAILY_EGRESS, 500),
};

const PAID: ShareLimits = {
  activeShareCap: null,
  maxDownloadsPerShare: null,
  defaultDownloads: null,
  maxExpiry: (process.env.SHARE_PAID_MAX_EXPIRY as ExpiryOption) || '30d',
  maxShareableBytes: int(process.env.SHARE_PAID_MAX_MB, 100) * MB,
  dailyEgressCap: int(process.env.SHARE_PAID_DAILY_EGRESS, 10000),
};

/** Resolve the limit set for a user's plan. Unknown/missing plan → free. */
export function getShareLimits(plan: string | null | undefined): ShareLimits {
  return plan && plan !== 'free' ? PAID : FREE;
}
