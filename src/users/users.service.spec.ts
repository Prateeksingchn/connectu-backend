import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { FriendshipRepository } from '../friends/friendships/repositories/friendship.repository';
import { RedisService } from '../redis/redis.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: FriendshipRepository,
          useValue: {
            findBetweenUsers: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            removeFromMatchingQueue: jest.fn(),
            removeUserRoom: jest.fn(),
          },
        },
        {
          provide: WebSocketGateway,
          useValue: {
            disconnectUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
