import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketEvent } from './events/websocket.events';
import { ChatRoomRepository } from '../matching/repositories/chat-room.repository';
import { FriendChatRoomRepository } from '../friends/chat-rooms/repositories/friend-chat-room.repository';
import { ChatMessageService } from '../friends/chat-rooms/chat-message.service';
import { FriendChatRoomService } from '../friends/chat-rooms/friend-chat-room.service';
import { AnonymousIdentityService } from './services/anonymous-identity.service';
import { UsersRepository } from '../users/users.repository';

function createMockSocket(id = 'socket-1') {
  return {
    id,
    handshake: { auth: {}, headers: {}, query: {} },
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  } as any;
}

function createMockServer() {
  return {
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    sockets: new Map<string, any>(),
  } as any;
}

describe('WebSocketGateway', () => {
  let gateway: WebSocketGateway;
  let chatRoomRepository: { findValidActiveRoom: jest.Mock };
  let friendChatRoomRepository: { findValidActiveRoom: jest.Mock };
  let chatMessageService: { saveMessage: jest.Mock };
  let friendChatRoomService: { updateLastMessage: jest.Mock };
  let anonymousIdentityService: {
    getAnonymousName: jest.Mock;
    assignAnonymousName: jest.Mock;
    removeAnonymousName: jest.Mock;
    clearRoomIdentities: jest.Mock;
  };
  let usersRepository: { findById: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    chatRoomRepository = { findValidActiveRoom: jest.fn() };
    friendChatRoomRepository = { findValidActiveRoom: jest.fn() };
    chatMessageService = { saveMessage: jest.fn() };
    friendChatRoomService = { updateLastMessage: jest.fn() };
    anonymousIdentityService = {
      getAnonymousName: jest.fn(),
      assignAnonymousName: jest.fn(),
      removeAnonymousName: jest.fn(),
      clearRoomIdentities: jest.fn(),
    };
    usersRepository = { findById: jest.fn() };
    jwtService = { verifyAsync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketGateway,
        { provide: ChatRoomRepository, useValue: chatRoomRepository },
        {
          provide: FriendChatRoomRepository,
          useValue: friendChatRoomRepository,
        },
        { provide: ChatMessageService, useValue: chatMessageService },
        { provide: FriendChatRoomService, useValue: friendChatRoomService },
        {
          provide: AnonymousIdentityService,
          useValue: anonymousIdentityService,
        },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    gateway = module.get<WebSocketGateway>(WebSocketGateway);
    server = createMockServer();
    gateway.server = server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('disconnects the socket when no token is present anywhere in the handshake', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.emit).not.toHaveBeenCalledWith(
        WebSocketEvent.CONNECTION,
        expect.anything(),
      );
    });

    it('disconnects the socket when the token fails verification', async () => {
      const client = createMockSocket();
      client.handshake.auth.token = 'garbage-token';
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.userId).toBeUndefined();
      expect(client.emit).not.toHaveBeenCalledWith(
        WebSocketEvent.CONNECTION,
        expect.anything(),
      );
    });

    it('accepts the connection and attaches the verified identity when the token is valid', async () => {
      const client = createMockSocket();
      client.handshake.auth.token = 'valid-token';
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        email: 'user@example.com',
        role: 'USER',
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.userId).toBe('user-123');
      expect(client.email).toBe('user@example.com');
      expect(client.role).toBe('USER');
      expect(client.emit).toHaveBeenCalledWith(
        WebSocketEvent.CONNECTION,
        expect.objectContaining({ socketId: client.id }),
      );
    });

    it('reads the token from the Authorization header when handshake.auth has none', async () => {
      const client = createMockSocket();
      client.handshake.headers.authorization = 'Bearer header-token';
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'header-token',
        expect.any(Object),
      );
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('handleUserOnline', () => {
    it('registers the connection under the verified client.userId, ignoring anything else', () => {
      const client = createMockSocket('socket-42');
      client.userId = 'verified-user-id';

      gateway.handleUserOnline(client);

      expect(gateway.isUserOnline('verified-user-id')).toBe(true);
      expect(gateway.getUserSocketId('verified-user-id')).toBe('socket-42');
      expect(client.emit).toHaveBeenCalledWith(
        WebSocketEvent.USER_ONLINE,
        expect.objectContaining({ userId: 'verified-user-id' }),
      );
    });

    it('does not read any client-supplied identity out of a message payload', () => {
      // handleUserOnline only takes @ConnectedSocket() — there is no @MessageBody()
      // parameter for it to pull a spoofable userId from.
      expect(gateway.handleUserOnline.length).toBe(1);
    });
  });

  describe('handleDisconnect', () => {
    it('does nothing when the disconnecting socket was never registered', async () => {
      const client = createMockSocket('unknown-socket');

      await gateway.handleDisconnect(client);

      expect(server.emit).not.toHaveBeenCalled();
    });

    it('removes the user from tracking and emits USER_OFFLINE', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);

      await gateway.handleDisconnect(client);

      expect(gateway.isUserOnline('user-1')).toBe(false);
      expect(server.emit).toHaveBeenCalledWith(WebSocketEvent.USER_OFFLINE, {
        userId: 'user-1',
      });
    });

    it('removes the user from a matching room, clears their anonymous identity, and notifies remaining members', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);
      (gateway as any).roomMemberships.set(
        'room-1',
        new Set(['user-1', 'user-2']),
      );

      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue(null); // not a friend room
      anonymousIdentityService.getAnonymousName.mockReturnValue('WittyFox');

      await gateway.handleDisconnect(client);

      expect(anonymousIdentityService.removeAnonymousName).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
      expect(server.to).toHaveBeenCalledWith('room-1');
      expect(server.to('room-1').emit).toHaveBeenCalledWith(
        WebSocketEvent.USER_LEFT,
        expect.objectContaining({
          anonymousName: 'WittyFox',
          roomId: 'room-1',
        }),
      );
      // one member remains, so the room and its identities are not fully cleared
      expect(gateway.getRoomMembers('room-1')).toEqual(new Set(['user-2']));
      expect(
        anonymousIdentityService.clearRoomIdentities,
      ).not.toHaveBeenCalled();
    });

    it('clears the whole room once the last member disconnects from a matching room', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);
      (gateway as any).roomMemberships.set('room-1', new Set(['user-1']));

      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue(null);
      anonymousIdentityService.getAnonymousName.mockReturnValue('WittyFox');

      await gateway.handleDisconnect(client);

      expect(gateway.getRoomMembers('room-1')).toBeUndefined();
      expect(anonymousIdentityService.clearRoomIdentities).toHaveBeenCalledWith(
        'room-1',
      );
    });

    it('uses the real display name and skips anonymous-identity cleanup for a friend room', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);
      (gateway as any).roomMemberships.set(
        'friend-room-1',
        new Set(['user-1', 'user-2']),
      );

      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue({
        id: 'friend-room-1',
      });
      usersRepository.findById.mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
      });

      await gateway.handleDisconnect(client);

      expect(
        anonymousIdentityService.removeAnonymousName,
      ).not.toHaveBeenCalled();
      expect(server.to('friend-room-1').emit).toHaveBeenCalledWith(
        WebSocketEvent.USER_LEFT,
        expect.objectContaining({ anonymousName: 'Alice' }),
      );
    });
  });

  describe('disconnectUser', () => {
    it('does nothing when the user has no tracked connection', () => {
      expect(() => gateway.disconnectUser('ghost-user')).not.toThrow();
      expect(server.sockets.size).toBe(0);
    });

    it('force-disconnects the live socket when one is found on the server', () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);
      server.sockets.set('socket-1', client);

      gateway.disconnectUser('user-1');

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('replicates handleDisconnect() cleanup when tracking is stale and no live socket exists', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);
      (gateway as any).roomMemberships.set('room-1', new Set(['user-1']));
      // server.sockets has no entry for 'socket-1' -> simulates an already-gone socket

      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue(null);
      anonymousIdentityService.getAnonymousName.mockReturnValue('WittyFox');

      gateway.disconnectUser('user-1');
      // removeUserFromRooms() runs as an unawaited async cleanup in this branch
      await Promise.resolve();
      await Promise.resolve();

      expect(gateway.isUserOnline('user-1')).toBe(false);
      expect(gateway.getRoomMembers('room-1')).toBeUndefined();
      expect(anonymousIdentityService.clearRoomIdentities).toHaveBeenCalledWith(
        'room-1',
      );
      expect(server.to('room-1').emit).toHaveBeenCalledWith(
        WebSocketEvent.USER_LEFT,
        expect.objectContaining({ anonymousName: 'WittyFox' }),
      );
    });

    it('logs rather than throws if the fallback cleanup fails', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);
      (gateway as any).roomMemberships.set('room-1', new Set(['user-1']));

      friendChatRoomRepository.findValidActiveRoom.mockRejectedValue(
        new Error('db unavailable'),
      );

      expect(() => gateway.disconnectUser('user-1')).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();
      // no assertion needed beyond "didn't throw" - the rejection is caught internally
    });
  });

  describe('handleJoinRoom', () => {
    it('does not join or track membership when the room is not active/valid', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      chatRoomRepository.findValidActiveRoom.mockResolvedValue(null);
      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue(null);

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(gateway.getRoomMembers('room-1')).toBeUndefined();
      expect(client.emit).toHaveBeenCalledWith(
        WebSocketEvent.ERROR,
        expect.objectContaining({ roomId: 'room-1' }),
      );
    });

    it('joins the room, tracks membership, and notifies both the joiner and other members', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      chatRoomRepository.findValidActiveRoom.mockResolvedValue({
        id: 'room-1',
      });
      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue(null);
      anonymousIdentityService.getAnonymousName.mockReturnValue(null);
      anonymousIdentityService.assignAnonymousName.mockReturnValue(
        'BraveOtter',
      );

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(gateway.getRoomMembers('room-1')).toEqual(new Set(['user-1']));
      expect(client.emit).toHaveBeenCalledWith(
        WebSocketEvent.JOIN_ROOM,
        expect.objectContaining({ anonymousName: 'BraveOtter' }),
      );
      expect(client.to).toHaveBeenCalledWith('room-1');
      expect(client.to('room-1').emit).toHaveBeenCalledWith(
        WebSocketEvent.USER_JOINED,
        expect.objectContaining({ anonymousName: 'BraveOtter' }),
      );
    });
  });

  describe('handleSendMessage', () => {
    it('does NOT persist a message sent in an anonymous matching chat room', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      chatRoomRepository.findValidActiveRoom.mockResolvedValue({
        id: 'room-1',
      });
      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue(null);
      anonymousIdentityService.getAnonymousName.mockReturnValue('WittyFox');

      await gateway.handleSendMessage(client, {
        roomId: 'room-1',
        message: 'hello',
      });

      expect(chatMessageService.saveMessage).not.toHaveBeenCalled();
      expect(friendChatRoomService.updateLastMessage).not.toHaveBeenCalled();
      expect(server.to).toHaveBeenCalledWith('room-1');
      expect(server.to('room-1').emit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ message: 'hello' }),
      );
    });

    it('DOES persist a message sent in a friend chat room', async () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      chatRoomRepository.findValidActiveRoom.mockResolvedValue(null);
      friendChatRoomRepository.findValidActiveRoom.mockResolvedValue({
        id: 'friend-room-1',
      });
      usersRepository.findById.mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
      });

      await gateway.handleSendMessage(client, {
        roomId: 'friend-room-1',
        message: 'hello friend',
      });

      expect(chatMessageService.saveMessage).toHaveBeenCalledWith(
        'friend-room-1',
        'user-1',
        'hello friend',
      );
      expect(friendChatRoomService.updateLastMessage).toHaveBeenCalledWith(
        'friend-room-1',
        'hello friend',
      );
      expect(server.to).toHaveBeenCalledWith('friend-room-1');
      expect(server.to('friend-room-1').emit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ message: 'hello friend' }),
      );
    });
  });

  describe('emitToUser', () => {
    it('emits to the socket and returns true when the user is online', () => {
      const client = createMockSocket('socket-1');
      client.userId = 'user-1';
      gateway.handleUserOnline(client);

      const sent = gateway.emitToUser('user-1', WebSocketEvent.MATCH_FOUND, {
        roomId: 'x',
      });

      expect(sent).toBe(true);
      expect(server.to).toHaveBeenCalledWith('socket-1');
      expect(server.to('socket-1').emit).toHaveBeenCalledWith(
        WebSocketEvent.MATCH_FOUND,
        { roomId: 'x' },
      );
    });

    it('returns false without emitting when the user is offline', () => {
      const sent = gateway.emitToUser(
        'offline-user',
        WebSocketEvent.MATCH_FOUND,
        {},
      );

      expect(sent).toBe(false);
    });
  });
});
