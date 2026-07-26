import { Test, TestingModule } from '@nestjs/testing';
import { AlgorithmService } from './algorithm.service';

function profile(
  userId: string,
  interests: number[] = [],
  hobbies: number[] = [],
  techStack: number[] = [],
) {
  return { userId, interests, hobbies, techStack };
}

describe('AlgorithmService', () => {
  let service: AlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlgorithmService],
    }).compile();

    service = module.get<AlgorithmService>(AlgorithmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateScore', () => {
    it('returns 0 when there is no overlap in interests, hobbies, or tech stack', () => {
      const a = profile('a', [1, 2], [10, 11], [100]);
      const b = profile('b', [3, 4], [12, 13], [101]);

      expect(service.calculateScore(a, b)).toBe(0);
    });

    it('returns 0 when both users have empty attribute lists', () => {
      const a = profile('a');
      const b = profile('b');

      expect(service.calculateScore(a, b)).toBe(0);
    });

    it('sums only the overlapping items across all three attributes for a partial overlap', () => {
      // interests: {1,2,3} vs {2,3,4} -> common [2,3] = 2
      // hobbies:   {10,11} vs {11,12} -> common [11] = 1
      // techStack: {100}    vs {200}   -> common []  = 0
      const a = profile('a', [1, 2, 3], [10, 11], [100]);
      const b = profile('b', [2, 3, 4], [11, 12], [200]);

      expect(service.calculateScore(a, b)).toBe(3);
    });

    it('sums the full length of each attribute list when everything overlaps', () => {
      const a = profile('a', [1, 2], [10, 11, 12], [100]);
      const b = profile('b', [1, 2], [10, 11, 12], [100]);

      // 2 (interests) + 3 (hobbies) + 1 (tech stack) = 6
      expect(service.calculateScore(a, b)).toBe(6);
    });

    it('does not double count duplicate ids within a single user’s own list', () => {
      const a = profile('a', [1, 1, 1]);
      const b = profile('b', [1]);

      // filter-based intersection counts every match in arr1 that exists in arr2,
      // so duplicates in the *first* argument each count individually.
      expect(service.calculateScore(a, b)).toBe(3);
    });
  });

  describe('findBestMatch', () => {
    const currentUser = profile('current', [1, 2, 3], [10], [100]);

    it('returns null when there are no candidates', () => {
      expect(service.findBestMatch(currentUser, [])).toBeNull();
    });

    it('returns the single candidate with its score when only one is given', () => {
      const candidate = profile('c1', [1], [], []);

      const result = service.findBestMatch(currentUser, [candidate]);

      expect(result).toEqual({ match: candidate, score: 1 });
    });

    it('picks the highest-scoring candidate among several', () => {
      const low = profile('low', [1], [], []); // score 1
      const high = profile('high', [1, 2, 3], [10], []); // score 4
      const mid = profile('mid', [1, 2], [], []); // score 2

      const result = service.findBestMatch(currentUser, [low, mid, high]);

      expect(result).toEqual({ match: high, score: 4 });
    });

    it('falls back to FIFO order (first candidate) when every score is 0', () => {
      const first = profile('first', [9], [9], [9]);
      const second = profile('second', [8], [8], [8]);
      const third = profile('third', [7], [7], [7]);

      const result = service.findBestMatch(currentUser, [first, second, third]);

      expect(result).toEqual({ match: first, score: 0 });
    });

    it('preserves FIFO order among candidates that tie on a non-zero score', () => {
      const first = profile('first', [1, 2], [], []); // score 2
      const second = profile('second', [1, 3], [], []); // score 2 (ties with first)

      const result = service.findBestMatch(currentUser, [first, second]);

      expect(result).toEqual({ match: first, score: 2 });
    });
  });
});
