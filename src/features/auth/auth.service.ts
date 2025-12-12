import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
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
import { CreateRoleDto, RoleDto } from './dto/role.dto';
import { AUTH_CONFIG } from './config/auth.config';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { RedisService } from '../../shared/redis/redis.service';
import { SendOtpDto, VerifyOTPDto } from './dto/otp.dto';
import { generateOTP } from '../../shared/email/generateOTP';
import { ResetPasswordDto } from './dto/password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountStatsDto } from './dto/account-stats.dto';
import { CreateStaffAccountDto } from './dto/create-staff-account.dto';
import { UploadService } from '../../shared/upload/upload.service';
import { EventsService } from '../../shared/events/events.service';

export interface RoleStats {
  role: string;
  count: number;
}

export interface TimeSeriesData {
  period: string;
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
}

interface DateGroup {
  year: number;
  month?: number;
  day?: number;
  quarter?: number;
}

interface AggregateResult {
  _id: DateGroup;
  count: number;
  activeCount: number;
  inactiveCount: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = AUTH_CONFIG.SALT_ROUNDS;

  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly redisService: RedisService,
    private readonly uploadService: UploadService,
    private readonly eventsService: EventsService,
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

  async getAllPermissions(): Promise<{
    message: string;
    permissions: any[];
    total: number;
  }> {
    const permissions = await this.permissionModel
      .find()
      .sort({ resource: 1, action: 1 })
      .lean();

    return {
      message: 'Lấy danh sách quyền thành công',
      permissions,
      total: permissions.length,
    };
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

  async getAllRoles(): Promise<{
    message: string;
    roles: any[];
    total: number;
  }> {
    const roles = await this.roleModel.find().lean();

    return {
      message: 'Lấy danh sách vai trò thành công',
      roles,
      total: roles.length,
    };
  }

  async updateRole(
    roleId: string,
    updateData: {
      roleName?: string;
      permissions?: string[];
      isActive?: boolean;
    },
  ): Promise<{
    message: string;
    role: any;
  }> {
    if (!Types.ObjectId.isValid(roleId)) {
      throw new NotFoundException('Role ID không hợp lệ');
    }

    const role = await this.roleModel.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role không tồn tại');
    }

    // Kiểm tra nếu role thuộc các role hệ thống thì không cho đổi roleName
    const systemRoles = Object.values(RoleName) as string[];
    const currentRoleName = role.roleName;
    if (
      systemRoles.includes(currentRoleName) &&
      updateData.roleName &&
      updateData.roleName !== currentRoleName
    ) {
      throw new ConflictException(
        `Không thể đổi tên role hệ thống: ${currentRoleName}`,
      );
    }

    // Kiểm tra roleName mới có bị trùng không
    if (updateData.roleName && updateData.roleName !== currentRoleName) {
      const existingRole = await this.roleModel.findOne({
        roleName: updateData.roleName,
      });
      if (existingRole) {
        throw new ConflictException('Tên role đã tồn tại');
      }
    }

    const updatePayload: {
      roleName?: string;
      permissions?: Types.ObjectId[];
      isActive?: boolean;
    } = {};

    if (updateData.roleName) {
      updatePayload.roleName = updateData.roleName;
    }

    if (updateData.permissions) {
      updatePayload.permissions = updateData.permissions.map(
        (permission) => new Types.ObjectId(permission),
      );
    }

    if (updateData.isActive !== undefined) {
      updatePayload.isActive = updateData.isActive;
    }

    const updatedRole = await this.roleModel
      .findByIdAndUpdate(roleId, updatePayload, { new: true })
      .populate('permissions', 'resource action')
      .lean();

    return {
      message: 'Cập nhật role thành công',
      role: updatedRole,
    };
  }

  async deleteRole(roleId: string): Promise<{
    message: string;
  }> {
    if (!Types.ObjectId.isValid(roleId)) {
      throw new NotFoundException('Role ID không hợp lệ');
    }

    const role = await this.roleModel.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role không tồn tại');
    }

    // Kiểm tra nếu role thuộc các role hệ thống (trong enum) thì không cho xóa
    const systemRoles = Object.values(RoleName) as string[];
    if (systemRoles.includes(role.roleName)) {
      throw new ConflictException(
        `Không thể xóa role hệ thống: ${role.roleName}`,
      );
    }

    // Kiểm tra xem có account nào đang sử dụng role này không
    const accountsUsingRole = await this.accountModel.countDocuments({
      role: roleId,
    });

    if (accountsUsingRole > 0) {
      throw new ConflictException(
        `Không thể xóa role này vì có ${accountsUsingRole} tài khoản đang sử dụng`,
      );
    }

    await this.roleModel.findByIdAndDelete(roleId);

