import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { PermissionDto } from './dto/permission.dto';
import { CreateRoleDto } from './dto/role.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-permission')
  async createPermission(@Body() permissionDto: PermissionDto) {
    return this.authService.createPermission(permissionDto);
  }

  @Post('create-role')
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.authService.createRole(createRoleDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
