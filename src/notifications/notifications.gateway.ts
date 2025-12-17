import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Extract token from handshake auth or cookies
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('WebSocket connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`WebSocket connection rejected: Invalid user ${payload.sub}`);
        client.disconnect();
        return;
      }

      // Store user ID on socket
      client.userId = payload.sub;

      // Join user-specific room
      client.join(`user_${payload.sub}`);

      this.logger.log(`User ${payload.sub} connected to notifications WebSocket`);

      // Send initial unread count
      const unreadCount = await this.notificationsService.getUnreadCount(payload.sub);
      client.emit('unreadCount', unreadCount);

    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`User ${client.userId} disconnected from notifications WebSocket`);
      client.leave(`user_${client.userId}`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong');
  }

  // Method to emit new notification to specific user
  emitNewNotification(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('newNotification', notification);
  }

  // Method to emit unread count update to specific user
  emitUnreadCountUpdate(userId: string, count: number) {
    this.server.to(`user_${userId}`).emit('unreadCount', { count });
  }

  // Method to emit notification marked as read
  emitNotificationRead(userId: string, notificationId: string) {
    this.server.to(`user_${userId}`).emit('notificationRead', { notificationId });
  }
}