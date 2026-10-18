import { ParseUUIDPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FriendshipsController } from './friendships.controller';
import { FriendshipsService } from './friendships.service';

describe('FriendshipsController', () => {
  let controller: FriendshipsController;
  let service: Record<string, jest.Mock>;

  const user = { id: 'user-1' };

  beforeEach(async () => {
    service = {
      sendFriendRequest: jest.fn(),
      sendFriendRequestByRoom: jest.fn(),
      respondToFriendRequest: jest.fn(),
      getFriends: jest.fn(),
      getPendingRequests: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendshipsController],
      providers: [{ provide: FriendshipsService, useValue: service }],
    }).compile();

    controller = module.get<FriendshipsController>(FriendshipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sendFriendRequest delegates to the service with the current user id and dto', async () => {
    const dto = { addresseeId: 'user-2' };
    service.sendFriendRequest.mockResolvedValue({
      message: 'ok',
      friendshipId: 'f-1',
    });

    const result = await controller.sendFriendRequest(user, dto);

    expect(service.sendFriendRequest).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ message: 'ok', friendshipId: 'f-1' });
  });

  it('sendFriendRequestByRoom delegates with the current user id and the route roomId only', async () => {
    service.sendFriendRequestByRoom.mockResolvedValue({
      message: 'ok',
      friendshipId: 'f-1',
    });

    const result = await controller.sendFriendRequestByRoom(user, 'room-1');

    expect(service.sendFriendRequestByRoom).toHaveBeenCalledWith(
      'user-1',
      'room-1',
    );
    expect(result).toEqual({ message: 'ok', friendshipId: 'f-1' });
  });

  it('sendFriendRequestByRoom is JWT-guarded and validates roomId as a UUID', () => {
    expect(
      (Reflect.getMetadata('__guards__', FriendshipsController) ?? []).length,
    ).toBeGreaterThan(0);
    const routeParamTypes = Reflect.getMetadata(
      '__routeArguments__',
      FriendshipsController,
      'sendFriendRequestByRoom',
    ) as Record<string, { data: unknown; pipes: unknown[] }>;
    const roomParam = Object.values(routeParamTypes).find(
      (a) => a.data === 'roomId',
    );
    expect(roomParam?.pipes.some((p) => p === ParseUUIDPipe)).toBe(true);
  });

  it('respondToFriendRequest delegates to the service with the current user id and dto', async () => {
    const dto = { friendshipId: 'f-1', status: 'ACCEPTED' as any };
    service.respondToFriendRequest.mockResolvedValue({ message: 'ok' });

    const result = await controller.respondToFriendRequest(user, dto);

    expect(service.respondToFriendRequest).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ message: 'ok' });
  });

  it('getFriends delegates to the service with the current user id', async () => {
    service.getFriends.mockResolvedValue([{ friendshipId: 'f-1' }]);

    const result = await controller.getFriends(user);

    expect(service.getFriends).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([{ friendshipId: 'f-1' }]);
  });

  it('getPendingRequests delegates to the service with the current user id', async () => {
    service.getPendingRequests.mockResolvedValue([{ friendshipId: 'f-2' }]);

    const result = await controller.getPendingRequests(user);

    expect(service.getPendingRequests).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([{ friendshipId: 'f-2' }]);
  });
});