    return {
      message: 'Xóa role thành công',
    };
  }

  async register(registerDto: RegisterDto) {
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

    let registerRole: RoleDto | null = null;
    if (registerDto.email.includes('@student.iuh.edu.vn')) {
      registerRole = await this.roleModel.findOne({
        roleName: RoleName.STUDENT,
      });
    } else {
      registerRole = await this.roleModel.findOne({
        roleName: RoleName.GUEST,
      });
    }

    if (!registerRole) {
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
      role: registerRole._id,
      isActive: true,
    };

    if (registerDto.dateOfBirth) {
      accountData.dateOfBirth = registerDto.dateOfBirth;
    }

    const { authOTP } = registerDto;
    const otpRedis = await this.redisService.getOtp(registerDto.email);
    if (!otpRedis) {
      throw new UnauthorizedException('OTP không tồn tại hoặc đã hết hạn');
    }

    if (otpRedis.otp !== authOTP) {
      throw new UnauthorizedException('OTP không hợp lệ');
    }

    await this.redisService.delete(`otp:${registerDto.email}`);

    const newAccount = new this.accountModel(accountData);
    const savedAccount = await newAccount.save();

    return {
      message: 'Tạo tài khoản thành công',
      newAccount: {
        email: savedAccount.email,
        fullName: savedAccount.fullName,
        phoneNumber: savedAccount.phoneNumber,
        address: savedAccount.address,
        avatar: savedAccount.avatar,
        gender: savedAccount.gender,
        dateOfBirth: savedAccount.dateOfBirth,
        role: savedAccount.role,
        isActive: savedAccount.isActive,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;

    // Populate managed entities and their campus field, but exclude their 'accounts' field
    const account = await this.accountModel
      .findOne({ email })
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          select: 'resource action',
        },
      })
      .populate({
        path: 'areasManaged',
        select: '-accounts',
        populate: [
          {
            path: 'campus',
            select: '',
          },
        ],
      })
      .populate({
        path: 'buildingsManaged',
        select: '-accounts',
        populate: [
          {
            path: 'campus',
            select: '',
          },
        ],
      })
      .populate({
        path: 'zonesManaged',
        select: '-accounts',
        populate: [
          {
            path: 'building',
            select: 'name campus',
            populate: {
              path: 'campus',
              select: 'name address',
            },
          },
          {
            path: 'area',
            select: 'name campus',
            populate: {
              path: 'campus',
              select: 'name address',
            },
          },
        ],
      })
      .populate({
        path: 'campusManaged',
        select: '',
      });

    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác');
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const role = account.role as Role;
    const roleName = role.roleName;

    const permissions: string[] = [];
    if (role.permissions) {
      (role.permissions as Permission[]).forEach((permission: Permission) => {
        permissions.push(`${permission.resource}:${permission.action}`);
      });
    }

    const payload = {
      sub: account._id,
      role: roleName,
      permissions,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRES_IN',
        '15m',
      ),
    });

    const refresh_token = await this.jwtService.signAsync(
      { sub: account._id },
      {
        expiresIn: rememberMe
          ? this.configService.get<string>('JWT_REMEMBER', '30d')
          : this.configService.get<string>(
              'JWT_REFRESH_TOKEN_EXPIRES_IN',
              '1d',
            ),
      },
    );

    const hashedRefreshToken = await bcrypt.hash(
      refresh_token,
      this.SALT_ROUNDS,
    );
    await this.accountModel.findByIdAndUpdate(account._id, {
      refreshToken: hashedRefreshToken,
    });

    // Remove 'accounts' field if it is still present in any managed object
    const omitAccountsField = (obj: any) => {
      if (!obj) return obj;
      if (Array.isArray(obj)) {
        return obj.map(omitAccountsField);
      }
      // Destructure accounts out if present
      // and recursively process nested structures
      // and campus object as-is
      // so that campus also returned as object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { accounts, ...rest } = obj.toObject ? obj.toObject() : obj;
      if (rest.campus && typeof rest.campus === 'object') {
        rest.campus = omitAccountsField(rest.campus);
      }
      return rest;
    };

    // Send welcome notification via WebSocket if user is connected
    this.eventsService.sendNotificationToUser(account._id.toString(), {
      title: 'Đăng nhập thành công',
      message: `Chào mừng ${account.fullName} quay trở lại!`,
      type: 'success',
    });

    return {
      message: 'Đăng nhập thành công',
      access_token,
      refresh_token,
      account: {
        _id: account._id,
        email: account.email,
        fullName: account.fullName,
        phoneNumber: account.phoneNumber,
        address: account.address,
        avatar: account.avatar,
        gender: account.gender,
        dateOfBirth: account.dateOfBirth,
        isActive: account.isActive,
        role: roleName,
        permissions: permissions,
        areasManaged: omitAccountsField(account.areasManaged),
        buildingsManaged: omitAccountsField(account.buildingsManaged),
        zonesManaged: omitAccountsField(account.zonesManaged),
        campusManaged: omitAccountsField(account.campusManaged),
      },
    };
  }

  async sendRegisterOTP(dto: SendOtpDto): Promise<{ message: string }> {
    const { email } = dto;
    const otp: string = generateOTP();

    // Kiểm tra email đã được sử dụng chưa
    const existEmail = await this.accountModel.findOne({ email: email });
    if (existEmail) {
      throw new ConflictException({
        message: `Email đã được sử dụng`,
        errorCode: 'EMAIL_EXISTS',
      });
    }

    await this.mailerService.sendMail({
      to: email,
      subject: `${otp} là mã xác thực đăng ký tài khoản của bạn`,
      template: 'otp',
      context: { otp },
    });

    await this.redisService.setOtp(email, otp);

    return {
      message: 'OTP đăng ký tài khoản đã được gửi tới email của bạn',
    };
  }

  async sendEmailOTP(dto: SendOtpDto): Promise<{ message: string }> {
    const { email } = dto;
    const otp: string = generateOTP();
    const existEmail = await this.accountModel.findOne({ email: email });
    if (existEmail) {
      throw new ConflictException({
        message: `Email đã được sử dụng`,
        errorCode: 'EMAIL_EXISTS',
      });
    }

    await this.mailerService.sendMail({
      to: email,
      subject: `${otp} là mã xác thực của bạn trên website iuh.nagentech.com`,
      template: 'otp',
      context: { otp },
    });

    await this.redisService.setOtp(email, otp);

    return {
      message: 'OTP đăng ký tài khoản đã được gửi tới email của bạn',
    };
  }

  async resendEmailOTP(dto: SendOtpDto): Promise<{ message: string }> {
    const { email } = dto;
    const otp: string = generateOTP();

    await this.mailerService.sendMail({
      to: email,
      subject: `${otp} là mã xác thực của bạn trên website iuh.nagentech.com`,
      template: 'otp',
      context: { otp },
    });

    await this.redisService.setOtp(email, otp);

    return {
      message: 'OTP mới đã được gửi đến email của bạn',
    };
  }

  async verifyEmailOTP(dto: VerifyOTPDto): Promise<{ message: string }> {
    const { email, authOTP } = dto;
    const otpRedis = await this.redisService.getOtp(email);

    if (otpRedis && otpRedis.otp === authOTP) {
      await this.redisService.delete(`otp:${email}`);
      return {
        message: 'OTP đã được xác thực thành công',
      };
    } else {
      throw new UnauthorizedException('OTP hết hạn hoặc không hợp lệ');
    }
  }

  async requestResetPassword(dto: SendOtpDto): Promise<{ message: string }> {
    const { email } = dto;
    const otp: string = generateOTP();

    const existEmail = await this.accountModel.findOne({ email: email });
    if (!existEmail) {
      throw new NotFoundException({
        message: `Tài khoản không tồn tại`,
        errorCode: 'ACCOUNT_NOT_FOUND',
      });
    }
    await this.redisService.setOtp(email, otp);
    await this.mailerService.sendMail({
      to: email,
      subject: `${otp} là mã lấy lại mật khẩu của bạn trên website iuh.nagentech.com`,
      template: 'reset-password',
      context: { otp },
    });

    return {
      message: 'OTP lấy lại mật khẩu đã được gửi tới email của bạn',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, authOTP, newPassword } = dto;
    const account = await this.accountModel.findOne({ email: email });
    if (!account) {
      throw new NotFoundException({
        message: `Tài khoản không tồn tại`,
        errorCode: 'ACCOUNT_NOT_FOUND',
      });
    }
    await this.verifyEmailOTP({ email, authOTP });
    await this.redisService.delete(`otp:${email}`);
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    account.password = hashedPassword;
    await account.save();
    return {
      message: 'Mật khẩu đã được lấy lại thành công',
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const payload: JwtPayload = await this.jwtService.verifyAsync(
      refreshToken,
      {
        secret: this.configService.get<string>('JWT_SECRET'),
      },
    );

    const account = await this.accountModel.findById(payload.sub).populate({
      path: 'role',
      populate: {
        path: 'permissions',
        select: 'resource action',
      },
    });

    if (!account || !account.refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      account.refreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const role = account.role as Role;
    const roleName = role.roleName;

    const permissions: string[] = [];
    if (role.permissions) {
      (role.permissions as Permission[]).forEach((permission: Permission) => {
        permissions.push(`${permission.resource}:${permission.action}`);
      });
    }

    const newPayload = {
      sub: account._id,
      role: roleName,
      permissions,
    };

    const access_token = await this.jwtService.signAsync(newPayload, {
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRES_IN',
        '15m',
      ),
    });

    const defaultShortExpiry = this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRES_IN',
      '1d',
    );
    const defaultLongExpiry = this.configService.get<string>(
      'JWT_REMEMBER',
      '30d',
    );

    let refreshTokenExpiry = defaultShortExpiry;
    if (payload.exp && payload.iat) {
      const tokenLifetime = payload.exp - payload.iat;
      const isLongSession = tokenLifetime > 7 * 24 * 60 * 60;
      refreshTokenExpiry = isLongSession
        ? defaultLongExpiry
        : defaultShortExpiry;
    }

    const new_refresh_token = await this.jwtService.signAsync(
      { sub: account._id },
      {
        expiresIn: refreshTokenExpiry,
      },
    );

    const hashedRefreshToken = await bcrypt.hash(
      new_refresh_token,
      this.SALT_ROUNDS,
    );
    await this.accountModel.findByIdAndUpdate(account._id, {
      refreshToken: hashedRefreshToken,
    });

    return {
      message: 'Token đã được làm mới thành công',
      access_token,
      refresh_token: new_refresh_token,
      refreshTokenExpiry,
      account: {
        _id: account._id,
        email: account.email,
        fullName: account.fullName,
        phoneNumber: account.phoneNumber,
        address: account.address,
        avatar: account.avatar,
        gender: account.gender,
        dateOfBirth: account.dateOfBirth,
        isActive: account.isActive,
        role: roleName,
        permissions: permissions,
      },
    };
  }

  async logout(accountId: string) {
    await this.accountModel.findByIdAndUpdate(accountId, {
      refreshToken: null,
    });

    return {
      message: 'Đăng xuất thành công',
    };
  }

  async getProfile(accountId: string) {
    const account = await this.accountModel
      .findById(accountId)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          select: 'resource action',
        },
      })
      .select('-password -refreshToken');

    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const role = account.role as Role;
    const roleName = role.roleName;

    const permissions: string[] = [];
    if (role.permissions) {
      (role.permissions as Permission[]).forEach((permission: Permission) => {
        permissions.push(`${permission.resource}:${permission.action}`);
      });
    }

    return {
      message: 'Thông tin profile',
      account: {
        _id: account._id,
        email: account.email,
        fullName: account.fullName,
        phoneNumber: account.phoneNumber,
        address: account.address,
        avatar: account.avatar,
        gender: account.gender,
        dateOfBirth: account.dateOfBirth,
        isActive: account.isActive,
        role: roleName,
        permissions: permissions,
      },
    };
  }

  async findAllAccounts(queryDto: QueryAccountsDto): Promise<{
    message: string;
    accounts: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const {
      search,
      role,
      isActive,
      gender,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // Tìm kiếm theo tên và email
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter theo role
    if (role) {
      const roleDoc = await this.roleModel.findOne({ roleName: role });
      if (roleDoc) {
        filter.role = roleDoc._id;
      }
    }

    // Filter theo trạng thái hoạt động
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Filter theo giới tính
    if (gender) {
      filter.gender = gender;
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [accounts, total] = await Promise.all([
      this.accountModel
        .find(filter)
        .populate('role', 'roleName')
        .select('-password -refreshToken')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.accountModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách tài khoản thành công',
      accounts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async getStaffStats(cacheKey?: string): Promise<{
    message: string;
    stats: {
      total: number;
      active: number;
      inactive: number;
      newThisMonth: number;
    };
  }> {
    const key =
      cacheKey ||
      this.redisService.buildCacheKey('/api/auth/accounts/staff-only/stats');

    // Try to get from cache
    const cached = await this.redisService.getCached<any>(key);
    if (cached) {
      return cached;
    }

    // Lấy IDs của roles cần loại trừ (GUEST, STUDENT, LECTURER)
    const excludedRoles = await this.roleModel
      .find({
        roleName: {
          $in: [RoleName.GUEST, RoleName.STUDENT, RoleName.LECTURER],
        },
      })
      .select('_id')
      .lean();

    const excludedRoleIds = excludedRoles.map((r) => r._id);

    // Base filter: chỉ lấy staff (loại trừ GUEST, STUDENT, LECTURER)
    const baseFilter = {
      role: { $nin: excludedRoleIds },
    };

    // Tính toán thống kê
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, inactive, newThisMonth] = await Promise.all([
      // Tổng nhân sự
      this.accountModel.countDocuments(baseFilter),
      // Đang hoạt động
      this.accountModel.countDocuments({
        ...baseFilter,
        isActive: true,
      }),
      // Không hoạt động
      this.accountModel.countDocuments({
        ...baseFilter,
        isActive: false,
      }),
      // Mới tháng này
      this.accountModel.countDocuments({
        ...baseFilter,
        createdAt: { $gte: startOfMonth },
      }),
    ]);

    const result = {
      message: 'Lấy thống kê nhân sự thành công',
      stats: {
        total,
        active,
        inactive,
        newThisMonth,
      },
    };

    // Cache for 15 minutes
    await this.redisService.setCached(key, result, 15 * 60 * 1000);

    return result;
  }

  async findStaffAccounts(queryDto: QueryAccountsDto): Promise<{
    message: string;
    accounts: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const {
      search,
      role,
      isActive,
      gender,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Lấy IDs của roles cần loại trừ
    const excludedRoles = await this.roleModel
      .find({
        roleName: {
          $in: [RoleName.GUEST, RoleName.STUDENT, RoleName.LECTURER],
        },
      })
      .select('_id')
      .lean();

    const excludedRoleIds = excludedRoles.map((r) => r._id);

    const filter: Record<string, any> = {
      // Loại trừ GUEST, STUDENT, LECTURER
      role: { $nin: excludedRoleIds },
    };

    // Tìm kiếm theo tên và email
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter theo role cụ thể (nếu muốn filter thêm trong staff)
    if (role) {
      const roleDoc = await this.roleModel.findOne({ roleName: role });
      if (roleDoc) {
        const isExcluded = excludedRoleIds.some(
          (id) => id.toString() === roleDoc._id.toString(),
        );
        if (!isExcluded) {
          filter.role = roleDoc._id;
        }
      }
    }

    // Filter theo trạng thái hoạt động
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Filter theo giới tính
    if (gender) {
      filter.gender = gender;
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [accounts, total] = await Promise.all([
      this.accountModel
        .find(filter)
        .populate('role', 'roleName')
        .populate('areasManaged', '_id name')
        .populate('zonesManaged', '_id name')
        .populate('buildingsManaged', '_id name')
        .populate('campusManaged', '_id name')
        .select('-password -refreshToken')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.accountModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      message: 'Lấy danh sách nhân viên thành công',
      accounts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    };
  }

  async createStaffAccount(
    createStaffAccountDto: CreateStaffAccountDto,
    files?: Express.Multer.File[],
  ): Promise<{
    message: string;
    account: any;
  }> {
    // Xử lý upload avatar nếu có
    if (files && files.length > 0) {
      const avatarFile = files.find((file) => file.fieldname === 'avatar');
      if (avatarFile) {
        const avatarUrl = await this.uploadService.uploadFile(avatarFile);
        createStaffAccountDto.avatar = avatarUrl;
      }
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await this.accountModel.findOne({
      email: createStaffAccountDto.email,
    });

    if (existingEmail) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Validate role - chỉ cho phép tạo ADMIN, STAFF, CAMPUS_ADMIN
    const allowedRoles = [
      RoleName.ADMIN,
      RoleName.STAFF,
      RoleName.CAMPUS_ADMIN,
    ];

    if (!allowedRoles.includes(createStaffAccountDto.role)) {
      throw new ConflictException(
        'Chỉ được tạo tài khoản với role: ADMIN, STAFF, CAMPUS_ADMIN',
      );
    }

    // Tìm role document
    const roleDoc = await this.roleModel.findOne({
      roleName: createStaffAccountDto.role,
    });

    if (!roleDoc) {
      throw new NotFoundException(
        `Role ${createStaffAccountDto.role} không tồn tại`,
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      createStaffAccountDto.password,
      this.SALT_ROUNDS,
    );

    // Tạo account mới
    const newAccount = new this.accountModel({
      email: createStaffAccountDto.email,
      password: hashedPassword,
      fullName: createStaffAccountDto.fullName,
      role: roleDoc._id,
      phoneNumber: createStaffAccountDto.phoneNumber,
      address: createStaffAccountDto.address,
      gender: createStaffAccountDto.gender,
      avatar: createStaffAccountDto.avatar,
      isActive: true,
    });

    const savedAccount = await newAccount.save();

    // Populate role và loại bỏ sensitive data
    const account = await this.accountModel
      .findById(savedAccount._id)
      .populate('role', 'roleName')
      .select('-password -refreshToken')
      .lean();

    return {
      message: 'Tạo tài khoản nhân viên thành công',
      account,
    };
  }

  async updateAccount(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<{
    message: string;
    updatedAccount: any;
  }> {
    this.logger.log(`[updateAccount] Starting update for account ID: ${id}`);
    this.logger.debug(
      `[updateAccount] Input data: ${JSON.stringify(updateAccountDto)}`,
    );

    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`[updateAccount] Invalid account ID: ${id}`);
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    const existingAccount = await this.accountModel.findById(id);
    if (!existingAccount) {
      this.logger.warn(`[updateAccount] Account not found: ${id}`);
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    this.logger.debug(
      `[updateAccount] Existing account: ${JSON.stringify({
        email: existingAccount.email,
        fullName: existingAccount.fullName,
        phoneNumber: existingAccount.phoneNumber,
        role: existingAccount.role,
        gender: existingAccount.gender,
        dateOfBirth: existingAccount.dateOfBirth,
      })}`,
    );

    // Convert to plain object for easier access
    const updateData = updateAccountDto as Record<string, any>;
    this.logger.debug(
      `[updateAccount] Converted updateData: ${JSON.stringify(updateData)}`,
    );

    // Kiểm tra email đã tồn tại chưa (nếu có thay đổi)
    if (updateData.email && updateData.email !== existingAccount.email) {
      this.logger.log(
        `[updateAccount] Checking email duplicate: ${updateData.email}`,
      );
      const duplicateEmail = await this.accountModel.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });

      if (duplicateEmail) {
        this.logger.warn(
          `[updateAccount] Email already exists: ${updateData.email}`,
        );
        throw new ConflictException('Email đã tồn tại');
      }
      this.logger.log(
        `[updateAccount] Email is available: ${updateData.email}`,
      );
    }

    // Kiểm tra phoneNumber đã tồn tại chưa (nếu có thay đổi)
    if (
      updateData.phoneNumber &&
      updateData.phoneNumber !== existingAccount.phoneNumber
    ) {
      this.logger.log(
        `[updateAccount] Checking phoneNumber duplicate: ${updateData.phoneNumber}`,
      );
      const duplicatePhone = await this.accountModel.findOne({
        phoneNumber: updateData.phoneNumber,
        _id: { $ne: id },
      });

      if (duplicatePhone) {
        this.logger.warn(
          `[updateAccount] PhoneNumber already exists: ${updateData.phoneNumber}`,
        );
        throw new ConflictException('Số điện thoại đã được sử dụng');
      }
      this.logger.log(
        `[updateAccount] PhoneNumber is available: ${updateData.phoneNumber}`,
      );
    }

    // Kiểm tra role có tồn tại không (nếu có thay đổi)
    if (updateData.role) {
      this.logger.log(`[updateAccount] Validating role: ${updateData.role}`);
      const role = await this.roleModel.findById(updateData.role);
      if (!role) {
        this.logger.warn(`[updateAccount] Role not found: ${updateData.role}`);
        throw new NotFoundException('Role không tồn tại');
      }
      updateData.role = new Types.ObjectId(updateData.role);
      this.logger.log(
        `[updateAccount] Role validated and converted: ${updateData.role}`,
      );
    }

    // Convert dateOfBirth to Date if provided
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      this.logger.log(
        `[updateAccount] dateOfBirth converted: ${updateData.dateOfBirth}`,
      );
    }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    this.logger.log(
      `[updateAccount] Final updateData to be saved: ${JSON.stringify(updateData)}`,
    );

    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('role', 'roleName')
      .populate('areasManaged', '_id name')
      .populate('zonesManaged', '_id name')
      .populate('buildingsManaged', '_id name')
      .populate('campusManaged', '_id name')
      .select('-password -refreshToken');

    this.logger.log(`[updateAccount] Account updated successfully: ${id}`);
    this.logger.debug(
      `[updateAccount] Updated account: ${JSON.stringify({
        email: updatedAccount?.email,
        fullName: updatedAccount?.fullName,
        phoneNumber: updatedAccount?.phoneNumber,
        role: updatedAccount?.role,
      })}`,
    );

    return {
      message: 'Cập nhật tài khoản thành công',
      updatedAccount: updatedAccount,
    };
  }

  async getAccountById(id: string): Promise<{
    message: string;
    account: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    const account = await this.accountModel
      .findById(id)
      .populate('role', 'roleName')
      .populate('areasManaged', '_id name')
      .populate('zonesManaged', '_id name')
      .populate('buildingsManaged', '_id name')
      .populate('campusManaged', '_id name')
      .select('-password -refreshToken')
      .lean();

    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    return {
      message: 'Lấy thông tin tài khoản thành công',
      account: account,
    };
  }

  async getAccountStats(
    statsDto: AccountStatsDto,
    cacheKey?: string,
  ): Promise<{
    message: string;
    totalAccounts: number;
    activeAccounts: number;
    inactiveAccounts: number;
    newAccountsThisMonth: number;
    timeSeries?: TimeSeriesData[];
    accountsByRole: RoleStats[];
  }> {
    const { type, startDate, endDate } = statsDto;
    const key =
      cacheKey ||
      this.redisService.buildCacheKey('/api/auth/accounts/stats', {
        type,
        startDate,
        endDate,
      });

    // Try to get from cache
    const cached = await this.redisService.getCached<any>(key);
    if (cached) {
      return cached;
    }

    // 1. Tổng số tài khoản
    const totalAccounts = await this.accountModel.countDocuments();

    // 2. Số tài khoản đang hoạt động
    const activeAccounts = await this.accountModel.countDocuments({
      isActive: true,
    });

    // 3. Số tài khoản không hoạt động
    const inactiveAccounts = await this.accountModel.countDocuments({
      isActive: false,
    });

    // 4. Số tài khoản mới trong tháng này
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newAccountsThisMonth = await this.accountModel.countDocuments({
      createdAt: { $gte: startOfMonth },
    });

    // 5. Thống kê theo vai trò
    const roleStats = await this.accountModel.aggregate<RoleStats>([
      {
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'roleData',
        },
      },
      { $unwind: '$roleData' },
      {
        $group: {
          _id: '$roleData.roleName',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          role: '$_id',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 6. Time series statistics (nếu có)
    let timeSeries: TimeSeriesData[] | undefined = undefined;

    if (type) {
      timeSeries = await this.getTimeSeriesStats(
        type,
        startDate ?? undefined,
        endDate ?? undefined,
      );
    }

    const result = {
      message: 'Lấy thống kê tài khoản thành công',
      totalAccounts,
      activeAccounts,
      inactiveAccounts,
      newAccountsThisMonth,
      ...(timeSeries && { timeSeries }),
      accountsByRole: roleStats,
    };

    // Cache for 15 minutes
    await this.redisService.setCached(key, result, 15 * 60 * 1000);

    return result;
  }

  private async getTimeSeriesStats(
    type: string,
    startDate?: string,
    endDate?: string,
  ): Promise<TimeSeriesData[]> {
    let groupBy: Record<string, any>;
    let dateFilter: Record<string, any> = {};

    // Xác định khoảng thời gian
    if (type === 'custom' && startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      const now = new Date();
      switch (type) {
        case 'date': {
          // Last 12 days
          const last12Days = new Date(now);
          last12Days.setDate(now.getDate() - 11);
          last12Days.setHours(0, 0, 0, 0);
          dateFilter = {
            createdAt: {
              $gte: last12Days,
            },
          };
          break;
        }
        case 'month': {
          // 12 months of current year
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          dateFilter = {
            createdAt: {
              $gte: startOfYear,
              $lte: now,
            },
          };
          break;
        }
        case 'quarter': {
          // 4 quarters of current year
          const yearStart = new Date(now.getFullYear(), 0, 1);
          dateFilter = {
            createdAt: {
              $gte: yearStart,
              $lte: now,
            },
          };
          break;
        }
        case 'year': {
          // Last 3 years
          const last3Years = new Date(now);
          last3Years.setFullYear(now.getFullYear() - 2);
          last3Years.setMonth(0, 1);
          last3Years.setHours(0, 0, 0, 0);
          dateFilter = {
            createdAt: {
              $gte: last3Years,
            },
          };
          break;
        }
      }
    }

    // Xác định cách group dữ liệu
    switch (type) {
      case 'date':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
      case 'month':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case 'quarter':
        groupBy = {
          year: { $year: '$createdAt' },
          quarter: {
            $ceil: { $divide: [{ $month: '$createdAt' }, 3] },
          },
        };
        break;
      case 'year':
        groupBy = {
          year: { $year: '$createdAt' },
        };
        break;
      case 'custom':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
      default:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
    }

    const results = await this.accountModel.aggregate<AggregateResult>([
      { $match: dateFilter },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
          inactiveCount: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Format kết quả
    return results.map((item): TimeSeriesData => {
      return {
        period: this.formatPeriod(type, item._id),
        totalAccounts: item.count,
        activeAccounts: item.activeCount,
        inactiveAccounts: item.inactiveCount,
      };
    });
  }

  private formatPeriod(type: string, dateObj: DateGroup): string {
    switch (type) {
      case 'date':
      case 'custom':
        return `${dateObj.year}-${String(dateObj.month ?? 1).padStart(2, '0')}-${String(dateObj.day ?? 1).padStart(2, '0')}`;
      case 'month':
        return `${dateObj.year}-${String(dateObj.month ?? 1).padStart(2, '0')}`;
      case 'quarter':
        return `${dateObj.year}-Q${dateObj.quarter ?? 1}`;
      case 'year':
        return `${dateObj.year}`;
      default:
        return '';
    }
  }

  async lockAccount(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    const account = await this.accountModel.findById(id);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    if (!account.isActive) {
      throw new ConflictException('Tài khoản đã bị khóa');
    }

    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(
        id,
        { isActive: false, refreshToken: null },
        { new: true },
      )
      .populate('role', 'roleName')
      .select('-password -refreshToken');

    return {
      message: 'Khóa tài khoản thành công',
      data: updatedAccount,
    };
  }

  async unlockAccount(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    const account = await this.accountModel.findById(id);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    if (account.isActive) {
      throw new ConflictException('Tài khoản đang hoạt động');
    }

    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .populate('role', 'roleName')
      .select('-password -refreshToken');

    return {
      message: 'Mở khóa tài khoản thành công',
      data: updatedAccount,
    };
  }

  // =================== Location Assignment ===================

  /**
   * Gán zones cho account (2 chiều)
   */
  async assignZonesToAccount(
    accountId: string,
    zoneIds: string[],
  ): Promise<{ message: string; account: any }> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('Account ID không hợp lệ');
    }

    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // Convert string IDs to ObjectIds
    const zoneObjectIds = zoneIds.map((id) => new Types.ObjectId(id));
    const accountObjectId = new Types.ObjectId(accountId);

    // Start session for transaction
    const session = await this.accountModel.db.startSession();
    session.startTransaction();

    try {
      // 0. Đảm bảo zonesManaged là array (nếu null/undefined)
      await this.accountModel.updateOne(
        { _id: accountId, zonesManaged: null },
        { $set: { zonesManaged: [] } },
        { session },
      );

      // 1. Update account với zones mới
      await this.accountModel.findByIdAndUpdate(
        accountId,
        { $addToSet: { zonesManaged: { $each: zoneObjectIds } } },
        { session },
      );

      // 2. Update zones với account mới (2 chiều)
      await this.accountModel.db
        .collection('zones')
        .updateMany(
          { _id: { $in: zoneObjectIds } },
          { $addToSet: { accounts: accountObjectId } },
          { session },
        );

      await session.commitTransaction();

      // Lấy account đã update với populate
      const updatedAccount = await this.accountModel
        .findById(accountId)
        .populate('role', 'roleName')
        .populate('zonesManaged', '_id name')
        .select('-password -refreshToken');

      return {
        message: 'Gán khu vực cho tài khoản thành công',
        account: updatedAccount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Gán buildings cho account (2 chiều)
   */
  async assignBuildingsToAccount(
    accountId: string,
    buildingIds: string[],
  ): Promise<{ message: string; account: any }> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('Account ID không hợp lệ');
    }

    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const buildingObjectIds = buildingIds.map((id) => new Types.ObjectId(id));
    const accountObjectId = new Types.ObjectId(accountId);

    const session = await this.accountModel.db.startSession();
    session.startTransaction();

    try {
      // 0. Đảm bảo buildingsManaged là array
      await this.accountModel.updateOne(
        { _id: accountId, buildingsManaged: null },
        { $set: { buildingsManaged: [] } },
        { session },
      );

      // 1. Update account
      await this.accountModel.findByIdAndUpdate(
        accountId,
        { $addToSet: { buildingsManaged: { $each: buildingObjectIds } } },
        { session },
      );

      // 2. Update buildings (2 chiều)
      await this.accountModel.db
        .collection('buildings')
        .updateMany(
          { _id: { $in: buildingObjectIds } },
          { $addToSet: { accounts: accountObjectId } },
          { session },
        );

      await session.commitTransaction();

      const updatedAccount = await this.accountModel
        .findById(accountId)
        .populate('role', 'roleName')
        .populate('buildingsManaged', '_id name')
        .select('-password -refreshToken');

      return {
        message: 'Gán tòa nhà cho tài khoản thành công',
        account: updatedAccount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Gán areas cho account (2 chiều)
   */
  async assignAreasToAccount(
    accountId: string,
    areaIds: string[],
  ): Promise<{ message: string; account: any }> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('Account ID không hợp lệ');
    }

    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const areaObjectIds = areaIds.map((id) => new Types.ObjectId(id));
    const accountObjectId = new Types.ObjectId(accountId);

    const session = await this.accountModel.db.startSession();
    session.startTransaction();

    try {
      // 0. Đảm bảo areasManaged là array
      await this.accountModel.updateOne(
        { _id: accountId, areasManaged: null },
        { $set: { areasManaged: [] } },
        { session },
      );

      // 1. Update account
      await this.accountModel.findByIdAndUpdate(
        accountId,
        { $addToSet: { areasManaged: { $each: areaObjectIds } } },
        { session },
      );

      // 2. Update areas (2 chiều)
      await this.accountModel.db
        .collection('areas')
        .updateMany(
          { _id: { $in: areaObjectIds } },
          { $addToSet: { accounts: accountObjectId } },
          { session },
        );

      await session.commitTransaction();

      const updatedAccount = await this.accountModel
        .findById(accountId)
        .populate('role', 'roleName')
        .populate('areasManaged', '_id name')
        .select('-password -refreshToken');

      return {
        message: 'Gán khu vực cho tài khoản thành công',
        account: updatedAccount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Gán campus cho account - chỉ 1 campus (2 chiều)
   * Note: Campus không có field accounts vì Campus.manager là single reference
   */
  async assignCampusToAccount(
    accountId: string,
    campusId: string,
  ): Promise<{ message: string; account: any }> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('Account ID không hợp lệ');
    }

    if (!Types.ObjectId.isValid(campusId)) {
      throw new NotFoundException('Campus ID không hợp lệ');
    }

    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // Chỉ cập nhật account.campusManaged
    // Campus.manager là quan hệ khác (1-1), không phải 1-many
    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(
        accountId,
        { campusManaged: new Types.ObjectId(campusId) },
        { new: true },
      )
      .populate('role', 'roleName')
      .populate('campusManaged', '_id name')
      .select('-password -refreshToken');

    return {
      message: 'Gán cơ sở cho tài khoản thành công',
      account: updatedAccount,
    };
  }

  /**
   * Xóa zone khỏi account (2 chiều)
   */
  async removeZoneFromAccount(
    accountId: string,
    zoneId: string,
  ): Promise<{ message: string; account: any }> {
    if (!Types.ObjectId.isValid(accountId) || !Types.ObjectId.isValid(zoneId)) {
      throw new NotFoundException('ID không hợp lệ');
    }

    const zoneObjectId = new Types.ObjectId(zoneId);
    const accountObjectId = new Types.ObjectId(accountId);

    const session = await this.accountModel.db.startSession();
    session.startTransaction();

    try {
      // 1. Xóa zone khỏi account
      await this.accountModel.findByIdAndUpdate(
        accountId,
        { $pull: { zonesManaged: zoneObjectId } },
        { session },
      );

      // 2. Xóa account khỏi zone (2 chiều)
      await this.accountModel.db
        .collection('zones')
        .updateOne(
          { _id: zoneObjectId },
          { $pull: { accounts: { $in: [accountObjectId] } } } as any,
          { session },
        );

      await session.commitTransaction();

      const updatedAccount = await this.accountModel
        .findById(accountId)
        .populate('role', 'roleName')
        .populate('zonesManaged', '_id name')
        .select('-password -refreshToken');

      if (!updatedAccount) {
        throw new NotFoundException('Tài khoản không tồn tại');
      }

      return {
        message: 'Xóa khu vực khỏi tài khoản thành công',
        account: updatedAccount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Xóa building khỏi account (2 chiều)
   */
  async removeBuildingFromAccount(
    accountId: string,
    buildingId: string,
  ): Promise<{ message: string; account: any }> {
    if (
      !Types.ObjectId.isValid(accountId) ||
      !Types.ObjectId.isValid(buildingId)
    ) {
      throw new NotFoundException('ID không hợp lệ');
    }

    const buildingObjectId = new Types.ObjectId(buildingId);
    const accountObjectId = new Types.ObjectId(accountId);

    const session = await this.accountModel.db.startSession();
    session.startTransaction();

    try {
      // 1. Xóa building khỏi account
      await this.accountModel.findByIdAndUpdate(
        accountId,
        { $pull: { buildingsManaged: buildingObjectId } },
        { session },
      );

      // 2. Xóa account khỏi building (2 chiều)
      await this.accountModel.db
        .collection('buildings')
        .updateOne(
          { _id: buildingObjectId },
          { $pull: { accounts: { $in: [accountObjectId] } } } as any,
          { session },
        );

      await session.commitTransaction();

      const updatedAccount = await this.accountModel
        .findById(accountId)
        .populate('role', 'roleName')
        .populate('buildingsManaged', '_id name')
        .select('-password -refreshToken');

      if (!updatedAccount) {
        throw new NotFoundException('Tài khoản không tồn tại');
      }

      return {
        message: 'Xóa tòa nhà khỏi tài khoản thành công',
        account: updatedAccount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Xóa area khỏi account (2 chiều)
   */
  async removeAreaFromAccount(
    accountId: string,
    areaId: string,
  ): Promise<{ message: string; account: any }> {
    if (!Types.ObjectId.isValid(accountId) || !Types.ObjectId.isValid(areaId)) {
      throw new NotFoundException('ID không hợp lệ');
    }

    const areaObjectId = new Types.ObjectId(areaId);
    const accountObjectId = new Types.ObjectId(accountId);

    const session = await this.accountModel.db.startSession();
    session.startTransaction();

    try {
      // 1. Xóa area khỏi account
      await this.accountModel.findByIdAndUpdate(
        accountId,
        { $pull: { areasManaged: areaObjectId } },
        { session },
      );

      // 2. Xóa account khỏi area (2 chiều)
      await this.accountModel.db
        .collection('areas')
        .updateOne(
          { _id: areaObjectId },
          { $pull: { accounts: { $in: [accountObjectId] } } } as any,
          { session },
        );

      await session.commitTransaction();

      const updatedAccount = await this.accountModel
        .findById(accountId)
        .populate('role', 'roleName')
        .populate('areasManaged', '_id name')
        .select('-password -refreshToken');

      if (!updatedAccount) {
        throw new NotFoundException('Tài khoản không tồn tại');
      }

      return {
        message: 'Xóa khu vực khỏi tài khoản thành công',
        account: updatedAccount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Xóa campus khỏi account (set về null)
   */
  async removeCampusFromAccount(accountId: string): Promise<{
    message: string;
    account: any;
  }> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('Account ID không hợp lệ');
    }

    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(accountId, { campusManaged: null }, { new: true })
      .populate('role', 'roleName')
      .select('-password -refreshToken');

    if (!updatedAccount) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    return {
      message: 'Xóa cơ sở khỏi tài khoản thành công',
      account: updatedAccount,
    };
  }

  /**
   * Lấy danh sách accounts theo zone
   */
  async getAccountsByZone(zoneId: string): Promise<{
    message: string;
    accounts: any[];
  }> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new NotFoundException('Zone ID không hợp lệ');
    }

    const accounts = await this.accountModel
      .find({ zonesManaged: new Types.ObjectId(zoneId) })
      .populate('role', 'roleName')
      .select('-password -refreshToken')
      .lean();

    return {
      message: 'Lấy danh sách tài khoản theo zone thành công',
      accounts,
    };
  }

  /**
   * Lấy danh sách accounts theo building
   */
  async getAccountsByBuilding(buildingId: string): Promise<{
    message: string;
    accounts: any[];
  }> {
    if (!Types.ObjectId.isValid(buildingId)) {
      throw new NotFoundException('Building ID không hợp lệ');
    }

    const accounts = await this.accountModel
      .find({ buildingsManaged: new Types.ObjectId(buildingId) })
      .populate('role', 'roleName')
      .select('-password -refreshToken')
      .lean();

    return {
      message: 'Lấy danh sách tài khoản theo building thành công',
      accounts,
    };
  }

  /**
   * Lấy danh sách accounts theo area
   */
  async getAccountsByArea(areaId: string): Promise<{
    message: string;
    accounts: any[];
  }> {
    if (!Types.ObjectId.isValid(areaId)) {
      throw new NotFoundException('Area ID không hợp lệ');
    }

    const accounts = await this.accountModel
      .find({ areasManaged: new Types.ObjectId(areaId) })
      .populate('role', 'roleName')
      .select('-password -refreshToken')
      .lean();

    return {
      message: 'Lấy danh sách tài khoản theo area thành công',
      accounts,
    };
  }

  /**
   * Lấy danh sách accounts theo campus
   */
  async getAccountsByCampus(campusId: string): Promise<{
    message: string;
    accounts: any[];
  }> {
    if (!Types.ObjectId.isValid(campusId)) {
      throw new NotFoundException('Campus ID không hợp lệ');
    }

    const accounts = await this.accountModel
      .find({ campusManaged: new Types.ObjectId(campusId) })
      .populate('role', 'roleName')
      .select('-password -refreshToken')
      .lean();

    return {
      message: 'Lấy danh sách tài khoản theo cơ sở thành công',
      accounts,
    };
  }

  async updateProfile(
    accountId: string,
    updateProfileDto: any,
    file?: Express.Multer.File,
  ): Promise<{
    message: string;
    account: any;
  }> {
    // Validate accountId
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    // Find account
    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // Upload avatar if provided
    let avatarUrl = updateProfileDto.avatar;
    if (file) {
      const uploadedUrls = await this.uploadService.uploadMultipleFiles([file]);
      avatarUrl = uploadedUrls[0];
    }

    // Check if phoneNumber is being updated and already exists
    if (
      updateProfileDto.phoneNumber &&
      updateProfileDto.phoneNumber !== account.phoneNumber
    ) {
      const existingAccount = await this.accountModel.findOne({
        phoneNumber: updateProfileDto.phoneNumber,
        _id: { $ne: accountId },
      });
      if (existingAccount) {
        throw new ConflictException('Số điện thoại đã được sử dụng');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateProfileDto.phoneNumber)
      updateData.phoneNumber = updateProfileDto.phoneNumber;
    if (updateProfileDto.address) updateData.address = updateProfileDto.address;
    if (avatarUrl) updateData.avatar = avatarUrl;
    if (updateProfileDto.dateOfBirth)
      updateData.dateOfBirth = new Date(updateProfileDto.dateOfBirth);

    // Update account
    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(accountId, updateData, { new: true })
      .populate('role', 'name description')
      .select('-password -refreshToken');

    return {
      message: 'Cập nhật thông tin cá nhân thành công',
      account: updatedAccount,
    };
  }

  async changePassword(
    accountId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{
    message: string;
  }> {
    // Validate accountId
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    // Find account
    const account = await this.accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, account.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không đúng');
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, account.password);
    if (isSamePassword) {
      throw new ConflictException(
        'Mật khẩu mới không được trùng với mật khẩu cũ',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.accountModel.findByIdAndUpdate(accountId, {
      password: hashedPassword,
    });

    return {
      message: 'Đổi mật khẩu thành công',
    };
  }
}
