import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (
  permissions: string[],
  mode: 'AND' | 'OR' = 'AND',
) => SetMetadata(PERMISSIONS_KEY, { permissions, mode });
