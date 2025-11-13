import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EventsService } from './events.service';
import type { AuthenticatedSocket } from './interfaces';
import type { JoinRoomDto, LeaveRoomDto, NotificationDto } from './dto';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://iuh.nagentech.com',
        ],
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly eventsService: EventsService) {}

  /**
   * Called after the gateway is initialized
   */
  afterInit(server: Server): void {
    this.eventsService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Handle client connection
   */
  handleConnection(client: AuthenticatedSocket): void {
    this.logger.log(`Client attempting to connect: ${client.id}`);

    // Extract user info from handshake query or auth token
    const { userId, accountId, role } = client.handshake.query;

    if (userId) {
      client.userId = userId as string;
    }
    if (accountId) {
      client.accountId = accountId as string;
    }
    if (role) {
      client.role = role as string;
    }

    this.eventsService.addClient(client);

    // Send connection success message
    client.emit('connected', {
      message: 'Successfully connected to WebSocket server',
      socketId: client.id,
      timestamp: new Date(),
    });

    // Broadcast new connection to all clients (optional)
    this.server.emit('clientConnected', {
      totalClients: this.eventsService.getConnectedClientsCount(),
      timestamp: new Date(),
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: AuthenticatedSocket): void {
    this.eventsService.removeClient(client.id);

    // Broadcast disconnection to all clients (optional)
    this.server.emit('clientDisconnected', {
      totalClients: this.eventsService.getConnectedClientsCount(),
      timestamp: new Date(),
    });
  }

  /**
   * Handle join room event
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    try {
      this.eventsService.joinRoom(client, data.room);
      client.emit('joinedRoom', {
        room: data.room,
        message: `Successfully joined room: ${data.room}`,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error joining room: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to join room',
        error: errorMessage,
      });
    }
  }

  /**
   * Handle leave room event
   */
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: LeaveRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    try {
      this.eventsService.leaveRoom(client, data.room);
      client.emit('leftRoom', {
        room: data.room,
        message: `Successfully left room: ${data.room}`,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error leaving room: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to leave room',
        error: errorMessage,
      });
    }
  }

  /**
   * Handle ping event for connection check
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): void {
    client.emit('pong', {
      timestamp: new Date(),
    });
  }

  /**
   * Handle get connected clients count
   */
  @SubscribeMessage('getClientsCount')
  handleGetClientsCount(@ConnectedSocket() client: AuthenticatedSocket): void {
    const count = this.eventsService.getConnectedClientsCount();
    client.emit('clientsCount', {
      count,
      timestamp: new Date(),
    });
  }

  /**
   * Handle send message to room
   */
  @SubscribeMessage('messageToRoom')
  handleMessageToRoom(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    try {
      this.eventsService.emitToRoom(data.room, 'roomMessage', {
        from: client.userId || client.id,
        message: data.message,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending message to room: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to send message to room',
        error: errorMessage,
      });
    }
  }

  /**
   * Handle send notification
   */
  @SubscribeMessage('sendNotification')
  handleSendNotification(
    @MessageBody() data: NotificationDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    try {
      // This is typically used by admins to send notifications
      this.eventsService.broadcastNotification(data);
      client.emit('notificationSent', {
        message: 'Notification sent successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending notification: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to send notification',
        error: errorMessage,
      });
    }
  }
}
