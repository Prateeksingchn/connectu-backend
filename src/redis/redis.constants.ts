export const REDIS_KEYS = {
  // Matching queue: sorted set of users waiting for match
  // Score = timestamp when they joined
  MATCHING_QUEUE: 'matching:queue',

  // User profile cache (for faster matching calculations)
  // Key pattern: user:profile:{userId}
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,

  // Active chat rooms (for cleanup/tracking)
  // Key pattern: room:{roomId}
  ACTIVE_ROOM: (roomId: string) => `room:${roomId}`,

  // User's current room (one user can only be in one room at a time)
  // Key pattern: user:room:{userId}
  USER_ROOM: (userId: string) => `user:room:${userId}`,
};

export const REDIS_TTL = {
  USER_PROFILE: 3600, // 1 hour
  ACTIVE_ROOM: 600, // 10 minutes (chat duration)
  USER_ROOM: 600, // 10 minutes
};
