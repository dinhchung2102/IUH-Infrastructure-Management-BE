import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from './schema/account.schema';
import { Model, Types } from 'mongoose';
import { Role } from './schema/role.schema';
import { RegisterDto } from './dto/register.dto';
import { RoleName } from './enum/role.enum';
import * as bcrypt from 'bcryptjs';
import { PermissionDto } from './dto/permission.dto';
import { Permission } from './schema/permission.schema';
import { CreateRoleDto } from './dto/role.dto';
import { AUTH_CONFIG } from './config/auth.config';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = AUTH_CONFIG.SALT_ROUNDS;

  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
  ) {}

  async createPermission(permissionDto: PermissionDto) {
    const existingPermission = await this.permissionModel.findOne({
      resource: permissionDto.resource,
      action: permissionDto.action,
    });

    if (existingPermission) {
      throw new ConflictException('Permission đã tồn tại');
    }

    const newPermission = new this.permissionModel(permissionDto);

    return newPermission.save();
  }

  async createRole(createRoleDto: CreateRoleDto) {
    const existingRole = await this.roleModel.findOne({
      roleName: createRoleDto.roleName,
    });

    if (existingRole) {
      throw new ConflictException('Role đã tồn tại');
    }

    const newRole = new this.roleModel({
      ...createRoleDto,
      permissions: createRoleDto.permissions.map(
        (permission) => new Types.ObjectId(permission),
      ),
    });

    return newRole.save();
  }

  async register(registerDto: RegisterDto) {
    try {
      const existingUsername = await this.accountModel.findOne({
        username: registerDto.username,
      });

      if (existingUsername) {
        throw new ConflictException('Username đã tồn tại');
      }

      const existingEmail = await this.accountModel.findOne({
        email: registerDto.email,
      });

      if (existingEmail) {
        throw new ConflictException('Email đã tồn tại');
      }

      if (registerDto.phoneNumber) {
        const existingPhone = await this.accountModel.findOne({
          phoneNumber: registerDto.phoneNumber,
        });

        if (existingPhone) {
          throw new ConflictException('Số điện thoại đã tồn tại');
        }
      }

      // Lấy role mặc định (GUEST) - kiểm tra trước khi tạo account
      const defaultRole = await this.roleModel.findOne({
        roleName: AUTH_CONFIG.DEFAULT_ROLE as RoleName,
      });

      if (!defaultRole) {
        throw new InternalServerErrorException(
          'Không thể tìm thấy role mặc định. Vui lòng liên hệ admin.',
        );
      }

      const hashedPassword = await bcrypt.hash(
        registerDto.password,
        this.SALT_ROUNDS,
      );

      const accountData = {
        ...registerDto,
        password: hashedPassword,
        roles: [defaultRole._id],
        isActive: true,
      };

      if (registerDto.dateOfBirth) {
        accountData.dateOfBirth = registerDto.dateOfBirth;
      }

      const newAccount = new this.accountModel(accountData);
      const savedAccount = await newAccount.save();

      return {
        message: 'Tạo tài khoản thành công',
        newAccount: {
          username: savedAccount.username,
          email: savedAccount.email,
          fullName: savedAccount.fullName,
          phoneNumber: savedAccount.phoneNumber,
          address: savedAccount.address,
          avatar: savedAccount.avatar,
          gender: savedAccount.gender,
          dateOfBirth: savedAccount.dateOfBirth,
          roles: savedAccount.roles,
          isActive: savedAccount.isActive,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
