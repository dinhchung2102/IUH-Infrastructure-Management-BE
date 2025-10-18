import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<{
      permissions: string[];
      mode: 'AND' | 'OR';
    }>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!metadata) {
      return true; // No permissions required
    }

    const { permissions: requiredPermissions, mode } = metadata;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user as JwtPayload;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    // Kiểm tra xem user có permission ADMIN_ACTION không (toàn quyền)
    const hasAdminAction = user.permissions.some((permission) =>
      permission.endsWith(':ADMIN_ACTION'),
    );

    if (hasAdminAction) {
      return true; // Có toàn quyền, cho phép truy cập tất cả
    }

    // Kiểm tra quyền thông thường dựa trên mode
    const isAllowed =
      mode === 'AND'
        ? requiredPermissions.every((permission) =>
            user.permissions.includes(permission),
          )
        : requiredPermissions.some((permission) =>
            user.permissions.includes(permission),
          );

    if (!isAllowed) {
      throw new ForbiddenException('Không có đủ quyền truy cập');
    }

    return true;
  }
}
