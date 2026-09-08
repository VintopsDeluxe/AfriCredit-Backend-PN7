// src/services/fraudService.js
import { supabase } from '../config/db.js';
import { redis } from '../config/redis.js';

/**
 * Check if the user has triggered a high velocity of loan requests (e.g. >3 in 24 hours)
 */
export const checkApplicationVelocity = async (userId) => {
  const cacheKey = `fraud:velocity:${userId}`;
  const currentCount = await redis.get(cacheKey);

  if (currentCount && parseInt(currentCount, 10) >= 3) {
    return {
      flagged: true,
      reason: 'Excessive loan application attempts detected within 24 hours.',
    };
  }

  return { flagged: false };
};

/**
 * Record a new application attempt in Redis velocity tracker
 */
export const recordApplicationAttempt = async (userId) => {
  const cacheKey = `fraud:velocity:${userId}`;
  const currentCount = await redis.get(cacheKey);

  if (!currentCount) {
    // Set initial count with 24-hour expiration (86400 seconds)
    await redis.set(cacheKey, '1', { EX: 86400 });
  } else {
    await redis.incr(cacheKey);
  }
};

/**
 * Verify if BVN or user identity is blacklisted
 */
export const checkBlacklist = async (bvn, userId) => {
  if (!bvn) return { flagged: false };

  // Check Supabase blacklists table or user profile status
  const { data: blacklistedUser } = await supabase
    .from('blacklists')
    .select('reason')
    .or(`bvn.eq.${bvn},user_id.eq.${userId}`)
    .maybeSingle();

  if (blacklistedUser) {
    return {
      flagged: true,
      reason: `Identity or BVN is blacklisted: ${blacklistedUser.reason}`,
    };
  }

  return { flagged: false };
};

/**
 * Master Fraud Evaluation Engine
 */
export const evaluateFraudRisk = async ({ userId, bvn, amount }) => {
  const flags = [];

  // 1. Velocity Check
  const velocityResult = await checkApplicationVelocity(userId);
  if (velocityResult.flagged) {
    flags.push(velocityResult.reason);
  }

  // 2. Blacklist Check
  const blacklistResult = await checkBlacklist(bvn, userId);
  if (blacklistResult.flagged) {
    flags.push(blacklistResult.reason);
  }

  // 3. Amount Threshold Spike (Example: Requests > ₦1,000,000 flag manual review)
  if (amount && amount > 1000000) {
    flags.push('High-value transaction spike flagged for mandatory risk review.');
  }

  const isFraudulent = flags.length > 0;

  return {
    isFraudulent,
    riskScore: isFraudulent ? 85 : 10, // Higher score = Higher risk
    flags,
  };
};

export const FraudService = {
  checkApplicationVelocity,
  recordApplicationAttempt,
  checkBlacklist,
  evaluateFraudRisk,
};

export default FraudService;