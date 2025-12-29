const { io } = require('socket.io-client');

// ============================================
// SIMPLE SOCKET.IO TEST - SINGLE USER
// ============================================
// INSTRUCTIONS:
// 1. Login via Postman to get token and userId
// 2. Replace values below
// 3. Run: node test-single-user.js
// 4. Watch console for events
// ============================================

// 🔑 REPLACE THESE WITH YOUR REAL USER DATA
const YOUR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // From Postman login
const YOUR_USER_ID = '236e5b03-8e2c-44af-bc0a-1fa4dea5493e'; // From Postman login

console.log('🚀 Starting Socket.IO test...\n');
console.log('Token:', YOUR_TOKEN.substring(0, 20) + '...');
console.log('User ID:', YOUR_USER_ID);
console.log('─'.repeat(60));

const socket = io('http://localhost:3000', {
  auth: { token: YOUR_TOKEN },
  reconnection: true,
  reconnectionDelay: 1000,
});

// ============================================
// CONNECTION EVENTS
// ============================================

socket.on('connect', () => {
  console.log('\n✅ CONNECTED to Socket.IO!');
  console.log('   Socket ID:', socket.id);
  console.log('─'.repeat(60));
  
  // Register as online
  console.log('\n📡 Registering as online...');
  socket.emit('user:online', { userId: YOUR_USER_ID });
});

socket.on('connection', (data) => {
  console.log('\n📥 Connection confirmed by server:');
  console.log('   Message:', data.message);
  console.log('   Socket ID:', data.socketId);
});

socket.on('user:online', (data) => {
  console.log('\n✅ ONLINE registration confirmed!');
  console.log('   User ID:', data.userId);
  console.log('─'.repeat(60));
  console.log('\n📋 Next steps:');
  console.log('   1. Go to Postman');
  console.log('   2. POST http://localhost:3000/matching/join-queue');
  console.log('   3. Wait ~2 minutes for match');
  console.log('   4. Watch this console for "matching:found" event');
  console.log('─'.repeat(60));
});

// ============================================
// MATCHING EVENTS
// ============================================

socket.on('matching:found', (data) => {
  console.log('\n');
  console.log('🎉'.repeat(30));
  console.log('🎉 MATCH FOUND! 🎉');
  console.log('🎉'.repeat(30));
  console.log('\n📦 Match details:');
  console.log('   Room ID:', data.roomId);
  console.log('   Match Score:', data.matchScore);
  console.log('   Expires At:', data.expiresAt);
  console.log('   Message:', data.message);
  console.log('─'.repeat(60));
  
  const roomId = data.roomId;
  
  // Auto-join the room
  console.log('\n💬 Auto-joining chat room...');
  socket.emit('chat:join', { roomId });
  
  // Wait 3 seconds, then send a test message
  setTimeout(() => {
    const testMessage = `Hello! I'm ${YOUR_USER_ID.substring(0, 8)}. Testing chat!`;
    console.log('\n📤 Sending test message:', testMessage);
    socket.emit('chat:message', { roomId, message: testMessage });
  }, 3000);
});

// ============================================
// CHAT EVENTS
// ============================================

socket.on('chat:join', (data) => {
  console.log('\n✅ JOINED CHAT ROOM!');
  console.log('   Room ID:', data.roomId);
  console.log('   User ID:', data.userId);
  console.log('   Timestamp:', data.timestamp);
  console.log('─'.repeat(60));
  console.log('\n📋 You can now:');
  console.log('   - Send messages with: socket.emit("chat:message", { roomId, message })');
  console.log('   - Type in console to send message (feature below)');
  console.log('─'.repeat(60));
});

socket.on('chat:user_joined', (data) => {
  console.log('\n👥 ANOTHER USER JOINED THE ROOM!');
  console.log('   User ID:', data.userId);
  console.log('   Room ID:', data.roomId);
  console.log('─'.repeat(60));
});

socket.on('chat:new_message', (data) => {
  console.log('\n💬 NEW MESSAGE RECEIVED:');
  console.log('   From:', data.senderId);
  console.log('   Message:', data.message);
  console.log('   Room:', data.roomId);
  console.log('   Time:', data.timestamp);
  console.log('─'.repeat(60));
});

socket.on('chat:typing', (data) => {
  console.log('\n✍️  User is typing...', data.userId);
});

socket.on('chat:stop_typing', (data) => {
  console.log('\n✋ User stopped typing', data.userId);
});

socket.on('chat:user_left', (data) => {
  console.log('\n🚪 User left the room:', data.userId);
});

// ============================================
// ERROR HANDLING
// ============================================

socket.on('connect_error', (err) => {
  console.error('\n❌ CONNECTION ERROR:', err.message);
  console.log('\n💡 Troubleshooting:');
  console.log('   1. Check if server is running: npm run start:dev');
  console.log('   2. Verify token is valid (login again if expired)');
  console.log('   3. Check if Socket.IO adapter is configured in main.ts');
  console.log('─'.repeat(60));
});

socket.on('error', (err) => {
  console.error('\n❌ SOCKET ERROR:', err);
});

socket.on('disconnect', (reason) => {
  console.log('\n⚠️  DISCONNECTED:', reason);
  
  if (reason === 'io server disconnect') {
    console.log('Server disconnected the socket. Reconnecting...');
    socket.connect();
  }
});

// ============================================
// DEBUG: LOG ALL EVENTS
// ============================================

socket.onAny((event, ...args) => {
  // Skip logging for common events (already handled above)
  const skipEvents = [
    'connect', 'connection', 'user:online', 
    'matching:found', 'chat:join', 'chat:new_message'
  ];
  
  if (!skipEvents.includes(event)) {
    console.log(`\n📡 Event: "${event}"`, args);
  }
});

// ============================================
// INTERACTIVE CONSOLE (Optional)
// ============================================

let currentRoomId = null;

socket.on('chat:join', (data) => {
  currentRoomId = data.roomId;
});

// Allow sending messages from console (optional feature)
if (process.stdin.isTTY) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.on('line', (input) => {
    if (!currentRoomId) {
      console.log('⚠️  Not in a room yet. Wait for match first!');
      return;
    }
    
    if (input.trim()) {
      socket.emit('chat:message', { 
        roomId: currentRoomId, 
        message: input.trim() 
      });
      console.log('📤 Message sent:', input.trim());
    }
  });
}

console.log('\n⏳ Connecting to server...\n');

