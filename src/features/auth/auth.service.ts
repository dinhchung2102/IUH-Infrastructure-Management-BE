import { ConflictException, Injectable } from '@nestjs/common';
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

@Injectable()
export class AuthService {
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
    const existingUser = await this.accountModel.findOne({
      $or: [{ username: registerDto.username }, { email: registerDto.email }],
    });

    if (existingUser) {
      throw new ConflictException('Username hoặc email đã tồn tại');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Lấy role mặc định (GUEST)
    const defaultRole = await this.roleModel.findOne({
      roleName: RoleName.GUEST,
    });

    // Tạo account mới
    const newAccount = new this.accountModel({
      ...registerDto,
      password: hashedPassword,
      roles: defaultRole ? [defaultRole._id] : [],
    });

    const savedAccount = await newAccount.save();

    return {
      user: {
        id: savedAccount._id.toString(),
        username: savedAccount.username,
        email: savedAccount.email,
        fullName: savedAccount.fullName,
        roles: [RoleName.GUEST],
      },
    };
  }
}
