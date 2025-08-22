import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Account, AccountSchema } from './schema/account.schema';
import { Role, RoleSchema } from './schema/role.schema';
import { Permission, PermissionSchema } from './schema/permission.schema';
import { AuthGuard } from './guards/auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, AuthGuard, PermissionsGuard],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, PermissionsGuard, JwtModule],
})
export class AuthModule {}
