import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

/**
 * Events Module - Global WebSocket module for real-time communication
 * This module is marked as @Global() so it can be used anywhere in the app
 * without explicit imports
 */
@Global()
@Module({
  providers: [EventsGateway, EventsService],
  exports: [EventsService],
})
export class EventsModule {}
