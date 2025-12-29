const { io } = require('socket.io-client');

// ============================================
// QUICK TEST SOCKET.IO CONNECTION
// ============================================
// INSTRUCTIONS:
// 1. Login/register to get a JWT token
// 2. Replace YOUR_TOKEN and YOUR_USER_ID below
// 3. Run: node test-ws.js
// ============================================

const YOUR_TOKEN = 'your-jwt-token-here';
const YOUR_USER_ID = 'your-user-id-here';

console.log('🔌 Connecting to Socket.IO server...\n');

const socket = io('http://localhost:3000', {
  auth: { token: YOUR_TOKEN },
  reconnection: true,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  console.log('📡 Registering user as online...\n');
  
  // Register as online
  socket.emit('user:online', { userId: YOUR_USER_ID });
});

socket.on('connection', (data) => {
  console.log('📥 Server CONNECTION event:', data);
});

socket.on('user:online', (data) => {
  console.log('✅ USER ONLINE confirmed:', data);
  console.log('\n📋 Now you can:');
  console.log('   1. Join queue: POST http://localhost:3000/matching/join-queue');
  console.log('   2. Wait for "matching:found" event (~2 minutes)');
  console.log('   3. Join chat room when matched\n');
});

// Listen for match found
socket.on('matching:found', (data) => {
  console.log('\n🎉 MATCH FOUND!');
  console.log('   Room ID:', data.roomId);
  console.log('   Match Score:', data.matchScore);
  console.log('   Expires At:', data.expiresAt);
  console.log('   Message:', data.message);
  
  const roomId = data.roomId;
  
  console.log('\n💬 Joining chat room...');
  socket.emit('chat:join', { roomId });
});

// Chat events
socket.on('chat:join', (data) => {
  console.log('\n✅ Joined chat room!', data);
  console.log('💬 You can now send messages!');
  
  // Example: send a test message after 2 seconds
  setTimeout(() => {
    socket.emit('chat:message', { 
      roomId: data.roomId, 
      message: 'Hello! This is a test message from test-ws.js' 
    });
    console.log('📤 Test message sent!');
  }, 2000);
});

socket.on('chat:user_joined', (data) => {
  console.log('👥 Another user joined the room:', data.userId);
});

socket.on('chat:new_message', (data) => {
  console.log('\n💬 NEW MESSAGE:');
  console.log('   From:', data.senderId);
  console.log('   Message:', data.message);
  console.log('   Time:', data.timestamp);
});

socket.on('chat:typing', (data) => {
  console.log('✍️  User is typing...', data.userId);
});

socket.on('chat:stop_typing', (data) => {
  console.log('✋ User stopped typing', data.userId);
});

socket.on('chat:user_left', (data) => {
  console.log('🚪 User left the room:', data.userId);
});

socket.on('user:offline', (data) => {
  console.log('👋 User went offline:', data.userId);
});

// Error handling
socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  console.log('\n💡 Make sure:');
  console.log('   - Server is running (npm run start:dev)');
  console.log('   - Token is valid');
  console.log('   - Socket.IO adapter is configured in main.ts');
});

socket.on('error', (err) => {
  console.error('❌ Socket error:', err);
});

socket.on('disconnect', (reason) => {
  console.log('\n⚠️  Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    console.log('Server disconnected the socket. Reconnecting...');
    socket.connect();
  }
});

// Debug: log all events
socket.onAny((event, ...args) => {
  if (!['connect', 'connection', 'user:online', 'chat:new_message'].includes(event)) {
    console.log(`📡 Event received: ${event}`, args);
  }
});

console.log('⏳ Waiting for connection...\n');