import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatRoomRepository } from './chat-room.repository';
import { ChatRoom } from '../entities/chat-room.entity';

describe('ChatRoomRepository', () => {
  let repository: ChatRoomRepository;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRoomRepository,
        { provide: getRepositoryToken(ChatRoom), useValue: repo },
      ],
    }).compile();

    repository = module.get<ChatRoomRepository>(ChatRoomRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findActiveByUserId', () => {
    const userId = 'user-1';

    it('returns null when the user has no active room', async () => {
      repo.findOne.mockResolvedValue(null);

      expect(await repository.findActiveByUserId(userId)).toBeNull();
    });

    it('queries for the user as either participant with isActive=true', async () => {
      repo.findOne.mockResolvedValue(null);

      await repository.findActiveByUserId(userId);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: [
          { user1Id: userId, isActive: true },
          { user2Id: userId, isActive: true },
        ],
      });
    });

    it('returns the room when it is active and has not expired', async () => {
      const room = {
        id: 'room-1',
        isActive: true,
        expiresAt: new Date(Date.now() + 60_000),
      };
      repo.findOne.mockResolvedValue(room);

      const result = await repository.findActiveByUserId(userId);

      expect(result).toBe(room);
      expect(repo.update).not.toHaveBeenCalled();
    });

    // This is the root-cause fix for the bug found twice this session (once in
    // MatchingService.joinQueue, once in FriendshipsService.hasActiveChatRoom):
    // the underlying query only filters on isActive=true, so without this
    // self-heal, a room that already passed its expiresAt but hasn't been swept
    // yet by MatchingScheduler (which only runs once a minute) would be returned
    // as "active" to every caller of this method.
    it('self-heals and returns null when the room is flagged active but has already passed its expiresAt', async () => {
      const room = {
        id: 'room-1',
        isActive: true,
        expiresAt: new Date(Date.now() - 60_000), // expired a minute ago
      };
      repo.findOne.mockResolvedValue(room);
      repo.update.mockResolvedValue({ affected: 1 });

      const result = await repository.findActiveByUserId(userId);

      expect(result).toBeNull();
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'room-1', isActive: true },
        { isActive: false },
      );
    });

    it('returns the room when it has no expiresAt at all (never treats missing expiry as expired)', async () => {
      const room = { id: 'room-1', isActive: true, expiresAt: null };
      repo.findOne.mockResolvedValue(room);

      const result = await repository.findActiveByUserId(userId);

      expect(result).toBe(room);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
