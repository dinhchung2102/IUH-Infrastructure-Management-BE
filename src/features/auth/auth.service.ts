import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = AUTH_CONFIG.SALT_ROUNDS;

  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly redisService: RedisService,
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
        username: savedAccount.username,
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
    const { username, password, rememberMe } = loginDto;

    const account = await this.accountModel
      .findOne({
        $or: [{ username: username }, { email: username }],
      })
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          select: 'resource action',
        },
      });

    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác');
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
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_TOKEN_EXPIRES_IN',
          '7d',
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

    return {
      message: 'Đăng nhập thành công',
      access_token,
      refresh_token,
      account: {
        _id: account._id,
        username: account.username,
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

  async changePassword(
    accountId: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const account = await this.accountModel.findOne({ _id: accountId });
    if (!account) {
      throw new NotFoundException({
        message: `Tài khoản không tồn tại`,
        errorCode: 'ACCOUNT_NOT_FOUND',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    account.password = hashedPassword;

    await account.save();
    return {
      message: 'Mật khẩu đã được thay đổi thành công',
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

    const new_refresh_token = await this.jwtService.signAsync(
      { sub: account._id },
      {
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_TOKEN_EXPIRES_IN',
          '7d',
        ),
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
      account: {
        _id: account._id,
        username: account.username,
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
        username: account.username,
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
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // Tìm kiếm theo tên, email, username
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter theo role
    if (role) {
      const roleDoc = await this.roleModel.findOne({ roleName: role });
      if (roleDoc) {
        filter.role = roleDoc._id;
      }
    }

    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [accounts, total] = await Promise.all([
      this.accountModel
        .find(filter)
        .populate('role', 'roleName')
        .select('-password')
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

  async updateAccount(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    const existingAccount = await this.accountModel.findById(id);
    if (!existingAccount) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    // Kiểm tra email đã tồn tại chưa (nếu có thay đổi)
    if (
      updateAccountDto.email &&
      updateAccountDto.email !== existingAccount.email
    ) {
      const duplicateEmail = await this.accountModel.findOne({
        email: updateAccountDto.email,
        _id: { $ne: id },
      });

      if (duplicateEmail) {
        throw new ConflictException('Email đã tồn tại');
      }
    }

    // Kiểm tra username đã tồn tại chưa (nếu có thay đổi)
    if (
      updateAccountDto.username &&
      updateAccountDto.username !== existingAccount.username
    ) {
      const duplicateUsername = await this.accountModel.findOne({
        username: updateAccountDto.username,
        _id: { $ne: id },
      });

      if (duplicateUsername) {
        throw new ConflictException('Username đã tồn tại');
      }
    }

    // Kiểm tra role có tồn tại không (nếu có thay đổi)
    if (updateAccountDto.role) {
      const role = await this.roleModel.findById(updateAccountDto.role);
      if (!role) {
        throw new NotFoundException('Role không tồn tại');
      }
    }

    const updateData: Record<string, any> = { ...updateAccountDto };
    if (updateAccountDto.role) {
      updateData.role = new Types.ObjectId(updateAccountDto.role);
    }

    const updatedAccount = await this.accountModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('role', 'roleName')
      .select('-password');

    return {
      message: 'Cập nhật tài khoản thành công',
      data: updatedAccount,
    };
  }

  async getAccountById(id: string): Promise<{
    message: string;
    data: any;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID tài khoản không hợp lệ');
    }

    const account = await this.accountModel
      .findById(id)
      .populate('role', 'roleName')
      .select('-password')
      .lean();

    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    return {
      message: 'Lấy thông tin tài khoản thành công',
      data: account,
    };
  }
}
