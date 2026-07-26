import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FriendshipRepository } from './friendship.repository';
import { Friendship } from '../entities/friendship.entity';
import { FriendshipStatus } from '../entities/friendship-status.enum';

describe('FriendshipRepository', () => {
  let repository: FriendshipRepository;
  let manager: {
    query: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let repo: {
    manager: { transaction: jest.Mock };
  };

  beforeEach(async () => {
    manager = {
      query: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    repo = {
      manager: {
        // Run the transaction callback synchronously against our mock manager,
        // the same way TypeORM's real EntityManager.transaction() would.
        transaction: jest.fn((cb: (manager: any) => Promise<any>) => cb(manager)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipRepository,
        { provide: getRepositoryToken(Friendship), useValue: repo },
      ],
    }).compile();

    repository = module.get<FriendshipRepository>(FriendshipRepository);
  });

  describe('createIfAbsent', () => {
    const requesterId = 'aaaaaaaa-0000-0000-0000-000000000001';
    const addresseeId = 'bbbbbbbb-0000-0000-0000-000000000002';

    it('creates a new PENDING friendship when none exists between the two users', async () => {
      manager.findOne.mockResolvedValue(null);
      const created = {
        id: 'friendship-1',
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      };
      manager.create.mockReturnValue(created);
      manager.save.mockResolvedValue(created);

      const result = await repository.createIfAbsent(requesterId, addresseeId);

      expect(result).toEqual({ friendship: created, created: true });
      expect(manager.create).toHaveBeenCalledWith(Friendship, {
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      });
      expect(manager.save).toHaveBeenCalledWith(Friendship, created);
    });

    it('returns the existing friendship without inserting when one already exists', async () => {
      const existing = {
        id: 'friendship-2',
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      };
      manager.findOne.mockResolvedValue(existing);

      const result = await repository.createIfAbsent(requesterId, addresseeId);

      expect(result).toEqual({ friendship: existing, created: false });
      expect(manager.create).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('checks both directions (requester/addressee reversed) for an existing friendship', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});

      await repository.createIfAbsent(requesterId, addresseeId);

      expect(manager.findOne).toHaveBeenCalledWith(Friendship, {
        where: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
        relations: ['requester', 'addressee'],
      });
    });

    it('acquires the Postgres advisory lock before checking for an existing row', async () => {
      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});

      const callOrder: string[] = [];
      manager.query.mockImplementation(async () => {
        callOrder.push('query');
      });
      manager.findOne.mockImplementation(async () => {
        callOrder.push('findOne');
        return null;
      });

      await repository.createIfAbsent(requesterId, addresseeId);

      expect(manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
        expect.any(Array),
      );
      expect(callOrder).toEqual(['query', 'findOne']);
    });

    it('locks on the same key regardless of which user is passed as requester (A->B and B->A serialize together)', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});

      await repository.createIfAbsent(requesterId, addresseeId);
      const firstLockKey = manager.query.mock.calls[0][1][0];

      manager.query.mockClear();
      await repository.createIfAbsent(addresseeId, requesterId);
      const secondLockKey = manager.query.mock.calls[0][1][0];

      expect(firstLockKey).toBe(secondLockKey);
    });

    it('runs the whole check-and-insert inside a single transaction', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.create.mockReturnValue({});
      manager.save.mockResolvedValue({});

      await repository.createIfAbsent(requesterId, addresseeId);

      expect(repo.manager.transaction).toHaveBeenCalledTimes(1);
    });
  });
});
