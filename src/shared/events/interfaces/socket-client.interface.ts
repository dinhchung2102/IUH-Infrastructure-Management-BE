import { Socket } from 'socket.io';

/**
 * Extended Socket interface with custom properties
 */
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  accountId?: string;
  role?: string;
}

/**
 * Client info for tracking connected clients
 */
export interface ClientInfo {
  socketId: string;
  userId?: string;
  accountId?: string;
  role?: string;
  connectedAt: Date;
}
