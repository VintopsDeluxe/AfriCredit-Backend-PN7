// src/services/socketService.js
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis.js';

let io;

export const initSocketServer = (httpServer) => {
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Authentication Middleware for WebSocket Connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication token missing'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRole = socket.user.role;

    // Join isolated user room for status notifications (BR-10)
    socket.join(`user:${userId}`);

    // Admin role room joining
    if (['risk_officer', 'finance', 'administrator'].includes(userRole)) {
      socket.join('admin:review_queue');
    }

    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`);
    });
  });
};

// Alias to match server.js import expectation
export const initSocket = initSocketServer;

export const emitEvent = (targetChannel, eventName, payload) => {
  if (io) {
    io.to(targetChannel).emit(eventName, payload);
  }
};