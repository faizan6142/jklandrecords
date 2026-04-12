require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const researchRoutes = require('./routes/research');
const forumRoutes = require('./routes/forums');

// Connect to MongoDB
connectDB();

const app = express();

// CORS
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Global rate limiter: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoints: 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/forums', forumRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BioResearch Hub API is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Online users: socketId → { userId, username, room }
const onlineUsers = new Map();

const getOnlineUsersInRoom = (room) => {
  const users = [];
  onlineUsers.forEach((userData) => {
    if (userData.room === room) {
      users.push({ userId: userData.userId, username: userData.username });
    }
  });
  return users;
};

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins a room
  socket.on('join_room', ({ room, userId, username }) => {
    // Leave any previous room
    const prevData = onlineUsers.get(socket.id);
    if (prevData && prevData.room) {
      socket.leave(prevData.room);
      io.to(prevData.room).emit('online_users', getOnlineUsersInRoom(prevData.room));
    }

    socket.join(room);
    onlineUsers.set(socket.id, { userId, username, room });

    // Notify room of online users
    io.to(room).emit('online_users', getOnlineUsersInRoom(room));
    console.log(`${username} joined room: ${room}`);
  });

  // User sends a message
  socket.on('send_message', (messageData) => {
    const { room } = messageData;
    if (room) {
      io.to(room).emit('receive_message', messageData);
    }
  });

  // User is typing
  socket.on('user_typing', ({ room, username }) => {
    socket.to(room).emit('typing', { username });
  });

  // User stopped typing
  socket.on('stop_typing', ({ room, username }) => {
    socket.to(room).emit('stop_typing', { username });
  });

  // Socket disconnected
  socket.on('disconnect', () => {
    const userData = onlineUsers.get(socket.id);
    if (userData && userData.room) {
      onlineUsers.delete(socket.id);
      io.to(userData.room).emit('online_users', getOnlineUsersInRoom(userData.room));
    } else {
      onlineUsers.delete(socket.id);
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 BioResearch Hub server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads\n`);
});
