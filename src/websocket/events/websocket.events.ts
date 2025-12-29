export enum WebSocketEvent {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',

  // User events
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',

  // Matching events
  JOIN_MATCHING_QUEUE = 'matching:join',
  LEAVE_MATCHING_QUEUE = 'matching:leave',
  MATCH_FOUND = 'matching:found',
  MATCH_FAILED = 'matching:failed',
  
  // Chat events
  JOIN_ROOM = 'chat:join',
  LEAVE_ROOM = 'chat:leave',
  SEND_MESSAGE = 'chat:message',
  NEW_MESSAGE = 'chat:new_message',
  TYPING = 'chat:typing',
  STOP_TYPING = 'chat:stop_typing',
  USER_JOINED = 'chat:user_joined',
  USER_LEFT = 'chat:user_left',

  // Chat timer events
  CHAT_TIMER_UPDATE = 'chat:timer_update',
  CHAT_ENDING_SOON = 'chat:ending_soon',
  CHAT_ENDED = 'chat:ended',
  CHAT_EXPIRED = 'chat:expired',

  // Friend request events
  FRIEND_REQUEST_SENT = 'friend:request_sent',
  FRIEND_REQUEST_RECEIVED = 'friend:request_received',
  FRIEND_REQUEST_ACCEPTED = 'friend:request_accepted',
  FRIEND_REQUEST_REJECTED = 'friend:request_rejected',

  // Chat room request events
  CHAT_ROOM_REQUEST_SENT = 'chat_room:request_sent',
  CHAT_ROOM_REQUEST_RECEIVED = 'chat_room:request_received',
  CHAT_ROOM_REQUEST_ACCEPTED = 'chat_room:request_accepted',
  CHAT_ROOM_REQUEST_REJECTED = 'chat_room:request_rejected',
  CHAT_ROOM_CREATED = 'chat_room:created',

  // Error events
  ERROR = 'error',
}
