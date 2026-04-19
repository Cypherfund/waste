import { AssignmentConfig } from '../config/system-config.service';

export interface CollectorCandidate {
  id: string;
  distanceKm: number;
  activeJobCount: number;
  dailyJobCount: number;
  avgRating: number;
  lastCompletedAt: Date | null;
}

export interface ScoredCollector {
  id: string;
  score: number;
  distanceKm: number;
}

/**
 * Score a single collector candidate.
 * Lower score = better collector.
 *
 * score = (W_distance × distance_score)
 *       + (W_workload × workload_score)
 *       + (W_rating × rating_penalty)
 *       + (W_recency × recency_score)
 */
export function scoreCollector(
  candidate: CollectorCandidate,
  config: AssignmentConfig,
): number {
  const distanceScore =
    (candidate.distanceKm / config.maxRadiusKm) * 100;

  const workloadScore =
    (candidate.activeJobCount / config.maxConcurrentJobs) * 100;

  // New collectors (avgRating=0) get neutral score of 50 per Phase 1 §5.2
  const effectiveRating = candidate.avgRating === 0 ? 2.5 : candidate.avgRating;
  const ratingPenalty =
    (1 - (effectiveRating / 5)) * 100;

  const recencyScore = computeRecencyScore(candidate.lastCompletedAt);

  return (
    config.weightDistance * distanceScore +
    config.weightWorkload * workloadScore +
    config.weightRating * ratingPenalty +
    config.weightRecency * recencyScore
  );
}

/**
 * Recency score based on time since last completed job.
 * < 1h → 80, < 4h → 40, otherwise → 0
 */
export function computeRecencyScore(lastCompletedAt: Date | null): number {
  if (!lastCompletedAt) return 0;

  const hoursSince =
    (Date.now() - lastCompletedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return 80;
  if (hoursSince < 4) return 40;
  return 0;
}

/**
 * Score all candidates and return sorted (best first = lowest score).
 */
export function rankCollectors(
  candidates: CollectorCandidate[],
  config: AssignmentConfig,
): ScoredCollector[] {
  return candidates
    .map((c) => ({
      id: c.id,
      score: scoreCollector(c, config),
      distanceKm: c.distanceKm,
    }))
    .sort((a, b) => a.score - b.score);
}
