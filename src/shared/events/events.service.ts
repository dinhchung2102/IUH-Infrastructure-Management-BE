import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  ClientInfo,
  NotificationPayload,
  UpdateEventPayload,
  CustomEventPayload,
} from './interfaces';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server;
  private clients: Map<string, ClientInfo> = new Map();

  /**
   * Set Socket.IO server instance
   */
  setServer(server: Server): void {
    this.server = server;
    this.logger.log('Socket.IO server instance set');
  }

  /**
   * Get Socket.IO server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Add a client to the tracking map
   */
  addClient(socket: AuthenticatedSocket): void {
    const clientInfo: ClientInfo = {
      socketId: socket.id,
      userId: socket.userId,
      accountId: socket.accountId,
      role: socket.role,
      connectedAt: new Date(),
    };
    this.clients.set(socket.id, clientInfo);
    this.logger.log(
      `Client connected: ${socket.id} (userId: ${socket.userId || 'anonymous'})`,
    );
  }

  /**
   * Remove a client from the tracking map
   */
  removeClient(socketId: string): void {
    const client = this.clients.get(socketId);
    if (client) {
      this.clients.delete(socketId);
      this.logger.log(
        `Client disconnected: ${socketId} (userId: ${client.userId || 'anonymous'})`,
      );
    }
  }

  /**
   * Get connected client info
   */
  getClient(socketId: string): ClientInfo | undefined {
    return this.clients.get(socketId);
  }

  /**
   * Get all connected clients
   */
  getAllClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get clients by userId
   */
  getClientsByUserId(userId: string): ClientInfo[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );
  }

  /**
   * Emit event to specific socket
   */
  emitToSocket(socketId: string, event: string, data: any): void {
    if (this.server) {
      this.server.to(socketId).emit(event, data);
      this.logger.debug(`Emitted '${event}' to socket ${socketId}`);
    }
  }

  /**
   * Emit event to specific user (all their connected sockets)
   */
  emitToUser(userId: string, event: string, data: any): void {
    const userClients = this.getClientsByUserId(userId);
    if (userClients.length > 0) {
      userClients.forEach((client) => {
        this.emitToSocket(client.socketId, event, data);
      });
      this.logger.debug(
        `Emitted '${event}' to user ${userId} (${userClients.length} sockets)`,
      );
    }
  }

  /**
   * Emit event to specific room
   */
  emitToRoom(room: string, event: string, data: any): void {
    if (this.server) {
      this.server.to(room).emit(event, data);
      this.logger.debug(`Emitted '${event}' to room ${room}`);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: any): void {
    if (this.server) {
      this.server.emit(event, data);
      this.logger.debug(`Broadcasted '${event}' to all clients`);
    }
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(
    userId: string,
    notification: NotificationPayload,
  ): void {
    this.emitToUser(userId, 'notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * Send notification to specific room
   */
  sendNotificationToRoom(
    room: string,
    notification: NotificationPayload,
  ): void {
    this.emitToRoom('notification', room, {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast notification to all clients
   */
  broadcastNotification(notification: NotificationPayload): void {
    this.broadcast('notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * Emit update event
   */
  emitUpdate(update: UpdateEventPayload): void {
    this.broadcast('update', {
      ...update,
      timestamp: new Date(),
    });
  }

  /**
   * Emit custom event
   */
  emitCustomEvent(payload: CustomEventPayload): void {
    this.broadcast(payload.event, {
      ...payload.data,
      timestamp: new Date(),
    });
  }

  /**
   * Join a room
   */
  joinRoom(socket: AuthenticatedSocket, room: string): void {
    void socket.join(room);
    this.logger.log(`Socket ${socket.id} joined room: ${room}`);
  }

  /**
   * Leave a room
   */
  leaveRoom(socket: AuthenticatedSocket, room: string): void {
    void socket.leave(room);
    this.logger.log(`Socket ${socket.id} left room: ${room}`);
  }

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.getClientsByUserId(userId).length > 0;
  }
}
