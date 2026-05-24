import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, createPublicKey, createVerify, KeyObject } from 'crypto';
import { User } from '../users/entities/user.entity';
import { UserConfig } from '../users/entities/user-config.entity';
import { CategoriesService } from '../categories/categories.service';
import { MailService } from '../mail/mail.service';
import {
  AppleLoginDto,
  GoogleLoginDto,
  RegisterDto,
  LoginDto,
  VerifyEmailOtpDto,
  ResendEmailOtpDto,
  RequestPasswordResetDto,
  ResetPasswordWithOtpDto,
} from './dto/auth.dto';

type SocialProfile = {
  email: string;
  name: string;
};

type AppleJwtHeader = {
  alg?: string;
  kid?: string;
};

type AppleJwtPayload = {
  aud?: string;
  email?: string;
  exp?: number;
  iss?: string;
};

type AppleJwk = {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
};

type AppleJwksResponse = {
  keys: AppleJwk[];
};

@Injectable()
export class AuthService {
  private static appleKeysCache: { expiresAt: number; keys: AppleJwk[] } | null = null;
  private static readonly OTP_TTL_MINUTES = 15;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserConfig) private configRepo: Repository<UserConfig>,
    private categoriesService: CategoriesService,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private mailService: MailService,
  ) {}

  private async ensureAuthColumns() {
    await this.dataSource.query('ALTER TABLE omnia.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE');
    await this.dataSource.query('ALTER TABLE omnia.users ADD COLUMN IF NOT EXISTS email_verification_otp_hash VARCHAR(255)');
    await this.dataSource.query('ALTER TABLE omnia.users ADD COLUMN IF NOT EXISTS email_verification_otp_expires_at TIMESTAMP');
    await this.dataSource.query('ALTER TABLE omnia.users ADD COLUMN IF NOT EXISTS password_reset_otp_hash VARCHAR(255)');
    await this.dataSource.query('ALTER TABLE omnia.users ADD COLUMN IF NOT EXISTS password_reset_otp_expires_at TIMESTAMP');
    await this.dataSource.query('ALTER TABLE omnia.users ADD COLUMN IF NOT EXISTS last_email_otp_sent_at TIMESTAMP');
    await this.dataSource.query('ALTER TABLE omnia.users ADD COLUMN IF NOT EXISTS last_password_reset_otp_sent_at TIMESTAMP');
    await this.dataSource.query('UPDATE omnia.users SET email_verified = TRUE WHERE email_verified IS NULL');
  }

  private createDefaultUserConfig(userId: string) {
    return this.configRepo.create({
      userId,
      personalBudget: 1200,
      businessBudget: 500,
      savingsGoal: 200,
      currentEnergy: 8,
      countryCode: 'DO',
      baseCurrencyCode: 'DOP',
      radarTheme: 'NEON',
    });
  }

  async register(dto: RegisterDto) {
    await this.ensureAuthColumns();
    const email = dto.email.trim().toLowerCase();
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email ya registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();
    const user = this.userRepo.create({
      email,
      name: dto.name.trim(),
      password_hash: passwordHash,
      email_verified: false,
      email_verification_otp_hash: this.hashOtp(otp),
      email_verification_otp_expires_at: this.buildOtpExpiration(),
      last_email_otp_sent_at: new Date(),
    });
    await this.userRepo.save(user);

    const config = this.createDefaultUserConfig(user.id);
    await this.configRepo.save(config);
    await this.categoriesService.seedDefaultCategories(user.id);
    await this.mailService.sendWelcomeVerificationEmail(user.email, user.name, otp);

    return {
      message: 'Revisa tu correo para verificar tu cuenta',
      requiresEmailVerification: true,
      email: user.email,
      expiresInMinutes: AuthService.OTP_TTL_MINUTES,
    };
  }

  async verifyEmailOtp(dto: VerifyEmailOtpDto) {
    await this.ensureAuthColumns();
    const user = await this.userRepo.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user) {
      throw new BadRequestException('Codigo invalido o expirado');
    }

    if (user.email_verified) {
      throw new BadRequestException('Este correo ya fue verificado. Inicia sesion.');
    }

    this.assertValidOtp(dto.otp, user.email_verification_otp_hash, user.email_verification_otp_expires_at);
    user.email_verified = true;
    user.email_verification_otp_hash = null;
    user.email_verification_otp_expires_at = null;
    user.last_email_otp_sent_at = null;
    await this.userRepo.save(user);
    return this.generateToken(user);
  }

  async resendEmailOtp(dto: ResendEmailOtpDto) {
    await this.ensureAuthColumns();
    const user = await this.userRepo.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || user.email_verified) {
      return { message: 'Si la cuenta existe, te enviamos un nuevo codigo' };
    }

    const otp = await this.issueEmailVerificationOtp(user);
    await this.mailService.sendWelcomeVerificationEmail(user.email, user.name, otp);
    return {
      message: 'Te enviamos un nuevo codigo de verificacion',
      requiresEmailVerification: true,
      email: user.email,
      expiresInMinutes: AuthService.OTP_TTL_MINUTES,
    };
  }

  async login(dto: LoginDto) {
    await this.ensureAuthColumns();
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'password_hash', 'name', 'is_pro', 'email_verified'],
    });
    if (!user || !await bcrypt.compare(dto.password, user.password_hash)) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.email_verified) {
      const fullUser = await this.userRepo.findOne({ where: { id: user.id } });
      if (!fullUser) {
        throw new UnauthorizedException('Credenciales incorrectas');
      }

      const otp = await this.issueEmailVerificationOtp(fullUser);
      await this.mailService.sendWelcomeVerificationEmail(fullUser.email, fullUser.name, otp);
      throw new HttpException({
        message: 'Debes verificar tu correo. Te enviamos un nuevo codigo.',
        requiresEmailVerification: true,
        email: fullUser.email,
        expiresInMinutes: AuthService.OTP_TTL_MINUTES,
      }, HttpStatus.FORBIDDEN);
    }

    return this.generateToken(user);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    await this.ensureAuthColumns();
    const user = await this.userRepo.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    if (user) {
      const otp = await this.issuePasswordResetOtp(user);
      await this.mailService.sendPasswordResetEmail(user.email, user.name, otp);
    }

    return {
      message: 'Si la cuenta existe, te enviamos instrucciones al correo',
      expiresInMinutes: AuthService.OTP_TTL_MINUTES,
    };
  }

  async resetPasswordWithOtp(dto: ResetPasswordWithOtpDto) {
    await this.ensureAuthColumns();
    const user = await this.userRepo.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user) {
      throw new BadRequestException('Codigo invalido o expirado');
    }

    this.assertValidOtp(dto.otp, user.password_reset_otp_hash, user.password_reset_otp_expires_at);
    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    user.password_reset_otp_hash = null;
    user.password_reset_otp_expires_at = null;
    user.last_password_reset_otp_sent_at = null;
    await this.userRepo.save(user);
    return { message: 'Contrasena actualizada correctamente' };
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    await this.ensureAuthColumns();
    const profile = await this.verifyGoogleIdToken(dto.idToken);
    return this.loginWithSocialProfile(profile);
  }

  async loginWithApple(dto: AppleLoginDto) {
    await this.ensureAuthColumns();
    const payload = await this.verifyAppleIdentityToken(dto.identityToken);

    if (!payload.email) {
      throw new UnauthorizedException('Apple no devolvio email para enlazar la cuenta');
    }

    const name = [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim()
      || payload.email.split('@')[0];

    return this.loginWithSocialProfile({
      email: payload.email.toLowerCase(),
      name,
    });
  }

  private async verifyGoogleIdToken(idToken: string): Promise<SocialProfile> {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException('Token de Google invalido');
    }

    const payload = await response.json() as any;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (clientId && payload.aud !== clientId) {
      throw new UnauthorizedException('Token de Google invalido');
    }

    if (!payload.email || !(payload.email_verified === true || payload.email_verified === 'true')) {
      throw new UnauthorizedException('Google no verifico el email');
    }

    return {
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
    };
  }

  private async verifyAppleIdentityToken(token: string): Promise<AppleJwtPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Token invalido');
    }

    try {
      const header = this.decodeJwtSection<AppleJwtHeader>(parts[0]);
      const payload = this.decodeJwtSection<AppleJwtPayload>(parts[1]);
      const clientId = process.env.APPLE_CLIENT_ID;
      const nowSeconds = Math.floor(Date.now() / 1000);

      if (header.alg !== 'RS256' || !header.kid) {
        throw new UnauthorizedException('Token de Apple invalido');
      }

      const verifier = createVerify('RSA-SHA256');
      verifier.update(`${parts[0]}.${parts[1]}`);
      verifier.end();

      if (!verifier.verify(await this.getApplePublicKey(header.kid), this.decodeBase64Url(parts[2]))) {
        throw new UnauthorizedException('Token de Apple invalido');
      }

      if (payload.exp && payload.exp < nowSeconds) {
        throw new UnauthorizedException('Token expirado');
      }

      if (payload.iss !== 'https://appleid.apple.com') {
        throw new UnauthorizedException('Token de Apple invalido');
      }

      if (clientId && payload.aud !== clientId) {
        throw new UnauthorizedException('Token de Apple invalido');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token invalido');
    }
  }

  private decodeJwtSection<T>(section: string): T {
    return JSON.parse(this.decodeBase64Url(section).toString('utf8')) as T;
  }

  private decodeBase64Url(value: string): Buffer {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), '=');
    return Buffer.from(padded, 'base64');
  }

  private async getApplePublicKey(kid: string): Promise<KeyObject> {
    const cache = AuthService.appleKeysCache;
    const now = Date.now();

    if (!cache || cache.expiresAt <= now) {
      const response = await fetch('https://appleid.apple.com/auth/keys');
      if (!response.ok) {
        throw new UnauthorizedException('No se pudo verificar el token de Apple');
      }

      const jwks = await response.json() as AppleJwksResponse;
      AuthService.appleKeysCache = {
        keys: jwks.keys,
        expiresAt: now + (60 * 60 * 1000),
      };
    }

    const key = AuthService.appleKeysCache?.keys.find((entry) => entry.kid === kid);
    if (!key) {
      throw new UnauthorizedException('Token de Apple invalido');
    }

    return createPublicKey({ key, format: 'jwk' });
  }

  private async loginWithSocialProfile(profile: SocialProfile) {
    let user = await this.userRepo.findOne({
      where: { email: profile.email },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(
        `social:${profile.email}:${Date.now()}`,
        10,
      );

      user = this.userRepo.create({
        email: profile.email,
        name: profile.name,
        password_hash: passwordHash,
        email_verified: true,
      });
      await this.userRepo.save(user);

      const config = this.createDefaultUserConfig(user.id);
      await this.configRepo.save(config);
      await this.categoriesService.seedDefaultCategories(user.id);
    } else if (!user.email_verified) {
      user.email_verified = true;
      user.email_verification_otp_hash = null;
      user.email_verification_otp_expires_at = null;
      user.last_email_otp_sent_at = null;
      await this.userRepo.save(user);
    }

    return this.generateToken(user);
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashOtp(otp: string) {
    return createHash('sha256').update(otp).digest('hex');
  }

  private buildOtpExpiration() {
    return new Date(Date.now() + AuthService.OTP_TTL_MINUTES * 60 * 1000);
  }

  private assertValidOtp(otp: string, storedHash: string | null, expiresAt: Date | null) {
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now() || this.hashOtp(otp) !== storedHash) {
      throw new BadRequestException('Codigo invalido o expirado');
    }
  }

  private async issueEmailVerificationOtp(user: User) {
    const otp = this.generateOtp();
    user.email_verification_otp_hash = this.hashOtp(otp);
    user.email_verification_otp_expires_at = this.buildOtpExpiration();
    user.last_email_otp_sent_at = new Date();
    await this.userRepo.save(user);
    return otp;
  }

  private async issuePasswordResetOtp(user: User) {
    const otp = this.generateOtp();
    user.password_reset_otp_hash = this.hashOtp(otp);
    user.password_reset_otp_expires_at = this.buildOtpExpiration();
    user.last_password_reset_otp_sent_at = new Date();
    await this.userRepo.save(user);
    return otp;
  }

  private generateToken(user: User) {
    const token = this.jwtService.sign({ sub: user.id, email: user.email, isPro: user.is_pro });
    return {
      access_token: token,
      accessToken: token,
      user: { id: user.id, email: user.email, name: user.name, isPro: user.is_pro },
    };
  }
}
