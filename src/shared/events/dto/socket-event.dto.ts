import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class SocketEventDto {
  @IsString()
  event: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsString()
  room?: string;
}

export class NotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(['info', 'success', 'warning', 'error'])
  type: 'info' | 'success' | 'warning' | 'error';

  @IsOptional()
  @IsObject()
  data?: any;
}

export class JoinRoomDto {
  @IsString()
  room: string;
}

export class LeaveRoomDto {
  @IsString()
  room: string;
}
