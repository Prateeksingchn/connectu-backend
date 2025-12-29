import { Injectable, Logger } from '@nestjs/common';

interface UserProfile {
  userId: string;
  interests: number[];
  hobbies: number[];
  techStack: number[];
}

@Injectable()
export class AlgorithmService {
  private readonly logger = new Logger(AlgorithmService.name);

  /**
   * Calculate matching score between two users
   * Score = |common interests| + |common hobbies| + |common tech stacks|
   */
  calculateScore(user1: UserProfile, user2: UserProfile): number {
    const commonInterests = this.findIntersection(
      user1.interests,
      user2.interests,
    );
    const commonHobbies = this.findIntersection(user1.hobbies, user2.hobbies);
    const commonTechStack = this.findIntersection(
      user1.techStack,
      user2.techStack,
    );
    
    const score =
      commonInterests.length + commonHobbies.length + commonTechStack.length;

    this.logger.debug(
      `Score between ${user1.userId} and ${user2.userId}: ${score} (interests: ${commonInterests.length}, hobbies: ${commonHobbies.length}, tech: ${commonTechStack.length})`,
    );

    return score;
  }

  /**
   * Find best match for a user from a list of candidates
   * Returns the candidate with highest score
   * If all scores are 0, returns the first candidate (FIFO fallback)
   */
  findBestMatch(
    currentUser: UserProfile,
    candidates: UserProfile[],
  ): { match: UserProfile; score: number } | null {
    if (candidates.length === 0) {
      return null;
    }

    // Calculate scores for all candidates
    const scoredCandidates = candidates.map((candidate) => ({
      user: candidate,
      score: this.calculateScore(currentUser, candidate),
    }));
    
    // Sort by score (descending), then by queue position (FIFO for ties)
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      return 0; // Keep original order for ties (FIFO)
    });

    const best = scoredCandidates[0];

    this.logger.log(
      `Best match for ${currentUser.userId}: ${best.user.userId} with score ${best.score}`,
    );

    return { match: best.user, score: best.score };
  }

  /**
   * Find intersection of two arrays
   */
  private findIntersection(arr1: number[], arr2: number[]): number[] {
    return arr1.filter((item) => arr2.includes(item));
  }
}

