/**
 * Base event payload structure
 */
export interface BaseEventPayload {
  timestamp?: Date;
  userId?: string;
  [key: string]: any;
}

/**
 * Notification event payload
 */
export interface NotificationPayload extends BaseEventPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
}

/**
 * Update event payload
 */
export interface UpdateEventPayload extends BaseEventPayload {
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  data: any;
}

/**
 * Custom event payload
 */
export interface CustomEventPayload extends BaseEventPayload {
  event: string;
  data: any;
}
