import {
  scoreCollector,
  computeRecencyScore,
  rankCollectors,
  CollectorCandidate,
} from './assignment.scoring';
import { AssignmentConfig } from '../config/system-config.service';

const defaultConfig: AssignmentConfig = {
  maxRadiusKm: 10,
  maxConcurrentJobs: 5,
  maxDailyJobs: 15,
  weightDistance: 0.4,
  weightWorkload: 0.3,
  weightRating: 0.15,
  weightRecency: 0.15,
  acceptTimeoutMinutes: 10,
  maxReassignAttempts: 3,
};

describe('Assignment Scoring', () => {
  describe('computeRecencyScore', () => {
    it('should return 80 for last completed < 1h ago', () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      expect(computeRecencyScore(thirtyMinAgo)).toBe(80);
    });

    it('should return 40 for last completed < 4h ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(computeRecencyScore(twoHoursAgo)).toBe(40);
    });

    it('should return 0 for last completed > 4h ago', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      expect(computeRecencyScore(fiveHoursAgo)).toBe(0);
    });

    it('should return 0 for null (no completed jobs)', () => {
      expect(computeRecencyScore(null)).toBe(0);
    });
  });

  describe('scoreCollector', () => {
    it('should return 0 for a perfect collector (0 distance, 0 workload, 5.0 rating, no recent)', () => {
      const candidate: CollectorCandidate = {
        id: 'c1',
        distanceKm: 0,
        activeJobCount: 0,
        dailyJobCount: 0,
        avgRating: 5.0,
        lastCompletedAt: null,
      };

      const score = scoreCollector(candidate, defaultConfig);
      // distance: (0/10)*100 = 0
      // workload: (0/5)*100 = 0
      // rating: (1 - 5/5)*100 = 0
      // recency: 0
      expect(score).toBe(0);
    });

    it('should produce higher score for farther collector', () => {
      const near: CollectorCandidate = {
        id: 'c1',
        distanceKm: 2,
        activeJobCount: 0,
        dailyJobCount: 0,
        avgRating: 4.0,
        lastCompletedAt: null,
      };

      const far: CollectorCandidate = {
        id: 'c2',
        distanceKm: 8,
        activeJobCount: 0,
        dailyJobCount: 0,
        avgRating: 4.0,
        lastCompletedAt: null,
      };

      const nearScore = scoreCollector(near, defaultConfig);
      const farScore = scoreCollector(far, defaultConfig);
      expect(farScore).toBeGreaterThan(nearScore);
    });

    it('should produce higher score for busier collector', () => {
      const idle: CollectorCandidate = {
        id: 'c1',
        distanceKm: 5,
        activeJobCount: 0,
        dailyJobCount: 0,
        avgRating: 4.0,
        lastCompletedAt: null,
      };

      const busy: CollectorCandidate = {
        id: 'c2',
        distanceKm: 5,
        activeJobCount: 4,
        dailyJobCount: 0,
        avgRating: 4.0,
        lastCompletedAt: null,
      };

      const idleScore = scoreCollector(idle, defaultConfig);
      const busyScore = scoreCollector(busy, defaultConfig);
      expect(busyScore).toBeGreaterThan(idleScore);
    });

    it('should produce higher score for lower-rated collector', () => {
      const highRated: CollectorCandidate = {
        id: 'c1',
        distanceKm: 5,
        activeJobCount: 1,
        dailyJobCount: 1,
        avgRating: 4.5,
        lastCompletedAt: null,
      };

      const lowRated: CollectorCandidate = {
        id: 'c2',
        distanceKm: 5,
        activeJobCount: 1,
        dailyJobCount: 1,
        avgRating: 2.0,
        lastCompletedAt: null,
      };

      const highScore = scoreCollector(highRated, defaultConfig);
      const lowScore = scoreCollector(lowRated, defaultConfig);
      expect(lowScore).toBeGreaterThan(highScore);
    });

    it('should give new collectors (avgRating=0) a neutral rating penalty of 50', () => {
      const newCollector: CollectorCandidate = {
        id: 'c1',
        distanceKm: 0,
        activeJobCount: 0,
        dailyJobCount: 0,
        avgRating: 0, // new collector, no ratings
        lastCompletedAt: null,
      };

      const score = scoreCollector(newCollector, defaultConfig);
      // distance: 0, workload: 0, recency: 0
      // rating: (1 - 2.5/5)*100 = 50, weighted: 0.15 * 50 = 7.5
      expect(score).toBe(0.15 * 50);
    });

    it('should apply recency penalty for recently active collector', () => {
      const recentlyActive: CollectorCandidate = {
        id: 'c1',
        distanceKm: 5,
        activeJobCount: 1,
        dailyJobCount: 1,
        avgRating: 4.0,
        lastCompletedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      };

      const notRecent: CollectorCandidate = {
        id: 'c2',
        distanceKm: 5,
        activeJobCount: 1,
        dailyJobCount: 1,
        avgRating: 4.0,
        lastCompletedAt: null,
      };

      const recentScore = scoreCollector(recentlyActive, defaultConfig);
      const notRecentScore = scoreCollector(notRecent, defaultConfig);
      expect(recentScore).toBeGreaterThan(notRecentScore);
    });
  });

  describe('rankCollectors', () => {
    it('should rank collectors by score ascending (lower = better)', () => {
      const candidates: CollectorCandidate[] = [
        {
          id: 'far-busy',
          distanceKm: 9,
          activeJobCount: 4,
          dailyJobCount: 10,
          avgRating: 3.0,
          lastCompletedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          id: 'near-idle',
          distanceKm: 1,
          activeJobCount: 0,
          dailyJobCount: 0,
          avgRating: 4.8,
          lastCompletedAt: null,
        },
        {
          id: 'mid',
          distanceKm: 5,
          activeJobCount: 2,
          dailyJobCount: 5,
          avgRating: 4.0,
          lastCompletedAt: null,
        },
      ];

      const ranked = rankCollectors(candidates, defaultConfig);

      expect(ranked[0].id).toBe('near-idle');
      expect(ranked[ranked.length - 1].id).toBe('far-busy');
      expect(ranked.length).toBe(3);

      // Verify sorted ascending
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i - 1].score);
      }
    });

    it('should return empty array for no candidates', () => {
      const ranked = rankCollectors([], defaultConfig);
      expect(ranked).toEqual([]);
    });
  });
});
