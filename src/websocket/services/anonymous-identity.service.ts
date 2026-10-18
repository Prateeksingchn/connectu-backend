import { Injectable, Logger } from '@nestjs/common';

interface AnonymousNameMapping {
  roomId: string;
  userId: string;
  anonymousName: string;
}

@Injectable()
export class AnonymousIdentityService {
  private readonly logger = new Logger(AnonymousIdentityService.name);

  // In-memory storage: roomId -> Map<userId, anonymousName>
  private readonly roomIdentities = new Map<string, Map<string, string>>();

  // Adjective pool for generating names
  private readonly adjectives = [
    'Silent',
    'Curious',
    'Brave',
    'Swift',
    'Clever',
    'Mystic',
    'Bold',
    'Calm',
    'Wise',
    'Bright',
    'Dark',
    'Wild',
    'Gentle',
    'Fierce',
    'Noble',
    'Ancient',
    'Young',
    'Quick',
    'Steady',
    'Lucky',
    'Happy',
    'Sneaky',
    'Proud',
    'Humble',
    'Bold',
    'Shy',
    'Eager',
    'Calm',
    'Witty',
    'Sharp',
    'Smooth',
    'Rough',
    'Smooth',
    'Crisp',
    'Fresh',
  ];

  // Noun pool for generating names
  private readonly nouns = [
    'Fox',
    'Coder',
    'Otter',
    'Eagle',
    'Wolf',
    'Bear',
    'Tiger',
    'Lion',
    'Dragon',
    'Phoenix',
    'Raven',
    'Hawk',
    'Falcon',
    'Shark',
    'Dolphin',
    'Penguin',
    'Owl',
    'Cat',
    'Dog',
    'Horse',
    'Deer',
    'Rabbit',
    'Squirrel',
    'Badger',
    'Lynx',
    'Jaguar',
    'Panther',
    'Leopard',
    'Cheetah',
    'Coyote',
    'Mongoose',
    'Weasel',
    'Ferret',
    'Stoat',
    'Marten',
    'Wolverine',
  ];

  /**
   * Generate a unique anonymous name for a user in a specific room
   */
  assignAnonymousName(roomId: string, userId: string): string {
    // Check if user already has a name in this room
    const existingName = this.getAnonymousName(roomId, userId);
    if (existingName) {
      return existingName;
    }

    // Get existing names in this room to ensure uniqueness
    const roomMapping = this.roomIdentities.get(roomId);
    const existingNames = roomMapping ? Array.from(roomMapping.values()) : [];

    // Generate a unique name
    let anonymousName: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const adjective =
        this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
      const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
      anonymousName = `${adjective}${noun}`;
      attempts++;
    } while (existingNames.includes(anonymousName) && attempts < maxAttempts);

    // If we couldn't generate a unique name, append a number
    if (existingNames.includes(anonymousName)) {
      anonymousName = `${anonymousName}${Math.floor(Math.random() * 1000)}`;
    }

    // Store the mapping
    if (!this.roomIdentities.has(roomId)) {
      this.roomIdentities.set(roomId, new Map());
    }

    const roomMap = this.roomIdentities.get(roomId)!;
    roomMap.set(userId, anonymousName);

    this.logger.log(
      `Assigned anonymous name "${anonymousName}" to user ${userId.substring(0, 8)} in room ${roomId.substring(0, 8)}`,
    );

    return anonymousName;
  }

  /**
   * Get anonymous name for a user in a room
   */
  getAnonymousName(roomId: string, userId: string): string | null {
    const roomMapping = this.roomIdentities.get(roomId);
    if (!roomMapping) {
      return null;
    }
    return roomMapping.get(userId) || null;
  }

  /**
   * Get all anonymous names in a room
   */
  getRoomAnonymousNames(roomId: string): Map<string, string> {
    return this.roomIdentities.get(roomId) || new Map();
  }

  /**
   * Remove anonymous identity for a user in a room
   */
  removeAnonymousName(roomId: string, userId: string): void {
    const roomMapping = this.roomIdentities.get(roomId);
    if (roomMapping) {
      roomMapping.delete(userId);
      this.logger.log(
        `Removed anonymous name for user ${userId.substring(0, 8)} in room ${roomId.substring(0, 8)}`,
      );

      // Clean up empty room mappings
      if (roomMapping.size === 0) {
        this.roomIdentities.delete(roomId);
      }
    }
  }

  /**
   * Remove all anonymous identities for a room (when room expires/ends)
   */
  clearRoomIdentities(roomId: string): void {
    const roomMapping = this.roomIdentities.get(roomId);
    if (roomMapping) {
      const userCount = roomMapping.size;
      this.roomIdentities.delete(roomId);
      this.logger.log(
        `Cleared ${userCount} anonymous identities for room ${roomId.substring(0, 8)}`,
      );
    }
  }

  /**
   * Get all users in a room with their anonymous names
   */
  getRoomUsers(
    roomId: string,
  ): Array<{ userId: string; anonymousName: string }> {
    const roomMapping = this.roomIdentities.get(roomId);
    if (!roomMapping) {
      return [];
    }

    return Array.from(roomMapping.entries()).map(([userId, anonymousName]) => ({
      userId,
      anonymousName,
    }));
  }
}
