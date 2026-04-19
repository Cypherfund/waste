import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserResponseDto, TokenResponseDto } from './dto/auth-response.dto';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check collector self-registration feature flag
    if (dto.role === UserRole.COLLECTOR) {
      const allowed = await this.featureFlagService.isEnabled(
        FEATURE_FLAGS.COLLECTOR_SELF_REGISTRATION,
        true,
      );
      if (!allowed) {
        throw new ForbiddenException('Collector self-registration is currently disabled');
      }
    }

    // Check if phone already exists
    const existingUser = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Check email uniqueness if provided
    if (dto.email) {
      const existingEmail = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user
    const user = this.userRepo.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email || null,
      passwordHash,
      role: dto.role,
    });

    const savedUser = await this.userRepo.save(user);
    this.logger.log(`User registered: ${savedUser.id} (${savedUser.role})`);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Store refresh token hash
    await this.storeRefreshToken(savedUser.id, tokens.refreshToken);

    return {
      user: this.toUserResponse(savedUser),
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by phone
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token hash
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.id}`);

    return {
      user: this.toUserResponse(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
    // Verify refresh token
    let payload: { sub: string; role: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find user and verify stored refresh token
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify the refresh token matches the stored hash
    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Generate new token pair (token rotation)
    const tokens = await this.generateTokens(user);

    // Store new refresh token hash
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    // Clear refresh token — invalidates all sessions for this user
    await this.userRepo.update(userId, { refreshTokenHash: null });
    this.logger.log(`User logged out: ${userId}`);
  }

  // --- Private helpers ---

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload = { sub: user.id, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<number>('jwt.refreshExpiration'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    await this.userRepo.update(userId, { refreshTokenHash: hash });
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
